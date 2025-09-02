// ai/test.ts - Simple test to verify the cascade system works

import { answerWithCascade } from './answer';
import { FactPack } from '../factPack';

/**
 * Test the cascade system with a simple query
 */
export async function testCascadeSystem() {
	console.log('🧪 [Test] Starting cascade system test...');

	// Create a test FactPack
	const testFactPack: FactPack = {
		time_window: {
			start: '2025-01-01T00:00:00.000Z',
			end: '2025-01-31T23:59:59.999Z',
			tz: 'America/Los_Angeles',
			period: 'Jan 1-31, PST',
		},
		balances: [
			{
				accountId: 'chk_1',
				name: 'Main Checking',
				current: 2500,
				total: 5000,
				spent: 2500,
				type: 'checking',
			},
		],
		budgets: [
			{
				id: 'bud_groceries_2025-01',
				name: 'Groceries',
				period: '2025-01',
				spent: 320,
				limit: 500,
				remaining: 180,
				utilization: 64,
				status: 'under',
				topCategories: [],
			},
			{
				id: 'bud_dining_2025-01',
				name: 'Dining',
				period: '2025-01',
				spent: 455,
				limit: 500,
				remaining: 45,
				utilization: 91,
				status: 'at_limit',
				topCategories: [],
			},
		],
		goals: [
			{
				id: 'goal_emergency_2025',
				name: 'Emergency Fund',
				targetAmount: 10000,
				currentAmount: 7500,
				progress: 75,
				remaining: 2500,
				deadline: '2025-12-31T23:59:59.999Z',
				status: 'on_track',
			},
		],
		recurring: [],
		recentTransactions: [
			{
				id: 'tx_1',
				amount: 45.5,
				category: 'Dining',
				date: '2025-01-15T12:00:00.000Z',
				type: 'expense',
				description: 'Lunch at restaurant',
			},
		],
		spendingPatterns: {
			totalSpent: 775,
			averageDaily: 25.83,
			topCategories: [
				{ name: 'Dining', total: 455, count: 8, percentage: 58.7 },
				{ name: 'Groceries', total: 320, count: 12, percentage: 41.3 },
			],
			trend: 'stable',
			comparison: {
				previousPeriod: 'Dec 2024',
				change: 5.2,
				isImprovement: false,
			},
		},
		userProfile: {
			monthlyIncome: 5000,
			financialGoal: 'Build emergency fund and save for vacation',
			riskProfile: 'moderate',
			preferences: {
				notifications: true,
				insights: true,
				autoCategorization: true,
			},
		},
	};

	try {
		// Test 1: Simple status query
		console.log('🧪 [Test] Testing simple status query...');
		const result1 = await answerWithCascade({
			userId: 'test_user',
			intent: 'GET_BUDGET_STATUS',
			userQuery: 'How am I doing with my budgets?',
			factPack: testFactPack,
		});

		console.log('✅ [Test] Simple query result:', {
			kind: result1.kind,
			decision_path: result1.analytics.decision_path,
			writer_tokens: result1.analytics.writer_tokens,
		});

		// Test 2: High-stakes query (should bypass writer)
		console.log('🧪 [Test] Testing high-stakes query...');
		const result2 = await answerWithCascade({
			userId: 'test_user',
			intent: 'FORECAST_SPEND',
			userQuery: 'Help me rebuild my 6-month savings plan',
			factPack: testFactPack,
		});

		console.log('✅ [Test] High-stakes query result:', {
			kind: result2.kind,
			decision_path: result2.analytics.decision_path,
			improver_tokens: result2.analytics.improver_tokens,
		});

		// Test 3: Query that might need clarification
		console.log('🧪 [Test] Testing ambiguous query...');
		const result3 = await answerWithCascade({
			userId: 'test_user',
			intent: 'GENERAL_QA',
			userQuery: 'What should I do about my money?',
			factPack: testFactPack,
		});

		console.log('✅ [Test] Ambiguous query result:', {
			kind: result3.kind,
			decision_path: result3.analytics.decision_path,
		});

		console.log('🎉 [Test] All cascade tests completed successfully!');
		return { success: true, results: [result1, result2, result3] };
	} catch (error) {
		console.error('❌ [Test] Cascade test failed:', error);
		return { success: false, error: error.message };
	}
}

/**
 * Test the guard validators
 */
export function testGuards() {
	console.log('🧪 [Test] Testing guard validators...');

	const { guardNumbers, guardTimeStamp, guardClaims } = require('./guards');
	const { WriterOutput } = require('./types');

	// Test numeric guard
	const testWriterOutput: WriterOutput = {
		version: '1.0',
		answer_text: 'Your grocery budget has $180 remaining from Aug 1-31, PDT.',
		used_fact_ids: ['bud_groceries_2025-08'],
		numeric_mentions: [
			{
				value: 180,
				unit: 'USD',
				kind: 'remaining',
				fact_id: 'bud_groceries_2025-08',
			},
		],
		requires_clarification: false,
		content_kind: 'status',
	};

	const testFactPack = {
		time_window: {
			start: '2025-08-01T00:00:00.000Z',
			end: '2025-08-31T23:59:59.999Z',
			tz: 'America/Los_Angeles',
			period: 'Aug 1-31, PDT',
		},
		budgets: [
			{
				id: 'bud_groceries_2025-08',
				spent: 320,
				limit: 500,
				remaining: 180,
			},
		],
	};

	try {
		const numericResult = guardNumbers(testWriterOutput, testFactPack);
		const timeResult = guardTimeStamp(testWriterOutput, testFactPack);
		const claimsResult = guardClaims(testWriterOutput);

		console.log('✅ [Test] Guard results:', {
			numeric: numericResult.ok,
			time: timeResult.ok,
			claims: claimsResult.ok,
		});

		return {
			success: true,
			guards: { numericResult, timeResult, claimsResult },
		};
	} catch (error) {
		console.error('❌ [Test] Guard test failed:', error);
		return { success: false, error: error.message };
	}
}

// Run tests if this file is executed directly
if (require.main === module) {
	console.log('🧪 [Test] Running cascade system tests...');

	testGuards()
		.then((guardResult) => {
			console.log('Guard test result:', guardResult);

			if (guardResult.success) {
				return testCascadeSystem();
			}
		})
		.then((cascadeResult) => {
			console.log('Cascade test result:', cascadeResult);
			process.exit(cascadeResult?.success ? 0 : 1);
		})
		.catch((error) => {
			console.error('Test execution failed:', error);
			process.exit(1);
		});
}
