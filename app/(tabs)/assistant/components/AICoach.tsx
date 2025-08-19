import React, {
	FC,
	useState,
	useCallback,
	useEffect,
	useRef,
	useMemo,
	useContext,
} from 'react';

import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Alert,
	ActivityIndicator,
	RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
	InsightsService,
	AIInsight,
} from '../../../../src/services/insightsService';
import { useProfile } from '../../../../src/context/profileContext';
import { useBudget } from '../../../../src/context/budgetContext';
import { useGoal } from '../../../../src/context/goalContext';
import { TransactionContext } from '../../../../src/context/transactionContext';
import { useInsightsHub, Period } from '../../../../src/hooks/useInsightsHub';
import { IntelligentActions } from './IntelligentActions';
import { AISuggestionsList } from './AISuggestionsList';
import { HistoricalComparison } from './HistoricalComparison';
import { WeeklyReflection } from './WeeklyReflection';

interface AICoachProps {
	// Component now uses user's AI insights frequency preference
	period?: 'daily' | 'weekly' | 'monthly'; // Optional period override
}

// Custom hook for AI Coach logic
const useAICoach = (propPeriod?: string) => {
	const { profile } = useProfile();
	const { budgets } = useBudget();
	const { goals } = useGoal();
	const { transactions } = useContext(TransactionContext);

	// Consolidated state management
	const [aiCoachState, setAiCoachState] = useState({
		error: null as string | null,
		retryCount: 0,
	});

	// Get user preferences
	const aiInsightsEnabled = profile?.preferences?.aiInsights?.enabled ?? true;
	const userFrequency = profile?.preferences?.aiInsights?.frequency ?? 'weekly';
	const maxInsights = profile?.preferences?.aiInsights?.maxInsights ?? 3;
	const showHighPriorityOnly =
		profile?.preferences?.aiInsights?.showHighPriorityOnly ?? false;

	// Convert user frequency to Period type for useInsightsHub
	const getInsightsHubPeriod = useCallback((): Period => {
		if (propPeriod) {
			switch (propPeriod) {
				case 'daily':
					return 'week';
				case 'weekly':
					return 'week';
				case 'monthly':
					return 'month';
				default:
					return 'week';
			}
		}

		switch (userFrequency) {
			case 'daily':
				return 'week';
			case 'weekly':
				return 'week';
			case 'monthly':
				return 'month';
			default:
				return 'week';
		}
	}, [propPeriod, userFrequency]);

	const {
		insights,
		loadingInsights,
		refreshing,
		onRefresh,
		markInsightAsRead,
		fetchInsights,
	} = useInsightsHub(getInsightsHubPeriod());

	// Memoized user metrics calculation
	const userMetrics = useMemo(() => {
		const now = new Date();
		const start = new Date();
		start.setMonth(now.getMonth() - 1);

		// Memoize filtered transactions
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
		const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

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
			savingsRate,
			budgetUtilization,
			goalProgress,
			financialHealthScore,
			totalIncome,
			totalExpenses,
			netSavings,
		};
	}, [transactions, budgets, goals]);

	// Memoized adaptive content generation
	const adaptiveContent = useMemo(() => {
		const metrics = userMetrics;

		// Savings rate based content
		let savingsMessage = '';
		let savingsTone = 'neutral';
		let savingsIcon = 'wallet-outline';

		if (metrics.savingsRate < 0) {
			savingsMessage =
				"You're spending more than you earn. Let's work on building positive savings habits!";
			savingsTone = 'urgent';
			savingsIcon = 'alert-circle';
		} else if (metrics.savingsRate < 10) {
			savingsMessage =
				"Let's boost your savings rate! Small changes can make a big difference.";
			savingsTone = 'encouraging';
			savingsIcon = 'trending-up';
		} else if (metrics.savingsRate < 20) {
			savingsMessage =
				"Good progress! You're on your way to financial security.";
			savingsTone = 'positive';
			savingsIcon = 'checkmark-circle';
		} else {
			savingsMessage =
				"Excellent savings rate! You're building a strong financial foundation.";
			savingsTone = 'celebratory';
			savingsIcon = 'trophy';
		}

		// Budget health based content
		let budgetMessage = '';
		let budgetTone = 'neutral';
		let budgetIcon = 'pie-chart-outline';

		if (metrics.budgetUtilization > 100) {
			budgetMessage =
				"You've exceeded your budget. Let's review and adjust your spending.";
			budgetTone = 'urgent';
			budgetIcon = 'alert-circle';
		} else if (metrics.budgetUtilization > 90) {
			budgetMessage =
				"You're close to your budget limit. Consider reducing non-essential expenses.";
			budgetTone = 'warning';
			budgetIcon = 'warning';
		} else if (metrics.budgetUtilization > 70) {
			budgetMessage =
				"You're managing your budget well. Keep up the good work!";
			budgetTone = 'positive';
			budgetIcon = 'checkmark-circle';
		} else {
			budgetMessage =
				'Great budget control! You have room to save more or invest.';
			budgetTone = 'celebratory';
			budgetIcon = 'trophy';
		}

		// Goal progress based content
		let goalMessage = '';
		let goalTone = 'neutral';
		let goalIcon = 'flag-outline';

		if (goals.length === 0) {
			goalMessage =
				'No financial goals set yet. Creating goals helps you stay motivated!';
			goalTone = 'encouraging';
			goalIcon = 'add-circle';
		} else if (metrics.goalProgress < 25) {
			goalMessage = 'Your goals are just getting started. Every step counts!';
			goalTone = 'encouraging';
			goalIcon = 'play';
		} else if (metrics.goalProgress < 50) {
			goalMessage =
				"You're making steady progress toward your goals. Keep it up!";
			goalTone = 'positive';
			goalIcon = 'trending-up';
		} else if (metrics.goalProgress < 75) {
			goalMessage = "Great progress! You're more than halfway to your goals.";
			goalTone = 'positive';
			goalIcon = 'checkmark-circle';
		} else {
			goalMessage =
				"Amazing! You're almost there. Your goals are within reach!";
			goalTone = 'celebratory';
			goalIcon = 'trophy';
		}

		// Overall financial health message
		let overallMessage = '';
		let overallTone = 'neutral';
		let overallIcon = 'heart-outline';

		if (metrics.financialHealthScore >= 80) {
			overallMessage =
				"Your financial health is excellent! You're on track for success.";
			overallTone = 'celebratory';
			overallIcon = 'heart';
		} else if (metrics.financialHealthScore >= 60) {
			overallMessage =
				'Your financial health is good. Small improvements can make it great!';
			overallTone = 'positive';
			overallIcon = 'heart-half';
		} else if (metrics.financialHealthScore >= 40) {
			overallMessage =
				"Your financial health needs attention. Let's work on improvements together.";
			overallTone = 'encouraging';
			overallIcon = 'heart-outline';
		} else {
			overallMessage =
				"Your financial health needs immediate attention. Let's create a plan together.";
			overallTone = 'urgent';
			overallIcon = 'alert-circle';
		}

		return {
			savings: {
				message: savingsMessage,
				tone: savingsTone,
				icon: savingsIcon,
			},
			budget: { message: budgetMessage, tone: budgetTone, icon: budgetIcon },
			goals: { message: goalMessage, tone: goalTone, icon: goalIcon },
			overall: {
				message: overallMessage,
				tone: overallTone,
				icon: overallIcon,
			},
			metrics,
		};
	}, [userMetrics, goals.length]);

	// Memoized filtered insights
	const filteredInsights = useMemo(() => {
		if (!insights || !aiInsightsEnabled) {
			return [];
		}

		let filtered = insights;

		// Apply priority filter if enabled
		if (showHighPriorityOnly) {
			filtered = filtered.filter((insight) => insight.priority === 'high');
		}

		// Limit to max insights
		return filtered.slice(0, maxInsights);
	}, [insights, aiInsightsEnabled, showHighPriorityOnly, maxInsights]);

	// Error handling with retry logic
	const handleError = useCallback(
		(error: Error) => {
			setAiCoachState((prev) => ({
				...prev,
				error: error.message,
			}));

			if (aiCoachState.retryCount < 3) {
				setTimeout(() => {
					setAiCoachState((prev) => ({
						...prev,
						retryCount: prev.retryCount + 1,
					}));
					fetchInsights();
				}, 1000 * (aiCoachState.retryCount + 1));
			}
		},
		[aiCoachState.retryCount, fetchInsights]
	);

	// Improved insight press handler with better error handling
	const handleInsightPress = useCallback(
		async (insight: AIInsight) => {
			try {
				console.log('🎯 Insight pressed:', insight);
				console.log('🎯 Navigating to period:', insight.period);

				// Mark as read if not already read
				if (!insight.isRead) {
					await markInsightAsRead(insight._id);
				}

				// Improved navigation with proper error handling
				const route = `/(tabs)/insights/${insight.period}`;
				console.log('🎯 Navigating to route:', route);

				// Validate route before navigation
				if (
					insight.period &&
					['daily', 'weekly', 'monthly'].includes(insight.period)
				) {
					router.push(route as any);
				} else {
					throw new Error('Invalid insight period');
				}
			} catch (error) {
				console.error('Error handling insight press:', error);
				Alert.alert(
					'Navigation Error',
					`Unable to navigate to ${insight.period} insights. Please try again.`
				);
			}
		},
		[markInsightAsRead]
	);

	// Optimized focus effect with better API coordination
	const lastFetchRef = useRef<number>(0);

	useEffect(() => {
		const now = Date.now();

		// Regular debounced fetch for subsequent visits
		if (now - lastFetchRef.current > 5000) {
			console.log('🎯 AICoach: Component mounted, fetching insights...');
			lastFetchRef.current = now;
			fetchInsights().catch(handleError);
		} else {
			console.log('🎯 AICoach: Skipping fetch (debounced)');
		}
	}, [fetchInsights, handleError]);

	// Helper functions
	const getInsightIcon = useCallback((insightType: string) => {
		switch (insightType) {
			case 'spending':
				return 'trending-down-outline' as any;
			case 'savings':
				return 'save-outline' as any;
			case 'budget':
				return 'pie-chart-outline' as any;
			case 'goals':
				return 'flag-outline' as any;
			case 'income':
				return 'trending-up-outline' as any;
			default:
				return 'bulb-outline' as any;
		}
	}, []);

	// Get frequency info for display
	const getFrequencyInfo = useCallback(() => {
		switch (userFrequency) {
			case 'daily':
				return { label: 'Daily', icon: 'calendar' };
			case 'weekly':
				return { label: 'Weekly', icon: 'calendar-outline' };
			case 'monthly':
				return { label: 'Monthly', icon: 'calendar-clear' };
			default:
				return { label: 'Weekly', icon: 'calendar-outline' };
		}
	}, [userFrequency]);

	// Get tone color for adaptive content
	const getToneColor = useCallback((tone: string) => {
		switch (tone.toLowerCase()) {
			case 'positive':
				return '#10b981';
			case 'neutral':
				return '#6b7280';
			case 'negative':
				return '#ef4444';
			default:
				return '#6b7280';
		}
	}, []);

	// State setters
	const setShowProgressionSystem = useCallback((show: boolean) => {
		setAiCoachState((prev) => ({
			...prev,
		}));
	}, []);

	const clearError = useCallback(() => {
		setAiCoachState((prev) => ({
			...prev,
			error: null,
			retryCount: 0,
		}));
	}, []);

	return {
		// State
		aiCoachState,
		insights: filteredInsights,
		loadingInsights,
		refreshing,
		error: aiCoachState.error,

		// Data
		adaptiveContent,
		userMetrics,

		// Functions
		onRefresh,
		handleInsightPress,
		clearError,
		getInsightIcon,
		getFrequencyInfo,
		getToneColor,
		userFrequency,
	};
};

