// Goal Allocation Composer - Deadline-aware waterfall allocation
// Always produces specific dollar amounts for each goal

import { FinancialContext } from '../helpfulFallbacks';
import { ChatResponse } from '../responseSchema';

export interface GoalAllocation {
	allocations: {
		goalId: string;
		name: string;
		allocate: number;
		needed: number;
		priority: string;
		monthsLeft: number;
	}[];
	unallocated: number;
	totalMonthlyBudget: number;
}

// Helper function to calculate months between dates
function monthDiff(date1: Date, date2: Date): number {
	const yearDiff = date2.getFullYear() - date1.getFullYear();
	const monthDiff = date2.getMonth() - date1.getMonth();
	return yearDiff * 12 + monthDiff;
}

// Helper function to get current date
function now(): Date {
	return new Date();
}

export function allocateToGoals(
	ctx: FinancialContext,
	monthlySaveBudget: number
): GoalAllocation {
	const goals = (ctx.goals ?? [])
		.filter((g) => g.target && (g as any).deadline)
		.map((g) => {
			const remaining = Math.max(g.target - (g.current || 0), 0);
			const monthsLeft = Math.max(
				monthDiff(now(), new Date((g as any).deadline)),
				1
			);
			const neededPerMonth = Math.ceil(remaining / monthsLeft);
			return {
				...g,
				remaining,
				monthsLeft,
				neededPerMonth,
				priority: (g as any).priority ?? 'medium',
			};
		})
		.sort(
			(a, b) =>
				new Date((a as any).deadline).getTime() -
				new Date((b as any).deadline).getTime()
		); // soonest first

	let remainingBudget = monthlySaveBudget;
	const allocations = goals.map((g) => {
		const amt = Math.min(g.neededPerMonth, Math.max(remainingBudget, 0));
		remainingBudget -= amt;
		return {
			goalId: (g as any).id,
			name: g.name,
			allocate: amt,
			needed: g.neededPerMonth,
			priority: g.priority ?? 'medium',
			monthsLeft: g.monthsLeft,
		};
	});

	return {
		allocations,
		unallocated: Math.max(remainingBudget, 0),
		totalMonthlyBudget: monthlySaveBudget,
	};
}

export function composeAllocationsCard(
	allocations: GoalAllocation
): ChatResponse {
	const {
		allocations: goalAllocs,
		unallocated,
		totalMonthlyBudget,
	} = allocations;

	const message = `Here's how to allocate your $${totalMonthlyBudget.toLocaleString()}/mo savings budget:`;

	const cards = [
		{
			type: 'table' as const,
			data: {
				headers: ['Goal', 'Need/Month', 'My Recommendation', 'Priority'],
				rows: goalAllocs.map((g) => [
					g.name,
					`$${g.needed.toLocaleString()}`,
					`$${g.allocate.toLocaleString()}`,
					g.priority,
				]),
			},
		},
	];

	const actions = [
		{ label: 'Adjust priority', action: 'ADJUST_GOAL_PRIORITY' },
		{ label: 'Auto-transfer setup', action: 'SETUP_AUTO_TRANSFER' },
	];

	if (unallocated > 0) {
		actions.push({ label: 'Allocate remaining', action: 'ALLOCATE_REMAINING' });
	}

	const insights = [
		`Total monthly budget: $${totalMonthlyBudget.toLocaleString()}`,
		unallocated > 0
			? `$${unallocated.toLocaleString()} unallocated`
			: 'All budget allocated',
		`Goals sorted by deadline (soonest first)`,
	];

	return {
		message,
		cards,
		actions: actions as any[],
		insights,
		sources: [{ kind: 'localML' }],
		cost: { model: 'mini', estTokens: 0 },
		confidence: 0.9,
	};
}
