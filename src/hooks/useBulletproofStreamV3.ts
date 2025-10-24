import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { Message, MessageAction } from './useMessagesReducerV2';
import { startStreaming, stopStreaming } from '../services/streaming';
import { cancelSSE } from '../services/streamManager';
import { buildSseUrl } from '../networking/endpoints';
import { authService } from '../services/authService';
import { ErrorService } from '../services/errorService';

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

interface StreamState {
	isStreaming: boolean;
	isConnecting: boolean;
	isRetrying: boolean;
	retryCount: number;
	maxRetries: number;
	lastError: string | null;
	connectionHealth: 'healthy' | 'degraded' | 'unhealthy';
	startTime: number | null;
	lastActivity: number | null;
}

interface RetryConfig {
	maxRetries: number;
	baseDelay: number;
	maxDelay: number;
	backoffMultiplier: number;
}

interface UseBulletproofStreamProps {
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

export function useBulletproofStreamV3({
	messages,
	dispatch,
	streamingRef,
	onDeltaReceived,
	addDelta,
	finalizeMessage,
	setError,
	clearStreaming,
}: UseBulletproofStreamProps) {
	const bufferedText = useRef<string>('');
	const currentMessageId = useRef<string | null>(null);
	const connectionRef = useRef<any>(null);
	const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const healthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
		null
	);

