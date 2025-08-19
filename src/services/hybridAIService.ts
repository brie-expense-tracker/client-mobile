import { EnhancedAIService } from './enhancedAIService';
import { IntelligentLocalAIService } from './intelligentLocalAIService';
import { Budget, Goal, Transaction } from '../types';

export interface HybridAIResponse {
	response: string;
	source: 'external' | 'local' | 'hybrid';
	confidence: 'high' | 'medium' | 'low';
	analysis?: string;
	recommendations?: string[];
	actionable: boolean;
	sessionId?: string;
	timestamp: Date;
	usage?: {
		estimatedTokens: number;
		remainingTokens: number;
		remainingRequests: number;
	};
}

export class HybridAIService {
	private enhancedAI: EnhancedAIService;
	private localAI: IntelligentLocalAIService;
	private sessionId: string;

	constructor(
		sessionId: string,
		budgets: Budget[],
		goals: Goal[],
		transactions: Transaction[]
	) {
		this.sessionId = sessionId;
		this.enhancedAI = new EnhancedAIService(sessionId);
		this.localAI = new IntelligentLocalAIService(budgets, goals, transactions);
	}

	/**
	 * Get the best possible response by combining local and external AI
	 */
	async getResponse(question: string): Promise<HybridAIResponse> {
		try {
			// First, try to get a response from external AI
			console.log('[HybridAI] Attempting external AI response...');
			const externalResponse = await this.enhancedAI.getResponse(question);

			if (
				externalResponse &&
				this.isRelevantResponse(externalResponse.response, question)
			) {
				console.log('[HybridAI] External AI provided relevant response');
				return {
					response: externalResponse.response,
					source: 'external',
					confidence: 'high',
					actionable: true,
					sessionId: externalResponse.sessionId,
					timestamp: externalResponse.timestamp,
					usage: externalResponse.usage,
				};
			} else {
				console.log(
					'[HybridAI] External AI response not relevant enough, using local AI'
				);
			}
		} catch (error: any) {
			console.log('[HybridAI] External AI failed:', error.message);
		}

		// Fall back to intelligent local analysis
		console.log('[HybridAI] Using intelligent local AI analysis');
		const localResponse = this.localAI.getResponse(question);

		return {
			response: this.formatLocalResponse(localResponse),
			source: 'local',
			confidence: localResponse.confidence,
			analysis: localResponse.analysis,
			recommendations: localResponse.recommendations,
			actionable: localResponse.actionable,
			sessionId: this.sessionId,
			timestamp: new Date(),
		};
	}

	/**
	 * Get conversation context (prefer external, fallback to local)
	 */
	async getConversationContext() {
		try {
			return await this.enhancedAI.getConversationContext();
		} catch (error) {
			console.log('[HybridAI] External context failed, using local context');
			return this.getLocalContext();
		}
	}

	/**
	 * Get personalized insights (prefer external, fallback to local)
	 */
	async getPersonalizedInsights() {
		try {
			return await this.enhancedAI.getPersonalizedInsights();
		} catch (error) {
			console.log('[HybridAI] External insights failed, using local insights');
			return this.getLocalInsights();
		}
	}

	/**
	 * Get contextual suggestions (prefer external, fallback to local)
	 */
	async getContextualSuggestions() {
		try {
			return await this.enhancedAI.getContextualSuggestions();
		} catch (error) {
			console.log(
				'[HybridAI] External suggestions failed, using local suggestions'
			);
			return this.getLocalSuggestions();
		}
	}

	/**
	 * Get conversation summary (prefer external, fallback to local)
	 */
	async getConversationSummary() {
		try {
			return await this.enhancedAI.getConversationSummary();
		} catch (error) {
			console.log('[HybridAI] External summary failed, using local summary');
			return this.getLocalSummary();
		}
	}

	/**
	 * Check if external AI response is relevant to the user's question
	 */
	private isRelevantResponse(response: string, question: string): boolean {
		if (!response || response.length < 20) return false;

		// Check for generic/unhelpful responses
		const genericPhrases = [
			'enhanced AI service is not available',
			'I received your message',
			"but I'm here to help with basic financial guidance",
			'I apologize, but I cannot',
			'I am not able to',
			'I cannot provide',
			'I am a financial assistant',
			'I can help you with',
		];

		const questionLower = question.toLowerCase();
		const responseLower = response.toLowerCase();

		// Check if response contains generic phrases
		if (genericPhrases.some((phrase) => responseLower.includes(phrase))) {
			return false;
		}

		// Check if response actually answers the user's question
		const questionKeywords = questionLower
			.split(' ')
			.filter((word) => word.length > 3)
			.filter(
				(word) =>
					!['what', 'when', 'where', 'which', 'whose', 'about'].includes(word)
			);

		if (questionKeywords.length === 0) return true;

		const hasRelevantContent = questionKeywords.some((keyword) => {
			const baseKeyword = keyword.replace(/ing$/, '').replace(/ies$/, 'y');
			return (
				responseLower.includes(keyword) || responseLower.includes(baseKeyword)
			);
		});

		return hasRelevantContent && response.length >= 50;
	}

