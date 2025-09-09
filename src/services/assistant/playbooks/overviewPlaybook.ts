// Financial Overview Playbook - Grounded, deterministic financial summaries
// Generates personalized overviews without requiring LLM calls

import { ChatResponse } from '../responseSchema';
import { FinancialContext } from '../helpfulFallbacks';

export interface OverviewData {
	period: 'last_7d' | 'last_30d' | 'MTD' | 'QTD' | 'YTD';
	cashflow: {
		income: number;
		spending: number;
		net: number;
	};
	categories: {
		name: string;
		amount: number;
		pctOfTotal: number;
		pctOfBudget?: number;
	}[];
	budgets: {
		name: string;
		usedPct: number;
		remaining: number;
		status: 'on_track' | 'warning' | 'over_budget';
	}[];
	upcomingBills: {
		name: string;
		due: string;
		amount: number;
		daysUntil: number;
	}[];
	goals: {
		name: string;
		saved: number;
		target: number;
		pct: number;
		eta: string;
		status: 'on_track' | 'behind' | 'ahead';
	}[];
	alerts: {
		type: 'budget_warning' | 'bill_due' | 'goal_behind' | 'overspend';
		message: string;
		severity: 'info' | 'warning' | 'urgent';
	}[];
}

export function buildFinancialOverview(
	context: FinancialContext,
	period: 'last_7d' | 'last_30d' | 'MTD' | 'QTD' | 'YTD' = 'last_30d'
): OverviewData {
	const now = new Date();
	const periodStart = getPeriodStart(now, period);

	// Calculate cashflow
	const transactions =
		context.transactions?.filter((t) => new Date(t.date) >= periodStart) || [];

	const income = transactions
		.filter((t) => t.amount > 0)
		.reduce((sum, t) => sum + t.amount, 0);

	const spending = Math.abs(
		transactions
			.filter((t) => t.amount < 0)
			.reduce((sum, t) => sum + t.amount, 0)
	);

	const net = income - spending;

	// Calculate top spending categories
	const categorySpending = new Map<string, number>();
	transactions
		.filter((t) => t.amount < 0)
		.forEach((t) => {
			const category = t.category || 'Uncategorized';
			categorySpending.set(
				category,
				(categorySpending.get(category) || 0) + Math.abs(t.amount)
			);
		});

	const categories = Array.from(categorySpending.entries())
		.map(([name, amount]) => ({
			name,
			amount,
			pctOfTotal: spending > 0 ? (amount / spending) * 100 : 0,
		}))
		.sort((a, b) => b.amount - a.amount)
		.slice(0, 3);

	// Calculate budget status
	const budgets =
		context.budgets?.map((budget) => {
			const usedPct =
				budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
			const remaining = budget.amount - budget.spent;
			let status: 'on_track' | 'warning' | 'over_budget';

			if (usedPct > 100) status = 'over_budget';
			else if (usedPct > 80) status = 'warning';
			else status = 'on_track';

			return {
				name: budget.name,
				usedPct,
				remaining,
				status,
			};
		}) || [];

	// Calculate upcoming bills (simplified - would need recurring expenses data)
	const upcomingBills: {
		name: string;
		due: string;
		amount: number;
		daysUntil: number;
	}[] = [];

	// Calculate goal progress
	const goals =
		context.goals?.map((goal) => {
			const saved = goal.current || 0;
			const target = goal.target || 0;
			const pct = target > 0 ? (saved / target) * 100 : 0;

			// Simple ETA calculation (would be more sophisticated in real implementation)
			const monthlyContribution = context.profile?.monthlyIncome
				? context.profile.monthlyIncome * 0.1
				: 100; // Assume 10% savings rate
			const remaining = target - saved;
			const monthsRemaining =
				monthlyContribution > 0 ? remaining / monthlyContribution : 0;
			const eta = new Date(
				now.getTime() + monthsRemaining * 30 * 24 * 60 * 60 * 1000
			);

			let status: 'on_track' | 'behind' | 'ahead';
			if (pct > 100) status = 'ahead';
			else if (pct < 50) status = 'behind';
			else status = 'on_track';

			return {
				name: goal.name,
				saved,
				target,
				pct,
				eta: eta.toLocaleDateString(),
				status,
			};
		}) || [];

	// Generate alerts
	const alerts: {
		type: 'budget_warning' | 'bill_due' | 'goal_behind' | 'overspend';
		message: string;
		severity: 'info' | 'warning' | 'urgent';
	}[] = [];

	// Budget alerts
	budgets.forEach((budget) => {
		if (budget.status === 'over_budget') {
			alerts.push({
				type: 'overspend',
				message: `${budget.name} is over budget by $${Math.abs(
					budget.remaining
				).toFixed(2)}`,
				severity: 'urgent',
			});
		} else if (budget.status === 'warning') {
			alerts.push({
				type: 'budget_warning',
				message: `${budget.name} is at ${budget.usedPct.toFixed(0)}% of budget`,
				severity: 'warning',
			});
		}
	});

	// Goal alerts
	goals.forEach((goal) => {
		if (goal.status === 'behind') {
			alerts.push({
				type: 'goal_behind',
				message: `${goal.name} is behind schedule at ${goal.pct.toFixed(0)}%`,
				severity: 'warning',
			});
		}
	});

	return {
		period,
		cashflow: { income, spending, net },
		categories,
		budgets,
		upcomingBills,
		goals,
		alerts,
	};
}

