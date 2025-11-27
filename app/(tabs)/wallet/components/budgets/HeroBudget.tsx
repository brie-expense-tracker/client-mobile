// app/(tabs)/wallet/components/HeroBudget.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LinearProgressBar from '../shared/LinearProgressBar';
import { palette, space, type as typography } from '../../../../../src/ui';
import { currency } from '../../../../../src/utils/format';

interface HeroBudgetProps {
	periodLabel: string; // e.g. "11/23/2025–11/30/2025" or "This month"
	totalBudgets: number;
	totalPlanned: number;
	totalSpent: number;
	onAddBudget: () => void;
}

const HeroBudget: React.FC<HeroBudgetProps> = ({
	periodLabel,
	totalBudgets,
	totalPlanned,
	totalSpent,
	onAddBudget,
}) => {
	const remaining = Math.max(totalPlanned - totalSpent, 0);
	const percentUsed = totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : 0;

	const subtitle =
		totalBudgets > 0
			? 'Tracking all budget spending.'
			: 'Create your first budget to start tracking spending.';

	return (
		<View style={styles.container}>
			{/* HEADER TEXT (full width) */}
			<View style={styles.headerTextBlock}>
				<Text style={styles.overline}>All budgets</Text>
				<Text style={styles.title}>Spending overview</Text>
				<Text style={styles.subtitle}>{subtitle}</Text>
			</View>

			{/* ACTIONS ROW */}
			<View style={styles.actionsRow}>
				<View style={styles.periodPill}>
					<Ionicons
						name="calendar-outline"
						size={14}
						color={palette.textSubtle}
					/>
					<Text
						numberOfLines={1}
						ellipsizeMode="tail"
						style={styles.periodText}
					>
						{periodLabel}
					</Text>
				</View>

				<TouchableOpacity
					style={styles.addButton}
					onPress={onAddBudget}
					activeOpacity={0.9}
					accessibilityRole="button"
					accessibilityLabel="Add new budget"
				>
					<Ionicons name="add" size={18} color={palette.primary} />
					<Text style={styles.addButtonText}>Add budget</Text>
				</TouchableOpacity>
			</View>

			{/* MAIN NUMBERS */}
			<View style={styles.mainRow}>
				<View style={styles.mainBlock}>
					<Text style={styles.mainLabel}>Remaining</Text>
					<Text style={styles.mainValue}>{currency(remaining)}</Text>
					<Text style={styles.mainSub}>
						{currency(totalSpent)} spent of {currency(totalPlanned)}
					</Text>
				</View>

				<View style={styles.divider} />

				<View style={styles.sideBlock}>
					<View style={styles.sideItem}>
						<Text style={styles.sideLabel}>Planned</Text>
						<Text style={styles.sideValue}>{currency(totalPlanned)}</Text>
					</View>
					<View style={styles.sideItem}>
						<Text style={styles.sideLabel}>Spent</Text>
						<Text style={styles.sideValue}>{currency(totalSpent)}</Text>
					</View>
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
	container: {
		paddingVertical: space.md,
	},

	/* HEADER TEXT */
	headerTextBlock: {
		marginBottom: space.xs, // a bit tighter
	},

	overline: {
		...typography.labelSm,
		color: palette.textMuted,
		marginBottom: 2,
		textTransform: 'uppercase',
		letterSpacing: 0.3,
	},

	title: {
		...typography.titleMd,
		color: palette.text,
	},

	subtitle: {
		...typography.bodySm,
		color: palette.textMuted,
		marginTop: 4,
	},

	/* ACTIONS (LEFT-ALIGNED UNDER HEADER) */
	actionsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		columnGap: 8,
		marginBottom: space.md, // slightly less than before
	},

	periodPill: {
		flexDirection: 'row',
		alignItems: 'center',
		columnGap: 4,
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 999,
		backgroundColor: palette.surfaceAlt,
		borderWidth: 1,
		borderColor: palette.borderMuted,
		maxWidth: 190,
	},

	periodText: {
		...typography.labelSm,
		color: palette.textSubtle,
	},

	addButton: {
		backgroundColor: palette.surfaceAlt,
		borderRadius: 999,
		paddingVertical: 6, // a bit slimmer
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		columnGap: 6,
		borderWidth: 1,
		borderColor: palette.borderMuted,
	},

	addButtonText: {
		color: palette.primary,
		fontSize: 14,
		fontWeight: '600',
	},

	/* MAIN NUMBERS */
	mainRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: space.md,
	},

	mainBlock: {
		flex: 1.2,
	},

	mainLabel: {
		...typography.labelSm,
		color: palette.textMuted,
		textTransform: 'uppercase',
		letterSpacing: 0.3,
	},

	mainValue: {
		...typography.numLg,
		color: palette.text,
		marginTop: 2,
	},

	mainSub: {
		...typography.bodySm,
		color: palette.textSubtle,
		marginTop: 2,
	},

	divider: {
		width: 1,
		height: '70%',
		backgroundColor: palette.borderMuted,
		marginHorizontal: space.md,
		opacity: 0.7,
	},

	sideBlock: {
		flex: 0.9,
		rowGap: space.xs,
	},

	sideItem: {},

	sideLabel: {
		...typography.labelSm,
		color: palette.textMuted,
		textTransform: 'uppercase',
		letterSpacing: 0.3,
	},

	sideValue: {
		...typography.numMd,
		color: palette.text,
		marginTop: 2,
	},

	/* PROGRESS */
	progressSection: {
		marginTop: 2,
	},
});

export default HeroBudget;
