/**
 * Local-only TransactionProvider for MVP no-login mode.
 * Data stays on device. Same API as TransactionContext for drop-in replacement.
 */
import React, {
	createContext,
	useState,
	useEffect,
	useCallback,
	useMemo,
	ReactNode,
} from 'react';
import {
	TransactionContext,
	type Transaction,
	TransactionContextType,
} from './transactionContext';
import {
	loadTransactions,
	saveTransactions,
	generateLocalId,
} from '../storage/localTransactionStorage';

function sortTransactions(transactions: Transaction[]): Transaction[] {
	return [...transactions].sort((a, b) => {
		const dateA = new Date(a.date);
		const dateB = new Date(b.date);
		if (dateA.getTime() !== dateB.getTime()) {
			return dateB.getTime() - dateA.getTime();
		}
		const updatedAtA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
		const updatedAtB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
		return updatedAtB.getTime() - updatedAtA.getTime();
	});
}

export function LocalTransactionProvider({ children }: { children: ReactNode }) {
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [hasLoaded, setHasLoaded] = useState(false);

	const refetch = useCallback(async () => {
		setIsLoading(true);
		try {
			const loaded = await loadTransactions();
			setTransactions(sortTransactions(loaded));
			setHasLoaded(true);
		} catch (err) {
			console.warn('[LocalTransactionProvider] refetch failed:', err);
			setHasLoaded(true);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		refetch();
	}, [refetch]);

	const addTransaction = useCallback(
		async (transactionData: Omit<Transaction, 'id'>) => {
			const id = generateLocalId();
			const newTx: Transaction = {
				id,
				...transactionData,
				updatedAt: new Date().toISOString(),
			};

			setTransactions((prev) => {
				const next = [newTx, ...prev];
				saveTransactions(next).catch(console.warn);
				return sortTransactions(next);
			});

			return newTx;
		},
		[]
	);

	const updateTransaction = useCallback(
		async (id: string, updates: Partial<Omit<Transaction, 'id'>>) => {
			let updatedTx: Transaction | null = null;
			setTransactions((prev) => {
				const next = prev.map((t) => {
					if (t.id !== id) return t;
					updatedTx = {
						...t,
						...updates,
						updatedAt: new Date().toISOString(),
					};
					return updatedTx;
				});
				saveTransactions(next).catch(console.warn);
				return sortTransactions(next);
			});
			return updatedTx!;
		},
		[]
	);

	const deleteTransaction = useCallback(async (id: string) => {
		setTransactions((prev) => {
			const next = prev.filter((t) => t.id !== id);
			saveTransactions(next).catch(console.warn);
			return next;
		});
	}, []);

	const memoizedTransactions = useMemo(
		() => sortTransactions(transactions),
		[transactions]
	);

	const value: TransactionContextType = useMemo(
		() => ({
			transactions: memoizedTransactions,
			isLoading,
			hasLoaded,
			refetch,
			refreshTransactions: refetch,
			deleteTransaction,
			addTransaction,
			updateTransaction,
		}),
		[
			memoizedTransactions,
			isLoading,
			hasLoaded,
			refetch,
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
}
