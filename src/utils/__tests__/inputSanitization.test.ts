/**
 * inputSanitization: amounts and text users type — keep one test each so behavior is locked.
 */
import {
	sanitizeAmount,
	sanitizeText,
} from '../inputSanitization';

describe('inputSanitization', () => {
	it('sanitizeAmount strips junk and keeps a sane decimal', () => {
		expect(sanitizeAmount('$50.99')).toBe('50.99');
		expect(sanitizeAmount('50.999')).toBe('50.99');
	});

	it('sanitizeText strips angle brackets and braces', () => {
		const out = sanitizeText('a<script>x</script>b');
		expect(out).not.toContain('<');
		expect(out).not.toContain('>');
	});
});
