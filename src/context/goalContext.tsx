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
// Context
// ==========================================

interface GoalContextType {
	goals: Goal[];
	isLoading: boolean;
	refetch: () => Promise<void>;
	addGoal: (goalData: CreateGoalData) => Promise<Goal>;
	updateGoal: (id: string, updates: UpdateGoalData) => Promise<Goal>;
	deleteGoal: (id: string) => Promise<void>;
	updateGoalCurrent: (goalId: string, amount: number) => Promise<Goal>;
}

export const GoalContext = createContext<GoalContextType>({
	goals: [],
	isLoading: true,
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
	const [isLoading, setIsLoading] = useState<boolean>(true);
	// Note: Transaction refresh is handled by the transaction context itself
	// when goals are updated via the API

	// Memoize the goals data to prevent unnecessary re-renders
	const memoizedGoals = useMemo(() => goals, [goals]);

	const refetch = useCallback(async () => {
		console.log('[GoalContext] refetch called');
		setIsLoading(true);
		try {
			const response = await ApiService.get<any>('/goals');
			console.log('[GoalContext] API response received:', response);

			// Handle double-wrapped response from ApiService
			const actualData = response.data?.data || response.data;
			const actualSuccess =
				response.data?.success !== undefined
					? response.data.success
					: response.success;

			console.log('[GoalContext] Processed response:', {
				actualSuccess,
				dataLength: actualData?.length,
			});

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
				console.log(
					'[GoalContext] Formatted goals:',
					formatted.map((g) => ({
						id: g.id,
						name: g.name,
						current: g.current,
						target: g.target,
					}))
				);
				setGoals(formatted);
			} else {
				console.warn('[Goals] Unexpected response:', response);
				setGoals([]);
			}
		} catch (err) {
			console.warn('[Goals] Failed to fetch goals, using empty array', err);
			setGoals([]);
		} finally {
			setIsLoading(false);
			console.log('[GoalContext] refetch completed');
		}
	}, []);

	const addGoal = useCallback(async (goalData: CreateGoalData) => {
		console.log('addGoal called with:', goalData);

		// Create a temporary ID for optimistic update
		const tempId = `temp-${Date.now()}-${Math.random()}`;
		const newGoal: Goal = {
			id: tempId,
			...goalData,
			current: 0,
			categories: goalData.categories || [],
		};

		console.log('Optimistic goal created:', newGoal);

		// Optimistically add to UI
		setGoals((prev) => {
			const updated = [newGoal, ...prev];
			console.log('Updated goals state (optimistic):', updated);
			return updated;
		});

		try {
			const response = await ApiService.post<any>('/goals', goalData);
			console.log('API response:', response);

			// Handle the response format properly
			const actualData = response.data?.data || response.data;
			const actualSuccess = response.success;

			console.log('Processed response:', { actualSuccess, actualData });

			if (actualSuccess && actualData) {
				// Update with the real ID from the server
				const serverGoal: Goal = {
					id: actualData._id ?? actualData.id ?? tempId,
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

				console.log('Server goal created:', serverGoal);

				// Replace the temporary goal with the real one
				setGoals((prev) => {
					const updated = prev.map((g) => (g.id === tempId ? serverGoal : g));
					console.log('Updated goals state (server):', updated);
					return updated;
				});

				return serverGoal;
			} else {
				// If the response doesn't indicate success, throw an error
				throw new Error(response.error || 'Failed to create goal');
			}
		} catch (error) {
			// Remove the optimistic goal on error
			setGoals((prev) => {
				const updated = prev.filter((g) => g.id !== tempId);
				console.log('Removed optimistic goal on error:', updated);
				return updated;
			});
			console.error('Error adding goal:', error);
			throw error;
		}
	}, []);

	const updateGoal = useCallback(
		async (id: string, updates: UpdateGoalData) => {
			try {
				const response = await ApiService.put<any>(`/goals/${id}`, updates);

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

					// Note: Transaction refresh is handled by the transaction context itself
					// when goals are updated via the API

					return updatedGoal;
				} else {
					throw new Error(response.error || 'Failed to update goal');
				}
			} catch (error) {
				console.error('Failed to update goal:', error);
				throw error;
			}
		},
		[]
	);

	const deleteGoal = useCallback(
		async (id: string) => {
			// Optimistically update UI
			setGoals((prev) => prev.filter((g) => g.id !== id));

			try {
				await ApiService.delete(`/goals/${id}`);
			} catch (err) {
				console.warn('Delete failed, refetching', err);
				// Rollback or just refetch
				await refetch();
			}
		},
		[refetch]
	);

	const updateGoalCurrent = useCallback(
		async (goalId: string, amount: number) => {
			try {
				const response = await ApiService.post<any>('/goals/update-current', {
					goalId,
					amount,
				});

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

					return updatedGoal;
				} else {
					throw new Error(response.error || 'Failed to update goal current');
				}
			} catch (error) {
				console.error('Failed to update goal current:', error);
				throw error;
			}
		},
		[]
	);

	useEffect(() => {
		refetch();
	}, [refetch]);

	// Memoize the context value to prevent unnecessary re-renders
	const value = useMemo(
		() => ({
			goals: memoizedGoals,
			isLoading,
			refetch,
			addGoal,
			updateGoal,
			deleteGoal,
			updateGoalCurrent,
		}),
		[
			memoizedGoals,
			isLoading,
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
