/**
 * Resilient API Service
 *
 * Wraps external API calls with circuit breakers, retries, and graceful fallbacks.
 * Provides a unified interface for making reliable API calls to the assistant services.
 */

import { createLogger } from '../../utils/sublogger';
import {
	CircuitBreakerManager,
	orchestratorBreaker,
	streamingBreaker,
	toolsBreaker,
} from './circuitBreaker';
import { FallbackService, CachedSpendPlan } from './fallbackService';
import { ApiService } from '../core/apiService';
import {
	getSignedApiClient,
	SignedApiClient,
} from '../../utils/signedApiClient';

// Create namespaced logger for this service
const resilientApiLog = createLogger('ResilientAPI');

export interface ResilientApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
	fromCache?: boolean;
	fallbackUsed?: boolean;
	circuitBreakerState?: string;
	attempts?: number;
	totalTime?: number;
	rateLimited?: boolean;
	requestId?: string;
	timestamp?: number;
}

export interface RequestMetrics {
	requestId: string;
	endpoint: string;
	method: string;
	startTime: number;
	endTime?: number;
	duration?: number;
	success: boolean;
	attempts: number;
	fromCache: boolean;
	fallbackUsed: boolean;
	rateLimited: boolean;
	error?: string;
}

export interface RetryPolicy {
	maxRetries: number;
	baseDelay: number;
	maxDelay: number;
	backoffMultiplier: number;
	jitter: boolean;
}

export interface RateLimitConfig {
	requestsPerMinute: number;
	burstLimit: number;
	windowSize: number;
}

export interface StreamingChunk {
	type: 'start' | 'chunk' | 'performance' | 'metadata' | 'complete' | 'error';
	data: any;
}

export class ResilientApiService {
	private static readonly circuitBreakerManager = new CircuitBreakerManager();
	private static readonly signedApiClient: SignedApiClient =
		getSignedApiClient();

	// Request tracking and metrics
	private static readonly requestMetrics = new Map<string, RequestMetrics>();
	private static readonly requestCache = new Map<
		string,
		{ data: any; timestamp: number; ttl: number }
	>();
	private static readonly pendingRequests = new Map<string, Promise<any>>();

	// Rate limiting
	private static readonly rateLimitTracker = new Map<
		string,
		{ count: number; windowStart: number }
	>();
	private static readonly rateLimitConfig: RateLimitConfig = {
		requestsPerMinute: 60,
		burstLimit: 10,
		windowSize: 60000, // 1 minute
	};

	// Retry policies
	private static readonly retryPolicies = new Map<string, RetryPolicy>();

	// Default retry policy
	private static readonly defaultRetryPolicy: RetryPolicy = {
		maxRetries: 3,
		baseDelay: 1000,
		maxDelay: 10000,
		backoffMultiplier: 2,
		jitter: true,
	};

