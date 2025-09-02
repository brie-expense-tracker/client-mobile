import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
} from 'react-native-reanimated';
import { sharedStyles } from '../../../../src/components/assistant/sharedStyles';

export default function TypingDots() {
	const o1 = useSharedValue(0.3);
	const o2 = useSharedValue(0.3);
	const o3 = useSharedValue(0.3);

	useEffect(() => {
		// Use runOnJS to handle the setTimeout on the JS thread
		const startAnimation = () => {
			// First dot
			o1.value = withTiming(1, { duration: 500 }, () => {
				o1.value = withTiming(0.3, { duration: 700 });
			});

			// Second dot with delay
			setTimeout(() => {
				o2.value = withTiming(1, { duration: 500 }, () => {
					o2.value = withTiming(0.3, { duration: 700 });
				});
			}, 150);

			// Third dot with delay
			setTimeout(() => {
				o3.value = withTiming(1, { duration: 500 }, () => {
					o3.value = withTiming(0.3, { duration: 700 });
				});
			}, 300);
		};

		startAnimation();

		// Set up continuous loop
		const interval = setInterval(() => {
			startAnimation();
		}, 1200); // Total cycle time

		return () => clearInterval(interval);
	}, [o1, o2, o3]);

	const d1 = useAnimatedStyle(() => ({ opacity: o1.value }));
	const d2 = useAnimatedStyle(() => ({ opacity: o2.value }));
	const d3 = useAnimatedStyle(() => ({ opacity: o3.value }));

	return (
		<View style={[sharedStyles.msgWrap, sharedStyles.msgAI]}>
			<View style={styles.typingRow}>
				<Animated.View style={[styles.dot, d1]} />
				<Animated.View style={[styles.dot, d2]} />
				<Animated.View style={[styles.dot, d3]} />
				<Text style={styles.typingText}>Analyzing your finances…</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	typingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingBottom: 6,
	},
	dot: {
		width: 7,
		height: 7,
		borderRadius: 3.5,
		backgroundColor: '#9ca3af',
		marginRight: 6,
	},
	typingText: {
		color: '#475569',
		marginLeft: 4,
		fontSize: 13,
		fontStyle: 'italic',
		fontWeight: '500',
	},
});
