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
	palette,
	space,
} from '../../../../src/ui';
import { createLogger } from '../../../../src/utils/sublogger';

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
		hasLoaded,
	} = useBudget();

	const params = useLocalSearchParams();

	const router = useRouter();

	const [activeTab, setActiveTab] = useState<'monthly' | 'weekly' | 'all'>(
		'all'
	);

	const [refreshing, setRefreshing] = useState(false);

	const showModal = useCallback(() => {
		router.push('/wallet/budgets/new');
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
			const { ApiService } = await import('../../../../src/services');

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

		const periodStart = startOfWeek(now);
		const periodEnd = endOfMonth(now);
		const total = combined.total || 0;
		const spent = combined.spent || 0;
		const remaining = Math.max(0, total - spent);
		return {
			label: fmtRange(periodStart, periodEnd),
			title: fmtMonthYear(periodEnd),
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
					<View style={styles.budgetSummaryCardWrapper}>
						<BudgetSummaryCard
							periodLabel={heroProps.periodLabel}
							periodTitle={heroProps.periodTitle}
							periodRangeLabel={heroProps.periodRangeLabel}
							totalBudgets={heroProps.totalBudgets}
							totalPlanned={heroProps.totalPlanned}
							totalSpent={heroProps.totalSpent}
							onAddBudget={showModal}
						/>
					</View>
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
	// background of the top area – stays light grey now
	heroShell: {
		backgroundColor: palette.surfaceAlt,
		paddingTop: space.lg,
		paddingBottom: space.lg,
		paddingHorizontal: space.lg,
	},

	// actual white card behind the budget summary
	budgetSummaryCardWrapper: {
		backgroundColor: palette.surface,
		borderRadius: 24,
		padding: space.lg,
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: 10 },
		elevation: 4,
	},
	budgetsSection: {
		marginTop: space.lg,
		paddingHorizontal: space.lg,
		paddingTop: space.sm,
	},
});
