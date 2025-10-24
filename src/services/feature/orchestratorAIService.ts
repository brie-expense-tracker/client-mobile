/**
 * Orchestrator AI Service
 *
 * Mobile client for the unified AI orchestrator
 * Provides optimized, parallel AI processing with comprehensive performance tracking
 */

import { ApiService } from '../core/apiService';
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

export interface OrchestratorAIResponse {
	response: string;
	sessionId: string;
	timestamp: Date;
	performance: {
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
	};
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

export interface OrchestratorRequest {
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

export class OrchestratorAIService {
	private sessionId: string;
	private context: FinancialContext;
	private requestCount: number = 0;
	private lastRequestTime: Date | null = null;
	private isHealthy: boolean = true;
	private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

	constructor(context: FinancialContext, sessionId?: string) {
		this.context = context;
		this.sessionId = sessionId || this.generateSessionId();
		this.startHealthMonitoring();
	}

	/**
	 * Generate a unique session ID
	 */
	private generateSessionId(): string {
		return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Get AI response using the unified orchestrator
	 */
	async getResponse(
		message: string,
		options?: OrchestratorRequest['options']
	): Promise<OrchestratorAIResponse> {
		try {
			// Check if service is healthy
			if (!this.isHealthy) {
				console.warn(
					'[OrchestratorAIService] Service is unhealthy, using fallback'
				);
				return this.getFallbackResponse(message);
			}

			// Rate limiting check
			if (this.isRateLimited()) {
				console.warn('[OrchestratorAIService] Rate limited, using fallback');
				return this.getFallbackResponse(message);
			}

			this.requestCount++;
			this.lastRequestTime = new Date();


			const requestPayload: OrchestratorRequest = {
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

				endpoint: '/api/orchestrator/chat',
				messageLength: message.trim().length,
				hasOptions: !!options,
			});

			const startTime = Date.now();
			const response = await ApiService.post<OrchestratorAIResponse>(
				'/api/orchestrator/chat',
				requestPayload
			);
			const endTime = Date.now();

				success: response.success,
				hasData: !!response.data,
				responseLength: response.data?.response?.length || 0,
				status: response.success ? 'success' : 'error',
				performance: response.data?.performance,
				clientLatency: endTime - startTime,
				error: response.error,
			});

			if (response.success && response.data) {
				// Validate that we have a proper response message
				if (
					!response.data.response ||
					typeof response.data.response !== 'string' ||
					!response.data.response.trim()
				) {
					console.warn(
						'[OrchestratorAIService] Empty or invalid response message, using fallback'
					);
					return this.getFallbackResponse(message);
				}

				const result = {
					...response.data,
					usage: response.usage,
				};

				// Log performance metrics
				this.logPerformanceMetrics(result, endTime - startTime);

					responsePreview: result.response.substring(0, 100) + '...',
					sessionId: result.sessionId,
					timestamp: result.timestamp,
					performance: result.performance,
				});

				return result;
			}

