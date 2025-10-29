// Hybrid AI Orchestrator - Main system that coordinates all components
// Implements the complete 90%+ coverage system with skill graph, hierarchical routing, and evaluation

import { ChatResponse } from './responseSchema';
import {
import { logger } from '../../../utils/logger';

	FinancialSkillId,
	getSkill,
} from './skills/comprehensiveSkillRegistry';
import { hierarchicalRouter, RouteDecision } from './hierarchicalRouter';
import { slotResolver, SlotResolution } from './slotResolver';
import { answerabilityGating, AnswerabilityCheck } from './answerabilityGating';
import { smartFallbackSystem } from './smartFallbackSystem';
import { observabilitySystem } from './observabilitySystem';
import { evaluationSystem } from './evaluationSystem';

// Context type for hybrid AI orchestrator
type ChatContext = any;

// System configuration
export interface HybridAIConfig {
	enableSkillGraph: boolean;
	enableHierarchicalRouting: boolean;
	enableSlotResolution: boolean;
	enableAnswerabilityGating: boolean;
	enableSmartFallbacks: boolean;
	enableObservability: boolean;
	enableEvaluation: boolean;
	confidenceThreshold: number;
	maxRetries: number;
	timeoutMs: number;
}

// Default configuration
const DEFAULT_CONFIG: HybridAIConfig = {
	enableSkillGraph: true,
	enableHierarchicalRouting: true,
	enableSlotResolution: true,
	enableAnswerabilityGating: true,
	enableSmartFallbacks: true,
	enableObservability: true,
	enableEvaluation: true,
	confidenceThreshold: 0.6,
	maxRetries: 2,
	timeoutMs: 5000,
};

// Processing result
export interface ProcessingResult {
	response: ChatResponse;
	routeDecision: RouteDecision;
	answerability: AnswerabilityCheck;
	slotResolution?: SlotResolution;
	performance: {
		latency: number;
		tokens: number;
		model: string;
		cacheHit: boolean;
	};
	metadata: {
		skillId?: FinancialSkillId;
		confidence: number;
		reason: string;
		wasGrounded: boolean;
		wasModified: boolean;
	};
}

// Main hybrid AI orchestrator
export class HybridAIOrchestrator {
	private config: HybridAIConfig;
	private performanceCache: Map<
		string,
		{ response: ChatResponse; timestamp: number }
	> = new Map();
	private cacheTimeout = 5 * 60 * 1000; // 5 minutes

