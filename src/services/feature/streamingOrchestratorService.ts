/**
 * Streaming Orchestrator AI Service
 *
 * Mobile client for streaming AI responses using Server-Sent Events
 * Provides real-time incremental text updates with performance tracking
 */

import { ApiService } from '../core/apiService';
import { buildSseUrl } from '../../networking/endpoints';

// Define FinancialContext interface locally to avoid circular dependencies
interface FinancialContext {
	profile: {
		monthlyIncome: number;
		savings: number;
		debt: number;
		expenses: Record<string, number>;
		financialGoal: string;
		riskProfile: {
			tolerance: string;
			experience: string;
		};
	};
	budgets: any[];
	goals: any[];
	transactions: any[];
	recurringExpenses?: any[];
}

export interface StreamingOrchestratorRequest {
	message: string;
	sessionId?: string;
	options?: {
		timezone?: string;
		year?: number;
		month?: number;
		includeForecasts?: boolean;
		forceRefresh?: boolean;
	};
}

export interface StreamingChunk {
	type:
		| 'meta'
		| 'delta'
		| 'final'
		| 'trace'
		| 'done'
		| 'error'
		| 'start'
		| 'chunk'
		| 'performance'
		| 'complete';
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

export interface StreamingPerformance {
	timeToFirstToken: number;
	totalLatency: number;
	phases: {
		routing: number;
		slotChecking: number;
		factFetching: number;
		toolExecution: number;
		cacheCheck: number;
		llmGeneration: number;
		critic: number;
		caching: number;
	};
	parallelTools: {
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
	cacheHit: boolean;
	modelUsed: string;
	tokensUsed: number;
}

export interface StreamingResponse {
	response: string;
	sessionId: string;
	timestamp: Date;
	performance: StreamingPerformance;
	intentResult?: {
		canAnswer: boolean;
		confidence: number;
		intent?: {
			name: string;
			slots?: Record<string, any>;
		};
		response?: string;
		missingInfo?: {
			id: string;
			label: string;
			description: string;
			required: boolean;
			priority: 'high' | 'medium' | 'low';
			examples?: string[];
			placeholder?: string;
			inputType?: 'text' | 'number' | 'date' | 'select';
			options?: string[];
		}[];
		chips?: {
			id: string;
			label: string;
			action: string;
		}[];
	};
	missingInfo?: {
		id: string;
		label: string;
		description: string;
		required: boolean;
		priority: 'high' | 'medium' | 'low';
		examples?: string[];
		placeholder?: string;
		inputType?: 'text' | 'number' | 'date' | 'select';
		options?: string[];
	}[];
	evidence: string[];
	metadata: {
		requestId: string;
		userId: string;
		processedAt: Date;
		version: string;
	};
	usage?: {
		estimatedTokens: number;
		remainingTokens: number;
		remainingRequests: number;
	};
}

export interface StreamingCallbacks {
	onStart?: () => void;
	onChunk?: (text: string) => void;
	onMeta?: (data: MetaEventData) => void;
	onTrace?: (data: TraceEventData) => void;
	onPerformance?: (data: StreamingPerformance) => void;
	onComplete?: (data: FinalEventData) => void;
	onError?: (error: string) => void;
	onDone?: () => void;
}

export class StreamingOrchestratorService {
	private sessionId: string;
	private context: FinancialContext;
	private baseUrl: string;
	private lastEventId: string | null = null;
	private retryCount: number = 0;
	private maxRetries: number = 3;
	private bufferedText: string = '';
	private isStreaming: boolean = false;
	private currentConnection: EventSource | null = null;
	private connecting: boolean = false;

	constructor(context: FinancialContext, sessionId?: string) {
		this.context = context;
		this.sessionId = sessionId || this.generateSessionId();
		this.baseUrl =
			process.env.EXPO_PUBLIC_API_URL ||
			'https://brie-staging-api.onrender.com';
	}

