import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services';
import { createLogger } from '../utils/sublogger';

const threadHookLog = createLogger('useThread');

interface Message {
	id: string;
	type: 'insight' | 'user' | 'action';
	content: string;
	actionId?: string;
	completed?: boolean;
}

interface Thread {
	id: string;
	_id?: string;
	title: string;
	messages: Message[];
	focusArea?: string;
	createdAt?: string;
	updatedAt?: string;
}

export default function useThread(threadId: string) {
	const [thread, setThread] = useState<Thread | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchThread = useCallback(async () => {
		if (!threadId) return;

		setLoading(true);
		try {
			const response = await ApiService.get<Thread>(`/api/threads/${threadId}`);

			if (response.success && response.data) {
				const threadData = response.data as any;
				setThread({
					id: threadData._id || threadData.id,
					_id: threadData._id,
					title: threadData.title,
					focusArea: threadData.focusArea,
					createdAt: threadData.createdAt,
					updatedAt: threadData.updatedAt,
					messages: (threadData.messages || []) as Message[],
				});
			} else {
				setThread(null);
			}
		} catch (error) {
			threadHookLog.error('Failed to fetch thread', error);
			setThread(null);
		} finally {
			setLoading(false);
		}
	}, [threadId]);

	const completeAction = useCallback(
		async (actionId: string) => {
			if (!thread) return;

			try {
				// Update the action completion status
				const response = await ApiService.put(
					`/api/threads/${threadId}/actions/${actionId}/complete`,
					{
						completed: true,
					}
				);

				if (response.success) {
					// Update local state
					setThread((prev) => {
						if (!prev) return prev;
						return {
							...prev,
							messages: prev.messages.map((msg) =>
								msg.actionId === actionId ? { ...msg, completed: true } : msg
							),
						};
					});
				}
			} catch (error) {
				threadHookLog.error('Failed to complete action', error);
			}
		},
		[thread, threadId]
	);

	const addMessage = useCallback(
		async (
			type: 'user' | 'insight' | 'action',
			content: string,
			actionId?: string
		) => {
			if (!thread) return;

			try {
				const response = await ApiService.post(
					`/api/threads/${threadId}/messages`,
					{
						type,
						content,
						actionId,
					}
				);

				if (response.success && response.data) {
					// Update local state with new message
					setThread((prev) => {
						if (!prev) return prev;
						return {
							...prev,
							messages: [...prev.messages, response.data as Message],
						};
					});
				}
			} catch (error) {
				threadHookLog.error('Failed to add message', error);
			}
		},
		[thread, threadId]
	);

	useEffect(() => {
		fetchThread();
	}, [fetchThread]);

	return {
		thread,
		loading,
		completeAction,
		addMessage,
		refresh: fetchThread,
	};
}
