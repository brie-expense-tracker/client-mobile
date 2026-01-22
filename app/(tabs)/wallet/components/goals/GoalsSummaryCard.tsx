import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearProgressBar from '../shared/LinearProgressBar';
import SummaryHeroCard from '../shared/SummaryHeroCard';
import { palette, space, radius, type as typography } from '../../../../../src/ui';
import { currency } from '../../../../../src/utils/format';

interface Props {
	totalGoals: number;
	completedGoals: number;
	totalTarget: number;
	totalCurrent: number;
	onAddGoal?: () => void; // Optional since FAB handles this now
}

const GoalsSummaryCard: React.FC<Props> = ({
	totalGoals,
	completedGoals,
	totalTarget,
	totalCurrent,
}) => {
	const progressPercentage =
		totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

	return (
		<SummaryHeroCard
			overline="TRACK YOUR GOALS"
			title="Your Goals"
		>
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
		</SummaryHeroCard>
	);
};

const styles = StyleSheet.create({
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
		columnGap: space.xl,
		rowGap: space.md,
	},

	statCard: {
		flexBasis: '45%',
	},

	statValue: {
		...typography.numMd,
		color: palette.text,
		marginBottom: space.xs,
	},

	statLabel: {
		...typography.bodyXs,
		color: palette.textSubtle,
		fontWeight: '500',
	},
});

export default GoalsSummaryCard;
