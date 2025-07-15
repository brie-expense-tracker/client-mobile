import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBudget } from '../context/budgetContext';
import { useGoal } from '../context/goalContext';

interface Transaction {
	id: string;
	type: 'income' | 'expense';
	amount: number;
	date: string;
	description?: string;
	target?: string; // ObjectId of the target Budget or Goal
	targetModel?: 'Budget' | 'Goal';
	updatedAt?: string;
}

interface RecentTransactionsListProps {
	transactions: Transaction[];
	maxItems?: number;
	onViewAll?: () => void;
	onTransactionPress?: (transaction: Transaction) => void;
}

const RecentTransactionsList: React.FC<RecentTransactionsListProps> = ({
	transactions,
	maxItems = 5,
	onViewAll,
	onTransactionPress,
}) => {
	const { budgets } = useBudget();
	const { goals } = useGoal();

	const recentTransactions = transactions.slice(0, maxItems);

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		if (date.toDateString() === today.toDateString()) {
			return 'Today';
		} else if (date.toDateString() === yesterday.toDateString()) {
			return 'Yesterday';
		} else {
			return date.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
			});
		}
	};

	const formatAmount = (amount: number, type: 'income' | 'expense') => {
		const sign = type === 'income' ? '+' : '-';
		return `${sign}$${Math.abs(amount).toFixed(2)}`;
	};

	// Helper function to get target name with progress
	const getTargetName = (transaction: Transaction): string => {
		if (transaction.target && transaction.targetModel) {
			if (transaction.targetModel === 'Budget') {
				const budget = budgets.find((b) => b.id === transaction.target);
				if (budget) {
					const transactionContribution =
						(transaction.amount / (budget.amount || 1)) * 100;
					return `${budget.name} • +${transactionContribution.toFixed(
						1
					)}% to budget`;
				}
				return 'Unknown Budget';
			} else if (transaction.targetModel === 'Goal') {
				const goal = goals.find((g) => g.id === transaction.target);
				if (goal) {
					const transactionContribution =
						(transaction.amount / goal.target) * 100;
					return `${goal.name} • +${transactionContribution.toFixed(
						1
					)}% to goal`;
				}
				return 'Unknown Goal';
			}
		}

		// Fallback: show transaction type when no target is specified
		return transaction.type === 'income' ? 'Income' : 'Expense';
	};

	// Helper function to get transaction context (icon and color from target)
	const getTransactionContext = (transaction: Transaction) => {
		if (transaction.target && transaction.targetModel) {
			if (transaction.targetModel === 'Budget') {
				const budget = budgets.find((b) => b.id === transaction.target);
				if (budget) {
					return {
						icon: budget.icon as keyof typeof Ionicons.glyphMap,
						color: budget.color,
					};
				}
			} else if (transaction.targetModel === 'Goal') {
				const goal = goals.find((g) => g.id === transaction.target);
				if (goal) {
					return {
						icon: goal.icon as keyof typeof Ionicons.glyphMap,
						color: goal.color,
					};
				}
			}
		}

		// Fallback for transactions without target or when target not found
		// Use more descriptive icons based on transaction type
		if (transaction.type === 'income') {
			return {
				icon: 'trending-up-outline' as keyof typeof Ionicons.glyphMap,
				color: '#16a34a', // Green for income
			};
		} else {
			return {
				icon: 'trending-down-outline' as keyof typeof Ionicons.glyphMap,
				color: '#dc2626', // Red for expense
			};
		}
	};

	const renderTransaction = (transaction: Transaction) => {
		const targetName = getTargetName(transaction);
		const iconData = getTransactionContext(transaction);

		// Debug logging to see transaction descriptions
		console.log('Transaction debug:', {
			id: transaction.id,
			description: transaction.description,
			type: transaction.type,
			amount: transaction.amount,
			date: transaction.date,
		});

		return (
			<TouchableOpacity
				key={transaction.id}
				style={styles.transactionItem}
				onPress={() => onTransactionPress?.(transaction)}
			>
				<View style={styles.transactionLeft}>
					<View
						style={[
							styles.categoryIcon,
							{ backgroundColor: iconData.color + '20' },
						]}
					>
						<Ionicons name={iconData.icon} size={16} color={iconData.color} />
					</View>
					<View style={styles.transactionInfo}>
						<Text style={styles.transactionDescription}>
							{transaction.description || 'No description'}
						</Text>
						<Text style={styles.transactionCategory}>{targetName}</Text>
					</View>
				</View>

				<View style={styles.transactionRight}>
					<Text
						style={[
							styles.transactionAmount,
							{
								color: transaction.type === 'income' ? '#4CAF50' : '#FF6B6B',
							},
						]}
					>
						{formatAmount(transaction.amount, transaction.type)}
					</Text>
					<Text style={styles.transactionDate}>
						{formatDate(transaction.date)}
					</Text>
				</View>
			</TouchableOpacity>
		);
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Recent Transactions</Text>
				{onViewAll && (
					<TouchableOpacity onPress={onViewAll} style={styles.viewAllButton}>
						<Text style={styles.viewAllText}>View All</Text>
						<Ionicons name="chevron-forward" size={16} color="#2E78B7" />
					</TouchableOpacity>
				)}
			</View>

			{recentTransactions.length > 0 ? (
				<View style={styles.transactionsList}>
					{recentTransactions.map(renderTransaction)}
				</View>
			) : (
				<View style={styles.emptyState}>
					<Ionicons name="receipt-outline" size={48} color="#CCC" />
					<Text style={styles.emptyText}>No recent transactions</Text>
					<Text style={styles.emptySubtext}>
						Add your first transaction to get started
					</Text>
				</View>
			)}

			{/* Summary Stats */}
			{recentTransactions.length > 0 && (
				<View style={styles.summaryStats}>
					<View style={styles.summaryItem}>
						<Text style={styles.summaryLabel}>Total Income</Text>
						<Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
							$
							{recentTransactions
								.filter((t) => t.type === 'income')
								.reduce((sum, t) => sum + t.amount, 0)
								.toFixed(2)}
						</Text>
					</View>
					<View style={styles.summaryItem}>
						<Text style={styles.summaryLabel}>Total Expenses</Text>
						<Text style={[styles.summaryValue, { color: '#FF6B6B' }]}>
							$
							{recentTransactions
								.filter((t) => t.type === 'expense')
								.reduce((sum, t) => sum + t.amount, 0)
								.toFixed(2)}
						</Text>
					</View>
					<View style={styles.summaryItem}>
						<Text style={styles.summaryLabel}>Net</Text>
						<Text
							style={[
								styles.summaryValue,
								{
									color:
										recentTransactions.reduce(
											(sum, t) =>
												sum + (t.type === 'income' ? t.amount : -t.amount),
											0
										) >= 0
											? '#4CAF50'
											: '#FF6B6B',
								},
							]}
						>
							$
							{recentTransactions
								.reduce(
									(sum, t) =>
										sum + (t.type === 'income' ? t.amount : -t.amount),
									0
								)
								.toFixed(2)}
						</Text>
					</View>
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
	},
	viewAllButton: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	viewAllText: {
		color: '#2E78B7',
		fontSize: 14,
		fontWeight: '500',
	},
	transactionsList: {
		marginBottom: 16,
	},
	transactionItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F0F0F0',
	},
	transactionLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	categoryIcon: {
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	transactionInfo: {
		flex: 1,
	},
	transactionDescription: {
		fontSize: 14,
		fontWeight: '500',
		color: '#333',
		marginBottom: 2,
	},
	transactionCategory: {
		fontSize: 12,
		color: '#666',
	},
	transactionRight: {
		alignItems: 'flex-end',
	},
	transactionAmount: {
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 2,
	},
	transactionDate: {
		fontSize: 12,
		color: '#666',
	},
	emptyState: {
		alignItems: 'center',
		padding: 32,
	},
	emptyText: {
		marginTop: 8,
		fontSize: 16,
		fontWeight: '500',
		color: '#666',
	},
	emptySubtext: {
		marginTop: 4,
		fontSize: 14,
		color: '#999',
		textAlign: 'center',
	},
	summaryStats: {
		flexDirection: 'row',
		backgroundColor: '#F8F9FA',
		borderRadius: 8,
		padding: 12,
	},
	summaryItem: {
		flex: 1,
		alignItems: 'center',
	},
	summaryLabel: {
		fontSize: 12,
		color: '#666',
		marginBottom: 4,
	},
	summaryValue: {
		fontSize: 14,
		fontWeight: '600',
	},
});

export default RecentTransactionsList;
