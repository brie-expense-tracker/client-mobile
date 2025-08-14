import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Transaction } from '../../../../src/data/transactions';
import { Ionicons } from '@expo/vector-icons';
import { BorderlessButton } from 'react-native-gesture-handler';
import { useBudget } from '../../../../src/context/budgetContext';
import { useGoal } from '../../../../src/context/goalContext';

interface TransactionHistoryProps {
	transactions: Transaction[];
	onPress: (isPressed: boolean) => void;
}

const currency = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
}).format;

const formatTransactionDate = (dateString: string): string => {
	try {
		// Handle empty, null, or undefined date strings
		if (
			!dateString ||
			typeof dateString !== 'string' ||
			dateString.trim() === ''
		) {
			return 'Invalid Date';
		}

		// Extract just the date part (YYYY-MM-DD) if it's a longer string
		const datePart = dateString.slice(0, 10);

		// Check if it's a valid YYYY-MM-DD format
		if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
			return 'Invalid Date';
		}

		// Parse the date in local timezone by creating a date object
		// and adjusting for timezone offset
		const [year, month, day] = datePart.split('-').map(Number);
		const date = new Date(year, month - 1, day); // month is 0-indexed

		// Check if the date is valid
		if (isNaN(date.getTime())) {
			return 'Invalid Date';
		}

		// Check if the date is today
		const today = new Date();
		if (date.toDateString() === today.toDateString()) {
			return today.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
			});
		}

		// Format as "Jun 27" for PST timezone
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
		});
	} catch (error) {
		return 'Invalid Date';
	}
};

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
	transactions,
	onPress,
}) => {
	const { budgets } = useBudget();
	const { goals } = useGoal();

	const recentTransactions = transactions
		.sort((a, b) => {
			// First, compare by date (newest first)
			const dateA = new Date(a.date);
			const dateB = new Date(b.date);

			if (dateA.getTime() !== dateB.getTime()) {
				return dateB.getTime() - dateA.getTime(); // Newest date first
			}

			// If dates are the same, compare by updatedAt time (newest first)
			const updatedAtA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
			const updatedAtB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);

			return updatedAtB.getTime() - updatedAtA.getTime(); // Newest time first
		})
		.slice(0, 6);

	// Helper function to get target name and percentage
	const getTargetName = (transaction: Transaction): string => {
		if (transaction.target && transaction.targetModel) {
			if (transaction.targetModel === 'Budget') {
				const budget = budgets.find((b) => b.id === transaction.target);
				if (budget) {
					const percentage = budget.spentPercentage
						? `${Math.round(budget.spentPercentage)}%`
						: '';
					return `${budget.name}${percentage ? ` (${percentage})` : ''}`;
				}
				return 'Unknown Budget';
			} else if (transaction.targetModel === 'Goal') {
				const goal = goals.find((g) => g.id === transaction.target);
				if (goal) {
					const percentage =
						goal.target > 0
							? `${Math.round((goal.current / goal.target) * 100)}%`
							: '';
					return `${goal.name}${percentage ? ` (${percentage})` : ''}`;
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

	return (
		<View style={styles.transactionsSectionContainer}>
			<View style={styles.transactionsHeader}>
				<Text style={styles.transactionsTitle}>Recent Activity</Text>
				<TouchableOpacity onPress={() => router.push('/dashboard/ledger')}>
					<Text style={styles.viewAllText}>View All</Text>
				</TouchableOpacity>
			</View>

			<View style={styles.transactionsListContainer}>
				{recentTransactions.length > 0 ? (
					recentTransactions.map((t) => {
						// Get icon and color from transaction's target
						const iconData = getTransactionContext(t);

						return (
							<View key={t.id} style={styles.transactionItem}>
								<BorderlessButton
									onPress={() => router.push('/dashboard/ledger')}
									style={styles.transactionContent}
									onActiveStateChange={onPress}
								>
									<View style={styles.transactionLeft}>
										<View
											style={[
												styles.iconContainer,
												{ backgroundColor: `${iconData.color}20` },
											]}
										>
											<Ionicons
												name={iconData.icon}
												size={20}
												color={iconData.color}
											/>
										</View>
										<View style={styles.transactionInfo}>
											<Text style={styles.transactionDescription}>
												{t.description}
											</Text>
											<Text style={styles.transactionCategory}>
												{getTargetName(t)}
											</Text>
										</View>
									</View>

									<View style={styles.transactionRight}>
										<Text
											style={[
												styles.transactionAmount,
												t.type === 'income'
													? styles.incomeAmount
													: styles.expenseAmount,
											]}
										>
											{t.type === 'income' ? '+' : '-'}{' '}
											{currency(isNaN(t.amount) ? 0 : t.amount)}
										</Text>
										<Text style={styles.transactionDate}>
											{formatTransactionDate(t.date)}
										</Text>
									</View>
								</BorderlessButton>
							</View>
						);
					})
				) : (
					<View style={styles.emptyContainer}>
						<Ionicons name="document-outline" size={48} color="#ccc" />
						<Text style={styles.emptyText}>No transactions</Text>
					</View>
				)}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	transactionsSectionContainer: {
		marginTop: 8,
	},
	transactionsHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	transactionsTitle: {
		fontWeight: '600',
		fontSize: 18,
		color: '#333',
	},
	viewAllText: {
		color: '#889195',
		fontSize: 14,
		fontWeight: '500',
	},
	transactionsListContainer: {
		backgroundColor: '#fff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#efefef',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	transactionItem: {
		borderRadius: 12,
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#efefef',
	},
	transactionContent: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		flex: 1,
	},
	transactionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	transactionInfo: { flex: 1 },
	transactionDescription: {
		fontWeight: '500',
		color: '#333',
		fontSize: 14,
	},
	transactionCategory: {
		fontSize: 12,
		color: '#666',
		marginTop: 4,
	},
	transactionRight: { alignItems: 'flex-end' },
	transactionAmount: {
		fontSize: 16,
		fontWeight: '600',
	},
	transactionDate: {
		fontSize: 12,
		color: '#666',
		marginTop: 4,
	},
	incomeAmount: { color: '#16a34a' },
	expenseAmount: { color: '#dc2626' },
	emptyContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 40,
	},
	emptyText: {
		marginTop: 16,
		fontSize: 16,
		color: '#666',
		fontWeight: '500',
	},
});

export default TransactionHistory;
