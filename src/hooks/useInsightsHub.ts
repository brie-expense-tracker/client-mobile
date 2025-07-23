import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { Alert } from 'react-native';
import {
	InsightsService,
	AIInsight,
	InsightsResponse,
} from '../services/insightsService';
import { useBudget } from '../context/budgetContext';
import { useGoal } from '../context/goalContext';
import { TransactionContext } from '../context/transactionContext';
import { Transaction } from '../data/transactions';
import { useProfile } from '../context/profileContext';

export type Period = 'week' | 'month' | 'quarter';

// Helper function to convert Period to insights period
const convertPeriodToInsightsPeriod = (
	period: Period
): 'daily' | 'weekly' | 'monthly' => {
	switch (period) {
		case 'week':
			return 'weekly';
		case 'month':
			return 'monthly';
		case 'quarter':
			return 'monthly'; // Use monthly for quarter since daily/weekly/monthly are the only options
		default:
			return 'weekly';
	}
};

export interface SummaryData {
	totalIncome: number;
	totalExpenses: number;
	netSavings: number;
	budgetUtilization: {
		used: number;
		total: number;
		percentage: number;
	};
	goalProgress: {
		name: string;
		current: number;
		target: number;
		percentage: number;
	};
	financialHealthScore: number;
}

export interface ReportData extends SummaryData {
	period: Period;
	transactions: Transaction[];
	budgets: any[];
	goals: any[];
}

export interface UseInsightsHubReturn {
	summary: SummaryData;
	reportData: ReportData;
	insights: AIInsight[] | null;
	loadingInsights: boolean;
	generating: boolean;
	refreshing: boolean;
	onRefresh: () => Promise<void>;
	fetchInsights: () => Promise<void>;
	generateNewInsights: () => Promise<void>;
	markInsightAsRead: (insightId: string) => Promise<void>;
}

