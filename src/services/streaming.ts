/**
 * Bulletproof SSE streaming service with watchdog
 * Implements strict SSE contract with proper error handling
 */

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
}: StartOptions) {
	let lastTick = Date.now();
	let closed = false;
	let eventSource: EventSource | null = null;

	// Watchdog to detect stalled connections
	const watchdog = setInterval(() => {
		if (Date.now() - lastTick > 30000) {
			// 30s of silence
			console.warn('[SSE] Stream stalled, closing connection');
			onError('Stream stalled - connection lost');
			cleanup();
		}
	}, 10000);

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
		// Create EventSource with proper headers
		eventSource = new EventSource(url, {
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		} as any); // RN polyfill usually allows headers

		// Handle connection open
		eventSource.addEventListener('open', () => {
			console.log('[SSE] Connection opened');
			lastTick = Date.now();
		});

		// Handle meta events
		eventSource.addEventListener('meta', (ev: MessageEvent) => {
			lastTick = Date.now();
			try {
				const data = JSON.parse(ev.data);
				onMeta?.(data);
			} catch (error) {
				console.warn('[SSE] Failed to parse meta event:', error);
			}
		});

		// Handle delta events (text chunks)
		eventSource.addEventListener('delta', (ev: MessageEvent) => {
			lastTick = Date.now();
			try {
				const data = JSON.parse(ev.data);
				if (data.text) {
					onDelta(data.text);
				}
			} catch (error) {
				console.warn('[SSE] Failed to parse delta event:', error);
			}
		});

		// Handle done event
		eventSource.addEventListener('done', (ev: MessageEvent) => {
			console.log('[SSE] Stream completed');
			lastTick = Date.now();
			cleanup();
			onDone();
		});

		// Handle error event
		eventSource.addEventListener('error', (ev: MessageEvent) => {
			console.error('[SSE] Stream error event:', ev);
			lastTick = Date.now();
			cleanup();
			onError('Stream error');
		});

		// Handle connection errors
		eventSource.onerror = (error) => {
			console.error('[SSE] EventSource error:', error);
			cleanup();
			onError('Connection error');
		};

		// Handle ping events (heartbeat)
		eventSource.addEventListener('ping', () => {
			lastTick = Date.now();
			// No-op, just update last tick
		});
	} catch (error) {
		console.error('[SSE] Failed to create EventSource:', error);
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
			console.warn('[SSE] Connection already active, skipping duplicate');
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
