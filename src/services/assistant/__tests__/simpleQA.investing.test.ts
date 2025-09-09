// Regression tests for investing questions in Simple QA
import { microSolve } from '../microSolvers';
import { scoreUsefulness } from '../usefulness';

describe('SimpleQA Investing', () => {
	test('investing starter returns concrete steps', () => {
		const result = microSolve('Where should I start investing my money?');
		expect(result?.answer).toMatch(/Emergency fund/i);
		expect(result?.answer).toMatch(/index funds/i);
		expect(result?.confidence).toBe(0.9);
		expect(result?.matchedPattern).toBe('investing_starter');
	});

	test('investing starter has actionable buttons', () => {
		const result = microSolve('How do I start investing?');
		expect(result?.actions).toHaveLength(2);
		expect(result?.actions?.[0]?.action).toBe('OPEN_GOAL_FORM');
		expect(result?.actions?.[1]?.action).toBe('OPEN_GOAL_WIZARD');
	});

	test('filler simpleQA does not return early', () => {
		const resp = {
			message: 'I can help with that! Let me provide some guidance.',
			actions: [],
			sources: [],
		} as any;
		const s = scoreUsefulness(resp, 'Where should I start investing my money?');
		expect(s).toBeLessThan(3);
	});

	test('investing starter gets high usefulness score', () => {
		const result = microSolve('Where should I start investing my money?');
		const resp = {
			message: result?.answer || '',
			actions: result?.actions || [],
			sources: [],
		} as any;
		const s = scoreUsefulness(resp, 'Where should I start investing my money?');
		expect(s).toBeGreaterThanOrEqual(3);
	});

	test('Spanish investing question works', () => {
		const result = microSolve('¿Dónde debería empezar a invertir mi dinero?');
		expect(result?.answer).toMatch(/colchón de efectivo/i);
		expect(result?.answer).toMatch(/fondos índice/i);
	});

	test('investing keywords trigger micro-solver', () => {
		const keywords = ['invest', 'investing', 'stocks', 'etf', 'index fund'];
		keywords.forEach((keyword) => {
			const result = microSolve(`How do I start ${keyword}?`);
			expect(result?.matchedPattern).toBe('investing_starter');
		});
	});
});
