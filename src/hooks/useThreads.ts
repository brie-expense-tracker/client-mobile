import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services';

interface Thread {
	id: string;
	_id?: string;
	title: string;
	kpi?: string;
	nextActions?: { id: string; title: string }[];
	createdAt: string;
	updatedAt?: string;
	focusArea?: string;
	messages?: {
		id: string;
		type: 'insight' | 'user' | 'action';
		content: string;
		actionId?: string;
		completed?: boolean;
	}[];
}

export default function useThreads() {
	const [threads, setThreads] = useState<Thread[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchThreads = useCallback(async () => {
		setLoading(true);
		try {
			const response = await ApiService.get('/threads');

			if (response.success && response.data && Array.isArray(response.data)) {
				// Transform the data to match our interface
				const transformedThreads: Thread[] = response.data.map(
					(thread: any) => ({
						id: thread._id,
						_id: thread._id,
						title: thread.title,
						focusArea: thread.focusArea,
						createdAt: thread.createdAt,
						updatedAt: thread.updatedAt,
						messages: thread.messages || [],
						// Generate KPI and next actions from messages
						kpi: generateKPI(thread.messages),
						nextActions: generateNextActions(thread.messages),
					})
				);

				setThreads(transformedThreads);
			} else {
				setThreads([]);
			}
		} catch (error) {
			console.error('Failed to fetch threads:', error);
			setThreads([]);
		} finally {
			setLoading(false);
		}
	}, []);

	// Generate KPI from thread messages
	const generateKPI = (messages: any[] = []): string => {
		if (messages.length === 0) return 'No activity yet';

		const actionMessages = messages.filter((msg) => msg.type === 'action');
		const completedActions = actionMessages.filter((msg) => msg.completed);

		if (actionMessages.length === 0) return 'Ready to start';
		return `Progress: ${completedActions.length}/${actionMessages.length} actions`;
	};

	// Generate next actions from thread messages
	const generateNextActions = (
		messages: any[] = []
	): { id: string; title: string }[] => {
		const actionMessages = messages.filter(
			(msg) => msg.type === 'action' && !msg.completed
		);
		return actionMessages.slice(0, 3).map((msg, index) => ({
			id: msg.actionId || `action_${index}`,
			title: msg.content,
		}));
	};

	const refresh = useCallback(() => {
		fetchThreads();
	}, [fetchThreads]);

	useEffect(() => {
		fetchThreads();
	}, [fetchThreads]);

	return {
		threads,
		loading,
		refresh,
	};
}
