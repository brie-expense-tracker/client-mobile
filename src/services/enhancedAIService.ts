import { ApiService } from './apiService';

export interface ConversationContext {
	financial: {
		currentBudgets: Array<{
			id: string;
			name: string;
			remaining: number;
			utilization: number;
			period: 'weekly' | 'monthly';
		}>;
		activeGoals: Array<{
			id: string;
			name: string;
			progress: number;
			deadline: Date;
			targetAmount: number;
			currentAmount: number;
		}>;
		recentSpending: {
			total: number;
			categories: Array<{ name: string; amount: number; percentage: number }>;
			trend: 'increasing' | 'decreasing' | 'stable';
			lastUpdated: Date;
		};
		monthlyOverview: {
			income: number;
			expenses: number;
			netSavings: number;
			savingsRate: number;
		};
	};
	preferences: {
		riskTolerance: 'conservative' | 'moderate' | 'aggressive';
		financialFocus: string[];
		communicationStyle: 'detailed' | 'concise' | 'actionable';
		preferredInsights: string[];
		notificationPreferences: {
			budgetAlerts: boolean;
			goalUpdates: boolean;
			spendingInsights: boolean;
		};
	};
	recentInsights: string[];
	lastTopics: string[];
	commonQuestions: string[];
	actionItems: string[];
}

export interface AIResponse {
	response: string;
	sessionId: string;
	timestamp: Date;
	usage?: {
		estimatedTokens: number;
		remainingTokens: number;
		remainingRequests: number;
	};
}

export interface PersonalizedInsight {
	type: 'warning' | 'info' | 'suggestion';
	title: string;
	message: string;
	priority: 'low' | 'medium' | 'high';
}

export interface ContextualSuggestion {
	type: 'action' | 'tip' | 'review';
	title: string;
	description: string;
	priority: 'low' | 'medium' | 'high';
	category: string;
}

export interface ConversationSummary {
	sessionId: string;
	timestamp: Date;
	keyInsights: string[];
	actionItems: string[];
	financialSnapshot: {
		totalBudgets: number;
		totalGoals: number;
		monthlySavingsRate: number;
		spendingTrend: string;
	};
	recommendations: ContextualSuggestion[];
}

export interface ConversationAnalytics {
	totalInsights: number;
	totalActionItems: number;
	completedActions: number;
	pendingActions: number;
	commonTopics: string[];
	communicationStyle: string;
	riskTolerance: string;
	financialFocus: string[];
	lastActivity: Date;
}

export class EnhancedAIService {
	private sessionId: string;
	private localContext: ConversationContext | null = null;

	constructor() {
		this.sessionId = this.generateSessionId();
	}

	/**
	 * Generate a unique session ID for this conversation
	 */
	private generateSessionId(): string {
		return `mobile_session_${Date.now()}_${Math.random()
			.toString(36)
			.substr(2, 9)}`;
	}

	/**
	 * Get AI response with conversation context
	 */
	async getResponse(message: string): Promise<AIResponse> {
		try {
			const response = await ApiService.post<AIResponse>('/enhanced-ai/chat', {
				message,
				sessionId: this.sessionId,
			});

			// Update local context after getting response
			await this.updateLocalContext();

			if (response.success && response.data) {
				// The server returns the AIResponse wrapped in a data property
				// We need to extract it and ensure it matches our interface
				const aiResponseData = response.data;

				const extractedResponse = {
					response: aiResponseData.response,
					sessionId: aiResponseData.sessionId,
					timestamp: aiResponseData.timestamp,
					usage: response.usage, // Usage is at the top level
				};

				return extractedResponse;
			}
			throw new Error('Failed to get AI response');
		} catch (error: any) {
			// Check if it's a rate limit error
			if (error.response?.status === 429) {
				console.log(
					'[EnhancedAIService] Rate limit exceeded, re-throwing for paywall handling'
				);
				throw error; // Re-throw the original error so the main component can handle the paywall
			}

			console.log(
				'[EnhancedAIService] Enhanced AI chat endpoint not available, throwing error for fallback handling'
			);
			// Throw error so the main component can handle it with helpful fallback responses
			throw new Error('Enhanced AI service not available');
		}
	}

