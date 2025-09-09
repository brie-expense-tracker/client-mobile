import { useState, useCallback, useMemo, useContext } from 'react';
import { Alert } from 'react-native';
import { InsightsService, AIInsight, InsightsResponse } from '../services';
import { useBudget } from '../context/budgetContext';
import { useGoal } from '../context/goalContext';
import { TransactionContext, Transaction } from '../context/transactionContext';
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
	unreadCount: number;
	loadingUnreadCount: boolean;
	error: string | null;
	isReady: boolean;
	onRefresh: () => Promise<void>;
	fetchInsights: () => Promise<void>;
	generateNewInsights: () => Promise<void>;
	generateProfileBasedInsights: () => Promise<void>;
	markInsightAsRead: (insightId: string) => Promise<void>;
	getInsightDetail: (insightId: string) => Promise<AIInsight | null>;
	refreshAfterActions: () => Promise<void>;
	fetchUnreadCount: () => Promise<void>;
	clearError: () => void;
}

export function useInsightsHub(period: Period): UseInsightsHubReturn {
	const { budgets } = useBudget();
	const { goals } = useGoal();
	const { transactions } = useContext(TransactionContext);
	const { profile } = useProfile();

	const [insights, setInsights] = useState<AIInsight[] | null>(null);
	const [loadingInsights, setLoadingInsights] = useState(false); // Changed to false to not auto-load
	const [generating, setGenerating] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [unreadCount, setUnreadCount] = useState(0);
	const [loadingUnreadCount, setLoadingUnreadCount] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Check if AI insights are enabled for this user
	const aiInsightsEnabled = profile?.preferences?.aiInsights?.enabled ?? true;

	// Memoized period date calculation
	const periodDates = useMemo(() => {
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

		return { start, end: now };
	}, [period]);

	// Memoized period transactions
	const periodTransactions = useMemo(() => {
		return transactions.filter((tx) => {
			const txDate = new Date(tx.date);
			return txDate >= periodDates.start && txDate <= periodDates.end;
		});
	}, [transactions, periodDates]);

	// Memoized income and expenses calculation
	const incomeExpenses = useMemo(() => {
		const totalIncome = periodTransactions
			.filter((tx) => tx.type === 'income')
			.reduce((sum, tx) => sum + tx.amount, 0);

		const totalExpenses = periodTransactions
			.filter((tx) => tx.type === 'expense')
			.reduce((sum, tx) => sum + tx.amount, 0);

		return {
			totalIncome,
			totalExpenses,
			netSavings: totalIncome - totalExpenses,
		};
	}, [periodTransactions]);

	// Memoized budget calculations
	const budgetData = useMemo(() => {
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

		return {
			used: totalBudgetSpent,
			total: totalBudgetAllocated,
			percentage: budgetUtilization,
		};
	}, [budgets]);

	// Memoized goal calculations
	const goalData = useMemo(() => {
		const totalGoalTarget = goals.reduce((sum, goal) => sum + goal.target, 0);
		const totalGoalCurrent = goals.reduce((sum, goal) => sum + goal.current, 0);
		const goalProgress =
			totalGoalTarget > 0 ? (totalGoalCurrent / totalGoalTarget) * 100 : 0;

		return {
			name: goals.length > 0 ? goals[0].name : 'No Goals',
			current: totalGoalCurrent,
			target: totalGoalTarget,
			percentage: goalProgress,
		};
	}, [goals]);

	// Calculate summary data for the selected period
	const summary = useMemo((): SummaryData => {
		// Calculate financial health score
		const savingsRate =
			incomeExpenses.totalIncome > 0
				? (incomeExpenses.netSavings / incomeExpenses.totalIncome) * 100
				: 0;
		const budgetAdherence = Math.max(
			0,
			100 - Math.abs(budgetData.percentage - 100)
		);
		const goalProgressScore = goalData.percentage;
		const financialHealthScore = Math.min(
			100,
			savingsRate * 0.4 + budgetAdherence * 0.3 + goalProgressScore * 0.3
		);

		return {
			totalIncome: incomeExpenses.totalIncome,
			totalExpenses: incomeExpenses.totalExpenses,
			netSavings: incomeExpenses.netSavings,
			budgetUtilization: budgetData,
			goalProgress: goalData,
			financialHealthScore,
		};
	}, [incomeExpenses, budgetData, goalData]);

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
			setError(null); // Clear any previous errors

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
					setError(response.error);
					setInsights([]);
				} else {
					setInsights([]);
				}
			}
		} catch (error) {
			console.error('Error fetching insights:', error);
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to fetch insights';
			setError(errorMessage);
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

	// Fetch unread count
	const fetchUnreadCount = useCallback(async () => {
		if (!aiInsightsEnabled) {
			return;
		}

		try {
			setLoadingUnreadCount(true);
			setError(null);
			const response = await InsightsService.getUnreadCount();

			if (response.success && response.data) {
				setUnreadCount(response.data.unreadCount);
			} else {
				setError('Failed to fetch unread count');
			}
		} catch (error) {
			console.error('Error fetching unread count:', error);
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to fetch unread count';
			setError(errorMessage);
		} finally {
			setLoadingUnreadCount(false);
		}
	}, [aiInsightsEnabled]);

	// Get insight detail by ID
	const getInsightDetail = useCallback(
		async (insightId: string): Promise<AIInsight | null> => {
			if (!aiInsightsEnabled) {
				return null;
			}

			try {
				setError(null);
				const response = await InsightsService.getInsightDetail(insightId);
				return response.success && response.data ? response.data : null;
			} catch (error) {
				console.error('Error fetching insight detail:', error);
				const errorMessage =
					error instanceof Error
						? error.message
						: 'Failed to fetch insight detail';
				setError(errorMessage);
				return null;
			}
		},
		[aiInsightsEnabled]
	);

	// Generate profile-based weekly insights
	const generateProfileBasedInsights = useCallback(async () => {
		if (!aiInsightsEnabled) {
			console.log(
				'AI insights are disabled for this user. Skipping profile-based insights generation.'
			);
			return;
		}

		try {
			console.log(
				'generateProfileBasedInsights - Starting generation process...'
			);
			setGenerating(true);

			const response =
				await InsightsService.generateProfileBasedWeeklyInsights();

			console.log('Profile-based generation response:', {
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
					'generateProfileBasedInsights - Setting insights:',
					sortedInsights.length
				);
				setInsights(sortedInsights);

				// If we have insights, show success message
				if (sortedInsights.length > 0) {
					console.log(
						'generateProfileBasedInsights - Success! Generated insights:',
						sortedInsights.length
					);
					Alert.alert(
						'Success',
						`Generated ${sortedInsights.length} personalized insights!`,
						[{ text: 'OK' }]
					);
				}
			} else {
				console.log('No profile-based insights generated, setting empty array');
				setInsights([]);
			}
		} catch (error) {
			console.error('Error generating profile-based insights:', error);
			Alert.alert(
				'Error',
				'Failed to generate personalized insights. Please try again.'
			);
		} finally {
			setGenerating(false);
		}
	}, [aiInsightsEnabled]);

	// Refresh insights after actions are completed
	const refreshAfterActions = useCallback(async () => {
		if (!aiInsightsEnabled) {
			console.log(
				'AI insights are disabled for this user. Skipping refresh after actions.'
			);
			return;
		}

		try {
			setRefreshing(true);
			console.log(`🔄 Refreshing insights after actions for period: ${period}`);

			const insightsPeriod = convertPeriodToInsightsPeriod(period);
			const response = await InsightsService.refreshInsightsAfterActions(
				insightsPeriod
			);

			if (response.success && response.data && Array.isArray(response.data)) {
				const sortedInsights = response.data
					.sort(
						(a: AIInsight, b: AIInsight) =>
							new Date(b.generatedAt).getTime() -
							new Date(a.generatedAt).getTime()
					)
					.slice(0, 3);

				console.log(
					`✅ Refreshed ${sortedInsights.length} insights after actions for ${period}`
				);
				setInsights(sortedInsights);
			} else {
				setInsights([]);
			}
		} catch (error) {
			console.error('Error refreshing insights after actions:', error);
			setInsights([]);
		} finally {
			setRefreshing(false);
		}
	}, [period, aiInsightsEnabled]);

	// Clear error function
	const clearError = useCallback(() => {
		setError(null);
	}, []);

	// Check if hook is ready (has required data and AI insights are enabled)
	const isReady = useMemo(() => {
		return (
			aiInsightsEnabled &&
			transactions.length >= 0 &&
			budgets.length >= 0 &&
			goals.length >= 0
		);
	}, [aiInsightsEnabled, transactions.length, budgets.length, goals.length]);

	// Removed automatic fetch - now controlled by useFocusEffect in components

	return {
		summary,
		reportData,
		insights,
		loadingInsights,
		generating,
		refreshing,
		unreadCount,
		loadingUnreadCount,
		error,
		isReady,
		onRefresh,
		fetchInsights,
		generateNewInsights,
		generateProfileBasedInsights,
		markInsightAsRead,
		getInsightDetail,
		refreshAfterActions,
		fetchUnreadCount,
		clearError,
	};
}
