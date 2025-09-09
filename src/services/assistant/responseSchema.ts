// Structured response schema for AI assistant
export type ChatResponse = {
	message: string; // brief, friendly summary (1-2 lines max)
	details?: string; // optional deeper explanation
	cards?: {
		// inline UI elements
		type:
			| 'balance'
			| 'budget'
			| 'subscriptions'
			| 'forecast'
			| 'table'
			| 'checklist'
			| 'spending'
			| 'savings'
			| 'goals'
			| 'alerts'
			| 'insights'
			| 'comparison'
			| 'trends';
		data: any;
		title?: string;
		subtitle?: string;
		icon?: string;
		priority?: 'high' | 'medium' | 'low';
		interactive?: boolean;
	}[];
	actions?: {
		// buttons that call app functions
		label: string;
		action:
			| 'OPEN_BUDGETS'
			| 'CREATE_RULE'
			| 'ADJUST_LIMIT'
			| 'VIEW_RECURRING'
			| 'CONNECT_ACCOUNT'
			| 'PICK_TIME_WINDOW'
			| 'MARK_PAID'
			| 'SET_LIMIT'
			| 'OPEN_INCOME_FORM'
			| 'OPEN_RECURRING_FORM'
			| 'OPEN_GOAL_WIZARD'
			| 'OPEN_GOAL_FORM'
			| 'OPEN_BUDGET_WIZARD'
			| 'OPEN_TRANSACTION_FORM'
			| 'OPEN_SETUP_WIZARD'
			| 'OPEN_PLAN_TUNER'
			| 'MAKE_BUDGETS_FROM_PLAN'
			| 'ADJUST_GOAL_PRIORITY'
			| 'SETUP_AUTO_TRANSFER'
			| 'ALLOCATE_REMAINING'
			| 'VIEW_TRANSACTIONS'
			| 'CREATE_GOAL'
			| 'UPDATE_GOAL'
			| 'DELETE_GOAL'
			| 'EXPORT_DATA'
			| 'SHARE_INSIGHT'
			| 'SCHEDULE_REMINDER'
			| 'CONTACT_SUPPORT'
			| 'UPGRADE_PLAN'
			| 'VIEW_ANALYTICS'
			| 'SET_ALERT'
			| 'MANAGE_SUBSCRIPTIONS'
			| 'FETCH_HYSA_PICKS'
			| 'OPEN_ARTICLE'
			| 'OPEN_LINKS'
			| 'OPEN_TRANSFER_PLANNER'
			| 'OPEN_COMPOUND_CALCULATOR';
		params?: any;
		priority?: 'high' | 'medium' | 'low';
		icon?: string;
		disabled?: boolean;
	}[];
	skills?: {
		// executable skills the AI can call
		name: string; // skill name from skillRegistry
		params: any; // parameters for the skill
		description: string; // human-readable description of what this skill will do
		confidence: number; // AI's confidence in this action (0-1)
	}[];
	sources?: { kind: 'cache' | 'localML' | 'db' | 'gpt'; note?: string }[];
	cost?: { model: 'mini' | 'std' | 'pro'; estTokens: number };

	// Enhanced response format for better UX
	summary?: string; // 1-2 line summary for bubble (overrides message if present)
	insights?: string[]; // Key insights to highlight
	confidence?: number; // Confidence score (0-1)
	rationale?: string; // Local ML categorization rationale

	// Additional response metadata
	timestamp?: Date; // When the response was generated
	processingTime?: number; // Time taken to generate response in ms
	modelUsed?: 'mini' | 'std' | 'pro'; // Which model was used
	fallback?: {
		status: string;
		tinyFact?: string;
		actions: {
			label: string;
			action: string;
			payload?: any;
			priority?: 'high' | 'medium' | 'low';
			icon?: string;
			disabled?: boolean;
		}[];
		evidence?: { factIds: string[] };
		timeWindow: { start: string; end: string; tz: string };
	};
};

// Response composer functions for different types of answers
export function composeBudgetStatus(ans: any, ctx: any): ChatResponse {
	const pct = Math.round((ans.spent / ans.total) * 100);
	const top = ans.byCat?.sort(
		(a: any, b: any) => b.spent / b.limit - a.spent / b.limit
	)[0];

	return {
		message: `You've used ${pct}% of this month's budget.`,
		details: top
			? `Top pressure: ${top.cat} at $${top.spent}/${top.limit}.`
			: undefined,
		cards: [{ type: 'budget', data: ans }],
		actions: [
			...(top
				? [
						{
							label: 'Adjust limit',
							action: 'ADJUST_LIMIT' as const,
							params: { cat: top.cat },
						},
				  ]
				: []),
			{ label: 'See by category', action: 'OPEN_BUDGETS' as const },
		],
		sources: [{ kind: 'db' }],
		cost: { model: 'mini', estTokens: 60 },
	};
}

