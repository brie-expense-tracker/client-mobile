// Test cases for OVERVIEW intent functionality

import { enhancedIntentMapper } from '../enhancedIntentMapper';
import { evaluateAnswerability } from '../answerability';
import {
	buildFinancialOverview,
	renderOverviewResponse,
	renderNoDataOnboarding,
} from '../playbooks/overviewPlaybook';
import { FinancialContext } from '../helpfulFallbacks';

describe('OVERVIEW Intent', () => {
	describe('Intent Detection', () => {
		test('should detect "tell me about my finances" as OVERVIEW intent', async () => {
			const result = await enhancedIntentMapper.detectMultiLabelIntents(
				'tell me about my finances'
			);
			expect(result).toContainEqual(
				expect.objectContaining({
					intent: 'OVERVIEW',
					calibratedP: expect.any(Number),
				})
			);
		});

		test('should detect "how am i doing" as OVERVIEW intent', async () => {
			const result = await enhancedIntentMapper.detectMultiLabelIntents(
				'how am i doing'
			);
			expect(result).toContainEqual(
				expect.objectContaining({
					intent: 'OVERVIEW',
					calibratedP: expect.any(Number),
				})
			);
		});

		test('should detect "give me an overview" as OVERVIEW intent', async () => {
			const result = await enhancedIntentMapper.detectMultiLabelIntents(
				'give me an overview'
			);
			expect(result).toContainEqual(
				expect.objectContaining({
					intent: 'OVERVIEW',
					calibratedP: expect.any(Number),
				})
			);
		});

		test('should detect "financial health check" as OVERVIEW intent', async () => {
			const result = await enhancedIntentMapper.detectMultiLabelIntents(
				'financial health check'
			);
			expect(result).toContainEqual(
				expect.objectContaining({
					intent: 'OVERVIEW',
					calibratedP: expect.any(Number),
				})
			);
		});
	});

	describe('Answerability', () => {
		test('should return high answerability when user has financial data', () => {
			const context: FinancialContext = {
				budgets: [
					{
						name: 'Groceries',
						amount: 500,
						spent: 300,
						remaining: 200,
						utilization: 60,
					},
				],
				goals: [
					{ name: 'Emergency Fund', target: 1000, current: 500, percent: 50 },
				],
				transactions: [
					{
						amount: -50,
						category: 'groceries',
						date: new Date(),
						type: 'expense',
					},
					{
						amount: 2000,
						category: 'income',
						date: new Date(),
						type: 'income',
					},
				],
			};

			const result = evaluateAnswerability('OVERVIEW', context);
			expect(result.level).toBe('high');
			expect(result.missing).toHaveLength(0);
		});

		test('should return low answerability when user has no financial data', () => {
			const context: FinancialContext = {
				budgets: [],
				goals: [],
				transactions: [],
			};

			const result = evaluateAnswerability('OVERVIEW', context);
			expect(result.level).toBe('low');
			expect(result.missing).toContain('budget data');
			expect(result.missing).toContain('savings goals');
			expect(result.missing).toContain('transaction history');
		});

		test('should return high answerability with only budgets', () => {
			const context: FinancialContext = {
				budgets: [
					{
						name: 'Groceries',
						amount: 500,
						spent: 300,
						remaining: 200,
						utilization: 60,
					},
				],
				goals: [],
				transactions: [],
			};

			const result = evaluateAnswerability('OVERVIEW', context);
			expect(result.level).toBe('high');
		});
	});

	describe('Overview Playbook', () => {
		test('should build overview with financial data', () => {
			const context: FinancialContext = {
				budgets: [
					{
						name: 'Groceries',
						amount: 500,
						spent: 300,
						remaining: 200,
						utilization: 60,
					},
					{
						name: 'Entertainment',
						amount: 200,
						spent: 250,
						remaining: -50,
						utilization: 125,
					},
				],
				goals: [
					{ name: 'Emergency Fund', target: 1000, current: 500, percent: 50 },
					{ name: 'Vacation', target: 2000, current: 800, percent: 40 },
				],
				transactions: [
					{
						amount: -50,
						category: 'groceries',
						date: new Date(),
						type: 'expense',
					},
					{
						amount: -25,
						category: 'entertainment',
						date: new Date(),
						type: 'expense',
					},
					{
						amount: 2000,
						category: 'income',
						date: new Date(),
						type: 'income',
					},
				],
			};

			const overview = buildFinancialOverview(context, 'last_30d');

			expect(overview.cashflow.income).toBe(2000);
			expect(overview.cashflow.spending).toBe(75);
			expect(overview.cashflow.net).toBe(1925);
			expect(overview.budgets).toHaveLength(2);
			expect(overview.goals).toHaveLength(2);
			expect(overview.categories).toHaveLength(2);
		});

		test('should render overview response with data', () => {
			const context: FinancialContext = {
				budgets: [
					{
						name: 'Groceries',
						amount: 500,
						spent: 300,
						remaining: 200,
						utilization: 60,
					},
				],
				goals: [
					{ name: 'Emergency Fund', target: 1000, current: 500, percent: 50 },
				],
				transactions: [
					{
						amount: -50,
						category: 'groceries',
						date: new Date(),
						type: 'expense',
					},
				],
			};

			const overview = buildFinancialOverview(context, 'last_30d');
			const response = renderOverviewResponse(overview, context);

			expect(response.message).toContain('Financial Overview');
			expect(response.message).toContain('Cashflow:');
			expect(response.actions).toHaveLength(2);
			expect(response.cards).toHaveLength(2);
			expect(response.sources).toContainEqual({ kind: 'grounded' });
		});

		test('should render onboarding response with no data', () => {
			const response = renderNoDataOnboarding();

			expect(response.message).toContain("can't provide a financial overview");
			expect(response.actions).toHaveLength(3);
			expect(response.actions?.[0]?.label).toBe('Create First Budget');
			expect(response.sources).toContainEqual({ kind: 'onboarding' });
		});
	});

	describe('Integration', () => {
		test('should handle complete flow from intent to response', async () => {
			const query = 'tell me about my finances';
			const context: FinancialContext = {
				budgets: [
					{
						name: 'Groceries',
						amount: 500,
						spent: 300,
						remaining: 200,
						utilization: 60,
					},
				],
				goals: [
					{ name: 'Emergency Fund', target: 1000, current: 500, percent: 50 },
				],
				transactions: [
					{
						amount: -50,
						category: 'groceries',
						date: new Date(),
						type: 'expense',
					},
				],
			};

			// Step 1: Intent detection
			const intents = await enhancedIntentMapper.detectMultiLabelIntents(query);
			const overviewIntent = intents.find((i) => i.intent === 'OVERVIEW');
			expect(overviewIntent).toBeDefined();

			// Step 2: Answerability check
			const answerability = evaluateAnswerability('OVERVIEW', context);
			expect(answerability.level).toBe('high');

			// Step 3: Generate overview
			const overview = buildFinancialOverview(context, 'last_30d');
			expect(overview.cashflow).toBeDefined();

			// Step 4: Render response
			const response = renderOverviewResponse(overview, context);
			expect(response.message).toContain('Financial Overview');
		});
	});
});
