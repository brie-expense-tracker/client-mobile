// app/(tabs)/wallet/bills.tsx

import React, { useState, useMemo, useCallback, useContext } from 'react';
import {
	ScrollView,
	View,
	Alert,
	RefreshControl,
	StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';

import BillsFeed from '../components/bills/BillsFeed';
import BillsSummaryCard from '../components/bills/BillsSummaryCard';
import { useBills } from '../../../../src/context/billContext';
import { TransactionContext } from '../../../../src/context/transactionContext';
import { BillService } from '../../../../src/services';
import {
	Page,
	Section,
	LoadingState,
	EmptyState,
	SegmentedControl,
	palette,
	space,
} from '../../../../src/ui';
import { isDevMode } from '../../../../src/config/environment';
import { createLogger } from '../../../../src/utils/sublogger';

const billsScreenLog = createLogger('BillsScreen');

type ViewFilter = 'all' | 'monthly' | 'weekly';

const BillsScreen: React.FC = () => {
	const [refreshing, setRefreshing] = useState(false);
	const [activeView, setActiveView] = useState<ViewFilter>('all');

	const { expenses, refetch, deleteBill, isLoading, hasLoaded } = useBills();
	const { refetch: refetchTransactions } = useContext(TransactionContext);

	// load on focus
	useFocusEffect(
		useCallback(() => {
			if (!hasLoaded) {
				refetch().catch((err) => {
					if (isDevMode) {
						billsScreenLog.error('Failed to load', err);
					}
					Alert.alert('Error', 'Unable to load bills.');
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
			ApiService.clearCacheByPrefix('/api/bills');
			await refetch();
		} catch (err) {
			if (isDevMode) {
				billsScreenLog.error('Refresh failed', err);
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

			const monthlyEq = getMonthlyEquivalent(exp.amount || 0, exp.frequency);

			totalMonthly += monthlyEq;

			const nextDate = exp.nextExpectedDate
				? new Date(exp.nextExpectedDate)
				: null;
			if (!nextDate) continue;

			const daysUntilDue = BillService.getDaysUntilNext(exp.nextExpectedDate);

			if (daysUntilDue <= 0) {
				overdueCount += 1;
				overdueAmount += monthlyEq;
			} else if (nextDate >= now) {
				upcomingCount += 1;

				// treat "due soon" as <= 7 days away
				if (daysUntilDue <= 7) {
					dueSoonAmount += monthlyEq;
				}
			}
		}

		// We don't yet track "paid" separately
		paidCount = 0;

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
		router.push('/wallet/bills/new');
	};

	const handleExpenseMenuPress = (patternId: string) => {
		const expense = expenses.find((e) => e.patternId === patternId);
		if (expense) {
			Alert.alert(
				'Bill Options',
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
			pathname: '/(tabs)/wallet/bills/[patternId]',
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
			await deleteBill(patternId);
		} catch (error) {
			if (isDevMode) {
				billsScreenLog.error('Error deleting expense', error);
			}
			const errorMsg =
				error instanceof Error ? error.message : 'Failed to delete bill';
			Alert.alert('Delete Failed', errorMsg);
		}
	};

	const handleBillPaid = async () => {
		await Promise.all([refetch(), refetchTransactions()]);
	};

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
			>
				{/* Top-sheet hero like Budgets / Debts / Goals */}
				<View style={styles.heroShell}>
					<View style={styles.billsSummaryCardWrapper}>
						<BillsSummaryCard summary={summary} onAddPress={handleAddExpense} />
					</View>
				</View>

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
						<LoadingState label="Loading bills…" />
					) : filteredExpenses.length === 0 ? (
						<EmptyState
							title="No bills yet"
							subtitle="Add your subscriptions and bills so you never miss a payment."
							ctaLabel="Add bill"
							onPress={handleAddExpense}
						/>
					) : (
						<BillsFeed
							expenses={filteredExpenses}
							onPressMenu={handleExpenseMenuPress}
							onPressRow={handleExpenseRowPress}
							scrollEnabled={false}
							onPaid={handleBillPaid}
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
		backgroundColor: palette.surfaceAlt, // light grey
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

	// actual white card behind the bills summary
	billsSummaryCardWrapper: {
		backgroundColor: palette.surface,
		borderRadius: 24,
		padding: space.lg,
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: 10 },
		elevation: 4,
	},

	expensesSection: {
		marginTop: space.lg,
		paddingHorizontal: space.lg,
		paddingTop: space.sm,
	},
});

export default BillsScreen;