export function composeSpendingInsight(insight: any, ctx: any): ChatResponse {
	return {
		message: insight.summary || "Here's what I found about your spending.",
		details: insight.details,
		cards: insight.data
			? [{ type: 'forecast', data: insight.data }]
			: undefined,
		actions: insight.actions || [],
		sources: insight.sources || [{ kind: 'localML' }],
		cost: { model: 'mini', estTokens: 80 },
	};
}

export function composeGoalProgress(goal: any, ctx: any): ChatResponse {
	const progress = Math.round((goal.current / goal.target) * 100);
	const remaining = goal.target - goal.current;

	return {
		message: `Your ${goal.name} goal is ${progress}% complete.`,
		details: `You need $${remaining.toFixed(2)} more to reach your target.`,
		cards: [{ type: 'balance', data: goal }],
		actions: [
			{ label: 'View details', action: 'OPEN_BUDGETS' as const },
			{
				label: 'Adjust target',
				action: 'ADJUST_LIMIT' as const,
				params: { goalId: goal.id },
			},
		],
		sources: [{ kind: 'db' }],
		cost: { model: 'mini', estTokens: 70 },
	};
}

export function composeGenericResponse(
	text: string,
	context?: any
): ChatResponse {
	return {
		message: text,
		sources: [{ kind: 'gpt' }],
		cost: { model: 'std', estTokens: text.length / 4 },
	};
}

// Enhanced response composers for better UX
export function composeBudgetStatusEnhanced(ans: any, ctx: any): ChatResponse {
	const pct = Math.round((ans.spent / ans.total) * 100);
	const top = ans.byCat?.sort(
		(a: any, b: any) => b.spent / b.limit - a.spent / b.limit
	)[0];

	const summary = `You've used ${pct}% of August's budget. Biggest pressure is ${
		top?.cat || 'unknown'
	} at $${top?.spent || 0}/$${top?.limit || 0}.`;

	return {
		message: summary,
		summary: summary,
		details: `Budget breakdown and recommendations for August ${new Date().getFullYear()}`,
		cards: [{ type: 'budget', data: ans }],
		actions: [
			...(top
				? [
						{
							label: 'Adjust Food limit',
							action: 'ADJUST_LIMIT' as const,
							params: { cat: top.cat },
						},
				  ]
				: []),
			{ label: 'See by category', action: 'OPEN_BUDGETS' as const },
		],
		sources: [{ kind: 'db' }],
		cost: { model: 'mini', estTokens: 90 },
		confidence: 0.95,
		insights: [
			`${pct}% budget utilization`,
			`Top pressure: ${top?.cat || 'unknown'}`,
		],
	};
}

export function composeSpendingStrategyOptimization(
	insight: any,
	ctx: any
): ChatResponse {
	const summary = `You could free up $${insight.savings?.min || 0}–$${
		insight.savings?.max || 0
	}/mo by (1) trimming ${
		insight.recommendations?.[0]?.category || 'Food'
	} to last month's median, (2) canceling ${
		insight.recommendations?.[1]?.subscription || 'unused subscription'
	} which you haven't used in ${
		insight.recommendations?.[1]?.unusedDays || 0
	} days.`;

	return {
		message: summary,
		summary: summary,
		details: `Detailed spending optimization analysis with actionable recommendations`,
		cards: [{ type: 'subscriptions', data: insight.subscriptions }],
		actions: [
			{
				label: 'Create Food rule',
				action: 'CREATE_RULE' as const,
				params: { category: 'Food' },
			},
			{ label: 'Open Recurring', action: 'VIEW_RECURRING' as const },
		],
		sources: [
			{ kind: 'db' },
			{ kind: 'localML' },
			{ kind: 'gpt', note: 'pro_model_capped_600_tokens' },
		],
		cost: { model: 'pro', estTokens: 600 },
		confidence: 0.88,
		insights: [
			`Potential savings: $${insight.savings?.min || 0}-$${
				insight.savings?.max || 0
			}/month`,
			`Low-utility subscription identified`,
			`Category-specific optimization recommendations`,
		],
	};
}

