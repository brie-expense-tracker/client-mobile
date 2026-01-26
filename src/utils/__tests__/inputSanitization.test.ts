/**
 * Tests for input sanitization utilities
 */

import {
	sanitizeAmount,
	sanitizeText,
	sanitizeDescription,
	formatAmountForDisplay,
} from '../inputSanitization';

describe('inputSanitization', () => {
	describe('sanitizeAmount', () => {
		it('removes non-numeric characters except decimal point', () => {
			expect(sanitizeAmount('$50.99')).toBe('50.99');
			expect(sanitizeAmount('50,000.99')).toBe('50000.99');
			expect(sanitizeAmount('abc50.99xyz')).toBe('50.99');
		});

		it('ensures only one decimal point', () => {
			expect(sanitizeAmount('50.99.00')).toBe('50.9900');
			expect(sanitizeAmount('50..99')).toBe('50.99');
		});

		it('limits to 2 decimal places', () => {
			expect(sanitizeAmount('50.999')).toBe('50.99');
			expect(sanitizeAmount('50.123456')).toBe('50.12');
		});

		it('handles empty input', () => {
			expect(sanitizeAmount('')).toBe('');
			expect(sanitizeAmount('   ')).toBe('');
		});

		it('handles input with only decimal point', () => {
			expect(sanitizeAmount('.')).toBe('.');
			expect(sanitizeAmount('..')).toBe('.');
		});

		it('preserves valid amounts', () => {
			expect(sanitizeAmount('50.99')).toBe('50.99');
			expect(sanitizeAmount('100')).toBe('100');
			expect(sanitizeAmount('0.50')).toBe('0.50');
		});
	});

	describe('sanitizeText', () => {
		it('removes harmful characters', () => {
			// Note: sanitizeText removes < > { } [ ] \ characters
			// So <script> becomes script (brackets removed, text kept)
			// test<script>alert("xss")</script> becomes testscriptalert("xss")/script
			const result = sanitizeText('test<script>alert("xss")</script>');
			expect(result).toBe('testscriptalert("xss")/script');
			expect(result).not.toContain('<');
			expect(result).not.toContain('>');
			
			expect(sanitizeText('test{value}')).toBe('testvalue');
			expect(sanitizeText('test[array]')).toBe('testarray');
			expect(sanitizeText('test\\backslash')).toBe('testbackslash');
		});

		it('trims whitespace', () => {
			expect(sanitizeText('  test  ')).toBe('test');
			expect(sanitizeText('\n\ttest\n\t')).toBe('test');
		});

		it('limits length to maxLength', () => {
			expect(sanitizeText('a'.repeat(150), 50)).toBe('a'.repeat(50));
			expect(sanitizeText('test', 2)).toBe('te');
		});

		it('uses default maxLength of 100', () => {
			const longText = 'a'.repeat(150);
			expect(sanitizeText(longText).length).toBe(100);
		});

		it('preserves valid text', () => {
			expect(sanitizeText('Valid text 123')).toBe('Valid text 123');
			expect(sanitizeText('Test-Item_123')).toBe('Test-Item_123');
		});

		it('handles empty input', () => {
			expect(sanitizeText('')).toBe('');
			expect(sanitizeText('   ')).toBe('');
		});
	});

	describe('sanitizeDescription', () => {
		it('limits to 50 characters', () => {
			const longDescription = 'a'.repeat(100);
			expect(sanitizeDescription(longDescription).length).toBe(50);
		});

		it('removes harmful characters', () => {
			// Note: sanitizeDescription removes < > { } [ ] \ characters
			// So <script> becomes script (brackets removed, text kept)
			const result = sanitizeDescription('item<script>');
			expect(result).toBe('itemscript');
			expect(result).not.toContain('<');
			expect(result).not.toContain('>');
			
			expect(sanitizeDescription('item{value}')).toBe('itemvalue');
		});

		it('preserves valid descriptions', () => {
			expect(sanitizeDescription('New laptop')).toBe('New laptop');
			expect(sanitizeDescription('Grocery shopping')).toBe('Grocery shopping');
		});

		it('handles empty input', () => {
			expect(sanitizeDescription('')).toBe('');
		});
	});

	describe('formatAmountForDisplay', () => {
		it('formats valid amounts to 2 decimal places', () => {
			expect(formatAmountForDisplay('50')).toBe('50.00');
			expect(formatAmountForDisplay('50.9')).toBe('50.90');
			expect(formatAmountForDisplay('50.99')).toBe('50.99');
		});

		it('handles empty input', () => {
			expect(formatAmountForDisplay('')).toBe('');
			expect(formatAmountForDisplay('   ')).toBe('');
		});

		it('removes non-numeric characters', () => {
			expect(formatAmountForDisplay('$50.99')).toBe('50.99');
			expect(formatAmountForDisplay('50,000')).toBe('50000.00');
		});

		it('returns original value if cannot parse', () => {
			// When non-numeric input is provided, cleaned becomes empty
			// and function returns original value
			expect(formatAmountForDisplay('abc')).toBe('abc');
			expect(formatAmountForDisplay('...')).toBe('...');
		});

		it('handles zero', () => {
			expect(formatAmountForDisplay('0')).toBe('0.00');
		});
	});
});
