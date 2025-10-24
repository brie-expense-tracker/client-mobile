// Skill Tester - Comprehensive testing utilities for skills
// Provides automated testing, mocking, and validation

import {
	Skill,
	SkillTestCase,
	SkillExecutionResult,
	SkillValidationResult,
} from './types';
import { ChatContext } from '../../feature/chatController';
import { skillManager } from './skillManager';

export interface TestSuite {
	name: string;
	description: string;
	skills: string[];
	testCases: SkillTestCase[];
	beforeAll?: () => Promise<void>;
	afterAll?: () => Promise<void>;
	beforeEach?: (testCase: SkillTestCase) => Promise<void>;
	afterEach?: (testCase: SkillTestCase) => Promise<void>;
}

export interface TestResult {
	name: string;
	passed: boolean;
	duration: number;
	error?: string;
	details?: any;
}

export interface TestSuiteResult {
	suiteName: string;
	totalTests: number;
	passedTests: number;
	failedTests: number;
	duration: number;
	results: TestResult[];
	coverage: number;
}

export class SkillTester {
	private static instance: SkillTester;
	private testSuites: Map<string, TestSuite> = new Map();
	private mockData: Map<string, any> = new Map();

	private constructor() {}

	static getInstance(): SkillTester {
		if (!SkillTester.instance) {
			SkillTester.instance = new SkillTester();
		}
		return SkillTester.instance;
	}

	/**
	 * Register a test suite
	 */
	registerTestSuite(suite: TestSuite): void {
		this.testSuites.set(suite.name, suite);
	}

	/**
	 * Run a specific test suite
	 */
	async runTestSuite(suiteName: string): Promise<TestSuiteResult> {
		const suite = this.testSuites.get(suiteName);
		if (!suite) {
			throw new Error(`Test suite ${suiteName} not found`);
		}

		const startTime = Date.now();
		const results: TestResult[] = [];


		// Run beforeAll hook
		if (suite.beforeAll) {
			await suite.beforeAll();
		}

		// Run each test case
		for (const testCase of suite.testCases) {
			const testStartTime = Date.now();

			try {
				// Run beforeEach hook
				if (suite.beforeEach) {
					await suite.beforeEach(testCase);
				}

				// Execute the test
				const result = await this.runTestCase(testCase);
				results.push(result);

				// Run afterEach hook
				if (suite.afterEach) {
					await suite.afterEach(testCase);
				}
			} catch (error) {
				const testResult: TestResult = {
					name: testCase.name,
					passed: false,
					duration: Date.now() - testStartTime,
					error: error instanceof Error ? error.message : 'Unknown error',
				};
				results.push(testResult);
			}
		}

		// Run afterAll hook
		if (suite.afterAll) {
			await suite.afterAll();
		}

		const duration = Date.now() - startTime;
		const passedTests = results.filter((r) => r.passed).length;
		const failedTests = results.length - passedTests;

		return {
			suiteName: suite.name,
			totalTests: results.length,
			passedTests,
			failedTests,
			duration,
			results,
			coverage: this.calculateCoverage(suite.skills),
		};
	}

	/**
	 * Run all test suites
	 */
	async runAllTestSuites(): Promise<TestSuiteResult[]> {
		const results: TestSuiteResult[] = [];

		for (const suiteName of this.testSuites.keys()) {
			try {
				const result = await this.runTestSuite(suiteName);
				results.push(result);
			} catch (error) {
				console.error(
					`[SkillTester] Failed to run test suite ${suiteName}:`,
					error
				);
				results.push({
					suiteName,
					totalTests: 0,
					passedTests: 0,
					failedTests: 0,
					duration: 0,
					results: [],
					coverage: 0,
				});
			}
		}

		return results;
	}

