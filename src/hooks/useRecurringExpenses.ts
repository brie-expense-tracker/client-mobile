import { useMemo, useCallback } from 'react';
import { useDataFetching } from './useDataFetching';
import { BillService, Bill } from '../services';
import { createLogger } from '../utils/sublogger';

const recurringExpensesHookLog = createLogger('useRecurringExpenses');

// Extended interface for bill with id (required by useDataFetching)
export interface BillWithId extends Bill {
	id: string;
}

// Extended interface for transformed bill data
export interface TransformedBill extends BillWithId {
	daysUntilDue: number;
	statusColor: string;
	statusText: string;
	formattedFrequency: string;
	isOverdue: boolean;
	isDueSoon: boolean;
	isPaid: boolean;
	paymentDate?: string;
	nextDueDate: string;
}

// ==========================================
// Recurring expense-specific API functions
// ==========================================
const fetchRecurringExpenses = async (): Promise<BillWithId[]> => {
	const expenses = await BillService.getRecurringExpenses();
	// Add id property using patternId
	return expenses.map((expense) => ({
		...expense,
		id: expense.patternId,
	}));
};

const addRecurringExpense = async (data: {
	vendor: string;
	amount: number;
	frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
	nextExpectedDate: string;
}): Promise<BillWithId> => {
	const expense = await BillService.createRecurringExpense(data);
	return {
		...expense,
		id: expense.patternId,
	};
};

const updateRecurringExpense = async (
	id: string,
	data: Partial<BillWithId>
): Promise<BillWithId> => {
	const expense = await BillService.updateRecurringExpense(id, data as any);
	return {
		...expense,
		id: expense.patternId,
	};
};

const deleteRecurringExpense = async (id: string): Promise<void> => {
	await BillService.deleteRecurringExpense(id);
};

// ==========================================
// Recurring expense-specific data transformations
// ==========================================
const transformRecurringExpenseData = (
	expenses: BillWithId[]
): TransformedBill[] => {
	return expenses.map((expense) => {
		const daysUntilDue = BillService.getDaysUntilNext(expense.nextExpectedDate);
		const statusColor = BillService.getStatusColor(daysUntilDue);
		const statusText = BillService.getStatusText(daysUntilDue);
		const frequency = BillService.formatFrequency(expense.frequency);

		// Check if bill is paid (from BillContext or other sources)
		const isPaid = (expense as any).isPaid === true;

		// Only mark as overdue if not paid and past due date
		const isOverdue = !isPaid && daysUntilDue < 0;

		return {
			...expense,
			daysUntilDue,
			statusColor,
			statusText,
			formattedFrequency: frequency,
			isOverdue,
			isDueSoon: daysUntilDue <= 7 && daysUntilDue >= 0,
			isPaid: isPaid || false, // Use existing isPaid if available, otherwise false
			paymentDate: undefined, // Will be updated by the widget
			nextDueDate: expense.nextExpectedDate, // Will be updated by the widget
		};
	});
};

