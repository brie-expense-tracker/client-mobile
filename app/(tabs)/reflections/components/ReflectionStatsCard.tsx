import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WeeklyReflection } from '../../../../src/services';
import { dynamicTextStyle } from '../../../../src/utils/accessibility';

interface ReflectionStatsCardProps {
	reflection: WeeklyReflection | null;
}

export function ReflectionStatsCard({ reflection }: ReflectionStatsCardProps) {
	// Early return if reflection is null or undefined
	if (!reflection) {
		return null;
	}
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
		});
	};

	const getCompletionPercentage = () => {
		const completedFields = [
			reflection.moodRating,
			reflection.winOfTheWeek,
			reflection.reflectionNotes,
		].filter(Boolean).length;

		return Math.round((completedFields / 3) * 100);
	};

	const getMoodEmoji = (rating?: number) => {
		if (!rating) return '😐';
		switch (rating) {
			case 1:
				return '😢';
			case 2:
				return '😔';
			case 3:
				return '😐';
			case 4:
				return '😊';
			case 5:
				return '😄';
			default:
				return '😐';
		}
	};

	const getMoodLabel = (rating?: number) => {
		if (!rating) return 'Not rated';
		switch (rating) {
			case 1:
				return 'Very Poor';
			case 2:
				return 'Poor';
			case 3:
				return 'Neutral';
			case 4:
				return 'Good';
			case 5:
				return 'Excellent';
			default:
				return 'Not rated';
		}
	};

	const getFinancialHealthScore = () => {
		const { netSavings, budgetUtilization, goalProgress } =
			reflection.financialMetrics;

		let score = 0;

		// Net savings component (40% weight)
		if (netSavings > 0) score += 40;
		else if (netSavings === 0) score += 20;

		// Budget utilization component (30% weight)
		if (budgetUtilization <= 80) score += 30;
		else if (budgetUtilization <= 100) score += 20;
		else score += 10;

		// Goal progress component (30% weight)
		score += (goalProgress / 100) * 30;

		return Math.round(score);
	};

	const getHealthScoreColor = (score: number) => {
		if (score >= 80) return '#4CAF50';
		if (score >= 60) return '#8BC34A';
		if (score >= 40) return '#FF9800';
		return '#F44336';
	};

	const getHealthScoreLabel = (score: number) => {
		if (score >= 80) return 'Excellent';
		if (score >= 60) return 'Good';
		if (score >= 40) return 'Fair';
		return 'Needs Improvement';
	};

	return (
		<View style={styles.container}>
			<Text style={[styles.title, dynamicTextStyle]}>Week Summary</Text>

			<View style={styles.statsGrid}>
				{/* Completion Status */}
				<View style={styles.statCard}>
					<View style={styles.statHeader}>
						<Ionicons name="checkmark-circle" size={20} color="#00a2ff" />
						<Text style={[styles.statLabel, dynamicTextStyle]}>Completion</Text>
					</View>
					<Text style={[styles.statValue, dynamicTextStyle]}>
						{getCompletionPercentage()}%
					</Text>
					<Text style={[styles.statSubtext, dynamicTextStyle]}>
						{reflection.completed ? 'Completed' : 'In Progress'}
					</Text>
				</View>

				{/* Mood Rating */}
				<View style={styles.statCard}>
					<View style={styles.statHeader}>
						<Text style={styles.moodEmoji}>
							{getMoodEmoji(reflection.moodRating)}
						</Text>
						<Text style={[styles.statLabel, dynamicTextStyle]}>Mood</Text>
					</View>
					<Text style={[styles.statValue, dynamicTextStyle]}>
						{reflection.moodRating ? `${reflection.moodRating}/5` : 'N/A'}
					</Text>
					<Text style={[styles.statSubtext, dynamicTextStyle]}>
						{getMoodLabel(reflection.moodRating)}
					</Text>
				</View>

				{/* Financial Health */}
				<View style={styles.statCard}>
					<View style={styles.statHeader}>
						<Ionicons
							name="trending-up"
							size={20}
							color={getHealthScoreColor(getFinancialHealthScore())}
						/>
						<Text style={[styles.statLabel, dynamicTextStyle]}>
							Financial Health
						</Text>
					</View>
					<Text
						style={[
							styles.statValue,
							dynamicTextStyle,
							{ color: getHealthScoreColor(getFinancialHealthScore()) },
						]}
					>
						{getFinancialHealthScore()}/100
					</Text>
					<Text style={[styles.statSubtext, dynamicTextStyle]}>
						{getHealthScoreLabel(getFinancialHealthScore())}
					</Text>
				</View>

				{/* Week Range */}
				<View style={styles.statCard}>
					<View style={styles.statHeader}>
						<Ionicons name="calendar" size={20} color="#666" />
						<Text style={[styles.statLabel, dynamicTextStyle]}>Week</Text>
					</View>
					<Text style={[styles.statValue, dynamicTextStyle]}>
						{formatDate(reflection.weekStartDate)}
					</Text>
					<Text style={[styles.statSubtext, dynamicTextStyle]}>
						to {formatDate(reflection.weekEndDate)}
					</Text>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 20,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 3.84,
		elevation: 5,
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		color: '#1a1a1a',
		marginBottom: 16,
	},
	statsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
	},
	statCard: {
		flex: 1,
		minWidth: '45%',
		backgroundColor: '#f8f9fa',
		borderRadius: 8,
		padding: 12,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#e0e0e0',
	},
	statHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
		gap: 6,
	},
	statLabel: {
		fontSize: 12,
		fontWeight: '500',
		color: '#666',
	},
	statValue: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1a1a1a',
		marginBottom: 2,
	},
	statSubtext: {
		fontSize: 10,
		color: '#999',
		textAlign: 'center',
	},
	moodEmoji: {
		fontSize: 16,
	},
});

export default ReflectionStatsCard;
