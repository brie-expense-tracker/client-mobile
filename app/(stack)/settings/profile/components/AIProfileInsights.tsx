import { logger } from '../../../../../src/utils/logger';
import React, {
	useState,
	useCallback,
	useMemo,
	useContext,
	useEffect,
} from 'react';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBudget } from '../../../../../src/context/budgetContext';
import { useGoal } from '../../../../../src/context/goalContext';
import { TransactionContext } from '../../../../../src/context/transactionContext';
import { useRecurringExpense } from '../../../../../src/context/recurringExpenseContext';
import { useTheme } from '../../../../../src/context/ThemeContext';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	TextInput,
	ScrollView,
	RefreshControl,
} from 'react-native';

interface Profile {
	monthlyIncome?: number;
	savings?: number;
	debt?: number;
	expenses?: {
		housing?: number;
		transportation?: number;
		food?: number;
		utilities?: number;
		entertainment?: number;
		other?: number;
	};
	firstName?: string;
	lastName?: string;
}

interface Transaction {
	id: string;
	amount: number;
	type: 'income' | 'expense';
	category?: string;
	date: string;
}

interface Budget {
	id: string;
	name: string;
	amount: number;
	spent?: number;
	period: string;
}

interface Goal {
	id: string;
	name: string;
	target: number;
	current: number;
}

interface AIProfileInsightsProps {
	profile: Profile;
	onAction: (action: string) => void;
	mode?: 'preview' | 'full';
	theme?: {
		isDark?: boolean;
		bg: string;
		text: string;
		subtext: string;
		subtle: string;
		line: string;
		card: string;
		tint: string;
		success: string;
		warn: string;
		danger: string;
		slate: string;
	};
}

interface Insight {
	id: string;
	type: 'warning' | 'info' | 'suggestion' | 'success' | 'critical';
	title: string;
	message: string;
	priority: 'low' | 'medium' | 'high' | 'critical';
	action?: string;
	actionLabel?: string;
	value?: number;
	trend?: 'up' | 'down' | 'stable';
	metadata?: Record<string, any>;
	category?:
		| 'savings'
		| 'debt'
		| 'budget'
		| 'goals'
		| 'spending'
		| 'income'
		| 'emergency'
		| 'investment';
	tags?: string[];
	createdAt?: Date;
	isBookmarked?: boolean;
}

