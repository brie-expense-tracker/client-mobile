// analytics/goldenSet.ts - Golden set test runner for CI validation
// Tests ~200 real user questions against expected outcomes

export interface GoldenTestCase {
	name: string;
	intent: string;
	query: string;
	factpackFixture: string;
	expected: {
		path: 'return' | 'clarify' | 'escalate';
		mustInclude?: string[];
		mustUseFactIds?: string[];
		forbiddenPhrases?: string[];
		maxResponseTime?: number; // ms
		maxTokens?: number;
	};
}

export interface TestResult {
	testCase: GoldenTestCase;
	passed: boolean;
	actualPath?: string;
	actualResponse?: string;
	actualFactIds?: string[];
	actualResponseTime?: number;
	actualTokens?: number;
	errors: string[];
	warnings: string[];
}

export class GoldenSetRunner {
	private testCases: GoldenTestCase[] = [];
	private factPackFixtures: Map<string, any> = new Map();

	constructor() {
		this.loadTestCases();
		this.loadFactPackFixtures();
	}

	/**
	 * Load test cases from golden set
	 */
	private loadTestCases(): void {
		// In production, this would load from a JSON file
		// For now, we'll define some example test cases
		this.testCases = [
			{
				name: 'Groceries status straightforward',
				intent: 'GET_BUDGET_STATUS',
				query: "How's my groceries budget?",
				factpackFixture: 'fp_aug_simple.json',
				expected: {
					path: 'return',
					mustInclude: ['Aug', 'PDT', '$212.17', '$400.00'],
					mustUseFactIds: ['bud_groceries_2025-08'],
					forbiddenPhrases: ['guarantee', 'risk-free'],
					maxResponseTime: 5000,
					maxTokens: 200,
				},
			},
			{
				name: 'Ambiguous category needs clarify',
				intent: 'GET_BUDGET_STATUS',
				query: "How's food?",
				factpackFixture: 'fp_aug_simple.json',
				expected: {
					path: 'clarify',
					maxResponseTime: 3000,
					maxTokens: 100,
				},
			},
			{
				name: 'Complex optimization needs escalate',
				intent: 'OPTIMIZE_SPENDING',
				query: 'How can I optimize my budget to save more?',
				factpackFixture: 'fp_aug_simple.json',
				expected: {
					path: 'escalate',
					maxResponseTime: 8000,
					maxTokens: 400,
				},
			},
		];
	}

	/**
	 * Load fact pack fixtures
	 */
	private loadFactPackFixtures(): void {
		// In production, this would load from JSON files
		// For now, we'll create a sample fact pack
		this.factPackFixtures.set('fp_aug_simple.json', {
			time_window: {
				start: '2025-08-01',
				end: '2025-08-31',
				tz: 'America/Los_Angeles',
				period: 'Aug 1-31, PDT',
			},
			budgets: [
				{
					id: 'bud_groceries_2025-08',
					category: 'Groceries',
					spent: 212.17,
					limit: 400.0,
					remaining: 187.83,
					utilization: 53.04,
				},
			],
			goals: [],
			balances: [],
			recurring: [],
			recentTransactions: [],
			spendingPatterns: {
				totalSpent: 212.17,
				averageDaily: 6.84,
				topCategories: ['Groceries'],
				trend: 'stable',
			},
			userProfile: {
				monthlyIncome: 5000,
				financialGoal: 'save',
				riskProfile: 'moderate',
			},
			metadata: {
				generatedAt: '2025-08-15T10:00:00Z',
				hash: 'abc123',
				source: 'local',
			},
		});
	}

	/**
	 * Run all golden set tests
	 */
	async runAllTests(): Promise<TestResult[]> {
		const results: TestResult[] = [];

		for (const testCase of this.testCases) {
			try {
				const result = await this.runTest(testCase);
				results.push(result);
			} catch (error) {
				results.push({
					testCase,
					passed: false,
					errors: [`Test execution failed: ${error}`],
					warnings: [],
				});
			}
		}

		return results;
	}

