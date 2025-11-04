import React, {
	createContext,
	useState,
	useEffect,
	useCallback,
	useMemo,
	ReactNode,
} from 'react';
import { ApiService } from '../services';
import { createLogger } from '../utils/sublogger';

const goalContextLog = createLogger('GoalContext');

// ==========================================
// Types
// ==========================================
export interface Goal {
	id: string;
	name: string;
	target: number;
	current: number;
	deadline: string;
	icon: string;
	color: string;
	categories: string[];
	userId?: string;
	createdAt?: string;
	updatedAt?: string;
	// Transformed properties added by transformGoalData
	isCompleted?: boolean;
	isOverdue?: boolean;
	daysLeft?: number;
	percent?: number;
}

export interface CreateGoalData {
	name: string;
	target: number;
	deadline: string;
	icon: string;
	color: string;
	categories?: string[];
}

export interface UpdateGoalData {
	name?: string;
	target?: number;
	deadline?: string;
	icon?: string;
	color?: string;
	categories?: string[];
}

// ==========================================
// Helpers
// ==========================================

/**
 * Get goal ID - handles both MongoDB _id and client id
 * Single source of truth for ID access
 */
export const getGoalId = (g: { id?: string; _id?: string }): string => {
	return (g.id ?? (g as any)._id)!;
};

// ==========================================
// Context
// ==========================================

interface GoalContextType {
	goals: Goal[];
	isLoading: boolean;
	hasLoaded: boolean;
	refetch: () => Promise<void>;
	addGoal: (goalData: CreateGoalData) => Promise<Goal>;
	updateGoal: (id: string, updates: UpdateGoalData) => Promise<Goal>;
	deleteGoal: (id: string) => Promise<void>;
	updateGoalCurrent: (goalId: string, amount: number) => Promise<Goal>;
}

export const GoalContext = createContext<GoalContextType>({
	goals: [],
	isLoading: true,
	hasLoaded: false,
	refetch: async () => {},
	addGoal: async () => {
		throw new Error('addGoal not implemented');
	},
	updateGoal: async () => {
		throw new Error('updateGoal not implemented');
	},
	deleteGoal: async () => {},
	updateGoalCurrent: async () => {
		throw new Error('updateGoalCurrent not implemented');
	},
});

