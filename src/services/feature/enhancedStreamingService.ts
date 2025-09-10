/**
 * Enhanced Streaming Service
 *
 * Provides robust streaming with buffering, retry mechanism, and typed events
 * Optimized for React Native with proper error handling and performance tracking
 */

import { getApiBaseUrl } from '../../config/environment';
import { ApiService } from '../core/apiService';
import { buildSseUrl } from '../../networking/endpoints';

// Type definitions for SSE options
type StartOptions = {
	url: string;
	headers?: Record<string, string>;
	method?: 'GET' | 'POST';
	body?: any;
	onMessage: (data: string) => void;
	onError?: (err: any) => void;
	onOpen?: () => void;
	onDone?: () => void;
};

export interface StreamingChunk {
	type: 'meta' | 'delta' | 'final' | 'trace' | 'done' | 'error';
	data: any;
	timestamp: Date;
	id?: string;
}

export interface MetaEventData {
	model: string;
	cacheHit: boolean;
	sessionId: string;
	requestId: string;
	timeToFirstToken?: number;
}

export interface DeltaEventData {
	text: string;
	index: number;
	total: number;
}

export interface FinalEventData {
	response: string;
	sessionId: string;
	performance: {
		timeToFirstToken: number;
		totalTime: number;
		cacheHit: boolean;
		modelUsed: string;
		tokensUsed: number;
	};
	intentResult?: any;
	evidence?: string[];
	metadata: any;
}

export interface TraceEventData {
	whyThis: {
		totals: {
			confidence: number;
			relevance: number;
			completeness: number;
		};
		inputs: {
			userData: any;
			context: any;
			preferences: any;
		};
		reasoning: string[];
	};
	performance: {
		timeToFirstToken: number;
		totalTime: number;
		cacheHit: boolean;
		modelUsed: string;
		tokensUsed: number;
	};
}

export interface StreamingCallbacks {
	onMeta?: (data: MetaEventData) => void;
	onDelta?: (data: DeltaEventData, bufferedText: string) => void;
	onFinal?: (data: FinalEventData) => void;
	onTrace?: (data: TraceEventData) => void;
	onDone?: () => void;
	onError?: (error: string) => void;
}

/**
 * Get authentication headers for API requests
 */
async function getApiHeaders(): Promise<Record<string, string>> {
	try {
		// Use the same method as ApiService to get auth headers
		const headers = await (ApiService as any).getAuthHeaders();
		return headers;
	} catch (error) {
		console.error(
			'[EnhancedStreamingService] Error getting auth headers:',
			error
		);
		// Return basic headers if auth fails
		return {
			'Content-Type': 'application/json',
		};
	}
}

/**
 * Fallback non-streaming request with proper auth headers
 */
export async function fetchNonStreaming(
	url: string,
	body: any,
	getHeaders: () => Promise<Record<string, string>>
): Promise<string> {
	try {
		const headers = {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			...(await getHeaders()),
		};

		const res = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
		});

		if (!res.ok) {
			throw new Error(`HTTP ${res.status}`);
		}

		const json = await res.json();

		// Be defensive about server shapes
		return (
			json.message ??
			json.response ??
			json.data?.message ??
			json.data?.response ??
			json.text ??
			''
		);
	} catch (error) {
		console.error(
			'[EnhancedStreamingService] Non-streaming request failed:',
			error
		);
		throw error;
	}
}

/**
 * Start SSE connection using react-native-sse polyfill
 */