	/**
	 * Format local AI response for consistency
	 */
	private formatLocalResponse(localResponse: any): string {
		let response = localResponse.answer;

		if (localResponse.analysis) {
			response += `\n\n${localResponse.analysis}`;
		}

		if (
			localResponse.recommendations &&
			localResponse.recommendations.length > 0
		) {
			response += `\n\n**Recommendations:**\n`;
			localResponse.recommendations.forEach((rec: string, index: number) => {
				response += `${index + 1}. ${rec}\n`;
			});
		}

		return response;
	}

	/**
	 * Get local context based on available data
	 */
	private getLocalContext() {
		// This would be implemented based on the local data
		// For now, return a basic structure
		return {
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
	}

	/**
	 * Get local insights based on financial analysis
	 */
	private getLocalInsights() {
		const analysis = this.localAI['analyzeFinancialHealth']();
		const insights = [];

		// Budget insights
		if (analysis.budgetHealth.overBudget.length > 0) {
			insights.push({
				type: 'warning' as const,
				title: 'Budget Alert',
				message: `You're over budget in ${
					analysis.budgetHealth.overBudget.length
				} category${
					analysis.budgetHealth.overBudget.length > 1 ? 'ies' : 'y'
				}.`,
				priority: 'high' as const,
			});
		}

		// Goal insights
		if (analysis.goalProgress.behind.length > 0) {
			insights.push({
				type: 'warning' as const,
				title: 'Goal Deadline Approaching',
				message: `You have ${analysis.goalProgress.behind.length} goal${
					analysis.goalProgress.behind.length > 1 ? 's' : ''
				} that need attention.`,
				priority: 'high' as const,
			});
		}

		// Savings insights
		if (analysis.savingsHealth.status === 'critical') {
			insights.push({
				type: 'warning' as const,
				title: 'Low Savings Rate',
				message: `Your current savings rate of ${analysis.savingsHealth.currentRate.toFixed(
					1
				)}% needs immediate attention.`,
				priority: 'high' as const,
			});
		}

		return insights;
	}

	/**
	 * Get local suggestions based on financial analysis
	 */
	private getLocalSuggestions() {
		const analysis = this.localAI['analyzeFinancialHealth']();
		const suggestions = [];

		// Budget suggestions
		if (analysis.budgetHealth.overBudget.length > 0) {
			suggestions.push({
				type: 'action' as const,
				title: 'Review Over-Budget Categories',
				description:
					'Identify areas where you can reduce spending to stay within budget limits.',
				priority: 'high' as const,
				category: 'budgeting',
			});
		}

		// Goal suggestions
		if (analysis.goalProgress.behind.length > 0) {
			suggestions.push({
				type: 'action' as const,
				title: 'Accelerate Goal Progress',
				description:
					'Increase contributions to goals that are behind schedule.',
				priority: 'high' as const,
				category: 'goals',
			});
		}

		// Savings suggestions
		if (
			analysis.savingsHealth.status === 'needs_improvement' ||
			analysis.savingsHealth.status === 'critical'
		) {
			suggestions.push({
				type: 'tip' as const,
				title: 'Improve Savings Rate',
				description: 'Aim for 20% savings rate using the 50/30/20 rule.',
				priority: 'medium' as const,
				category: 'savings',
			});
		}

		return suggestions;
	}

	/**
	 * Get local summary based on financial analysis
	 */
	private getLocalSummary() {
		const analysis = this.localAI['analyzeFinancialHealth']();

		return {
			sessionId: this.sessionId,
			timestamp: new Date(),
			keyInsights: [
				`Budget utilization: ${analysis.budgetHealth.utilization.toFixed(1)}%`,
				`Goal progress: ${analysis.goalProgress.averageProgress.toFixed(1)}%`,
				`Savings rate: ${analysis.savingsHealth.currentRate.toFixed(1)}%`,
				`Spending trend: ${analysis.spendingPatterns.trend}`,
			],
			actionItems: [
				analysis.budgetHealth.overBudget.length > 0
					? 'Review over-budget categories'
					: null,
				analysis.goalProgress.behind.length > 0
					? 'Accelerate behind-schedule goals'
					: null,
				analysis.savingsHealth.status === 'critical'
					? 'Improve savings rate immediately'
					: null,
			].filter(Boolean),
			financialSnapshot: {
				totalBudgets:
					analysis.budgetHealth.onTrack.length +
					analysis.budgetHealth.overBudget.length +
					analysis.budgetHealth.underBudget.length,
				totalGoals:
					analysis.goalProgress.onTrack.length +
					analysis.goalProgress.behind.length +
					analysis.goalProgress.ahead.length,
				monthlySavingsRate: analysis.savingsHealth.currentRate,
				spendingTrend: analysis.spendingPatterns.trend,
			},
			recommendations: this.getLocalSuggestions(),
		};
	}

	/**
	 * Update the local AI service with new data
	 */
	updateLocalData(
		budgets: Budget[],
		goals: Goal[],
		transactions: Transaction[]
	) {
		this.localAI = new IntelligentLocalAIService(budgets, goals, transactions);
	}

	/**
	 * Upgrade subscription (placeholder for compatibility)
	 */
	async upgradeSubscription(tier: string): Promise<any> {
		// This would integrate with your subscription system
		console.log(`[HybridAI] Subscription upgrade requested for tier: ${tier}`);
		return { success: true, tier };
	}
}