			// If the response is not successful, fall back to fallback response
			console.log(
				'[OrchestratorAIService] API response not successful, using fallback'
			);
			this.isHealthy = false; // Mark as unhealthy on failure
			return this.getFallbackResponse(message);
		} catch (error) {
			console.error('[OrchestratorAIService] Error getting response:', error);

			// Mark as unhealthy on error
			this.isHealthy = false;

			// Return fallback response on error
			return this.getFallbackResponse(message);
		}
	}

	/**
	 * Get fallback response when AI service fails
	 */
	private getFallbackResponse(message: string): OrchestratorAIResponse {
		const fallbackResponse =
			"I'm having trouble processing your request right now. Please try again in a moment, or rephrase your question.";

		return {
			response: fallbackResponse,
			sessionId: this.sessionId,
			timestamp: new Date(),
			performance: {
				totalLatency: 0,
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
			},
			evidence: [],
			metadata: {
				requestId: `fallback_${Date.now()}`,
				userId: '',
				processedAt: new Date(),
				version: '1.0.0',
			},
		};
	}

	/**
	 * Log performance metrics for monitoring
	 */
	private logPerformanceMetrics(
		response: OrchestratorAIResponse,
		clientLatency: number
	): void {
		const { performance, metadata } = response;

			requestId: metadata.requestId,
			totalLatency: performance.totalLatency,
			clientLatency,
			cacheHit: performance.cacheHit,
			modelUsed: performance.modelUsed,
			tokensUsed: performance.tokensUsed,
			toolsExecuted: performance.parallelTools.executed.length,
			toolSuccessRate:
				performance.parallelTools.successCount /
					(performance.parallelTools.successCount +
						performance.parallelTools.failureCount) || 0,
			phases: performance.phases,
		});

		// Log individual tool timings
		Object.entries(performance.parallelTools.timings).forEach(
			([toolName, timing]) => {
				console.log(
					`[OrchestratorAIService] Tool ${toolName} timing:`,
					timing + 'ms'
				);
			}
		);

		// Log phase breakdown
		Object.entries(performance.phases).forEach(([phase, timing]) => {
			console.log(
				`[OrchestratorAIService] Phase ${phase} timing:`,
				timing + 'ms'
			);
		});
	}

	/**
	 * Get orchestrator health status
	 */
	async getHealthStatus(): Promise<{
		status: string;
		timestamp: Date;
		version: string;
		services: Record<string, string>;
	}> {
		try {
			const response = await ApiService.get('/api/orchestrator/health');
			return response.data as {
				status: string;
				timestamp: Date;
				version: string;
				services: Record<string, string>;
			};
		} catch (error) {
			console.error('[OrchestratorAIService] Health check failed:', error);
			return {
				status: 'unhealthy',
				timestamp: new Date(),
				version: '1.0.0',
				services: {
					orchestrator: 'down',
					cache: 'unknown',
					tools: 'unknown',
					llm: 'unknown',
				},
			};
		}
	}

	/**
	 * Get orchestrator performance metrics
	 */
	async getMetrics(): Promise<{
		performance: {
			medianLatency: number;
			averageLatency: number;
			p95Latency: number;
			cacheHitRate: number;
			toolExecutionTime: {
				average: number;
				parallel: boolean;
			};
		};
		usage: {
			totalRequests: number;
			successfulRequests: number;
			failedRequests: number;
			requestsByIntent: Record<string, number>;
		};
		tools: {
			mostUsed: { name: string; count: number }[];
			successRates: Record<string, number>;
			averageExecutionTimes: Record<string, number>;
		};
	}> {
		try {
			const response = await ApiService.get('/api/orchestrator/metrics');
			return (response.data as any).metrics;
		} catch (error) {
			console.error('[OrchestratorAIService] Metrics fetch failed:', error);
			throw error;
		}
	}

	/**
	 * Update the financial context
	 */
	updateContext(newContext: FinancialContext): void {
		this.context = newContext;
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
		this.requestCount = 0;
		this.lastRequestTime = null;
	}

	/**
	 * Check if service is rate limited
	 */
	private isRateLimited(): boolean {
		if (!this.lastRequestTime) return false;

		const now = new Date();
		const timeDiff = now.getTime() - this.lastRequestTime.getTime();
		const oneMinute = 60 * 1000;

		// Allow max 10 requests per minute
		return this.requestCount > 10 && timeDiff < oneMinute;
	}

	/**
	 * Start health monitoring
	 */
	private startHealthMonitoring(): void {
		// Check health every 5 minutes
		this.healthCheckInterval = setInterval(async () => {
			try {
				const health = await this.getHealthStatus();
				this.isHealthy = health.status === 'healthy';
					status: health.status,
					isHealthy: this.isHealthy,
				});
			} catch (error) {
				console.warn('[OrchestratorAIService] Health check failed:', error);
				this.isHealthy = false;
			}
		}, 5 * 60 * 1000); // 5 minutes
	}

	/**
	 * Stop health monitoring
	 */
	stopHealthMonitoring(): void {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
			this.healthCheckInterval = null;
		}
	}

	/**
	 * Get service statistics
	 */
	getServiceStats(): {
		requestCount: number;
		lastRequestTime: Date | null;
		isHealthy: boolean;
		sessionId: string;
	} {
		return {
			requestCount: this.requestCount,
			lastRequestTime: this.lastRequestTime,
			isHealthy: this.isHealthy,
			sessionId: this.sessionId,
		};
	}

	/**
	 * Reset service state
	 */
	reset(): void {
		this.requestCount = 0;
		this.lastRequestTime = null;
		this.isHealthy = true;
		this.createNewSession();
	}

	/**
	 * Cleanup resources
	 */
	destroy(): void {
		this.stopHealthMonitoring();
	}
}
