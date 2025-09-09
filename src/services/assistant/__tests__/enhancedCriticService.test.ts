import { EnhancedCriticService } from '../enhancedCriticService';
import { FactPack } from '../factPack';

// Mock FactPack for testing
const mockFactPack: FactPack = {
	time_window: {
		start: '2025-01-01T00:00:00Z',
		end: '2025-01-31T23:59:59Z',
		tz: 'America/Los_Angeles',
		period: 'Jan 1-31, 2025',
	},
	balances: [],
	budgets: [
		{
			id: '1',
			name: 'Groceries',
			period: '2025-01',
			spent: 300,
			limit: 500,
			remaining: 200,
			utilization: 60,
			status: 'under',
			topCategories: [],
		},
		{
			id: '2',
			name: 'Entertainment',
			period: '2025-01',
			spent: 150,
			limit: 200,
			remaining: 50,
			utilization: 75,
			status: 'under',
			topCategories: [],
		},
	],
	goals: [
		{
			id: '1',
			name: 'Vacation',
			targetAmount: 2000,
			currentAmount: 800,
			progress: 40,
			remaining: 1200,
			deadline: '2025-06-01T00:00:00Z',
			status: 'on_track',
		},
	],
	recurring: [],
	recentTransactions: [],
	spendingPatterns: {
		totalSpent: 450,
		averageDaily: 15,
		topCategories: [],
		trend: 'stable',
		comparison: {
			previousPeriod: 'Dec 1-31, 2024',
			change: 5.2,
			isImprovement: true,
		},
	},
	userProfile: {
		monthlyIncome: 5000,
		financialGoal: 'Build emergency fund',
		riskProfile: 'moderate',
		preferences: {
			notifications: true,
			insights: true,
			autoCategorization: false,
		},
	},
	metadata: {
		generatedAt: new Date().toISOString(),
		dataVersion: '1.0.0',
		hash: 'test_hash',
		source: 'local',
		freshness: 0,
	},
};

