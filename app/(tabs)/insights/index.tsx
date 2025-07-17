// app/(tabs)/insights.tsx

import React, {
	useState,
	useCallback,
	useContext,
	useEffect,
	useMemo,
} from 'react';
import {
	SafeAreaView,
	ScrollView,
	Text,
	Pressable,
	StyleSheet,
	ActivityIndicator,
	View,
	TouchableOpacity,
	RefreshControl,
	Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AIInsight } from '../../../src/services/insightsService';
import { TransactionContext } from '../../../src/context/transactionContext';
import { useBudget } from '../../../src/context/budgetContext';
import { useGoal } from '../../../src/context/goalContext';
import { useProfile } from '../../../src/context/profileContext';
import {
	BudgetOverviewGraph,
	GoalsProgressGraph,
	SpendingTrendsGraph,
	IncomeExpenseGraph,
	CategoryBreakdownChart,
	SummaryCards,
	AISuggestionsList,
	RecentTransactionsList,
	ExportReportButtons,
} from '../../../src/components';
import AICoach from '../../../src/components/AICoach';
import { useInsightsHub, Period } from '../../../src/hooks';
import { IntelligentAction } from '../../../src/services/intelligentActionService';
import {
	navigateToBudgetsWithModal,
	navigateToGoalsWithModal,
} from '../../../src/utils/navigationUtils';

