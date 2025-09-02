import { ApiService } from '../core/apiService';
import { Budget, Goal, Transaction } from '../../types';

export interface TieredAIResponse {
	response: string;
	sessionId: string;
	timestamp: Date;
	modelUsed: string;
	complexity: 'low' | 'medium' | 'high';
	confidence: number;
	usage?: {
		estimatedTokens: number;
		remainingTokens: number;
		remainingRequests: number;
		cost: number;
	};
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

export class TieredAIService {
	private sessionId: string;
	private context: FinancialContext;
	private conversationHistory: string[] = [];
	private modelUsageStats = {
		low: 0,
		medium: 0,
		high: 0,
		totalTokens: 0,
		totalCost: 0,
	};

	constructor(context: FinancialContext) {
		this.sessionId = this.generateSessionId();
		this.context = context;
	}

	/**
	 * Generate a unique session ID for this conversation
	 */
	private generateSessionId(): string {
		return `tiered_ai_session_${Date.now()}_${Math.random()
			.toString(36)
			.substr(2, 9)}`;
	}

	/**
	 * Estimate query complexity and confidence
	 */
	private estimateComplexity(
		query: string,
		context: FinancialContext
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
			/why.*(spend|save|invest|budget)/i.test(q)
		) {
			complexity = 'high';
			confidence = 0.6;
			reasoning = 'Complex analytical or planning query';
			estimatedTokens = 1200;
		}
		// Smart path: Contextual finance Q&A
		else {
			complexity = 'medium';
			confidence = 0.8;
			reasoning = 'Standard financial Q&A';
			estimatedTokens = 800;
		}

		// Adjust confidence based on context availability
		if (context.budgets.length === 0 && context.goals.length === 0) {
			confidence *= 0.8;
			reasoning += ' (limited financial context)';
		}

		return { complexity, confidence, reasoning, estimatedTokens };
	}

	/**
	 * Route to appropriate model based on complexity and confidence
	 */
	private routeModel(complexity: ComplexityAnalysis): string {
		const { complexity: comp, confidence } = complexity;

		// Fast path: lightweight model for simple queries
		if (comp === 'low' && confidence >= 0.7) {
			return 'gpt-mini';
		}
		// Deep path: top-tier model for complex queries or low confidence
		if (comp === 'high' || confidence < 0.4) {
			return 'gpt-pro';
		}
		// Smart path: mid-tier model for standard queries
		return 'gpt-standard';
	}

	/**
	 * Trim and structure context to fit token budget
	 */
	private trimContext(
		context: FinancialContext,
		tokenBudget: number = 1200
	): any {
		const { budgets, goals, transactions, userProfile } = context;

		// Calculate token usage for different context sections
		const budgetTokens = Math.min(budgets.length * 50, 300);
		const goalTokens = Math.min(goals.length * 40, 200);
		const transactionTokens = Math.min(transactions.length * 30, 300);
		const profileTokens = userProfile ? 100 : 0;

		// Determine what to include based on token budget
		const availableTokens = tokenBudget - profileTokens;

		// Prioritize budgets and goals over transactions
		const includeBudgets = Math.min(
			budgets.length,
			Math.floor((availableTokens * 0.4) / 50)
		);
		const includeGoals = Math.min(
			goals.length,
			Math.floor((availableTokens * 0.3) / 40)
		);
		const remainingTokens =
			availableTokens - includeBudgets * 50 - includeGoals * 40;
		const includeTransactions = Math.min(
			transactions.length,
			Math.floor(remainingTokens / 30)
		);

		// Create compact context
		const compactBudgets = budgets.slice(0, includeBudgets).map((b) => ({
			name: b.name,
			amount: b.amount,
			spent: b.spent || 0,
			remaining: (b.amount || 0) - (b.spent || 0),
			utilization: b.amount ? ((b.spent || 0) / b.amount) * 100 : 0,
		}));

		const compactGoals = goals.slice(0, includeGoals).map((g) => ({
			name: g.name,
			target: g.target || 0,
			current: g.current || 0,
			progress: g.target ? ((g.current || 0) / g.target) * 100 : 0,
			deadline: g.deadline,
		}));

		const compactTransactions = transactions
			.slice(-includeTransactions)
			.map((t) => ({
				amount: t.amount,
				description: t.description?.substring(0, 50), // Truncate long descriptions
				date: t.date,
				budgetId: t.budgetId,
			}));

		// Summarize conversation history (last 3 turns)
		const recentHistory = this.conversationHistory
			.slice(-3)
			.map((msg) => (msg.length > 100 ? msg.substring(0, 100) + '...' : msg));

		return {
			financialSummary: {
				totalBudgets: budgets.length,
				totalGoals: goals.length,
				totalTransactions: transactions.length,
			},
			budgets: compactBudgets,
			goals: compactGoals,
			recentTransactions: compactTransactions,
			userProfile: userProfile
				? {
						monthlyIncome: userProfile.monthlyIncome,
						financialGoal: userProfile.financialGoal,
						riskProfile: userProfile.riskProfile,
				  }
				: undefined,
			conversationHistory: recentHistory,
			contextTokenCount:
				budgetTokens + goalTokens + transactionTokens + profileTokens,
		};
	}

