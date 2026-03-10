/**
 * ErrorService: only what changes UX — retry vs sign-in vs give up.
 */
import { ErrorService } from '../errorService';

const DEFAULT_RETRY_CONFIG = {
	maxRetries: 3,
	baseDelay: 1000,
	maxDelay: 10000,
	backoffMultiplier: 2,
};

describe('ErrorService', () => {
	beforeEach(() => {
		ErrorService.clearErrorMetrics();
		ErrorService.updateRetryConfig(DEFAULT_RETRY_CONFIG);
	});

	it('categorizes network errors as retryable', () => {
		const r = ErrorService.categorizeError({ message: 'Network request failed' });
		expect(r.type).toBe('connectivity');
		expect(r.retryable).toBe(true);
		expect(r.action).toBe('Retry');
	});

	it('categorizes 401 as not retryable — user must sign in', () => {
		const r = ErrorService.categorizeError({ code: 401, message: 'Unauthorized' });
		expect(r.type).toBe('auth');
		expect(r.retryable).toBe(false);
		expect(r.action).toBe('Sign In');
	});

	it('withRetry succeeds after transient failure (timers faked)', async () => {
		jest.useFakeTimers();
		let n = 0;
		const op = async () => {
			n++;
			if (n < 2) throw new Error('Network error');
			return 'ok';
		};
		const p = ErrorService.withRetry(op, new Error('Network error'), 0);
		await jest.runAllTimersAsync();
		await expect(p).resolves.toBe('ok');
		expect(n).toBe(2);
		jest.useRealTimers();
	});
});
