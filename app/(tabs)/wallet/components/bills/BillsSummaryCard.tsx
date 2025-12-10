// app/(tabs)/wallet/components/bills/BillsSummaryCard.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, space, type as typography } from '../../../../../src/ui';
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
	onAddPress: () => void;
}

const BillsSummaryCard: React.FC<Props> = ({ summary, onAddPress }) => {
	const totalLabel = currency(summary.totalMonthly || 0);
	const overdueLabel = currency(summary.overdueAmount || 0);
	const dueSoonLabel = currency(summary.dueSoonAmount || 0);

	return (
		<View style={styles.container}>
			{/* HEADER (title + add button) */}
			<View style={styles.headerRow}>
				<View style={{ flex: 1 }}>
					<Text style={styles.overline}>Track your bills</Text>
					<Text style={styles.title}>Bills Summary</Text>
				</View>

				<TouchableOpacity
					activeOpacity={0.85}
					onPress={onAddPress}
					style={styles.iconButton}
					accessibilityRole="button"
					accessibilityLabel="Add new bill"
				>
					<Ionicons name="add" size={22} color={palette.primary} />
				</TouchableOpacity>
			</View>

			{/* MAIN NUMBERS (mirrors budget layout) */}
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
					<Text style={styles.sideValueSmall}>{dueSoonLabel}</Text>
				</View>
			</View>

			{/* PAYMENT STATUS (compact footer pills) */}
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
		marginTop: space.lg,
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

	/* STATUS SECTION */
	statusSection: {
		marginTop: space.lg,
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
		paddingVertical: space.xs,
		borderRadius: 999,
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
		borderRadius: 999,
		marginRight: 6,
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
