import React, {
	createContext,
	useState,
	useEffect,
	useCallback,
	useMemo,
	ReactNode,
} from 'react';
import axios from 'axios';
import {
	Transaction,
	transactions as localTransactions,
} from '../data/transactions';

interface TransactionContextType {
	transactions: Transaction[];
	isLoading: boolean;
	refetch: () => Promise<void>;
	deleteTransaction: (id: string) => Promise<void>;
}

export const TransactionContext = createContext<TransactionContextType>({
	transactions: [],
	isLoading: true,
	refetch: async () => {},
	deleteTransaction: async () => {},
});

export const TransactionProvider = ({ children }: { children: ReactNode }) => {
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);

	const refetch = useCallback(async () => {
		setIsLoading(true);
		try {
			const resp = await axios.get<Transaction[]>(
				'http://localhost:3000/api/transactions'
			);
			// If you need to massage data, do it here:
			setTransactions(resp.data);
		} catch (err) {
			console.warn(
				'[Ledger] Failed to fetch transactions, using local data',
				err
			);
			// Fallback to local transactions data when API fails
			setTransactions(localTransactions);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const deleteTransaction = useCallback(
		async (id: string) => {
			// Optimistically update UI
			setTransactions((prev) => prev.filter((t) => t.id !== id));

			try {
				await axios.delete(`http://localhost:3000/api/transactions/${id}`);
			} catch (err) {
				console.warn('Delete failed, refetching', err);
				// Rollback or just refetch
				await refetch();
			}
		},
		[refetch]
	);

	useEffect(() => {
		refetch();
	}, [refetch]);

	const value = useMemo(
		() => ({ transactions, isLoading, refetch, deleteTransaction }),
		[transactions, isLoading, refetch, deleteTransaction]
	);

	return (
		<TransactionContext.Provider value={value}>
			{children}
		</TransactionContext.Provider>
	);
};
