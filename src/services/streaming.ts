/**
 * Bulletproof SSE streaming service with watchdog
 * Implements strict SSE contract with proper error handling
 */

import { startSSE as startSSEManager, cancelSSE } from './streamManager';
import { logger } from '../utils/logger';

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
	let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

	// Inactivity timer - 2 minutes for mobile
	const INACTIVITY_MS = 120000;

	function resetInactivityTimer(reason: string) {
		if (inactivityTimer) {
			clearTimeout(inactivityTimer);
		}
		inactivityTimer = setTimeout(() => {
			logger.warn('🚨 [SSE] Stream timeout (inactivity):', reason);
			onError('Stream timeout - inactivity');
			cleanup();
		}, INACTIVITY_MS);
	}

	// Legacy watchdog for backward compatibility (reduced timeout since we have inactivity timer)
	const watchdog = setInterval(() => {
		const timeSinceLastTick = Date.now() - lastTick;
		if (timeSinceLastTick > 150000) {
			// 2.5 minutes of silence (fallback to inactivity timer)
			logger.warn('🚨 [SSE] Stream stalled after 2.5m, closing connection', {
				timeSinceLastTick,
				readyState: eventSource ? (eventSource as any).readyState : 'no source',
				url: url.substring(0, 100) + '...',
				timestamp: new Date().toISOString(),
			});
			onError('Stream stalled - connection lost');
			cleanup();
		} else if (timeSinceLastTick > 30000) {
			// 30s warning
			logger.warn('⚠️ [SSE] Stream slow - no data for 30s', {
				timeSinceLastTick,
				readyState: eventSource ? (eventSource as any).readyState : 'no source',
			});
		}
	}, 10000); // Check every 10 seconds

	const cleanup = () => {
		if (!closed) {
			closed = true;
			clearInterval(watchdog);
			if (inactivityTimer) {
				clearTimeout(inactivityTimer);
				inactivityTimer = null;
			}
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
							logger.warn('🚫 [SSE] Dropping duplicate/out-of-order delta:', {
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
					logger.debug('✅ [SSE] Stream completed via stream manager', {
						timestamp: new Date().toISOString(),
						hasFull: !!full,
					});
					lastTick = Date.now();
					cleanup();
					onDone();
				},
				onError: (e: any) => {
					logger.error('🚨 [SSE] Stream error via stream manager:', e);
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
				logger.debug('🔗 [SSE] Connection established', {
					url: url.substring(0, 100) + '...',
					readyState: (eventSource as any).readyState,
					timestamp: new Date().toISOString(),
				});
				lastTick = Date.now();
				resetInactivityTimer('open');
			});

			// Handle meta events
			eventSource.addEventListener('meta', (ev: MessageEvent) => {
				lastTick = Date.now();
				resetInactivityTimer('meta');
				try {
					const data = JSON.parse(ev.data);
					logger.debug('📦 [SSE] Meta event received:', data);
					onMeta?.(data);
				} catch (error) {
					logger.warn('⚠️ [SSE] Failed to parse meta event:', error);
				}
			});

			// Handle limit events
			eventSource.addEventListener('limit', (ev: MessageEvent) => {
				lastTick = Date.now();
				resetInactivityTimer('limit');
			});

			// Handle delta events (text chunks) with sequence number support
			eventSource.addEventListener('delta', (ev: MessageEvent) => {
				lastTick = Date.now();
				resetInactivityTimer('delta');
				try {
					const data = JSON.parse(ev.data);

					// Gate on clientMessageId to prevent processing events from wrong messages
					if (clientMessageId && data.clientMessageId !== clientMessageId) {
						logger.warn('🚫 [SSE] Dropping delta for different message:', {
							expected: clientMessageId,
							received: data.clientMessageId,
							text: data.text?.substring(0, 50) + '...',
						});
						return; // Drop events for different messages
					}

					// Handle sequence number deduplication
					if (typeof data.seq === 'number') {
						if (data.seq <= lastSeq) {
							logger.warn('🚫 [SSE] Dropping duplicate/out-of-order delta:', {
								seq: data.seq,
								lastSeq,
								text: data.text?.substring(0, 50) + '...',
							});
							return; // Drop duplicate/out-of-order
						}
						lastSeq = data.seq;
					}

					logger.debug('📝 [SSE] Delta event received:', {
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
					logger.warn('⚠️ [SSE] Failed to parse delta event:', error, {
						rawData: ev.data,
						timestamp: new Date().toISOString(),
					});
				}
			});

			// Handle done event
			eventSource.addEventListener('done', (ev: MessageEvent) => {
				logger.debug('✅ [SSE] Stream completed', {
					timestamp: new Date().toISOString(),
					readyState: (eventSource as any).readyState,
					rawData: ev.data,
				});
				lastTick = Date.now();
				// Clear inactivity timer on done
				if (inactivityTimer) {
					clearTimeout(inactivityTimer);
					inactivityTimer = null;
				}
				cleanup();
				onDone();
			});

			// Handle error event
			eventSource.addEventListener('error', (ev: MessageEvent) => {
				logger.error('🚨 [SSE] Stream error event:', {
					event: ev,
					timestamp: new Date().toISOString(),
					readyState: (eventSource as any).readyState,
					url: url.substring(0, 100) + '...',
				});
				lastTick = Date.now();
				// Clear inactivity timer on error
				if (inactivityTimer) {
					clearTimeout(inactivityTimer);
					inactivityTimer = null;
				}
				cleanup();
				onError('Stream error');
			});

			// Handle connection errors
			eventSource.onerror = (error) => {
				logger.error('🚨 [SSE] EventSource error:', {
					error,
					timestamp: new Date().toISOString(),
					readyState: (eventSource as any).readyState,
					url: url.substring(0, 100) + '...',
				});
				// Clear inactivity timer on error
				if (inactivityTimer) {
					clearTimeout(inactivityTimer);
					inactivityTimer = null;
				}
				cleanup();
				onError('Connection error');
			};

			// Handle ping events (heartbeat)
			eventSource.addEventListener('ping', () => {
				lastTick = Date.now();
				resetInactivityTimer('ping');
				// No-op, just update last tick
			});

			// Remove generic message handler to avoid double processing of named events
			// If any proxy strips event: lines, the browser will deliver as generic message
			// but we already handle delta, meta, done, error events specifically above
		}
	} catch (error) {
		logger.error('💥 [SSE] Failed to create EventSource:', error);
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
			logger.warn('⚠️ [SSE] Connection already active, skipping duplicate');
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
