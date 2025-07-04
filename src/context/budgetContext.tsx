import React, {
	createContext,
	useState,
	useEffect,
	useCallback,
	useMemo,
	ReactNode,
} from 'react';
import { ApiService } from '../services/apiService';

// ==========================================
// Types
// ==========================================
export interface Budget {
	id: string;
	category: string;
	allocated: number;
	spent: number;
	icon: string;
	color: string;
	categories: string[];
	userId?: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface CreateBudgetData {
	category: string;
	allocated: number;
	icon: string;
	color: string;
	categories: string[];
}

export interface UpdateBudgetData {
	category?: string;
	allocated?: number;
	spent?: number;
	icon?: string;
	color?: string;
	categories?: string[];
}

interface BudgetContextType {
	budgets: Budget[];
	isLoading: boolean;
	refetch: () => Promise<void>;
	addBudget: (budgetData: CreateBudgetData) => Promise<Budget>;
	updateBudget: (id: string, updates: UpdateBudgetData) => Promise<Budget>;
	deleteBudget: (id: string) => Promise<void>;
	updateBudgetSpent: (category: string, amount: number) => Promise<Budget>;
}

export const BudgetContext = createContext<BudgetContextType>({
	budgets: [],
	isLoading: true,
	refetch: async () => {},
	addBudget: async () => {
		throw new Error('addBudget not implemented');
	},
	updateBudget: async () => {
		throw new Error('updateBudget not implemented');
	},
	deleteBudget: async () => {},
	updateBudgetSpent: async () => {
		throw new Error('updateBudgetSpent not implemented');
	},
});

export const BudgetProvider = ({ children }: { children: ReactNode }) => {
	const [budgets, setBudgets] = useState<Budget[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);

	const refetch = useCallback(async () => {
		setIsLoading(true);
		try {
			const response = await ApiService.get<any>('/budgets');

			// Handle double-wrapped response from ApiService
			const actualData = response.data?.data || response.data;
			const actualSuccess =
				response.data?.success !== undefined
					? response.data.success
					: response.success;

			if (actualSuccess && Array.isArray(actualData)) {
				const formatted: Budget[] = actualData.map((budget: any) => ({
					id: budget._id ?? budget.id,
					category: budget.category,
					allocated: Number(budget.allocated) || 0,
					spent: Number(budget.spent) || 0,
					icon: budget.icon,
					color: budget.color,
					categories: Array.isArray(budget.categories) ? budget.categories : [],
					userId: budget.userId,
					createdAt: budget.createdAt,
					updatedAt: budget.updatedAt,
				}));
				setBudgets(formatted);
			} else {
				console.warn('[Budgets] Unexpected response:', response);
				setBudgets([]);
			}
		} catch (err) {
			console.warn('[Budgets] Failed to fetch budgets, using empty array', err);
			setBudgets([]);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const addBudget = useCallback(async (budgetData: CreateBudgetData) => {
		console.log('addBudget called with:', budgetData);

		// Create a temporary ID for optimistic update
		const tempId = `temp-${Date.now()}-${Math.random()}`;
		const newBudget: Budget = {
			id: tempId,
			...budgetData,
			spent: 0,
		};

		console.log('Optimistic budget created:', newBudget);

		// Optimistically add to UI
		setBudgets((prev) => {
			const updated = [newBudget, ...prev];
			console.log('Updated budgets state (optimistic):', updated);
			return updated;
		});

		try {
			const response = await ApiService.post<any>('/budgets', budgetData);
			console.log('API response:', response);

			// Handle the response format properly
			const actualData = response.data?.data || response.data;
			const actualSuccess = response.success;

			console.log('Processed response:', { actualSuccess, actualData });

			if (actualSuccess && actualData) {
				// Update with the real ID from the server
				const serverBudget: Budget = {
					id: actualData._id ?? actualData.id ?? tempId,
					category: actualData.category,
					allocated: Number(actualData.allocated) || 0,
					spent: Number(actualData.spent) || 0,
					icon: actualData.icon,
					color: actualData.color,
					categories: Array.isArray(actualData.categories)
						? actualData.categories
						: [],
					userId: actualData.userId,
					createdAt: actualData.createdAt,
					updatedAt: actualData.updatedAt,
				};

				console.log('Server budget created:', serverBudget);

				// Replace the temporary budget with the real one
				setBudgets((prev) => {
					const updated = prev.map((b) => (b.id === tempId ? serverBudget : b));
					console.log('Updated budgets state (server):', updated);
					return updated;
				});

				return serverBudget;
			} else {
				// If the response doesn't indicate success, throw an error
				throw new Error(response.error || 'Failed to create budget');
			}
		} catch (error) {
			// Remove the optimistic budget on error
			setBudgets((prev) => {
				const updated = prev.filter((b) => b.id !== tempId);
				console.log('Removed optimistic budget on error:', updated);
				return updated;
			});
			console.error('Error adding budget:', error);
			throw error;
		}
	}, []);

	const updateBudget = useCallback(
		async (id: string, updates: UpdateBudgetData) => {
			try {
				const response = await ApiService.put<any>(`/budgets/${id}`, updates);

				// Handle the response format properly
				const actualData = response.data?.data || response.data;
				const actualSuccess = response.success;

				if (actualSuccess && actualData) {
					const updatedBudget: Budget = {
						id: actualData._id ?? actualData.id,
						category: actualData.category,
						allocated: Number(actualData.allocated) || 0,
						spent: Number(actualData.spent) || 0,
						icon: actualData.icon,
						color: actualData.color,
						categories: Array.isArray(actualData.categories)
							? actualData.categories
							: [],
						userId: actualData.userId,
						createdAt: actualData.createdAt,
						updatedAt: actualData.updatedAt,
					};

					setBudgets((prev) =>
						prev.map((b) => (b.id === id ? updatedBudget : b))
					);

					return updatedBudget;
				} else {
					throw new Error(response.error || 'Failed to update budget');
				}
			} catch (error) {
				console.error('Failed to update budget:', error);
				throw error;
			}
		},
		[]
	);

	const deleteBudget = useCallback(
		async (id: string) => {
			// Optimistically update UI
			setBudgets((prev) => prev.filter((b) => b.id !== id));

			try {
				await ApiService.delete(`/budgets/${id}`);
			} catch (err) {
				console.warn('Delete failed, refetching', err);
				// Rollback or just refetch
				await refetch();
			}
		},
		[refetch]
	);

	const updateBudgetSpent = useCallback(
		async (category: string, amount: number) => {
			try {
				const response = await ApiService.post<any>('/budgets/update-spent', {
					category,
					amount,
				});

				// Handle the response format properly
				const actualData = response.data?.data || response.data;
				const actualSuccess = response.success;

				if (actualSuccess && actualData) {
					const updatedBudget: Budget = {
						id: actualData._id ?? actualData.id,
						category: actualData.category,
						allocated: Number(actualData.allocated) || 0,
						spent: Number(actualData.spent) || 0,
						icon: actualData.icon,
						color: actualData.color,
						categories: Array.isArray(actualData.categories)
							? actualData.categories
							: [],
						userId: actualData.userId,
						createdAt: actualData.createdAt,
						updatedAt: actualData.updatedAt,
					};

					setBudgets((prev) =>
						prev.map((b) => (b.id === updatedBudget.id ? updatedBudget : b))
					);

					return updatedBudget;
				} else {
					throw new Error(response.error || 'Failed to update budget spent');
				}
			} catch (error) {
				console.error('Failed to update budget spent:', error);
				throw error;
			}
		},
		[]
	);

	useEffect(() => {
		refetch();
	}, [refetch]);

	const value = useMemo(
		() => ({
			budgets,
			isLoading,
			refetch,
			addBudget,
			updateBudget,
			deleteBudget,
			updateBudgetSpent,
		}),
		[
			budgets,
			isLoading,
			refetch,
			addBudget,
			updateBudget,
			deleteBudget,
			updateBudgetSpent,
		]
	);

	return (
		<BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
	);
};

// Hook to use budget context
export const useBudget = () => {
	const context = React.useContext(BudgetContext);
	if (context === undefined) {
		throw new Error('useBudget must be used within a BudgetProvider');
	}
	return context;
};
