// Answerability Gate - Evaluates if we have enough data to give personalized answers
// Prevents generic responses by checking data completeness before composing answers

import { Intent } from './enhancedIntentMapper';
import { FinancialContext } from './helpfulFallbacks';

export type Answerability =
	| { level: 'high' | 'medium'; missing: []; reason?: string }
	| { level: 'low' | 'none'; missing: string[]; reason: string };

export function evaluateAnswerability(
	intent: Intent,
	ctx: FinancialContext
): Answerability {
	switch (intent) {
		case 'OVERVIEW': {
			// Overview needs any financial data to be useful
			const haveBudgets = (ctx.budgets?.length ?? 0) > 0;
			const haveGoals = (ctx.goals?.length ?? 0) > 0;
			const haveTransactions = (ctx.transactions?.length ?? 0) > 0;
			const haveAnyData = haveBudgets || haveGoals || haveTransactions;

			if (haveAnyData) return { level: 'high', missing: [] };

			const missing = [
				...(!haveBudgets ? ['budget data'] : []),
				...(!haveGoals ? ['savings goals'] : []),
				...(!haveTransactions ? ['transaction history'] : []),
			];
			return {
				level: 'low',
				missing,
				reason: 'no financial data available',
			};
		}
		case 'GET_SPENDING_PLAN': {
			// New intent for "How should I spend my money?"
			const haveIncome = !!ctx.profile?.monthlyIncome;
			const haveRecurrings = (ctx.recurringExpenses?.length ?? 0) > 0; // rent, bills
			if (haveIncome && haveRecurrings) return { level: 'high', missing: [] };
			const missing = [
				...(!haveIncome ? ['monthly take-home income'] : []),
				...(!haveRecurrings
					? ['fixed monthly bills (rent, utilities, loans)']
					: []),
			];
			return missing.length
				? { level: 'low', missing, reason: 'insufficient inputs' }
				: { level: 'high', missing: [] };
		}
		case 'GOAL_ALLOCATION': {
			// New intent for "How much for each of my goals?"
			const haveGoals = (ctx.goals?.length ?? 0) > 0;
			const haveAmounts = ctx.goals?.every((g) => g.target);
			if (haveGoals && haveAmounts) return { level: 'high', missing: [] };
			const missing = [
				...(!haveGoals ? ['at least one savings goal'] : []),
				...(!haveAmounts ? ["each goal's target amount and target date"] : []),
			];
			return { level: 'low', missing, reason: 'missing goal metadata' };
		}
		case 'SURPLUS_ALLOCATION': {
			// New intent for "Where should I put money after goals are reached?"
			const haveEmergency = false; // emergencyFund not available in context
			const haveBrokerage = false; // accounts not available in context
			const haveDebtAPR = false; // debts not available in context
			const missing = [
				...(!haveEmergency ? ['emergency fund target (months)'] : []),
				...(!haveBrokerage
					? ['an investment account to route surplus to']
					: []),
				...(!haveDebtAPR ? ['APR on any debts for payoff vs invest rule'] : []),
			];
			return missing.length
				? { level: 'low', missing, reason: 'missing surplus prefs' }
				: { level: 'high', missing: [] };
		}
		case 'GET_BALANCE': {
			const haveBudgets = (ctx.budgets?.length ?? 0) > 0;
			const haveTransactions = (ctx.transactions?.length ?? 0) > 0;
			if (haveBudgets || haveTransactions)
				return { level: 'high', missing: [] };
			return {
				level: 'low',
				missing: ['budget or transaction data'],
				reason: 'no financial data',
			};
		}
		case 'GET_BUDGET_STATUS': {
			const haveBudgets = (ctx.budgets?.length ?? 0) > 0;
			if (haveBudgets) return { level: 'high', missing: [] };
			return {
				level: 'low',
				missing: ['budget data'],
				reason: 'no budgets configured',
			};
		}
		case 'GET_GOAL_PROGRESS': {
			const haveGoals = (ctx.goals?.length ?? 0) > 0;
			if (haveGoals) return { level: 'high', missing: [] };
			return {
				level: 'low',
				missing: ['savings goals'],
				reason: 'no goals set',
			};
		}
		case 'FORECAST_SPEND': {
			const haveTransactions = (ctx.transactions?.length ?? 0) > 5;
			const haveBudgets = (ctx.budgets?.length ?? 0) > 0;
			if (haveTransactions && haveBudgets)
				return { level: 'high', missing: [] };
			const missing = [
				...(!haveTransactions ? ['transaction history (5+ transactions)'] : []),
				...(!haveBudgets ? ['budget data'] : []),
			];
			return missing.length
				? { level: 'low', missing, reason: 'insufficient historical data' }
				: { level: 'high', missing: [] };
		}
		case 'GET_SPENDING_BREAKDOWN': {
			const haveTransactions = (ctx.transactions?.length ?? 0) > 0;
			if (haveTransactions) return { level: 'high', missing: [] };
			return {
				level: 'low',
				missing: ['transaction data'],
				reason: 'no spending history',
			};
		}
		case 'LIST_SUBSCRIPTIONS': {
			const haveRecurrings = (ctx.recurringExpenses?.length ?? 0) > 0;
			if (haveRecurrings) return { level: 'high', missing: [] };
			return {
				level: 'low',
				missing: ['recurring expenses'],
				reason: 'no recurring expenses tracked',
			};
		}
		case 'CREATE_BUDGET': {
			// Always answerable - we can help create budgets
			return { level: 'high', missing: [] };
		}
		case 'CATEGORIZE_TX': {
			const haveTransactions = (ctx.transactions?.length ?? 0) > 0;
			if (haveTransactions) return { level: 'high', missing: [] };
			return {
				level: 'low',
				missing: ['transactions to categorize'],
				reason: 'no transactions available',
			};
		}
		case 'GENERAL_QA': {
			// General questions are always answerable
			return { level: 'medium', missing: [] };
		}
		case 'UNKNOWN': {
			// Unknown intents should ask for clarification
			return {
				level: 'none',
				missing: ['clarification'],
				reason: 'unclear intent',
			};
		}
		default:
			return { level: 'medium', missing: [] };
	}
}

// Helper function to get actionable setup steps based on missing data
export function getSetupActions(
	missing: string[]
): { label: string; action: string }[] {
	const actions: { label: string; action: string }[] = [];

	if (missing.some((m) => m.includes('income'))) {
		actions.push({ label: 'Add monthly income', action: 'OPEN_INCOME_FORM' });
	}
	if (missing.some((m) => m.includes('bills') || m.includes('recurring'))) {
		actions.push({ label: 'Add fixed bills', action: 'OPEN_RECURRING_FORM' });
	}
	if (missing.some((m) => m.includes('goal'))) {
		actions.push({ label: 'Create a goal', action: 'OPEN_GOAL_WIZARD' });
	}
	if (missing.some((m) => m.includes('budget'))) {
		actions.push({ label: 'Set up budgets', action: 'OPEN_BUDGET_WIZARD' });
	}
	if (missing.some((m) => m.includes('transaction'))) {
		actions.push({
			label: 'Add transactions',
			action: 'OPEN_TRANSACTION_FORM',
		});
	}

	// Default action if no specific actions found
	if (actions.length === 0) {
		actions.push({ label: 'Complete setup', action: 'OPEN_SETUP_WIZARD' });
	}

	return actions;
}