	/**
	 * Generate a unique session ID
	 */
	private generateSessionId(): string {
		return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Stream AI response using Server-Sent Events
	 */
	async streamResponse(
		message: string,
		options?: StreamingOrchestratorRequest['options']
	): Promise<StreamingChunk[]> {
		const startTime = Date.now();
		let timeToFirstToken: number | null = null;
		const messageId = `msg_${Date.now()}_${Math.random()
			.toString(36)
			.substr(2, 9)}`;

		// Single-flight guard to prevent duplicate connections
		if (
			this.connecting ||
			(this.currentConnection && this.currentConnection.readyState === 1)
		) {
			console.warn(
				'[StreamingOrchestratorService] Already connecting/connected, skipping duplicate request'
			);
			return [];
		}

		try {
			console.log(
				'[StreamingOrchestratorService] Starting stream for:',
				message
			);
			console.log('[StreamingOrchestratorService] Session ID:', this.sessionId);

			const requestPayload: StreamingOrchestratorRequest = {
				message: message.trim(),
				sessionId: this.sessionId,
				options: {
					timezone: 'America/Los_Angeles',
					year: new Date().getFullYear(),
					month: new Date().getMonth() + 1,
					includeForecasts: true,
					...options,
				},
			};

			// Check if EventSource is available (React Native compatibility)
			if (typeof (global as any).EventSource === 'undefined') {
				// Fallback to regular API call for React Native
				console.log(
					'[StreamingOrchestratorService] EventSource not available, using fallback'
				);
				const response = await fetch(`${this.baseUrl}/api/orchestrator/chat`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-firebase-uid': 'dummy', // This will be handled by the API service
					},
					body: JSON.stringify(requestPayload),
				});

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const data = await response.json();

				// Simulate streaming by creating chunks from the response
				const text = data.response || '';
				const words = text.split(' ');
				const simulatedChunks: StreamingChunk[] = [
					{
						type: 'start',
						data: { sessionId: this.sessionId },
						timestamp: new Date(),
					},
				];

				// Create chunks from words
				let currentChunk = '';
				for (const word of words) {
					currentChunk += (currentChunk ? ' ' : '') + word;
					if (currentChunk.length > 50) {
						simulatedChunks.push({
							type: 'chunk',
							data: { text: currentChunk },
							timestamp: new Date(),
						});
						currentChunk = '';
					}
				}

				// Add remaining text
				if (currentChunk) {
					simulatedChunks.push({
						type: 'chunk',
						data: { text: currentChunk },
						timestamp: new Date(),
					});
				}

				// Add performance and completion chunks
				simulatedChunks.push({
					type: 'performance',
					data: data.performance || {},
					timestamp: new Date(),
				});

				simulatedChunks.push({
					type: 'complete',
					data: {
						sessionId: this.sessionId,
						performance: data.performance,
						intentResult: data.intentResult,
						missingInfo: data.missingInfo,
						evidence: data.evidence,
						metadata: data.metadata,
					},
					timestamp: new Date(),
				});

				return simulatedChunks;
			}

			// Get auth headers for UID
			const authHeaders = await ApiService.getApiHeaders();
			const firebaseUid = authHeaders['x-firebase-uid'] || 'dummy';

			// Create EventSource for Server-Sent Events using centralized URL with UID
			const url = buildSseUrl({
				sessionId: this.sessionId,
				message: message.trim(),
				uid: firebaseUid,
				clientMessageId: messageId,
			});
			const eventSource = new EventSource(url);
			this.currentConnection = eventSource;
			this.connecting = true;

			const chunks: StreamingChunk[] = [];

			// Handle different event types
			const handleEvent = (event: MessageEvent) => {
				if (!event?.data) return;
				if (event.data === '[DONE]') {
					eventSource.close();
					return;
				}

				try {
					const chunk: StreamingChunk = JSON.parse(event.data);

					// Track time to first token
					if (
						(chunk.type === 'chunk' || chunk.type === 'delta') &&
						timeToFirstToken === null
					) {
						timeToFirstToken = Date.now() - startTime;
						console.log(
							'[StreamingOrchestratorService] Time to first token:',
							timeToFirstToken + 'ms'
						);
					}

					// Add chunk to array
					chunks.push(chunk);
				} catch (error) {
					console.error(
						'[StreamingOrchestratorService] Error parsing chunk:',
						error
					);
					chunks.push({
						type: 'error',
						data: { error: 'Failed to parse chunk' },
						timestamp: new Date(),
					});
				}
			};

			// Handle all event types
			eventSource.onmessage = handleEvent;
			const events = [
				'message',
				'token',
				'chunk',
				'delta',
				'meta',
				'trace',
				'performance',
				'complete',
			];
			events.forEach((eventType) =>
				eventSource.addEventListener(eventType, handleEvent)
			);

			// Handle special events
			eventSource.addEventListener('open', () => {
				console.log('[StreamingOrchestratorService] Connection opened');
				this.connecting = false;
			});
			eventSource.addEventListener('done', () => {
				console.log('[StreamingOrchestratorService] Stream done');
				this.cleanup();
			});
			eventSource.addEventListener('ping', () => {
				// Optional no-op for ping events
			});

			eventSource.onerror = (error) => {
				console.error(
					'[StreamingOrchestratorService] EventSource error:',
					error
				);
				this.connecting = false;
				chunks.push({
					type: 'error',
					data: { error: 'Connection error' },
					timestamp: new Date(),
				});
				this.cleanup();
				throw new Error('Connection error');
			};

			// Wait for completion
			return new Promise<StreamingChunk[]>((resolve, reject) => {
				const completeHandler = () => {
					console.log('[StreamingOrchestratorService] Stream completed');
					this.cleanup();
					resolve(chunks);
				};

				// Listen for completion events
				eventSource.addEventListener('complete', completeHandler);
				eventSource.addEventListener('done', completeHandler);

				// Timeout after 30 seconds
				setTimeout(() => {
					this.cleanup();
					reject(new Error('Stream timeout'));
				}, 30000);
			});
		} catch (error) {
			console.error(
				'[StreamingOrchestratorService] Error starting stream:',
				error
			);
			throw error;
		}
	}

