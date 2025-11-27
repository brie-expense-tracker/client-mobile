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
import { useBudget } from '../../../../src/context/budgetContext';
import { useGoal } from '../../../../src/context/goalContext';
import {
	accessibilityProps,
	dynamicTextStyle,
	generateAccessibilityLabel,
	voiceOverHints,
} from '../../../../src/utils/accessibility';
import { normalizeIconName } from '../../../../src/constants/uiConstants';

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

// Smart fallback function to infer icon and color from transaction description
const getSmartFallback = (description: string, type: 'income' | 'expense') => {
	const desc = description.toLowerCase();

	// Income categories
	if (type === 'income') {
		if (
			desc.includes('salary') ||
			desc.includes('payroll') ||
			desc.includes('wage')
		) {
			return {
				icon: 'briefcase-outline' as keyof typeof Ionicons.glyphMap,
				color: '#43A047',
			};
		}
		if (
			desc.includes('freelance') ||
			desc.includes('contract') ||
			desc.includes('gig')
		) {
			return {
				icon: 'laptop-outline' as keyof typeof Ionicons.glyphMap,
				color: '#1E88E5',
			};
		}
		if (
			desc.includes('investment') ||
			desc.includes('dividend') ||
			desc.includes('stock')
		) {
			return {
				icon: 'trending-up-outline' as keyof typeof Ionicons.glyphMap,
				color: '#8E24AA',
			};
		}
		if (desc.includes('refund') || desc.includes('rebate')) {
			return {
				icon: 'arrow-back-outline' as keyof typeof Ionicons.glyphMap,
				color: '#43A047',
			};
		}
		if (desc.includes('gift') || desc.includes('bonus')) {
			return {
				icon: 'gift-outline' as keyof typeof Ionicons.glyphMap,
				color: '#FB8C00',
			};
		}
		// Default income
		return {
			icon: 'trending-up-outline' as keyof typeof Ionicons.glyphMap,
			color: '#43A047',
		};
	}

	// Expense categories
	if (
		desc.includes('food') ||
		desc.includes('restaurant') ||
		desc.includes('grocery') ||
		desc.includes('dining')
	) {
		return {
			icon: 'restaurant-outline' as keyof typeof Ionicons.glyphMap,
			color: '#FB8C00',
		};
	}
	if (
		desc.includes('gas') ||
		desc.includes('fuel') ||
		desc.includes('transport') ||
		desc.includes('uber') ||
		desc.includes('lyft')
	) {
		return {
			icon: 'car-outline' as keyof typeof Ionicons.glyphMap,
			color: '#1E88E5',
		};
	}
	if (
		desc.includes('rent') ||
		desc.includes('mortgage') ||
		desc.includes('housing') ||
		desc.includes('utilities')
	) {
		return {
			icon: 'home-outline' as keyof typeof Ionicons.glyphMap,
			color: '#8E24AA',
		};
	}
	if (
		desc.includes('shopping') ||
		desc.includes('store') ||
		desc.includes('amazon') ||
		desc.includes('retail')
	) {
		return {
			icon: 'bag-outline' as keyof typeof Ionicons.glyphMap,
			color: '#E53935',
		};
	}
	if (
		desc.includes('entertainment') ||
		desc.includes('movie') ||
		desc.includes('game') ||
		desc.includes('streaming')
	) {
		return {
			icon: 'game-controller-outline' as keyof typeof Ionicons.glyphMap,
			color: '#5E35B1',
		};
	}
	if (
		desc.includes('health') ||
		desc.includes('medical') ||
		desc.includes('doctor') ||
		desc.includes('pharmacy')
	) {
		return {
			icon: 'medical-outline' as keyof typeof Ionicons.glyphMap,
			color: '#E53935',
		};
	}
	if (
		desc.includes('education') ||
		desc.includes('school') ||
		desc.includes('course') ||
		desc.includes('book')
	) {
		return {
			icon: 'school-outline' as keyof typeof Ionicons.glyphMap,
			color: '#1E88E5',
		};
	}
	if (
		desc.includes('subscription') ||
		desc.includes('netflix') ||
		desc.includes('spotify') ||
		desc.includes('premium')
	) {
		return {
			icon: 'card-outline' as keyof typeof Ionicons.glyphMap,
			color: '#8E24AA',
		};
	}
	if (
		desc.includes('insurance') ||
		desc.includes('tax') ||
		desc.includes('fee')
	) {
		return {
			icon: 'shield-outline' as keyof typeof Ionicons.glyphMap,
			color: '#424242',
		};
	}

	// Default expense
	return {
		icon: 'trending-down-outline' as keyof typeof Ionicons.glyphMap,
		color: '#E53935',
	};
};

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
	transactions,
	onPress,
	isLoading = false,
}) => {
	const { budgets } = useBudget();
	const { goals } = useGoal();

	// Helper function to get today's date in local timezone
	const getTodayDate = (): Date => {
		const today = new Date();
		// Adjust for timezone offset to ensure we get the correct local date
		const offset = today.getTimezoneOffset();
		const localDate = new Date(today.getTime() - offset * 60 * 1000);
		// Set time to start of day for accurate comparison
		localDate.setHours(0, 0, 0, 0);
		return localDate;
	};

	const recentTransactions = transactions
		.filter((transaction) => {
			// Filter out future transactions (transactions with dates after today)
			const transactionDate = new Date(transaction.date);
			const today = getTodayDate();

			// Set transaction date to start of day for accurate comparison
			transactionDate.setHours(0, 0, 0, 0);

			return transactionDate <= today;
		})
		.sort((a, b) => {
			// First, prioritize actual transactions over recurring placeholders
			const aIsRecurringPlaceholder =
				a.description.includes('Recurring Expense');
			const bIsRecurringPlaceholder =
				b.description.includes('Recurring Expense');

			if (aIsRecurringPlaceholder !== bIsRecurringPlaceholder) {
				// Actual transactions come first
				return aIsRecurringPlaceholder ? 1 : -1;
			}

			// Then, compare by date (newest first)
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
		// Special handling for recurring expense placeholders
		if (transaction.description.includes('Recurring Expense')) {
			return 'Recurring Expense';
		}

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
		// Special handling for recurring expense placeholders
		if (transaction.description.includes('Recurring Expense')) {
			return {
				icon: 'refresh-outline' as keyof typeof Ionicons.glyphMap,
				color: '#f59e0b', // Amber for recurring
			};
		}

		// Check if transaction has a target and targetModel
		if (transaction.target && transaction.targetModel) {
			if (
				transaction.targetModel === 'Budget' &&
				transaction.type === 'expense'
			) {
				// For expenses, find the matching budget by ID
				const matchingBudget = budgets.find(
					(budget) => budget.id === transaction.target
				);

				if (matchingBudget) {
					// Use budget icon/color if available, otherwise fall back to smart inference
					const budgetIcon =
						matchingBudget.icon ||
						getSmartFallback(transaction.description, 'expense').icon;
					const budgetColor =
						matchingBudget.color ||
						getSmartFallback(transaction.description, 'expense').color;

					return {
						icon: normalizeIconName(budgetIcon),
						color: budgetColor,
					};
				}
			} else if (
				transaction.targetModel === 'Goal' &&
				transaction.type === 'income'
			) {
				// For income, find the matching goal by ID
				const matchingGoal = goals.find(
					(goal) => goal.id === transaction.target
				);

				if (matchingGoal) {
					// Use goal icon/color if available, otherwise fall back to smart inference
					const goalIcon =
						matchingGoal.icon ||
						getSmartFallback(transaction.description, 'income').icon;
					const goalColor =
						matchingGoal.color ||
						getSmartFallback(transaction.description, 'income').color;

					return {
						icon: normalizeIconName(goalIcon),
						color: goalColor,
					};
				}
			}
		}

		// Smart fallback: try to infer icon and color from transaction description
		const smartFallback = getSmartFallback(
			transaction.description,
			transaction.type
		);

		return {
			icon: smartFallback.icon,
			color: smartFallback.color,
		};
	};

	// Show loading state
	if (isLoading) {
		return (
			<View style={styles.card}>
				<Text
					style={[styles.cardTitle, dynamicTextStyle]}
					accessibilityRole="header"
					accessibilityLabel="Recent Transactions section"
				>
					Recent Transactions
				</Text>
				<View style={{ paddingVertical: 16 }}>
					<ActivityIndicator size="small" color="#007AFF" />
				</View>
			</View>
		);
	}

	return (
		<View style={styles.card}>
			<View style={styles.cardHeaderRow}>
				<Text
					style={[styles.cardTitle, dynamicTextStyle]}
					accessibilityRole="header"
					accessibilityLabel="Recent Transactions section"
				>
					Recent Transactions
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
					<Text style={styles.viewAll}>View All</Text>
				</TouchableOpacity>
			</View>

			<View accessibilityLabel="Recent transactions list">
				{recentTransactions.length > 0 ? (
					recentTransactions.map((t) => {
						// Normalize amount from DB/string
						const raw =
							typeof t.amount === 'string'
								? parseFloat(t.amount)
								: Number(t.amount);
						const baseAmount = isNaN(raw) ? 0 : Math.abs(raw);

						// Apply sign based on type only
						const signed = t.type === 'income' ? baseAmount : -baseAmount;

						const amountColor = signed >= 0 ? '#10B981' : '#EF4444';
						const date = (t.date || '').slice(0, 10);
						const targetName = getTargetName(t);
						const iconData = getTransactionContext(t);

						return (
							<TouchableOpacity
								key={t.id}
								onPress={() => router.push('/dashboard/ledger')}
								style={styles.txRow}
								{...accessibilityProps.button}
								accessibilityLabel={generateAccessibilityLabel.transactionItem(
									t.description,
									`${signed >= 0 ? '+' : '-'}${currency(Math.abs(baseAmount))}`,
									date
								)}
								accessibilityHint={`${targetName}. ${voiceOverHints.navigate}`}
							>
								<View
									style={[
										styles.categoryChip,
										{ backgroundColor: `${iconData.color}20` },
									]}
								>
									<Ionicons
										name={iconData.icon}
										size={16}
										color={iconData.color}
									/>
								</View>
								<View style={{ flex: 1 }}>
									<Text
										style={[styles.txTitle, dynamicTextStyle]}
										numberOfLines={1}
									>
										{t.description}
									</Text>
									<Text style={[styles.txMeta, dynamicTextStyle]}>{date}</Text>
								</View>
								<Text
									style={[
										styles.txAmount,
										{ color: amountColor },
										dynamicTextStyle,
									]}
								>
									{signed >= 0 ? '+' : '-'}
									{currency(Math.abs(baseAmount))}
								</Text>
							</TouchableOpacity>
						);
					})
				) : (
					<View style={{ paddingVertical: 16 }}>
						<Text style={[styles.emptyText, dynamicTextStyle]}>
							No transactions yet. Add your first expense to get started.
						</Text>
					</View>
				)}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		shadowColor: '#000',
		shadowOpacity: 0.03,
		shadowRadius: 6,
		elevation: 1,
	},
	cardHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 4,
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111827',
	},
	viewAll: {
		fontSize: 14,
		color: '#3B82F6',
		fontWeight: '600',
	},
	txRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 12,
	},
	categoryChip: {
		width: 32,
		height: 32,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	txTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#111827',
	},
	txMeta: {
		fontSize: 12,
		color: '#6B7280',
		marginTop: 2,
	},
	txAmount: {
		fontSize: 14,
		fontWeight: '800',
	},
	emptyText: {
		fontSize: 14,
		color: '#6B7280',
	},
});

export default TransactionHistory;
