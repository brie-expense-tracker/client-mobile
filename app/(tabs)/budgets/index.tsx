import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
	ScrollView,
	Alert,
	RefreshControl,
	TouchableOpacity,
	View,
	StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
	ErrorState,
	EmptyState,
	SegmentedControl,
} from '../../../src/ui';

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
	} = useBudget();

	// ==========================================
	// Route Parameters
	// ==========================================
	const params = useLocalSearchParams();
	const router = useRouter();

	// ==========================================
	// State Managementnpm run
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

	// Only refetch when screen comes into focus if we don't have data yet
	// Avoid clearing cache on every navigation to reduce API calls
	useFocusEffect(
		useCallback(() => {
			if (!hasLoaded) {
				console.log(
					'🔄 [Budgets] Screen focused, no data loaded yet - fetching...'
				);
				refetch();
			} else {
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
		setRefreshing(true);
		try {
			// Clear cache before refetching to ensure fresh data
			const { ApiService } = await import('../../../src/services');
			ApiService.clearCacheByPrefix('/api/budgets');
			await refetch();
		} catch (error) {
			console.error('❌ [Budgets] Error refreshing:', error);
			Alert.alert('Error', 'Failed to refresh budgets. Please try again.');
		} finally {
			// Always reset refreshing state, even on error
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
				projected: periodStats.projected,
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
				projected: periodStats.projected,
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
				<View style={styles.headerRight}>
					<SegmentedControl
						segments={[
							{ key: 'all', label: 'All' },
							{ key: 'monthly', label: 'Monthly' },
							{ key: 'weekly', label: 'Weekly' },
						]}
						value={activeTab}
						onChange={(k) => setActiveTab(k as any)}
					/>
					<TouchableOpacity
						onPress={showModal}
						style={styles.headerAddBtn}
						accessibilityRole="button"
						accessibilityLabel="Add budget"
						hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
					>
						<Ionicons name="add-circle-outline" size={24} color="#007ACC" />
					</TouchableOpacity>
				</View>
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
				<HeroBudget
					mode={heroProps.mode}
					percent={heroProps.percent}
					spent={heroProps.spent}
					total={heroProps.total}
					subtitle={heroProps.subtitle}
					daysLeft={heroProps.daysLeft}
					projected={heroProps.projected}
					onPress={handlePeriodToggle}
					variant="compact"
				/>

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

			{/* Floating action button */}
			<TouchableOpacity
				onPress={showModal}
				style={styles.fab}
				accessibilityRole="button"
				accessibilityLabel="Add budget"
				activeOpacity={0.9}
			>
				<Ionicons name="add" size={28} color="#fff" />
			</TouchableOpacity>
		</Page>
	);
}

const styles = StyleSheet.create({
	headerRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	headerAddBtn: {
		padding: 4,
		borderRadius: 999,
	},
	fab: {
		position: 'absolute',
		right: 20,
		bottom: 20,
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#007ACC',
		shadowColor: '#000',
		shadowOpacity: 0.18,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 6,
	},
});
