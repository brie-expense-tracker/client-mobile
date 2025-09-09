// Test suite for number parsing utilities
import {
	toNumber,
	formatCurrency,
	parsePercentageCalculation,
} from '../utils/numberUtils';

describe('numberUtils', () => {
	describe('toNumber', () => {
		test('parses currency with commas', () => {
			expect(toNumber('$2,000')).toBe(2000);
			expect(toNumber('€1,500.50')).toBe(1500.5);
		});

		test('handles k and m suffixes', () => {
			expect(toNumber('5k')).toBe(5000);
			expect(toNumber('2m')).toBe(2000000);
		});

		test('normalizes dashes', () => {
			expect(toNumber('–100')).toBe(-100);
			expect(toNumber('—50')).toBe(-50);
		});

		test('returns null for invalid input', () => {
			expect(toNumber('')).toBe(null);
			expect(toNumber('abc')).toBe(null);
		});
	});

	describe('formatCurrency', () => {
		test('formats locale currency', () => {
			expect(formatCurrency(300, 'en-US', 'USD')).toMatch(/\$300(\.00)?/);
			expect(formatCurrency(1500.5, 'en-US', 'USD')).toMatch(/\$1,500(\.50)?/);
		});
	});

	describe('parsePercentageCalculation', () => {
		test('parses percentage calculations', () => {
			const result = parsePercentageCalculation("what's 15% of 2,000?");
			expect(result).toEqual({ percent: 15, amount: 2000 });
		});

		test('handles percent and pct', () => {
			expect(parsePercentageCalculation('what is 20 percent of 1000?')).toEqual(
				{ percent: 20, amount: 1000 }
			);
			expect(parsePercentageCalculation("what's 10 pct of 500?")).toEqual({
				percent: 10,
				amount: 500,
			});
		});
	});
});
