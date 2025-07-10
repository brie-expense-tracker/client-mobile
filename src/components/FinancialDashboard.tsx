import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	ActivityIndicator,
	TouchableOpacity,
	RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBudget } from '../context/budgetContext';
import { useGoal } from '../context/goalContext';
import { ApiService } from '../services/apiService';
import BudgetOverviewGraph from './BudgetOverviewGraph';
import GoalsProgressGraph from './GoalsProgressGraph';
import SpendingTrendsGraph from './SpendingTrendsGraph';

interface Transaction {
	id: string;
	type: 'income' | 'expense';
	amount: number;
	date: string;
}

interface FinancialDashboardProps {
	title?: string;
}

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
	title = 'Financial Overview',
}) => {
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [selectedPeriod, setSelectedPeriod] = useState<
		'week' | 'month' | 'quarter' | 'year'
	>('month');
	const [error, setError] = useState<string | null>(null);

	const { budgets, isLoading: budgetsLoading } = useBudget();
	const { goals, isLoading: goalsLoading } = useGoal();

	// Period options
	const periodOptions = [
		{ key: 'week', label: 'Week', icon: 'calendar-outline' },
		{ key: 'month', label: 'Month', icon: 'calendar' },
		{ key: 'quarter', label: 'Quarter', icon: 'calendar-clear' },
		{ key: 'year', label: 'Year', icon: 'calendar-number' },
	] as const;

	// Fetch transactions
	const fetchTransactions = async () => {
		try {
			setError(null);
			const response = await ApiService.get<any>('/transactions');

			if (response.success && response.data) {
				const transactionData = response.data.data || response.data;
				const formattedTransactions: Transaction[] = transactionData.map(
					(tx: any) => ({
						id: tx._id || tx.id,
						type: tx.type,
						amount: Number(tx.amount) || 0,
						date: tx.date,
					})
				);
				setTransactions(formattedTransactions);
			} else {
				throw new Error(response.error || 'Failed to fetch transactions');
			}
		} catch (err) {
			console.error('Error fetching transactions:', err);
			setError(
				err instanceof Error ? err.message : 'Failed to fetch transactions'
			);
		}
	};

	// Load data on mount
	useEffect(() => {
		fetchTransactions();
	}, []);

	// Refresh data
	const onRefresh = async () => {
		setRefreshing(true);
		await fetchTransactions();
		setRefreshing(false);
	};

	// Calculate summary statistics
	const getSummaryStats = () => {
		const now = new Date();
		const start = new Date();

		switch (selectedPeriod) {
			case 'week':
				start.setDate(now.getDate() - 7);
				break;
			case 'month':
				start.setMonth(now.getMonth() - 1);
				break;
			case 'quarter':
				start.setMonth(now.getMonth() - 3);
				break;
			case 'year':
				start.setFullYear(now.getFullYear() - 1);
				break;
		}

		const periodTransactions = transactions.filter((tx) => {
			const txDate = new Date(tx.date);
			return txDate >= start && txDate <= now;
		});

		const totalIncome = periodTransactions
			.filter((tx) => tx.type === 'income')
			.reduce((sum, tx) => sum + tx.amount, 0);

		const totalExpense = periodTransactions
			.filter((tx) => tx.type === 'expense')
			.reduce((sum, tx) => sum + tx.amount, 0);

		return {
			totalIncome,
			totalExpense,
			netIncome: totalIncome - totalExpense,
			transactionCount: periodTransactions.length,
		};
	};

	const summaryStats = getSummaryStats();

	if (loading || budgetsLoading || goalsLoading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#2E78B7" />
				<Text style={styles.loadingText}>Loading your financial data...</Text>
			</View>
		);
	}

	return (
		<ScrollView
			style={styles.container}
			refreshControl={
				<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
			}
		>
			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.title}>{title}</Text>
				<Text style={styles.subtitle}>
					Track your spending, budgets, and goals
				</Text>
			</View>

			{/* Period Selector */}
			<View style={styles.periodSelector}>
				{periodOptions.map((option) => (
					<TouchableOpacity
						key={option.key}
						style={[
							styles.periodOption,
							selectedPeriod === option.key && styles.periodOptionActive,
						]}
						onPress={() => setSelectedPeriod(option.key)}
					>
						<Ionicons
							name={option.icon as any}
							size={16}
							color={selectedPeriod === option.key ? '#FFFFFF' : '#666'}
						/>
						<Text
							style={[
								styles.periodOptionText,
								selectedPeriod === option.key && styles.periodOptionTextActive,
							]}
						>
							{option.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{/* Summary Cards */}
			<View style={styles.summaryContainer}>
				<View
					style={[styles.summaryCard, { backgroundColor: '#4CAF50' + '15' }]}
				>
					<View style={styles.summaryCardHeader}>
						<Ionicons name="trending-up" size={20} color="#4CAF50" />
						<Text style={[styles.summaryCardLabel, { color: '#4CAF50' }]}>
							Income
						</Text>
					</View>
					<Text style={[styles.summaryCardValue, { color: '#4CAF50' }]}>
						${summaryStats.totalIncome.toFixed(0)}
					</Text>
				</View>

				<View
					style={[styles.summaryCard, { backgroundColor: '#FF6B6B' + '15' }]}
				>
					<View style={styles.summaryCardHeader}>
						<Ionicons name="trending-down" size={20} color="#FF6B6B" />
						<Text style={[styles.summaryCardLabel, { color: '#FF6B6B' }]}>
							Expenses
						</Text>
					</View>
					<Text style={[styles.summaryCardValue, { color: '#FF6B6B' }]}>
						${summaryStats.totalExpense.toFixed(0)}
					</Text>
				</View>

				<View
					style={[styles.summaryCard, { backgroundColor: '#2E78B7' + '15' }]}
				>
					<View style={styles.summaryCardHeader}>
						<Ionicons name="wallet" size={20} color="#2E78B7" />
						<Text style={[styles.summaryCardLabel, { color: '#2E78B7' }]}>
							Net
						</Text>
					</View>
					<Text style={[styles.summaryCardValue, { color: '#2E78B7' }]}>
						${summaryStats.netIncome.toFixed(0)}
					</Text>
				</View>
			</View>

			{/* Error State */}
			{error && (
				<View style={styles.errorContainer}>
					<Ionicons name="alert-circle" size={24} color="#FF6B6B" />
					<Text style={styles.errorText}>{error}</Text>
					<TouchableOpacity
						style={styles.retryButton}
						onPress={fetchTransactions}
					>
						<Text style={styles.retryButtonText}>Retry</Text>
					</TouchableOpacity>
				</View>
			)}

			{/* Graphs */}
			{!error && (
				<>
					{/* Spending Trends */}
					<SpendingTrendsGraph
						transactions={transactions}
						title={`${
							selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)
						}ly Spending Trends`}
						period={selectedPeriod}
					/>

					{/* Budget Overview */}
					{budgets.length > 0 && (
						<BudgetOverviewGraph budgets={budgets} title="Budget Overview" />
					)}

					{/* Goals Progress */}
					{goals.length > 0 && (
						<GoalsProgressGraph goals={goals} title="Goals Progress" />
					)}

					{/* Empty State */}
					{transactions.length === 0 &&
						budgets.length === 0 &&
						goals.length === 0 && (
							<View style={styles.emptyState}>
								<Ionicons name="analytics-outline" size={64} color="#CCC" />
								<Text style={styles.emptyTitle}>No Financial Data</Text>
								<Text style={styles.emptySubtitle}>
									Start by adding transactions, budgets, and goals to see your
									financial insights here.
								</Text>
							</View>
						)}
				</>
			)}

			{/* Bottom Spacing */}
			<View style={styles.bottomSpacing} />
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8F9FA',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#F8F9FA',
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#666',
	},
	header: {
		padding: 20,
		paddingBottom: 10,
	},
	title: {
		fontSize: 28,
		fontWeight: '700',
		color: '#1A1A1A',
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 16,
		color: '#666',
	},
	periodSelector: {
		flexDirection: 'row',
		paddingHorizontal: 20,
		marginBottom: 20,
	},
	periodOption: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 8,
		paddingHorizontal: 12,
		marginHorizontal: 4,
		borderRadius: 8,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	periodOptionActive: {
		backgroundColor: '#2E78B7',
		borderColor: '#2E78B7',
	},
	periodOptionText: {
		marginLeft: 4,
		fontSize: 12,
		fontWeight: '600',
		color: '#666',
	},
	periodOptionTextActive: {
		color: '#FFFFFF',
	},
	summaryContainer: {
		flexDirection: 'row',
		paddingHorizontal: 20,
		marginBottom: 20,
	},
	summaryCard: {
		flex: 1,
		padding: 16,
		borderRadius: 12,
		marginHorizontal: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	summaryCardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	summaryCardLabel: {
		marginLeft: 8,
		fontSize: 12,
		fontWeight: '600',
	},
	summaryCardValue: {
		fontSize: 20,
		fontWeight: '700',
	},
	errorContainer: {
		margin: 20,
		padding: 16,
		backgroundColor: '#FFEBEE',
		borderRadius: 12,
		borderLeftWidth: 4,
		borderLeftColor: '#FF6B6B',
		alignItems: 'center',
	},
	errorText: {
		marginTop: 8,
		fontSize: 14,
		color: '#D32F2F',
		textAlign: 'center',
		marginBottom: 12,
	},
	retryButton: {
		backgroundColor: '#FF6B6B',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 6,
	},
	retryButtonText: {
		color: '#FFFFFF',
		fontSize: 14,
		fontWeight: '600',
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: 60,
		paddingHorizontal: 40,
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#666',
		marginTop: 16,
		marginBottom: 8,
	},
	emptySubtitle: {
		fontSize: 14,
		color: '#999',
		textAlign: 'center',
		lineHeight: 20,
	},
	bottomSpacing: {
		height: 20,
	},
});

export default FinancialDashboard;
