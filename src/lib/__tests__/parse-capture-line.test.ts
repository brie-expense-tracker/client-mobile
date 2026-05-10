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

	it('parses tips as income for service workers', () => {
		expect(parseCaptureLine('tip 45')).toEqual({
			description: 'tip',
			type: 'income',
			amount: 45,
		});
		expect(parseCaptureLine('tips 12.50')).toEqual({
			description: 'tips',
			type: 'income',
			amount: 12.5,
		});
		expect(parseCaptureLine('Tips 20')).toMatchObject({
			type: 'income',
			amount: 20,
		});
		expect(parseCaptureLine('TIPS 20')).toMatchObject({
			type: 'income',
			amount: 20,
		});
	});

	it('does not treat stipend as tip income', () => {
		const r = parseCaptureLine('stipend 500');
		expect(r).toEqual({
			description: 'stipend',
			type: 'expense',
			amount: -500,
		});
	});

	it('returns null without amount', () => {
		expect(parseCaptureLine('just text')).toBeNull();
	});
});
