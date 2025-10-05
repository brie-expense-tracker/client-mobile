import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Text, ScrollView, Alert, RefreshControl, View } from 'react-native';
import { useBudgets } from '../../../src/hooks/useBudgets';
import { Budget } from '../../../src/context/budgetContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MonthlyBudgetSummary from './components/MonthlyBudgetSummary';
import WeeklyBudgetSummary from './components/WeeklyBudgetSummary';
import AllBudgetSummary from './components/AllBudgetSummary';
import BudgetsFeed from './components/BudgetsFeed';
import {
	Page,
	Card,
	Section,
	LoadingState,
	ErrorState,
	EmptyState,
	SegmentedControl,
	palette,
	type,
	space,
} from '../../../src/ui';

// ========= ADDED: small helpers =========
const currency = (n = 0) =>
	new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
		Math.max(0, n)
	);

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
	// Generate Budget Insights
	// ==========================================

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

	// ========= ADDED: computed period stats for the "professional" summary =========
	const now = useMemo(() => new Date(), []);

	const combined = useMemo(() => {
		const total = monthlySummary.totalAllocated + weeklySummary.totalAllocated;
		const spent = monthlySummary.totalSpent + weeklySummary.totalSpent;
		return { total, spent };
	}, [monthlySummary, weeklySummary]);

	// ==========================================
	// Budget Summary Components
	// ==========================================
	const AllBudgetsSummaryComponent = useCallback(
		() => (
			<AllBudgetSummary
				percentage={Math.min(
					((monthlySummary.totalSpent + weeklySummary.totalSpent) /
						(monthlySummary.totalAllocated + weeklySummary.totalAllocated ||
							1)) *
						100,
					100
				)}
				spent={combined.spent}
				total={combined.total}
				onPeriodToggle={handlePeriodToggle}
				isActive={activeTab === 'all'}
			/>
		),
		[monthlySummary, weeklySummary, combined, handlePeriodToggle, activeTab]
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
			const pacePerDay = elapsedDays > 0 ? spent / elapsedDays : 0;
			const projected = pacePerDay * totalDays;

			return {
				label: `This Month • ${fmt(periodStart)}–${fmt(periodEnd)}`,
				total,
				spent,
				remaining,
				daysLeft,
				projected,
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
			const pacePerDay = elapsedDays > 0 ? spent / elapsedDays : 0;
			const projected = pacePerDay * totalDays;

			return {
				label: `This Week • ${fmt(periodStart)}–${fmt(periodEnd)}`,
				total,
				spent,
				remaining,
				daysLeft,
				projected,
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
			projected: null as number | null,
		};
	}, [activeTab, now, monthlySummary, weeklySummary, combined]);

	// ========= ADDED: small stat cell =========
	const Stat = ({
		label,
		value,
		subtle,
	}: {
		label: string;
		value: string;
		subtle?: boolean;
	}) => (
		<View style={{ flex: 1, minWidth: 120, marginRight: 12, marginBottom: 12 }}>
			<Text style={[type.small, { color: palette.textMuted }]}>{label}</Text>
			<Text
				style={[
					type.body,
					{ fontWeight: '600', color: subtle ? palette.text : palette.text },
				]}
				accessibilityLabel={`${label} ${value}`}
			>
				{value}
			</Text>
		</View>
	);

	// ==========================================
	// Main Render
	// ==========================================
	// Show loading state while fetching data
	if (isLoading && !hasLoaded) {
		return <LoadingState label="Loading budgets..." />;
	}

	// Show error state if there's an error
	if (error && hasLoaded) {
		return <ErrorState onRetry={onRefresh} title="Unable to load budgets" />;
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
				{/* Summary */}
				<Card style={{ marginTop: 0 }}>
					{activeTab === 'all' ? (
						<AllBudgetsSummaryComponent />
					) : activeTab === 'monthly' ? (
						<MonthlyBudgetSummaryComponent />
					) : (
						<WeeklyBudgetSummaryComponent />
					)}

					{/* ========= ADDED: Professional Summary Details ========= */}
					<View
						style={{
							marginTop: space.md,
							borderTopWidth: 1,
							borderTopColor: palette.border,
							paddingTop: space.md,
						}}
						accessibilityLabel="Budget summary details"
					>
						<Text
							style={[
								type.small,
								{ color: palette.textMuted, marginBottom: 8 },
							]}
						>
							{periodStats.label}
						</Text>

						<View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
							<Stat
								label="Total Budget"
								value={currency(periodStats.total || 0)}
							/>
							<Stat label="Spent" value={currency(periodStats.spent || 0)} />
							<Stat
								label="Remaining"
								value={currency(periodStats.remaining || 0)}
							/>
							{periodStats.daysLeft !== null && (
								<Stat
									label="Days Left"
									value={`${periodStats.daysLeft} day${
										periodStats.daysLeft === 1 ? '' : 's'
									}`}
								/>
							)}
							{periodStats.projected !== null && (
								<Stat
									label="Projected EOM"
									value={currency(periodStats.projected || 0)}
								/>
							)}
						</View>

						{/* Gentle risk note if projection exceeds total */}
						{periodStats.projected !== null &&
							periodStats.total > 0 &&
							periodStats.projected! > periodStats.total && (
								<Text
									style={[type.small, { color: palette.danger, marginTop: 6 }]}
								>
									Heads-up: projected spend exceeds the plan by{' '}
									{currency(periodStats.projected! - periodStats.total)}.
								</Text>
							)}
					</View>
				</Card>

				{/* List */}
				<Section title="Your Budgets">
					<Card>
						<BudgetsFeed
							scrollEnabled={false}
							budgets={filteredBudgets}
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

// Styles are now handled by the design system components
