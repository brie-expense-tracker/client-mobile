// chatController.ts - End-to-end chat flow controller
// Glues together intent detection, grounding, model selection, narration, critic validation, and analytics

import {
	enhancedIntentMapper,
	Intent,
	RouteDecision,
} from '../../components/assistant/enhancedIntentMapper';
import { IntentType } from '../../components/assistant/intentMapper';
import { GroundingService } from './groundingService';
import {
	pickModel,
	executeHybridCostOptimization,
	ModelTier,
} from '../../components/assistant/routeModel';
import { logChat } from './analyticsService';
import {
	composeStructuredResponse,
	ChatResponse,
	ensureResponseConsistency,
} from '../../components/assistant/responseSchema';
import { helpfulFallback } from '../../components/assistant/helpfulFallbacks';
import { EnhancedTieredAIService } from './enhancedTieredAIService';

export interface ChatContext {
	userProfile?: {
		monthlyIncome?: number;
		financialGoal?: string;
		riskProfile?: string;
	};
	budgets?: any[];
	goals?: any[];
	transactions?: any[];
	currentUsage?: {
		subscriptionTier: string;
		currentTokens: number;
		tokenLimit: number;
	};
}

export interface ChatControllerConfig {
	enableLLM: boolean;
	enableCritic: boolean;
	enableAnalytics: boolean;
	maxRetries: number;
	fallbackThreshold: number;
}

export class ChatController {
	private groundingService: GroundingService;
	private aiService: EnhancedTieredAIService;
	private config: ChatControllerConfig;

	constructor(context: ChatContext, config?: Partial<ChatControllerConfig>) {
		this.groundingService = new GroundingService(context);
		this.aiService = new EnhancedTieredAIService(context);
		this.config = {
			enableLLM: true,
			enableCritic: true,
			enableAnalytics: true,
			maxRetries: 2,
			fallbackThreshold: 0.6,
			...config,
		};
	}

