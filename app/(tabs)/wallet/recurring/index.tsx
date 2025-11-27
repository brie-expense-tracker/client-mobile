// app/(tabs)/wallet/recurring.tsx

import React, { useState, useMemo, useCallback } from 'react';
import { ScrollView, Alert, RefreshControl, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';

import RecurringExpensesFeed from '../components/recurring/RecurringExpensesFeed';
import RecurringSummaryCard from '../components/recurring/RecurringSummaryCard';
import { useRecurringExpense } from '../../../../src/context/recurringExpenseContext';
import { RecurringExpenseService } from '../../../../src/services';
import {
	Page,
	Section,
	LoadingState,
	EmptyState,
	SegmentedControl,
	Card,
	palette,
	radius,
	space,
} from '../../../../src/ui';
import { isDevMode } from '../../../../src/config/environment';
import { createLogger } from '../../../../src/utils/sublogger';

const recurringExpensesScreenLog = createLogger('RecurringExpensesScreen');

type ViewFilter = 'all' | 'monthly' | 'weekly';

const RecurringExpensesScreen: React.FC = () => {
	const [refreshing, setRefreshing] = useState(false);
	const [activeView, setActiveView] = useState<ViewFilter>('all');

	const { expenses, refetch, deleteRecurringExpense, isLoading, hasLoaded } =
		useRecurringExpense();

	// load on focus
	useFocusEffect(
		useCallback(() => {
			if (!hasLoaded) {
				refetch().catch((err) => {
					if (isDevMode) {
						recurringExpensesScreenLog.error('Failed to load', err);
					}
					Alert.alert('Error', 'Unable to load recurring expenses.');
				});
			} else {
				const timer = setTimeout(() => {
					refetch();
				}, 300);
				return () => clearTimeout(timer);
			}
		}, [refetch, hasLoaded])
	);

	const onRefresh = async () => {
		setRefreshing(true);
		try {
			const { ApiService } = await import('../../../../src/services');
			ApiService.clearCacheByPrefix('/api/recurring-expenses');
			await refetch();
		} catch (err) {
			if (isDevMode) {
				recurringExpensesScreenLog.error('Refresh failed', err);
			}
		} finally {
			setRefreshing(false);
		}
	};

	// Simple aggregates to feed into the hero
	const summary = useMemo(() => {
		let totalMonthly = 0;
		let overdueAmount = 0;
		let dueSoonAmount = 0;

		let paidCount = 0;
		let upcomingCount = 0;
		let overdueCount = 0;

		const now = new Date();

		for (const exp of expenses) {
			// Calculate monthly equivalent
			const getMonthlyEquivalent = (amount: number, frequency: string) => {
				switch (frequency) {
					case 'weekly':
						return (amount * 52) / 12;
					case 'monthly':
						return amount;
					case 'quarterly':
						return amount / 3;
					case 'yearly':
						return amount / 12;
					default:
						return amount;
				}
			};

			totalMonthly += getMonthlyEquivalent(exp.amount || 0, exp.frequency);

			const nextDate = exp.nextExpectedDate
				? new Date(exp.nextExpectedDate)
				: null;

			if (!nextDate) continue;

			const daysUntilDue = RecurringExpenseService.getDaysUntilNext(
				exp.nextExpectedDate
			);

			if (daysUntilDue <= 0) {
				overdueCount += 1;
				overdueAmount += getMonthlyEquivalent(exp.amount || 0, exp.frequency);
			} else if (nextDate >= now) {
				upcomingCount += 1;

				// treat "due soon" as <= 7 days away
				if (daysUntilDue <= 7) {
					dueSoonAmount += getMonthlyEquivalent(exp.amount || 0, exp.frequency);
				}
			}
		}

		// Note: We don't have payment status in the current context,
		// so we'll use a simplified approach
		paidCount = 0; // Would need to check payment status separately

		return {
			totalMonthly,
			overdueAmount,
			dueSoonAmount,
			paidCount,
			upcomingCount,
			overdueCount,
		};
	}, [expenses]);

	const filteredExpenses = useMemo(() => {
		if (activeView === 'all') return expenses;
		return expenses.filter((exp) => exp.frequency === activeView);
	}, [expenses, activeView]);

	const handleAddExpense = () => {
		router.push('/wallet/recurring/new');
	};

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

	const handleExpenseRowPress = (expense: any) => {
		router.push({
			pathname: '/(tabs)/wallet/recurring/[patternId]',
			params: { patternId: expense.patternId },
		});
	};

	const handleEditExpense = (expense: any) => {
		router.push({
			pathname: './edit',
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

	return (
		<Page>
			<ScrollView
				style={styles.scroll}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
				}
				contentContainerStyle={{ paddingBottom: space.xl }}
			>
				<Section style={styles.heroSection}>
					<Card style={styles.heroCard}>
						<RecurringSummaryCard
							summary={summary}
							onAddPress={handleAddExpense}
						/>
					</Card>
				</Section>

				<Section
					title="Your expenses"
					style={styles.expensesSection}
					right={
						<SegmentedControl
							segments={[
								{ key: 'all', label: 'All' },
								{ key: 'monthly', label: 'Monthly' },
								{ key: 'weekly', label: 'Weekly' },
							]}
							value={activeView}
							onChange={(key) => setActiveView(key as ViewFilter)}
						/>
					}
				>
					{isLoading ? (
						<LoadingState label="Loading recurring expenses…" />
					) : filteredExpenses.length === 0 ? (
						<EmptyState
							title="No recurring expenses yet"
							subtitle="Add your subscriptions and bills so you never miss a payment."
							ctaLabel="Add expense"
							onPress={handleAddExpense}
						/>
					) : (
						<RecurringExpensesFeed
							expenses={filteredExpenses}
							onPressMenu={handleExpenseMenuPress}
							onPressRow={handleExpenseRowPress}
							scrollEnabled={false}
						/>
					)}
				</Section>
			</ScrollView>
		</Page>
	);
};

const styles = StyleSheet.create({
	scroll: {
		flex: 1,
		backgroundColor: palette.surfaceAlt,
	},
	heroSection: {
		marginTop: space.md,
	},
	heroCard: {
		paddingHorizontal: space.lg,
		paddingVertical: space.lg,

		backgroundColor: palette.surface,
		borderRadius: radius.xl,

		// subtle outline, like Bills summary
		borderWidth: 1,
		borderColor: palette.borderMuted,

		// soft floating shadow
		shadowColor: '#000',
		shadowOpacity: 0.07,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: 8 },

		// Android
		elevation: 3,
	},
	expensesSection: {
		marginTop: space.lg,
	},
});

export default RecurringExpensesScreen;
