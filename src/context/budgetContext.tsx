import React, {
	createContext,
	useState,
	useEffect,
	useCallback,
	useMemo,
	ReactNode,
	useContext,
} from 'react';
import { ApiService } from '../services/apiService';
import { useProfile } from './profileContext';
import { TransactionContext } from './transactionContext';

// ==========================================
// Types
// ==========================================
export interface Budget {
	id: string;
	userId?: string;
	name: string; // e.g. "Groceries"
	amount: number;
	period: 'weekly' | 'monthly';
	// Optional overrides:
	weekStartDay?: 0 | 1; // 0 = Sunday, 1 = Monday (default can be 0)
	monthStartDay?:
		| 1
		| 2
		| 3
		| 4
		| 5
		| 6
		| 7
		| 8
		| 9
		| 10
		| 11
		| 12
		| 13
		| 14
		| 15
		| 16
		| 17
		| 18
		| 19
		| 20
		| 21
		| 22
		| 23
		| 24
		| 25
		| 26
		| 27
		| 28; // default = 1
	rollover?: boolean; // carry unspent funds forward?
	// Legacy fields for backward compatibility
	spent?: number;
	icon?: string;
	color?: string;
	categories?: string[];
	createdAt?: string;
	updatedAt?: string;
	shouldAlert?: boolean;
	spentPercentage?: number;
}

export interface CreateBudgetData {
	name: string;
	amount: number;
	period: 'weekly' | 'monthly';
	weekStartDay?: 0 | 1;
	monthStartDay?:
		| 1
		| 2
		| 3
		| 4
		| 5
		| 6
		| 7
		| 8
		| 9
		| 10
		| 11
		| 12
		| 13
		| 14
		| 15
		| 16
		| 17
		| 18
		| 19
		| 20
		| 21
		| 22
		| 23
		| 24
		| 25
		| 26
		| 27
		| 28;
	rollover?: boolean;
	// Legacy fields for backward compatibility
	icon?: string;
	color?: string;
	categories?: string[];
}

export interface UpdateBudgetData {
	name?: string;
	amount?: number;
	period?: 'weekly' | 'monthly';
	weekStartDay?: 0 | 1;
	monthStartDay?:
		| 1
		| 2
		| 3
		| 4
		| 5
		| 6
		| 7
		| 8
		| 9
		| 10
		| 11
		| 12
		| 13
		| 14
		| 15
		| 16
		| 17
		| 18
		| 19
		| 20
		| 21
		| 22
		| 23
		| 24
		| 25
		| 26
		| 27
		| 28;
	rollover?: boolean;
	// Legacy fields for backward compatibility
	icon?: string;
	color?: string;
	categories?: string[];
}

interface BudgetContextType {
	budgets: Budget[];
	isLoading: boolean;
	hasLoaded: boolean; // Track if data has been loaded at least once
	refetch: () => Promise<void>;
	addBudget: (budgetData: CreateBudgetData) => Promise<Budget>;
	updateBudget: (id: string, updates: UpdateBudgetData) => Promise<Budget>;
	deleteBudget: (id: string) => Promise<void>;
	updateBudgetSpent: (budgetId: string, amount: number) => Promise<Budget>;
	checkBudgetAlerts: () => Promise<void>;
}

export const BudgetContext = createContext<BudgetContextType>({
	budgets: [],
	isLoading: false,
	hasLoaded: false,
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
	checkBudgetAlerts: async () => {},
});

