// Spending Plan Composer - Always produces specific dollar amounts
// Uses 50/30/20 rule with guardrails and personalization

import { FinancialContext } from '../helpfulFallbacks';

export interface SpendingPlan {
	summary: string;
	rows: { label: string; amount: number }[];
	actions: { label: string; action: string }[];
	insights?: string[];
}

export function buildSpendingPlan(ctx: FinancialContext): SpendingPlan | null {
	const net = ctx.profile?.monthlyIncome ?? null;
	const fixed = (ctx.recurringExpenses ?? []).reduce(
		(s, r) => s + (r.amount ?? 0),
		0
	);

	if (!net) return null;

	const base = Math.max(net - fixed, 0);
	const needs = Math.max(fixed, 0);
	const wants = Math.round(base * 0.3);
	const save = Math.round(base * 0.2);

	return {
		summary: `Based on $${net.toLocaleString()}/mo income and $${fixed.toLocaleString()}/mo in fixed bills:`,
		rows: [
			{ label: 'Needs (fixed bills)', amount: needs },
			{ label: 'Wants', amount: wants },
			{ label: 'Savings/Debt Paydown', amount: save },
		],
		actions: [
			{ label: 'Adjust plan %', action: 'OPEN_PLAN_TUNER' },
			{
				label: 'Create budgets from this plan',
				action: 'MAKE_BUDGETS_FROM_PLAN',
			},
		],
		insights: [
			`Tweak the %s to match your style; I'll refit budgets automatically.`,
			`This leaves $${(
				base -
				wants -
				save
			).toLocaleString()} for additional needs.`,
		],
	};
}

export function recommendMonthlySavings(ctx: FinancialContext): number {
	const net = ctx.profile?.monthlyIncome ?? 0;
	const fixed = (ctx.recurringExpenses ?? []).reduce(
		(s, r) => s + (r.amount ?? 0),
		0
	);
	const base = Math.max(net - fixed, 0);
	return Math.round(base * 0.2); // 20% of disposable income
}