export default function InsightsHubScreen() {
	const router = useRouter();
	const { transactions, isLoading: transactionsLoading } =
		useContext(TransactionContext);
	const { budgets } = useBudget();
	const { goals } = useGoal();
	const { profile } = useProfile();

	// Get user preferences
	const aiInsightsEnabled = profile?.preferences?.aiInsights?.enabled ?? true;
	const userFrequency = profile?.preferences?.aiInsights?.frequency ?? 'weekly';
	const insightTypes = useMemo(
		() =>
			profile?.preferences?.aiInsights?.insightTypes ?? {
				budgetingTips: true,
				expenseReduction: true,
				incomeSuggestions: true,
			},
		[profile?.preferences?.aiInsights?.insightTypes]
	);
	const defaultView =
		profile?.preferences?.aiInsights?.defaultView ?? 'aiCoach';
	const maxInsights = profile?.preferences?.aiInsights?.maxInsights ?? 3;
	const showHighPriorityOnly =
		profile?.preferences?.aiInsights?.showHighPriorityOnly ?? false;

	// Map user frequency to Period type
	const getDefaultPeriod = (): Period => {
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

	const [selectedPeriod, setSelectedPeriod] = useState<Period>(
		getDefaultPeriod()
	);
	const [showGraphs, setShowGraphs] = useState(false);
	const [useAICoach, setUseAICoach] = useState(defaultView === 'aiCoach'); // Toggle between AI Coach and traditional view
	const [completionAlertShown, setCompletionAlertShown] = useState(false); // Prevent duplicate alerts

	const {
		summary,
		reportData,
		insights,
		loadingInsights,
		generating,
		refreshing,
		onRefresh,
		generateNewInsights,
		markInsightAsRead,
		fetchInsights, // Add fetchInsights to destructuring
	} = useInsightsHub(selectedPeriod);

	// Update selected period when user frequency changes
	useEffect(() => {
		setSelectedPeriod(getDefaultPeriod());
	}, [userFrequency]);

	// Filter insights based on user preferences
	const filteredInsights = useCallback(() => {
		if (!insights || !aiInsightsEnabled) return [];

		let filtered = insights.filter((insight) => {
			// Filter by insight type if available
			if (insight.insightType) {
				switch (insight.insightType) {
					case 'budgeting':
						return insightTypes.budgetingTips;
					case 'savings':
						return insightTypes.expenseReduction;
					case 'income':
						return insightTypes.incomeSuggestions;
					case 'spending':
						return insightTypes.expenseReduction;
					case 'general':
						return true; // Show general insights
					default:
						return true; // Show if type is not recognized
				}
			}
			return true; // Show if no type specified
		});

		// Apply priority filter if enabled
		if (showHighPriorityOnly) {
			filtered = filtered.filter((insight) => insight.priority === 'high');
		}

		// Limit to max insights
		return filtered.slice(0, maxInsights);
	}, [
		insights,
		aiInsightsEnabled,
		insightTypes,
		showHighPriorityOnly,
		maxInsights,
	]);

	// Memoize callback functions to prevent unnecessary re-renders
	const handleInsightPress = useCallback(
		async (insight: AIInsight) => {
			try {
				// Mark as read if not already read
				if (!insight.isRead) {
					await markInsightAsRead(insight._id);
				}

				// Navigate to the period detail
				router.push(`/insights/${insight.period}`);
			} catch (error) {
				console.error('Error marking insight as read:', error);
				// Still navigate even if marking as read fails
				router.push(`/insights/${insight.period}`);
			}
		},
		[markInsightAsRead, router]
	);

	const handleCardPress = useCallback((cardType: string) => {
		console.log('Card pressed:', cardType);
		// Handle card press - could navigate to specific sections
	}, []);

	const handleApplySuggestion = useCallback((suggestion: any) => {
		console.log('Apply suggestion:', suggestion);
		// Handle applying suggestions
		Alert.alert(
			'Suggestion Applied',
			'Your suggestion has been applied successfully!'
		);
	}, []);

	const handleSmartActionExecuted = useCallback(
		(action: IntelligentAction, result: any) => {
			console.log('Smart action executed:', action, result);

			// Don't show individual success messages - only show the comprehensive alert when all actions are completed
			// Individual success messages are handled by the completion alert

			// Navigate based on action type
			if (action.type === 'detect_completion' && result.success) {
				if (action.detectionType === 'transaction_count') {
					router.push('/(tabs)/transaction');
				} else if (action.detectionType === 'budget_created') {
					navigateToBudgetsWithModal();
				} else if (action.detectionType === 'goal_created') {
					navigateToGoalsWithModal();
				} else if (action.detectionType === 'preferences_updated') {
					router.push('/(tabs)/settings/aiInsights');
				}
			}
		},
		[router]
	);

	const handleViewAllTransactions = useCallback(() => {
		router.push('/dashboard/ledger');
	}, [router]);

	const handleTransactionPress = useCallback((transaction: any) => {
		console.log('Transaction pressed:', transaction);
		// Could navigate to transaction detail
	}, []);

	const handleExport = useCallback((type: string) => {
		console.log('Export:', type);
		// Handle export success
		Alert.alert(
			'Export Successful',
			`Your ${type} report has been exported successfully!`
		);
	}, []);

	const handlePeriodChange = useCallback((period: Period) => {
		setSelectedPeriod(period);
	}, []);

	const handleGraphToggle = useCallback(() => {
		setShowGraphs(!showGraphs);
	}, [showGraphs]);

	const handleViewToggle = useCallback(() => {
		setUseAICoach(!useAICoach);
	}, [useAICoach]);

	// Handle when all smart actions are completed
	const handleAllActionsCompleted = useCallback(async () => {
		// Prevent duplicate alerts
		if (completionAlertShown) return;
		setCompletionAlertShown(true);

		try {
			// Refresh insights to get updated recommendations
			await fetchInsights();

			// Show single comprehensive success message
			Alert.alert(
				'All Actions Completed! 🎉',
				'Your actions have been completed successfully and your insights have been refreshed with new recommendations.',
				[{ text: 'OK' }]
			);
		} catch (error) {
			console.error(
				'Error refreshing insights after actions completed:',
				error
			);
			// Show fallback message if refresh fails
			Alert.alert(
				'Actions Completed! ✅',
				'Your actions have been completed successfully!',
				[{ text: 'OK' }]
			);
		} finally {
			// Reset the flag after a delay to allow for future completions
			setTimeout(() => {
				setCompletionAlertShown(false);
			}, 5000); // Reset after 5 seconds
		}
	}, [fetchInsights, completionAlertShown]);

	// Reset completion alert flag when insights change
	useEffect(() => {
		setCompletionAlertShown(false);
	}, [insights?.length]); // Reset when insights array changes

	if (loadingInsights || transactionsLoading) {
		return (
			<SafeAreaView style={styles.center}>
				<ActivityIndicator size="large" />
				<Text style={styles.loadingText}>Loading insights...</Text>
			</SafeAreaView>
		);
	}

	// Show disabled state if AI insights are turned off
	if (!aiInsightsEnabled) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<LinearGradient
					colors={['#2E78B7', '#e24a4a']}
					style={styles.headerGradient}
				>
					<View style={styles.header}>
						<View style={styles.headerContent}>
							<View style={styles.titleSection}>
								<Ionicons name="bulb" size={24} color="#fff" />
								<Text style={styles.headerTitle}>AI Coach</Text>
							</View>
							<View style={styles.headerActions}>
								<TouchableOpacity
									style={styles.settingsButton}
									onPress={() => router.push('/(tabs)/settings/aiInsights')}
								>
									<Ionicons name="settings-outline" size={20} color="#fff" />
								</TouchableOpacity>
							</View>
						</View>
						<Text style={styles.headerSubtitle}>
							AI insights are currently disabled
						</Text>
					</View>
				</LinearGradient>

				<View style={styles.disabledContainer}>
					<Ionicons name="bulb-outline" size={64} color="#CCC" />
					<Text style={styles.disabledTitle}>AI Insights Disabled</Text>
					<Text style={styles.disabledText}>
						Enable AI insights in your settings to get personalized financial
						recommendations and smart actions.
					</Text>

					<TouchableOpacity
						style={styles.enableButton}
						onPress={() => router.push('/(tabs)/settings/aiInsights')}
					>
						<Text style={styles.enableButtonText}>Enable AI Insights</Text>
					</TouchableOpacity>

					{/* Show graphs-only view as alternative */}
					<View style={styles.alternativeSection}>
						<Text style={styles.alternativeTitle}>View Financial Data</Text>
						<Text style={styles.alternativeText}>
							You can still view your financial graphs and summaries.
						</Text>
						<TouchableOpacity
							style={styles.graphsButton}
							onPress={() => setShowGraphs(true)}
						>
							<Text style={styles.graphsButtonText}>View Graphs</Text>
						</TouchableOpacity>
					</View>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<LinearGradient
				colors={['#2E78B7', '#e24a4a']}
				style={styles.headerGradient}
			>
				<View style={styles.header}>
					<View style={styles.headerContent}>
						<View style={styles.titleSection}>
							<Ionicons name="bulb" size={24} color="#fff" />
							<Text style={styles.headerTitle}>AI Coach</Text>
						</View>
						<View style={styles.headerActions}>
							{/* View Toggle */}
							<TouchableOpacity
								style={styles.viewToggle}
								onPress={handleViewToggle}
							>
								<Ionicons
									name={useAICoach ? 'list' : 'sparkles'}
									size={20}
									color="#fff"
								/>
							</TouchableOpacity>

							{/* Graph Toggle - Only show when not using AI Coach */}
							{!useAICoach && (
								<TouchableOpacity
									style={styles.graphToggle}
									onPress={handleGraphToggle}
								>
									<Ionicons
										name={showGraphs ? 'list' : 'analytics'}
										size={20}
										color="#fff"
									/>
								</TouchableOpacity>
							)}

							{/* AI Insights Settings */}
							<TouchableOpacity
								style={styles.settingsButton}
								onPress={() => router.push('/(tabs)/settings/aiInsights')}
							>
								<Ionicons name="settings-outline" size={20} color="#fff" />
							</TouchableOpacity>
						</View>
					</View>
					<Text style={styles.headerSubtitle}>
						Personalized financial insights and smart actions
					</Text>
					{/* Show current frequency setting */}
					<Text style={styles.frequencyText}>
						Updates:{' '}
						{userFrequency.charAt(0).toUpperCase() + userFrequency.slice(1)}
					</Text>
				</View>
			</LinearGradient>

			{/* Use AI Coach for a more integrated experience */}
			{useAICoach && !showGraphs ? (
				<AICoach
					insights={filteredInsights()}
					onInsightPress={handleInsightPress}
					onRefresh={onRefresh}
					loading={loadingInsights}
					onAllActionsCompleted={handleAllActionsCompleted} // Add new callback
				/>
			) : (
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollContainer}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							colors={['#2E78B7']}
							tintColor="#2E78B7"
						/>
					}
				>
					{/* Period Selector */}
					<View style={styles.periodSelector}>
						{[
							{ key: 'week', label: 'Week', icon: 'calendar-outline' },
							{ key: 'month', label: 'Month', icon: 'calendar' },
							{ key: 'quarter', label: 'Quarter', icon: 'calendar-clear' },
						].map((option) => (
							<TouchableOpacity
								key={option.key}
								style={[
									styles.periodOption,
									selectedPeriod === option.key && styles.periodOptionActive,
								]}
								onPress={() => handlePeriodChange(option.key as Period)}
							>
								<Ionicons
									name={option.icon as any}
									size={16}
									color={selectedPeriod === option.key ? '#FFFFFF' : '#666'}
								/>
								<Text
									style={[
										styles.periodOptionText,
										selectedPeriod === option.key &&
											styles.periodOptionTextActive,
									]}
								>
									{option.label}
								</Text>
							</TouchableOpacity>
						))}
					</View>

					{/* 1. Summary Cards */}
					<SummaryCards data={summary} onCardPress={handleCardPress} />

					{showGraphs ? (
						// Graph View
						<View>
							{/* 2. Trend Graphs */}
							{transactions.length > 0 && (
								<>
									<SpendingTrendsGraph
										transactions={transactions}
										title={`${
											selectedPeriod.charAt(0).toUpperCase() +
											selectedPeriod.slice(1)
										}ly Spending Trends`}
										period={selectedPeriod}
									/>

									<IncomeExpenseGraph
										transactions={transactions}
										title={`Income vs Expenses`}
										period={selectedPeriod}
										chartType="line"
									/>
								</>
							)}

							{/* 3. Category Breakdown */}
							{transactions.length > 0 && (
								<CategoryBreakdownChart
									transactions={transactions}
									budgets={budgets}
									title="Spending by Category"
									period={selectedPeriod}
								/>
							)}

							{/* 4. Budget Overview */}
							{budgets.length > 0 && (
								<BudgetOverviewGraph
									budgets={budgets}
									title="Budget Overview"
								/>
							)}

							{/* 5. Goal Progress */}
							{goals.length > 0 && (
								<GoalsProgressGraph goals={goals} title="Goals Progress" />
							)}

							{/* 8. Recent Transactions */}
							<RecentTransactionsList
								transactions={transactions}
								maxItems={10}
								onViewAll={handleViewAllTransactions}
								onTransactionPress={handleTransactionPress}
							/>

							{/* 9. Export & Share */}
							<ExportReportButtons
								reportData={reportData}
								onExport={handleExport}
							/>

							{/* Empty State for Graphs */}
							{transactions.length === 0 &&
								budgets.length === 0 &&
								goals.length === 0 && (
									<View style={styles.emptyState}>
										<Ionicons name="analytics-outline" size={64} color="#CCC" />
										<Text style={styles.emptyText}>No Financial Data</Text>
										<Text style={styles.emptySubtext}>
											Add some transactions, budgets, and goals to see your
											financial insights here.
										</Text>
									</View>
								)}
						</View>
					) : (
						// Traditional AI Insights View
						<View>
							{/* 6. AI-Driven Suggestions with Smart Actions */}
							<AISuggestionsList
								suggestions={filteredInsights()}
								onApplySuggestion={handleApplySuggestion}
								onInsightPress={handleInsightPress}
								showSmartActions={true}
								onAllActionsCompleted={handleAllActionsCompleted} // Add new callback
							/>

							{/* 8. Recent Transactions */}
							<RecentTransactionsList
								transactions={transactions}
								maxItems={5}
								onViewAll={handleViewAllTransactions}
								onTransactionPress={handleTransactionPress}
							/>

							{/* 9. Export & Share */}
							<ExportReportButtons
								reportData={reportData}
								onExport={handleExport}
							/>

							{/* Fallback for no insights */}
							{(!filteredInsights() || filteredInsights().length === 0) && (
								<View style={styles.emptyState}>
									<Text style={styles.emptyText}>
										No insights available yet.
									</Text>
									<Text style={styles.emptySubtext}>
										Add some transactions to generate insights.
									</Text>

									<Pressable
										style={[
											styles.generateButton,
											generating && styles.generateButtonDisabled,
										]}
										onPress={generateNewInsights}
										disabled={generating}
									>
										{generating ? (
											<ActivityIndicator size="small" color="#fff" />
										) : (
											<Text style={styles.generateButtonText}>
												Generate Insights
											</Text>
										)}
									</Pressable>

									{/* AI Insights Settings Link */}
									<TouchableOpacity
										style={styles.aiInsightsSettingsLink}
										onPress={() => router.push('/(tabs)/settings/aiInsights')}
									>
										<View style={styles.aiInsightsSettingsLinkContent}>
											<Ionicons
												name="settings-outline"
												size={16}
												color="#007ACC"
											/>
											<Text style={styles.aiInsightsSettingsLinkText}>
												Customize AI Insights Settings
											</Text>
										</View>
										<Ionicons
											name="chevron-forward"
											size={16}
											color="#007ACC"
										/>
									</TouchableOpacity>
								</View>
							)}
						</View>
					)}
				</ScrollView>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: '#2E78B7' },
	safeArea: { flex: 1, backgroundColor: '#2E78B7' },
	headerGradient: {
		borderBottomLeftRadius: 20,
		borderBottomRightRadius: 20,
		backgroundColor: '#2E78B7',
	},
	scrollView: {
		backgroundColor: '#fff',
	},
	scrollContainer: {
		paddingHorizontal: 16,
		paddingBottom: 24,
		backgroundColor: '#fff',
	},
	header: {
		paddingHorizontal: 20,
		paddingBottom: 20,
		borderBottomLeftRadius: 20,
		borderBottomRightRadius: 20,
	},
	headerContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	titleSection: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: '700',
		color: '#fff',
		marginLeft: 12,
	},
	headerSubtitle: {
		fontSize: 14,
		color: '#e0eaf0',
	},
	frequencyText: {
		fontSize: 12,
		color: '#e0eaf0',
		marginTop: 4,
		fontStyle: 'italic',
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		justifyContent: 'flex-end',
		marginTop: 8,
	},
	viewToggle: {
		padding: 8,
		borderRadius: 8,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
	},
	refreshButton: {
		padding: 8,
		borderRadius: 8,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
	},
	graphToggle: {
		padding: 8,
		borderRadius: 8,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
	},
	settingsButton: {
		padding: 8,
		borderRadius: 8,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
	},
	rotating: {
		transform: [{ rotate: '360deg' }],
	},
	container: {
		paddingHorizontal: 16,
		paddingBottom: 24,
	},
	periodSelector: {
		flexDirection: 'row',
		marginVertical: 10,
	},
	periodOption: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 8,
		paddingHorizontal: 12,
		marginHorizontal: 4,
		borderRadius: 8,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	periodOptionActive: {
		backgroundColor: '#2E78B7',
		borderColor: '#2E78B7',
	},
	periodOptionText: {
		marginLeft: 4,
		fontSize: 12,
		fontWeight: '600',
		color: '#666',
	},
	periodOptionTextActive: {
		color: '#FFFFFF',
	},
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	periodLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#666',
		textTransform: 'uppercase',
	},
	unreadDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#FF9500',
	},
	message: {
		fontSize: 16,
		fontWeight: '400',
		marginBottom: 12,
	},
	cta: {
		fontSize: 14,
		fontWeight: '500',
		color: '#2e78b7',
	},
	center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#666',
	},
	emptyState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 40,
	},
	emptyText: {
		fontSize: 18,
		fontWeight: '500',
		color: '#666',
		marginBottom: 8,
		marginTop: 16,
	},
	emptySubtext: {
		fontSize: 14,
		color: '#999',
		textAlign: 'center',
		marginBottom: 24,
		paddingHorizontal: 20,
	},
	generateButton: {
		backgroundColor: '#2e78b7',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
		marginBottom: 12,
	},
	generateButtonDisabled: {
		opacity: 0.6,
	},
	generateButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '500',
	},
	aiInsightsSettingsLink: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
		marginTop: 16,
		backgroundColor: '#f8f9fa',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e9ecef',
	},
	aiInsightsSettingsLinkContent: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	aiInsightsSettingsLinkText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#007ACC',
		marginLeft: 8,
	},
	// New styles for disabled state
	disabledContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
		backgroundColor: '#fff',
	},
	disabledTitle: {
		fontSize: 24,
		fontWeight: '600',
		color: '#333',
		marginTop: 24,
		marginBottom: 16,
		textAlign: 'center',
	},
	disabledText: {
		fontSize: 16,
		color: '#666',
		textAlign: 'center',
		lineHeight: 24,
		marginBottom: 32,
	},
	enableButton: {
		backgroundColor: '#2E78B7',
		paddingHorizontal: 32,
		paddingVertical: 16,
		borderRadius: 12,
		marginBottom: 32,
	},
	enableButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
		textAlign: 'center',
	},
	alternativeSection: {
		width: '100%',
		padding: 24,
		backgroundColor: '#f8f9fa',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e9ecef',
	},
	alternativeTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
		textAlign: 'center',
	},
	alternativeText: {
		fontSize: 14,
		color: '#666',
		textAlign: 'center',
		marginBottom: 16,
	},
	graphsButton: {
		backgroundColor: '#fff',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#2E78B7',
	},
	graphsButtonText: {
		color: '#2E78B7',
		fontSize: 14,
		fontWeight: '500',
		textAlign: 'center',
	},
});