// ==========================================
// Hook
// ==========================================
export function useRecurringExpenses() {
	const {
		data: expenses,
		isLoading,
		hasLoaded,
		error,
		lastRefreshed,
		refetch,
		addItem: addExpenseItem,
		updateItem: updateExpenseItem,
		deleteItem: deleteExpenseItem,
		clearError,
	} = useDataFetching<BillWithId>({
		fetchFunction: fetchRecurringExpenses,
		addFunction: addRecurringExpense,
		updateFunction: updateRecurringExpense,
		deleteFunction: deleteRecurringExpense,
		autoRefresh: true,
		refreshOnFocus: true,
		transformData: transformRecurringExpenseData,
	});

	// ==========================================
	// Memoized Recurring Expense Calculations
	// ==========================================
	const expenseCalculations = useMemo(() => {
		// Cast expenses to TransformedBill since they are transformed
		const transformedExpenses = expenses as TransformedBill[];

		// Categorize expenses
		const overdueExpenses = transformedExpenses.filter(
			(expense) => expense.isOverdue
		);
		const dueSoonExpenses = transformedExpenses.filter(
			(expense) => expense.isDueSoon
		);
		const upcomingExpenses = transformedExpenses.filter(
			(expense) => !expense.isOverdue && !expense.isDueSoon
		);

		// Calculate summary stats
		const totalAmount = transformedExpenses.reduce(
			(sum, expense) => sum + expense.amount,
			0
		);
		const totalOverdue = overdueExpenses.reduce(
			(sum, expense) => sum + expense.amount,
			0
		);
		const totalDueSoon = dueSoonExpenses.reduce(
			(sum, expense) => sum + expense.amount,
			0
		);

		// Find next due date
		const nextDueDate =
			transformedExpenses.length > 0
				? transformedExpenses.reduce((earliest, expense) => {
						const currentDays = expense.daysUntilDue;
						const earliestDays = earliest.daysUntilDue;
						return currentDays < earliestDays ? expense : earliest;
				  }).nextExpectedDate
				: null;

		const summaryStats = {
			totalExpenses: transformedExpenses.length,
			overdueCount: overdueExpenses.length,
			dueSoonCount: dueSoonExpenses.length,
			upcomingCount: upcomingExpenses.length,
			totalAmount,
			totalOverdue,
			totalDueSoon,
			nextDueDate,
		};

		return {
			overdueExpenses,
			dueSoonExpenses,
			upcomingExpenses,
			summaryStats,
		};
	}, [expenses]);

	// ==========================================
	// Additional recurring expense-specific functions
	// ==========================================
	const markAsPaid = useCallback(
		async (patternId: string, periodStart: string, periodEnd: string) => {
			try {
				return await BillService.markRecurringExpensePaid({
					patternId,
					periodStart,
					periodEnd,
					paymentMethod: 'manual',
					notes: 'Marked as paid via mobile app',
				});
			} catch (error) {
				recurringExpensesHookLog.error(
					'Error marking recurring expense as paid',
					error
				);
				throw error;
			}
		},
		[]
	);

	const getPaymentHistory = useCallback(
		async (patternId: string, limit: number = 10) => {
			try {
				return await BillService.getPaymentHistory(patternId, limit);
			} catch (error) {
				recurringExpensesHookLog.error('Error getting payment history', error);
				throw error;
			}
		},
		[]
	);

	const checkPaymentStatus = useCallback(async (patternId: string) => {
		try {
			return await BillService.checkIfCurrentPeriodPaid(patternId);
		} catch (error) {
			recurringExpensesHookLog.error('Error checking payment status', error);
			throw error;
		}
	}, []);

	// ==========================================
	// Additional RecurringExpenseService features
	// ==========================================
	const detectRecurringPatterns = useCallback(async () => {
		return BillService.detectRecurringPatterns();
	}, []);

	const checkUpcomingExpenses = useCallback(async () => {
		return BillService.checkUpcomingRecurringExpenses();
	}, []);

	const processRecurringExpenses = useCallback(async () => {
		return BillService.processRecurringExpenses();
	}, []);

	const cleanupDuplicateExpenses = useCallback(async () => {
		return BillService.cleanupDuplicateExpenses();
	}, []);

	const generateRecurringTransactions = useCallback(
		async (patternId: string, cycles?: number) => {
			return BillService.generateRecurringTransactions({
				patternId,
				cycles,
			});
		},
		[]
	);

	const linkTransactionToRecurring = useCallback(
		async (transactionId: string, patternId: string) => {
			return BillService.linkTransactionToRecurring({
				transactionId,
				patternId,
			});
		},
		[]
	);

	const getPendingRecurringTransactions = useCallback(
		async (limit: number = 50) => {
			return BillService.getPendingRecurringTransactions(limit);
		},
		[]
	);

	const getRecurringTransactionsForPattern = useCallback(
		async (patternId: string, limit: number = 20) => {
			return BillService.getRecurringTransactionsForPattern(patternId, limit);
		},
		[]
	);

	const autoApplyTransactions = useCallback(async () => {
		return BillService.autoApplyTransactions();
	}, []);

	const isCurrentPeriodPaid = useCallback(async (patternId: string) => {
		return BillService.checkIfCurrentPeriodPaid(patternId);
	}, []);

	const checkBatchPaidStatus = useCallback(async (patternIds: string[]) => {
		return BillService.checkBatchPaidStatus(patternIds);
	}, []);

	// ==========================================
	// Wrapper functions for better API
	// ==========================================
	const addRecurringExpenseWrapper = useCallback(
		async (data: {
			vendor: string;
			amount: number;
			frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
			nextExpectedDate: string;
		}): Promise<BillWithId> => {
			return addExpenseItem(data as BillWithId);
		},
		[addExpenseItem]
	);

	return {
		// Data
		expenses,
		...expenseCalculations,

		// Loading states
		isLoading,
		hasLoaded,
		error,
		lastRefreshed,

		// Basic Actions
		refetch,
		addRecurringExpense: addRecurringExpenseWrapper,
		updateRecurringExpense: updateExpenseItem,
		deleteRecurringExpense: deleteExpenseItem,
		markAsPaid,
		getPaymentHistory,
		checkPaymentStatus,
		clearError,

		// Additional Service Features
		detectRecurringPatterns,
		checkUpcomingExpenses,
		processRecurringExpenses,
		cleanupDuplicateExpenses,
		generateRecurringTransactions,
		linkTransactionToRecurring,
		getPendingRecurringTransactions,
		getRecurringTransactionsForPattern,
		autoApplyTransactions,
		isCurrentPeriodPaid,
		checkBatchPaidStatus,
	};
}
