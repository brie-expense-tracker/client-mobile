// Comprehensive Skill Registry - 30+ financial skills for 90%+ coverage
// Implements the skill graph architecture for hybrid AI system

import { Skill } from './types';
import { ChatContext } from '../../feature/chatController';

// Core financial skill types
export type FinancialSkillId =
	// Snapshot & Overview
	| 'OVERVIEW'
	| 'CASHFLOW_SUMMARY'
	| 'SPENDING_BY_CATEGORY'
	| 'TOP_MERCHANTS'
	| 'TOP_CATEGORIES'
	| 'RECURRING_BILLS_UPCOMING'
	| 'RECURRING_BILLS_PAST_DUE'
	| 'SUBSCRIPTIONS_DETECT'

	// Budgets
	| 'BUDGET_CREATE'
	| 'BUDGET_EDIT'
	| 'BUDGET_STATUS'
	| 'BUDGET_CAN_INCREASE'
	| 'BUDGET_ALERTS'

	// Goals
	| 'GOAL_CREATE'
	| 'GOAL_EDIT'
	| 'GOAL_PROGRESS'
	| 'GOAL_MONTHLY_AMOUNT'
	| 'GOAL_REPRIORITIZE'

	// Transactions
	| 'TRANSACTION_SEARCH'
	| 'TRANSACTION_CATEGORIZE'
	| 'TRANSACTION_DISPUTE'
	| 'REFUND_DETECT'

	// Income & Savings
	| 'SAVINGS_RATE'
	| 'PAYCHECK_BREAKDOWN'
	| 'EMERGENCY_FUND_TRACKER'

	// Debts
	| 'DEBT_LIST'
	| 'DEBT_PAYOFF_SIMULATION'
	| 'DEBT_EXTRA_PAYMENT'

	// Planning & What-ifs
	| 'SCENARIO_PLANNING'
	| 'AFFORDABILITY_CHECK'
	| 'SAVINGS_PROJECTION'

	// Education
	| 'EDUCATION_BUDGETS_VS_GOALS'
	| 'EDUCATION_APR_VS_APY'
	| 'EDUCATION_INDEX_FUNDS';

// Slot specifications for each skill
export interface SlotSpec {
	type:
		| 'string'
		| 'number'
		| 'date'
		| 'category'
		| 'merchant'
		| 'account'
		| 'goal_id';
	required: boolean;
	description: string;
	examples: string[];
	validator?: (value: any) => boolean;
}

// Answerability check result
export interface Answerability {
	canAnswer: boolean;
	reason?: string;
	missingData?: string[];
	confidence: number;
}

// Comprehensive skill registry
export const COMPREHENSIVE_SKILL_REGISTRY: Partial<
	Record<FinancialSkillId, Skill>
