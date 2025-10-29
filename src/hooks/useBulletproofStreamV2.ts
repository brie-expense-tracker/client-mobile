import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { Message, MessageAction } from './useMessagesReducerV2';
import { startStreaming } from '../services/streaming';
import { buildSseUrl } from '../networking/endpoints';
import { authService } from '../services/authService';
import { ErrorService } from '../services/errorService';
import { createLogger } from '../utils/sublogger';

const bulletproofStreamV2Log = createLogger('BulletproofStreamV2');

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

export function useBulletproofStreamV2({
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
			stopHealthMonitoring();
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current);
			}
		};
	}, [stopHealthMonitoring]);

	const startStream = useCallback(
		async (
			message: string,
			callbacks: StreamingCallbacks,
			options?: { messageId?: string; retryCount?: number }
		) => {
			// Prevent duplicate streams
			if (streamState.isStreaming) {
				bulletproofStreamV2Log.warn(
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

			bulletproofStreamV2Log.debug('Starting stream', {
				messageId,
				messageLength: message.length,
				retryCount:
					retryCount > 0
						? `${retryCount}/${retryConfig.maxRetries}`
						: 'initial',
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

				bulletproofStreamV2Log.debug('Using Firebase UID for auth', {
					uid: firebaseUID.substring(0, 10) + '...',
				});

				// Build URL using the centralized buildSseUrl function
				const url = buildSseUrl({
					sessionId,
					message: message.trim(),
					uid: firebaseUID,
					clientMessageId: messageId,
				});

				bulletproofStreamV2Log.debug('Built URL with UID', {
					url: url.substring(0, 100) + '...',
					hasUID: !!firebaseUID,
				});

				bulletproofStreamV2Log.debug('Connecting to server');

				// Start health monitoring
				startHealthMonitoring();

				// Start streaming
				const connection = startStreaming({
					url,
					token: '', // Not needed for UID-based auth
					clientMessageId: messageId,
					onDelta: (text: string) => {
						// Update activity timestamp
						setStreamState((prev) => ({
							...prev,
							lastActivity: Date.now(),
							isConnecting: false,
						}));

						bulletproofStreamV2Log.debug('Received delta', {
							textLength: text.length,
							messageId,
							timestamp: new Date().toISOString(),
							bufferedLength: bufferedText.current.length,
						});
						bufferedText.current += text;
						addDelta(messageId, text);
						onDeltaReceived();
						callbacks.onDelta?.({ text }, bufferedText.current);
					},
					onDone: () => {
						// Calculate performance metrics
						const endTime = Date.now();
						const startTime = streamState.startTime || endTime;
						const duration = endTime - startTime;

						bulletproofStreamV2Log.info('Stream completed', {
							messageId,
							duration: `${duration}ms`,
							chars: bufferedText.current.length,
							retryCount: streamState.retryCount,
							timestamp: new Date().toISOString(),
							finalTextPreview: bufferedText.current.substring(0, 100) + '...',
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
						setStreamState((prev) => ({
							...prev,
							isStreaming: false,
							isConnecting: false,
							lastError: error,
						}));

						stopHealthMonitoring();

						// Log error with context
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

						bulletproofStreamV2Log.error('Stream error', {
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

							bulletproofStreamV2Log.debug('Retrying stream', {
								attempt: `${nextRetryCount}/${retryConfig.maxRetries}`,
								delay: `${delay}ms`,
								reason: error.includes('network') ? 'network' : 'connection',
							});

							setStreamState((prev) => ({
								...prev,
								retryCount: nextRetryCount,
							}));

							retryTimeoutRef.current = setTimeout(async () => {
								startStream(message, callbacks, {
									messageId,
									retryCount: nextRetryCount,
								});
							}, delay);

							callbacks.onRetry?.(nextRetryCount, retryConfig.maxRetries);
						} else {
							bulletproofStreamV2Log.error('Final failure - no more retries', {
								messageId,
								error,
								retryCount: streamState.retryCount,
								maxRetries: retryConfig.maxRetries,
								userMessage,
							});

							currentMessageId.current = null;
							streamingRef.current.messageId = null;
							clearStreaming();
							setError(messageId, userMessage);
							callbacks.onError?.(userMessage);
						}
					},
					onMeta: (data: any) => {
						setStreamState((prev) => ({
							...prev,
							lastActivity: Date.now(),
							isConnecting: false,
						}));
						callbacks.onMeta?.(data);
					},
				});

				return { cancel: () => connection?.cancel?.() };
			} catch (error: any) {
				// Update state
				setStreamState((prev) => ({
					...prev,
					isStreaming: false,
					isConnecting: false,
					lastError: error.message || String(error),
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
					(error.message?.includes('network') ||
						error.message?.includes('timeout') ||
						error.message?.includes('connection'));

				if (shouldRetry) {
					const nextRetryCount = streamState.retryCount + 1;
					const delay = calculateRetryDelay(nextRetryCount - 1);

					bulletproofStreamV2Log.debug('Retrying after error', {
						attempt: `${nextRetryCount}/${retryConfig.maxRetries}`,
						delay: `${delay}ms`,
						error: error.message || String(error),
					});

					retryTimeoutRef.current = setTimeout(() => {
						startStream(message, callbacks, {
							messageId,
							retryCount: nextRetryCount,
						});
					}, delay);

					callbacks.onRetry?.(nextRetryCount, retryConfig.maxRetries);
				} else {
					bulletproofStreamV2Log.error('Failed to start stream', {
						messageId,
						error: error.message || String(error),
						retryCount: streamState.retryCount,
					});

					currentMessageId.current = null;
					streamingRef.current.messageId = null;
					clearStreaming();

					const userMessage = ErrorService.getUserFriendlyMessage(error);
					setError(messageId, userMessage);
					callbacks.onError?.(userMessage);
				}

				return () => {};
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

		// Reset state
		resetStreamState();

		// Clear refs
		currentMessageId.current = null;
		streamingRef.current.messageId = null;
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
