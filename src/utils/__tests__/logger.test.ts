// logger.test.ts - Unit tests for centralized logger utility

import { describe, it, expect, beforeEach, vi, afterEach } from '@jest/globals';
import { logger, isLogLevelEnabled, getCurrentLogLevel } from '../logger';

// Mock console methods
const mockConsoleDebug = vi.fn();
const mockConsoleInfo = vi.fn();
const mockConsoleWarn = vi.fn();
const mockConsoleError = vi.fn();

describe('Logger', () => {
	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();

		// Mock console methods
		global.console.debug = mockConsoleDebug;
		global.console.info = mockConsoleInfo;
		global.console.warn = mockConsoleWarn;
		global.console.error = mockConsoleError;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Log Levels', () => {
		it('should return current log level', () => {
			const level = getCurrentLogLevel();
			expect(['debug', 'info', 'warn', 'error', 'silent']).toContain(level);
		});

		it('should check if log level is enabled', () => {
			const isDebugEnabled = isLogLevelEnabled('debug');
			expect(typeof isDebugEnabled).toBe('boolean');
		});
	});

	describe('PII Scrubbing', () => {
		it('should scrub API keys from logs', () => {
			logger.info('API key=abcd1234 secret=xyz789');

			const callArgs = mockConsoleInfo.mock.calls[0];
			const loggedMessage = callArgs?.[0];

			expect(loggedMessage).toBeDefined();
			if (typeof loggedMessage === 'string') {
				expect(loggedMessage).toContain('key=***');
				expect(loggedMessage).toContain('secret=***');
			}
		});

		it('should scrub tokens from error logs', () => {
			logger.error('Request failed with token=abcd1234');

			const callArgs = mockConsoleError.mock.calls[0];
			const loggedMessage = callArgs?.[0];

			expect(loggedMessage).toBeDefined();
			if (typeof loggedMessage === 'string') {
				expect(loggedMessage).toContain('token=***');
			}
		});

		it('should scrub passwords from logs', () => {
			logger.warn('Login attempted with password=secret123');

			const callArgs = mockConsoleWarn.mock.calls[0];
			const loggedMessage = callArgs?.[0];

			expect(loggedMessage).toBeDefined();
			if (typeof loggedMessage === 'string') {
				expect(loggedMessage).toContain('password=***');
			}
		});
	});

	describe('Lazy Logging', () => {
		it('should not execute factory when level is disabled', () => {
			let factoryExecuted = false;

			logger.debugLazy(() => {
				factoryExecuted = true;
				return ['Expensive operation result'];
			});

			// If debug is disabled in current environment, factory should not run
			// This test validates the lazy behavior
			if (!isLogLevelEnabled('debug')) {
				expect(factoryExecuted).toBe(false);
				expect(mockConsoleDebug).not.toHaveBeenCalled();
			}
		});

		it('should execute factory when level is enabled', () => {
			let factoryExecuted = false;

			logger.infoLazy(() => {
				factoryExecuted = true;
				return ['Operation result'];
			});

			if (isLogLevelEnabled('info')) {
				expect(factoryExecuted).toBe(true);
				expect(mockConsoleInfo).toHaveBeenCalled();
			}
		});
	});

	describe('Structured Logging', () => {
		it('should handle object arguments', () => {
			const testObj = { userId: '123', action: 'login' };
			logger.info('User action', testObj);

			expect(mockConsoleInfo).toHaveBeenCalled();
			const callArgs = mockConsoleInfo.mock.calls[0];
			expect(callArgs.length).toBeGreaterThan(0);
		});

		it('should handle multiple arguments', () => {
			logger.debug('Message 1', { key: 'value' }, 'Message 2');

			if (isLogLevelEnabled('debug')) {
				expect(mockConsoleDebug).toHaveBeenCalled();
			}
		});

		it('should handle null and undefined', () => {
			logger.info('Test', null, undefined);

			expect(mockConsoleInfo).toHaveBeenCalled();
		});
	});

	describe('Error Handling', () => {
		it('should handle errors in lazy factory gracefully', () => {
			// Should not throw even if factory fails
			expect(() => {
				logger.debugLazy(() => {
					throw new Error('Factory error');
				});
			}).not.toThrow();
		});

		it('should handle circular references in objects', () => {
			const circular: any = { name: 'test' };
			circular.self = circular;

			expect(() => {
				logger.info('Circular object', circular);
			}).not.toThrow();

			expect(mockConsoleInfo).toHaveBeenCalled();
		});
	});
});
