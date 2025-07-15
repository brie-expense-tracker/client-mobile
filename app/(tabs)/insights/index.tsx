// app/(tabs)/insights.tsx

import React, { useState, useCallback, useContext } from 'react';
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

export default function InsightsHubScreen() {
	const router = useRouter();
	const { transactions, isLoading: transactionsLoading } =
		useContext(TransactionContext);
	const { budgets } = useBudget();
	const { goals } = useGoal();

	const [selectedPeriod, setSelectedPeriod] = useState<Period>('month');
	const [showGraphs, setShowGraphs] = useState(false);
	const [useAICoach, setUseAICoach] = useState(true); // Toggle between AI Coach and traditional view

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
	} = useInsightsHub(selectedPeriod);

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

			// Show success message
			if (result.success) {
				Alert.alert(
					'Success',
					result.message || 'Action completed successfully!'
				);

				// Navigate based on action type
				if (action.type === 'detect_completion' && result.success) {
					if (action.detectionType === 'transaction_count') {
						router.push('/(tabs)/transaction');
					} else if (action.detectionType === 'budget_created') {
						router.push('/(tabs)/budgets');
					} else if (action.detectionType === 'goal_created') {
						router.push('/(tabs)/budgets/goals');
					} else if (action.detectionType === 'preferences_updated') {
						router.push('/(tabs)/settings/aiInsights');
					}
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

	if (loadingInsights || transactionsLoading) {
		return (
			<SafeAreaView style={styles.center}>
				<ActivityIndicator size="large" />
				<Text style={styles.loadingText}>Loading insights...</Text>
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
						</View>
					</View>
					<Text style={styles.headerSubtitle}>
						Personalized financial insights and smart actions
					</Text>
				</View>
			</LinearGradient>

			{/* Use AI Coach for a more integrated experience */}
			{useAICoach && !showGraphs ? (
				<AICoach
					insights={insights ?? []}
					onInsightPress={handleInsightPress}
					onRefresh={onRefresh}
					loading={loadingInsights}
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
								suggestions={insights ?? []}
								onApplySuggestion={handleApplySuggestion}
								onInsightPress={handleInsightPress}
								showSmartActions={true}
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
							{(!insights || insights.length === 0) && (
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
});
