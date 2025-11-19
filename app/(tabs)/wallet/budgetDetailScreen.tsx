import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ScrollView, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useBudget, Budget } from '../../../src/context/budgetContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import HeroBudget from './components/HeroBudget';
import BudgetsFeed from './components/BudgetsFeed';
import {
	Page,
	Card,
	Section,
	LoadingState,
	EmptyState,
	SegmentedControl,
} from '../../../src/ui';
import { createLogger } from '../../../src/utils/sublogger';

const budgetsScreenLog = createLogger('BudgetsScreen');

const startOfMonth = (d = new Date()) =>
	new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d = new Date()) =>
	new Date(d.getFullYear(), d.getMonth() + 1, 0);

// Sunday-start week (adjust if your app uses Monday)
const startOfWeek = (d = new Date()) => {
	const day = d.getDay(); // 0 Sun..6 Sat
	const s = new Date(d);
	s.setDate(d.getDate() - day);
	s.setHours(0, 0, 0, 0);
	return s;
};
const endOfWeek = (d = new Date()) => {
	const e = startOfWeek(d);
	e.setDate(e.getDate() + 6);
	e.setHours(23, 59, 59, 999);
	return e;
};

const daysBetween = (a: Date, b: Date) =>
	Math.max(1, Math.ceil((b.getTime() - a.getTime()) / 86_400_000)); // avoid /0

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
	} = useBudget();

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
		router.push('/(stack)/budgets/new');
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

	// Refresh when screen comes into focus
	// This ensures the list updates after returning from creating a budget
	useFocusEffect(
		useCallback(() => {
			if (!hasLoaded) {
				budgetsScreenLog.debug('Screen focused, no data loaded yet - fetching');
				refetch();
			} else {
				budgetsScreenLog.debug(
					'Screen focused, refreshing to ensure latest data'
				);
				// Add a small delay to avoid race conditions with optimistic updates
				// This ensures any in-flight budget creation completes before we refetch
				const timer = setTimeout(() => {
					refetch();
				}, 300);
				return () => clearTimeout(timer);
			}
		}, [refetch, hasLoaded])
	);

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
		budgetsScreenLog.debug('Pull-to-refresh triggered');
		setRefreshing(true);
		try {
			// Clear cache before refetching to ensure fresh data
			const { ApiService } = await import('../../../src/services');
			ApiService.clearCacheByPrefix('/api/budgets');
			budgetsScreenLog.debug('Cache cleared, fetching fresh data');
			await refetch();
			budgetsScreenLog.debug('Refresh complete');
		} catch (error) {
			budgetsScreenLog.error('Error refreshing', error);
			Alert.alert('Error', 'Failed to refresh budgets. Please try again.');
		} finally {
			// Always reset refreshing state, even on error
			setRefreshing(false);
		}
	}, [refetch]);

	// ==========================================
	// Generate Budget Insights
	// ==========================================

	// ========= ADDED: computed period stats for the "professional" summary =========
	const now = useMemo(() => new Date(), []);

	const combined = useMemo(() => {
		const total = monthlySummary.totalAllocated + weeklySummary.totalAllocated;
		const spent = monthlySummary.totalSpent + weeklySummary.totalSpent;
		return { total, spent };
	}, [monthlySummary, weeklySummary]);

	// ==========================================
	// Modal Handlers
	// ==========================================
	const showEditModal = (budget: Budget) => {
		router.push(`/(stack)/budgets/edit?id=${budget.id}`);
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

	// Simplified period stats - just for the professional summary
	const periodStats = useMemo(() => {
		const fmt = (d: Date) =>
			d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

		if (activeTab === 'monthly') {
			const periodStart = startOfMonth(now);
			const periodEnd = endOfMonth(now);
			const total = monthlySummary.totalAllocated || 0;
			const spent = monthlySummary.totalSpent || 0;
			const remaining = Math.max(0, total - spent);
			const totalDays = daysBetween(periodStart, periodEnd);
			const elapsedDays = Math.min(totalDays, daysBetween(periodStart, now));
			const daysLeft = Math.max(0, totalDays - elapsedDays);

			return {
				label: `This Month • ${fmt(periodStart)}–${fmt(periodEnd)}`,
				total,
				spent,
				remaining,
				daysLeft,
			};
		}

		if (activeTab === 'weekly') {
			const periodStart = startOfWeek(now);
			const periodEnd = endOfWeek(now);
			const total = weeklySummary.totalAllocated || 0;
			const spent = weeklySummary.totalSpent || 0;
			const remaining = Math.max(0, total - spent);
			const totalDays = daysBetween(periodStart, periodEnd);
			const elapsedDays = Math.min(totalDays, daysBetween(periodStart, now));
			const daysLeft = Math.max(0, totalDays - elapsedDays);

			return {
				label: `This Week • ${fmt(periodStart)}–${fmt(periodEnd)}`,
				total,
				spent,
				remaining,
				daysLeft,
			};
		}

		// 'all' view
		const periodStart = startOfWeek(now);
		const periodEnd = endOfMonth(now);
		const total = combined.total || 0;
		const spent = combined.spent || 0;
		const remaining = Math.max(0, total - spent);

		return {
			label: `Overview • ${periodStart.toLocaleDateString()}–${periodEnd.toLocaleDateString()}`,
			total,
			spent,
			remaining,
			daysLeft: null as number | null,
		};
	}, [activeTab, now, monthlySummary, weeklySummary, combined]);

	// ==========================================
	// Hero Budget Props
	// ==========================================
	const heroProps = useMemo(() => {
		if (activeTab === 'monthly') {
			return {
				mode: 'monthly' as const,
				percent: monthlyPercentage,
				spent: monthlySummary.totalSpent,
				total: monthlySummary.totalAllocated,
				subtitle: periodStats.label,
				daysLeft: periodStats.daysLeft,
			};
		}
		if (activeTab === 'weekly') {
			return {
				mode: 'weekly' as const,
				percent: weeklyPercentage,
				spent: weeklySummary.totalSpent,
				total: weeklySummary.totalAllocated,
				subtitle: periodStats.label,
				daysLeft: periodStats.daysLeft,
			};
		}
		// 'all' view
		const percent =
			((monthlySummary.totalSpent + weeklySummary.totalSpent) /
				(monthlySummary.totalAllocated + weeklySummary.totalAllocated || 1)) *
			100;
		return {
			mode: 'all' as const,
			percent: Math.min(percent, 100),
			spent: combined.spent,
			total: combined.total,
			subtitle: periodStats.label,
			daysLeft: null,
			projected: null,
		};
	}, [
		activeTab,
		monthlyPercentage,
		weeklyPercentage,
		monthlySummary,
		weeklySummary,
		combined,
		periodStats,
	]);

	// ==========================================
	// Main Render
	// ==========================================
	// Show loading state while fetching data
	if (isLoading && !hasLoaded) {
		return <LoadingState label="Loading budgets..." />;
	}

	// Show empty state if no budgets and data has loaded
	if (budgets.length === 0 && hasLoaded) {
		return (
			<EmptyState
				icon="wallet-outline"
				title="No Budgets Yet"
				subtitle="Create your first budget to start tracking your spending."
				ctaLabel="Add Budget"
				onPress={showModal}
			/>
		);
	}

	return (
		<Page
			title="Budgets"
			subtitle={`${budgets.length} ${
				budgets.length === 1 ? 'budget' : 'budgets'
			} • ${activeTab} view`}
			right={
				<SegmentedControl
					segments={[
						{ key: 'all', label: 'All' },
						{ key: 'monthly', label: 'Monthly' },
						{ key: 'weekly', label: 'Weekly' },
					]}
					value={activeTab}
					onChange={(k) => setActiveTab(k as any)}
				/>
			}
		>
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
				{/* Hero */}
				<Card>
					<HeroBudget
						mode={heroProps.mode}
						percent={heroProps.percent}
						spent={heroProps.spent}
						total={heroProps.total}
						subtitle={heroProps.subtitle}
						daysLeft={heroProps.daysLeft}
						onAddBudget={showModal}
						variant="compact"
					/>
				</Card>

				{/* List */}
				<Section title="Your Budgets">
					<Card>
						<BudgetsFeed
							scrollEnabled={false}
							budgets={filteredBudgets}
							activeTab={activeTab}
							onPressMenu={(id: string) => {
								const b = budgets.find((bb) => bb.id === id);
								if (!b) return;
								Alert.alert(
									'Budget Options',
									`What would you like to do with "${b.name}"?`,
									[
										{ text: 'Edit', onPress: () => showEditModal(b) },
										{ text: 'Cancel', style: 'cancel' },
									]
								);
							}}
						/>
					</Card>
				</Section>
			</ScrollView>
		</Page>
	);
}

