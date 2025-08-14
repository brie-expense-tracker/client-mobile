import React, { useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
	RecurringExpenseService,
	RecurringExpense,
} from '../../../../src/services/recurringExpenseService';
import { useRecurringExpense } from '../../../../src/context/recurringExpenseContext';

interface RecurringExpensesSummaryWidgetProps {
	title?: string;
	maxVisibleItems?: number;
	onExpensePress?: (expense: RecurringExpense) => void;
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
	const {
		expenses,
		isLoading: loading,
		expenseStatuses,
		summaryStats,
		lastRefreshed,
		refetch,
	} = useRecurringExpense();

	// Debug: Log the current status
	console.log('[RecurringExpensesSummaryWidget] Current status:', {
		expensesCount: expenses.length,
		expenseStatuses,
		lastRefreshed,
	});

	const handleExpensePress = (expense: RecurringExpense) => {
		if (onExpensePress) {
			onExpensePress(expense);
		} else {
			// Check if expense is paid
			const isPaid = expenseStatuses[expense.patternId] || false;

			if (!isPaid) {
				// If not paid, navigate to expense transaction screen with pre-filled data
				router.push(
					`/(tabs)/transaction/expense?description=${encodeURIComponent(
						expense.vendor
					)}&amount=${expense.amount}&recurringExpenseId=${expense.patternId}`
				);
			} else {
				// If paid, show expense details
				showExpenseActions(expense);
			}
		}
	};

	const showExpenseActions = (expense: RecurringExpense) => {
		const isPaid = expenseStatuses[expense.patternId] || false;
		const daysUntilDue = RecurringExpenseService.getDaysUntilNext(
			expense.nextExpectedDate
		);

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

	const getStatusIcon = (daysUntilDue: number, isPaid: boolean) => {
		if (isPaid) {
			return { name: 'checkmark-circle', color: '#10b981' };
		} else if (daysUntilDue <= 0) {
			return { name: 'close-circle', color: '#dc2626' };
		} else {
			return { name: 'remove-circle', color: '#f59e0b' };
		}
	};

	const renderExpenseItem = (
		expense: RecurringExpense,
		index: number,
		array: RecurringExpense[]
	) => {
		const daysUntilDue = RecurringExpenseService.getDaysUntilNext(
			expense.nextExpectedDate
		);
		const expenseStatus = expenseStatuses[expense.patternId];
		const isPaid = expenseStatus?.hasLinkedTransactions || false;
		const statusIcon = getStatusIcon(daysUntilDue, isPaid);
		const frequency = RecurringExpenseService.formatFrequency(
			expense.frequency
		);
		const isLastItem = index === array.length - 1;
		const isOverdue = daysUntilDue <= 0;

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
							<Text style={styles.frequencyText}>{frequency}</Text>
						</View>
						<View style={styles.expenseColumn}>
							<View style={styles.dueDateContainer}>
								<Text
									style={[styles.dueDateText, isOverdue && styles.overdueText]}
								>
									Due: {new Date(expense.nextExpectedDate).toLocaleDateString()}
								</Text>
								<Ionicons
									name={statusIcon.name as any}
									size={16}
									color={statusIcon.color}
								/>
							</View>
						</View>
					</View>
				</View>
			</TouchableOpacity>
		);
	};

	if (loading) {
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

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>{title}</Text>
			</View>

			<View style={styles.widgetContainer}>
				{expenses.length === 0 ? (
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
								<Text style={styles.statValue}>{expenses.length}</Text>
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

						{/* Expense List */}
						<View style={styles.expensesList}>
							{expenses
								.slice(0, maxVisibleItems)
								.map((expense, index, array) =>
									renderExpenseItem(expense, index, array)
								)}
							{expenses.length > maxVisibleItems && (
								<TouchableOpacity
									style={styles.moreItemsIndicator}
									onPress={handleViewAll}
								>
									<Text style={styles.moreItemsText}>
										+{expenses.length - maxVisibleItems} more
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
		marginBottom: 12,
	},
	statItem: {
		flex: 1,
		alignItems: 'center',
	},
	statValue: {
		fontSize: 18,
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
		fontSize: 16,
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
		fontSize: 18,
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
		padding: 16,
		backgroundColor: '#fff',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	moreItemsText: {
		fontSize: 14,
		color: '#00a2ff',
		fontWeight: '500',
		marginRight: 4,
	},
});

export default RecurringExpensesSummaryWidget;