	/**
	 * Main entry point: handle user message end-to-end
	 */
	async handleUserMessage(
		query: string,
		context: ChatContext
	): Promise<ChatResponse> {
		const startTime = Date.now();
		let response: ChatResponse;
		let analyticsData: any = {};

		try {
			console.log('🔍 [ChatController] Processing query:', query);

			// Step 1: Enhanced intent detection with multi-label support
			const routeDecision = await enhancedIntentMapper.makeRouteDecision(
				query,
				context
			);
			const intent = routeDecision.primary.intent;
			console.log('🔍 [ChatController] Enhanced intent detection:', {
				primary: routeDecision.primary.intent,
				confidence: routeDecision.primary.calibratedP,
				routeType: routeDecision.routeType,
				secondary: routeDecision.secondary?.map((s) => s.intent),
			});

			// Step 2: Try grounding first (with enhanced confidence)
			const grounded = await this.tryGrounded(intent, { query }, context);
			console.log('🔍 [ChatController] Grounding result:', {
				success: !!grounded,
				confidence: grounded?.confidence,
				payload: grounded?.payload ? 'has_data' : 'no_data',
			});

			// Step 3: Pick appropriate model
			const model = pickModel(intent, query);
			console.log('🔍 [ChatController] Selected model:', model);

			// Step 4: Extract facts from grounding
			const facts = grounded?.payload ?? { note: 'no facts available' };
			console.log('🔍 [ChatController] Facts extracted:', {
				hasFacts: !!grounded?.payload,
				factCount: grounded?.payload ? Object.keys(grounded.payload).length : 0,
			});

			// Step 5: Generate narration using selected model
			let narration: string | null = null;
			if (
				this.config.enableLLM &&
				grounded &&
				routeDecision.primary.calibratedP > this.config.fallbackThreshold
			) {
				try {
					narration = await this.generateNarration(
						model,
						facts,
						context.userProfile,
						query
					);
					console.log('🔍 [ChatController] Narration generated:', {
						length: narration?.length,
						model: model,
					});
				} catch (error) {
					console.warn(
						'🔍 [ChatController] Narration generation failed:',
						error
					);
					narration = null;
				}
			}

			// Step 6: Critic validation pass (mini model)
			let vetted: { ok: boolean; text: string; issues?: string[] } | null =
				null;
			if (this.config.enableCritic && narration) {
				try {
					vetted = await this.criticValidation('mini', narration, facts);
					console.log('🔍 [ChatController] Critic validation:', {
						passed: vetted?.ok,
						issues: vetted?.issues?.length || 0,
					});
				} catch (error) {
					console.warn('🔍 [ChatController] Critic validation failed:', error);
					vetted = null;
				}
			}

			// Step 7: Compose final response
			if (vetted?.ok && narration) {
				// Use validated narration
				response = await this.postProcessToResponse(vetted.text, facts, intent);
				console.log('🔍 [ChatController] Using validated narration response');
			} else if (
				grounded &&
				routeDecision.primary.calibratedP > this.config.fallbackThreshold
			) {
				// Use grounded facts without LLM
				response = await this.composeFromFactsWithoutLLM(intent, facts, query);
				console.log('🔍 [ChatController] Using grounded facts response');
			} else {
				// Fallback to helpful response
				response = helpfulFallback(query, context);
				console.log('🔍 [ChatController] Using helpful fallback response');
			}

			// Step 8: Collect analytics data
			const responseTimeMs = Date.now() - startTime;
			analyticsData = {
				intent,
				primaryIntent: routeDecision.primary.intent,
				primaryConfidence: routeDecision.primary.calibratedP,
				routeType: routeDecision.routeType,
				secondaryIntents: routeDecision.secondary?.map((s) => s.intent) || [],
				usedGrounding: !!grounded,
				model,
				tokensIn: this.estimateTokens(query),
				tokensOut: this.estimateTokens(response.message),
				hadActions: !!response.actions?.length,
				hadCard: !!response.cards?.length,
				fallback:
					!grounded ||
					routeDecision.primary.calibratedP <= this.config.fallbackThreshold,
				responseTimeMs,
				groundingConfidence: grounded?.confidence,
				calibratedConfidence: routeDecision.primary.calibratedP,
				messageLength: response.message.length,
				hasFinancialData: !!(
					context.budgets?.length ||
					context.goals?.length ||
					context.transactions?.length
				),
				criticPassed: vetted?.ok,
				narrationGenerated: !!narration,
				responseSource: this.getResponseSource(vetted, grounded, narration),
				shadowRouteDelta: routeDecision.shadowRoute?.delta,
			};
		} catch (error) {
			console.error('🔍 [ChatController] Error in chat flow:', error);

			// Fallback response on error
			response = helpfulFallback(query, context);

			// Analytics for error case
			analyticsData = {
				intent: 'ERROR',
				usedGrounding: false,
				model: 'fallback',
				tokensIn: this.estimateTokens(query),
				tokensOut: this.estimateTokens(response.message),
				hadActions: !!response.actions?.length,
				hadCard: !!response.cards?.length,
				fallback: true,
				responseTimeMs: Date.now() - startTime,
				groundingConfidence: 0,
				messageLength: response.message.length,
				hasFinancialData: !!(
					context.budgets?.length ||
					context.goals?.length ||
					context.transactions?.length
				),
				criticPassed: false,
				narrationGenerated: false,
				responseSource: 'error_fallback',
				error: error.message,
			};
		}

		// Step 9: Log analytics
		if (this.config.enableAnalytics) {
			logChat(analyticsData);
		}

		console.log('🔍 [ChatController] Response composed:', {
			messageLength: response.message.length,
			hasActions: !!response.actions?.length,
			hasCards: !!response.cards?.length,
			responseTime: analyticsData.responseTimeMs + 'ms',
		});

		return response;
	}

	/**
	 * Try to get grounded response using local data
	 */
	private async tryGrounded(
		intent: IntentType,
		input: { query: string },
		context: ChatContext
	) {
		try {
			return await this.groundingService.tryGrounded(intent, input);
		} catch (error) {
			console.warn('🔍 [ChatController] Grounding failed:', error);
			return null;
		}
	}

	/**
	 * Generate narration using the selected model
	 */
	private async generateNarration(
		model: ModelTier,
		facts: any,
		userProfile: any,
		query: string
	): Promise<string> {
		try {
			// Use the hybrid cost optimization for narration
			const hybridResult = await executeHybridCostOptimization(
				query,
				'GENERAL_QA', // Use general QA intent for narration
				{ budgets: [], goals: [], transactions: [] }, // Minimal context for narration
				query
			);

			return hybridResult.message;
		} catch (error) {
			console.warn('🔍 [ChatController] Hybrid narration failed:', error);

			// Fallback to simple template-based narration
			return this.templateBasedNarration(facts, userProfile);
		}
	}