	/**
	 * Get conversation context for the user
	 */
	async getConversationContext(): Promise<ConversationContext> {
		try {
			if (this.localContext) {
				return this.localContext;
			}

			// Try to get context from server
			try {
				const context = await ApiService.get<ConversationContext>(
					'/enhanced-ai/context'
				);
				if (context.success && context.data) {
					this.localContext = context.data;
					return context.data;
				}
			} catch (error) {
				console.log(
					'[EnhancedAIService] Enhanced AI context endpoint not available, using fallback'
				);
			}

			// Fallback: return a basic context structure
			const fallbackContext: ConversationContext = {
				financial: {
					currentBudgets: [],
					activeGoals: [],
					recentSpending: {
						total: 0,
						categories: [],
						trend: 'stable' as const,
						lastUpdated: new Date(),
					},
					monthlyOverview: {
						income: 0,
						expenses: 0,
						netSavings: 0,
						savingsRate: 0,
					},
				},
				preferences: {
					riskTolerance: 'moderate' as const,
					financialFocus: ['budgeting', 'saving'],
					communicationStyle: 'concise' as const,
					preferredInsights: ['spending', 'budget'],
					notificationPreferences: {
						budgetAlerts: true,
						goalUpdates: true,
						spendingInsights: true,
					},
				},
				recentInsights: [],
				lastTopics: [],
				commonQuestions: [],
				actionItems: [],
			};

			this.localContext = fallbackContext;
			return fallbackContext;
		} catch (error) {
			console.error(
				'[EnhancedAIService] Error getting conversation context:',
				error
			);
			throw error;
		}
	}

	/**
	 * Update local context from server
	 */
	async updateLocalContext(): Promise<void> {
		try {
			const context = await ApiService.get<ConversationContext>(
				'/enhanced-ai/context'
			);
			if (context.success && context.data) {
				this.localContext = context.data;
			}
		} catch (error) {
			console.log(
				'[EnhancedAIService] Enhanced AI context endpoint not available, skipping update'
			);
		}
	}

	/**
	 * Get personalized financial insights
	 */
	async getPersonalizedInsights(): Promise<PersonalizedInsight[]> {
		try {
			const insights = await ApiService.get<PersonalizedInsight[]>(
				'/enhanced-ai/insights'
			);
			if (insights.success && insights.data) {
				return insights.data;
			}
			return [];
		} catch (error) {
			console.log(
				'[EnhancedAIService] Enhanced AI insights endpoint not available, using fallback'
			);
			// Return fallback insights
			return [
				{
					type: 'info' as const,
					title: 'Welcome to Brie AI',
					message:
						'Your financial copilot is ready to help you manage your money better.',
					priority: 'low' as const,
				},
				{
					type: 'suggestion' as const,
					title: 'Set Up Your First Budget',
					message: 'Creating a budget is the first step to financial success.',
					priority: 'medium' as const,
				},
			];
		}
	}

	/**
	 * Get contextual suggestions
	 */
	async getContextualSuggestions(): Promise<ContextualSuggestion[]> {
		try {
			const suggestions = await ApiService.get<ContextualSuggestion[]>(
				'/enhanced-ai/suggestions'
			);
			if (suggestions.success && suggestions.data) {
				return suggestions.data;
			}
			return [];
		} catch (error) {
			console.log(
				'[EnhancedAIService] Enhanced AI suggestions endpoint not available, using fallback'
			);
			// Return fallback suggestions
			return [
				{
					type: 'action' as const,
					title: 'Review Your Spending',
					description:
						'Take a look at your recent transactions to identify patterns.',
					priority: 'medium' as const,
					category: 'spending',
				},
				{
					type: 'tip' as const,
					title: 'Track Your Goals',
					description:
						'Monitor your progress towards financial goals regularly.',
					priority: 'low' as const,
					category: 'goals',
				},
			];
		}
	}

	/**
	 * Get conversation summary
	 */
	async getConversationSummary(): Promise<ConversationSummary> {
		try {
			const summary = await ApiService.get<ConversationSummary>(
				`/enhanced-ai/summary/${this.sessionId}`
			);
			if (summary.success && summary.data) {
				return summary.data;
			}
			throw new Error('Failed to get conversation summary');
		} catch (error) {
			console.log(
				'[EnhancedAIService] Enhanced AI summary endpoint not available, using fallback'
			);
			// Return fallback summary
			return {
				sessionId: this.sessionId,
				timestamp: new Date(),
				keyInsights: [
					'Welcome to Brie AI',
					'Start by setting up your first budget',
				],
				actionItems: ['Create a budget', 'Set financial goals'],
				financialSnapshot: {
					totalBudgets: 0,
					totalGoals: 0,
					monthlySavingsRate: 0,
					spendingTrend: 'stable',
				},
				recommendations: [],
			};
		}
	}

	/**
	 * Update user preferences
	 */
	async updateUserPreferences(preferences: any): Promise<any> {
		try {
			const updatedPreferences = await ApiService.put(
				'/enhanced-ai/preferences',
				{ preferences }
			);

			// Update local context after preferences change
			await this.updateLocalContext();

			return updatedPreferences;
		} catch (error) {
			console.log(
				'[EnhancedAIService] Enhanced AI preferences endpoint not available, using local update only'
			);
			// Update local context only
			if (this.localContext) {
				this.localContext.preferences = {
					...this.localContext.preferences,
					...preferences,
				};
			}
			return { success: true, data: preferences };
		}
	}

