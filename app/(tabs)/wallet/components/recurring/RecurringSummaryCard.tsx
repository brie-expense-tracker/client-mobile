// app/(tabs)/wallet/components/recurring/RecurringSummaryCard.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
	palette,
	radius,
	space,
	type as typography,
} from '../../../../../src/ui';
import { currency } from '../../../../../src/utils/format';

type RecurringSummary = {
	totalMonthly: number;
	overdueAmount: number;
	dueSoonAmount: number;
	paidCount: number;
	upcomingCount: number;
	overdueCount: number;
};

interface Props {
	summary: RecurringSummary;
	onAddPress: () => void;
}

const RecurringSummaryCard: React.FC<Props> = ({ summary, onAddPress }) => {
	return (
		<View style={styles.container}>
			{/* Header row */}
			<View style={styles.headerRow}>
				<View style={{ flex: 1 }}>
					<Text style={styles.label}>Bills summary</Text>
					<Text style={styles.subtitle}>
						Quick snapshot of your regular payments.
					</Text>
				</View>

				<TouchableOpacity
					onPress={onAddPress}
					activeOpacity={0.8}
					style={styles.addButton}
				>
					<Ionicons name="add" size={18} color={palette.accent} />
					<Text style={styles.addLabel}>Add</Text>
				</TouchableOpacity>
			</View>

			{/* Primary number + secondary chips */}
			<View style={styles.primaryRow}>
				<View style={{ flex: 1 }}>
					<Text style={styles.primaryLabel}>Total monthly</Text>
					<Text style={styles.primaryAmount}>
						{currency(summary.totalMonthly)}
					</Text>
					<Text style={styles.primaryHint}>
						Subscriptions & recurring bills
					</Text>
				</View>

				<View style={styles.sideColumn}>
					<View style={styles.chip}>
						<View style={[styles.dot, styles.dotOverdue]} />
						<Text style={styles.chipText}>
							{currency(summary.overdueAmount)} overdue
						</Text>
					</View>
					<View style={styles.chip}>
						<View style={[styles.dot, styles.dotSoon]} />
						<Text style={styles.chipText}>
							{currency(summary.dueSoonAmount)} due soon
						</Text>
					</View>
				</View>
			</View>

			{/* Compact payment status */}
			<View style={styles.statusContainer}>
				<Text style={styles.statusLabel}>Payment status</Text>
				<View style={styles.statusRow}>
					<StatusPill
						icon="checkmark-circle"
						label={`${summary.paidCount} paid`}
						variant="success"
					/>
					<StatusPill
						icon="time-outline"
						label={`${summary.upcomingCount} upcoming`}
						variant="warning"
					/>
					<StatusPill
						icon="alert-circle"
						label={`${summary.overdueCount} overdue`}
						variant="danger"
					/>
				</View>
			</View>

			{/* Overdue this week pill anchored inside the card */}
			{summary.overdueAmount > 0 && (
				<View style={styles.overdueRow}>
					<View style={styles.overduePill}>
						<Ionicons
							name="alert-circle"
							size={14}
							color={palette.danger}
							style={{ marginRight: 6 }}
						/>
						<Text style={styles.overdueText}>
							{currency(summary.overdueAmount)} overdue this week
						</Text>
					</View>
				</View>
			)}
		</View>
	);
};

interface StatusPillProps {
	icon: React.ComponentProps<typeof Ionicons>['name'];
	label: string;
	variant: 'success' | 'warning' | 'danger';
}

const StatusPill: React.FC<StatusPillProps> = ({ icon, label, variant }) => {
	const colorMap = {
		success: palette.success,
		warning: palette.warning,
		danger: palette.danger,
	};

	const bgMap = {
		success: palette.successSubtle,
		warning: '#FEF3C7', // Custom warning soft color
		danger: palette.dangerSubtle,
	};

	const iconColor = colorMap[variant];
	const backgroundColor = bgMap[variant];

	return (
		<View style={[styles.pill, { backgroundColor, marginRight: space.sm }]}>
			<Ionicons name={icon} size={14} color={iconColor} />
			<Text style={[styles.pillText, { color: iconColor }]}>{label}</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	// 👇 just content spacing – no card chrome here
	container: {
		paddingVertical: space.md,
	},

	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: space.md,
	},

	label: {
		...typography.labelSm,
		color: palette.text,
		marginBottom: 2,
		textTransform: 'none',
		letterSpacing: 0,
	},

	subtitle: {
		...typography.bodyXs,
		color: palette.textMuted,
	},

	addButton: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: radius.pill,
		paddingHorizontal: space.md,
		paddingVertical: space.xs,
		backgroundColor: palette.surfaceSubtle,
	},

	addLabel: {
		...typography.labelSm,
		color: palette.accent,
		marginLeft: 4,
		textTransform: 'none',
		letterSpacing: 0,
	},

	primaryRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginTop: space.md,
	},

	primaryLabel: {
		...typography.bodyXs,
		color: palette.textMuted,
		marginBottom: 2,
	},

	primaryAmount: {
		...typography.num2xl,
		color: palette.text,
	},

	primaryHint: {
		...typography.bodyXs,
		color: palette.textMuted,
		marginTop: 4,
	},

	sideColumn: {
		marginLeft: space.lg,
		justifyContent: 'center',
	},

	chip: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: radius.pill,
		paddingHorizontal: space.md,
		paddingVertical: space.xs,
		backgroundColor: palette.surfaceSubtle,
		marginBottom: space.xs,
	},

	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		marginRight: 6,
	},

	dotOverdue: {
		backgroundColor: palette.danger,
	},

	dotSoon: {
		backgroundColor: palette.warning,
	},

	chipText: {
		...typography.bodyXs,
		color: palette.text,
	},

	statusContainer: {
		marginTop: space.lg,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: palette.borderSubtle,
		paddingTop: space.md,
	},

	statusLabel: {
		...typography.bodyXs,
		color: palette.textMuted,
		marginBottom: space.sm,
	},

	statusRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
	},

	pill: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: radius.pill,
		paddingHorizontal: space.md,
		paddingVertical: space.xs,
		opacity: 0.8,
	},

	pillText: {
		...typography.bodyXs,
		marginLeft: 4,
	},

	overdueRow: {
		marginTop: space.md,
		flexDirection: 'row',
		justifyContent: 'flex-start',
	},

	overduePill: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 999,
		paddingHorizontal: space.md,
		paddingVertical: space.xs,
		backgroundColor: palette.dangerSoft,
	},

	overdueText: {
		...typography.bodyXs,
		color: palette.danger,
	},
});

export default RecurringSummaryCard;