	/**
	 * Stream with real-time callbacks for UI updates
	 */
	async streamWithCallbacks(
		message: string,
		callbacks: StreamingCallbacks,
		options?: StreamingOrchestratorRequest['options']
	): Promise<void> {
		const startTime = Date.now();
		let timeToFirstToken: number | null = null;
		const messageId = `msg_${Date.now()}_${Math.random()
			.toString(36)
			.substr(2, 9)}`;

		// Single-flight guard to prevent duplicate connections
		if (
			this.connecting ||
			(this.currentConnection && this.currentConnection.readyState === 1)
		) {
			console.warn(
				'[StreamingOrchestratorService] Already connecting/connected, skipping duplicate request'
			);
			return;
		}

		try {
			console.log(
				'[StreamingOrchestratorService] Starting stream with callbacks for:',
				message
			);
			callbacks.onStart?.();

			// Request payload for potential future use
			// const requestPayload: StreamingOrchestratorRequest = {
			// 	message: message.trim(),
			// 	sessionId: this.sessionId,
			// 	options: {
			// 		timezone: 'America/Los_Angeles',
			// 		year: new Date().getFullYear(),
			// 		month: new Date().getMonth() + 1,
			// 		includeForecasts: true,
			// 		...options,
			// 	},
			// };

			// Check if EventSource is available (React Native compatibility)
			if (typeof (global as any).EventSource === 'undefined') {
				console.log(
					'[StreamingOrchestratorService] EventSource not available, using fallback'
				);
				callbacks.onError?.('EventSource not available');
				return;
			}

			// Get auth headers for UID
			const authHeaders = await ApiService.getApiHeaders();
			const firebaseUid = authHeaders['x-firebase-uid'] || 'dummy';

			// Create EventSource for Server-Sent Events using centralized URL with UID
			const url = buildSseUrl({
				sessionId: this.sessionId,
				message: message.trim(),
				uid: firebaseUid,
				clientMessageId: messageId,
			});
			const eventSource = new EventSource(url);
			this.currentConnection = eventSource;
			this.connecting = true;
			this.isStreaming = true;

			// Handle different event types
			const handleEvent = (event: MessageEvent) => {
				if (!event?.data) return;
				if (event.data === '[DONE]') {
					this.cleanup();
					callbacks.onDone?.();
					return;
				}

				try {
					const chunk: StreamingChunk = JSON.parse(event.data);

					// Track time to first token
					if (
						(chunk.type === 'chunk' || chunk.type === 'delta') &&
						timeToFirstToken === null
					) {
						timeToFirstToken = Date.now() - startTime;
						console.log(
							'[StreamingOrchestratorService] Time to first token:',
							timeToFirstToken + 'ms'
						);
					}

					// Handle different chunk types with callbacks
					switch (chunk.type) {
						case 'start':
							callbacks.onStart?.();
							break;
						case 'chunk':
						case 'delta':
							callbacks.onChunk?.(chunk.data.text || '');
							break;
						case 'meta':
							callbacks.onMeta?.(chunk.data);
							break;
						case 'trace':
							callbacks.onTrace?.(chunk.data);
							break;
						case 'performance':
							callbacks.onPerformance?.(chunk.data);
							break;
						case 'complete':
						case 'final':
							callbacks.onComplete?.(chunk.data);
							this.cleanup();
							callbacks.onDone?.();
							break;
						case 'error':
							callbacks.onError?.(chunk.data.error || 'Unknown error');
							break;
					}
				} catch (error) {
					console.error(
						'[StreamingOrchestratorService] Error parsing chunk:',
						error
					);
					callbacks.onError?.('Failed to parse chunk');
				}
			};

			// Handle all event types
			eventSource.onmessage = handleEvent;
			const events = [
				'message',
				'token',
				'chunk',
				'delta',
				'meta',
				'trace',
				'performance',
				'complete',
			];
			events.forEach((eventType) =>
				eventSource.addEventListener(eventType, handleEvent)
			);

			// Handle special events
			eventSource.addEventListener('open', () => {
				console.log('[StreamingOrchestratorService] Connection opened');
				this.connecting = false;
			});
			eventSource.addEventListener('done', () => {
				console.log('[StreamingOrchestratorService] Stream done');
				this.cleanup();
				callbacks.onDone?.();
			});
			eventSource.addEventListener('ping', () => {
				// Optional no-op for ping events
			});

			eventSource.onerror = (error) => {
				console.error(
					'[StreamingOrchestratorService] EventSource error:',
					error
				);
				this.connecting = false;
				callbacks.onError?.('Connection error');
				this.cleanup();
			};
		} catch (error) {
			console.error(
				'[StreamingOrchestratorService] Error starting stream:',
				error
			);
			callbacks.onError?.(
				error instanceof Error ? error.message : 'Unknown error'
			);
		}
	}

