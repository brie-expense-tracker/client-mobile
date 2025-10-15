// Prompt builder for narration-only AI responses
// Focuses on grounded facts and actionable insights

export interface NarrationFacts {
	budgets?: {
		name: string;
		amount: number;
		spent: number;
		category?: string;
	}[];
	goals?: {
		name: string;
		target: number;
		current: number;
		deadline?: string;
	}[];
	transactions?: {
		amount: number;
		category: string;
		date: string;
		description: string;
	}[];
	recurringExpenses?: {
		vendor: string;
		amount: number;
		frequency: string;
		nextDue: string;
		isOverdue: boolean;
	}[];
	profile?: {
		monthlyIncome?: number;
		savings?: number;
		debt?: number;
		riskProfile?: string;
	};
	insights?: {
		type: 'spending' | 'saving' | 'budget' | 'goal';
		message: string;
		confidence: number;
		data?: any;
	}[];
}

export interface UserProfile {
	goals?: {
		name: string;
		priority: 'low' | 'medium' | 'high';
		category: string;
	}[];
	preferences?: {
		riskTolerance: 'conservative' | 'moderate' | 'aggressive';
		focusAreas: string[];
	};
}

export const narrationPrompt = (
	facts: NarrationFacts,
	userProfile: UserProfile
) => `
You are Brie, a concise financial guide. Your role is to narrate facts clearly and suggest specific actions.

## CORE PRINCIPLES
- **Fact-based**: Use ONLY provided facts for numbers. If unknown, say "I don't have enough information" or similar.
- **Accurate**: NEVER invent numbers, percentages, or financial data not explicitly provided.
- **Concise**: Keep response to one short paragraph + at most 2 actionable suggestions.
- **Actionable**: Focus on risks and opportunities based on actual data.
- **Encouraging**: Be positive but realistic in your tone.

## AVAILABLE ACTIONS
Use these action IDs for buttons (choose 1-2 most relevant):
- **Budget Management**: OPEN_BUDGETS, CREATE_RULE, ADJUST_LIMIT, OPEN_BUDGET_WIZARD, MAKE_BUDGETS_FROM_PLAN
- **Goal Management**: CREATE_GOAL, UPDATE_GOAL, DELETE_GOAL, OPEN_GOAL_WIZARD, ADJUST_GOAL_PRIORITY
- **Transaction Management**: VIEW_TRANSACTIONS, OPEN_TRANSACTION_FORM, MARK_PAID
- **Recurring Expenses**: OPEN_RECURRING_EXPENSES, ADD_RECURRING_EXPENSE, PAY_RECURRING_EXPENSE, REVIEW_RECURRING
- **Analysis & Insights**: VIEW_ANALYTICS, EXPORT_DATA, SHARE_INSIGHT
- **Setup & Configuration**: OPEN_SETUP_WIZARD, CONNECT_ACCOUNT, OPEN_INCOME_FORM, OPEN_RECURRING_FORM
- **Advanced Features**: OPEN_PLAN_TUNER, SETUP_AUTO_TRANSFER, ALLOCATE_REMAINING, SCHEDULE_REMINDER
- **Support**: CONTACT_SUPPORT, UPGRADE_PLAN, SET_ALERT, MANAGE_SUBSCRIPTIONS

## CONTEXT DATA
**FACTS:**
${JSON.stringify(facts, null, 2)}

**USER PROFILE:**
${JSON.stringify(userProfile, null, 2)}

## RESPONSE FORMAT
Return a valid JSON object with this exact structure:
{
  "message": "Brief summary based on facts (1-2 sentences max)",
  "details": "Optional risk/opportunity highlight or additional context",
  "actions": [
    {
      "label": "Clear, concise button text (max 20 chars)",
      "action": "ACTION_ID",
      "params": {}
    }
  ],
  "sources": [{"kind": "db"}],
  "cost": {"model": "mini", "estTokens": 0}
}

## QUALITY CHECKS
Before responding, verify:
- All numbers come from provided facts
- Actions are contextually appropriate
- Message is concise and clear
- JSON is properly formatted
- No invented financial data
`;

export const criticPrompt = (response: string, facts: NarrationFacts) => `
You are a fact-checking critic. Review this financial response for accuracy and quality.

## VALIDATION CHECKLIST
1. **Fact Accuracy**: Does it reference numbers not in the provided facts?
2. **Evidence-Based**: Does it make claims without evidence?
3. **Action Validity**: Are the suggested actions valid and contextually appropriate?
4. **Format Compliance**: Is the JSON properly formatted?
5. **Length Guidelines**: Is the message appropriately concise?
6. **Tone Consistency**: Is the tone encouraging but realistic?

## RESPONSE TO REVIEW
${response}

## AVAILABLE FACTS
${JSON.stringify(facts, null, 2)}

## CRITIQUE FORMAT
Return a valid JSON object:
{
  "isValid": boolean,
  "issues": ["list of specific problems found"],
  "fixes": ["specific corrections needed"],
  "confidence": number (0-1),
  "severity": "low" | "medium" | "high"
}

## EVALUATION CRITERIA
- **High Confidence (0.8-1.0)**: All facts verified, actions appropriate, format correct
- **Medium Confidence (0.5-0.7)**: Minor issues with formatting or action selection
- **Low Confidence (0.0-0.4)**: Factual errors, invalid actions, or format problems
`;