	/**
	 * Clean up old conversation data
	 */
	async cleanupOldData(): Promise<void> {
		try {
			await ApiService.delete('/enhanced-ai/cleanup');

			// Clear local context after cleanup
			this.localContext = null;
		} catch (error) {
			console.log(
				'[EnhancedAIService] Enhanced AI cleanup endpoint not available, clearing local context only'
			);
			// Clear local context only
			this.localContext = null;
		}
	}

	/**
	 * Get conversation analytics
	 */
	async getConversationAnalytics(): Promise<ConversationAnalytics> {
		try {
			const analytics = await ApiService.get<ConversationAnalytics>(
				'/enhanced-ai/analytics'
			);
			if (analytics.success && analytics.data) {
				return analytics.data;
			}
			throw new Error('Failed to get conversation analytics');
		} catch (error) {
			console.log(
				'[EnhancedAIService] Enhanced AI analytics endpoint not available, using fallback'
			);
			// Return fallback analytics
			return {
				totalInsights: 0,
				totalActionItems: 0,
				completedActions: 0,
				pendingActions: 0,
				commonTopics: ['budgeting', 'saving'],
				communicationStyle: 'concise',
				riskTolerance: 'moderate',
				financialFocus: ['budgeting', 'saving'],
				lastActivity: new Date(),
			};
		}
	}

	/**
	 * Get current session ID
	 */
	getCurrentSessionId(): string {
		return this.sessionId;
	}

	/**
	 * Start a new conversation session
	 */
	startNewSession(): void {
		this.sessionId = this.generateSessionId();
		this.localContext = null;
	}

	/**
	 * Get cached context (if available)
	 */
	getCachedContext(): ConversationContext | null {
		return this.localContext;
	}

	/**
	 * Check if context is stale (older than 5 minutes)
	 */
	isContextStale(): boolean {
		if (!this.localContext) return true;

		// For now, always consider context fresh if it exists
		// In a real implementation, you might want to check timestamps
		return false;
	}

	/**
	 * Get quick financial summary for context
	 */
	getQuickFinancialSummary(): string {
		if (!this.localContext) return 'No financial data available';

		const { financial } = this.localContext;
		const { monthlyOverview, currentBudgets, activeGoals } = financial;

		return `Monthly: $${monthlyOverview.income} income, $${
			monthlyOverview.expenses
		} expenses, $${
			monthlyOverview.netSavings
		} savings (${monthlyOverview.savingsRate.toFixed(1)}% rate). ${
			currentBudgets.length
		} budgets, ${activeGoals.length} goals.`;
	}

	/**
	 * Get suggested questions based on context
	 */
	getSuggestedQuestions(): string[] {
		if (!this.localContext) {
			return [
				'How do I create a budget?',
				'What should I focus on financially?',
				'How can I save more money?',
			];
		}

		const { financial, preferences } = this.localContext;
		const suggestions: string[] = [];

		// Budget-related suggestions
		if (financial.currentBudgets.length === 0) {
			suggestions.push('How do I create my first budget?');
		} else {
			suggestions.push('How am I doing with my budgets this month?');
		}

		// Goal-related suggestions
		if (financial.activeGoals.length === 0) {
			suggestions.push('How do I set financial goals?');
		} else {
			suggestions.push('How close am I to reaching my goals?');
		}

		// Savings suggestions
		if (monthlyOverview.savingsRate < 20) {
			suggestions.push('How can I increase my savings rate?');
		}

		// Spending suggestions
		if (financial.recentSpending.trend === 'increasing') {
			suggestions.push('Why is my spending increasing?');
		}

		// Add common questions from context
		if (this.localContext.commonQuestions.length > 0) {
			suggestions.push(...this.localContext.commonQuestions.slice(0, 2));
		}

		return suggestions.slice(0, 6); // Limit to 6 suggestions
	}

	/**
	 * Get action items summary
	 */
	getActionItemsSummary(): string[] {
		if (!this.localContext || this.localContext.actionItems.length === 0) {
			return [];
		}

		return this.localContext.actionItems.slice(0, 3);
	}

	/**
	 * Get recent insights summary
	 */
	getRecentInsightsSummary(): string[] {
		if (!this.localContext || this.localContext.recentInsights.length === 0) {
			return [];
		}

		return this.localContext.recentInsights.slice(-3);
	}

	/**
	 * Upgrade user subscription
	 */
	async upgradeSubscription(tier: string, duration: number = 1): Promise<any> {
		try {
			const response = await ApiService.post('/enhanced-ai/upgrade', {
				tier,
				duration,
			});
			if (response.success && response.data) {
				return response.data;
			}
			throw new Error('Failed to upgrade subscription');
		} catch (error) {
			console.log(
				'[EnhancedAIService] Enhanced AI upgrade endpoint not available'
			);
			throw new Error('Subscription upgrade service not available');
		}
	}
}