	/**
	 * Get streaming response as a complete response (for fallback)
	 */
	async getStreamingResponse(
		message: string,
		options?: StreamingOrchestratorRequest['options']
	): Promise<StreamingResponse> {
		const startTime = Date.now();
		let response = '';
		let performance: StreamingPerformance | null = null;
		let intentResult: any = null;
		let missingInfo: any[] = [];
		let evidence: string[] = [];
		let metadata: any = null;
		let usage: any = null;

		try {
			const chunks = await this.streamResponse(message, options);

			for (const chunk of chunks) {
				switch (chunk.type) {
					case 'start':
						console.log('[StreamingOrchestratorService] Stream started');
						break;

					case 'chunk':
					case 'delta':
						response += chunk.data.text || '';
						break;

					case 'performance':
						performance = chunk.data;
						break;

					case 'meta':
						metadata = chunk.data;
						break;

					case 'trace':
						// Handle trace data for debugging
						console.log(
							'[StreamingOrchestratorService] Trace data:',
							chunk.data
						);
						break;

					case 'complete':
					case 'final':
						// Finalize the response
						const totalTime = Date.now() - startTime;
						return {
							response,
							sessionId: this.sessionId,
							timestamp: new Date(),
							performance: performance || this.getDefaultPerformance(totalTime),
							intentResult: intentResult || chunk.data.intentResult,
							missingInfo:
								missingInfo.length > 0
									? missingInfo
									: chunk.data.missingInfo || [],
							evidence:
								evidence.length > 0 ? evidence : chunk.data.evidence || [],
							metadata:
								metadata || chunk.data.metadata || this.getDefaultMetadata(),
							usage: usage || chunk.data.usage,
						};

					case 'error':
						throw new Error(chunk.data.error || 'Stream error');
				}
			}

			// If we get here, the stream completed without a 'complete' event
			const totalTime = Date.now() - startTime;
			return {
				response,
				sessionId: this.sessionId,
				timestamp: new Date(),
				performance: performance || this.getDefaultPerformance(totalTime),
				intentResult,
				missingInfo,
				evidence,
				metadata: metadata || this.getDefaultMetadata(),
				usage,
			};
		} catch (error) {
			console.error(
				'[StreamingOrchestratorService] Error in streaming response:',
				error
			);
			return this.getFallbackResponse(message);
		}
	}