	/**
	 * Get AI response using tiered routing
	 */
	async getResponse(message: string): Promise<TieredAIResponse> {
		try {
			console.log('[TieredAIService] Getting response for:', message);

			// Add message to conversation history
			this.conversationHistory.push(message);

			// Analyze query complexity
			const complexity = this.estimateComplexity(message, this.context);
			console.log('[TieredAIService] Complexity analysis:', complexity);

			// Route to appropriate model
			const model = this.routeModel(complexity);
			console.log('[TieredAIService] Routing to model:', model);

			// Trim context based on complexity
			const tokenBudget = complexity.estimatedTokens;
			const trimmedContext = this.trimContext(this.context, tokenBudget);
			console.log(
				'[TieredAIService] Context trimmed to',
				tokenBudget,
				'tokens'
			);

			// Prepare request payload
			const requestPayload = {
				message: message.trim(),
				sessionId: this.sessionId,
				model,
				complexity: complexity.complexity,
				confidence: complexity.confidence,
				context: trimmedContext,
				tokenBudget,
			};

			console.log('[TieredAIService] Sending request to API:', {
				endpoint: '/api/tiered-ai/chat',
				model,
				complexity: complexity.complexity,
				tokenBudget,
			});

			const response = await ApiService.post<TieredAIResponse>(
				'/api/tiered-ai/chat',
				requestPayload
			);

			if (response.success && response.data) {
				// Update usage statistics
				this.modelUsageStats[complexity.complexity]++;
				if (response.data.usage) {
					this.modelUsageStats.totalTokens +=
						response.data.usage.estimatedTokens;
					this.modelUsageStats.totalCost += response.data.usage.cost || 0;
				}

				const result: TieredAIResponse = {
					response: response.data.response,
					sessionId: response.data.sessionId || this.sessionId,
					timestamp: response.data.timestamp || new Date(),
					modelUsed: model,
					complexity: complexity.complexity,
					confidence: complexity.confidence,
					usage: response.data.usage,
				};

				console.log('[TieredAIService] Success response:', {
					modelUsed: result.modelUsed,
					complexity: result.complexity,
					confidence: result.confidence,
					tokens: result.usage?.estimatedTokens,
				});

				return result;
			}

			// Fallback to standard response if tiered routing fails
			console.log('[TieredAIService] Tiered routing failed, using fallback');
			return this.getFallbackResponse(message);
		} catch (error: any) {
			console.log('[TieredAIService] Error in tiered routing:', error.message);

			// Fallback to standard response
			return this.getFallbackResponse(message);
		}
	}

