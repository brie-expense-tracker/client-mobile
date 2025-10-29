import { useMemo, useCallback } from 'react';
import { useDataFetching } from './useDataFetching';
import { Goal, CreateGoalData, UpdateGoalData } from '../context/goalContext';
import { ApiService } from '../services';
import { createLogger } from '../utils/sublogger';

const goalsHookLog = createLogger('useGoals');

// ==========================================
// Goal-specific API functions
// ==========================================
const fetchGoals = async (): Promise<Goal[]> => {
	const response = await ApiService.get<{ data: Goal[] }>('/api/goals');

	// Handle authentication errors gracefully
	if (!response.success && response.error?.includes('User not authenticated')) {
		goalsHookLog.debug('User not authenticated, returning empty array');
		return [];
	}

	// Handle the nested response structure from the server
	const goalsData = response.data?.data || response.data;
	return Array.isArray(goalsData) ? goalsData : [];
};

const createGoal = async (goalData: CreateGoalData): Promise<Goal> => {
	const response = await ApiService.post<{ data: Goal }>(
		'/api/goals',
		goalData
	);
	const responseData = response.data?.data || response.data;
	if (
		!responseData ||
		(typeof responseData === 'object' && 'data' in responseData)
	) {
		throw new Error('Failed to create goal: No data received');
	}
	return responseData as Goal;
};

// ==========================================
// Goal-specific data transformations
// ==========================================
const transformGoalData = (goals: Goal[]) => {
	return goals.map((goal: Goal) => {
		// Transform _id to id if it exists
		const transformedGoal = {
			...goal,
			id: (goal as any)._id || goal.id, // Ensure id field exists
		};

		// Handle invalid dates gracefully
		const deadline = new Date(transformedGoal.deadline);
		const today = new Date();

		// Check if deadline is valid
		const isValidDeadline = !isNaN(deadline.getTime());
		const daysLeft = isValidDeadline
			? Math.ceil(
					(deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
			  )
			: 0;

		// Handle division by zero and ensure target is positive
		const target = Math.max(transformedGoal.target, 0.01); // Prevent division by zero
		const percent = Math.min((transformedGoal.current / target) * 100, 100);

		return {
			...transformedGoal,
			daysLeft,
			percent: Math.max(0, percent), // Ensure percent is not negative
			isOverdue: isValidDeadline && daysLeft < 0,
			isCompleted: percent >= 100,
		};
	});
};

// ==========================================
// Hook
// ==========================================
export function useGoals(options: { refreshOnFocus?: boolean } = {}) {
	// Memoize the API functions to prevent recreation on every render
	const memoizedFetchGoals = useCallback(fetchGoals, []);
	const memoizedCreateGoal = useCallback(createGoal, []);

	// Create wrapper functions for the API calls
	const updateGoalDirect = useCallback(
		async (id: string, updates: UpdateGoalData): Promise<Goal> => {
			goalsHookLog.debug('updateGoalDirect called', {
				goalId: id,
				updates,
				updatesType: typeof updates,
				updatesKeys: Object.keys(updates),
			});

			const response = await ApiService.put<{ data: Goal }>(
				`/api/goals/${id}`,
				updates
			);

			goalsHookLog.debug('updateGoalDirect response', {
				success: response.success,
				error: response.error,
				data: response.data,
				status: (response as any).status,
			});

			// Check if the request failed
			if (!response.success) {
				goalsHookLog.error('Update failed', response.error);
				throw new Error(response.error || 'Failed to update goal');
			}

			const responseData = response.data?.data || response.data;
			if (
				!responseData ||
				(typeof responseData === 'object' && 'data' in responseData)
			) {
				goalsHookLog.error('No valid response data received', { rawResponse: response });
				throw new Error('Failed to update goal: No data received');
			}

			goalsHookLog.debug('Returning goal data', responseData);
			return responseData as Goal;
		},
		[]
	);

	const deleteGoalDirect = useCallback(async (id: string): Promise<void> => {
		await ApiService.delete(`/api/goals/${id}`);
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
		refreshOnFocus: options.refreshOnFocus === true, // Only refresh on focus if explicitly enabled
		transformData: transformGoalData,
	});

	// ==========================================
	// Memoized Data
	// ==========================================
	const transformedData = useMemo(() => {
		const transformed = transformGoalData(goals);
		goalsHookLog.debug(`Goals: ${transformed.length} active`);
		return transformed;
	}, [goals]);

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
	// Goal Filtering and Sorting
	// ==========================================
	const getGoalsByCategory = useCallback(
		(category: string) => {
			return transformedData.filter((goal) =>
				goal.categories.includes(category)
			);
		},
		[transformedData]
	);

	const getGoalsByStatus = useCallback(
		(status: 'active' | 'completed' | 'overdue') => {
			switch (status) {
				case 'active':
					return transformedData.filter(
						(goal) => !goal.isCompleted && !goal.isOverdue
					);
				case 'completed':
					return transformedData.filter((goal) => goal.isCompleted);
				case 'overdue':
					return transformedData.filter((goal) => goal.isOverdue);
				default:
					return [];
			}
		},
		[transformedData]
	);

	const sortGoals = useCallback(
		(
			goals: Goal[],
			sortBy: 'name' | 'deadline' | 'progress' | 'target' | 'created'
		) => {
			return [...goals].sort((a, b) => {
				switch (sortBy) {
					case 'name':
						return a.name.localeCompare(b.name);
					case 'deadline':
						return (
							new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
						);
					case 'progress':
						return (b.percent || 0) - (a.percent || 0);
					case 'target':
						return b.target - a.target;
					case 'created':
						const aCreated = new Date(a.createdAt || 0).getTime();
						const bCreated = new Date(b.createdAt || 0).getTime();
						return bCreated - aCreated;
					default:
						return 0;
				}
			});
		},
		[]
	);

	const searchGoals = useCallback(
		(query: string) => {
			const lowercaseQuery = query.toLowerCase();
			return transformedData.filter(
				(goal) =>
					goal.name.toLowerCase().includes(lowercaseQuery) ||
					goal.categories.some((cat) =>
						cat.toLowerCase().includes(lowercaseQuery)
					)
			);
		},
		[transformedData]
	);

	const getAllCategories = useCallback(() => {
		const categories = new Set<string>();
		transformedData.forEach((goal) => {
			goal.categories.forEach((category) => categories.add(category));
		});
		return Array.from(categories).sort();
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

		// Filtering and Sorting
		getGoalsByCategory,
		getGoalsByStatus,
		sortGoals,
		searchGoals,
		getAllCategories,
	};
}
