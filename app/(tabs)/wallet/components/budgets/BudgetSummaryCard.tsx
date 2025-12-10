// app/(tabs)/wallet/components/budgets/BudgetSummaryCard.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LinearProgressBar from '../shared/LinearProgressBar';
import { palette, space, type as typography } from '../../../../../src/ui';
import { currency } from '../../../../../src/utils/format';

interface BudgetSummaryCardProps {
	/**
	 * Legacy single-line label for the period (fallback).
	 * Prefer `periodTitle` + `periodRangeLabel` for the new two-line chip layout.
	 */
	periodLabel: string;
	/**
	 * Primary label inside the period chip, e.g. "December 2025" or "This week".
	 */
	periodTitle?: string;
	/**
	 * Secondary label inside the period chip, e.g. "Nov 30 – Dec 31".
	 */
	periodRangeLabel?: string;
	totalBudgets: number;
	totalPlanned: number;
	totalSpent: number;
	onAddBudget: () => void;
}

const BudgetSummaryCard: React.FC<BudgetSummaryCardProps> = ({
	periodLabel,
	periodTitle,
	periodRangeLabel,
	totalBudgets,
	totalPlanned,
	totalSpent,
	onAddBudget,
}) => {
	const remaining = Math.max(totalPlanned - totalSpent, 0);
	const percentUsed = totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : 0;
	const displayPeriod = periodTitle || periodLabel;

	return (
		<View style={styles.container}>
			{/* HEADER (title + add button) */}
			<View style={styles.headerRow}>
				<View style={styles.headerTextBlock}>
					<Text style={styles.overline}>TRACK YOUR BUDGETS</Text>
					<Text style={styles.title}>Budget Overview</Text>
					{!!displayPeriod && (
						<Text style={styles.periodLabel}>{displayPeriod}</Text>
					)}
				</View>

				<TouchableOpacity
					activeOpacity={0.85}
					onPress={onAddBudget}
					style={styles.iconButton}
					accessibilityRole="button"
					accessibilityLabel="Add new budget"
				>
					<Ionicons name="add" size={22} color={palette.primary} />
				</TouchableOpacity>
			</View>

			{/* MAIN NUMBERS */}
			<View style={styles.mainRow}>
				<View style={styles.mainBlock}>
					<Text style={styles.mainLabel}>REMAINING</Text>
					<Text style={styles.mainValue}>{currency(remaining)}</Text>
					<Text style={styles.mainSub}>
						{currency(totalSpent)} spent of {currency(totalPlanned)}
					</Text>
				</View>

				<View style={styles.sideBlock}>
					<Text style={styles.sideLabel}>PLANNED</Text>
					<Text style={styles.sideValue}>{currency(totalPlanned)}</Text>

					<Text style={[styles.sideLabel, { marginTop: space.xs }]}>SPENT</Text>
					<Text style={styles.sideValueSmall}>{currency(totalSpent)}</Text>
				</View>
			</View>

			{/* PROGRESS */}
			<View style={styles.progressSection}>
				<LinearProgressBar
					percent={percentUsed}
					height={6}
					color={palette.primary}
					trackColor={palette.borderMuted}
					leftLabel={`${percentUsed.toFixed(1)}% used`}
					rightLabel={`${currency(remaining)} left`}
				/>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	// behaves like page header, not a card
	container: {
		paddingTop: space.xs,
		paddingBottom: space.lg,
	},

	/* HEADER */
	headerRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
	},

	headerTextBlock: {
		flex: 1,
		marginBottom: space.lg,
	},

	overline: {
		...typography.labelSm,
		color: palette.textMuted,
		marginBottom: 6,
		textTransform: 'uppercase',
		letterSpacing: 1.2,
	},

	title: {
		...typography.titleMd,
		fontSize: 30,
		lineHeight: 34,
		fontWeight: '700',
		color: palette.text,
	},

	subtitle: {
		...typography.bodySm,
		color: palette.textMuted,
		marginTop: 8,
	},

	periodLabel: {
		...typography.bodySm,
		color: palette.textSecondary,
		marginTop: space.xs,
	},

	iconButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: palette.primarySoft,
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 6 },
		elevation: 3,
	},

	/* MAIN NUMBERS */
	mainRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},

	mainBlock: {
		flex: 1,
		paddingRight: space.lg,
	},

	mainLabel: {
		...typography.labelSm,
		color: palette.textMuted,
		textTransform: 'uppercase',
		letterSpacing: 1.1,
	},

	mainValue: {
		...typography.numLg,
		color: palette.text,
		marginTop: 4,
	},

	mainSub: {
		...typography.bodySm,
		color: palette.textSubtle,
		marginTop: 4,
	},

	sideBlock: {
		alignItems: 'flex-end',
		minWidth: 120,
	},

	sideLabel: {
		...typography.labelSm,
		color: palette.textMuted,
		textTransform: 'uppercase',
		letterSpacing: 1.1,
	},

	sideValue: {
		...typography.numMd,
		color: palette.text,
		marginTop: 4,
	},

	sideValueSmall: {
		...typography.numMd,
		color: palette.text,
		marginTop: 2,
	},

	/* PROGRESS */
	progressSection: {
		marginTop: space.lg,
	},
});

export default BudgetSummaryCard;