	constructor(config: Partial<HybridAIConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	// Main processing method
	async processUserMessage(
		utterance: string,
		context: ChatContext,
		sessionId: string,
		messageId: string
	): Promise<ProcessingResult> {
		const startTime = Date.now();

		try {
			// Check cache first
			const cached = this.getCachedResponse(utterance, context);
			if (cached) {
				return this.createResult(
					cached,
					{
						type: 'SKILL',
						skillId: 'OVERVIEW',
						confidence: 1.0,
						reason: 'CACHE_HIT',
					},
					{
						canAnswer: true,
						confidence: 1.0,
						reason: 'CACHED',
						missingData: [],
						suggestions: [],
					},
					undefined, // slotResolution
					{
						latency: Date.now() - startTime,
						tokens: 0,
						model: 'cache',
						cacheHit: true,
					},
					{
						skillId: 'OVERVIEW',
						confidence: 1.0,
						reason: 'CACHE_HIT',
						wasGrounded: true,
						wasModified: false,
					}
				);
			}

			// Step 1: Hierarchical routing
			const routeDecision = await this.performRouting(utterance, context);

			// Step 2: Answerability gating
			const answerability = await this.checkAnswerability(
				routeDecision,
				context
			);

			// Step 3: Slot resolution (if needed)
			const slotResolution = await this.resolveSlots(
				utterance,
				routeDecision,
				context
			);

			// Step 4: Generate response
			const response = await this.generateResponse(
				utterance,
				routeDecision,
				answerability,
				slotResolution,
				context
			);

			// Step 5: Safety and compliance checks
			const finalResponse = await this.applySafetyChecks(response, context);

			// Step 6: Cache response
			this.cacheResponse(utterance, context, finalResponse);

			// Step 7: Log and monitor
			await this.logProcessing(
				utterance,
				routeDecision,
				finalResponse,
				context,
				sessionId,
				messageId,
				startTime
			);

			// Step 8: Record metrics
			if (this.config.enableEvaluation) {
				this.recordMetrics(
					sessionId,
					messageId,
					utterance,
					routeDecision,
					finalResponse,
					startTime,
					context
				);
			}

			return this.createResult(
				finalResponse,
				routeDecision,
				answerability,
				slotResolution,
				{
					latency: Date.now() - startTime,
					tokens: this.estimateTokens(finalResponse),
					model: 'hybrid',
					cacheHit: false,
				},
				{
					skillId: routeDecision.skillId,
					confidence: routeDecision.confidence,
					reason: routeDecision.reason,
					wasGrounded: true,
					wasModified: false,
				}
			);
		} catch (error) {
			logger.error('[HybridAIOrchestrator] Processing error:', error);

			// Fallback to smart fallback system
			const fallbackResponse = smartFallbackSystem.generateFallbackResponse(
				utterance,
				context,
				'PROCESSING_ERROR',
				[]
			);

			return this.createResult(
				fallbackResponse,
				{
					type: 'FALLBACK_GUIDED',
					confidence: 0.5,
					reason: 'PROCESSING_ERROR',
				},
				{
					canAnswer: false,
					confidence: 0.0,
					reason: 'PROCESSING_ERROR',
					missingData: [],
					suggestions: [],
				},
				undefined, // slotResolution
				{
					latency: Date.now() - startTime,
					tokens: 0,
					model: 'fallback',
					cacheHit: false,
				},
				{
					confidence: 0.0,
					reason: 'PROCESSING_ERROR',
					wasGrounded: false,
					wasModified: false,
				}
			);
		}
	}

	// Step 1: Hierarchical routing
	private async performRouting(
		utterance: string,
		context: ChatContext
	): Promise<RouteDecision> {
		if (!this.config.enableHierarchicalRouting) {
			return {
				type: 'FALLBACK_GUIDED',
				confidence: 0.5,
				reason: 'ROUTING_DISABLED',
			};
		}

		try {
			return await hierarchicalRouter.route(utterance, context);
		} catch (error) {
			logger.error('[HybridAIOrchestrator] Routing error:', error);
			return {
				type: 'FALLBACK_GUIDED',
				confidence: 0.3,
				reason: 'ROUTING_ERROR',
			};
		}
	}

	// Step 2: Answerability gating
	private async checkAnswerability(
		routeDecision: RouteDecision,
		context: ChatContext
	): Promise<AnswerabilityCheck> {
		if (
			!this.config.enableAnswerabilityGating ||
			routeDecision.type !== 'SKILL' ||
			!routeDecision.skillId
		) {
			return {
				canAnswer: true,
				confidence: 1.0,
				reason: 'GATING_DISABLED',
				missingData: [],
				suggestions: [],
			};
		}

		try {
			return answerabilityGating.checkAnswerability(
				routeDecision.skillId,
				context
			);
		} catch (error) {
			logger.error('[HybridAIOrchestrator] Answerability check error:', error);
			return {
				canAnswer: false,
				confidence: 0.0,
				reason: 'GATING_ERROR',
				missingData: [],
				suggestions: [],
			};
		}
	}

	// Step 3: Slot resolution
	private async resolveSlots(
		utterance: string,
		routeDecision: RouteDecision,
		context: ChatContext
	): Promise<SlotResolution | undefined> {
		if (
			!this.config.enableSlotResolution ||
			routeDecision.type !== 'SKILL' ||
			!routeDecision.skillId
		) {
			return undefined;
		}

		try {
			const skill = getSkill(routeDecision.skillId);
			if (!skill) return undefined;

			const requiredSlots = Object.keys(skill.slots || {}).filter(
				(slot) => skill.slots?.[slot].required
			);
			if (requiredSlots.length === 0) return undefined;

			return slotResolver.resolveSlots(utterance, requiredSlots, context);
		} catch (error) {
			logger.error('[HybridAIOrchestrator] Slot resolution error:', error);
			return undefined;
		}
	}

	// Step 4: Generate response
	private async generateResponse(
		utterance: string,
		routeDecision: RouteDecision,
		answerability: AnswerabilityCheck,
		slotResolution: SlotResolution | undefined,
		context: ChatContext
	): Promise<ChatResponse> {
		// If answerability check failed, use smart fallback
		if (!answerability.canAnswer) {
			return smartFallbackSystem.generateFallbackResponse(
				utterance,
				context,
				answerability.reason,
				answerability.suggestions.map((s) => s as FinancialSkillId)
			);
		}

		// If routing failed, use smart fallback
		if (
			routeDecision.type === 'FALLBACK_GUIDED' ||
			routeDecision.type === 'FALLBACK_UNKNOWN'
		) {
			return smartFallbackSystem.generateFallbackResponse(
				utterance,
				context,
				routeDecision.reason,
				[]
			);
		}

		// If we have a skill, execute it
		if (routeDecision.type === 'SKILL' && routeDecision.skillId) {
			return await this.executeSkill(
				routeDecision.skillId,
				slotResolution,
				context
			);
		}

		// Default fallback
		return smartFallbackSystem.generateFallbackResponse(
			utterance,
			context,
			'UNKNOWN_ROUTE',
			[]
		);
	}

	// Execute a specific skill
	private async executeSkill(
		skillId: FinancialSkillId,
		slotResolution: SlotResolution | undefined,
		context: ChatContext
	): Promise<ChatResponse> {
		const skill = getSkill(skillId);
		if (!skill) {
			throw new Error(`Skill not found: ${skillId}`);
		}

		try {
			// Prepare parameters from slot resolution
			const params = slotResolution?.resolved
				? Object.fromEntries(
						Object.entries(slotResolution.resolved).map(([key, slot]) => [
							key,
							slot.value,
						])
				  )
				: {};

			// Check if we can handle this skill
			const answerability = skill.canHandle?.(context);
			if (answerability && !answerability.canAnswer) {
				return smartFallbackSystem.generateFallbackResponse(
					'Skill execution failed',
					context,
					answerability.reason || 'SKILL_CANNOT_HANDLE',
					[]
				);
			}

			// Execute the skill
			const result = await skill.run(params, context);

			if (!result.success) {
				throw new Error(
					`Skill execution failed: ${result.error || 'Unknown error'}`
				);
			}

			// Render the response
			const renderResult = skill.render?.(result.data, params);

			// Generate coach note if available
			const coachNote = skill.coach ? skill.coach(result.data) : undefined;

			// Build the response
			const response: ChatResponse = {
				message:
					coachNote?.message ||
					`Here's your ${skill.name.toLowerCase()} information:`,
				details: this.formatSkillDetails(result.data, skill),
				actions: this.buildSkillActions(skillId, params),
				sources: [{ kind: 'db', note: 'skill-based response' }],
				cost: { model: 'mini', estTokens: 0 },
				cards: [renderResult],
			};

			return response;
		} catch (error) {
			logger.error(
				`[HybridAIOrchestrator] Skill execution error for ${skillId}:`,
				error
			);
			throw error;
		}
	}

	// Step 5: Apply safety checks
	private async applySafetyChecks(
		response: ChatResponse,
		context: ChatContext
	): Promise<ChatResponse> {
		if (!this.config.enableObservability) {
			return response;
		}

		try {
			const safetyClassification = observabilitySystem
				.getSafetyClassifier()
				.classifyResponse(response, context);

			if (!safetyClassification.isSafe) {
				logger.warn(
					'[HybridAIOrchestrator] Safety issue detected:',
					safetyClassification.reasons
				);

				if (safetyClassification.suggestedAction === 'BLOCK') {
					return smartFallbackSystem.generateFallbackResponse(
						'Safety blocked',
						context,
						'SAFETY_BLOCKED',
						[]
					);
				}

				if (safetyClassification.suggestedAction === 'MODIFY') {
					return observabilitySystem
						.getSafetyClassifier()
						.modifyResponse(response, safetyClassification);
				}
			}

			return response;
		} catch (error) {
			logger.error('[HybridAIOrchestrator] Safety check error:', error);
			return response;
		}
	}

	// Step 6: Cache response
	private cacheResponse(
		utterance: string,
		context: ChatContext,
		response: ChatResponse
	): void {
		const cacheKey = this.generateCacheKey(utterance, context);
		this.performanceCache.set(cacheKey, {
			response,
			timestamp: Date.now(),
		});
	}

	// Get cached response
	private getCachedResponse(
		utterance: string,
		context: ChatContext
	): ChatResponse | null {
		const cacheKey = this.generateCacheKey(utterance, context);
		const cached = this.performanceCache.get(cacheKey);

		if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
			return cached.response;
		}

		return null;
	}

