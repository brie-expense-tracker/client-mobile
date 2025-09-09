import { Budget, Goal, Transaction, RecurringExpense } from '../../types';

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
	recurringExpenses?: RecurringExpense[];
	userProfile?: {
		monthlyIncome?: number;
		financialGoal?: string;
		riskProfile?: string;
		currentBalance?: number;
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

	private validateInput(
		input: any,
		requiredFields: string[]
	): { isValid: boolean; error?: string } {
		if (!input || typeof input !== 'object') {
			return { isValid: false, error: 'Input must be an object' };
		}

		for (const field of requiredFields) {
			if (
				!(field in input) ||
				input[field] === undefined ||
				input[field] === null
			) {
				return { isValid: false, error: `Missing required field: ${field}` };
			}
		}

		return { isValid: true };
	}

	private validateAmount(amount: any): {
		isValid: boolean;
		error?: string;
		value?: number;
	} {
		if (typeof amount !== 'number' || isNaN(amount)) {
			return { isValid: false, error: 'Amount must be a valid number' };
		}

		if (amount < 0) {
			return { isValid: false, error: 'Amount cannot be negative' };
		}

		return { isValid: true, value: amount };
	}

	async getBalance(): Promise<GroundedResponse> {
		try {
			// Use actual balance if available, otherwise calculate from transactions
			const currentBalance = this.context.userProfile?.currentBalance;
			let totalIncome = 0;
			let totalSpent = 0;
			let availableBalance = 0;

			if (currentBalance !== undefined) {
				availableBalance = currentBalance;
				// Calculate income and expenses for context
				totalIncome = this.context.transactions
					.filter((t) => t.type === 'income')
					.reduce((sum, t) => sum + (t.amount || 0), 0);
				totalSpent = this.context.transactions
					.filter((t) => t.type === 'expense')
					.reduce((sum, t) => sum + (t.amount || 0), 0);
			} else {
				// Fallback to income-based calculation
				totalIncome = this.context.userProfile?.monthlyIncome || 0;
				totalSpent = this.context.transactions
					.filter((t) => t.type === 'expense')
					.reduce((sum, t) => sum + (t.amount || 0), 0);
				availableBalance = totalIncome - totalSpent;
			}

			return {
				type: 'data',
				payload: {
					currentBalance: availableBalance,
					totalIncome,
					totalSpent,
					availableBalance,
					currency: 'USD',
				},
				confidence: 0.95,
			};
		} catch (error) {
			console.error('Error getting balance:', error);
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
			console.error('Error getting budget status:', error);
			return {
				type: 'fallback',
				payload: null,
				confidence: 0,
			};
		}
	}

	async listSubscriptions(): Promise<GroundedResponse> {
		try {
			let subscriptions: {
				name: string;
				amount: number;
				lastDate: Date;
				category: string;
				frequency?: string;
				isActive?: boolean;
			}[] = [];

			// First, use explicit recurring expenses if available
			if (
				this.context.recurringExpenses &&
				this.context.recurringExpenses.length > 0
			) {
				subscriptions = this.context.recurringExpenses
					.filter((re) => re.isActive)
					.map((re) => ({
						name: re.name,
						amount: re.amount,
						lastDate: re.lastPaid || re.nextDue,
						category: re.category,
						frequency: re.frequency,
						isActive: re.isActive,
					}));
			} else {
				// Fallback: Find recurring transactions using heuristics
				const recurringTransactions = this.context.transactions
					.filter((t) => {
						// Simple heuristic: transactions with same amount and category in recent months
						const recentTransactions = this.context.transactions.filter(
							(rt) =>
								rt.category === t.category &&
								rt.amount === t.amount &&
								rt.id !== t.id &&
								Math.abs(
									new Date(rt.date).getTime() - new Date(t.date).getTime()
								) <
									45 * 24 * 60 * 60 * 1000 // Within 45 days
						);
						return recentTransactions.length > 0;
					})
					.map((t) => ({
						name: t.category || 'Unknown',
						amount: t.amount,
						lastDate: t.date,
						category: t.category || 'Unknown',
						frequency: 'monthly', // Default assumption
						isActive: true,
					}));

				// Remove duplicates
				subscriptions = recurringTransactions.filter(
					(item, index, self) =>
						index === self.findIndex((t) => t.name === item.name)
				);
			}

			return {
				type: 'data',
				payload: {
					subscriptions,
					totalMonthly: subscriptions.reduce((sum, s) => sum + s.amount, 0),
				},
				confidence: this.context.recurringExpenses ? 0.95 : 0.8,
			};
		} catch (error) {
			console.error('Error listing subscriptions:', error);
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
			console.error('Error getting goal progress:', error);
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
			console.error('Error getting spending breakdown:', error);
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
			console.error('Error forecasting spend:', error);
			return {
				type: 'fallback',
				payload: null,
				confidence: 0,
			};
		}
	}

	async createBudget(
		name: string,
		amount: number,
		period: 'weekly' | 'monthly' = 'monthly',
		categories?: string[]
	): Promise<GroundedResponse> {
		try {
			// Validate inputs
			if (!name || name.trim().length === 0) {
				return {
					type: 'fallback',
					payload: { error: 'Budget name is required' },
					confidence: 0,
				};
			}

			if (amount <= 0) {
				return {
					type: 'fallback',
					payload: { error: 'Budget amount must be greater than 0' },
					confidence: 0,
				};
			}

			// Check if budget with same name already exists
			const existingBudget = this.context.budgets.find(
				(b) => b.name.toLowerCase() === name.toLowerCase()
			);

			if (existingBudget) {
				return {
					type: 'fallback',
					payload: { error: 'Budget with this name already exists' },
					confidence: 0,
				};
			}

			// Create new budget object
			const newBudget: Budget = {
				id: `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				name: name.trim(),
				amount,
				spent: 0,
				period,
				utilization: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
				categories: categories || [],
				shouldAlert: true,
				spentPercentage: 0,
			};

			// Calculate current spending for this budget's categories
			if (categories && categories.length > 0) {
				const currentSpending = this.context.transactions
					.filter(
						(t) =>
							t.type === 'expense' &&
							t.category &&
							categories.includes(t.category)
					)
					.reduce((sum, t) => sum + (t.amount || 0), 0);

				newBudget.spent = currentSpending;
				newBudget.utilization = (currentSpending / amount) * 100;
				newBudget.spentPercentage = newBudget.utilization;
			}

			return {
				type: 'data',
				payload: {
					budget: newBudget,
					message: `Budget "${name}" created successfully`,
					recommendations: this.getBudgetRecommendations(newBudget),
				},
				confidence: 0.9,
			};
		} catch (error) {
			console.error('Error creating budget:', error);
			return {
				type: 'fallback',
				payload: { error: 'Failed to create budget' },
				confidence: 0,
			};
		}
	}

	private getBudgetRecommendations(budget: Budget): string[] {
		const recommendations: string[] = [];

		if (budget.amount > 1000) {
			recommendations.push(
				'Consider breaking this large budget into smaller, more manageable categories'
			);
		}

		if (budget.period === 'weekly' && budget.amount > 500) {
			recommendations.push(
				'Weekly budget seems high - consider if this should be monthly'
			);
		}

		if (budget.categories && budget.categories.length === 0) {
			recommendations.push('Add specific categories to better track spending');
		}

		return recommendations;
	}

	async categorizeTransaction(
		description: string,
		amount: number
	): Promise<GroundedResponse> {
		try {
			// Validate inputs
			if (
				!description ||
				typeof description !== 'string' ||
				description.trim().length === 0
			) {
				return {
					type: 'fallback',
					payload: {
						error: 'Description is required and must be a non-empty string',
					},
					confidence: 0,
				};
			}

			const amountValidation = this.validateAmount(amount);
			if (!amountValidation.isValid) {
				return {
					type: 'fallback',
					payload: { error: amountValidation.error },
					confidence: 0,
				};
			}

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
			console.error('Error categorizing transaction:', error);
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
					const validation = this.validateInput(input, [
						'description',
						'amount',
					]);
					if (!validation.isValid) {
						return {
							type: 'fallback',
							payload: { error: validation.error },
							confidence: 0,
						};
					}
					return await this.categorizeTransaction(
						input.description,
						input.amount
					);

				case 'CREATE_BUDGET':
					const budgetValidation = this.validateInput(input, [
						'name',
						'amount',
					]);
					if (!budgetValidation.isValid) {
						return {
							type: 'fallback',
							payload: { error: budgetValidation.error },
							confidence: 0,
						};
					}
					return await this.createBudget(
						input.name,
						input.amount,
						input.period || 'monthly',
						input.categories
					);

				default:
					return {
						type: 'fallback',
						payload: null,
						confidence: 0,
					};
			}
		} catch (error) {
			console.warn('Grounding service error:', error);
			return {
				type: 'fallback',
				payload: null,
				confidence: 0,
			};
		}
	}
}
