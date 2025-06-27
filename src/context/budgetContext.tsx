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
	userId?: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface CreateBudgetData {
	category: string;
	allocated: number;
	icon: string;
	color: string;
}

export interface UpdateBudgetData {
	category?: string;
	allocated?: number;
	spent?: number;
	icon?: string;
	color?: string;
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
		// Create a temporary ID for optimistic update
		const tempId = `temp-${Date.now()}-${Math.random()}`;
		const newBudget: Budget = {
			id: tempId,
			...budgetData,
			spent: 0,
		};

		// Optimistically add to UI
		setBudgets((prev) => [newBudget, ...prev]);

		try {
			const response = await ApiService.post<any>('/budgets', budgetData);

			if (response.success && response.data) {
				// Update with the real ID from the server
				const serverBudget: Budget = {
					id: response.data._id ?? response.data.id ?? tempId,
					category: response.data.category,
					allocated: Number(response.data.allocated) || 0,
					spent: Number(response.data.spent) || 0,
					icon: response.data.icon,
					color: response.data.color,
					userId: response.data.userId,
					createdAt: response.data.createdAt,
					updatedAt: response.data.updatedAt,
				};

				// Replace the temporary budget with the real one
				setBudgets((prev) =>
					prev.map((b) => (b.id === tempId ? serverBudget : b))
				);

				return serverBudget;
			} else {
				throw new Error('Failed to create budget');
			}
		} catch (error) {
			// Remove the optimistic budget on error
			setBudgets((prev) => prev.filter((b) => b.id !== tempId));
			throw error;
		}
	}, []);

	const updateBudget = useCallback(
		async (id: string, updates: UpdateBudgetData) => {
			try {
				const response = await ApiService.put<any>(`/budgets/${id}`, updates);

				if (response.success && response.data) {
					const updatedBudget: Budget = {
						id: response.data._id ?? response.data.id,
						category: response.data.category,
						allocated: Number(response.data.allocated) || 0,
						spent: Number(response.data.spent) || 0,
						icon: response.data.icon,
						color: response.data.color,
						userId: response.data.userId,
						createdAt: response.data.createdAt,
						updatedAt: response.data.updatedAt,
					};

					setBudgets((prev) =>
						prev.map((b) => (b.id === id ? updatedBudget : b))
					);

					return updatedBudget;
				} else {
					throw new Error('Failed to update budget');
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

				if (response.success && response.data) {
					const updatedBudget: Budget = {
						id: response.data._id ?? response.data.id,
						category: response.data.category,
						allocated: Number(response.data.allocated) || 0,
						spent: Number(response.data.spent) || 0,
						icon: response.data.icon,
						color: response.data.color,
						userId: response.data.userId,
						createdAt: response.data.createdAt,
						updatedAt: response.data.updatedAt,
					};

					setBudgets((prev) =>
						prev.map((b) => (b.id === updatedBudget.id ? updatedBudget : b))
					);

					return updatedBudget;
				} else {
					throw new Error('Failed to update budget spent');
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