// Smaller, focused components
const WelcomeSection: FC<{ stageContent: any }> = ({ stageContent }) => (
	<View style={styles.welcomeSection}>
		<View style={styles.welcomeCard}>
			<View style={styles.welcomeHeader}>
				<View style={styles.welcomeIconContainer}>
					<Ionicons name="sparkles" size={28} color="#0095FF" />
				</View>
				<Text style={styles.welcomeTitle}>
					Welcome to AI Coach! 🎉
				</Text>
			</View>
			<Text style={styles.welcomeText}>
				You now have access to personalized insights and advanced features.
				Generate your first insights to get started!
			</Text>
		</View>
	</View>
);

const AdaptiveContent: FC<{
	adaptiveContent: any;
	getToneColor: (tone: string) => string;
}> = ({ adaptiveContent, getToneColor }) => (
	<View style={styles.adaptiveSection}>
		<Text style={styles.sectionTitle}>Your Financial Health</Text>

		{/* Overall Financial Health Card */}
		<View style={styles.adaptiveCard}>
			<View
				style={[
					styles.adaptiveCardGradient,
					{ backgroundColor: getToneColor(adaptiveContent.overall.tone) },
				]}
			>
				<View style={styles.adaptiveCardHeader}>
					<Ionicons
						name={adaptiveContent.overall.icon as any}
						size={24}
						color="#fff"
					/>
					<Text style={styles.adaptiveCardTitle}>Financial Health</Text>
				</View>
				<Text style={styles.adaptiveCardMessage}>
					{adaptiveContent.overall.message}
				</Text>
			</View>
		</View>

		{/* Metrics Grid */}
		<View style={styles.metricsGrid}>
			{/* Savings Rate Card */}
			<TouchableOpacity
				style={[
					styles.metricCard,
					{ borderColor: getToneColor(adaptiveContent.savings.tone) },
				]}
			>
				<View style={styles.metricCardHeader}>
					<Ionicons
						name={adaptiveContent.savings.icon as any}
						size={16}
						color={getToneColor(adaptiveContent.savings.tone)}
					/>
					<Text style={styles.metricCardTitle}>Savings Rate</Text>
				</View>
				<Text style={styles.metricCardValue}>
					{adaptiveContent.savings.value}%
				</Text>
				<Text style={styles.metricCardMessage}>
					{adaptiveContent.savings.message}
				</Text>
			</TouchableOpacity>

			{/* Budget Utilization Card */}
			<TouchableOpacity
				style={[
					styles.metricCard,
					{ borderColor: getToneColor(adaptiveContent.budget.tone) },
				]}
			>
				<View style={styles.metricCardHeader}>
					<Ionicons
						name={adaptiveContent.budget.icon as any}
						size={16}
						color={getToneColor(adaptiveContent.budget.tone)}
					/>
					<Text style={styles.metricCardTitle}>Budget Usage</Text>
				</View>
				<Text style={styles.metricCardValue}>
					{adaptiveContent.budget.value}%
				</Text>
				<Text style={styles.metricCardMessage}>
					{adaptiveContent.budget.message}
				</Text>
			</TouchableOpacity>

			{/* Goal Progress Card */}
			<TouchableOpacity
				style={[
					styles.metricCard,
					{ borderColor: getToneColor(adaptiveContent.goals.tone) },
				]}
			>
				<View style={styles.metricCardHeader}>
					<Ionicons
						name={adaptiveContent.goals.icon as any}
						size={16}
						color={getToneColor(adaptiveContent.goals.tone)}
					/>
					<Text style={styles.metricCardTitle}>Goal Progress</Text>
				</View>
				<Text style={styles.metricCardValue}>
					{adaptiveContent.goals.value}%
				</Text>
				<Text style={styles.metricCardMessage}>
					{adaptiveContent.goals.message}
				</Text>
			</TouchableOpacity>
		</View>
	</View>
);

