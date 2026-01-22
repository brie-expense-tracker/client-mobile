// SummaryHeroCard.tsx
// Reusable hero card component for Budgets, Bills, Goals, etc.
// Ensures consistent styling across all wallet summary screens

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, space, radius, shadow, type as typography } from '../../../../../src/ui';

interface SummaryHeroCardProps {
	/** Overline text (e.g., "TRACK YOUR BUDGETS") */
	overline: string;
	/** Main title (e.g., "Budget Overview") */
	title: string;
	/** Add button label (e.g., "Add Budget") - optional, if not provided, button won't render */
	addButtonLabel?: string;
	/** Callback when add button is pressed */
	onAddPress?: () => void;
	/** Optional content to render on the right side of the header (e.g., date chip) */
	headerRight?: React.ReactNode;
	/** Custom content to render below the header */
	children: React.ReactNode;
	/** Optional custom style for the card */
	style?: ViewStyle;
}

/**
 * SummaryHeroCard - Standardized hero card for wallet summary screens
 * 
 * Provides consistent:
 * - Card styling (white background, 24px radius, padding)
 * - Header layout (overline + title + add pill)
 * - Typography scale
 * - Spacing rhythm
 */
export const SummaryHeroCard: React.FC<SummaryHeroCardProps> = ({
	overline,
	title,
	addButtonLabel,
	onAddPress,
	headerRight,
	children,
	style,
}) => {
	return (
		<View style={[styles.card, style]}>
			{/* Header */}
			<View style={styles.headerRow}>
				<View style={{ flex: 1 }}>
					<Text style={styles.overline}>{overline}</Text>
					<Text style={styles.title}>{title}</Text>
				</View>

				<View style={styles.headerRight}>
					{headerRight}
					{addButtonLabel && onAddPress && (
						<TouchableOpacity
							activeOpacity={0.9}
							onPress={onAddPress}
							style={styles.addPill}
							accessibilityRole="button"
							accessibilityLabel={`Add new ${addButtonLabel.toLowerCase()}`}
						>
							<Ionicons name="add" size={18} color={palette.text} />
							<Text style={styles.addPillText}>{addButtonLabel}</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>

			{/* Custom content */}
			{children}
		</View>
	);
};

const styles = StyleSheet.create({
	card: {
		backgroundColor: palette.surface,
		borderRadius: radius.xl,
		padding: space.lg,
		...shadow.card,
	},

	headerRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		gap: space.md,
	},

	headerRight: {
		alignItems: 'flex-end',
		gap: space.sm,
	},

	overline: {
		...typography.labelSm,
		color: palette.textMuted,
		textTransform: 'uppercase',
		letterSpacing: 1.05,
	},

	title: {
		...typography.titleMd,
		fontSize: 26,
		lineHeight: 30,
		fontWeight: '800',
		color: palette.text,
		marginTop: space.xs,
	},

	addPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.sm,
		paddingHorizontal: space.md,
		height: 38,
		borderRadius: radius.pill,
		backgroundColor: palette.surfaceAlt,
		borderWidth: 1,
		borderColor: palette.borderMuted,
		marginTop: 2, // Align with title baseline - fine-tuned spacing
	},

	addPillText: {
		...typography.bodySm,
		color: palette.text,
		fontWeight: '700',
	},
});

export default SummaryHeroCard;