	// Generate cache key
	private generateCacheKey(utterance: string, context: ChatContext): string {
		const contextHash = JSON.stringify({
			budgets: context.budgets?.length || 0,
			goals: context.goals?.length || 0,
			transactions: context.transactions?.length || 0,
		});
		return `${utterance.toLowerCase()}_${contextHash}`;
	}

	// Step 7: Log processing
	private async logProcessing(
		utterance: string,
		routeDecision: RouteDecision,
		response: ChatResponse,
		context: ChatContext,
		sessionId: string,
		messageId: string,
		startTime: number
	): Promise<void> {
		if (!this.config.enableObservability) return;

		const performance = {
			latency: Date.now() - startTime,
			tokens: this.estimateTokens(response),
			model: 'hybrid',
			cacheHit: false,
			retries: 0,
			errors: 0,
		};

		observabilitySystem.logIntentDetection(
			utterance,
			routeDecision,
			sessionId,
			messageId,
			performance
		);
		observabilitySystem.logResponseGeneration(
			response,
			context,
			sessionId,
			messageId,
			performance
		);
	}

	// Step 8: Record metrics
	private recordMetrics(
		sessionId: string,
		messageId: string,
		utterance: string,
		routeDecision: RouteDecision,
		response: ChatResponse,
		startTime: number,
		context: ChatContext
	): void {
		if (!this.config.enableEvaluation) return;

		const latency = Date.now() - startTime;
		const tokens = this.estimateTokens(response);

		evaluationSystem.recordUserInteraction(
			sessionId,
			messageId,
			utterance,
			routeDecision,
			response,
			latency,
			tokens,
			context
		);
	}