	/**
	 * Run a single test case
	 */
	async runTest(testCase: GoldenTestCase): Promise<TestResult> {
		const startTime = Date.now();
		const result: TestResult = {
			testCase,
			passed: false,
			errors: [],
			warnings: [],
		};

		try {
			// Get fact pack for this test
			const factPack = this.factPackFixtures.get(testCase.factpackFixture);
			if (!factPack) {
				result.errors.push(
					`Fact pack fixture not found: ${testCase.factpackFixture}`
				);
				return result;
			}

			// Simulate AI response (in production, this would call your actual AI service)
			const aiResponse = await this.simulateAIResponse(testCase, factPack);

			// Calculate response time
			result.actualResponseTime = Date.now() - startTime;

			// Validate response path
			result.actualPath = aiResponse.path;
			if (aiResponse.path !== testCase.expected.path) {
				result.errors.push(
					`Expected path ${testCase.expected.path}, got ${aiResponse.path}`
				);
			}

			// Validate response content if path is 'return'
			if (aiResponse.path === 'return') {
				this.validateReturnResponse(aiResponse, testCase, result);
			}

			// Validate response time
			if (
				testCase.expected.maxResponseTime &&
				result.actualResponseTime > testCase.expected.maxResponseTime
			) {
				result.errors.push(
					`Response time ${result.actualResponseTime}ms exceeds limit ${testCase.expected.maxResponseTime}ms`
				);
			}

			// Validate token usage
			if (
				testCase.expected.maxTokens &&
				aiResponse.tokens > testCase.expected.maxTokens
			) {
				result.errors.push(
					`Token usage ${aiResponse.tokens} exceeds limit ${testCase.expected.maxTokens}`
				);
			}

			// Test passed if no errors
			result.passed = result.errors.length === 0;
		} catch (error) {
			result.errors.push(`Test execution error: ${error}`);
		}

		return result;
	}

	/**
	 * Validate return response content
	 */
	private validateReturnResponse(
		aiResponse: any,
		testCase: GoldenTestCase,
		result: TestResult
	): void {
		const responseText =
			aiResponse.response || aiResponse.message || JSON.stringify(aiResponse);
		result.actualResponse = responseText;

		// Check required phrases
		if (testCase.expected.mustInclude) {
			for (const phrase of testCase.expected.mustInclude) {
				if (!responseText.includes(phrase)) {
					result.errors.push(`Response must include: "${phrase}"`);
				}
			}
		}

		// Check forbidden phrases
		if (testCase.expected.forbiddenPhrases) {
			for (const phrase of testCase.expected.forbiddenPhrases) {
				if (responseText.toLowerCase().includes(phrase.toLowerCase())) {
					result.errors.push(`Response must not include: "${phrase}"`);
				}
			}
		}

		// Check fact IDs
		if (testCase.expected.mustUseFactIds) {
			const usedFactIds =
				aiResponse.used_fact_ids || aiResponse.card?.evidence?.factIds || [];
			result.actualFactIds = usedFactIds;

			for (const factId of testCase.expected.mustUseFactIds) {
				if (!usedFactIds.includes(factId)) {
					result.errors.push(`Response must use fact ID: "${factId}"`);
				}
			}
		}
	}

	/**
	 * Simulate AI response (replace with actual AI service call)
	 */
	private async simulateAIResponse(
		testCase: GoldenTestCase,
		factPack: any
	): Promise<any> {
		// Simulate processing delay
		await new Promise((resolve) =>
			setTimeout(resolve, Math.random() * 1000 + 500)
		);

		// Simulate different response paths based on test case
		switch (testCase.expected.path) {
			case 'return':
				return {
					path: 'return',
					response: `Based on your ${factPack.budgets[0]?.category} budget for ${factPack.time_window.period}, you have spent $${factPack.budgets[0]?.spent} out of $${factPack.budgets[0]?.limit}.`,
					used_fact_ids: [factPack.budgets[0]?.id],
					tokens: 150,
				};

			case 'clarify':
				return {
					path: 'clarify',
					response: 'Could you clarify which category you mean by "food"?',
					tokens: 80,
				};

			case 'escalate':
				return {
					path: 'escalate',
					response:
						'This requires deeper analysis. Let me escalate to a more capable model.',
					tokens: 350,
				};

			default:
				return {
					path: 'return',
					response: 'Default response',
					tokens: 100,
				};
		}
	}

	/**
	 * Get test summary
	 */
	getTestSummary(results: TestResult[]): {
		total: number;
		passed: number;
		failed: number;
		passRate: number;
		averageResponseTime: number;
		averageTokens: number;
	} {
		const total = results.length;
		const passed = results.filter((r) => r.passed).length;
		const failed = total - passed;

		const responseTimes = results
			.map((r) => r.actualResponseTime)
			.filter((t) => t !== undefined) as number[];

		const averageResponseTime =
			responseTimes.length > 0
				? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
				: 0;

		return {
			total,
			passed,
			failed,
			passRate: total > 0 ? (passed / total) * 100 : 0,
			averageResponseTime,
			averageTokens: 0, // Would calculate from actual token usage
		};
	}

	/**
	 * Export test results to JSON
	 */
	exportResults(results: TestResult[]): string {
		const summary = this.getTestSummary(results);
		return JSON.stringify(
			{
				summary,
				results,
				timestamp: new Date().toISOString(),
				version: '1.0.0',
			},
			null,
			2
		);
	}
}

// Export for use in tests
export const goldenSetRunner = new GoldenSetRunner();
