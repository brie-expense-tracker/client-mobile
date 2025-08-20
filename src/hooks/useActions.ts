import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services';

interface Action {
	id: string;
	_id?: string;
	title: string;
	description: string;
	priority: 'low' | 'medium' | 'high';
	completed?: boolean;
	executed?: boolean;
	actionType?: string;
	parameters?: any;
	insightId?: string;
	source?: string;
	createdAt?: string;
	updatedAt?: string;
}

export default function useActions() {
	const [actions, setActions] = useState<Action[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchActions = useCallback(async () => {
		setLoading(true);
		try {
			const response = await ApiService.get('/intelligent-actions');

			if (response.success && response.data && Array.isArray(response.data)) {
				// Transform the data to match our interface
				const transformedActions: Action[] = response.data.map(
					(action: any) => ({
						id: action._id,
						_id: action._id,
						title: action.title,
						description: action.description,
						priority: action.priority || 'medium',
						completed: action.completed || false,
						executed: action.executed || false,
						actionType: action.actionType,
						parameters: action.parameters,
						insightId: action.insightId,
						source: action.source,
						createdAt: action.createdAt,
						updatedAt: action.updatedAt,
					})
				);

				setActions(transformedActions);
			} else {
				setActions([]);
			}
		} catch (error) {
			console.error('Failed to fetch actions:', error);
			setActions([]);
		} finally {
			setLoading(false);
		}
	}, []);

	const completeAction = useCallback(async (action: Action) => {
		try {
			const response = await ApiService.put(
				`/intelligent-actions/${action.id}/execute`,
				{
					executed: true,
					completionDetails: {
						completedAt: new Date().toISOString(),
						reason: 'user_completed',
					},
				}
			);

			if (response.success) {
				setActions((prev) =>
					prev.map((a) =>
						a.id === action.id ? { ...a, completed: true, executed: true } : a
					)
				);
			}
		} catch (error) {
			console.error('Failed to complete action:', error);
		}
	}, []);

	const deferAction = useCallback(async (action: Action) => {
		try {
			const response = await ApiService.put(
				`/intelligent-actions/${action.id}/defer`,
				{
					deferUntil: new Date(
						Date.now() + 7 * 24 * 60 * 60 * 1000
					).toISOString(), // 1 week from now
				}
			);

			if (response.success) {
				// Remove from current list
				setActions((prev) => prev.filter((a) => a.id !== action.id));
			}
		} catch (error) {
			console.error('Failed to defer action:', error);
		}
	}, []);

	const generateActionsFromInsight = useCallback(async (insight: any) => {
		try {
			const response = await ApiService.post(
				'/intelligent-actions/analyze-insight',
				{
					insight,
				}
			);

			if (response.success && response.data) {
				// Add new actions to the list
				const newActions: Action[] = response.data.map((action: any) => ({
					id: action._id,
					_id: action._id,
					title: action.title,
					description: action.description,
					priority: action.priority || 'medium',
					completed: false,
					executed: false,
					actionType: action.actionType,
					parameters: action.parameters,
					insightId: insight._id,
					source: 'insight_analysis',
					createdAt: action.createdAt,
					updatedAt: action.updatedAt,
				}));

				setActions((prev) => [...prev, ...newActions]);
				return newActions;
			}
		} catch (error) {
			console.error('Failed to generate actions from insight:', error);
		}
		return [];
	}, []);

	useEffect(() => {
		fetchActions();
	}, [fetchActions]);

	return {
		actions,
		loading,
		completeAction,
		deferAction,
		generateActionsFromInsight,
		refresh: fetchActions,
	};
}
