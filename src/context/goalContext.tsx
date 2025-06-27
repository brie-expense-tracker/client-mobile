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
	userId?: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface CreateGoalData {
	name: string;
	target: number;
	deadline: string;
	icon: string;
	color: string;
}

export interface UpdateGoalData {
	name?: string;
	target?: number;
	current?: number;
	deadline?: string;
	icon?: string;
	color?: string;
}

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

	const refetch = useCallback(async () => {
		setIsLoading(true);
		try {
			const response = await ApiService.get<any>('/goals');

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
					userId: goal.userId,
					createdAt: goal.createdAt,
					updatedAt: goal.updatedAt,
				}));
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
		}
	}, []);

	const addGoal = useCallback(async (goalData: CreateGoalData) => {
		// Create a temporary ID for optimistic update
		const tempId = `temp-${Date.now()}-${Math.random()}`;
		const newGoal: Goal = {
			id: tempId,
			...goalData,
			current: 0,
		};

		// Optimistically add to UI
		setGoals((prev) => [newGoal, ...prev]);

		try {
			const response = await ApiService.post<any>('/goals', goalData);

			if (response.success && response.data) {
				// Update with the real ID from the server
				const serverGoal: Goal = {
					id: response.data._id ?? response.data.id ?? tempId,
					name: response.data.name,
					target: Number(response.data.target) || 0,
					current: Number(response.data.current) || 0,
					deadline: response.data.deadline,
					icon: response.data.icon,
					color: response.data.color,
					userId: response.data.userId,
					createdAt: response.data.createdAt,
					updatedAt: response.data.updatedAt,
				};

				// Replace the temporary goal with the real one
				setGoals((prev) => prev.map((g) => (g.id === tempId ? serverGoal : g)));

				return serverGoal;
			} else {
				throw new Error('Failed to create goal');
			}
		} catch (error) {
			// Remove the optimistic goal on error
			setGoals((prev) => prev.filter((g) => g.id !== tempId));
			throw error;
		}
	}, []);

	const updateGoal = useCallback(
		async (id: string, updates: UpdateGoalData) => {
			try {
				const response = await ApiService.put<any>(`/goals/${id}`, updates);

				if (response.success && response.data) {
					const updatedGoal: Goal = {
						id: response.data._id ?? response.data.id,
						name: response.data.name,
						target: Number(response.data.target) || 0,
						current: Number(response.data.current) || 0,
						deadline: response.data.deadline,
						icon: response.data.icon,
						color: response.data.color,
						userId: response.data.userId,
						createdAt: response.data.createdAt,
						updatedAt: response.data.updatedAt,
					};

					setGoals((prev) => prev.map((g) => (g.id === id ? updatedGoal : g)));

					return updatedGoal;
				} else {
					throw new Error('Failed to update goal');
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

				if (response.success && response.data) {
					const updatedGoal: Goal = {
						id: response.data._id ?? response.data.id,
						name: response.data.name,
						target: Number(response.data.target) || 0,
						current: Number(response.data.current) || 0,
						deadline: response.data.deadline,
						icon: response.data.icon,
						color: response.data.color,
						userId: response.data.userId,
						createdAt: response.data.createdAt,
						updatedAt: response.data.updatedAt,
					};

					setGoals((prev) =>
						prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g))
					);

					return updatedGoal;
				} else {
					throw new Error('Failed to update goal current');
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

	const value = useMemo(
		() => ({
			goals,
			isLoading,
			refetch,
			addGoal,
			updateGoal,
			deleteGoal,
			updateGoalCurrent,
		}),
		[
			goals,
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
