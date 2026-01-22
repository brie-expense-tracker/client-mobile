// BudgetSummaryCard.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearProgressBar from '../shared/LinearProgressBar';
import SummaryHeroCard from '../shared/SummaryHeroCard';
import { palette, space, radius, type as typography } from '../../../../../src/ui';
import { currency } from '../../../../../src/utils/format';

interface BudgetSummaryCardProps {
	periodLabel: string;
	periodTitle?: string;
	periodRangeLabel?: string;
	totalBudgets: number;
	totalPlanned: number;
	totalSpent: number;
	onAddBudget?: () => void; // Optional since FAB handles this now
}

const BudgetSummaryCard: React.FC<BudgetSummaryCardProps> = ({
	periodLabel,
	periodTitle,
	periodRangeLabel,
	totalPlanned,
	totalSpent,
}) => {
	const remaining = Math.max(totalPlanned - totalSpent, 0);
	const percentUsed = totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : 0;

	const chipTitle = periodTitle || periodLabel;
	const chipSub = periodRangeLabel || 'Across all periods';

	const showProgressMeta = totalPlanned > 0;

	return (
		<SummaryHeroCard
			overline="TRACK YOUR BUDGETS"
			title="Budget Overview"
			headerRight={
				<View style={styles.periodChip}>
					<Text style={styles.periodChipTitle} numberOfLines={1}>
						{chipTitle}
					</Text>
					<Text style={styles.periodChipSub} numberOfLines={1}>
						{chipSub}
					</Text>
				</View>
			}
		>
			{/* Remaining */}
			<View style={styles.remainingRow}>
				<View style={styles.remainingLeft}>
					<Text style={styles.sectionLabel}>REMAINING</Text>
					<Text style={styles.remainingValue}>{currency(remaining)}</Text>
					<Text style={styles.remainingSub}>
						{currency(totalSpent)} spent of {currency(totalPlanned)}
					</Text>
				</View>
			</View>

			{/* Stats */}
			<View style={styles.statRow}>
				<View style={styles.statPill}>
					<Text style={styles.statLabel}>Planned</Text>
					<Text style={styles.statValue}>{currency(totalPlanned)}</Text>
				</View>
				<View style={styles.statPill}>
					<Text style={styles.statLabel}>Spent</Text>
					<Text style={styles.statValue}>{currency(totalSpent)}</Text>
				</View>
				<View style={styles.statPill}>
					<Text style={styles.statLabel}>Left</Text>
					<Text style={styles.statValue}>{currency(remaining)}</Text>
				</View>
			</View>

			{/* Progress */}
			<View style={styles.progressSection}>
				<LinearProgressBar
					percent={percentUsed}
					height={7}
					color={palette.primary}
					trackColor={palette.borderMuted}
					leftLabel={showProgressMeta ? `${percentUsed.toFixed(1)}% used` : ''}
					rightLabel={showProgressMeta ? `${currency(remaining)} left` : ''}
				/>
			</View>
		</SummaryHeroCard>
	);
};

const styles = StyleSheet.create({
	remainingRow: {
		marginTop: space.md,
	},

	remainingLeft: {
		flex: 1,
	},

	periodChip: {
		alignSelf: 'flex-start',
		backgroundColor: palette.surfaceAlt,
		borderRadius: radius.md,
		paddingHorizontal: space.md,
		paddingVertical: space.sm,
		borderWidth: 1,
		borderColor: palette.borderMuted,
		minWidth: 100,
	},

	periodChipTitle: {
		...typography.bodySm,
		color: palette.text,
		fontWeight: '700',
	},

	periodChipSub: {
		...typography.bodyXs,
		color: palette.textMuted,
		marginTop: 2, // Fine-tuned spacing for chip subtitle
	},

	sectionLabel: {
		...typography.labelSm,
		color: palette.textMuted,
		textTransform: 'uppercase',
		letterSpacing: 1.0,
	},

	remainingValue: {
		...typography.num2xl,
		color: palette.text,
		fontWeight: '900',
		marginTop: space.xs,
	},

	remainingSub: {
		...typography.bodySm,
		color: palette.textSubtle,
		marginTop: space.xs,
	},

	statRow: {
		flexDirection: 'row',
		gap: space.sm, // ↓ slightly tighter
		marginTop: space.md,
	},

	statPill: {
		flex: 1,
		backgroundColor: palette.surfaceAlt,
		borderRadius: radius.md,
		paddingVertical: space.sm, // ↓ smaller pill
		paddingHorizontal: space.md,
		borderWidth: 1,
		borderColor: palette.borderMuted,
	},

	statLabel: {
		...typography.bodyXs,
		color: palette.textMuted,
	},

	statValue: {
		...typography.numMd,
		color: palette.text,
		fontWeight: '800',
		marginTop: space.xs,
	},

	progressSection: {
		marginTop: space.md,
	},
});

export default BudgetSummaryCard;
