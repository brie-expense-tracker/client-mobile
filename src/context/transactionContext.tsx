import React, {
	createContext,
	useState,
	useEffect,
	useCallback,
	useMemo,
	useRef,
	ReactNode,
} from 'react';
// Transaction interface defined inline since we removed the mock data file
interface Transaction {
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
}
import { ApiService } from '../services';
import { useBudget } from './budgetContext';
import { useGoal } from './goalContext';

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

	// Get budget and goal context functions
	const { refetch: refetchBudgets } = useBudget();
	const { refetch: refetchGoals } = useGoal();

	// Use refs to store the refetch functions to avoid dependency issues
	const refetchBudgetsRef = useRef(refetchBudgets);
	const refetchGoalsRef = useRef(refetchGoals);

	// Update refs when functions change
	useEffect(() => {
		refetchBudgetsRef.current = refetchBudgets;
	}, [refetchBudgets]);

	useEffect(() => {
		refetchGoalsRef.current = refetchGoals;
	}, [refetchGoals]);

	const refetch = useCallback(async () => {
		console.log('[TransactionContext] refetch called');
		setIsLoading(true);
		try {
			const response = await ApiService.get<Transaction[]>('/transactions');
			console.log('[TransactionContext] API response received:', response);

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

					console.log('[TransactionContext] Transaction target processing:', {
						transactionId: tx._id ?? tx.id,
						description: tx.description,
						originalTarget: tx.target,
						originalTargetModel: tx.targetModel,
						extractedTargetId: targetId,
						extractedTargetModel: targetModel,
					});

					return {
						id: tx._id ?? tx.id,
						description: tx.description ?? '',
						amount: amount,
						date: tx.date ?? new Date().toISOString().split('T')[0],
						type: tx.type ?? 'expense',
						target: targetId,
						targetModel: targetModel,
						updatedAt: tx.updatedAt ?? tx.createdAt ?? new Date().toISOString(),
					};
				});
				console.log(
					'[TransactionContext] Formatted transactions:',
					formatted.map((t) => ({
						id: t.id,
						description: t.description,
						target: t.target,
						targetModel: t.targetModel,
					}))
				);
				setTransactions(formatted);
				setHasLoaded(true); // Mark as loaded
			} else {
				setTransactions([]);
				setHasLoaded(true); // Mark as loaded even if empty
			}
		} catch (err) {
			console.warn(
				'[Transactions] Failed to fetch transactions, using empty array',
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
				console.log(
					'[TransactionContext] updateBudgetsAndGoals called with transaction:',
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
						console.log(
							`[TransactionContext] Backend handled budget update for ${transaction.target}, refreshing budgets...`
						);
						await refetchBudgetsRef.current();
						console.log('[TransactionContext] Budgets refreshed successfully');
					} else if (transaction.targetModel === 'Goal') {
						// Backend now handles goal updates automatically when creating transactions
						// So we just need to refresh the goals to get the latest data
						console.log(
							`[TransactionContext] Backend handled goal update for ${transaction.target}, refreshing goals...`
						);
						await refetchGoalsRef.current();
						console.log('[TransactionContext] Goals refreshed successfully');
					}
				} else {
					console.log(
						'Transaction has no specific target, skipping budget/goal updates'
					);
				}
			} catch (error) {
				console.error('Error updating budgets and goals:', error);
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
			console.log(
				'[TransactionContext] addTransaction called with:',
				transactionData
			);

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

			console.log(
				'[TransactionContext] Optimistic transaction:',
				newTransaction
			);

			// Optimistically add to UI
			setTransactions((prev) => {
				const updated = [newTransaction, ...prev];
				console.log(
					'[TransactionContext] Optimistic update - transactions count:',
					updated.length
				);
				return updated;
			});

			try {
				const response = await ApiService.post<any>(
					'/transactions',
					transactionData
				);

				console.log('[TransactionContext] API response:', response);

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

					console.log('[TransactionContext] Target processing result:', {
						originalTarget: transactionData.target,
						originalTargetModel: transactionData.targetModel,
						finalTargetId: targetId,
						finalTargetModel: targetModel,
						responseTarget: response.data.target,
						responseTargetModel: response.data.targetModel,
					});

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
					};

					console.log(
						'[TransactionContext] Server transaction:',
						serverTransaction
					);
					console.log(
						'[TransactionContext] Original transaction data:',
						transactionData
					);

					// Replace the temporary transaction with the real one
					setTransactions((prev) => {
						const updated = prev.map((t) =>
							t.id === tempId ? serverTransaction : t
						);
						console.log(
							'[TransactionContext] Server update - transactions count:',
							updated.length
						);
						return updated;
					});

					// Auto-update budgets and goals based on transaction
					console.log('[TransactionContext] Updating budgets and goals...');
					await updateBudgetsAndGoals(serverTransaction);

					return serverTransaction;
				} else {
					throw new Error('Failed to create transaction');
				}
			} catch (error) {
				// Remove the optimistic transaction on error
				setTransactions((prev) => {
					const updated = prev.filter((t) => t.id !== tempId);
					console.log(
						'[TransactionContext] Error cleanup - transactions count:',
						updated.length
					);
					return updated;
				});
				throw error;
			}
		},
		[updateBudgetsAndGoals]
	);

	const deleteTransaction = useCallback(
		async (id: string) => {
			// Optimistically update UI
			setTransactions((prev) => prev.filter((t) => t.id !== id));

			try {
				await ApiService.delete(`/transactions/${id}`);
			} catch (err) {
				console.warn('Delete failed, refetching', err);
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
					`/transactions/${id}`,
					transactionData
				);

				if (response.success && response.data) {
					// Handle populated target data from server response
					let targetId = transactionData.target; // Use update data as fallback
					let targetModel = transactionData.targetModel; // Use update data as fallback

					console.log('[TransactionContext] Processing server response:', {
						hasTarget: !!response.data.target,
						targetType: typeof response.data.target,
						targetValue: response.data.target,
						targetModel: response.data.targetModel,
						updateDataTarget: transactionData.target,
						updateDataTargetModel: transactionData.targetModel,
					});

					if (response.data.target) {
						console.log('[TransactionContext] Target object details:', {
							hasId: !!response.data.target._id,
							idValue: response.data.target._id,
							targetKeys: Object.keys(response.data.target),
						});

						// If target is populated (has _id and other fields), extract the ID
						if (response.data.target._id) {
							targetId = response.data.target._id;
							targetModel =
								response.data.targetModel || transactionData.targetModel;
							console.log(
								'[TransactionContext] Extracted target from populated object:',
								{ targetId, targetModel }
							);
						} else if (typeof response.data.target === 'string') {
							// If target is just an ID string
							targetId = response.data.target;
							targetModel =
								response.data.targetModel || transactionData.targetModel;
							console.log(
								'[TransactionContext] Extracted target from ID string:',
								{ targetId, targetModel }
							);
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
								console.log(
									'[TransactionContext] Extracted target from object with id field:',
									{ targetId, targetModel, idKey }
								);
							}
						}
					} else {
						console.log('[TransactionContext] No target in response');
					}

					// Fallback: if we still don't have target data, try to get it from the original transactionData
					if (!targetId && transactionData.target) {
						targetId = transactionData.target;
						targetModel = transactionData.targetModel;
						console.log(
							'[TransactionContext] Using target data from transactionData:',
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
						console.log(
							'[TransactionContext] Using target data from transactionData with targetModel from response:',
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
					};

					console.log(
						'[TransactionContext] Updated transaction with target data:',
						{
							targetId,
							targetModel,
							fullResponse: response.data,
						}
					);

					console.log(
						'[TransactionContext] Final updatedTransaction:',
						updatedTransaction
					);

					// Update the local state with the server response
					setTransactions((prev) =>
						prev.map((t) => (t.id === id ? updatedTransaction : t))
					);

					// Auto-update budgets and goals based on updated transaction
					await updateBudgetsAndGoals(updatedTransaction);

					return updatedTransaction;
				} else {
					throw new Error('Failed to update transaction');
				}
			} catch (error) {
				console.error('Error in updateTransaction:', error);

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