function getPeriodStart(now: Date, period: string): Date {
	const start = new Date(now);

	switch (period) {
		case 'last_7d':
			start.setDate(start.getDate() - 7);
			break;
		case 'last_30d':
			start.setDate(start.getDate() - 30);
			break;
		case 'MTD':
			start.setDate(1);
			break;
		case 'QTD':
			const quarter = Math.floor(start.getMonth() / 3);
			start.setMonth(quarter * 3, 1);
			break;
		case 'YTD':
			start.setMonth(0, 1);
			break;
	}

	return start;
}

export function renderOverviewResponse(
	overview: OverviewData,
	context: FinancialContext
): ChatResponse {
	const { cashflow, categories, budgets, goals, alerts } = overview;

	// Build main message
	let message = `## Financial Overview (${overview.period})\n\n`;

	// Cashflow summary
	message += `**Cashflow:** $${cashflow.income.toFixed(
		2
	)} in, $${cashflow.spending.toFixed(2)} out, **$${cashflow.net.toFixed(
		2
	)} net**\n\n`;

	// Top categories
	if (categories.length > 0) {
		message += `**Top Spending Categories:**\n`;
		categories.forEach((cat, i) => {
			message += `${i + 1}. ${cat.name}: $${cat.amount.toFixed(
				2
			)} (${cat.pctOfTotal.toFixed(0)}%)\n`;
		});
		message += '\n';
	}

	// Budget status
	if (budgets.length > 0) {
		message += `**Budget Status:**\n`;
		budgets.forEach((budget) => {
			const statusIcon =
				budget.status === 'over_budget'
					? '🔴'
					: budget.status === 'warning'
					? '🟡'
					: '🟢';
			message += `${statusIcon} ${budget.name}: ${budget.usedPct.toFixed(
				0
			)}% used\n`;
		});
		message += '\n';
	}

	// Goals progress
	if (goals.length > 0) {
		message += `**Savings Goals:**\n`;
		goals.forEach((goal) => {
			const statusIcon =
				goal.status === 'ahead' ? '🚀' : goal.status === 'behind' ? '⚠️' : '📈';
			message += `${statusIcon} ${goal.name}: $${goal.saved.toFixed(
				2
			)} / $${goal.target.toFixed(2)} (${goal.pct.toFixed(0)}%)\n`;
		});
		message += '\n';
	}

	// Alerts
	if (alerts.length > 0) {
		message += `**Alerts:**\n`;
		alerts.forEach((alert) => {
			const icon =
				alert.severity === 'urgent'
					? '🚨'
					: alert.severity === 'warning'
					? '⚠️'
					: 'ℹ️';
			message += `${icon} ${alert.message}\n`;
		});
	}

	// Build actions
	const actions = [
		{
			label: 'View Budgets',
			action: 'OPEN_BUDGETS' as const,
			params: { tab: 'monthly' },
		},
		{
			label: 'View Goals',
			action: 'OPEN_GOAL_WIZARD' as const,
		},
	];

	if (alerts.some((a) => a.severity === 'urgent')) {
		actions.unshift({
			label: 'Fix Budget Issues',
			action: 'OPEN_BUDGETS' as const,
			params: { tab: 'monthly' },
		});
	}

	// Build cards
	const cards = [
		{
			type: 'balance' as const,
			data: {
				title: 'Net Cashflow',
				amount: cashflow.net,
				period: overview.period,
				trend: cashflow.net > 0 ? 'positive' : 'negative',
			},
		},
		{
			type: 'budget' as const,
			data: {
				title: 'Budget Status',
				budgets: budgets.map((b) => ({
					name: b.name,
					used: b.usedPct,
					status: b.status,
				})),
			},
		},
	];

	if (goals.length > 0) {
		cards.push({
			type: 'balance' as const,
			data: {
				title: 'Goal Progress',
				amount: goals.reduce((sum, g) => sum + g.saved, 0),
				period: overview.period,
				trend: 'positive',
			},
		});
	}

	return {
		message,
		details: `Generated from ${
			context.transactions?.length || 0
		} transactions, ${context.budgets?.length || 0} budgets, ${
			context.goals?.length || 0
		} goals`,
		actions,
		cards,
		sources: [{ kind: 'db' }],
		cost: { model: 'mini', estTokens: 0 },
	};
}

export function renderNoDataOnboarding(): ChatResponse {
	return {
		message:
			"I can't provide a financial overview yet because I don't have any data to analyze.",
		details:
			"Let's get you set up with some basic financial tracking so I can give you personalized insights.",
		actions: [
			{
				label: 'Create First Budget',
				action: 'OPEN_BUDGET_WIZARD' as const,
				params: { category: 'groceries', amount: 300 },
			},
			{
				label: 'Set Savings Goal',
				action: 'OPEN_GOAL_WIZARD' as const,
				params: { type: 'emergency_fund' },
			},
			{
				label: 'Connect Account',
				action: 'CONNECT_ACCOUNT' as const,
			},
		],
		cards: [
			{
				type: 'balance' as const,
				data: {
					title: 'Get Started',
					amount: 0,
					period: 'setup',
					trend: 'neutral',
				},
			},
		],
		sources: [{ kind: 'db' }],
		cost: { model: 'mini', estTokens: 0 },
	};
}
