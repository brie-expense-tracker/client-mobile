import React, {
	createContext,
	useState,
	useEffect,
	useCallback,
	useMemo,
	useRef,
	ReactNode,
} from 'react';
import { ApiService, BillService } from '../services';
import { useBudget } from './budgetContext';
import { useGoal } from './goalContext';
import { useBills } from './billContext';
import { setCacheInvalidationFlags } from '../services/utility/cacheInvalidationUtils';
import { createLogger } from '../utils/sublogger';

const transactionContextLog = createLogger('TransactionContext');

// Transaction interface defined inline since we removed the mock data file
export interface Transaction {
	id: string;
	description: string;
	amount: number;
	date: string; // ISO string
	type: 'income' | 'expense';
	target?: string; // ObjectId of the target Budget or Goal
	targetModel?: 'Budget' | 'Goal';
	updatedAt?: string; // ISO string for sorting by time when dates are the same
	recurringPattern?: {
		patternId: string;
		frequency: string;
		confidence: number;
		nextExpectedDate: string;
	};
	notes?: string;
	source?: 'manual' | 'plaid' | 'import' | 'ai';
	vendor?: string;
	metadata?: {
		location?: string;
		paymentMethod?: string;
		originalDescription?: string;
	};
}

interface TransactionContextType {
	transactions: Transaction[];
	isLoading: boolean;
	hasLoaded: boolean; // Track if data has been loaded at least once
	refetch: () => Promise<void>;
	refreshTransactions: () => void; // Add this new function
	deleteTransaction: (id: string) => Promise<void>;
	addTransaction: (
		transactionData: Omit<Transaction, 'id'>
	) => Promise<Transaction>;
	updateTransaction: (
		id: string,
		transactionData: Partial<Omit<Transaction, 'id'>>
	) => Promise<Transaction>;
}

export const TransactionContext = createContext<TransactionContextType>({
	transactions: [],
	isLoading: false,
	hasLoaded: false,
	refetch: async () => {},
	refreshTransactions: () => {}, // Add this new function
	deleteTransaction: async () => {},
	addTransaction: async () => {
		throw new Error('addTransaction not implemented');
	},
	updateTransaction: async () => {
		throw new Error('updateTransaction not implemented');
	},
});