export function composeFallbackResponse(
	query: string,
	context: any
): ChatResponse {
	const summary = `I can't run a full analysis right now, but here's your recent spend: Food $${
		context.recentSpend?.food || 0
	}, Transport $${context.recentSpend?.transport || 0}, Shopping $${
		context.recentSpend?.shopping || 0
	}. Want to tune ${
		context.recentSpend?.food > 300 ? 'Food' : 'budgets'
	} this month?`;

	return {
		message: summary,
		summary: summary,
		details: `Limited analysis due to system constraints. Showing cached data only.`,
		cards: [{ type: 'budget', data: context.recentSpend }],
		actions: [
			{
				label: 'Adjust Food limit',
				action: 'ADJUST_LIMIT' as const,
				params: { category: 'Food' },
			},
			{ label: 'Open Budgets', action: 'OPEN_BUDGETS' as const },
		],
		sources: [{ kind: 'cache', note: 'zero_tokens_fallback' }],
		cost: { model: 'mini', estTokens: 0 },
		confidence: 0.75,
		insights: ['Using cached data', 'Limited analysis available'],
	};
}

// Main function to compose structured responses from AI narration
export function composeStructuredResponse(
	narration: string,
	context?: any
): ChatResponse {
	// Extract key insights from the narration
	const insights = extractInsightsFromNarration(narration);

	// Create a structured response based on the narration
	return {
		message: narration, // Keep the actual narration as the message
		summary: narration, // Use full narration as summary, not truncated
		details: '', // Keep details empty unless we have specific details
		cards: [],
		actions: generateDefaultActions(context),
		sources: [{ kind: 'gpt', note: 'post_processed' }],
		cost: { model: 'mini', estTokens: Math.ceil(narration.length / 4) },
		confidence: 0.8,
		insights: insights,
		rationale: 'Response generated from validated narration',
	};
}

// Helper function to extract insights from narration text
function extractInsightsFromNarration(narration: string): string[] {
	const insights: string[] = [];

	// Look for percentage patterns (e.g., "50% budget utilization")
	const percentageMatch = narration.match(/(\d+)%\s+(\w+)/);
	if (percentageMatch) {
		insights.push(`${percentageMatch[1]}% ${percentageMatch[2]}`);
	}

	// Look for dollar amounts
	const dollarMatch = narration.match(/\$(\d+(?:\.\d{2})?)/);
	if (dollarMatch) {
		insights.push(`Amount: $${dollarMatch[1]}`);
	}

	// Look for budget-related keywords
	if (narration.toLowerCase().includes('budget')) {
		insights.push('Budget analysis available');
	}

	if (narration.toLowerCase().includes('goal')) {
		insights.push('Goal progress tracked');
	}

	// Default insight if none found - return generic insight
	if (insights.length === 0) {
		insights.push('Financial analysis available');
	}

	return insights;
}

// Helper function to generate default actions based on context
function generateDefaultActions(context?: any): {
	label: string;
	action: 'OPEN_BUDGETS' | 'ADJUST_LIMIT';
	params?: any;
}[] {
	const actions: {
		label: string;
		action: 'OPEN_BUDGETS' | 'ADJUST_LIMIT';
		params?: any;
	}[] = [
		{
			label: 'View Details',
			action: 'OPEN_BUDGETS',
			params: { period: 'mtd' },
		},
	];

	if (context?.hasBudgets) {
		actions.push({ label: 'Adjust Budgets', action: 'ADJUST_LIMIT' });
	}

	if (context?.hasGoals) {
		actions.push({
			label: 'Check Goals',
			action: 'OPEN_BUDGETS',
			params: { period: 'mtd' },
		});
	}

	return actions;
}

// Helper function to ensure response consistency
export function ensureResponseConsistency(
	response: ChatResponse
): ChatResponse {
	// Always attach one safe action button if none present
	if (!response.actions || response.actions.length === 0) {
		response.actions = [
			{ label: 'View Details', action: 'OPEN_BUDGETS' as const },
		];
	}

	// Ensure message is 1-2 lines max
	if (response.message && response.message.split('\n').length > 2) {
		const lines = response.message.split('\n');
		response.message = lines.slice(0, 2).join('\n');
		response.details =
			(response.details || '') + '\n' + lines.slice(2).join('\n');
	}

	// Don't overwrite message with summary - keep the original narration
	// Only set summary if it doesn't exist
	if (!response.summary && response.message) {
		response.summary = response.message;
	}

	return response;
}

