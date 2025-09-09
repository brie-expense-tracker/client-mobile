// assistant/builders/budget.ts
import { $, pct } from '../../../components/assistant/shared/format';

export const buildBudgetAnswer = (facts: any, question: string) => {
	const budgets = facts.budgets ?? [];

	if (!budgets.length) {
		return {
			text: "You don't have any budgets set up yet. Want me to help you create one?",
			structuredResponse: {
				actions: [
					{
						label: 'Create Budget',
						action: 'OPEN_BUDGET_WIZARD',
					},
				],
			},
		};
	}

	const totalBudget = budgets.reduce(
		(sum: number, b: any) => sum + (b.limit || b.amount || 0),
		0
	);
	const totalSpent = budgets.reduce(
		(sum: number, b: any) => sum + (b.spent || b.spentMTD || 0),
		0
	);
	const totalRemaining = totalBudget - totalSpent;
	const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

	// Find the most pressured budget
	const pressuredBudgets = budgets
		.map((b: any) => ({
			...b,
			limit: b.limit || b.amount || 0,
			spent: b.spent || b.spentMTD || 0,
			pressure: (b.spent || b.spentMTD || 0) / (b.limit || b.amount || 1),
		}))
		.filter((b: any) => b.limit > 0)
		.sort((a: any, b: any) => b.pressure - a.pressure);

	const topPressure = pressuredBudgets[0];

	let text = `You've used ${pct(utilization)} of your total budget.`;
	if (topPressure && topPressure.pressure > 0.8) {
		text += ` ${topPressure.name} is at ${pct(
			topPressure.pressure * 100
		)} capacity.`;
	}

	const cards = [
		{
			kind: 'KPI_ROW',
			items: [
				{ label: 'Total Budget', value: $(totalBudget) },
				{ label: 'Spent', value: $(totalSpent) },
				{ label: 'Remaining', value: $(totalRemaining) },
			],
		},
		...(topPressure
			? [
					{
						kind: 'PRESSURE_ALERT',
						title: `${topPressure.name} - ${pct(
							topPressure.pressure * 100
						)} used`,
						value: `${$(topPressure.spent)} / ${$(topPressure.limit)}`,
						subtitle: `${$(
							Math.max(0, topPressure.limit - topPressure.spent)
						)} remaining`,
					},
			  ]
			: []),
	];

	const actions = [
		{ label: 'View All Budgets', action: 'OPEN_BUDGETS' },
		...(topPressure && topPressure.pressure > 0.8
			? [
					{
						label: 'Adjust Limit',
						action: 'ADJUST_LIMIT',
						params: { category: topPressure.name },
					},
			  ]
			: []),
	];

	return {
		text,
		structuredResponse: {
			cards,
			actions,
		},
	};
};