export const fallbackTemplate = (
	facts: NarrationFacts,
	type: 'budget' | 'goal' | 'spending' | 'general'
) => {
	switch (type) {
		case 'budget':
			if (facts.budgets && facts.budgets.length > 0) {
				const totalBudget = facts.budgets.reduce(
					(sum, b) => sum + (b.amount || 0),
					0
				);
				const totalSpent = facts.budgets.reduce(
					(sum, b) => sum + (b.spent || 0),
					0
				);
				const remaining = totalBudget - totalSpent;

				return {
					message: `You have $${remaining.toFixed(
						2
					)} remaining across your budgets this month.`,
					details:
						remaining < 0
							? "You've exceeded your budget. Consider reviewing your spending."
							: "You're on track with your budget.",
					actions: [
						{
							label: 'View budgets',
							action: 'OPEN_BUDGETS' as const,
							params: {},
						},
						{
							label: 'Adjust limits',
							action: 'ADJUST_LIMIT' as const,
							params: {},
						},
					],
					sources: [{ kind: 'db' as const }],
					cost: { model: 'mini' as const, estTokens: 40 },
				};
			}
			break;

		case 'goal':
			if (facts.goals && facts.goals.length > 0) {
				const goal = facts.goals[0];
				const progress = Math.round((goal.current / goal.target) * 100);

				return {
					message: `Your ${goal.name} goal is ${progress}% complete.`,
					details: `You need $${(goal.target - goal.current).toFixed(
						2
					)} more to reach your target.`,
					actions: [
						{
							label: 'View goals',
							action: 'VIEW_ANALYTICS' as const,
							params: { section: 'goals' },
						},
						{
							label: 'Update goal',
							action: 'UPDATE_GOAL' as const,
							params: { goalId: goal.name },
						},
						{
							label: 'Create new goal',
							action: 'CREATE_GOAL' as const,
							params: {},
						},
					],
					sources: [{ kind: 'db' as const }],
					cost: { model: 'mini' as const, estTokens: 50 },
				};
			}
			break;

		case 'spending':
			if (facts.transactions && facts.transactions.length > 0) {
				const recentTotal = facts.transactions
					.slice(0, 5)
					.reduce((sum, t) => sum + (t.amount || 0), 0);

				return {
					message: `Your recent spending totals $${recentTotal.toFixed(2)}.`,
					details: 'I can help you analyze patterns and set budgets.',
					actions: [
						{
							label: 'View transactions',
							action: 'VIEW_TRANSACTIONS' as const,
							params: { period: 'recent' },
						},
						{
							label: 'Create budget',
							action: 'OPEN_BUDGET_WIZARD' as const,
							params: {},
						},
						{
							label: 'Analyze spending',
							action: 'VIEW_ANALYTICS' as const,
							params: { section: 'spending' },
						},
					],
					sources: [{ kind: 'db' as const }],
					cost: { model: 'mini' as const, estTokens: 45 },
				};
			}
			break;

		default:
			return {
				message:
					'I can help you with your finances. What would you like to work on?',
				details: 'I can assist with budgeting, goals, and spending analysis.',
				actions: [
					{
						label: 'Create budget',
						action: 'OPEN_BUDGET_WIZARD' as const,
						params: {},
					},
					{
						label: 'Set goals',
						action: 'OPEN_GOAL_WIZARD' as const,
						params: {},
					},
					{
						label: 'View analytics',
						action: 'VIEW_ANALYTICS' as const,
						params: {},
					},
				],
				sources: [{ kind: 'db' as const }],
				cost: { model: 'mini' as const, estTokens: 35 },
			};
	}

	// Fallback for when no relevant data is available
	return {
		message: "I don't have enough information to provide specific insights.",
		details: 'Please add some budgets, goals, or transactions to get started.',
		actions: [
			{
				label: 'Create budget',
				action: 'OPEN_BUDGET_WIZARD' as const,
				params: {},
			},
			{
				label: 'Set goals',
				action: 'OPEN_GOAL_WIZARD' as const,
				params: {},
			},
			{
				label: 'Add transaction',
				action: 'OPEN_TRANSACTION_FORM' as const,
				params: {},
			},
			{
				label: 'Setup wizard',
				action: 'OPEN_SETUP_WIZARD' as const,
				params: {},
			},
		],
		sources: [{ kind: 'db' as const }],
		cost: { model: 'mini' as const, estTokens: 30 },
	};
};

// Response validation and consistency utilities
export interface PromptResponse {
	message: string;
	details?: string;
	actions?: {
		label: string;
		action: string;
		params?: any;
	}[];
	sources?: { kind: string }[];
	cost?: { model: string; estTokens: number };
}

