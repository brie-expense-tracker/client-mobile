// app/(tabs)/wallet/components/debts/DebtsSummaryCard.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SummaryHeroCard from '../shared/SummaryHeroCard';
import { palette, space, type as typography } from '../../../../../src/ui';
import { currency } from '../../../../../src/utils/format';

interface Props {
	totalDebt: number;
	accountsCount: number;
	highestAPR?: number | null;
	averageAPR?: number | null;
	totalMinPayment?: number | null;
	onAddDebt: () => void;
}

const DebtsSummaryCard: React.FC<Props> = ({
	totalDebt,
	accountsCount,
	highestAPR,
	averageAPR,
	totalMinPayment,
	onAddDebt,
}) => {
	return (
		<SummaryHeroCard
			overline="TRACK YOUR DEBTS"
			title="Debt Overview"
			addButtonLabel="Add Debt"
			onAddPress={onAddDebt}
		>
			{/* Main total */}
			<View style={styles.totalRow}>
				<View>
					<Text style={styles.totalLabel}>Total outstanding</Text>
					<Text style={styles.totalValue}>{currency(totalDebt)}</Text>
				</View>
				<View style={styles.chip}>
					<Text style={styles.chipLabel}>Accounts</Text>
					<Text style={styles.chipValue}>{accountsCount}</Text>
				</View>
			</View>

			{/* Stats grid */}
			<View style={styles.statsGrid}>
				<View style={styles.statCard}>
					<Text style={styles.statLabel}>Highest APR</Text>
					<Text style={styles.statValue}>
						{highestAPR != null ? `${highestAPR.toFixed(1)}%` : '—'}
					</Text>
				</View>

				<View style={styles.statCard}>
					<Text style={styles.statLabel}>Average APR</Text>
					<Text style={styles.statValue}>
						{averageAPR != null ? `${averageAPR.toFixed(1)}%` : '—'}
					</Text>
				</View>

				<View style={styles.statCard}>
					<Text style={styles.statLabel}>Min payment (mo)</Text>
					<Text style={styles.statValue}>
						{totalMinPayment != null ? currency(totalMinPayment) : '—'}
					</Text>
				</View>
			</View>
		</SummaryHeroCard>
	);
};

const styles = StyleSheet.create({
	/* TOTAL ROW */
	totalRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: space.md,
		marginBottom: space.lg,
	},
	totalLabel: {
		...typography.bodySm,
		color: palette.textMuted,
	},
	totalValue: {
		...typography.numLg,
		color: palette.text,
	},

	chip: {
		borderRadius: 999,
		paddingHorizontal: space.md,
		paddingVertical: space.xs,
		backgroundColor: palette.surfaceAlt,
		alignItems: 'flex-start',
	},

	chipLabel: {
		fontSize: 11,
		color: palette.textMuted,
		marginBottom: 2,
	},

	chipValue: {
		...typography.labelSm,
		color: palette.text,
		fontWeight: '600',
	},

	/* STAT GRID */
	statsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		columnGap: space.md,
		rowGap: space.sm,
	},

	statCard: {
		flexBasis: '30%',
		paddingVertical: space.sm,
	},

	statLabel: {
		fontSize: 12,
		color: palette.textSubtle,
		marginBottom: 2,
	},

	statValue: {
		...typography.labelSm,
		color: palette.text,
		fontWeight: '600',
	},
});

export default DebtsSummaryCard;
