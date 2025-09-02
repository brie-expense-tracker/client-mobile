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
			console.log('[CustomGPTService] Getting response for:', message);
			console.log('[CustomGPTService] Session ID:', this.sessionId);

			// Prepare financial context for the AI
			const financialContext = this.prepareFinancialContext();
			console.log('[CustomGPTService] Financial context prepared:', {
				budgetCount: financialContext.budgets.length,
				goalCount: financialContext.goals.length,
				transactionCount: financialContext.recentTransactions.length,
				totalBudget: financialContext.financialSummary.totalBudget,
				totalSpent: financialContext.financialSummary.totalSpent,
			});

			const requestPayload = {
				message: message.trim(),
				sessionId: this.sessionId,
				context: financialContext,
			};

			console.log('[CustomGPTService] Sending request to API:', {
				endpoint: '/api/custom-gpt/chat',
				messageLength: message.trim().length,
				hasContext: !!financialContext,
			});

			const response = await ApiService.post<CustomGPTResponse>(
				'/api/custom-gpt/chat',
				requestPayload
			);

			console.log('[CustomGPTService] API response received:', {
				success: response.success,
				hasData: !!response.data,
				responseLength: response.data?.response?.length || 0,
				status: response.status,
				usage: response.usage,
			});

			if (response.success && response.data) {
				const result = {
					response: response.data.response,
					sessionId: response.data.sessionId || this.sessionId,
					timestamp: response.data.timestamp || new Date(),
					usage: response.usage,
				};

				console.log('[CustomGPTService] Returning successful response:', {
					responsePreview: result.response.substring(0, 100) + '...',
					sessionId: result.sessionId,
					timestamp: result.timestamp,
				});

				return result;
			}

			// If the response is not successful, fall back to fallback response
			console.log(
				'[CustomGPTService] API response not successful, using fallback'
			);
			const fallbackResponse = this.getFallbackResponse(message);
			console.log(
				'[CustomGPTService] Fallback response:',
				fallbackResponse.substring(0, 100) + '...'
			);

			return {
				response: fallbackResponse,
				sessionId: this.sessionId,
				timestamp: new Date(),
				usage: undefined,
			};
		} catch (error: any) {
			// Log the error for debugging but don't throw it
			console.log(
				'[CustomGPTService] API call failed, using fallback response:',
				error.message
			);

			console.log('[CustomGPTService] Error details:', {
				message: error.message,
				status: error.response?.status,
				statusText: error.response?.statusText,
				data: error.response?.data,
				stack: error.stack,
			});

			// Check if it's a rate limit error - only re-throw these for paywall handling
			if (error.response?.status === 429) {
				console.log(
					'[CustomGPTService] Rate limit error, re-throwing for paywall handling'
				);
				throw error; // Re-throw for paywall handling
			}

			// For all other errors (including 401, 500, network errors), use fallback
			const fallbackResponse = this.getFallbackResponse(message);
			console.log(
				'[CustomGPTService] Using fallback due to error:',
				fallbackResponse.substring(0, 100) + '...'
			);

			return {
				response: fallbackResponse,
				sessionId: this.sessionId,
				timestamp: new Date(),
				usage: undefined,
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
			category: t.category,
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

		// Check for specific budget types
		if (
			lowerMessage.includes('grocery') ||
			lowerMessage.includes('food') ||
			lowerMessage.includes('groceries')
		) {
			const groceryBudget = this.context.budgets.find(
				(b) =>
					b.name.toLowerCase().includes('grocery') ||
					b.name.toLowerCase().includes('food') ||
					b.name.toLowerCase().includes('groceries')
			);

			if (groceryBudget) {
				const remaining =
					(groceryBudget.amount || 0) - (groceryBudget.spent || 0);
				const utilization = groceryBudget.amount
					? ((groceryBudget.spent || 0) / groceryBudget.amount) * 100
					: 0;

				if (utilization > 80) {
					return `⚠️ Your grocery budget is ${utilization.toFixed(
						1
					)}% used! You've spent $${groceryBudget.spent?.toFixed(
						2
					)} out of $${groceryBudget.amount?.toFixed(
						2
					)}, with only $${remaining.toFixed(
						2
					)} remaining. Consider adjusting your spending or budget.`;
				} else if (utilization > 50) {
					return `Your grocery budget is ${utilization.toFixed(
						1
					)}% used. You've spent $${groceryBudget.spent?.toFixed(
						2
					)} out of $${groceryBudget.amount?.toFixed(
						2
					)}, with $${remaining.toFixed(2)} remaining. You're on track!`;
				} else {
					return `Great job! Your grocery budget is only ${utilization.toFixed(
						1
					)}% used. You've spent $${groceryBudget.spent?.toFixed(
						2
					)} out of $${groceryBudget.amount?.toFixed(
						2
					)}, with $${remaining.toFixed(2)} remaining.`;
				}
			}
		}

		if (
			lowerMessage.includes('stock') ||
			lowerMessage.includes('investment') ||
			lowerMessage.includes('invest')
		) {
			const investmentBudget = this.context.budgets.find(
				(b) =>
					b.name.toLowerCase().includes('stock') ||
					b.name.toLowerCase().includes('investment') ||
					b.name.toLowerCase().includes('invest')
			);

			if (investmentBudget) {
				return `You have an investment budget of $${investmentBudget.amount?.toFixed(
					2
				)} with $${investmentBudget.spent?.toFixed(
					2
				)} spent. Would you like me to help you track your investment spending or adjust this budget?`;
			} else {
				return `I can help you set up a budget for stocks and investments! What's your target amount for stock investments this month? I can create a new budget category for you.`;
			}
		}

		if (lowerMessage.includes('budget') && lowerMessage.includes('how')) {
			// More specific budget analysis
			const totalBudget = this.context.budgets.reduce(
				(sum, b) => sum + (b.amount || 0),
				0
			);
			const totalSpent = this.context.budgets.reduce(
				(sum, b) => sum + (b.spent || 0),
				0
			);
			const totalRemaining = totalBudget - totalSpent;
			const overallUtilization =
				totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

			if (overallUtilization > 80) {
				return `⚠️ Your overall budget utilization is ${overallUtilization.toFixed(
					1
				)}%! You've spent $${totalSpent.toFixed(
					2
				)} out of $${totalBudget.toFixed(
					2
				)}, with only $${totalRemaining.toFixed(
					2
				)} remaining. Consider reviewing your spending patterns.`;
			} else if (overallUtilization > 50) {
				return `Your overall budget utilization is ${overallUtilization.toFixed(
					1
				)}%. You've spent $${totalSpent.toFixed(
					2
				)} out of $${totalBudget.toFixed(2)}, with $${totalRemaining.toFixed(
					2
				)} remaining. You're managing your budget well!`;
			} else {
				return `Excellent budget management! Your overall utilization is only ${overallUtilization.toFixed(
					1
				)}%. You've spent $${totalSpent.toFixed(
					2
				)} out of $${totalBudget.toFixed(2)}, with $${totalRemaining.toFixed(
					2
				)} remaining.`;
			}
		}

		if (lowerMessage.includes('goal') || lowerMessage.includes('save')) {
			const totalTarget = this.context.goals.reduce(
				(sum, g) => sum + (g.target || 0),
				0
			);
			const totalSaved = this.context.goals.reduce(
				(sum, g) => sum + (g.current || 0),
				0
			);
			const overallProgress =
				totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

			if (overallProgress > 75) {
				return `🎉 You're ${overallProgress.toFixed(
					1
				)}% to your savings goals! You've saved $${totalSaved.toFixed(
					2
				)} out of $${totalTarget.toFixed(2)}. You're almost there!`;
			} else if (overallProgress > 50) {
				return `Great progress! You're ${overallProgress.toFixed(
					1
				)}% to your savings goals. You've saved $${totalSaved.toFixed(
					2
				)} out of $${totalTarget.toFixed(2)}. Keep it up!`;
			} else {
				return `You're ${overallProgress.toFixed(
					1
				)}% to your savings goals. You've saved $${totalSaved.toFixed(
					2
				)} out of $${totalTarget.toFixed(
					2
				)}. Let's work on strategies to boost your savings!`;
			}
		}

		if (lowerMessage.includes('spend') || lowerMessage.includes('expense')) {
			const recentTransactions = this.context.transactions.slice(-10);
			const recentTotal = recentTransactions.reduce(
				(sum, t) => sum + (t.amount || 0),
				0
			);
			const spendingTrend = this.calculateSpendingTrends(
				this.context.transactions
			);

			return `I can see ${
				this.context.transactions.length
			} recent transactions. Your recent spending is $${recentTotal.toFixed(
				2
			)}, and the trend is ${
				spendingTrend.trend
			}. Would you like me to analyze your spending patterns or help you track expenses better?`;
		}

		// Default response with more context
		const totalBudget = this.context.budgets.reduce(
			(sum, b) => sum + (b.amount || 0),
			0
		);
		const totalSpent = this.context.budgets.reduce(
			(sum, b) => sum + (b.spent || 0),
			0
		);
		const totalGoals = this.context.goals.reduce(
			(sum, g) => sum + (g.target || 0),
			0
		);

		return `I'm here to help with your finances! I can see you have ${
			this.context.budgets.length
		} budgets (${
			totalBudget > 0 ? `$${totalBudget.toFixed(2)} total` : 'no budgets set'
		}), ${this.context.goals.length} goals (${
			totalGoals > 0 ? `$${totalGoals.toFixed(2)} target` : 'no goals set'
		}), and ${
			this.context.transactions.length
		} transactions. What specific aspect would you like to know about?`;
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
			const category = t.category || 'Uncategorized';
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
			const response = await ApiService.post('/api/custom-gpt/upgrade', { tier });
			return response.success;
		} catch (error) {
			console.error('[CustomGPTService] Upgrade failed:', error);
			throw error;
		}
	}
}
