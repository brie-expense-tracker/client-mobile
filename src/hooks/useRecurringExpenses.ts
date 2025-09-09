import { useMemo, useCallback } from 'react';
import { useDataFetching } from './useDataFetching';
import { RecurringExpenseService, RecurringExpense } from '../services';

// Extended interface for recurring expense with id (required by useDataFetching)
export interface RecurringExpenseWithId extends RecurringExpense {
	id: string;
}

// Extended interface for transformed recurring expense data
export interface TransformedRecurringExpense extends RecurringExpenseWithId {
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
const fetchRecurringExpenses = async (): Promise<RecurringExpenseWithId[]> => {
	const expenses = await RecurringExpenseService.getRecurringExpenses();
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
}): Promise<RecurringExpenseWithId> => {
	const expense = await RecurringExpenseService.createRecurringExpense(data);
	return {
		...expense,
		id: expense.patternId,
	};
};

// Note: Update and delete functions are not implemented in the RecurringExpenseService
// These would need to be added to the service layer first

// ==========================================
// Recurring expense-specific data transformations
// ==========================================
const transformRecurringExpenseData = (
	expenses: RecurringExpenseWithId[]
): TransformedRecurringExpense[] => {
	return expenses.map((expense) => {
		const daysUntilDue = RecurringExpenseService.getDaysUntilNext(
			expense.nextExpectedDate
		);
		const statusColor = RecurringExpenseService.getStatusColor(daysUntilDue);
		const statusText = RecurringExpenseService.getStatusText(daysUntilDue);
		const frequency = RecurringExpenseService.formatFrequency(
			expense.frequency
		);

		return {
			...expense,
			daysUntilDue,
			statusColor,
			statusText,
			formattedFrequency: frequency,
			isOverdue: daysUntilDue < 0,
			isDueSoon: daysUntilDue <= 7 && daysUntilDue >= 0,
			isPaid: false, // Will be updated by the widget
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
		clearError,
	} = useDataFetching<RecurringExpenseWithId>({
		fetchFunction: fetchRecurringExpenses,
		addFunction: addRecurringExpense,
		// Note: update and delete functions are not implemented in the service
		autoRefresh: true,
		refreshOnFocus: true,
		transformData: transformRecurringExpenseData,
	});

	// ==========================================
	// Memoized Recurring Expense Calculations
	// ==========================================
	const expenseCalculations = useMemo(() => {
		// Cast expenses to TransformedRecurringExpense since they are transformed
		const transformedExpenses = expenses as TransformedRecurringExpense[];

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
				return await RecurringExpenseService.markRecurringExpensePaid({
					patternId,
					periodStart,
					periodEnd,
					paymentMethod: 'manual',
					notes: 'Marked as paid via mobile app',
				});
			} catch (error) {
				console.error('Error marking recurring expense as paid:', error);
				throw error;
			}
		},
		[]
	);

	const getPaymentHistory = useCallback(
		async (patternId: string, limit: number = 10) => {
			try {
				return await RecurringExpenseService.getPaymentHistory(
					patternId,
					limit
				);
			} catch (error) {
				console.error('Error getting payment history:', error);
				throw error;
			}
		},
		[]
	);

	const checkPaymentStatus = useCallback(async (patternId: string) => {
		try {
			return await RecurringExpenseService.checkIfCurrentPeriodPaid(patternId);
		} catch (error) {
			console.error('Error checking payment status:', error);
			throw error;
		}
	}, []);

	// ==========================================
	// Additional RecurringExpenseService features
	// ==========================================
	const detectRecurringPatterns = useCallback(async () => {
		return RecurringExpenseService.detectRecurringPatterns();
	}, []);

	const checkUpcomingExpenses = useCallback(async () => {
		return RecurringExpenseService.checkUpcomingRecurringExpenses();
	}, []);

	const processRecurringExpenses = useCallback(async () => {
		return RecurringExpenseService.processRecurringExpenses();
	}, []);

	const cleanupDuplicateExpenses = useCallback(async () => {
		return RecurringExpenseService.cleanupDuplicateExpenses();
	}, []);

	const generateRecurringTransactions = useCallback(
		async (patternId: string, cycles?: number) => {
			return RecurringExpenseService.generateRecurringTransactions({
				patternId,
				cycles,
			});
		},
		[]
	);

	const linkTransactionToRecurring = useCallback(
		async (transactionId: string, patternId: string) => {
			return RecurringExpenseService.linkTransactionToRecurring({
				transactionId,
				patternId,
			});
		},
		[]
	);

	const getPendingRecurringTransactions = useCallback(
		async (limit: number = 50) => {
			return RecurringExpenseService.getPendingRecurringTransactions(limit);
		},
		[]
	);

	const getRecurringTransactionsForPattern = useCallback(
		async (patternId: string, limit: number = 20) => {
			return RecurringExpenseService.getRecurringTransactionsForPattern(
				patternId,
				limit
			);
		},
		[]
	);

	const autoApplyTransactions = useCallback(async () => {
		return RecurringExpenseService.autoApplyTransactions();
	}, []);

	const isCurrentPeriodPaid = useCallback(async (patternId: string) => {
		return RecurringExpenseService.isCurrentPeriodPaid(patternId);
	}, []);

	const checkBatchPaidStatus = useCallback(async (patternIds: string[]) => {
		return RecurringExpenseService.checkBatchPaidStatus(patternIds);
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
		}): Promise<RecurringExpenseWithId> => {
			return addExpenseItem(data as RecurringExpenseWithId);
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
