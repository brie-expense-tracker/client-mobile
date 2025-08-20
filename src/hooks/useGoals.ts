import { useMemo, useCallback } from 'react';
import { useDataFetching } from './useDataFetching';
import { Goal, CreateGoalData, UpdateGoalData } from '../context/goalContext';
import { ApiService } from '../services';

// ==========================================
// Goal-specific API functions
// ==========================================
const fetchGoals = async (): Promise<Goal[]> => {
	const response = await ApiService.get<{ data: Goal[] }>('/goals');
	// Handle the nested response structure from the server
	const goalsData = response.data?.data || response.data;
	return Array.isArray(goalsData) ? goalsData : [];
};

const createGoal = async (goalData: CreateGoalData): Promise<Goal> => {
	const response = await ApiService.post<{ data: Goal }>('/goals', goalData);
	const responseData = response.data?.data || response.data;
	if (
		!responseData ||
		(typeof responseData === 'object' && 'data' in responseData)
	) {
		throw new Error('Failed to create goal: No data received');
	}
	return responseData as Goal;
};

const updateGoal = async (
	id: string,
	updates: UpdateGoalData
): Promise<Goal> => {
	const response = await ApiService.put<{ data: Goal }>(
		`/goals/${id}`,
		updates
	);
	const responseData = response.data?.data || response.data;
	if (
		!responseData ||
		(typeof responseData === 'object' && 'data' in responseData)
	) {
		throw new Error('Failed to update goal: No data received');
	}
	return responseData as Goal;
};

const deleteGoal = async (id: string): Promise<void> => {
	await ApiService.delete(`/goals/${id}`);
};

// ==========================================
// Goal-specific data transformations
// ==========================================
const transformGoalData = (goals: Goal[]) => {
	return goals.map((goal: any) => {
		// Transform _id to id if it exists
		const transformedGoal = {
			...goal,
			id: goal._id || goal.id, // Ensure id field exists
		};

		const deadline = new Date(transformedGoal.deadline);
		const today = new Date();
		const daysLeft = Math.ceil(
			(deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
		);
		const percent = Math.min(
			(transformedGoal.current / transformedGoal.target) * 100,
			100
		);

		return {
			...transformedGoal,
			daysLeft,
			percent,
			isOverdue: daysLeft < 0,
			isCompleted: percent >= 100,
		};
	});
};

// ==========================================
// Hook
// ==========================================
export function useGoals() {
	// Memoize the API functions to prevent recreation on every render
	const memoizedFetchGoals = useCallback(fetchGoals, []);
	const memoizedCreateGoal = useCallback(createGoal, []);
	const memoizedUpdateGoal = useCallback(updateGoal, []);
	const memoizedDeleteGoal = useCallback(deleteGoal, []);

	// Create wrapper functions for the API calls
	const updateGoalDirect = useCallback(
		async (id: string, updates: UpdateGoalData): Promise<Goal> => {
			const response = await ApiService.put<{ data: Goal }>(
				`/goals/${id}`,
				updates
			);
			const responseData = response.data?.data || response.data;
			if (
				!responseData ||
				(typeof responseData === 'object' && 'data' in responseData)
			) {
				throw new Error('Failed to update goal: No data received');
			}
			return responseData as Goal;
		},
		[]
	);

	const deleteGoalDirect = useCallback(async (id: string): Promise<void> => {
		await ApiService.delete(`/goals/${id}`);
	}, []);

	// Create a wrapper function that converts Goal to CreateGoalData for the API
	const addGoalWrapper = useCallback(
		async (goal: Goal): Promise<Goal> => {
			// Extract the CreateGoalData fields from the Goal object
			const goalData: CreateGoalData = {
				name: goal.name,
				target: goal.target,
				deadline: goal.deadline,
				icon: goal.icon,
				color: goal.color,
				categories: goal.categories,
			};
			return memoizedCreateGoal(goalData);
		},
		[memoizedCreateGoal]
	);

	const {
		data: goals,
		isLoading,
		hasLoaded,
		error,
		lastRefreshed,
		refetch,
		addItem: addGoalItem,
		updateItem: updateGoalItem,
		deleteItem: deleteGoalItem,
		clearError,
	} = useDataFetching<Goal>({
		fetchFunction: memoizedFetchGoals,
		addFunction: addGoalWrapper,
		updateFunction: updateGoalDirect,
		deleteFunction: deleteGoalDirect,
		autoRefresh: true,
		refreshOnFocus: true,
		transformData: transformGoalData,
	});

	// ==========================================
	// Memoized Data
	// ==========================================
	const transformedData = useMemo(() => {
		console.log('[useGoals] Raw goals data:', goals);
		const transformed = transformGoalData ? transformGoalData(goals) : goals;
		console.log('[useGoals] Transformed goals data:', transformed);
		console.log(
			'[useGoals] Goal IDs after transformation:',
			transformed.map((g) => g.id)
		);
		return transformed;
	}, [goals, transformGoalData]);

	// ==========================================
	// Memoized Goal Calculations
	// ==========================================
	const goalCalculations = useMemo(() => {
		// Calculate overall progress
		const totalTarget = transformedData.reduce(
			(sum, goal) => sum + goal.target,
			0
		);
		const totalCurrent = transformedData.reduce(
			(sum, goal) => sum + goal.current,
			0
		);
		const overallProgress =
			totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

		// Categorize goals
		const activeGoals = transformedData.filter(
			(goal) => !goal.isCompleted && !goal.isOverdue
		);
		const completedGoals = transformedData.filter((goal) => goal.isCompleted);
		const overdueGoals = transformedData.filter((goal) => goal.isOverdue);

		// Calculate summary stats
		const summaryStats = {
			totalGoals: transformedData.length,
			activeGoals: activeGoals.length,
			completedGoals: completedGoals.length,
			overdueGoals: overdueGoals.length,
			totalTarget,
			totalCurrent,
			overallProgress,
		};

		return {
			activeGoals,
			completedGoals,
			overdueGoals,
			summaryStats,
		};
	}, [transformedData]);

	// ==========================================
	// Wrapper functions for better API
	// ==========================================
	const addGoal = useCallback(
		async (goalData: CreateGoalData): Promise<Goal> => {
			// Convert CreateGoalData to Goal for the wrapper function
			const goal: Goal = {
				id: '', // Will be set by the server
				name: goalData.name,
				target: goalData.target,
				current: 0, // New goals start with 0 progress
				deadline: goalData.deadline,
				icon: goalData.icon,
				color: goalData.color,
				categories: goalData.categories || [],
			};
			return addGoalItem(goal);
		},
		[addGoalItem]
	);

	const updateGoalWrapper = useCallback(
		async (id: string, updates: UpdateGoalData): Promise<Goal> => {
			return updateGoalItem(id, updates);
		},
		[updateGoalItem]
	);

	const deleteGoalWrapper = useCallback(
		async (id: string): Promise<void> => {
			return deleteGoalItem(id);
		},
		[deleteGoalItem]
	);

	return {
		// Data
		goals: transformedData,
		...goalCalculations,

		// Loading states
		isLoading,
		hasLoaded,
		error,
		lastRefreshed,

		// Actions
		refetch,
		addGoal,
		updateGoal: updateGoalWrapper,
		deleteGoal: deleteGoalWrapper,
		clearError,
	};
}