	/**
	 * Get fallback response when tiered routing fails
	 */
	public getFallbackResponse(message: string): TieredAIResponse {
		const complexity = this.estimateComplexity(message, this.context);
		const fallbackText = this.generateFallbackResponse(message, complexity);

		return {
			response: fallbackText,
			sessionId: this.sessionId,
			timestamp: new Date(),
			modelUsed: 'fallback',
			complexity: complexity.complexity,
			confidence: complexity.confidence,
			usage: {
				estimatedTokens: complexity.estimatedTokens,
				remainingTokens: 0,
				remainingRequests: 0,
				cost: 0,
			},
		};
	}

	/**
	 * Generate intelligent fallback response
	 */
	private generateFallbackResponse(
		message: string,
		complexity: ComplexityAnalysis
	): string {
		const q = message.toLowerCase();

		// Simple balance/amount queries
		if (/what'?s my|how much|show me|balance|total|amount/i.test(q)) {
			return 'I can help you check your financial information. Please try asking again in a moment, or check your dashboard for current balances and amounts.';
		}

		// Budget-related queries
		if (/budget|spend|expense/i.test(q)) {
			// Provide more specific budget information based on available context
			if (this.context.budgets && this.context.budgets.length > 0) {
				const totalBudget = this.context.budgets.reduce(
					(sum, b) => sum + (b.amount || 0),
					0
				);
				const totalSpent = this.context.budgets.reduce(
					(sum, b) => sum + (b.spent || 0),
					0
				);
				const remaining = totalBudget - totalSpent;

				// Check for specific budget categories like grocery
				if (/grocery|food|shopping/i.test(q)) {
					const groceryBudget = this.context.budgets.find((b) =>
						/grocery|food|shopping|groceries/i.test(b.name)
					);

					if (groceryBudget) {
						const spent = groceryBudget.spent || 0;
						const amount = groceryBudget.amount || 0;
						const remaining = amount - spent;
						const utilization = amount > 0 ? (spent / amount) * 100 : 0;

						return `Your grocery budget status:\n\n🛒 Budget: $${amount.toFixed(
							2
						)}\n💸 Spent: $${spent.toFixed(
							2
						)}\n💚 Remaining: $${remaining.toFixed(
							2
						)}\n📊 Utilization: ${utilization.toFixed(1)}%\n\n${
							utilization > 80
								? "⚠️ You're approaching your grocery budget limit!"
								: "✅ You're doing well with your grocery spending!"
						}`;
					}
				}

				return `Based on your current budget data:\n\n💰 Total Budget: $${totalBudget.toFixed(
					2
				)}\n💸 Total Spent: $${totalSpent.toFixed(
					2
				)}\n💚 Remaining: $${remaining.toFixed(
					2
				)}\n\nFor detailed breakdowns, check your budget section.`;
			}
			return "I'd be happy to help with your budget! Please try asking again, or check your budget section for detailed information.";
		}

		// Goal-related queries
		if (/goal|save|target/i.test(q)) {
			// Provide goal progress information if available
			if (this.context.goals && this.context.goals.length > 0) {
				const totalTarget = this.context.goals.reduce(
					(sum, g) => sum + (g.target || 0),
					0
				);
				const totalCurrent = this.context.goals.reduce(
					(sum, g) => sum + (g.current || 0),
					0
				);
				const overallProgress =
					totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

				return `Your financial goals progress:\n\n🎯 Total Target: $${totalTarget.toFixed(
					2
				)}\n💰 Current Savings: $${totalCurrent.toFixed(
					2
				)}\n📈 Overall Progress: ${overallProgress.toFixed(
					1
				)}%\n\nKeep up the great work! Check your goals section for detailed progress.`;
			}
			return 'I can help you track your financial goals. Please try asking again, or check your goals section for progress updates.';
		}

		// General financial overview queries
		if (
			/what else|tell me about|overview|summary|how am i doing|financial health/i.test(
				q
			)
		) {
			// Provide comprehensive financial overview
			let overview = "Here's your current financial overview:\n\n";

			if (this.context.budgets && this.context.budgets.length > 0) {
				const totalBudget = this.context.budgets.reduce(
					(sum, b) => sum + (b.amount || 0),
					0
				);
				const totalSpent = this.context.budgets.reduce(
					(sum, b) => sum + (b.spent || 0),
					0
				);
				const remaining = totalBudget - totalSpent;
				const utilization =
					totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

				overview += `💰 Budget Status:\n• Total Budget: $${totalBudget.toFixed(
					2
				)}\n• Spent: $${totalSpent.toFixed(
					2
				)}\n• Remaining: $${remaining.toFixed(
					2
				)}\n• Utilization: ${utilization.toFixed(1)}%\n\n`;
			}

			if (this.context.goals && this.context.goals.length > 0) {
				const totalTarget = this.context.goals.reduce(
					(sum, g) => sum + (g.target || 0),
					0
				);
				const totalCurrent = this.context.goals.reduce(
					(sum, g) => sum + (g.current || 0),
					0
				);
				const overallProgress =
					totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

				overview += `🎯 Goals Progress:\n• Total Target: $${totalTarget.toFixed(
					2
				)}\n• Current Savings: $${totalCurrent.toFixed(
					2
				)}\n• Progress: ${overallProgress.toFixed(1)}%\n\n`;
			}

			if (this.context.transactions && this.context.transactions.length > 0) {
				const recentTransactions = this.context.transactions.slice(0, 3);
				overview += `📊 Recent Activity:\n`;
				recentTransactions.forEach((t) => {
					overview += `• ${t.description}: $${t.amount.toFixed(2)}\n`;
				});
				overview += `\n`;
			}

			overview +=
				'💡 You can ask me about specific budgets, goals, or spending patterns for more detailed insights!';

			return overview;
		}

		// General fallback
		return "I'm here to help with your financial questions! Please try asking again in a moment, or check your dashboard for quick insights.";
	}

