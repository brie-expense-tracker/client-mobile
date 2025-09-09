// Test suite for business day calculations
import { businessDaysBetween, formatBusinessDays } from '../utils/businessDays';

describe('businessDays', () => {
	test('calculates business days between dates', () => {
		const start = new Date('2024-01-01'); // Monday
		const end = new Date('2024-01-05'); // Friday
		expect(businessDaysBetween(start, end)).toBe(5);
	});

	test('excludes weekends', () => {
		const start = new Date('2024-01-05'); // Friday
		const end = new Date('2024-01-08'); // Monday
		expect(businessDaysBetween(start, end)).toBe(1); // Only Monday
	});

	test('handles same day', () => {
		const date = new Date('2024-01-01');
		expect(businessDaysBetween(date, date)).toBe(1);
	});

	test('handles end before start', () => {
		const start = new Date('2024-01-05');
		const end = new Date('2024-01-01');
		expect(businessDaysBetween(start, end)).toBe(0);
	});

	test('formats business days correctly', () => {
		expect(formatBusinessDays(0)).toBe('today');
		expect(formatBusinessDays(1)).toBe('1 business day');
		expect(formatBusinessDays(5)).toBe('5 business days');
	});
});
