import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { Goal } from '../context/goalContext';

interface GoalsProgressGraphProps {
	goals: Goal[];
	title?: string;
}

const GoalsProgressGraph: React.FC<GoalsProgressGraphProps> = ({
	goals,
	title = 'Goals Progress',
}) => {
	const screenWidth = Dimensions.get('window').width;
	const chartSize = Math.min(screenWidth - 120, 250); // Account for parent ScrollView padding (40px) + component padding (40px) + extra margin (40px)

	// Filter out completed goals for the pie chart
	const activeGoals = goals.filter((goal) => goal.current < goal.target);

	// Transform goals data for the pie chart
	const pieData = activeGoals
		.map((goal) => {
			const progress = goal.current / goal.target;
			const remaining = 1 - progress;

			return [
				{
					value: goal.current,
					color: goal.color,
					text: `${goal.name}\n$${goal.current.toFixed(0)}`,
					textColor: '#FFFFFF',
					textSize: 12,
					fontWeight: '600',
				},
				{
					value: goal.target - goal.current,
					color: `${goal.color}40`, // 40% opacity for remaining
					text: '',
				},
			];
		})
		.flat();

	// Calculate overall progress
	const totalTarget = goals.reduce((sum, goal) => sum + goal.target, 0);
	const totalCurrent = goals.reduce((sum, goal) => sum + goal.current, 0);
	const overallProgress =
		totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

	// Get completed goals
	const completedGoals = goals.filter((goal) => goal.current >= goal.target);

	return (
		<View style={styles.container}>
			<Text style={styles.title}>{title}</Text>

			{/* Overall Progress Summary */}
			<View style={styles.summaryContainer}>
				<View style={styles.summaryItem}>
					<Text style={styles.summaryLabel}>Total Progress</Text>
					<Text style={styles.summaryValue}>{overallProgress.toFixed(1)}%</Text>
				</View>
				<View style={styles.summaryItem}>
					<Text style={styles.summaryLabel}>Active Goals</Text>
					<Text style={styles.summaryValue}>{activeGoals.length}</Text>
				</View>
				<View style={styles.summaryItem}>
					<Text style={styles.summaryLabel}>Completed</Text>
					<Text style={styles.summaryValue}>{completedGoals.length}</Text>
				</View>
			</View>

			{/* Pie Chart */}
			{pieData.length > 0 ? (
				<View style={styles.chartContainer}>
					<View style={styles.chartWrapper}>
						<PieChart
							data={pieData}
							radius={chartSize / 2}
							innerRadius={chartSize / 3}
							centerLabelComponent={() => (
								<View style={styles.centerLabel}>
									<Text style={styles.centerLabelText}>
										{overallProgress.toFixed(1)}%
									</Text>
									<Text style={styles.centerLabelSubtext}>Overall</Text>
								</View>
							)}
							showText
							textColor="white"
							textSize={12}
							fontWeight="600"
							strokeWidth={2}
							strokeColor="white"
							showGradient
							gradientCenterColor="#FFFFFF"
						/>
					</View>
				</View>
			) : (
				<View style={styles.emptyState}>
					<Text style={styles.emptyText}>No active goals</Text>
					<Text style={styles.emptySubtext}>
						Add some goals to see your progress here
					</Text>
				</View>
			)}

			{/* Goals List */}
			<View style={styles.goalsList}>
				{goals.map((goal, index) => {
					const progress = Math.min((goal.current / goal.target) * 100, 100);
					const isCompleted = goal.current >= goal.target;

					return (
						<View key={goal.id} style={styles.goalItem}>
							<View style={styles.goalHeader}>
								<View
									style={[
										styles.goalIcon,
										{ backgroundColor: `${goal.color}20` },
									]}
								>
									<Text style={[styles.goalIconText, { color: goal.color }]}>
										{goal.name.charAt(0).toUpperCase()}
									</Text>
								</View>
								<View style={styles.goalInfo}>
									<Text style={styles.goalName}>{goal.name}</Text>
									<Text style={styles.goalAmount}>
										${goal.current.toFixed(0)} / ${goal.target.toFixed(0)}
									</Text>
								</View>
								<View style={styles.goalProgress}>
									<Text style={styles.goalPercentage}>
										{progress.toFixed(0)}%
									</Text>
									{isCompleted && (
										<View style={styles.completedBadge}>
											<Text style={styles.completedText}>✓</Text>
										</View>
									)}
								</View>
							</View>

							{/* Progress Bar */}
							<View style={styles.progressBarContainer}>
								<View style={styles.progressBarBackground}>
									<View
										style={[
											styles.progressBarFill,
											{
												width: `${progress}%`,
												backgroundColor: goal.color,
											},
										]}
									/>
								</View>
							</View>
						</View>
					);
				})}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 20,
		marginVertical: 10,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		color: '#1A1A1A',
		marginBottom: 20,
		textAlign: 'center',
	},
	summaryContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginBottom: 20,
		paddingVertical: 15,
		backgroundColor: '#F8F9FA',
		borderRadius: 12,
	},
	summaryItem: {
		alignItems: 'center',
	},
	summaryLabel: {
		fontSize: 12,
		color: '#666',
		marginBottom: 4,
	},
	summaryValue: {
		fontSize: 18,
		fontWeight: '700',
		color: '#2E78B7',
	},
	chartContainer: {
		alignItems: 'center',
		marginBottom: 20,
		width: '100%',
		overflow: 'hidden',
	},
	chartWrapper: {
		overflow: 'hidden',
		borderRadius: 12,
	},
	centerLabel: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	centerLabelText: {
		fontSize: 24,
		fontWeight: '700',
		color: '#2E78B7',
	},
	centerLabelSubtext: {
		fontSize: 12,
		color: '#666',
		marginTop: 2,
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: 40,
	},
	emptyText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#666',
		marginBottom: 8,
	},
	emptySubtext: {
		fontSize: 14,
		color: '#999',
		textAlign: 'center',
	},
	goalsList: {
		marginTop: 10,
	},
	goalItem: {
		marginBottom: 16,
	},
	goalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	goalIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	goalIconText: {
		fontSize: 16,
		fontWeight: '700',
	},
	goalInfo: {
		flex: 1,
	},
	goalName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1A1A1A',
		marginBottom: 2,
	},
	goalAmount: {
		fontSize: 14,
		color: '#666',
	},
	goalProgress: {
		alignItems: 'flex-end',
	},
	goalPercentage: {
		fontSize: 16,
		fontWeight: '700',
		color: '#2E78B7',
		marginBottom: 4,
	},
	completedBadge: {
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: '#4CAF50',
		alignItems: 'center',
		justifyContent: 'center',
	},
	completedText: {
		color: 'white',
		fontSize: 12,
		fontWeight: '700',
	},
	progressBarContainer: {
		marginLeft: 52, // Align with goal info
	},
	progressBarBackground: {
		height: 6,
		backgroundColor: '#E0E0E0',
		borderRadius: 3,
		overflow: 'hidden',
	},
	progressBarFill: {
		height: '100%',
		borderRadius: 3,
	},
});

export default GoalsProgressGraph;