	/**
	 * Get conversation context for the AI
	 */
	async getConversationContext(): Promise<any> {
		return {
			financial: this.trimContext(this.context, 800),
			sessionId: this.sessionId,
			usageStats: this.modelUsageStats,
		};
	}

	/**
	 * Get usage statistics
	 */
	getUsageStats() {
		return {
			...this.modelUsageStats,
			averageTokensPerRequest:
				this.modelUsageStats.totalTokens /
				(this.modelUsageStats.low +
					this.modelUsageStats.medium +
					this.modelUsageStats.high),
			modelDistribution: {
				low: this.modelUsageStats.low,
				medium: this.modelUsageStats.medium,
				high: this.modelUsageStats.high,
			},
		};
	}

	/**
	 * Get personalized insights (placeholder for compatibility)
	 */
	async getPersonalizedInsights(): Promise<any> {
		// This is a placeholder - in production, you'd implement actual insights
		return {
			insights: [],
			recommendations: [],
			priority: 'medium',
		};
	}

	/**
	 * Get contextual suggestions (placeholder for compatibility)
	 */
	async getContextualSuggestions(): Promise<any> {
		// This is a placeholder - in production, you'd implement actual suggestions
		return {
			suggestions: [],
			context: 'general',
		};
	}

	/**
	 * Upgrade subscription (placeholder for compatibility)
	 */
	async upgradeSubscription(tier: string): Promise<any> {
		// This is a placeholder - in production, you'd implement actual upgrade logic
		return {
			success: false,
			message: 'Upgrade functionality not implemented in tiered service',
		};
	}

	/**
	 * Reset session and clear history
	 */
	resetSession(): void {
		this.sessionId = this.generateSessionId();
		this.conversationHistory = [];
		this.modelUsageStats = {
			low: 0,
			medium: 0,
			high: 0,
			totalTokens: 0,
			totalCost: 0,
		};
	}
}
