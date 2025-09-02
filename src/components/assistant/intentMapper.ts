// Intent Mapper - Maps common intents to consistent answer patterns
// Ensures the AI experience feels deliberate and interconnected with the app

import { ChatResponse } from './responseSchema';
import { FinancialContext } from './helpfulFallbacks';

export type IntentType =
	| 'GET_BALANCE'
	| 'GET_BUDGET_STATUS'
	| 'LIST_SUBSCRIPTIONS'
	| 'FORECAST_SPEND'
	| 'CATEGORIZE_TX';

export interface IntentPattern {
	primaryData: (context: FinancialContext) => any;
	extraContext: (
		context: FinancialContext,
		primaryData: any
	) => string | undefined;
	actions: (
		context: FinancialContext,
		primaryData: any
	) => Array<{
		label: string;
		action: 'OPEN_BUDGETS' | 'ADJUST_LIMIT' | 'CREATE_RULE' | 'VIEW_RECURRING';
		params?: any;
	}>;
	composeResponse: (
		primaryData: any,
		extraContext: string | undefined,
		actions: any[]
	) => ChatResponse;
}

// Intent mapping configuration
export const intentPatterns: Record<IntentType, IntentPattern> = {
	GET_BALANCE: {
		primaryData: (context: FinancialContext) => {
			const accounts =
				context.budgets?.map((budget) => ({
					name: budget.name,
					current: budget.amount - (budget.spent || 0),
					total: budget.amount,
					spent: budget.spent || 0,
				})) || [];

			return {
				accounts,
				totalBalance: accounts.reduce((sum, acc) => sum + acc.current, 0),
				totalBudget: accounts.reduce((sum, acc) => sum + acc.total, 0),
			};
		},

		extraContext: (context: FinancialContext, primaryData: any) => {
			// Compare with last week's data if available
			const lastWeekData = context.transactions?.filter((t) => {
				const txDate = new Date(t.date);
				const weekAgo = new Date();
				weekAgo.setDate(weekAgo.getDate() - 7);
				return txDate >= weekAgo;
			});

			if (lastWeekData && lastWeekData.length > 0) {
				const lastWeekTotal = lastWeekData.reduce(
					(sum, t) => sum + (t.amount || 0),
					0
				);
				const currentTotal = primaryData.totalBalance;
				const change = currentTotal - lastWeekTotal;

				if (Math.abs(change) > 10) {
					// Only show if significant change
					return change > 0
						? `You're up $${change.toFixed(2)} from last week`
						: `You're down $${Math.abs(change).toFixed(2)} from last week`;
				}
			}

			return undefined;
		},

		actions: (context: FinancialContext, primaryData: any) => [
			{ label: 'View Budgets', action: 'OPEN_BUDGETS' },
		],

		composeResponse: (primaryData, extraContext, actions) => ({
			message: `You have $${primaryData.totalBalance.toFixed(
				2
			)} available across ${primaryData.accounts.length} budgets`,
			details: extraContext,
			cards: [{ type: 'balance', data: primaryData }],
			actions,
			sources: [{ kind: 'db' }],
			cost: { model: 'mini', estTokens: 80 },
		}),
	},

	GET_BUDGET_STATUS: {
		primaryData: (context: FinancialContext) => {
			const budgets = context.budgets || [];
			const statuses = budgets.map((budget) => ({
				name: budget.name,
				spent: budget.spent || 0,
				limit: budget.amount,
				percentage: Math.round(((budget.spent || 0) / budget.amount) * 100),
				remaining: budget.amount - (budget.spent || 0),
			}));

			// Find most pressured category
			const pressured = statuses
				.filter((s) => s.percentage > 70)
				.sort((a, b) => b.percentage - a.percentage)[0];

			return {
				statuses,
				pressured,
				totalSpent: statuses.reduce((sum, s) => sum + s.spent, 0),
				totalBudget: statuses.reduce((sum, s) => sum + s.limit, 0),
			};
		},

		extraContext: (context: FinancialContext, primaryData: any) => {
			if (primaryData.pressured) {
				// Calculate how much could be freed up from other categories
				const otherCategories = primaryData.statuses.filter(
					(s) => s.name !== primaryData.pressured.name && s.percentage < 50
				);

				if (otherCategories.length > 0) {
					const potentialSavings = otherCategories.reduce((sum, s) => {
						const safeReduction = Math.min(s.remaining * 0.2, s.limit * 0.1); // 20% of remaining or 10% of limit
						return sum + safeReduction;
					}, 0);

					if (potentialSavings > 50) {
						// Only suggest if significant
						return `Tip: You could free up $${potentialSavings.toFixed(
							2
						)} by reducing other categories`;
					}
				}
			}

			return undefined;
		},

		actions: (context: FinancialContext, primaryData: any) => {
			const actions = [{ label: 'View All Budgets', action: 'OPEN_BUDGETS' }];

			if (primaryData.pressured) {
				actions.push({
					label: 'Adjust Limit',
					action: 'ADJUST_LIMIT',
					params: { cat: primaryData.pressured.name },
				});
			}

			return actions;
		},

		composeResponse: (primaryData, extraContext, actions) => ({
			message: primaryData.pressured
				? `${primaryData.pressured.name} is at ${
						primaryData.pressured.percentage
				  }% - ${primaryData.pressured.remaining.toFixed(2)} remaining`
				: `All budgets are in good shape`,
			details: extraContext,
			cards: [{ type: 'budget', data: primaryData }],
			actions,
			sources: [{ kind: 'db' }],
			cost: { model: 'mini', estTokens: 100 },
		}),
	},

	LIST_SUBSCRIPTIONS: {
		primaryData: (context: FinancialContext) => {
			const recurring = context.recurringExpenses || [];
			const subscriptions = recurring.map((exp) => ({
				name: exp.name,
				amount: exp.amount,
				frequency: exp.frequency,
				nextDue: exp.nextDueDate,
				category: exp.category,
				utility: exp.utility || 'medium', // low, medium, high
				risk: exp.amount > 100 ? 'high' : exp.amount > 50 ? 'medium' : 'low',
			}));

			// Sort by next due date
			subscriptions.sort(
				(a, b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime()
			);

			return {
				subscriptions,
				totalMonthly: subscriptions.reduce((sum, s) => sum + s.amount, 0),
				risky: subscriptions.filter(
					(s) => s.risk === 'high' && s.utility === 'low'
				),
			};
		},

		extraContext: (context: FinancialContext, primaryData: any) => {
			if (primaryData.risky.length > 0) {
				const riskyTotal = primaryData.risky.reduce(
					(sum, s) => sum + s.amount,
					0
				);
				return `${primaryData.risky.length} risky subscription${
					primaryData.risky.length > 1 ? 's' : ''
				} costing $${riskyTotal.toFixed(2)}/month`;
			}
			return undefined;
		},

		actions: (context: FinancialContext, primaryData: any) => [
			{ label: 'View Recurring', action: 'VIEW_RECURRING' },
			...(primaryData.risky.length > 0
				? [
						{
							label: 'Create Rule',
							action: 'CREATE_RULE',
							params: { type: 'subscription', risky: true },
						},
				  ]
				: []),
		],

		composeResponse: (primaryData, extraContext, actions) => ({
			message: `You have ${
				primaryData.subscriptions.length
			} subscriptions totaling $${primaryData.totalMonthly.toFixed(2)}/month`,
			details: extraContext,
			cards: [{ type: 'subscriptions', data: primaryData }],
			actions,
			sources: [{ kind: 'db' }],
			cost: { model: 'mini', estTokens: 90 },
		}),
	},

	FORECAST_SPEND: {
		primaryData: (context: FinancialContext) => {
			const transactions = context.transactions || [];
			const budgets = context.budgets || [];

			// Calculate average daily spending
			const recentTransactions = transactions.filter((t) => {
				const txDate = new Date(t.date);
				const monthAgo = new Date();
				monthAgo.setMonth(monthAgo.getMonth() - 1);
				return txDate >= monthAgo;
			});

			const totalSpent = recentTransactions.reduce(
				(sum, t) => sum + (t.amount || 0),
				0
			);
			const daysInPeriod = 30;
			const avgDaily = totalSpent / daysInPeriod;

			// Project next 30 days
			const next30Days = avgDaily * 30;
			const confidence =
				recentTransactions.length > 10
					? 'high'
					: recentTransactions.length > 5
					? 'medium'
					: 'low';

			return {
				avgDaily,
				next30Days,
				confidence,
				recentTransactionCount: recentTransactions.length,
				categoryBreakdown: budgets.map((budget) => ({
					name: budget.name,
					projected: (budget.spent || 0) * (30 / 30), // Assuming monthly budget
					remaining: budget.amount - (budget.spent || 0),
				})),
			};
		},

		extraContext: (context: FinancialContext, primaryData: any) => {
			return `Disclaimer: Based on ${primaryData.recentTransactionCount} recent transactions. Confidence: ${primaryData.confidence}`;
		},

		actions: (context: FinancialContext, primaryData: any) => [
			{ label: 'View Budgets', action: 'OPEN_BUDGETS' },
		],

		composeResponse: (primaryData, extraContext, actions) => ({
			message: `You're projected to spend $${primaryData.next30Days.toFixed(
				2
			)} in the next 30 days`,
			details: extraContext,
			cards: [{ type: 'forecast', data: primaryData }],
			actions,
			sources: [{ kind: 'localML' }],
			cost: { model: 'mini', estTokens: 110 },
		}),
	},

	CATEGORIZE_TX: {
		primaryData: (context: FinancialContext) => {
			// This would typically be called with a specific transaction
			// For now, return a template structure
			return {
				suggestedCategory: 'Unknown',
				confidence: 0.8,
				alternatives: ['Food', 'Transport', 'Entertainment'],
				transaction: null,
			};
		},

		extraContext: (context: FinancialContext, primaryData: any) => {
			if (primaryData.confidence < 0.7) {
				return `Low confidence - you may want to manually categorize`;
			}
			return undefined;
		},

		actions: (context: FinancialContext, primaryData: any) => [
			{
				label: 'Confirm',
				action: 'CREATE_RULE',
				params: { type: 'categorization' },
			},
			{
				label: 'Override',
				action: 'CREATE_RULE',
				params: { type: 'categorization', override: true },
			},
		],

		composeResponse: (primaryData, extraContext, actions) => ({
			message: `I suggest categorizing this as ${
				primaryData.suggestedCategory
			} (${Math.round(primaryData.confidence * 100)}% confident)`,
			details: extraContext,
			actions,
			sources: [{ kind: 'localML' }],
			cost: { model: 'mini', estTokens: 70 },
		}),
	},
};

// Intent detection function
export function detectIntent(userQuestion: string): IntentType | null {
	const question = userQuestion.toLowerCase();

	if (
		question.includes('balance') ||
		question.includes('how much') ||
		question.includes('available')
	) {
		return 'GET_BALANCE';
	}

	if (
		question.includes('budget') &&
		(question.includes('status') ||
			question.includes('how') ||
			question.includes('used'))
	) {
		return 'GET_BUDGET_STATUS';
	}

	if (
		question.includes('subscription') ||
		question.includes('recurring') ||
		question.includes('monthly')
	) {
		return 'LIST_SUBSCRIPTIONS';
	}

	if (
		question.includes('forecast') ||
		question.includes('predict') ||
		question.includes('next month') ||
		question.includes('spending')
	) {
		return 'FORECAST_SPEND';
	}

	if (
		question.includes('categorize') ||
		question.includes('category') ||
		question.includes('what is this')
	) {
		return 'CATEGORIZE_TX';
	}

	return null;
}

// Main function to generate consistent response based on intent
export function generateIntentResponse(
	intent: IntentType,
	context: FinancialContext
): ChatResponse {
	const pattern = intentPatterns[intent];
	if (!pattern) {
		throw new Error(`Unknown intent: ${intent}`);
	}

	const primaryData = pattern.primaryData(context);
	const extraContext = pattern.extraContext(context, primaryData);
	const actions = pattern.actions(context, primaryData);

	return pattern.composeResponse(primaryData, extraContext, actions);
}

// Example usage and testing
export const exampleUsage = {
	GET_BALANCE: 'How much do I have available?',
	GET_BUDGET_STATUS: "What's my budget status?",
	LIST_SUBSCRIPTIONS: 'Show my subscriptions',
	FORECAST_SPEND: 'What will I spend next month?',
	CATEGORIZE_TX: 'What category is this transaction?',
};

// Test function for development
export function testIntentMapper() {
	const mockContext: FinancialContext = {
		budgets: [
			{
				name: 'Food',
				amount: 500,
				spent: 300,
				remaining: 200,
				utilization: 60,
			},
			{
				name: 'Transport',
				amount: 200,
				spent: 150,
				remaining: 50,
				utilization: 75,
			},
		],
		goals: [{ name: 'Vacation', target: 2000, current: 800, percent: 40 }],
		transactions: [
			{ amount: 25, category: 'Food', date: new Date(), type: 'expense' },
		],
		profile: { monthlyIncome: 5000 },
	};

	console.log('Testing intent mapper...');

	Object.values(intentPatterns).forEach((pattern, index) => {
		const intent = Object.keys(intentPatterns)[index] as IntentType;
		try {
			const response = generateIntentResponse(intent, mockContext);
			console.log(`${intent}:`, response.message);
		} catch (error) {
			console.error(`Error with ${intent}:`, error);
		}
	});
}