	// Helper methods
	private createResult(
		response: ChatResponse,
		routeDecision: RouteDecision,
		answerability: AnswerabilityCheck,
		slotResolution: SlotResolution | undefined,
		performance: {
			latency: number;
			tokens: number;
			model: string;
			cacheHit: boolean;
		},
		metadata: {
			skillId?: FinancialSkillId;
			confidence: number;
			reason: string;
			wasGrounded: boolean;
			wasModified: boolean;
		}
	): ProcessingResult {
		return {
			response,
			routeDecision,
			answerability,
			slotResolution,
			performance,
			metadata,
		};
	}

	private formatSkillDetails(data: any, skill: any): string {
		// Format skill data into human-readable details
		if (typeof data === 'object') {
			return Object.entries(data)
				.map(([key, value]) => `${key}: ${value}`)
				.join('\n');
		}
		return String(data);
	}

	private buildSkillActions(
		skillId: FinancialSkillId,
		params: any
	): {
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
	}[] {
		// Build appropriate actions based on skill
		const actions: {
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

		switch (skillId) {
			case 'BUDGET_STATUS':
				actions.push({
					label: 'Adjust Budget',
					action: 'ADJUST_LIMIT',
					params,
				});
				break;
			case 'GOAL_PROGRESS':
				actions.push({
					label: 'Update Goal',
					action: 'OPEN_GOAL_WIZARD',
					params,
				});
				break;
			case 'TRANSACTION_SEARCH':
				actions.push({
					label: 'Refine Search',
					action: 'OPEN_TRANSACTION_FORM',
					params,
				});
				break;
			default:
				actions.push({ label: 'Learn More', action: 'OPEN_BUDGETS' });
		}

		return actions;
	}

	private estimateTokens(response: ChatResponse): number {
		const text = `${response.message} ${response.details || ''}`;
		return Math.ceil(text.length / 4); // Rough estimate: 4 chars per token
	}

	// Public API methods
	async getSystemHealth(): Promise<{
		overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
		coverage: number;
		performance: any;
		recommendations: string[];
	}> {
		const health = observabilitySystem.getSystemHealth();
		const coverage = evaluationSystem.getCurrentMetrics();

		return {
			overall: health.overall,
			coverage: coverage.handledRate,
			performance: health.metrics,
			recommendations: health.recommendations,
		};
	}

	async getCoverageAnalytics(): Promise<any> {
		return observabilitySystem.getCoverageAnalytics();
	}

	async runEvaluation(): Promise<any> {
		return evaluationSystem.runOfflineEvaluation();
	}

	// Update configuration
	updateConfig(newConfig: Partial<HybridAIConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}
}

// Export singleton instance
export const hybridAIOrchestrator = new HybridAIOrchestrator();
