import { logger } from '../utils/logger';
/**
 * Error handling service for consistent UX error states
 */

export interface ErrorState {
	type:
		| 'connectivity'
		| 'missing_info'
		| 'system'
		| 'auth'
		| 'rate_limit'
		| 'validation'
		| 'permission'
		| 'timeout'
		| 'server_error';
	message: string;
	action?: string;
	retryable: boolean;
	retryCount?: number;
	maxRetries?: number;
	recoverySuggestions?: string[];
	timestamp?: Date;
	originalError?: any;
}

export interface ErrorMetrics {
	errorType: string;
	frequency: number;
	lastOccurred: Date;
	recoveryRate: number;
}

export interface RetryConfig {
	maxRetries: number;
	baseDelay: number;
	maxDelay: number;
	backoffMultiplier: number;
}

export class ErrorService {
	private static errorMetrics: Map<string, ErrorMetrics> = new Map();
	private static retryConfig: RetryConfig = {
		maxRetries: 3,
		baseDelay: 1000,
		maxDelay: 10000,
		backoffMultiplier: 2,
	};

	/**
	 * Categorize error and return appropriate UX state
	 */
	static categorizeError(error: any, retryCount: number = 0): ErrorState {
		const errorMessage = error?.message || error?.toString() || 'Unknown error';
		const timestamp = new Date();

		// Track error metrics
		this.trackError(error);

		// Connectivity errors
		if (this.isConnectivityError(error)) {
			return {
				type: 'connectivity',
				message: 'We lost the connection. Retrying...',
				action: 'Retry',
				retryable: true,
				retryCount,
				maxRetries: this.retryConfig.maxRetries,
				recoverySuggestions: [
					'Check your internet connection',
					'Try switching between WiFi and mobile data',
					'Restart the app if the problem persists',
				],
				timestamp,
				originalError: error,
			};
		}

		// Authentication errors
		if (this.isAuthError(error)) {
			return {
				type: 'auth',
				message: 'Please sign in again to continue.',
				action: 'Sign In',
				retryable: false,
				recoverySuggestions: [
					'Sign out and sign back in',
					'Check if your session has expired',
					'Contact support if the problem persists',
				],
				timestamp,
				originalError: error,
			};
		}

		// Rate limit errors
		if (this.isRateLimitError(error)) {
			return {
				type: 'rate_limit',
				message: "You've reached your usage limit. Please try again later.",
				action: 'Upgrade',
				retryable: false,
				recoverySuggestions: [
					'Wait a few minutes before trying again',
					'Consider upgrading your plan for higher limits',
					'Contact support for assistance',
				],
				timestamp,
				originalError: error,
			};
		}

		// Timeout errors
		if (this.isTimeoutError(error)) {
			return {
				type: 'timeout',
				message: 'The request timed out. Please try again.',
				action: 'Retry',
				retryable: true,
				retryCount,
				maxRetries: this.retryConfig.maxRetries,
				recoverySuggestions: [
					'Check your internet connection',
					'Try again in a moment',
					'Contact support if timeouts persist',
				],
				timestamp,
				originalError: error,
			};
		}

		// Validation errors
		if (this.isValidationError(error)) {
			return {
				type: 'validation',
				message: errorMessage,
				retryable: false,
				recoverySuggestions: [
					'Check your input and try again',
					'Make sure all required fields are filled',
					'Contact support if you need help',
				],
				timestamp,
				originalError: error,
			};
		}

		// Permission errors
		if (this.isPermissionError(error)) {
			return {
				type: 'permission',
				message: "You don't have permission to perform this action.",
				action: 'Contact Support',
				retryable: false,
				recoverySuggestions: [
					'Check your account permissions',
					'Contact your administrator',
					'Contact support for assistance',
				],
				timestamp,
				originalError: error,
			};
		}

		// Server errors
		if (this.isServerError(error)) {
			return {
				type: 'server_error',
				message: 'Our servers are experiencing issues. Please try again later.',
				action: 'Retry',
				retryable: true,
				retryCount,
				maxRetries: this.retryConfig.maxRetries,
				recoverySuggestions: [
					'Try again in a few minutes',
					'Check our status page for updates',
					'Contact support if the issue persists',
				],
				timestamp,
				originalError: error,
			};
		}

		// Missing info errors (from server)
		if (
			errorMessage.includes('missing') ||
			errorMessage.includes('insufficient')
		) {
			return {
				type: 'missing_info',
				message: errorMessage,
				retryable: false,
				recoverySuggestions: [
					'Provide the missing information',
					'Check if all required data is available',
					'Contact support for guidance',
				],
				timestamp,
				originalError: error,
			};
		}

		// System errors (fallback)
		return {
			type: 'system',
			message: 'Something broke on our end. Your message is saved; try again.',
			action: 'Retry',
			retryable: true,
			retryCount,
			maxRetries: this.retryConfig.maxRetries,
			recoverySuggestions: [
				'Try again in a moment',
				'Restart the app if the problem persists',
				'Contact support if the issue continues',
			],
			timestamp,
			originalError: error,
		};
	}

