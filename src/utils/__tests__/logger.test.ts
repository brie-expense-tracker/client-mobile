/**
 * Logger: only test what protects you in production — secrets must not hit console verbatim.
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { logger } from '../logger';

describe('logger', () => {
	const calls: unknown[][] = [];
	beforeEach(() => {
		calls.length = 0;
		jest.spyOn(console, 'info').mockImplementation((...args: unknown[]) => {
			calls.push(args);
		});
		jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
			calls.push(args);
		});
		jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
			calls.push(args);
		});
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('scrubs api_key, token, and password patterns before logging', () => {
		logger.info('api_key=secret1 token=secret2 password=secret3');
		const msg = String(calls[0]?.[0] ?? '');
		expect(msg).toContain('api_key=***');
		expect(msg).toContain('token=***');
		expect(msg).toContain('password=***');
		expect(msg).not.toContain('secret1');
		expect(msg).not.toContain('secret2');
		expect(msg).not.toContain('secret3');
	});
});
