import React from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BorderlessButton } from 'react-native-gesture-handler';
import { useBudget } from '../../../../src/context/budgetContext';
import { useGoal } from '../../../../src/context/goalContext';
import {
	accessibilityProps,
	dynamicTextStyle,
	generateAccessibilityLabel,
	voiceOverHints,
} from '../../../../src/utils/accessibility';

interface Transaction {
	id: string;
	description: string;
	amount: number;
	date: string; // ISO string
	type: 'income' | 'expense';
	target?: string; // ObjectId of the target Budget or Goal
	targetModel?: 'Budget' | 'Goal';
	updatedAt?: string; // ISO string for sorting by time when dates are the same
	recurringPattern?: {
		patternId: string;
		frequency: string;
		confidence: number;
		nextExpectedDate: string;
	};
}

interface TransactionHistoryProps {
	transactions: Transaction[];
	onPress: (isPressed: boolean) => void;
	isLoading?: boolean;
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
	} catch {
		return 'Invalid Date';
	}
};

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
	transactions,
	onPress,
	isLoading = false,
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

	// Show loading state
	if (isLoading) {
		return (
			<View style={styles.transactionsSectionContainer}>
				<View style={styles.transactionsHeader}>
					<Text
						style={[styles.transactionsTitle, dynamicTextStyle]}
						accessibilityRole="header"
						accessibilityLabel="Recent Activity section"
					>
						Recent Activity
					</Text>
				</View>
				<View style={styles.transactionsListContainer}>
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="small" color="#007AFF" />
						<Text
							style={[styles.loadingText, dynamicTextStyle]}
							accessibilityRole="text"
							accessibilityLabel="Loading transactions"
						>
							Loading transactions...
						</Text>
					</View>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.transactionsSectionContainer}>
			<View style={styles.transactionsHeader}>
				<Text
					style={[styles.transactionsTitle, dynamicTextStyle]}
					accessibilityRole="header"
					accessibilityLabel="Recent Activity section"
				>
					Recent Activity
				</Text>
				<TouchableOpacity
					onPress={() => router.push('/dashboard/ledger')}
					{...accessibilityProps.button}
					accessibilityLabel={generateAccessibilityLabel.button(
						'View all',
						'transactions'
					)}
					accessibilityHint={voiceOverHints.navigate}
				>
					<Text style={[styles.viewAllText, dynamicTextStyle]}>View All</Text>
				</TouchableOpacity>
			</View>

			<View
				style={styles.transactionsListContainer}
				accessibilityLabel="Recent transactions list"
			>
				{recentTransactions.length > 0 ? (
					recentTransactions.map((t, index) => {
						// Get icon and color from transaction's target
						const iconData = getTransactionContext(t);
						const amountText = currency(isNaN(t.amount) ? 0 : t.amount);
						const dateText = formatTransactionDate(t.date);
						const targetName = getTargetName(t);

						return (
							<View
								key={t.id}
								style={styles.transactionItem}
								accessibilityRole="button"
								accessibilityLabel={generateAccessibilityLabel.transactionItem(
									t.description,
									`${t.type === 'income' ? '+' : '-'}${amountText}`,
									dateText
								)}
								accessibilityHint={`${targetName}. ${voiceOverHints.navigate}`}
							>
								<BorderlessButton
									onPress={() => router.push('/dashboard/ledger')}
									style={styles.transactionContent}
									onActiveStateChange={onPress}
									{...accessibilityProps.button}
									accessibilityLabel={generateAccessibilityLabel.transactionItem(
										t.description,
										`${t.type === 'income' ? '+' : '-'}${amountText}`,
										dateText
									)}
									accessibilityHint={`${targetName}. ${voiceOverHints.navigate}`}
								>
									<View style={styles.transactionLeft}>
										<View
											style={[
												styles.iconContainer,
												{ backgroundColor: `${iconData.color}20` },
											]}
											accessibilityRole="image"
											accessibilityLabel={`${targetName} icon`}
										>
											<Ionicons
												name={iconData.icon}
												size={20}
												color={iconData.color}
											/>
										</View>
										<View style={styles.transactionInfo}>
											<Text
												style={[
													styles.transactionDescription,
													dynamicTextStyle,
												]}
												accessibilityRole="text"
											>
												{t.description}
											</Text>
											<Text
												style={[styles.transactionCategory, dynamicTextStyle]}
												accessibilityRole="text"
											>
												{targetName}
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
												dynamicTextStyle,
											]}
											accessibilityRole="text"
										>
											{t.type === 'income' ? '+' : '-'} {amountText}
										</Text>
										<Text
											style={[styles.transactionDate, dynamicTextStyle]}
											accessibilityRole="text"
										>
											{dateText}
										</Text>
									</View>
								</BorderlessButton>
							</View>
						);
					})
				) : (
					<View
						style={styles.emptyContainer}
						accessibilityRole="text"
						accessibilityLabel="No transactions available"
					>
						<Ionicons
							name="document-outline"
							size={48}
							color="#ccc"
							accessibilityRole="image"
							accessibilityLabel="Empty transactions icon"
						/>
						<Text
							style={[styles.emptyText, dynamicTextStyle]}
							accessibilityRole="text"
						>
							No transactions
						</Text>
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
	loadingContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 40,
		flexDirection: 'row',
		gap: 12,
	},
	loadingText: {
		fontSize: 14,
		color: '#666',
		fontWeight: '500',
	},
});

export default TransactionHistory;
