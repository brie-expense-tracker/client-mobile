import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LinearProgressBar from './LinearProgressBar';
import { palette, space, type as typography } from '../../../../src/ui';
import { currency } from '../../../../src/utils/format';

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
	// const completionPercentage =
	//     totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
	const progressPercentage =
		totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

	return (
		<View style={styles.container}>
			{/* Header Section */}
			<View style={styles.header}>
				<View style={styles.headerContent}>
					<Text style={styles.headerTitle}>Goals Overview</Text>
					<Text style={styles.headerSubtitle}>
						Track your progress across all goals
					</Text>
				</View>
				<TouchableOpacity
					style={styles.addButton}
					onPress={onAddGoal}
					accessibilityRole="button"
					accessibilityLabel="Add new goal"
				>
					<Ionicons name="add" size={20} color={palette.text} />
					<Text style={styles.addButtonText}>Add Goal</Text>
				</TouchableOpacity>
			</View>

			{/* Progress Section */}
			<View style={styles.progressSection}>
				<LinearProgressBar
					percent={progressPercentage}
					height={6}
					color={palette.text}
					trackColor={palette.border}
					leftLabel={`${currency(totalCurrent)} / ${currency(totalTarget)}`}
					rightLabel={`${progressPercentage.toFixed(1)}%`}
					style={styles.progressBar}
				/>
			</View>

			{/* Stats Grid */}
			<View style={styles.statsGrid}>
				<View style={styles.statCard}>
					<Text style={styles.statValue}>{completedGoals}</Text>
					<Text style={styles.statLabel}>Completed</Text>
				</View>

				<View style={styles.statCard}>
					<Text style={styles.statValue}>{totalGoals}</Text>
					<Text style={styles.statLabel}>Total Goals</Text>
				</View>

				<View style={styles.statCard}>
					<Text style={styles.statValue}>{currency(totalCurrent)}</Text>
					<Text style={styles.statLabel}>Saved</Text>
				</View>

				<View style={styles.statCard}>
					<Text style={styles.statValue}>{currency(totalTarget)}</Text>
					<Text style={styles.statLabel}>Target</Text>
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: palette.surface,
		borderBottomWidth: 1,
		borderBottomColor: palette.border,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: space.md,
	},
	iconWrapper: {
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: palette.surfaceAlt,
		borderWidth: 1,
		borderColor: palette.border,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: space.md,
	},
	headerContent: {
		flex: 1,
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
	progressSection: {
		marginBottom: space.lg,
	},
	progressBar: {
		marginBottom: 0,
	},
	statsGrid: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	statCard: {
		flex: 1,
		alignItems: 'center',
		paddingVertical: space.sm,
	},
	statValue: {
		...typography.numMd,
		color: palette.text,
		marginBottom: 2,
	},
	statLabel: {
		fontSize: 12,
		color: palette.textSubtle,
		fontWeight: '500',
		textAlign: 'center',
	},
	addButton: {
		backgroundColor: palette.surfaceAlt,
		borderRadius: 12,
		paddingVertical: space.md,
		paddingHorizontal: 10,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginLeft: space.lg,
		borderWidth: 1,
		borderColor: palette.borderMuted,
	},
	addButtonText: {
		color: palette.text,
		fontSize: 14,
		fontWeight: '600',
	},
});

export default GoalsSummaryCard;
