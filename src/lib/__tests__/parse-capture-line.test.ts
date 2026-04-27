import { parseCaptureLine } from '../parse-capture-line';

describe('parseCaptureLine', () => {
	it('parses expense description then amount', () => {
		const r = parseCaptureLine('coffee 5.75');
		expect(r).toEqual({
			description: 'coffee',
			type: 'expense',
			amount: -5.75,
		});
	});

	it('parses income with hint', () => {
		const r = parseCaptureLine('paycheck 1200');
		expect(r).toEqual({
			description: 'paycheck',
			type: 'income',
			amount: 1200,
		});
	});

	it('returns null without amount', () => {
		expect(parseCaptureLine('just text')).toBeNull();
	});
});
