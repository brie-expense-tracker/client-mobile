/**
 * Circuit Breaker Implementation
 *
 * Provides circuit breaker pattern for external API calls to ensure reliability
 * under model/tool hiccups. Implements exponential backoff retry logic and
 * graceful fallbacks when services are unavailable.
 */

export enum CircuitState {
	CLOSED = 'CLOSED', // Normal operation
	OPEN = 'OPEN', // Circuit is open, calls fail fast
	HALF_OPEN = 'HALF_OPEN', // Testing if service is back
}

export interface CircuitBreakerConfig {
	failureThreshold: number; // Number of failures before opening circuit
	successThreshold: number; // Number of successes to close circuit from half-open
	timeout: number; // Timeout for individual calls (ms)
	resetTimeout: number; // Time to wait before trying half-open (ms)
	maxRetries: number; // Maximum retry attempts
	retryDelay: number; // Initial retry delay (ms)
	maxRetryDelay: number; // Maximum retry delay (ms)
	retryMultiplier: number; // Exponential backoff multiplier
}

export interface CircuitBreakerStats {
	state: CircuitState;
	failureCount: number;
	successCount: number;
	lastFailureTime?: Date;
	lastSuccessTime?: Date;
	totalCalls: number;
	totalFailures: number;
	totalSuccesses: number;
	averageResponseTime: number;
}

export interface RetryResult<T> {
	result: T | null;
	success: boolean;
	attempts: number;
	totalTime: number;
	errors: Error[];
}

export class CircuitBreaker {
	private state: CircuitState = CircuitState.CLOSED;
	private failureCount: number = 0;
	private successCount: number = 0;
	private lastFailureTime?: Date;
	private lastSuccessTime?: Date;
	private totalCalls: number = 0;
	private totalFailures: number = 0;
	private totalSuccesses: number = 0;
	private responseTimes: number[] = [];
	private nextAttemptTime?: Date;

	constructor(private name: string, private config: CircuitBreakerConfig) {}

	/**
	 * Execute a function with circuit breaker protection
	 */
	async execute<T>(operation: () => Promise<T>, context?: string): Promise<T> {
		this.totalCalls++;
		const startTime = Date.now();

		// Check if circuit is open and not ready for retry
		if (this.state === CircuitState.OPEN) {
			if (this.nextAttemptTime && Date.now() < this.nextAttemptTime.getTime()) {
				throw new Error(
					`Circuit breaker '${
						this.name
					}' is OPEN. Next attempt at ${this.nextAttemptTime.toISOString()}`
				);
			}
			// Move to half-open state
			this.state = CircuitState.HALF_OPEN;
			this.successCount = 0;
		}

		try {
			// Execute the operation with timeout
			const result = await this.executeWithTimeout(
				operation,
				this.config.timeout
			);

			// Record success
			this.recordSuccess(startTime);

			return result;
		} catch (error) {
			// Record failure
			this.recordFailure(startTime);

			// If in half-open state, open the circuit on any failure
			if (this.state === CircuitState.HALF_OPEN) {
				this.state = CircuitState.OPEN;
				this.nextAttemptTime = new Date(Date.now() + this.config.resetTimeout);
			}

			throw error;
		}
	}

	/**
	 * Execute with retry logic and circuit breaker protection
	 */
	async executeWithRetry<T>(
		operation: () => Promise<T>,
		context?: string
	): Promise<RetryResult<T>> {
		const startTime = Date.now();
		const errors: Error[] = [];
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
			try {
				// Use circuit breaker for each attempt
				const result = await this.execute(operation, context);

				return {
					result,
					success: true,
					attempts: attempt,
					totalTime: Date.now() - startTime,
					errors,
				};
			} catch (error) {
				lastError = error instanceof Error ? error : new Error('Unknown error');
				errors.push(lastError);

				// If circuit is open, don't retry
				if (this.state === CircuitState.OPEN) {
					break;
				}

				// If this was the last attempt, don't wait
				if (attempt <= this.config.maxRetries) {
					const delay = this.calculateRetryDelay(attempt);
					await this.sleep(delay);
				}
			}
		}

