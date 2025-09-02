import { useMemo, useCallback } from 'react';
import { useDataFetching } from './useDataFetching';
import { RecurringExpenseService, RecurringExpense } from '../services';

// Extended interface for transformed recurring expense data
export interface TransformedRecurringExpense extends RecurringExpense {
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
const fetchRecurringExpenses = async (): Promise<RecurringExpense[]> => {
	return RecurringExpenseService.getRecurringExpenses();
};

const addRecurringExpense = async (data: {
	vendor: string;
	amount: number;
	frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
	nextExpectedDate: string;
}): Promise<RecurringExpense> => {
	return RecurringExpenseService.createRecurringExpense(data);
};

const updateRecurringExpense = async (
	patternId: string,
	updates: Partial<RecurringExpense>
): Promise<RecurringExpense> => {
	// Note: This would need to be implemented in the service
	throw new Error('Update recurring expense not implemented');
};

const deleteRecurringExpense = async (patternId: string): Promise<void> => {
	// Note: This would need to be implemented in the service
	throw new Error('Delete recurring expense not implemented');
};

// ==========================================
// Recurring expense-specific data transformations
// ==========================================
const transformRecurringExpenseData = (expenses: RecurringExpense[]) => {
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
		updateItem: updateExpenseItem,
		deleteItem: deleteExpenseItem,
		clearError,
	} = useDataFetching<RecurringExpense>({
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
		// Categorize expenses
		const overdueExpenses = expenses.filter((expense) => expense.isOverdue);
		const dueSoonExpenses = expenses.filter((expense) => expense.isDueSoon);
		const upcomingExpenses = expenses.filter(
			(expense) => !expense.isOverdue && !expense.isDueSoon
		);

		// Calculate summary stats
		const totalAmount = expenses.reduce(
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
			expenses.length > 0
				? expenses.reduce((earliest, expense) => {
						const currentDays = expense.daysUntilDue;
						const earliestDays = earliest.daysUntilDue;
						return currentDays < earliestDays ? expense : earliest;
				  }).nextExpectedDate
				: null;

		const summaryStats = {
			totalExpenses: expenses.length,
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
			return RecurringExpenseService.markRecurringExpensePaid({
				patternId,
				periodStart,
				periodEnd,
				paymentMethod: 'manual',
				notes: 'Marked as paid via mobile app',
			});
		},
		[]
	);

	const getPaymentHistory = useCallback(
		async (patternId: string, limit: number = 10) => {
			return RecurringExpenseService.getPaymentHistory(patternId, limit);
		},
		[]
	);

	const checkPaymentStatus = useCallback(async (patternId: string) => {
		return RecurringExpenseService.checkIfCurrentPeriodPaid(patternId);
	}, []);

	// ==========================================
	// Wrapper functions for better API
	// ==========================================
	const addRecurringExpense = useCallback(
		async (data: {
			vendor: string;
			amount: number;
			frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
			nextExpectedDate: string;
		}): Promise<RecurringExpense> => {
			return addExpenseItem(data as RecurringExpense);
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

		// Actions
		refetch,
		addRecurringExpense,
		markAsPaid,
		getPaymentHistory,
		checkPaymentStatus,
		clearError,
	};
}
