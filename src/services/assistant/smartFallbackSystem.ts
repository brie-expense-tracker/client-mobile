// Smart Fallback System - Guided suggestions and unknown collector
// Implements intelligent fallbacks that still feel smart and helpful

import { ChatContext } from '../../services/feature/chatController';
import { ChatResponse } from './responseSchema';
import { FinancialSkillId } from './skills/comprehensiveSkillRegistry';
import { answerabilityGating } from './answerabilityGating';

// Fallback types
export type FallbackType =
	| 'GUIDED_SUGGESTIONS'
	| 'UNKNOWN_COLLECTOR'
	| 'EDUCATIONAL'
	| 'SETUP_GUIDE';

// Fallback response
export interface FallbackResponse {
	type: FallbackType;
	message: string;
	suggestions: {
		skillId: FinancialSkillId;
		title: string;
		description: string;
		action: string;
		priority: number;
	}[];
	actions: {
		label: string;
		action: string;
		params?: any;
	}[];
	reason: string;
	confidence: number;
}

// Unknown query collector
export class UnknownQueryCollector {
	private unknownQueries: {
		id: string;
		utterance: string;
		context: Partial<ChatContext>;
		timestamp: Date;
		frequency: number;
		suggestedIntents: FinancialSkillId[];
		userFeedback?: 'helpful' | 'not_helpful' | 'partially_helpful';
		resolved?: boolean;
		resolutionTimestamp?: Date;
	}[] = [];

	private maxQueries = 1000; // Limit memory usage
	private cleanupInterval: ReturnType<typeof setInterval> | null = null;

	constructor() {
		// Start cleanup interval to prevent memory leaks
		this.cleanupInterval = setInterval(() => {
			this.cleanupOldQueries();
		}, 24 * 60 * 60 * 1000); // Clean up daily
	}

	// Record an unknown query
	recordUnknownQuery(
		utterance: string,
		context: Partial<ChatContext>,
		suggestedIntents: FinancialSkillId[] = []
	): string {
		const id = `unknown_${Date.now()}_${Math.random()
			.toString(36)
			.substr(2, 9)}`;

		// Check if similar query already exists
		const existing = this.unknownQueries.find(
			(q) => this.calculateSimilarity(q.utterance, utterance) > 0.8
		);

		if (existing) {
			existing.frequency++;
			existing.suggestedIntents = [
				...new Set([...existing.suggestedIntents, ...suggestedIntents]),
			];
			return existing.id;
		}

		const entry = {
			id,
			utterance,
			context,
			timestamp: new Date(),
			frequency: 1,
			suggestedIntents,
		};

		this.unknownQueries.push(entry);

		// Clean up if we exceed max queries
		if (this.unknownQueries.length > this.maxQueries) {
			this.cleanupOldQueries();
		}

		return id;
	}

	// Provide feedback on a query resolution
	provideFeedback(
		queryId: string,
		feedback: 'helpful' | 'not_helpful' | 'partially_helpful'
	): boolean {
		const query = this.unknownQueries.find((q) => q.id === queryId);
		if (query) {
			query.userFeedback = feedback;
			return true;
		}
		return false;
	}

	// Mark a query as resolved
	markResolved(queryId: string): boolean {
		const query = this.unknownQueries.find((q) => q.id === queryId);
		if (query) {
			query.resolved = true;
			query.resolutionTimestamp = new Date();
			return true;
		}
		return false;
	}

	// Get queries that need attention (high frequency, no feedback)
	getQueriesNeedingAttention(limit: number = 10): {
		id: string;
		utterance: string;
		frequency: number;
		daysSinceFirst: number;
	}[] {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - 7); // Last 7 days