	/**
	 * Check if error is connectivity related
	 */
	private static isConnectivityError(error: any): boolean {
		const message = error?.message?.toLowerCase() || '';
		const code = error?.code || error?.status;

		return (
			message.includes('network') ||
			message.includes('connection') ||
			message.includes('timeout') ||
			message.includes('stream stalled') ||
			message.includes('fetch') ||
			code === 'NETWORK_ERROR' ||
			code === 'TIMEOUT' ||
			code === 'CONNECTION_LOST'
		);
	}

	/**
	 * Check if error is authentication related
	 */
	private static isAuthError(error: any): boolean {
		const message = error?.message?.toLowerCase() || '';
		const code = error?.code || error?.status;

		return (
			message.includes('unauthorized') ||
			message.includes('authentication') ||
			message.includes('token') ||
			message.includes('sign in') ||
			code === 401 ||
			code === 'UNAUTHORIZED'
		);
	}

	/**
	 * Check if error is rate limit related
	 */
	private static isRateLimitError(error: any): boolean {
		const message = error?.message?.toLowerCase() || '';
		const code = error?.code || error?.status;

		return (
			message.includes('rate limit') ||
			message.includes('usage limit') ||
			message.includes('too many requests') ||
			message.includes('quota exceeded') ||
			code === 429 ||
			code === 'RATE_LIMITED' ||
			code === 'QUOTA_EXCEEDED'
		);
	}

	/**
	 * Check if error is timeout related
	 */
	private static isTimeoutError(error: any): boolean {
		const message = error?.message?.toLowerCase() || '';
		const code = error?.code || error?.status;

		return (
			message.includes('timeout') ||
			message.includes('timed out') ||
			message.includes('request timeout') ||
			code === 408 ||
			code === 'TIMEOUT' ||
			code === 'REQUEST_TIMEOUT'
		);
	}

	/**
	 * Check if error is validation related
	 */
	private static isValidationError(error: any): boolean {
		const message = error?.message?.toLowerCase() || '';
		const code = error?.code || error?.status;

		return (
			message.includes('validation') ||
			message.includes('invalid') ||
			message.includes('required') ||
			message.includes('format') ||
			code === 400 ||
			code === 'VALIDATION_ERROR' ||
			code === 'INVALID_INPUT'
		);
	}

	/**
	 * Check if error is permission related
	 */
	private static isPermissionError(error: any): boolean {
		const message = error?.message?.toLowerCase() || '';
		const code = error?.code || error?.status;

		return (
			message.includes('permission') ||
			message.includes('forbidden') ||
			message.includes('access denied') ||
			message.includes('unauthorized access') ||
			code === 403 ||
			code === 'FORBIDDEN' ||
			code === 'ACCESS_DENIED'
		);
	}

	/**
	 * Check if error is server related
	 */
	private static isServerError(error: any): boolean {
		const message = error?.message?.toLowerCase() || '';
		const code = error?.code || error?.status;

		return (
			message.includes('server error') ||
			message.includes('internal server error') ||
			message.includes('service unavailable') ||
			code === 500 ||
			code === 502 ||
			code === 503 ||
			code === 504 ||
			code === 'SERVER_ERROR' ||
			code === 'SERVICE_UNAVAILABLE'
		);
	}

	/**
	 * Get user-friendly error message
	 */
	static getUserFriendlyMessage(error: any): string {
		const errorState = this.categorizeError(error);
		return errorState.message;
	}

