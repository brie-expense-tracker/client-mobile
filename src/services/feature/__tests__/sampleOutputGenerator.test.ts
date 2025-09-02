// sampleOutputGenerator.test.ts - Tests for sample output generation

import {
	SAMPLE_QUERIES,
	generateSampleResponse,
	getAllSampleQueries,
	getSampleQueryByIntent,
	formatResponseForDisplay,
} from '../sampleOutputGenerator';

describe('SampleOutputGenerator', () => {
	describe('SAMPLE_QUERIES', () => {
		it('should have the correct number of sample queries', () => {
			expect(SAMPLE_QUERIES).toHaveLength(3);
		});

		it('should have budget status query', () => {
			const budgetQuery = SAMPLE_QUERIES.find((q) =>
				q.userQuery.includes('budgets')
			);
			expect(budgetQuery).toBeDefined();
			expect(budgetQuery?.expectedResponse.cost?.model).toBe('mini');
			expect(budgetQuery?.expectedResponse.cost?.estTokens).toBe(90);
		});

		it('should have spending optimization query', () => {
			const optimizationQuery = SAMPLE_QUERIES.find((q) =>
				q.userQuery.includes('strategy')
			);
			expect(optimizationQuery).toBeDefined();
			expect(optimizationQuery?.expectedResponse.cost?.model).toBe('pro');
			expect(optimizationQuery?.expectedResponse.cost?.estTokens).toBe(600);
		});

		it('should have fallback query', () => {
			const fallbackQuery = SAMPLE_QUERIES.find((q) =>
				q.userQuery.includes('balance')
			);
			expect(fallbackQuery).toBeDefined();
			expect(fallbackQuery?.expectedResponse.cost?.estTokens).toBe(0);
			expect(fallbackQuery?.expectedResponse.sources?.[0]?.kind).toBe('cache');
		});
	});

	describe('generateSampleResponse', () => {
		it('should return budget status response for budget query', () => {
			const response = generateSampleResponse('budgets');
			expect(response).toBeDefined();
			expect(response?.message).toContain('69% of August');
			expect(response?.message).toContain('Food at $420/$500');
		});

		it('should return optimization response for strategy query', () => {
			const response = generateSampleResponse('strategy');
			expect(response).toBeDefined();
			expect(response?.message).toContain('free up $85–$120/mo');
			expect(response?.message).toContain('Paramount+');
		});

		it('should return fallback response for balance query', () => {
			const response = generateSampleResponse('balance');
			expect(response).toBeDefined();
			expect(response?.message).toContain("can't run a full analysis");
			expect(response?.message).toContain('Food $420');
		});

		it('should return null for unknown query', () => {
			const response = generateSampleResponse('unknown query');
			expect(response).toBeNull();
		});

		it('should handle partial matches', () => {
			const response = generateSampleResponse('how am i');
			expect(response).toBeDefined();
			expect(response?.userQuery).toContain('budgets');
		});
	});

	describe('getAllSampleQueries', () => {
		it('should return all sample queries', () => {
			const queries = getAllSampleQueries();
			expect(queries).toHaveLength(3);
			expect(queries.map((q) => q.userQuery)).toEqual([
				'How am I doing with budgets?',
				'Optimize my spending strategy',
				"What's my current balance?",
			]);
		});
	});

	describe('getSampleQueryByIntent', () => {
		it('should return budget status for GET_BUDGET_STATUS intent', () => {
			const query = getSampleQueryByIntent('GET_BUDGET_STATUS');
			expect(query).toBeDefined();
			expect(query?.userQuery).toBe('How am I doing with budgets?');
		});

		it('should return optimization for OPTIMIZE_SPENDING intent', () => {
			const query = getSampleQueryByIntent('OPTIMIZE_SPENDING');
			expect(query).toBeDefined();
			expect(query?.userQuery).toBe('Optimize my spending strategy');
		});

		it('should return fallback for GET_BALANCE intent', () => {
			const query = getSampleQueryByIntent('GET_BALANCE');
			expect(query).toBeDefined();
			expect(query?.userQuery).toBe("What's my current balance?");
		});

		it('should return null for unknown intent', () => {
			const query = getSampleQueryByIntent('UNKNOWN_INTENT');
			expect(query).toBeNull();
		});
	});

	describe('formatResponseForDisplay', () => {
		it('should format budget status response correctly', () => {
			const budgetQuery = SAMPLE_QUERIES.find((q) =>
				q.userQuery.includes('budgets')
			);
			const formatted = formatResponseForDisplay(budgetQuery!.expectedResponse);

			expect(formatted).toContain("💬 You've used 69% of August's budget");
			expect(formatted).toContain('🔍 Insights:');
			expect(formatted).toContain('• 69% budget utilization');
			expect(formatted).toContain('• Top pressure: Food');
			expect(formatted).toContain('🧠 Analysis: vendor match + amount pattern');
			expect(formatted).toContain('🎯 Actions:');
			expect(formatted).toContain('• Adjust Food limit');
			expect(formatted).toContain('• See by category');
			expect(formatted).toContain('📊 Sources: db');
			expect(formatted).toContain('💰 Model: MINI (90 tokens)');
		});

		it('should format optimization response correctly', () => {
			const optimizationQuery = SAMPLE_QUERIES.find((q) =>
				q.userQuery.includes('strategy')
			);
			const formatted = formatResponseForDisplay(
				optimizationQuery!.expectedResponse
			);

			expect(formatted).toContain('💬 You could free up $85–$120/mo');
			expect(formatted).toContain('🔍 Insights:');
			expect(formatted).toContain('• Potential savings: $85-$120/month');
			expect(formatted).toContain('• Low-utility subscription identified');
			expect(formatted).toContain(
				'🧠 Analysis: usage pattern + payment frequency'
			);
			expect(formatted).toContain('🎯 Actions:');
			expect(formatted).toContain('• Create Food rule');
			expect(formatted).toContain('• Open Recurring');
			expect(formatted).toContain('📊 Sources: db + localML + gpt');
			expect(formatted).toContain('💰 Model: PRO (600 tokens)');
		});

		it('should format fallback response correctly', () => {
			const fallbackQuery = SAMPLE_QUERIES.find((q) =>
				q.userQuery.includes('balance')
			);
			const formatted = formatResponseForDisplay(
				fallbackQuery!.expectedResponse
			);

			expect(formatted).toContain("💬 I can't run a full analysis right now");
			expect(formatted).toContain('🔍 Insights:');
			expect(formatted).toContain('• Using cached data');
			expect(formatted).toContain('• Limited analysis available');
			expect(formatted).toContain(
				'🧠 Analysis: cache hit with recent financial data'
			);
			expect(formatted).toContain('🎯 Actions:');
			expect(formatted).toContain('• Adjust Food limit');
			expect(formatted).toContain('• Open Budgets');
			expect(formatted).toContain('📊 Sources: cache');
			expect(formatted).toContain('💰 Model: MINI (0 tokens)');
		});
	});

	describe('Response structure validation', () => {
		it('should have consistent response structure across all samples', () => {
			SAMPLE_QUERIES.forEach((query) => {
				const response = query.expectedResponse;

				// Required fields
				expect(response.message).toBeDefined();
				expect(response.summary).toBeDefined();
				expect(response.cards).toBeDefined();
				expect(response.actions).toBeDefined();
				expect(response.sources).toBeDefined();
				expect(response.cost).toBeDefined();
				expect(response.confidence).toBeDefined();
				expect(response.insights).toBeDefined();
				expect(response.rationale).toBeDefined();

				// Message length validation (1-2 lines max)
				const lines = response.message.split('\n');
				expect(lines.length).toBeLessThanOrEqual(2);

				// Actions validation (at least one action)
				expect(response.actions.length).toBeGreaterThan(0);

				// Confidence validation (0-1 range)
				expect(response.confidence).toBeGreaterThanOrEqual(0);
				expect(response.confidence).toBeLessThanOrEqual(1);
			});
		});

		it('should have appropriate model selection based on complexity', () => {
			const budgetQuery = SAMPLE_QUERIES.find((q) =>
				q.userQuery.includes('budgets')
			);
			const optimizationQuery = SAMPLE_QUERIES.find((q) =>
				q.userQuery.includes('strategy')
			);

			expect(budgetQuery?.expectedResponse.cost?.model).toBe('mini');
			expect(optimizationQuery?.expectedResponse.cost?.model).toBe('pro');
		});

		it('should have appropriate token counts', () => {
			const budgetQuery = SAMPLE_QUERIES.find((q) =>
				q.userQuery.includes('budgets')
			);
			const optimizationQuery = SAMPLE_QUERIES.find((q) =>
				q.userQuery.includes('strategy')
			);
			const fallbackQuery = SAMPLE_QUERIES.find((q) =>
				q.userQuery.includes('balance')
			);

			expect(budgetQuery?.expectedResponse.cost?.estTokens).toBe(90);
			expect(optimizationQuery?.expectedResponse.cost?.estTokens).toBe(600);
			expect(fallbackQuery?.expectedResponse.cost?.estTokens).toBe(0);
		});
	});
});
