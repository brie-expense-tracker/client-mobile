import { ApiService } from '../core/apiService';
import { Budget, Goal, Transaction } from '../../types';
import { GroundingService, detectIntent, Intent } from './groundingService';
import { ResponseFormatterService } from './responseFormatterService';
import {
	executeHybridCostOptimization,
	pickModel,
	ModelTier,
	calculateCostSavings,
} from '../../components/assistant/routeModel';
import {
	answerWithCascade,
	CascadeResult,
	FactPack,
	logCascadeEvent,
} from '../../components/assistant/ai';

export interface EnhancedTieredAIResponse {
	response: string;
	sessionId: string;
	timestamp: Date;
	modelUsed: string;
	complexity: 'low' | 'medium' | 'high';
	confidence: number;
	wasGrounded: boolean;
	groundingConfidence?: number;
	usage?: {
		estimatedTokens: number;
		remainingTokens: number;
		remainingRequests: number;
		cost: number;
	};
	hybridOptimization?: {
		modelTier: ModelTier;
		totalTokens: number;
		totalCost: number;
		costSavings: {
			savings: number;
			percentage: number;
		};
		steps: Array<{
			step: string;
			description: string;
			modelUsed: ModelTier;
			tokenCount: number;
			cost: number;
		}>;
		criticValidation?: {
			isValid: boolean;
			ruleValidation: {
				passed: boolean;
				guardFailed?: string;
				issues: string[];
			};
			numericGuardrails: {
				amountsNonNegative: boolean;
				sumsMatchFactPack: boolean;
				datesInsideWindow: boolean;
				budgetLimitsRespected: boolean;
			};
			claimTypes: {
				hasForbiddenPhrasing: boolean;
				riskLevel: 'low' | 'medium' | 'high';
			};
			escalationTriggered: boolean;
			escalationReason?: string;
		};
	};
	// New cascade integration
	cascadeResult?: CascadeResult;
}

export interface FinancialContext {
	budgets: Budget[];
	goals: Goal[];
	transactions: Transaction[];
	userProfile?: {
		monthlyIncome?: number;
		financialGoal?: string;
		riskProfile?: string;
	};
}

export interface ComplexityAnalysis {
	complexity: 'low' | 'medium' | 'high';
	confidence: number;
	reasoning: string;
	estimatedTokens: number;
}

export class EnhancedTieredAIService {
	private sessionId: string;
	private context: FinancialContext;
	private conversationHistory: string[] = [];
	private modelUsageStats = {
		low: 0,
		medium: 0,
		high: 0,
		totalTokens: 0,
		totalCost: 0,
		groundedResponses: 0,
		llmResponses: 0,
	};
	private groundingService: GroundingService;
	private responseFormatter: ResponseFormatterService;
	private apiService: ApiService;

	constructor(context: FinancialContext, apiService?: ApiService) {
		this.sessionId = this.generateSessionId();
		this.context = context;
		this.groundingService = new GroundingService(context);
		this.responseFormatter = new ResponseFormatterService();
		this.apiService = apiService || new ApiService();
	}

	/**
	 * Generate a unique session ID for this conversation
	 */
	private generateSessionId(): string {
		return `enhanced_tiered_ai_session_${Date.now()}_${Math.random()
			.toString(36)
			.substr(2, 9)}`;
	}

