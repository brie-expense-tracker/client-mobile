import React, { useState, useEffect, useMemo } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { RecurringExpenseService } from '../../../../src/services';
import {
	useRecurringExpense,
	TransformedRecurringExpense,
} from '../../../../src/context/recurringExpenseContext';

interface RecurringExpensesSummaryWidgetProps {
	title?: string;
	maxVisibleItems?: number;
	onExpensePress?: (expense: TransformedRecurringExpense) => void;
	showViewAllButton?: boolean;
}

const RecurringExpensesSummaryWidget: React.FC<
	RecurringExpensesSummaryWidgetProps
> = ({
	title = 'Recurring Expenses',
	maxVisibleItems = 3,
	onExpensePress,
	showViewAllButton = true,
}) => {
	const { expenses, isLoading: loading, summaryStats } = useRecurringExpense();

	// State for payment status
	const [expensesWithPaymentStatus, setExpensesWithPaymentStatus] = useState<
		TransformedRecurringExpense[]
	>([]);
	const [isLoadingPaymentStatus, setIsLoadingPaymentStatus] = useState(false);
	const [paymentStatusError, setPaymentStatusError] = useState<string | null>(
		null
	);
	const [retryCount, setRetryCount] = useState(0);

	// Cast expenses to the transformed type since the hook returns transformed data
	const transformedExpenses = expenses as TransformedRecurringExpense[];

	// Check payment status for all expenses
	useEffect(() => {
		const checkPaymentStatus = async () => {
			if (transformedExpenses.length === 0) return;

			setIsLoadingPaymentStatus(true);
			setPaymentStatusError(null);
			try {
				// Use batch API for better performance - build from current state
				// Only send valid ObjectIds (24-char hex) to avoid querying manual_* IDs
				const objectIdRe = /^[0-9a-fA-F]{24}$/;
				const patternIds = transformedExpenses
					.map((expense) => expense.patternId || (expense as any).id)
					.filter((id) => id && objectIdRe.test(id));

				if (patternIds.length === 0) {
					console.log(
						'⚠️ [RecurringExpensesSummaryWidget] No valid ObjectIds to check payment status'
					);
					setExpensesWithPaymentStatus(
						transformedExpenses.map((expense) => ({
							...expense,
							isPaid: false,
							nextDueDate: expense.nextExpectedDate,
						}))
					);
					setIsLoadingPaymentStatus(false);
					return;
				}

				const paymentStatuses =
					await RecurringExpenseService.checkBatchPaidStatus(patternIds);

				const expensesWithStatus = transformedExpenses.map((expense) => {
					try {
						const expenseId = expense.patternId || (expense as any).id;
						const isPaid = paymentStatuses[expenseId] === true;

						// Check if paid within 2 weeks of the monthly expense
						let isPaidWithinTwoWeeks = false;
						let paymentDate: string | undefined;
						let nextDueDate: string = expense.nextExpectedDate;

						if (isPaid) {
							// Since we only get a boolean now, we'll assume it's paid within the period
							isPaidWithinTwoWeeks = true;
							paymentDate = new Date().toLocaleDateString();
							// Calculate next due date based on frequency
							nextDueDate = calculateNextDueDate(
								expense.nextExpectedDate,
								expense.frequency
							);
						}

						return {
							...expense,
							isPaid: isPaidWithinTwoWeeks,
							paymentDate,
							nextDueDate,
						};
					} catch (error) {
						console.error(
							`Error checking payment status for ${expenseId}:`,
							error
						);
						// Return expense with default unpaid status on error
						return {
							...expense,
							isPaid: false,
							nextDueDate: expense.nextExpectedDate,
						};
					}
				});

				setExpensesWithPaymentStatus(expensesWithStatus);
				setRetryCount(0); // Reset retry count on success
			} catch (error) {
				console.error('Error checking payment status:', error);
				setPaymentStatusError('Failed to check payment status');
				setExpensesWithPaymentStatus(
					transformedExpenses.map((expense) => ({
						...expense,
						isPaid: false,
						nextDueDate: expense.nextExpectedDate,
					}))
				);
			} finally {
				setIsLoadingPaymentStatus(false);
			}
		};

		checkPaymentStatus();
	}, [transformedExpenses, retryCount]);

	// Retry function for payment status check
	const retryPaymentStatusCheck = () => {
		setRetryCount((prev) => prev + 1);
	};

	// Helper function to calculate next due date
	const calculateNextDueDate = (
		currentDate: string,
		frequency: string
	): string => {
		const date = new Date(currentDate);

		switch (frequency) {
			case 'weekly':
				date.setDate(date.getDate() + 7);
				break;
			case 'monthly':
				date.setMonth(date.getMonth() + 1);
				break;
			case 'quarterly':
				date.setMonth(date.getMonth() + 3);
				break;
			case 'yearly':
				date.setFullYear(date.getFullYear() + 1);
				break;
		}

		return date.toISOString();
	};

	// Debug: Log the current status
	console.log(
		`🔄 Recurring: ${transformedExpenses.length} expenses, ${expensesWithPaymentStatus.length} with status`
	);

	const handleExpensePress = (expense: TransformedRecurringExpense) => {
		if (onExpensePress) {
			onExpensePress(expense);
		} else {
			// Check if expense is overdue or due soon
			const isOverdue = expense.isOverdue;
			const isDueSoon = expense.isDueSoon;

			if (isOverdue || isDueSoon) {
				// If overdue or due soon, navigate to expense transaction screen with pre-filled data
				router.push(
					`/(tabs)/transaction/expense?description=${encodeURIComponent(
						expense.vendor
					)}&amount=${expense.amount}&recurringExpenseId=${expense.patternId}`
				);
			} else {
				// If not due soon, show expense details
				showExpenseActions(expense);
			}
		}
	};

	const showExpenseActions = (expense: TransformedRecurringExpense) => {
		// For now, navigate to the recurring expenses detail with this expense selected
		// In the future, this could open a modal with quick actions
		router.push(`/(tabs)/budgets?tab=recurring&expense=${expense.patternId}`);
	};

	const handleViewAll = () => {
		router.push('/(tabs)/budgets?tab=recurring');
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(amount);
	};

	const getStatusIcon = (expense: TransformedRecurringExpense) => {
		if (expense.isPaid) {
			return { name: 'checkmark-circle', color: '#10b981' };
		} else if (expense.isOverdue) {
			return { name: 'close-circle', color: '#dc2626' };
		} else if (expense.isDueSoon) {
			return { name: 'remove-circle', color: '#f59e0b' };
		} else {
			return { name: 'remove-circle', color: '#f59e0b' };
		}
	};

	const getStatusText = (expense: TransformedRecurringExpense) => {
		if (expense.isPaid && expense.paymentDate) {
			return `Paid: ${expense.paymentDate}`;
		} else {
			return `Next due: ${new Date(expense.nextDueDate).toLocaleDateString()}`;
		}
	};

	const renderExpenseItem = (
		expense: TransformedRecurringExpense,
		index: number,
		array: TransformedRecurringExpense[]
	) => {
		const statusIcon = getStatusIcon(expense);
		const statusText = getStatusText(expense);
		const isLastItem = index === array.length - 1;

		return (
			<TouchableOpacity
				key={expense.patternId}
				style={[
					styles.expenseItem,
					!isLastItem && styles.expenseItemWithDivider,
					isLastItem && styles.lastExpenseItem,
				]}
				onPress={() => handleExpensePress(expense)}
			>
				<View style={styles.expenseGrid}>
					{/* Row 1 */}
					<View style={styles.expenseRow}>
						<View style={styles.expenseColumn}>
							<Text style={styles.vendorName} numberOfLines={1}>
								{expense.vendor}
							</Text>
						</View>
						<View style={styles.expenseColumn}>
							<Text style={styles.amount}>
								{formatCurrency(expense.amount)}
							</Text>
						</View>
					</View>

					{/* Row 2 */}
					<View style={styles.expenseRow}>
						<View style={styles.expenseColumn}>
							<Text style={styles.frequencyText}>
								{expense.formattedFrequency}
							</Text>
						</View>
						<View style={styles.expenseColumn}>
							<View style={styles.dueDateContainer}>
								<Text
									style={[
										styles.dueDateText,
										expense.isPaid && styles.paidText,
										expense.isOverdue && styles.overdueText,
									]}
								>
									{statusText}
								</Text>
								<Ionicons
									name={statusIcon.name as any}
									size={16}
									color={statusIcon.color}
									accessibilityLabel={expense.isPaid ? 'Paid' : 'Not paid'}
								/>
							</View>
						</View>
					</View>
				</View>
			</TouchableOpacity>
		);
	};

	// Use expenses with payment status if available, otherwise fall back to transformed expenses
	const displayExpenses =
		expensesWithPaymentStatus.length > 0
			? expensesWithPaymentStatus
			: transformedExpenses;

	// Memoize filtered counts for performance
	const paidCount = useMemo(
		() => displayExpenses.filter((e) => e.isPaid).length,
		[displayExpenses]
	);
	const unpaidCount = useMemo(
		() => displayExpenses.filter((e) => !e.isPaid).length,
		[displayExpenses]
	);

	// Only show loading state if we haven't loaded any data yet
	if (loading && displayExpenses.length === 0) {
		return (
			<View style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.title}>{title}</Text>
				</View>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="small" color="#007ACC" />
					<Text style={styles.loadingText}>Loading...</Text>
				</View>
			</View>
		);
	}

	// Show payment status loading indicator
	if (isLoadingPaymentStatus && displayExpenses.length > 0) {
		return (
			<View style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.title}>{title}</Text>
				</View>
				<View style={styles.widgetContainer}>
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="small" color="#007ACC" />
						<Text style={styles.loadingText}>Checking payment status...</Text>
					</View>
				</View>
			</View>
		);
	}

	// Show error state with retry button
	if (paymentStatusError && displayExpenses.length > 0) {
		return (
			<View style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.title}>{title}</Text>
				</View>
				<View style={styles.widgetContainer}>
					<View style={styles.errorContainer}>
						<Ionicons name="warning-outline" size={24} color="#f59e0b" />
						<Text style={styles.errorText}>{paymentStatusError}</Text>
						<TouchableOpacity
							style={styles.retryButton}
							onPress={retryPaymentStatusCheck}
						>
							<Text style={styles.retryButtonText}>Retry</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>{title}</Text>
			</View>

			<View style={styles.widgetContainer}>
				{displayExpenses.length === 0 ? (
					<View style={styles.emptyContainer}>
						<Ionicons name="repeat" size={32} color="#ccc" />
						<Text style={styles.emptyText}>No recurring expenses</Text>
					</View>
				) : (
					<>
						{/* Summary Stats */}
						<View style={styles.summaryStats}>
							<View style={styles.statItem}>
								<Text style={styles.statValue}>
									{formatCurrency(summaryStats.totalAmount)}
								</Text>
								<Text style={styles.statLabel}>Monthly Total</Text>
							</View>
							<View style={styles.statDivider} />
							<View style={styles.statItem}>
								<Text style={styles.statValue}>{displayExpenses.length}</Text>
								<Text style={styles.statLabel}>Active</Text>
							</View>
							<View style={styles.statDivider} />
							<View style={styles.statItem}>
								<Text
									style={[
										styles.statValue,
										summaryStats.overdueCount > 0 && styles.overdueValue,
									]}
								>
									{summaryStats.overdueCount}
								</Text>
								<Text style={styles.statLabel}>Overdue</Text>
							</View>
						</View>

						{/* Payment Status Summary */}
						{displayExpenses.length > 0 && (
							<View style={styles.paymentStatusSummary}>
								<Text style={styles.paymentStatusText}>
									{paidCount} paid • {unpaidCount} upcoming
								</Text>
							</View>
						)}

						{/* Expense List */}
						<View style={styles.expensesList}>
							{displayExpenses
								.slice(0, maxVisibleItems)
								.map((expense, index, array) =>
									renderExpenseItem(expense, index, array)
								)}
							{displayExpenses.length > maxVisibleItems && (
								<TouchableOpacity
									style={styles.moreItemsIndicator}
									onPress={handleViewAll}
								>
									<Text style={styles.moreItemsText}>
										+{displayExpenses.length - maxVisibleItems} more
									</Text>
								</TouchableOpacity>
							)}
						</View>
					</>
				)}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginVertical: 8,
		paddingBottom: 8,
	},
	widgetContainer: {
		backgroundColor: '#fff',
		borderRadius: 8,
		padding: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.15,
		shadowRadius: 4,
		elevation: 1,
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
	},
	loadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
	},
	loadingText: {
		marginLeft: 8,
		color: '#666',
		fontSize: 14,
		fontWeight: '500',
	},
	emptyContainer: {
		alignItems: 'center',
		paddingVertical: 12,
	},
	emptyText: {
		marginTop: 8,
		color: '#999',
		fontSize: 14,
	},
	summaryStats: {
		flexDirection: 'row',
		backgroundColor: '#fff',
		borderRadius: 6,
		paddingVertical: 12,
	},
	statItem: {
		flex: 1,
		alignItems: 'center',
	},
	statValue: {
		fontSize: 16,
		fontWeight: '700',
		color: '#333',
		marginBottom: 4,
	},
	overdueValue: {
		color: '#dc2626',
	},
	statLabel: {
		fontSize: 12,
		color: '#666',
		fontWeight: '500',
	},
	statDivider: {
		width: 1,
		backgroundColor: '#e5e7eb',
		marginHorizontal: 12,
	},
	expensesList: {
		gap: 8,
	},
	expenseItem: {
		backgroundColor: '#fff',
		borderRadius: 6,
		paddingHorizontal: 12,
	},
	expenseGrid: {
		// Grid container
	},
	expenseRow: {
		flexDirection: 'row',
		marginBottom: 4,
	},
	expenseColumn: {
		flex: 1,
	},
	expenseItemWithDivider: {
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
		paddingBottom: 12,
	},
	lastExpenseItem: {
		marginBottom: 0,
	},
	expenseHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 6,
	},
	vendorInfo: {
		flex: 1,
		marginRight: 8,
	},
	vendorName: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
		marginBottom: 2,
	},
	frequencyText: {
		fontSize: 12,
		color: '#666',
	},
	frequencyRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	dueDateRow: {
		marginTop: 4,
		alignItems: 'flex-end',
	},
	dueDateContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end',
		gap: 6,
	},
	amountContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	amount: {
		fontSize: 16,
		fontWeight: '600',
		color: '#222222',
		textAlign: 'right',
	},
	expenseFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	dueDateText: {
		fontSize: 12,
		color: '#6b7280',
		fontWeight: '500',
	},
	paidText: {
		color: '#10b981',
		fontWeight: '600',
	},
	overdueText: {
		color: '#dc2626',
		fontWeight: '600',
	},
	overdueContainer: {
		marginTop: 4,
	},
	moreItemsIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
		paddingTop: 8,
	},
	moreItemsText: {
		fontSize: 14,
		color: '#868686',
		fontWeight: '500',
		marginRight: 4,
	},
	errorContainer: {
		alignItems: 'center',
		paddingVertical: 20,
		backgroundColor: '#fff',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#f59e0b',
		shadowColor: '#f59e0b',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 1,
	},
	errorText: {
		color: '#f59e0b',
		fontSize: 14,
		textAlign: 'center',
		marginTop: 10,
		marginBottom: 15,
	},
	retryButton: {
		backgroundColor: '#00a2ff',
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 8,
	},
	retryButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	paymentStatusSummary: {
		backgroundColor: '#f9f9f9',
		borderRadius: 6,
		paddingVertical: 8,
		paddingHorizontal: 12,
		marginBottom: 12,
	},
	paymentStatusText: {
		fontSize: 13,
		color: '#666',
		fontWeight: '500',
		textAlign: 'center',
	},
});

export default RecurringExpensesSummaryWidget;
