import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	Alert,
	RefreshControl,
} from 'react-native';
import CustomSlidingModal from './components/CustomSlidingModal';
import { RectButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import RecurringExpensesFeed from './components/RecurringExpensesFeed';
import RecurringSummaryCard from './components/RecurringSummaryCard';
import { useRecurringExpenses } from '../../../src/hooks/useRecurringExpenses';
import { RecurringExpenseService } from '../../../src/services';
import {
	accessibilityProps,
	dynamicTextStyle,
	generateAccessibilityLabel,
	voiceOverHints,
} from '../../../src/utils/accessibility';
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
	const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
	const [selectedExpense, setSelectedExpense] =
		useState<RecurringExpenseWithPaymentStatus | null>(null);
	const [activeView, setActiveView] = useState<'monthly' | 'weekly'>('monthly');

	// Use only the hook, not both context and hook
	const { expenses, refetch, markAsPaid, isLoading, hasLoaded, error } =
		useRecurringExpenses();

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

	const handleExpensePress = (expense: RecurringExpenseWithPaymentStatus) => {
		setSelectedExpense(expense);
		setIsOptionsModalVisible(true);
	};

	const handleExpenseMenuPress = (patternId: string) => {
		const expense = expenses.find((e) => e.patternId === patternId);
		if (expense) {
			// Convert to payment status interface
			const expenseWithStatus: RecurringExpenseWithPaymentStatus = {
				...expense,
				isPaid: false,
				nextDueDate: expense.nextExpectedDate,
			};
			setSelectedExpense(expenseWithStatus);
			setIsOptionsModalVisible(true);
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

	const hideOptionsModal = () => {
		setIsOptionsModalVisible(false);
		setSelectedExpense(null);
	};

	const handleViewPaymentHistory = () => {
		if (selectedExpense) {
			// Navigate to the recurring expense summary screen
			router.push({
				pathname: '/(stack)/recurringExpenseDetails',
				params: {
					patternId: selectedExpense.patternId,
					vendor: selectedExpense.vendor,
					amount: selectedExpense.amount.toString(),
					frequency: selectedExpense.frequency,
				},
			});
			hideOptionsModal();
		}
	};

	const handleEditExpense = () => {
		if (selectedExpense) {
			Alert.alert('Coming Soon', 'Edit functionality will be available soon!');
			hideOptionsModal();
		}
	};

	const handleMarkAsPaid = async () => {
		if (selectedExpense) {
			try {
				// Calculate period dates based on frequency
				const now = new Date();
				let periodStart, periodEnd;

				switch (selectedExpense.frequency) {
					case 'monthly':
						periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
						periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
						break;
					case 'weekly':
						const dayOfWeek = now.getDay();
						const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
						periodStart = new Date(now);
						periodStart.setDate(now.getDate() - daysFromMonday);
						periodStart.setHours(0, 0, 0, 0);
						periodEnd = new Date(periodStart);
						periodEnd.setDate(periodStart.getDate() + 6);
						periodEnd.setHours(23, 59, 59, 999);
						break;
					case 'quarterly':
						const quarter = Math.floor(now.getMonth() / 3);
						periodStart = new Date(now.getFullYear(), quarter * 3, 1);
						periodEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
						break;
					case 'yearly':
						periodStart = new Date(now.getFullYear(), 0, 1);
						periodEnd = new Date(now.getFullYear(), 11, 31);
						break;
					default:
						periodStart = new Date(now);
						periodEnd = new Date(now);
				}

				await markAsPaid(
					selectedExpense.patternId,
					periodStart.toISOString(),
					periodEnd.toISOString()
				);

				Alert.alert(
					'Success',
					`${selectedExpense.vendor} has been marked as paid for this period.`,
					[{ text: 'OK' }]
				);
				hideOptionsModal();
			} catch (error) {
				console.error('Error marking as paid:', error);
				Alert.alert('Error', 'Failed to mark as paid. Please try again.', [
					{ text: 'OK' },
				]);
			}
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
						{ key: 'monthly', label: 'Monthly' },
						{ key: 'weekly', label: 'Weekly' },
					]}
					value={activeView}
					onChange={(k) => setActiveView(k as any)}
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
						onExpensePress={handleExpensePress}
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
						/>
					</Card>
				</Section>
			</ScrollView>

			{/* Options Modal */}
			<CustomSlidingModal
				isVisible={isOptionsModalVisible}
				onClose={hideOptionsModal}
				title={selectedExpense?.vendor || 'Expense Options'}
				icon="ellipsis-horizontal"
			>
				<View
					style={styles.optionsModalContent}
					accessibilityLabel="Expense options menu"
				>
					<RectButton
						style={styles.optionButton}
						onPress={handleViewPaymentHistory}
						{...accessibilityProps.button}
						accessibilityLabel={generateAccessibilityLabel.button(
							'View',
							'payment history'
						)}
						accessibilityHint={voiceOverHints.navigate}
					>
						<View style={styles.optionContent}>
							<Ionicons
								name="time-outline"
								size={20}
								color="#00a2ff"
								accessibilityRole="image"
								accessibilityLabel="Payment history icon"
							/>
							<Text
								style={[styles.optionText, dynamicTextStyle]}
								accessibilityRole="text"
							>
								View Payment History
							</Text>
						</View>
					</RectButton>

					<RectButton
						style={styles.optionButton}
						onPress={handleEditExpense}
						{...accessibilityProps.button}
						accessibilityLabel={generateAccessibilityLabel.button(
							'Edit',
							'expense'
						)}
						accessibilityHint={voiceOverHints.edit}
					>
						<View style={styles.optionContent}>
							<Ionicons
								name="create-outline"
								size={20}
								color="#00a2ff"
								accessibilityRole="image"
								accessibilityLabel="Edit icon"
							/>
							<Text
								style={[styles.optionText, dynamicTextStyle]}
								accessibilityRole="text"
							>
								Edit Expense
							</Text>
						</View>
					</RectButton>

					<RectButton
						style={styles.optionButton}
						onPress={handleMarkAsPaid}
						{...accessibilityProps.button}
						accessibilityLabel={generateAccessibilityLabel.button(
							'Mark as paid',
							'expense'
						)}
						accessibilityHint={voiceOverHints.save}
					>
						<View style={styles.optionContent}>
							<Ionicons
								name="checkmark-circle-outline"
								size={20}
								color="#00a2ff"
								accessibilityRole="image"
								accessibilityLabel="Mark as paid icon"
							/>
							<Text
								style={[styles.optionText, dynamicTextStyle]}
								accessibilityRole="text"
							>
								Mark as Paid
							</Text>
						</View>
					</RectButton>

					<RectButton
						style={styles.optionButton}
						onPress={hideOptionsModal}
						{...accessibilityProps.button}
						accessibilityLabel={generateAccessibilityLabel.button(
							'Cancel',
							'options'
						)}
						accessibilityHint={voiceOverHints.cancel}
					>
						<View style={styles.optionContent}>
							<Ionicons
								name="close-outline"
								size={20}
								color="#757575"
								accessibilityRole="image"
								accessibilityLabel="Cancel icon"
							/>
							<Text
								style={[styles.optionText, dynamicTextStyle]}
								accessibilityRole="text"
							>
								Cancel
							</Text>
						</View>
					</RectButton>
				</View>
			</CustomSlidingModal>
		</Page>
	);
};

// Modal styles - keeping only what's needed for the options modal
const styles = StyleSheet.create({
	optionsModalContent: {
		backgroundColor: 'white',
		borderRadius: 16,
		maxWidth: 400,
		alignItems: 'center',
		paddingHorizontal: 0,
	},

	optionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f8f9fa',
		paddingVertical: 16,
		paddingHorizontal: 20,
		borderRadius: 12,
		marginBottom: 12,
		width: '100%',
		justifyContent: 'center',
	},

	optionContent: {
		flexDirection: 'row',
		alignItems: 'center',
	},

	optionText: {
		fontSize: 16,
		fontWeight: '500',
		color: '#212121',
		marginLeft: 12,
	},
});

export default RecurringExpensesScreen;