export const TransactionProvider = ({ children }: { children: ReactNode }) => {
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false); // Changed from true to false
	const [hasLoaded, setHasLoaded] = useState<boolean>(false); // Track if data has been loaded

	// Get budget, goal, and bill context functions
	const { refetch: refetchBudgets } = useBudget();
	const { refetch: refetchGoals } = useGoal();
	const { refetch: refetchBills } = useBills();

	// Use refs to store the refetch functions to avoid dependency issues
	const refetchBudgetsRef = useRef(refetchBudgets);
	const refetchGoalsRef = useRef(refetchGoals);
	const refetchBillsRef = useRef(refetchBills);

	// Update refs when functions change
	useEffect(() => {
		refetchBudgetsRef.current = refetchBudgets;
	}, [refetchBudgets]);

	useEffect(() => {
		refetchGoalsRef.current = refetchGoals;
	}, [refetchGoals]);

	useEffect(() => {
		refetchBillsRef.current = refetchBills;
	}, [refetchBills]);

	const refetch = useCallback(async () => {
		setIsLoading(true);
		try {
			const response = await ApiService.get<Transaction[]>('/api/transactions');

			if (response.success && response.data) {
				// Handle double-wrapped response
				let transactionArray: any[] = [];
				if (Array.isArray(response.data)) {
					transactionArray = response.data;
				} else if (
					response.data &&
					Array.isArray((response.data as any).data)
				) {
					transactionArray = (response.data as any).data;
				}
				const formatted: Transaction[] = transactionArray.map((tx: any) => {
					// Safely convert amount to number with fallback
					let amount = 0;
					if (tx.amount !== null && tx.amount !== undefined) {
						const parsedAmount = Number(tx.amount);
						amount = isNaN(parsedAmount) ? 0 : parsedAmount;
					}

					// Handle populated target data
					let targetId = undefined;
					let targetModel = undefined;

					if (tx.target) {
						// If target is populated (has _id and other fields), extract the ID
						if (tx.target._id) {
							targetId = tx.target._id;
							targetModel = tx.targetModel;
						} else if (typeof tx.target === 'string') {
							// If target is just an ID string
							targetId = tx.target;
							targetModel = tx.targetModel;
						} else {
							// If target is an object but doesn't have _id, try to find an id field
							const targetKeys = Object.keys(tx.target);
							const idKey = targetKeys.find((key) =>
								key.toLowerCase().includes('id')
							);
							if (idKey && tx.target[idKey]) {
								targetId = tx.target[idKey];
								targetModel = tx.targetModel;
							}
						}
					}

					const transaction = {
						id: tx._id ?? tx.id,
						description: tx.description ?? '',
						amount: amount,
						date: tx.date ?? new Date().toISOString().split('T')[0],
						type: tx.type ?? 'expense',
						target: targetId,
						targetModel: targetModel,
						updatedAt: tx.updatedAt ?? tx.createdAt ?? new Date().toISOString(),
						recurringPattern: tx.recurringPattern
							? {
									patternId: tx.recurringPattern.patternId ?? '',
									frequency: tx.recurringPattern.frequency ?? '',
									confidence: tx.recurringPattern.confidence ?? 0,
									nextExpectedDate:
										tx.recurringPattern.nextExpectedDate ??
										new Date().toISOString(),
							  }
							: undefined,
						notes: tx.notes,
						source: tx.source,
						vendor: tx.vendor,
						metadata: tx.metadata
							? {
									location: tx.metadata.location,
									paymentMethod: tx.metadata.paymentMethod,
									originalDescription: tx.metadata.originalDescription,
							  }
							: undefined,
					};

					return transaction;
				});

				setTransactions(formatted);
				setHasLoaded(true); // Mark as loaded
			} else {
				setTransactions([]);
				setHasLoaded(true); // Mark as loaded even if empty
			}
		} catch (err) {
			transactionContextLog.warn(
				'Failed to fetch transactions, using empty array',
				err
			);
			setTransactions([]);
			setHasLoaded(true); // Mark as loaded even on error
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Helper function to update budgets and goals
	const updateBudgetsAndGoals = useCallback(
		async (transaction: Transaction) => {
			try {
				transactionContextLog.debug(
					'updateBudgetsAndGoals called with transaction',
					{
						id: transaction.id,
						target: transaction.target,
						targetModel: transaction.targetModel,
						type: transaction.type,
						amount: transaction.amount,
					}
				);

				// Only update if transaction has a specific target
				if (transaction.target && transaction.targetModel) {
					if (transaction.targetModel === 'Budget') {
						// Backend now handles budget updates automatically when creating transactions
						// So we just need to refresh the budgets to get the latest data
						transactionContextLog.debug(
							`Backend handled budget update for ${transaction.target}, refreshing budgets...`
						);
						await refetchBudgetsRef.current();
						transactionContextLog.debug('Budgets refreshed successfully');
					} else if (transaction.targetModel === 'Goal') {
						// Backend now handles goal updates automatically when creating transactions
						// So we just need to refresh the goals to get the latest data
						transactionContextLog.debug(
							`Backend handled goal update for ${transaction.target}, refreshing goals...`
						);
						await refetchGoalsRef.current();
						transactionContextLog.debug('Goals refreshed successfully');
					}
				} else {
					transactionContextLog.debug(
						'Transaction has no specific target, skipping budget/goal updates'
					);
				}
			} catch (error) {
				transactionContextLog.error('Error updating budgets and goals', error);
			}
		},
		[] // No dependencies needed since we use refs
	);

	// Sort transactions by date first, then by updatedAt time when dates are the same
	const sortTransactions = useCallback(
		(transactionsToSort: Transaction[]): Transaction[] => {
			return [...transactionsToSort].sort((a, b) => {
				// First, compare by date (newest first)
				const dateA = new Date(a.date);
				const dateB = new Date(b.date);

				if (dateA.getTime() !== dateB.getTime()) {
					return dateB.getTime() - dateA.getTime(); // Newest date first
				}

				// If dates are the same, compare by updatedAt time (newest first)
				const updatedAtA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
				const updatedAtB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);

				return updatedAtB.getTime() - updatedAtA.getTime(); // Newest time first
			});
		},
		[]
	);

	// Memoize the sorted transactions data to prevent unnecessary re-renders
	const memoizedTransactions = useMemo(
		() => sortTransactions(transactions),
		[transactions, sortTransactions]
	);

	const addTransaction = useCallback(
		async (transactionData: Omit<Transaction, 'id'>) => {
			// Create a temporary ID for optimistic update
			const tempId = `temp-${Date.now()}-${Math.random()}`;
			const newTransaction: Transaction = {
				id: tempId,
				...transactionData,
				// Ensure target and targetModel are properly set for optimistic update
				target: transactionData.target || undefined,
				targetModel: transactionData.targetModel || undefined,
				updatedAt: new Date().toISOString(), // Add current timestamp for sorting
			};

			// Optimistically add to UI
			setTransactions((prev) => {
				const updated = [newTransaction, ...prev];
				return updated;
			});

			try {
				const response = await ApiService.post<any>(
					'/api/transactions',
					transactionData
				);

				if (response.success && response.data) {
					// Safely convert amount to number with fallback
					let amount = transactionData.amount;
					if (
						response.data.amount !== null &&
						response.data.amount !== undefined
					) {
						const parsedAmount = Number(response.data.amount);
						amount = isNaN(parsedAmount)
							? transactionData.amount
							: parsedAmount;
					}

					// Handle populated target data from server response
					let targetId = transactionData.target; // Use original data as fallback
					let targetModel = transactionData.targetModel; // Use original data as fallback

					if (response.data.target) {
						// If target is populated (has _id and other fields), extract the ID
						if (response.data.target._id) {
							targetId = response.data.target._id;
							targetModel =
								response.data.targetModel || transactionData.targetModel;
						} else if (typeof response.data.target === 'string') {
							// If target is just an ID string
							targetId = response.data.target;
							targetModel =
								response.data.targetModel || transactionData.targetModel;
						} else {
							// If target is an object but doesn't have _id, try to find an id field
							const targetKeys = Object.keys(response.data.target);
							const idKey = targetKeys.find((key) =>
								key.toLowerCase().includes('id')
							);
							if (idKey && response.data.target[idKey]) {
								targetId = response.data.target[idKey];
								targetModel =
									response.data.targetModel || transactionData.targetModel;
							}
						}
					}

					// Update with the real ID from the server
					const serverTransaction: Transaction = {
						id: response.data._id ?? response.data.id ?? tempId,
						description:
							response.data.description ?? transactionData.description,
						amount: amount,
						date: response.data.date ?? transactionData.date,
						type: response.data.type ?? transactionData.type,
						target: targetId,
						targetModel: targetModel,
						updatedAt:
							response.data.updatedAt ??
							response.data.createdAt ??
							new Date().toISOString(),
						recurringPattern: response.data.recurringPattern
							? {
									patternId: response.data.recurringPattern.patternId ?? '',
									frequency: response.data.recurringPattern.frequency ?? '',
									confidence: response.data.recurringPattern.confidence ?? 0,
									nextExpectedDate:
										response.data.recurringPattern.nextExpectedDate ??
										new Date().toISOString(),
							  }
							: undefined,
						notes: response.data.notes,
						source: response.data.source,
						vendor: response.data.vendor,
						metadata: response.data.metadata
							? {
									location: response.data.metadata.location,
									paymentMethod: response.data.metadata.paymentMethod,
									originalDescription:
										response.data.metadata.originalDescription,
							  }
							: undefined,
					};

					// Replace the temporary transaction with the real one
					setTransactions((prev) => {
						const updated = prev.map((t) =>
							t.id === tempId ? serverTransaction : t
						);
						return updated;
					});

					// Auto-update budgets and goals based on transaction
					await updateBudgetsAndGoals(serverTransaction);

					// Invalidate relevant cache entries
					setCacheInvalidationFlags.onNewTransaction();

					return serverTransaction;
				} else {
					throw new Error('Failed to create transaction');
				}
			} catch (error) {
				// Remove the optimistic transaction on error
				setTransactions((prev) => {
					const updated = prev.filter((t) => t.id !== tempId);
					return updated;
				});
				throw error;
			}
		},
		[updateBudgetsAndGoals]
	);

	const deleteTransaction = useCallback(
		async (id: string) => {
			// Store the transaction being deleted to check if it affects budgets/goals
			const transactionToDelete = transactionsRef.current.find(
				(t) => t.id === id
			);

			// Optimistically update UI
			setTransactions((prev) => prev.filter((t) => t.id !== id));

			try {
				await ApiService.delete(`/api/transactions/${id}`);

				// If the deleted transaction was linked to a bill via recurringPattern.patternId,
				// clear the payment status cache and refetch bills so the bill is no longer marked as paid
				if (transactionToDelete?.recurringPattern?.patternId) {
					const patternId = transactionToDelete.recurringPattern.patternId;
					transactionContextLog.debug(
						`Transaction deleted that was linked to bill patternId ${patternId}, clearing payment status cache and refetching bills...`
					);
					BillService.clearPaymentStatusCache(patternId);
					// Force a fresh pull of bills so "Paid / Unpaid" + nextExpectedDate reflects backend changes
					await refetchBillsRef.current();
				}

				// Refresh budgets and goals if the deleted transaction had a target
				// The backend updates budgets/goals when deleting, so we need to refresh client state
				if (transactionToDelete?.target && transactionToDelete?.targetModel) {
					if (transactionToDelete.targetModel === 'Budget') {
						transactionContextLog.debug(
							`Transaction deleted that affected budget ${transactionToDelete.target}, refreshing budgets...`
						);
						await refetchBudgetsRef.current();
					} else if (transactionToDelete.targetModel === 'Goal') {
						transactionContextLog.debug(
							`Transaction deleted that affected goal ${transactionToDelete.target}, refreshing goals...`
						);
						await refetchGoalsRef.current();
					}
				} else {
					// Even if no specific target, refresh both to ensure consistency
					// (transactions might affect budget calculations even without explicit target)
					await Promise.all([
						refetchBudgetsRef.current(),
						refetchGoalsRef.current(),
					]);
				}

				// Invalidate relevant cache entries
				setCacheInvalidationFlags.onNewTransaction();
			} catch (err) {
				transactionContextLog.warn('Delete failed, refetching', err);
				// Rollback or just refetch
				await refetch();
			}
		},
		[refetch]
	);

	// Use a ref to access current transactions without causing re-renders
	const transactionsRef = useRef<Transaction[]>([]);

	// Update ref whenever transactions change
	useEffect(() => {
		transactionsRef.current = transactions;
	}, [transactions]);

	const updateTransaction = useCallback(
		async (id: string, transactionData: Partial<Omit<Transaction, 'id'>>) => {
			// Store the original transaction for rollback in case of error
			const originalTransaction = transactionsRef.current.find(
				(t) => t.id === id
			);

			// Optimistically update UI
			setTransactions((prev) =>
				prev.map((t) =>
					t.id === id
						? {
								...t,
								...transactionData,
								// Ensure target and targetModel are properly updated
								target:
									transactionData.target !== undefined
										? transactionData.target
										: t.target,
								targetModel:
									transactionData.targetModel !== undefined
										? transactionData.targetModel
										: t.targetModel,
								// Update the updatedAt timestamp for sorting
								updatedAt: new Date().toISOString(),
						  }
						: t
				)
			);

			try {
				const response = await ApiService.put<any>(
					`/api/transactions/${id}`,
					transactionData
				);

				if (response.success && response.data) {
					// Handle populated target data from server response
					let targetId = transactionData.target; // Use update data as fallback
					let targetModel = transactionData.targetModel; // Use update data as fallback

					transactionContextLog.debug('Processing server response', {
						hasTarget: !!response.data.target,
						targetType: typeof response.data.target,
						targetValue: response.data.target,
						targetModel: response.data.targetModel,
						updateDataTarget: transactionData.target,
						updateDataTargetModel: transactionData.targetModel,
					});

					if (response.data.target) {
						transactionContextLog.debug('Target object details', {
							hasId: !!response.data.target._id,
							idValue: response.data.target._id,
							targetKeys: Object.keys(response.data.target),
						});

						// If target is populated (has _id and other fields), extract the ID
						if (response.data.target._id) {
							targetId = response.data.target._id;
							targetModel =
								response.data.targetModel || transactionData.targetModel;
							transactionContextLog.debug(
								'Extracted target from populated object',
								{ targetId, targetModel }
							);
						} else if (typeof response.data.target === 'string') {
							// If target is just an ID string
							targetId = response.data.target;
							targetModel =
								response.data.targetModel || transactionData.targetModel;
							transactionContextLog.debug('Extracted target from ID string', {
								targetId,
								targetModel,
							});
						} else {
							// If target is an object but doesn't have _id, try to find an id field
							const targetKeys = Object.keys(response.data.target);
							const idKey = targetKeys.find((key) =>
								key.toLowerCase().includes('id')
							);
							if (idKey && response.data.target[idKey]) {
								targetId = response.data.target[idKey];
								targetModel =
									response.data.targetModel || transactionData.targetModel;
								transactionContextLog.debug(
									'Extracted target from object with id field',
									{ targetId, targetModel, idKey }
								);
							}
						}
					} else {
						transactionContextLog.debug('No target in response');
					}

					// Fallback: if we still don't have target data, try to get it from the original transactionData
					if (!targetId && transactionData.target) {
						targetId = transactionData.target;
						targetModel = transactionData.targetModel;
						transactionContextLog.debug(
							'Using target data from transactionData',
							{ targetId, targetModel }
						);
					}

					// Additional fallback: check if targetModel is provided but target is missing
					if (
						!targetId &&
						response.data.targetModel &&
						transactionData.target
					) {
						targetId = transactionData.target;
						targetModel = response.data.targetModel;
						transactionContextLog.debug(
							'Using target data from transactionData with targetModel from response',
							{ targetId, targetModel }
						);
					}

					const updatedTransaction: Transaction = {
						id: response.data._id ?? response.data.id ?? id,
						description:
							response.data.description ?? transactionData.description,
						amount: response.data.amount ?? transactionData.amount,
						date: response.data.date ?? transactionData.date,
						type: response.data.type ?? transactionData.type,
						target: targetId,
						targetModel: targetModel,
						updatedAt:
							response.data.updatedAt ??
							response.data.createdAt ??
							new Date().toISOString(),
						recurringPattern: response.data.recurringPattern
							? {
									patternId: response.data.recurringPattern.patternId ?? '',
									frequency: response.data.recurringPattern.frequency ?? '',
									confidence: response.data.recurringPattern.confidence ?? 0,
									nextExpectedDate:
										response.data.recurringPattern.nextExpectedDate ??
										new Date().toISOString(),
							  }
							: undefined,
						notes: response.data.notes,
						source: response.data.source,
						vendor: response.data.vendor,
						metadata: response.data.metadata
							? {
									location: response.data.metadata.location,
									paymentMethod: response.data.metadata.paymentMethod,
									originalDescription:
										response.data.metadata.originalDescription,
							  }
							: undefined,
					};

					transactionContextLog.debug('Updated transaction with target data', {
						targetId,
						targetModel,
						fullResponse: response.data,
					});

					transactionContextLog.debug(
						'Final updatedTransaction',
						updatedTransaction
					);

					// Update the local state with the server response
					setTransactions((prev) =>
						prev.map((t) => (t.id === id ? updatedTransaction : t))
					);

					// Auto-update budgets and goals based on updated transaction
					await updateBudgetsAndGoals(updatedTransaction);

					// Invalidate relevant cache entries
					setCacheInvalidationFlags.onNewTransaction();

					return updatedTransaction;
				} else {
					throw new Error('Failed to update transaction');
				}
			} catch (error) {
				transactionContextLog.error('Error in updateTransaction', error);

				// Rollback to original transaction state on error
				if (originalTransaction) {
					setTransactions((prev) =>
						prev.map((t) => (t.id === id ? originalTransaction : t))
					);
				} else {
					// If we don't have the original, just refetch
					await refetch();
				}

				throw error;
			}
		},
		[refetch, updateBudgetsAndGoals]
	);

	const refreshTransactions = useCallback(() => {
		refetch();
	}, [refetch]);

	useEffect(() => {
		if (!hasLoaded) {
			refetch();
		}
	}, [refetch, hasLoaded]);

	const value = useMemo(
		() => ({
			transactions: memoizedTransactions,
			isLoading,
			hasLoaded,
			refetch,
			refreshTransactions,
			deleteTransaction,
			addTransaction,
			updateTransaction,
		}),
		[
			memoizedTransactions,
			isLoading,
			hasLoaded,
			refetch,
			refreshTransactions,
			deleteTransaction,
			addTransaction,
			updateTransaction,
		]
	);

	return (
		<TransactionContext.Provider value={value}>
			{children}
		</TransactionContext.Provider>
	);
};
