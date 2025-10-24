// Simple QA Lane - Fast, cheap answers for general questions
// Runs before heavy routing to provide immediate responses

import { ChatResponse } from './responseSchema';
import { microSolve, isSimpleQuestion } from './microSolvers';
import { simpleKnowledgeBase } from './simpleKnowledgeBase';
import { ChatContext } from '../../services/feature/chatController';
import { QuickAction } from './actionTypes';
import { TimedLRU } from './utils/timedLRU';
import { scoreUsefulness } from './usefulness';
import {
	simpleQALogger,
	SimpleQAMetrics,
	SimpleQALogger,
} from './simpleQALogging';

export interface SimpleQAResult {
	response: ChatResponse;
	usedMicroSolver: boolean;
	usedKnowledgeBase: boolean;
	usedMiniModel: boolean;
	timeToFirstToken: number;
	totalTokens: number;
}

export class SimpleQALane {
	private miniModelCache = new TimedLRU<string, ChatResponse>(100);
	private static readonly SIMPLE_QA_MIN_SCORE = 3; // Minimum usefulness score to return
	private lastPatternKey: string | null = null;
	private lastPatternTimestamp: number | null = null;
	private topicHistory: { topic: string; timestamp: number }[] = [];

	// Performance monitoring
	private performanceMetrics = {
		totalRequests: 0,
		successfulRequests: 0,
		failedRequests: 0,
		averageResponseTime: 0,
		lastAlertTime: 0,
		consecutiveFailures: 0,
		responseTimeHistory: [] as number[],
		errorHistory: [] as {
			error: string;
			timestamp: number;
			question: string;
		}[],
		sourceBreakdown: {
			microSolver: 0,
			knowledgeBase: 0,
			miniModel: 0,
		},
		usefulnessScores: [] as number[],
	};

	/**
	 * Check if we should avoid repeating the same pattern
	 */
	private shouldAvoidRepeat(userText: string, patternKey?: string): boolean {
		const frustrated = /\b(already|you told me|again|i have|i already)\b/i.test(
			userText
		);

		// Check if we recently used the same pattern (within last 2 minutes)
		const recentPattern = !!patternKey && this.lastPatternKey === patternKey;
		const recentlyUsed =
			!!this.lastPatternKey &&
			Date.now() - (this.lastPatternTimestamp || 0) < 2 * 60 * 1000; // 2 minutes

		// Avoid repeat if: frustrated with same pattern, or recent pattern usage
		return (frustrated && recentPattern) || (recentPattern && recentlyUsed);
	}

	/**
	 * Check if a topic was discussed recently
	 */
	private wasTopicRecent(topic: string, turns: number = 2): boolean {
		const recentTopics = this.topicHistory
			.filter((h) => Date.now() - h.timestamp < 10 * 60 * 1000) // Last 10 minutes
			.slice(-turns)
			.map((h) => h.topic);
		return recentTopics.includes(topic);
	}

	/**
	 * Record a topic for history tracking
	 */
	private recordTopic(topic: string): void {
		this.topicHistory.push({ topic, timestamp: Date.now() });
		// Keep only last 10 topics
		if (this.topicHistory.length > 10) {
			this.topicHistory = this.topicHistory.slice(-10);
		}
	}