export function validatePromptResponse(response: PromptResponse): {
	valid: boolean;
	errors: string[];
	warnings: string[];
} {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Required fields validation
	if (!response.message || response.message.trim().length === 0) {
		errors.push('Message is required and cannot be empty');
	}

	// Message length validation
	if (response.message && response.message.length > 500) {
		warnings.push('Message is quite long, consider shortening for better UX');
	}

	// Actions validation
	if (response.actions) {
		response.actions.forEach((action, index) => {
			if (!action.label || action.label.trim().length === 0) {
				errors.push(`Action ${index + 1} is missing a label`);
			}
			if (!action.action || action.action.trim().length === 0) {
				errors.push(`Action ${index + 1} is missing an action type`);
			}
			if (action.label && action.label.length > 30) {
				warnings.push(
					`Action ${index + 1} label is quite long: "${action.label}"`
				);
			}
		});
	}

	// Cost validation
	if (response.cost) {
		if (response.cost.estTokens < 0) {
			errors.push('Estimated tokens cannot be negative');
		}
		if (response.cost.estTokens > 1000) {
			warnings.push('Estimated tokens is quite high, consider optimizing');
		}
		if (!['mini', 'std', 'pro'].includes(response.cost.model)) {
			errors.push('Invalid model type in cost estimation');
		}
	}

	// Sources validation
	if (response.sources) {
		response.sources.forEach((source, index) => {
			if (
				!source.kind ||
				!['cache', 'localML', 'db', 'gpt'].includes(source.kind)
			) {
				errors.push(`Source ${index + 1} has invalid kind: ${source.kind}`);
			}
		});
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}

export function enhancePromptResponse(
	response: PromptResponse
): PromptResponse {
	// Ensure message is properly formatted
	if (response.message) {
		response.message = response.message.trim();
		// Ensure it ends with proper punctuation
		if (!response.message.match(/[.!?]$/)) {
			response.message += '.';
		}
	}

	// Ensure details are properly formatted
	if (response.details) {
		response.details = response.details.trim();
	}

	// Ensure actions have proper structure
	if (response.actions) {
		response.actions = response.actions.map((action) => ({
			...action,
			label: action.label?.trim() || 'Action',
			action: action.action?.trim() || 'OPEN_BUDGETS',
			params: action.params || {},
		}));
	}

	// Ensure sources have proper structure
	if (response.sources) {
		response.sources = response.sources.map((source) => ({
			...source,
			kind: source.kind || 'db',
		}));
	} else {
		response.sources = [{ kind: 'db' }];
	}

	// Ensure cost has proper structure
	if (!response.cost) {
		response.cost = { model: 'mini', estTokens: 50 };
	}

	return response;
}

export function createPromptResponse(
	message: string,
	options: {
		details?: string;
		actions?: PromptResponse['actions'];
		sources?: PromptResponse['sources'];
		cost?: PromptResponse['cost'];
	} = {}
): PromptResponse {
	const response: PromptResponse = {
		message,
		...options,
	};

	return enhancePromptResponse(response);
}

// Context-aware prompt generation
export function createContextualPrompt(
	facts: NarrationFacts,
	userProfile: UserProfile,
	context: {
		recentQuery?: string;
		userIntent?: 'budget' | 'goal' | 'spending' | 'general' | 'analysis';
		urgency?: 'low' | 'medium' | 'high';
		hasRecentActivity?: boolean;
	}
) {
	const basePrompt = narrationPrompt(facts, userProfile);

	// Add context-specific instructions
	let contextualInstructions = '';

	if (context.userIntent) {
		contextualInstructions += `\n## USER INTENT: ${context.userIntent.toUpperCase()}\n`;
		contextualInstructions += `Focus your response on ${context.userIntent}-related insights and actions.\n`;
	}

	if (context.urgency === 'high') {
		contextualInstructions += `\n## URGENCY: HIGH\n`;
		contextualInstructions += `Prioritize immediate actions and critical insights. Keep response very concise.\n`;
	}

	if (context.recentQuery) {
		contextualInstructions += `\n## RECENT QUERY: "${context.recentQuery}"\n`;
		contextualInstructions += `Address this specific question or concern in your response.\n`;
	}

	if (context.hasRecentActivity) {
		contextualInstructions += `\n## RECENT ACTIVITY DETECTED\n`;
		contextualInstructions += `Acknowledge recent user activity and provide relevant updates.\n`;
	}

	return basePrompt + contextualInstructions;
}

// Smart fallback selection based on available data
export function selectOptimalFallback(
	facts: NarrationFacts
): 'budget' | 'goal' | 'spending' | 'general' {
	// Prioritize based on data availability and recency
	if (facts.budgets && facts.budgets.length > 0) {
		return 'budget';
	}

	if (facts.goals && facts.goals.length > 0) {
		return 'goal';
	}

	if (facts.transactions && facts.transactions.length > 0) {
		return 'spending';
	}

	return 'general';
}

// Enhanced fallback with smart selection
export function createSmartFallback(
	facts: NarrationFacts,
	userProfile: UserProfile
) {
	const fallbackType = selectOptimalFallback(facts);
	return fallbackTemplate(facts, fallbackType);
}
