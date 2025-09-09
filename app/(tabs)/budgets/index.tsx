import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	Alert,
	TouchableOpacity,
	RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RectButton } from 'react-native-gesture-handler';
import { useBudgets } from '../../../src/hooks/useBudgets';
import { Budget } from '../../../src/context/budgetContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MonthlyBudgetSummary from './components/MonthlyBudgetSummary';
import WeeklyBudgetSummary from './components/WeeklyBudgetSummary';
import AllBudgetSummary from './components/AllBudgetSummary';
import BudgetsFeed from './components/BudgetsFeed';
import { InsightChipsRow } from '../../../src/components/InsightChipsRow';
import { InsightCard } from '../../../src/components/InsightChip';
import {
	accessibilityProps,
	dynamicTextStyle,
	generateAccessibilityLabel,
} from '../../../src/utils/accessibility';

// ==========================================
// Main Component
// ==========================================
export default function BudgetScreen() {
	// ==========================================
	// Data Fetching
	// ==========================================
	const {
		budgets,
		isLoading,
		refetch,
		monthlySummary,
		weeklySummary,
		monthlyPercentage,
		weeklyPercentage,
		hasLoaded,
		error,
	} = useBudgets();

	// ==========================================
	// Route Parameters
	// ==========================================
	const params = useLocalSearchParams();
	const router = useRouter();

	// ==========================================
	// State Management
	// ==========================================
	const [activeTab, setActiveTab] = useState<'monthly' | 'weekly' | 'all'>(
		'all'
	);
	const [refreshing, setRefreshing] = useState(false);

	// ==========================================
	// Modal Handlers
	// ==========================================
	const showModal = useCallback(() => {
		router.push('/(stack)/addBudget');
	}, [router]);

	// ==========================================
	// Auto-open modal on navigation and refresh data
	// ==========================================
	useEffect(() => {
		// Only refresh if we haven't loaded data yet
		if (!hasLoaded) {
			refetch();
		}
	}, [refetch, hasLoaded]);

	// Handle modal opening from URL parameters
	useEffect(() => {
		// Check if we should auto-open the modal
		if (params.openModal === 'true') {
			// Small delay to ensure component is fully mounted
			const timer = setTimeout(() => {
				showModal();
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [params.openModal, showModal]);

	// Handle tab parameter from URL
	useEffect(() => {
		if (params.tab) {
			const tabParam = params.tab as string;
			if (
				tabParam === 'monthly' ||
				tabParam === 'weekly' ||
				tabParam === 'all'
			) {
				setActiveTab(tabParam);
			}
		}
	}, [params.tab]);

	// ==========================================
	// Pull to Refresh Handler
	// ==========================================
	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await refetch();
		} catch (error) {
			console.error('Error refreshing budgets:', error);
		} finally {
			setRefreshing(false);
		}
	}, [refetch]);

	// ==========================================
	// Skeleton Loading State Component
	// ==========================================
	const SkeletonLoadingState = () => (
		<View style={styles.mainContainer}>
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 24 }}
			>
				{/* Page Header Skeleton */}
				<View style={styles.pageHeader}>
					<View style={styles.pageHeaderContent}>
						<View style={[styles.skeletonText, { width: 150, height: 20 }]} />
						<View
							style={[
								styles.skeletonText,
								{ width: 200, height: 14, marginTop: 4 },
							]}
						/>
					</View>
					<View style={[styles.skeletonButton, { width: 100, height: 40 }]} />
				</View>

				{/* Summary Card Skeleton */}
				<View style={[styles.skeletonCard, { height: 180, marginTop: 12 }]} />

				{/* Insights Skeleton */}
				<View style={styles.skeletonInsights}>
					<View
						style={[
							styles.skeletonText,
							{ width: 120, height: 16, marginBottom: 12 },
						]}
					/>
					<View style={styles.skeletonChips}>
						<View style={[styles.skeletonChip, { width: 150 }]} />
						<View style={[styles.skeletonChip, { width: 180 }]} />
						<View style={[styles.skeletonChip, { width: 160 }]} />
					</View>
				</View>

				{/* Budget List Skeleton */}
				<View style={styles.skeletonList}>
					{[1, 2, 3].map((i) => (
						<View key={i} style={styles.skeletonBudgetItem}>
							<View style={styles.skeletonIcon} />
							<View style={styles.skeletonContent}>
								<View
									style={[styles.skeletonText, { width: 120, height: 16 }]}
								/>
								<View
									style={[
										styles.skeletonText,
										{ width: 80, height: 12, marginTop: 4 },
									]}
								/>
								<View style={[styles.skeletonProgress, { marginTop: 8 }]} />
								<View
									style={[
										styles.skeletonText,
										{ width: 100, height: 12, marginTop: 6 },
									]}
								/>
							</View>
						</View>
					))}
				</View>
			</ScrollView>
		</View>
	);

	// ==========================================
	// Error State Component
	// ==========================================
	const ErrorState = useCallback(
		() => (
			<View style={styles.errorContainer}>
				<View style={styles.errorContent}>
					<Ionicons name="warning-outline" size={64} color="#ff6b6b" />
					<Text style={styles.errorTitle}>Unable to Load Budgets</Text>
					<Text style={styles.errorSubtext}>
						{error?.message ||
							'There was a problem connecting to the server. Please check your connection and try again.'}
					</Text>
					<RectButton
						style={styles.errorButton}
						onPress={onRefresh}
						{...accessibilityProps.button}
						accessibilityLabel={generateAccessibilityLabel.button(
							'Retry',
							'loading budgets'
						)}
					>
						<Ionicons name="refresh" size={20} color="#fff" />
						<Text style={styles.errorButtonText}>Retry</Text>
					</RectButton>
				</View>
			</View>
		),
		[error, onRefresh]
	);

	// ==========================================
	// Empty State Component
	// ==========================================
	const EmptyState = useCallback(
		() => (
			<View style={styles.emptyContainer}>
				<View style={styles.emptyContent}>
					<Ionicons name="wallet-outline" size={64} color="#e0e0e0" />
					<Text style={styles.emptyTitle}>No Budgets Yet</Text>
					<Text style={styles.emptySubtext}>
						Create your first budget to start tracking your spending and take
						control of your finances
					</Text>
					<RectButton
						style={styles.emptyAddButton}
						onPress={showModal}
						{...accessibilityProps.button}
						accessibilityLabel={generateAccessibilityLabel.button(
							'Add',
							'first budget'
						)}
						accessibilityHint="Double tap to create your first budget"
					>
						<Ionicons name="add" size={20} color="#fff" />
						<Text style={styles.emptyAddButtonText}>Add Budget</Text>
					</RectButton>
				</View>
			</View>
		),
		[showModal]
	);

	// ==========================================
	// Period Toggle Handler
	// ==========================================
	const handlePeriodToggle = useCallback(() => {
		// Cycle through: all -> monthly -> weekly -> all
		if (activeTab === 'all') {
			setActiveTab('monthly');
		} else if (activeTab === 'monthly') {
			setActiveTab('weekly');
		} else {
			setActiveTab('all');
		}
	}, [activeTab]);

	// ==========================================
	// Budget Summary Components
	// ==========================================
	const AllBudgetsSummaryComponent = useCallback(
		() => (
			<AllBudgetSummary
				percentage={Math.min(
					((monthlySummary.totalSpent + weeklySummary.totalSpent) /
						(monthlySummary.totalAllocated + weeklySummary.totalAllocated)) *
						100,
					100
				)}
				spent={monthlySummary.totalSpent + weeklySummary.totalSpent}
				total={monthlySummary.totalAllocated + weeklySummary.totalAllocated}
				onPeriodToggle={handlePeriodToggle}
				isActive={activeTab === 'all'}
			/>
		),
		[monthlySummary, weeklySummary, handlePeriodToggle, activeTab]
	);

	const MonthlyBudgetSummaryComponent = useCallback(
		() => (
			<MonthlyBudgetSummary
				percentage={monthlyPercentage}
				spent={monthlySummary.totalSpent}
				total={monthlySummary.totalAllocated}
				onPeriodToggle={handlePeriodToggle}
				isActive={activeTab === 'monthly'}
			/>
		),
		[monthlyPercentage, monthlySummary, handlePeriodToggle, activeTab]
	);

	const WeeklyBudgetSummaryComponent = useCallback(
		() => (
			<WeeklyBudgetSummary
				percentage={weeklyPercentage}
				spent={weeklySummary.totalSpent}
				total={weeklySummary.totalAllocated}
				onPeriodToggle={handlePeriodToggle}
				isActive={activeTab === 'weekly'}
			/>
		),
		[weeklyPercentage, weeklySummary, handlePeriodToggle, activeTab]
	);

	// ==========================================
	// Modal Handlers
	// ==========================================
	const showEditModal = (budget: Budget) => {
		router.push(`/(stack)/editBudget?id=${budget.id}`);
	};

	// Filter budgets based on active tab
	const filteredBudgets = useMemo(() => {
		if (activeTab === 'all') {
			return budgets;
		} else if (activeTab === 'monthly') {
			return budgets.filter((budget) => budget.period === 'monthly');
		} else {
			return budgets.filter((budget) => budget.period === 'weekly');
		}
	}, [budgets, activeTab]);

	// ==========================================
	// Generate Budget Insights
	// ==========================================
	const generateBudgetInsights = useCallback(
		(budgets: Budget[]): InsightCard[] => {
			const insights: InsightCard[] = [];

			// 1) Overspend risk insights
			budgets.forEach((budget) => {
				const ratio = budget.amount ? (budget.spent || 0) / budget.amount : 0;
				if (ratio >= 0.8 && (budget.amount || 0) > (budget.spent || 0)) {
					insights.push({
						id: `overspend_${budget.id}`,
						severity: 'warn',
						headline: `${budget.name} at ${(ratio * 100).toFixed(0)}%`,
						detail: `You're close to your limit. Consider adjusting spending.`,
						cta: {
							label: 'Adjust Budget',
							action: 'OPEN_BUDGET',
							payload: { category: budget.name },
						},
						evidence: { factIds: [budget.id] },
					});
				}
			});

			// 2) Critical overspend insights
			budgets.forEach((budget) => {
				const ratio = budget.amount ? (budget.spent || 0) / budget.amount : 0;
				if (ratio >= 1.0) {
					insights.push({
						id: `critical_${budget.id}`,
						severity: 'critical',
						headline: `${budget.name} over budget`,
						detail: `You've exceeded your budget by $${(
							(budget.spent || 0) - budget.amount
						).toFixed(2)}.`,
						cta: {
							label: 'Review Budget',
							action: 'OPEN_BUDGET',
							payload: { category: budget.name },
						},
						evidence: { factIds: [budget.id] },
					});
				}
			});

			// 3) Good progress insights
			budgets.forEach((budget) => {
				const ratio = budget.amount ? (budget.spent || 0) / budget.amount : 0;
				if (ratio <= 0.5 && (budget.spent || 0) > 0) {
					insights.push({
						id: `progress_${budget.id}`,
						severity: 'info',
						headline: `${budget.name} on track`,
						detail: `Great job staying within budget!`,
						evidence: { factIds: [budget.id] },
					});
				}
			});

			// 4) Budget creation suggestion
			if (budgets.length < 3) {
				insights.push({
					id: 'create_more_budgets',
					severity: 'info',
					headline: 'Create more budgets',
					detail:
						'Add budgets for dining, entertainment, and other categories.',
					cta: {
						label: 'Add Budget',
						action: 'OPEN_BUDGET',
					},
					evidence: { factIds: [] },
				});
			}

			// 5) Weekly vs Monthly budget balance insight
			if (budgets.length > 0) {
				const weeklyBudgets = budgets.filter((b) => b.period === 'weekly');
				const monthlyBudgets = budgets.filter((b) => b.period === 'monthly');

				if (weeklyBudgets.length > 0 && monthlyBudgets.length === 0) {
					insights.push({
						id: 'add_monthly_budgets',
						severity: 'info',
						headline: 'Consider monthly budgets',
						detail: 'Add monthly budgets for better long-term planning.',
						cta: {
							label: 'Add Monthly Budget',
							action: 'OPEN_BUDGET',
						},
						evidence: { factIds: [] },
					});
				}
			}

			return insights.slice(0, 3); // Limit to 3 insights
		},
		[]
	);

	// ==========================================
	// Main Render
	// ==========================================
	// Show skeleton loading state while fetching data
	if (isLoading && !hasLoaded) {
		return <SkeletonLoadingState />;
	}

	// Show error state if there's an error
	if (error && hasLoaded) {
		return <ErrorState />;
	}

	// Show empty state if no budgets and data has loaded
	if (budgets.length === 0 && hasLoaded) {
		return <EmptyState />;
	}

	return (
		<View style={styles.mainContainer}>
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 24 }}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor="#00a2ff"
						colors={['#00a2ff']}
					/>
				}
				accessibilityLabel="Budgets overview content"
			>
				{/* Page Header with Add Button */}
				<View style={styles.pageHeader}>
					<View style={styles.pageHeaderContent}>
						<Text
							style={[styles.pageHeaderTitle, dynamicTextStyle]}
							accessibilityRole="header"
							accessibilityLabel="Budgets overview"
						>
							Budgets Overview
						</Text>
						<Text
							style={[styles.pageHeaderSubtitle, dynamicTextStyle]}
							accessibilityRole="text"
							accessibilityLabel="Manage your spending across different categories"
						>
							{budgets.length > 0
								? `${budgets.length} budget${
										budgets.length === 1 ? '' : 's'
								  } • ${activeTab} view`
								: 'Manage your spending across different categories'}
						</Text>
					</View>
					<TouchableOpacity
						style={styles.addButton}
						onPress={showModal}
						{...accessibilityProps.button}
						accessibilityLabel={generateAccessibilityLabel.button(
							'Add',
							'budget'
						)}
						accessibilityHint="Double tap to create a new budget"
					>
						<Ionicons name="add" size={20} color="#0f0f0f" />
						<Text style={styles.addButtonText}>Add Budget</Text>
					</TouchableOpacity>
				</View>

				{/* Header */}
				<View style={{ marginTop: 12 }}>
					{activeTab === 'all' ? (
						<AllBudgetsSummaryComponent />
					) : activeTab === 'monthly' ? (
						<MonthlyBudgetSummaryComponent />
					) : (
						<WeeklyBudgetSummaryComponent />
					)}
				</View>

				{/* AI Insight Chips */}
				{/* Educational Disclaimer */}
				<View style={styles.disclaimerContainer}>
					<Ionicons name="information-circle" size={16} color="#ef4444" />
					<Text style={styles.disclaimerText}>
						These are educational insights, not financial advice.
					</Text>
				</View>

				<InsightChipsRow
					insights={generateBudgetInsights(budgets)}
					title="Budget Insights"
					onInsightPress={(insight) => {
						console.log('Budget insight pressed:', insight);
					}}
					onCTAPress={(action, payload) => {
						console.log('Budget CTA pressed:', action, payload);
						// Handle insight actions
						if (action === 'OPEN_BUDGET') {
							if (payload?.category) {
								// Navigate to specific budget category
								const budget = budgets.find((b) => b.name === payload.category);
								if (budget) {
									router.push(`/(stack)/editBudget?id=${budget.id}` as any);
								}
							} else {
								router.push('/(stack)/addBudget' as any);
							}
						} else if (action === 'CREATE_RULE') {
							router.push('/(stack)/addRecurringExpense' as any);
						} else if (action === 'MARK_PAID') {
							console.log('Mark as paid:', payload);
						} else if (action === 'SHIFT_FUNDS') {
							console.log('Shift funds:', payload);
						}
					}}
					variant="compact"
					showTitle={true}
					maxInsights={3}
				/>
				<View
					style={{
						marginTop: 16,
						borderTopWidth: 1,
						borderTopColor: '#E0E0E0',
					}}
				>
					<BudgetsFeed
						scrollEnabled={false}
						budgets={filteredBudgets}
						onPressMenu={(id: string) => {
							const b = budgets.find((bb) => bb.id === id);
							if (b) {
								Alert.alert(
									'Budget Options',
									`What would you like to do with "${b.name}"?`,
									[
										{
											text: 'Edit',
											onPress: () => showEditModal(b),
										},
										{
											text: 'Cancel',
											style: 'cancel',
										},
									]
								);
							}
						}}
					/>
				</View>
			</ScrollView>
		</View>
	);
}

