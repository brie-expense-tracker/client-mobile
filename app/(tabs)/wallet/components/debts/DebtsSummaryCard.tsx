// app/(tabs)/wallet/components/debts/DebtsSummaryCard.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<View style={styles.headerContent}>
					<Text style={styles.overline}>Debt overview</Text>
					<Text style={styles.headerTitle}>What you owe</Text>
					<Text style={styles.headerSubtitle}>
						High-level snapshot of your debt accounts.
					</Text>
				</View>

				<TouchableOpacity
					style={styles.addButton}
					onPress={onAddDebt}
					activeOpacity={0.9}
					accessibilityRole="button"
					accessibilityLabel="Add a debt"
				>
					<Ionicons name="add" size={18} color={palette.primary} />
					<Text style={styles.addButtonText}>Add debt</Text>
				</TouchableOpacity>
			</View>

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
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		paddingVertical: space.md,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: space.md,
	},
	headerContent: {
		flex: 1,
	},
	overline: {
		...typography.labelSm,
		color: palette.textMuted,
		marginBottom: 2,
	},
	headerTitle: {
		...typography.titleMd,
		color: palette.text,
	},
	headerSubtitle: {
		...typography.bodySm,
		color: palette.textMuted,
		marginTop: 4,
	},
	addButton: {
		backgroundColor: palette.surfaceAlt,
		borderRadius: 999,
		paddingVertical: space.sm,
		paddingHorizontal: 12,
		flexDirection: 'row',
		alignItems: 'center',
		columnGap: 6,
		marginLeft: space.lg,
		borderWidth: 1,
		borderColor: palette.borderMuted,
	},
	addButtonText: {
		color: palette.primary,
		fontSize: 14,
		fontWeight: '600',
	},
	totalRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
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