	/**
	 * Main method to get AI response with grounding layer
	 */
	async getResponse(query: string): Promise<EnhancedTieredAIResponse> {
		console.log('🔍 [EnhancedTieredAI] Processing query:', query);

		// Step 1: Detect intent
		const intent = detectIntent(query);
		console.log('🔍 [EnhancedTieredAI] Detected intent:', intent);

		// Step 2: Try grounding layer first
		const groundedResponse = await this.tryGroundedResponse(query, intent);

		if (groundedResponse && groundedResponse.confidence > 0.6) {
			// Use grounded response
			console.log(
				'🔍 [EnhancedTieredAI] Using grounded response, confidence:',
				groundedResponse.confidence
			);
			this.modelUsageStats.groundedResponses++;

			const formattedResponse = this.responseFormatter.formatGroundedResponse(
				groundedResponse,
				query
			);

			return {
				response: formattedResponse,
				sessionId: this.sessionId,
				timestamp: new Date(),
				modelUsed: 'grounding_layer',
				complexity: 'low',
				confidence: groundedResponse.confidence,
				wasGrounded: true,
				groundingConfidence: groundedResponse.confidence,
				usage: {
					estimatedTokens: 0, // No tokens used
					remainingTokens: 10000, // Assume full limit
					remainingRequests: 50,
					cost: 0,
				},
			};
		}

		// Step 3: Try cascade system for complex queries
		console.log('🔍 [EnhancedTieredAI] Trying cascade system');
		try {
			const factPack = this.createFactPackFromContext();
			const cascadeResult = await answerWithCascade({
				userId: 'user', // You'll need to get this from context
				intent,
				userQuery: query,
				factPack,
			});

			// Log cascade analytics
			logCascadeEvent('user_outcome', {
				resolved: cascadeResult.kind === 'answer',
				path_taken: cascadeResult.analytics.decision_path,
				total_tokens:
					cascadeResult.analytics.writer_tokens +
					cascadeResult.analytics.critic_tokens +
					(cascadeResult.analytics.improver_tokens || 0),
				total_cost: 0, // Calculate based on your token costs
			});

			// Return cascade response
			if (
				cascadeResult.kind === 'answer' &&
				'answer_text' in cascadeResult.data
			) {
				return {
					response: cascadeResult.data.answer_text,
					sessionId: this.sessionId,
					timestamp: new Date(),
					modelUsed: 'cascade_system',
					complexity: 'medium',
					confidence: 0.9,
					wasGrounded: true,
					groundingConfidence: 0.9,
					usage: {
						estimatedTokens:
							cascadeResult.analytics.writer_tokens +
							cascadeResult.analytics.critic_tokens +
							(cascadeResult.analytics.improver_tokens || 0),
						remainingTokens: 10000,
						remainingRequests: 50,
						cost: 0,
					},
					cascadeResult,
				};
			}

			// Handle clarification or escalation
			console.log(
				'🔍 [EnhancedTieredAI] Cascade requires clarification or escalation'
			);
		} catch (error) {
			console.warn(
				'🔍 [EnhancedTieredAI] Cascade failed, falling back to LLM:',
				error
			);
		}

		// Step 4: Fall back to LLM with appropriate model selection
		console.log('🔍 [EnhancedTieredAI] Using LLM fallback');
		this.modelUsageStats.llmResponses++;

		return await this.getLLMResponse(query, intent);
	}

	/**
	 * Try to get a grounded response using local data and rules
	 */
	private async tryGroundedResponse(query: string, intent: Intent) {
		try {
			// Extract additional context for categorization
			let input = undefined;
			if (intent === 'CATEGORIZE_TX') {
				// Try to extract amount and description from query
				const amountMatch = query.match(/\$?(\d+(?:\.\d{2})?)/);
				const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
				const description = query.replace(/\$?\d+(?:\.\d{2})?/g, '').trim();

				if (amount > 0 && description) {
					input = { description, amount };
				}
			}

			return await this.groundingService.tryGrounded(intent, input);
		} catch (error) {
			console.warn('🔍 [EnhancedTieredAI] Grounding failed:', error);
			return null;
		}
	}

