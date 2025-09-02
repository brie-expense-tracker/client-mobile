// golden.spec.ts - Golden set tests for CI validation
// Tests ~200 real user questions against expected outcomes

import { goldenSetRunner, GoldenTestCase } from '../goldenSet';

// Load test cases from golden set
const golden: GoldenTestCase[] = require('../golden.json');

describe('Golden AI Cascade', () => {
	// Run all golden set tests
	for (const testCase of golden) {
		test(
			testCase.name,
			async () => {
				const result = await goldenSetRunner.runTest(testCase);

				// Test must pass
				expect(result.passed).toBe(true);

				// Validate response path
				expect(result.actualPath).toBe(testCase.expected.path);

				// If path is 'return', validate content
				if (testCase.expected.path === 'return') {
					const text = result.actualResponse || '';

					// Check required phrases
					if (testCase.expected.mustInclude) {
						for (const phrase of testCase.expected.mustInclude) {
							expect(text).toContain(phrase);
						}
					}

					// Check forbidden phrases
					if (testCase.expected.forbiddenPhrases) {
						for (const phrase of testCase.expected.forbiddenPhrases) {
							expect(text.toLowerCase()).not.toContain(phrase.toLowerCase());
						}
					}

					// Check fact IDs
					if (testCase.expected.mustUseFactIds) {
						const usedFactIds = result.actualFactIds || [];
						for (const factId of testCase.expected.mustUseFactIds) {
							expect(usedFactIds).toContain(factId);
						}
					}
				}

				// Validate response time
				if (testCase.expected.maxResponseTime) {
					expect(result.actualResponseTime).toBeLessThanOrEqual(
						testCase.expected.maxResponseTime
					);
				}

				// Validate token usage
				if (testCase.expected.maxTokens) {
					expect(result.actualTokens).toBeLessThanOrEqual(
						testCase.expected.maxTokens
					);
				}
			},
			15000
		); // 15 second timeout for each test
	}

	// Test summary
	test('Golden set summary', async () => {
		const results = await goldenSetRunner.runAllTests();
		const summary = goldenSetRunner.getTestSummary(results);

		// Overall pass rate should be high
		expect(summary.passRate).toBeGreaterThan(90);

		// Response times should be reasonable
		expect(summary.averageResponseTime).toBeLessThan(5000);

		console.log('Golden Set Test Summary:', summary);
	});

	// Test individual components
	describe('Golden Set Components', () => {
		test('should load test cases', () => {
			expect(golden.length).toBeGreaterThan(0);
			expect(golden[0]).toHaveProperty('name');
			expect(golden[0]).toHaveProperty('intent');
			expect(golden[0]).toHaveProperty('query');
			expect(golden[0]).toHaveProperty('expected');
		});

		test('should validate test case structure', () => {
			for (const testCase of golden) {
				expect(testCase.name).toBeTruthy();
				expect(testCase.intent).toBeTruthy();
				expect(testCase.query).toBeTruthy();
				expect(testCase.expected.path).toMatch(/^(return|clarify|escalate)$/);
			}
		});
	});
});
