import React, {
	PropsWithChildren,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	forwardRef,
} from 'react';
import {
	Dimensions,
	StyleSheet,
	TouchableWithoutFeedback,
	View,
	Platform,
} from 'react-native';
import {
	Gesture,
	GestureDetector,
	GestureHandlerRootView,
	NativeViewGestureHandler,
} from 'react-native-gesture-handler';
import Animated, {
	Extrapolation,
	interpolate,
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from 'react-native-reanimated';

type SnapPoint = number; // fraction of screen height that the sheet should occupy (0..1)

type BottomSheetProps = PropsWithChildren<{
	/** Open/close via state */
	isOpen: boolean;
	/** Called when user swipes it down past the lower snap (or taps backdrop) */
	onClose: () => void;
	/** Snap points as visible heights, e.g. [0.6, 0.4] = 60% and 40% screen height */
	snapPoints?: SnapPoint[];
	/** Start at which snap index when opened (default 0 = largest) */
	initialSnapIndex?: number;
	/** Corner radius (default 20) */
	radius?: number;
	/** Backdrop opacity at fully open (default 0.35) */
	maxBackdropOpacity?: number;
	/** Accessible label for backdrop (default 'Close sheet') */
	backdropA11yLabel?: string;
	/** Optional header area (e.g., title bar) */
	header?: React.ReactNode;
}>;

export type BottomSheetRef = {
	snapTo: (index: number) => void;
	close: () => void;
};

const { height: H, width: W } = Dimensions.get('window');

// Smooth timing configuration for no bounce animations
const TIMING_CONFIG = {
	duration: 250,
};

// Worklet-safe clamp for use inside animations
const wClamp = (v: number, min: number, max: number) => {
	'worklet';
	return Math.min(Math.max(v, min), max);
};

const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
	function BottomSheet(
		{
			isOpen,
			onClose,
			children,
			snapPoints = [0.6, 0.4], // visible heights (largest first)
			initialSnapIndex = 0,
			radius = 20,
			maxBackdropOpacity = 0.35,
			backdropA11yLabel = 'Close sheet',
			header,
		},
		ref
	) {
		// Convert visible-height fractions to translateY positions (in px)
		const snapsY = useMemo(() => {
			const clamped = snapPoints
				.map((f) => Math.min(Math.max(f, 0.2), 0.95)) // keep sane bounds (JS thread, so plain math OK)
				.sort((a, b) => b - a); // largest visible first
			// translateY when "open to visible fraction f": top = H - (H * f)
			return clamped.map((f) => H - H * f);
		}, [snapPoints]);

		const closedY = H; // fully off-screen
		const minY = snapsY[snapsY.length - 1] ?? H * 0.4; // most open
		const maxY = closedY; // most closed

		// animated translateY
		const y = useSharedValue(closedY);
		// track starting point during drag
		const dragStartY = useSharedValue(closedY);

		// Imperative API (optional)
		useImperativeHandle(ref, () => ({
			snapTo: (idx: number) => {
				const target =
					snapsY[Math.min(Math.max(idx, 0), snapsY.length - 1)] ?? minY;
				y.value = withTiming(target, TIMING_CONFIG);
			},
			close: () => {
				y.value = withTiming(closedY, { duration: 200 }, (finished) => {
					'worklet';
					if (finished && onClose) runOnJS(onClose)();
				});
			},
		}));

		// open/close via prop
		useEffect(() => {
			if (isOpen) {
				const initial =
					snapsY[Math.min(Math.max(initialSnapIndex, 0), snapsY.length - 1)] ??
					minY;
				y.value = withTiming(initial, TIMING_CONFIG);
			} else {
				y.value = withTiming(closedY, { duration: 200 });
			}
		}, [isOpen, initialSnapIndex, snapsY, closedY, minY, y]);

		// Backdrop opacity based on sheet position
		const backdropStyle = useAnimatedStyle(() => {
			const opacity = interpolate(
				y.value,
				[closedY, minY],
				[0, maxBackdropOpacity],
				Extrapolation.CLAMP
			);
			return { opacity };
		});

		// Sheet container style
		const sheetStyle = useAnimatedStyle(() => ({
			transform: [{ translateY: y.value }],
		}));

		// Pan gesture
		const contentGestureRef = useRef(null); // NativeViewGestureHandler for inner scrolls
		const pan = Gesture.Pan()
			.onBegin(() => {
				dragStartY.value = y.value;
			})
			.onUpdate((e) => {
				const next = dragStartY.value + e.translationY;
				y.value = wClamp(next, minY, maxY);
			})
			.onEnd((e) => {
				const velocity = e.velocityY;
				// if flicking down fast, close
				if (velocity > 1200) {
					y.value = withTiming(closedY, { duration: 200 }, (finished) => {
						'worklet';
						if (finished) runOnJS(onClose)();
					});
					return;
				}

				// otherwise, snap to the nearest point
				const points = [...snapsY, closedY];
				let nearest = points[0];
				let minDist = Math.abs(y.value - points[0]);
				for (let i = 1; i < points.length; i++) {
					const d = Math.abs(y.value - points[i]);
					if (d < minDist) {
						nearest = points[i];
						minDist = d;
					}
				}

				// If nearest is closed, call onClose after animation
				if (nearest === closedY) {
					y.value = withTiming(nearest, { duration: 200 }, (finished) => {
						'worklet';
						if (finished) runOnJS(onClose)();
					});
				} else {
					y.value = withTiming(nearest, TIMING_CONFIG);
				}
			})
			.simultaneousWithExternalGesture(contentGestureRef as any);

		// Backdrop tap closes
		const handleBackdropPress = () => {
			y.value = withTiming(closedY, { duration: 200 }, (finished) => {
				'worklet';
				if (finished) runOnJS(onClose)();
			});
		};

		// Hide the whole tree from touch/semantics when fully closed
		const rootStyle = useAnimatedStyle(() => {
			const display = y.value >= closedY - 1 ? 'none' : 'flex';
			return { display };
		});

		return (
			<GestureHandlerRootView style={StyleSheet.absoluteFill}>
				<Animated.View
					style={[StyleSheet.absoluteFill, rootStyle]}
					pointerEvents="box-none"
				>
					{/* Backdrop */}
					<TouchableWithoutFeedback
						accessibilityLabel={backdropA11yLabel}
						onPress={handleBackdropPress}
					>
						<Animated.View
							style={[styles.backdrop, { width: W, height: H }, backdropStyle]}
						/>
					</TouchableWithoutFeedback>

					{/* Sheet */}
					<GestureDetector gesture={pan}>
						<Animated.View
							style={[
								styles.sheet,
								{
									borderTopLeftRadius: radius,
									borderTopRightRadius: radius,
									width: W,
									height: H,
								},
								sheetStyle,
							]}
						>
							{/* Drag handle */}
							<View style={styles.handle} />

							{/* Optional header (e.g., title + close) */}
							{header}

							{/* Content area */}
							<NativeViewGestureHandler ref={contentGestureRef}>
								<View
									style={[
										styles.contentContainer,
										{ maxHeight: H - (snapsY[0] ?? H * 0.4) },
									]}
									renderToHardwareTextureAndroid
									{...(Platform.OS === 'ios'
										? { shouldRasterizeIOS: true }
										: {})}
								>
									{children}
								</View>
							</NativeViewGestureHandler>
						</Animated.View>
					</GestureDetector>
				</Animated.View>
			</GestureHandlerRootView>
		);
	}
);

export default BottomSheet;

const styles = StyleSheet.create({
	backdrop: {
		position: 'absolute',
		left: 0,
		top: 0,
		backgroundColor: '#000',
	},
	sheet: {
		position: 'absolute',
		left: 0,
		top: 0,
		backgroundColor: '#fff',
		overflow: 'hidden',
	},
	handle: {
		width: 40,
		height: 5,
		borderRadius: 3,
		backgroundColor: '#E5E9EF',
		alignSelf: 'center',
		marginTop: 8,
		marginBottom: 8,
	},
	contentContainer: {
		paddingBottom: 24,
		paddingHorizontal: 16,
		flexGrow: 0,
	},
});
