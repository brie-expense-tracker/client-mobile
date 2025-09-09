/**
 * Tests for ErrorService
 */

import { ErrorService } from '../errorService';

describe('ErrorService', () => {
	beforeEach(() => {
		// Clear error metrics before each test
		ErrorService.clearErrorMetrics();
	});

	describe('categorizeError', () => {
		it('should categorize connectivity errors correctly', () => {
			const error = { message: 'Network request failed' };
			const result = ErrorService.categorizeError(error);

			expect(result.type).toBe('connectivity');
			expect(result.retryable).toBe(true);
			expect(result.action).toBe('Retry');
			expect(result.recoverySuggestions).toContain(
				'Check your internet connection'
			);
		});

		it('should categorize authentication errors correctly', () => {
			const error = { code: 401, message: 'Unauthorized' };
			const result = ErrorService.categorizeError(error);

			expect(result.type).toBe('auth');
			expect(result.retryable).toBe(false);
			expect(result.action).toBe('Sign In');
		});

		it('should categorize rate limit errors correctly', () => {
			const error = { code: 429, message: 'Rate limit exceeded' };
			const result = ErrorService.categorizeError(error);

			expect(result.type).toBe('rate_limit');
			expect(result.retryable).toBe(false);
			expect(result.action).toBe('Upgrade');
		});

		it('should categorize timeout errors correctly', () => {
			const error = { message: 'Request timeout' };
			const result = ErrorService.categorizeError(error);

			expect(result.type).toBe('timeout');
			expect(result.retryable).toBe(true);
			expect(result.action).toBe('Retry');
		});

		it('should categorize validation errors correctly', () => {
			const error = { code: 400, message: 'Invalid input' };
			const result = ErrorService.categorizeError(error);

			expect(result.type).toBe('validation');
			expect(result.retryable).toBe(false);
		});

		it('should categorize permission errors correctly', () => {
			const error = { code: 403, message: 'Access denied' };
			const result = ErrorService.categorizeError(error);

			expect(result.type).toBe('permission');
			expect(result.retryable).toBe(false);
			expect(result.action).toBe('Contact Support');
		});

		it('should categorize server errors correctly', () => {
			const error = { code: 500, message: 'Internal server error' };
			const result = ErrorService.categorizeError(error);

			expect(result.type).toBe('server_error');
			expect(result.retryable).toBe(true);
			expect(result.action).toBe('Retry');
		});

		it('should include retry count and max retries for retryable errors', () => {
			const error = { message: 'Network error' };
			const result = ErrorService.categorizeError(error, 2);

			expect(result.retryCount).toBe(2);
			expect(result.maxRetries).toBe(3);
		});

		it('should include timestamp and original error', () => {
			const error = { message: 'Test error' };
			const result = ErrorService.categorizeError(error);

			expect(result.timestamp).toBeInstanceOf(Date);
			expect(result.originalError).toBe(error);
		});
	});

	describe('retry logic', () => {
		it('should calculate retry delay with exponential backoff', () => {
			const delay1 = ErrorService.calculateRetryDelay(0);
			const delay2 = ErrorService.calculateRetryDelay(1);
			const delay3 = ErrorService.calculateRetryDelay(2);

			expect(delay1).toBe(1000); // baseDelay
			expect(delay2).toBe(2000); // baseDelay * 2^1
			expect(delay3).toBe(4000); // baseDelay * 2^2
		});

		it('should respect max delay limit', () => {
			const config = ErrorService.getRetryConfig();
			const delay = ErrorService.calculateRetryDelay(10); // Should be capped at maxDelay

			expect(delay).toBeLessThanOrEqual(config.maxDelay);
		});

		it('should determine if error should be retried', () => {
			const retryableError = { message: 'Network error' };
			const nonRetryableError = { code: 401, message: 'Unauthorized' };

			expect(ErrorService.shouldRetry(retryableError, 0)).toBe(true);
			expect(ErrorService.shouldRetry(retryableError, 3)).toBe(false); // Exceeds max retries
			expect(ErrorService.shouldRetry(nonRetryableError, 0)).toBe(false);
		});
	});

	describe('error metrics', () => {
		it('should track error frequency', () => {
			const error1 = { message: 'Network error' };
			const error2 = { message: 'Network error' };
			const error3 = { code: 401, message: 'Unauthorized' };

			ErrorService.categorizeError(error1);
			ErrorService.categorizeError(error2);
			ErrorService.categorizeError(error3);

			const metrics = ErrorService.getErrorMetrics();
			expect(metrics).toHaveLength(2);

			const connectivityMetrics =
				ErrorService.getErrorMetricsForType('connectivity');
			expect(connectivityMetrics?.frequency).toBe(2);

			const authMetrics = ErrorService.getErrorMetricsForType('auth');
			expect(authMetrics?.frequency).toBe(1);
		});

		it('should clear error metrics', () => {
			const error = { message: 'Test error' };
			ErrorService.categorizeError(error);

			expect(ErrorService.getErrorMetrics()).toHaveLength(1);

			ErrorService.clearErrorMetrics();
			expect(ErrorService.getErrorMetrics()).toHaveLength(0);
		});
	});

	describe('utility methods', () => {
		it('should get user-friendly message', () => {
			const error = { message: 'Network request failed' };
			const message = ErrorService.getUserFriendlyMessage(error);

			expect(message).toBe('We lost the connection. Retrying...');
		});

		it('should check if error is retryable', () => {
			const retryableError = { message: 'Network error' };
			const nonRetryableError = { code: 401, message: 'Unauthorized' };

			expect(ErrorService.isRetryable(retryableError)).toBe(true);
			expect(ErrorService.isRetryable(nonRetryableError)).toBe(false);
		});

		it('should get suggested action', () => {
			const error = { message: 'Network error' };
			const action = ErrorService.getSuggestedAction(error);

			expect(action).toBe('Retry');
		});

		it('should get recovery suggestions', () => {
			const error = { message: 'Network error' };
			const suggestions = ErrorService.getRecoverySuggestions(error);

			expect(suggestions).toContain('Check your internet connection');
			expect(suggestions).toContain(
				'Try switching between WiFi and mobile data'
			);
		});

		it('should determine error severity', () => {
			const authError = { code: 401, message: 'Unauthorized' };
			const networkError = { message: 'Network error' };
			const serverError = { code: 500, message: 'Server error' };

			expect(ErrorService.getErrorSeverity(authError)).toBe('high');
			expect(ErrorService.getErrorSeverity(networkError)).toBe('low');
			expect(ErrorService.getErrorSeverity(serverError)).toBe('medium');
		});

		it('should determine if error should be reported', () => {
			const authError = { code: 401, message: 'Unauthorized' };
			const networkError = { message: 'Network error' };

			expect(ErrorService.shouldReportError(authError)).toBe(true);
			expect(ErrorService.shouldReportError(networkError)).toBe(false);
		});
	});

	describe('retry configuration', () => {
		it('should update retry configuration', () => {
			const newConfig = { maxRetries: 5, baseDelay: 2000 };
			ErrorService.updateRetryConfig(newConfig);

			const config = ErrorService.getRetryConfig();
			expect(config.maxRetries).toBe(5);
			expect(config.baseDelay).toBe(2000);
			expect(config.maxDelay).toBe(10000); // Should remain unchanged
		});

		it('should preserve existing config when updating partial config', () => {
			const originalConfig = ErrorService.getRetryConfig();
			const newConfig = { maxRetries: 7 };
			ErrorService.updateRetryConfig(newConfig);

			const config = ErrorService.getRetryConfig();
			expect(config.maxRetries).toBe(7);
			expect(config.baseDelay).toBe(originalConfig.baseDelay);
			expect(config.maxDelay).toBe(originalConfig.maxDelay);
			expect(config.backoffMultiplier).toBe(originalConfig.backoffMultiplier);
		});
	});

	describe('withRetry', () => {
		it('should retry operation on failure', async () => {
			let attemptCount = 0;
			const operation = async () => {
				attemptCount++;
				if (attemptCount < 2) {
					throw new Error('Network error');
				}
				return 'success';
			};

			const result = await ErrorService.withRetry(
				operation,
				new Error('Network error'),
				0
			);
			expect(result).toBe('success');
			expect(attemptCount).toBe(2);
		});

		it('should not retry non-retryable errors', async () => {
			const operation = async () => {
				throw new Error('Unauthorized');
			};

			await expect(
				ErrorService.withRetry(operation, new Error('Unauthorized'), 0)
			).rejects.toThrow('Unauthorized');
		});

		it('should respect max retry attempts', async () => {
			let attemptCount = 0;
			const operation = async () => {
				attemptCount++;
				throw new Error('Network error');
			};

			await expect(
				ErrorService.withRetry(operation, new Error('Network error'), 3)
			).rejects.toThrow('Network error');
			expect(attemptCount).toBe(1); // Should not retry when at max attempts
		});

		it('should handle successful operation on first try', async () => {
			const operation = async () => {
				return 'immediate success';
			};

			const result = await ErrorService.withRetry(
				operation,
				new Error('Network error'),
				0
			);
			expect(result).toBe('immediate success');
		});
	});

	describe('error logging', () => {
		it('should log error with context', () => {
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
			const error = new Error('Test error');
			const context = { userId: '123', action: 'test' };

			ErrorService.logError(error, context);

			expect(consoleSpy).toHaveBeenCalledWith(
				'[ErrorService] Error occurred:',
				expect.objectContaining({
					type: expect.any(String),
					message: expect.any(String),
					retryable: expect.any(Boolean),
					context,
					originalError: error,
					timestamp: expect.any(Date),
				})
			);

			consoleSpy.mockRestore();
		});

		it('should log error without context', () => {
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
			const error = new Error('Test error');

			ErrorService.logError(error);

			expect(consoleSpy).toHaveBeenCalledWith(
				'[ErrorService] Error occurred:',
				expect.objectContaining({
					context: undefined,
				})
			);

			consoleSpy.mockRestore();
		});
	});

	describe('edge cases', () => {
		it('should handle null error', () => {
			const result = ErrorService.categorizeError(null);
			expect(result.type).toBe('system');
			expect(result.message).toContain('Something broke');
		});

		it('should handle undefined error', () => {
			const result = ErrorService.categorizeError(undefined);
			expect(result.type).toBe('system');
			expect(result.message).toContain('Something broke');
		});

		it('should handle error with no message', () => {
			const error = {};
			const result = ErrorService.categorizeError(error);
			expect(result.type).toBe('system');
			expect(result.message).toContain('Something broke');
		});

		it('should handle error with empty message', () => {
			const error = { message: '' };
			const result = ErrorService.categorizeError(error);
			expect(result.type).toBe('system');
			expect(result.message).toContain('Something broke');
		});

		it('should handle string error', () => {
			const error = 'String error message';
			const result = ErrorService.categorizeError(error);
			expect(result.type).toBe('system');
			expect(result.message).toContain('Something broke');
		});

		it('should handle error with numeric code', () => {
			const error = { code: 500 };
			const result = ErrorService.categorizeError(error);
			expect(result.type).toBe('server_error');
		});

		it('should handle error with string code', () => {
			const error = { code: 'NETWORK_ERROR' };
			const result = ErrorService.categorizeError(error);
			expect(result.type).toBe('connectivity');
		});

		it('should handle error with status property', () => {
			const error = { status: 401 };
			const result = ErrorService.categorizeError(error);
			expect(result.type).toBe('auth');
		});
	});

	describe('missing info errors', () => {
		it('should categorize missing info errors correctly', () => {
			const error = { message: 'Missing required information' };
			const result = ErrorService.categorizeError(error);

			expect(result.type).toBe('missing_info');
			expect(result.retryable).toBe(false);
			expect(result.recoverySuggestions).toContain(
				'Provide the missing information'
			);
		});

		it('should categorize insufficient data errors correctly', () => {
			const error = { message: 'Insufficient data provided' };
			const result = ErrorService.categorizeError(error);

			expect(result.type).toBe('missing_info');
			expect(result.retryable).toBe(false);
		});

		it('should categorize missing info errors with different message variations', () => {
			const errorVariations = [
				{ message: 'Missing required information' },
				{ message: 'Insufficient data provided' },
				{ message: 'Missing data for processing' },
				{ message: 'Insufficient information available' },
			];

			errorVariations.forEach((error) => {
				const result = ErrorService.categorizeError(error);
				expect(result.type).toBe('missing_info');
				expect(result.retryable).toBe(false);
				expect(result.recoverySuggestions).toContain(
					'Provide the missing information'
				);
			});
		});
	});

	describe('error severity edge cases', () => {
		it('should handle unknown error types with medium severity', () => {
			// Mock categorizeError to return unknown type
			jest.spyOn(ErrorService, 'categorizeError').mockReturnValue({
				type: 'unknown' as any,
				message: 'Unknown error',
				retryable: false,
			});

			const error = { message: 'Unknown error' };
			const severity = ErrorService.getErrorSeverity(error);
			expect(severity).toBe('medium');

			// Restore original method
			(ErrorService.categorizeError as jest.Mock).mockRestore();
		});
	});

	describe('error metrics edge cases', () => {
		it('should handle getting metrics for non-existent error type', () => {
			const metrics = ErrorService.getErrorMetricsForType('non_existent_type');
			expect(metrics).toBeUndefined();
		});

		it('should track multiple errors of same type correctly', () => {
			const error = { message: 'Network error' };

			ErrorService.categorizeError(error);
			ErrorService.categorizeError(error);
			ErrorService.categorizeError(error);

			const metrics = ErrorService.getErrorMetricsForType('connectivity');
			expect(metrics?.frequency).toBe(3);
		});

		it('should initialize recovery rate to 0', () => {
			ErrorService.clearErrorMetrics();
			const error = { message: 'Test error' };

			ErrorService.categorizeError(error);
			const metrics = ErrorService.getErrorMetricsForType('system');
			expect(metrics?.recoveryRate).toBe(0);
		});

		it('should track last occurred timestamp', () => {
			ErrorService.clearErrorMetrics();
			const error = { message: 'Test error' };

			const beforeTime = new Date();
			ErrorService.categorizeError(error);
			const afterTime = new Date();

			const metrics = ErrorService.getErrorMetricsForType('system');
			expect(metrics?.lastOccurred).toBeInstanceOf(Date);
			expect(metrics?.lastOccurred!.getTime()).toBeGreaterThanOrEqual(
				beforeTime.getTime()
			);
			expect(metrics?.lastOccurred!.getTime()).toBeLessThanOrEqual(
				afterTime.getTime()
			);
		});
	});

	describe('integration tests', () => {
		it('should handle complete error flow with retry', async () => {
			let attemptCount = 0;
			const operation = async () => {
				attemptCount++;
				if (attemptCount < 3) {
					throw { code: 500, message: 'Internal server error' };
				}
				return 'success after retries';
			};

			// Clear metrics before test
			ErrorService.clearErrorMetrics();

			const result = await ErrorService.withRetry(
				operation,
				{ code: 500, message: 'Internal server error' },
				0
			);

			expect(result).toBe('success after retries');
			expect(attemptCount).toBe(3);

			// Check that errors were tracked
			const metrics = ErrorService.getErrorMetricsForType('server_error');
			expect(metrics?.frequency).toBeGreaterThan(0);
		});

		it('should handle mixed error types in sequence', () => {
			ErrorService.clearErrorMetrics();

			// Simulate different types of errors
			ErrorService.categorizeError({ message: 'Network request failed' });
			ErrorService.categorizeError({ code: 401, message: 'Unauthorized' });
			ErrorService.categorizeError({
				code: 429,
				message: 'Rate limit exceeded',
			});
			ErrorService.categorizeError({ message: 'Request timeout' });

			const allMetrics = ErrorService.getErrorMetrics();
			expect(allMetrics).toHaveLength(4);

			// Check specific error types
			expect(
				ErrorService.getErrorMetricsForType('connectivity')?.frequency
			).toBe(1);
			expect(ErrorService.getErrorMetricsForType('auth')?.frequency).toBe(1);
			expect(ErrorService.getErrorMetricsForType('rate_limit')?.frequency).toBe(
				1
			);
			expect(ErrorService.getErrorMetricsForType('timeout')?.frequency).toBe(1);
		});

		it('should provide appropriate user guidance for different error scenarios', () => {
			const scenarios = [
				{
					error: { message: 'Network request failed' },
					expectedType: 'connectivity',
					expectedAction: 'Retry',
					expectedRetryable: true,
				},
				{
					error: { code: 401, message: 'Unauthorized' },
					expectedType: 'auth',
					expectedAction: 'Sign In',
					expectedRetryable: false,
				},
				{
					error: { code: 403, message: 'Access denied' },
					expectedType: 'permission',
					expectedAction: 'Contact Support',
					expectedRetryable: false,
				},
				{
					error: { code: 400, message: 'Invalid input' },
					expectedType: 'validation',
					expectedAction: undefined,
					expectedRetryable: false,
				},
			];

			scenarios.forEach(
				({ error, expectedType, expectedAction, expectedRetryable }) => {
					const result = ErrorService.categorizeError(error);
					expect(result.type).toBe(expectedType);
					expect(result.action).toBe(expectedAction);
					expect(result.retryable).toBe(expectedRetryable);
					expect(result.recoverySuggestions).toBeDefined();
					expect(result.recoverySuggestions?.length).toBeGreaterThan(0);
				}
			);
		});

		it('should handle error reporting decisions correctly', () => {
			const reportableErrors = [
				{ code: 401, message: 'Unauthorized' },
				{ code: 403, message: 'Access denied' },
			];

			const nonReportableErrors = [
				{ message: 'Network request failed' },
				{ code: 400, message: 'Invalid input' },
				{ message: 'Request timeout' },
			];

			reportableErrors.forEach((error) => {
				expect(ErrorService.shouldReportError(error)).toBe(true);
			});

			nonReportableErrors.forEach((error) => {
				expect(ErrorService.shouldReportError(error)).toBe(false);
			});
		});
	});
});
