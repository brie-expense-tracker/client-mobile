import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../../../../src/data/transactions';
import { useBudget } from '../../../../src/context/budgetContext';
import { useGoal } from '../../../../src/context/goalContext';

interface QuickFinancialSummaryProps {
	transactions: Transaction[];
}

const QuickFinancialSummary: React.FC<QuickFinancialSummaryProps> = ({
	transactions,
}) => {
	const { budgets } = useBudget();
	const { goals } = useGoal();

	const summary = useMemo(() => {
		const totalIncome = transactions
			.filter((t) => t.type === 'income')
			.reduce((sum, t) => sum + (isNaN(t.amount) ? 0 : t.amount), 0);

		const totalExpense = transactions
			.filter((t) => t.type === 'expense')
			.reduce((sum, t) => sum + (isNaN(t.amount) ? 0 : t.amount), 0);

		const netSavings = totalIncome - totalExpense;
		const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

		// Calculate budget utilization
		const totalBudgetAllocated = budgets.reduce((sum, b) => sum + b.amount, 0);
		const totalBudgetSpent = budgets.reduce(
			(sum, b) => sum + (b.spent || 0),
			0
		);
		const budgetUtilization =
			totalBudgetAllocated > 0
				? (totalBudgetSpent / totalBudgetAllocated) * 100
				: 0;

		// Calculate goal progress
		const totalGoalTarget = goals.reduce((sum, g) => sum + g.target, 0);
		const totalGoalCurrent = goals.reduce((sum, g) => sum + g.current, 0);
		const goalProgress =
			totalGoalTarget > 0 ? (totalGoalCurrent / totalGoalTarget) * 100 : 0;

		return {
			totalIncome,
			totalExpense,
			netSavings,
			savingsRate,
			budgetUtilization,
			goalProgress,
		};
	}, [transactions, budgets, goals]);

	const getHealthStatus = () => {
		if (summary.savingsRate >= 20 && summary.budgetUtilization <= 80) {
			return {
				status: 'Excellent',
				color: '#16a34a',
				icon: 'checkmark-circle',
			};
		} else if (summary.savingsRate >= 10 && summary.budgetUtilization <= 90) {
			return {
				status: 'Good',
				color: '#f59e0b',
				icon: 'checkmark-circle-outline',
			};
		} else {
			return {
				status: 'Needs Attention',
				color: '#dc2626',
				icon: 'alert-circle',
			};
		}
	};

	const healthStatus = getHealthStatus();

	return (
		<View style={styles.quickSummaryContainer}>
			<View style={styles.quickSummaryHeader}>
				<Text style={styles.quickSummaryTitle}>Financial Health</Text>
				<View style={styles.healthStatusContainer}>
					<Ionicons
						name={healthStatus.icon as keyof typeof Ionicons.glyphMap}
						size={16}
						color={healthStatus.color}
					/>
					<Text
						style={[styles.healthStatusText, { color: healthStatus.color }]}
					>
						{healthStatus.status}
					</Text>
				</View>
			</View>
			<View style={styles.quickSummaryStats}>
				<View style={styles.quickSummaryStat}>
					<Text style={styles.quickSummaryStatLabel}>Savings Rate</Text>
					<Text style={styles.quickSummaryStatValue}>
						{summary.savingsRate.toFixed(1)}%
					</Text>
				</View>
				<View style={styles.quickSummaryStat}>
					<Text style={styles.quickSummaryStatLabel}>Budget Used</Text>
					<Text style={styles.quickSummaryStatValue}>
						{summary.budgetUtilization.toFixed(1)}%
					</Text>
				</View>
				<View style={styles.quickSummaryStat}>
					<Text style={styles.quickSummaryStatLabel}>Goal Progress</Text>
					<Text style={styles.quickSummaryStatValue}>
						{summary.goalProgress.toFixed(1)}%
					</Text>
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	quickSummaryContainer: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#efefef',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	quickSummaryHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	quickSummaryTitle: {
		fontWeight: '600',
		fontSize: 16,
		color: '#333',
	},
	healthStatusContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	healthStatusText: {
		fontSize: 12,
		fontWeight: '500',
	},
	quickSummaryStats: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	quickSummaryStat: {
		alignItems: 'center',
		flex: 1,
	},
	quickSummaryStatLabel: {
		fontSize: 12,
		color: '#666',
		fontWeight: '500',
		marginBottom: 4,
	},
	quickSummaryStatValue: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
	},
});

export default QuickFinancialSummary; 