		return this.unknownQueries
			.filter(
				(q) =>
					q.frequency >= 3 &&
					!q.userFeedback &&
					!q.resolved &&
					q.timestamp >= cutoffDate
			)
			.sort((a, b) => b.frequency - a.frequency)
			.slice(0, limit)
			.map((q) => ({
				id: q.id,
				utterance: q.utterance,
				frequency: q.frequency,
				daysSinceFirst: Math.floor(
					(Date.now() - q.timestamp.getTime()) / (1000 * 60 * 60 * 24)
				),
			}));
	}

	// Clean up old queries to prevent memory leaks
	private cleanupOldQueries(): void {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep queries for 30 days

		// Remove old, low-frequency queries
		this.unknownQueries = this.unknownQueries.filter(
			(q) => q.timestamp >= cutoffDate || q.frequency >= 5
		);

		// If still too many, keep only the most frequent
		if (this.unknownQueries.length > this.maxQueries) {
			this.unknownQueries = this.unknownQueries
				.sort((a, b) => b.frequency - a.frequency)
				.slice(0, this.maxQueries);
		}
	}

	// Get cleanup interval for testing
	getCleanupInterval(): ReturnType<typeof setInterval> | null {
		return this.cleanupInterval;
	}

	// Cleanup on destroy
	destroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
	}

	// Get analytics about unknown queries
	getUnknownQueryAnalytics(): {
		totalUnknown: number;
		topPatterns: { pattern: string; count: number }[];
		suggestedIntents: Record<FinancialSkillId, number>;
	} {
		const totalUnknown = this.unknownQueries.length;

		// Analyze patterns in unknown queries
		const patternCounts: Record<string, number> = {};
		this.unknownQueries.forEach((q) => {
			const words = q.utterance.toLowerCase().split(/\s+/);
			words.forEach((word) => {
				if (word.length > 3) {
					patternCounts[word] = (patternCounts[word] || 0) + 1;
				}
			});
		});

		const topPatterns = Object.entries(patternCounts)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 10)
			.map(([pattern, count]) => ({ pattern, count }));

		// Count suggested intents
		const suggestedIntents: Record<FinancialSkillId, number> = {} as Record<
			FinancialSkillId,
			number
		>;
		this.unknownQueries.forEach((q) => {
			q.suggestedIntents.forEach((intent) => {
				suggestedIntents[intent] = (suggestedIntents[intent] || 0) + 1;
			});
		});

		return {
			totalUnknown,
			topPatterns,
			suggestedIntents,
		};
	}

	// Get most frequent unknown queries
	getTopUnknownQueries(limit: number = 10): {
		utterance: string;
		frequency: number;
		suggestedIntents: FinancialSkillId[];
		lastSeen: Date;
	}[] {
		return this.unknownQueries
			.sort((a, b) => b.frequency - a.frequency)
			.slice(0, limit)
			.map((q) => ({
				utterance: q.utterance,
				frequency: q.frequency,
				suggestedIntents: q.suggestedIntents,
				lastSeen: q.timestamp,
			}));
	}

	// Get all unknown queries
	getUnknownQueries() {
		return this.unknownQueries;
	}

	// Get unknown queries by pattern
	getUnknownQueriesByPattern(pattern: RegExp): {
		utterance: string;
		frequency: number;
		suggestedIntents: FinancialSkillId[];
	}[] {
		return this.unknownQueries
			.filter((q) => pattern.test(q.utterance))
			.map((q) => ({
				utterance: q.utterance,
				frequency: q.frequency,
				suggestedIntents: q.suggestedIntents,
			}));
	}

	private calculateSimilarity(str1: string, str2: string): number {
		const words1 = str1.toLowerCase().split(/\s+/);
		const words2 = str2.toLowerCase().split(/\s+/);
		const intersection = words1.filter((word) => words2.includes(word));
		const union = [...new Set([...words1, ...words2])];
		return intersection.length / union.length;
	}
}

// Smart fallback generator
export class SmartFallbackGenerator {
	private unknownCollector: UnknownQueryCollector;
	private fallbackCache: Map<string, FallbackResponse> = new Map();
	private cacheTimeout = 5 * 60 * 1000; // 5 minutes
	private analytics: {
		totalFallbacks: number;
		fallbackTypes: Record<FallbackType, number>;
		averageConfidence: number;
		userSatisfaction: number;
	} = {
		totalFallbacks: 0,
		fallbackTypes: {
			GUIDED_SUGGESTIONS: 0,
			UNKNOWN_COLLECTOR: 0,
			EDUCATIONAL: 0,
			SETUP_GUIDE: 0,
		},
		averageConfidence: 0,
		userSatisfaction: 0,
	};

