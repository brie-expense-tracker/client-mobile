// app/(tabs)/wallet/components/bills/BillsSummaryCard.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SummaryHeroCard from '../shared/SummaryHeroCard';
import { palette, space, radius, type as typography } from '../../../../../src/ui';
import { currency } from '../../../../../src/utils/format';

type BillsSummary = {
	totalMonthly: number;
	overdueAmount: number;
	dueSoonAmount: number;
	paidCount: number;
	upcomingCount: number;
	overdueCount: number;
};

interface Props {
	summary: BillsSummary;
	onAddPress?: () => void; // Optional since FAB handles this now
}

const BillsSummaryCard: React.FC<Props> = ({ summary }) => {
	const totalLabel = currency(summary.totalMonthly || 0);
	const overdueLabel = currency(summary.overdueAmount || 0);
	const dueSoonLabel = currency(summary.dueSoonAmount || 0);

	return (
		<SummaryHeroCard
			overline="TRACK YOUR BILLS"
			title="Bills Summary"
		>
			{/* Main numbers */}
			<View style={styles.mainRow}>
				<View style={styles.mainBlock}>
					<Text style={styles.mainLabel}>TOTAL MONTHLY</Text>
					<Text style={styles.mainValue}>{totalLabel}</Text>
					<Text style={styles.mainSub}>Subscriptions &amp; bills</Text>
				</View>

				<View style={styles.sideBlock}>
					<Text style={styles.sideLabel}>OVERDUE</Text>
					<Text style={styles.sideValue}>{overdueLabel}</Text>

					<Text style={[styles.sideLabel, { marginTop: space.xs }]}>
						DUE SOON
					</Text>
					<Text style={styles.sideValue}>{dueSoonLabel}</Text>
				</View>
			</View>

			{/* Payment status */}
			<View style={styles.statusSection}>
				<Text style={styles.statusLabel}>Payment status</Text>
				<View style={styles.statusRow}>
					<View style={[styles.statusPill, styles.statusNeutral]}>
						<View style={[styles.dot, styles.dotPaid]} />
						<Text style={styles.statusText}>{summary.paidCount} paid</Text>
					</View>

					<View style={[styles.statusPill, styles.statusNeutral]}>
						<View style={[styles.dot, styles.dotDueSoon]} />
						<Text style={styles.statusText}>
							{summary.upcomingCount} upcoming
						</Text>
					</View>

					<View style={[styles.statusPill, styles.statusDanger]}>
						<View style={[styles.dot, styles.dotOverdue]} />
						<Text style={styles.statusText}>
							{summary.overdueCount} overdue
						</Text>
					</View>
				</View>
			</View>
		</SummaryHeroCard>
	);
};

const styles = StyleSheet.create({
	mainRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginTop: space.md, // ✅ tighter like Budget
	},

	mainBlock: {
		flex: 1,
		paddingRight: space.lg,
	},

	mainLabel: {
		...typography.labelSm,
		color: palette.textMuted,
		textTransform: 'uppercase',
		letterSpacing: 1.0,
	},

	// ✅ give Bills the same "hero number" feel
	mainValue: {
		...typography.num2xl,
		color: palette.text,
		fontWeight: '900',
		marginTop: space.xs,
	},

	mainSub: {
		...typography.bodySm,
		color: palette.textSubtle,
		marginTop: space.xs,
	},

	sideBlock: {
		alignItems: 'flex-end',
		minWidth: 120,
	},

	sideLabel: {
		...typography.labelSm,
		color: palette.textMuted,
		textTransform: 'uppercase',
		letterSpacing: 1.0,
	},

	sideValue: {
		...typography.numMd,
		color: palette.text,
		fontWeight: '800',
		marginTop: space.xs,
	},

	statusSection: {
		marginTop: space.md,
	},

	statusLabel: {
		...typography.bodySm,
		color: palette.textMuted,
		marginBottom: space.xs,
	},

	statusRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: space.sm,
	},

	statusPill: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: space.sm,
		paddingVertical: space.xs, // ✅ tighter vertical padding to match Budgets
		borderRadius: radius.pill,
	},

	statusNeutral: {
		backgroundColor: palette.surfaceAlt,
	},

	statusDanger: {
		backgroundColor: palette.dangerSoft,
	},

	statusText: {
		...typography.bodyXs,
		color: palette.text,
	},

	dot: {
		width: 8,
		height: 8,
		borderRadius: radius.pill,
		marginRight: space.xs,
	},

	dotOverdue: {
		backgroundColor: palette.danger,
	},

	dotDueSoon: {
		backgroundColor: palette.warning,
	},

	dotPaid: {
		backgroundColor: palette.success,
	},
});

export default BillsSummaryCard;
