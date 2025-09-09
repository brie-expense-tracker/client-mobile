// Test suite for usefulness scoring
import { scoreUsefulness } from '../usefulness';

describe('usefulness', () => {
	test('penalizes filler & rewards directness', () => {
		const low = scoreUsefulness(
			{
				message: 'I can help with that! Please add income.',
				actions: [] as any,
				sources: [],
			},
			'what is apr'
		);
		const high = scoreUsefulness(
			{
				message: 'APR is the annual rate you pay on loans.',
				actions: [] as any,
				sources: [],
			},
			'what is apr'
		);
		expect(high).toBeGreaterThan(low);
	});

	test('rewards concrete numbers', () => {
		const withNumbers = scoreUsefulness(
			{
				message: 'You should save $500 per month.',
				actions: [] as any,
				sources: [],
			},
			'how much to save'
		);
		const withoutNumbers = scoreUsefulness(
			{
				message: 'You should save some money.',
				actions: [] as any,
				sources: [],
			},
			'how much to save'
		);
		expect(withNumbers).toBeGreaterThan(withoutNumbers);
	});

	test('rewards actionable responses', () => {
		const withActions = scoreUsefulness(
			{
				message: 'Create a budget.',
				actions: [
					{ label: 'Create Budget', action: 'OPEN_BUDGET_FORM' },
				] as any,
				sources: [],
			},
			'how to budget'
		);
		const withoutActions = scoreUsefulness(
			{
				message: 'Create a budget.',
				actions: [] as any,
				sources: [],
			},
			'how to budget'
		);
		expect(withActions).toBeGreaterThan(withoutActions);
	});

	test('penalizes placeholder sources', () => {
		const withPlaceholder = scoreUsefulness(
			{
				message: 'Here is some info.',
				actions: [] as any,
				sources: [{ kind: 'cache' }],
			},
			'what is budget'
		);
		const withRealSource = scoreUsefulness(
			{
				message: 'Here is some info.',
				actions: [] as any,
				sources: [{ kind: 'db' }],
			},
			'what is budget'
		);
		expect(withRealSource).toBeGreaterThan(withPlaceholder);
	});
});
