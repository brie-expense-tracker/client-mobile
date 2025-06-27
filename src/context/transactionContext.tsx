import React, {
	createContext,
	useState,
	useEffect,
	useCallback,
	useMemo,
	ReactNode,
} from 'react';
import { Transaction } from '../data/transactions';
import { ApiService } from '../services/apiService';
import {
	Category,
	transactions as localTransactions,
} from '../data/transactions';

interface TransactionContextType {
	transactions: Transaction[];
	categories: Category[];
	isLoading: boolean;
	categoriesLoading: boolean;
	refetch: () => Promise<void>;
	refetchCategories: () => Promise<void>;
	deleteTransaction: (id: string) => Promise<void>;
	addTransaction: (
		transactionData: Omit<Transaction, 'id'>
	) => Promise<Transaction>;
	// Category management
	getCategories: () => Category[];
	addCategory: (category: Category) => Promise<Category>;
	deleteCategory: (categoryId: string) => Promise<void>;
	updateCategory: (
		categoryId: string,
		updates: Partial<Category>
	) => Promise<Category>;
}

export const TransactionContext = createContext<TransactionContextType>({
	transactions: [],
	categories: [],
	isLoading: true,
	categoriesLoading: true,
	refetch: async () => {},
	refetchCategories: async () => {},
	deleteTransaction: async () => {},
	addTransaction: async () => {
		throw new Error('addTransaction not implemented');
	},
	getCategories: () => [],
	addCategory: async () => {
		throw new Error('addCategory not implemented');
	},
	deleteCategory: async () => {},
	updateCategory: async () => {
		throw new Error('updateCategory not implemented');
	},
});

export const TransactionProvider = ({ children }: { children: ReactNode }) => {
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [categoriesLoading, setCategoriesLoading] = useState<boolean>(true);

	const refetch = useCallback(async () => {
		setIsLoading(true);
		try {
			const response = await ApiService.get<Transaction[]>('/transactions');
			if (response.success && response.data) {
				const formatted: Transaction[] = response.data.map((tx: any) => {
					// Safely convert amount to number with fallback
					let amount = 0;
					if (tx.amount !== null && tx.amount !== undefined) {
						const parsedAmount = Number(tx.amount);
						amount = isNaN(parsedAmount) ? 0 : parsedAmount;
					}

					return {
						id: tx._id ?? tx.id,
						description: tx.description ?? '',
						amount: amount,
						date: tx.date ?? new Date().toISOString().split('T')[0],
						categories: Array.isArray(tx.categories)
							? tx.categories.map((cat: any) => ({
									name: cat.name ?? 'Other',
									type: cat.type ?? 'expense',
							  }))
							: [{ name: 'Other', type: 'expense' }],
						type: tx.type ?? 'expense',
					};
				});
				setTransactions(formatted);
			}
		} catch (err) {
			console.warn(
				'[Transactions] Failed to fetch transactions, using empty array',
				err
			);
			setTransactions([]);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const refetchCategories = useCallback(async () => {
		setCategoriesLoading(true);
		try {
			const response = await ApiService.get<Category[]>('/categories');
			if (response.success && response.data) {
				const formatted: Category[] = response.data.map((cat: any) => ({
					id: cat._id ?? cat.id,
					name: cat.name,
					type: cat.type,
					color: cat.color,
					icon: cat.icon,
					isDefault: cat.isDefault,
				}));
				setCategories(formatted);
			}
		} catch (err) {
			console.warn(
				'[Categories] Failed to fetch categories, using empty array',
				err
			);
			setCategories([]);
		} finally {
			setCategoriesLoading(false);
		}
	}, []);

	const addTransaction = useCallback(
		async (transactionData: Omit<Transaction, 'id'>) => {
			// Create a temporary ID for optimistic update
			const tempId = `temp-${Date.now()}-${Math.random()}`;
			const newTransaction: Transaction = {
				id: tempId,
				...transactionData,
			};

			// Optimistically add to UI
			setTransactions((prev) => [newTransaction, ...prev]);

			try {
				const response = await ApiService.post<any>(
					'/transactions',
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

					// Update with the real ID from the server
					const serverTransaction: Transaction = {
						id: response.data._id ?? response.data.id ?? tempId,
						description:
							response.data.description ?? transactionData.description,
						amount: amount,
						date: response.data.date ?? transactionData.date,
						categories: Array.isArray(response.data.categories)
							? response.data.categories.map((cat: any) => ({
									name: cat.name ?? 'Other',
									type: cat.type ?? 'expense',
							  }))
							: transactionData.categories,
						type: response.data.type ?? transactionData.type,
					};

					// Replace the temporary transaction with the real one
					setTransactions((prev) =>
						prev.map((t) => (t.id === tempId ? serverTransaction : t))
					);

					return serverTransaction;
				} else {
					throw new Error('Failed to create transaction');
				}
			} catch (error) {
				// Remove the optimistic transaction on error
				setTransactions((prev) => prev.filter((t) => t.id !== tempId));
				throw error;
			}
		},
		[]
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

	// Category management functions
	const getCategories = useCallback(() => {
		return categories;
	}, [categories]);

	const addCategory = useCallback(async (category: Category) => {
		try {
			const response = await ApiService.post<any>('/categories', {
				name: category.name,
				type: category.type,
				color: category.color,
				icon: category.icon,
			});

			if (response.success && response.data) {
				const newCategory: Category = {
					id: response.data._id,
					name: response.data.name,
					type: response.data.type,
					color: response.data.color,
					icon: response.data.icon,
					isDefault: response.data.isDefault,
				};

				setCategories((prev) => [...prev, newCategory]);
				return newCategory;
			} else {
				throw new Error('Failed to create category');
			}
		} catch (error) {
			console.error('Failed to add category:', error);
			throw error;
		}
	}, []);

	const updateCategory = useCallback(
		async (categoryId: string, updates: Partial<Category>) => {
			try {
				const response = await ApiService.put<any>(
					`/categories/${categoryId}`,
					updates
				);

				if (response.success && response.data) {
					const updatedCategory: Category = {
						id: response.data._id,
						name: response.data.name,
						type: response.data.type,
						color: response.data.color,
						icon: response.data.icon,
						isDefault: response.data.isDefault,
					};

					setCategories((prev) =>
						prev.map((cat) => (cat.id === categoryId ? updatedCategory : cat))
					);

					return updatedCategory;
				} else {
					throw new Error('Failed to update category');
				}
			} catch (error) {
				console.error('Failed to update category:', error);
				throw error;
			}
		},
		[]
	);

	const deleteCategory = useCallback(async (categoryId: string) => {
		try {
			await ApiService.delete(`/categories/${categoryId}`);
			setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
		} catch (error) {
			console.error('Failed to delete category:', error);
			throw error;
		}
	}, []);

	useEffect(() => {
		refetch();
		refetchCategories();
	}, [refetch, refetchCategories]);

	const value = useMemo(
		() => ({
			transactions,
			categories,
			isLoading,
			categoriesLoading,
			refetch,
			refetchCategories,
			deleteTransaction,
			addTransaction,
			getCategories,
			addCategory,
			deleteCategory,
			updateCategory,
		}),
		[
			transactions,
			categories,
			isLoading,
			categoriesLoading,
			refetch,
			refetchCategories,
			deleteTransaction,
			addTransaction,
			getCategories,
			addCategory,
			deleteCategory,
			updateCategory,
		]
	);

	return (
		<TransactionContext.Provider value={value}>
			{children}
		</TransactionContext.Provider>
	);
};