	/**
	 * Get local ML categorization with rationale
	 */
	private async getLocalMLInsights(
		intent: IntentType,
		facts: any,
		query: string
	): Promise<{ insights: string[]; rationale: string; confidence: number }> {
		try {
			// Simulate local ML analysis
			const insights: string[] = [];
			let rationale = '';
			let confidence = 0.8;

			switch (intent) {
				case 'GET_BUDGET_STATUS':
					if (facts.budgets) {
						const totalSpent = facts.budgets.reduce(
							(sum: number, b: any) => sum + (b.spent || 0),
							0
						);
						const totalBudget = facts.budgets.reduce(
							(sum: number, b: any) => sum + b.amount,
							0
						);
						const utilization = totalSpent / totalBudget;

						insights.push(
							`${Math.round(utilization * 100)}% budget utilization`
						);

						if (utilization > 0.8) {
							insights.push('High budget pressure detected');
							rationale =
								'vendor match + amount pattern indicates overspending risk';
							confidence = 0.9;
						}
					}
					break;

				case 'FORECAST_SPEND':
					if (facts.transactions) {
						const recentTrend = this.analyzeSpendingTrend(facts.transactions);
						insights.push(recentTrend.direction);
						insights.push(`Monthly variance: ${recentTrend.variance}%`);
						rationale = 'amount pattern + date clustering shows spending trend';
						confidence = 0.85;
					}
					break;

				case 'OPTIMIZE_SPENDING':
					if (facts.subscriptions) {
						const lowUtility = facts.subscriptions.filter(
							(s: any) => s.usage < 0.3
						);
						if (lowUtility.length > 0) {
							insights.push(
								`${lowUtility.length} low-utility subscriptions identified`
							);
							rationale = 'usage pattern + payment frequency analysis';
							confidence = 0.88;
						}
					}
					break;

				default:
					insights.push('General financial insights available');
					rationale = 'standard categorization based on available data';
					confidence = 0.7;
			}

			return { insights, rationale, confidence };
		} catch (error) {
			console.warn('🔍 [ChatController] Local ML insights failed:', error);
			return {
				insights: [],
				rationale: 'analysis unavailable',
				confidence: 0.5,
			};
		}
	}

	/**
	 * Analyze spending trend from transactions
	 */
	private analyzeSpendingTrend(transactions: any[]): {
		direction: string;
		variance: number;
	} {
		if (transactions.length < 10) {
			return { direction: 'Insufficient data for trend analysis', variance: 0 };
		}

		// Simple trend analysis
		const monthlyTotals = transactions.reduce((acc: any, t: any) => {
			const month = new Date(t.date).toISOString().slice(0, 7);
			acc[month] = (acc[month] || 0) + (t.amount || 0);
			return acc;
		}, {});

		const months = Object.keys(monthlyTotals).sort();
		if (months.length < 2) {
			return { direction: 'Single month data', variance: 0 };
		}

		const recent = monthlyTotals[months[months.length - 1]];
		const previous = monthlyTotals[months[months.length - 2]];
		const variance = ((recent - previous) / previous) * 100;

		if (variance > 10)
			return {
				direction: 'Spending increasing',
				variance: Math.round(variance),
			};
		if (variance < -10)
			return {
				direction: 'Spending decreasing',
				variance: Math.round(variance),
			};
		return { direction: 'Spending stable', variance: Math.round(variance) };
	}

	/**
	 * Template-based narration when LLM is not available
	 */
	private templateBasedNarration(facts: any, userProfile: any): string {
		if (facts.note === 'no facts available') {
			return "I don't have enough information to provide a detailed response. Please try asking a more specific question or check your financial data.";
		}

		const factCount = Object.keys(facts).length;
		return `Based on the available information (${factCount} data points), I can help you with your financial questions. What specific aspect would you like me to focus on?`;
	}

	/**
	 * Critic validation using mini model
	 */
	private async criticValidation(
		model: ModelTier,
		narration: string,
		facts: any
	): Promise<{ ok: boolean; text: string; issues?: string[] }> {
		try {
			// Simple rule-based critic for now
			const issues: string[] = [];

			// Check for forbidden patterns
			const forbiddenPatterns = [
				/invest.*money/i,
				/buy.*stock/i,
				/cryptocurrency/i,
				/financial.*advice/i,
				/guarantee.*return/i,
				/risk.*free/i,
			];

			forbiddenPatterns.forEach((pattern) => {
				if (pattern.test(narration)) {
					issues.push(`Contains forbidden pattern: ${pattern.source}`);
				}
			});

			// Check fact consistency
			if (
				facts.note === 'no facts available' &&
				narration.includes('Based on your data')
			) {
				issues.push('Claims data without facts');
			}

			// Check for overly generic responses
			if (narration.length < 50) {
				issues.push('Response too short');
			}

			const ok = issues.length === 0;

			return {
				ok,
				text: narration,
				issues: ok ? undefined : issues,
			};
		} catch (error) {
			console.warn('🔍 [ChatController] Critic validation failed:', error);
			return {
				ok: false,
				text: narration,
				issues: ['Critic validation failed'],
			};
		}
	}