	constructor() {
		this.unknownCollector = new UnknownQueryCollector();
	}

	// Generate appropriate fallback based on context
	generateFallback(
		utterance: string,
		context: ChatContext,
		reason: string,
		suggestedIntents: FinancialSkillId[] = []
	): FallbackResponse {
		// Check cache first
		const cacheKey = this.generateCacheKey(utterance, context, reason);
		const cached = this.fallbackCache.get(cacheKey);
		if (cached && this.isCacheValid(cacheKey)) {
			return cached;
		}

		// Record unknown query for analysis
		const unknownId = this.unknownCollector.recordUnknownQuery(
			utterance,
			context,
			suggestedIntents
		);

		// Determine fallback type based on context and reason
		const fallbackType = this.determineFallbackType(context, reason);

		let fallback: FallbackResponse;

		switch (fallbackType) {
			case 'GUIDED_SUGGESTIONS':
				fallback = this.generateGuidedSuggestions(utterance, context, reason);
				break;

			case 'EDUCATIONAL':
				fallback = this.generateEducationalFallback(utterance, context, reason);
				break;

			case 'SETUP_GUIDE':
				fallback = this.generateSetupGuide(utterance, context, reason);
				break;

			case 'UNKNOWN_COLLECTOR':
			default:
				fallback = this.generateUnknownCollectorFallback(
					utterance,
					context,
					reason,
					unknownId
				);
				break;
		}

		// Update analytics
		this.updateAnalytics(fallback);

		// Cache the result
		this.fallbackCache.set(cacheKey, fallback);

		return fallback;
	}

	// Generate cache key for fallback responses
	private generateCacheKey(
		utterance: string,
		context: ChatContext,
		reason: string
	): string {
		const contextHash = JSON.stringify({
			hasBudgets: !!context.budgets?.length,
			hasGoals: !!context.goals?.length,
			hasTransactions: !!context.transactions?.length,
			// userTier: context.userTier, // Commented out as userTier may not exist
		});
		return `${utterance.toLowerCase()}_${contextHash}_${reason}`;
	}

	// Check if cache entry is still valid
	private isCacheValid(cacheKey: string): boolean {
		const entry = this.fallbackCache.get(cacheKey);
		if (!entry) return false;

		// For now, we'll use a simple timeout-based cache
		// In a real implementation, you might want to check timestamps
		return true;
	}

	// Update analytics when generating fallbacks
	private updateAnalytics(fallback: FallbackResponse): void {
		this.analytics.totalFallbacks++;
		this.analytics.fallbackTypes[fallback.type]++;

		// Update average confidence
		const totalConfidence =
			this.analytics.averageConfidence * (this.analytics.totalFallbacks - 1);
		this.analytics.averageConfidence =
			(totalConfidence + fallback.confidence) / this.analytics.totalFallbacks;
	}

	// Record user feedback on fallback effectiveness
	recordFeedback(fallbackType: FallbackType, helpful: boolean): void {
		// Simple satisfaction tracking
		const currentSatisfaction = this.analytics.userSatisfaction;
		const totalFallbacks = this.analytics.totalFallbacks;

		if (helpful) {
			this.analytics.userSatisfaction =
				(currentSatisfaction * totalFallbacks + 1) / (totalFallbacks + 1);
		} else {
			this.analytics.userSatisfaction =
				(currentSatisfaction * totalFallbacks) / (totalFallbacks + 1);
		}
	}

	// Get analytics data
	getAnalytics(): {
		totalFallbacks: number;
		fallbackTypes: Record<FallbackType, number>;
		averageConfidence: number;
		userSatisfaction: number;
		unknownQueryAnalytics: ReturnType<
			UnknownQueryCollector['getUnknownQueryAnalytics']
		>;
		cacheStats: {
			size: number;
			hitRate: number;
		};
	} {
		return {
			...this.analytics,
			unknownQueryAnalytics: this.unknownCollector.getUnknownQueryAnalytics(),
			cacheStats: {
				size: this.fallbackCache.size,
				hitRate: 0, // Would track this in real implementation
			},
		};
	}

