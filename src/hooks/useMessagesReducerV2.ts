import { useReducer, useRef, useCallback } from 'react';
import { createLogger } from '../utils/sublogger';

const messagesReducerV2Log = createLogger('useMessagesReducerV2');

const MAX_ASSISTANT_CHARS = 8000;
const MAX_STREAM_BUFFER_CHARS = 8000;
const MAX_DELTA_CHARS = 1000;

function truncateWithNotice(text: string, max: number) {
	if (!text) return text;
	if (text.length <= max) return text;
	const suffix = '\n\n…(truncated to keep chat fast)';
	const sliceLen = Math.max(0, max - suffix.length);
	return text.slice(0, sliceLen) + suffix;
}

export type MessageAction = any; // Simplified for now

export type MessagePhase = 'deterministic' | 'llm' | 'final';

export interface Message {
	id: string;
	isUser: boolean;
	text?: string;
	buffered?: string;
	isStreaming?: boolean;
	timestamp: Date;
	phase?: MessagePhase;
	meta?: Record<string, unknown>;
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

function upsertImmutable(state: State, msg: Message): State {
	const exists = !!state.byId[msg.id];
	if (!exists) {
		return {
			...state,
			byId: { ...state.byId, [msg.id]: msg },
			order: [...state.order, msg.id],
		};
	}
	return {
		...state,
		byId: { ...state.byId, [msg.id]: { ...state.byId[msg.id], ...msg } },
	};
}

export const messagesReducerV2 = (state = initial, action: any): State => {
	messagesReducerV2Log.debug('Action', {
		type: action.type,
		id: 'id' in action ? action.id : undefined,
	});

	switch (action.type) {
		case 'ADD_USER': {
			const id = action.id as string;
			return upsertImmutable(state, {
				id,
				isUser: true,
				text: action.text,
				isStreaming: false,
				timestamp: new Date(),
			});
		}

		case 'ADD_AI_PLACEHOLDER': {
			const id = action.id as string;
			const next = upsertImmutable(state, {
				id,
				isUser: false,
				buffered: '',
				isStreaming: true,
				timestamp: new Date(),
			});
			return { ...next, streamingId: id };
		}

		case 'ADD_ASSISTANT': {
			const id = action.id as string;
			return upsertImmutable(state, {
				id,
				isUser: false,
				text: truncateWithNotice(action.text ?? '', MAX_ASSISTANT_CHARS),
				isStreaming: false,
				timestamp: new Date(),
				performance: action.performance,
				phase: action.phase,
				meta: action.meta,
			});
		}

		case 'APPEND_DELTA': {
			const { id, text } = action as { id: string; text: string };

			let baseState = state;
			if (!baseState.byId[id]) {
				messagesReducerV2Log.warn('APPEND_DELTA upserting missing message', {
					id,
					keys: Object.keys(baseState.byId),
				});
				baseState = upsertImmutable(baseState, {
					id,
					isUser: false,
					buffered: '',
					isStreaming: true,
					timestamp: new Date(),
				});
			}

			const m = baseState.byId[id];
			const safeDelta = (text ?? '').slice(0, MAX_DELTA_CHARS);
			const prev = m.buffered ?? '';
			const combined = prev + safeDelta;
			const nextBuffered = combined.slice(0, MAX_STREAM_BUFFER_CHARS);

			const nextMeta =
				combined.length > MAX_STREAM_BUFFER_CHARS
					? {
							...(m.meta || {}),
							truncated: true,
							truncatedAt: MAX_STREAM_BUFFER_CHARS,
					  }
					: m.meta;

			return {
				...baseState,
				byId: {
					...baseState.byId,
					[id]: {
						...m,
						buffered: nextBuffered,
						isStreaming: true,
						meta: nextMeta,
					},
				},
			};
		}

		case 'FINALIZE': {
			const id = action.id as string;
			const existing = state.byId[id];

			// idempotent
			if (existing && existing.isStreaming === false) return state;

			// recovery: finalize any streaming message
			if (!existing) {
				messagesReducerV2Log.error('FINALIZE missing message', { id });
				const streamingMessage = Object.values(state.byId).find(
					(m) => m.isStreaming
				);
				if (!streamingMessage) return { ...state, streamingId: null };

				const recoveryRaw =
					action.finalText ||
					streamingMessage.buffered ||
					streamingMessage.text ||
					'Response incomplete';

				const recoveryText = truncateWithNotice(
					recoveryRaw,
					MAX_ASSISTANT_CHARS
				);

				return {
					...state,
					byId: {
						...state.byId,
						[streamingMessage.id]: {
							...streamingMessage,
							text: recoveryText,
							buffered: '',
							isStreaming: false,
							performance: action.performance || streamingMessage.performance,
							evidence: action.evidence || streamingMessage.evidence,
						},
					},
					streamingId: null,
				};
			}

			const rawFinal =
				action.finalText ||
				existing.buffered ||
				existing.text ||
				'Response completed';
			const finalText = truncateWithNotice(rawFinal, MAX_ASSISTANT_CHARS);

			return {
				...state,
				byId: {
					...state.byId,
					[id]: {
						...existing,
						text: finalText,
						buffered: '',
						isStreaming: false,
						performance: action.performance || existing.performance,
						evidence: action.evidence || existing.evidence,
					},
				},
				streamingId: null,
			};
		}

		case 'CLEAR_STREAMING': {
			const id = action.id;
			if (!id) return state;

			const sid = state.streamingId;
			if (sid && state.byId[sid]) {
				return {
					...state,
					byId: {
						...state.byId,
						[sid]: { ...state.byId[sid], isStreaming: false },
					},
					streamingId: null,
				};
			}
			return { ...state, streamingId: null };
		}

		case 'SET_ERROR': {
			const { id } = action as { id: string; error: string };
			const m = state.byId[id];
			if (!m) return { ...state, streamingId: null };

			return {
				...state,
				byId: {
					...state.byId,
					[id]: {
						...m,
						isStreaming: false,
						text: "I'm having trouble reaching the AI model right now. Please try again.",
						buffered: '',
					},
				},
				streamingId: null,
			};
		}

		case 'UPDATE_MESSAGE': {
			const { id, patch } = action as { id: string; patch: Partial<Message> };
			const m = state.byId[id];
			if (!m) return state;
			return {
				...state,
				byId: { ...state.byId, [id]: { ...m, ...patch } },
			};
		}

		default:
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

	const addAssistantMessage = useCallback(
		(
			text: string,
			options?: {
				id?: string;
				performance?: Message['performance'];
				phase?: Message['phase'];
				meta?: Message['meta'];
			}
		) => {
			const id = options?.id || Date.now().toString();
			dispatch({
				type: 'ADD_ASSISTANT',
				id,
				text,
				performance: options?.performance,
				phase: options?.phase,
				meta: options?.meta,
			});
			return id;
		},
		[]
	);

	const updateMessage = useCallback((id: string, patch: Partial<Message>) => {
		dispatch({ type: 'UPDATE_MESSAGE', id, patch });
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
		addAssistantMessage,
		addDelta,
		finalizeMessage,
		updateMessage,
		setError,
		clearStreaming,
	};
}
