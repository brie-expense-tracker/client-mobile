import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LinearProgressBar from '../shared/LinearProgressBar';
import {
	palette,
	radius,
	space,
	type as typography,
} from '../../../../../src/ui';
import { currency } from '../../../../../src/utils/format';

interface Props {
	totalGoals: number;
	completedGoals: number;
	totalTarget: number;
	totalCurrent: number;
	onAddGoal: () => void;
}

const GoalsSummaryCard: React.FC<Props> = ({
	totalGoals,
	completedGoals,
	totalTarget,
	totalCurrent,
	onAddGoal,
}) => {
	const progressPercentage =
		totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<View style={styles.headerContent}>
					<Text style={styles.overline}>Savings goals</Text>
					<Text style={styles.headerTitle}>Goals overview</Text>
					<Text style={styles.headerSubtitle}>
						Track your progress across all goals.
					</Text>
				</View>
				<TouchableOpacity
					style={styles.addButton}
					onPress={onAddGoal}
					accessibilityRole="button"
					accessibilityLabel="Add new goal"
					activeOpacity={0.9}
				>
					<Ionicons name="add" size={18} color={palette.primary} />
					<Text style={styles.addButtonText}>Add goal</Text>
				</TouchableOpacity>
			</View>

			{/* Progress */}
			<View style={styles.progressSection}>
				<LinearProgressBar
					percent={progressPercentage}
					height={6}
					color={palette.primary}
					trackColor={palette.borderMuted}
					leftLabel={`${currency(totalCurrent)} / ${currency(totalTarget)}`}
					rightLabel={`${progressPercentage.toFixed(1)}%`}
					style={styles.progressBar}
				/>
			</View>

			{/* Stats */}
			<View style={styles.statsGrid}>
				<View style={styles.statCard}>
					<Text style={styles.statValue}>{completedGoals}</Text>
					<Text style={styles.statLabel}>Completed</Text>
				</View>

				<View style={styles.statCard}>
					<Text style={styles.statValue}>{totalGoals}</Text>
					<Text style={styles.statLabel}>Total goals</Text>
				</View>

				<View style={styles.statCard}>
					<Text style={styles.statValue}>{currency(totalCurrent)}</Text>
					<Text style={styles.statLabel}>Saved so far</Text>
				</View>

				<View style={styles.statCard}>
					<Text style={styles.statValue}>{currency(totalTarget)}</Text>
					<Text style={styles.statLabel}>Total target</Text>
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		paddingVertical: space.md,
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
		marginBottom: 2,
		letterSpacing: 0.3,
		textTransform: 'uppercase',
	},
	headerTitle: {
		...typography.titleMd,
		color: palette.text,
	},
	headerSubtitle: {
		...typography.bodySm,
		color: palette.textMuted,
		marginTop: 4,
		maxWidth: '80%',
	},
	/* ADD GOAL BUTTON (pill) */
	addButton: {
		backgroundColor: palette.surfaceAlt,
		borderRadius: radius.full,
		paddingVertical: 8,
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		borderWidth: 1,
		borderColor: palette.borderMuted,
		marginLeft: space.md,
	},
	addButtonText: {
		color: palette.primary,
		fontSize: 14,
		fontWeight: '600',
	},
	/* PROGRESS */
	progressSection: {
		marginBottom: space.lg,
		marginTop: space.sm,
	},
	progressBar: {
		marginBottom: 0,
	},
	/* STAT GRID */
	statsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		columnGap: 24,
		rowGap: space.md,
	},
	statCard: {
		flexBasis: '45%',
	},
	statValue: {
		...typography.numMd,
		color: palette.text,
		marginBottom: 4,
	},
	statLabel: {
		...typography.bodyXs,
		color: palette.textSubtle,
		fontWeight: '500',
	},
});

export default GoalsSummaryCard;
