import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ScrollView, Alert, RefreshControl } from 'react-native';
import { router } from 'expo-router';

import RecurringExpensesFeed from './components/RecurringExpensesFeed';
import RecurringSummaryCard from './components/RecurringSummaryCard';
import { useRecurringExpenses } from '../../../src/hooks/useRecurringExpenses';
import { RecurringExpenseService } from '../../../src/services';
import {
	Page,
	Card,
	Section,
	LoadingState,
	ErrorState,
	EmptyState,
	SegmentedControl,
} from '../../../src/ui';

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

	// Use only the hook, not both context and hook
	const {
		expenses,
		refetch,
		deleteRecurringExpense,
		isLoading,
		hasLoaded,
		error,
	} = useRecurringExpenses();

	// ==========================================
	// Memoized Calculations
	// ==========================================

	const overdueExpenses = useMemo(() => {
		return expenses.filter((expense) => {
			const daysUntilDue = RecurringExpenseService.getDaysUntilNext(
				expense.nextExpectedDate
			);
			return daysUntilDue <= 0;
		});
	}, [expenses]);

	const dueThisWeekExpenses = useMemo(() => {
		return expenses.filter((expense) => {
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
		setRefreshing(true);
		try {
			await refetch();
		} catch (error) {
			console.error('Error refreshing recurring expenses:', error);
		} finally {
			setRefreshing(false);
		}
	}, [refetch]);

	// Refresh when component mounts
	useEffect(() => {
		onRefresh();
	}, [onRefresh]);

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
			pathname: '/(stack)/recurringExpenseDetails',
			params: {
				patternId: expense.patternId,
			},
		});
	};

	const handleEditExpense = (expense: any) => {
		router.push({
			pathname: '/(stack)/editRecurringExpense',
			params: { id: expense.patternId },
		});
	};

	const handleDeleteExpense = async (patternId: string) => {
		try {
			await deleteRecurringExpense(patternId);
		} catch (error) {
			console.error('Error deleting recurring expense:', error);
		}
	};

	const handleAddRecurringExpense = () => {
		router.push('/(stack)/addRecurringExpense');
	};

	// ==========================================
	// Main Render
	// ==========================================
	// Show loading state while fetching data
	if (isLoading && !hasLoaded) {
		return <LoadingState label="Loading recurring expenses..." />;
	}

	// Show error state if there's an error
	if (error && hasLoaded) {
		return (
			<ErrorState
				title="Unable to load recurring expenses"
				onRetry={onRefresh}
			/>
		);
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