	// Enhanced state management
	const [streamState, setStreamState] = useState<StreamState>({
		isStreaming: false,
		isConnecting: false,
		isRetrying: false,
		retryCount: 0,
		maxRetries: 3,
		lastError: null,
		connectionHealth: 'healthy',
		startTime: null,
		lastActivity: null,
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

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			stopStreaming();
			stopHealthMonitoring();
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current);
			}
		};
	}, [stopHealthMonitoring]);

	// Additional cleanup on route change/unmount
	useEffect(() => {
		return () => {
			// Cancel any active SSE connection
			cancelSSE();
		};
	}, []);

	const startStream = useCallback(
		async (
			message: string,
			callbacks: StreamingCallbacks,
			options?: { messageId?: string; retryCount?: number }
		) => {
			// Prevent duplicate streams
			if (streamState.isStreaming) {
				console.warn(
					'[BulletproofStream] Already streaming, ignoring duplicate'
				);
				return;
			}

			const messageId = options?.messageId || (Date.now() + 1).toString();
			const sessionId = streamingRef.current.sessionId || 'default';
			const retryCount = options?.retryCount || 0;

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
			streamingRef.current.messageId = messageId;

				messageId,
				messageLength: message.length,
				retryCount:
					retryCount > 0
						? `${retryCount}/${retryConfig.maxRetries}`
						: 'initial',
				message: message.substring(0, 100) + '...',
			});

			// Notify about retry if applicable
			if (retryCount > 0) {
				callbacks.onRetry?.(retryCount, retryConfig.maxRetries);
			}

			try {
				// Get Firebase UID for SSE authentication
				const firebaseUID = await authService.getCurrentUserUID();

				if (!firebaseUID) {
					throw new Error('No authenticated user found');
				}

					uid: firebaseUID.substring(0, 10) + '...',
				});

				// Build URL using the centralized buildSseUrl function
				const url = buildSseUrl({
					sessionId,
					message: message.trim(),
					uid: firebaseUID,
					clientMessageId: messageId,
					expand: options?.expand || false,
				});

					url: url.substring(0, 100) + '...',
					hasUID: !!firebaseUID,
					fullUrl: url,
				});


				// Start health monitoring
				startHealthMonitoring();

				// Start streaming with stream key for deduplication
				const connection = startStreaming({
					url,
					token: '', // Not needed for UID-based auth
					streamKey: `${firebaseUID}:${messageId}`, // Use stable stream key
					clientMessageId: messageId, // Pass message ID for filtering
					onDelta: (text: string) => {
						// Update activity timestamp
						setStreamState((prev) => ({
							...prev,
							lastActivity: Date.now(),
							isConnecting: false,
						}));

							textLength: text.length,
							text: text.substring(0, 50) + '...',
							messageId,
							timestamp: new Date().toISOString(),
							bufferedLength: bufferedText.current.length,
						});
						bufferedText.current += text;
						addDelta(messageId, text);
						onDeltaReceived();
						// NOTE: onDelta callbacks are telemetry only; do not mutate message text here.
						callbacks.onMeta?.({ type: 'delta', len: text.length });
					},
					onDone: () => {
						// Calculate performance metrics
						const endTime = Date.now();
						const startTime = streamState.startTime || endTime;
						const duration = endTime - startTime;

							messageId,
							duration: `${duration}ms`,
							chars: bufferedText.current.length,
							retryCount: streamState.retryCount,
							timestamp: new Date().toISOString(),
							finalText: bufferedText.current.substring(0, 100) + '...',
						});

						setStreamState((prev) => ({
							...prev,
							isStreaming: false,
							isConnecting: false,
							lastActivity: endTime,
						}));

						currentMessageId.current = null;
						streamingRef.current.messageId = null;
						clearStreaming();
						stopHealthMonitoring();

						// Finalize the message with performance data
						finalizeMessage(messageId, bufferedText.current, {
							totalLatency: duration,
							timeToFirstToken: duration,
							cacheHit: false,
							modelUsed: 'streaming',
							tokensUsed: bufferedText.current.length,
						});
						callbacks.onDone?.();
					},
					onError: (error: string) => {
						// Update state
						setStreamState((prev) => ({
							...prev,
							isStreaming: false,
							isConnecting: false,
							lastError: error,
						}));

						stopHealthMonitoring();

						// Log error with context for debugging
						ErrorService.logError(
							{ message: error },
							{
								messageId,
								sessionId: streamingRef.current.sessionId,
								operation: 'streaming',
								retryCount: streamState.retryCount,
							}
						);

						// Categorize error and get user-friendly message
						const errorState = ErrorService.categorizeError({ message: error });
						const userMessage = ErrorService.getUserFriendlyMessage({
							message: error,
						});

						console.error('🚨 [Stream] Error:', {
							error,
							messageId,
							retryCount: streamState.retryCount,
							errorType: errorState.type,
						});

						// Check if we should retry
						const shouldRetry =
							streamState.retryCount < retryConfig.maxRetries &&
							(error.includes('network') ||
								error.includes('timeout') ||
								error.includes('connection'));

						if (shouldRetry) {
							const nextRetryCount = streamState.retryCount + 1;
							const delay = calculateRetryDelay(nextRetryCount - 1);

								attempt: `${nextRetryCount}/${retryConfig.maxRetries}`,
								delay: `${delay}ms`,
								reason: error.includes('network') ? 'network' : 'connection',
							});

							// Update retry count in state
							setStreamState((prev) => ({
								...prev,
								retryCount: nextRetryCount,
							}));

							// Schedule retry with a new attempt
							retryTimeoutRef.current = setTimeout(async () => {
								try {
									// Get fresh auth token
									const token = await authService.getAuthToken();
									if (!token) {
										throw new Error('No authentication token available');
									}

									// Build URL using the centralized buildSseUrl function
									const url = buildSseUrl({
										sessionId,
										message: message.trim(),
										uid: token,
										clientMessageId: messageId,
									});

									// Start new connection
									startStreaming({
										url,
										token,
										clientMessageId: messageId, // Pass message ID for filtering
										onDelta: (text: string) => {
											setStreamState((prev) => ({
												...prev,
												lastActivity: Date.now(),
												isConnecting: false,
											}));
											bufferedText.current += text;
											addDelta(messageId, text);
											onDeltaReceived();
											// NOTE: onDelta callbacks are telemetry only; do not mutate message text here.
											callbacks.onMeta?.({ type: 'delta', len: text.length });
										},
										onDone: () => {
											setStreamState((prev) => ({
												...prev,
												isStreaming: false,
												isConnecting: false,
											}));
											finalizeMessage(messageId, bufferedText.current);
											callbacks.onDone?.();
										},
										onError: (error: string) => {
											console.error('🚨 [Stream] Retry failed:', {
												error,
												attempt: nextRetryCount,
												messageId,
											});
											setStreamState((prev) => ({
												...prev,
												isStreaming: false,
												isConnecting: false,
												lastError: error,
											}));
											clearStreaming();
											setError(messageId, 'Connection failed after retries');
											callbacks.onError?.('Connection failed after retries');
										},
										onMeta: (data: any) => {
											callbacks.onMeta?.(data);
										},
									});
								} catch (retryError) {
									console.error('🚨 [Stream] Retry setup failed:', {
										error:
											retryError instanceof Error
												? retryError.message
												: String(retryError),
										messageId,
										attempt: nextRetryCount,
									});
									setStreamState((prev) => ({
										...prev,
										isStreaming: false,
										isConnecting: false,
									}));
									clearStreaming();
									setError(messageId, 'Connection failed');
									callbacks.onError?.('Connection failed');
								}
							}, delay);

							// Notify about retry
							callbacks.onRetry?.(nextRetryCount, retryConfig.maxRetries);
						} else {
							// Final error - no more retries
							console.error('💥 [Stream] Final failure:', {
								messageId,
								error,
								retryCount: streamState.retryCount,
								maxRetries: retryConfig.maxRetries,
								userMessage,
							});

							currentMessageId.current = null;
							streamingRef.current.messageId = null;
							clearStreaming();

							// Set error on the message with user-friendly text
							setError(messageId, userMessage);
							callbacks.onError?.(userMessage);
						}
					},
					onMeta: (data: any) => {
						callbacks.onMeta?.(data);
					},
				});

				// Store connection for cleanup
				connectionRef.current = connection;
				return connection;
			} catch (error: any) {
				// Update state
				setStreamState((prev) => ({
					...prev,
					isStreaming: false,
					isConnecting: false,
					lastError: error.message || String(error),
				}));

				stopHealthMonitoring();

				// Log error with context for debugging
				ErrorService.logError(error, {
					messageId,
					sessionId: streamingRef.current.sessionId,
					operation: 'start_stream',
					retryCount: streamState.retryCount,
				});

				// Check if we should retry
				const shouldRetry =
					streamState.retryCount < retryConfig.maxRetries &&
					(error.message?.includes('network') ||
						error.message?.includes('timeout') ||
						error.message?.includes('connection'));

				if (shouldRetry) {
					const nextRetryCount = streamState.retryCount + 1;
					const delay = calculateRetryDelay(nextRetryCount - 1);

						attempt: `${nextRetryCount}/${retryConfig.maxRetries}`,
						delay: `${delay}ms`,
						error: error.message || String(error),
					});

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
					console.error('💥 [Stream] Failed to start:', {
						messageId,
						error: error.message || String(error),
						retryCount: streamState.retryCount,
					});

					currentMessageId.current = null;
					streamingRef.current.messageId = null;
					clearStreaming();

					// Categorize error and get user-friendly message
					const userMessage = ErrorService.getUserFriendlyMessage(error);
					setError(messageId, userMessage);
					callbacks.onError?.(userMessage);
				}
			}
		},
		[
			streamingRef,
			addDelta,
			finalizeMessage,
			setError,
			clearStreaming,
			onDeltaReceived,
			streamState.retryCount,
			streamState.isStreaming,
			streamState.startTime,
			calculateRetryDelay,
			startHealthMonitoring,
			stopHealthMonitoring,
			retryConfig.maxRetries,
		]
	);

	const stopStream = useCallback(() => {
		// Clear any pending retries
		if (retryTimeoutRef.current) {
			clearTimeout(retryTimeoutRef.current);
			retryTimeoutRef.current = null;
		}

		// Stop health monitoring
		stopHealthMonitoring();

		// Stop the actual stream
		stopStreaming();

		// Reset state
		resetStreamState();

		// Clear refs
		currentMessageId.current = null;
		streamingRef.current.messageId = null;
		connectionRef.current = null;
		clearStreaming();
	}, [streamingRef, clearStreaming, stopHealthMonitoring, resetStreamState]);

	// Get current performance metrics
	const getPerformanceMetrics = useCallback(() => {
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
		};
	}, [streamState, bufferedText]);

	return {
		startStream,
		stopStream,
		isStreaming: streamState.isStreaming,
		isConnecting: streamState.isConnecting,
		isRetrying: streamState.isRetrying,
		retryCount: streamState.retryCount,
		maxRetries: retryConfig.maxRetries,
		lastError: streamState.lastError,
		connectionHealth: streamState.connectionHealth,
		getPerformanceMetrics,
	};
}
