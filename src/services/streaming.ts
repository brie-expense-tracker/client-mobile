/**
 * Bulletproof SSE streaming service with watchdog
 * Implements strict SSE contract with proper error handling
 */

import { startSSE as startSSEManager, cancelSSE } from './streamManager';

export interface StreamingCallbacks {
	onDelta: (text: string) => void;
	onDone: () => void;
	onError: (error: string) => void;
	onMeta?: (data: any) => void;
}

export interface StartOptions {
	url: string;
	token: string;
	onDelta: (text: string) => void;
	onDone: () => void;
	onError: (error: string) => void;
	onMeta?: (data: any) => void;
	streamKey?: string; // Add stream key for deduplication
	clientMessageId?: string; // Add client message ID for filtering
}

/**
 * Start SSE connection with watchdog and proper error handling
 */
export function startSSE({
	url,
	token,
	onDelta,
	onDone,
	onError,
	onMeta,
	streamKey,
	clientMessageId,
}: StartOptions) {
	let lastTick = Date.now();
	let closed = false;
	let eventSource: EventSource | null = null;
	let lastSeq = -1; // Track sequence numbers for deduplication

	// Watchdog to detect stalled connections
	const watchdog = setInterval(() => {
		const timeSinceLastTick = Date.now() - lastTick;
		if (timeSinceLastTick > 30000) {
			// 30s of silence
			console.warn('🚨 [SSE] Stream stalled after 30s, closing connection', {
				timeSinceLastTick,
				readyState: eventSource ? (eventSource as any).readyState : 'no source',
				url: url.substring(0, 100) + '...',
				timestamp: new Date().toISOString(),
			});
			onError('Stream stalled - connection lost');
			cleanup();
		} else if (timeSinceLastTick > 15000) {
			// 15s warning
			console.warn('⚠️ [SSE] Stream slow - no data for 15s', {
				timeSinceLastTick,
				readyState: eventSource ? (eventSource as any).readyState : 'no source',
			});
		}
	}, 5000); // Check every 5 seconds

	const cleanup = () => {
		if (!closed) {
			closed = true;
			clearInterval(watchdog);
			if (eventSource) {
				eventSource.close();
				eventSource = null;
			}
		}
	};

	try {
		// Use stream manager for hard-lock to single stream
		if (streamKey) {
			const managerResult = startSSEManager(url, streamKey, {
				onDelta: (data: { text: string; seq?: number }) => {
					// Handle sequence number deduplication
					if (typeof data.seq === 'number') {
						if (data.seq <= lastSeq) {
							console.warn('🚫 [SSE] Dropping duplicate/out-of-order delta:', {
								seq: data.seq,
								lastSeq,
								text: data.text?.substring(0, 50) + '...',
							});
							return; // Drop duplicate/out-of-order
						}
						lastSeq = data.seq;
					}

					lastTick = Date.now();
					if (data.text) {
						onDelta(data.text);
					}
				},
				onDone: (full?: string) => {
					console.log('✅ [SSE] Stream completed via stream manager', {
						timestamp: new Date().toISOString(),
						hasFull: !!full,
					});
					lastTick = Date.now();
					cleanup();
					onDone();
				},
				onError: (e: any) => {
					console.error('🚨 [SSE] Stream error via stream manager:', e);
					lastTick = Date.now();
					cleanup();
					onError('Stream error');
				},
			});
			eventSource = managerResult || null;
		} else {
			// Fallback to direct EventSource creation
			eventSource = new EventSource(url);

			// Handle connection open
			eventSource.addEventListener('open', () => {
				console.log('🔗 [SSE] Connection established', {
					url: url.substring(0, 100) + '...',
					readyState: (eventSource as any).readyState,
					timestamp: new Date().toISOString(),
				});
				lastTick = Date.now();
			});

			// Handle meta events
			eventSource.addEventListener('meta', (ev: MessageEvent) => {
				lastTick = Date.now();
				try {
					const data = JSON.parse(ev.data);
					console.log('📦 [SSE] Meta event received:', data);
					onMeta?.(data);
				} catch (error) {
					console.warn('⚠️ [SSE] Failed to parse meta event:', error);
				}
			});

			// Handle delta events (text chunks) with sequence number support
			eventSource.addEventListener('delta', (ev: MessageEvent) => {
				lastTick = Date.now();
				try {
					const data = JSON.parse(ev.data);

					// Gate on clientMessageId to prevent processing events from wrong messages
					if (clientMessageId && data.clientMessageId !== clientMessageId) {
						console.warn('🚫 [SSE] Dropping delta for different message:', {
							expected: clientMessageId,
							received: data.clientMessageId,
							text: data.text?.substring(0, 50) + '...',
						});
						return; // Drop events for different messages
					}

					// Handle sequence number deduplication
					if (typeof data.seq === 'number') {
						if (data.seq <= lastSeq) {
							console.warn('🚫 [SSE] Dropping duplicate/out-of-order delta:', {
								seq: data.seq,
								lastSeq,
								text: data.text?.substring(0, 50) + '...',
							});
							return; // Drop duplicate/out-of-order
						}
						lastSeq = data.seq;
					}

					console.log('📝 [SSE] Delta event received:', {
						textLength: data.text?.length || 0,
						text: data.text?.substring(0, 50) + '...',
						seq: data.seq,
						clientMessageId: data.clientMessageId,
						timestamp: new Date().toISOString(),
					});
					if (data.text) {
						onDelta(data.text);
					}
				} catch (error) {
					console.warn('⚠️ [SSE] Failed to parse delta event:', error, {
						rawData: ev.data,
						timestamp: new Date().toISOString(),
					});
				}
			});

			// Handle done event
			eventSource.addEventListener('done', (ev: MessageEvent) => {
				console.log('✅ [SSE] Stream completed', {
					timestamp: new Date().toISOString(),
					readyState: (eventSource as any).readyState,
					rawData: ev.data,
				});
				lastTick = Date.now();
				cleanup();
				onDone();
			});

			// Handle error event
			eventSource.addEventListener('error', (ev: MessageEvent) => {
				console.error('🚨 [SSE] Stream error event:', {
					event: ev,
					timestamp: new Date().toISOString(),
					readyState: (eventSource as any).readyState,
					url: url.substring(0, 100) + '...',
				});
				lastTick = Date.now();
				cleanup();
				onError('Stream error');
			});

			// Handle connection errors
			eventSource.onerror = (error) => {
				console.error('🚨 [SSE] EventSource error:', {
					error,
					timestamp: new Date().toISOString(),
					readyState: (eventSource as any).readyState,
					url: url.substring(0, 100) + '...',
				});
				cleanup();
				onError('Connection error');
			};

			// Handle ping events (heartbeat)
			eventSource.addEventListener('ping', () => {
				lastTick = Date.now();
				// No-op, just update last tick
			});

			// Remove generic message handler to avoid double processing of named events
			// If any proxy strips event: lines, the browser will deliver as generic message
			// but we already handle delta, meta, done, error events specifically above
		}
	} catch (error) {
		console.error('💥 [SSE] Failed to create EventSource:', error);
		cleanup();
		onError('Failed to create connection');
	}

	return {
		cancel: cleanup,
		eventSource,
	};
}

