import React, { useCallback, useRef } from 'react';
import {
	TouchableOpacity,
	StyleSheet,
	Animated,
	ViewStyle,
} from 'react-native';
import { palette, radius, space, shadow } from '../theme';

type AppCardProps = {
	children: React.ReactNode;
	/** Make card pressable */
	onPress?: () => void;
	/** Accessibility label (required if onPress provided) */
	accessibilityLabel?: string;
	/** Custom style */
	style?: ViewStyle;
	/** Padding. Default: space.lg */
	padding?: number;
	/** Border radius. Default: radius.lg */
	borderRadius?: number;
	/** Enable shadow. Default: true */
	elevated?: boolean;
	/** Show border. Default: false */
	bordered?: boolean;
	/** Background color. Default: palette.surface */
	backgroundColor?: string;
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

	const animatedStyle: ViewStyle = {
		transform: [{ scale }],
		opacity,
	};

	return { animatedStyle, handlePressIn, handlePressOut };
}

/**
 * AppCard - Standardized card component with optional press animation
 * 
 * Used throughout the app for consistent card styling.
 * 
 * @example
 * <AppCard onPress={handlePress} accessibilityLabel="Open budget">
 *   <AppText.Title>Budget Overview</AppText.Title>
 * </AppCard>
 */
export const AppCard: React.FC<AppCardProps> = ({
	children,
	onPress,
	accessibilityLabel,
	style,
	padding = space.lg,
	/** Default matches web compact panels (`rounded-xl3`). */
	borderRadius = radius.xl3,
	elevated = true,
	bordered = false,
	backgroundColor = palette.surface,
}) => {
	const { animatedStyle, handlePressIn, handlePressOut } =
		useCardPressAnimation();

	const isPressable = !!onPress;

	const cardStyle: ViewStyle[] = [
		styles.card,
		{
			padding,
			borderRadius,
			backgroundColor,
		},
		...(elevated ? [styles.cardElevated] : []),
		...(bordered ? [styles.cardBordered] : []),
		...(style ? [style] : []),
	];

	const content = (
		<Animated.View
			style={[cardStyle, ...(isPressable ? [animatedStyle] : [])]}
		>
			{children}
		</Animated.View>
	);

	if (isPressable) {
		return (
			<TouchableOpacity
				activeOpacity={1}
				onPress={onPress}
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				accessibilityRole="button"
				accessibilityLabel={accessibilityLabel}
			>
				{content}
			</TouchableOpacity>
		);
	}

	return content;
};

const styles = StyleSheet.create({
	card: {
		// Base styles applied via props
	},
	cardElevated: {
		...shadow.card,
	},
	cardBordered: {
		borderWidth: 1,
		borderColor: palette.border,
	},
});
