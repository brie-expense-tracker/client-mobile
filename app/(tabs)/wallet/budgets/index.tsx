import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
	ScrollView,
	Alert,
	RefreshControl,
	StyleSheet,
	View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useBudget } from '../../../../src/context/budgetContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BudgetSummaryCard from '../components/budgets/BudgetSummaryCard';
import BudgetsFeed from '../components/budgets/BudgetsFeed';
import {
	Page,
	Section,
	LoadingState,
	EmptyState,
	SegmentedControl,
	FAB,
	palette,
	space,
} from '../../../../src/ui';
import { createLogger } from '../../../../src/utils/sublogger';

const budgetsScreenLog = createLogger('BudgetsScreen');

// MVP: Hardcode period start days (monthStartDay = 1, weekStartDay = 1 = Monday)
const startOfMonth = (d = new Date()) =>
	new Date(d.getFullYear(), d.getMonth(), 1);

const endOfMonth = (d = new Date()) =>
	new Date(d.getFullYear(), d.getMonth() + 1, 0);

const startOfWeek = (d = new Date()) => {
	// MVP: Always start on Monday (day 1), not Sunday (day 0)
	const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
	const daysSinceMonday = day === 0 ? 6 : day - 1; // Sunday = 6 days back, Monday = 0 days back
	const s = new Date(d);
	s.setDate(d.getDate() - daysSinceMonday);
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
		hasLoaded,
	} = useBudget();

	const params = useLocalSearchParams();

	const router = useRouter();

	const [activeTab, setActiveTab] = useState<'monthly' | 'weekly' | 'all'>(
		'all'
	);

	const [refreshing, setRefreshing] = useState(false);
	const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

	const showModal = useCallback(() => {
		router.push('/wallet/budgets/new');
	}, [router]);

	// initial load

	useEffect(() => {
		if (!hasLoaded) {
			refetch().then(() => setLastFetchedAt(new Date()));
		}
	}, [refetch, hasLoaded]);

	// refresh on focus (MVP: only if stale or never loaded)

	useFocusEffect(
		useCallback(() => {
			if (!hasLoaded) {
				budgetsScreenLog.debug('Screen focused, no data loaded yet - fetching');
				refetch().then(() => setLastFetchedAt(new Date()));
			} else if (lastFetchedAt) {
				// Only refetch if data is stale (older than 60 seconds)
				const secondsSinceLastFetch =
					(Date.now() - lastFetchedAt.getTime()) / 1000;
				if (secondsSinceLastFetch > 60) {
					budgetsScreenLog.debug(
						'Screen focused, data is stale - refreshing'
					);
					refetch().then(() => setLastFetchedAt(new Date()));
				} else {
					budgetsScreenLog.debug(
						'Screen focused, data is fresh - skipping refetch'
					);
				}
			}
		}, [refetch, hasLoaded, lastFetchedAt])
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
			const { ApiService } = await import('../../../../src/services');

			ApiService.clearCacheByPrefix('/api/budgets');

			await refetch();
			setLastFetchedAt(new Date());
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
		const fmtShort = (d: Date) =>
			d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
		const fmtRange = (start: Date, end: Date) =>
			`${fmtShort(start)} – ${fmtShort(end)}`;
		const fmtMonthYear = (d: Date) =>
			d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

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
				label: fmtRange(periodStart, periodEnd),
				title: fmtMonthYear(periodStart),
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
				label: fmtRange(periodStart, periodEnd),
				title: 'This week',
				total,
				spent,
				remaining,
				daysLeft,
			};
		}

		// MVP: For "All" tab, use honest labels instead of misleading date range
		const total = combined.total || 0;
		const spent = combined.spent || 0;
		const remaining = Math.max(0, total - spent);
		return {
			label: 'Across all periods',
			title: 'All budgets',
			total,
			spent,
			remaining,
			daysLeft: null as number | null,
		};
	}, [activeTab, now, monthlySummary, weeklySummary, combined]);

	const heroProps = useMemo(() => {
		if (activeTab === 'monthly') {
			return {
				periodLabel: periodStats.label,
				periodTitle: periodStats.title,
				periodRangeLabel: periodStats.label,
				totalBudgets: budgets.filter((b) => b.period === 'monthly').length,
				totalPlanned: monthlySummary.totalAllocated,
				totalSpent: monthlySummary.totalSpent,
			};
		}

		if (activeTab === 'weekly') {
			return {
				periodLabel: periodStats.label,
				periodTitle: periodStats.title,
				periodRangeLabel: periodStats.label,
				totalBudgets: budgets.filter((b) => b.period === 'weekly').length,
				totalPlanned: weeklySummary.totalAllocated,
				totalSpent: weeklySummary.totalSpent,
			};
		}

		return {
			periodLabel: periodStats.label,
			periodTitle: periodStats.title,
			periodRangeLabel: periodStats.label,
			totalBudgets: budgets.length,
			totalPlanned: combined.total,
			totalSpent: combined.spent,
		};
	}, [
		activeTab,
		budgets,
		monthlySummary,
		weeklySummary,
		combined,
		periodStats,
	]);

	if (isLoading && !hasLoaded) {
		return <LoadingState label="Loading budgets..." />;
	}

	return (
		<Page>
			<ScrollView
				showsVerticalScrollIndicator={false}
				style={styles.scroll}
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
				{/* Top sheet hero */}
				<View style={styles.heroShell}>
					<BudgetSummaryCard
						periodLabel={heroProps.periodLabel}
						periodTitle={heroProps.periodTitle}
						periodRangeLabel={heroProps.periodRangeLabel}
						totalBudgets={heroProps.totalBudgets}
						totalPlanned={heroProps.totalPlanned}
						totalSpent={heroProps.totalSpent}
					/>
				</View>

				{/* List – unchanged */}
				<Section
					title="Your budgets"
					style={styles.budgetsSection}
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
					{isLoading ? (
						<LoadingState label="Loading budgets…" />
					) : filteredBudgets.length === 0 ? (
						<EmptyState
							icon="wallet-outline"
							title="No Budgets Yet"
							subtitle="Create your first budget to start tracking your spending."
							ctaLabel="Add Budget"
							onPress={showModal}
						/>
					) : (
						<BudgetsFeed
							scrollEnabled={false}
							budgets={filteredBudgets}
							activeTab={activeTab}
						/>
					)}
				</Section>
			</ScrollView>
			{filteredBudgets.length > 0 && <FAB onPress={showModal} />}
		</Page>
	);
}

const styles = StyleSheet.create({
	scroll: {
		flex: 1,
		backgroundColor: palette.surfaceAlt, // light grey background
	},
	scrollContent: {
		paddingBottom: space.xl,
	},
	// spacing only – BudgetSummaryCard handles its own card styling
	heroShell: {
		paddingTop: space.lg,
		paddingBottom: space.md,
		paddingHorizontal: space.lg,
	},
	budgetsSection: {
		marginTop: space.lg,
		paddingTop: space.sm,
	},
});