export const BudgetProvider = ({ children }: { children: ReactNode }) => {
	const [budgets, setBudgets] = useState<Budget[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false); // Changed from true to false
	const [hasLoaded, setHasLoaded] = useState<boolean>(false); // Track if data has been loaded
	const { profile } = useProfile();

	// Get transaction context to refresh transactions when budgets are updated
	const { refreshTransactions } = useContext(TransactionContext);

	const refetch = useCallback(async () => {
		setIsLoading(true);
		try {
			console.log('[Budgets] Fetching budgets from API...');
			const response = await ApiService.get<any>('/budgets');
			console.log('[Budgets] Raw API response:', response);
			console.log('[Budgets] Response data type:', typeof response.data);
			console.log(
				'[Budgets] Response data keys:',
				Object.keys(response.data || {})
			);

			// Handle double-wrapped response from ApiService
			const actualData = response.data?.data || response.data;
			const actualSuccess =
				response.data?.success !== undefined
					? response.data.success
					: response.success;

			console.log('[Budgets] Processed response:', {
				actualSuccess,
				actualData,
			});

			if (actualSuccess && Array.isArray(actualData)) {
				const formatted: Budget[] = actualData.map((budget: any) => ({
					id: budget._id ?? budget.id,
					name: budget.name || budget.category, // Support both new and legacy field names
					amount: Number(budget.amount || budget.allocated) || 0,
					period: budget.period || 'monthly', // Default to monthly if not provided
					weekStartDay: budget.weekStartDay,
					monthStartDay: budget.monthStartDay,
					rollover: budget.rollover,
					// Legacy fields for backward compatibility
					spent: Number(budget.spent) || 0,
					icon: budget.icon,
					color: budget.color,
					categories: Array.isArray(budget.categories) ? budget.categories : [],
					userId: budget.userId,
					createdAt: budget.createdAt,
					updatedAt: budget.updatedAt,
					shouldAlert: budget.shouldAlert || false,
					spentPercentage: budget.spentPercentage || 0,
				}));
				console.log('[Budgets] Formatted budgets:', formatted);
				setBudgets(formatted);
				setHasLoaded(true); // Mark as loaded
			} else {
				console.warn('[Budgets] Unexpected response:', response);
				setBudgets([]);
				setHasLoaded(true); // Mark as loaded even if empty
			}
		} catch (err) {
			console.warn('[Budgets] Failed to fetch budgets, using empty array', err);
			setBudgets([]);
			setHasLoaded(true); // Mark as loaded even on error
		} finally {
			setIsLoading(false);
		}
	}, []);

	const checkBudgetAlerts = useCallback(async () => {
		try {
			console.log('[Budgets] Checking budget alerts...');
			const response = await ApiService.post<any>('/budgets/check-alerts', {});

			if (response.success) {
				console.log('[Budgets] Budget alerts checked:', response.data);
			} else {
				console.warn(
					'[Budgets] Failed to check budget alerts:',
					response.error
				);
			}
		} catch (error) {
			console.error('[Budgets] Error checking budget alerts:', error);
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
			categories: budgetData.categories || [],
			period: budgetData.period || 'monthly',
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
					name: actualData.name || actualData.category, // Support both new and legacy field names
					amount: Number(actualData.amount || actualData.allocated) || 0,
					period: actualData.period || 'monthly', // Default to monthly if not provided
					weekStartDay: actualData.weekStartDay,
					monthStartDay: actualData.monthStartDay,
					rollover: actualData.rollover,
					// Legacy fields for backward compatibility
					spent: Number(actualData.spent) || 0,
					icon: actualData.icon,
					color: actualData.color,
					categories: Array.isArray(actualData.categories)
						? actualData.categories
						: [],
					userId: actualData.userId,
					createdAt: actualData.createdAt,
					updatedAt: actualData.updatedAt,
					shouldAlert: actualData.shouldAlert || false,
					spentPercentage: actualData.spentPercentage || 0,
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
						name: actualData.name || actualData.category, // Support both new and legacy field names
						amount: Number(actualData.amount || actualData.allocated) || 0,
						period: actualData.period || 'monthly', // Default to monthly if not provided
						weekStartDay: actualData.weekStartDay,
						monthStartDay: actualData.monthStartDay,
						rollover: actualData.rollover,
						// Legacy fields for backward compatibility
						spent: Number(actualData.spent) || 0,
						icon: actualData.icon,
						color: actualData.color,
						categories: Array.isArray(actualData.categories)
							? actualData.categories
							: [],
						userId: actualData.userId,
						createdAt: actualData.createdAt,
						updatedAt: actualData.updatedAt,
						shouldAlert: actualData.shouldAlert || false,
						spentPercentage: actualData.spentPercentage || 0,
					};

					setBudgets((prev) =>
						prev.map((b) => (b.id === id ? updatedBudget : b))
					);

					// Refresh transactions to update display names when budget name changes
					refreshTransactions();

					return updatedBudget;
				} else {
					throw new Error(response.error || 'Failed to update budget');
				}
			} catch (error) {
				console.error('Failed to update budget:', error);
				throw error;
			}
		},
		[refreshTransactions]
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
		async (budgetId: string, amount: number) => {
			console.log('[Budgets] updateBudgetSpent called:', { budgetId, amount });
			console.log('[Budgets] Current budgets before update:', budgets);

			try {
				const response = await ApiService.post<any>('/budgets/update-spent', {
					budgetId,
					amount,
				});

				console.log('[Budgets] updateBudgetSpent API response:', response);

				// Handle the response format properly
				const actualData = response.data?.data || response.data;
				const actualSuccess = response.success;

				console.log('[Budgets] Processed response:', {
					actualSuccess,
					actualData,
				});

				if (actualSuccess && actualData) {
					const updatedBudget: Budget = {
						id: actualData._id ?? actualData.id,
						name: actualData.name || actualData.category, // Support both new and legacy field names
						amount: Number(actualData.amount || actualData.allocated) || 0,
						period: actualData.period || 'monthly', // Default to monthly if not provided
						weekStartDay: actualData.weekStartDay,
						monthStartDay: actualData.monthStartDay,
						rollover: actualData.rollover,
						// Legacy fields for backward compatibility
						spent: Number(actualData.spent) || 0,
						icon: actualData.icon,
						color: actualData.color,
						categories: Array.isArray(actualData.categories)
							? actualData.categories
							: [],
						userId: actualData.userId,
						createdAt: actualData.createdAt,
						updatedAt: actualData.updatedAt,
						shouldAlert: actualData.shouldAlert || false,
						spentPercentage: actualData.spentPercentage || 0,
					};

					console.log('[Budgets] Updated budget object:', updatedBudget);

					setBudgets((prev) => {
						const updated = prev.map((b) =>
							b.id === updatedBudget.id ? updatedBudget : b
						);
						console.log('[Budgets] Budgets state after update:', updated);
						return updated;
					});

					return updatedBudget;
				} else {
					console.error('[Budgets] API response indicates failure:', response);
					throw new Error(response.error || 'Failed to update budget spent');
				}
			} catch (error) {
				console.error('Failed to update budget spent:', error);
				throw error;
			}
		},
		[budgets]
	);

	// Load budgets when component mounts
	useEffect(() => {
		if (!hasLoaded) {
			refetch();
		}
	}, [refetch, hasLoaded]);

	const value = useMemo(
		() => ({
			budgets,
			isLoading,
			hasLoaded,
			refetch,
			addBudget,
			updateBudget,
			deleteBudget,
			updateBudgetSpent,
			checkBudgetAlerts,
		}),
		[
			budgets,
			isLoading,
			hasLoaded,
			refetch,
			addBudget,
			updateBudget,
			deleteBudget,
			updateBudgetSpent,
			checkBudgetAlerts,
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