const InsightsList: FC<{
	insights: any[];
	currentFrequencyInfo: any;
	getInsightIcon: (type: string) => string;
	onInsightPress: (insight: any) => void;
}> = ({ insights, currentFrequencyInfo, getInsightIcon, onInsightPress }) => (
	<View style={styles.insightsSection}>
		<Text style={styles.sectionTitle}>AI Financial Insights</Text>
		{/* Display insight summary cards */}
		<View style={styles.insightsList}>
			{insights.slice(0, 3).map((insight, index) => (
				<TouchableOpacity
					key={insight._id || index}
					style={styles.insightSummaryCard}
					onPress={() => {
						console.log('🎯 AICoach: Insight summary pressed:', insight);
						onInsightPress(insight);
					}}
				>
					<View style={styles.insightSummaryHeader}>
						<View
							style={[
								styles.insightSummaryIconContainer,
								{ backgroundColor: currentFrequencyInfo.color + '20' },
							]}
						>
							<Ionicons
								name={getInsightIcon(insight.insightType) as any}
								size={18}
								color={currentFrequencyInfo.color}
							/>
						</View>
						<View style={styles.insightSummaryContent}>
							<Text style={styles.insightSummaryTitle} numberOfLines={1}>
								{insight.title}
							</Text>
							<Text style={styles.insightSummaryPeriod}>
								{currentFrequencyInfo.label} Insight
							</Text>
						</View>
						<View style={styles.insightSummaryActions}>
							{insight.priority === 'high' && (
								<View style={styles.priorityBadge}>
									<Text style={styles.priorityText}>High</Text>
								</View>
							)}
							<Ionicons name="chevron-forward" size={16} color="#666" />
						</View>
					</View>
					<Text style={styles.insightSummaryMessage} numberOfLines={2}>
						{insight.message}
					</Text>
				</TouchableOpacity>
			))}
		</View>

		{/* Show more insights button if there are more than 3 */}
		{insights.length > 3 && (
			<TouchableOpacity
				style={styles.viewMoreButton}
				onPress={() => {
					// Navigate to main insights page
					router.push('/(tabs)/insights');
				}}
			>
				<Text style={styles.viewMoreButtonText}>
					View All {insights.length} {currentFrequencyInfo.label} Insights
				</Text>
				<Ionicons
					name="chevron-forward"
					size={16}
					color={currentFrequencyInfo.color}
				/>
			</TouchableOpacity>
		)}
	</View>
);

