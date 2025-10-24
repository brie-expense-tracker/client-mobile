// Enhanced Chat Controller - Integrates hybrid AI orchestrator for 90%+ coverage
// Replaces the existing chat controller with the new skill-based system

import { ChatResponse } from '../../services/assistant/responseSchema';
import { ChatContext } from './chatController';
import {
	hybridAIOrchestrator,
	ProcessingResult,
} from '../../services/assistant/hybridAIOrchestrator';
import { logChat } from './analyticsService';
import { nanoid } from 'nanoid';
import {
	EnhancedStreamingService,
	StreamingCallbacks,
} from './enhancedStreamingService';

export interface EnhancedChatControllerConfig {
	enableHybridAI: boolean;
	enableLegacyFallback: boolean;
	enableAnalytics: boolean;
	enableCaching: boolean;
	enableStreaming: boolean;
	maxRetries: number;
	timeoutMs: number;
	confidenceThreshold: number;
	streamingTimeoutMs: number;
}

export interface PerformanceMetrics {
	totalRequests: number;
	successfulRequests: number;
	failedRequests: number;
	averageResponseTime: number;
	streamingRequests: number;
	fallbackRequests: number;
	lastError?: string;
	lastErrorTime?: Date;
}

export class EnhancedChatController {
	private config: EnhancedChatControllerConfig;
	private sessionId: string;
	private streamingService: EnhancedStreamingService;
	private performanceMetrics: PerformanceMetrics = {
		totalRequests: 0,
		successfulRequests: 0,
		failedRequests: 0,
		averageResponseTime: 0,
		streamingRequests: 0,
		fallbackRequests: 0,
	};
	private responseTimes: number[] = [];

	constructor(config?: Partial<EnhancedChatControllerConfig>) {
		this.config = {
			enableHybridAI: true,
			enableLegacyFallback: true,
			enableAnalytics: true,
			enableCaching: true,
			enableStreaming: true,
			maxRetries: 2,
			timeoutMs: 5000,
			confidenceThreshold: 0.6,
			streamingTimeoutMs: 30000,
			...config,
		};
		this.sessionId = nanoid();
		this.streamingService = new EnhancedStreamingService(this.sessionId);
	}

	/**
	 * Main entry point: handle user message with hybrid AI system
	 */
	async handleUserMessage(
		utterance: string,
		context: ChatContext
	): Promise<ChatResponse> {
		const messageId = nanoid();
		const startTime = Date.now();

		// Update performance metrics
		this.performanceMetrics.totalRequests++;

		try {

			// Validate input
			if (!utterance?.trim()) {
				this.performanceMetrics.failedRequests++;
				this.performanceMetrics.lastError = 'Empty message provided';
				this.performanceMetrics.lastErrorTime = new Date();
				return this.createErrorResponse('Please provide a message to process.');
			}

			// Check if hybrid AI is enabled
			if (this.config.enableHybridAI) {
				try {
					const result = await this.processWithHybridAI(
						utterance,
						context,
						messageId
					);

					// Update performance metrics
					this.performanceMetrics.successfulRequests++;
					this.updateResponseTime(Date.now() - startTime);

					// Log analytics if enabled
					if (this.config.enableAnalytics) {
						this.logAnalytics(utterance, result, startTime, context);
					}

					return result.response;
				} catch (error) {
					console.error('[EnhancedChatController] Hybrid AI error:', error);
					this.performanceMetrics.failedRequests++;
					this.performanceMetrics.lastError =
						error instanceof Error ? error.message : String(error);
					this.performanceMetrics.lastErrorTime = new Date();

					// Fall back to legacy system if enabled
					if (this.config.enableLegacyFallback) {
						this.performanceMetrics.fallbackRequests++;
						return this.processWithLegacyFallback(utterance, context, error);
					}

					throw error;
				}
			} else {
				// Use legacy fallback directly
				this.performanceMetrics.fallbackRequests++;
				return this.processWithLegacyFallback(utterance, context);
			}
		} catch (error) {
			console.error('[EnhancedChatController] Processing error:', error);
			this.performanceMetrics.failedRequests++;
			this.performanceMetrics.lastError =
				error instanceof Error ? error.message : String(error);
			this.performanceMetrics.lastErrorTime = new Date();
			return this.createErrorResponse(
				'Sorry, I encountered an error processing your request.'
			);
		}
	}