export default function AIProfileInsights({
	profile,
	onAction,
	mode = 'full',
	theme,
}: AIProfileInsightsProps) {
	const { colors: globalColors } = useTheme();
	const [insights, setInsights] = useState<Insight[]>([]);
	const [lastProfileUpdate, setLastProfileUpdate] = useState<Date | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [retryCount, setRetryCount] = useState(0);

	// Use global theme colors, fallback to theme prop for backward compatibility
	const localColors = globalColors;
	const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(
		new Set()
	);
	const [insightFilter, setInsightFilter] = useState<
		'all' | 'critical' | 'high' | 'medium' | 'low'
	>('all');
	const [searchQuery, setSearchQuery] = useState('');
	const [categoryFilter, setCategoryFilter] = useState<string>('all');
	const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
	const [bookmarkedInsights, setBookmarkedInsights] = useState<Set<string>>(
		new Set()
	);

	// Data hooks
	const { budgets } = useBudget();
	const { goals } = useGoal() as { goals: Goal[] };
	const { transactions } = useContext(TransactionContext) as {
		transactions: Transaction[];
	};
	const { expenses: recurringExpenses } = useRecurringExpense();

	// Memoized calculations for better performance

	// Comprehensive financial analysis
	const financialAnalysis = useMemo(() => {
		// Recent transactions (last 30 days)
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		const recentTransactions = transactions.filter(
			(tx) => new Date(tx.date) >= thirtyDaysAgo
		);

		// All transactions for pattern analysis
		const allTransactions = transactions;

		// Calculate income and expenses from transactions
		const totalIncome = recentTransactions
			.filter((tx: Transaction) => tx.type === 'income')
			.reduce((sum: number, tx: Transaction) => sum + (tx.amount || 0), 0);

		const totalSpending = recentTransactions
			.filter((tx: Transaction) => tx.type === 'expense')
			.reduce(
				(sum: number, tx: Transaction) => sum + Math.abs(tx.amount || 0),
				0
			);

		const netSavings = totalIncome - totalSpending;
		const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

		// Budget analysis
		const totalBudgetAllocated = budgets.reduce(
			(sum: number, b: Budget) => sum + b.amount,
			0
		);
		const totalBudgetSpent = budgets.reduce(
			(sum: number, b: Budget) => sum + (b.spent || 0),
			0
		);
		const budgetUtilization =
			totalBudgetAllocated > 0
				? (totalBudgetSpent / totalBudgetAllocated) * 100
				: 0;

		// Goal progress
		const totalGoalTarget = goals.reduce(
			(sum: number, g: Goal) => sum + g.target,
			0
		);
		const totalGoalCurrent = goals.reduce(
			(sum: number, g: Goal) => sum + g.current,
			0
		);
		const goalProgress =
			totalGoalTarget > 0 ? (totalGoalCurrent / totalGoalTarget) * 100 : 0;

		// Financial health score calculation
		const healthScore = Math.min(
			100,
			Math.max(
				0,
				savingsRate * 0.4 +
					Math.max(0, 100 - Math.abs(budgetUtilization - 100)) * 0.3 +
					goalProgress * 0.3
			)
		);

		// Spending trends
		const spendingByCategory = new Map<string, number>();
		recentTransactions
			.filter((tx: Transaction) => tx.type === 'expense')
			.forEach((tx: Transaction) => {
				const category = tx.category || 'Other';
				spendingByCategory.set(
					category,
					(spendingByCategory.get(category) || 0) + Math.abs(tx.amount || 0)
				);
			});

		const topSpendingCategories = Array.from(spendingByCategory.entries())
			.map(([category, amount]) => ({ category, amount }))
			.sort((a, b) => b.amount - a.amount)
			.slice(0, 3);

		// Advanced Analysis Functions

		// 1. Recurring Bills Analysis
		const recurringBills = allTransactions
			.filter((tx: Transaction) => tx.type === 'expense')
			.reduce(
				(
					acc: Map<string, { count: number; total: number; lastDate: Date }>,
					tx: Transaction
				) => {
					const key = `${tx.category || 'Other'}_${Math.abs(tx.amount)}`;
					const existing = acc.get(key);
					if (existing) {
						existing.count++;
						existing.total += Math.abs(tx.amount);
						existing.lastDate =
							new Date(tx.date) > existing.lastDate
								? new Date(tx.date)
								: existing.lastDate;
					} else {
						acc.set(key, {
							count: 1,
							total: Math.abs(tx.amount),
							lastDate: new Date(tx.date),
						});
					}
					return acc;
				},
				new Map()
			);

		const potentialRecurringBills = Array.from(recurringBills.entries())
			.filter(([_, data]) => data.count >= 2)
			.map(([key, data]) => ({
				identifier: key,
				frequency: data.count,
				amount: data.total / data.count,
				lastDate: data.lastDate,
			}))
			.sort((a, b) => b.frequency - a.frequency)
			.slice(0, 5);

		// 2. Subscription Detection
		const subscriptionKeywords = [
			'netflix',
			'spotify',
			'amazon',
			'apple',
			'google',
			'microsoft',
			'adobe',
			'subscription',
			'monthly',
			'annual',
		];
		const potentialSubscriptions = allTransactions
			.filter(
				(tx: Transaction) =>
					tx.type === 'expense' &&
					subscriptionKeywords.some((keyword) =>
						(tx.category || '').toLowerCase().includes(keyword)
					)
			)
			.reduce(
				(
					acc: Map<string, { count: number; total: number; amounts: number[] }>,
					tx: Transaction
				) => {
					const key = tx.category || 'Unknown';
					const existing = acc.get(key);
					if (existing) {
						existing.count++;
						existing.total += Math.abs(tx.amount);
						existing.amounts.push(Math.abs(tx.amount));
					} else {
						acc.set(key, {
							count: 1,
							total: Math.abs(tx.amount),
							amounts: [Math.abs(tx.amount)],
						});
					}
					return acc;
				},
				new Map()
			);

		const detectedSubscriptions = Array.from(potentialSubscriptions.entries())
			.map(([category, data]) => ({
				category,
				frequency: data.count,
				averageAmount: data.total / data.count,
				totalSpent: data.total,
				amountVariance: Math.max(...data.amounts) - Math.min(...data.amounts),
			}))
			.filter(
				(sub) =>
					sub.frequency >= 2 && sub.amountVariance < sub.averageAmount * 0.2
			) // Consistent amounts
			.sort((a, b) => b.totalSpent - a.totalSpent);

		// 3. Emergency Fund Analysis
		const monthlyExpenses = totalSpending; // Using recent 30-day spending as proxy
		const emergencyFundTarget = monthlyExpenses * 6; // 6 months of expenses
		const currentEmergencyFund = profile.savings || 0;
		const emergencyFundCoverage =
			monthlyExpenses > 0 ? currentEmergencyFund / monthlyExpenses : 0;
		const emergencyFundStatus =
			emergencyFundCoverage >= 6
				? 'excellent'
				: emergencyFundCoverage >= 3
				? 'good'
				: emergencyFundCoverage >= 1
				? 'needs_improvement'
				: 'critical';

		// 4. Spending Patterns Analysis
		const spendingByDayOfWeek = new Map<number, number>();
		const spendingByTimeOfMonth = new Map<number, number>();

		allTransactions
			.filter((tx: Transaction) => tx.type === 'expense')
			.forEach((tx: Transaction) => {
				const date = new Date(tx.date);
				const dayOfWeek = date.getDay();
				const dayOfMonth = date.getDate();

				spendingByDayOfWeek.set(
					dayOfWeek,
					(spendingByDayOfWeek.get(dayOfWeek) || 0) + Math.abs(tx.amount)
				);
				spendingByTimeOfMonth.set(
					dayOfMonth,
					(spendingByTimeOfMonth.get(dayOfMonth) || 0) + Math.abs(tx.amount)
				);
			});

		const highestSpendingDay = Array.from(spendingByDayOfWeek.entries()).sort(
			(a, b) => b[1] - a[1]
		)[0];
		const highestSpendingDayOfMonth = Array.from(
			spendingByTimeOfMonth.entries()
		).sort((a, b) => b[1] - a[1])[0];

		// 5. Merchant Analysis
		const merchantSpending = new Map<
			string,
			{ count: number; total: number; lastDate: Date }
		>();
		allTransactions
			.filter((tx: Transaction) => tx.type === 'expense')
			.forEach((tx: Transaction) => {
				// Using category as merchant proxy (in real app, this would be actual merchant data)
				const merchant = tx.category || 'Unknown';
				const existing = merchantSpending.get(merchant);
				if (existing) {
					existing.count++;
					existing.total += Math.abs(tx.amount);
					existing.lastDate =
						new Date(tx.date) > existing.lastDate
							? new Date(tx.date)
							: existing.lastDate;
				} else {
					merchantSpending.set(merchant, {
						count: 1,
						total: Math.abs(tx.amount),
						lastDate: new Date(tx.date),
					});
				}
			});

		const topMerchants = Array.from(merchantSpending.entries())
			.map(([merchant, data]) => ({
				merchant,
				transactions: data.count,
				totalSpent: data.total,
				averageTransaction: data.total / data.count,
				lastTransaction: data.lastDate,
			}))
			.sort((a, b) => b.totalSpent - a.totalSpent)
			.slice(0, 5);

		// 6. Cash Flow Projection
		const averageMonthlyIncome = totalIncome; // Using recent 30-day income
		const averageMonthlyExpenses = totalSpending; // Using recent 30-day expenses
		const projectedMonthlySavings =
			averageMonthlyIncome - averageMonthlyExpenses;
		const projectedYearlySavings = projectedMonthlySavings * 12;

		// 7. Debt Analysis (if profile has debt data)
		const debtToIncomeRatio =
			profile.monthlyIncome && profile.debt
				? (profile.debt / profile.monthlyIncome) * 100
				: 0;
		const debtStatus =
			debtToIncomeRatio === 0
				? 'no_debt'
				: debtToIncomeRatio < 20
				? 'low_debt'
				: debtToIncomeRatio < 40
				? 'moderate_debt'
				: 'high_debt';

		return {
			totalIncome,
			totalSpending,
			netSavings,
			savingsRate,
			budgetUtilization,
			goalProgress,
			healthScore,
			topSpendingCategories,
			recentTransactions: recentTransactions.length,
			// Advanced analysis
			potentialRecurringBills,
			detectedSubscriptions,
			emergencyFundStatus,
			emergencyFundCoverage,
			emergencyFundTarget,
			currentEmergencyFund,
			spendingPatterns: {
				highestSpendingDay: highestSpendingDay
					? { day: highestSpendingDay[0], amount: highestSpendingDay[1] }
					: null,
				highestSpendingDayOfMonth: highestSpendingDayOfMonth
					? {
							day: highestSpendingDayOfMonth[0],
							amount: highestSpendingDayOfMonth[1],
					  }
					: null,
			},
			topMerchants,
			cashFlowProjection: {
				monthlyIncome: averageMonthlyIncome,
				monthlyExpenses: averageMonthlyExpenses,
				monthlySavings: projectedMonthlySavings,
				yearlySavings: projectedYearlySavings,
			},
			debtAnalysis: {
				ratio: debtToIncomeRatio,
				status: debtStatus,
				amount: profile.debt || 0,
			},
		};
	}, [transactions, budgets, goals, profile]);

	const loadDismissedInsights = useCallback(async () => {
		try {
			const dismissed = await AsyncStorage.getItem('dismissedInsights');
			if (dismissed) {
				setDismissedInsights(new Set(JSON.parse(dismissed)));
			}
		} catch (error) {
			logger.debug('Error loading dismissed insights:', error);
		}
	}, []);

	const saveDismissedInsights = useCallback(async (dismissed: Set<string>) => {
		try {
			await AsyncStorage.setItem(
				'dismissedInsights',
				JSON.stringify([...dismissed])
			);
		} catch (error) {
			logger.debug('Error saving dismissed insights:', error);
		}
	}, []);

	const dismissInsight = useCallback(
		async (insightId: string) => {
			const newDismissed = new Set(dismissedInsights);
			newDismissed.add(insightId);
			setDismissedInsights(newDismissed);
			await saveDismissedInsights(newDismissed);
		},
		[dismissedInsights, saveDismissedInsights]
	);

	const generateInsights = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		// Add exponential backoff for retries
		if (retryCount > 0) {
			const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}

		try {
			const newInsights: Insight[] = [];

			// Financial Health Score Insight
			const healthScore = financialAnalysis.healthScore;
			if (healthScore >= 80) {
				newInsights.push({
					id: 'health_excellent',
					type: 'success',
					title: 'Excellent Financial Health!',
					message: `Your financial health score is ${healthScore.toFixed(
						0
					)}/100. Keep up the great work!`,
					priority: 'low',
					value: healthScore,
					action: 'view_detailed_report',
					actionLabel: 'View Report',
					category: 'savings',
					tags: ['health-score', 'overview'],
					createdAt: new Date(),
				});
			} else if (healthScore >= 60) {
				newInsights.push({
					id: 'health_good',
					type: 'info',
					title: 'Good Financial Health',
					message: `Your financial health score is ${healthScore.toFixed(
						0
					)}/100. There's room for improvement.`,
					priority: 'medium',
					value: healthScore,
					action: 'improve_health',
					actionLabel: 'Get Tips',
				});
			} else {
				newInsights.push({
					id: 'health_needs_attention',
					type: 'warning',
					title: 'Financial Health Needs Attention',
					message: `Your financial health score is ${healthScore.toFixed(
						0
					)}/100. Let's work on improving it.`,
					priority: 'high',
					value: healthScore,
					action: 'financial_planning',
					actionLabel: 'Get Help',
				});
			}

			// Savings Rate Analysis
			const savingsRate = financialAnalysis.savingsRate;
			if (savingsRate >= 20) {
				newInsights.push({
					id: 'savings_excellent',
					type: 'success',
					title: 'Excellent Savings Rate!',
					message: `You're saving ${savingsRate.toFixed(
						1
					)}% of your income. This is fantastic!`,
					priority: 'low',
					value: savingsRate,
					trend: 'up',
				});
			} else if (savingsRate >= 10) {
				newInsights.push({
					id: 'savings_good',
					type: 'info',
					title: 'Good Savings Rate',
					message: `You're saving ${savingsRate.toFixed(
						1
					)}% of your income. Consider increasing to 20% for better financial security.`,
					priority: 'medium',
					value: savingsRate,
					action: 'increase_savings',
					actionLabel: 'Learn How',
				});
			} else if (savingsRate < 0) {
				newInsights.push({
					id: 'savings_negative',
					type: 'critical',
					title: 'Spending More Than Earning',
					message: `You're spending ${Math.abs(savingsRate).toFixed(
						1
					)}% more than you earn. This needs immediate attention.`,
					priority: 'critical',
					value: savingsRate,
					trend: 'down',
					action: 'emergency_budget',
					actionLabel: 'Create Budget',
				});
			} else {
				newInsights.push({
					id: 'savings_low',
					type: 'warning',
					title: 'Low Savings Rate',
					message: `You're only saving ${savingsRate.toFixed(
						1
					)}% of your income. Aim for at least 10-20%.`,
					priority: 'high',
					value: savingsRate,
					action: 'increase_savings',
					actionLabel: 'Get Tips',
				});
			}

			// Budget Analysis
			const budgetUtilization = financialAnalysis.budgetUtilization;
			if (budgets.length === 0) {
				newInsights.push({
					id: 'no_budgets',
					type: 'info',
					title: 'Create Your First Budget',
					message:
						'Budgets help you track spending and achieve financial goals. Start with your biggest expense categories.',
					priority: 'medium',
					action: 'create_budget',
					actionLabel: 'Create Budget',
				});
			} else if (budgetUtilization > 100) {
				newInsights.push({
					id: 'budget_over',
					type: 'critical',
					title: 'Over Budget',
					message: `You've exceeded your total budget by ${(
						budgetUtilization - 100
					).toFixed(1)}%. Review your spending immediately.`,
					priority: 'critical',
					value: budgetUtilization,
					trend: 'up',
					action: 'review_budgets',
					actionLabel: 'Review Budgets',
				});
			} else if (budgetUtilization > 80) {
				newInsights.push({
					id: 'budget_warning',
					type: 'warning',
					title: 'Approaching Budget Limit',
					message: `You've used ${budgetUtilization.toFixed(
						1
					)}% of your budget. Consider reducing spending in some categories.`,
					priority: 'high',
					value: budgetUtilization,
					action: 'adjust_spending',
					actionLabel: 'Adjust Spending',
				});
			} else if (budgetUtilization < 50) {
				newInsights.push({
					id: 'budget_under',
					type: 'info',
					title: 'Under Budget',
					message: `You've only used ${budgetUtilization.toFixed(
						1
					)}% of your budget. Consider reallocating funds to savings or goals.`,
					priority: 'low',
					value: budgetUtilization,
					action: 'reallocate_funds',
					actionLabel: 'Reallocate',
				});
			}

			// Individual Budget Insights
			budgets.forEach((budget: Budget) => {
				const utilization =
					budget.amount > 0 ? ((budget.spent || 0) / budget.amount) * 100 : 0;

				if (utilization > 100) {
					newInsights.push({
						id: `budget_over_${budget.id}`,
						type: 'critical',
						title: `${budget.name} Over Budget`,
						message: `You've exceeded your ${budget.name} budget by $${(
							(budget.spent || 0) - budget.amount
						).toFixed(2)}.`,
						priority: 'critical',
						value: utilization,
						metadata: { budgetId: budget.id, budgetName: budget.name },
						action: 'adjust_budget',
						actionLabel: 'Adjust Budget',
					});
				} else if (utilization > 90) {
					newInsights.push({
						id: `budget_warning_${budget.id}`,
						type: 'warning',
						title: `${budget.name} Near Limit`,
						message: `You've used ${utilization.toFixed(1)}% of your ${
							budget.name
						} budget.`,
						priority: 'high',
						value: utilization,
						metadata: { budgetId: budget.id, budgetName: budget.name },
						action: 'monitor_budget',
						actionLabel: 'Monitor',
					});
				}
			});

			// Goal Progress Analysis
			const goalProgress = financialAnalysis.goalProgress;
			if (goals.length === 0) {
				newInsights.push({
					id: 'no_goals',
					type: 'info',
					title: 'Set Financial Goals',
					message:
						'Financial goals give you direction and motivation. Start with a simple savings goal.',
					priority: 'medium',
					action: 'create_goal',
					actionLabel: 'Create Goal',
				});
			} else if (goalProgress >= 80) {
				newInsights.push({
					id: 'goals_excellent',
					type: 'success',
					title: 'Great Goal Progress!',
					message: `You've achieved ${goalProgress.toFixed(
						1
					)}% of your financial goals. Keep it up!`,
					priority: 'low',
					value: goalProgress,
					trend: 'up',
				});
			} else if (goalProgress < 20) {
				newInsights.push({
					id: 'goals_slow',
					type: 'warning',
					title: 'Slow Goal Progress',
					message: `You've only achieved ${goalProgress.toFixed(
						1
					)}% of your goals. Consider increasing your savings rate.`,
					priority: 'high',
					value: goalProgress,
					action: 'boost_savings',
					actionLabel: 'Boost Savings',
				});
			}

			// Top Spending Categories
			if (financialAnalysis.topSpendingCategories.length > 0) {
				const topCategory = financialAnalysis.topSpendingCategories[0];
				const totalSpending = financialAnalysis.totalSpending;
				const categoryPercentage = (topCategory.amount / totalSpending) * 100;

				if (categoryPercentage > 40) {
					newInsights.push({
						id: 'spending_concentration',
						type: 'info',
						title: 'High Spending Concentration',
						message: `${
							topCategory.category
						} accounts for ${categoryPercentage.toFixed(
							1
						)}% of your spending. Consider if this aligns with your priorities.`,
						priority: 'medium',
						value: categoryPercentage,
						metadata: { category: topCategory.category },
						action: 'review_spending',
						actionLabel: 'Review Spending',
					});
				}
			}

			// Transaction Activity
			if (financialAnalysis.recentTransactions === 0) {
				newInsights.push({
					id: 'no_recent_activity',
					type: 'info',
					title: 'No Recent Transactions',
					message:
						'No transactions recorded in the last 30 days. Make sure to track your spending for better insights.',
					priority: 'medium',
					action: 'add_transaction',
					actionLabel: 'Add Transaction',
				});
			}

			// Income Analysis (fallback to profile data if no transaction data)
			if (
				financialAnalysis.totalIncome === 0 &&
				(!profile.monthlyIncome || profile.monthlyIncome === 0)
			) {
				newInsights.push({
					id: 'income_missing',
					type: 'warning',
					title: 'Income Not Set',
					message:
						'Setting your monthly income helps create accurate budgets and financial plans.',
					priority: 'high',
					action: 'set_income',
					actionLabel: 'Set Income',
				});
			}

			// Advanced Insights

			// 1. Emergency Fund Analysis
			const emergencyFundStatus = financialAnalysis.emergencyFundStatus;
			const emergencyFundCoverage = financialAnalysis.emergencyFundCoverage;

			if (emergencyFundStatus === 'critical') {
				newInsights.push({
					id: 'emergency_fund_critical',
					type: 'critical',
					title: 'Emergency Fund Critical',
					message: `Your emergency fund covers only ${emergencyFundCoverage.toFixed(
						1
					)} months of expenses. Aim for 3-6 months for financial security.`,
					priority: 'critical',
					value: emergencyFundCoverage,
					trend: 'down',
					action: 'build_emergency_fund',
					actionLabel: 'Build Fund',
				});
			} else if (emergencyFundStatus === 'needs_improvement') {
				newInsights.push({
					id: 'emergency_fund_low',
					type: 'warning',
					title: 'Emergency Fund Needs Improvement',
					message: `Your emergency fund covers ${emergencyFundCoverage.toFixed(
						1
					)} months of expenses. Consider building it to 6 months.`,
					priority: 'high',
					value: emergencyFundCoverage,
					action: 'increase_emergency_fund',
					actionLabel: 'Increase Fund',
				});
			} else if (emergencyFundStatus === 'excellent') {
				newInsights.push({
					id: 'emergency_fund_excellent',
					type: 'success',
					title: 'Excellent Emergency Fund!',
					message: `Your emergency fund covers ${emergencyFundCoverage.toFixed(
						1
					)} months of expenses. You're well prepared for emergencies.`,
					priority: 'low',
					value: emergencyFundCoverage,
					trend: 'up',
				});
			}

			// 2. Recurring Expenses Insights
			if (recurringExpenses.length > 0) {
				const totalMonthlyRecurring = recurringExpenses
					.filter((exp: any) => exp.frequency === 'monthly')
					.reduce((sum: number, exp: any) => sum + exp.amount, 0);

				const totalAnnualRecurring = recurringExpenses.reduce(
					(sum: number, exp: any) => {
						const multiplier =
							exp.frequency === 'weekly'
								? 52
								: exp.frequency === 'monthly'
								? 12
								: exp.frequency === 'quarterly'
								? 4
								: exp.frequency === 'yearly'
								? 1
								: 0;
						return sum + exp.amount * multiplier;
					},
					0
				);

				// Check for overdue recurring expenses
				const overdueExpenses = recurringExpenses.filter((exp: any) => {
					const dueDate = new Date(exp.nextExpectedDate);
					return dueDate < new Date();
				});

				if (overdueExpenses.length > 0) {
					const totalOverdue = overdueExpenses.reduce(
						(sum: number, exp: any) => sum + exp.amount,
						0
					);
					newInsights.push({
						id: 'recurring_overdue',
						type: 'critical',
						title: 'Overdue Recurring Expenses',
						message: `You have ${
							overdueExpenses.length
						} overdue recurring expense${
							overdueExpenses.length > 1 ? 's' : ''
						} totaling $${totalOverdue.toFixed(
							2
						)}. Pay them soon to avoid late fees.`,
						priority: 'critical',
						value: totalOverdue,
						trend: 'down',
						action: 'pay_recurring',
						actionLabel: 'Pay Now',
						category: 'budget',
					});
				}

				// Monthly commitment insight
				if (totalMonthlyRecurring > 0) {
					const monthlyIncome =
						profile.monthlyIncome ||
						(financialAnalysis.totalIncome / 30) * 30 ||
						0;
					const recurringPercentage =
						monthlyIncome > 0
							? (totalMonthlyRecurring / monthlyIncome) * 100
							: 0;

					if (recurringPercentage > 50) {
						newInsights.push({
							id: 'recurring_high_commitment',
							type: 'warning',
							title: 'High Recurring Commitment',
							message: `Your monthly recurring expenses ($${totalMonthlyRecurring.toFixed(
								2
							)}) are ${recurringPercentage.toFixed(
								1
							)}% of your income. Consider reducing subscriptions or recurring costs.`,
							priority: 'high',
							value: recurringPercentage,
							action: 'review_recurring',
							actionLabel: 'Review Expenses',
							category: 'budget',
						});
					} else if (recurringPercentage > 30) {
						newInsights.push({
							id: 'recurring_moderate_commitment',
							type: 'info',
							title: 'Moderate Recurring Expenses',
							message: `Your monthly recurring expenses ($${totalMonthlyRecurring.toFixed(
								2
							)}) are ${recurringPercentage.toFixed(
								1
							)}% of your income. This is manageable but keep an eye on it.`,
							priority: 'medium',
							value: recurringPercentage,
							action: 'view_recurring',
							actionLabel: 'View Details',
							category: 'budget',
						});
					}
				}

				// Annual projection
				if (totalAnnualRecurring > 0) {
					newInsights.push({
						id: 'recurring_annual_projection',
						type: 'info',
						title: 'Annual Recurring Expense Projection',
						message: `Your recurring expenses will cost approximately $${totalAnnualRecurring.toFixed(
							0
						)} this year. Factor this into your financial planning.`,
						priority: 'low',
						value: totalAnnualRecurring,
						action: 'view_annual_projection',
						actionLabel: 'View Projection',
						category: 'budget',
					});
				}
			} else {
				newInsights.push({
					id: 'no_recurring_expenses',
					type: 'info',
					title: 'Track Recurring Expenses',
					message:
						'Add your recurring expenses (subscriptions, bills, rent) to better manage your monthly commitments and cash flow.',
					priority: 'medium',
					action: 'add_recurring_expense',
					actionLabel: 'Add Recurring',
					category: 'budget',
				});
			}

			// Legacy recurring bills detection from transactions
			if (financialAnalysis.potentialRecurringBills.length > 0) {
				const topRecurringBill = financialAnalysis.potentialRecurringBills[0];
				newInsights.push({
					id: 'recurring_bills_detected',
					type: 'info',
					title: 'Recurring Bills Detected',
					message: `We found ${
						financialAnalysis.potentialRecurringBills.length
					} potential recurring bills. Your top recurring expense is $${topRecurringBill.amount.toFixed(
						2
					)}.`,
					priority: 'medium',
					value: financialAnalysis.potentialRecurringBills.length,
					action: 'review_recurring_bills',
					actionLabel: 'Review Bills',
				});
			}

			// 3. Subscription Analysis
			if (financialAnalysis.detectedSubscriptions.length > 0) {
				const totalSubscriptionSpending =
					financialAnalysis.detectedSubscriptions.reduce(
						(sum, sub) => sum + sub.totalSpent,
						0
					);
				newInsights.push({
					id: 'subscriptions_detected',
					type: 'info',
					title: 'Subscriptions Detected',
					message: `We found ${
						financialAnalysis.detectedSubscriptions.length
					} subscriptions costing $${totalSubscriptionSpending.toFixed(
						2
					)} total. Review them to optimize your spending.`,
					priority: 'medium',
					value: totalSubscriptionSpending,
					action: 'review_subscriptions',
					actionLabel: 'Review Subscriptions',
				});
			}

			// 4. Spending Patterns Insights
			if (financialAnalysis.spendingPatterns.highestSpendingDay) {
				const dayNames = [
					'Sunday',
					'Monday',
					'Tuesday',
					'Wednesday',
					'Thursday',
					'Friday',
					'Saturday',
				];
				const highestDay =
					financialAnalysis.spendingPatterns.highestSpendingDay;
				newInsights.push({
					id: 'spending_pattern_day',
					type: 'info',
					title: 'Spending Pattern Detected',
					message: `You spend most on ${
						dayNames[highestDay.day]
					}, averaging $${(highestDay.amount / 4).toFixed(
						2
					)} per week. Consider if this aligns with your budget.`,
					priority: 'low',
					value: highestDay.amount,
					action: 'analyze_spending_patterns',
					actionLabel: 'Analyze Patterns',
				});
			}

			// 5. Top Merchant Insights
			if (financialAnalysis.topMerchants.length > 0) {
				const topMerchant = financialAnalysis.topMerchants[0];
				if (topMerchant.totalSpent > financialAnalysis.totalSpending * 0.2) {
					// More than 20% of spending
					newInsights.push({
						id: 'top_merchant_high',
						type: 'info',
						title: 'High Spending at One Merchant',
						message: `You've spent $${topMerchant.totalSpent.toFixed(2)} at ${
							topMerchant.merchant
						} (${(
							(topMerchant.totalSpent / financialAnalysis.totalSpending) *
							100
						).toFixed(1)}% of total spending).`,
						priority: 'medium',
						value:
							(topMerchant.totalSpent / financialAnalysis.totalSpending) * 100,
						action: 'review_merchant_spending',
						actionLabel: 'Review Spending',
					});
				}
			}

			// 6. Cash Flow Projection Insights
			const projectedMonthlySavings =
				financialAnalysis.cashFlowProjection.monthlySavings;
			if (projectedMonthlySavings > 0) {
				const projectedYearlySavings =
					financialAnalysis.cashFlowProjection.yearlySavings;
				newInsights.push({
					id: 'cash_flow_projection',
					type: 'success',
					title: 'Positive Cash Flow Projection',
					message: `At current rates, you could save $${projectedYearlySavings.toFixed(
						2
					)} this year. Great job maintaining positive cash flow!`,
					priority: 'low',
					value: projectedYearlySavings,
					trend: 'up',
					action: 'view_cash_flow',
					actionLabel: 'View Projection',
				});
			} else if (projectedMonthlySavings < 0) {
				newInsights.push({
					id: 'negative_cash_flow',
					type: 'critical',
					title: 'Negative Cash Flow Detected',
					message: `You're spending $${Math.abs(
						projectedMonthlySavings
					).toFixed(
						2
					)} more than you earn monthly. This needs immediate attention.`,
					priority: 'critical',
					value: Math.abs(projectedMonthlySavings),
					trend: 'down',
					action: 'fix_cash_flow',
					actionLabel: 'Fix Cash Flow',
				});
			}

			// 7. Debt Analysis Insights
			const debtStatus = financialAnalysis.debtAnalysis.status;
			const debtRatio = financialAnalysis.debtAnalysis.ratio;

			if (debtStatus === 'high_debt') {
				newInsights.push({
					id: 'high_debt_ratio',
					type: 'critical',
					title: 'High Debt-to-Income Ratio',
					message: `Your debt is ${debtRatio.toFixed(
						1
					)}% of your income. Focus on debt reduction strategies immediately.`,
					priority: 'critical',
					value: debtRatio,
					trend: 'down',
					action: 'debt_reduction_plan',
					actionLabel: 'Get Plan',
				});
			} else if (debtStatus === 'moderate_debt') {
				newInsights.push({
					id: 'moderate_debt_ratio',
					type: 'warning',
					title: 'Moderate Debt Level',
					message: `Your debt is ${debtRatio.toFixed(
						1
					)}% of your income. Consider creating a debt payoff plan.`,
					priority: 'high',
					value: debtRatio,
					action: 'create_debt_plan',
					actionLabel: 'Create Plan',
				});
			} else if (debtStatus === 'no_debt') {
				newInsights.push({
					id: 'no_debt',
					type: 'success',
					title: 'Debt-Free!',
					message:
						'Congratulations! You have no debt. Consider investing your extra money for long-term growth.',
					priority: 'low',
					trend: 'up',
					action: 'investment_advice',
					actionLabel: 'Get Advice',
				});
			}

			// Emergency Fund Analysis
			const monthlyExpenses = financialAnalysis.totalSpending;
			const emergencyFundMonths = profile.savings
				? Math.floor(profile.savings / monthlyExpenses)
				: 0;

			if (emergencyFundMonths < 3) {
				newInsights.push({
					id: 'emergency_fund_low',
					type: 'critical',
					title: 'Emergency Fund Too Low',
					message: `You have ${emergencyFundMonths} months of expenses saved. Aim for 3-6 months for financial security.`,
					priority: 'critical',
					value: emergencyFundMonths,
					action: 'emergency_fund_plan',
					actionLabel: 'Build Fund',
					category: 'emergency',
					tags: ['emergency-fund', 'critical', 'savings'],
					createdAt: new Date(),
				});
			} else if (emergencyFundMonths >= 6) {
				newInsights.push({
					id: 'emergency_fund_healthy',
					type: 'success',
					title: 'Healthy Emergency Fund',
					message: `Great! You have ${emergencyFundMonths} months of expenses saved. Consider investing excess funds.`,
					priority: 'low',
					value: emergencyFundMonths,
					action: 'investment_advice',
					actionLabel: 'Invest Excess',
				});
			}

			// Filter out dismissed insights and sort by priority
			const filteredInsights = newInsights
				.filter((insight) => !dismissedInsights.has(insight.id))
				.sort((a, b) => {
					const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
					return priorityOrder[b.priority] - priorityOrder[a.priority];
				});
			setInsights(filteredInsights);
		} catch (error) {
			logger.error('Error generating insights:', error);
			const errorMessage =
				error instanceof Error
					? `Failed to generate insights: ${error.message}`
					: 'Failed to generate insights. Please try again.';
			setError(errorMessage);
			setRetryCount((prev) => prev + 1);
		} finally {
			setIsLoading(false);
		}
	}, [
		profile,
		dismissedInsights,
		financialAnalysis,
		budgets,
		goals,
		retryCount,
		recurringExpenses,
	]);

	const handleRetry = useCallback(() => {
		setRetryCount(0);
		generateInsights();
	}, [generateInsights]);

	// Bookmark functionality
	const toggleBookmark = useCallback((insightId: string) => {
		setBookmarkedInsights((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(insightId)) {
				newSet.delete(insightId);
			} else {
				newSet.add(insightId);
			}
			return newSet;
		});
	}, []);

	// Filtered insights based on current filters
	const filteredInsights = useMemo(() => {
		let filtered = insights;

		// Filter by priority
		if (insightFilter !== 'all') {
			filtered = filtered.filter(
				(insight) => insight.priority === insightFilter
			);
		}

		// Filter by category
		if (categoryFilter !== 'all') {
			filtered = filtered.filter(
				(insight) => insight.category === categoryFilter
			);
		}

		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(insight) =>
					insight.title.toLowerCase().includes(query) ||
					insight.message.toLowerCase().includes(query) ||
					insight.tags?.some((tag) => tag.toLowerCase().includes(query))
			);
		}

		// Filter by bookmarked only
		if (showBookmarkedOnly) {
			filtered = filtered.filter((insight) =>
				bookmarkedInsights.has(insight.id)
			);
		}

		return filtered;
	}, [
		insights,
		insightFilter,
		categoryFilter,
		searchQuery,
		showBookmarkedOnly,
		bookmarkedInsights,
	]);

	// Preview mode: show only top 3 highest priority insights
	const insightsToRender = useMemo(() => {
		if (mode === 'preview') {
			// Sort by priority and pick top 3
			const order = { critical: 4, high: 3, medium: 2, low: 1 };
			return [...filteredInsights]
				.sort((a, b) => order[b.priority] - order[a.priority])
				.slice(0, 3);
		}
		return filteredInsights;
	}, [filteredInsights, mode]);

	// Insight statistics
	const insightStats = useMemo(() => {
		const stats = {
			critical: 0,
			high: 0,
			medium: 0,
			low: 0,
			total: insights.length,
		};
		insights.forEach((insight) => {
			stats[insight.priority]++;
		});
		return stats;
	}, [insights]);

	const checkProfileUpdates = async () => {
		try {
			const lastUpdate = await AsyncStorage.getItem('lastProfileUpdate');
			if (lastUpdate) {
				setLastProfileUpdate(new Date(lastUpdate));
			}
		} catch (error) {
			logger.debug('Error checking profile updates:', error);
		}
	};

	const refreshInsights = useCallback(async () => {
		setIsRefreshing(true);
		await generateInsights();
		setIsRefreshing(false);
	}, [generateInsights]);

	useEffect(() => {
		loadDismissedInsights();
		generateInsights();
		checkProfileUpdates();
	}, [profile, generateInsights, loadDismissedInsights]);

	const handleInsightAction = async (insight: Insight) => {
		if (insight.action) {
			// Store this action for AI assistant context
			try {
				const aiContext = {
					lastAction: insight.action,
					actionTaken: true,
					timestamp: new Date().toISOString(),
					profileSnapshot: {
						income: profile.monthlyIncome,
						savings: profile.savings,
						debt: profile.debt,
						expenses: profile.expenses,
					},
				};

				await AsyncStorage.setItem(
					'aiProfileContext',
					JSON.stringify(aiContext)
				);
				logger.debug('AI context updated:', aiContext);
			} catch (error) {
				logger.debug('Error updating AI context:', error);
			}

			onAction(insight.action);
		}
	};

	const getInsightIcon = (type: string) => {
		switch (type) {
			case 'warning':
				return 'warning';
			case 'info':
				return 'information-circle';
			case 'suggestion':
				return 'bulb';
			case 'success':
				return 'checkmark-circle';
			default:
				return 'sparkles';
		}
	};

	const getInsightColor = (type: string) => {
		switch (type) {
			case 'warning':
				return localColors.danger;
			case 'info':
				return localColors.tint;
			case 'suggestion':
				return localColors.warn;
			case 'success':
				return localColors.success;
			case 'critical':
				return localColors.danger;
			default:
				return localColors.tint;
		}
	};

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case 'critical':
				return localColors.danger;
			case 'high':
				return localColors.danger;
			case 'medium':
				return localColors.warn;
			case 'low':
				return localColors.success;
			default:
				return localColors.subtle;
		}
	};

	const getTrendIcon = (trend?: string) => {
		switch (trend) {
			case 'up':
				return 'trending-up';
			case 'down':
				return 'trending-down';
			case 'stable':
				return 'remove';
			default:
				return null;
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Ionicons name="sparkles" size={20} color={localColors.tint} />
				<Text style={styles.headerTitle}>AI-Powered Insights</Text>
				<View style={styles.headerActions}>
					<TouchableOpacity
						onPress={() =>
							setInsightFilter(insightFilter === 'all' ? 'critical' : 'all')
						}
						style={[
							styles.filterButton,
							insightFilter !== 'all' && styles.filterButtonActive,
						]}
						accessibilityLabel={`Filter insights by ${
							insightFilter === 'all' ? 'all' : 'critical'
						}`}
						accessibilityRole="button"
					>
						<Ionicons
							name={insightFilter === 'all' ? 'filter' : 'filter-circle'}
							size={16}
							color={
								insightFilter === 'all' ? localColors.subtle : localColors.tint
							}
						/>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={refreshInsights}
						style={styles.refreshButton}
						accessibilityLabel="Refresh insights"
						accessibilityRole="button"
					>
						<Ionicons
							name="refresh"
							size={18}
							color={localColors.tint}
							style={isRefreshing ? styles.refreshingIcon : undefined}
						/>
					</TouchableOpacity>
					{insights.length > 0 && (
						<TouchableOpacity
							onPress={() => onAction('export_insights')}
							style={styles.exportButton}
							accessibilityLabel="Export insights"
							accessibilityRole="button"
						>
							<Ionicons
								name="share-outline"
								size={18}
								color={localColors.tint}
							/>
						</TouchableOpacity>
					)}
				</View>
			</View>

			{/* Search and Filter Controls - Hide in preview mode */}
			{mode !== 'preview' && insights.length > 0 && (
				<View style={styles.searchFilterContainer}>
					<View style={styles.searchContainer}>
						<Ionicons name="search" size={16} color="#6b7280" />
						<TextInput
							style={styles.searchInput}
							placeholder="Search insights..."
							value={searchQuery}
							onChangeText={setSearchQuery}
							placeholderTextColor="#9ca3af"
						/>
						{searchQuery.length > 0 && (
							<TouchableOpacity
								onPress={() => setSearchQuery('')}
								style={styles.clearSearchButton}
							>
								<Ionicons name="close-circle" size={16} color="#6b7280" />
							</TouchableOpacity>
						)}
					</View>

					<View style={styles.filterRow}>
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							style={styles.categoryFilter}
						>
							{[
								'all',
								'savings',
								'debt',
								'budget',
								'goals',
								'spending',
								'income',
								'emergency',
							].map((category) => (
								<TouchableOpacity
									key={category}
									onPress={() => setCategoryFilter(category)}
									style={[
										styles.categoryButton,
										categoryFilter === category && styles.categoryButtonActive,
									]}
								>
									<Text
										style={[
											styles.categoryButtonText,
											categoryFilter === category &&
												styles.categoryButtonTextActive,
										]}
									>
										{category.charAt(0).toUpperCase() + category.slice(1)}
									</Text>
								</TouchableOpacity>
							))}
						</ScrollView>

						<TouchableOpacity
							onPress={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
							style={[
								styles.bookmarkFilterButton,
								showBookmarkedOnly && styles.bookmarkFilterButtonActive,
							]}
						>
							<Ionicons
								name={showBookmarkedOnly ? 'bookmark' : 'bookmark-outline'}
								size={16}
								color={showBookmarkedOnly ? '#3b82f6' : '#6b7280'}
							/>
						</TouchableOpacity>
					</View>
				</View>
			)}

			{/* Insight Statistics - Hide in preview mode */}
			{mode !== 'preview' && insights.length > 0 && (
				<View style={styles.statsContainer}>
					<Text style={styles.statsTitle}>Insight Summary</Text>
					<View style={styles.statsGrid}>
						<View style={styles.statItem}>
							<Text style={[styles.statNumber, { color: '#ef4444' }]}>
								{insightStats.critical}
							</Text>
							<Text style={styles.statLabel}>Critical</Text>
						</View>
						<View style={styles.statItem}>
							<Text style={[styles.statNumber, { color: '#f59e0b' }]}>
								{insightStats.high}
							</Text>
							<Text style={styles.statLabel}>High</Text>
						</View>
						<View style={styles.statItem}>
							<Text style={[styles.statNumber, { color: '#3b82f6' }]}>
								{insightStats.medium}
							</Text>
							<Text style={styles.statLabel}>Medium</Text>
						</View>
						<View style={styles.statItem}>
							<Text style={[styles.statNumber, { color: localColors.success }]}>
								{insightStats.low}
							</Text>
							<Text style={styles.statLabel}>Low</Text>
						</View>
					</View>
				</View>
			)}

			{error ? (
				<View style={styles.errorState}>
					<Ionicons name="alert-circle" size={48} color="#ef4444" />
					<Text style={styles.errorText}>{error}</Text>
					<TouchableOpacity
						style={styles.retryButton}
						onPress={handleRetry}
						accessibilityLabel="Retry generating insights"
						accessibilityRole="button"
					>
						<Text style={styles.retryButtonText}>
							{retryCount > 0 ? `Try Again (${retryCount})` : 'Try Again'}
						</Text>
					</TouchableOpacity>
				</View>
			) : isLoading ? (
				<View style={styles.loadingState}>
					<ActivityIndicator size="large" color="#3b82f6" />
					<Text style={styles.loadingText}>Generating insights...</Text>
				</View>
			) : insightsToRender.length === 0 ? (
				<View
					style={[
						styles.emptyState,
						mode === 'preview' && { paddingVertical: 12 },
					]}
				>
					<Ionicons
						name="checkmark-circle"
						size={mode === 'preview' ? 24 : 48}
						color={localColors.success}
					/>
					<Text
						style={[
							styles.emptyStateText,
							mode === 'preview' && { fontSize: 13, marginTop: 6 },
						]}
					>
						{mode === 'preview' ? 'All clear' : 'Your profile looks great!'}
					</Text>
					{mode !== 'preview' && (
						<Text style={styles.emptyStateSubtext}>
							Keep up the good financial habits.
						</Text>
					)}
				</View>
			) : (
				<ScrollView
					style={styles.insightsList}
					showsVerticalScrollIndicator={false}
					nestedScrollEnabled={true}
					refreshControl={
						<RefreshControl
							refreshing={isRefreshing}
							onRefresh={refreshInsights}
							colors={['#3b82f6']}
							tintColor="#3b82f6"
						/>
					}
				>
					{insightsToRender.map((insight) => (
						<View
							key={insight.id}
							style={[
								styles.insightCard,
								mode === 'preview' && styles.insightCardPreview,
							]}
							accessibilityRole="text"
							accessibilityLabel={`${insight.title}. ${insight.message}. Priority: ${insight.priority}`}
						>
							<View style={styles.insightHeader}>
								<View style={styles.insightIconContainer}>
									<Ionicons
										name={getInsightIcon(insight.type) as any}
										size={20}
										color={getInsightColor(insight.type)}
									/>
								</View>
								<View style={styles.insightTitleContainer}>
									<Text style={styles.insightTitle}>{insight.title}</Text>
									<View
										style={[
											styles.priorityBadge,
											{ backgroundColor: getPriorityColor(insight.priority) },
										]}
									>
										<Text style={styles.priorityText}>
											{insight.priority.toUpperCase()}
										</Text>
									</View>
								</View>
								<View style={styles.insightActions}>
									<TouchableOpacity
										onPress={() => toggleBookmark(insight.id)}
										style={styles.bookmarkButton}
										accessibilityLabel={`${
											bookmarkedInsights.has(insight.id)
												? 'Remove from bookmarks'
												: 'Add to bookmarks'
										} ${insight.title}`}
										accessibilityRole="button"
									>
										<Ionicons
											name={
												bookmarkedInsights.has(insight.id)
													? 'bookmark'
													: 'bookmark-outline'
											}
											size={16}
											color={
												bookmarkedInsights.has(insight.id) ? '#3b82f6' : '#999'
											}
										/>
									</TouchableOpacity>
									<TouchableOpacity
										onPress={() => dismissInsight(insight.id)}
										style={styles.dismissButton}
										accessibilityLabel={`Dismiss ${insight.title}`}
										accessibilityRole="button"
									>
										<Ionicons name="close" size={16} color="#999" />
									</TouchableOpacity>
								</View>
							</View>

							<Text style={styles.insightMessage}>{insight.message}</Text>

							{/* Insight Metadata */}
							<View style={styles.insightMetadata}>
								{insight.createdAt && (
									<View style={styles.metadataItem}>
										<Ionicons name="time-outline" size={12} color="#9ca3af" />
										<Text style={styles.metadataText}>
											{insight.createdAt.toLocaleDateString()}
										</Text>
									</View>
								)}
								{insight.category && (
									<View style={styles.metadataItem}>
										<Ionicons name="folder-outline" size={12} color="#9ca3af" />
										<Text style={styles.metadataText}>
											{insight.category.charAt(0).toUpperCase() +
												insight.category.slice(1)}
										</Text>
									</View>
								)}
								{insight.tags && insight.tags.length > 0 && (
									<View style={styles.metadataItem}>
										<Ionicons
											name="pricetag-outline"
											size={12}
											color="#9ca3af"
										/>
										<Text style={styles.metadataText}>
											{insight.tags.slice(0, 2).join(', ')}
											{insight.tags.length > 2 &&
												` +${insight.tags.length - 2}`}
										</Text>
									</View>
								)}
							</View>

							{/* Value and Trend Display */}
							{(insight.value !== undefined || insight.trend) && (
								<View style={styles.insightMetrics}>
									{insight.value !== undefined && (
										<View style={styles.valueContainer}>
											<Text style={styles.valueLabel}>Value:</Text>
											<Text
												style={[
													styles.valueText,
													{ color: getInsightColor(insight.type) },
												]}
											>
												{typeof insight.value === 'number' && insight.value < 0
													? `-${Math.abs(insight.value).toFixed(1)}%`
													: `${insight.value.toFixed(1)}%`}
											</Text>
										</View>
									)}
									{insight.trend && (
										<View style={styles.trendContainer}>
											<Ionicons
												name={getTrendIcon(insight.trend) as any}
												size={16}
												color={
													insight.trend === 'up'
														? '#10b981'
														: insight.trend === 'down'
														? '#ef4444'
														: '#6b7280'
												}
											/>
											<Text
												style={[
													styles.trendText,
													{
														color:
															insight.trend === 'up'
																? '#10b981'
																: insight.trend === 'down'
																? '#ef4444'
																: '#6b7280',
													},
												]}
											>
												{insight.trend}
											</Text>
										</View>
									)}
								</View>
							)}

							{insight.action && (
								<TouchableOpacity
									style={[
										styles.actionButton,
										{ borderColor: getInsightColor(insight.type) },
									]}
									onPress={() => handleInsightAction(insight)}
								>
									<Text
										style={[
											styles.actionButtonText,
											{ color: getInsightColor(insight.type) },
										]}
									>
										{insight.actionLabel || 'Take Action'}
									</Text>
									<Ionicons
										name="arrow-forward"
										size={16}
										color={getInsightColor(insight.type)}
									/>
								</TouchableOpacity>
							)}
						</View>
					))}
				</ScrollView>
			)}

			{lastProfileUpdate && (
				<View style={styles.lastUpdateContainer}>
					<Text style={styles.lastUpdateText}>
						Last updated: {lastProfileUpdate.toLocaleDateString()}
					</Text>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginLeft: 8,
		flex: 1,
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	filterButton: {
		padding: 8,
		marginRight: 4,
		borderRadius: 6,
	},
	filterButtonActive: {
		backgroundColor: '#f1f5f9',
	},
	refreshButton: {
		padding: 8,
		marginLeft: 4,
	},
	exportButton: {
		padding: 8,
		marginLeft: 4,
	},
	refreshingIcon: {
		transform: [{ rotate: '180deg' }],
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: 32,
	},
	emptyStateText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginTop: 16,
	},
	emptyStateSubtext: {
		fontSize: 14,
		color: '#666',
		marginTop: 4,
		textAlign: 'center',
	},
	loadingState: {
		alignItems: 'center',
		paddingVertical: 32,
	},
	loadingText: {
		fontSize: 16,
		color: '#666',
		marginTop: 16,
	},
	errorState: {
		alignItems: 'center',
		paddingVertical: 32,
	},
	errorText: {
		fontSize: 16,
		color: '#ef4444',
		marginTop: 16,
		textAlign: 'center',
	},
	retryButton: {
		backgroundColor: '#3b82f6',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 6,
		marginTop: 16,
	},
	retryButtonText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '500',
	},
	insightsList: {
		maxHeight: 400,
	},
	insightCard: {
		backgroundColor: '#f8fafc',
		borderRadius: 8,
		padding: 16,
		marginBottom: 12,
		borderLeftWidth: 4,
		borderLeftColor: '#e2e8f0',
	},
	insightCardPreview: {
		backgroundColor: '#ffffff',
		borderRadius: 10,
		padding: 12,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	insightHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	insightIconContainer: {
		marginRight: 12,
	},
	insightTitleContainer: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	dismissButton: {
		padding: 4,
		marginLeft: 8,
	},
	insightTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		flex: 1,
	},
	priorityBadge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 12,
		marginLeft: 8,
	},
	priorityText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#fff',
	},
	insightMessage: {
		fontSize: 14,
		color: '#666',
		lineHeight: 20,
		marginBottom: 12,
	},
	insightMetrics: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
		paddingVertical: 8,
		paddingHorizontal: 12,
		backgroundColor: '#f1f5f9',
		borderRadius: 6,
	},
	valueContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	valueLabel: {
		fontSize: 12,
		color: '#64748b',
		marginRight: 4,
	},
	valueText: {
		fontSize: 14,
		fontWeight: '600',
	},
	trendContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	trendText: {
		fontSize: 12,
		fontWeight: '500',
		marginLeft: 4,
		textTransform: 'capitalize',
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderRadius: 6,
		alignSelf: 'flex-start',
	},
	actionButtonText: {
		fontSize: 14,
		fontWeight: '500',
		marginRight: 8,
	},
	lastUpdateContainer: {
		marginTop: 16,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: '#e2e8f0',
	},
	lastUpdateText: {
		fontSize: 12,
		color: '#999',
		textAlign: 'center',
	},
	statsContainer: {
		backgroundColor: '#f8fafc',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	statsTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1a1a1a',
		marginBottom: 12,
		textAlign: 'center',
	},
	statsGrid: {
		flexDirection: 'row',
		justifyContent: 'space-around',
	},
	statItem: {
		alignItems: 'center',
		flex: 1,
	},
	statNumber: {
		fontSize: 24,
		fontWeight: '700',
		marginBottom: 4,
	},
	statLabel: {
		fontSize: 12,
		color: '#666',
		fontWeight: '500',
	},
	searchFilterContainer: {
		marginBottom: 16,
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f8fafc',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	searchInput: {
		flex: 1,
		marginLeft: 8,
		fontSize: 14,
		color: '#1a1a1a',
	},
	clearSearchButton: {
		marginLeft: 8,
		padding: 2,
	},
	filterRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	categoryFilter: {
		flex: 1,
	},
	categoryButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		marginRight: 8,
		borderRadius: 16,
		backgroundColor: '#f1f5f9',
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	categoryButtonActive: {
		backgroundColor: '#3b82f6',
		borderColor: '#3b82f6',
	},
	categoryButtonText: {
		fontSize: 12,
		fontWeight: '500',
		color: '#6b7280',
	},
	categoryButtonTextActive: {
		color: '#fff',
	},
	bookmarkFilterButton: {
		padding: 8,
		borderRadius: 8,
		backgroundColor: '#f1f5f9',
		marginLeft: 8,
	},
	bookmarkFilterButtonActive: {
		backgroundColor: '#dbeafe',
	},
	insightActions: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	bookmarkButton: {
		padding: 4,
		marginRight: 8,
	},
	insightMetadata: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: 8,
		gap: 8,
	},
	metadataItem: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f8fafc',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	metadataText: {
		fontSize: 10,
		color: '#9ca3af',
		marginLeft: 4,
		fontWeight: '500',
	},
});
