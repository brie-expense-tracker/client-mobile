// Actionable Ask Composer - Creates setup prompts with specific actions
// Replaces generic fallbacks with targeted data collection

import { ChatResponse } from '../../../services/assistant/responseSchema';
import { getSetupActions } from '../../../services/assistant/answerability';

export function composeActionableAsk(opts: {
	headline: string;
	missing: string[];
	actions?: { label: string; action: string }[];
}): ChatResponse {
	// Use provided actions or generate default ones based on missing data
	const setupActions =
		opts.actions && opts.actions.length > 0
			? opts.actions
			: getSetupActions(opts.missing);

	// Input validation
	if (!opts.headline || opts.headline.trim().length === 0) {
		throw new Error('Headline is required for actionable ask');
	}
	if (!opts.missing || opts.missing.length === 0) {
		throw new Error('Missing data array cannot be empty');
	}

	// Create a more helpful setup card instead of a confusing checklist
	const setupCard = {
		type: 'checklist' as const,
		data: {
			title: 'Complete your setup',
			description: 'Add these details to get personalized insights:',
			items: opts.missing.map((m) => {
				// Better action mapping based on missing data type
				let action: string = 'OPEN_SETUP_WIZARD';
				if (m.includes('income')) {
					action = 'OPEN_INCOME_FORM';
				} else if (m.includes('bills') || m.includes('recurring')) {
					action = 'OPEN_RECURRING_FORM';
				} else if (m.includes('goal')) {
					action = 'OPEN_GOAL_WIZARD';
				} else if (m.includes('budget')) {
					action = 'OPEN_BUDGET_WIZARD';
				} else if (m.includes('transaction')) {
					action = 'OPEN_TRANSACTION_FORM';
				}

				return {
					label: m,
					done: false,
					action,
				};
			}),
			totalItems: opts.missing.length,
			completedItems: 0,
		},
	};

	return {
		message: opts.headline,
		details: `To personalize this, I need: ${opts.missing.join(', ')}.`,
		cards: [setupCard],
		// Include setup actions as buttons for additional context
		actions: setupActions.map((action) => ({
			label: action.label,
			action: action.action as any,
			priority: 'high' as const,
		})),
		sources: [{ kind: 'cache' }],
		cost: { model: 'mini', estTokens: 0 },
		confidence: 0.95,
		insights: ['Setup needed for personalized response'],
	};
}

// Table Composer for plans/allocations
export function composeTable({
	message,
	rows,
	actions,
	insights,
	sources,
	title,
	subtitle,
}: {
	message: string;
	rows: { label: string; amount: number }[];
	actions?: any[];
	insights?: string[];
	sources?: any[];
	title?: string;
	subtitle?: string;
}): ChatResponse {
	// Input validation
	if (!message || message.trim().length === 0) {
		throw new Error('Message is required for table composition');
	}
	if (!rows || rows.length === 0) {
		throw new Error('Rows array cannot be empty');
	}

	// Validate and format rows
	const formattedRows = rows.map((row, index) => {
		if (!row.label || typeof row.amount !== 'number') {
			throw new Error(
				`Invalid row at index ${index}: label and amount are required`
			);
		}
		return [row.label, `$${row.amount.toLocaleString()}`];
	});

	// Calculate totals for insights
	const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);
	const averageAmount = totalAmount / rows.length;
	const maxRow = rows.reduce(
		(max, row) => (row.amount > max.amount ? row : max),
		rows[0]
	);
	const minRow = rows.reduce(
		(min, row) => (row.amount < min.amount ? row : min),
		rows[0]
	);

	// Generate default insights if none provided
	const defaultInsights = [
		`Total: $${totalAmount.toLocaleString()}`,
		`Average: $${averageAmount.toLocaleString()}`,
		`Highest: ${maxRow.label} ($${maxRow.amount.toLocaleString()})`,
		`Lowest: ${minRow.label} ($${minRow.amount.toLocaleString()})`,
	];

	return {
		message,
		cards: [
			{
				type: 'table' as const,
				data: {
					headers: ['Category', 'Amount'],
					rows: formattedRows,
				},
				title: title || 'Financial Breakdown',
				subtitle: subtitle || `${rows.length} categories`,
			},
		],
		actions: actions || [],
		insights: insights || defaultInsights,
		sources: sources || [{ kind: 'localML' }],
		cost: { model: 'mini', estTokens: 0 },
		confidence: 0.9,
	};
}

// Utility function to create a simple actionable ask with minimal setup
export function createSimpleActionableAsk(
	headline: string,
	missingData: string[]
): ChatResponse {
	return composeActionableAsk({
		headline,
		missing: missingData,
	});
}

// Utility function to create a financial table with common actions
export function createFinancialTable(
	message: string,
	rows: { label: string; amount: number }[],
	options?: {
		title?: string;
		subtitle?: string;
		showActions?: boolean;
	}
): ChatResponse {
	const actions = options?.showActions
		? [
				{ label: 'Adjust Budgets', action: 'OPEN_BUDGET_WIZARD' },
				{ label: 'View Details', action: 'OPEN_BUDGETS' },
		  ]
		: [];

	return composeTable({
		message,
		rows,
		actions,
		title: options?.title,
		subtitle: options?.subtitle,
	});
}

// Helper function to validate action parameters
export function validateActionParams(params: any): boolean {
	if (!params || typeof params !== 'object') {
		return false;
	}

	// Check for required fields based on action type
	if (params.action) {
		const requiredFields: { [key: string]: string[] } = {
			OPEN_INCOME_FORM: [],
			OPEN_RECURRING_FORM: [],
			OPEN_GOAL_WIZARD: [],
			OPEN_BUDGET_WIZARD: [],
			OPEN_TRANSACTION_FORM: [],
			OPEN_SETUP_WIZARD: [],
		};

		const required = requiredFields[params.action] || [];
		return required.every((field) => params[field] !== undefined);
	}

	return true;
}
