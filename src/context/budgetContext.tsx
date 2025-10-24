import React, {
	createContext,
	useState,
	useEffect,
	useCallback,
	useMemo,
	ReactNode,
} from 'react';
import { ApiService } from '../services';
import { setCacheInvalidationFlags } from '../services/utility/cacheInvalidationUtils';

// ==========================================
// Utilities
// ==========================================

/**
 * Normalize budget ID - handles both MongoDB _id and client id
 * Use this everywhere for consistent ID access
 */
export const getBudgetId = (b: { id?: string; _id?: string }): string => {
	return (b.id ?? (b as any)._id)!;
};

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

export interface BudgetSummary {
	totalBudgets: number;
	totalAllocated: number;
	totalSpent: number;
	totalRemaining: number;
	averageUtilization: number;
	overBudgetCount: number;
	underBudgetCount: number;
	onTrackCount: number;
	monthlyBudgets: number;
	weeklyBudgets: number;
}

export interface BudgetFilter {
	period?: 'weekly' | 'monthly';
	categories?: string[];
	utilizationRange?: {
		min: number;
		max: number;
	};
	overBudget?: boolean;
	underBudget?: boolean;
	searchTerm?: string;
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
	getBudgetSummary: () => BudgetSummary;
	getBudgetUtilization: (budgetId: string) => number;
	getOverBudgetBudgets: () => Budget[];
	getUnderBudgetBudgets: () => Budget[];
	filterBudgets: (filter: BudgetFilter) => Budget[];
	getAllCategories: () => string[];
	getBudgetsByCategory: (category: string) => Budget[];
	// Summary calculations (computed from budgets)
	monthlySummary: { totalAllocated: number; totalSpent: number };
	weeklySummary: { totalAllocated: number; totalSpent: number };
	monthlyPercentage: number;
	weeklyPercentage: number;
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
	getBudgetSummary: () => ({
		totalBudgets: 0,
		totalAllocated: 0,
		totalSpent: 0,
		totalRemaining: 0,
		averageUtilization: 0,
		overBudgetCount: 0,
		underBudgetCount: 0,
		onTrackCount: 0,
		monthlyBudgets: 0,
		weeklyBudgets: 0,
	}),
	getBudgetUtilization: () => 0,
	getOverBudgetBudgets: () => [],
	getUnderBudgetBudgets: () => [],
	filterBudgets: () => [],
	getAllCategories: () => [],
	getBudgetsByCategory: () => [],
	// Summary calculations
	monthlySummary: { totalAllocated: 0, totalSpent: 0 },
	weeklySummary: { totalAllocated: 0, totalSpent: 0 },
	monthlyPercentage: 0,
	weeklyPercentage: 0,
});