	/**
	 * Get LLM response with appropriate model selection
	 */
	private async getLLMResponse(
		query: string,
		intent: Intent
	): Promise<EnhancedTieredAIResponse> {
		// Analyze complexity to select appropriate model
		const complexity = this.estimateComplexity(query, intent);

		// Select model based on complexity and intent
		const modelUsed = this.selectModel(complexity, intent);

		try {
			// Prepare context for LLM
			const llmContext = this.prepareLLMContext(query, intent);

			// Call appropriate LLM endpoint
			const llmResponse = await this.callLLM(modelUsed, llmContext);

			// Update usage stats
			this.updateUsageStats(complexity, llmResponse.usage);

			return {
				response: llmResponse.response,
				sessionId: this.sessionId,
				timestamp: new Date(),
				modelUsed,
				complexity: complexity.complexity,
				confidence: complexity.confidence,
				wasGrounded: false,
				usage: llmResponse.usage,
			};
		} catch (error) {
			console.error('🔍 [EnhancedTieredAI] LLM call failed:', error);

			// Return fallback response
			return {
				response: this.getFallbackResponse(query, intent),
				sessionId: this.sessionId,
				timestamp: new Date(),
				modelUsed: 'fallback',
				complexity: 'low',
				confidence: 0.3,
				wasGrounded: false,
				usage: {
					estimatedTokens: 0,
					remainingTokens: 10000,
					remainingRequests: 50,
					cost: 0,
				},
			};
		}
	}

	/**
	 * Estimate query complexity and confidence
	 */
	private estimateComplexity(
		query: string,
		intent: Intent
	): ComplexityAnalysis {
		const q = query.toLowerCase().trim();
		let complexity: 'low' | 'medium' | 'high' = 'medium';
		let confidence = 0.7;
		let reasoning = '';
		let estimatedTokens = 800;

		// Fast path: Simple queries that can use lightweight models
		if (
			/^what'?s my/i.test(q) ||
			/^how much/i.test(q) ||
			/^show me/i.test(q) ||
			q.length < 60 ||
			/^(balance|total|amount|spent|remaining|progress)/i.test(q)
		) {
			complexity = 'low';
			confidence = 0.9;
			reasoning = 'Simple informational query';
			estimatedTokens = 400;
		}
		// Deep path: Complex planning, optimization, or edge cases
		else if (
			q.includes('optimize') ||
			q.includes('plan') ||
			q.includes('strategy') ||
			q.includes('advice') ||
			q.includes('recommend') ||
			q.includes('analyze') ||
			q.includes('compare') ||
			q.includes('forecast') ||
			q.includes('predict') ||
			q.length > 150 ||
			intent === 'CREATE_BUDGET'
		) {
			complexity = 'high';
			confidence = 0.6;
			reasoning = 'Complex planning or analysis query';
			estimatedTokens = 1200;
		}

		return {
			complexity,
			confidence,
			reasoning,
			estimatedTokens,
		};
	}

	/**
	 * Select appropriate LLM model based on complexity and intent
	 */
	private selectModel(complexity: ComplexityAnalysis, intent: Intent): string {
		// For complex queries or specific intents, use more powerful models
		if (complexity.complexity === 'high' || intent === 'CREATE_BUDGET') {
			return 'gpt-4';
		}

		// For medium complexity, use balanced model
		if (complexity.complexity === 'medium') {
			return 'gpt-3.5-turbo';
		}

		// For simple queries, use lightweight model
		return 'gpt-3.5-turbo';
	}

	/**
	 * Prepare context for LLM calls
	 */
	private prepareLLMContext(query: string, intent: Intent) {
		const context = {
			query,
			intent,
			userProfile: this.context.userProfile,
			recentTransactions: this.context.transactions.slice(-10), // Last 10 transactions
			budgetSummary: this.context.budgets.map((b) => ({
				name: b.name,
				amount: b.amount,
				period: b.period,
			})),
			goalSummary: this.context.goals.map((g) => ({
				name: g.name,
				targetAmount: g.targetAmount,
				deadline: g.deadline,
			})),
		};

		return context;
	}

	/**
	 * Call the selected LLM
	 */
	private async callLLM(model: string, context: any) {
		// This would integrate with your existing AI service
		// For now, return a mock response
		return {
			response: `I understand you're asking about ${context.intent
				.toLowerCase()
				.replace(
					/_/g,
					' '
				)}. Let me help you with that using my AI capabilities.`,
			usage: {
				estimatedTokens: 50,
				remainingTokens: 9950,
				remainingRequests: 49,
				cost: 0.001,
			},
		};
	}