	// Clear cache
	clearCache(): void {
		this.fallbackCache.clear();
	}

	// Get cache statistics
	getCacheStats(): {
		size: number;
		keys: string[];
	} {
		return {
			size: this.fallbackCache.size,
			keys: Array.from(this.fallbackCache.keys()),
		};
	}

	private determineFallbackType(
		context: ChatContext,
		reason: string
	): FallbackType {
		// If user has no data, show setup guide
		const hasData = !!(
			context.budgets?.length ||
			context.goals?.length ||
			context.transactions?.length
		);
		if (!hasData) {
			return 'SETUP_GUIDE';
		}

		// If reason suggests educational content would help
		if (
			reason.includes('education') ||
			reason.includes('explain') ||
			reason.includes('what is')
		) {
			return 'EDUCATIONAL';
		}

		// If we have some data but query is unclear, show guided suggestions
		if (
			hasData &&
			(reason.includes('unclear') || reason.includes('ambiguous'))
		) {
			return 'GUIDED_SUGGESTIONS';
		}

		// Default to unknown collector
		return 'UNKNOWN_COLLECTOR';
	}

	private generateGuidedSuggestions(
		utterance: string,
		context: ChatContext,
		reason: string
	): FallbackResponse {
		const availableSkills =
			answerabilityGating.getGuidedFallbackSuggestions(context);

		// Convert to suggestions format
		const suggestions = availableSkills.map((skill) => ({
			skillId: skill.skillId,
			title: skill.title,
			description: skill.description,
			action: `ASK_${skill.skillId}`,
			priority: skill.priority,
		}));

		// Add quick actions
		const actions = [
			{
				label: 'Create Budget',
				action: 'CREATE_BUDGET',
				params: { category: 'groceries', amount: 300 },
			},
			{
				label: 'Set Goal',
				action: 'CREATE_GOAL',
				params: { name: 'Emergency Fund', target: 5000 },
			},
			{
				label: 'View Overview',
				action: 'ASK_OVERVIEW',
			},
		];

		return {
			type: 'GUIDED_SUGGESTIONS',
			message: `I can help you with several things right now. What would you like to do?`,
			suggestions: suggestions.slice(0, 6), // Top 6 suggestions
			actions,
			reason,
			confidence: 0.7,
		};
	}

	private generateEducationalFallback(
		utterance: string,
		context: ChatContext,
		reason: string
	): FallbackResponse {
		const educationalSkills: {
			skillId: FinancialSkillId;
			title: string;
			description: string;
			action: string;
			priority: number;
		}[] = [
			{
				skillId: 'EDUCATION_BUDGETS_VS_GOALS',
				title: 'Budgets vs Goals',
				description: 'Learn the difference between budgets and goals',
				action: 'ASK_EDUCATION_BUDGETS_VS_GOALS',
				priority: 0.9,
			},
			{
				skillId: 'EDUCATION_APR_VS_APY',
				title: 'APR vs APY',
				description: 'Understand interest rates and returns',
				action: 'ASK_EDUCATION_APR_VS_APY',
				priority: 0.8,
			},
			{
				skillId: 'EDUCATION_INDEX_FUNDS',
				title: 'Index Funds Basics',
				description: 'Learn about index fund investing',
				action: 'ASK_EDUCATION_INDEX_FUNDS',
				priority: 0.7,
			},
		];

		return {
			type: 'EDUCATIONAL',
			message: `I'd be happy to explain that! Here are some educational topics I can help with:`,
			suggestions: educationalSkills,
			actions: [
				{
					label: 'Ask a Question',
					action: 'ASK_QUESTION',
					params: { topic: 'general' },
				},
			],
			reason,
			confidence: 0.8,
		};
	}

