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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
import { useInsightsHub, Period } from '../../../src/hooks';

export default function InsightsHubScreen() {
	const router = useRouter();
	const { transactions, isLoading: transactionsLoading } =
		useContext(TransactionContext);
	const { budgets } = useBudget();
	const { goals } = useGoal();

	const [selectedPeriod, setSelectedPeriod] = useState<Period>('month');
	const [showGraphs, setShowGraphs] = useState(false);

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
	}, []);

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
	}, []);

	const handlePeriodChange = useCallback((period: Period) => {
		setSelectedPeriod(period);
	}, []);

	const handleGraphToggle = useCallback(() => {
		setShowGraphs(!showGraphs);
	}, [showGraphs]);

	const handleRefresh = useCallback(() => {
		onRefresh();
	}, [onRefresh]);

	if (loadingInsights || transactionsLoading) {
		return (
			<SafeAreaView style={styles.center}>
				<ActivityIndicator size="large" />
				<Text style={styles.loadingText}>Loading insights...</Text>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.header}>
				<Text style={styles.headerTitle}>AI Coach</Text>
				<View style={styles.headerActions}>
					{/* Refresh Button */}
					<TouchableOpacity
						style={styles.refreshButton}
						onPress={handleRefresh}
						disabled={refreshing}
					>
						<Ionicons
							name="refresh"
							size={20}
							color="#2E78B7"
							style={refreshing ? styles.rotating : undefined}
						/>
					</TouchableOpacity>

					{/* Graph Toggle */}
					<TouchableOpacity
						style={styles.graphToggle}
						onPress={handleGraphToggle}
					>
						<Ionicons
							name={showGraphs ? 'list' : 'analytics'}
							size={20}
							color="#2E78B7"
						/>
					</TouchableOpacity>
				</View>
			</View>

			<ScrollView
				contentContainerStyle={styles.container}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={handleRefresh}
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
							<BudgetOverviewGraph budgets={budgets} title="Budget Overview" />
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
					// AI Insights View
					<View>
						{/* 6. AI-Driven Suggestions */}
						<AISuggestionsList
							suggestions={insights || []}
							onApplySuggestion={handleApplySuggestion}
							onInsightPress={handleInsightPress}
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
								<Text style={styles.emptyText}>No insights available yet.</Text>
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
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: '#ffffff' },
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-end',
		paddingHorizontal: 16,
		paddingBottom: 8,
		backgroundColor: '#ffffff',
	},
	headerTitle: {
		fontSize: 28,
		fontWeight: '600',
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	refreshButton: {
		padding: 8,
		borderRadius: 8,
		backgroundColor: '#F0F8FF',
	},
	graphToggle: {
		padding: 8,
		borderRadius: 8,
		backgroundColor: '#F0F8FF',
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
		marginBottom: 20,
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
