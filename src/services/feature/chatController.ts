// chatController.ts - End-to-end chat flow controller
// Glues together intent detection, grounding, model selection, narration, critic validation, and analytics

import { enhancedIntentMapper } from '../../services/assistant/enhancedIntentMapper';
import { IntentType, routeIntent } from '../../services/assistant/intentMapper';
import { GroundingService } from './groundingService';
import {
	pickModel,
	executeHybridCostOptimization,
	ModelTier,
} from '../../services/assistant/routeModel';
import { logChat } from './analyticsService';
import {
	composeStructuredResponse,
	ChatResponse,
	ensureResponseConsistency,
} from '../../services/assistant/responseSchema';
import { ConversationState } from '../ConversationState';
import { handleActionIntent } from './actionHandler';
import { nanoid } from 'nanoid';
import { helpfulFallback } from '../../services/assistant/helpfulFallbacks';
import { EnhancedTieredAIService } from './enhancedTieredAIService';
import { evaluateAnswerability } from '../../services/assistant/answerability';
import {
	scoreUsefulness,
	answersTheQuestion,
} from '../../services/assistant/usefulness';
import {
	criticChecks,
	shouldBlockResponse,
} from '../../services/assistant/criticMini';
import { buildSpendingPlan } from '../../services/assistant/planners/spendingPlan';
import {
	composeActionableAsk,
	composeTable,
} from '../../components/assistant/shared/actionableAsk';
import { composeAnswer } from '../../components/assistant/shared/composeAnswer';
import { simpleQALane } from '../../services/assistant/simpleQALane';
import { hysaResearchAgent } from '../../services/assistant/agents/hysaResearchAgent';
import { trySkills } from '../../services/assistant/skills/engine';