/**
 * Global connection manager to prevent duplicates
 */
class ConnectionManager {
	private currentConnection: {
		cancel: () => void;
		eventSource: EventSource | null;
	} | null = null;
	private connecting = false;

	startConnection(options: StartOptions) {
		// Prevent duplicate connections
		if (
			this.connecting ||
			(this.currentConnection?.eventSource &&
				(this.currentConnection.eventSource as any).readyState === 1)
		) {
			console.warn('⚠️ [SSE] Connection already active, skipping duplicate');
			return { cancel: () => {} };
		}

		this.connecting = true;

		// Close existing connection
		if (this.currentConnection) {
			this.currentConnection.cancel();
		}

		const connection = startSSE(options);
		this.currentConnection = connection;

		// Update state when connection opens
		if (connection.eventSource) {
			connection.eventSource.addEventListener('open', () => {
				this.connecting = false;
			});

			connection.eventSource.addEventListener('done', () => {
				this.currentConnection = null;
			});

			connection.eventSource.addEventListener('error', () => {
				this.currentConnection = null;
			});
		}

		return connection;
	}

	closeConnection() {
		if (this.currentConnection) {
			this.currentConnection.cancel();
			this.currentConnection = null;
		}
		this.connecting = false;
	}
}

// Global instance
const connectionManager = new ConnectionManager();

/**
 * Start streaming with connection management
 */
export function startStreaming(options: StartOptions) {
	return connectionManager.startConnection(options);
}

/**
 * Close current streaming connection
 */
export function stopStreaming() {
	cancelSSE(); // Use stream manager to cancel active stream
	connectionManager.closeConnection();
}

/**
 * Build SSE URL with proper parameters
 */
export function buildSseUrl(
	baseUrl: string,
	params: {
		sessionId: string;
		message: string;
	}
) {
	const url = new URL(`${baseUrl}/api/stream/chat`);
	url.searchParams.set('message', params.message);
	url.searchParams.set('sessionId', params.sessionId);
	return url.toString();
}
