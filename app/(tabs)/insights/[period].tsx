// app/(tabs)/insights/[period].tsx

import React, {
	useEffect,
	useState,
	useRef,
	useCallback,
	useContext,
} from 'react';
import {
	SafeAreaView,
	Text,
	ActivityIndicator,
	StyleSheet,
	ScrollView,
	Alert,
	View,
	TouchableOpacity,
	Animated,
	RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
	InsightsService,
	AIInsight,
} from '../../../src/services/insightsService';
import { useProfile } from '../../../src/context/profileContext';
import { useProgression } from '../../../src/context/progressionContext';
import { useBudget } from '../../../src/context/budgetContext';
import { useGoal } from '../../../src/context/goalContext';
import { TransactionContext } from '../../../src/context/transactionContext';
import HistoricalComparison from './components/HistoricalComparison';
import IntelligentActions from './components/IntelligentActions';
import {
	navigateToBudgetsWithModal,
	navigateToGoalsWithModal,
} from '../../../src/utils/navigationUtils';

export default function InsightDetail() {
	const router = useRouter();
	const { period } = useLocalSearchParams<{
		period: 'daily' | 'weekly' | 'monthly';
	}>();

	const { profile } = useProfile();
	const { currentStage, xp, completedActions, checkProgression } =
		useProgression();
	const { budgets } = useBudget();
	const { goals } = useGoal();
	const { transactions } = useContext(TransactionContext);

	const [insights, setInsights] = useState<AIInsight[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [activeTab, setActiveTab] = useState<
		'overview' | 'progress' | 'history'
	>('overview');

	// Animation values
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(50)).current;

	console.log('🎯 [period].tsx: Component loaded with period:', period);

	// Load insights
	useEffect(() => {
		loadInsights();
	}, [period]);

	// Animate on load
	useEffect(() => {
		if (insights.length > 0 && !loading) {
			Animated.parallel([
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 300,
					useNativeDriver: true,
				}),
				Animated.timing(slideAnim, {
					toValue: 0,
					duration: 300,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [insights.length, loading]);

	const loadInsights = async () => {
		try {
			setLoading(true);
			console.log('🎯 [period].tsx: Loading insights for period:', period);

			const res = await InsightsService.getInsights(period);
			console.log('🎯 [period].tsx: Get insights response:', res);

			let data = res.data || [];

			// If no insights, generate them
			if (!res.success || !Array.isArray(data) || data.length === 0) {
				const generatedRes = await InsightsService.generateInsights(period);
				data = generatedRes.data || [];
			}

			console.log('🎯 [period].tsx: Final insights data:', data);
			setInsights(data);

			// Mark insights as read
			if (data.length > 0) {
				const markPromises = data
					.filter((insight) => !insight.isRead)
					.map((insight) => InsightsService.markInsightAsRead(insight._id));

				if (markPromises.length > 0) {
					await Promise.all(markPromises);
					setInsights((prevInsights) =>
						prevInsights.map((insight) => ({ ...insight, isRead: true }))
					);
				}
			}
		} catch (err) {
			console.warn('🎯 [period].tsx: Error loading insights:', err);
			Alert.alert('Error', 'Could not load insights.');
		} finally {
			setLoading(false);
		}
	};

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			// Refresh only the essential data for the scrollable content
			const res = await InsightsService.getInsights(period);
			let data = res.data || [];

			// If no insights, generate them
			if (!res.success || !Array.isArray(data) || data.length === 0) {
				const generatedRes = await InsightsService.generateInsights(period);
				data = generatedRes.data || [];
			}

			setInsights(data);

			// Mark insights as read
			if (data.length > 0) {
				const markPromises = data
					.filter((insight) => !insight.isRead)
					.map((insight) => InsightsService.markInsightAsRead(insight._id));

				if (markPromises.length > 0) {
					await Promise.all(markPromises);
					setInsights((prevInsights) =>
						prevInsights.map((insight) => ({ ...insight, isRead: true }))
					);
				}
			}
		} catch (err) {
			console.warn('🎯 [period].tsx: Error refreshing insights:', err);
		} finally {
			setRefreshing(false);
		}
	}, [period]);

	// Calculate user progress metrics
	const calculateProgressMetrics = useCallback(() => {
		const now = new Date();
		const start = new Date();

		// Calculate for the period
		switch (period) {
			case 'daily':
				start.setDate(now.getDate() - 1);
				break;
			case 'weekly':
				start.setDate(now.getDate() - 7);
				break;
			case 'monthly':
				start.setMonth(now.getMonth() - 1);
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
		const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

		// Budget utilization
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

		// Goal progress
		const totalGoalTarget = goals.reduce((sum, goal) => sum + goal.target, 0);
		const totalGoalCurrent = goals.reduce((sum, goal) => sum + goal.current, 0);
		const goalProgress =
			totalGoalTarget > 0 ? (totalGoalCurrent / totalGoalTarget) * 100 : 0;

		// Financial health score
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
			savingsRate,
			budgetUtilization,
			goalProgress,
			financialHealthScore,
			transactionCount: periodTransactions.length,
		};
	}, [transactions, budgets, goals, period]);

	// Get period info
	const getPeriodInfo = () => {
		switch (period) {
			case 'daily':
				return {
					label: 'Daily',
					icon: 'calendar-outline',
					description: "Today's financial overview",
					color: '#4CAF50',
				};
			case 'weekly':
				return {
					label: 'Weekly',
					icon: 'calendar',
					description: "This week's financial analysis",
					color: '#2196F3',
				};
			case 'monthly':
				return {
					label: 'Monthly',
					description: 'Monthly trends and insights',
					icon: 'calendar-clear',
					color: '#9C27B0',
				};
			default:
				return {
					label: 'Weekly',
					icon: 'calendar',
					description: "This week's financial analysis",
					color: '#2196F3',
				};
		}
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#2E78B7" />
				<Text style={styles.loadingText}>Loading insights...</Text>
			</SafeAreaView>
		);
	}

	if (insights.length === 0) {
		return (
			<SafeAreaView style={styles.emptyContainer}>
				<Ionicons name="bulb-outline" size={64} color="#ccc" />
				<Text style={styles.emptyTitle}>No insights yet</Text>
				<Text style={styles.emptyText}>
					Add transactions to get personalized financial insights.
				</Text>
				<TouchableOpacity
					style={styles.addTransactionButton}
					onPress={() => router.push('/(tabs)/transaction')}
				>
					<Text style={styles.addTransactionButtonText}>Add Transaction</Text>
				</TouchableOpacity>
			</SafeAreaView>
		);
	}

	const insight = insights[0];
	const periodInfo = getPeriodInfo();
	const metrics = calculateProgressMetrics();
	const headerDate = insight.generatedAt
		? new Date(insight.generatedAt).toLocaleDateString()
		: '';

	// Render tab content
	const renderTabContent = () => {
		switch (activeTab) {
			case 'overview':
				return (
					<Animated.View
						style={[
							styles.tabContent,
							{
								opacity: fadeAnim,
								transform: [{ translateY: slideAnim }],
							},
						]}
					>
						{/* Insight Summary */}
						<View
							style={[
								styles.insightCard,
								{ backgroundColor: periodInfo.color },
							]}
						>
							<View style={styles.insightGradient}>
								<View style={styles.insightHeader}>
									<Ionicons name="bulb" size={24} color="white" />
									<Text style={styles.insightTitle}>{insight.title}</Text>
								</View>
								<Text style={styles.insightMessage}>{insight.message}</Text>
								{insight.detailedExplanation && (
									<Text style={styles.insightExplanation}>
										{insight.detailedExplanation}
									</Text>
								)}
								<View style={styles.insightMeta}>
									<View style={styles.metaItem}>
										<Ionicons
											name="time"
											size={16}
											color="rgba(255,255,255,0.8)"
										/>
										<Text style={styles.metaText}>
											{periodInfo.label} Insight
										</Text>
									</View>
									<View style={styles.metaItem}>
										<Ionicons
											name={
												insight.priority === 'high'
													? 'alert-circle'
													: 'information-circle'
											}
											size={16}
											color="rgba(255,255,255,0.8)"
										/>
										<Text style={styles.metaText}>
											{insight.priority.charAt(0).toUpperCase() +
												insight.priority.slice(1)}{' '}
											Priority
										</Text>
									</View>
								</View>
							</View>
						</View>

						{/* Quick Stats */}
						<View style={styles.statsGrid}>
							<View style={styles.statCard}>
								<Ionicons name="trending-up" size={24} color="#4CAF50" />
								<Text style={styles.statValue}>
									${metrics.totalIncome.toFixed(2)}
								</Text>
								<Text style={styles.statLabel}>Income</Text>
							</View>
							<View style={styles.statCard}>
								<Ionicons name="trending-down" size={24} color="#f44336" />
								<Text style={styles.statValue}>
									${metrics.totalExpenses.toFixed(2)}
								</Text>
								<Text style={styles.statLabel}>Expenses</Text>
							</View>
							<View style={styles.statCard}>
								<Ionicons
									name={metrics.netSavings >= 0 ? 'arrow-up' : 'arrow-down'}
									size={24}
									color={metrics.netSavings >= 0 ? '#4CAF50' : '#f44336'}
								/>
								<Text
									style={[
										styles.statValue,
										{ color: metrics.netSavings >= 0 ? '#4CAF50' : '#f44336' },
									]}
								>
									${metrics.netSavings.toFixed(2)}
								</Text>
								<Text style={styles.statLabel}>Net Savings</Text>
							</View>
						</View>

						{/* Financial Health Score */}
						<View style={styles.healthScoreCard}>
							<Text style={styles.healthScoreTitle}>
								Financial Health Score
							</Text>
							<View style={styles.healthScoreCircle}>
								<Text style={styles.healthScoreValue}>
									{metrics.financialHealthScore.toFixed(0)}%
								</Text>
							</View>
							<Text style={styles.healthScoreDescription}>
								{metrics.financialHealthScore >= 80
									? "Excellent! You're on track for financial success."
									: metrics.financialHealthScore >= 60
									? 'Good progress! Small improvements can make a big difference.'
									: "Let's work on improving your financial health together."}
							</Text>
						</View>
					</Animated.View>
				);

			case 'progress':
				return (
					<Animated.View
						style={[
							styles.tabContent,
							{
								opacity: fadeAnim,
								transform: [{ translateY: slideAnim }],
							},
						]}
					>
						{/* Progression Status */}
						<View style={styles.progressionCard}>
							<View
								style={[
									styles.progressionGradient,
									{ backgroundColor: '#FF6B6B' },
								]}
							>
								<View style={styles.progressionHeader}>
									<Ionicons name="trophy" size={24} color="white" />
									<Text style={styles.progressionTitle}>Your Progress</Text>
								</View>
								<View style={styles.progressionStats}>
									<View style={styles.progressionStat}>
										<Text style={styles.progressionStatValue}>{xp}</Text>
										<Text style={styles.progressionStatLabel}>XP Earned</Text>
									</View>
									<View style={styles.progressionStat}>
										<Text style={styles.progressionStatValue}>
											{completedActions}
										</Text>
										<Text style={styles.progressionStatLabel}>
											Actions Completed
										</Text>
									</View>
									<View style={styles.progressionStat}>
										<Text style={styles.progressionStatValue}>
											{currentStage}
										</Text>
										<Text style={styles.progressionStatLabel}>
											Current Stage
										</Text>
									</View>
								</View>
							</View>
						</View>

						{/* Progress Metrics */}
						<View style={styles.progressMetrics}>
							<View style={styles.progressMetric}>
								<View style={styles.progressMetricHeader}>
									<Ionicons name="save" size={20} color="#4CAF50" />
									<Text style={styles.progressMetricTitle}>Savings Rate</Text>
								</View>
								<View style={styles.progressBar}>
									<View
										style={[
											styles.progressBarFill,
											{
												width: `${Math.min(
													100,
													Math.max(0, metrics.savingsRate)
												)}%`,
												backgroundColor:
													metrics.savingsRate >= 20
														? '#4CAF50'
														: metrics.savingsRate >= 10
														? '#FF9800'
														: '#f44336',
											},
										]}
									/>
								</View>
								<Text style={styles.progressMetricValue}>
									{metrics.savingsRate.toFixed(1)}%
								</Text>
							</View>

							<View style={styles.progressMetric}>
								<View style={styles.progressMetricHeader}>
									<Ionicons name="wallet" size={20} color="#2196F3" />
									<Text style={styles.progressMetricTitle}>
										Budget Utilization
									</Text>
								</View>
								<View style={styles.progressBar}>
									<View
										style={[
											styles.progressBarFill,
											{
												width: `${Math.min(100, metrics.budgetUtilization)}%`,
												backgroundColor:
													metrics.budgetUtilization <= 70
														? '#4CAF50'
														: metrics.budgetUtilization <= 90
														? '#FF9800'
														: '#f44336',
											},
										]}
									/>
								</View>
								<Text style={styles.progressMetricValue}>
									{metrics.budgetUtilization.toFixed(1)}%
								</Text>
							</View>

							<View style={styles.progressMetric}>
								<View style={styles.progressMetricHeader}>
									<Ionicons name="flag" size={20} color="#9C27B0" />
									<Text style={styles.progressMetricTitle}>Goal Progress</Text>
								</View>
								<View style={styles.progressBar}>
									<View
										style={[
											styles.progressBarFill,
											{
												width: `${Math.min(100, metrics.goalProgress)}%`,
												backgroundColor:
													metrics.goalProgress >= 75
														? '#4CAF50'
														: metrics.goalProgress >= 50
														? '#FF9800'
														: '#f44336',
											},
										]}
									/>
								</View>
								<Text style={styles.progressMetricValue}>
									{metrics.goalProgress.toFixed(1)}%
								</Text>
							</View>
						</View>

						{/* Quick Actions */}
						<View style={styles.quickActions}>
							<Text style={styles.sectionTitle}>Quick Actions</Text>
							<View style={styles.quickActionsGrid}>
								<TouchableOpacity
									style={styles.quickActionButton}
									onPress={() => router.push('/(tabs)/transaction')}
								>
									<Ionicons name="add-circle" size={24} color="#4CAF50" />
									<Text style={styles.quickActionText}>Add Transaction</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={styles.quickActionButton}
									onPress={() => navigateToBudgetsWithModal()}
								>
									<Ionicons name="wallet" size={24} color="#2196F3" />
									<Text style={styles.quickActionText}>Manage Budgets</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={styles.quickActionButton}
									onPress={() => navigateToGoalsWithModal()}
								>
									<Ionicons name="flag" size={24} color="#9C27B0" />
									<Text style={styles.quickActionText}>Set Goals</Text>
								</TouchableOpacity>
							</View>
						</View>
					</Animated.View>
				);

			case 'history':
				return (
					<Animated.View
						style={[
							styles.tabContent,
							{
								opacity: fadeAnim,
								transform: [{ translateY: slideAnim }],
							},
						]}
					>
						{/* Historical Comparison */}
						{insight.metadata?.historicalComparison ? (
							<View style={styles.historyCard}>
								<Text style={styles.sectionTitle}>Historical Comparison</Text>
								<HistoricalComparison
									historicalComparison={insight.metadata.historicalComparison}
									period={period}
								/>
							</View>
						) : (
							<View style={styles.noHistoryCard}>
								<Ionicons name="time-outline" size={48} color="#ccc" />
								<Text style={styles.noHistoryTitle}>No Historical Data</Text>
								<Text style={styles.noHistoryText}>
									Continue adding transactions to see historical comparisons and
									trends.
								</Text>
							</View>
						)}

						{/* Transaction Summary */}
						<View style={styles.transactionSummary}>
							<Text style={styles.sectionTitle}>Transaction Summary</Text>
							<View style={styles.transactionStats}>
								<View style={styles.transactionStat}>
									<Text style={styles.transactionStatValue}>
										{metrics.transactionCount}
									</Text>
									<Text style={styles.transactionStatLabel}>
										Total Transactions
									</Text>
								</View>
								<View style={styles.transactionStat}>
									<Text style={styles.transactionStatValue}>
										{transactions.filter((tx) => tx.type === 'income').length}
									</Text>
									<Text style={styles.transactionStatLabel}>
										Income Transactions
									</Text>
								</View>
								<View style={styles.transactionStat}>
									<Text style={styles.transactionStatValue}>
										{transactions.filter((tx) => tx.type === 'expense').length}
									</Text>
									<Text style={styles.transactionStatLabel}>
										Expense Transactions
									</Text>
								</View>
							</View>
						</View>
					</Animated.View>
				);

			default:
				return null;
		}
	};

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: periodInfo.color }]}
		>
			{/* Header */}
			<View style={[styles.header, { backgroundColor: periodInfo.color }]}>
				<View style={styles.headerContent}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.back()}
					>
						<Ionicons name="arrow-back" size={24} color="white" />
					</TouchableOpacity>
					<View style={styles.headerTitleSection}>
						<Ionicons name={periodInfo.icon as any} size={24} color="white" />
						<Text style={styles.headerTitle}>{periodInfo.label} Insights</Text>
					</View>
					<View style={styles.headerRight} />
				</View>
				{headerDate && (
					<Text style={styles.headerDate}>Generated on {headerDate}</Text>
				)}
			</View>

			{/* Tab Navigation */}
			<View style={styles.tabContainer}>
				<TouchableOpacity
					style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
					onPress={() => setActiveTab('overview')}
				>
					<Ionicons
						name="home"
						size={20}
						color={activeTab === 'overview' ? periodInfo.color : '#666'}
					/>
					<Text
						style={[
							styles.tabText,
							activeTab === 'overview' && styles.activeTabText,
						]}
					>
						Overview
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.tab, activeTab === 'progress' && styles.activeTab]}
					onPress={() => setActiveTab('progress')}
				>
					<Ionicons
						name="trending-up"
						size={20}
						color={activeTab === 'progress' ? periodInfo.color : '#666'}
					/>
					<Text
						style={[
							styles.tabText,
							activeTab === 'progress' && styles.activeTabText,
						]}
					>
						Progress
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.tab, activeTab === 'history' && styles.activeTab]}
					onPress={() => setActiveTab('history')}
				>
					<Ionicons
						name="time"
						size={20}
						color={activeTab === 'history' ? periodInfo.color : '#666'}
					/>
					<Text
						style={[
							styles.tabText,
							activeTab === 'history' && styles.activeTabText,
						]}
					>
						History
					</Text>
				</TouchableOpacity>
			</View>

			{/* Content */}
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						colors={[periodInfo.color]}
						tintColor={periodInfo.color}
					/>
				}
			>
				{renderTabContent()}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8f9fa',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#666',
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
		padding: 32,
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#333',
		marginTop: 16,
		marginBottom: 8,
	},
	emptyText: {
		fontSize: 16,
		color: '#666',
		textAlign: 'center',
		marginBottom: 24,
	},
	addTransactionButton: {
		backgroundColor: '#2E78B7',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
	},
	addTransactionButtonText: {
		color: 'white',
		fontSize: 16,
		fontWeight: '600',
	},
	header: {
		paddingBottom: 20,
		paddingHorizontal: 16,
	},
	headerContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	backButton: {
		padding: 8,
	},
	headerTitleSection: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		justifyContent: 'center',
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: 'white',
		marginLeft: 8,
	},
	headerRight: {
		width: 40,
	},
	headerDate: {
		fontSize: 14,
		color: 'rgba(255,255,255,0.8)',
		textAlign: 'center',
	},
	tabContainer: {
		flexDirection: 'row',
		backgroundColor: 'white',
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
	},
	tab: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		paddingHorizontal: 8,
	},
	activeTab: {
		borderBottomWidth: 2,
		borderBottomColor: '#2E78B7',
	},
	tabText: {
		fontSize: 12,
		color: '#666',
		marginLeft: 4,
		fontWeight: '500',
	},
	activeTabText: {
		color: '#2E78B7',
		fontWeight: '600',
	},
	scrollView: {
		flex: 1,
		backgroundColor: 'white',
	},
	scrollContent: {
		padding: 16,
	},
	tabContent: {
		minHeight: 500,
	},
	insightCard: {
		marginBottom: 20,
		borderRadius: 16,
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 4,
	},
	insightGradient: {
		padding: 20,
	},
	insightHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	insightTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: 'white',
		marginLeft: 8,
	},
	insightMessage: {
		fontSize: 16,
		color: 'white',
		lineHeight: 24,
		marginBottom: 8,
	},
	insightExplanation: {
		fontSize: 14,
		color: 'rgba(255,255,255,0.9)',
		lineHeight: 20,
		marginBottom: 16,
	},
	insightMeta: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	metaItem: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	metaText: {
		fontSize: 12,
		color: 'rgba(255,255,255,0.8)',
		marginLeft: 4,
	},
	statsGrid: {
		flexDirection: 'row',
		marginBottom: 20,
		gap: 12,
	},
	statCard: {
		flex: 1,
		backgroundColor: 'white',
		padding: 16,
		borderRadius: 12,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2,
	},
	statValue: {
		fontSize: 18,
		fontWeight: '700',
		color: '#333',
		marginTop: 8,
		marginBottom: 4,
	},
	statLabel: {
		fontSize: 12,
		color: '#666',
		fontWeight: '500',
	},
	healthScoreCard: {
		backgroundColor: 'white',
		padding: 20,
		borderRadius: 16,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2,
	},
	healthScoreTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginBottom: 16,
	},
	healthScoreCircle: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: '#4CAF50',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 16,
	},
	healthScoreValue: {
		fontSize: 20,
		fontWeight: '700',
		color: 'white',
	},
	healthScoreDescription: {
		fontSize: 14,
		color: '#666',
		textAlign: 'center',
		lineHeight: 20,
	},
	progressionCard: {
		marginBottom: 20,
		borderRadius: 16,
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},
	progressionGradient: {
		padding: 20,
	},
	progressionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	progressionTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: 'white',
		marginLeft: 8,
	},
	progressionStats: {
		flexDirection: 'row',
		justifyContent: 'space-around',
	},
	progressionStat: {
		alignItems: 'center',
	},
	progressionStatValue: {
		fontSize: 24,
		fontWeight: '700',
		color: 'white',
	},
	progressionStatLabel: {
		fontSize: 12,
		color: 'rgba(255,255,255,0.8)',
		marginTop: 4,
	},
	progressMetrics: {
		marginBottom: 20,
	},
	progressMetric: {
		backgroundColor: 'white',
		padding: 16,
		borderRadius: 12,
		marginBottom: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2,
	},
	progressMetricHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	progressMetricTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginLeft: 8,
	},
	progressBar: {
		height: 8,
		backgroundColor: '#f0f0f0',
		borderRadius: 4,
		marginBottom: 8,
	},
	progressBarFill: {
		height: 8,
		borderRadius: 4,
	},
	progressMetricValue: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
		textAlign: 'right',
	},
	quickActions: {
		marginBottom: 20,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#333',
		marginBottom: 12,
	},
	sectionSubtitle: {
		fontSize: 14,
		color: '#666',
		marginBottom: 16,
		lineHeight: 20,
	},
	quickActionsGrid: {
		flexDirection: 'row',
		gap: 12,
	},
	quickActionButton: {
		flex: 1,
		backgroundColor: 'white',
		padding: 16,
		borderRadius: 12,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2,
	},
	quickActionText: {
		fontSize: 12,
		color: '#333',
		marginTop: 8,
		fontWeight: '500',
		textAlign: 'center',
	},
	historyCard: {
		backgroundColor: 'white',
		borderRadius: 16,
		padding: 20,
		marginBottom: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2,
	},
	noHistoryCard: {
		backgroundColor: 'white',
		borderRadius: 16,
		padding: 32,
		marginBottom: 20,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2,
	},
	noHistoryTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginTop: 16,
		marginBottom: 8,
	},
	noHistoryText: {
		fontSize: 14,
		color: '#666',
		textAlign: 'center',
		lineHeight: 20,
	},
	transactionSummary: {
		backgroundColor: 'white',
		borderRadius: 16,
		padding: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2,
	},
	transactionStats: {
		flexDirection: 'row',
		justifyContent: 'space-around',
	},
	transactionStat: {
		alignItems: 'center',
	},
	transactionStatValue: {
		fontSize: 24,
		fontWeight: '700',
		color: '#333',
	},
	transactionStatLabel: {
		fontSize: 12,
		color: '#666',
		marginTop: 4,
		textAlign: 'center',
	},
});
