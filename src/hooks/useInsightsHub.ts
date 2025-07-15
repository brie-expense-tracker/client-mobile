import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { Alert } from 'react-native';
import { InsightsService, AIInsight } from '../services/insightsService';
import { useBudget } from '../context/budgetContext';
import { useGoal } from '../context/goalContext';
import { TransactionContext } from '../context/transactionContext';
import { Transaction } from '../data/transactions';

export type Period = 'week' | 'month' | 'quarter';

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

	const [insights, setInsights] = useState<AIInsight[] | null>(null);
	const [loadingInsights, setLoadingInsights] = useState(true);
	const [generating, setGenerating] = useState(false);
	const [refreshing, setRefreshing] = useState(false);

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
		try {
			setLoadingInsights(true);
			// Set a timeout to prevent long loading
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Request timeout')), 5000); // 5 second timeout
			});

			// Try to get existing insights with timeout
			const insightsPromise = Promise.allSettled([
				InsightsService.getInsights('daily'),
				InsightsService.getInsights('weekly'),
				InsightsService.getInsights('monthly'),
			]);

			const results = (await Promise.race([
				insightsPromise,
				timeoutPromise,
			])) as PromiseSettledResult<any>[];

			const [dailyResponse, weeklyResponse, monthlyResponse] = results.map(
				(result: PromiseSettledResult<any>) =>
					result.status === 'fulfilled'
						? result.value
						: {
								success: false,
								data: [],
								error: result.reason?.message || 'Request failed',
						  }
			);

			// Log responses for debugging
			console.log('Daily insights response:', dailyResponse);
			console.log('Weekly insights response:', weeklyResponse);
			console.log('Monthly insights response:', monthlyResponse);

			const allInsights = [
				...(dailyResponse.success &&
				dailyResponse.data &&
				Array.isArray(dailyResponse.data)
					? dailyResponse.data.slice(0, 1) // Only take 1 insight per period
					: []),
				...(weeklyResponse.success &&
				weeklyResponse.data &&
				Array.isArray(weeklyResponse.data)
					? weeklyResponse.data.slice(0, 1)
					: []),
				...(monthlyResponse.success &&
				monthlyResponse.data &&
				Array.isArray(monthlyResponse.data)
					? monthlyResponse.data.slice(0, 1)
					: []),
			];

			// Sort by most recent
			allInsights.sort(
				(a, b) =>
					new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
			);

			// Take the most recent 3 insights
			const recentInsights = allInsights.slice(0, 3);

			if (recentInsights.length === 0) {
				// Check if any of the responses had specific errors
				const errors = [
					dailyResponse.error,
					weeklyResponse.error,
					monthlyResponse.error,
				].filter(Boolean);

				if (errors.length > 0) {
					console.log('Insights fetch errors:', errors);
					// Don't show alert, just set empty insights
					setInsights([]);
				} else {
					// Only generate one insight quickly instead of all three
					await generateQuickInsight();
				}
			} else {
				setInsights(recentInsights);
			}
		} catch (error) {
			console.error('Error fetching insights:', error);
			// Don't show alert, just set empty insights
			setInsights([]);
		} finally {
			setLoadingInsights(false);
		}
	}, []);

	const generateQuickInsight = useCallback(async () => {
		try {
			setGenerating(true);
			// Only generate one insight quickly (weekly is usually fastest)
			const response = await InsightsService.generateInsights('weekly');
			console.log('Quick insight generation response:', response);

			if (response.success && response.data && Array.isArray(response.data)) {
				setInsights(response.data.slice(0, 1));
			} else {
				setInsights([]);
			}
		} catch (error) {
			console.error('Error generating quick insight:', error);
			setInsights([]);
		} finally {
			setGenerating(false);
		}
	}, []);

	const generateNewInsights = useCallback(async () => {
		try {
			console.log('generateNewInsights - Starting generation process...');
			setGenerating(true);

			// Generate insights for all periods
			console.log(
				'generateNewInsights - Calling generateInsights for all periods...'
			);
			const [dailyGen, weeklyGen, monthlyGen] = await Promise.all([
				InsightsService.generateInsights('daily'),
				InsightsService.generateInsights('weekly'),
				InsightsService.generateInsights('monthly'),
			]);

			console.log('Generation responses:', {
				dailyGen: {
					success: dailyGen.success,
					dataLength: dailyGen.data?.length,
					error: dailyGen.error,
				},
				weeklyGen: {
					success: weeklyGen.success,
					dataLength: weeklyGen.data?.length,
					error: weeklyGen.error,
				},
				monthlyGen: {
					success: monthlyGen.success,
					dataLength: monthlyGen.data?.length,
					error: monthlyGen.error,
				},
			});

			// Collect all generated insights
			const allInsights = [
				...(dailyGen.success && dailyGen.data && Array.isArray(dailyGen.data)
					? dailyGen.data
					: []),
				...(weeklyGen.success && weeklyGen.data && Array.isArray(weeklyGen.data)
					? weeklyGen.data
					: []),
				...(monthlyGen.success &&
				monthlyGen.data &&
				Array.isArray(monthlyGen.data)
					? monthlyGen.data
					: []),
			];

			console.log(
				'generateNewInsights - Collected insights:',
				allInsights.length
			);

			// Sort by most recent and take top 3
			allInsights.sort(
				(a, b) =>
					new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
			);

			const recentInsights = allInsights.slice(0, 3);
			console.log(
				'generateNewInsights - Setting insights:',
				recentInsights.length
			);
			setInsights(recentInsights);

			// If we have insights, show success message
			if (recentInsights.length > 0) {
				console.log(
					'generateNewInsights - Success! Generated insights:',
					recentInsights.length
				);
				Alert.alert(
					'Success',
					`Generated ${recentInsights.length} new insights!`,
					[{ text: 'OK' }]
				);
			} else {
				// If no insights were generated, try to fetch existing ones
				console.log('No insights generated, fetching existing ones...');
				await fetchInsights();
			}
		} catch (error) {
			console.error('Error generating insights:', error);
			Alert.alert('Error', 'Failed to generate insights. Please try again.');
		} finally {
			setGenerating(false);
		}
	}, [fetchInsights]);

	const markInsightAsRead = useCallback(async (insightId: string) => {
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
	}, []);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await Promise.all([fetchInsights(), refetchTransactions()]);
		} catch (error) {
			console.error('Error refreshing data:', error);
		} finally {
			setRefreshing(false);
		}
	}, [fetchInsights, refetchTransactions]);

	// Initial fetch
	useEffect(() => {
		fetchInsights();
	}, [fetchInsights]);

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