export async function startSSE({
	url,
	headers = {},
	method = 'GET',
	body,
	onMessage,
	onError,
	onOpen,
	onDone,
}: StartOptions) {
	// Single-flight guard
	if (
		connecting ||
		(currentConnection && (currentConnection as any).readyState === 1)
	) {
		console.warn('[SSE] already open/connecting — skipping duplicate connect');
		return () => {}; // no-op disposer
	}

	try {
		// Check if EventSource is available (should be polyfilled)
		const hasES = typeof (global as any).EventSource !== 'undefined';
		if (!hasES) {
			console.warn('[SSE] EventSource missing; falling back to non-streaming');
			throw new Error(
				'EventSource is not available. Make sure polyfill is loaded.'
			);
		}

		// Get auth headers for UID
		const authHeaders = await getApiHeaders();
		const firebaseUid = authHeaders['x-firebase-uid'];
		connecting = true;

		// Build URL with UID in query string (RN EventSource can't send headers reliably)
		const messageToSend = body?.message?.trim() || '';
		const sessionIdToSend =
			body?.sessionId ||
			`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const messageId = `msg_${Date.now()}_${Math.random()
			.toString(36)
			.substr(2, 9)}`;

		console.log('[EnhancedStreamingService] URL building debug:');
		console.log('[EnhancedStreamingService] body:', body);
		console.log('[EnhancedStreamingService] body.message:', body?.message);
		console.log('[EnhancedStreamingService] messageToSend:', messageToSend);
		console.log('[EnhancedStreamingService] sessionIdToSend:', sessionIdToSend);

		const urlWithUid = buildSseUrl({
			sessionId: sessionIdToSend,
			message: messageToSend,
			uid: firebaseUid,
			clientMessageId: messageId,
		});

		console.log('[EnhancedStreamingService] Final URL:', urlWithUid);

		// Create EventSource - only pass URL, no options
		const es = new (global as any).EventSource(urlWithUid);
		currentConnection = es;

		// Add a raw data interceptor to catch any unparsed SSE data
		const originalAddEventListener = es.addEventListener.bind(es);
		es.addEventListener = function (
			type: string,
			listener: any,
			options?: any
		) {
			console.log('[SSE] Adding event listener for type:', type);
			return originalAddEventListener(type, listener, options);
		};

		// Add debugging for EventSource properties
		console.log('[SSE] EventSource created with URL:', es.url);
		console.log('[SSE] EventSource readyState:', es.readyState);
		console.log(
			'[SSE] EventSource withCredentials:',
			(es as any).withCredentials
		);

		// Add a timeout to detect if we're not receiving proper data
		let dataTimeout: number;
		let responseTimeout: number;

		// Set up the timeout immediately
		dataTimeout = setTimeout(() => {
			if (!gotFirstChunk) {
				console.warn(
					'[SSE] No data received within 5 seconds, connection may be stuck'
				);
				console.warn('[SSE] Connection state:', es.readyState);
				console.warn('[SSE] URL:', urlWithUid);

				// Try fetch streaming fallback instead of immediate error
				console.log('[SSE] Trying fetch streaming fallback due to timeout');
				tryFetchStreaming();
			}
		}, 5000);

		// Set up a response timeout to detect if we get stuck after receiving data
		responseTimeout = setTimeout(() => {
			console.warn('[SSE] Response timeout - no completion signal received');
			console.warn('[SSE] Connection state:', es.readyState);
			console.warn('[SSE] Got first chunk:', gotFirstChunk);
			close();
			onError?.(new Error('Response timeout - stream may be stuck'));
		}, 30000); // 30 second timeout for complete response

		// Add a fallback mechanism to try fetch streaming if EventSource fails
		const tryFetchStreaming = async () => {
			console.log('[SSE] EventSource failed, trying fetch streaming fallback');
			try {
				const response = await fetch(urlWithUid, {
					method: 'GET',
					headers: {
						Accept: 'text/event-stream',
						'Cache-Control': 'no-cache',
						...authHeaders,
					},
				});

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				const reader = response.body?.getReader();
				if (!reader) {
					throw new Error('No response body reader available');
				}

				const decoder = new TextDecoder();
				let buffer = '';

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });

					// Process complete SSE events
					const events = buffer.split('\n\n');
					buffer = events.pop() || ''; // Keep incomplete event in buffer

					for (const event of events) {
						if (event.trim()) {
							console.log('[SSE] Processing fetch event:', event);
							parseSSEData(event + '\n\n');
						}
					}
				}

				console.log('[SSE] Fetch streaming completed');
				onDone?.();
			} catch (error) {
				console.error('[SSE] Fetch streaming failed:', error);
				onError?.(error);
			}
		};

		const close = () => {
			try {
				if (dataTimeout) clearTimeout(dataTimeout);
				if (responseTimeout) clearTimeout(responseTimeout);
				es.close();
			} catch (error) {
				if (__DEV__) {
					console.warn(
						'[EnhancedStreamingService] Error closing EventSource:',
						error
					);
				}
			}
			currentConnection = null;
			connecting = false;
		};

		es.addEventListener('open', () => {
			console.log('[SSE] open');
			console.log('[SSE] Connection state:', es.readyState);
			console.log('[SSE] URL:', urlWithUid);
			connecting = false;
			onOpen?.();

			// Set a timeout to detect if no data is received
			setTimeout(() => {
				if (!gotFirstChunk && es.readyState === 1) {
					console.warn(
						'[SSE] No data received within 10 seconds, connection may be stuck'
					);
					console.warn('[SSE] Connection state after timeout:', es.readyState);
					console.warn('[SSE] URL after timeout:', urlWithUid);
				}
			}, 10000);
		});

		// Track if we've received any chunks to avoid premature fallback
		let gotFirstChunk = false;

		// Manual SSE parser to handle raw data
		const parseSSEData = (data: string) => {
			console.log('[SSE] Parsing raw data:', data);

			// Split by double newlines to get individual SSE events
			const events = data.split('\n\n').filter((event) => event.trim());

			for (const event of events) {
				console.log('[SSE] Processing SSE event:', event);

				// Split by newlines to get individual lines
				const lines = event.split('\n');
				let eventData = '';
				let eventType = 'message';

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						eventData = line.substring(6);
					} else if (line.startsWith('event: ')) {
						eventType = line.substring(7);
					}
				}

				if (eventData) {
					console.log('[SSE] Extracted event data:', eventData);
					console.log('[SSE] Event type:', eventType);

					if (eventData === '[DONE]') {
						console.log('[SSE] Received DONE signal');
						close();
						onDone?.();
						return;
					}

					try {
						const chunk = JSON.parse(eventData);
						console.log('[SSE] Parsed SSE chunk:', chunk);
						gotFirstChunk = true;
						onMessage(JSON.stringify(chunk));
					} catch (parseError) {
						console.log('[SSE] Failed to parse SSE JSON:', parseError);
						gotFirstChunk = true;
						onMessage(eventData);
					}
				}
			}
		};

		// Handle chunks from all possible SSE event names
		const handleChunk = (ev: MessageEvent) => {
			console.log('[SSE] Received chunk:', ev.data);
			console.log('[SSE] Event type:', ev.type);
			console.log('[SSE] Event origin:', ev.origin);
			console.log('[SSE] Raw event object:', ev);
			console.log('[SSE] Data is empty object?', ev.data === '{}');
			console.log('[SSE] Data is empty string?', ev.data === '');
			console.log('[SSE] Data is null/undefined?', ev.data == null);

			if (!ev?.data) {
				console.log('[SSE] No data in event, skipping');
				return;
			}

			// Handle empty object case specifically
			if (ev.data === '{}') {
				console.log('[SSE] Received empty object, skipping chunk');
				return;
			}

			// Handle SSE data format
			if (ev.data.startsWith('data: ')) {
				const jsonData = ev.data.substring(6);
				console.log('[SSE] Extracted JSON from SSE format:', jsonData);
				console.log('[SSE] JSON data type:', typeof jsonData);
				console.log('[SSE] JSON data length:', jsonData.length);

				if (jsonData === '[DONE]') {
					console.log('[SSE] Received DONE signal via SSE');
					close();
					onDone?.();
					return;
				}

				try {
					const chunk = JSON.parse(jsonData);
					console.log('[SSE] Parsed SSE chunk:', chunk);
					console.log('[SSE] Chunk type:', chunk.type);
					console.log('[SSE] Chunk keys:', Object.keys(chunk || {}));
					gotFirstChunk = true;
					onMessage(JSON.stringify(chunk));
				} catch (parseError) {
					console.log('[SSE] Failed to parse SSE JSON:', parseError);
					console.log('[SSE] Raw data that failed to parse:', jsonData);
					gotFirstChunk = true;
					onMessage(ev.data);
				}
			} else if (ev.data === '[DONE]') {
				console.log('[SSE] Received DONE signal');
				close();
				onDone?.();
				return;
			} else if (ev.data.includes('data: ') || ev.data.includes('\n')) {
				// This might be raw SSE data that needs manual parsing
				console.log('[SSE] Detected potential raw SSE data, parsing manually');
				parseSSEData(ev.data);
			} else {
				// Try to parse as JSON for non-SSE format
				try {
					const p = JSON.parse(ev.data);
					console.log('[SSE] Parsed non-SSE JSON:', p);
					const text =
						typeof p === 'string'
							? p
							: p.text ?? p.delta ?? p.token ?? p.content ?? '';
					if (text) {
						gotFirstChunk = true;
						console.log('[SSE] Parsed text chunk:', text);
						onMessage(text);
					} else {
						gotFirstChunk = true;
						console.log('[SSE] Raw data chunk:', ev.data);
						onMessage(ev.data);
					}
				} catch (parseError) {
					gotFirstChunk = true;
					console.log('[SSE] Raw data chunk (parse failed):', ev.data);
					console.log('[SSE] Parse error:', parseError);
					onMessage(ev.data);
				}
			}
		};

		// Override the default onmessage handler to ensure we get the raw data
		es.onmessage = (ev: MessageEvent) => {
			console.log('[SSE] onmessage event received:', ev);
			console.log('[SSE] onmessage data:', ev.data);
			console.log('[SSE] onmessage data type:', typeof ev.data);
			console.log('[SSE] onmessage data length:', ev.data?.length);
			console.log('[SSE] onmessage lastEventId:', ev.lastEventId);
			console.log('[SSE] onmessage origin:', ev.origin);
			console.log('[SSE] onmessage type:', ev.type);

			// Always call handleChunk - let it decide what to do with the data
			handleChunk(ev);
		};

		// Add event listeners for all possible event types
		['token', 'chunk', 'delta', 'ready', 'message', 'data'].forEach((n) =>
			es.addEventListener(n, handleChunk)
		);

		// Add a raw data listener to catch any unparsed data
		es.addEventListener('open', () => {
			console.log('[SSE] Connection opened, setting up raw data listener');
		});

		es.addEventListener('done', () => {
			console.log('[SSE] Done event received');
			close();
			onDone?.();
		});
		es.addEventListener('ping', () => {
			// Optional no-op for ping events
		});

		es.addEventListener('error', (err: any) => {
			console.warn('[SSE] error', err);
			console.warn('[SSE] Connection state on error:', es.readyState);
			console.warn('[SSE] URL on error:', urlWithUid);
			console.warn('[SSE] Got first chunk:', gotFirstChunk);
			close();
			// Only fall back if we NEVER received a chunk
			if (!gotFirstChunk) {
				console.log(
					'[SSE] No chunks received, trying fetch streaming fallback'
				);
				tryFetchStreaming();
			} else {
				onError?.(err);
			}
		});

		return close;
	} catch (error) {
		connecting = false;
		currentConnection = null;
		if (__DEV__) {
			console.error(
				'[EnhancedStreamingService] Failed to create EventSource:',
				error
			);
		}
		onError?.(error);
		// Return a no-op close function
		return () => {};
	}
}

/**
 * Stream with fallback to non-streaming completion
 */
export async function streamOrFallback(
	args: StartOptions & {
		fallback: () => Promise<string>; // non-streaming completion
	}
) {
	try {
		return await new Promise<string>(async (resolve, reject) => {
			let full = '';
			let isResolved = false;

			try {
				const stop = await startSSE({
					...args,
					onMessage: (chunk) => {
						if (isResolved) return;

						if (chunk === '[DONE]') {
							stop();
							isResolved = true;
							resolve(full);
							return;
						}
						full += chunk;
						args.onMessage(chunk); // live UI
					},
					onError: async (error) => {
						if (isResolved) return;

						console.warn(
							'[EnhancedStreamingService] Streaming not available, using standard reply:',
							error
						);
						try {
							const fallbackResult = await args.fallback();
							isResolved = true;
							resolve(fallbackResult);
						} catch (e) {
							isResolved = true;
							reject(e);
						}
					},
					onDone: () => {
						if (!isResolved) {
							isResolved = true;
							resolve(full);
						}
					},
				});
			} catch (error) {
				if (!isResolved) {
					isResolved = true;
					reject(error);
				}
			}
		});
	} catch (error) {
		console.warn(
			'[EnhancedStreamingService] Stream failed, using fallback:',
			error
		);
		// one last fallback
		try {
			return await args.fallback();
		} catch (fallbackError) {
			console.error(
				'[EnhancedStreamingService] Fallback also failed:',
				fallbackError
			);
			throw fallbackError;
		}
	}
}

// Global single-flight guard
let currentConnection: EventSource | null = null;
let connecting = false;

/**
 * Start streaming with improved event handling as per user specifications
 */
export function startStream(args: {
	sessionId: string;
	message: string;
	headers: Record<string, string>;
	onChunk: (text: string) => void;
	onDone: () => void;
	onError: (error: any) => void;
}) {
	if (
		connecting ||
		(currentConnection && (currentConnection as any).readyState === 1)
	) {
		console.warn('[SSE] already open/connecting — skipping duplicate connect');
		return () => {};
	}

	const messageId = `msg_${Date.now()}_${Math.random()
		.toString(36)
		.substr(2, 9)}`;
	const url = buildSseUrl({
		sessionId: args.sessionId,
		message: args.message,
		clientMessageId: messageId,
	});
	connecting = true;

	const es = new (global as any).EventSource(url);
	currentConnection = es;

	es.addEventListener('open', () => {
		console.log('[SSE] open');
		console.log('[SSE] Connection state:', (es as any).readyState);
		console.log('[SSE] URL:', url);
		connecting = false;
	});

	const handleChunk = (ev: any) => {
		console.log('[SSE] Received chunk:', ev);
		console.log('[SSE] Raw data chunk:', ev?.data);

		if (!ev?.data) {
			console.log('[SSE] No data in event, skipping');
			return;
		}

		if (ev.data === '[DONE]') {
			console.log('[SSE] Received [DONE] signal, cleaning up');
			cleanup();
			args.onDone();
			return;
		}

		// Try to parse structured payloads; fall back to raw text
		try {
			const payload = JSON.parse(ev.data);
			console.log('[SSE] Parsed JSON payload:', payload);

			const text =
				typeof payload === 'string'
					? payload
					: payload.text ??
					  payload.delta ??
					  payload.token ??
					  payload.content ??
					  '';
			if (text) {
				console.log('[SSE] Extracted text from payload:', text);
				args.onChunk(text);
				return;
			}
		} catch (parseError) {
			console.log('[SSE] Failed to parse as JSON, using raw data:', parseError);
		}

		console.log('[SSE] Using raw data as text:', ev.data);
		args.onChunk(ev.data);
	};

	// Default event and common custom names
	const EVENTS = ['message', 'token', 'chunk', 'delta'];
	es.onmessage = handleChunk; // default event
	EVENTS.forEach((n) => es.addEventListener(n, handleChunk));
	es.addEventListener('done', () => {
		console.log('[SSE] Done event received');
		cleanup();
		args.onDone();
	});

	es.addEventListener('error', (err: any) => {
		console.error('[SSE] Error event received:', err);
		console.error('[SSE] Error details:', {
			type: err.type,
			readyState: (es as any).readyState,
			url: es.url,
			withCredentials: (es as any).withCredentials,
		});
		cleanup();
		args.onError(err);
	});

	function cleanup() {
		try {
			es.close();
		} catch {}
		currentConnection = null;
		connecting = false;
	}

	return cleanup;
}

export interface PerformanceMetrics {
	timeToFirstToken: number;
	totalTime: number;
	chunksReceived: number;
	bytesReceived: number;
	retryCount: number;
	connectionAttempts: number;
	lastError?: string;
}

export class EnhancedStreamingService {
	private sessionId: string;
	private baseUrl: string;
	private lastEventId: string | null = null;
	private retryCount: number = 0;
	private maxRetries: number = 3;
	private bufferedText: string = '';
	private isStreaming: boolean = false;
	private eventSource: EventSource | null = null;
	private performanceMetrics: PerformanceMetrics = {
		timeToFirstToken: 0,
		totalTime: 0,
		chunksReceived: 0,
		bytesReceived: 0,
		retryCount: 0,
		connectionAttempts: 0,
	};
	private startTime: number = 0;
	private firstTokenTime: number | null = null;

	constructor(sessionId?: string) {
		this.sessionId = sessionId || this.generateSessionId();
		this.baseUrl = getApiBaseUrl();
	}

	private generateSessionId(): string {
		return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Reset performance metrics
	 */
	private resetPerformanceMetrics(): void {
		this.performanceMetrics = {
			timeToFirstToken: 0,
			totalTime: 0,
			chunksReceived: 0,
			bytesReceived: 0,
			retryCount: 0,
			connectionAttempts: 0,
		};
		this.startTime = 0;
		this.firstTokenTime = null;
	}

	/**
	 * Update performance metrics
	 */
	private updatePerformanceMetrics(chunkSize: number = 0): void {
		this.performanceMetrics.chunksReceived++;
		this.performanceMetrics.bytesReceived += chunkSize;

		if (this.firstTokenTime && this.startTime) {
			this.performanceMetrics.timeToFirstToken =
				this.firstTokenTime - this.startTime;
		}

		if (this.startTime) {
			this.performanceMetrics.totalTime = Date.now() - this.startTime;
		}
	}

	/**
	 * Get current performance metrics
	 */
	getPerformanceMetrics(): PerformanceMetrics {
		return { ...this.performanceMetrics };
	}

	/**
	 * Retry connection with exponential backoff
	 */
	private async retryConnection(
		message: string,
		callbacks: StreamingCallbacks,
		options?: any
	): Promise<void> {
		if (this.retryCount >= this.maxRetries) {
			console.error('[EnhancedStreamingService] Max retries exceeded');
			callbacks.onError?.('Max retries exceeded');
			return;
		}

		this.retryCount++;
		this.performanceMetrics.retryCount = this.retryCount;

		const delay = Math.min(1000 * Math.pow(2, this.retryCount - 1), 10000);
		console.log(
			`[EnhancedStreamingService] Retrying in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`
		);

		await new Promise((resolve) => setTimeout(resolve, delay));

		// Reset connection state
		this.stopStream();

		// Retry the connection
		await this.startStream(message, callbacks, options);
	}

	/**
	 * Start streaming with callbacks for real-time updates
	 */
	async startStream(
		message: string,
		callbacks: StreamingCallbacks,
		options?: any
	): Promise<void> {
		// Validate message
		if (!message || !message.trim()) {
			console.error('[EnhancedStreamingService] Empty message provided');
			callbacks.onError?.('Message cannot be empty');
			return;
		}

		const messageId = `msg_${Date.now()}_${Math.random()
			.toString(36)
			.substr(2, 9)}`;

		// Single-flight guard - close existing connection first
		if (currentConnection) {
			console.log('[SSE] Closing existing connection before starting new one');
			try {
				currentConnection.close();
			} catch (e) {
				console.warn('[SSE] Error closing existing connection:', e);
			}
			currentConnection = null;
			connecting = false;
		}

		if (connecting) {
			console.warn('[SSE] Already connecting — skipping duplicate connect');
			return;
		}

		// Reset performance metrics and start tracking
		this.resetPerformanceMetrics();
		this.startTime = Date.now();
		this.performanceMetrics.connectionAttempts++;
		this.isStreaming = true;
		this.bufferedText = '';

		try {
			console.log('[EnhancedStreamingService] Starting stream for:', message);
			console.log('[EnhancedStreamingService] Session ID:', this.sessionId);
			console.log('[EnhancedStreamingService] Base URL:', this.baseUrl);

			// Get auth headers for UID
			const authHeaders = await getApiHeaders();
			const firebaseUid = authHeaders['x-firebase-uid'];
			console.log('[EnhancedStreamingService] Firebase UID:', firebaseUid);

			// Build URL using centralized function with UID
			const url = buildSseUrl({
				sessionId: this.sessionId,
				message: message.trim(),
				uid: firebaseUid,
				clientMessageId: messageId,
			});
			console.log('[EnhancedStreamingService] SSE URL:', url);
			console.log('[EnhancedStreamingService] Callbacks provided:', {
				onMeta: !!callbacks.onMeta,
				onDelta: !!callbacks.onDelta,
				onFinal: !!callbacks.onFinal,
				onTrace: !!callbacks.onTrace,
				onDone: !!callbacks.onDone,
				onError: !!callbacks.onError,
			});
			console.log('[EnhancedStreamingService] Callback functions:', {
				onMeta: typeof callbacks.onMeta,
				onDelta: typeof callbacks.onDelta,
				onFinal: typeof callbacks.onFinal,
				onTrace: typeof callbacks.onTrace,
				onDone: typeof callbacks.onDone,
				onError: typeof callbacks.onError,
			});

			// Use streamOrFallback for robust streaming with fallback
			await streamOrFallback({
				url,
				body: {
					sessionId: this.sessionId,
					message: message.trim(),
				},
				headers: {
					Accept: 'text/event-stream',
					'Cache-Control': 'no-cache',
				},
				onMessage: (data: string) => {
					try {
						console.log(
							'[EnhancedStreamingService] Raw message received:',
							data
						);
						console.log('[EnhancedStreamingService] Data type:', typeof data);
						console.log('[EnhancedStreamingService] Data length:', data.length);
						console.log(
							'[EnhancedStreamingService] Data is empty object?',
							data === '{}'
						);
						console.log(
							'[EnhancedStreamingService] Data is empty string?',
							data === ''
						);
						console.log(
							'[EnhancedStreamingService] Data is null/undefined?',
							data == null
						);

						// Handle empty object case
						if (data === '{}') {
							console.log(
								'[EnhancedStreamingService] Received empty object, skipping'
							);
							return;
						}

						// Handle SSE data format
						if (data.startsWith('data: ')) {
							const jsonData = data.substring(6);
							console.log(
								'[EnhancedStreamingService] Extracted JSON data:',
								jsonData
							);
							console.log(
								'[EnhancedStreamingService] JSON data type:',
								typeof jsonData
							);
							console.log(
								'[EnhancedStreamingService] JSON data length:',
								jsonData.length
							);

							if (jsonData === '[DONE]') {
								console.log(
									'[EnhancedStreamingService] Received [DONE] signal'
								);
								callbacks.onDone?.();
								this.isStreaming = false;
								this.retryCount = 0;
								return;
							}

							const chunk: StreamingChunk = JSON.parse(jsonData);
							console.log('[EnhancedStreamingService] Parsed chunk:', chunk);
							console.log('[EnhancedStreamingService] Chunk type:', chunk.type);
							console.log(
								'[EnhancedStreamingService] Chunk keys:',
								Object.keys(chunk || {})
							);

							// Track time to first token
							if (chunk.type === 'delta' && this.firstTokenTime === null) {
								this.firstTokenTime = Date.now();
								console.log(
									'[EnhancedStreamingService] Time to first token:',
									this.firstTokenTime - this.startTime + 'ms'
								);
							}

							// Handle different event types
							switch (chunk.type) {
								case 'meta':
									console.log(
										'🎯 [EnhancedStreamingService] Calling onMeta callback'
									);
									try {
										callbacks.onMeta?.(chunk.data as MetaEventData);
										console.log(
											'🎯 [EnhancedStreamingService] onMeta callback completed successfully'
										);
									} catch (error) {
										console.error(
											'🎯 [EnhancedStreamingService] onMeta callback error:',
											error
										);
									}
									break;
								case 'delta':
									console.log(
										'🎯 [EnhancedStreamingService] Calling onDelta callback'
									);
									const deltaData = chunk.data as DeltaEventData;
									this.bufferedText += deltaData.text;

									// Update performance metrics
									this.updatePerformanceMetrics(deltaData.text.length);

									console.log(
										'🎯 [EnhancedStreamingService] Buffered text length:',
										this.bufferedText.length
									);
									console.log(
										'🎯 [EnhancedStreamingService] Buffered text preview:',
										this.bufferedText.substring(0, 100)
									);
									try {
										callbacks.onDelta?.(deltaData, this.bufferedText);
										console.log(
											'🎯 [EnhancedStreamingService] onDelta callback completed successfully'
										);
									} catch (error) {
										console.error(
											'🎯 [EnhancedStreamingService] onDelta callback error:',
											error
										);
									}
									break;
								case 'final':
									console.log(
										'🎯 [EnhancedStreamingService] Calling onFinal callback'
									);
									try {
										callbacks.onFinal?.(chunk.data as FinalEventData);
										console.log(
											'🎯 [EnhancedStreamingService] onFinal callback completed successfully'
										);
									} catch (error) {
										console.error(
											'🎯 [EnhancedStreamingService] onFinal callback error:',
											error
										);
									}
									break;
								case 'trace':
									console.log(
										'🎯 [EnhancedStreamingService] Calling onTrace callback'
									);
									callbacks.onTrace?.(chunk.data as TraceEventData);
									break;
								case 'done':
									console.log(
										'🎯 [EnhancedStreamingService] Calling onDone callback'
									);
									try {
										callbacks.onDone?.();
										console.log(
											'🎯 [EnhancedStreamingService] onDone callback completed successfully'
										);
									} catch (error) {
										console.error(
											'🎯 [EnhancedStreamingService] onDone callback error:',
											error
										);
									}
									this.isStreaming = false;
									this.retryCount = 0;
									break;
								case 'error':
									console.log(
										'🎯 [EnhancedStreamingService] Calling onError callback'
									);
									callbacks.onError?.(chunk.data?.error || 'Unknown error');
									break;
							}
						}
					} catch (error) {
						console.error(
							'[EnhancedStreamingService] Error parsing chunk:',
							error
						);
						callbacks.onError?.('Failed to parse chunk');
					}
				},
				onError: async (error) => {
					console.error('[EnhancedStreamingService] Stream error:', error);
					this.performanceMetrics.lastError =
						error instanceof Error ? error.message : String(error);
					this.isStreaming = false;

					// Try to retry if we haven't exceeded max retries
					if (this.retryCount < this.maxRetries) {
						console.log(
							'[EnhancedStreamingService] Attempting to retry connection...'
						);
						await this.retryConnection(message, callbacks, options);
					} else {
						callbacks.onError?.('Stream connection error');
					}
				},
				onOpen: () => {
					console.log('[EnhancedStreamingService] Stream opened');
				},
				onDone: () => {
					console.log('[EnhancedStreamingService] Stream completed');
					this.isStreaming = false;
				},
				fallback: async () => {
					console.log(
						'[EnhancedStreamingService] Falling back to non-streaming response'
					);
					// Fallback to regular API call using ApiService
					try {
						const response = await ApiService.post('/api/orchestrator/chat', {
							message: message.trim(),
							sessionId: this.sessionId,
							options: options || {},
						});

						if (!response.success) {
							throw new Error(response.error || 'API request failed');
						}

						const data = response.data;

						// Validate response data with proper typing
						const responseData = data as any;
						if (
							!responseData ||
							(!responseData.response &&
								!responseData.message &&
								!responseData.text)
						) {
							throw new Error('Empty response from orchestrator');
						}

						// Simulate streaming callbacks for fallback
						const responseText =
							responseData.response ||
							responseData.message ||
							responseData.text ||
							'';
						if (responseText) {
							callbacks.onFinal?.({
								response: responseText,
								sessionId: this.sessionId,
								performance: {
									timeToFirstToken: this.firstTokenTime
										? this.firstTokenTime - this.startTime
										: 0,
									totalTime: Date.now() - this.startTime,
									cacheHit: false,
									modelUsed: responseData.model || 'unknown',
									tokensUsed: 0,
								},
								evidence: responseData.evidence || [],
								metadata: responseData.metadata || {},
							});
						}

						callbacks.onDone?.();
						return (
							responseText ||
							'I apologize, but I encountered an error processing your request.'
						);
					} catch (fallbackError) {
						console.error(
							'[EnhancedStreamingService] Fallback error:',
							fallbackError
						);
						throw fallbackError;
					}
				},
			});
		} catch (error) {
			console.error('[EnhancedStreamingService] Error starting stream:', error);
			this.isStreaming = false;
			callbacks.onError?.(
				error instanceof Error ? error.message : 'Unknown error'
			);
		}
	}

	/**
	 * Stop the current stream
	 */
	stopStream(): void {
		if (currentConnection) {
			currentConnection.close();
			currentConnection = null;
		}
		if (this.eventSource) {
			this.eventSource.close();
			this.eventSource = null;
		}
		this.isStreaming = false;
		connecting = false;
	}

	/**
	 * Get current buffered text
	 */
	getBufferedText(): string {
		return this.bufferedText;
	}

	/**
	 * Check if currently streaming
	 */
	isCurrentlyStreaming(): boolean {
		return this.isStreaming;
	}

	/**
	 * Get session ID
	 */
	getSessionId(): string {
		return this.sessionId;
	}

	/**
	 * Get current connection status
	 */
	getConnectionStatus(): 'disconnected' | 'connecting' | 'connected' | 'error' {
		if (!currentConnection) return 'disconnected';
		if (connecting) return 'connecting';
		if (currentConnection.readyState === 1) return 'connected';
		return 'error';
	}

	/**
	 * Get current buffered text length
	 */
	getBufferedTextLength(): number {
		return this.bufferedText.length;
	}

	/**
	 * Clear buffered text
	 */
	clearBufferedText(): void {
		this.bufferedText = '';
	}

	/**
	 * Set maximum retry count
	 */
	setMaxRetries(maxRetries: number): void {
		this.maxRetries = Math.max(0, maxRetries);
	}

	/**
	 * Get current retry count
	 */
	getRetryCount(): number {
		return this.retryCount;
	}

	/**
	 * Reset retry count
	 */
	resetRetryCount(): void {
		this.retryCount = 0;
		this.performanceMetrics.retryCount = 0;
	}

	/**
	 * Get streaming statistics
	 */
	getStreamingStats(): {
		isStreaming: boolean;
		chunksReceived: number;
		bytesReceived: number;
		timeToFirstToken: number;
		totalTime: number;
		retryCount: number;
		connectionAttempts: number;
		lastError?: string;
	} {
		return {
			isStreaming: this.isStreaming,
			chunksReceived: this.performanceMetrics.chunksReceived,
			bytesReceived: this.performanceMetrics.bytesReceived,
			timeToFirstToken: this.performanceMetrics.timeToFirstToken,
			totalTime: this.performanceMetrics.totalTime,
			retryCount: this.performanceMetrics.retryCount,
			connectionAttempts: this.performanceMetrics.connectionAttempts,
			lastError: this.performanceMetrics.lastError,
		};
	}
}