	/**
	 * Post-process validated narration into structured response
	 */
	private async postProcessToResponse(
		narration: string,
		facts: any,
		intent: IntentType
	): Promise<ChatResponse> {
		try {
			// Get local ML insights and rationale
			const mlInsights = await this.getLocalMLInsights(
				intent,
				facts,
				narration
			);

			// Use the existing composeStructuredResponse function
			const structuredResponse = await composeStructuredResponse(narration);

			// Enhance with local ML insights
			const enhancedResponse: ChatResponse = {
				message: structuredResponse.message,
				details: structuredResponse.details,
				cards: structuredResponse.cards,
				actions: structuredResponse.actions,
				sources: structuredResponse.sources,
				cost: structuredResponse.cost,
				insights: mlInsights.insights,
				rationale: mlInsights.rationale,
				confidence: mlInsights.confidence,
			};

			// Ensure response consistency
			return ensureResponseConsistency(enhancedResponse);
		} catch (error) {
			console.warn('🔍 [ChatController] Post-processing failed:', error);

			// Fallback to simple response with local ML insights
			const mlInsights = await this.getLocalMLInsights(
				intent,
				facts,
				narration
			);

			const fallbackResponse: ChatResponse = {
				message: narration,
				details: 'Response generated from validated narration',
				cards: [],
				actions: [],
				sources: [{ kind: 'gpt', note: 'post_processed' }],
				cost: { model: 'mini', estTokens: this.estimateTokens(narration) },
				insights: mlInsights.insights,
				rationale: mlInsights.rationale,
				confidence: mlInsights.confidence,
			};

			return ensureResponseConsistency(fallbackResponse);
		}
	}

	/**
	 * Compose response from facts without LLM
	 */
	private async composeFromFactsWithoutLLM(
		intent: IntentType,
		facts: any,
		query: string
	): Promise<ChatResponse> {
		try {
			// Use the existing composeStructuredResponse with a simple prompt
			const simplePrompt = `Based on the facts: ${JSON.stringify(
				facts
			)}, answer: ${query}`;
			const structuredResponse = await composeStructuredResponse(simplePrompt);

			return {
				message: structuredResponse.message,
				details: structuredResponse.details,
				cards: structuredResponse.cards,
				actions: structuredResponse.actions,
				sources: structuredResponse.sources,
				cost: structuredResponse.cost,
			};
		} catch (error) {
			console.warn('🔍 [ChatController] Fact-based composition failed:', error);

			// Simple fallback
			return {
				message: `I have some information that might help: ${JSON.stringify(
					facts
				)}`,
				details: 'Response composed from available facts',
				cards: [],
				actions: [],
				sources: [{ kind: 'db', note: 'fact_based' }],
				cost: { model: 'mini', estTokens: 50 },
			};
		}
	}

	/**
	 * Estimate token count for text
	 */
	private estimateTokens(text: string): number {
		// Rough estimation: 1 token ≈ 4 characters
		return Math.ceil(text.length / 4);
	}

	/**
	 * Determine response source for analytics
	 */
	private getResponseSource(
		vetted: any,
		grounded: any,
		narration: string | null
	): string {
		if (vetted?.ok && narration) {
			return 'validated_narration';
		} else if (
			grounded &&
			grounded.confidence > this.config.fallbackThreshold
		) {
			return 'grounded_facts';
		} else if (narration) {
			return 'failed_critic';
		} else {
			return 'helpful_fallback';
		}
	}

	/**
	 * Update configuration
	 */
	updateConfig(newConfig: Partial<ChatControllerConfig>): void {
		this.config = { ...this.config, ...newConfig };
		console.log('🔍 [ChatController] Configuration updated:', this.config);
	}

	/**
	 * Get current configuration
	 */
	getConfig(): ChatControllerConfig {
		return { ...this.config };
	}

	/**
	 * Reset controller state
	 */
	reset(): void {
		// Reset any internal state if needed
		console.log('🔍 [ChatController] Controller reset');
	}
}

// Convenience function for quick usage
export async function handleUserMessage(
	query: string,
	context: ChatContext,
	config?: Partial<ChatControllerConfig>
): Promise<ChatResponse> {
	const controller = new ChatController(context, config);
	return controller.handleUserMessage(query, context);
}