	/**
	 * Check if error is retryable
	 */
	static isRetryable(error: any): boolean {
		const errorState = this.categorizeError(error);
		return errorState.retryable;
	}

	/**
	 * Get suggested action for error
	 */
	static getSuggestedAction(error: any): string | undefined {
		const errorState = this.categorizeError(error);
		return errorState.action;
	}

	/**
	 * Get recovery suggestions for error
	 */
	static getRecoverySuggestions(error: any): string[] {
		const errorState = this.categorizeError(error);
		return errorState.recoverySuggestions || [];
	}

	/**
	 * Calculate retry delay with exponential backoff
	 */
	static calculateRetryDelay(retryCount: number): number {
		const delay =
			this.retryConfig.baseDelay *
			Math.pow(this.retryConfig.backoffMultiplier, retryCount);
		return Math.min(delay, this.retryConfig.maxDelay);
	}

	/**
	 * Check if error should be retried
	 */
	static shouldRetry(error: any, retryCount: number): boolean {
		const errorState = this.categorizeError(error, retryCount);
		return (
			errorState.retryable &&
			retryCount < (errorState.maxRetries || this.retryConfig.maxRetries)
		);
	}

	/**
	 * Track error for analytics and monitoring
	 */
	private static trackError(error: any): void {
		const errorType = this.categorizeError(error).type;
		const existing = this.errorMetrics.get(errorType);

		if (existing) {
			existing.frequency += 1;
			existing.lastOccurred = new Date();
		} else {
			this.errorMetrics.set(errorType, {
				errorType,
				frequency: 1,
				lastOccurred: new Date(),
				recoveryRate: 0,
			});
		}
	}

	/**
	 * Get error metrics for monitoring
	 */
	static getErrorMetrics(): ErrorMetrics[] {
		return Array.from(this.errorMetrics.values());
	}

	/**
	 * Get error metrics for specific error type
	 */
	static getErrorMetricsForType(errorType: string): ErrorMetrics | undefined {
		return this.errorMetrics.get(errorType);
	}

	/**
	 * Clear error metrics (useful for testing)
	 */
	static clearErrorMetrics(): void {
		this.errorMetrics.clear();
	}

	/**
	 * Update retry configuration
	 */
	static updateRetryConfig(config: Partial<RetryConfig>): void {
		this.retryConfig = { ...this.retryConfig, ...config };
	}

	/**
	 * Get current retry configuration
	 */
	static getRetryConfig(): RetryConfig {
		return { ...this.retryConfig };
	}

	/**
	 * Log error with context for debugging
	 */
	static logError(error: any, context?: any): void {
		const errorState = this.categorizeError(error);
		logger.error('[ErrorService] Error occurred:', {
			type: errorState.type,
			message: errorState.message,
			retryable: errorState.retryable,
			retryCount: errorState.retryCount,
			context,
			originalError: error,
			timestamp: errorState.timestamp,
		});
	}

	/**
	 * Create a retryable promise with exponential backoff
	 */
	static async withRetry<T>(
		operation: () => Promise<T>,
		error: any,
		retryCount: number = 0
	): Promise<T> {
		if (!this.shouldRetry(error, retryCount)) {
			throw error;
		}

		const delay = this.calculateRetryDelay(retryCount);
		logger.debug(
			`[ErrorService] Retrying in ${delay}ms (attempt ${retryCount + 1})`
		);

		await new Promise((resolve) => setTimeout(resolve, delay));

		try {
			return await operation();
		} catch (retryError) {
			return this.withRetry(operation, retryError, retryCount + 1);
		}
	}

	/**
	 * Get error severity level
	 */
	static getErrorSeverity(error: any): 'low' | 'medium' | 'high' | 'critical' {
		const errorState = this.categorizeError(error);

		switch (errorState.type) {
			case 'auth':
			case 'permission':
				return 'high';
			case 'rate_limit':
			case 'server_error':
				return 'medium';
			case 'connectivity':
			case 'timeout':
				return 'low';
			case 'validation':
			case 'missing_info':
				return 'low';
			case 'system':
			default:
				return 'medium';
		}
	}

	/**
	 * Check if error should be reported to analytics
	 */
	static shouldReportError(error: any): boolean {
		const severity = this.getErrorSeverity(error);
		return severity === 'high' || severity === 'critical';
	}
}
