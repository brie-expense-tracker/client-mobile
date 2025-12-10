import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LinearProgressBar from '../shared/LinearProgressBar';
import { palette, space, type as typography } from '../../../../../src/ui';
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
					<Text style={styles.overline}>Track Your Goals</Text>
					<Text style={styles.headerTitle}>Your Goals</Text>
				</View>
				<TouchableOpacity
					activeOpacity={0.85}
					onPress={onAddGoal}
					style={styles.iconButton}
					accessibilityRole="button"
					accessibilityLabel="Add new goal"
				>
					<Ionicons name="add" size={20} color={palette.primary} />
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
		// hero-style: parent supplies horizontal padding
		paddingTop: space.xs,
		paddingBottom: space.lg,
	},

	/* HEADER */
	header: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
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
		maxWidth: '80%',
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

	/* PROGRESS */
	progressSection: {
		marginTop: space.md,
		marginBottom: space.lg,
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