	/**
	 * Validate inputs for the Simple QA lane
	 */
	private validateInputs(question: string, context: ChatContext): boolean {
		// Validate question
		if (
			!question ||
			typeof question !== 'string' ||
			question.trim().length === 0
		) {
			console.warn('🔍 [SimpleQA] Invalid question provided');
			return false;
		}

		// Sanitize question (remove potentially harmful content)
		const sanitizedQuestion = question.trim().substring(0, 1000); // Limit length
		if (sanitizedQuestion !== question) {
			console.warn('🔍 [SimpleQA] Question truncated due to length');
		}

		// Validate context
		if (!context || typeof context !== 'object') {
			console.warn('🔍 [SimpleQA] Invalid context provided');
			return false;
		}

		// Check for suspicious patterns (basic security)
		const suspiciousPatterns = [
			/<script/i,
			/javascript:/i,
			/data:/i,
			/eval\(/i,
			/function\s*\(/i,
		];

		if (suspiciousPatterns.some((pattern) => pattern.test(question))) {
			console.warn('🔍 [SimpleQA] Suspicious content detected in question');
			return false;
		}

		return true;
	}

	/**
	 * Try to answer a question using the Simple QA lane
	 */
	async tryAnswer(
		question: string,
		context: ChatContext,
		detectedIntent?: string
	): Promise<SimpleQAResult | null> {
		const startTime = Date.now();
		this.performanceMetrics.totalRequests++;

		// Validate inputs
		if (!this.validateInputs(question, context)) {
			console.warn('🔍 [SimpleQA] Invalid inputs provided');
			this.trackFailure('validation_failed');
			return null;
		}

		// Check if this is a simple question
		if (!isSimpleQuestion(question, detectedIntent)) {
			return null;
		}

		console.log('🔍 [SimpleQA] Attempting simple answer for:', question);

		// Step 1: Try micro-solvers first (fastest)
		const microResult = microSolve(question, context);
		if (microResult) {
			// Check repetition guard
			if (this.shouldAvoidRepeat(question, microResult.matchedPattern)) {
				console.log(
					'🔍 [SimpleQA] Avoiding repeat of pattern:',
					microResult.matchedPattern
				);
				return null;
			}

			// Check if this is the generic investing starter and we recently discussed HYSA
			if (
				microResult.matchedPattern === 'investing_starter' &&
				this.wasTopicRecent('HYSA', 2)
			) {
				console.log(
					'🔍 [SimpleQA] Suppressing generic investing card after HYSA discussion'
				);
				return null; // Force escalate to skill/agent
			}

			const response = this.formatSimpleAnswer(
				microResult.answer,
				microResult.actions || [],
				microResult.confidence
			);
			const result = {
				response,
				usedMicroSolver: true,
				usedKnowledgeBase: false,
				usedMiniModel: false,
				timeToFirstToken: Date.now() - startTime,
				totalTokens: this.estimateTokens(microResult.answer),
			};

			// Update last pattern key and timestamp
			this.lastPatternKey = microResult.matchedPattern || null;
			this.lastPatternTimestamp = Date.now();

			// Record topic for history tracking
			if (microResult.matchedPattern?.includes('HYSA')) {
				this.recordTopic('HYSA');
			}

			// Log metrics
			this.logSimpleQAMetrics(question, result, 'microSolver');

			// Gate by usefulness score
			const scored = scoreUsefulness(result.response, question);
			this.trackUsefulnessScore(scored);
			if (scored < SimpleQALane.SIMPLE_QA_MIN_SCORE) {
				console.log(
					'🔍 [SimpleQA] Micro-solver result too weak, score:',
					scored
				);
				this.trackFailure('low_usefulness_score', question);
				return null;
			}

			// Track success
			this.trackSuccess(result.timeToFirstToken, 'microSolver');
			return result;
		}

		// Step 2: Try knowledge base (fast)
		const kbResults = await simpleKnowledgeBase.search(question, {
			topK: 3,
			minScore: 0.65,
		});
		if (kbResults.length > 0) {
			const bestMatch = kbResults[0];
			const patternKey = bestMatch.item.q; // Use question as pattern key for KB

			// Check repetition guard
			if (this.shouldAvoidRepeat(question, patternKey)) {
				console.log('🔍 [SimpleQA] Avoiding repeat of KB item:', patternKey);
				return null;
			}

			const response = this.formatSimpleAnswer(
				bestMatch.item.a,
				(bestMatch.item.actions || []).map((a) => ({
					...a,
					action: a.action as any,
				})),
				0.85 // High confidence for knowledge base matches
			);
			const result = {
				response,
				usedMicroSolver: false,
				usedKnowledgeBase: true,
				usedMiniModel: false,
				timeToFirstToken: Date.now() - startTime,
				totalTokens: this.estimateTokens(bestMatch.item.a),
			};

			// Update last pattern key and timestamp
			this.lastPatternKey = patternKey;
			this.lastPatternTimestamp = Date.now();

			// Log metrics
			this.logSimpleQAMetrics(question, result, 'knowledgeBase');

			// Gate by usefulness score
			const scored = scoreUsefulness(result.response, question);
			this.trackUsefulnessScore(scored);
			if (scored < SimpleQALane.SIMPLE_QA_MIN_SCORE) {
				console.log(
					'🔍 [SimpleQA] Knowledge base result too weak, score:',
					scored
				);
				this.trackFailure('low_usefulness_score', question);
				return null;
			}

			// Track success
			this.trackSuccess(result.timeToFirstToken, 'knowledgeBase');
			return result;
		}

		// Step 3: Try mini model with knowledge base context (cheap)
		try {
			const kbContext = await this.buildKnowledgeContext(question);
			const miniResponse = await this.tryMiniModel(
				question,
				kbContext,
				context
			);
			if (miniResponse) {
				const result = {
					response: miniResponse,
					usedMicroSolver: false,
					usedKnowledgeBase: kbContext.length > 0,
					usedMiniModel: true,
					timeToFirstToken: Date.now() - startTime,
					totalTokens: this.estimateTokens(miniResponse.message),
				};

				// Log metrics
				this.logSimpleQAMetrics(question, result, 'miniModel');

				// Gate by usefulness score
				const scored = scoreUsefulness(result.response, question);
				this.trackUsefulnessScore(scored);
				if (scored < SimpleQALane.SIMPLE_QA_MIN_SCORE) {
					console.log(
						'🔍 [SimpleQA] Mini model result too weak, score:',
						scored
					);
					this.trackFailure('low_usefulness_score', question);
					return null;
				}

				// Track success
				this.trackSuccess(result.timeToFirstToken, 'miniModel');
				return result;
			}
		} catch (error) {
			console.warn('🔍 [SimpleQA] Mini model step failed:', {
				error: error instanceof Error ? error.message : String(error),
				question: question.substring(0, 100) + '...',
				timestamp: new Date().toISOString(),
			});
		}

		// No simple answer found
		this.trackFailure('no_answer_found', question);
		return null;
	}

	/**
	 * Track successful request
	 */
	private trackSuccess(
		responseTime: number,
		source?: 'microSolver' | 'knowledgeBase' | 'miniModel'
	): void {
		this.performanceMetrics.successfulRequests++;
		this.performanceMetrics.consecutiveFailures = 0;

		// Update response time history
		this.performanceMetrics.responseTimeHistory.push(responseTime);
		if (this.performanceMetrics.responseTimeHistory.length > 100) {
			this.performanceMetrics.responseTimeHistory =
				this.performanceMetrics.responseTimeHistory.slice(-100);
		}

		// Update average response time
		const totalSuccessful = this.performanceMetrics.successfulRequests;
		this.performanceMetrics.averageResponseTime =
			(this.performanceMetrics.averageResponseTime * (totalSuccessful - 1) +
				responseTime) /
			totalSuccessful;

		// Track source breakdown
		if (source) {
			this.performanceMetrics.sourceBreakdown[source]++;
		}
	}

	/**
	 * Track failed request
	 */
	private trackFailure(reason: string, question?: string): void {
		this.performanceMetrics.failedRequests++;
		this.performanceMetrics.consecutiveFailures++;

		// Track error history
		this.performanceMetrics.errorHistory.push({
			error: reason,
			timestamp: Date.now(),
			question: question ? question.substring(0, 100) : 'unknown',
		});

		// Keep only last 50 errors
		if (this.performanceMetrics.errorHistory.length > 50) {
			this.performanceMetrics.errorHistory =
				this.performanceMetrics.errorHistory.slice(-50);
		}

		// Check for performance alerts
		this.checkPerformanceAlerts(reason);
	}

	/**
	 * Check for performance issues and alert if necessary
	 */
	private checkPerformanceAlerts(reason: string): void {
		const now = Date.now();
		const timeSinceLastAlert = now - this.performanceMetrics.lastAlertTime;

		// Alert if too many consecutive failures
		if (
			this.performanceMetrics.consecutiveFailures >= 5 &&
			timeSinceLastAlert > 5 * 60 * 1000
		) {
			console.error(
				'🚨 [SimpleQA] Performance Alert: 5 consecutive failures detected',
				{
					reason,
					consecutiveFailures: this.performanceMetrics.consecutiveFailures,
					totalRequests: this.performanceMetrics.totalRequests,
					successRate: this.getSuccessRate(),
				}
			);
			this.performanceMetrics.lastAlertTime = now;
		}

		// Alert if success rate drops below 50%
		const successRate = this.getSuccessRate();
		if (
			successRate < 0.5 &&
			this.performanceMetrics.totalRequests > 10 &&
			timeSinceLastAlert > 10 * 60 * 1000
		) {
			console.error('🚨 [SimpleQA] Performance Alert: Success rate below 50%', {
				successRate,
				totalRequests: this.performanceMetrics.totalRequests,
				failedRequests: this.performanceMetrics.failedRequests,
			});
			this.performanceMetrics.lastAlertTime = now;
		}
	}

	/**
	 * Get current success rate
	 */
	private getSuccessRate(): number {
		if (this.performanceMetrics.totalRequests === 0) return 1;
		return (
			this.performanceMetrics.successfulRequests /
			this.performanceMetrics.totalRequests
		);
	}

	/**
	 * Track usefulness score for analytics
	 */
	private trackUsefulnessScore(score: number): void {
		this.performanceMetrics.usefulnessScores.push(score);
		if (this.performanceMetrics.usefulnessScores.length > 100) {
			this.performanceMetrics.usefulnessScores =
				this.performanceMetrics.usefulnessScores.slice(-100);
		}
	}

	/**
	 * Get detailed analytics
	 */
	getDetailedAnalytics() {
		const responseTimes = this.performanceMetrics.responseTimeHistory;
		const usefulnessScores = this.performanceMetrics.usefulnessScores;

		return {
			...this.performanceMetrics,
			successRate: this.getSuccessRate(),
			cacheHitRate: this.getCacheHitRate(),
			responseTimeStats: {
				average:
					responseTimes.length > 0
						? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
						: 0,
				min: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
				max: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
				p95: this.calculatePercentile(responseTimes, 95),
				p99: this.calculatePercentile(responseTimes, 99),
			},
			usefulnessStats: {
				average:
					usefulnessScores.length > 0
						? usefulnessScores.reduce((a, b) => a + b, 0) /
						  usefulnessScores.length
						: 0,
				min: usefulnessScores.length > 0 ? Math.min(...usefulnessScores) : 0,
				max: usefulnessScores.length > 0 ? Math.max(...usefulnessScores) : 0,
			},
			recentErrors: this.performanceMetrics.errorHistory.slice(-10),
		};
	}

	/**
	 * Calculate percentile for response times
	 */
	private calculatePercentile(values: number[], percentile: number): number {
		if (values.length === 0) return 0;
		const sorted = [...values].sort((a, b) => a - b);
		const index = Math.ceil((percentile / 100) * sorted.length) - 1;
		return sorted[Math.max(0, index)];
	}

	/**
	 * Format a simple answer into a ChatResponse
	 */
	private formatSimpleAnswer(
		answer: string,
		actions: QuickAction[] = [],
		confidence: number = 0.8
	): ChatResponse {
		return {
			message: answer,
			actions: actions.map((action) => ({
				label: action.label,
				action: action.action as any,
				params: action.params,
			})),
			sources: [{ kind: 'cache' }],
			cost: { model: 'mini', estTokens: this.estimateTokens(answer) },
			confidence,
		};
	}

	/**
	 * Build knowledge base context for mini model
	 */
	private async buildKnowledgeContext(question: string): Promise<string> {
		const results = await simpleKnowledgeBase.search(question, {
			topK: 3,
			minScore: 0.5,
		});
		if (results.length === 0) return '';

		return results
			.map((result) => `Q: ${result.item.q}\nA: ${result.item.a}`)
			.join('\n\n');
	}

	/**
	 * Try mini model with knowledge base context
	 */
	private async tryMiniModel(
		question: string,
		kbContext: string,
		context: ChatContext
	): Promise<ChatResponse | null> {
		try {
			// Check cache first with locale-aware key
			const cacheKey = `${context?.locale ?? 'en-US'}|${question}|${kbContext}`;
			const hit = this.miniModelCache.get(cacheKey);
			if (hit) return hit;

			// Build prompt for mini model
			const prompt = this.buildMiniPrompt(question, kbContext, context);

			// Call mini model (this would integrate with your existing AI service)
			const response = await this.callMiniModel(prompt);

			// Cache the response with TTL
			this.miniModelCache.set(cacheKey, response, 6 * 60 * 60 * 1000); // 6 hours

			return response;
		} catch (error) {
			console.warn('🔍 [SimpleQA] Mini model failed:', error);
			return null;
		}
	}

	/**
	 * Build prompt for mini model
	 */
	private buildMiniPrompt(
		question: string,
		kbContext: string,
		context: ChatContext
	): string {
		const parts = [
			'You are a concise financial helper for consumers.',
			"Answer directly in 2-4 sentences. If it's app-related, include 1 short step.",
			'If user-specific data is required but missing, give a generic rule-of-thumb + 1 suggested next step.',
			'Be friendly and practical. Avoid jargon unless explaining it.',
			'',
			'Context:',
			kbContext || 'No specific context available.',
			'',
			`User: ${question}`,
		];

		return parts.join('\n');
	}

	/**
	 * Call mini model using the existing AI service infrastructure
	 */
	private async callMiniModel(prompt: string): Promise<ChatResponse> {
		try {
			// Import the tiered AI service for mini model calls
			const { TieredAIService } = await import(
				'../../services/feature/tieredAIService'
			);

			// Create a minimal context for the mini model
			const context = {
				budgets: [],
				goals: [],
				transactions: [],
				userProfile: {
					monthlyIncome: 0,
					financialGoal: 'general_advice',
					riskProfile: 'moderate',
				},
			};

			// Create a tiered AI service instance for mini model calls
			const aiService = new TieredAIService(context);

			// Get response using the tiered service (it will route to mini model for simple queries)
			const response = await aiService.getResponse(prompt);

			// Convert the tiered response to ChatResponse format
			return {
				message: response.response,
				actions: [
					{
						label: 'Create Emergency Fund Goal',
						action: 'OPEN_GOAL_FORM' as any,
						params: { type: 'emergency_fund' },
					},
					{
						label: 'Open Goals',
						action: 'OPEN_GOAL_WIZARD' as any,
					},
				],
				sources: [{ kind: 'gpt', note: 'mini_model' }],
				cost: {
					model: 'mini',
					estTokens:
						response.usage?.estimatedTokens ||
						Math.ceil(response.response.length / 4),
				},
				confidence: response.confidence,
			};
		} catch (error) {
			console.warn('🔍 [SimpleQA] Mini model call failed, using fallback:', {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				timestamp: new Date().toISOString(),
			});

			// Fallback to a simple, helpful response
			const fallbackMsg = `I can help with financial questions! Here's a general approach:
1) Build an emergency fund (3-6 months of expenses)
2) Pay off high-interest debt first
3) Save for retirement consistently
4) Invest in low-cost index funds for long-term growth

What specific financial topic would you like help with?`;

			return {
				message: fallbackMsg,
				actions: [
					{
						label: 'Create Emergency Fund Goal',
						action: 'OPEN_GOAL_FORM' as any,
						params: { type: 'emergency_fund' },
					},
					{
						label: 'Open Goals',
						action: 'OPEN_GOAL_WIZARD' as any,
					},
				],
				sources: [{ kind: 'cache', note: 'fallback_response' }],
				cost: { model: 'mini', estTokens: Math.ceil(fallbackMsg.length / 4) },
				confidence: 0.6,
			};
		}
	}

	/**
	 * Estimate token count for a string
	 */
	private estimateTokens(text: string): number {
		// Rough estimation: 1 token ≈ 4 characters
		return Math.ceil(text.length / 4);
	}

	/**
	 * Get graceful fallback for answerability failures
	 */
	async getGracefulFallback(
		question: string,
		context: ChatContext,
		missingData: string[]
	): Promise<ChatResponse> {
		// Try to answer generically first
		const genericAnswer = await this.tryAnswer(question, context);
		if (genericAnswer) {
			// Add data collection actions
			const actions = this.getDataCollectionActions(missingData);
			return {
				...genericAnswer.response,
				actions: [
					...(genericAnswer.response.actions || []),
					...actions.map((a) => ({ ...a, action: a.action as any })),
				],
				message: `${
					genericAnswer.response.message
				}\n\nTo personalize this for you, I'll need: ${missingData.join(
					', '
				)}.`,
			};
		}

		// Fallback to helpful response
		return {
			message: `I can help with that! Here's some general guidance, and I'll show you how to personalize it.`,
			actions: this.getDataCollectionActions(missingData).map((a) => ({
				...a,
				action: a.action as any,
			})),
			sources: [{ kind: 'cache' }],
			cost: { model: 'mini', estTokens: 30 },
			confidence: 0.6,
		};
	}

	/**
	 * Get data collection actions based on missing data
	 */
	private getDataCollectionActions(
		missingData: string[]
	): { label: string; action: string }[] {
		const actions: { label: string; action: string }[] = [];

		if (missingData.some((m) => m.includes('income'))) {
			actions.push({ label: 'Add monthly income', action: 'OPEN_INCOME_FORM' });
		}
		if (
			missingData.some((m) => m.includes('bills') || m.includes('recurring'))
		) {
			actions.push({ label: 'Add fixed bills', action: 'OPEN_RECURRING_FORM' });
		}
		if (missingData.some((m) => m.includes('goal'))) {
			actions.push({ label: 'Create a goal', action: 'OPEN_GOAL_WIZARD' });
		}
		if (missingData.some((m) => m.includes('budget'))) {
			actions.push({ label: 'Create a budget', action: 'OPEN_BUDGET_FORM' });
		}
		if (missingData.some((m) => m.includes('transaction'))) {
			actions.push({
				label: 'Add transactions',
				action: 'OPEN_TRANSACTION_FORM',
			});
		}

		return actions;
	}

	/**
	 * Check if a question should use the Simple QA lane
	 */
	shouldUseSimpleQA(question: string, detectedIntent?: string): boolean {
		return isSimpleQuestion(question, detectedIntent);
	}

	/**
	 * Log Simple QA metrics
	 */
	private logSimpleQAMetrics(
		question: string,
		result: SimpleQAResult,
		responseSource: 'microSolver' | 'knowledgeBase' | 'miniModel'
	): void {
		const metrics: Omit<SimpleQAMetrics, 'timestamp'> = {
			tookSimpleQALane: true,
			microSolverUsed: SimpleQALogger.getMicroSolverType(question),
			hadDirectAnswer: SimpleQALogger.hadDirectAnswer(result.response.message),
			answerabilityFailedButAnsweredGenerically: false, // This would be set by caller
			timeToFirstToken: result.timeToFirstToken,
			finalTokens: result.totalTokens,
			responseSource,
			questionType: SimpleQALogger.getQuestionType(question),
		};

		simpleQALogger.logMetrics(metrics);
	}

	/**
	 * Get system stats for monitoring
	 */
	getStats() {
		return {
			cacheSize: this.miniModelCache.size,
			knowledgeBaseSize: simpleKnowledgeBase.getAll().length,
			lastUsed: Date.now(),
			analytics: simpleQALogger.getAnalytics(),
			performance: {
				...this.performanceMetrics,
				successRate: this.getSuccessRate(),
				cacheHitRate: this.getCacheHitRate(),
			},
		};
	}

	/**
	 * Get cache hit rate (placeholder - would need to track hits/misses)
	 */
	private getCacheHitRate(): number {
		// In a real implementation, you'd track cache hits vs misses
		return 0.85; // Placeholder value
	}

	/**
	 * Warm up the cache with common questions
	 */
	async warmCache(): Promise<void> {
		const commonQuestions = [
			'What is the 50/30/20 rule?',
			'How much should I save for retirement?',
			'What is an emergency fund?',
			'How do I create a budget?',
			'What is compound interest?',
		];

		console.log('🔍 [SimpleQA] Warming cache with common questions...');

		for (const question of commonQuestions) {
			try {
				// Create a minimal context for warming
				const context = {
					budgets: [],
					goals: [],
					transactions: [],
					recurringExpenses: [],
					locale: 'en-US',
					currency: 'USD',
				};

				await this.tryAnswer(question, context, 'GENERAL_QA');
			} catch (error) {
				console.warn(
					'🔍 [SimpleQA] Cache warming failed for question:',
					question,
					error
				);
			}
		}

		console.log('🔍 [SimpleQA] Cache warming completed');
	}

	/**
	 * Clear cache and reset performance metrics
	 */
	reset(): void {
		this.miniModelCache.clear();
		this.performanceMetrics = {
			totalRequests: 0,
			successfulRequests: 0,
			failedRequests: 0,
			averageResponseTime: 0,
			lastAlertTime: 0,
			consecutiveFailures: 0,
			responseTimeHistory: [],
			errorHistory: [],
			sourceBreakdown: {
				microSolver: 0,
				knowledgeBase: 0,
				miniModel: 0,
			},
			usefulnessScores: [],
		};
		this.topicHistory = [];
		this.lastPatternKey = null;
		this.lastPatternTimestamp = null;
		console.log('🔍 [SimpleQA] Reset completed');
	}
}

// Export singleton instance
export const simpleQALane = new SimpleQALane();