const ErrorState: FC<{ error: string; onRetry: () => void }> = ({
	error,
	onRetry,
}) => (
	<View style={styles.errorContainer}>
		<Ionicons name="alert-circle" size={48} color="#dc2626" />
		<Text style={styles.errorTitle}>Something went wrong</Text>
		<Text style={styles.errorMessage}>{error}</Text>
		<TouchableOpacity style={styles.retryButton} onPress={onRetry}>
			<Text style={styles.retryButtonText}>Try Again</Text>
		</TouchableOpacity>
	</View>
);

const AICoach: FC<AICoachProps> = ({ period: propPeriod }) => {
	const {
		aiCoachState,
		insights,
		loadingInsights,
		refreshing,
		error,
		adaptiveContent,
		userMetrics,
		onRefresh,
		handleInsightPress,
		clearError,
		getInsightIcon,
		getFrequencyInfo,
		getToneColor,
		userFrequency,
	} = useAICoach(propPeriod);

	// Get frequency info
	const currentFrequencyInfo = getFrequencyInfo();

	// Show error state
	if (error) {
		return (
			<View style={styles.container}>
				<ErrorState error={error} onRetry={clearError} />
			</View>
		);
	}

	// Show loading state
	if (loadingInsights) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" />
				<Text style={styles.loadingText}>Loading insights...</Text>
			</View>
		);
	}

	return (
		<>
			<ScrollView
				style={styles.container}
				contentContainerStyle={styles.content}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						colors={['#2E78B7']}
						tintColor="#2E78B7"
					/>
				}
			>
				{/* Welcome Section - Show when no insights exist */}
				{(!insights || insights.length === 0) && (
					<WelcomeSection stageContent={adaptiveContent} />
				)}

				{/* Adaptive Content Section */}
				{adaptiveContent && (
					<AdaptiveContent
						adaptiveContent={adaptiveContent}
						getToneColor={getToneColor}
					/>
				)}

				{/* Current Insights Section */}
				{insights && insights.length > 0 && (
					<InsightsList
						insights={insights}
						currentFrequencyInfo={currentFrequencyInfo}
						getInsightIcon={getInsightIcon}
						onInsightPress={handleInsightPress}
					/>
				)}
			</ScrollView>
		</>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	content: {
		paddingVertical: 16,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#ffffff',
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#666',
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#333',
		marginBottom: 16,
	},
	adaptiveSection: {
		marginBottom: 24,
	},
	adaptiveCard: {
		marginBottom: 16,
		borderRadius: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},
	adaptiveCardGradient: {
		borderRadius: 16,
		padding: 20,
	},
	adaptiveCardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	adaptiveCardTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#fff',
		marginLeft: 12,
	},
	adaptiveCardMessage: {
		fontSize: 16,
		color: '#fff',
		lineHeight: 24,
	},
	metricsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
	},
	metricCard: {
		flex: 1,
		minWidth: '30%',
		backgroundColor: '#ffffff',
		borderRadius: 12,
		padding: 16,
		borderWidth: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2,
	},
	metricCardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	metricCardTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
		marginLeft: 8,
	},
	metricCardValue: {
		fontSize: 24,
		fontWeight: '700',
		color: '#333',
		marginBottom: 8,
	},
	metricCardMessage: {
		fontSize: 12,
		color: '#666',
		lineHeight: 16,
	},
	welcomeSection: {
		marginBottom: 20,
	},
	welcomeCard: {
		backgroundColor: '#ffffff',
		borderRadius: 20,
		padding: 24,
		borderWidth: 1,
		borderColor: '#f0f0f0',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 12,
		elevation: 6,
	},
	welcomeIconContainer: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: '#f8f9fa',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 16,
	},

	welcomeHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	welcomeTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#333',
		marginLeft: 0,
	},
	welcomeText: {
		fontSize: 16,
		color: '#666',
		lineHeight: 24,
	},
	insightsSection: {
		marginBottom: 20,
	},
	insightsList: {
		gap: 12,
		marginBottom: 16,
	},
	insightSummaryCard: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 20,
		borderWidth: 1,
		borderColor: '#e9ecef',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.02,
		shadowRadius: 8,
		elevation: 4,
	},
	insightSummaryHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	insightSummaryIconContainer: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	insightSummaryContent: {
		flex: 1,
	},
	insightSummaryTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 4,
	},
	insightSummaryPeriod: {
		fontSize: 12,
		color: '#666',
	},
	insightSummaryActions: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 8,
	},
	insightSummaryMessage: {
		fontSize: 14,
		color: '#666',
		lineHeight: 20,
		marginBottom: 8,
	},
	insightSummaryFooter: {
		alignItems: 'center',
	},
	insightSummaryCTA: {
		fontSize: 14,
		fontWeight: '600',
		color: '#4A90E2',
	},
	priorityBadge: {
		backgroundColor: '#ff6b6b',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		marginLeft: 8,
	},
	priorityText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '600',
	},
	viewMoreButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
		backgroundColor: '#f8f9fa',
		borderWidth: 1,
		borderColor: '#e9ecef',
	},
	viewMoreButtonText: {
		fontSize: 14,
		fontWeight: '600',
		marginRight: 4,
	},
	actionsSection: {
		gap: 12,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderRadius: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	actionButtonDisabled: {
		backgroundColor: '#ccc',
		opacity: 0.7,
	},
	actionButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#fff',
		marginLeft: 8,
	},
	secondaryButton: {
		backgroundColor: '#fff',
		borderWidth: 2,
	},
	secondaryButtonText: {
		fontSize: 16,
		fontWeight: '600',
		marginLeft: 8,
	},
	generatingIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 16,
		paddingVertical: 12,
		backgroundColor: 'rgba(255, 255, 255, 0.1)',
		borderRadius: 8,
	},
	generatingText: {
		fontSize: 14,
		fontWeight: '500',
		marginLeft: 8,
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
		backgroundColor: '#ffffff',
	},
	errorTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#333',
		marginTop: 10,
		textAlign: 'center',
	},
	errorMessage: {
		fontSize: 16,
		color: '#666',
		marginTop: 5,
		textAlign: 'center',
		marginBottom: 20,
	},
	retryButton: {
		backgroundColor: '#4CAF50',
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
	},
	retryButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
});

export default AICoach;
