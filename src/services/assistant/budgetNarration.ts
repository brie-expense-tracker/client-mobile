// budgetNarration.ts - Helper functions to build concrete budget sentences
// Replaces generic fallbacks with specific, useful budget information

export function currency(n?: number): string {
	if (n == null || Number.isNaN(n)) return '$0';
	return n.toLocaleString(undefined, {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0,
	});
}

export function buildBudgetNarration(ctx: {
	budgets?: {
		id?: string;
		name?: string;
		category?: string;
		limit?: number;
		amount?: number;
		spent?: number;
		spentMTD?: number;
	}[];
	period?: 'mtd' | 'month' | 'last_30';
}): string {
	const budgets = ctx.budgets ?? [];

	// Look for groceries budget specifically
	const groc = budgets.find(
		(b) => /groc/i.test(b.name ?? '') || /groc/i.test(b.category ?? '')
	);

	if (groc) {
		const limit = groc.limit ?? groc.amount ?? 0;
		const spent = groc.spentMTD ?? groc.spent ?? 0;
		const left = Math.max(0, limit - spent);
		const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;

		// Keep it short and specific:
		return `Groceries: ${currency(spent)} of ${currency(
			limit
		)} (${pct}%) used — ${currency(left)} left for the month.`;
	}

	// Look for any budget with spending pressure
	const pressuredBudgets = budgets
		.map((b) => ({
			...b,
			limit: b.limit ?? b.amount ?? 0,
			spent: b.spentMTD ?? b.spent ?? 0,
			pressure: (b.spentMTD ?? b.spent ?? 0) / (b.limit ?? b.amount ?? 1),
		}))
		.filter((b) => b.limit > 0)
		.sort((a, b) => b.pressure - a.pressure);

	if (pressuredBudgets.length > 0) {
		const top = pressuredBudgets[0];
		const limit = top.limit;
		const spent = top.spent;
		const left = Math.max(0, limit - spent);
		const pct = Math.round((spent / limit) * 100);

		return `${top.name}: ${currency(spent)} of ${currency(
			limit
		)} (${pct}%) used — ${currency(left)} left for the month.`;
	}

	// Fall back to a concrete, still-useful line:
	const total = budgets.reduce((s, b) => s + (b.limit ?? b.amount ?? 0), 0);
	return budgets.length
		? `You have ${budgets.length} active budgets totaling ${currency(total)}.`
		: `You have no budgets set up yet.`;
}

export function buildSpendingNarration(ctx: {
	transactions?: {
		amount?: number;
		category?: string;
		date?: string | Date;
	}[];
	period?: 'mtd' | 'month' | 'last_30';
}): string {
	const transactions = ctx.transactions ?? [];

	if (transactions.length === 0) {
		return `No recent transactions found. Start tracking your spending to get insights!`;
	}

	// Calculate recent spending
	const recentSpending = transactions
		.slice(-30) // Last 30 transactions
		.reduce((sum, t) => sum + (t.amount || 0), 0);

	// Find top spending category
	const categorySpending = transactions
		.slice(-30)
		.reduce((acc: Record<string, number>, t) => {
			const cat = t.category || 'Uncategorized';
			acc[cat] = (acc[cat] || 0) + (t.amount || 0);
			return acc;
		}, {});

	const topCategory = Object.entries(categorySpending).sort(
		([, a], [, b]) => b - a
	)[0];

	if (topCategory) {
		const [category, amount] = topCategory;
		return `You've spent ${currency(
			recentSpending
		)} in the last 30 days, with ${currency(amount)} on ${category}.`;
	}

	return `You've spent ${currency(recentSpending)} in the last 30 days.`;
}

export function buildGoalNarration(ctx: {
	goals?: {
		name?: string;
		target?: number;
		current?: number;
		deadline?: string | Date;
	}[];
}): string {
	const goals = ctx.goals ?? [];

	if (goals.length === 0) {
		return `You don't have any savings goals set up yet. Want me to help you create one?`;
	}

	// Find the most active goal (closest to deadline or highest progress)
	const activeGoal = goals
		.filter((g) => g.target && g.target > 0)
		.sort((a, b) => {
			const aProgress = (a.current || 0) / (a.target || 1);
			const bProgress = (b.current || 0) / (b.target || 1);
			return bProgress - aProgress;
		})[0];

	if (activeGoal) {
		const target = activeGoal.target || 0;
		const current = activeGoal.current || 0;
		const progress = target > 0 ? Math.round((current / target) * 100) : 0;
		const remaining = Math.max(0, target - current);

		return `${activeGoal.name}: ${currency(current)} of ${currency(
			target
		)} (${progress}%) — ${currency(remaining)} to go.`;
	}

	const totalTarget = goals.reduce((sum, g) => sum + (g.target || 0), 0);
	const totalCurrent = goals.reduce((sum, g) => sum + (g.current || 0), 0);
	const overallProgress =
		totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

	return `You have ${goals.length} savings goals. Overall progress: ${currency(
		totalCurrent
	)} of ${currency(totalTarget)} (${overallProgress}%).`;
}
