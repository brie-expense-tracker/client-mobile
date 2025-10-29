import React, { useState, useEffect, useContext } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
	RefreshControl,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
	RecurringExpenseService,
	RecurringExpense,
} from '../../../../src/services';
import { useRecurringExpense } from '../../../../src/context/recurringExpenseContext';
import { createLogger } from '../../../../src/utils/sublogger';

const recurringExpensesListLog = createLogger('RecurringExpensesList');
import { FilterContext } from '../../../../src/context/filterContext';
import RecurringExpenseCard from './RecurringExpenseCard';
import { resolveRecurringExpenseAppearance } from '../../../../src/utils/recurringExpenseAppearance';
import { isDevMode } from '../../../../src/config/environment';

interface RecurringExpensesListProps {
	title?: string;
	showUpcomingOnly?: boolean;
	maxVisibleItems?: number;
	onExpensePress?: (expense: RecurringExpense) => void;
	showAddButton?: boolean;
}

const RecurringExpensesList: React.FC<RecurringExpensesListProps> = ({
	title = 'Recurring Expenses',
	showUpcomingOnly = false,
	maxVisibleItems,
	onExpensePress,
	showAddButton = true,
}) => {
	const { setSelectedPatternId } = useContext(FilterContext);
	const {
		expenses: allExpenses,
		isLoading: loading,
		refetch,
		markAsPaid,
	} = useRecurringExpense();
	const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
	const [markingAsPaid, setMarkingAsPaid] = useState<string | null>(null);
	const [paymentStatuses, setPaymentStatuses] = useState<
		Record<string, boolean | null>
	>({});

	// Filter expenses based on context data
	useEffect(() => {
		if (showUpcomingOnly) {
			// Filter for expenses due within 7 days
			const upcoming = allExpenses.filter((expense) => {
				const daysUntilDue = RecurringExpenseService.getDaysUntilNext(
					expense.nextExpectedDate
				);
				return daysUntilDue <= 7;
			});
			if (isDevMode) {
				recurringExpensesListLog.debug(
					'[RecurringExpensesList] Filtered upcoming expenses:',
					upcoming
				);
			}
			setExpenses(upcoming);
		} else {
			if (isDevMode) {
				recurringExpensesListLog.debug(
					'[RecurringExpensesList] Setting all expenses:',
					allExpenses
				);
			}
			setExpenses(allExpenses);
		}
	}, [allExpenses, showUpcomingOnly]);

	// Check payment status for all expenses
	useEffect(() => {
		const checkAllPaymentStatuses = async () => {
			if (expenses.length === 0) return;

			try {
				// Build IDs from current state (handles both patternId and id fields)
				// Only send valid ObjectIds (24-char hex) to avoid querying manual_* IDs
				const objectIdRe = /^[0-9a-fA-F]{24}$/;
				const patternIds = expenses
					.map((expense) => expense.patternId || (expense as any).id)
					.filter((id) => id && objectIdRe.test(id));

				if (patternIds.length === 0) {
					if (isDevMode) {
						recurringExpensesListLog.debug(
							'⚠️ [RecurringExpensesList] No valid ObjectIds to check payment status'
						);
					}
					setPaymentStatuses({});
					return;
				}

				const statuses = await RecurringExpenseService.checkBatchPaidStatus(
					patternIds
				);
				setPaymentStatuses(statuses);
			} catch (error) {
				recurringExpensesListLog.error(
					'Error checking payment statuses',
					error
				);
			}
		};

		checkAllPaymentStatuses();
	}, [expenses]);

	const handleOptionsPress = (expense: RecurringExpense) => {
		// Show options menu with edit and delete options
		Alert.alert(
			expense.vendor,
			`$${expense.amount.toFixed(
				2
			)} - ${RecurringExpenseService.formatFrequency(expense.frequency)}`,
			[
				{
					text: 'Edit',
					onPress: () => {
						if (onExpensePress) {
							onExpensePress(expense);
						}
					},
				},
				{
					text: 'Mark as Paid',
					onPress: () => handleMarkAsPaid(expense),
					style: 'default',
				},
				{
					text: 'Cancel',
					style: 'cancel',
				},
			]
		);
	};

	const handleMarkAsPaid = async (expense: RecurringExpense) => {
		try {
			setMarkingAsPaid(expense.patternId);

			// Calculate period dates
			const nextDate = new Date(expense.nextExpectedDate);
			const periodStart = new Date(nextDate);
			periodStart.setDate(periodStart.getDate() - 30); // Approximate period start
			const periodEnd = new Date(nextDate);

			await markAsPaid(
				expense.patternId,
				periodStart.toISOString(),
				periodEnd.toISOString()
			);

			// Update payment status locally
			setPaymentStatuses((prev) => ({
				...prev,
				[expense.patternId]: true,
			}));

			// Refresh the data
			await refetch();

			Alert.alert('Success', `${expense.vendor} has been marked as paid`, [
				{ text: 'OK' },
			]);
		} catch (error) {
			recurringExpensesListLog.error(
				'Error marking recurring expense as paid',
				error
			);
			Alert.alert(
				'Error',
				'Failed to mark expense as paid. Please try again.',
				[{ text: 'OK' }]
			);
		} finally {
			setMarkingAsPaid(null);
		}
	};

	const handleAddRecurringExpense = () => {
		router.push('/(stack)/addRecurringExpense');
	};

	const handleRefresh = async () => {
		try {
			await refetch();
		} catch (error) {
			recurringExpensesListLog.error('Error refreshing expenses', error);
			Alert.alert('Error', 'Failed to refresh expenses. Please try again.', [
				{ text: 'OK' },
			]);
		}
	};

	const handleExpenseSelect = (expense: RecurringExpense) => {
		// Set the selected pattern ID in the filter context
		if (setSelectedPatternId) {
			setSelectedPatternId(expense.patternId);
		}
		// Also call the original onExpensePress if provided
		if (onExpensePress) {
			onExpensePress(expense);
		}
	};

	// Group expenses by frequency
	const groupExpensesByFrequency = () => {
		const grouped: Record<string, RecurringExpense[]> = {
			weekly: [],
			monthly: [],
			quarterly: [],
			yearly: [],
		};

		expenses.forEach((expense) => {
			if (grouped[expense.frequency]) {
				grouped[expense.frequency].push(expense);
			}
		});

		return grouped;
	};

	const formatPeriodHeader = (frequency: string) => {
		switch (frequency) {
			case 'weekly':
				return 'This Week';
			case 'monthly':
				return 'This Month';
			case 'quarterly':
				return 'This Quarter';
			case 'yearly':
				return 'This Year';
			default:
				return frequency.charAt(0).toUpperCase() + frequency.slice(1);
		}
	};

	const renderExpenseItem = (expense: RecurringExpense) => {
		const daysUntilDue = RecurringExpenseService.getDaysUntilNext(
			expense.nextExpectedDate
		);
		const frequency = RecurringExpenseService.formatFrequency(
			expense.frequency
		);

		// Use actual payment status from the API
		const isPaid = paymentStatuses[expense.patternId] === true;
		const isMarkingAsPaid = markingAsPaid === expense.patternId;

		// Resolve appearance based on appearanceMode (respects user customization)
		const { icon, color } = resolveRecurringExpenseAppearance(expense);

		return (
			<TouchableOpacity
				key={expense.patternId}
				onPress={() => handleExpenseSelect(expense)}
			>
				<RecurringExpenseCard
					vendor={expense.vendor}
					amount={expense.amount}
					dueInDays={daysUntilDue}
					nextDueDate={new Date(expense.nextExpectedDate).toLocaleDateString()}
					frequency={frequency}
					iconName={icon}
					color={color}
					isPaid={isPaid}
					isProcessing={isMarkingAsPaid}
					onPressMarkPaid={() => handleMarkAsPaid(expense)}
					onPressEdit={() => handleOptionsPress(expense)}
				/>
			</TouchableOpacity>
		);
	};

	const renderPeriodSection = (
		frequency: string,
		expenses: RecurringExpense[]
	) => {
		if (expenses.length === 0) return null;

		return (
			<View key={frequency} style={styles.periodSection}>
				<View style={styles.periodHeader}>
					<View style={styles.periodIconWrapper}>
						<Ionicons name="calendar-outline" size={20} color="#00a2ff" />
					</View>
					<Text style={styles.periodText}>{formatPeriodHeader(frequency)}</Text>
				</View>
				<View style={styles.expensesList}>
					{expenses.map(renderExpenseItem)}
				</View>
			</View>
		);
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#007ACC" />
				<Text style={styles.loadingText}>Loading recurring expenses...</Text>
			</View>
		);
	}

	const groupedExpenses = groupExpensesByFrequency();
	const hasExpenses = expenses.length > 0;

	// Calculate summary statistics
	const totalAmount = expenses.reduce(
		(sum, expense) => sum + expense.amount,
		0
	);
	const paidCount = expenses.filter(
		(expense) => paymentStatuses[expense.patternId] === true
	).length;
	const unpaidCount = expenses.length - paidCount;

	return (
		<View style={styles.container}>
			{title && (
				<View style={styles.header}>
					<Text style={styles.title}>{title}</Text>
					<View style={styles.headerButtons}>
						<TouchableOpacity
							style={styles.refreshButton}
							onPress={handleRefresh}
							disabled={loading}
						>
							<Ionicons
								name="refresh"
								size={20}
								color={loading ? '#ccc' : '#007ACC'}
							/>
						</TouchableOpacity>
						{showAddButton && (
							<TouchableOpacity
								style={styles.addButton}
								onPress={handleAddRecurringExpense}
							>
								<Ionicons name="add" size={20} color="#007ACC" />
								<Text style={styles.addButtonText}>Add</Text>
							</TouchableOpacity>
						)}
					</View>
				</View>
			)}

			<ScrollView
				style={styles.scrollContainer}
				refreshControl={
					<RefreshControl
						refreshing={loading}
						onRefresh={handleRefresh}
						tintColor="#007ACC"
						colors={['#007ACC']}
					/>
				}
				showsVerticalScrollIndicator={false}
			>
				{!hasExpenses ? (
					<View style={styles.emptyContainer}>
						<Ionicons name="repeat" size={48} color="#ccc" />
						<Text style={styles.emptyTitle}>No Recurring Expenses</Text>
						<Text style={styles.emptyText}>
							{showUpcomingOnly
								? 'No upcoming recurring expenses in the next 7 days'
								: 'Add recurring expenses to track your regular payments'}
						</Text>

						{showAddButton && (
							<TouchableOpacity
								style={styles.addRecurringButton}
								onPress={handleAddRecurringExpense}
							>
								<Ionicons name="add" size={16} color="#007ACC" />
								<Text style={styles.addRecurringButtonText}>
									Add Recurring Expense
								</Text>
							</TouchableOpacity>
						)}
					</View>
				) : (
					<View style={styles.expensesContainer}>
						{/* Summary Statistics */}
						<View style={styles.summaryContainer}>
							<View style={styles.summaryItem}>
								<Text style={styles.summaryLabel}>Total Amount</Text>
								<Text style={styles.summaryValue}>
									${totalAmount.toFixed(2)}
								</Text>
							</View>
							<View style={styles.summaryItem}>
								<Text style={styles.summaryLabel}>Paid</Text>
								<Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
									{paidCount}
								</Text>
							</View>
							<View style={styles.summaryItem}>
								<Text style={styles.summaryLabel}>Unpaid</Text>
								<Text style={[styles.summaryValue, { color: '#F44336' }]}>
									{unpaidCount}
								</Text>
							</View>
						</View>

						{Object.entries(groupedExpenses).map(([frequency, expenses]) =>
							renderPeriodSection(frequency, expenses)
						)}
					</View>
				)}
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#fff',
		flex: 1,
	},
	scrollContainer: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingTop: 8,
		paddingBottom: 8,
		paddingHorizontal: 24,
	},
	headerButtons: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
	},
	refreshButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#f0f8ff',
		justifyContent: 'center',
		alignItems: 'center',
	},
	addButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		backgroundColor: '#f0f8ff',
	},
	addButtonText: {
		marginLeft: 4,
		fontSize: 14,
		fontWeight: '500',
		color: '#007ACC',
	},
	loadingContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
		paddingVertical: 40,
	},
	loadingText: {
		marginTop: 10,
		color: '#666',
		fontSize: 16,
	},
	emptyContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 40,
		paddingVertical: 40,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#666',
		marginTop: 10,
	},
	emptyText: {
		fontSize: 14,
		color: '#999',
		textAlign: 'center',
		marginTop: 5,
		lineHeight: 20,
		marginBottom: 20,
	},
	addRecurringButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 20,
		backgroundColor: '#f0f8ff',
		borderWidth: 1,
		borderColor: '#007ACC',
	},
	addRecurringButtonText: {
		marginLeft: 6,
		fontSize: 14,
		fontWeight: '500',
		color: '#007ACC',
	},
	expensesContainer: {
		paddingHorizontal: 0,
	},
	summaryContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		backgroundColor: '#f8f9fa',
		marginHorizontal: 24,
		marginBottom: 16,
		paddingVertical: 16,
		paddingHorizontal: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e9ecef',
	},
	summaryItem: {
		alignItems: 'center',
		flex: 1,
	},
	summaryLabel: {
		fontSize: 12,
		color: '#6c757d',
		fontWeight: '500',
		marginBottom: 4,
	},
	summaryValue: {
		fontSize: 16,
		fontWeight: '700',
		color: '#212529',
	},
	periodSection: {
		marginBottom: 0,
	},
	periodHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
		paddingHorizontal: 24,
	},
	periodIconWrapper: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#e0f7fa',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 8,
	},
	periodText: {
		fontSize: 18,
		fontWeight: '600',
		color: '#212121',
	},
	expensesList: {
		paddingHorizontal: 0,
	},
});

export default RecurringExpensesList;
