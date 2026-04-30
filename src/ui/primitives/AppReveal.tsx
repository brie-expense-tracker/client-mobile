import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, ViewStyle } from 'react-native';

type AppRevealProps = {
	children: React.ReactNode;
	delayMs?: number;
	durationMs?: number;
	distance?: number;
	style?: ViewStyle;
};

export const AppReveal: React.FC<AppRevealProps> = ({
	children,
	delayMs = 0,
	durationMs = 360,
	distance = 12,
	style,
}) => {
	const opacity = useRef(new Animated.Value(0)).current;
	const translateY = useRef(new Animated.Value(distance)).current;

	useEffect(() => {
		Animated.parallel([
			Animated.timing(opacity, {
				toValue: 1,
				duration: durationMs,
				delay: delayMs,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true,
			}),
			Animated.timing(translateY, {
				toValue: 0,
				duration: durationMs,
				delay: delayMs,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true,
			}),
		]).start();
	}, [delayMs, distance, durationMs, opacity, translateY]);

	const animatedStyle = useMemo(
		() => ({
			opacity,
			transform: [{ translateY }],
		}),
		[opacity, translateY],
	);

	return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
};
