import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, space, shadow } from '../theme';

type HeroCardProps = {
	children: React.ReactNode;
	/** Variant: gradient (Dashboard) or dark (Wallet) */
	variant?: 'gradient' | 'dark';
	/** Make card pressable */
	onPress?: () => void;
	/** Accessibility label (required if onPress provided) */
	accessibilityLabel?: string;
	/** Custom style */
	style?: ViewStyle;
	/** Custom content container style */
	contentStyle?: ViewStyle;
};

/**
 * HeroCard - Standardized hero component with gradient or dark variant
 * 
 * Shared properties across variants:
 * - Border radius: 24
 * - Horizontal padding: space.xl (24)
 * - Typography scale: Use AppText components
 * - Shadow style: Enhanced card shadow
 * - Accent color tokens: palette.primary, palette.primaryMuted
 * 
 * @example
 * <HeroCard variant="gradient" onPress={handlePress}>
 *   <AppText.Heading>Weekly Check-In</AppText.Heading>
 * </HeroCard>
 * 
 * @example
 * <HeroCard variant="dark">
 *   <AppText.Heading>Safe to Spend</AppText.Heading>
 * </HeroCard>
 */
export const HeroCard: React.FC<HeroCardProps> = ({
	children,
	variant = 'gradient',
	onPress,
	accessibilityLabel,
	style,
	contentStyle,
}) => {
	const HERO_RADIUS = 24;
	const HERO_PADDING = space.xl; // 24

	const cardStyle: ViewStyle[] = [
		styles.card,
		{
			borderRadius: HERO_RADIUS,
		},
		...(style ? [style] : []),
	];

	const contentContainerStyle: ViewStyle[] = [
		styles.content,
		{
			paddingHorizontal: HERO_PADDING,
			paddingVertical: HERO_PADDING,
		},
		...(contentStyle ? [contentStyle] : []),
	];

	const content = (
		<View style={cardStyle}>
			{variant === 'gradient' ? (
				<LinearGradient
					colors={[palette.primary, palette.primaryMuted]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={[styles.gradient, contentContainerStyle]}
				>
					{children}
				</LinearGradient>
			) : (
				<View style={[styles.dark, contentContainerStyle]}>
					{children}
				</View>
			)}
		</View>
	);

	if (onPress) {
		return (
			<TouchableOpacity
				onPress={onPress}
				activeOpacity={0.8}
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
		overflow: 'hidden',
		...shadow.hero,
	},
	gradient: {
		// Gradient styles handled by LinearGradient
	},
	dark: {
		backgroundColor: palette.chipText,
	},
	content: {
		// Padding applied via inline styles
	},
});
