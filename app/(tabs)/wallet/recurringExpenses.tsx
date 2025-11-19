import React, { useState, useMemo, useCallback } from 'react';
import { ScrollView, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';

import RecurringExpensesFeed from './components/RecurringExpensesFeed';
import RecurringSummaryCard from './components/RecurringSummaryCard';
import { useRecurringExpense } from '../../../src/context/recurringExpenseContext';
import { RecurringExpenseService } from '../../../src/services';
import {
	Page,
	Card,
	Section,
	LoadingState,
	EmptyState,
	SegmentedControl,
} from '../../../src/ui';
import { isDevMode } from '../../../src/config/environment';
import { createLogger } from '../../../src/utils/sublogger';

const recurringExpensesScreenLog = createLogger('RecurringExpensesScreen');

// ==========================================
// Types
// ==========================================

// Extended interface for expenses with payment status
interface RecurringExpenseWithPaymentStatus {
	patternId: string;
	vendor: string;
	amount: number;
	frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
	nextExpectedDate: string;
	confidence?: number;
	transactions?: any[];
	isPaid: boolean;
	paymentDate?: string;
	nextDueDate: string;
}

// ==========================================
// Constants
// ==========================================

const RecurringExpensesScreen: React.FC = () => {
	const [refreshing, setRefreshing] = useState(false);
	const [activeView, setActiveView] = useState<'all' | 'monthly' | 'weekly'>(
		'all'
	);

	// Use the context
	const { expenses, refetch, deleteRecurringExpense, isLoading, hasLoaded } =
		useRecurringExpense();

	// ==========================================
	// Focus Effect - Refresh on Screen Focus
	// ==========================================
	useFocusEffect(
		useCallback(() => {
			if (!hasLoaded) {
				if (isDevMode) {
					recurringExpensesScreenLog.debug(
						'🔄 [RecurringExpenses] Screen focused, no data loaded yet - fetching...'
					);
				}
				refetch();
			} else {
				if (isDevMode) {
					recurringExpensesScreenLog.debug(
						'🔄 [RecurringExpenses] Screen focused, refreshing to ensure latest data'
					);
				}
				// Add a small delay to avoid race conditions with optimistic updates
				// This ensures any in-flight expense creation completes before we refetch
				const timer = setTimeout(() => {
					refetch();
				}, 300);
				return () => clearTimeout(timer);
			}
		}, [refetch, hasLoaded])
	);

	// ==========================================
	// Memoized Calculations
	// ==========================================

	const overdueExpenses = useMemo(() => {
		return expenses.filter((expense) => {
			// Safety check: ensure expense has required fields
			if (!expense || !expense.nextExpectedDate) {
				if (isDevMode) {
					recurringExpensesScreenLog.warn(
						'⚠️ [RecurringExpenses] Skipping invalid expense in overdueExpenses:',
						expense
					);
				}
				return false;
			}
			const daysUntilDue = RecurringExpenseService.getDaysUntilNext(
				expense.nextExpectedDate
			);
			return daysUntilDue <= 0;
		});
	}, [expenses]);

	const dueThisWeekExpenses = useMemo(() => {
		return expenses.filter((expense) => {
			// Safety check: ensure expense has required fields
			if (!expense || !expense.nextExpectedDate) {
				if (isDevMode) {
					recurringExpensesScreenLog.warn(
						'⚠️ [RecurringExpenses] Skipping invalid expense in dueThisWeekExpenses:',
						expense
					);
				}
				return false;
			}
			const daysUntilDue = RecurringExpenseService.getDaysUntilNext(
				expense.nextExpectedDate
			);
			return daysUntilDue > 0 && daysUntilDue <= 7;
		});
	}, [expenses]);

	const overdueAmount = useMemo(() => {
		return overdueExpenses.reduce((sum, expense) => sum + expense.amount, 0);
	}, [overdueExpenses]);

	const dueThisWeekAmount = useMemo(() => {
		return dueThisWeekExpenses.reduce(
			(sum, expense) => sum + expense.amount,
			0
		);
	}, [dueThisWeekExpenses]);

	const overdueCount = useMemo(() => overdueExpenses.length, [overdueExpenses]);
	const dueThisWeekCount = useMemo(
		() => dueThisWeekExpenses.length,
		[dueThisWeekExpenses]
	);

	const onRefresh = useCallback(async () => {
		if (isDevMode) {
			recurringExpensesScreenLog.debug('Pull-to-refresh triggered');
		}
		setRefreshing(true);
		try {
			// Clear cache before refetching to ensure fresh data
			const { ApiService } = await import('../../../src/services');
			ApiService.clearCacheByPrefix('/api/recurring-expenses');
			if (isDevMode) {
				recurringExpensesScreenLog.debug('Cache cleared, fetching fresh data');
			}
			await refetch();
			if (isDevMode) {
				recurringExpensesScreenLog.debug('Refresh complete');
			}
		} catch (error) {
			if (isDevMode) {
				recurringExpensesScreenLog.error('Error refreshing', error);
			}
			Alert.alert(
				'Error',
				'Failed to refresh recurring expenses. Please try again.'
			);
		} finally {
			// Always reset refreshing state, even on error
			setRefreshing(false);
		}
	}, [refetch]);

	const handleExpenseMenuPress = (patternId: string) => {
		const expense = expenses.find((e) => e.patternId === patternId);
		if (expense) {
			Alert.alert(
				'Recurring Expense Options',
				`What would you like to do with "${expense.vendor}"?`,
				[
					{ text: 'Edit', onPress: () => handleEditExpense(expense) },
					{
						text: 'Delete',
						style: 'destructive',
						onPress: () => handleDeleteExpense(expense.patternId),
					},
					{ text: 'Cancel', style: 'cancel' },
				]
			);
		}
	};

	const handleExpenseRowPress = (
		expense: RecurringExpenseWithPaymentStatus
	) => {
		router.push({
			pathname: '/(stack)/recurring/[patternId]',
			params: { patternId: expense.patternId },
		});
	};

	const handleEditExpense = (expense: any) => {
		router.push({
			pathname: '/(stack)/recurring/edit',
			params: { id: expense.patternId },
		});
	};

	const handleDeleteExpense = async (patternId: string) => {
		try {
			await deleteRecurringExpense(patternId);
		} catch (error) {
			if (isDevMode) {
				recurringExpensesScreenLog.error('Error deleting expense', error);
			}
			const errorMsg =
				error instanceof Error
					? error.message
					: 'Failed to delete recurring expense';
			Alert.alert('Delete Failed', errorMsg);
		}
	};

	const handleAddRecurringExpense = () => {
		router.push('/(stack)/recurring/new');
	};

	// ==========================================
	// Main Render
	// ==========================================
	// Show loading state while fetching data
	if (isLoading && !hasLoaded) {
		return <LoadingState label="Loading recurring expenses..." />;
	}

	// Show empty state if no expenses and data has loaded
	if (expenses.length === 0 && hasLoaded) {
		return (
			<EmptyState
				icon="repeat-outline"
				title="No Recurring Expenses"
				subtitle="Add your first recurring expense to track regular payments."
				ctaLabel="Add Expense"
				onPress={handleAddRecurringExpense}
			/>
		);
	}

	return (
		<Page
			title="Recurring"
			subtitle={`${overdueCount} overdue • ${dueThisWeekCount} due this week`}
			right={
				<SegmentedControl
					segments={[
						{ key: 'all', label: 'All' },
						{ key: 'monthly', label: 'Monthly' },
						{ key: 'weekly', label: 'Weekly' },
					]}
					value={activeView}
					onChange={(k) => setActiveView(k as 'all' | 'monthly' | 'weekly')}
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
						accessibilityLabel="Pull to refresh recurring expenses"
					/>
				}
				accessibilityLabel="Recurring expenses list"
			>
				<Card style={{ marginTop: 0 }}>
					<RecurringSummaryCard
						expenses={expenses}
						activeView={activeView}
						onViewToggle={() => {}}
						onAddExpense={handleAddRecurringExpense}
						overdueAmount={overdueAmount}
						dueThisWeekAmount={dueThisWeekAmount}
						overdueCount={overdueCount}
						dueThisWeekCount={dueThisWeekCount}
					/>
				</Card>

				<Section title="Your Expenses">
					<Card>
						<RecurringExpensesFeed
							expenses={expenses}
							onPressMenu={handleExpenseMenuPress}
							onPressRow={handleExpenseRowPress}
							scrollEnabled={false}
							activeTab={activeView}
						/>
					</Card>
				</Section>
			</ScrollView>
		</Page>
	);
};

export default RecurringExpensesScreen;
