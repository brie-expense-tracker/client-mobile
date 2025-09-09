// Helpful fallbacks with data-first guardrails
// Instead of generic "try again later" messages, always return some value + useful actions

import { ChatResponse } from './responseSchema';
import { skillExecutor } from './skillExecutor';

export interface FinancialContext {
	snapshots?: {
		lastMonth?: {
			total: number;
			income: number;
			expenses: number;
			savings: number;
		};
		currentMonth?: {
			total: number;
			income: number;
			expenses: number;
			savings: number;
		};
	};
	recentSpendByCat?: {
		cat: string;
		spent: number;
		percentage: number;
	}[];
	budgets?: {
		name: string;
		amount: number;
		spent: number;
		remaining: number;
		utilization: number;
	}[];
	goals?: {
		name: string;
		target: number;
		current: number;
		percent: number;
	}[];
	transactions?: {
		amount: number;
		category: string;
		date: Date;
		type: 'income' | 'expense';
	}[];
	recurringExpenses?: {
		id: string;
		name: string;
		amount: number;
		category: string;
		frequency: string;
		nextDue: Date;
		isOverdue?: boolean;
		isDueSoon?: boolean;
		daysUntilDue?: number;
	}[];
	profile?: {
		monthlyIncome?: number;
		savings?: number;
		debt?: number;
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

export function helpfulFallback(
	userQuestion: string,
	ctx: FinancialContext
): ChatResponse {
	// Extract key data points with proper defaults
	const lastMonth = ctx.snapshots?.lastMonth || {
		total: 0,
		income: 0,
		expenses: 0,
		savings: 0,
	};
	const currentMonth = ctx.snapshots?.currentMonth || {
		total: 0,
		income: 0,
		expenses: 0,
		savings: 0,
	};
	const recentCats = ctx.recentSpendByCat?.slice(0, 3) || [];
	const budgets = ctx.budgets || [];
	const goals = ctx.goals || [];
	const profile = ctx.profile || {};

	// Determine the most relevant fallback based on question content
	const questionLower = userQuestion.toLowerCase();

	if (questionLower.includes('budget') || questionLower.includes('spend')) {
		return createBudgetFallback(recentCats, budgets, currentMonth);
	} else if (questionLower.includes('goal') || questionLower.includes('save')) {
		return createGoalFallback(goals, profile);
	} else if (
		questionLower.includes('income') ||
		questionLower.includes('money')
	) {
		return createIncomeFallback(profile, lastMonth);
	} else if (
		questionLower.includes('expense') ||
		questionLower.includes('transaction')
	) {
		return createExpenseFallback(recentCats, ctx.transactions || []);
	} else {
		// Generic but helpful fallback
		return createGenericFallback(recentCats, budgets, goals, lastMonth);
	}
}

function createBudgetFallback(
	recentCats: { cat: string; spent: number; percentage: number }[],
	budgets: {
		name: string;
		amount: number;
		spent: number;
		remaining: number;
		utilization: number;
	}[],
	currentMonth: {
		total: number;
		income: number;
		expenses: number;
		savings: number;
	}
): ChatResponse {
	if (recentCats.length > 0) {
		const topCategory = recentCats[0];

		return {
			message: `I can partially help now and finish once I have more data.`,
			details: `Based on your data through ${new Date().toLocaleDateString(
				'en-US',
				{ month: 'short', day: 'numeric' }
			)}, you're at $${topCategory.spent.toFixed(0)} for ${
				topCategory.cat
			}. Want me to predict this month with your typical cadence?`,
			actions: [
				{
					label: 'Connect Checking',
					action: 'OPEN_BUDGETS',
					params: { focus: 'connect' },
				},
				{
					label: 'Pick a time window',
					action: 'OPEN_BUDGETS',
					params: { focus: 'timeframe' },
				},
				{ label: 'Open Budgets', action: 'OPEN_BUDGETS' },
			],
			skills: [
				{
					name: 'CREATE_RULE',
					params: { cat: topCategory.cat, priority: 8 },
					description: `Create a categorization rule for ${topCategory.cat} transactions`,
					confidence: 0.9,
				},
				{
					name: 'GET_SPENDING_INSIGHT',
					params: { category: topCategory.cat },
					description: `Get detailed insights for ${topCategory.cat} spending`,
					confidence: 0.8,
				},
			],
			sources: [{ kind: 'cache' }],
			cost: { model: 'mini', estTokens: 0 },
		};
	} else if (budgets.length > 0) {
		const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
		const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
		const remaining = totalBudget - totalSpent;

		// Check for high utilization budgets
		const highUtilization = budgets.filter((b) => b.utilization > 80);
		const skills =
			highUtilization.length > 0
				? [
						{
							name: 'ADJUST_LIMIT',
							params: {
								cat: highUtilization[0].name,
								delta: highUtilization[0].amount * 0.15,
								reason: 'High utilization detected',
							},
							description: `Increase budget for ${highUtilization[0].name} to prevent overspending`,
							confidence: 0.8,
						},
				  ]
				: [];

		return {
			message: `I can partially help now and finish once I have more data.`,
			details: `Based on your data through ${new Date().toLocaleDateString(
				'en-US',
				{ month: 'short', day: 'numeric' }
			)}, you have $${remaining.toFixed(
				0
			)} remaining across your budgets this month. Want me to predict September with your typical cadence?`,
			actions: [
				{
					label: 'Connect Checking',
					action: 'OPEN_BUDGETS',
					params: { focus: 'connect' },
				},
				{
					label: 'Pick a time window',
					action: 'OPEN_BUDGETS',
					params: { focus: 'timeframe' },
				},
				{ label: 'Open Budgets', action: 'OPEN_BUDGETS' },
			],
			skills,
			sources: [{ kind: 'cache' }],
			cost: { model: 'mini', estTokens: 0 },
		};
	} else {
		return {
			message: `I can partially help now and finish once I have more data.`,
			details: `Setting up budgets is a great way to track and control your spending. Want me to help you get started with your first budget?`,
			actions: [
				{
					label: 'Connect Checking',
					action: 'OPEN_BUDGETS',
					params: { focus: 'connect' },
				},
				{
					label: 'Pick a time window',
					action: 'OPEN_BUDGETS',
					params: { focus: 'timeframe' },
				},
				{ label: 'Create First Budget', action: 'OPEN_BUDGETS' },
			],
			skills: [
				{
					name: 'SET_SAVINGS_TARGET',
					params: { goalName: 'Budget Setup', targetAmount: 1000 },
					description: 'Set up your first financial goal to get started',
					confidence: 0.9,
				},
			],
			sources: [{ kind: 'cache' }],
			cost: { model: 'mini', estTokens: 0 },
		};
	}
}

function createGoalFallback(
	goals: {
		name: string;
		target: number;
		current: number;
		percent: number;
	}[],
	profile: { monthlyIncome?: number; savings?: number; debt?: number }
): ChatResponse {
	if (goals.length > 0) {
		const avgProgress =
			goals.reduce((sum, g) => sum + g.percent, 0) / goals.length;
		const topGoal = goals.sort((a, b) => b.percent - a.percent)[0];

		// Check for goals that need attention
		const needsAttention = goals.filter((g) => g.percent < 30);
		const skills =
			needsAttention.length > 0
				? [
						{
							name: 'SET_SAVINGS_TARGET',
							params: {
								goalName: needsAttention[0].name,
								targetAmount: needsAttention[0].target,
								monthlyContribution:
									(needsAttention[0].target - needsAttention[0].current) / 6,
							},
							description: `Boost progress on ${needsAttention[0].name} with increased monthly contribution`,
							confidence: 0.8,
						},
				  ]
				: [];

		return {
			message: `I can partially help now and finish once I have more data.`,
			details: `Based on your data through ${new Date().toLocaleDateString(
				'en-US',
				{ month: 'short', day: 'numeric' }
			)}, your goals are ${avgProgress.toFixed(0)}% complete on average. ${
				topGoal.name
			} is ${topGoal.percent.toFixed(
				0
			)}% complete. Want me to predict September with your typical cadence?`,
			actions: [
				{
					label: 'Connect Checking',
					action: 'OPEN_BUDGETS',
					params: { focus: 'connect' },
				},
				{
					label: 'Pick a time window',
					action: 'OPEN_BUDGETS',
					params: { focus: 'timeframe' },
				},
				{ label: 'View Goals', action: 'OPEN_BUDGETS' },
			],
			skills,
			sources: [{ kind: 'cache' }],
			cost: { model: 'mini', estTokens: 0 },
		};
	} else {
		return {
			message: `I can partially help now and finish once I have more data.`,
			details: profile.monthlyIncome
				? `With your monthly income of $${profile.monthlyIncome.toFixed(
						0
				  )}, setting savings goals could help build wealth. Want me to help you get started?`
				: 'Setting financial goals is a great way to stay motivated! Want me to help you create your first goal?',
			actions: [
				{
					label: 'Connect Checking',
					action: 'OPEN_BUDGETS',
					params: { focus: 'connect' },
				},
				{
					label: 'Pick a time window',
					action: 'OPEN_BUDGETS',
					params: { focus: 'timeframe' },
				},
				{ label: 'Create First Goal', action: 'OPEN_BUDGETS' },
			],
			skills: [
				{
					name: 'SET_SAVINGS_TARGET',
					params: {
						goalName: 'Emergency Fund',
						targetAmount: profile.monthlyIncome
							? profile.monthlyIncome * 0.2
							: 1000,
						monthlyContribution: profile.monthlyIncome
							? profile.monthlyIncome * 0.05
							: 100,
					},
					description: 'Create your first emergency fund goal',
					confidence: 0.9,
				},
			],
			sources: [{ kind: 'cache' }],
			cost: { model: 'mini', estTokens: 0 },
		};
	}
}

function createIncomeFallback(
	profile: { monthlyIncome?: number; savings?: number; debt?: number },
	lastMonth: {
		total: number;
		income: number;
		expenses: number;
		savings: number;
	}
): ChatResponse {
	if (profile.monthlyIncome) {
		return {
			message: `I can partially help now and finish once I have more data.`,
			details: `Based on your data through ${new Date().toLocaleDateString(
				'en-US',
				{ month: 'short', day: 'numeric' }
			)}, your monthly income is $${profile.monthlyIncome.toFixed(0)}. ${
				lastMonth.total
					? `Last month you saved $${lastMonth.savings?.toFixed(0) || '0'}.`
					: ''
			} Want me to predict September with your typical cadence?`,
			actions: [
				{
					label: 'Connect Checking',
					action: 'OPEN_BUDGETS',
					params: { focus: 'connect' },
				},
				{
					label: 'Pick a time window',
					action: 'OPEN_BUDGETS',
					params: { focus: 'timeframe' },
				},
				{ label: 'Review Budgets', action: 'OPEN_BUDGETS' },
			],
			sources: [{ kind: 'cache' }],
			cost: { model: 'mini', estTokens: 0 },
		};
	} else {
		return {
			message: `I can partially help now and finish once I have more data.`,
			details:
				'Understanding your income and expenses is the first step to better financial management. Want me to help you set up your financial profile?',
			actions: [
				{
					label: 'Connect Checking',
					action: 'OPEN_BUDGETS',
					params: { focus: 'connect' },
				},
				{
					label: 'Pick a time window',
					action: 'OPEN_BUDGETS',
					params: { focus: 'timeframe' },
				},
				{ label: 'Set Up Profile', action: 'OPEN_BUDGETS' },
			],
			sources: [{ kind: 'cache' }],
			cost: { model: 'mini', estTokens: 0 },
		};
	}
}

function createExpenseFallback(
	recentCats: { cat: string; spent: number; percentage: number }[],
	transactions: {
		amount: number;
		category: string;
		date: Date;
		type: 'income' | 'expense';
	}[]
): ChatResponse {
	if (recentCats.length > 0) {
		const topCategory = recentCats[0];
		const totalSpent = recentCats.reduce((sum, cat) => sum + cat.spent, 0);

		return {
			message: `I can partially help now and finish once I have more data.`,
			details: `Based on your data through ${new Date().toLocaleDateString(
				'en-US',
				{ month: 'short', day: 'numeric' }
			)}, you've spent $${totalSpent.toFixed(
				0
			)} this month. Your top spending category is ${
				topCategory.cat
			} at $${topCategory.spent.toFixed(
				0
			)}. Want me to predict September with your typical cadence?`,
			actions: [
				{
					label: 'Connect Checking',
					action: 'OPEN_BUDGETS',
					params: { focus: 'connect' },
				},
				{
					label: 'Pick a time window',
					action: 'OPEN_BUDGETS',
					params: { focus: 'timeframe' },
				},
				{
					label: 'Create rule for top category',
					action: 'CREATE_RULE',
					params: { cat: topCategory.cat },
				},
			],
			sources: [{ kind: 'cache' }],
			cost: { model: 'mini', estTokens: 0 },
		};
	} else if (transactions.length > 0) {
		const recentSpending = transactions
			.filter((t) => t.type === 'expense')
			.slice(0, 5)
			.reduce((sum, t) => sum + t.amount, 0);

		return {
			message: `I can partially help now and finish once I have more data.`,
			details: `Based on your data through ${new Date().toLocaleDateString(
				'en-US',
				{ month: 'short', day: 'numeric' }
			)}, your recent expenses total $${recentSpending.toFixed(
				0
			)}. Want me to predict September with your typical cadence?`,
			actions: [
				{
					label: 'Connect Checking',
					action: 'OPEN_BUDGETS',
					params: { focus: 'connect' },
				},
				{
					label: 'Pick a time window',
					action: 'OPEN_BUDGETS',
					params: { focus: 'timeframe' },
				},
				{ label: 'Track Expenses', action: 'OPEN_BUDGETS' },
			],
			sources: [{ kind: 'cache' }],
			cost: { model: 'mini', estTokens: 0 },
		};
	} else {
		return {
			message: `I can partially help now and finish once I have more data.`,
			details:
				'Tracking your expenses helps identify spending patterns and areas to save. Want me to help you start tracking your expenses?',
			actions: [
				{
					label: 'Connect Checking',
					action: 'OPEN_BUDGETS',
					params: { focus: 'connect' },
				},
				{
					label: 'Pick a time window',
					action: 'OPEN_BUDGETS',
					params: { focus: 'timeframe' },
				},
				{ label: 'Start Tracking', action: 'OPEN_BUDGETS' },
			],
			sources: [{ kind: 'cache' }],
			cost: { model: 'mini', estTokens: 0 },
		};
	}
}

function createGenericFallback(
	recentCats: { cat: string; spent: number; percentage: number }[],
	budgets: {
		name: string;
		amount: number;
		spent: number;
		remaining: number;
		utilization: number;
	}[],
	goals: {
		name: string;
		target: number;
		current: number;
		percent: number;
	}[],
	lastMonth: {
		total: number;
		income: number;
		expenses: number;
		savings: number;
	}
): ChatResponse {
	// Create financial context for skill suggestions
	const context: FinancialContext = {
		budgets,
		goals,
		recentSpendByCat: recentCats,
		snapshots: { lastMonth },
	};

	// Get contextual skill suggestions
	const contextualSkills = skillExecutor.getContextualSkills(context);

	if (recentCats.length > 0) {
		const topCategory = recentCats[0];
		return {
			message: `I can partially help now and finish once I have more data.`,
			details: `Based on your data through ${new Date().toLocaleDateString(
				'en-US',
				{ month: 'short', day: 'numeric' }
			)}, you've spent $${topCategory.spent.toFixed(0)} on ${
				topCategory.cat
			} this month. ${
				lastMonth.total
					? `Last month total spend: $${lastMonth.total.toFixed(0)}.`
					: ''
			} Want me to predict September with your typical cadence?`,
			actions: [
				{
					label: 'Connect Checking',
					action: 'OPEN_BUDGETS',
					params: { focus: 'connect' },
				},
				{
					label: 'Pick a time window',
					action: 'OPEN_BUDGETS',
					params: { focus: 'timeframe' },
				},
				{
					label: 'Create rule for top category',
					action: 'CREATE_RULE',
					params: { cat: topCategory.cat },
				},
			],
			skills: [
				{
					name: 'CREATE_RULE',
					params: { cat: topCategory.cat, priority: 8 },
					description: `Create a categorization rule for ${topCategory.cat} transactions`,
					confidence: 0.9,
				},
				{
					name: 'GET_SPENDING_INSIGHT',
					params: { category: topCategory.cat },
					description: `Get detailed insights for ${topCategory.cat} spending`,
					confidence: 0.8,
				},
			],
			sources: [{ kind: 'cache' }],
			cost: { model: 'mini', estTokens: 0 },
		};
	} else if (budgets.length > 0 || goals.length > 0) {
		return {
			message: `I can partially help now and finish once I have more data.`,
			details: `Based on your data through ${new Date().toLocaleDateString(
				'en-US',
				{ month: 'short', day: 'numeric' }
			)}, you have ${budgets.length} budgets and ${
				goals.length
			} goals set up. Want me to help you review them?`,
			actions: [
				{
					label: 'Connect Checking',
					action: 'OPEN_BUDGETS',
					params: { focus: 'connect' },
				},
				{
					label: 'Pick a time window',
					action: 'OPEN_BUDGETS',
					params: { focus: 'timeframe' },
				},
				{ label: 'Open Budgets', action: 'OPEN_BUDGETS' },
			],
			skills: contextualSkills.slice(0, 2).map((s) => ({
				name: s.skillName,
				params: s.suggestedParams,
				description: s.description,
				confidence: s.confidence,
			})),
			sources: [{ kind: 'cache' }],
			cost: { model: 'mini', estTokens: 0 },
		};
	} else {
		return {
			message: `I can partially help now and finish once I have more data.`,
			details:
				'I can help you with budgeting, saving, debt management, and financial planning. Want me to help you get started?',
			actions: [
				{
					label: 'Connect Checking',
					action: 'OPEN_BUDGETS',
					params: { focus: 'connect' },
				},
				{
					label: 'Pick a time window',
					action: 'OPEN_BUDGETS',
					params: { focus: 'timeframe' },
				},
				{ label: 'Get Started', action: 'OPEN_BUDGETS' },
			],
			skills: [
				{
					name: 'SET_SAVINGS_TARGET',
					params: { goalName: 'Financial Start', targetAmount: 500 },
					description: 'Create your first financial goal to get started',
					confidence: 0.9,
				},
			],
			sources: [{ kind: 'cache' }],
			cost: { model: 'mini', estTokens: 0 },
		};
	}
}

// Helper function to extract financial context from available data
export function extractFinancialContext(
	budgets: any[],
	goals: any[],
	transactions: any[],
	profile: any
): FinancialContext {
	// Calculate recent spending by category
	const recentTransactions = transactions
		.filter((t) => t.type === 'expense' && t.amount > 0)
		.slice(-30); // Last 30 transactions

	const categorySpending = new Map<string, number>();
	recentTransactions.forEach((t) => {
		const category = t.category || t.budget || 'Uncategorized';
		categorySpending.set(
			category,
			(categorySpending.get(category) || 0) + t.amount
		);
	});

	const recentSpendByCat = Array.from(categorySpending.entries())
		.map(([cat, spent]) => ({ cat, spent, percentage: 0 }))
		.sort((a, b) => b.spent - a.spent)
		.slice(0, 5);

	// Calculate percentages
	const totalSpent = recentSpendByCat.reduce(
		(sum, item) => sum + item.spent,
		0
	);
	recentSpendByCat.forEach((item) => {
		item.percentage = totalSpent > 0 ? (item.spent / totalSpent) * 100 : 0;
	});

	// Calculate monthly snapshots
	const now = new Date();
	const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

	const currentMonthTransactions = transactions.filter(
		(t) => new Date(t.date) >= currentMonthStart
	);
	const lastMonthTransactions = transactions.filter(
		(t) =>
			new Date(t.date) >= lastMonthStart && new Date(t.date) <= lastMonthEnd
	);

	const calculateMonthlyStats = (transactions: any[]) => {
		const income = transactions
			.filter((t) => t.type === 'income')
			.reduce((sum, t) => sum + t.amount, 0);
		const expenses = transactions
			.filter((t) => t.type === 'expense')
			.reduce((sum, t) => sum + t.amount, 0);
		return {
			income,
			expenses,
			total: income + expenses,
			savings: income - expenses,
		};
	};

	return {
		snapshots: {
			currentMonth: calculateMonthlyStats(currentMonthTransactions),
			lastMonth: calculateMonthlyStats(lastMonthTransactions),
		},
		recentSpendByCat: recentSpendByCat,
		budgets: budgets.map((b) => ({
			name: b.name,
			amount: b.amount || 0,
			spent: b.spent || 0,
			remaining: (b.amount || 0) - (b.spent || 0),
			utilization: b.amount ? ((b.spent || 0) / b.amount) * 100 : 0,
		})),
		goals: goals.map((g) => ({
			name: g.name,
			target: g.target || 0,
			current: g.current || 0,
			percent: g.target ? ((g.current || 0) / g.target) * 100 : 0,
		})),
		transactions,
		profile: {
			monthlyIncome: profile?.monthlyIncome,
			savings: profile?.savings,
			debt: profile?.debt,
		},
	};
}
