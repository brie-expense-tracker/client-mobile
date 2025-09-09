// Tests for Tools-Only Contract implementation

import { ToolsOnlyContractService, FactPack } from '../toolsOnlyContract';

describe('ToolsOnlyContractService', () => {
	const mockFactPack: FactPack = {
		specVersion: '1.0',
		userId: 'test-user',
		generatedAt: '2024-01-01T00:00:00Z',
		time_window: {
			start: '2024-01-01',
			end: '2024-01-31',
			tz: 'America/Los_Angeles',
			period: 'January 2024',
		},
		balances: [
			{ id: 'acc1', accountName: 'Checking', amount: 1500.0, currency: 'USD' },
		],
		budgets: [
			{
				id: 'bud1',
				category: 'Groceries',
				period: 'monthly',
				cycleStartDay: 1,
				spent: 200.0,
				limit: 500.0,
				remaining: 300.0,
				transactionsCount: 5,
				evidence: [],
			},
			{
				id: 'bud2',
				category: 'Entertainment',
				period: 'monthly',
				cycleStartDay: 1,
				spent: 150.0,
				limit: 200.0,
				remaining: 50.0,
				transactionsCount: 3,
				evidence: [],
			},
		],
		recurring: [],
		forecasts: [],
		notes: [],
		hash: 'test_hash',
		metadata: {
			generatedAt: '2024-01-01T00:00:00Z',
			hash: 'test_hash',
		},
	};

	describe('prepareToolsOnlyInput', () => {
		it('should sanitize user data and only pass intent and toolsOut', () => {
			const userQuery = 'What is my current balance?';
			const intent = 'GET_BALANCE';
			const context = {
				userId: 'real-user',
				sensitiveData: 'should-be-removed',
			};

			const result = ToolsOnlyContractService.prepareToolsOnlyInput(
				userQuery,
				intent,
				mockFactPack,
				context
			);

			expect(result.intent).toBe('GET_BALANCE');
			expect(result.toolsOut.userId).toBe('sanitized');
			expect(result.toolsOut).toHaveProperty('balances');
			expect(result.toolsOut).toHaveProperty('budgets');
			expect(result.toolsOut).toHaveProperty('time_window');
		});
	});

	describe('validateResponse', () => {
		it('should pass validation when response only contains numbers from toolsOut', () => {
			const response =
				'Your current balance is $1500.00. You have $300.00 remaining in groceries budget.';

			const result = ToolsOnlyContractService.validateResponse(
				response,
				mockFactPack
			);

			expect(result.isValid).toBe(true);
			expect(result.violations).toHaveLength(0);
		});

		it('should fail validation when response contains invented numbers', () => {
			const response =
				'Your current balance is $2000.00. You have $500.00 remaining in groceries budget.';

			const result = ToolsOnlyContractService.validateResponse(
				response,
				mockFactPack
			);

			expect(result.isValid).toBe(false);
			expect(result.violations.length).toBeGreaterThan(0);
			expect(result.violations[0]).toContain('Invented number');
		});

		it('should handle percentage validation', () => {
			const response = 'You have spent 40% of your groceries budget.';

			// Add the percentage value to valid numbers for this test
			const factPackWithPercentage = {
				...mockFactPack,
				budgets: mockFactPack.budgets.map((budget) => ({
					...budget,
					utilization: 40, // 40% utilization
				})),
			};

			const result = ToolsOnlyContractService.validateResponse(
				response,
				factPackWithPercentage
			);

			// 40% should be valid since it's in the utilization field
			expect(result.isValid).toBe(true);
		});

		it('should fail validation for invented percentages', () => {
			const response = 'You have spent 60% of your groceries budget.';

			const result = ToolsOnlyContractService.validateResponse(
				response,
				mockFactPack
			);

			// 60% of 500 is 300, but spent is 200
			expect(result.isValid).toBe(false);
		});
	});

	describe('processLLMResponse', () => {
		it('should return original response when validation passes', () => {
			const response = 'Your current balance is $1500.00.';

			const result = ToolsOnlyContractService.processLLMResponse(
				response,
				mockFactPack,
				'GET_BALANCE'
			);

			expect(result.response).toBe(response);
			expect(result.isValid).toBe(true);
			expect(result.fallbackUsed).toBe(false);
		});

		it('should return fallback response when validation fails', () => {
			const response = 'Your current balance is $2000.00.';

			const result = ToolsOnlyContractService.processLLMResponse(
				response,
				mockFactPack,
				'GET_BALANCE'
			);

			expect(result.response).not.toBe(response);
			expect(result.isValid).toBe(false);
			expect(result.fallbackUsed).toBe(true);
			expect(result.violations.length).toBeGreaterThan(0);
		});
	});

	describe('createSafeFallback', () => {
		it('should create appropriate fallback for GET_BALANCE intent', () => {
			const violations = ['Invented number: 2000'];

			const result = ToolsOnlyContractService.createSafeFallback(
				'GET_BALANCE',
				mockFactPack,
				violations
			);

			expect(result.isValid).toBe(false);
			expect(result.fallbackUsed).toBe(true);
			expect(result.response).toContain('balance');
			expect(result.response).toContain('$1500.00');
		});

		it('should create appropriate fallback for GET_BUDGET_STATUS intent', () => {
			const violations = ['Invented number: 1000'];

			const result = ToolsOnlyContractService.createSafeFallback(
				'GET_BUDGET_STATUS',
				mockFactPack,
				violations
			);

			expect(result.isValid).toBe(false);
			expect(result.fallbackUsed).toBe(true);
			expect(result.response).toContain('budget');
		});
	});
});
