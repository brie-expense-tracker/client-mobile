import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useBudget } from '../../../../src/context/budgetContext';
import { useGoal } from '../../../../src/context/goalContext';

const currency = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
}).format;

interface SettingsBudgetsGoalsWidgetProps {
	compact?: boolean;
}

const SettingsBudgetsGoalsWidget: React.FC<SettingsBudgetsGoalsWidgetProps> = ({
	compact = false,
}) => {
	const { budgets } = useBudget();
	const { goals } = useGoal();

	const summary = useMemo(() => {
		// Budget summary
		const totalBudgetAllocated = budgets.reduce((sum, b) => sum + b.amount, 0);
		const totalBudgetSpent = budgets.reduce(
			(sum, b) => sum + (b.spent || 0),
			0
		);
		const budgetUtilization =
			totalBudgetAllocated > 0
				? (totalBudgetSpent / totalBudgetAllocated) * 100
				: 0;

		// Goal summary
		const totalGoalTarget = goals.reduce((sum, g) => sum + g.target, 0);
		const totalGoalCurrent = goals.reduce((sum, g) => sum + g.current, 0);
		const goalProgress =
			totalGoalTarget > 0 ? (totalGoalCurrent / totalGoalTarget) * 100 : 0;

		return {
			budgetUtilization,
			goalProgress,
			budgetsCount: budgets.length,
			goalsCount: goals.length,
		};
	}, [budgets, goals]);

	const getBudgetStatusColor = (utilization: number) => {
		if (utilization > 90) return '#dc2626';
		if (utilization > 75) return '#f59e0b';
		return '#16a34a';
	};

	const getGoalStatusColor = (progress: number) => {
		if (progress >= 75) return '#16a34a';
		if (progress >= 50) return '#f59e0b';
		return '#dc2626';
	};

	if (compact) {
		return (
			<View style={styles.compactContainer}>
				<View style={styles.compactRow}>
					<TouchableOpacity
						style={styles.compactButton}
						onPress={() => router.push('/(stack)/settings')}
					>
						<Ionicons name="settings-outline" size={20} color="#666" />
						<Text style={styles.compactButtonText}>Settings</Text>
					</TouchableOpacity>

					<View style={styles.divider} />

					<TouchableOpacity
						style={styles.compactButton}
						onPress={() => router.push('/(tabs)/budgets?tab=budgets')}
					>
						<Ionicons name="wallet-outline" size={20} color="#666" />
						<Text style={styles.compactButtonText}>Budgets</Text>
					</TouchableOpacity>

					<View style={styles.divider} />

					<TouchableOpacity
						style={styles.compactButton}
						onPress={() => router.push('/(tabs)/budgets?tab=goals')}
					>
						<Ionicons name="flag-outline" size={20} color="#666" />
						<Text style={styles.compactButtonText}>Goals</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Quick Access</Text>

			<View style={styles.grid}>
				{/* Settings Card */}
				<TouchableOpacity
					style={styles.card}
					onPress={() => router.push('/(stack)/settings')}
				>
					<View style={styles.cardHeader}>
						<View style={styles.iconWrapper}>
							<Ionicons name="settings-outline" size={24} color="#666" />
						</View>
						<Text style={styles.cardTitle}>Settings</Text>
					</View>
					<Text style={styles.cardSubtitle}>Manage your preferences</Text>
				</TouchableOpacity>

				{/* Budgets Card */}
				<TouchableOpacity
					style={styles.card}
					onPress={() => router.push('/(tabs)/budgets?tab=budgets')}
				>
					<View style={styles.cardHeader}>
						<View style={styles.iconWrapper}>
							<Ionicons name="wallet-outline" size={24} color="#00a2ff" />
						</View>
						<Text style={styles.cardTitle}>Budgets</Text>
					</View>
					<Text style={styles.cardSubtitle}>
						{summary.budgetsCount > 0
							? `${summary.budgetUtilization.toFixed(0)}% used`
							: 'No budgets set'}
					</Text>
					{summary.budgetsCount > 0 && (
						<View style={styles.progressBar}>
							<View
								style={[
									styles.progressFill,
									{
										width: `${Math.min(summary.budgetUtilization, 100)}%`,
										backgroundColor: getBudgetStatusColor(
											summary.budgetUtilization
										),
									},
								]}
							/>
						</View>
					)}
				</TouchableOpacity>

				{/* Goals Card */}
				<TouchableOpacity
					style={styles.card}
					onPress={() => router.push('/(tabs)/budgets?tab=goals')}
				>
					<View style={styles.cardHeader}>
						<View style={styles.iconWrapper}>
							<Ionicons name="flag-outline" size={24} color="#9c27b0" />
						</View>
						<Text style={styles.cardTitle}>Goals</Text>
					</View>
					<Text style={styles.cardSubtitle}>
						{summary.goalsCount > 0
							? `${summary.goalProgress.toFixed(0)}% complete`
							: 'No goals set'}
					</Text>
					{summary.goalsCount > 0 && (
						<View style={styles.progressBar}>
							<View
								style={[
									styles.progressFill,
									{
										width: `${Math.min(summary.goalProgress, 100)}%`,
										backgroundColor: getGoalStatusColor(summary.goalProgress),
									},
								]}
							/>
						</View>
					)}
				</TouchableOpacity>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 20,
		marginBottom: 24,
		borderWidth: 1,
		borderColor: '#efefef',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginBottom: 16,
	},
	grid: {
		gap: 12,
	},
	card: {
		backgroundColor: '#f8f9fa',
		borderRadius: 8,
		padding: 16,
		borderWidth: 1,
		borderColor: '#e9ecef',
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-start',
		marginBottom: 8,
	},
	iconWrapper: {
		width: 32,
		height: 32,
		borderRadius: 8,
		backgroundColor: '#fff',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 1,
		// Ensure icons are perfectly centered
		textAlign: 'center',
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		flex: 1,
	},
	cardSubtitle: {
		fontSize: 14,
		color: '#666',
		marginBottom: 8,
	},
	badge: {
		backgroundColor: '#00a2ff',
		borderRadius: 10,
		minWidth: 20,
		height: 20,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 6,
	},
	badgeText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '600',
	},
	progressBar: {
		height: 4,
		backgroundColor: '#e9ecef',
		borderRadius: 2,
		overflow: 'hidden',
	},
	progressFill: {
		height: '100%',
		borderRadius: 2,
	},
	// Compact styles
	compactContainer: {
		padding: 16,
	},
	compactRow: {
		flexDirection: 'row',
		justifyContent: 'space-evenly',
		alignItems: 'center',
		width: '100%',
	},
	compactButton: {
		alignItems: 'center',
		justifyContent: 'center',
		padding: 8,
		position: 'relative',
		flex: 1,
		maxWidth: 80,
	},
	compactButtonText: {
		fontSize: 12,
		color: '#666',
		marginTop: 4,
		fontWeight: '500',
		textAlign: 'center',
	},
	compactBadge: {
		position: 'absolute',
		top: 0,
		right: -4,
		backgroundColor: '#00a2ff',
		borderRadius: 8,
		minWidth: 16,
		height: 16,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 4,
	},
	compactBadgeText: {
		color: '#fff',
		fontSize: 10,
		fontWeight: '600',
	},
	divider: {
		width: 1,
		height: 24,
		backgroundColor: '#e0e0e0',
		marginHorizontal: 8,
	},
});

export default SettingsBudgetsGoalsWidget;