// Utility functions for working with ChatResponse objects
export function createEmptyResponse(): ChatResponse {
	return {
		message: '',
		cards: [],
		actions: [],
		sources: [],
		cost: { model: 'mini', estTokens: 0 },
		confidence: 0,
		insights: [],
		timestamp: new Date(),
		processingTime: 0,
	};
}

export function createErrorResponse(
	error: string,
	context?: any
): ChatResponse {
	return {
		message: `I encountered an error: ${error}`,
		details: 'Please try again or contact support if the issue persists.',
		actions: [
			{ label: 'Try Again', action: 'OPEN_BUDGETS' as const },
			{ label: 'Contact Support', action: 'CONTACT_SUPPORT' as const },
		],
		sources: [{ kind: 'gpt', note: 'error_response' }],
		cost: { model: 'mini', estTokens: 20 },
		confidence: 0.1,
		insights: ['Error occurred during processing'],
		timestamp: new Date(),
		processingTime: 0,
	};
}

export function createLoadingResponse(operation: string): ChatResponse {
	return {
		message: `Processing ${operation}...`,
		details: 'This may take a moment.',
		actions: [],
		sources: [{ kind: 'gpt', note: 'loading_state' }],
		cost: { model: 'mini', estTokens: 0 },
		confidence: 0.5,
		insights: ['Processing in progress'],
		timestamp: new Date(),
		processingTime: 0,
	};
}

export function mergeResponses(responses: ChatResponse[]): ChatResponse {
	if (responses.length === 0) return createEmptyResponse();
	if (responses.length === 1) return responses[0];

	const merged: ChatResponse = {
		message: responses.map((r) => r.message).join(' '),
		details: responses
			.map((r) => r.details)
			.filter(Boolean)
			.join('\n\n'),
		cards: responses.flatMap((r) => r.cards || []),
		actions: responses.flatMap((r) => r.actions || []),
		skills: responses.flatMap((r) => r.skills || []),
		sources: responses.flatMap((r) => r.sources || []),
		cost: {
			model: responses.reduce(
				(max, r) =>
					r.cost?.model === 'pro'
						? 'pro'
						: r.cost?.model === 'std' && max !== 'pro'
						? 'std'
						: 'mini',
				'mini' as 'mini' | 'std' | 'pro'
			),
			estTokens: responses.reduce(
				(sum, r) => sum + (r.cost?.estTokens || 0),
				0
			),
		},
		summary: responses
			.map((r) => r.summary)
			.filter(Boolean)
			.join(' '),
		insights: responses.flatMap((r) => r.insights || []),
		confidence:
			responses.reduce((sum, r) => sum + (r.confidence || 0), 0) /
			responses.length,
		rationale: responses
			.map((r) => r.rationale)
			.filter(Boolean)
			.join(' '),
		timestamp: new Date(),
		processingTime: responses.reduce(
			(sum, r) => sum + (r.processingTime || 0),
			0
		),
		modelUsed: responses.reduce(
			(max, r) =>
				r.modelUsed === 'pro'
					? 'pro'
					: r.modelUsed === 'std' && max !== 'pro'
					? 'std'
					: 'mini',
			'mini' as 'mini' | 'std' | 'pro'
		),
	};

	return ensureResponseConsistency(merged);
}

export function validateResponse(response: ChatResponse): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (!response.message || response.message.trim().length === 0) {
		errors.push('Message is required');
	}

	if (
		response.confidence !== undefined &&
		(response.confidence < 0 || response.confidence > 1)
	) {
		errors.push('Confidence must be between 0 and 1');
	}

	if (response.cost && response.cost.estTokens < 0) {
		errors.push('Estimated tokens must be non-negative');
	}

	if (response.cards) {
		response.cards.forEach((card, index) => {
			if (!card.type) {
				errors.push(`Card ${index} is missing type`);
			}
			if (card.data === undefined) {
				errors.push(`Card ${index} is missing data`);
			}
		});
	}

	if (response.actions) {
		response.actions.forEach((action, index) => {
			if (!action.label) {
				errors.push(`Action ${index} is missing label`);
			}
			if (!action.action) {
				errors.push(`Action ${index} is missing action`);
			}
		});
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}