		return {
			result: null,
			success: false,
			attempts: this.config.maxRetries + 1,
			totalTime: Date.now() - startTime,
			errors,
		};
	}

	/**
	 * Get current circuit breaker statistics
	 */
	getStats(): CircuitBreakerStats {
		const averageResponseTime =
			this.responseTimes.length > 0
				? this.responseTimes.reduce((sum, time) => sum + time, 0) /
				  this.responseTimes.length
				: 0;

		return {
			state: this.state,
			failureCount: this.failureCount,
			successCount: this.successCount,
			lastFailureTime: this.lastFailureTime,
			lastSuccessTime: this.lastSuccessTime,
			totalCalls: this.totalCalls,
			totalFailures: this.totalFailures,
			totalSuccesses: this.totalSuccesses,
			averageResponseTime,
		};
	}

	/**
	 * Reset the circuit breaker to closed state
	 */
	reset(): void {
		this.state = CircuitState.CLOSED;
		this.failureCount = 0;
		this.successCount = 0;
		this.lastFailureTime = undefined;
		this.lastSuccessTime = undefined;
		this.nextAttemptTime = undefined;
	}

	/**
	 * Check if circuit breaker is healthy
	 */
	isHealthy(): boolean {
		return (
			this.state === CircuitState.CLOSED ||
			this.state === CircuitState.HALF_OPEN
		);
	}

	private async executeWithTimeout<T>(
		operation: () => Promise<T>,
		timeoutMs: number
	): Promise<T> {
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(new Error(`Operation timed out after ${timeoutMs}ms`));
			}, timeoutMs);

			operation()
				.then((result) => {
					clearTimeout(timer);
					resolve(result);
				})
				.catch((error) => {
					clearTimeout(timer);
					reject(error);
				});
		});
	}

	private recordSuccess(startTime: number): void {
		const responseTime = Date.now() - startTime;
		this.responseTimes.push(responseTime);

		// Keep only last 100 response times for average calculation
		if (this.responseTimes.length > 100) {
			this.responseTimes = this.responseTimes.slice(-100);
		}

		this.successCount++;
		this.totalSuccesses++;
		this.lastSuccessTime = new Date();

		// Reset failure count on success
		this.failureCount = 0;

		// If in half-open state and we have enough successes, close the circuit
		if (
			this.state === CircuitState.HALF_OPEN &&
			this.successCount >= this.config.successThreshold
		) {
			this.state = CircuitState.CLOSED;
			this.successCount = 0;
		}
	}

	private recordFailure(startTime: number): void {
		const responseTime = Date.now() - startTime;
		this.responseTimes.push(responseTime);

		this.failureCount++;
		this.totalFailures++;
		this.lastFailureTime = new Date();

		// If we've hit the failure threshold, open the circuit
		if (this.failureCount >= this.config.failureThreshold) {
			this.state = CircuitState.OPEN;
			this.nextAttemptTime = new Date(Date.now() + this.config.resetTimeout);
		}
	}

	private calculateRetryDelay(attempt: number): number {
		const delay =
			this.config.retryDelay *
			Math.pow(this.config.retryMultiplier, attempt - 1);
		return Math.min(delay, this.config.maxRetryDelay);
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different services
 */
export class CircuitBreakerManager {
	private breakers: Map<string, CircuitBreaker> = new Map();

	/**
	 * Get or create a circuit breaker for a service
	 */
	getBreaker(
		name: string,
		config?: Partial<CircuitBreakerConfig>
	): CircuitBreaker {
		if (!this.breakers.has(name)) {
			const defaultConfig: CircuitBreakerConfig = {
				failureThreshold: 5,
				successThreshold: 3,
				timeout: 10000,
				resetTimeout: 30000,
				maxRetries: 3,
				retryDelay: 1000,
				maxRetryDelay: 10000,
				retryMultiplier: 2,
				...config,
			};

			this.breakers.set(name, new CircuitBreaker(name, defaultConfig));
		}

		return this.breakers.get(name)!;
	}

	/**
	 * Get all circuit breaker statistics
	 */
	getAllStats(): Record<string, CircuitBreakerStats> {
		const stats: Record<string, CircuitBreakerStats> = {};

		for (const [name, breaker] of this.breakers) {
			stats[name] = breaker.getStats();
		}

		return stats;
	}

	/**
	 * Reset all circuit breakers
	 */
	resetAll(): void {
		for (const breaker of this.breakers.values()) {
			breaker.reset();
		}
	}

	/**
	 * Get health status of all circuit breakers
	 */
	getHealthStatus(): Record<string, boolean> {
		const health: Record<string, boolean> = {};

		for (const [name, breaker] of this.breakers) {
			health[name] = breaker.isHealthy();
		}

		return health;
	}
}

// Global circuit breaker manager instance
export const circuitBreakerManager = new CircuitBreakerManager();

// Pre-configured circuit breakers for common services
export const orchestratorBreaker = circuitBreakerManager.getBreaker(
	'orchestrator',
	{
		failureThreshold: 3,
		successThreshold: 2,
		timeout: 15000,
		resetTimeout: 30000,
		maxRetries: 2,
		retryDelay: 1000,
		maxRetryDelay: 5000,
	}
);

export const streamingBreaker = circuitBreakerManager.getBreaker('streaming', {
	failureThreshold: 2,
	successThreshold: 2,
	timeout: 20000,
	resetTimeout: 45000,
	maxRetries: 1,
	retryDelay: 2000,
	maxRetryDelay: 8000,
});

export const toolsBreaker = circuitBreakerManager.getBreaker('tools', {
	failureThreshold: 5,
	successThreshold: 3,
	timeout: 8000,
	resetTimeout: 20000,
	maxRetries: 3,
	retryDelay: 500,
	maxRetryDelay: 4000,
});