export const BudgetProvider = ({ children }: { children: ReactNode }) => {
	const [budgets, setBudgets] = useState<Budget[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false); // Changed from true to false
	const [hasLoaded, setHasLoaded] = useState<boolean>(false); // Track if data has been loaded

	// Abort controller for cancelling stale fetches
	const abortControllerRef = React.useRef<AbortController | null>(null);

	// Note: Transaction refresh is handled by the transaction context itself
	// when budgets are updated via the API

	const refetch = useCallback(async () => {
		// Cancel any in-flight request
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}

		// Create new abort controller for this fetch
		abortControllerRef.current = new AbortController();

		setIsLoading(true);
		try {
			const response = await ApiService.get<any>('/api/budgets');

			// Handle double-wrapped response from ApiService
			const actualData = response.data?.data || response.data;
			const actualSuccess =
				response.data?.success !== undefined
					? response.data.success
					: response.success;

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
				// Use functional update to avoid dropping concurrent optimistic updates
				setBudgets(() => formatted);
				setHasLoaded(true); // Mark as loaded
			} else {
				console.warn('[Budgets] Unexpected response:', response);
				setBudgets(() => []);
				setHasLoaded(true); // Mark as loaded even if empty
			}
		} catch (err: any) {
			// Ignore abort errors (expected when a new fetch cancels the old one)
			if (err?.name === 'AbortError') {
				return;
			}
			console.warn('[Budgets] Failed to fetch budgets, using empty array', err);
			setBudgets(() => []);
			setHasLoaded(true); // Mark as loaded even on error
		} finally {
			setIsLoading(false);
			// Clean up abort controller
			abortControllerRef.current = null;
		}
	}, []);

	const checkBudgetAlerts = useCallback(async () => {
		try {
			const response = await ApiService.post<any>(
				'/api/budgets/check-alerts',
				{}
			);

			if (response.success) {
				// Budget alerts checked successfully
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
		// Create a temporary ID for optimistic update
		const tempId = `temp-${Date.now()}-${Math.random()}`;
		const newBudget: Budget = {
			id: tempId,
			...budgetData,
			spent: 0,
			categories: budgetData.categories || [],
			period: budgetData.period || 'monthly',
		};

		// Optimistically add to UI
		setBudgets((prev) => {
			const updated = [newBudget, ...prev];
			console.log('Updated budgets state (optimistic):', updated);
			return updated;
		});

		try {
			const response = await ApiService.post<any>('/api/budgets', budgetData);
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
					// Check if temp budget still exists (might have been removed by another operation)
					const hasTempBudget = prev.some((b) => b.id === tempId);
					if (!hasTempBudget) {
						console.warn(
							'⚠️ [BudgetContext] Temp budget already removed, adding server budget'
						);
						return [serverBudget, ...prev];
					}

					const updated = prev.map((b) => (b.id === tempId ? serverBudget : b));
					console.log(
						'✅ [BudgetContext] Replaced temp budget with server budget:',
						{
							tempId,
							realId: serverBudget.id,
							count: updated.length,
						}
					);
					return updated;
				});

				// Invalidate relevant cache entries
				setCacheInvalidationFlags.onBudgetChange();
				ApiService.clearCacheByPrefix('/api/budgets');

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
				const response = await ApiService.put<any>(
					`/api/budgets/${id}`,
					updates
				);

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

					// Note: Transaction refresh is handled by the transaction context itself
					// when budgets are updated via the API

					// Invalidate relevant cache entries
					setCacheInvalidationFlags.onBudgetChange();
					ApiService.clearCacheByPrefix('/api/budgets');

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

			// Save previous state for rollback
			let previousBudgets: Budget[] = [];
			setBudgets((prev) => {
				previousBudgets = prev;
				// Optimistically remove from UI
				return prev.filter((b) => getBudgetId(b) !== id);
			});

			try {
				const result = await ApiService.delete(`/api/budgets/${id}`);

				if (!result.success) {
					// Parse structured error from server
					const errorData = result.data as any;
					const errorCode = errorData?.error || 'Unknown';
					const errorMessage = result.error || 'Delete failed';

					console.error('❌ [BudgetContext] Server error:', {
						code: errorCode,
						message: errorMessage,
						data: errorData,
					});

					// Map error codes to user-friendly messages
					if (errorCode === 'BudgetInUse') {
						throw new Error(
							'This budget has linked transactions. Please remove or reassign those transactions before deleting the budget.'
						);
					} else if (errorCode === 'BudgetNotFound') {
						throw new Error('Budget not found or already deleted.');
					} else if (errorCode === 'InvalidBudgetId') {
						throw new Error('Invalid budget ID.');
					} else {
						throw new Error(errorMessage);
					}
				}

				// Invalidate relevant cache entries
				setCacheInvalidationFlags.onBudgetChange();
				ApiService.clearCacheByPrefix('/api/budgets');
			} catch (err) {
				console.error('❌ [BudgetContext] Delete failed, rolling back:', err);
				// Rollback to previous state
				setBudgets(previousBudgets);

				// Re-throw with user-friendly message (already formatted above)
				throw err;
			}
		},
		[] // No dependencies - function is stable
	);

	const updateBudgetSpent = useCallback(
		async (budgetId: string, amount: number) => {

			try {
				const response = await ApiService.post<any>(
					'/api/budgets/update-spent',
					{
						budgetId,
						amount,
					}
				);


				// Handle the response format properly
				const actualData = response.data?.data || response.data;
				const actualSuccess = response.success;

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


					setBudgets((prev) => {
						const updated = prev.map((b) =>
							b.id === updatedBudget.id ? updatedBudget : b
						);
						return updated;
					});

					// Invalidate relevant cache entries
					setCacheInvalidationFlags.onBudgetChange();
					ApiService.clearCacheByPrefix('/api/budgets');

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

	// Budget analytics functions
	const getBudgetSummary = useCallback((): BudgetSummary => {
		const totalBudgets = budgets.length;
		const totalAllocated = budgets.reduce(
			(sum, budget) => sum + budget.amount,
			0
		);
		const totalSpent = budgets.reduce(
			(sum, budget) => sum + (budget.spent || 0),
			0
		);
		const totalRemaining = totalAllocated - totalSpent;
		const averageUtilization =
			totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

		const overBudgetCount = budgets.filter(
			(budget) => (budget.spent || 0) > budget.amount
		).length;
		const underBudgetCount = budgets.filter(
			(budget) => (budget.spent || 0) < budget.amount * 0.8
		).length;
		const onTrackCount = budgets.filter((budget) => {
			const spent = budget.spent || 0;
			return spent >= budget.amount * 0.8 && spent <= budget.amount;
		}).length;

		const monthlyBudgets = budgets.filter(
			(budget) => budget.period === 'monthly'
		).length;
		const weeklyBudgets = budgets.filter(
			(budget) => budget.period === 'weekly'
		).length;

		return {
			totalBudgets,
			totalAllocated,
			totalSpent,
			totalRemaining,
			averageUtilization,
			overBudgetCount,
			underBudgetCount,
			onTrackCount,
			monthlyBudgets,
			weeklyBudgets,
		};
	}, [budgets]);

	const getBudgetUtilization = useCallback(
		(budgetId: string): number => {
			const budget = budgets.find((b) => b.id === budgetId);
			if (!budget || budget.amount === 0) return 0;
			return ((budget.spent || 0) / budget.amount) * 100;
		},
		[budgets]
	);

	const getOverBudgetBudgets = useCallback((): Budget[] => {
		return budgets.filter((budget) => (budget.spent || 0) > budget.amount);
	}, [budgets]);

	const getUnderBudgetBudgets = useCallback((): Budget[] => {
		return budgets.filter(
			(budget) => (budget.spent || 0) < budget.amount * 0.8
		);
	}, [budgets]);

	const filterBudgets = useCallback(
		(filter: BudgetFilter): Budget[] => {
			return budgets.filter((budget) => {
				// Filter by period
				if (filter.period && budget.period !== filter.period) {
					return false;
				}

				// Filter by categories
				if (filter.categories && filter.categories.length > 0) {
					const budgetCategories = budget.categories || [];
					const hasMatchingCategory = filter.categories.some((category) =>
						budgetCategories.includes(category)
					);
					if (!hasMatchingCategory) {
						return false;
					}
				}

				// Filter by utilization range
				if (filter.utilizationRange) {
					const utilization = getBudgetUtilization(budget.id);
					if (
						utilization < filter.utilizationRange.min ||
						utilization > filter.utilizationRange.max
					) {
						return false;
					}
				}

				// Filter by over budget
				if (filter.overBudget && (budget.spent || 0) <= budget.amount) {
					return false;
				}

				// Filter by under budget
				if (filter.underBudget && (budget.spent || 0) >= budget.amount * 0.8) {
					return false;
				}

				// Filter by search term
				if (filter.searchTerm) {
					const searchLower = filter.searchTerm.toLowerCase();
					const nameMatch = budget.name.toLowerCase().includes(searchLower);
					const categoryMatch = (budget.categories || []).some((cat) =>
						cat.toLowerCase().includes(searchLower)
					);
					if (!nameMatch && !categoryMatch) {
						return false;
					}
				}

				return true;
			});
		},
		[budgets, getBudgetUtilization]
	);

	const getAllCategories = useCallback((): string[] => {
		const allCategories = new Set<string>();
		budgets.forEach((budget) => {
			(budget.categories || []).forEach((category) =>
				allCategories.add(category)
			);
		});
		return Array.from(allCategories).sort();
	}, [budgets]);

	const getBudgetsByCategory = useCallback(
		(category: string): Budget[] => {
			return budgets.filter((budget) =>
				(budget.categories || []).includes(category)
			);
		},
		[budgets]
	);

	// Load budgets when component mounts
	useEffect(() => {
		if (!hasLoaded) {
			refetch();
		}
	}, [refetch, hasLoaded]);

	// Memoized summary calculations for monthly and weekly budgets
	const summaryCalculations = useMemo(() => {
		const monthlyBudgets = budgets.filter((b) => b.period === 'monthly');
		const weeklyBudgets = budgets.filter((b) => b.period === 'weekly');

		const monthlySummary = monthlyBudgets.reduce(
			(acc, budget) => {
				acc.totalAllocated += Number(budget.amount) || 0;
				acc.totalSpent += Number(budget.spent) || 0;
				return acc;
			},
			{ totalAllocated: 0, totalSpent: 0 }
		);

		const weeklySummary = weeklyBudgets.reduce(
			(acc, budget) => {
				acc.totalAllocated += Number(budget.amount) || 0;
				acc.totalSpent += Number(budget.spent) || 0;
				return acc;
			},
			{ totalAllocated: 0, totalSpent: 0 }
		);

		// Guard against divide-by-zero and NaN
		const monthlyPercentage =
			monthlySummary.totalAllocated > 0 && !isNaN(monthlySummary.totalSpent)
				? Math.min(
						Math.max(
							0,
							(monthlySummary.totalSpent / monthlySummary.totalAllocated) * 100
						),
						100
				  )
				: 0;

		const weeklyPercentage =
			weeklySummary.totalAllocated > 0 && !isNaN(weeklySummary.totalSpent)
				? Math.min(
						Math.max(
							0,
							(weeklySummary.totalSpent / weeklySummary.totalAllocated) * 100
						),
						100
				  )
				: 0;

		return {
			monthlySummary,
			weeklySummary,
			monthlyPercentage,
			weeklyPercentage,
		};
	}, [budgets]);

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
			getBudgetSummary,
			getBudgetUtilization,
			getOverBudgetBudgets,
			getUnderBudgetBudgets,
			filterBudgets,
			getAllCategories,
			getBudgetsByCategory,
			// Summary calculations
			...summaryCalculations,
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
			getBudgetSummary,
			getBudgetUtilization,
			getOverBudgetBudgets,
			getUnderBudgetBudgets,
			filterBudgets,
			getAllCategories,
			getBudgetsByCategory,
			summaryCalculations,
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