	private generateSetupGuide(
		utterance: string,
		context: ChatContext,
		reason: string
	): FallbackResponse {
		const setupSteps = [
			{
				skillId: 'BUDGET_CREATE' as FinancialSkillId,
				title: 'Create Your First Budget',
				description: 'Start by setting up a budget for groceries or dining',
				action: 'CREATE_FIRST_BUDGET',
				priority: 0.9,
			},
			{
				skillId: 'GOAL_CREATE' as FinancialSkillId,
				title: 'Set a Savings Goal',
				description: 'Create an emergency fund or vacation goal',
				action: 'CREATE_FIRST_GOAL',
				priority: 0.8,
			},
			{
				skillId: 'OVERVIEW' as FinancialSkillId,
				title: 'Get Financial Overview',
				description: 'See your complete financial picture',
				action: 'ASK_OVERVIEW',
				priority: 0.7,
			},
		];

		return {
			type: 'SETUP_GUIDE',
			message: `Welcome! Let's get you started with financial tracking. Here's what you can do first:`,
			suggestions: setupSteps,
			actions: [
				{
					label: 'Connect Account',
					action: 'CONNECT_ACCOUNT',
				},
				{
					label: 'Add Manual Transaction',
					action: 'ADD_TRANSACTION',
				},
				{
					label: 'Learn the Basics',
					action: 'SHOW_TUTORIAL',
				},
			],
			reason,
			confidence: 0.9,
		};
	}

	private generateUnknownCollectorFallback(
		utterance: string,
		context: ChatContext,
		reason: string,
		unknownId: string
	): FallbackResponse {
		// Get most common unknown queries for context (for future analytics)
		// const topUnknown = this.unknownCollector.getTopUnknownQueries(3);

		// Generate suggestions based on available data
		const availableSkills =
			answerabilityGating.getGuidedFallbackSuggestions(context);
		const suggestions = availableSkills.slice(0, 4).map((skill) => ({
			skillId: skill.skillId,
			title: skill.title,
			description: skill.description,
			action: `ASK_${skill.skillId}`,
			priority: skill.priority,
		}));

		// Add common patterns if available
		const commonPatterns = this.getCommonPatternSuggestions(utterance);
		suggestions.push(...commonPatterns);

		return {
			type: 'UNKNOWN_COLLECTOR',
			message: `I'm not sure I understand that exactly. Here are some things I can definitely help with:`,
			suggestions: suggestions.slice(0, 6),
			actions: [
				{
					label: 'Try Again',
					action: 'REPHRASE_QUESTION',
				},
				{
					label: 'Get Help',
					action: 'SHOW_HELP',
				},
			],
			reason: `UNKNOWN_QUERY_${unknownId}`,
			confidence: 0.5,
		};
	}

	private getCommonPatternSuggestions(utterance: string): {
		skillId: FinancialSkillId;
		title: string;
		description: string;
		action: string;
		priority: number;
	}[] {
		const text = utterance.toLowerCase();
		const suggestions: {
			skillId: FinancialSkillId;
			title: string;
			description: string;
			action: string;
			priority: number;
		}[] = [];

		// Check for common patterns and suggest appropriate skills
		if (text.includes('budget') || text.includes('spending')) {
			suggestions.push({
				skillId: 'BUDGET_STATUS',
				title: 'Check Budget Status',
				description: 'See how your budgets are doing',
				action: 'ASK_BUDGET_STATUS',
				priority: 0.8,
			});
		}

		if (text.includes('goal') || text.includes('save')) {
			suggestions.push({
				skillId: 'GOAL_PROGRESS',
				title: 'Track Goal Progress',
				description: 'See how your savings goals are progressing',
				action: 'ASK_GOAL_PROGRESS',
				priority: 0.8,
			});
		}

		if (
			text.includes('transaction') ||
			text.includes('find') ||
			text.includes('search')
		) {
			suggestions.push({
				skillId: 'TRANSACTION_SEARCH',
				title: 'Search Transactions',
				description: 'Find specific transactions',
				action: 'ASK_TRANSACTION_SEARCH',
				priority: 0.8,
			});
		}

		if (
			text.includes('overview') ||
			text.includes('summary') ||
			text.includes('how am i')
		) {
			suggestions.push({
				skillId: 'OVERVIEW',
				title: 'Financial Overview',
				description: 'Get your complete financial picture',
				action: 'ASK_OVERVIEW',
				priority: 0.9,
			});
		}

		return suggestions;
	}
}

