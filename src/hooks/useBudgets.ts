/**
 * DEPRECATED ADAPTER
 *
 * This file now acts as a thin adapter to the BudgetProvider context.
 * Migrate your imports from:
 *   import { useBudgets } from '.../hooks/useBudgets'
 * to:
 *   import { useBudget } from '.../context/budgetContext'
 *
 * Once all imports are migrated, this file can be deleted.
 */

import { useBudget } from '../context/budgetContext';

// Show deprecation warning in development
if (__DEV__) {
	console.warn(
		'[Deprecation] useBudgets from hooks is deprecated. ' +
			'Import { useBudget } from context/budgetContext instead. ' +
			'This adapter will be removed in a future version.'
	);
}

export { useBudget as useBudgets };

/* ==========================================
 * OLD IMPLEMENTATION BELOW (kept for reference, not used)
 * ==========================================

import { useMemo } from 'react';
import { useDataFetching } from './useDataFetching';
import {
	Budget,
	CreateBudgetData,
	UpdateBudgetData,
} from '../context/budgetContext';
import { ApiService } from '../services';

// ==========================================
// Budget-specific API functions
// ==========================================
const fetchBudgets_OLD = async (): Promise<Budget[]> => {
	const response = await ApiService.get<{ data: Budget[] }>('/api/budgets');

		success: response.success,
		hasData: !!response.data,
		dataIsArray: Array.isArray(response.data?.data),
		count: response.data?.data?.length || 0,
	});

	// Handle authentication errors gracefully
	if (!response.success && response.error?.includes('User not authenticated')) {
		return [];
	}

	const budgets = response.data?.data || [];
	return budgets;
};

const createBudget = async (budgetData: CreateBudgetData): Promise<Budget> => {
	const response = await ApiService.post<{ data: Budget }>(
		'/api/budgets',
		budgetData
	);

	// Debug: Log the actual response structure
	console.log(
		'🔍 [createBudget] Full response:',
		JSON.stringify(response, null, 2)
	);

	// Handle error responses first
	if (response.success === false && response.error) {
		throw new Error(`Failed to create budget: ${response.error}`);
	}

	let budget: Budget | null = null;

	// Handle different response structures for successful responses
	if (response.data?.data) {
		// Expected structure: { data: { data: Budget } }
		budget = response.data.data as Budget;
	} else if (
		response.data &&
		typeof response.data === 'object' &&
		'_id' in response.data
	) {
		// MongoDB structure: { data: { _id, ... } }
		budget = {
			...response.data,
			id: (response.data as any)._id || (response.data as any).id,
		} as Budget;
	} else if (response.success && response.data) {
		// Fallback: assume response.data is the budget
		budget = response.data as unknown as Budget;
	}

	if (!budget) {
		throw new Error('Failed to create budget: No data received');
	}

	console.log(
		'✅ [createBudget] Returning budget with ID:',
		budget.id || (budget as any)._id
	);
	return budget;
};

const updateBudget = async (
	id: string,
	updates: UpdateBudgetData
): Promise<Budget> => {
	const response = await ApiService.put<{ data: Budget }>(
		`/api/budgets/${id}`,
		updates
	);

	// Debug: Log the actual response structure
	console.log(
		'🔍 [updateBudget] Full response:',
		JSON.stringify(response, null, 2)
	);

	// Handle error responses first
	if (response.success === false && response.error) {
		throw new Error(`Failed to update budget: ${response.error}`);
	}

	// Handle different response structures for successful responses
	if (response.data?.data) {
		// Expected structure: { data: { data: Budget } }
		return response.data.data as Budget;
	} else if (
		response.data &&
		typeof response.data === 'object' &&
		'id' in response.data
	) {
		// Direct structure: { data: Budget }
		return response.data as unknown as Budget;
	} else if (response.success && response.data) {
		// Fallback: assume response.data is the budget
		return response.data as unknown as Budget;
	}

	throw new Error('Failed to update budget: No data received');
};

const deleteBudget = async (id: string): Promise<void> => {
	await ApiService.delete(`/api/budgets/${id}`);

	// Defensive: manually clear ALL budgets caches (prefix-based to catch all variants)
	ApiService.clearCacheByPrefix('/api/budgets');
};

// ==========================================
// Budget-specific data transformations
// ==========================================
const transformBudgetData = (budgets: Budget[]) => {
	console.log(
		'🔄 [transformBudgetData] Transforming',
		budgets.length,
		'budgets'
	);
	// Add any budget-specific transformations here
	// For example, sorting by period, calculating alerts, etc.
	const transformed = budgets.map((budget) => {
		const id = (budget as any)._id || budget.id;
		console.log(
			'🔄 [transformBudgetData] Budget:',
			budget.name,
			'- ID:',
			id,
			'- _id:',
			(budget as any)._id
		);
		return {
			...budget,
			// Map _id to id for client-side compatibility
			id,
			// Ensure spent is always a number
			spent: budget.spent || 0,
			// Calculate percentage
			spentPercentage:
				budget.amount > 0 ? (budget.spent || 0) / budget.amount : 0,
			// Determine if should alert (over 90% spent)
			shouldAlert:
				budget.amount > 0 && (budget.spent || 0) / budget.amount > 0.9,
		};
	});
	console.log(
		'✅ [transformBudgetData] Transformed IDs:',
		transformed.map((b) => b.id).join(', ')
	);
	return transformed;
};

// ==========================================
// Hook
// ==========================================
export function useBudgets() {
	// Create a wrapper function that converts Budget to CreateBudgetData for the API
	const addBudgetWrapper = async (budget: Budget): Promise<Budget> => {
		// Extract the CreateBudgetData fields from the Budget object
		const budgetData: CreateBudgetData = {
			name: budget.name,
			amount: budget.amount,
			period: budget.period,
			weekStartDay: budget.weekStartDay,
			monthStartDay: budget.monthStartDay,
			rollover: budget.rollover,
			icon: budget.icon,
			color: budget.color,
			categories: budget.categories,
		};
		return createBudget(budgetData);
	};

	const {
		data: budgets,
		isLoading,
		hasLoaded,
		error,
		lastRefreshed,
		refetch,
		addItem: addBudgetItem,
		updateItem: updateBudgetItem,
		deleteItem: deleteBudgetItem,
		clearError,
	} = useDataFetching<Budget>({
		fetchFunction: fetchBudgets,
		addFunction: addBudgetWrapper,
		updateFunction: updateBudget,
		deleteFunction: deleteBudget,
		autoRefresh: true,
		refreshOnFocus: false, // Disable automatic refresh on focus to reduce requests
		transformData: transformBudgetData,
	});

	// ==========================================
	// Memoized Budget Calculations
	// ==========================================
	const budgetCalculations = useMemo(() => {
		// Separate budgets by period
		const monthlyBudgets = budgets.filter(
			(budget) => budget.period === 'monthly'
		);
		const weeklyBudgets = budgets.filter(
			(budget) => budget.period === 'weekly'
		);

		// Calculate summaries
		const monthlySummary = monthlyBudgets.reduce(
			(acc, budget) => {
				acc.totalAllocated += budget.amount;
				acc.totalSpent += budget.spent || 0;
				return acc;
			},
			{ totalAllocated: 0, totalSpent: 0 }
		);

		const weeklySummary = weeklyBudgets.reduce(
			(acc, budget) => {
				acc.totalAllocated += budget.amount;
				acc.totalSpent += budget.spent || 0;
				return acc;
			},
			{ totalAllocated: 0, totalSpent: 0 }
		);

		// Calculate percentages
		const monthlyPercentage =
			monthlySummary.totalAllocated > 0
				? Math.min(
						(monthlySummary.totalSpent / monthlySummary.totalAllocated) * 100,
						100
				  )
				: 0;

		const weeklyPercentage =
			weeklySummary.totalAllocated > 0
				? Math.min(
						(weeklySummary.totalSpent / weeklySummary.totalAllocated) * 100,
						100
				  )
				: 0;

		return {
			monthlyBudgets,
			weeklyBudgets,
			monthlySummary,
			weeklySummary,
			monthlyPercentage,
			weeklyPercentage,
		};
	}, [budgets]);

	// ==========================================
	// Wrapper functions for better API
	// ==========================================
	const addBudget = async (budgetData: CreateBudgetData): Promise<Budget> => {
		// Convert CreateBudgetData to Budget for the wrapper function
		const budget: Budget = {
			id: '', // Will be set by the server
			name: budgetData.name,
			amount: budgetData.amount,
			period: budgetData.period,
			weekStartDay: budgetData.weekStartDay,
			monthStartDay: budgetData.monthStartDay,
			rollover: budgetData.rollover,
			icon: budgetData.icon,
			color: budgetData.color,
			categories: budgetData.categories,
		};
		return addBudgetItem(budget);
	};

	const updateBudgetWrapper = async (
		id: string,
		updates: UpdateBudgetData
	): Promise<Budget> => {
		return updateBudgetItem(id, updates);
	};

	const deleteBudgetWrapper = async (id: string): Promise<void> => {
		return deleteBudgetItem(id);
	};

	return {
		// Data
		budgets,
		...budgetCalculations,

		// Loading states
		isLoading,
		hasLoaded,
		error,
		lastRefreshed,

		// Actions
		refetch,
		addBudget,
		updateBudget: updateBudgetWrapper,
		deleteBudget: deleteBudgetWrapper,
		clearError,
	};
}

*/
