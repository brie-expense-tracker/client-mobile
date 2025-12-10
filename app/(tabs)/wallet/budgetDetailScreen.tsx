// app/(tabs)/wallet/BudgetScreen.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ScrollView, Alert, RefreshControl, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useBudget } from '../../../src/context/budgetContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BudgetSummaryCard from './components/budgets/BudgetSummaryCard';
import BudgetsFeed from './components/budgets/BudgetsFeed';
import {
	Page,
	Card,
	Section,
	LoadingState,
	EmptyState,
	SegmentedControl,
} from '../../../src/ui';
import { createLogger } from '../../../src/utils/sublogger';
import { palette, space } from '../../../src/ui/theme';

const budgetsScreenLog = createLogger('BudgetsScreen');

const startOfMonth = (d = new Date()) =>
	new Date(d.getFullYear(), d.getMonth(), 1);

const endOfMonth = (d = new Date()) =>
	new Date(d.getFullYear(), d.getMonth() + 1, 0);

const startOfWeek = (d = new Date()) => {
	const day = d.getDay();
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
	Math.max(1, Math.ceil((b.getTime() - a.getTime()) / 86_400_000));

export default function BudgetScreen() {
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

	const params = useLocalSearchParams();

	const router = useRouter();

	const [activeTab, setActiveTab] = useState<'monthly' | 'weekly' | 'all'>(
		'all'
	);

	const [refreshing, setRefreshing] = useState(false);

	const showModal = useCallback(() => {
		router.push('./budgets/new');
	}, [router]);

	// initial load

	useEffect(() => {
		if (!hasLoaded) {
			refetch();
		}
	}, [refetch, hasLoaded]);

	// refresh on focus

	useFocusEffect(
		useCallback(() => {
			if (!hasLoaded) {
				budgetsScreenLog.debug('Screen focused, no data loaded yet - fetching');

				refetch();
			} else {
				budgetsScreenLog.debug(
					'Screen focused, refreshing to ensure latest data'
				);

				const timer = setTimeout(() => {
					refetch();
				}, 300);

				return () => clearTimeout(timer);
			}
		}, [refetch, hasLoaded])
	);

	// open "new budget" from URL params

	useEffect(() => {
		if (params.openModal === 'true') {
			const timer = setTimeout(() => {
				showModal();
			}, 100);

			return () => clearTimeout(timer);
		}
	}, [params.openModal, showModal]);

	// sync tab from URL

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

	const onRefresh = useCallback(async () => {
		budgetsScreenLog.debug('Pull-to-refresh triggered');

		setRefreshing(true);

		try {
			const { ApiService } = await import('../../../src/services');

			ApiService.clearCacheByPrefix('/api/budgets');

			await refetch();
		} catch (error) {
			budgetsScreenLog.error('Error refreshing', error);

			Alert.alert('Error', 'Failed to refresh budgets. Please try again.');
		} finally {
			setRefreshing(false);
		}
	}, [refetch]);

	const now = useMemo(() => new Date(), []);

	const combined = useMemo(() => {
		const total = monthlySummary.totalAllocated + weeklySummary.totalAllocated;

		const spent = monthlySummary.totalSpent + weeklySummary.totalSpent;

		return { total, spent };
	}, [monthlySummary, weeklySummary]);

	const filteredBudgets = useMemo(() => {
		if (activeTab === 'all') return budgets;

		if (activeTab === 'monthly')
			return budgets.filter((b) => b.period === 'monthly');

		return budgets.filter((b) => b.period === 'weekly');
	}, [budgets, activeTab]);

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
				label: `${fmt(periodStart)}–${fmt(periodEnd)}`,
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
				label: `${fmt(periodStart)}–${fmt(periodEnd)}`,
				total,
				spent,
				remaining,
				daysLeft,
			};
		}

		const periodStart = startOfWeek(now);
		const periodEnd = endOfMonth(now);
		const total = combined.total || 0;
		const spent = combined.spent || 0;
		const remaining = Math.max(0, total - spent);
		return {
			label: `${periodStart.toLocaleDateString()}–${periodEnd.toLocaleDateString()}`,
			total,
			spent,
			remaining,
			daysLeft: null as number | null,
		};
	}, [activeTab, now, monthlySummary, weeklySummary, combined]);

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

	// ==========================

	// Loading / empty states

	// ==========================

	if (isLoading && !hasLoaded) {
		return <LoadingState label="Loading budgets..." />;
	}

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

	const activeLabel =
		activeTab === 'all'
			? 'all view'
			: activeTab === 'monthly'
			? 'monthly view'
			: 'weekly view';

	return (
		<Page
			title="Budgets"
			subtitle={`${budgets.length} ${
				budgets.length === 1 ? 'budget' : 'budgets'
			} • ${activeLabel}`}
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
				contentContainerStyle={styles.scrollContent}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={palette.primary}
						colors={[palette.primary]}
					/>
				}
				accessibilityLabel="Budgets overview content"
			>
				{/* Hero */}

				<Card style={styles.heroCard}>
					<BudgetSummaryCard
						periodLabel={heroProps.subtitle}
						totalBudgets={filteredBudgets.length}
						totalPlanned={heroProps.total}
						totalSpent={heroProps.spent}
						onAddBudget={showModal}
					/>
				</Card>

				{/* List */}

				<Section title="Your Budgets">
					<Card>
						<BudgetsFeed
							scrollEnabled={false}
							budgets={filteredBudgets}
							activeTab={activeTab}
						/>
					</Card>
				</Section>
			</ScrollView>
		</Page>
	);
}

const styles = StyleSheet.create({
	scrollContent: {
		paddingTop: space.lg,
		paddingBottom: 24,
		gap: 16,
	},
	heroCard: {
		paddingVertical: 14,
		paddingHorizontal: 16,
	},
});
