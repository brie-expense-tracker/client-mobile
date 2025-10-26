import { ApiError, ApiErrorType } from './apiService';

// Request state management
interface RequestState {
	promise: Promise<any>;
	timestamp: number;
	abortController: AbortController;
}

interface BackoffState {
	until: number;
	attemptCount: number;
	lastError?: string;
}

// Global request tracking
const inflightRequests = new Map<string, RequestState>();
const backoffStates = new Map<string, BackoffState>();
const requestQueue = new Map<
	string,
	Array<{ resolve: Function; reject: Function }>
>();

// Clear stale requests periodically
setInterval(() => {
	const now = Date.now();
	let clearedCount = 0;

	inflightRequests.forEach((state, key) => {
		// Clear any request older than 5 seconds
		if (now - state.timestamp > 5000) {
			if (__DEV__) {
				console.log(
					`🧹 [RequestManager] Clearing stale request: ${key.substring(0, 100)}`
				);
			}
			state.abortController.abort();
			inflightRequests.delete(key);
			clearedCount++;
		}
	});

	if (clearedCount > 0) {
		if (__DEV__) {
			console.log(`🧹 [RequestManager] Cleared ${clearedCount} stale requests`);
		}
	}
}, 2000); // Check every 2 seconds

// Configuration
const MAX_RETRY_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const JITTER_FACTOR = 0.3;

/**
 * Generate a unique key for deduplication
 */
function getRequestKey(method: string, url: string, body?: any): string {
	const bodyStr = body ? JSON.stringify(body) : '';
	return `${method.toUpperCase()}:${url}:${bodyStr}`;
}

/**
 * Sleep utility with jitter
 */
function sleep(ms: number): Promise<void> {
	const jitter = ms * JITTER_FACTOR * Math.random();
	return new Promise((resolve) => setTimeout(resolve, ms + jitter));
}

/**
 * Check if a request should be backoff
 */
function isInBackoff(key: string): boolean {
	const backoff = backoffStates.get(key);
	if (!backoff) return false;

	return Date.now() < backoff.until;
}

/**
 * Set backoff for a request key
 */
function setBackoff(key: string, error?: string): void {
	const existing = backoffStates.get(key);
	const attemptCount = existing ? existing.attemptCount + 1 : 1;

	// Exponential backoff with jitter
	const baseDelay = Math.min(
		BASE_BACKOFF_MS * Math.pow(2, attemptCount - 1),
		MAX_BACKOFF_MS
	);
	const jitter = baseDelay * JITTER_FACTOR * Math.random();
	const delay = baseDelay + jitter;

	backoffStates.set(key, {
		until: Date.now() + delay,
		attemptCount,
		lastError: error,
	});

	if (__DEV__) {
		console.log(
			`🚫 [RequestManager] Backoff set for ${key}: ${delay}ms (attempt ${attemptCount})`
		);
	}
}

/**
 * Clear backoff for a request key
 */
function clearBackoff(key: string): void {
	backoffStates.delete(key);
}

/**
 * Queue a request for later execution
 */
function queueRequest(key: string, executor: () => Promise<any>): Promise<any> {
	return new Promise((resolve, reject) => {
		if (!requestQueue.has(key)) {
			requestQueue.set(key, []);
		}

		requestQueue.get(key)!.push({ resolve, reject });

		// If this is the first queued request, start processing
		if (requestQueue.get(key)!.length === 1) {
			processQueue(key, executor);
		}
	});
}

/**
 * Process queued requests
 */
async function processQueue(
	key: string,
	executor: () => Promise<any>
): Promise<void> {
	const queue = requestQueue.get(key);
	if (!queue || queue.length === 0) return;

	try {
		// Wait for backoff to expire if needed
		while (isInBackoff(key)) {
			const backoff = backoffStates.get(key);
			if (backoff) {
				const waitTime = backoff.until - Date.now();
				if (waitTime > 0) {
					if (__DEV__) {
						console.log(
							`⏳ [RequestManager] Waiting ${waitTime}ms for backoff to expire`
						);
					}
					await sleep(waitTime);
				}
			}
		}

		// Execute the request
		const result = await executor();

		// Clear backoff on success
		clearBackoff(key);

		// Resolve all queued requests with the same result
		queue.forEach(({ resolve }) => resolve(result));
	} catch (error: any) {
		// Don't retry on 4xx client errors (except 429)
		if (error.status >= 400 && error.status < 500 && error.status !== 429) {
			if (__DEV__) {
				console.log(
					`❌ [RequestManager] Client error ${error.status}, not retrying`
				);
			}
			// Reject all queued requests with the error
			queue.forEach(({ reject }) => reject(error));
			return;
		}

		// Handle rate limiting
		if (error.status === 429 || error.message?.includes('Rate limit')) {
			setBackoff(key, error.message);

			// If we haven't exceeded max attempts, queue for retry
			const backoff = backoffStates.get(key);
			if (backoff && backoff.attemptCount <= MAX_RETRY_ATTEMPTS) {
				if (__DEV__) {
					console.log(`🔄 [RequestManager] Retrying ${key} after backoff`);
				}
				// Re-queue all requests for retry
				setTimeout(() => processQueue(key, executor), 1000);
				return;
			}
		}

		// Reject all queued requests with the error
		queue.forEach(({ reject }) => reject(error));
	} finally {
		// Clear the queue
		requestQueue.delete(key);
	}
}

/**
 * Enhanced request manager with deduplication and backoff
 */