	/**
	 * Get fallback response when streaming fails
	 */
	private getFallbackResponse(message: string): StreamingResponse {
		const fallbackResponse =
			"I'm having trouble processing your request right now. Please try again in a moment, or rephrase your question.";

		return {
			response: fallbackResponse,
			sessionId: this.sessionId,
			timestamp: new Date(),
			performance: this.getDefaultPerformance(0),
			evidence: [],
			metadata: this.getDefaultMetadata(),
		};
	}

	/**
	 * Get default performance metrics
	 */
	private getDefaultPerformance(totalTime: number): StreamingPerformance {
		return {
			timeToFirstToken: 0,
			totalLatency: totalTime,
			phases: {
				routing: 0,
				slotChecking: 0,
				factFetching: 0,
				toolExecution: 0,
				cacheCheck: 0,
				llmGeneration: 0,
				critic: 0,
				caching: 0,
			},
			parallelTools: {
				executed: [],
				timings: {},
				successCount: 0,
				failureCount: 0,
				timeoutCount: 0,
				avgToolTime: 0,
			},
			cacheHit: false,
			modelUsed: 'fallback',
			tokensUsed: 0,
		};
	}

	/**
	 * Get default metadata
	 */
	private getDefaultMetadata() {
		return {
			requestId: `fallback_${Date.now()}`,
			userId: '',
			processedAt: new Date(),
			version: '1.0.0',
		};
	}

	/**
	 * Update the financial context
	 */
	updateContext(newContext: FinancialContext): void {
		this.context = newContext;
		console.log('[StreamingOrchestratorService] Context updated');
	}

	/**
	 * Get current session ID
	 */
	getSessionId(): string {
		return this.sessionId;
	}

	/**
	 * Create a new session
	 */
	createNewSession(): void {
		this.sessionId = this.generateSessionId();
		console.log(
			'[StreamingOrchestratorService] New session created:',
			this.sessionId
		);
	}

	/**
	 * Clean up current connection
	 */
	private cleanup(): void {
		if (this.currentConnection) {
			this.currentConnection.close();
			this.currentConnection = null;
		}
		this.connecting = false;
		this.isStreaming = false;
	}

	/**
	 * Stop current streaming session
	 */
	stopStreaming(): void {
		console.log('[StreamingOrchestratorService] Stopping streaming');
		this.cleanup();
	}

	/**
	 * Check if currently streaming
	 */
	isCurrentlyStreaming(): boolean {
		return (
			this.isStreaming ||
			Boolean(this.currentConnection && this.currentConnection.readyState === 1)
		);
	}

	/**
	 * Get connection status
	 */
	getConnectionStatus(): 'disconnected' | 'connecting' | 'connected' | 'error' {
		if (!this.currentConnection) return 'disconnected';
		if (this.connecting) return 'connecting';
		if (this.currentConnection.readyState === 1) return 'connected';
		return 'error';
	}
}