	/**
	 * Run a single test case
	 */
	async runTestCase(testCase: SkillTestCase): Promise<TestResult> {
		const startTime = Date.now();

		try {
			// Find the skill that should handle this test case
			const matchingSkills = skillManager.findMatchingSkills(
				testCase.input.question
			);
			if (matchingSkills.length === 0) {
				throw new Error('No matching skills found for test case');
			}

			const skill = matchingSkills[0];
			const result = await skillManager.executeSkill(
				skill.id,
				testCase.input.params,
				testCase.input.context
			);

			// Evaluate the test case
			const passed = this.evaluateTestCase(testCase, result);

			return {
				name: testCase.name,
				passed,
				duration: Date.now() - startTime,
				details: {
					skillId: skill.id,
					response: result.response,
					executionTime: result.executionTimeMs,
				},
			};
		} catch (error) {
			return {
				name: testCase.name,
				passed: false,
				duration: Date.now() - startTime,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Generate test cases for a skill automatically
	 */
	generateTestCases(skillId: string, count: number = 5): SkillTestCase[] {
		const skill = skillManager.getSkill(skillId);
		if (!skill) {
			throw new Error(`Skill ${skillId} not found`);
		}

		const testCases: SkillTestCase[] = [];

		// Generate test cases based on skill slots and examples
		for (let i = 0; i < count; i++) {
			const params: any = {};

			// Generate parameters based on slot specifications
			if (skill.slots) {
				for (const [slotName, slotSpec] of Object.entries(skill.slots)) {
					if (slotSpec.required || Math.random() > 0.5) {
						params[slotName] = this.generateTestValue(slotSpec);
					}
				}
			}

			// Generate test question
			const question = this.generateTestQuestion(skill, params);

			// Create mock context
			const context = this.createMockContext();

			testCases.push({
				name: `${skillId}_test_${i + 1}`,
				description: `Generated test case for ${skillId}`,
				input: {
					question,
					params,
					context,
				},
				expected: {
					success: true,
					containsText: [skill.name.toLowerCase()],
				},
			});
		}

		return testCases;
	}

	/**
	 * Validate skill implementation
	 */
	async validateSkill(skillId: string): Promise<SkillValidationResult> {
		const skill = skillManager.getSkill(skillId);
		if (!skill) {
			return {
				valid: false,
				errors: [`Skill ${skillId} not found`],
				warnings: [],
				missingSlots: [],
				invalidSlots: [],
			};
		}

		const errors: string[] = [];
		const warnings: string[] = [];

		// Test basic functionality
		try {
			const testContext = this.createMockContext();
			const testParams = this.generateTestParams(skill);

			await skillManager.executeSkill(skillId, testParams, testContext);
		} catch (error) {
			errors.push(
				`Skill execution failed: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`
			);
		}

		// Test slot validation
		if (skill.slots) {
			for (const [slotName, slotSpec] of Object.entries(skill.slots)) {
				if (slotSpec.required) {
					// Test with missing required slot
					const invalidParams = { ...this.generateTestParams(skill) };
					delete invalidParams[slotName];

					const validation = skillManager.validateSkillParameters(
						skillId,
						invalidParams
					);
					if (validation.valid) {
						errors.push(`Required slot '${slotName}' validation failed`);
					}
				}

				// Test with invalid slot type
				if (slotSpec.type === 'number') {
					const invalidParams = { ...this.generateTestParams(skill) };
					invalidParams[slotName] = 'not_a_number';

					const validation = skillManager.validateSkillParameters(
						skillId,
						invalidParams
					);
					if (validation.valid) {
						errors.push(`Slot '${slotName}' type validation failed`);
					}
				}
			}
		}

		// Test canHandle function
		if (skill.canHandle) {
			const testContext = this.createMockContext();
			const canHandle = skill.canHandle(testContext);

			if (
				typeof canHandle !== 'object' ||
				typeof canHandle.canAnswer !== 'boolean'
			) {
				errors.push(
					'canHandle function must return an object with canAnswer boolean'
				);
			}
		}

		// Test matches function
		if (skill.matches) {
			const testQuestions = [
				'What is my budget status?',
				'Show me my spending by category',
				'How are my goals progressing?',
				'Random unrelated question',
			];

			const matchResults = testQuestions.map((q) => skill.matches!(q));
			if (!matchResults.some((r) => r === true)) {
				warnings.push('matches function never returns true for test questions');
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
			missingSlots: [],
			invalidSlots: [],
		};
	}

	/**
	 * Set mock data for testing
	 */
	setMockData(key: string, data: any): void {
		this.mockData.set(key, data);
	}

	/**
	 * Get mock data
	 */
	getMockData(key: string): any {
		return this.mockData.get(key);
	}

	/**
	 * Clear all mock data
	 */
	clearMockData(): void {
		this.mockData.clear();
	}

	// Private helper methods

	private evaluateTestCase(
		testCase: SkillTestCase,
		result: SkillExecutionResult
	): boolean {
		if (!testCase.expected.success && result.response) {
			return false;
		}

		if (testCase.expected.containsText) {
			for (const text of testCase.expected.containsText) {
				if (
					!result.response.message.toLowerCase().includes(text.toLowerCase())
				) {
					return false;
				}
			}
		}

		if (testCase.expected.excludesText) {
			for (const text of testCase.expected.excludesText) {
				if (
					result.response.message.toLowerCase().includes(text.toLowerCase())
				) {
					return false;
				}
			}
		}

		return true;
	}

	private calculateCoverage(skillIds: string[]): number {
		const totalSkills = skillManager.getAllSkills().length;
		const testedSkills = skillIds.length;
		return totalSkills > 0 ? (testedSkills / totalSkills) * 100 : 0;
	}

	private generateTestValue(slotSpec: any): any {
		switch (slotSpec.type) {
			case 'string':
				return slotSpec.examples?.[0] || 'test_value';
			case 'number':
				return slotSpec.examples?.[0] ? parseFloat(slotSpec.examples[0]) : 100;
			case 'date':
				return new Date().toISOString();
			case 'category':
				return slotSpec.examples?.[0] || 'groceries';
			case 'merchant':
				return slotSpec.examples?.[0] || 'Test Merchant';
			case 'account':
				return slotSpec.examples?.[0] || 'checking';
			case 'goal_id':
				return slotSpec.examples?.[0] || 'test_goal';
			default:
				return 'test_value';
		}
	}

	private generateTestQuestion(skill: Skill, params: any): string {
		// Generate a test question based on skill name and parameters
		const baseQuestion = skill.name.toLowerCase();
		const paramStr =
			Object.keys(params).length > 0
				? ` with ${Object.keys(params).join(', ')}`
				: '';
		return `Show me ${baseQuestion}${paramStr}`;
	}

	private generateTestParams(skill: Skill): any {
		const params: any = {};

		if (skill.slots) {
			for (const [slotName, slotSpec] of Object.entries(skill.slots)) {
				if (slotSpec.required || Math.random() > 0.5) {
					params[slotName] = this.generateTestValue(slotSpec);
				}
			}
		}

		return params;
	}

	private createMockContext(): ChatContext {
		return {
			userProfile: this.getMockData('userProfile') || {
				monthlyIncome: 5000,
				financialGoal: 'emergency_fund',
				riskProfile: 'moderate',
			},
			budgets: this.getMockData('budgets') || [
				{ id: '1', name: 'Groceries', amount: 300, spent: 150 },
				{ id: '2', name: 'Dining', amount: 200, spent: 80 },
			],
			goals: this.getMockData('goals') || [
				{ id: '1', name: 'Emergency Fund', target: 5000, current: 2000 },
				{ id: '2', name: 'Vacation', target: 2000, current: 500 },
			],
			transactions: this.getMockData('transactions') || [
				{
					id: '1',
					amount: -50,
					description: 'Grocery Store',
					category: 'groceries',
				},
				{ id: '2', amount: -25, description: 'Restaurant', category: 'dining' },
			],
			recurringExpenses: this.getMockData('recurringExpenses') || [
				{ id: '1', name: 'Rent', amount: 1200, frequency: 'monthly' },
				{ id: '2', name: 'Insurance', amount: 150, frequency: 'monthly' },
			],
			locale: 'en-US',
		};
	}
}

// Export singleton instance
export const skillTester = SkillTester.getInstance();
