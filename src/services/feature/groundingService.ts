import { Budget, Goal, Transaction } from '../../types';

export type Intent =
	| 'GET_BALANCE'
	| 'GET_BUDGET_STATUS'
	| 'LIST_SUBSCRIPTIONS'
	| 'CATEGORIZE_TX'
	| 'FORECAST_SPEND'
	| 'CREATE_BUDGET'
	| 'GET_GOAL_PROGRESS'
	| 'GET_SPENDING_BREAKDOWN'
	| 'GENERAL_QA';

export interface GroundedResponse {
	type: 'data' | 'fallback';
	payload: any;
	confidence: number;
	modelUsed?: string;
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

export function detectIntent(q: string): Intent {
	const s = q.toLowerCase();

	// Balance queries
	if (
		/(what('| i)s|show)\s+.*balance|^balance\b|how much.*have|total.*money/.test(
			s
		)
	) {
		return 'GET_BALANCE';
	}

	// Budget status queries
	if (
		/budget|over budget|spent.*(this|last)\s*(week|month)|how much.*spent|remaining.*budget/.test(
			s
		)
	) {
		return 'GET_BUDGET_STATUS';
	}

	// Subscription/recurring expense queries
	if (/subscriptions?|recurring|monthly.*payments?|fixed.*expenses?/.test(s)) {
		return 'LIST_SUBSCRIPTIONS';
	}

	// Transaction categorization
	if (/categorize|category for|what.*category|classify/.test(s)) {
		return 'CATEGORIZE_TX';
	}

	// Spending forecast
	if (
		/forecast|project|predict.*spend|how much.*spend|future.*spending/.test(s)
	) {
		return 'FORECAST_SPEND';
	}

	// Budget creation
	if (/new budget|create budget|set up.*budget|start.*budget/.test(s)) {
		return 'CREATE_BUDGET';
	}

	// Goal progress
	if (/goal|progress|how.*saving|target.*amount|savings.*goal/.test(s)) {
		return 'GET_GOAL_PROGRESS';
	}

	// Spending breakdown
	if (/breakdown|spending.*by|category.*spending|where.*money/.test(s)) {
		return 'GET_SPENDING_BREAKDOWN';
	}

	return 'GENERAL_QA';
}

export class GroundingService {
	private context: FinancialContext;

	constructor(context: FinancialContext) {
		this.context = context;
	}

	async getBalance(): Promise<GroundedResponse> {
		try {
			const totalBalance = this.context.userProfile?.monthlyIncome || 0;
			const totalSpent = this.context.transactions.reduce(
				(sum, t) => sum + (t.amount || 0),
				0
			);
			const availableBalance = totalBalance - totalSpent;

			return {
				type: 'data',
				payload: {
					totalIncome: totalBalance,
					totalSpent,
					availableBalance,
					currency: 'USD',
				},
				confidence: 0.95,
			};
		} catch (error) {
			return {
				type: 'fallback',
				payload: null,
				confidence: 0,
			};
		}
	}

	async getBudgetStatus(): Promise<GroundedResponse> {
		try {
			const budgetStatus = this.context.budgets.map((budget) => {
				const spent = this.context.transactions
					.filter((t) => t.category === budget.name)
					.reduce((sum, t) => sum + (t.amount || 0), 0);

				const remaining = budget.amount - spent;
				const spentPercentage = (spent / budget.amount) * 100;

				return {
					name: budget.name,
					amount: budget.amount,
					spent,
					remaining,
					spentPercentage: Math.round(spentPercentage * 100) / 100,
					isOverBudget: spent > budget.amount,
					period: budget.period,
				};
			});

			const totalBudget = this.context.budgets.reduce(
				(sum, b) => sum + b.amount,
				0
			);
			const totalSpent = budgetStatus.reduce((sum, b) => sum + b.spent, 0);
			const overallStatus = {
				totalBudget,
				totalSpent,
				totalRemaining: totalBudget - totalSpent,
				overallPercentage:
					totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
				budgets: budgetStatus,
			};

			return {
				type: 'data',
				payload: overallStatus,
				confidence: 0.9,
			};
		} catch (error) {
			return {
				type: 'fallback',
				payload: null,
				confidence: 0,
			};
		}
	}

	async listSubscriptions(): Promise<GroundedResponse> {
		try {
			// Find recurring transactions (simplified heuristic)
			const recurringTransactions = this.context.transactions
				.filter((t) => {
					// Simple heuristic: transactions with same amount and category in recent months
					const recentTransactions = this.context.transactions.filter(
						(rt) =>
							rt.category === t.category &&
							rt.amount === t.amount &&
							rt.id !== t.id
					);
					return recentTransactions.length > 0;
				})
				.map((t) => ({
					name: t.category || 'Unknown',
					amount: t.amount,
					lastDate: t.date,
					category: t.category,
				}));

			// Remove duplicates
			const uniqueSubscriptions = recurringTransactions.filter(
				(item, index, self) =>
					index === self.findIndex((t) => t.name === item.name)
			);

			return {
				type: 'data',
				payload: {
					subscriptions: uniqueSubscriptions,
					totalMonthly: uniqueSubscriptions.reduce(
						(sum, s) => sum + s.amount,
						0
					),
				},
				confidence: 0.8,
			};
		} catch (error) {
			return {
				type: 'fallback',
				payload: null,
				confidence: 0,
			};
		}
	}

	async getGoalProgress(): Promise<GroundedResponse> {
		try {
			const goalProgress = this.context.goals.map((goal) => {
				const saved = this.context.transactions
					.filter((t) => t.type === 'income' || t.category === 'savings')
					.reduce((sum, t) => sum + (t.amount || 0), 0);

				const progress = Math.min((saved / goal.targetAmount) * 100, 100);

				return {
					name: goal.name,
					targetAmount: goal.targetAmount,
					currentAmount: saved,
					progress: Math.round(progress * 100) / 100,
					remaining: Math.max(goal.targetAmount - saved, 0),
					deadline: goal.deadline,
				};
			});

			return {
				type: 'data',
				payload: {
					goals: goalProgress,
					totalProgress:
						goalProgress.length > 0
							? goalProgress.reduce((sum, g) => sum + g.progress, 0) /
							  goalProgress.length
							: 0,
				},
				confidence: 0.85,
			};
		} catch (error) {
			return {
				type: 'fallback',
				payload: null,
				confidence: 0,
			};
		}
	}

	async getSpendingBreakdown(): Promise<GroundedResponse> {
		try {
			const categorySpending = this.context.transactions
				.filter((t) => t.amount > 0) // Only expenses
				.reduce((acc, t) => {
					const category = t.category || 'Uncategorized';
					acc[category] = (acc[category] || 0) + t.amount;
					return acc;
				}, {} as Record<string, number>);

			const breakdown = Object.entries(categorySpending)
				.map(([category, amount]) => ({ category, amount }))
				.sort((a, b) => b.amount - a.amount);

			const totalSpent = breakdown.reduce((sum, item) => sum + item.amount, 0);

			return {
				type: 'data',
				payload: {
					breakdown: breakdown.map((item) => ({
						...item,
						percentage: totalSpent > 0 ? (item.amount / totalSpent) * 100 : 0,
					})),
					totalSpent,
					topCategory: breakdown[0]?.category || 'None',
				},
				confidence: 0.9,
			};
		} catch (error) {
			return {
				type: 'fallback',
				payload: null,
				confidence: 0,
			};
		}
	}

	async forecastSpend(): Promise<GroundedResponse> {
		try {
			// Simple forecasting based on recent spending patterns
			const recentTransactions = this.context.transactions
				.filter(
					(t) =>
						t.date &&
						new Date(t.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
				)
				.filter((t) => t.amount > 0);

			const totalRecentSpending = recentTransactions.reduce(
				(sum, t) => sum + t.amount,
				0
			);
			const dailyAverage = totalRecentSpending / 30;
			const next30Days = dailyAverage * 30;

			// Simple confidence based on data consistency
			const amounts = recentTransactions.map((t) => t.amount);
			const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
			const variance =
				amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) /
				amounts.length;
			const confidence = Math.max(
				0.3,
				Math.min(0.9, 1 - variance / (mean * mean))
			);

			return {
				type: 'data',
				payload: {
					next30Days: Math.round(next30Days * 100) / 100,
					dailyAverage: Math.round(dailyAverage * 100) / 100,
					confidence: Math.round(confidence * 100) / 100,
					basedOnDays: recentTransactions.length,
				},
				confidence: confidence,
			};
		} catch (error) {
			return {
				type: 'fallback',
				payload: null,
				confidence: 0,
			};
		}
	}

	async categorizeTransaction(
		description: string,
		amount: number
	): Promise<GroundedResponse> {
		try {
			// Simple rule-based categorization
			const rules = [
				{
					keywords: ['food', 'grocery', 'restaurant', 'cafe', 'dining'],
					category: 'Food & Dining',
				},
				{
					keywords: ['gas', 'fuel', 'uber', 'lyft', 'transport'],
					category: 'Transportation',
				},
				{
					keywords: ['amazon', 'walmart', 'target', 'shop'],
					category: 'Shopping',
				},
				{
					keywords: ['netflix', 'spotify', 'subscription'],
					category: 'Entertainment',
				},
				{
					keywords: ['rent', 'mortgage', 'utilities', 'electric'],
					category: 'Housing',
				},
				{
					keywords: ['medical', 'doctor', 'pharmacy', 'health'],
					category: 'Healthcare',
				},
			];

			const desc = description.toLowerCase();
			let bestMatch = { category: 'Other', confidence: 0.3 };

			for (const rule of rules) {
				const matches = rule.keywords.filter((keyword) =>
					desc.includes(keyword)
				).length;
				const confidence = Math.min(matches / rule.keywords.length, 1);

				if (confidence > bestMatch.confidence) {
					bestMatch = { category: rule.category, confidence };
				}
			}

			return {
				type: 'data',
				payload: {
					category: bestMatch.category,
					confidence: bestMatch.confidence,
					description,
					amount,
				},
				confidence: bestMatch.confidence,
			};
		} catch (error) {
			return {
				type: 'fallback',
				payload: null,
				confidence: 0,
			};
		}
	}

	async tryGrounded(
		intent: Intent,
		input?: any
	): Promise<GroundedResponse | null> {
		try {
			switch (intent) {
				case 'GET_BALANCE':
					return await this.getBalance();

				case 'GET_BUDGET_STATUS':
					return await this.getBudgetStatus();

				case 'LIST_SUBSCRIPTIONS':
					return await this.listSubscriptions();

				case 'GET_GOAL_PROGRESS':
					return await this.getGoalProgress();

				case 'GET_SPENDING_BREAKDOWN':
					return await this.getSpendingBreakdown();

				case 'FORECAST_SPEND':
					return await this.forecastSpend();

				case 'CATEGORIZE_TX':
					if (input?.description && input?.amount) {
						return await this.categorizeTransaction(
							input.description,
							input.amount
						);
					}
					return null;

				case 'CREATE_BUDGET':
					// This requires more complex logic, better to route to LLM
					return null;

				default:
					return null;
			}
		} catch (error) {
			console.warn('Grounding service error:', error);
			return null;
		}
	}
}