export interface ChatContext {
	userProfile?: {
		userId?: string;
		monthlyIncome?: number;
		financialGoal?: string;
		riskProfile?: string;
	};
	accounts?: any[];
	budgets?: any[];
	goals?: any[];
	transactions?: any[];
	recurringExpenses?: any[];
	locale?: string;
	currency?: string;
	currentUsage?: {
		subscriptionTier: string;
		currentTokens: number;
		tokenLimit: number;
	};
	sessionContext?: {
		currentFocus?: string;
		focusSetAt?: number;
		focusExpiry?: number;
		actions?: string[];
		awaitingConsent?: string;
		pendingQuery?: string;
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
		this.groundingService = new GroundingService(context as any);
		this.aiService = new EnhancedTieredAIService(context as any);
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

			// Step 0: Check for pending action confirmations first
			const conversationId = ConversationState.getConversationId();
			const routeResult = routeIntent(query, conversationId);

			if (
				routeResult.mode === 'ACTIONS' &&
				routeResult.intent === 'CONFIRM_PENDING_ACTION'
			) {
				return await handleActionIntent(conversationId);
			}

			if (routeResult.intent === 'DECLINE_PENDING_ACTION') {
				ConversationState.clearPendingAction(conversationId);
				return {
					message: 'No problem! What else can I help you with?',
					sources: [{ kind: 'cache' }],
					cost: { model: 'mini', estTokens: 10 },
				} as ChatResponse;
			}

			// Step 1: Enhanced intent detection with multi-label support
			const routeDecision = await enhancedIntentMapper.makeRouteDecision(
				query,
				context
			);
			const intent = routeDecision.primary.intent;

			// Step 1.1: Check for affirmative responses to consent cards
			const isAffirmative =
				/\b(yes|yeah|yep|sure|ok(?:ay)?|please|do it|go ahead|sounds good)\b/i.test(
					query
				);
			if (
				context.sessionContext?.awaitingConsent === 'FETCH_HYSA_PICKS' &&
				isAffirmative
			) {
				console.log(
					'🔍 [ChatController] Detected affirmative response to HYSA consent'
				);
				context.sessionContext.actions = ['FETCH_HYSA_PICKS'];
				context.sessionContext.awaitingConsent = undefined;
				// Force-run HYSA research with the pending query
				const HYSA_SKILL = (
					await import('../../services/assistant/skills/packs/hysa')
				).HYSA_SKILL;
				const res = await HYSA_SKILL.researchAgent!(
					context.sessionContext.pendingQuery ?? query,
					context
				);
				if (res) {
					console.log(
						'🔍 [ChatController] HYSA research agent success from affirmative response'
					);
					return res.response as ChatResponse;
				}
				// If research fails, continue with normal flow
			}
				primary: routeDecision.primary.intent,
				confidence: routeDecision.primary.calibratedP,
				routeType: routeDecision.routeType,
				secondary: routeDecision.secondary?.map((s) => s.intent),
			});

			// Step 1.25: Topic override - Force Simple-QA for investing questions misrouted to budget
			const investingKW =
				/\b(invest|investing|stocks?|etfs?|index\s+funds?)\b/i.test(query);
			if (routeDecision.primary.intent === 'GET_BUDGET_STATUS' && investingKW) {
				console.log(
					'🔍 [ChatController] Topic override: Budget intent but investing keywords detected, forcing Simple-QA'
				);
				const simpleResult = await simpleQALane.tryAnswer(
					query,
					context,
					'GENERAL_QA'
				);
				if (simpleResult) {
					console.log(
						'🔍 [ChatController] Topic override successful, using Simple-QA response'
					);
					return simpleResult.response;
				}
			}

			// Step 1.5: Simple QA Lane - Try to answer simple questions immediately
			if (simpleQALane.shouldUseSimpleQA(query, intent)) {
				const simpleResult = await simpleQALane.tryAnswer(
					query,
					context,
					intent
				);
				if (simpleResult) {
						usedMicroSolver: simpleResult.usedMicroSolver,
						usedKnowledgeBase: simpleResult.usedKnowledgeBase,
						usedMiniModel: simpleResult.usedMiniModel,
						timeToFirstToken: simpleResult.timeToFirstToken,
						totalTokens: simpleResult.totalTokens,
					});

					// Log Simple QA analytics
					analyticsData = {
						intent: intent,
						usedGrounding: false,
						model: 'simpleQA',
						tokensIn: this.estimateTokens(query),
						tokensOut: simpleResult.totalTokens,
						hadActions: !!simpleResult.response.actions?.length,
						hadCard: !!simpleResult.response.cards?.length,
						fallback: false,
						responseTimeMs: Date.now() - startTime,
						groundingConfidence: 0,
						messageLength: simpleResult.response.message.length,
						hasFinancialData: !!(
							context.budgets?.length ||
							context.goals?.length ||
							context.transactions?.length
						),
						criticPassed: true,
						narrationGenerated: false,
						responseSource: 'simpleQA',
						simpleQAMetrics: {
							usedMicroSolver: simpleResult.usedMicroSolver,
							usedKnowledgeBase: simpleResult.usedKnowledgeBase,
							usedMiniModel: simpleResult.usedMiniModel,
							timeToFirstToken: simpleResult.timeToFirstToken,
						},
					};

					if (this.config.enableAnalytics) {
						logChat(analyticsData);
					}

					return simpleResult.response; // only returns if the score passed inside tryAnswer
				}
				// otherwise fall through to grounding/model routing as usual
			}

			// Step 1.5: Skill Engine - Try hybrid skills for finance topics
			const skillResp = await trySkills(query, context);
			if (skillResp) {

				// Set session context focus for HYSA topics
				if (
					skillResp.message?.toLowerCase().includes('hysa') ||
					skillResp.message?.toLowerCase().includes('high-yield') ||
					skillResp.message?.toLowerCase().includes('savings')
				) {
					context.sessionContext = context.sessionContext || {};
					context.sessionContext.currentFocus = 'HYSA';
					context.sessionContext.focusSetAt = Date.now();
				}

				// Log skill engine analytics
				analyticsData = {
					intent: intent,
					usedGrounding: false,
					model: 'skillEngine',
					tokensIn: this.estimateTokens(query),
					tokensOut: this.estimateTokens(skillResp.message),
					hadActions: !!skillResp.actions?.length,
					hadCard: !!skillResp.cards?.length,
					fallback: false,
					responseTimeMs: Date.now() - startTime,
					groundingConfidence: 0,
					messageLength: skillResp.message.length,
					hasFinancialData: !!(
						context.budgets?.length ||
						context.goals?.length ||
						context.transactions?.length
					),
					criticPassed: true,
					narrationGenerated: false,
					responseSource: 'skillEngine',
				};

				if (this.config.enableAnalytics) {
					logChat(analyticsData);
				}

				return skillResp;
			}

			// Step 1.55: HYSA Research Agent - Handle specific HYSA recommendations (legacy)
			if (intent === 'HYSA_RECOMMENDATIONS') {
				console.log(
					'🔍 [ChatController] Using HYSA research agent for:',
					query
				);
				const research = await hysaResearchAgent.findRecommendations(
					query,
					context
				);
				if (research) {
					return research;
				}
				// If research fails, fall through to other methods
			}

			// Step 1.6: Answerability Gate - Check if we have enough data
			const answerability = evaluateAnswerability(intent, context);
				level: answerability.level,
				missing: answerability.missing,
				reason: answerability.reason,
			});

			// If answerability is low/none, try graceful degradation
			if (answerability.level === 'low' || answerability.level === 'none') {
				// Try Simple QA lane for graceful degradation
				const gracefulFallback = await simpleQALane.getGracefulFallback(
					query,
					context,
					answerability.missing
				);

				if (gracefulFallback) {
					console.log(
						'🔍 [ChatController] Using graceful fallback for answerability failure'
					);
					return gracefulFallback;
				}

				// Fallback to actionable ask if Simple QA can't help
				const actions = [
					{ label: 'Add monthly income', action: 'OPEN_INCOME_FORM' },
					{ label: 'Add fixed bills', action: 'OPEN_RECURRING_FORM' },
					{ label: 'Create a goal', action: 'OPEN_GOAL_WIZARD' },
				];

				return composeActionableAsk({
					headline: 'I can personalize this for you',
					missing: answerability.missing,
					actions,
				});
			}

			// Step 2: Try grounding first (with enhanced confidence)
			const grounded = await this.tryGrounded(
				intent as IntentType,
				{ query },
				context
			);
				success: !!grounded,
				confidence: grounded?.confidence,
				payload: grounded?.payload ? 'has_data' : 'no_data',
			});

			// Step 3: Pick appropriate model
			const model = pickModel(intent as IntentType, query);

			// Step 4: Extract facts from grounding
			const facts = grounded?.payload ?? { note: 'no facts available' };
				hasFacts: !!grounded?.payload,
				factCount: grounded?.payload ? Object.keys(grounded.payload).length : 0,
			});

			// Step 4.5: Handle new intents with concrete composers
			if (intent === 'GET_SPENDING_PLAN') {
				const plan = buildSpendingPlan(context);
				if (!plan) {
					return composeActionableAsk({
						headline: 'I can create a spending plan for you',
						missing: ['monthly take-home income', 'fixed monthly bills'],
						actions: [
							{ label: 'Add monthly income', action: 'OPEN_INCOME_FORM' },
							{ label: 'Add fixed bills', action: 'OPEN_RECURRING_FORM' },
						],
					});
				}
				return composeTable({
					message: `Here's a starting plan tailored to your numbers.`,
					rows: plan.rows,
					actions: plan.actions,
					insights: plan.insights,
					sources: [{ kind: 'localML' }],
				});
			}

			if (intent === 'GOAL_ALLOCATION') {
				// Simple fallback for goal allocation
				return {
					message:
						'I can help you allocate your savings across goals. Please add your goals and monthly savings target first.',
					actions: [
						{ label: 'Add Goals', action: 'OPEN_GOAL_WIZARD' },
						{ label: 'Set Savings Target', action: 'OPEN_INCOME_FORM' },
					],
					sources: [{ kind: 'cache' }],
					cost: { model: 'mini', estTokens: 20 },
				};
			}

			if (intent === 'OVERVIEW') {
				// Handle financial overview with grounded data
				const {
					buildFinancialOverview,
					renderOverviewResponse,
					renderNoDataOnboarding,
				} = await import('../../services/assistant/playbooks/overviewPlaybook');

				// Check if we have any financial data
				const hasAnyData = !!(
					context.budgets?.length ||
					context.goals?.length ||
					context.transactions?.length
				);

				if (hasAnyData) {
					// Generate grounded overview
					const overview = buildFinancialOverview(context, 'last_30d');
					const response = renderOverviewResponse(overview, context);

						cashflow: overview.cashflow,
						categories: overview.categories.length,
						budgets: overview.budgets.length,
						goals: overview.goals.length,
						alerts: overview.alerts.length,
					});

					return response;
				} else {
					// Show onboarding for users with no data
					return renderNoDataOnboarding();
				}
			}

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
				response = await this.postProcessToResponse(
					vetted.text,
					facts,
					intent as IntentType
				);
			} else if (
				grounded &&
				routeDecision.primary.calibratedP > this.config.fallbackThreshold
			) {
				// Use grounded facts without LLM
				response = await this.composeFromFactsWithoutLLM(
					intent as IntentType,
					facts,
					query
				);
			} else {
				// Fallback to helpful response
				response = helpfulFallback(query, context);
			}

			// Step 7.5: Critic pass - Check for low-value responses
			if (shouldBlockResponse(response)) {
				console.log(
					'🔍 [ChatController] Response blocked by critic:',
					criticChecks(response)
				);
				// Force LLM tier (don't reuse `model`)
				if (this.config.enableLLM && routeDecision.routeType !== 'llm') {
					try {
						const escalated = await this.generateNarration(
							'LLM_PRO' as ModelTier, // Force the big model
							facts,
							context.userProfile,
							query
						);
						if (escalated) {
							response = await this.postProcessToResponse(
								escalated,
								facts,
								intent as IntentType
							);
						}
					} catch (e) {
						console.warn('Escalation failed:', e);
					}
				}
				// Re-run critic; if still bad, return an actionable ask instead of generic
				if (shouldBlockResponse(response)) {
					return composeActionableAsk({
						headline: 'I can personalize this for you',
						missing: evaluateAnswerability(intent, context).missing,
						actions: [
							{ label: 'Add monthly income', action: 'OPEN_INCOME_FORM' },
							{ label: 'Add fixed bills', action: 'OPEN_RECURRING_FORM' },
							{ label: 'Create a goal', action: 'OPEN_GOAL_WIZARD' },
						],
					});
				}
			}

			// Step 7.6: Usefulness scoring and escalation
			const usefulnessScore = scoreUsefulness(response, query);
			const complexity = this.analyzeComplexity(query, intent as IntentType);

			const needsEscalation = (() => {
				const min = complexity === 'high' ? 5 : complexity === 'medium' ? 4 : 3;
				return usefulnessScore < min;
			})();
			if (
				needsEscalation &&
				routeDecision.routeType !== 'llm' &&
				this.config.enableLLM
			) {
				console.log(
					'🔍 [ChatController] Escalating due to low usefulness:',
					usefulnessScore
				);
				const escalated = await this.generateNarration(
					'LLM_PRO' as ModelTier,
					facts,
					context.userProfile,
					query
				);
				if (escalated)
					response = await this.postProcessToResponse(
						escalated,
						facts,
						intent as IntentType
					);
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
				error: (error as Error).message,
			};
		}

		// Step 9: Log analytics
		if (this.config.enableAnalytics) {
			logChat(analyticsData);
		}

		// Step 9: Topicality guard - ensure response answers the user's question
		if (!answersTheQuestion(response.message, query)) {
			console.log(
				'🔍 [ChatController] Topicality guard: Response does not answer the question, trying Simple-QA fallback'
			);
			const simpleResult = await simpleQALane.tryAnswer(
				query,
				context,
				'GENERAL_QA'
			);
			if (simpleResult) {
				console.log(
					'🔍 [ChatController] Topicality guard: Using Simple-QA fallback response'
				);
				return simpleResult.response;
			}
			// If Simple-QA also fails, log the off-topic rejection and continue with original response
			console.log(
				'🔍 [ChatController] Topicality guard: Simple-QA fallback also failed, proceeding with original response'
			);
		}

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
			return await this.groundingService.tryGrounded(intent as any, input);
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
				'GENERAL_QA' as IntentType, // Use general QA intent for narration
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

				case 'OPTIMIZE_SPENDING' as any:
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

			// Check if this is a "no budgets" response and add pending action
			let enhancedActions = structuredResponse.actions;
			if (
				narration.includes('no budgets set up yet') &&
				facts.budgets &&
				facts.budgets.length === 0
			) {
				const conversationId = ConversationState.getConversationId();
				const pendingAction = {
					id: nanoid(),
					type: 'CREATE_BUDGET' as const,
					params: {
						category: 'groceries',
						period: 'monthly' as const,
						amount: 300,
					},
				};

				ConversationState.setPendingAction(conversationId, pendingAction);

				enhancedActions = [
					{
						label: 'Create Budget',
						action: 'CREATE_BUDGET' as any,
						params: pendingAction.params,
					},
					{
						label: 'View Details',
						action: 'OPEN_BUDGETS',
						params: { period: 'mtd', category: 'groceries' },
					},
				];

				// Update the message to include the question
				structuredResponse.message = `${structuredResponse.message} Want me to create a Groceries budget for you?`;
			}

			// Enhance with local ML insights
			const enhancedResponse: ChatResponse = {
				message: structuredResponse.message,
				details: structuredResponse.details,
				cards: structuredResponse.cards,
				actions: enhancedActions,
				sources: structuredResponse.sources,
				cost: structuredResponse.cost,
				insights: mlInsights.insights,
				rationale: mlInsights.rationale,
				confidence: mlInsights.confidence,
			};

			// Ensure response consistency
			const finalResponse = ensureResponseConsistency(enhancedResponse);

			// Debug logging to verify message composition
			console.log(
				'[AI message OUT]',
				JSON.stringify(
					{
						text: finalResponse.message,
						summary: finalResponse.summary,
						message: finalResponse.message,
						details: finalResponse.details,
						cards: finalResponse.cards?.length ?? 0,
						actions: finalResponse.actions,
					},
					null,
					2
				)
			);

			return finalResponse;
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

			const finalFallbackResponse = ensureResponseConsistency(fallbackResponse);

			// Debug logging for fallback response
			console.log(
				'[AI message OUT - FALLBACK]',
				JSON.stringify(
					{
						text: finalFallbackResponse.message,
						summary: finalFallbackResponse.summary,
						message: finalFallbackResponse.message,
						details: finalFallbackResponse.details,
						cards: finalFallbackResponse.cards?.length ?? 0,
						actions: finalFallbackResponse.actions,
					},
					null,
					2
				)
			);

			return finalFallbackResponse;
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
			// Use the new composer system
			const answer = composeAnswer(intent, facts, query, __DEV__);

			return {
				message: answer.text,
				cards: answer.structuredResponse?.cards || [],
				actions: (answer.structuredResponse?.actions || []).map((a) => ({
					...a,
					action: a.action as any,
				})),
				details: answer.structuredResponse?.details,
				sources: [{ kind: 'db', note: 'fact_based' }],
				cost: { model: 'mini', estTokens: 50 },
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
	}

	/**
	 * Get current configuration
	 */
	getConfig(): ChatControllerConfig {
		return { ...this.config };
	}

	/**
	 * Analyze query complexity for escalation decisions
	 */
	private analyzeComplexity(
		query: string,
		intent: IntentType
	): 'low' | 'medium' | 'high' {
		// Simple complexity analysis based on query length and intent
		const queryLength = query.length;
		const wordCount = query.split(/\s+/).length;

		// High complexity indicators
		if (wordCount > 20 || queryLength > 150) {
			return 'high';
		}

		// Medium complexity indicators
		if (wordCount > 10 || queryLength > 80) {
			return 'medium';
		}

		// Intent-based complexity adjustments
		const complexIntents = [
			'FORECAST_SPEND',
			'GET_SPENDING_BREAKDOWN',
			'OPTIMIZE_SPENDING',
		];
		if (complexIntents.includes(intent)) {
			return 'medium';
		}

		return 'low';
	}

	/**
	 * Reset controller state
	 */
	reset(): void {
		// Reset any internal state if needed
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