// Main smart fallback system
export class SmartFallbackSystem {
	private fallbackGenerator: SmartFallbackGenerator;
	private performanceMetrics: {
		averageResponseTime: number;
		totalRequests: number;
		errorCount: number;
	} = {
		averageResponseTime: 0,
		totalRequests: 0,
		errorCount: 0,
	};

	constructor() {
		this.fallbackGenerator = new SmartFallbackGenerator();
	}

	// Generate smart fallback response
	generateFallbackResponse(
		utterance: string,
		context: ChatContext,
		reason: string,
		suggestedIntents: FinancialSkillId[] = []
	): ChatResponse {
		const startTime = performance.now();

		try {
			this.performanceMetrics.totalRequests++;

			const fallback = this.fallbackGenerator.generateFallback(
				utterance,
				context,
				reason,
				suggestedIntents
			);

			// Convert to ChatResponse format
			const response: ChatResponse = {
				message: fallback.message,
				details: this.getFallbackDetails(fallback),
				actions: fallback.actions.map((action) => ({
					label: action.label,
					action: action.action as any,
					params: action.params,
				})),
				sources: [{ kind: 'db', note: 'fallback response' }],
				cost: { model: 'mini', estTokens: 0 },
			};

			// Update performance metrics
			const responseTime = performance.now() - startTime;
			this.updatePerformanceMetrics(responseTime);

			return response;
		} catch (error) {
			this.performanceMetrics.errorCount++;
			console.error('Error generating fallback response:', error);

			// Return a basic fallback on error
			return {
				message:
					"I'm having trouble understanding that. Could you try rephrasing your question?",
				details: 'I encountered an error while processing your request.',
				actions: [
					{
						label: 'Try Again',
						action: 'REPHRASE_QUESTION' as any,
					},
					{
						label: 'Get Help',
						action: 'SHOW_HELP' as any,
					},
				],
				sources: [{ kind: 'db', note: 'error fallback' }],
				cost: { model: 'mini', estTokens: 0 },
			};
		}
	}

	// Update performance metrics
	private updatePerformanceMetrics(responseTime: number): void {
		const totalTime =
			this.performanceMetrics.averageResponseTime *
			(this.performanceMetrics.totalRequests - 1);
		this.performanceMetrics.averageResponseTime =
			(totalTime + responseTime) / this.performanceMetrics.totalRequests;
	}

	// Record user feedback on fallback effectiveness
	recordFeedback(fallbackType: FallbackType, helpful: boolean): void {
		this.fallbackGenerator.recordFeedback(fallbackType, helpful);
	}

	// Get comprehensive analytics
	getComprehensiveAnalytics(): {
		fallbackAnalytics: ReturnType<SmartFallbackGenerator['getAnalytics']>;
		performanceMetrics: {
			averageResponseTime: number;
			totalRequests: number;
			errorCount: number;
		};
		unknownQueryAnalytics: ReturnType<
			UnknownQueryCollector['getUnknownQueryAnalytics']
		>;
		queriesNeedingAttention: ReturnType<
			UnknownQueryCollector['getQueriesNeedingAttention']
		>;
	} {
		return {
			fallbackAnalytics: this.fallbackGenerator.getAnalytics(),
			performanceMetrics: { ...this.performanceMetrics },
			unknownQueryAnalytics:
				this.fallbackGenerator['unknownCollector'].getUnknownQueryAnalytics(),
			queriesNeedingAttention:
				this.fallbackGenerator['unknownCollector'].getQueriesNeedingAttention(),
		};
	}

