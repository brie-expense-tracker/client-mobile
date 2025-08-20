import { ApiService } from '../core/apiService';
import { Budget, Goal, Transaction } from '../../types';

export interface CustomGPTResponse {
	response: string;
	sessionId: string;
	timestamp: Date;
	usage?: {
		estimatedTokens: number;
		remainingTokens: number;
		remainingRequests: number;
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

export class CustomGPTService {
	private sessionId: string;
	private context: FinancialContext;

	constructor(context: FinancialContext) {
		this.sessionId = this.generateSessionId();
		this.context = context;
	}

	/**
	 * Generate a unique session ID for this conversation
	 */
	private generateSessionId(): string {
		return `gpt_session_${Date.now()}_${Math.random()
			.toString(36)
			.substr(2, 9)}`;
	}

	/**
	 * Get AI response using custom GPT with financial context
	 */
	async getResponse(message: string): Promise<CustomGPTResponse> {
		try {
			// Prepare financial context for the AI
			const financialContext = this.prepareFinancialContext();

			const response = await ApiService.post<CustomGPTResponse>(
				'/custom-gpt/chat',
				{
					message: message.trim(),
					sessionId: this.sessionId,
					context: financialContext,
				}
			);

			if (response.success && response.data) {
				return {
					response: response.data.response,
					sessionId: response.data.sessionId || this.sessionId,
					timestamp: response.data.timestamp || new Date(),
					usage: response.usage,
				};
			}

			throw new Error('Failed to get GPT response');
		} catch (error: any) {
			console.error('[CustomGPTService] Error getting response:', error);

			// Check if it's a rate limit error
			if (error.response?.status === 429) {
				throw error; // Re-throw for paywall handling
			}

			// Return a helpful fallback response
			return {
				response: this.getFallbackResponse(message),
				sessionId: this.sessionId,
				timestamp: new Date(),
			};
		}
	}

	/**
	 * Prepare financial context for the AI
	 */
	private prepareFinancialContext() {
		const { budgets, goals, transactions, userProfile } = this.context;

		// Calculate key financial metrics
		const totalBudget = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
		const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
		const totalGoals = goals.reduce((sum, g) => sum + (g.target || 0), 0);
		const totalSaved = goals.reduce((sum, g) => sum + (g.current || 0), 0);

		// Get recent spending patterns
		const recentTransactions = transactions.slice(-10).map((t) => ({
			amount: t.amount,
			description: t.description,
			date: t.date,
			budget: t.budget,
		}));

		// Calculate budget utilization
		const budgetUtilization = budgets.map((b) => ({
			name: b.name,
			amount: b.amount,
			spent: b.spent || 0,
			remaining: (b.amount || 0) - (b.spent || 0),
			utilization: b.amount ? ((b.spent || 0) / b.amount) * 100 : 0,
		}));

		// Calculate goal progress
		const goalProgress = goals.map((g) => ({
			name: g.name,
			target: g.target || 0,
			current: g.current || 0,
			progress: g.target ? ((g.current || 0) / g.target) * 100 : 0,
			deadline: g.deadline,
		}));

		return {
			financialSummary: {
				totalBudget,
				totalSpent,
				totalRemaining: totalBudget - totalSpent,
				totalGoals: totalGoals,
				totalSaved,
				monthlyIncome: userProfile?.monthlyIncome || 0,
				financialGoal: userProfile?.financialGoal || 'General financial health',
				riskProfile: userProfile?.riskProfile || 'Moderate',
			},
			budgets: budgetUtilization,
			goals: goalProgress,
			recentTransactions,
			spendingTrends: this.calculateSpendingTrends(transactions),
		};
	}

	/**
	 * Calculate spending trends from transactions
	 */
	private calculateSpendingTrends(transactions: Transaction[]) {
		if (transactions.length < 2) return { trend: 'stable', average: 0 };

		const recent = transactions.slice(-5);
		const older = transactions.slice(-10, -5);

		const recentTotal = recent.reduce((sum, t) => sum + (t.amount || 0), 0);
		const olderTotal = older.reduce((sum, t) => sum + (t.amount || 0), 0);

		const change = recentTotal - olderTotal;
		const changePercent = olderTotal > 0 ? (change / olderTotal) * 100 : 0;

		let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
		if (changePercent > 10) trend = 'increasing';
		else if (changePercent < -10) trend = 'decreasing';

		return {
			trend,
			average: recentTotal / recent.length,
			changePercent: Math.abs(changePercent),
		};
	}

	/**
	 * Get fallback response when GPT fails
	 */
	public getFallbackResponse(message: string): string {
		const lowerMessage = message.toLowerCase();

		// Simple keyword-based responses for common questions
		if (lowerMessage.includes('budget') || lowerMessage.includes('spending')) {
			return `I can see you have ${
				this.context.budgets.length
			} active budgets. Your total budget is $${this.context.budgets
				.reduce((sum, b) => sum + (b.amount || 0), 0)
				.toFixed(2)} with $${this.context.budgets
				.reduce((sum, b) => sum + (b.spent || 0), 0)
				.toFixed(
					2
				)} spent. Would you like me to help you analyze your budget performance or create a new budget?`;
		}

		if (lowerMessage.includes('goal') || lowerMessage.includes('save')) {
			return `You're tracking ${
				this.context.goals.length
			} financial goals with a total target of $${this.context.goals
				.reduce((sum, g) => sum + (g.target || 0), 0)
				.toFixed(2)}. You've saved $${this.context.goals
				.reduce((sum, g) => sum + (g.current || 0), 0)
				.toFixed(2)} so far. How can I help you reach your savings goals?`;
		}

		if (lowerMessage.includes('spend') || lowerMessage.includes('expense')) {
			return `I can see ${
				this.context.transactions.length
			} recent transactions. Your spending trend is ${
				this.calculateSpendingTrends(this.context.transactions).trend
			}. Would you like me to analyze your spending patterns or help you track expenses better?`;
		}

		return `I'm here to help with your finances! I can see you have ${this.context.budgets.length} budgets, ${this.context.goals.length} goals, and ${this.context.transactions.length} transactions. What would you like to know about your financial situation?`;
	}

	/**
	 * Get conversation context (simplified)
	 */
	async getConversationContext() {
		return {
			financial: {
				currentBudgets: this.context.budgets.map((b) => ({
					id: b.id,
					name: b.name,
					remaining: (b.amount || 0) - (b.spent || 0),
					utilization: b.amount ? ((b.spent || 0) / b.amount) * 100 : 0,
					period: 'monthly',
				})),
				activeGoals: this.context.goals.map((g) => ({
					id: g.id,
					name: g.name,
					progress: g.target ? ((g.current || 0) / g.target) * 100 : 0,
					deadline: g.deadline || new Date(),
					targetAmount: g.target || 0,
					currentAmount: g.current || 0,
				})),
				recentSpending: {
					total: this.context.transactions
						.slice(-10)
						.reduce((sum, t) => sum + (t.amount || 0), 0),
					categories: this.getSpendingCategories(),
					trend: this.calculateSpendingTrends(this.context.transactions).trend,
					lastUpdated: new Date(),
				},
				monthlyOverview: {
					income: this.context.userProfile?.monthlyIncome || 0,
					expenses: this.context.transactions.reduce(
						(sum, t) => sum + (t.amount || 0),
						0
					),
					netSavings:
						(this.context.userProfile?.monthlyIncome || 0) -
						this.context.transactions.reduce(
							(sum, t) => sum + (t.amount || 0),
							0
						),
					savingsRate: this.context.userProfile?.monthlyIncome
						? ((this.context.userProfile.monthlyIncome -
								this.context.transactions.reduce(
									(sum, t) => sum + (t.amount || 0),
									0
								)) /
								this.context.userProfile.monthlyIncome) *
						  100
						: 0,
				},
			},
			preferences: {
				riskTolerance: this.context.userProfile?.riskProfile || 'moderate',
				financialFocus: ['budgeting', 'saving', 'spending'],
				communicationStyle: 'actionable',
				preferredInsights: ['budget', 'goal', 'spending'],
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
	 * Get spending categories from transactions
	 */
	private getSpendingCategories() {
		const categories = new Map<string, number>();

		this.context.transactions.forEach((t) => {
			const category = t.budget || 'Uncategorized';
			categories.set(
				category,
				(categories.get(category) || 0) + (t.amount || 0)
			);
		});

		const total = Array.from(categories.values()).reduce(
			(sum, amount) => sum + amount,
			0
		);

		return Array.from(categories.entries()).map(([name, amount]) => ({
			name,
			amount,
			percentage: total > 0 ? (amount / total) * 100 : 0,
		}));
	}

	/**
	 * Get personalized insights (simplified)
	 */
	async getPersonalizedInsights() {
		const insights = [];
		const { budgets, goals, transactions } = this.context;

		// Budget insights
		const overBudget = budgets.filter((b) => (b.spent || 0) > (b.amount || 0));
		if (overBudget.length > 0) {
			insights.push({
				type: 'warning',
				title: 'Budget Overruns',
				message: `You're over budget in ${overBudget.length} category${
					overBudget.length > 1 ? 's' : ''
				}. Consider adjusting your spending or budget limits.`,
				priority: 'high',
			});
		}

		// Goal insights
		const behindGoals = goals.filter((g) => {
			const progress = g.target ? ((g.current || 0) / g.target) * 100 : 0;
			return progress < 50;
		});
		if (behindGoals.length > 0) {
			insights.push({
				type: 'info',
				title: 'Goal Progress',
				message: `${behindGoals.length} of your goals are behind schedule. Consider increasing your savings rate.`,
				priority: 'medium',
			});
		}

		// Spending insights
		const spendingTrend = this.calculateSpendingTrends(transactions);
		if (spendingTrend.trend === 'increasing') {
			insights.push({
				type: 'suggestion',
				title: 'Spending Trend',
				message: `Your spending has increased by ${spendingTrend.changePercent.toFixed(
					1
				)}%. Review your recent expenses to identify areas for improvement.`,
				priority: 'medium',
			});
		}

		return insights;
	}

	/**
	 * Get contextual suggestions (simplified)
	 */
	async getContextualSuggestions() {
		const suggestions = [];
		const { budgets, goals } = this.context;

		if (budgets.length === 0) {
			suggestions.push({
				type: 'action',
				title: 'Create Your First Budget',
				description:
					'Start tracking your spending by creating a budget for your main expense categories.',
				priority: 'high',
				category: 'budgeting',
			});
		}

		if (goals.length === 0) {
			suggestions.push({
				type: 'action',
				title: 'Set Financial Goals',
				description:
					'Define clear financial goals to stay motivated and track your progress.',
				priority: 'high',
				category: 'goals',
			});
		}

		if (budgets.length > 0) {
			const overBudget = budgets.filter(
				(b) => (b.spent || 0) > (b.amount || 0)
			);
			if (overBudget.length > 0) {
				suggestions.push({
					type: 'tip',
					title: 'Review Budget Limits',
					description: `Consider adjusting your budget limits for ${overBudget
						.map((b) => b.name)
						.join(', ')}.`,
					priority: 'medium',
					category: 'budgeting',
				});
			}
		}

		return suggestions;
	}

	/**
	 * Upgrade subscription (delegated to API)
	 */
	async upgradeSubscription(tier: string) {
		try {
			const response = await ApiService.post('/custom-gpt/upgrade', { tier });
			return response.success;
		} catch (error) {
			console.error('[CustomGPTService] Upgrade failed:', error);
			throw error;
		}
	}
}
