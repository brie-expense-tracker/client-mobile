import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message, MessageAction } from './useMessagesReducer';
import { ErrorService } from '../services/errorService';
import { authService } from '../services/authService';
import { createLogger } from '../utils/sublogger';

const assistantStreamLog = createLogger('AssistantStream');

interface StreamingCallbacks {
	onMeta?: (data: any) => void;
	onDelta?: (data: any, bufferedText: string) => void;
	onFinal?: (data: any) => void;
	onTrace?: (data: any) => void;
	onDone?: () => void;
	onError?: (error: string) => void;
	onRetry?: (attempt: number, maxAttempts: number) => void;
	onConnectionHealth?: (isHealthy: boolean) => void;
}

interface StreamMetrics {
	duration: number;
	characterCount: number;
	charactersPerSecond: number;
	retryCount: number;
	connectionHealth: 'healthy' | 'degraded' | 'unhealthy';
	lastActivity: number | null;
}

interface RetryConfig {
	maxRetries: number;
	baseDelay: number;
	maxDelay: number;
	backoffMultiplier: number;
}

interface UseAssistantStreamProps {
	messages: Message[];
	dispatch: React.Dispatch<MessageAction>;
	streamingRef: React.MutableRefObject<{
		messageId: string | null;
		sessionId: string | null;
	}>;
	onDeltaReceived: () => void;
	addDelta: (messageId: string, text: string) => void;
	finalizeMessage: (
		messageId: string,
		finalText?: string,
		performance?: Message['performance'],
		evidence?: string[]
	) => void;
	setError: (messageId: string, error: string) => void;
	clearStreaming: () => void;
}