	// Get queries that need attention for improvement
	getQueriesNeedingAttention(
		limit: number = 10
	): ReturnType<UnknownQueryCollector['getQueriesNeedingAttention']> {
		return this.fallbackGenerator[
			'unknownCollector'
		].getQueriesNeedingAttention(limit);
	}

	// Provide feedback on a specific query
	provideQueryFeedback(
		queryId: string,
		feedback: 'helpful' | 'not_helpful' | 'partially_helpful'
	): boolean {
		return this.fallbackGenerator['unknownCollector'].provideFeedback(
			queryId,
			feedback
		);
	}

	// Mark a query as resolved
	markQueryResolved(queryId: string): boolean {
		return this.fallbackGenerator['unknownCollector'].markResolved(queryId);
	}

	// Clear all data (useful for testing)
	clearAllData(): void {
		this.fallbackGenerator.clearCache();
		this.performanceMetrics = {
			averageResponseTime: 0,
			totalRequests: 0,
			errorCount: 0,
		};
	}

	// Get cache statistics
	getCacheStats(): ReturnType<SmartFallbackGenerator['getCacheStats']> {
		return this.fallbackGenerator.getCacheStats();
	}

	// Health check for the system
	healthCheck(): {
		status: 'healthy' | 'degraded' | 'unhealthy';
		issues: string[];
		metrics: {
			averageResponseTime: number;
			totalRequests: number;
			errorCount: number;
		};
	} {
		const issues: string[] = [];

		// Check error rate
		const errorRate =
			this.performanceMetrics.totalRequests > 0
				? this.performanceMetrics.errorCount /
				  this.performanceMetrics.totalRequests
				: 0;

		if (errorRate > 0.1) {
			issues.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
		}

		// Check response time
		if (this.performanceMetrics.averageResponseTime > 1000) {
			issues.push(
				`Slow response time: ${this.performanceMetrics.averageResponseTime.toFixed(
					1
				)}ms`
			);
		}

		// Check cache size
		const cacheStats = this.getCacheStats();
		if (cacheStats.size > 1000) {
			issues.push(`Large cache size: ${cacheStats.size} entries`);
		}

		let status: 'healthy' | 'degraded' | 'unhealthy';
		if (issues.length === 0) {
			status = 'healthy';
		} else if (issues.length <= 2) {
			status = 'degraded';
		} else {
			status = 'unhealthy';
		}

		return {
			status,
			issues,
			metrics: { ...this.performanceMetrics },
		};
	}

	private getFallbackDetails(fallback: FallbackResponse): string {
		switch (fallback.type) {
			case 'GUIDED_SUGGESTIONS':
				return 'I can help you with these financial tasks right now.';
			case 'EDUCATIONAL':
				return 'These educational topics can help you understand financial concepts better.';
			case 'SETUP_GUIDE':
				return "Let's get you started with the basics of financial tracking.";
			case 'UNKNOWN_COLLECTOR':
			default:
				return "I'm not sure about that, but I can definitely help with these common tasks.";
		}
	}

	// Get analytics for monitoring (legacy method for backward compatibility)
	getAnalytics(): {
		unknownQueryAnalytics: ReturnType<
			UnknownQueryCollector['getUnknownQueryAnalytics']
		>;
		fallbackEffectiveness: {
			totalFallbacks: number;
			averageConfidence: number;
			mostCommonReasons: { reason: string; count: number }[];
		};
	} {
		const comprehensive = this.getComprehensiveAnalytics();
		return {
			unknownQueryAnalytics: comprehensive.unknownQueryAnalytics,
			fallbackEffectiveness: {
				totalFallbacks: comprehensive.fallbackAnalytics.totalFallbacks,
				averageConfidence: comprehensive.fallbackAnalytics.averageConfidence,
				mostCommonReasons: [
					{ reason: 'UNKNOWN_INTENT', count: 0 },
					{ reason: 'INSUFFICIENT_DATA', count: 0 },
					{ reason: 'AMBIGUOUS_QUERY', count: 0 },
				],
			},
		};
	}
}

// Export singleton instance
export const smartFallbackSystem = new SmartFallbackSystem();
