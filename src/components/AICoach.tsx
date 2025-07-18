import React, { FC, useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { InsightsService } from '../services/insightsService';
import { useProfile } from '../context/profileContext';
import { useProgression } from '../context/progressionContext';
import { useInsightsHub, Period } from '../hooks';
import { useBudget } from '../context/budgetContext';
import { useGoal } from '../context/goalContext';
import { useContext } from 'react';
import { TransactionContext } from '../context/transactionContext';
import ProgressionSystem from './ProgressionSystem';
import { AIInsight } from '../services/insightsService';

interface AICoachProps {
	// Component now uses user's AI insights frequency preference
	period?: 'daily' | 'weekly' | 'monthly'; // Optional period override
}

const AICoach: FC<AICoachProps> = ({ period: propPeriod }) => {
	const { profile } = useProfile();
	const { currentStage, xp, completedActions, checkProgression } =
		useProgression();
	const { budgets } = useBudget();
	const { goals } = useGoal();
	const { transactions } = useContext(TransactionContext);

	const [showProgressionSystem, setShowProgressionSystem] = useState(false);

	// Get user preferences
	const aiInsightsEnabled = profile?.preferences?.aiInsights?.enabled ?? true;
	const userFrequency = profile?.preferences?.aiInsights?.frequency ?? 'weekly';
	const maxInsights = profile?.preferences?.aiInsights?.maxInsights ?? 3;
	const showHighPriorityOnly =
		profile?.preferences?.aiInsights?.showHighPriorityOnly ?? false;

	// Convert user frequency to Period type for useInsightsHub
	const getInsightsHubPeriod = (): Period => {
		// If a specific period is provided as a prop, use that
		if (propPeriod) {
			switch (propPeriod) {
				case 'daily':
					return 'week';
				case 'weekly':
					return 'month';
				case 'monthly':
					return 'quarter';
				default:
					return 'month';
			}
		}

		// Otherwise use user's frequency preference
		switch (userFrequency) {
			case 'daily':
				return 'week';
			case 'weekly':
				return 'month';
			case 'monthly':
				return 'quarter';
			default:
				return 'month';
		}
	};

	const {
		insights,
		loadingInsights,
		refreshing,
		onRefresh,
		markInsightAsRead,
		fetchInsights,
	} = useInsightsHub(getInsightsHubPeriod());

	// Calculate user behavior metrics for adaptive content
	const userMetrics = useCallback(() => {
		const now = new Date();
		const start = new Date();

		// Calculate for the last month
		start.setMonth(now.getMonth() - 1);

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

	// Generate adaptive content based on user metrics
	const getAdaptiveContent = useCallback(() => {
		const metrics = userMetrics();

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

	// Filter insights based on user preferences
	const filteredInsights = useCallback(() => {
		console.log('🔍 Filtering insights:', {
			insightsLength: insights?.length,
			aiInsightsEnabled,
			showHighPriorityOnly,
			maxInsights,
		});

		if (!insights || !aiInsightsEnabled) {
			console.log(
				'🔍 No insights or AI insights disabled, returning empty array'
			);
			return [];
		}

		let filtered = insights;

		console.log('🔍 After type filtering:', filtered.length);

		// Apply priority filter if enabled
		if (showHighPriorityOnly) {
			filtered = filtered.filter((insight) => insight.priority === 'high');
			console.log('🔍 After priority filtering:', filtered.length);
		}

		// Limit to max insights
		const result = filtered.slice(0, maxInsights);
		console.log('🔍 Final filtered insights:', result.length);
		return result;
	}, [insights, aiInsightsEnabled, showHighPriorityOnly, maxInsights]);

	// Handle insight press
	const handleInsightPress = useCallback(
		async (insight: AIInsight) => {
			try {
				console.log('🎯 Insight pressed:', insight);
				console.log('🎯 Navigating to period:', insight.period);

				// Mark as read if not already read
				if (!insight.isRead) {
					await markInsightAsRead(insight._id);
				}

				// Navigate to the period detail using the correct Expo Router format
				const route = `/(tabs)/insights/${insight.period}`;
				console.log('🎯 Navigating to route:', route);

				// Use router.push with the correct route format
				router.push(route as any);
			} catch (error) {
				console.error('Error handling insight press:', error);
				// Show alert if navigation fails
				Alert.alert(
					'Navigation Error',
					`Unable to navigate to ${insight.period} insights. Please try again.`
				);
			}
		},
		[markInsightAsRead, router]
	);

	// Handle when insights are generated
	const handleInsightsGenerated = useCallback(
		async (newInsights: any[]) => {
			try {
				console.log('🎯 Insights generated from AI Coach:', newInsights.length);

				// Refresh insights to get the latest data
				await fetchInsights();

				// Show success message (already shown in AICoach component)
				console.log('✅ Insights refreshed after generation');
			} catch (error) {
				console.error('Error refreshing insights after generation:', error);
			}
		},
		[fetchInsights]
	);

	// Helper function to get icon for insight type
	const getInsightIcon = (insightType: string) => {
		switch (insightType) {
			case 'budgeting':
				return 'wallet-outline';
			case 'savings':
				return 'save-outline';
			case 'spending':
				return 'trending-down-outline';
			case 'income':
				return 'trending-up-outline';
			default:
				return 'bulb-outline';
		}
	};

	// Helper function to get frequency display info
	const getFrequencyInfo = (frequency: string) => {
		switch (frequency) {
			case 'daily':
				return {
					label: 'Daily',
					icon: 'calendar-outline',
					description: "Today's insights and quick actions",
					color: '#4CAF50',
				};
			case 'weekly':
				return {
					label: 'Weekly',
					icon: 'calendar',
					description: "This week's financial overview",
					color: '#2196F3',
				};
			case 'monthly':
				return {
					label: 'Monthly',
					icon: 'calendar-clear',
					description: 'Monthly trends and analysis',
					color: '#9C27B0',
				};
			default:
				return {
					label: 'Weekly',
					icon: 'calendar',
					description: "This week's financial overview",
					color: '#2196F3',
				};
		}
	};

	// Get stage-specific content
	const getStageContent = () => {
		switch (currentStage) {
			case 'level2':
				return {
					title: 'Stage 2: Smart Actions',
					subtitle: 'Personalized recommendations and smart actions',
					description:
						"Great job! You've unlocked personalized smart actions. Complete missions to earn XP and unlock advanced features.",
					color: '#4CAF50',
					icon: 'sparkles',
				};
			case 'dynamic':
				return {
					title: 'Stage 3: Dynamic Progression',
					subtitle: 'Advanced AI insights and continuous optimization',
					description:
						"You've reached the advanced stage! Enjoy continuous optimization and advanced financial insights.",
					color: '#9C27B0',
					icon: 'rocket',
				};
			case 'smartPath':
				return {
					title: 'Stage 4: Smart Path Customization',
					subtitle: 'Gamified skill trees and mastery paths',
					description:
						'Master your financial skills through customizable skill paths and unlock advanced mastery levels.',
					color: '#E91E63',
					icon: 'trophy',
				};
			case 'realtime':
				return {
					title: 'Stage 5: Real-time Reactivity',
					subtitle: 'Ongoing monitoring and reactive prompts',
					description:
						"You've reached the pinnacle! Experience real-time financial monitoring and adaptive AI responses.",
					color: '#00BCD4',
					icon: 'flash',
				};
			default:
				return {
					title: 'AI Coach',
					subtitle: 'Your personal financial assistant',
					description:
						"Welcome to AI Coach! Let's get started with your financial journey.",
					color: '#2196F3',
					icon: 'bulb-outline',
				};
		}
	};

	const [localInsights, setLocalInsights] = useState<any[]>(filteredInsights());
	const [localGenerating, setLocalGenerating] = useState(false);

	// Update local insights when filtered insights change
	useEffect(() => {
		console.log(
			'🎯 AICoach: Filtered insights changed:',
			filteredInsights().length
		);
		setLocalInsights(filteredInsights());
	}, [filteredInsights]);

	// Only fetch insights when the screen is focused
	useFocusEffect(
		useCallback(() => {
			console.log('🎯 AICoach: Screen focused, fetching insights...');
			fetchInsights();
		}, [fetchInsights])
	);

	const handleGenerateInsights = useCallback(async () => {
		// Check if AI insights are enabled
		if (!profile?.preferences?.aiInsights?.enabled) {
			Alert.alert(
				'AI Insights Disabled',
				'Please enable AI insights in Settings > AI Insights to generate personalized financial insights.',
				[
					{ text: 'Cancel', style: 'cancel' },
					{
						text: 'Go to Settings',
						onPress: () => {
							router.push('/(tabs)/settings/aiInsights');
						},
					},
				]
			);
			return;
		}

		try {
			setLocalGenerating(true);
			console.log(
				`🎯 AICoach: Starting insights generation for ${userFrequency} frequency...`
			);

			// Generate insights for the user's frequency preference
			const response = await InsightsService.generateInsights(userFrequency);

			console.log('🎯 AICoach: Generation response:', {
				success: response.success,
				dataLength: response.data?.length,
				error: response.error,
			});

			if (response.success && response.data && Array.isArray(response.data)) {
				// Sort by most recent
				const sortedInsights = response.data.sort(
					(a, b) =>
						new Date(b.generatedAt).getTime() -
						new Date(a.generatedAt).getTime()
				);

				console.log(
					'🎯 AICoach: Success! Generated insights:',
					sortedInsights.length
				);

				// Update local insights immediately so user sees them
				setLocalInsights(sortedInsights);

				// Show success message
				Alert.alert(
					'Success! 🎉',
					`Generated ${sortedInsights.length} personalized ${
						getFrequencyInfo(userFrequency).label
					} insights for you.`,
					[{ text: 'Great!' }]
				);

				// Call the callback to update parent component
				handleInsightsGenerated(sortedInsights);
			} else {
				console.log('🎯 AICoach: No insights generated');
				Alert.alert(
					'No Insights Generated',
					'Unable to generate insights at this time. This might be because you need more transaction data. Try adding some transactions and try again.',
					[{ text: 'OK' }]
				);
			}
		} catch (error) {
			console.error('🎯 AICoach: Error generating insights:', error);
			Alert.alert(
				'Generation Failed',
				'We encountered an issue generating your insights. Please check your internet connection and try again.',
				[{ text: 'OK' }]
			);
		} finally {
			setLocalGenerating(false);
		}
	}, [
		profile?.preferences?.aiInsights?.enabled,
		handleInsightsGenerated,
		userFrequency,
	]);

	// Use localInsights instead of props insights for display
	const displayInsights = localInsights;
	const currentFrequencyInfo = getFrequencyInfo(userFrequency);
	const stageContent = getStageContent();
	const adaptiveContent = getAdaptiveContent();

	// Helper function to get tone-based colors
	const getToneColor = (tone: string) => {
		switch (tone) {
			case 'urgent':
				return '#dc2626';
			case 'warning':
				return '#f59e0b';
			case 'encouraging':
				return '#3b82f6';
			case 'positive':
				return '#10b981';
			case 'celebratory':
				return '#8b5cf6';
			default:
				return '#6b7280';
		}
	};

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
				{/* Adaptive Content Section */}
				<View style={styles.adaptiveSection}>
					<Text style={styles.sectionTitle}>Your Financial Health</Text>

					{/* Overall Financial Health Card */}
					<View style={styles.adaptiveCard}>
						<LinearGradient
							colors={[
								getToneColor(adaptiveContent.overall.tone),
								getToneColor(adaptiveContent.overall.tone) + '80',
							]}
							style={styles.adaptiveCardGradient}
						>
							<View style={styles.adaptiveCardHeader}>
								<Ionicons
									name={adaptiveContent.overall.icon as any}
									size={24}
									color="#fff"
								/>
								<Text style={styles.adaptiveCardTitle}>
									Financial Health Score:{' '}
									{adaptiveContent.metrics.financialHealthScore.toFixed(0)}%
								</Text>
							</View>
							<Text style={styles.adaptiveCardMessage}>
								{adaptiveContent.overall.message}
							</Text>
						</LinearGradient>
					</View>

					{/* Metrics Grid */}
					<View style={styles.metricsGrid}>
						{/* Savings Rate Card */}
						<TouchableOpacity
							style={[
								styles.metricCard,
								{ borderColor: getToneColor(adaptiveContent.savings.tone) },
							]}
							onPress={() => router.push('/(tabs)/dashboard')}
						>
							<View style={styles.metricCardHeader}>
								<Ionicons
									name={adaptiveContent.savings.icon as any}
									size={20}
									color={getToneColor(adaptiveContent.savings.tone)}
								/>
								<Text style={styles.metricCardTitle}>Savings Rate</Text>
							</View>
							<Text style={styles.metricCardValue}>
								{adaptiveContent.metrics.savingsRate.toFixed(1)}%
							</Text>
							<Text style={styles.metricCardMessage} numberOfLines={2}>
								{adaptiveContent.savings.message}
							</Text>
						</TouchableOpacity>

						{/* Budget Health Card */}
						<TouchableOpacity
							style={[
								styles.metricCard,
								{ borderColor: getToneColor(adaptiveContent.budget.tone) },
							]}
							onPress={() => router.push('/(tabs)/budgets')}
						>
							<View style={styles.metricCardHeader}>
								<Ionicons
									name={adaptiveContent.budget.icon as any}
									size={20}
									color={getToneColor(adaptiveContent.budget.tone)}
								/>
								<Text style={styles.metricCardTitle}>Budget Health</Text>
							</View>
							<Text style={styles.metricCardValue}>
								{adaptiveContent.metrics.budgetUtilization.toFixed(1)}%
							</Text>
							<Text style={styles.metricCardMessage} numberOfLines={2}>
								{adaptiveContent.budget.message}
							</Text>
						</TouchableOpacity>

						{/* Goal Progress Card */}
						<TouchableOpacity
							style={[
								styles.metricCard,
								{ borderColor: getToneColor(adaptiveContent.goals.tone) },
							]}
							onPress={() => router.push('/(tabs)/budgets/goals')}
						>
							<View style={styles.metricCardHeader}>
								<Ionicons
									name={adaptiveContent.goals.icon as any}
									size={20}
									color={getToneColor(adaptiveContent.goals.tone)}
								/>
								<Text style={styles.metricCardTitle}>Goal Progress</Text>
							</View>
							<Text style={styles.metricCardValue}>
								{adaptiveContent.metrics.goalProgress.toFixed(1)}%
							</Text>
							<Text style={styles.metricCardMessage} numberOfLines={2}>
								{adaptiveContent.goals.message}
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Current Insights Section */}
				{displayInsights && displayInsights.length > 0 && (
					<View style={styles.insightsSection}>
						<Text style={styles.sectionTitle}>AI Financial Insights</Text>
						{/* Display insight summary cards */}
						<View style={styles.insightsList}>
							{displayInsights.slice(0, 3).map((insight, index) => (
								<TouchableOpacity
									key={insight._id || index}
									style={styles.insightSummaryCard}
									onPress={() => {
										console.log(
											'🎯 AICoach: Insight summary pressed:',
											insight
										);
										handleInsightPress(insight);
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
												name={getInsightIcon(insight.insightType)}
												size={18}
												color={currentFrequencyInfo.color}
											/>
										</View>
										<View style={styles.insightSummaryContent}>
											<Text
												style={styles.insightSummaryTitle}
												numberOfLines={1}
											>
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
						{displayInsights.length > 3 && (
							<TouchableOpacity
								style={styles.viewMoreButton}
								onPress={() => {
									// Navigate to main insights page
									router.push('/(tabs)/insights');
								}}
							>
								<Text style={styles.viewMoreButtonText}>
									View All {displayInsights.length} {currentFrequencyInfo.label}{' '}
									Insights
								</Text>
								<Ionicons
									name="chevron-forward"
									size={16}
									color={currentFrequencyInfo.color}
								/>
							</TouchableOpacity>
						)}
					</View>
				)}

				{/* Welcome Section - Only show if no insights exist */}
				{(!displayInsights || displayInsights.length === 0) && (
					<View style={styles.welcomeSection}>
						<LinearGradient
							colors={[stageContent.color, stageContent.color + '80']}
							style={styles.welcomeCard}
						>
							<View style={styles.welcomeHeader}>
								<Ionicons name="sparkles" size={32} color="#fff" />
								<Text style={styles.welcomeTitle}>
									{`Welcome to ${stageContent.title}! 🎉`}
								</Text>
							</View>
							<Text style={styles.welcomeText}>
								{`You now have access to ${currentFrequencyInfo.label} insights and advanced features. Generate your first insights to get started!`}
							</Text>
						</LinearGradient>
					</View>
				)}

				{/* Stage Progress Header - Moved to bottom */}
				<View style={styles.stageHeader}>
					<LinearGradient
						colors={[stageContent.color, stageContent.color + '80']}
						style={styles.stageHeaderCard}
					>
						<View style={styles.stageHeaderContent}>
							<Ionicons
								name={stageContent.icon as any}
								size={28}
								color="#fff"
							/>
							<View style={styles.stageHeaderText}>
								<Text style={styles.stageHeaderTitle}>
									{stageContent.title}
								</Text>
								<Text style={styles.stageHeaderSubtitle}>
									{stageContent.subtitle}
								</Text>
								{/* XP and Progress Display */}
								<View style={styles.progressInfo}>
									<Text style={styles.xpText}>XP: {xp}</Text>
									<Text style={styles.actionsText}>
										Actions: {completedActions}
									</Text>
								</View>
							</View>
							{/* Progression System Button */}
							<TouchableOpacity
								style={styles.progressionButton}
								onPress={() => setShowProgressionSystem(true)}
							>
								<Ionicons name="trophy" size={20} color="#fff" />
							</TouchableOpacity>
						</View>
					</LinearGradient>
				</View>

				{/* Action Buttons */}
				<View style={styles.actionsSection}>
					<TouchableOpacity
						style={[
							styles.actionButton,
							{ backgroundColor: stageContent.color },
							localGenerating && styles.actionButtonDisabled,
						]}
						onPress={handleGenerateInsights}
						disabled={localGenerating}
					>
						{localGenerating ? (
							<ActivityIndicator size="small" color="#fff" />
						) : (
							<Ionicons name="refresh" size={20} color="#fff" />
						)}
						<Text style={styles.actionButtonText}>
							{localGenerating
								? 'Generating...'
								: displayInsights && displayInsights.length > 0
								? `Refresh ${currentFrequencyInfo.label} Insights`
								: `Generate ${currentFrequencyInfo.label} Insights`}
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[
							styles.actionButton,
							styles.secondaryButton,
							{ borderColor: stageContent.color },
						]}
						onPress={() => router.push('/(tabs)/insights')}
					>
						<Ionicons name="list" size={20} color={stageContent.color} />
						<Text
							style={[
								styles.secondaryButtonText,
								{ color: stageContent.color },
							]}
						>
							View All Insights
						</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>

			{/* Progression System Modal */}
			<ProgressionSystem
				visible={showProgressionSystem}
				onClose={() => setShowProgressionSystem(false)}
			/>
		</>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	content: {
		padding: 16,
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
	stageHeader: {
		marginBottom: 16,
	},
	stageHeaderCard: {
		borderRadius: 16,
		padding: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},
	stageHeaderContent: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	stageHeaderText: {
		marginLeft: 12,
		flex: 1,
	},
	stageHeaderTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#fff',
		marginBottom: 4,
	},
	stageHeaderSubtitle: {
		fontSize: 14,
		color: '#fff',
		opacity: 0.9,
		marginBottom: 8,
	},
	progressInfo: {
		flexDirection: 'row',
		gap: 16,
	},
	xpText: {
		fontSize: 12,
		color: '#fff',
		fontWeight: '600',
	},
	actionsText: {
		fontSize: 12,
		color: '#fff',
		fontWeight: '600',
	},
	progressionButton: {
		padding: 8,
		borderRadius: 8,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
	},
	welcomeSection: {
		marginBottom: 20,
	},
	welcomeCard: {
		borderRadius: 16,
		padding: 24,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},
	welcomeHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	welcomeTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#fff',
		marginLeft: 12,
	},
	welcomeText: {
		fontSize: 16,
		color: '#fff',
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
});

export default AICoach;
