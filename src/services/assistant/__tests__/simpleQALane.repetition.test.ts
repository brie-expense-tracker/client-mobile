// Tests for SimpleQALane repetition guard
import { SimpleQALane } from '../simpleQALane';
import type { ChatContext } from '../../../services/feature/chatController';
import * as microSolvers from '../microSolvers';

describe('SimpleQALane Repetition Guard', () => {
	let simpleQALane: SimpleQALane;

	beforeEach(() => {
		simpleQALane = new SimpleQALane();
	});

	describe('shouldAvoidRepeat', () => {
		test('detects frustrated user responses', () => {
			const frustratedResponses = [
				'I already have an emergency fund',
				'You told me that already',
				'Again with the same advice',
				'I have that covered',
				'I already know this',
			];

			// Set up a previous pattern to test against
			// @ts-ignore - accessing private property for testing
			simpleQALane.lastPatternKey = 'some_pattern';
			// @ts-ignore - accessing private property for testing
			simpleQALane.lastPatternTimestamp = Date.now();

			frustratedResponses.forEach((response) => {
				// @ts-ignore - accessing private method for testing
				const result = simpleQALane.shouldAvoidRepeat(response, 'some_pattern');
				expect(result).toBe(true);
			});
		});

		test('allows normal questions even with same pattern', () => {
			const normalQuestions = [
				'How do I create a budget?',
				'What is compound interest?',
				'Tell me about emergency funds',
			];

			normalQuestions.forEach((question) => {
				// @ts-ignore - accessing private method for testing
				const result = simpleQALane.shouldAvoidRepeat(question, 'some_pattern');
				expect(result).toBe(false);
			});
		});

		test('requires both frustration and matching pattern', () => {
			// @ts-ignore - accessing private method for testing
			const result1 = simpleQALane.shouldAvoidRepeat(
				'I already have that',
				'different_pattern'
			);
			expect(result1).toBe(false);

			// @ts-ignore - accessing private method for testing
			const result2 = simpleQALane.shouldAvoidRepeat(
				'Normal question',
				'same_pattern'
			);
			expect(result2).toBe(false);
		});
	});

	describe('pattern tracking', () => {
		test('tracks last pattern key after successful response', async () => {
			const mockContext: ChatContext = {} as any;

			// Mock the micro-solver to return a result
			jest.spyOn(microSolvers, 'microSolve').mockReturnValue({
				answer: 'Test answer',
				actions: [],
				confidence: 0.9,
				matchedPattern: 'TEST_PATTERN',
			});

			await simpleQALane.tryAnswer('What is compound interest?', mockContext);

			// @ts-ignore - accessing private property for testing
			expect(simpleQALane.lastPatternKey).toBe('TEST_PATTERN');

			// Restore original function
			jest.restoreAllMocks();
		});
	});
});
