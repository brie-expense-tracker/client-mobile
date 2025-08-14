import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	useEffect,
	ReactNode,
} from 'react';
import {
	RecurringExpenseService,
	RecurringExpense,
} from '../services/recurringExpenseService';

// ==========================================
// DEPRECATION NOTICE
// ==========================================
// This context is deprecated. Use the useRecurringExpenses hook instead
// for better performance and consistency with other data fetching patterns.
// The hook provides the same functionality with better memoization and
// eliminates duplicate API calls.

interface RecurringExpenseContextType {
	expenses: RecurringExpense[];
	isLoading: boolean;
	hasLoaded: boolean;
	refetch: () => Promise<void>;
	expenseStatuses: Record<
		string,
		{
			hasLinkedTransactions: boolean;
			pendingCount: number;
			completedCount: number;
			latestTransaction: any;
		}
	>;
	summaryStats: {
		totalAmount: number;
		upcomingCount: number;
		overdueCount: number;
		nextDueDate: string | null;
	};
	lastRefreshed: Date | null;
}

const RecurringExpenseContext = createContext<
	RecurringExpenseContextType | undefined
>(undefined);

export const RecurringExpenseProvider: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
	console.warn(
		'[RecurringExpenseContext] This context is deprecated. Use useRecurringExpenses hook instead.'
	);

	const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [hasLoaded, setHasLoaded] = useState(false);
	const [expenseStatuses, setExpenseStatuses] = useState<
		Record<
			string,
			{
				hasLinkedTransactions: boolean;
				pendingCount: number;
				completedCount: number;
				latestTransaction: any;
			}
		>
	>({});
	const [summaryStats, setSummaryStats] = useState({
		totalAmount: 0,
		upcomingCount: 0,
		overdueCount: 0,
		nextDueDate: null as string | null,
	});
	const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

	const refetch = useCallback(async () => {
		try {
			setIsLoading(true);
			console.log('[RecurringExpenseContext] Loading recurring expenses...');

			const data = await RecurringExpenseService.getRecurringExpenses();
			console.log('[RecurringExpenseContext] Received data:', data);
			console.log(
				'[RecurringExpenseContext] Starting payment status checks...'
			);

			setExpenses(data);

			// Load detailed status information for each expense
			const statuses: Record<
				string,
				{
					hasLinkedTransactions: boolean;
					pendingCount: number;
					completedCount: number;
					latestTransaction: any;
				}
			> = {};
			for (const expense of data) {
				try {
					// Check if current period is paid using the correct method
					console.log(
						`[RecurringExpenseContext] Checking payment status for ${expense.patternId}`
					);
					const { isPaid } = await RecurringExpenseService.isCurrentPeriodPaid(
						expense.patternId
					);
					console.log(
						`[RecurringExpenseContext] Payment status for ${expense.patternId}: isPaid = ${isPaid}`
					);

					// Also get transaction info for additional context
					const transactions =
						await RecurringExpenseService.getRecurringTransactionsForPattern(
							expense.patternId,
							5
						);
					const pendingTransactions = transactions.filter(
						(t) => t.status === 'pending'
					);
					const completedTransactions = transactions.filter(
						(t) => t.status === 'completed'
					);

					statuses[expense.patternId] = {
						hasLinkedTransactions: isPaid, // Use the actual payment status
						pendingCount: pendingTransactions.length,
						completedCount: completedTransactions.length,
						latestTransaction: completedTransactions[0] || null,
					};
				} catch (error) {
					console.error(
						`[RecurringExpenseContext] Error loading status for ${expense.patternId}:`,
						error
					);
					statuses[expense.patternId] = {
						hasLinkedTransactions: false,
						pendingCount: 0,
						completedCount: 0,
						latestTransaction: null,
					};
				}
			}
			setExpenseStatuses(statuses);

			// Calculate summary statistics
			const totalAmount = data.reduce(
				(sum, expense) => sum + expense.amount,
				0
			);
			let upcomingCount = 0;
			let overdueCount = 0;
			let nextDueDate: string | null = null;

			data.forEach((expense) => {
				const daysUntilDue = RecurringExpenseService.getDaysUntilNext(
					expense.nextExpectedDate
				);

				if (daysUntilDue <= 0) {
					overdueCount++;
				} else if (daysUntilDue <= 7) {
					upcomingCount++;
				}

				// Find the earliest due date
				if (!nextDueDate || expense.nextExpectedDate < nextDueDate) {
					nextDueDate = expense.nextExpectedDate;
				}
			});

			setSummaryStats({
				totalAmount,
				upcomingCount,
				overdueCount,
				nextDueDate,
			});

			setHasLoaded(true);
			setLastRefreshed(new Date());
		} catch (error) {
			console.error('[RecurringExpenseContext] Error loading expenses:', error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Initial load
	useEffect(() => {
		if (!hasLoaded) {
			refetch();
		}
	}, [refetch, hasLoaded]);

	const value = {
		expenses,
		isLoading,
		hasLoaded,
		refetch,
		expenseStatuses,
		summaryStats,
		lastRefreshed,
	};

	return (
		<RecurringExpenseContext.Provider value={value}>
			{children}
		</RecurringExpenseContext.Provider>
	);
};

// Hook to use recurring expense context
export const useRecurringExpense = () => {
	const context = useContext(RecurringExpenseContext);
	if (context === undefined) {
		throw new Error(
			'useRecurringExpense must be used within a RecurringExpenseProvider'
		);
	}
	return context;
};
