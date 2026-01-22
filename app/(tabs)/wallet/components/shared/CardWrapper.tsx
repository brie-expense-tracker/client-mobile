import React, { useCallback, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { shadow, palette } from '../../../../../src/ui/theme';

type CardWrapperProps = {
	children: React.ReactNode;
	onPress?: () => void;
	accessibilityLabel: string;
};

function useCardPressAnimation() {
	const scale = useRef(new Animated.Value(1)).current;
	const opacity = useRef(new Animated.Value(1)).current;

	const handlePressIn = useCallback(() => {
		Animated.parallel([
			Animated.spring(scale, {
				toValue: 0.97,
				useNativeDriver: true,
				speed: 20,
				bounciness: 6,
			}),
			Animated.timing(opacity, {
				toValue: 0.9,
				duration: 120,
				useNativeDriver: true,
			}),
		]).start();
	}, [scale, opacity]);

	const handlePressOut = useCallback(() => {
		Animated.parallel([
			Animated.spring(scale, {
				toValue: 1,
				useNativeDriver: true,
				speed: 20,
				bounciness: 6,
			}),
			Animated.timing(opacity, {
				toValue: 1,
				duration: 120,
				useNativeDriver: true,
			}),
		]).start();
	}, [scale, opacity]);

	const animatedStyle: StyleProp<ViewStyle> = {
		transform: [{ scale }],
		opacity,
	};

	return { animatedStyle, handlePressIn, handlePressOut };
}

export default function CardWrapper({
	children,
	onPress,
	accessibilityLabel,
}: CardWrapperProps) {
	const { animatedStyle, handlePressIn, handlePressOut } =
		useCardPressAnimation();

	const isPressable = !!onPress;

	return (
		<TouchableOpacity
			activeOpacity={1}
			onPress={onPress}
			onPressIn={isPressable ? handlePressIn : undefined}
			onPressOut={isPressable ? handlePressOut : undefined}
			disabled={!isPressable}
			accessibilityRole={isPressable ? 'button' : undefined}
			accessibilityLabel={accessibilityLabel}
		>
			<Animated.View style={[styles.card, animatedStyle]}>
				{children}
			</Animated.View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: palette.surface,
		borderRadius: 22,
		padding: 18,
		...shadow.card,
	},
});