	/**
	 * Get fallback response when LLM fails
	 */
	public getFallbackResponse(query: string, intent: Intent): string {
		const fallbacks = {
			GET_BALANCE:
				"I'm having trouble accessing your financial data right now. Please try again in a moment.",
			GET_BUDGET_STATUS:
				"I can't retrieve your budget information at the moment. Check back soon!",
			LIST_SUBSCRIPTIONS:
				"I'm unable to show your subscriptions right now. Please try again later.",
			CATEGORIZE_TX:
				"I can't categorize transactions at the moment. Please try again.",
			FORECAST_SPEND:
				"I'm unable to generate spending forecasts right now. Please try again later.",
			CREATE_BUDGET:
				"I can't help create budgets at the moment. Please try again in a moment.",
			GET_GOAL_PROGRESS:
				"I'm having trouble accessing your goals. Please try again soon.",
			GET_SPENDING_BREAKDOWN:
				"I can't show your spending breakdown right now. Please try again.",
			GENERAL_QA:
				"I'm experiencing some technical difficulties. Please try again in a moment.",
		};

		return fallbacks[intent] || fallbacks.GENERAL_QA;
	}

	/**
	 * Update usage statistics
	 */
	private updateUsageStats(complexity: ComplexityAnalysis, usage?: any) {
		this.modelUsageStats[complexity.complexity]++;
		this.modelUsageStats.totalTokens += usage?.estimatedTokens || 0;
		this.modelUsageStats.totalCost += usage?.cost || 0;
	}

	/**
	 * Get conversation context for the AI service
	 */
	async getConversationContext() {
		return {
			financial: {
				budgets: this.context.budgets,
				goals: this.context.goals,
				transactions: this.context.transactions,
				userProfile: this.context.userProfile,
			},
			session: {
				id: this.sessionId,
				messageCount: this.conversationHistory.length,
				usageStats: this.modelUsageStats,
			},
		};
	}

	/**
	 * Get usage statistics
	 */
	getUsageStats() {
		return {
			...this.modelUsageStats,
			groundingSuccessRate:
				this.modelUsageStats.groundedResponses /
				(this.modelUsageStats.groundedResponses +
					this.modelUsageStats.llmResponses),
			averageTokensPerResponse:
				this.modelUsageStats.totalTokens /
				(this.modelUsageStats.groundedResponses +
					this.modelUsageStats.llmResponses),
		};
	}

