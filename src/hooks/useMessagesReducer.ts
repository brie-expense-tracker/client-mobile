import { useReducer, useRef, useCallback } from 'react';
import { createLogger } from '../utils/sublogger';

const messagesReducerLog = createLogger('useMessagesReducer');

export interface Message {
	id: string;
	isUser: boolean;
	text: string;
	streamingText?: string;
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

export type MessageAction =
	| { type: 'ADD_USER'; msg: Omit<Message, 'timestamp'> }
	| { type: 'ADD_AI_PLACEHOLDER'; msg: Omit<Message, 'timestamp'> }
	| { type: 'START_STREAM'; id: string }
	| { type: 'DELTA'; id: string; text: string }
	| { type: 'APPLY_META'; id: string; meta: any }
	| { type: 'APPLY_FINAL'; id: string; payload: any }
	| { type: 'END_STREAM'; id: string }
	| { type: 'FAIL_STREAM'; id: string; error: string }
	| {
			type: 'FINALIZE';
			id: string;
			finalText?: string;
			performance?: Message['performance'];
			evidence?: string[];
	  }
	| { type: 'ERROR'; id?: string; error: string }
	| { type: 'RESET_TO_WELCOME_IF_EMPTY' }
	| { type: 'CLEAR_STREAMING' };

export function messagesReducer(
	state: Message[],
	action: MessageAction
): Message[] {
	messagesReducerLog.debug('Reducer before', {
		len: state.length,
		ids: state.map((m) => m.id),
		action: action.type,
		actionId: 'id' in action ? action.id : undefined,
	});

	switch (action.type) {
		case 'ADD_USER':
			const userMsg: Message = {
				...action.msg,
				timestamp: new Date(),
			};
			messagesReducerLog.debug('Adding user message', { id: userMsg.id });
			return [...state, userMsg];

		case 'ADD_AI_PLACEHOLDER':
			const aiMsg: Message = {
				...action.msg,
				timestamp: new Date(),
				isStreaming: true,
				streamingText: '',
			};
			messagesReducerLog.debug('Adding AI placeholder', {
				id: aiMsg.id,
				stateBefore: state.map((m) => ({ id: m.id, isUser: m.isUser })),
			});
			const newState = [...state, aiMsg];
			messagesReducerLog.debug('New state after adding', {
				newState: newState.map((m) => ({ id: m.id, isUser: m.isUser })),
			});
			return newState;

		case 'START_STREAM':
			messagesReducerLog.debug('Starting stream for message', {
				id: action.id,
			});
			return state.map((m) =>
				m.id === action.id
					? { ...m, isStreaming: true, streamingText: m.streamingText ?? '' }
					: m
			);

		case 'DELTA':
			messagesReducerLog.debug('Delta for message', {
				id: action.id,
				textLength: action.text.length,
			});
			return state.map((m) =>
				m.id === action.id
					? { ...m, streamingText: (m.streamingText ?? '') + action.text }
					: m
			);

		case 'FINALIZE':
			messagesReducerLog.debug('Finalizing message', { id: action.id });
			return state.map((m) =>
				m.id === action.id
					? {
							...m,
							text:
								action.finalText ||
								(m.streamingText && m.streamingText.length > 0
									? m.streamingText
									: m.text || ''),
							isStreaming: false,
							streamingText: '',
							performance: action.performance || m.performance,
							evidence: action.evidence || m.evidence,
							showWorkButton: true,
					  }
					: m
			);

		case 'ERROR':
			messagesReducerLog.debug('Error for message', {
				id: action.id,
				error: action.error,
			});
			if (action.id) {
				return state.map((m) =>
					m.id === action.id
						? {
								...m,
								isStreaming: false,
								text: "I'm having trouble reaching the AI model right now. Please try again.",
								streamingText: '',
						  }
						: m
				);
			}
			return state; // Don't reset here; just keep state for inspection

		case 'RESET_TO_WELCOME_IF_EMPTY':
			// Safety valve: NEVER nuke to 1 unless truly empty
			messagesReducerLog.debug('Reset check', { currentLength: state.length });
			return state.length === 0 ? state : state;

		case 'APPLY_META':
			messagesReducerLog.debug('Applying meta for message', { id: action.id });
			return state.map((m) =>
				m.id === action.id
					? { ...m, performance: { ...m.performance, ...action.meta } }
					: m
			);

		case 'APPLY_FINAL':
			messagesReducerLog.debug('Applying final for message', { id: action.id });
			return state.map((m) =>
				m.id === action.id
					? {
							...m,
							text: action.payload.response || m.text,
							performance: action.payload.performance || m.performance,
							evidence: action.payload.evidence || m.evidence,
					  }
					: m
			);

		case 'END_STREAM':
			messagesReducerLog.debug('Ending stream for message', { id: action.id });
			return state.map((m) =>
				m.id === action.id
					? {
							...m,
							isStreaming: false,
							text:
								m.streamingText && m.streamingText.length > 0
									? m.streamingText
									: m.text,
							streamingText: '',
					  }
					: m
			);

		case 'FAIL_STREAM':
			messagesReducerLog.debug('Failing stream for message', {
				id: action.id,
				error: action.error,
			});
			return state.map((m) =>
				m.id === action.id
					? {
							...m,
							isStreaming: false,
							text: "I'm having trouble reaching the AI model right now. Please try again.",
							streamingText: '',
					  }
					: m
			);

		case 'CLEAR_STREAMING':
			messagesReducerLog.debug('Clearing streaming state', {
				currentMessages: state.map((m) => ({
					id: m.id,
					isStreaming: m.isStreaming,
					hasStreamingText: !!(m.streamingText && m.streamingText.length > 0),
				})),
			});
			return state.map((m) => ({
				...m,
				isStreaming: false,
				streamingText: '',
			}));

		default:
			messagesReducerLog.warn('Unknown action type', {
				type: (action as any).type,
			});
			return state;
	}
}

export function useMessagesReducer(initialMessages: Message[]) {
	const [messages, dispatch] = useReducer(messagesReducer, initialMessages);
	const lastDeltaAt = useRef<number | null>(null);
	const streamingRef = useRef<{
		messageId: string | null;
		sessionId: string | null;
	}>({
		messageId: null,
		sessionId: null,
	});

	const onDeltaReceived = useCallback(() => {
		lastDeltaAt.current = Date.now();
	}, []);

	const addUserMessage = useCallback((text: string) => {
		const userMessage = {
			id: Date.now().toString(),
			text: text.trim(),
			isUser: true,
		};
		dispatch({ type: 'ADD_USER', msg: userMessage });
		return userMessage.id;
	}, []);

	const addAIPlaceholder = useCallback((id: string) => {
		const aiMessage = {
			id,
			text: '',
			isUser: false,
		};
		dispatch({ type: 'ADD_AI_PLACEHOLDER', msg: aiMessage });
		return id;
	}, []);

	const startStream = useCallback((messageId: string) => {
		streamingRef.current.messageId = messageId;
		dispatch({ type: 'START_STREAM', id: messageId });
	}, []);

	const addDelta = useCallback(
		(messageId: string, text: string) => {
			onDeltaReceived();
			dispatch({ type: 'DELTA', id: messageId, text });
		},
		[onDeltaReceived]
	);

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

	const setError = useCallback((messageId: string, error: string) => {
		dispatch({ type: 'ERROR', id: messageId, error });
	}, []);

	const clearStreaming = useCallback(() => {
		streamingRef.current = { messageId: null, sessionId: null };
		dispatch({ type: 'CLEAR_STREAMING' });
	}, []);

	return {
		messages,
		dispatch,
		lastDeltaAt,
		streamingRef,
		onDeltaReceived,
		addUserMessage,
		addAIPlaceholder,
		startStream,
		addDelta,
		finalizeMessage,
		setError,
		clearStreaming,
	};
}
