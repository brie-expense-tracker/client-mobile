// Prompt builder for narration-only AI responses
// Focuses on grounded facts and actionable insights

export interface NarrationFacts {
	budgets?: Array<{
		name: string;
		amount: number;
		spent: number;
		category?: string;
	}>;
	goals?: Array<{
		name: string;
		target: number;
		current: number;
		deadline?: string;
	}>;
	transactions?: Array<{
		amount: number;
		category: string;
		date: string;
		description: string;
	}>;
	profile?: {
		monthlyIncome?: number;
		savings?: number;
		debt?: number;
		riskProfile?: string;
	};
	insights?: Array<{
		type: 'spending' | 'saving' | 'budget' | 'goal';
		message: string;
		confidence: number;
		data?: any;
	}>;
}

export interface UserProfile {
	goals?: Array<{
		name: string;
		priority: 'low' | 'medium' | 'high';
		category: string;
	}>;
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

STRICT RULES:
- Use ONLY provided facts for numbers. If unknown, say "I don't have enough information" or similar.
- NEVER invent numbers, percentages, or financial data not explicitly provided.
- Keep response to one short paragraph + at most 2 actionable suggestions.
- Suggest buttons by referencing these action IDs only: OPEN_BUDGETS, CREATE_RULE, ADJUST_LIMIT, VIEW_RECURRING.
- Focus on risks and opportunities based on actual data.
- Be encouraging but realistic.

FACTS:
${JSON.stringify(facts, null, 2)}

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

RESPONSE FORMAT:
{
  "message": "Brief summary based on facts",
  "details": "Optional risk/opportunity highlight",
  "actions": [
    {
      "label": "Action button text",
      "action": "ACTION_ID",
      "params": {}
    }
  ],
  "sources": [{"kind": "db"}],
  "cost": {"model": "mini", "estTokens": 0}
}
`;

export const criticPrompt = (response: string, facts: NarrationFacts) => `
You are a fact-checking critic. Review this financial response for accuracy.

CHECK:
1. Does it reference numbers not in the provided facts?
2. Does it make claims without evidence?
3. Are the suggested actions valid?

RESPONSE TO CHECK:
${response}

FACTS AVAILABLE:
${JSON.stringify(facts, null, 2)}

RESPONSE FORMAT:
{
  "isValid": boolean,
  "issues": ["list of specific problems"],
  "fixes": ["specific corrections needed"],
  "confidence": number
}
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
							action: 'OPEN_BUDGETS' as const,
							params: {},
						},
						{
							label: 'Adjust target',
							action: 'ADJUST_LIMIT' as const,
							params: { goalId: goal.name },
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
							action: 'OPEN_BUDGETS' as const,
							params: {},
						},
						{
							label: 'Create budget',
							action: 'CREATE_RULE' as const,
							params: {},
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
						action: 'CREATE_RULE' as const,
						params: {},
					},
					{ label: 'Set goals', action: 'OPEN_BUDGETS' as const, params: {} },
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
			{ label: 'Create budget', action: 'CREATE_RULE' as const, params: {} },
			{ label: 'Set goals', action: 'OPEN_BUDGETS' as const, params: {} },
		],
		sources: [{ kind: 'db' as const }],
		cost: { model: 'mini' as const, estTokens: 30 },
	};
};