	/**
	 * Create a FactPack from the current context for cascade system
	 */
	private createFactPackFromContext(): FactPack {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

		return {
			time_window: {
				start: startOfMonth.toISOString(),
				end: endOfMonth.toISOString(),
				tz: 'America/Los_Angeles', // You'll want to get this from user preferences
				period: `${startOfMonth.toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric',
				})}-${endOfMonth.toLocaleDateString('en-US', { day: 'numeric' })}, PDT`,
			},
			balances:
				this.context.budgets?.map((b) => ({
					accountId: b.id,
					name: b.name,
					current: b.amount - (b.spent || 0),
					total: b.amount,
					spent: b.spent || 0,
					type: 'checking' as const,
				})) || [],
			budgets:
				this.context.budgets?.map((b) => ({
					id: b.id,
					name: b.name,
					period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
						2,
						'0'
					)}`,
					spent: b.spent || 0,
					limit: b.amount,
					remaining: b.amount - (b.spent || 0),
					utilization: b.spent ? (b.spent / b.amount) * 100 : 0,
					status:
						b.spent && b.spent >= b.amount
							? 'over'
							: b.spent && b.spent >= b.amount * 0.9
							? 'at_limit'
							: 'under',
					topCategories: [],
				})) || [],
			goals:
				this.context.goals?.map((g) => ({
					id: g.id,
					name: g.name,
					targetAmount: g.target || 0,
					currentAmount: g.current || 0,
					progress: g.percent || 0,
					remaining: (g.target || 0) - (g.current || 0),
					deadline: g.deadline?.toISOString() || now.toISOString(),
					status:
						g.percent && g.percent >= 80
							? 'ahead'
							: g.percent && g.percent >= 50
							? 'on_track'
							: 'behind',
				})) || [],
			recurring: [],
			recentTransactions:
				this.context.transactions?.slice(-30).map((t) => ({
					id: t.id,
					amount: t.amount || 0,
					category: t.category || 'Uncategorized',
					date: t.date?.toISOString() || now.toISOString(),
					type: 'expense' as const,
					description: t.description || 'Transaction',
				})) || [],
			spendingPatterns: {
				totalSpent:
					this.context.transactions?.reduce(
						(sum, t) => sum + (t.amount || 0),
						0
					) || 0,
				averageDaily: 0,
				topCategories: [],
				trend: 'stable' as const,
				comparison: {
					previousPeriod: 'Last Month',
					change: 0,
					isImprovement: true,
				},
			},
			userProfile: {
				monthlyIncome: this.context.userProfile?.monthlyIncome || 0,
				financialGoal: this.context.userProfile?.financialGoal || 'Save money',
				riskProfile: 'moderate' as const,
				preferences: {
					notifications: true,
					insights: true,
					autoCategorization: true,
				},
			},
			metadata: {
				generatedAt: now.toISOString(),
				dataVersion: '1.0',
				hash: 'demo_hash',
				source: 'local' as const,
				freshness: 0,
			},
		};
	}

	/**
	 * Add message to conversation history
	 */
	addToHistory(message: string) {
		this.conversationHistory.push(message);
		// Keep only last 20 messages to prevent memory bloat
		if (this.conversationHistory.length > 20) {
			this.conversationHistory = this.conversationHistory.slice(-20);
		}
	}

	/**
	 * Get fallback response for compatibility with existing code
	 */
	public getFallbackResponseCompat(userQuestion: string) {
		const intent = detectIntent(userQuestion);
		return {
			response: this.getFallbackResponseInternal(userQuestion, intent),
		};
	}

	/**
	 * Get personalized insights for compatibility with existing code
	 */
	async getPersonalizedInsights() {
		// Return basic insights based on available data
		const insights = [];

		if (this.context.budgets.length > 0) {
			const totalBudget = this.context.budgets.reduce(
				(sum, b) => sum + b.amount,
				0
			);
			const totalSpent = this.context.budgets.reduce(
				(sum, b) => sum + (b.spent || 0),
				0
			);
			const remaining = totalBudget - totalSpent;

			if (remaining < totalBudget * 0.1) {
				insights.push({
					type: 'budget',
					message: `You're close to your budget limit. Consider reviewing your spending.`,
					priority: 'high',
				});
			}
		}

		if (this.context.goals.length > 0) {
			const avgProgress =
				this.context.goals.reduce((sum, g) => sum + (g.percent || 0), 0) /
				this.context.goals.length;
			if (avgProgress > 80) {
				insights.push({
					type: 'goal',
					message: `Great progress on your goals! You're ${avgProgress.toFixed(
						0
					)}% complete.`,
					priority: 'medium',
				});
			}
		}

		return insights;
	}

	/**
	 * Get contextual suggestions for compatibility with existing code
	 */
	async getContextualSuggestions() {
		const suggestions = [];

		if (this.context.budgets.length === 0) {
			suggestions.push({
				text: 'Create your first budget',
				category: 'budget',
			});
		}

		if (this.context.goals.length === 0) {
			suggestions.push({
				text: 'Set a savings goal',
				category: 'goal',
			});
		}

		return suggestions;
	}

	/**
	 * Upgrade subscription method for compatibility
	 */
	async upgradeSubscription(tier?: string) {
		// This would integrate with your subscription system
		return {
			success: true,
			message: `Subscription upgrade to ${tier || 'premium'} initiated`,
		};
	}

	/**
	 * Internal fallback response method
	 */
	private getFallbackResponseInternal(query: string, intent: Intent): string {
		const fallbacks = {
			GET_BALANCE:
				"I'm having trouble accessing your financial data right now. Please try again in a moment.",
			GET_BUDGET_STATUS:
				"I can't retrieve your budget information at the moment. Check back soon!",
			LIST_SUBSCRIPTIONS:
				"I'm unable to show your subscriptions right now. Please try again later.",
			CATEGORIZE_TX:
				"I can't categorize transactions at the moment. Please try again.",
			FORECAST_SPEND:
				"I'm unable to generate spending forecasts right now. Please try again later.",
			CREATE_BUDGET:
				"I can't help create budgets at the moment. Please try again in a moment.",
			GET_GOAL_PROGRESS:
				"I'm having trouble accessing your goals. Please try again soon.",
			GET_SPENDING_BREAKDOWN:
				"I can't show your spending breakdown right now. Please try again.",
			GENERAL_QA:
				"I'm experiencing some technical difficulties. Please try again in a moment.",
		};

		return fallbacks[intent] || fallbacks.GENERAL_QA;
	}

	/**
	 * Get AI response using hybrid cost optimization with Critic + Tiered Narration
	 * Implements the 4-step process to keep hybrid costs down while maintaining quality
	 */
	async getHybridOptimizedResponse(
		query: string,
		userAsk: string
	): Promise<EnhancedTieredAIResponse> {
		console.log(
			'🔍 [EnhancedTieredAI] Using hybrid cost optimization for:',
			query
		);

		try {
			// Detect intent for routing
			const intent = detectIntent(query);
			console.log('🔍 [EnhancedTieredAI] Detected intent:', intent);

			// Execute the complete 4-step hybrid cost optimization process
			const hybridResult = await executeHybridCostOptimization(
				query,
				intent as any,
				this.context,
				userAsk
			);

			// Calculate cost savings compared to always using pro model
			const costSavings = calculateCostSavings(
				hybridResult.totalCost,
				hybridResult.totalTokens
			);

			// Update usage stats
			this.modelUsageStats.totalTokens += hybridResult.totalTokens;
			this.modelUsageStats.totalCost += hybridResult.totalCost;

			// Map model tier to complexity
			const complexityMap: Record<ModelTier, 'low' | 'medium' | 'high'> = {
				mini: 'low',
				std: 'medium',
				pro: 'high',
			};

			const response: EnhancedTieredAIResponse = {
				response: hybridResult.message,
				sessionId: this.sessionId,
				timestamp: new Date(),
				modelUsed: hybridResult.modelUsed,
				complexity: complexityMap[hybridResult.modelUsed],
				confidence: 0.8, // High confidence for hybrid approach
				wasGrounded: true, // Always grounded in hybrid approach
				groundingConfidence: 0.8,
				usage: {
					estimatedTokens: hybridResult.totalTokens,
					remainingTokens: 10000 - hybridResult.totalTokens,
					remainingRequests: 50,
					cost: hybridResult.totalCost,
				},
				hybridOptimization: {
					modelTier: hybridResult.modelUsed,
					totalTokens: hybridResult.totalTokens,
					totalCost: hybridResult.totalCost,
					costSavings,
					steps: hybridResult.steps.map((step) => ({
						step: step.step,
						description: step.description,
						modelUsed: step.modelUsed,
						tokenCount: step.tokenCount,
						cost: step.cost,
					})),
					criticValidation: hybridResult.criticValidation,
				},
			};

			console.log('🔍 [EnhancedTieredAI] Hybrid optimization completed:', {
				modelUsed: hybridResult.modelUsed,
				totalTokens: hybridResult.totalTokens,
				totalCost: hybridResult.totalCost,
				costSavings: costSavings.percentage.toFixed(2) + '%',
			});

			return response;
		} catch (error) {
			console.error('🔍 [EnhancedTieredAI] Hybrid optimization failed:', error);

			// Fallback to traditional method
			return this.getResponse(query);
		}
	}
}
