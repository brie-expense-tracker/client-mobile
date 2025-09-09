// sampleOutputGenerator.ts - Generates sample outputs for testing and demonstration
// Shows what users actually see in the chat interface

import { ChatResponse } from '../../services/assistant/responseSchema';

export interface SampleQuery {
	userQuery: string;
	expectedResponse: ChatResponse;
	description: string;
}

export const SAMPLE_QUERIES: SampleQuery[] = [
	{
		userQuery: 'How am I doing with budgets?',
		expectedResponse: {
			message:
				"You've used 69% of August's budget. Biggest pressure is Food at $420/$500.",
			summary:
				"You've used 69% of August's budget. Biggest pressure is Food at $420/$500.",
			details: 'Budget breakdown and recommendations for August 2025',
			cards: [
				{
					type: 'budget',
					data: {
						month: 'August',
						totalBudget: 2000,
						totalSpent: 1380,
						utilization: 0.69,
						topCategories: [
							{ name: 'Food', spent: 420, limit: 500, pressure: 0.84 },
							{ name: 'Transport', spent: 300, limit: 400, pressure: 0.75 },
							{ name: 'Shopping', spent: 280, limit: 350, pressure: 0.8 },
						],
					},
				},
			],
			actions: [
				{
					label: 'Adjust Food limit',
					action: 'ADJUST_LIMIT',
					params: { category: 'Food' },
				},
				{ label: 'See by category', action: 'OPEN_BUDGETS' },
			],
			sources: [{ kind: 'db' }],
			cost: { model: 'mini', estTokens: 90 },
			confidence: 0.95,
			insights: ['69% budget utilization', 'Top pressure: Food'],
			rationale: 'vendor match + amount pattern indicates overspending risk',
		},
		description:
			'Budget status query with ring visualization and top 3 categories',
	},

	{
		userQuery: 'Optimize my spending strategy',
		expectedResponse: {
			message:
				"You could free up $85–$120/mo by (1) trimming Food to last month's median, (2) canceling Paramount+ which you haven't used in 45 days.",
			summary:
				"You could free up $85–$120/mo by (1) trimming Food to last month's median, (2) canceling Paramount+ which you haven't used in 45 days.",
			details:
				'Detailed spending optimization analysis with actionable recommendations',
			cards: [
				{
					type: 'subscriptions',
					data: {
						lowUtility: [
							{ name: 'Paramount+', cost: 9.99, unusedDays: 45, usage: 0.1 },
							{ name: 'Netflix Basic', cost: 8.99, unusedDays: 12, usage: 0.3 },
						],
						recommendations: [
							{
								category: 'Food',
								current: 420,
								median: 380,
								potentialSavings: 40,
							},
							{ subscription: 'Paramount+', potentialSavings: 9.99 },
						],
					},
				},
			],
			actions: [
				{
					label: 'Create Food rule',
					action: 'CREATE_RULE',
					params: { category: 'Food' },
				},
				{ label: 'Open Recurring', action: 'VIEW_RECURRING' },
			],
			sources: [
				{ kind: 'db' },
				{ kind: 'localML' },
				{ kind: 'gpt', note: 'pro_model_capped_600_tokens' },
			],
			cost: { model: 'pro', estTokens: 600 },
			confidence: 0.88,
			insights: [
				'Potential savings: $85-$120/month',
				'Low-utility subscription identified',
				'Category-specific optimization recommendations',
			],
			rationale: 'usage pattern + payment frequency analysis',
		},
		description:
			'Spending optimization with pro model analysis and subscription insights',
	},

	{
		userQuery: "What's my current balance?",
		expectedResponse: {
			message:
				"I can't run a full analysis right now, but here's your recent spend: Food $420, Transport $160, Shopping $130. Want to tune Food this month?",
			summary:
				"I can't run a full analysis right now, but here's your recent spend: Food $420, Transport $160, Shopping $130. Want to tune Food this month?",
			details:
				'Limited analysis due to system constraints. Showing cached data only.',
			cards: [
				{
					type: 'budget',
					data: {
						recentSpend: {
							food: 420,
							transport: 160,
							shopping: 130,
						},
						lastUpdated: new Date().toISOString(),
					},
				},
			],
			actions: [
				{
					label: 'Adjust Food limit',
					action: 'ADJUST_LIMIT',
					params: { category: 'Food' },
				},
				{ label: 'Open Budgets', action: 'OPEN_BUDGETS' },
			],
			sources: [{ kind: 'cache', note: 'zero_tokens_fallback' }],
			cost: { model: 'mini', estTokens: 0 },
			confidence: 0.75,
			insights: ['Using cached data', 'Limited analysis available'],
			rationale: 'cache hit with recent financial data',
		},
		description:
			'Fallback response using cached data when systems are unavailable',
	},
];

export function generateSampleResponse(query: string): ChatResponse | null {
	const sample = SAMPLE_QUERIES.find(
		(s) =>
			s.userQuery.toLowerCase().includes(query.toLowerCase()) ||
			query.toLowerCase().includes(s.userQuery.toLowerCase())
	);

	return sample ? sample.expectedResponse : null;
}

export function getAllSampleQueries(): SampleQuery[] {
	return SAMPLE_QUERIES;
}

export function getSampleQueryByIntent(intent: string): SampleQuery | null {
	const intentMap: { [key: string]: string } = {
		GET_BUDGET_STATUS: 'How am I doing with budgets?',
		OPTIMIZE_SPENDING: 'Optimize my spending strategy',
		GET_BALANCE: "What's my current balance?",
	};

	const query = intentMap[intent];
	if (!query) return null;

	return SAMPLE_QUERIES.find((s) => s.userQuery === query) || null;
}

// Helper function to format response for display
export function formatResponseForDisplay(response: ChatResponse): string {
	let display = `💬 ${response.message}\n\n`;

	if (response.insights && response.insights.length > 0) {
		display += `🔍 Insights:\n`;
		response.insights.forEach((insight) => {
			display += `  • ${insight}\n`;
		});
		display += '\n';
	}

	if (response.rationale) {
		display += `🧠 Analysis: ${response.rationale}\n\n`;
	}

	if (response.actions && response.actions.length > 0) {
		display += `🎯 Actions:\n`;
		response.actions.forEach((action) => {
			display += `  • ${action.label}\n`;
		});
		display += '\n';
	}

	if (response.sources) {
		display += `📊 Sources: ${response.sources
			.map((s) => s.kind)
			.join(' + ')}\n`;
		if (response.cost) {
			display += `💰 Model: ${response.cost.model.toUpperCase()} (${
				response.cost.estTokens
			} tokens)\n`;
		}
	}

	return display;
}