	/**
	 * Process with hybrid AI orchestrator
	 */
	private async processWithHybridAI(
		utterance: string,
		context: ChatContext,
		messageId: string
	): Promise<ProcessingResult> {
		const result = await hybridAIOrchestrator.processUserMessage(
			utterance,
			context,
			this.sessionId,
			messageId
		);

		// Log the processing result
			skillId: result.metadata.skillId,
			confidence: result.metadata.confidence,
			reason: result.metadata.reason,
			latency: result.performance.latency,
			wasGrounded: result.metadata.wasGrounded,
		});

		return result;
	}

	/**
	 * Fallback to legacy system
	 */
	private async processWithLegacyFallback(
		utterance: string,
		context: ChatContext,
		error?: any
	): Promise<ChatResponse> {

		// Simple fallback response based on context
		const hasBudgets = !!context.budgets?.length;
		const hasGoals = !!context.goals?.length;
		const hasTransactions = !!context.transactions?.length;

		let message = "I'm here to help with your finances! ";
		let actions: {
			label: string;
			action:
				| 'OPEN_BUDGETS'
				| 'CREATE_RULE'
				| 'ADJUST_LIMIT'
				| 'VIEW_RECURRING'
				| 'CONNECT_ACCOUNT'
				| 'PICK_TIME_WINDOW'
				| 'MARK_PAID'
				| 'SET_LIMIT'
				| 'OPEN_INCOME_FORM'
				| 'OPEN_RECURRING_FORM'
				| 'OPEN_GOAL_WIZARD'
				| 'OPEN_BUDGET_WIZARD'
				| 'OPEN_TRANSACTION_FORM'
				| 'OPEN_SETUP_WIZARD'
				| 'OPEN_PLAN_TUNER'
				| 'MAKE_BUDGETS_FROM_PLAN'
				| 'ADJUST_GOAL_PRIORITY'
				| 'SETUP_AUTO_TRANSFER'
				| 'ALLOCATE_REMAINING';
			params?: any;
		}[] = [];

		if (!hasBudgets && !hasGoals && !hasTransactions) {
			message +=
				"Let's get started by setting up your first budget or savings goal.";
			actions = [
				{ label: 'Create Budget', action: 'OPEN_BUDGET_WIZARD' },
				{ label: 'Set Goal', action: 'OPEN_GOAL_WIZARD' },
				{ label: 'Learn More', action: 'OPEN_SETUP_WIZARD' },
			];
		} else if (hasBudgets) {
			message +=
				'I can help you check your budget status, track spending, or set up new goals.';
			actions = [
				{ label: 'Check Budgets', action: 'OPEN_BUDGETS' },
				{ label: 'Spending Analysis', action: 'OPEN_PLAN_TUNER' },
				{ label: 'Set Goal', action: 'OPEN_GOAL_WIZARD' },
			];
		} else if (hasGoals) {
			message +=
				'I can help you track your goal progress, create budgets, or analyze your spending.';
			actions = [
				{ label: 'Goal Progress', action: 'OPEN_GOAL_WIZARD' },
				{ label: 'Create Budget', action: 'OPEN_BUDGET_WIZARD' },
				{ label: 'Spending Analysis', action: 'OPEN_PLAN_TUNER' },
			];
		} else {
			message +=
				'I can help you analyze your spending, create budgets, or set up savings goals.';
			actions = [
				{ label: 'Spending Analysis', action: 'OPEN_PLAN_TUNER' },
				{ label: 'Create Budget', action: 'OPEN_BUDGET_WIZARD' },
				{ label: 'Set Goal', action: 'OPEN_GOAL_WIZARD' },
			];
		}

		return {
			message,
			details: error ? `Error: ${error.message}` : undefined,
			actions,
			sources: [{ kind: 'cache', note: 'legacy_fallback' }],
			cost: { model: 'mini', estTokens: 0 },
		};
	}

	/**
	 * Log analytics for the interaction
	 */
	private logAnalytics(
		utterance: string,
		result: ProcessingResult,
		startTime: number,
		context: ChatContext
	): void {
		try {
			const responseTime = Date.now() - startTime;

			logChat({
				intent: result.metadata.skillId || 'UNKNOWN',
				usedGrounding: result.metadata.wasGrounded,
				model: result.performance.model,
				tokensIn: this.estimateInputTokens(utterance),
				tokensOut: this.estimateOutputTokens(result.response),
				hadActions: !!result.response.actions?.length,
				hadCard: !!result.response.cards?.length,
				fallback:
					result.routeDecision.type === 'FALLBACK_GUIDED' ||
					result.routeDecision.type === 'FALLBACK_UNKNOWN',
				userSatisfaction: undefined, // Will be set when user provides feedback
				responseTimeMs: responseTime,
				groundingConfidence: result.metadata.confidence,
				messageLength: utterance.length,
				hasFinancialData: !!(
					context.budgets?.length ||
					context.goals?.length ||
					context.transactions?.length
				),
			});
		} catch (error) {
			console.warn('[EnhancedChatController] Analytics logging failed:', error);
		}
	}

	/**
	 * Create error response
	 */
	private createErrorResponse(message: string): ChatResponse {
		return {
			message,
			details: 'Please try again or contact support if the issue persists.',
			actions: [
				{ label: 'Try Again', action: 'OPEN_SETUP_WIZARD' },
				{ label: 'Get Help', action: 'OPEN_SETUP_WIZARD' },
			],
			sources: [{ kind: 'cache', note: 'error' }],
			cost: { model: 'mini', estTokens: 0 },
		};
	}

	/**
	 * Estimate input tokens
	 */
	private estimateInputTokens(text: string): number {
		return Math.ceil(text.length / 4); // Rough estimate
	}

	/**
	 * Estimate output tokens
	 */
	private estimateOutputTokens(response: ChatResponse): number {
		const text = `${response.message} ${response.details || ''}`;
		return Math.ceil(text.length / 4); // Rough estimate
	}

	/**
	 * Get system health
	 */
	async getSystemHealth(): Promise<{
		overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
		coverage: number;
		performance: any;
		recommendations: string[];
	}> {
		return await hybridAIOrchestrator.getSystemHealth();
	}

	/**
	 * Get coverage analytics
	 */
	async getCoverageAnalytics(): Promise<any> {
		return await hybridAIOrchestrator.getCoverageAnalytics();
	}

	/**
	 * Run evaluation
	 */
	async runEvaluation(): Promise<any> {
		return await hybridAIOrchestrator.runEvaluation();
	}

	/**
	 * Update configuration
	 */
	updateConfig(newConfig: Partial<EnhancedChatControllerConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	/**
	 * Get current configuration
	 */
	getConfig(): EnhancedChatControllerConfig {
		return { ...this.config };
	}

	/**
	 * Handle user message with streaming support
	 */
	async handleUserMessageStreaming(
		utterance: string,
		context: ChatContext,
		callbacks: StreamingCallbacks
	): Promise<void> {
		const startTime = Date.now();

		// Update performance metrics
		this.performanceMetrics.totalRequests++;
		this.performanceMetrics.streamingRequests++;

		try {
			console.log(
				`[EnhancedChatController] Processing with streaming: "${utterance}"`
			);

			// Validate input
			if (!utterance?.trim()) {
				this.performanceMetrics.failedRequests++;
				this.performanceMetrics.lastError = 'Empty message provided';
				this.performanceMetrics.lastErrorTime = new Date();
				callbacks.onError?.('Please provide a message to process.');
				return;
			}

			// Use streaming service if enabled
			if (this.config.enableStreaming) {
				await this.streamingService.startStream(utterance, callbacks);
			} else {
				// Fall back to regular processing
				const response = await this.handleUserMessage(utterance, context);
				callbacks.onFinal?.({
					response: response.message,
					sessionId: this.sessionId,
					performance: {
						timeToFirstToken: 0,
						totalTime: Date.now() - startTime,
						cacheHit: false,
						modelUsed: 'hybrid',
						tokensUsed: 0,
					},
					evidence: [],
					metadata: {},
				});
				callbacks.onDone?.();
			}
		} catch (error) {
			console.error('[EnhancedChatController] Streaming error:', error);
			this.performanceMetrics.failedRequests++;
			this.performanceMetrics.lastError =
				error instanceof Error ? error.message : String(error);
			this.performanceMetrics.lastErrorTime = new Date();
			callbacks.onError?.(
				error instanceof Error ? error.message : 'Unknown error'
			);
		}
	}

	/**
	 * Update response time tracking
	 */
	private updateResponseTime(responseTime: number): void {
		this.responseTimes.push(responseTime);

		// Keep only last 100 response times for rolling average
		if (this.responseTimes.length > 100) {
			this.responseTimes = this.responseTimes.slice(-100);
		}

		// Calculate rolling average
		this.performanceMetrics.averageResponseTime =
			this.responseTimes.reduce((sum, time) => sum + time, 0) /
			this.responseTimes.length;
	}

	/**
	 * Get performance metrics
	 */
	getPerformanceMetrics(): PerformanceMetrics {
		return { ...this.performanceMetrics };
	}

	/**
	 * Reset performance metrics
	 */
	resetPerformanceMetrics(): void {
		this.performanceMetrics = {
			totalRequests: 0,
			successfulRequests: 0,
			failedRequests: 0,
			averageResponseTime: 0,
			streamingRequests: 0,
			fallbackRequests: 0,
		};
		this.responseTimes = [];
	}

	/**
	 * Get streaming service instance
	 */
	getStreamingService(): EnhancedStreamingService {
		return this.streamingService;
	}

	/**
	 * Stop streaming
	 */
	stopStreaming(): void {
		this.streamingService.stopStream();
	}

	/**
	 * Get system health with performance data
	 */
	async getSystemHealthWithMetrics(): Promise<{
		overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
		coverage: number;
		performance: any;
		recommendations: string[];
		metrics: PerformanceMetrics;
		streamingMetrics: any;
	}> {
		const health = await this.getSystemHealth();
		const streamingMetrics = this.streamingService.getPerformanceMetrics();

		return {
			...health,
			metrics: this.performanceMetrics,
			streamingMetrics,
		};
	}
}

// Export singleton instance
export const enhancedChatController = new EnhancedChatController();

// Main function for backward compatibility
export async function handleUserMessage(
	utterance: string,
	context: ChatContext
): Promise<ChatResponse> {
	return await enhancedChatController.handleUserMessage(utterance, context);
}
