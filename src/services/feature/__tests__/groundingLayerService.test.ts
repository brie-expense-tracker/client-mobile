// Test file for GroundingLayerService
import { GroundingLayerService } from '../groundingLayerService';
import { FactPackCalculator } from '../../../services/assistant/factPack';

describe('GroundingLayerService', () => {
	let service: GroundingLayerService;

	beforeEach(() => {
		service = new GroundingLayerService();
	});

	describe('generateFactPack', () => {
		it('should generate valid FactPack from app data', () => {
			const mockBudgets = [
				{ id: '1', name: 'Groceries', amount: 400, spent: 200 },
				{ id: '2', name: 'Transport', amount: 200, spent: 150 },
			];

			const mockGoals = [
				{
					id: '1',
					name: 'Vacation',
					target: 2000,
					current: 800,
					deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
				},
			];

			const mockTransactions = [
				{
					id: '1',
					amount: 50,
					category: 'Groceries',
					date: new Date(),
					type: 'expense',
				},
			];

			const mockProfile = { monthlyIncome: 5000, financialGoal: 'Save money' };

			const factPack = service.generateFactPack(
				mockBudgets,
				mockGoals,
				mockTransactions,
				mockProfile
			);

			expect(factPack).toBeDefined();
			expect(factPack.time_window).toBeDefined();
			expect(factPack.budgets).toHaveLength(2);
			expect(factPack.goals).toHaveLength(1);
			expect(factPack.metadata.hash).toBeDefined();
		});

		it('should calculate budget utilization correctly', () => {
			const mockBudgets = [{ id: '1', name: 'Test', amount: 100, spent: 75 }];

			const factPack = service.generateFactPack(mockBudgets, [], [], {});

			expect(factPack.budgets[0].utilization).toBe(75);
			expect(factPack.budgets[0].remaining).toBe(25);
			expect(factPack.budgets[0].status).toBe('under');
		});
	});

	describe('generateGroundedResponse', () => {
		it('should generate response for budget questions', async () => {
			const factPack = service.generateFactPack(
				[{ id: '1', name: 'Test', amount: 100, spent: 50 }],
				[],
				[],
				{}
			);

			const response = await service.generateGroundedResponse(
				'How much budget do I have left?',
				factPack,
				'GET_BUDGET_STATUS'
			);

			expect(response.response).toContain('$50.00 remaining');
			expect(response.confidence).toBeGreaterThan(0.8);
			expect(response.sources).toContain('factpack');
		});

		it('should cache responses for identical queries', async () => {
			const factPack = service.generateFactPack([], [], [], {});

			const query = 'What is my budget status?';
			const intent = 'GET_BUDGET_STATUS';

			const response1 = await service.generateGroundedResponse(
				query,
				factPack,
				intent
			);
			const response2 = await service.generateGroundedResponse(
				query,
				factPack,
				intent
			);

			expect(response1.response).toBe(response2.response);
			expect(response2.sources).toContain('cache');
		});
	});

	describe('FactPackCalculator', () => {
		it('should calculate utilization correctly', () => {
			expect(FactPackCalculator.calculateUtilization(75, 100)).toBe(75);
			expect(FactPackCalculator.calculateUtilization(100, 100)).toBe(100);
			expect(FactPackCalculator.calculateUtilization(0, 100)).toBe(0);
		});

		it('should determine budget status correctly', () => {
			expect(FactPackCalculator.determineBudgetStatus(50, 100)).toBe('under');
			expect(FactPackCalculator.determineBudgetStatus(95, 100)).toBe(
				'at_limit'
			);
			expect(FactPackCalculator.determineBudgetStatus(100, 100)).toBe('over');
		});

		it('should validate FactPack data integrity', () => {
			const validFactPack = {
				time_window: {
					start: '2025-01-01',
					end: '2025-01-31',
					tz: 'UTC',
					period: 'Jan 1-31, UTC',
				},
				balances: [
					{
						accountId: '1',
						name: 'Test',
						current: 100,
						total: 100,
						spent: 0,
						type: 'checking' as const,
					},
				],
				budgets: [],
				goals: [],
				recurring: [],
				recentTransactions: [],
				spendingPatterns: {
					totalSpent: 0,
					averageDaily: 0,
					topCategories: [],
					trend: 'stable' as const,
					comparison: { previousPeriod: '', change: 0, isImprovement: false },
				},
				userProfile: {
					monthlyIncome: 0,
					financialGoal: '',
					riskProfile: 'moderate' as const,
					preferences: {
						notifications: true,
						insights: true,
						autoCategorization: true,
					},
				},
				metadata: {
					generatedAt: '',
					dataVersion: '',
					hash: '',
					source: 'local' as const,
					freshness: 0,
				},
			};

			const validation = FactPackCalculator.validateFactPack(validFactPack);
			expect(validation.isValid).toBe(true);
		});
	});
});
