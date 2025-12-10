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
					<Text style={styles.overline}>Track your debts</Text>
					<Text style={styles.headerTitle}>Debt Overview</Text>
				</View>

				<TouchableOpacity
					activeOpacity={0.85}
					onPress={onAddDebt}
					style={styles.iconButton}
					accessibilityRole="button"
					accessibilityLabel="Add a debt"
				>
					<Ionicons name="add" size={20} color={palette.primary} />
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
		// hero-style: parent supplies horizontal padding
		paddingTop: space.xs,
		paddingBottom: space.lg,
	},

	/* HEADER */
	header: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		marginBottom: space.md,
	},
	headerContent: {
		flex: 1,
	},
	overline: {
		...typography.labelSm,
		color: palette.textMuted,
		marginBottom: 6,
		letterSpacing: 1.2,
		textTransform: 'uppercase',
	},
	headerTitle: {
		...typography.titleMd,
		fontSize: 30,
		lineHeight: 34,
		fontWeight: '700',
		color: palette.text,
	},
	headerSubtitle: {
		...typography.bodySm,
		color: palette.textMuted,
		marginTop: 8,
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

	/* TOTAL ROW */
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