export const GoalProvider = ({ children }: { children: ReactNode }) => {
	const [goals, setGoals] = useState<Goal[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [hasLoaded, setHasLoaded] = useState<boolean>(false);

	// Abort controller for cancelling stale fetches
	const abortControllerRef = React.useRef<AbortController | null>(null);

	const refetch = useCallback(async () => {
		// Cancel any in-flight request
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			goalContextLog.debug('Aborted previous fetch');
		}

		// Create new abort controller for this fetch
		abortControllerRef.current = new AbortController();

		setIsLoading(true);
		try {
			const response = await ApiService.get<any>('/api/goals');

			// Handle double-wrapped response from ApiService
			const actualData = response.data?.data || response.data;
			const actualSuccess =
				response.data?.success !== undefined
					? response.data.success
					: response.success;

			if (actualSuccess && Array.isArray(actualData)) {
				const formatted: Goal[] = actualData.map((goal: any) => ({
					id: goal._id ?? goal.id,
					name: goal.name,
					target: Number(goal.target) || 0,
					current: Number(goal.current) || 0,
					deadline: goal.deadline,
					icon: goal.icon,
					color: goal.color,
					categories: Array.isArray(goal.categories) ? goal.categories : [],
					userId: goal.userId,
					createdAt: goal.createdAt,
					updatedAt: goal.updatedAt,
				}));
				// Use functional update to avoid dropping concurrent optimistic updates
				setGoals(() => formatted);
				setHasLoaded(true);
			} else {
				goalContextLog.warn('Unexpected response', response);
				setGoals(() => []);
				setHasLoaded(true);
			}
		} catch (err: any) {
			// Ignore abort errors (expected when a new fetch cancels the old one)
			if (err?.name === 'AbortError') {
				goalContextLog.debug('Fetch aborted (new fetch started)');
				return;
			}
			goalContextLog.warn('Failed to fetch goals, using empty array', err);
			setGoals(() => []);
			setHasLoaded(true);
		} finally {
			setIsLoading(false);
			// Clean up abort controller
			abortControllerRef.current = null;
		}
	}, []);

	const addGoal = useCallback(async (goalData: CreateGoalData) => {
		// Create a temporary ID for optimistic update
		const tempId = `temp-${Date.now()}-${Math.random()}`;
		const newGoal: Goal = {
			id: tempId,
			...goalData,
			current: 0,
			categories: goalData.categories || [],
		};

		// Optimistically add to UI
		setGoals((prev) => {
			const updated = [newGoal, ...prev];
			return updated;
		});

		try {
			goalContextLog.debug('Creating goal on server');
			const response = await ApiService.post<any>('/api/goals', goalData);

			goalContextLog.debug('Goal creation response', {
				success: response.success,
				hasData: !!response.data,
				dataKeys: response.data ? Object.keys(response.data) : [],
			});

			// Handle the response format properly
			// ApiService.post returns { success: true, data: savedGoal } when server returns { success: true, data: savedGoal }
			const actualData = response.data?.data || response.data;
			const actualSuccess = response.success;

			goalContextLog.debug('Parsed response', {
				actualSuccess,
				hasActualData: !!actualData,
				actualDataId: actualData?._id || actualData?.id,
			});

			if (actualSuccess && actualData) {
				// Update with the real ID from the server
				const serverGoal: Goal = {
					id: actualData._id ?? actualData.id,
					name: actualData.name,
					target: Number(actualData.target) || 0,
					current: Number(actualData.current) || 0,
					deadline: actualData.deadline,
					icon: actualData.icon,
					color: actualData.color,
					categories: Array.isArray(actualData.categories)
						? actualData.categories
						: [],
					userId: actualData.userId,
					createdAt: actualData.createdAt,
					updatedAt: actualData.updatedAt,
				};

				goalContextLog.info('Goal created, replacing temp ID', {
					tempId,
					realId: serverGoal.id,
				});

				// Clear cache to ensure fresh data
				ApiService.clearCacheByPrefix('/api/goals');
				goalContextLog.debug('Cache cleared after goal creation');

				// Replace the temporary goal with the real one
				setGoals((prev) => {
					// Defensive: if temp already removed, add server goal
					const hasTempGoal = prev.some((g) => g.id === tempId);
					if (!hasTempGoal) {
						goalContextLog.warn(
							'Temp goal already removed, adding server goal'
						);
						// Ensure we don't duplicate the goal
						const existingGoal = prev.find((g) => g.id === serverGoal.id);
						if (existingGoal) {
							goalContextLog.warn('Server goal already exists, updating instead');
							return prev.map((g) => (g.id === serverGoal.id ? serverGoal : g));
						}
						return [serverGoal, ...prev];
					}
					return prev.map((g) => (g.id === tempId ? serverGoal : g));
				});

				// Ensure hasLoaded is set to true after first goal creation
				if (!hasLoaded) {
					setHasLoaded(true);
				}

				return serverGoal;
			} else {
				// If the response doesn't indicate success, throw an error
				throw new Error(response.error || 'Failed to create goal');
			}
		} catch (error) {
			goalContextLog.error('Error adding goal', error);
			// Remove the optimistic goal on error
			setGoals((prev) => prev.filter((g) => g.id !== tempId));
			throw error;
		}
	}, []);

	const updateGoal = useCallback(
		async (id: string, updates: UpdateGoalData) => {
			try {
				const response = await ApiService.put<any>(`/api/goals/${id}`, updates);

				// Handle the response format properly
				const actualData = response.data?.data || response.data;
				const actualSuccess = response.success;

				if (actualSuccess && actualData) {
					const updatedGoal: Goal = {
						id: actualData._id ?? actualData.id,
						name: actualData.name,
						target: Number(actualData.target) || 0,
						current: Number(actualData.current) || 0,
						deadline: actualData.deadline,
						icon: actualData.icon,
						color: actualData.color,
						categories: Array.isArray(actualData.categories)
							? actualData.categories
							: [],
						userId: actualData.userId,
						createdAt: actualData.createdAt,
						updatedAt: actualData.updatedAt,
					};

					setGoals((prev) => prev.map((g) => (g.id === id ? updatedGoal : g)));

					// Clear cache to ensure fresh data
					ApiService.clearCacheByPrefix('/api/goals');
					goalContextLog.debug('Cache cleared after goal update');

					return updatedGoal;
				} else {
					throw new Error(response.error || 'Failed to update goal');
				}
			} catch (error) {
				goalContextLog.error('Failed to update goal', error);
				throw error;
			}
		},
		[]
	);

	const deleteGoal = useCallback(async (id: string) => {
		goalContextLog.debug('Deleting goal', { id });

		// Save previous state for rollback
		let previousGoals: Goal[] = [];
		setGoals((prev) => {
			previousGoals = prev;
			// Optimistically remove from UI
			return prev.filter((g) => getGoalId(g) !== id);
		});

		try {
			goalContextLog.debug('Calling API delete');
			const result = await ApiService.delete(`/api/goals/${id}`);

			if (!result.success) {
				// Parse structured error from server
				const errorData = result.data as any;
				const errorCode = errorData?.error || 'Unknown';
				const errorMessage = result.error || 'Delete failed';

				goalContextLog.error('Server error', {
					code: errorCode,
					message: errorMessage,
					data: errorData,
				});

				// Map error codes to user-friendly messages
				if (errorCode === 'GoalInUse') {
					throw new Error(
						'This goal has linked transactions. Please remove or reassign those transactions before deleting the goal.'
					);
				} else if (errorCode === 'GoalNotFound') {
					throw new Error('Goal not found or already deleted.');
				} else if (errorCode === 'InvalidGoalId') {
					throw new Error('Invalid goal ID.');
				} else {
					throw new Error(errorMessage);
				}
			}

			goalContextLog.info('Delete successful, clearing cache');
			// Clear cache to ensure fresh data
			ApiService.clearCacheByPrefix('/api/goals');
			goalContextLog.debug('Cache cleared after goal deletion');
		} catch (err) {
			goalContextLog.error('Delete failed, rolling back', err);
			// Rollback to previous state
			setGoals(previousGoals);

			// Re-throw with user-friendly message (already formatted above)
			throw err;
		}
	}, []);

	const updateGoalCurrent = useCallback(
		async (goalId: string, amount: number) => {
			try {
				const response = await ApiService.post<any>(
					'/api/goals/update-current',
					{
						goalId,
						amount,
					}
				);

				// Handle the response format properly
				const actualData = response.data?.data || response.data;
				const actualSuccess = response.success;

				if (actualSuccess && actualData) {
					const updatedGoal: Goal = {
						id: actualData._id ?? actualData.id,
						name: actualData.name,
						target: Number(actualData.target) || 0,
						current: Number(actualData.current) || 0,
						deadline: actualData.deadline,
						icon: actualData.icon,
						color: actualData.color,
						categories: Array.isArray(actualData.categories)
							? actualData.categories
							: [],
						userId: actualData.userId,
						createdAt: actualData.createdAt,
						updatedAt: actualData.updatedAt,
					};

					setGoals((prev) =>
						prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g))
					);

					// Clear cache to ensure fresh data
					ApiService.clearCacheByPrefix('/api/goals');
					goalContextLog.debug('Cache cleared after goal current update');

					return updatedGoal;
				} else {
					throw new Error(response.error || 'Failed to update goal current');
				}
			} catch (error) {
				goalContextLog.error('Failed to update goal current', error);
				throw error;
			}
		},
		[]
	);

	useEffect(() => {
		if (!hasLoaded) {
			refetch();
		}
	}, [refetch, hasLoaded]);

	// Memoize the context value to prevent unnecessary re-renders
	const value = useMemo(
		() => ({
			goals,
			isLoading,
			hasLoaded,
			refetch,
			addGoal,
			updateGoal,
			deleteGoal,
			updateGoalCurrent,
		}),
		[
			goals,
			isLoading,
			hasLoaded,
			refetch,
			addGoal,
			updateGoal,
			deleteGoal,
			updateGoalCurrent,
		]
	);

	return <GoalContext.Provider value={value}>{children}</GoalContext.Provider>;
};

// Hook to use goal context
export const useGoal = () => {
	const context = React.useContext(GoalContext);
	if (context === undefined) {
		throw new Error('useGoal must be used within a GoalProvider');
	}
	return context;
};