export function useInsightsHub(period: Period): UseInsightsHubReturn {
	const { budgets } = useBudget();
	const { goals } = useGoal();
	const {
		transactions,
		isLoading: transactionsLoading,
		refetch: refetchTransactions,
	} = useContext(TransactionContext);
	const { profile } = useProfile();

	const [insights, setInsights] = useState<AIInsight[] | null>(null);
	const [loadingInsights, setLoadingInsights] = useState(false); // Changed to false to not auto-load
	const [generating, setGenerating] = useState(false);
	const [refreshing, setRefreshing] = useState(false);

	// Check if AI insights are enabled for this user
	const aiInsightsEnabled = profile?.preferences?.aiInsights?.enabled ?? true;

	// Calculate summary data for the selected period
	const summary = useMemo((): SummaryData => {
		const now = new Date();
		const start = new Date();

		switch (period) {
			case 'week':
				start.setDate(now.getDate() - 7);
				break;
			case 'month':
				start.setMonth(now.getMonth() - 1);
				break;
			case 'quarter':
				start.setMonth(now.getMonth() - 3);
				break;
		}

		const periodTransactions = transactions.filter((tx) => {
			const txDate = new Date(tx.date);
			return txDate >= start && txDate <= now;
		});

		const totalIncome = periodTransactions
			.filter((tx) => tx.type === 'income')
			.reduce((sum, tx) => sum + tx.amount, 0);

		const totalExpenses = periodTransactions
			.filter((tx) => tx.type === 'expense')
			.reduce((sum, tx) => sum + tx.amount, 0);

		const netSavings = totalIncome - totalExpenses;

		// Calculate budget utilization
		const totalBudgetAllocated = budgets.reduce(
			(sum, budget) => sum + budget.amount,
			0
		);
		const totalBudgetSpent = budgets.reduce(
			(sum, budget) => sum + (budget.spent || 0),
			0
		);
		const budgetUtilization =
			totalBudgetAllocated > 0
				? (totalBudgetSpent / totalBudgetAllocated) * 100
				: 0;

		// Calculate goal progress
		const totalGoalTarget = goals.reduce((sum, goal) => sum + goal.target, 0);
		const totalGoalCurrent = goals.reduce((sum, goal) => sum + goal.current, 0);
		const goalProgress =
			totalGoalTarget > 0 ? (totalGoalCurrent / totalGoalTarget) * 100 : 0;

		// Calculate financial health score
		const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
		const budgetAdherence = Math.max(
			0,
			100 - Math.abs(budgetUtilization - 100)
		);
		const goalProgressScore = goalProgress;
		const financialHealthScore = Math.min(
			100,
			savingsRate * 0.4 + budgetAdherence * 0.3 + goalProgressScore * 0.3
		);

		return {
			totalIncome,
			totalExpenses,
			netSavings,
			budgetUtilization: {
				used: totalBudgetSpent,
				total: totalBudgetAllocated,
				percentage: budgetUtilization,
			},
			goalProgress: {
				name: goals.length > 0 ? goals[0].name : 'No Goals',
				current: totalGoalCurrent,
				target: totalGoalTarget,
				percentage: goalProgress,
			},
			financialHealthScore,
		};
	}, [period, transactions, budgets, goals]);

	// Calculate report data for export
	const reportData = useMemo((): ReportData => {
		return {
			period,
			...summary,
			transactions,
			budgets,
			goals,
		};
	}, [period, summary, transactions, budgets, goals]);

	const fetchInsights = useCallback(async () => {
		if (!aiInsightsEnabled) {
			return;
		}

		try {
			setLoadingInsights(true);

			// Set a timeout to prevent long loading
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Request timeout')), 5000); // 5 second timeout
			});

			// Only fetch insights for the selected period instead of all periods
			const insightsPeriod = convertPeriodToInsightsPeriod(period);
			const insightsPromise = InsightsService.getInsights(insightsPeriod);

			const response = (await Promise.race([
				insightsPromise,
				timeoutPromise,
			])) as InsightsResponse;

			if (response.success && response.data && Array.isArray(response.data)) {
				// Sort by most recent and take top 3
				const sortedInsights = response.data
					.sort(
						(a: AIInsight, b: AIInsight) =>
							new Date(b.generatedAt).getTime() -
							new Date(a.generatedAt).getTime()
					)
					.slice(0, 3);

				setInsights(sortedInsights);
			} else {
				// Check if response had specific errors
				if (response.error) {
					console.log('Insights fetch error:', response.error);
					setInsights([]);
				} else {
					setInsights([]);
				}
			}
		} catch (error) {
			console.error('Error fetching insights:', error);
			// Don't show alert, just set empty insights
			setInsights([]);
		} finally {
			setLoadingInsights(false);
		}
	}, [period, aiInsightsEnabled]); // Add selectedPeriod and aiInsightsEnabled as dependencies

	const generateNewInsights = useCallback(async () => {
		if (!aiInsightsEnabled) {
			console.log(
				'AI insights are disabled for this user. Skipping new insights generation.'
			);
			return;
		}

		try {
			console.log('generateNewInsights - Starting generation process...');
			setGenerating(true);

			// Generate insights only for the selected period
			const insightsPeriod = convertPeriodToInsightsPeriod(period);
			console.log(
				`generateNewInsights - Calling generateInsights for ${insightsPeriod} period...`
			);

			const response = await InsightsService.generateInsights(insightsPeriod);

			console.log('Generation response:', {
				success: response.success,
				dataLength: response.data?.length,
				error: response.error,
			});

			if (response.success && response.data && Array.isArray(response.data)) {
				// Sort by most recent and take top 3
				const sortedInsights = response.data
					.sort(
						(a, b) =>
							new Date(b.generatedAt).getTime() -
							new Date(a.generatedAt).getTime()
					)
					.slice(0, 3);

				console.log(
					'generateNewInsights - Setting insights:',
					sortedInsights.length
				);
				setInsights(sortedInsights);

				// If we have insights, show success message
				if (sortedInsights.length > 0) {
					console.log(
						'generateNewInsights - Success! Generated insights:',
						sortedInsights.length
					);
					Alert.alert(
						'Success',
						`Generated ${sortedInsights.length} new insights!`,
						[{ text: 'OK' }]
					);
				}
			} else {
				// If no insights were generated, just set empty array instead of calling fetchInsights
				console.log('No insights generated, setting empty array');
				setInsights([]);
			}
		} catch (error) {
			console.error('Error generating insights:', error);
			Alert.alert('Error', 'Failed to generate insights. Please try again.');
		} finally {
			setGenerating(false);
		}
	}, [period, aiInsightsEnabled]); // Remove fetchInsights from dependencies

	const markInsightAsRead = useCallback(
		async (insightId: string) => {
			if (!aiInsightsEnabled) {
				console.log(
					'AI insights are disabled for this user. Skipping mark as read.'
				);
				return;
			}

			try {
				await InsightsService.markInsightAsRead(insightId);

				// Update local state to mark as read
				setInsights(
					(prevInsights) =>
						prevInsights?.map((ins) =>
							ins._id === insightId ? { ...ins, isRead: true } : ins
						) || null
				);
			} catch (error) {
				console.error('Error marking insight as read:', error);
			}
		},
		[aiInsightsEnabled]
	);

	const onRefresh = useCallback(async () => {
		if (!aiInsightsEnabled) {
			console.log('AI insights are disabled for this user. Skipping refresh.');
			return;
		}

		setRefreshing(true);
		try {
			// Only refresh insights, don't refresh transactions to avoid triggering dashboard refresh
			try {
				setLoadingInsights(true);
				console.log(
					`🔍 Refreshing insights for period: ${period}, AI insights enabled: ${aiInsightsEnabled}`
				);

				// Set a timeout to prevent long loading
				const timeoutPromise = new Promise((_, reject) => {
					setTimeout(() => reject(new Error('Request timeout')), 5000);
				});

				const insightsPeriod = convertPeriodToInsightsPeriod(period);
				const insightsPromise = InsightsService.getInsights(insightsPeriod);

				const response = (await Promise.race([
					insightsPromise,
					timeoutPromise,
				])) as InsightsResponse;

				if (response.success && response.data && Array.isArray(response.data)) {
					const sortedInsights = response.data
						.sort(
							(a: AIInsight, b: AIInsight) =>
								new Date(b.generatedAt).getTime() -
								new Date(a.generatedAt).getTime()
						)
						.slice(0, 3);

					console.log(
						`✅ Refreshed ${sortedInsights.length} insights for ${period}`
					);
					setInsights(sortedInsights);
				} else {
					setInsights([]);
				}
			} catch (error) {
				console.error('Error refreshing insights:', error);
				setInsights([]);
			} finally {
				setLoadingInsights(false);
			}
		} catch (error) {
			console.error('Error refreshing data:', error);
		} finally {
			setRefreshing(false);
		}
	}, [period, aiInsightsEnabled]); // Remove refetchTransactions from dependencies

	// Removed automatic fetch - now controlled by useFocusEffect in components

	return {
		summary,
		reportData,
		insights,
		loadingInsights,
		generating,
		refreshing,
		onRefresh,
		fetchInsights,
		generateNewInsights,
		markInsightAsRead,
	};
}