export function useAssistantStream({
	messages,
	dispatch,
	streamingRef,
	onDeltaReceived,
	addDelta,
	finalizeMessage,
	setError,
	clearStreaming,
}: UseAssistantStreamProps) {
	const lastDeltaAt = useRef<number | null>(null);
	const currentConnection = useRef<EventSource | null>(null);
	const connecting = useRef(false);
	const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const healthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
		null
	);
	const bufferedText = useRef<string>('');
	const currentMessageId = useRef<string | null>(null);

	// Enhanced state management
	const [streamState, setStreamState] = useState({
		isStreaming: false,
		isConnecting: false,
		isRetrying: false,
		retryCount: 0,
		lastError: null as string | null,
		connectionHealth: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
		startTime: null as number | null,
		lastActivity: null as number | null,
	});

	// Retry configuration
	const retryConfig: RetryConfig = useMemo(
		() => ({
			maxRetries: 3,
			baseDelay: 1000,
			maxDelay: 10000,
			backoffMultiplier: 2,
		}),
		[]
	);

	// Utility functions
	const calculateRetryDelay = useCallback(
		(attempt: number): number => {
			const delay =
				retryConfig.baseDelay *
				Math.pow(retryConfig.backoffMultiplier, attempt);
			return Math.min(delay, retryConfig.maxDelay);
		},
		[retryConfig]
	);

	const updateConnectionHealth = useCallback((isHealthy: boolean) => {
		const newHealth = isHealthy ? 'healthy' : 'degraded';
		setStreamState((prev) => ({
			...prev,
			connectionHealth: newHealth,
			lastActivity: Date.now(),
		}));
	}, []);

	const startHealthMonitoring = useCallback(() => {
		if (healthCheckIntervalRef.current) {
			clearInterval(healthCheckIntervalRef.current);
		}

		healthCheckIntervalRef.current = setInterval(() => {
			const now = Date.now();
			const lastActivity = streamState.lastActivity;
			const timeSinceActivity = lastActivity ? now - lastActivity : Infinity;

			// Consider connection unhealthy if no activity for 30 seconds
			const isHealthy = timeSinceActivity < 30000;
			updateConnectionHealth(isHealthy);
		}, 5000); // Check every 5 seconds
	}, [streamState.lastActivity, updateConnectionHealth]);

	const stopHealthMonitoring = useCallback(() => {
		if (healthCheckIntervalRef.current) {
			clearInterval(healthCheckIntervalRef.current);
			healthCheckIntervalRef.current = null;
		}
	}, []);

	const resetStreamState = useCallback(() => {
		setStreamState((prev) => ({
			...prev,
			isStreaming: false,
			isConnecting: false,
			isRetrying: false,
			lastError: null,
			startTime: null,
			lastActivity: null,
		}));
		stopHealthMonitoring();
	}, [stopHealthMonitoring]);

	// Watchdog timer for stuck streams
	useEffect(() => {
		const interval = setInterval(() => {
			const now = Date.now();
			const noDeltaMs = lastDeltaAt.current ? now - lastDeltaAt.current : -1;
			const streamingId = streamingRef.current.messageId;

			if (streamingId && noDeltaMs > 7000) {
				assistantStreamLog.warn('No delta for >7s', {
					streamingId,
					messagesCount: messages.length,
					lastMessage: messages[messages.length - 1],
					noDeltaMs,
					lastDeltaAt: lastDeltaAt.current,
					hasConnection: !!currentConnection.current,
					isConnecting: connecting.current,
				});

				// If we've been stuck for more than 15 seconds, force cleanup
				if (noDeltaMs > 15000) {
					assistantStreamLog.error('Force cleaning up stuck stream after 15s');
					if (currentConnection.current) {
						currentConnection.current.close();
						currentConnection.current = null;
					}
					connecting.current = false;
					clearStreaming();
				}
			}
		}, 2000);

		return () => clearInterval(interval);
	}, [messages, streamingRef, clearStreaming]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			stopHealthMonitoring();
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current);
			}
		};
	}, [stopHealthMonitoring]);

	const buildSseUrl = useCallback(
		(sessionId: string, message: string, uid: string) => {
			// Get the actual API base URL from environment
			const baseUrl =
				process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

			// Ensure baseUrl ends with /api
			const apiBaseUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

			const params = new URLSearchParams({
				sessionId,
				message: message.trim(),
				uid,
			});

			const finalUrl = `${apiBaseUrl}/orchestrator/chat/stream?${params.toString()}`;

			assistantStreamLog.debug('SSE baseUrl from env', { baseUrl });
			assistantStreamLog.debug('Final API baseUrl', { apiBaseUrl });
			assistantStreamLog.debug('Final SSE URL', { finalUrl });

			return finalUrl;
		},
		[]
	);

	const startStream = useCallback(
		async (
			message: string,
			callbacks: StreamingCallbacks,
			options?: { messageId?: string; retryCount?: number }
		) => {
			const retryCount = options?.retryCount || 0;
			const messageId = options?.messageId || String(Date.now());

			// Update state
			setStreamState((prev) => ({
				...prev,
				isStreaming: true,
				isConnecting: true,
				isRetrying: retryCount > 0,
				retryCount,
				startTime: Date.now(),
				lastActivity: Date.now(),
			}));

			// Reset text buffer
			bufferedText.current = '';
			currentMessageId.current = messageId;

			// Single-flight guard with better cleanup
			if (currentConnection.current) {
				assistantStreamLog.warn('Existing connection found, cleaning up first');
				currentConnection.current.close();
				currentConnection.current = null;
			}

			if (connecting.current) {
				assistantStreamLog.warn('Already connecting, waiting...');
				// Wait a bit and try again
				await new Promise((resolve) => setTimeout(resolve, 100));
				if (connecting.current) {
					assistantStreamLog.warn(
						'Still connecting, aborting duplicate request'
					);
					return () => {}; // no-op disposer
				}
			}

			// Notify about retry if applicable
			if (retryCount > 0) {
				callbacks.onRetry?.(retryCount, retryConfig.maxRetries);
			}

			try {
				// Check if EventSource is available
				const hasES = typeof (global as any).EventSource !== 'undefined';
				if (!hasES) {
					assistantStreamLog.warn(
						'EventSource missing; falling back to non-streaming'
					);
					throw new Error(
						'EventSource is not available. Make sure polyfill is loaded.'
					);
				}

				// Use the messageId from the function parameters
				const aiId = messageId;
				const sessionId = `session_${aiId}_${Math.random()
					.toString(36)
					.slice(2)}`;
				const firebaseUID = await AsyncStorage.getItem('firebaseUID');

				assistantStreamLog.debug('Starting SSE connection', {
					messageId: aiId,
					sessionId,
					firebaseUID,
					retryCount,
				});

				// Verify the message exists before starting stream
				// Use a more robust check with retries since state updates might be async
				let messageExists = messages.some((m) => m.id === aiId);
				if (!messageExists) {
					assistantStreamLog.warn('Message not found immediately, retrying...');
					// Wait a bit and try again
					await new Promise((resolve) => setTimeout(resolve, 50));
					messageExists = messages.some((m) => m.id === aiId);
				}

				if (!messageExists) {
					assistantStreamLog.error('Message not found in state after retry', {
						searchingFor: aiId,
						availableIds: messages.map((m) => m.id),
					});
					throw new Error(`Message ${aiId} not found in state`);
				}

				// Update streaming ref with consistent IDs BEFORE opening EventSource
				streamingRef.current = { messageId: aiId, sessionId };

				// Dispatch START_STREAM action BEFORE opening EventSource
				dispatch({ type: 'START_STREAM', id: aiId });

				// Start health monitoring
				startHealthMonitoring();

				// Build URL
				const url = buildSseUrl(sessionId, message, firebaseUID || '');
				assistantStreamLog.debug('SSE URL', { url });

				// Session guard - verify URL contains correct sessionId
				const urlSession = new URLSearchParams(url.split('?')[1] || '').get(
					'sessionId'
				);
				assistantStreamLog.debug('Session guard', {
					ui: sessionId,
					urlSession,
				});
				if (urlSession !== sessionId) {
					assistantStreamLog.warn('Session mismatch; refusing to stream');
					throw new Error('Session ID mismatch in URL construction');
				}

				// Create EventSource with proper error handling
				let es: EventSource;
				try {
					es = new (global as any).EventSource(url);
					assistantStreamLog.debug('EventSource created successfully');
				} catch (constructorError) {
					assistantStreamLog.error(
						'EventSource constructor failed',
						constructorError
					);
					throw new Error(
						`EventSource constructor failed: ${constructorError}`
					);
				}

				currentConnection.current = es;
				connecting.current = true;

				es.addEventListener('open', () => {
					assistantStreamLog.debug('SSE connection opened');
					connecting.current = false;
				});

				// IMPORTANT: RN EventSource often delivers everything as 'message'
				es.addEventListener('message', (ev: MessageEvent) => {
					try {
						const payload = JSON.parse(ev.data);
						assistantStreamLog.debug('SSE message received', {
							type: payload?.type,
							dataLength: ev.data?.length || 0,
						});

						// Use the aiId from closure instead of reading from state
						const id = aiId;

						// Session ID consistency check - use the original URL since es.url is not available in react-native-sse
						const urlSession = new URLSearchParams(url.split('?')[1] || '').get(
							'sessionId'
						);
						if (sessionId !== urlSession) {
							assistantStreamLog.warn(
								'SessionId mismatch - dropping stream to avoid corrupting state',
								{
									uiSession: sessionId,
									urlSession,
								}
							);
							return;
						}

						if (payload.type === 'delta') {
							assistantStreamLog.debug('Delta text length', {
								length: payload.data?.text?.length || 0,
							});

							// Update activity timestamp
							setStreamState((prev) => ({
								...prev,
								lastActivity: Date.now(),
								isConnecting: false,
							}));

							// Update buffered text
							bufferedText.current += payload.data?.text ?? '';
							lastDeltaAt.current = Date.now();

							dispatch({ type: 'DELTA', id, text: payload.data?.text ?? '' });
							onDeltaReceived();

							// Call delta callback with buffered text
							callbacks.onDelta?.(
								{ text: payload.data?.text ?? '' },
								bufferedText.current
							);
						} else if (payload.type === 'final') {
							assistantStreamLog.debug('Final response received', {
								length: payload.data?.response?.length || 0,
							});
							dispatch({ type: 'APPLY_FINAL', id, payload: payload.data });
						} else if (payload.type === 'meta') {
							assistantStreamLog.debug('Meta event received');
							dispatch({ type: 'APPLY_META', id, meta: payload.data });
							callbacks.onMeta?.(payload.data);
						} else if (payload.type === 'trace') {
							assistantStreamLog.debug('Trace event received');
							callbacks.onTrace?.(payload.data);
						} else if (payload.type === 'done') {
							assistantStreamLog.debug(
								'Done event received - finalizing stream',
								{ messageId: id }
							);

							// Calculate performance metrics
							const endTime = Date.now();
							const startTime = streamState.startTime || endTime;
							const duration = endTime - startTime;

							setStreamState((prev) => ({
								...prev,
								isStreaming: false,
								isConnecting: false,
								lastActivity: endTime,
							}));

							// Finalize with performance data
							finalizeMessage(id, bufferedText.current, {
								totalLatency: duration,
								timeToFirstToken: duration,
								cacheHit: false,
								modelUsed: 'streaming',
								tokensUsed: bufferedText.current.length,
							});

							dispatch({ type: 'END_STREAM', id });
							stopHealthMonitoring();
							callbacks.onDone?.();
						} else if (ev.data === '{}' || ev.data === '') {
							// heartbeat → ignore
							assistantStreamLog.debug('Heartbeat received');
						} else {
							assistantStreamLog.debug('Unknown payload type', {
								type: payload.type,
								data: ev.data,
							});
						}
					} catch (e) {
						assistantStreamLog.error('Failed to parse SSE data', {
							error: e,
							data: ev.data,
						});
					}
				});

				es.addEventListener('error', (e) => {
					assistantStreamLog.error('SSE error event', {
						error: JSON.stringify(e, Object.getOwnPropertyNames(e)),
						type: (e as any).type,
					});

					// Update state
					setStreamState((prev) => ({
						...prev,
						isStreaming: false,
						isConnecting: false,
						lastError: 'Stream connection failed',
					}));

					stopHealthMonitoring();

					// Log error with context
					ErrorService.logError(
						{ message: 'Stream connection failed' },
						{
							messageId: aiId,
							sessionId: streamingRef.current.sessionId,
							operation: 'streaming',
							retryCount: streamState.retryCount,
						}
					);

					// Check if we should retry
					const shouldRetry =
						streamState.retryCount < retryConfig.maxRetries &&
						(e.type?.includes('error') || (e as any).type === 'close');

					if (shouldRetry) {
						const nextRetryCount = streamState.retryCount + 1;
						const delay = calculateRetryDelay(nextRetryCount - 1);

						assistantStreamLog.debug(
							`[AssistantStream] Retrying in ${delay}ms (attempt ${nextRetryCount}/${retryConfig.maxRetries})`
						);

						// Update retry count in state
						setStreamState((prev) => ({
							...prev,
							retryCount: nextRetryCount,
						}));

						// Schedule retry with a new connection attempt
						retryTimeoutRef.current = setTimeout(async () => {
							try {
								// Get fresh auth token
								const token = await authService.getAuthToken();
								if (!token) {
									throw new Error('No authentication token available');
								}

								// Build URL
								const baseUrl =
									process.env.EXPO_PUBLIC_API_URL ||
									'https://brie-staging-api.onrender.com';
								const apiBaseUrl = baseUrl.endsWith('/api')
									? baseUrl
									: `${baseUrl}/api`;
								const params = new URLSearchParams({
									sessionId,
									message: message.trim(),
									uid: token,
								});
								const url = `${apiBaseUrl}/orchestrator/chat/stream?${params.toString()}`;

								// Create new EventSource connection
								const es = new EventSource(url);
								currentConnection.current = es;

								es.addEventListener('message', (ev: MessageEvent) => {
									try {
										const data = JSON.parse(ev.data);
										if (data.type === 'delta' && data.content) {
											setStreamState((prev) => ({
												...prev,
												lastActivity: Date.now(),
												isConnecting: false,
											}));
											addDelta(aiId, data.content);
											onDeltaReceived();
											callbacks.onDelta?.({ text: data.content }, data.content);
										}
									} catch (parseError) {
										assistantStreamLog.warn(
											'Failed to parse message',
											parseError
										);
									}
								});

								es.addEventListener('done', () => {
									setStreamState((prev) => ({
										...prev,
										isStreaming: false,
										isConnecting: false,
									}));
									finalizeMessage(aiId, '');
									callbacks.onDone?.();
									cleanup();
								});

								es.addEventListener('error', (e) => {
									assistantStreamLog.error('Retry failed', e);
									setStreamState((prev) => ({
										...prev,
										isStreaming: false,
										isConnecting: false,
										lastError: 'Stream connection failed',
									}));
									dispatch({
										type: 'FAIL_STREAM',
										id: aiId,
										error: 'Stream connection failed after retries',
									});
									cleanup();
									callbacks.onError?.('Stream connection failed after retries');
								});
							} catch (retryError) {
								assistantStreamLog.error(
									'[AssistantStream] Retry setup failed:',
									retryError
								);
								setStreamState((prev) => ({
									...prev,
									isStreaming: false,
									isConnecting: false,
								}));
								dispatch({
									type: 'FAIL_STREAM',
									id: aiId,
									error: 'Connection failed',
								});
								callbacks.onError?.('Connection failed');
							}
						}, delay);

						// Notify about retry
						callbacks.onRetry?.(nextRetryCount, retryConfig.maxRetries);
					} else {
						// Final error - no more retries, provide fallback response
						const fallbackResponse = `I'm having trouble connecting to my AI services right now. This might be due to a network issue or server maintenance.

Here are some things you can try:
• Check your internet connection
• Try asking your question again in a moment
• Use the refresh button below to retry

I'm still here to help with your financial questions once the connection is restored!`;

						// Add the fallback response as a delta
						addDelta(aiId, fallbackResponse);
						finalizeMessage(aiId, fallbackResponse);

						// Update state to show we're done
						setStreamState((prev) => ({
							...prev,
							isStreaming: false,
							isConnecting: false,
						}));

						cleanup();
						callbacks.onDone?.();
					}
				});

				function cleanup() {
					try {
						es.close();
					} catch {}
					currentConnection.current = null;
					connecting.current = false;
					stopHealthMonitoring();
					// Don't clear streaming state on cleanup - let the UI handle it
				}

				return cleanup;
			} catch (error) {
				assistantStreamLog.error('Failed to start stream', error);
				connecting.current = false;

				// Update state
				setStreamState((prev) => ({
					...prev,
					isStreaming: false,
					isConnecting: false,
					lastError: error instanceof Error ? error.message : String(error),
				}));

				stopHealthMonitoring();

				// Log error with context
				ErrorService.logError(error, {
					messageId,
					sessionId: streamingRef.current.sessionId,
					operation: 'start_stream',
					retryCount: streamState.retryCount,
				});

				// Check if we should retry
				const shouldRetry =
					streamState.retryCount < retryConfig.maxRetries &&
					error instanceof Error &&
					(error.message.includes('network') ||
						error.message.includes('timeout') ||
						error.message.includes('connection'));

				if (shouldRetry) {
					const nextRetryCount = streamState.retryCount + 1;
					const delay = calculateRetryDelay(nextRetryCount - 1);

					assistantStreamLog.debug(
						`Retrying in ${delay}ms (attempt ${nextRetryCount}/${retryConfig.maxRetries})`
					);

					// Schedule retry
					retryTimeoutRef.current = setTimeout(() => {
						startStream(message, callbacks, {
							messageId,
							retryCount: nextRetryCount,
						});
					}, delay);

					// Notify about retry
					callbacks.onRetry?.(nextRetryCount, retryConfig.maxRetries);
				} else {
					// Final error - no more retries
					dispatch({
						type: 'FAIL_STREAM',
						id: messageId,
						error: `Stream setup failed: ${error}`,
					});
					callbacks.onError?.(`Stream setup failed: ${error}`);
				}

				return () => {}; // Return no-op cleanup function
			}
		},
		[
			buildSseUrl,
			streamingRef,
			onDeltaReceived,
			dispatch,
			messages,
			finalizeMessage,
			streamState.retryCount,
			streamState.startTime,
			calculateRetryDelay,
			startHealthMonitoring,
			stopHealthMonitoring,
			retryConfig.maxRetries,
		]
	);

	const stopStream = useCallback(() => {
		assistantStreamLog.debug('Manually stopping stream');

		// Clear any pending retries
		if (retryTimeoutRef.current) {
			clearTimeout(retryTimeoutRef.current);
			retryTimeoutRef.current = null;
		}

		// Stop health monitoring
		stopHealthMonitoring();

		// Close connection
		if (currentConnection.current) {
			currentConnection.current.close();
			currentConnection.current = null;
		}

		// Reset state
		resetStreamState();

		// Clear refs
		connecting.current = false;
		currentMessageId.current = null;
		clearStreaming();
	}, [clearStreaming, stopHealthMonitoring, resetStreamState]);

	// Get current performance metrics
	const getPerformanceMetrics = useCallback((): StreamMetrics | null => {
		if (!streamState.startTime) return null;

		const now = Date.now();
		const duration = now - streamState.startTime;
		const characterCount = bufferedText.current.length;
		const charactersPerSecond =
			duration > 0 ? (characterCount / duration) * 1000 : 0;

		return {
			duration,
			characterCount,
			charactersPerSecond,
			retryCount: streamState.retryCount,
			connectionHealth: streamState.connectionHealth,
			lastActivity: streamState.lastActivity,
		};
	}, [streamState, bufferedText]);

	return {
		startStream,
		stopStream,
		isConnected: !!currentConnection.current,
		isConnecting: streamState.isConnecting,
		isStreaming: streamState.isStreaming,
		isRetrying: streamState.isRetrying,
		retryCount: streamState.retryCount,
		maxRetries: retryConfig.maxRetries,
		lastError: streamState.lastError,
		connectionHealth: streamState.connectionHealth,
		getPerformanceMetrics,
	};
}