describe('EnhancedCriticService', () => {
	let criticService: EnhancedCriticService;

	beforeEach(() => {
		criticService = new EnhancedCriticService(mockFactPack);
	});

	describe('validateResponse', () => {
		it('should pass validation for valid response', async () => {
			const message =
				'Your grocery budget has $200 remaining out of $500 total.';
			const query = 'How much is left in my grocery budget?';
			const context = { budgets: mockFactPack.budgets };

			const result = await criticService.validateResponse(
				message,
				query,
				context
			);

			expect(result.isValid).toBe(true);
			expect(result.ruleValidation.passed).toBe(true);
			expect(result.escalationTriggered).toBe(false);
		});

		it('should fail validation for negative amounts', async () => {
			const message = 'You have -$50 remaining in your budget.';
			const query = 'What is my budget status?';
			const context = { budgets: mockFactPack.budgets };

			const result = await criticService.validateResponse(
				message,
				query,
				context
			);

			expect(result.isValid).toBe(false);
			expect(result.ruleValidation.passed).toBe(false);
			expect(result.ruleValidation.guardFailed).toBe(
				'numeric_negative_amounts'
			);
			expect(result.escalationTriggered).toBe(true);
		});

		it('should fail validation for sum mismatch', async () => {
			const message = 'Your total budget is $1000.';
			const query = 'What is my total budget?';
			const context = { budgets: mockFactPack.budgets };

			const result = await criticService.validateResponse(
				message,
				query,
				context
			);

			expect(result.isValid).toBe(false);
			expect(result.ruleValidation.passed).toBe(false);
			expect(result.ruleValidation.guardFailed).toBe('numeric_sum_mismatch');
			expect(result.escalationTriggered).toBe(true);
		});

		it('should fail validation for forbidden claims', async () => {
			const message = 'This investment is guaranteed to return 100% profit.';
			const query = 'What should I invest in?';
			const context = { budgets: mockFactPack.budgets };

			const result = await criticService.validateResponse(
				message,
				query,
				context
			);

			expect(result.isValid).toBe(false);
			expect(result.ruleValidation.passed).toBe(false);
			expect(result.ruleValidation.guardFailed).toBe(
				'claim_forbidden_phrasing'
			);
			expect(result.escalationTriggered).toBe(true);
		});

		it('should escalate for high-stakes tasks', async () => {
			const message = 'You should rebuild your 6-month savings plan.';
			const query = 'Help me rebuild my 6-month savings plan';
			const context = { budgets: mockFactPack.budgets };

			const result = await criticService.validateResponse(
				message,
				query,
				context
			);

			expect(result.escalationTriggered).toBe(true);
			expect(result.escalationReason).toBe('High-stakes task detected');
		});

		it('should escalate for strategic planning requests', async () => {
			const message = 'Here is your investment strategy.';
			const query = 'Give me an investment strategy';
			const context = { budgets: mockFactPack.budgets };

			const result = await criticService.validateResponse(
				message,
				query,
				context
			);

			expect(result.escalationTriggered).toBe(true);
			expect(result.escalationReason).toBe('User asks strategic planning');
		});

		it('should detect unresolved ambiguity', async () => {
			const message =
				'Maybe you should save more, or perhaps spend less. It depends on your situation.';
			const query = 'What should I do with my money?';
			const context = { budgets: mockFactPack.budgets };

			const result = await criticService.validateResponse(
				message,
				query,
				context
			);

			expect(result.isValid).toBe(false);
			expect(result.escalationTriggered).toBe(true);
			expect(result.escalationReason).toBe('Critic flags unresolved ambiguity');
		});

		it('should detect potential hallucination', async () => {
			const message =
				'According to your data, your average spending is $2,500 per month.';
			const query = 'What is my average spending?';
			const context = { budgets: mockFactPack.budgets };

			const result = await criticService.validateResponse(
				message,
				query,
				context
			);

			expect(result.isValid).toBe(false);
			expect(result.escalationTriggered).toBe(true);
			expect(result.escalationReason).toBe('Hallucination guard tripped');
		});
	});

	describe('numeric guardrails', () => {
		it('should validate amounts are non-negative', async () => {
			const message = 'You spent $50 on groceries and $25 on gas.';
			const query = 'What did I spend?';
			const context = { budgets: mockFactPack.budgets };

			const result = await criticService.validateResponse(
				message,
				query,
				context
			);

			expect(result.numericGuardrails.amountsNonNegative).toBe(true);
		});

		it('should validate budget limits are respected', async () => {
			const message = 'You can spend up to $200 on groceries.';
			const query = 'How much can I spend?';
			const context = { budgets: mockFactPack.budgets };

			const result = await criticService.validateResponse(
				message,
				query,
				context
			);

			expect(result.numericGuardrails.budgetLimitsRespected).toBe(true);
		});
	});

	describe('claim type validation', () => {
		it('should detect high-risk forbidden claims', async () => {
			const message =
				'Guaranteed returns! Risk-free investment! Surefire profits!';
			const query = 'Investment advice';
			const context = { budgets: mockFactPack.budgets };

			const result = await criticService.validateResponse(
				message,
				query,
				context
			);

			expect(result.claimTypes.hasForbiddenPhrasing).toBe(true);
			expect(result.claimTypes.riskLevel).toBe('high');
			expect(result.claimTypes.forbiddenClaims.length).toBeGreaterThan(2);
		});

		it('should detect medium-risk forbidden claims', async () => {
			const message = 'This investment guarantees returns.';
			const query = 'Investment advice';
			const context = { budgets: mockFactPack.budgets };

			const result = await criticService.validateResponse(
				message,
				query,
				context
			);

			expect(result.claimTypes.hasForbiddenPhrasing).toBe(true);
			expect(result.claimTypes.riskLevel).toBe('medium');
			expect(result.claimTypes.forbiddenClaims.length).toBe(1);
		});
	});

	describe('escalation logic', () => {
		it('should escalate for critical numeric issues', async () => {
			const message = 'Your budget total is $1000 but you only have $700.';
			const query = 'Budget status';
			const context = { budgets: mockFactPack.budgets };

			const result = await criticService.validateResponse(
				message,
				query,
				context
			);

			expect(result.escalationTriggered).toBe(true);
			expect(result.escalationReason).toContain('Rule validation failed');
		});

		it('should not escalate for minor issues', async () => {
			const message = 'You have $200 remaining in groceries.';
			const query = 'Budget status';
			const context = { budgets: mockFactPack.budgets };

			const result = await criticService.validateResponse(
				message,
				query,
				context
			);

			expect(result.escalationTriggered).toBe(false);
		});
	});
});