export class RequestManager {
	/**
	 * Make a request with automatic deduplication and rate limit handling
	 */
	static async request<T>(
		method: string,
		url: string,
		options: RequestInit = {},
		body?: any
	): Promise<T> {
		const key = getRequestKey(method, url, body);
		const now = Date.now();

		// If there's already an identical request in flight, check if it's still valid
		const existing = inflightRequests.get(key);
		if (existing && now - existing.timestamp < 3000) {
			// 3 second timeout for deduplication
			if (__DEV__) {
				console.log(
					`🔄 [RequestManager] Deduplicating request: ${key.substring(0, 80)}`
				);
			}
			return existing.promise;
		} else if (existing) {
			// Timeout exceeded - abort the old request and create new one
			if (__DEV__) {
				console.log(
					`⏰ [RequestManager] Dedup timeout exceeded, creating new request: ${key.substring(
						0,
						80
					)}`
				);
			}
			existing.abortController.abort();
			inflightRequests.delete(key);
			// Don't return - continue to create a new request
		}

		// Create abort controller for this request with timeout
		const abortController = new AbortController();
		const timeoutId = setTimeout(() => {
			if (__DEV__) {
				console.log(
					`⏰ [RequestManager] Request timeout after 3s, aborting: ${key.substring(
						0,
						80
					)}`
				);
			}
			abortController.abort();
			inflightRequests.delete(key);
		}, 3000); // 3 second timeout (fast fail for UX)

		// Create the request executor
		const executor = async (): Promise<T> => {
			try {
				if (__DEV__) {
					console.log(
						`🚀 [RequestManager] Starting fetch for: ${key.substring(0, 100)}`
					);
				}
				const response = await fetch(url, {
					...options,
					method,
					signal: abortController.signal,
					headers: {
						'Content-Type': 'application/json',
						...options.headers,
					},
				});
				if (__DEV__) {
					console.log(
						`📥 [RequestManager] Received response: ${
							response.status
						} for ${key.substring(0, 100)}`
					);
				}

				if (!response.ok) {
					let errorMessage = response.statusText;
					let errorData: any = null;

					try {
						errorData = await response.json();
						errorMessage = errorData.message || errorData.error || errorMessage;
					} catch {
						// Ignore JSON parse errors
					}

					const error = new ApiError(
						errorMessage,
						response.status === 429
							? ApiErrorType.RATE_LIMIT_ERROR
							: ApiErrorType.SERVER_ERROR,
						response.status
					);
					if (__DEV__) {
						console.log(`❌ [RequestManager] Request failed: ${error.message}`);
					}
					throw error;
				}

				const data = await response.json();
				if (__DEV__) {
					console.log(
						`✅ [RequestManager] Request succeeded for ${key.substring(0, 100)}`
					);
				}
				clearTimeout(timeoutId);
				return data;
			} catch (error: any) {
				clearTimeout(timeoutId);
				if (__DEV__) {
					console.log(
						`💥 [RequestManager] Request error: ${error.name} - ${error.message}`
					);
				}
				// Handle abort errors specifically
				if (error.name === 'AbortError') {
					const timeoutError = new ApiError(
						'Request timeout',
						ApiErrorType.NETWORK_ERROR,
						408
					);
					throw timeoutError;
				}
				throw error;
			} finally {
				// Clean up inflight request
				if (__DEV__) {
					console.log(
						`🧹 [RequestManager] Cleaning up request: ${key.substring(0, 100)}`
					);
				}
				inflightRequests.delete(key);
			}
		};

		// Store the request state
		const promise = queueRequest(key, executor);
		inflightRequests.set(key, {
			promise,
			timestamp: now,
			abortController,
		});

		return promise;
	}

	/**
	 * Cancel all inflight requests
	 */
	static cancelAllRequests(): void {
		if (__DEV__) {
			console.log(
				`🚫 [RequestManager] Cancelling ${inflightRequests.size} inflight requests`
			);
		}

		inflightRequests.forEach(({ abortController }) => {
			abortController.abort();
		});

		inflightRequests.clear();
		requestQueue.clear();
	}

	/**
	 * Cancel requests for a specific URL pattern
	 */
	static cancelRequestsForPattern(pattern: string): void {
		const regex = new RegExp(pattern);
		let cancelledCount = 0;

		inflightRequests.forEach(({ abortController }, key) => {
			if (regex.test(key)) {
				abortController.abort();
				inflightRequests.delete(key);
				cancelledCount++;
			}
		});

		if (cancelledCount > 0) {
			if (__DEV__) {
				console.log(
					`🚫 [RequestManager] Cancelled ${cancelledCount} requests matching: ${pattern}`
				);
			}
		}
	}

	/**
	 * Get current request statistics
	 */
	static getStats(): {
		inflight: number;
		backoff: number;
		queued: number;
	} {
		return {
			inflight: inflightRequests.size,
			backoff: backoffStates.size,
			queued: Array.from(requestQueue.values()).reduce(
				(sum, queue) => sum + queue.length,
				0
			),
		};
	}

	/**
	 * Clear all backoff states (for testing or manual reset)
	 */
	static clearAllBackoffs(): void {
		backoffStates.clear();
		if (__DEV__) {
			console.log(`🧹 [RequestManager] Cleared all backoff states`);
		}
	}
}

// Clean up old inflight requests periodically
setInterval(() => {
	const now = Date.now();
	const maxAge = 60000; // 1 minute

	inflightRequests.forEach(({ timestamp }, key) => {
		if (now - timestamp > maxAge) {
			inflightRequests.delete(key);
		}
	});
}, 30000); // Check every 30 seconds
