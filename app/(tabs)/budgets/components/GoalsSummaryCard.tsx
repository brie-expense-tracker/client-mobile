import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LinearProgressBar from './LinearProgressBar';

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
				<TouchableOpacity style={styles.addButton} onPress={onAddGoal}>
					<Ionicons name="add" size={20} color="#0f0f0f" />
					<Text style={styles.addButtonText}>Add Goal</Text>
				</TouchableOpacity>
			</View>

			{/* Progress Section */}
			<View style={styles.progressSection}>
				<LinearProgressBar
					percent={progressPercentage}
					height={6}
					color="#18181b"
					trackColor="#e5e7eb"
					leftLabel={`$${totalCurrent.toFixed(0)} / $${totalTarget.toFixed(0)}`}
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
					<Text style={styles.statValue}>${totalCurrent.toFixed(0)}</Text>
					<Text style={styles.statLabel}>Saved</Text>
				</View>

				<View style={styles.statCard}>
					<Text style={styles.statValue}>${totalTarget.toFixed(0)}</Text>
					<Text style={styles.statLabel}>Target</Text>
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#ffffff',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	iconWrapper: {
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: '#f4f4f5',
		borderWidth: 1,
		borderColor: '#e5e7eb',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	headerContent: {
		flex: 1,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#212121',
	},
	headerSubtitle: {
		fontSize: 14,
		color: '#757575',
		marginTop: 4,
	},
	progressSection: {
		marginBottom: 16,
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
		paddingVertical: 8,
	},
	statValue: {
		fontSize: 16,
		fontWeight: '600',
		color: '#3f3f46',
		marginBottom: 2,
	},
	statLabel: {
		fontSize: 12,
		color: '#a1a1aa',
		fontWeight: '500',
		textAlign: 'center',
	},
	addButton: {
		backgroundColor: '#f7f7f7',
		borderRadius: 12,
		paddingVertical: 12,
		paddingHorizontal: 10,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginLeft: 16,
	},
	addButtonText: {
		color: '#0f0f0f',
		fontSize: 14,
		fontWeight: '600',
	},
});

export default GoalsSummaryCard;
