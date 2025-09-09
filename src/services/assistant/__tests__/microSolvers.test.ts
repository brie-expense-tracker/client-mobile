// Tests for micro-solvers functionality
import {
	emergencyFundMonthly,
	hysaAdvisor,
	hysaInterestEstimator,
	microSolve,
	isSimpleQuestion,
} from '../microSolvers';

describe('Micro-solvers', () => {
	describe('emergencyFundMonthly', () => {
		test('calculates monthly contribution with context', () => {
			const ctx: any = {
				recurringExpenses: [{ isEssential: true, amount: 2500 }],
				goals: [{ name: 'Emergency Fund', currentAmount: 1500 }],
			};
			const result = emergencyFundMonthly(
				'How much should I put monthly into my emergency fund in 6 months?',
				ctx
			);

			expect(result).toBeTruthy();
			expect(result?.answer).toMatch(/in 6 months/i);
			expect(result?.answer).toMatch(/\$\d/); // shows a number
			expect(result?.matchedPattern).toBe('EF_MONTHLY_CONTRIBUTION');
			expect(result?.actions).toHaveLength(2);
		});

		test('handles already sufficient emergency fund', () => {
			const ctx: any = {
				recurringExpenses: [{ isEssential: true, amount: 2000 }],
				goals: [{ name: 'Emergency Fund', currentAmount: 9000 }], // 4.5 months
			};
			const result = emergencyFundMonthly(
				'How much should I put monthly into my emergency fund?',
				ctx
			);

			expect(result).toBeTruthy();
			expect(result?.answer).toMatch(/already hit/i);
			expect(result?.answer).toMatch(/don't need to add more/i);
		});

		test('returns null for non-emergency fund questions', () => {
			const result = emergencyFundMonthly(
				'How much should I save for vacation?',
				{}
			);
			expect(result).toBeNull();
		});

		test('uses default values when context is missing', () => {
			const result = emergencyFundMonthly(
				'How much should I put monthly into my emergency fund?',
				{}
			);

			expect(result).toBeTruthy();
			expect(result?.answer).toMatch(/\$9,000/); // 3 months * 3000 default
		});
	});

	describe('hysaAdvisor', () => {
		test('provides HYSA criteria for suggestion requests', () => {
			const result = hysaAdvisor(
				'Do you have any high yield savings accounts you suggest?'
			);

			expect(result).toBeTruthy();
			expect(result?.answer).toMatch(/FDIC|NCUA/i);
			expect(result?.answer).toMatch(/APY/i);
			expect(result?.matchedPattern).toBe('HYSA_CRITERIA');
			expect(result?.actions).toHaveLength(2);
		});

		test('handles various HYSA question formats', () => {
			const questions = [
				'What high-yield savings accounts do you recommend?',
				'Which HYSA should I choose?',
				'Any suggestions for high yield accounts?',
			];

			questions.forEach((question) => {
				const result = hysaAdvisor(question);
				expect(result).toBeTruthy();
				expect(result?.matchedPattern).toBe('HYSA_CRITERIA');
			});
		});

		test('returns null for non-HYSA questions', () => {
			const result = hysaAdvisor('How do I invest in stocks?');
			expect(result).toBeNull();
		});
	});

	describe('hysaInterestEstimator', () => {
		test('calculates interest for given amount', () => {
			const result = hysaInterestEstimator(
				'If I put $3000 in a HYSA, how much interest?'
			);

			expect(result).toBeTruthy();
			expect(result?.answer).toMatch(/\$3,000/);
			expect(result?.answer).toMatch(/Monthly interest/);
			expect(result?.answer).toMatch(/Yearly interest/);
			expect(result?.answer).toMatch(/4\.5% - 5\.0%/);
			expect(result?.matchedPattern).toBe('HYSA_INTEREST_ESTIMATOR');
			expect(result?.actions).toHaveLength(1);
		});

		test('handles various amount formats', () => {
			const questions = [
				'If I deposit $5,000 in a high-yield savings account, how much interest?',
				'If I save 10000 in a HYSA, how much interest?',
				'If I put $1,500 in a high yield savings, how much interest?',
			];

			questions.forEach((question) => {
				const result = hysaInterestEstimator(question);
				expect(result).toBeTruthy();
				expect(result?.matchedPattern).toBe('HYSA_INTEREST_ESTIMATOR');
			});
		});

		test('returns null for non-HYSA interest questions', () => {
			const result = hysaInterestEstimator('How do I invest in stocks?');
			expect(result).toBeNull();
		});

		test('returns null for invalid amounts', () => {
			const result = hysaInterestEstimator(
				'If I put $0 in a HYSA, how much interest?'
			);
			expect(result).toBeNull();
		});
	});

	describe('microSolve', () => {
		test('dispatches to emergency fund solver', () => {
			const result = microSolve(
				'How much should I put monthly into my emergency fund?',
				{ recurringExpenses: [{ isEssential: true, amount: 2000 }] }
			);

			expect(result).toBeTruthy();
			expect(result?.matchedPattern).toBe('EF_MONTHLY_CONTRIBUTION');
		});

		test('dispatches to HYSA advisor', () => {
			const result = microSolve(
				'Do you have any high yield savings accounts you suggest?'
			);

			expect(result).toBeTruthy();
			expect(result?.matchedPattern).toBe('HYSA_CRITERIA');
		});

		test('dispatches to HYSA interest estimator', () => {
			const result = microSolve('If I put $5000 in a HYSA, how much interest?');

			expect(result).toBeTruthy();
			expect(result?.matchedPattern).toBe('HYSA_INTEREST_ESTIMATOR');
		});

		test('returns null for unsupported questions', () => {
			const result = microSolve('What is the weather like?');
			expect(result).toBeNull();
		});
	});

	describe('isSimpleQuestion', () => {
		test('identifies simple question patterns', () => {
			const simpleQuestions = [
				"What's the 50/30/20 rule?",
				'How do I mark a bill paid?',
				'How much should I save?',
				"When's my next payday?",
				'If I save 200 a month...',
				'Explain compound interest',
				'What does APR mean?',
				'Where should I invest my money?',
			];

			simpleQuestions.forEach((question) => {
				expect(isSimpleQuestion(question)).toBe(true);
			});
		});

		test('identifies app navigation questions', () => {
			const navQuestions = [
				'mark bill paid',
				'create budget',
				'add goal',
				'edit budget',
				'link bank',
				'categorize transaction',
			];

			navQuestions.forEach((question) => {
				expect(isSimpleQuestion(question)).toBe(true);
			});
		});

		test('identifies investing questions', () => {
			const investingQuestions = [
				'How do I invest?',
				'What are stocks?',
				'Tell me about ETFs',
				'index funds explained',
			];

			investingQuestions.forEach((question) => {
				expect(isSimpleQuestion(question)).toBe(true);
			});
		});

		test('identifies monthly contribution questions', () => {
			const monthlyQuestions = [
				'How much should I put monthly into my emergency fund?',
				'How much to save per month for vacation?',
				'How much should I contribute monthly to retirement?',
			];

			monthlyQuestions.forEach((question) => {
				expect(isSimpleQuestion(question)).toBe(true);
			});
		});

		test('identifies HYSA questions', () => {
			const hysaQuestions = [
				'What is a high-yield savings account?',
				'Tell me about HYSA',
				'high yield savings explained',
			];

			hysaQuestions.forEach((question) => {
				expect(isSimpleQuestion(question)).toBe(true);
			});
		});

		test('returns false for complex non-financial questions', () => {
			const complexQuestions = [
				'Tell me about quantum physics',
				'How does photosynthesis work?',
				'Describe the process of cellular respiration',
			];

			complexQuestions.forEach((question) => {
				expect(isSimpleQuestion(question)).toBe(false);
			});
		});

		test('returns true for general questions that could be financial', () => {
			const generalQuestions = [
				'What is the weather like today?',
				'How do I cook pasta?',
				'What are the best restaurants in New York?',
			];

			generalQuestions.forEach((question) => {
				expect(isSimpleQuestion(question)).toBe(true);
			});
		});

		test('handles detected intent parameter', () => {
			expect(isSimpleQuestion('What is investing?', 'GENERAL_QA')).toBe(true);
			// The function is designed to be permissive, so even with COMPLEX_ANALYSIS intent,
			// it will return true if the question matches simple patterns
			expect(isSimpleQuestion('What is investing?', 'COMPLEX_ANALYSIS')).toBe(
				true
			);
		});
	});
});
