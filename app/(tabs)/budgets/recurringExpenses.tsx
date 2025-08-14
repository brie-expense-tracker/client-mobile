import React, { useState, useEffect, useMemo } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	Alert,
	RefreshControl,
	TouchableOpacity,
} from 'react-native';
import CustomSlidingModal from './components/CustomSlidingModal';
import { RectButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import RecurringExpensesFeed from './components/RecurringExpensesFeed';
import RecurringSummaryCard from './components/RecurringSummaryCard';
import { useRecurringExpenses } from '../../../src/hooks/useRecurringExpenses';
import {
	RecurringExpense,
	RecurringExpenseService,
} from '../../../src/services/recurringExpenseService';

// ==========================================
// Types
// ==========================================

// ==========================================
// Constants
// ==========================================

const RecurringExpensesScreen: React.FC = () => {
	const [refreshing, setRefreshing] = useState(false);
	const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
	const [selectedExpense, setSelectedExpense] =
		useState<RecurringExpense | null>(null);
	const [activeView, setActiveView] = useState<'monthly' | 'weekly'>('monthly');

	// Use only the hook, not both context and hook
	const { expenses, summaryStats, refetch, markAsPaid } =
		useRecurringExpenses();

	// ==========================================
	// Memoized Calculations
	// ==========================================
	const amountsByFrequency = useMemo(() => {
		return expenses.reduce((acc, expense) => {
			const frequency = expense.frequency;
			if (!acc[frequency]) {
				acc[frequency] = 0;
			}
			acc[frequency] += expense.amount;
			return acc;
		}, {} as Record<string, number>);
	}, [expenses]);

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

	// Find next payment date
	const nextPaymentDate = useMemo(() => {
		if (expenses.length === 0) return '';

		return expenses.reduce((earliest, expense) => {
			const currentDays = RecurringExpenseService.getDaysUntilNext(
				expense.nextExpectedDate
			);
			const earliestDays = RecurringExpenseService.getDaysUntilNext(
				earliest.nextExpectedDate
			);
			return currentDays < earliestDays ? expense : earliest;
		}).nextExpectedDate;
	}, [expenses]);

	const onRefresh = async () => {
		setRefreshing(true);
		try {
			await refetch();
		} catch (error) {
			console.error('Error refreshing recurring expenses:', error);
		} finally {
			setRefreshing(false);
		}
	};

	// Refresh when component mounts
	useEffect(() => {
		onRefresh();
	}, []);

	const handleExpensePress = (expense: any) => {
		setSelectedExpense(expense);
		setIsOptionsModalVisible(true);
	};

	const handleExpenseRowPress = (expense: RecurringExpense) => {
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
			console.log(
				'View payment history for pattern:',
				selectedExpense.patternId
			);
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
			console.log('Edit expense:', selectedExpense.patternId);
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

	const handleViewToggle = () => {
		setActiveView(activeView === 'monthly' ? 'weekly' : 'monthly');
	};

	return (
		<View style={styles.mainContainer}>
			<ScrollView
				style={styles.content}
				contentContainerStyle={styles.scrollContentContainer}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor="#00a2ff"
						colors={['#00a2ff']}
					/>
				}
				showsVerticalScrollIndicator={false}
			>
				{/* Recurring Summary Card */}
				<RecurringSummaryCard
					expenses={expenses}
					activeView={activeView}
					onViewToggle={handleViewToggle}
					onExpensePress={handleExpensePress}
					onAddExpense={handleAddRecurringExpense}
					overdueAmount={overdueAmount}
					dueThisWeekAmount={dueThisWeekAmount}
					overdueCount={overdueCount}
					dueThisWeekCount={dueThisWeekCount}
				/>

				{/* Recurring Expenses Feed */}
				<RecurringExpensesFeed
					expenses={expenses}
					onPressMenu={handleExpensePress}
					onPressRow={handleExpenseRowPress}
					scrollEnabled={false}
				/>
			</ScrollView>

			{/* Options Modal */}
			<CustomSlidingModal
				isVisible={isOptionsModalVisible}
				onClose={hideOptionsModal}
				title={selectedExpense?.vendor || 'Expense Options'}
				icon="ellipsis-horizontal"
			>
				<View style={styles.optionsModalContent}>
					<RectButton
						style={styles.optionButton}
						onPress={handleViewPaymentHistory}
					>
						<View style={styles.optionContent}>
							<Ionicons name="time-outline" size={20} color="#00a2ff" />
							<Text style={styles.optionText}>View Payment History</Text>
						</View>
					</RectButton>

					<RectButton style={styles.optionButton} onPress={handleEditExpense}>
						<View style={styles.optionContent}>
							<Ionicons name="create-outline" size={20} color="#00a2ff" />
							<Text style={styles.optionText}>Edit Expense</Text>
						</View>
					</RectButton>

					<RectButton style={styles.optionButton} onPress={handleMarkAsPaid}>
						<View style={styles.optionContent}>
							<Ionicons
								name="checkmark-circle-outline"
								size={20}
								color="#00a2ff"
							/>
							<Text style={styles.optionText}>Mark as Paid</Text>
						</View>
					</RectButton>

					<RectButton style={styles.optionButton} onPress={hideOptionsModal}>
						<View style={styles.optionContent}>
							<Ionicons name="close-outline" size={20} color="#757575" />
							<Text style={styles.optionText}>Cancel</Text>
						</View>
					</RectButton>
				</View>
			</CustomSlidingModal>
		</View>
	);
};

// ==========================================
// Styles
// ==========================================
const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		backgroundColor: '#fff',
	},

	content: {
		flex: 1,
	},

	scrollContentContainer: {
		paddingHorizontal: 0,
		marginTop: 8,
	},

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