// ==========================================
// Styles
// ==========================================
const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		backgroundColor: '#fff',
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
	},
	emptyContent: {
		alignItems: 'center',
		maxWidth: 280,
	},
	emptyTitle: {
		fontSize: 24,
		fontWeight: '600',
		color: '#212121',
		marginTop: 16,
		marginBottom: 8,
		textAlign: 'center',
	},
	emptySubtext: {
		fontSize: 16,
		color: '#757575',
		textAlign: 'center',
		marginBottom: 32,
		lineHeight: 22,
	},
	emptyAddButton: {
		backgroundColor: '#00a2ff',
		borderRadius: 12,
		paddingVertical: 16,
		paddingHorizontal: 24,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	emptyAddButtonText: {
		fontSize: 16,
		color: '#fff',
		fontWeight: '600',
	},
	pageHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 24,
		paddingTop: 16,
	},
	pageHeaderContent: {
		flex: 1,
	},
	pageHeaderTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#212121',
	},
	pageHeaderSubtitle: {
		fontSize: 14,
		color: '#757575',
		marginTop: 4,
	},
	addButton: {
		backgroundColor: '#f7f7f7',
		borderRadius: 12,
		paddingVertical: 12,
		paddingHorizontal: 10,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		borderWidth: 1,
		borderColor: '#e5e5e5',
	},
	addButtonText: {
		color: '#0f0f0f',
		fontSize: 14,
		fontWeight: '600',
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
		color: '#757575',
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
		backgroundColor: '#fff',
	},
	errorContent: {
		alignItems: 'center',
		maxWidth: 280,
	},
	errorTitle: {
		fontSize: 24,
		fontWeight: '600',
		color: '#212121',
		marginTop: 16,
		marginBottom: 8,
		textAlign: 'center',
	},
	errorSubtext: {
		fontSize: 16,
		color: '#757575',
		textAlign: 'center',
		marginBottom: 32,
		lineHeight: 22,
	},
	errorButton: {
		backgroundColor: '#00a2ff',
		borderRadius: 12,
		paddingVertical: 16,
		paddingHorizontal: 24,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	errorButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},

	// Disclaimer styles
	disclaimerContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fef2f2',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#fecaca',
	},
	disclaimerText: {
		flex: 1,
		fontSize: 12,
		color: '#dc2626',
		marginLeft: 8,
		lineHeight: 16,
		fontWeight: '500',
	},

	// Skeleton loading styles
	skeletonText: {
		backgroundColor: '#f0f0f0',
		borderRadius: 4,
	},
	skeletonButton: {
		backgroundColor: '#f0f0f0',
		borderRadius: 12,
	},
	skeletonCard: {
		backgroundColor: '#f0f0f0',
		borderRadius: 16,
		marginHorizontal: 24,
	},
	skeletonInsights: {
		paddingHorizontal: 24,
		marginTop: 16,
	},
	skeletonChips: {
		flexDirection: 'row',
		gap: 12,
	},
	skeletonChip: {
		height: 60,
		backgroundColor: '#f0f0f0',
		borderRadius: 12,
	},
	skeletonList: {
		marginTop: 16,
		paddingHorizontal: 24,
	},
	skeletonBudgetItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	skeletonIcon: {
		width: 40,
		height: 40,
		backgroundColor: '#f0f0f0',
		borderRadius: 12,
		marginRight: 12,
	},
	skeletonContent: {
		flex: 1,
	},
	skeletonProgress: {
		height: 4,
		backgroundColor: '#f0f0f0',
		borderRadius: 2,
	},
});
