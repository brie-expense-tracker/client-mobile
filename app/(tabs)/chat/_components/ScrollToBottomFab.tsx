import React, { useEffect, useState } from 'react';
import {
	StyleSheet,
	TouchableOpacity,
	Dimensions,
	Platform,
	Keyboard,
} from 'react-native';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
	accessibilityProps,
	generateAccessibilityLabel,
	voiceOverHints,
} from '../../../../src/utils/accessibility';

interface ScrollToBottomFabProps {
	visible: boolean;
	onPress: () => void;
}

export default function ScrollToBottomFab({
	visible,
	onPress,
}: ScrollToBottomFabProps) {
	const scale = useSharedValue(0);
	const rotation = useSharedValue(0);
	const pulse = useSharedValue(1);
	const [keyboardHeight, setKeyboardHeight] = useState(0);
	const [screenDimensions, setScreenDimensions] = useState(
		Dimensions.get('window')
	);
	const insets = useSafeAreaInsets();

	// Animate position changes when keyboard appears/disappears
	const positionAnimation = useSharedValue(0);

	useEffect(() => {
		if (visible) {
			// Bounce in effect
			scale.value = withTiming(1.1, { duration: 150 }, () => {
				scale.value = withTiming(1, { duration: 100 });
			});

			// Add subtle pulse animation to draw attention
			setTimeout(() => {
				pulse.value = withTiming(1.05, { duration: 1000 }, () => {
					pulse.value = withTiming(1, { duration: 1000 });
				});
			}, 300);
		} else {
			scale.value = withTiming(0, { duration: 180 });
			pulse.value = 1; // Reset pulse
		}
	}, [visible, scale, pulse]);

	// Handle screen orientation changes
	useEffect(() => {
		const subscription = Dimensions.addEventListener('change', ({ window }) => {
			setScreenDimensions(window);
		});

		return () => subscription?.remove();
	}, []);

	// Handle keyboard events
	useEffect(() => {
		const keyboardWillShow = (event: any) => {
			const keyboardHeight = event.endCoordinates.height;
			setKeyboardHeight(keyboardHeight);
			// Animate position change
			positionAnimation.value = withTiming(1, { duration: 300 });
		};

		const keyboardWillHide = () => {
			setKeyboardHeight(0);
			// Animate position change back
			positionAnimation.value = withTiming(0, { duration: 300 });
		};

		// Add keyboard listeners
		if (Platform.OS === 'ios') {
			// iOS specific keyboard events
			const showSubscription = Keyboard.addListener(
				'keyboardWillShow',
				keyboardWillShow
			);
			const hideSubscription = Keyboard.addListener(
				'keyboardWillHide',
				keyboardWillHide
			);

			return () => {
				showSubscription?.remove();
				hideSubscription?.remove();
			};
		} else {
			// Android keyboard events
			const showSubscription = Keyboard.addListener(
				'keyboardDidShow',
				keyboardWillShow
			);
			const hideSubscription = Keyboard.addListener(
				'keyboardDidHide',
				keyboardWillHide
			);

			return () => {
				showSubscription?.remove();
				hideSubscription?.remove();
			};
		}
	}, [positionAnimation]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value * pulse.value }],
		opacity: scale.value,
	}));

	const iconAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${rotation.value}deg` }],
	}));

	// Dynamic positioning based on screen size, safe area, and keyboard
	const getDynamicPosition = () => {
		const { width, height } = screenDimensions;
		const isLandscape = width > height;

		// Base positioning
		let right = 18;
		let bottom = 160;

		// Adjust for different screen sizes
		if (width >= 768) {
			// Tablet
			right = 24;
			bottom = 200;
		} else if (width >= 414) {
			// Large phone
			right = 20;
			bottom = 180;
		}

		// Adjust for landscape mode
		if (isLandscape) {
			bottom = Math.max(bottom - 40, 120);
		}

		// Adjust for safe area
		right = Math.max(right, insets.right + 8);
		bottom = Math.max(bottom, insets.bottom + 20);

		// Adjust for keyboard
		if (keyboardHeight > 0) {
			// When keyboard is visible, position above the keyboard
			bottom = keyboardHeight + 20;
		}

		return { right, bottom };
	};

	const { right, bottom } = getDynamicPosition();

	const handlePress = async () => {
		// Add subtle rotation animation on press
		rotation.value = withTiming(180, { duration: 200 }, () => {
			rotation.value = withTiming(0, { duration: 200 });
		});

		// Add haptic feedback with error handling
		try {
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		} catch (error) {
			// Haptics not available on this device, silently continue
			console.warn('Haptic feedback not available:', error);
		}

		onPress();
	};

	return (
		<Animated.View
			style={[
				styles.fabContainer,
				animatedStyle,
				{
					right,
					bottom,
				},
			]}
			accessibilityRole="button"
			accessibilityLabel={generateAccessibilityLabel.button('Scroll to bottom')}
			accessibilityHint={voiceOverHints.navigate}
		>
			<TouchableOpacity
				onPress={handlePress}
				style={styles.fab}
				activeOpacity={0.8}
				{...accessibilityProps.button}
				accessibilityLabel={generateAccessibilityLabel.button(
					'Scroll to bottom'
				)}
				accessibilityHint={voiceOverHints.navigate}
			>
				<Animated.View style={iconAnimatedStyle}>
					<Ionicons
						name="arrow-down"
						size={18}
						color="#fff"
						accessibilityRole="image"
						accessibilityLabel="Scroll down arrow"
					/>
				</Animated.View>
			</TouchableOpacity>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	fabContainer: {
		position: 'absolute',
		zIndex: 1000,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	fab: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#2563eb',
		borderWidth: 2,
		borderColor: '#fff',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 4,
	},
});
