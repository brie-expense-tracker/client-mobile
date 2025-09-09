// ai/ui/clarify.ts - Clarification path (no escalation)

import { WriterOutput, ClarifyUI } from '../types';

export function toClarifyUI(out: WriterOutput): ClarifyUI {
	// Use the first clarifying question if available
	const question =
		out.clarifying_questions?.[0] ?? 'Which category did you mean?';

	// Use suggested actions if available, otherwise provide defaults
	const options =
		out.suggested_actions?.length > 0
			? out.suggested_actions
			: [
					{
						label: 'Groceries',
						action: 'OPEN_BUDGET',
						payload: { category: 'groceries' },
					},
					{
						label: 'Dining',
						action: 'OPEN_BUDGET',
						payload: { category: 'dining' },
					},
					{
						label: 'Transport',
						action: 'OPEN_BUDGET',
						payload: { category: 'transport' },
					},
					{
						label: 'Entertainment',
						action: 'OPEN_BUDGET',
						payload: { category: 'entertainment' },
					},
			  ];

	return { question, options };
}

/**
 * Create clarification options based on the specific guard failure
 */
export function createClarificationFromGuard(
	guardFailures: string[],
	factPack: any
): ClarifyUI {
	if (guardFailures.includes('out_of_window_date')) {
		return {
			question: 'What time period would you like me to focus on?',
			options: [
				{
					label: 'This Month',
					action: 'SET_TIME_WINDOW',
					payload: { period: 'current_month' },
				},
				{
					label: 'Last Month',
					action: 'SET_TIME_WINDOW',
					payload: { period: 'last_month' },
				},
				{
					label: 'Last 3 Months',
					action: 'SET_TIME_WINDOW',
					payload: { period: 'last_3_months' },
				},
				{
					label: 'Custom Range',
					action: 'SET_TIME_WINDOW',
					payload: { period: 'custom' },
				},
			],
		};
	}

	if (guardFailures.includes('missing_disclaimer')) {
		return {
			question:
				'This involves financial strategy. How would you like to proceed?',
			options: [
				{
					label: 'Show with Disclaimer',
					action: 'SHOW_WITH_DISCLAIMER',
					payload: {},
				},
				{
					label: 'Simplify Response',
					action: 'SIMPLIFY_RESPONSE',
					payload: {},
				},
				{
					label: 'Ask Different Question',
					action: 'ASK_DIFFERENT',
					payload: {},
				},
			],
		};
	}

	if (guardFailures.includes('unknown_amount')) {
		return {
			question:
				"I found some numbers that don't match your data. Which would you like me to focus on?",
			options: [
				{
					label: 'Show Only Verified Data',
					action: 'SHOW_VERIFIED_ONLY',
					payload: {},
				},
				{
					label: 'Ask for Clarification',
					action: 'ASK_FOR_CLARIFICATION',
					payload: {},
				},
				{
					label: 'Use Different Time Period',
					action: 'CHANGE_TIME_PERIOD',
					payload: {},
				},
			],
		};
	}

	// Default clarification
	return {
		question:
			'I need more information to give you a complete answer. What would you like me to focus on?',
		options: [
			{ label: 'Budgets', action: 'OPEN_BUDGET', payload: {} },
			{ label: 'Goals', action: 'OPEN_GOALS', payload: {} },
			{
				label: 'Recent Transactions',
				action: 'OPEN_TRANSACTIONS',
				payload: {},
			},
			{ label: 'Ask Different Question', action: 'ASK_DIFFERENT', payload: {} },
		],
	};
}

/**
 * Create clarification options for critic ambiguity
 */
export function createClarificationFromCritic(
	criticIssues: any[],
	userQuery: string
): ClarifyUI {
	const hasAmbiguity = criticIssues.some((i) => i.type === 'ambiguity');
	const hasFactuality = criticIssues.some((i) => i.type === 'factuality');
	const hasSafety = criticIssues.some((i) => i.type === 'safety');

	if (hasSafety) {
		return {
			question:
				'This involves financial advice. How would you like me to help?',
			options: [
				{
					label: 'Show Educational Info Only',
					action: 'SHOW_EDUCATIONAL_ONLY',
					payload: {},
				},
				{
					label: 'Focus on Facts & Data',
					action: 'FOCUS_ON_FACTS',
					payload: {},
				},
				{
					label: 'Ask Different Question',
					action: 'ASK_DIFFERENT',
					payload: {},
				},
			],
		};
	}

	if (hasFactuality) {
		return {
			question:
				'I want to make sure I give you accurate information. What specific data would you like me to check?',
			options: [
				{
					label: 'Check Budget Numbers',
					action: 'VERIFY_BUDGETS',
					payload: {},
				},
				{ label: 'Check Goal Progress', action: 'VERIFY_GOALS', payload: {} },
				{
					label: 'Check Recent Transactions',
					action: 'VERIFY_TRANSACTIONS',
					payload: {},
				},
				{
					label: 'Ask Different Question',
					action: 'ASK_DIFFERENT',
					payload: {},
				},
			],
		};
	}

	if (hasAmbiguity) {
		return {
			question:
				'Your question could be interpreted in a few ways. Which would you like me to focus on?',
			options: [
				{ label: 'Current Status', action: 'FOCUS_STATUS', payload: {} },
				{ label: 'Historical Trends', action: 'FOCUS_TRENDS', payload: {} },
				{ label: 'Future Planning', action: 'FOCUS_PLANNING', payload: {} },
				{
					label: 'Rephrase Question',
					action: 'REPHRASE_QUESTION',
					payload: {},
				},
			],
		};
	}

	// Default clarification
	return {
		question:
			'I need more context to give you a helpful answer. What would you like me to focus on?',
		options: [
			{ label: 'Provide More Context', action: 'PROVIDE_CONTEXT', payload: {} },
			{ label: 'Ask Different Question', action: 'ASK_DIFFERENT', payload: {} },
			{
				label: 'Show Available Data',
				action: 'SHOW_AVAILABLE_DATA',
				payload: {},
			},
		],
	};
}
