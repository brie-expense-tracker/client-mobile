import { useReducer, useRef, useCallback } from 'react';

export type MessageAction = any; // Simplified for now

export interface Message {
	id: string;
	isUser: boolean;
	text?: string;
	buffered?: string;
	isStreaming?: boolean;
	timestamp: Date;
	performance?: {
		totalLatency?: number;
		timeToFirstToken?: number;
		cacheHit: boolean;
		modelUsed?: string;
		tokensUsed?: number;
		parallelTools?: {
			executed: string[];
			timings: Record<string, number>;
			successCount: number;
			failureCount: number;
			timeoutCount: number;
			avgToolTime: number;
		};
		parallelFacts?: {
			queriesExecuted: number;
			successCount: number;
			failureCount: number;
			avgQueryTime: number;
			queryTimings: Record<string, number>;
		};
		optimizations?: {
			parallelFactFetching: boolean;
			parallelToolExecution: boolean;
			optimizedCritic: boolean;
		};
	};
	evidence?: string[];
	showWorkButton?: boolean;
}

type State = {
	byId: Record<string, Message>;
	order: string[];
	streamingId: string | null;
};

const initial: State = { byId: {}, order: [], streamingId: null };

function upsert(state: State, msg: Message) {
	if (!state.byId[msg.id]) {
		state.byId[msg.id] = msg;
		state.order.push(msg.id);
	} else {
		state.byId[msg.id] = { ...state.byId[msg.id], ...msg };
	}
}

export const messagesReducerV2 = (state = initial, action: any): State => {
	console.log('[REDUCER_V2] Action:', action.type, {
		id: 'id' in action ? action.id : undefined,
	});

	switch (action.type) {
		case 'ADD_USER': {
			const id = action.id as string;
			const msg: Message = {
				id,
				isUser: true,
				text: action.text,
				isStreaming: false,
				timestamp: new Date(),
			};
			upsert(state, msg);
			return { ...state };
		}
		case 'ADD_AI_PLACEHOLDER': {
			const id = action.id as string;
			const msg: Message = {
				id,
				isUser: false,
				buffered: '',
				isStreaming: true,
				timestamp: new Date(),
			};
			upsert(state, msg);
			return { ...state, streamingId: id };
		}
		case 'APPEND_DELTA': {
			const { id, text } = action as { id: string; text: string };
			console.log('[APPEND_DELTA]', {
				msgId: id,
				len: text.length,
				preview: text.slice(0, 30),
				timestamp: new Date().toISOString(),
			});

			if (!state.byId[id]) {
				console.warn('🧩 APPEND_DELTA upserting missing message', {
					id,
					keys: Object.keys(state.byId),
				});
				upsert(state, {
					id,
					isUser: false,
					buffered: '',
					isStreaming: true,
					timestamp: new Date(),
				});
			}

			// Ensure the message exists before appending
			if (state.byId[id]) {
				state.byId[id].buffered = (state.byId[id].buffered ?? '') + text;
			} else {
				console.error('❌ APPEND_DELTA failed to create message', { id });
			}
			return { ...state };
		}
		case 'FINALIZE': {
			const id = action.id as string;

			// Guard: check if message already finalized (idempotent)
			if (state.byId[id] && !state.byId[id].isStreaming) {
				console.log('[Reducer] FINALIZE already completed for id:', id);
				return state;
			}

			if (!state.byId[id]) {
				console.error('❌ FINALIZE missing message', { id });
				// Try to find any streaming message to finalize
				const streamingMessage = Object.values(state.byId).find(
					(m) => m.isStreaming
				);
				if (streamingMessage) {
					console.log(
						'🔄 FINALIZE recovery: found streaming message',
						streamingMessage.id
					);
					state.byId[streamingMessage.id] = {
						...streamingMessage,
						text:
							streamingMessage.buffered ||
							streamingMessage.text ||
							'Response incomplete',
						buffered: '',
						isStreaming: false,
					};
				}
				return { ...state, streamingId: null };
			}
			const m = state.byId[id];
			state.byId[id] = {
				...m,
				text: m.buffered || m.text || 'Response completed',
				buffered: '',
				isStreaming: false,
			};
			return { ...state, streamingId: null };
		}
		case 'CLEAR_STREAMING': {
			const id = action.id;
			if (!id) {
				console.warn('[Reducer] CLEAR_STREAMING without id — ignored');
				return state;
			}
			if (state.streamingId && state.byId[state.streamingId]) {
				state.byId[state.streamingId].isStreaming = false;
			}
			return { ...state, streamingId: null };
		}
		case 'SET_ERROR': {
			const { id, error } = action as { id: string; error: string };
			if (state.byId[id]) {
				state.byId[id] = {
					...state.byId[id],
					isStreaming: false,
					text: "I'm having trouble reaching the AI model right now. Please try again.",
					buffered: '',
				};
			}
			return { ...state, streamingId: null };
		}
		default:
			console.warn('[REDUCER_V2] Unknown action type:', action.type);
			return state;
	}
};

export function useMessagesReducerV2(initialMessages: Message[]) {
	// Convert initial array to map + order format
	const initialState: State = {
		byId: {},
		order: [],
		streamingId: null,
	};

	initialMessages.forEach((msg, index) => {
		initialState.byId[msg.id] = msg;
		initialState.order.push(msg.id);
	});

	const [state, dispatch] = useReducer(messagesReducerV2, initialState);
	const streamingRef = useRef<{
		messageId: string | null;
		sessionId: string | null;
	}>({
		messageId: null,
		sessionId: null,
	});

	// Convert state back to array for compatibility
	const messages = state.order.map((id) => state.byId[id]);

	const addUserMessage = useCallback((text: string) => {
		const id = Date.now().toString();
		dispatch({ type: 'ADD_USER', id, text });
		return id;
	}, []);

	const addAIPlaceholder = useCallback((id: string) => {
		dispatch({ type: 'ADD_AI_PLACEHOLDER', id });
		return id;
	}, []);

	const addDelta = useCallback((messageId: string, text: string) => {
		dispatch({ type: 'APPEND_DELTA', id: messageId, text });
	}, []);

	const finalizeMessage = useCallback(
		(
			messageId: string,
			finalText?: string,
			performance?: Message['performance'],
			evidence?: string[]
		) => {
			dispatch({
				type: 'FINALIZE',
				id: messageId,
				finalText,
				performance,
				evidence,
			});
		},
		[]
	);

	const setError = useCallback((messageId: string, errorMessage: string) => {
		dispatch({ type: 'SET_ERROR', id: messageId, error: errorMessage });
	}, []);

	const clearStreaming = useCallback(
		(messageId?: string) => {
			streamingRef.current = { messageId: null, sessionId: null };
			dispatch({ type: 'CLEAR_STREAMING', id: messageId || state.streamingId });
		},
		[state.streamingId]
	);

	const onDeltaReceived = useCallback(() => {
		// No-op for compatibility
	}, []);

	return {
		messages,
		dispatch,
		streamingRef,
		onDeltaReceived,
		addUserMessage,
		addAIPlaceholder,
		addDelta,
		finalizeMessage,
		setError,
		clearStreaming,
	};
}