	/**
	 * Make a resilient API call to the orchestrator
	 */
	static async callOrchestrator<T>(
		endpoint: string,
		payload: any,
		options?: {
			timeout?: number;
			retries?: number;
			fallbackEnabled?: boolean;
		}
	): Promise<ResilientApiResponse<T>> {
		const startTime = Date.now();

		try {
			const result = await orchestratorBreaker.executeWithRetry(async () => {
				const response = await ApiService.post<T>(endpoint, payload);

				if (!response.success) {
					throw new Error(response.error || 'API call failed');
				}

				return response.data!;
			}, `orchestrator_${endpoint}`);

			if (result.success && result.result) {
				return {
					success: true,
					data: result.result,
					attempts: result.attempts,
					totalTime: result.totalTime,
				};
			} else {
				// Try fallback if enabled
				if (options?.fallbackEnabled !== false) {
					const fallbackData = await this.getFallbackData();
					if (fallbackData) {
						return {
							success: true,
							data: fallbackData as T,
							fallbackUsed: true,
							attempts: result.attempts,
							totalTime: result.totalTime,
						};
					}
				}

				return {
					success: false,
					error:
						result.errors[result.errors.length - 1]?.message ||
						'All retry attempts failed',
					circuitBreakerState: orchestratorBreaker.getStats().state,
					attempts: result.attempts,
					totalTime: result.totalTime,
				};
			}
		} catch (error) {
			resilientApiLog.error('Orchestrator call failed:', error);

			// Try fallback if enabled
			if (options?.fallbackEnabled !== false) {
				const fallbackData = await this.getFallbackData();
				if (fallbackData) {
					return {
						success: true,
						data: fallbackData as T,
						fallbackUsed: true,
						totalTime: Date.now() - startTime,
					};
				}
			}

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				circuitBreakerState: orchestratorBreaker.getStats().state,
				totalTime: Date.now() - startTime,
			};
		}
	}

	/**
	 * Make a resilient streaming API call
	 */
	static async callStreamingOrchestrator(
		endpoint: string,
		queryParams: any,
		options?: {
			timeout?: number;
			retries?: number;
			fallbackEnabled?: boolean;
		}
	): Promise<{
		success: boolean;
		stream?: AsyncGenerator<StreamingChunk>;
		error?: string;
		fallbackUsed?: boolean;
		circuitBreakerState?: string;
	}> {
		try {
			const result = await streamingBreaker.executeWithRetry(async () => {
				// This would be the actual streaming implementation
				// For now, we'll simulate it
				throw new Error('Streaming not implemented yet');
			}, `streaming_${endpoint}`);

			if (result.success && result.result) {
				return {
					success: true,
					stream: result.result,
				};
			} else {
				// Try fallback if enabled
				if (options?.fallbackEnabled !== false) {
					const fallbackData = await this.getFallbackData();
					if (fallbackData) {
						return {
							success: true,
							stream: this.createFallbackStream(fallbackData),
							fallbackUsed: true,
						};
					}
				}

				return {
					success: false,
					error:
						result.errors[result.errors.length - 1]?.message ||
						'All retry attempts failed',
					circuitBreakerState: streamingBreaker.getStats().state,
				};
			}
		} catch (error) {
			resilientApiLog.error('Streaming call failed:', error);

			// Try fallback if enabled
			if (options?.fallbackEnabled !== false) {
				const fallbackData = await this.getFallbackData();
				if (fallbackData) {
					return {
						success: true,
						stream: this.createFallbackStream(fallbackData),
						fallbackUsed: true,
					};
				}
			}

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				circuitBreakerState: streamingBreaker.getStats().state,
			};
		}
	}

	/**
	 * Make a resilient API call to tools
	 */
	static async callTools<T>(
		toolName: string,
		parameters: any,
		options?: {
			timeout?: number;
			retries?: number;
		}
	): Promise<ResilientApiResponse<T>> {
		const startTime = Date.now();

		try {
			const result = await toolsBreaker.executeWithRetry(async () => {
				// This would be the actual tools API call
				// For now, we'll simulate it
				const response = await ApiService.post<T>(
					`/api/tools/${toolName}`,
					parameters
				);

				if (!response.success) {
					throw new Error(response.error || 'Tool call failed');
				}

				return response.data!;
			}, `tools_${toolName}`);

			if (result.success && result.result) {
				return {
					success: true,
					data: result.result,
					attempts: result.attempts,
					totalTime: result.totalTime,
				};
			} else {
				return {
					success: false,
					error:
						result.errors[result.errors.length - 1]?.message ||
						'All retry attempts failed',
					circuitBreakerState: toolsBreaker.getStats().state,
					attempts: result.attempts,
					totalTime: result.totalTime,
				};
			}
		} catch (error) {
			resilientApiLog.error('Tools call failed:', error);

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				circuitBreakerState: toolsBreaker.getStats().state,
				totalTime: Date.now() - startTime,
			};
		}
	}

	/**
	 * Make a secure signed API call for sensitive operations
	 * This method uses HMAC signing for all requests
	 */
	static async callSecureApi<T>(
		endpoint: string,
		payload: any,
		method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'POST',
		options?: {
			timeout?: number;
			retries?: number;
			fallbackEnabled?: boolean;
		}
	): Promise<ResilientApiResponse<T>> {
		const startTime = Date.now();

		try {
			const result = await orchestratorBreaker.executeWithRetry(async () => {
				const response = await this.signedApiClient.request<T>({
					method,
					path: endpoint,
					body: payload,
					requireSignature: true,
				});

				if (!response.success) {
					throw new Error(response.error || 'Secure API call failed');
				}

				return response.data!;
			}, `secure_${endpoint}`);

			if (result.success && result.result) {
				return {
					success: true,
					data: result.result,
					attempts: result.attempts,
					totalTime: result.totalTime,
				};
			} else {
				// Try fallback if enabled
				if (options?.fallbackEnabled !== false) {
					const fallbackData = await this.getFallbackData();
					if (fallbackData) {
						return {
							success: true,
							data: fallbackData as T,
							fallbackUsed: true,
							attempts: result.attempts,
							totalTime: result.totalTime,
						};
					}
				}

				return {
					success: false,
					error:
						result.errors[result.errors.length - 1]?.message ||
						'All retry attempts failed',
					circuitBreakerState: orchestratorBreaker.getStats().state,
					attempts: result.attempts,
					totalTime: result.totalTime,
				};
			}
		} catch (error) {
			resilientApiLog.error('Secure API call failed:', error);

			// Try fallback if enabled
			if (options?.fallbackEnabled !== false) {
				const fallbackData = await this.getFallbackData();
				if (fallbackData) {
					return {
						success: true,
						data: fallbackData as T,
						fallbackUsed: true,
						totalTime: Date.now() - startTime,
					};
				}
			}

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				circuitBreakerState: orchestratorBreaker.getStats().state,
				totalTime: Date.now() - startTime,
			};
		}
	}

	/**
	 * Execute an intelligent action with confirmation flow
	 * This method handles the full confirmation workflow for sensitive actions
	 */
	static async executeIntelligentAction<T>(
		actionType: string,
		parameters: any,
		confirmationToken?: string,
		idempotencyKey?: string,
		options?: {
			timeout?: number;
			retries?: number;
		}
	): Promise<ResilientApiResponse<T>> {
		const startTime = Date.now();

		try {
			const result = await orchestratorBreaker.executeWithRetry(async () => {
				const payload = {
					actionType,
					parameters,
					...(confirmationToken && { confirmationToken }),
					...(idempotencyKey && { idempotencyKey }),
				};

				const response = await this.signedApiClient.request<T>({
					method: 'POST',
					path: '/api/intelligent-actions/execute',
					body: payload,
					requireSignature: true,
				});

				if (!response.success) {
					throw new Error(response.error || 'Action execution failed');
				}

				return response.data!;
			}, `action_${actionType}`);

			if (result.success && result.result) {
				return {
					success: true,
					data: result.result,
					attempts: result.attempts,
					totalTime: result.totalTime,
				};
			} else {
				return {
					success: false,
					error:
						result.errors[result.errors.length - 1]?.message ||
						'All retry attempts failed',
					circuitBreakerState: orchestratorBreaker.getStats().state,
					attempts: result.attempts,
					totalTime: result.totalTime,
				};
			}
		} catch (error) {
			resilientApiLog.error('Action execution failed:', error);

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				circuitBreakerState: orchestratorBreaker.getStats().state,
				totalTime: Date.now() - startTime,
			};
		}
	}

	/**
	 * Request confirmation for an action
	 * This method initiates the confirmation flow for sensitive actions
	 */
	static async requestActionConfirmation<T>(
		actionType: string,
		parameters: any,
		options?: {
			timeout?: number;
			retries?: number;
		}
	): Promise<ResilientApiResponse<T>> {
		const startTime = Date.now();

		try {
			const result = await orchestratorBreaker.executeWithRetry(async () => {
				const payload = {
					actionType,
					parameters,
				};

				const response = await this.signedApiClient.request<T>({
					method: 'POST',
					path: '/api/intelligent-actions/execute',
					body: payload,
					requireSignature: true,
				});

				// This should return a 202 with confirmation details
				if (
					!response.success &&
					!(response.data as any)?.requiresConfirmation
				) {
					throw new Error(response.error || 'Confirmation request failed');
				}

				return response.data!;
			}, `confirmation_${actionType}`);

			if (result.success && result.result) {
				return {
					success: true,
					data: result.result,
					attempts: result.attempts,
					totalTime: result.totalTime,
				};
			} else {
				return {
					success: false,
					error:
						result.errors[result.errors.length - 1]?.message ||
						'All retry attempts failed',
					circuitBreakerState: orchestratorBreaker.getStats().state,
					attempts: result.attempts,
					totalTime: result.totalTime,
				};
			}
		} catch (error) {
			resilientApiLog.error('Confirmation request failed:', error);

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				circuitBreakerState: orchestratorBreaker.getStats().state,
				totalTime: Date.now() - startTime,
			};
		}
	}

	/**
	 * Configure the signed API client with authentication headers
	 */
	static configureAuth(
		authHeader: string,
		firebaseUID: string,
		requestId?: string
	): void {
		this.signedApiClient.setAuthHeader(authHeader);
		this.signedApiClient.setFirebaseUID(firebaseUID);
		if (requestId) {
			this.signedApiClient.setRequestId(requestId);
		}
	}

	/**
	 * Get circuit breaker health status
	 */
	static getHealthStatus(): Record<string, any> {
		return {
			orchestrator: orchestratorBreaker.getStats(),
			streaming: streamingBreaker.getStats(),
			tools: toolsBreaker.getStats(),
			overall: this.circuitBreakerManager.getHealthStatus(),
		};
	}

	/**
	 * Reset all circuit breakers
	 */
	static resetCircuitBreakers(): void {
		this.circuitBreakerManager.resetAll();
	}

	/**
	 * Cache financial data for fallback use
	 */
	static async cacheFinancialData(data: any): Promise<void> {
		await FallbackService.cacheFinancialData(data);
	}

	/**
	 * Get fallback data when services are unavailable
	 */
	private static async getFallbackData(): Promise<any> {
		try {
			// Check if we have valid cached data
			const isValid = await FallbackService.isDataValid();
			if (!isValid) {
				return null;
			}

			// Generate fallback spend plan
			const spendPlan = await FallbackService.generateFallbackSpendPlan();
			if (!spendPlan) {
				return null;
			}

			// Return a response that matches the expected format
			return {
				response: this.generateFallbackResponse(spendPlan),
				sessionId: `fallback_${Date.now()}`,
				timestamp: new Date(),
				performance: {
					totalLatency: 0,
					cacheHit: true,
					fallbackUsed: true,
				},
				evidence: [],
				metadata: {
					fallback: true,
					cachedData: true,
					generatedAt: new Date().toISOString(),
				},
			};
		} catch (error) {
			resilientApiLog.error('Failed to get fallback data:', error);
			return null;
		}
	}

	/**
	 * Generate a fallback response message
	 */
	private static generateFallbackResponse(spendPlan: CachedSpendPlan): string {
		const { plan } = spendPlan;

		let response =
			"I'm having trouble reaching the AI model right now, but I can show you your spend plan from cached data:\n\n";

		response += `💰 **Monthly Income:** $${plan.monthlyIncome.toFixed(2)}\n`;
		response += `📊 **Total Budget:** $${plan.totalBudget.toFixed(2)}\n`;
		response += `💸 **Total Spent:** $${plan.totalSpent.toFixed(2)}\n`;
		response += `✅ **Remaining:** $${plan.remaining.toFixed(2)}\n\n`;

		response += '**Budget Breakdown:**\n';
		plan.categories.forEach((category) => {
			const status =
				category.utilization > 1
					? '⚠️'
					: category.utilization > 0.8
					? '⚡'
					: '✅';
			response += `${status} ${category.name}: $${category.spent.toFixed(
				2
			)} / $${category.budget.toFixed(2)} (${(
				category.utilization * 100
			).toFixed(1)}%)\n`;
		});

		if (plan.recommendations.length > 0) {
			response += '\n**Recommendations:**\n';
			plan.recommendations.forEach((rec) => {
				response += `• ${rec}\n`;
			});
		}

		response +=
			'\n*This data is from your last successful sync. Please try again in a moment for real-time updates.*';

		return response;
	}

	/**
	 * Create a fallback stream for streaming responses
	 */
	private static async *createFallbackStream(
		data: any
	): AsyncGenerator<StreamingChunk> {
		// Simulate streaming by yielding chunks
		yield { type: 'start', data: {} };

		const response = data.response;
		const words = response.split(' ');

		for (let i = 0; i < words.length; i++) {
			yield {
				type: 'chunk',
				data: { text: words[i] + ' ' },
			};

			// Simulate typing delay
			await new Promise((resolve) => setTimeout(resolve, 50));
		}

		yield {
			type: 'complete',
			data: {
				response: response,
				performance: data.performance,
				evidence: data.evidence || [],
				metadata: data.metadata,
			},
		};
	}

	/**
	 * Generate a unique request ID
	 */
	private static generateRequestId(): string {
		return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Check if request is rate limited
	 */
	private static isRateLimited(endpoint: string): boolean {
		const now = Date.now();
		const key = endpoint;
		const tracker = this.rateLimitTracker.get(key);

		if (!tracker) {
			this.rateLimitTracker.set(key, { count: 1, windowStart: now });
			return false;
		}

		// Reset window if expired
		if (now - tracker.windowStart > this.rateLimitConfig.windowSize) {
			tracker.count = 1;
			tracker.windowStart = now;
			return false;
		}

		// Check if rate limited
		if (tracker.count >= this.rateLimitConfig.requestsPerMinute) {
			return true;
		}

		tracker.count++;
		return false;
	}

	/**
	 * Get cached response if available and not expired
	 */
	private static getCachedResponse<T>(cacheKey: string): T | null {
		const cached = this.requestCache.get(cacheKey);
		if (!cached) return null;

		const now = Date.now();
		if (now - cached.timestamp > cached.ttl) {
			this.requestCache.delete(cacheKey);
			return null;
		}

		return cached.data as T;
	}

	/**
	 * Cache response for future use
	 */
	private static setCachedResponse<T>(
		cacheKey: string,
		data: T,
		ttl: number = 300000
	): void {
		this.requestCache.set(cacheKey, {
			data,
			timestamp: Date.now(),
			ttl,
		});
	}

	/**
	 * Create cache key for request
	 */
	private static createCacheKey(endpoint: string, payload: any): string {
		const payloadHash = JSON.stringify(payload).slice(0, 50);
		return `${endpoint}_${payloadHash}`;
	}

	/**
	 * Track request metrics
	 */
	private static trackRequest(metrics: RequestMetrics): void {
		this.requestMetrics.set(metrics.requestId, metrics);

		// Clean up old metrics (keep last 1000)
		if (this.requestMetrics.size > 1000) {
			const oldestKey = this.requestMetrics.keys().next().value;
			if (oldestKey) {
				this.requestMetrics.delete(oldestKey);
			}
		}
	}

	/**
	 * Get request metrics
	 */
	static getRequestMetrics(): RequestMetrics[] {
		return Array.from(this.requestMetrics.values());
	}

	/**
	 * Get metrics summary
	 */
	static getMetricsSummary(): {
		totalRequests: number;
		successfulRequests: number;
		failedRequests: number;
		averageResponseTime: number;
		cacheHitRate: number;
		fallbackUsageRate: number;
	} {
		const metrics = this.getRequestMetrics();
		const total = metrics.length;
		const successful = metrics.filter((m) => m.success).length;
		const failed = metrics.filter((m) => !m.success).length;
		const fromCache = metrics.filter((m) => m.fromCache).length;
		const fallbackUsed = metrics.filter((m) => m.fallbackUsed).length;

		const totalResponseTime = metrics.reduce(
			(sum, m) => sum + (m.duration || 0),
			0
		);
		const averageResponseTime = total > 0 ? totalResponseTime / total : 0;

		return {
			totalRequests: total,
			successfulRequests: successful,
			failedRequests: failed,
			averageResponseTime,
			cacheHitRate: total > 0 ? fromCache / total : 0,
			fallbackUsageRate: total > 0 ? fallbackUsed / total : 0,
		};
	}

	/**
	 * Configure retry policy for specific endpoint
	 */
	static configureRetryPolicy(
		endpoint: string,
		policy: Partial<RetryPolicy>
	): void {
		this.retryPolicies.set(endpoint, {
			...this.defaultRetryPolicy,
			...policy,
		});
	}

	/**
	 * Configure rate limiting
	 */
	static configureRateLimit(config: Partial<RateLimitConfig>): void {
		Object.assign(this.rateLimitConfig, config);
	}

	/**
	 * Clear request cache
	 */
	static clearCache(): void {
		this.requestCache.clear();
	}

	/**
	 * Clear rate limit tracker
	 */
	static clearRateLimitTracker(): void {
		this.rateLimitTracker.clear();
	}

	/**
	 * Get pending requests count
	 */
	static getPendingRequestsCount(): number {
		return this.pendingRequests.size;
	}

	/**
	 * Cancel pending request
	 */
	static async cancelRequest(requestId: string): Promise<boolean> {
		const pending = this.pendingRequests.get(requestId);
		if (pending) {
			this.pendingRequests.delete(requestId);
			return true;
		}
		return false;
	}

	/**
	 * Health check for all services
	 */
	static async performHealthCheck(): Promise<{
		orchestrator: boolean;
		streaming: boolean;
		tools: boolean;
		overall: boolean;
		details: any;
	}> {
		const healthStatus = this.getHealthStatus();

		// Simple health check - try a lightweight request
		const healthChecks = await Promise.allSettled([
			this.callOrchestrator(
				'/health',
				{},
				{ timeout: 5000, retries: 1, fallbackEnabled: false }
			),
			this.callTools('health', {}, { timeout: 5000, retries: 1 }),
		]);

		const orchestratorHealthy = healthChecks[0].status === 'fulfilled';
		const toolsHealthy = healthChecks[1].status === 'fulfilled';
		const streamingHealthy = streamingBreaker.getStats().state === 'CLOSED';

		return {
			orchestrator: orchestratorHealthy,
			streaming: streamingHealthy,
			tools: toolsHealthy,
			overall: orchestratorHealthy && toolsHealthy && streamingHealthy,
			details: healthStatus,
		};
	}

	/**
	 * Request deduplication - prevent duplicate requests
	 */
	private static async deduplicateRequest<T>(
		requestKey: string,
		requestFn: () => Promise<T>
	): Promise<T> {
		// Check if request is already pending
		const pending = this.pendingRequests.get(requestKey);
		if (pending) {
			return pending;
		}

		// Create new request
		const requestPromise = requestFn().finally(() => {
			this.pendingRequests.delete(requestKey);
		});

		this.pendingRequests.set(requestKey, requestPromise);
		return requestPromise;
	}

	/**
	 * Enhanced callOrchestrator with all new features
	 */
	static async callOrchestratorEnhanced<T>(
		endpoint: string,
		payload: any,
		options?: {
			timeout?: number;
			retries?: number;
			fallbackEnabled?: boolean;
			enableCaching?: boolean;
			cacheTtl?: number;
			enableDeduplication?: boolean;
		}
	): Promise<ResilientApiResponse<T>> {
		const requestId = this.generateRequestId();
		const startTime = Date.now();
		const cacheKey = options?.enableCaching
			? this.createCacheKey(endpoint, payload)
			: null;

		// Check rate limiting
		if (this.isRateLimited(endpoint)) {
			return {
				success: false,
				error: 'Rate limit exceeded',
				rateLimited: true,
				requestId,
				timestamp: startTime,
				totalTime: Date.now() - startTime,
			};
		}

		// Check cache first
		if (options?.enableCaching && cacheKey) {
			const cached = this.getCachedResponse<T>(cacheKey);
			if (cached) {
				return {
					success: true,
					data: cached,
					fromCache: true,
					requestId,
					timestamp: startTime,
					totalTime: Date.now() - startTime,
				};
			}
		}

		// Create request function
		const requestFn = async (): Promise<ResilientApiResponse<T>> => {
			const result = await this.callOrchestrator<T>(endpoint, payload, options);

			// Cache successful responses
			if (result.success && options?.enableCaching && cacheKey) {
				this.setCachedResponse(cacheKey, result.data!, options.cacheTtl);
			}

			// Track metrics
			this.trackRequest({
				requestId,
				endpoint,
				method: 'POST',
				startTime,
				endTime: Date.now(),
				duration: Date.now() - startTime,
				success: result.success,
				attempts: result.attempts || 1,
				fromCache: result.fromCache || false,
				fallbackUsed: result.fallbackUsed || false,
				rateLimited: result.rateLimited || false,
				error: result.error,
			});

			return result;
		};

		// Use deduplication if enabled
		if (options?.enableDeduplication) {
			const requestKey = `${endpoint}_${JSON.stringify(payload).slice(0, 50)}`;
			return this.deduplicateRequest(requestKey, requestFn);
		}

		return requestFn();
	}
}