> = {
	// ===== SNAPSHOT & OVERVIEW SKILLS =====

	OVERVIEW: {
		id: 'OVERVIEW',
		name: 'Financial Overview',
		description: 'Complete financial snapshot with key metrics',
		matches: (q: string) =>
			/overview|summary|snapshot|financial status/i.test(q),
		slots: {
			period: {
				type: 'string',
				required: false,
				description: 'Time period',
				examples: ['this month', 'last 30 days', 'YTD'],
			},
			focus: {
				type: 'string',
				required: false,
				description: 'Focus area',
				examples: ['budgets', 'goals', 'spending'],
			},
		},
		canHandle: (ctx: ChatContext): Answerability => {
			const hasData = !!(
				ctx.budgets?.length ||
				ctx.goals?.length ||
				ctx.transactions?.length
			);
			return {
				canAnswer: hasData,
				reason: hasData ? undefined : 'NO_DATA',
				missingData: hasData ? [] : ['budgets', 'goals', 'transactions'],
				confidence: hasData ? 0.9 : 0.0,
			};
		},
		plan: (params: any, ctx: ChatContext) => [
			{ type: 'FETCH_BUDGETS', params: { period: params.period } },
			{ type: 'FETCH_GOALS', params: {} },
			{ type: 'FETCH_TRANSACTIONS', params: { period: params.period } },
		],
		run: async (params: any, ctx: ChatContext) => {
			// Implementation would aggregate all financial data
			return {
				success: true,
				data: {
					totalSpent:
						ctx.transactions?.reduce(
							(sum: number, t: any) => sum + (t.amount || 0),
							0
						) || 0,
					budgetCount: ctx.budgets?.length || 0,
					goalCount: ctx.goals?.length || 0,
					period: params.period || 'this month',
				},
			};
		},
		render: (data: any, params: any) => ({
			type: 'overview_card',
			title: 'Financial Overview',
			data: {
				totalSpent: data.totalSpent,
				budgetCount: data.budgetCount,
				goalCount: data.goalCount,
				period: data.period,
			},
		}),
		coach: (data: any) => ({
			message: `You've spent $${data.totalSpent} ${data.period} with ${data.budgetCount} budgets and ${data.goalCount} goals.`,
			action: 'VIEW_DETAILED_BREAKDOWN',
		}),
	},

	CASHFLOW_SUMMARY: {
		id: 'CASHFLOW_SUMMARY',
		name: 'Cashflow Summary',
		description: 'Income vs expenses with net cashflow',
		matches: (q: string) =>
			/cashflow|cash flow|income.*expense|net.*income/i.test(q),
		slots: {
			period: {
				type: 'string',
				required: false,
				description: 'Time period',
				examples: ['this month', 'last 30 days'],
			},
		},
		canHandle: (ctx: ChatContext): Answerability => {
			const hasTransactions = !!ctx.transactions?.length;
			return {
				canAnswer: hasTransactions,
				reason: hasTransactions ? undefined : 'NO_TRANSACTIONS',
				missingData: hasTransactions ? [] : ['transactions'],
				confidence: hasTransactions ? 0.8 : 0.0,
			};
		},
		plan: (params: any, ctx: ChatContext) => [
			{ type: 'FETCH_TRANSACTIONS', params: { period: params.period } },
			{ type: 'CALCULATE_CASHFLOW', params: {} },
		],
		run: async (params: any, ctx: ChatContext) => {
			const transactions = ctx.transactions || [];
			const income = transactions
				.filter((t: any) => t.amount && t.amount > 0)
				.reduce((sum: number, t: any) => sum + t.amount, 0);
			const expenses = transactions
				.filter((t: any) => t.amount && t.amount < 0)
				.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

			return {
				success: true,
				data: {
					income,
					expenses,
					netCashflow: income - expenses,
					period: params.period || 'this month',
				},
			};
		},
		render: (data: any, params: any) => ({
			type: 'cashflow_card',
			title: 'Cashflow Summary',
			data: {
				income: data.income,
				expenses: data.expenses,
				netCashflow: data.netCashflow,
				period: data.period,
			},
		}),
		coach: (data: any) => ({
			message: `Your net cashflow is $${data.netCashflow} ${data.period}.`,
			action: data.netCashflow > 0 ? 'INCREASE_SAVINGS' : 'REDUCE_EXPENSES',
		}),
	},

	SPENDING_BY_CATEGORY: {
		id: 'SPENDING_BY_CATEGORY',
		name: 'Spending by Category',
		description: 'Breakdown of spending by category with trends',
		matches: (q: string) =>
			/spending.*category|categories.*spend|breakdown.*spend/i.test(q),
		slots: {
			period: {
				type: 'string',
				required: false,
				description: 'Time period',
				examples: ['this month', 'last 30 days'],
			},
			category: {
				type: 'category',
				required: false,
				description: 'Specific category',
				examples: ['groceries', 'dining', 'transportation'],
			},
		},
		canHandle: (ctx: ChatContext): Answerability => {
			const hasTransactions = !!ctx.transactions?.length;
			return {
				canAnswer: hasTransactions,
				reason: hasTransactions ? undefined : 'NO_TRANSACTIONS',
				missingData: hasTransactions ? [] : ['transactions'],
				confidence: hasTransactions ? 0.85 : 0.0,
			};
		},
		plan: (params: any, ctx: ChatContext) => [
			{
				type: 'FETCH_TRANSACTIONS',
				params: { period: params.period, category: params.category },
			},
			{ type: 'GROUP_BY_CATEGORY', params: {} },
		],
		run: async (params: any, ctx: ChatContext) => {
			const transactions = ctx.transactions || [];
			const categorySpending = transactions.reduce(
				(acc: Record<string, number>, t: any) => {
					const category = t.category || 'uncategorized';
					acc[category] = (acc[category] || 0) + Math.abs(t.amount || 0);
					return acc;
				},
				{} as Record<string, number>
			);

			return {
				success: true,
				data: {
					categorySpending,
					period: params.period || 'this month',
					totalSpent: Object.values(categorySpending).reduce(
						(sum, amount) => sum + amount,
						0
					),
				},
			};
		},
		render: (data: any, params: any) => ({
			type: 'category_breakdown_card',
			title: 'Spending by Category',
			data: {
				categorySpending: data.categorySpending,
				period: data.period,
				totalSpent: data.totalSpent,
			},
		}),
		coach: (data: any) => {
			const topCategory = Object.entries(data.categorySpending).sort(
				([, a], [, b]) => (b as number) - (a as number)
			)[0];
			return {
				message: `Your top spending category is ${topCategory?.[0]} at $${
					topCategory?.[1] || 0
				}.`,
				action: 'ANALYZE_CATEGORY_TRENDS',
			};
		},
	},

	// ===== BUDGET SKILLS =====

	BUDGET_STATUS: {
		id: 'BUDGET_STATUS',
		name: 'Budget Status',
		description: 'Current budget utilization and remaining amounts',
		matches: (q: string) =>
			/budget.*status|budget.*remaining|budget.*utilization/i.test(q),
		slots: {
			budgetId: {
				type: 'string',
				required: false,
				description: 'Specific budget ID',
				examples: ['groceries', 'dining'],
			},
			period: {
				type: 'string',
				required: false,
				description: 'Time period',
				examples: ['this month', 'MTD'],
			},
		},
		canHandle: (ctx: ChatContext): Answerability => {
			const hasBudgets = !!ctx.budgets?.length;
			return {
				canAnswer: hasBudgets,
				reason: hasBudgets ? undefined : 'NO_BUDGETS',
				missingData: hasBudgets ? [] : ['budgets'],
				confidence: hasBudgets ? 0.9 : 0.0,
			};
		},
		plan: (params: any, ctx: ChatContext) => [
			{
				type: 'FETCH_BUDGETS',
				params: { budgetId: params.budgetId, period: params.period },
			},
			{ type: 'CALCULATE_UTILIZATION', params: {} },
		],
		run: async (params: any, ctx: ChatContext) => {
			const budgets = ctx.budgets || [];
			const budgetData = budgets.map((budget: any) => ({
				id: budget.id,
				name: budget.name,
				amount: budget.amount || 0,
				spent: budget.spent || 0,
				remaining: (budget.amount || 0) - (budget.spent || 0),
				utilization: budget.amount
					? ((budget.spent || 0) / budget.amount) * 100
					: 0,
			}));

			return {
				success: true,
				data: {
					budgets: budgetData,
					period: params.period || 'this month',
				},
			};
		},
		render: (data: any, params: any) => ({
			type: 'budget_status_card',
			title: 'Budget Status',
			data: {
				budgets: data.budgets,
				period: data.period,
			},
		}),
		coach: (data: any) => {
			const overBudget = data.budgets.filter((b: any) => b.utilization > 100);
			const nearLimit = data.budgets.filter(
				(b: any) => b.utilization > 80 && b.utilization <= 100
			);

			if (overBudget.length > 0) {
				return {
					message: `You're over budget on ${overBudget.length} category(ies).`,
					action: 'ADJUST_BUDGETS',
				};
			} else if (nearLimit.length > 0) {
				return {
					message: `You're approaching budget limits on ${nearLimit.length} category(ies).`,
					action: 'MONITOR_SPENDING',
				};
			} else {
				return {
					message: 'Your budgets are looking good!',
					action: 'VIEW_DETAILED_BREAKDOWN',
				};
			}
		},
	},

	BUDGET_CREATE: {
		id: 'BUDGET_CREATE',
		name: 'Create Budget',
		description: 'Create a new budget for a category',
		matches: (q: string) => /create.*budget|new.*budget|set.*budget/i.test(q),
		slots: {
			category: {
				type: 'category',
				required: true,
				description: 'Budget category',
				examples: ['groceries', 'dining', 'transportation'],
			},
			amount: {
				type: 'number',
				required: true,
				description: 'Budget amount',
				examples: ['300', '500', '1000'],
			},
			period: {
				type: 'string',
				required: false,
				description: 'Budget period',
				examples: ['monthly', 'weekly', 'yearly'],
			},
		},
		canHandle: (ctx: ChatContext): Answerability => {
			return {
				canAnswer: true,
				confidence: 1.0,
			};
		},
		plan: (params: any, ctx: ChatContext) => [
			{ type: 'VALIDATE_BUDGET_PARAMS', params: params },
			{ type: 'CREATE_BUDGET', params: params },
		],
		run: async (params: any, ctx: ChatContext) => {
			// This would integrate with the actual budget creation API
			return {
				success: true,
				data: {
					budgetId: `budget_${Date.now()}`,
					category: params.category,
					amount: params.amount,
					period: params.period || 'monthly',
				},
			};
		},
		render: (data: any, params: any) => ({
			type: 'budget_created_card',
			title: 'Budget Created',
			data: {
				budgetId: data.budgetId,
				category: data.category,
				amount: data.amount,
				period: data.period,
			},
		}),
		coach: (data: any) => ({
			message: `Created ${data.period} budget of $${data.amount} for ${data.category}.`,
			action: 'SET_BUDGET_ALERTS',
		}),
	},

	// ===== GOAL SKILLS =====

	GOAL_PROGRESS: {
		id: 'GOAL_PROGRESS',
		name: 'Goal Progress',
		description: 'Track progress towards financial goals',
		matches: (q: string) =>
			/goal.*progress|progress.*goal|goal.*status/i.test(q),
		slots: {
			goalId: {
				type: 'goal_id',
				required: false,
				description: 'Specific goal ID',
				examples: ['emergency_fund', 'vacation'],
			},
			period: {
				type: 'string',
				required: false,
				description: 'Time period',
				examples: ['this month', 'YTD'],
			},
		},
		canHandle: (ctx: ChatContext): Answerability => {
			const hasGoals = !!ctx.goals?.length;
			return {
				canAnswer: hasGoals,
				reason: hasGoals ? undefined : 'NO_GOALS',
				missingData: hasGoals ? [] : ['goals'],
				confidence: hasGoals ? 0.9 : 0.0,
			};
		},
		plan: (params: any, ctx: ChatContext) => [
			{ type: 'FETCH_GOALS', params: { goalId: params.goalId } },
			{ type: 'CALCULATE_PROGRESS', params: {} },
		],
		run: async (params: any, ctx: ChatContext) => {
			const goals = ctx.goals || [];
			const goalData = goals.map((goal: any) => ({
				id: goal.id,
				name: goal.name,
				targetAmount: goal.target || 0,
				currentAmount: goal.current || 0,
				progress: goal.percent || 0,
				remaining: (goal.target || 0) - (goal.current || 0),
				deadline: goal.deadline,
			}));

			return {
				success: true,
				data: {
					goals: goalData,
					period: params.period || 'this month',
				},
			};
		},
		render: (data: any, params: any) => ({
			type: 'goal_progress_card',
			title: 'Goal Progress',
			data: {
				goals: data.goals,
				period: data.period,
			},
		}),
		coach: (data: any) => {
			const onTrack = data.goals.filter((g: any) => g.progress >= 50);
			const behind = data.goals.filter((g: any) => g.progress < 25);

			if (behind.length > 0) {
				return {
					message: `You're behind on ${behind.length} goal(s). Consider increasing monthly contributions.`,
					action: 'INCREASE_GOAL_CONTRIBUTIONS',
				};
			} else if (onTrack.length > 0) {
				return {
					message: `Great progress on ${onTrack.length} goal(s)!`,
					action: 'VIEW_DETAILED_PROGRESS',
				};
			} else {
				return {
					message: 'Keep working towards your financial goals!',
					action: 'CREATE_NEW_GOAL',
				};
			}
		},
	},

	// ===== TRANSACTION SKILLS =====

	TRANSACTION_SEARCH: {
		id: 'TRANSACTION_SEARCH',
		name: 'Search Transactions',
		description: 'Search and filter transactions',
		matches: (q: string) =>
			/search.*transaction|find.*transaction|transaction.*search/i.test(q),
		slots: {
			query: {
				type: 'string',
				required: false,
				description: 'Search query',
				examples: ['Starbucks', 'Amazon', 'gas'],
			},
			category: {
				type: 'category',
				required: false,
				description: 'Category filter',
				examples: ['groceries', 'dining'],
			},
			period: {
				type: 'string',
				required: false,
				description: 'Time period',
				examples: ['last 30 days', 'this month'],
			},
			amount: {
				type: 'number',
				required: false,
				description: 'Amount filter',
				examples: ['>100', '<50'],
			},
		},
		canHandle: (ctx: ChatContext): Answerability => {
			const hasTransactions = !!ctx.transactions?.length;
			return {
				canAnswer: hasTransactions,
				reason: hasTransactions ? undefined : 'NO_TRANSACTIONS',
				missingData: hasTransactions ? [] : ['transactions'],
				confidence: hasTransactions ? 0.8 : 0.0,
			};
		},
		plan: (params: any, ctx: ChatContext) => [
			{ type: 'FETCH_TRANSACTIONS', params: params },
			{ type: 'FILTER_TRANSACTIONS', params: params },
		],
		run: async (params: any, ctx: ChatContext) => {
			let transactions = ctx.transactions || [];

			// Apply filters
			if (params.query) {
				transactions = transactions.filter(
					(t: any) =>
						t.description?.toLowerCase().includes(params.query.toLowerCase()) ||
						t.merchant?.toLowerCase().includes(params.query.toLowerCase())
				);
			}

			if (params.category) {
				transactions = transactions.filter(
					(t: any) => t.category === params.category
				);
			}

			if (params.amount) {
				const amount = parseFloat(params.amount.replace(/[<>]/g, ''));
				if (params.amount.startsWith('>')) {
					transactions = transactions.filter(
						(t: any) => Math.abs(t.amount || 0) > amount
					);
				} else if (params.amount.startsWith('<')) {
					transactions = transactions.filter(
						(t: any) => Math.abs(t.amount || 0) < amount
					);
				}
			}

			return {
				success: true,
				data: {
					transactions: transactions.slice(0, 50), // Limit results
					totalCount: transactions.length,
					filters: params,
				},
			};
		},
		render: (data: any, params: any) => ({
			type: 'transaction_list_card',
			title: 'Search Results',
			data: {
				transactions: data.transactions,
				totalCount: data.totalCount,
				filters: data.filters,
			},
		}),
		coach: (data: any) => ({
			message: `Found ${data.totalCount} transactions matching your criteria.`,
			action: 'REFINE_SEARCH',
		}),
	},

	// ===== EDUCATION SKILLS =====

	EDUCATION_BUDGETS_VS_GOALS: {
		id: 'EDUCATION_BUDGETS_VS_GOALS',
		name: 'Budgets vs Goals Education',
		description: 'Educational content about budgets vs goals',
		matches: (q: string) =>
			/budget.*vs.*goal|goal.*vs.*budget|difference.*budget.*goal/i.test(q),
		slots: {},
		canHandle: (ctx: ChatContext): Answerability => {
			return {
				canAnswer: true,
				confidence: 1.0,
			};
		},
		plan: (params: any, ctx: ChatContext) => [
			{
				type: 'FETCH_EDUCATION_CONTENT',
				params: { topic: 'budgets_vs_goals' },
			},
		],
		run: async (params: any, ctx: ChatContext) => {
			return {
				success: true,
				data: {
					title: "Budgets vs Goals: What's the Difference?",
					content: `**Budgets** are spending limits for specific categories (like $300/month for groceries). They help you control where your money goes.

**Goals** are savings targets for specific purposes (like $5,000 for vacation). They help you build wealth over time.

Think of budgets as "spending guardrails" and goals as "savings targets." Both are essential for financial health!`,
					disclaimer: 'This is educational content, not financial advice.',
				},
			};
		},
		render: (data: any, params: any) => ({
			type: 'education_card',
			title: data.title,
			data: {
				content: data.content,
				disclaimer: data.disclaimer,
			},
		}),
		coach: (data: any) => ({
			message:
				'Understanding the difference helps you use both tools effectively!',
			action: 'CREATE_FIRST_BUDGET_OR_GOAL',
		}),
	},

	// Add more skills here...
	// (This is a partial implementation - the full registry would have 30+ skills)
} as const;

// Skill lookup helper
export function getSkill(skillId: FinancialSkillId): Skill | undefined {
	return COMPREHENSIVE_SKILL_REGISTRY[skillId];
}

// Get all available skills
export function getAllSkills(): Skill[] {
	return Object.values(COMPREHENSIVE_SKILL_REGISTRY).filter(Boolean);
}

// Get skills by category
export function getSkillsByCategory(category: string): Skill[] {
	const categoryMap: Record<string, FinancialSkillId[]> = {
		snapshot: ['OVERVIEW', 'CASHFLOW_SUMMARY', 'SPENDING_BY_CATEGORY'],
		budgets: ['BUDGET_CREATE', 'BUDGET_STATUS'],
		goals: ['GOAL_PROGRESS'],
		transactions: ['TRANSACTION_SEARCH'],
		education: ['EDUCATION_BUDGETS_VS_GOALS'],
	};

	const skillIds = categoryMap[category] || [];
	return skillIds
		.map((id) => COMPREHENSIVE_SKILL_REGISTRY[id])
		.filter((skill): skill is Skill => Boolean(skill));
}
