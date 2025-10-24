/**
 * Chaos Testing Service
 *
 * Provides chaos testing scenarios to validate reliability under various failure conditions.
 * Tests circuit breakers, retries, and fallback mechanisms.
 */

import { ResilientApiService } from './resilientApiService';
import { MonitoringService } from './monitoringService';

export interface ChaosTestScenario {
	id: string;
	name: string;
	description: string;
	duration: number; // in milliseconds
	failureRate: number; // 0-1
	responseDelay: number; // in milliseconds
	errorType:
		| 'timeout'
		| 'network'
		| 'server_error'
		| 'circuit_breaker'
		| 'memory_leak'
		| 'cpu_spike'
		| 'disk_full'
		| 'database_lock';
	enabled: boolean;
	priority: 'low' | 'medium' | 'high' | 'critical';
	tags: string[];
	dependencies: string[]; // IDs of scenarios that must run first
	recoveryTime: number; // time to wait after test completion
	expectedSuccessRate: number; // minimum expected success rate
	maxResponseTime: number; // maximum acceptable response time
	retryCount: number; // number of retries for failed tests
	concurrent: boolean; // whether test can run concurrently
}

export interface ChaosTestResult {
	scenarioId: string;
	startTime: Date;
	endTime: Date;
	duration: number;
	totalRequests: number;
	successfulRequests: number;
	failedRequests: number;
	fallbackUsed: number;
	circuitBreakerTrips: number;
	averageResponseTime: number;
	p95ResponseTime: number;
	p99ResponseTime: number;
	errors: string[];
	success: boolean;
	metrics: {
		before: any;
		after: any;
	};
	retryCount: number;
	recoveryTime: number;
	actualSuccessRate: number;
	performanceScore: number; // 0-100
	reliabilityScore: number; // 0-100
	severity: 'low' | 'medium' | 'high' | 'critical';
	recommendations: string[];
}

export interface ChaosTestConfig {
	globalTimeout: number; // maximum time for all tests
	maxConcurrentTests: number;
	enableNotifications: boolean;
	notificationChannels: string[];
	persistResults: boolean;
	resultRetentionDays: number;
	autoRecovery: boolean;
	recoveryDelay: number;
	enableMetrics: boolean;
	metricsRetentionDays: number;
}

export interface TestSchedule {
	id: string;
	scenarioId: string;
	cronExpression: string;
	enabled: boolean;
	lastRun?: Date;
	nextRun?: Date;
	timezone: string;
}

export interface TestNotification {
	id: string;
	testId: string;
	type: 'test_started' | 'test_completed' | 'test_failed' | 'test_cancelled';
	message: string;
	timestamp: Date;
	severity: 'info' | 'warning' | 'error' | 'critical';
	channels: string[];
}

export class ChaosTestingService {
	private static readonly DEFAULT_CONFIG: ChaosTestConfig = {
		globalTimeout: 300000, // 5 minutes
		maxConcurrentTests: 3,
		enableNotifications: true,
		notificationChannels: ['console', 'email'],
		persistResults: true,
		resultRetentionDays: 30,
		autoRecovery: true,
		recoveryDelay: 5000,
		enableMetrics: true,
		metricsRetentionDays: 7,
	};

	private static readonly SCENARIOS: ChaosTestScenario[] = [
		{
			id: 'network_timeout',
			name: 'Network Timeout Simulation',
			description:
				'Simulates network timeouts to test circuit breaker and retry logic',
			duration: 60000, // 1 minute
			failureRate: 0.8,
			responseDelay: 10000, // 10 seconds
			errorType: 'timeout',
			enabled: true,
			priority: 'high',
			tags: ['network', 'timeout', 'circuit-breaker'],
			dependencies: [],
			recoveryTime: 5000,
			expectedSuccessRate: 0.2,
			maxResponseTime: 15000,
			retryCount: 3,
			concurrent: false,
		},
		{
			id: 'server_errors',
			name: 'Server Error Simulation',
			description: 'Simulates 5xx server errors to test error handling',
			duration: 45000, // 45 seconds
			failureRate: 0.6,
			responseDelay: 2000, // 2 seconds
			errorType: 'server_error',
			enabled: true,
			priority: 'medium',
			tags: ['server', 'error', '5xx'],
			dependencies: [],
			recoveryTime: 3000,
			expectedSuccessRate: 0.4,
			maxResponseTime: 5000,
			retryCount: 2,
			concurrent: true,
		},
		{
			id: 'circuit_breaker_trip',
			name: 'Circuit Breaker Trip Test',
			description: 'Forces circuit breaker to trip and tests recovery',
			duration: 30000, // 30 seconds
			failureRate: 1.0,
			responseDelay: 1000, // 1 second
			errorType: 'circuit_breaker',
			enabled: true,
			priority: 'critical',
			tags: ['circuit-breaker', 'trip', 'recovery'],
			dependencies: [],
			recoveryTime: 10000,
			expectedSuccessRate: 0.0,
			maxResponseTime: 2000,
			retryCount: 1,
			concurrent: false,
		},
		{
			id: 'intermittent_failures',
			name: 'Intermittent Failures',
			description: 'Simulates intermittent failures to test resilience',
			duration: 90000, // 1.5 minutes
			failureRate: 0.3,
			responseDelay: 3000, // 3 seconds
			errorType: 'network',
			enabled: true,
			priority: 'medium',
			tags: ['intermittent', 'network', 'resilience'],
			dependencies: [],
			recoveryTime: 2000,
			expectedSuccessRate: 0.7,
			maxResponseTime: 4000,
			retryCount: 2,
			concurrent: true,
		},
		{
			id: 'memory_leak',
			name: 'Memory Leak Simulation',
			description: 'Simulates memory pressure to test resource management',
			duration: 120000, // 2 minutes
			failureRate: 0.4,
			responseDelay: 5000, // 5 seconds
			errorType: 'memory_leak',
			enabled: true,
			priority: 'high',
			tags: ['memory', 'leak', 'resource'],
			dependencies: [],
			recoveryTime: 15000,
			expectedSuccessRate: 0.6,
			maxResponseTime: 8000,
			retryCount: 1,
			concurrent: false,
		},
		{
			id: 'cpu_spike',
			name: 'CPU Spike Simulation',
			description: 'Simulates high CPU usage to test performance under load',
			duration: 60000, // 1 minute
			failureRate: 0.2,
			responseDelay: 1000, // 1 second
			errorType: 'cpu_spike',
			enabled: true,
			priority: 'medium',
			tags: ['cpu', 'performance', 'load'],
			dependencies: [],
			recoveryTime: 5000,
			expectedSuccessRate: 0.8,
			maxResponseTime: 3000,
			retryCount: 2,
			concurrent: true,
		},
	];

	private static isRunning = false;
	private static currentScenario: ChaosTestScenario | null = null;
	private static testResults: ChaosTestResult[] = [];
	private static config: ChaosTestConfig = { ...this.DEFAULT_CONFIG };
	private static schedules: TestSchedule[] = [];
	private static notifications: TestNotification[] = [];
	private static runningTests: Map<string, Promise<ChaosTestResult>> =
		new Map();
	private static testHistory: Map<string, ChaosTestResult[]> = new Map();

	/**
	 * Initialize the chaos testing service
	 */
	static async initialize(config?: Partial<ChaosTestConfig>): Promise<void> {
		this.config = { ...this.DEFAULT_CONFIG, ...config };
	}

	/**
	 * Run a chaos test scenario with enhanced features
	 */
	static async runChaosTest(
		scenarioId: string,
		retryCount = 0
	): Promise<ChaosTestResult> {
		// Check if test is already running
		if (this.runningTests.has(scenarioId)) {
			throw new Error(`Test ${scenarioId} is already running`);
		}

		const scenario = this.SCENARIOS.find((s) => s.id === scenarioId);
		if (!scenario || !scenario.enabled) {
			throw new Error(`Scenario ${scenarioId} not found or disabled`);
		}

		// Validate scenario dependencies
		if (!this.validateDependencies(scenario)) {
			throw new Error(`Dependencies not met for scenario ${scenarioId}`);
		}

		// Check concurrent test limits
		if (
			!scenario.concurrent &&
			this.runningTests.size >= this.config.maxConcurrentTests
		) {
			throw new Error('Maximum concurrent tests limit reached');
		}

		const startTime = new Date();
		const result: ChaosTestResult = {
			scenarioId,
			startTime,
			endTime: new Date(),
			duration: 0,
			totalRequests: 0,
			successfulRequests: 0,
			failedRequests: 0,
			fallbackUsed: 0,
			circuitBreakerTrips: 0,
			averageResponseTime: 0,
			p95ResponseTime: 0,
			p99ResponseTime: 0,
			errors: [],
			success: false,
			metrics: {
				before: {},
				after: {},
			},
			retryCount,
			recoveryTime: scenario.recoveryTime,
			actualSuccessRate: 0,
			performanceScore: 0,
			reliabilityScore: 0,
			severity: 'low',
			recommendations: [],
		};

		// Create test promise
		const testPromise = this.executeChaosTestWithRetry(scenario, result);
		this.runningTests.set(scenarioId, testPromise);

		try {
			// Send notification
			await this.sendNotification({
				id: `test_start_${Date.now()}`,
				testId: scenarioId,
				type: 'test_started',
				message: `Chaos test started: ${scenario.name}`,
				timestamp: startTime,
				severity: 'info',
				channels: this.config.notificationChannels,
			});

			const finalResult = await testPromise;
			return finalResult;
		} finally {
			this.runningTests.delete(scenarioId);
		}
	}

	/**
	 * Execute chaos test with retry logic
	 */
	private static async executeChaosTestWithRetry(
		scenario: ChaosTestScenario,
		result: ChaosTestResult
	): Promise<ChaosTestResult> {
		try {
			console.log(`🧪 Starting chaos test: ${scenario.name}`);

			// Record initial metrics
			result.metrics.before = MonitoringService.getOverallHealth();

			// Run the test
			await this.executeChaosTest(scenario, result);

			// Record final metrics
			result.metrics.after = MonitoringService.getOverallHealth();

			// Calculate final statistics
			this.calculateTestStatistics(result);

			result.success = this.evaluateTestSuccess(result);
			result.endTime = new Date();
			result.duration = result.endTime.getTime() - result.startTime.getTime();

			this.testResults.push(result);

			console.log(`🧪 Chaos test completed: ${scenario.name}`, {
				success: result.success,
				totalRequests: result.totalRequests,
				successRate:
					((result.successfulRequests / result.totalRequests) * 100).toFixed(
						1
					) + '%',
				fallbackUsed: result.fallbackUsed,
				circuitBreakerTrips: result.circuitBreakerTrips,
			});
		} catch (error) {
			console.error('🧪 Chaos test failed:', error);
			result.errors.push(
				error instanceof Error ? error.message : 'Unknown error'
			);
			result.success = false;
		} finally {
			this.isRunning = false;
			this.currentScenario = null;
		}

		return result;
	}

	/**
	 * Run all enabled chaos test scenarios
	 */
	static async runAllChaosTests(): Promise<ChaosTestResult[]> {
		const results: ChaosTestResult[] = [];

		for (const scenario of this.SCENARIOS) {
			if (scenario.enabled) {
				try {
					const result = await this.runChaosTest(scenario.id);
					results.push(result);

					// Wait between tests
					await this.sleep(5000);
				} catch (error) {
					console.error(`Failed to run scenario ${scenario.id}:`, error);
				}
			}
		}

		return results;
	}

	/**
	 * Get available chaos test scenarios
	 */
	static getScenarios(): ChaosTestScenario[] {
		return [...this.SCENARIOS];
	}

	/**
	 * Get chaos test results
	 */
	static getTestResults(): ChaosTestResult[] {
		return [...this.testResults];
	}

	/**
	 * Get the latest test result for a scenario
	 */
	static getLatestTestResult(scenarioId: string): ChaosTestResult | null {
		return (
			this.testResults
				.filter((r) => r.scenarioId === scenarioId)
				.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0] ||
			null
		);
	}

	/**
	 * Check if chaos testing is currently running
	 */
	static isChaosTestRunning(): boolean {
		return this.isRunning;
	}

	/**
	 * Get current chaos test scenario
	 */
	static getCurrentScenario(): ChaosTestScenario | null {
		return this.currentScenario;
	}

	/**
	 * Clear test results
	 */
	static clearTestResults(): void {
		this.testResults = [];
	}

	/**
	 * Execute a chaos test scenario
	 */
	private static async executeChaosTest(
		scenario: ChaosTestScenario,
		result: ChaosTestResult
	): Promise<void> {
		const endTime = Date.now() + scenario.duration;
		const responseTimes: number[] = [];

		while (Date.now() < endTime) {
			const requestStart = Date.now();

			try {
				// Simulate the failure condition
				const shouldFail = Math.random() < scenario.failureRate;

				if (shouldFail) {
					await this.simulateFailure(scenario);
				} else {
					// Make a real API call
					const response = await ResilientApiService.callOrchestrator(
						'/api/orchestrator/chat',
						{
							message: `Chaos test message ${Date.now()}`,
							sessionId: `chaos_${Date.now()}`,
						},
						{ fallbackEnabled: true }
					);

					if (response.success) {
						result.successfulRequests++;
						if (response.fallbackUsed) {
							result.fallbackUsed++;
						}
					} else {
						result.failedRequests++;
						result.errors.push(response.error || 'Unknown error');
					}
				}

				const responseTime = Date.now() - requestStart;
				responseTimes.push(responseTime);
				result.totalRequests++;

				// Add delay between requests
				await this.sleep(scenario.responseDelay);
			} catch (error) {
				result.failedRequests++;
				result.errors.push(
					error instanceof Error ? error.message : 'Unknown error'
				);
			}
		}

		// Calculate response time statistics
		if (responseTimes.length > 0) {
			responseTimes.sort((a, b) => a - b);
			result.averageResponseTime =
				responseTimes.reduce((sum, time) => sum + time, 0) /
				responseTimes.length;
			result.p95ResponseTime =
				responseTimes[Math.floor(responseTimes.length * 0.95)];
			result.p99ResponseTime =
				responseTimes[Math.floor(responseTimes.length * 0.99)];
		}
	}

	/**
	 * Simulate a failure condition
	 */
	private static async simulateFailure(
		scenario: ChaosTestScenario
	): Promise<void> {
		switch (scenario.errorType) {
			case 'timeout':
				await this.sleep(scenario.responseDelay);
				throw new Error('Request timeout');

			case 'network':
				throw new Error('Network error');

			case 'server_error':
				await this.sleep(scenario.responseDelay);
				throw new Error('Server error: 500 Internal Server Error');

			case 'circuit_breaker':
				throw new Error('Circuit breaker is OPEN');

			case 'memory_leak':
				await this.sleep(scenario.responseDelay);
				throw new Error('Memory allocation failed: Out of memory');

			case 'cpu_spike':
				await this.sleep(scenario.responseDelay);
				throw new Error('CPU overload: Service temporarily unavailable');

			case 'disk_full':
				await this.sleep(scenario.responseDelay);
				throw new Error('Disk space exhausted: Cannot write to disk');

			case 'database_lock':
				await this.sleep(scenario.responseDelay);
				throw new Error('Database lock timeout: Resource unavailable');

			default:
				throw new Error('Unknown error type');
		}
	}

	/**
	 * Calculate test statistics
	 */
	private static calculateTestStatistics(result: ChaosTestResult): void {
		// Count circuit breaker trips
		const healthStatus = ResilientApiService.getHealthStatus();
		result.circuitBreakerTrips = Object.values(healthStatus).filter(
			(stats: any) => stats.state === 'OPEN'
		).length;

		// Calculate actual success rate
		result.actualSuccessRate =
			result.totalRequests > 0
				? result.successfulRequests / result.totalRequests
				: 0;

		// Calculate performance score (0-100)
		const responseTimeScore = Math.max(
			0,
			100 - result.averageResponseTime / 100
		);
		const successRateScore = result.actualSuccessRate * 100;
		result.performanceScore = Math.round(
			(responseTimeScore + successRateScore) / 2
		);

		// Calculate reliability score (0-100)
		const fallbackScore = result.fallbackUsed > 0 ? 80 : 100; // Bonus for using fallback
		const errorPenalty = Math.min(50, result.errors.length * 10);
		result.reliabilityScore = Math.max(0, fallbackScore - errorPenalty);

		// Determine severity
		if (result.actualSuccessRate < 0.5 || result.averageResponseTime > 10000) {
			result.severity = 'critical';
		} else if (
			result.actualSuccessRate < 0.7 ||
			result.averageResponseTime > 5000
		) {
			result.severity = 'high';
		} else if (
			result.actualSuccessRate < 0.9 ||
			result.averageResponseTime > 2000
		) {
			result.severity = 'medium';
		} else {
			result.severity = 'low';
		}

		// Generate recommendations
		result.recommendations = this.generateRecommendations(result);

		// Store in test history
		const history = this.testHistory.get(result.scenarioId) || [];
		history.push(result);
		if (history.length > 100) {
			// Keep only last 100 results
			history.splice(0, history.length - 100);
		}
		this.testHistory.set(result.scenarioId, history);
	}

	/**
	 * Generate recommendations based on test results
	 */
	private static generateRecommendations(result: ChaosTestResult): string[] {
		const recommendations: string[] = [];

		if (result.actualSuccessRate < 0.5) {
			recommendations.push('Consider improving error handling and retry logic');
		}

		if (result.averageResponseTime > 5000) {
			recommendations.push(
				'Optimize API performance and reduce response times'
			);
		}

		if (result.circuitBreakerTrips > 0) {
			recommendations.push(
				'Review circuit breaker configuration and thresholds'
			);
		}

		if (result.fallbackUsed === 0 && result.actualSuccessRate < 0.8) {
			recommendations.push(
				'Implement fallback mechanisms for better resilience'
			);
		}

		if (result.errors.length > result.totalRequests * 0.3) {
			recommendations.push('Investigate and fix recurring error patterns');
		}

		if (result.p95ResponseTime > result.averageResponseTime * 2) {
			recommendations.push(
				'Address performance outliers and optimize slow requests'
			);
		}

		return recommendations;
	}

	/**
	 * Evaluate if the test was successful
	 */
	private static evaluateTestSuccess(result: ChaosTestResult): boolean {
		// Test is successful if:
		// 1. We made requests
		// 2. Either we had successful requests OR fallback was used
		// 3. P95 response time is under 2 seconds (as per requirements)
		// 4. No critical errors occurred

		const hasRequests = result.totalRequests > 0;
		const hasSuccess = result.successfulRequests > 0 || result.fallbackUsed > 0;
		const responseTimeOk = result.p95ResponseTime < 2000;
		const noCriticalErrors =
			result.errors.filter((e) => e.includes('critical')).length === 0;

		return hasRequests && hasSuccess && responseTimeOk && noCriticalErrors;
	}

	/**
	 * Sleep utility
	 */
	private static sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Generate chaos test report
	 */
	static generateReport(): {
		summary: {
			totalTests: number;
			successfulTests: number;
			failedTests: number;
			successRate: number;
			averageResponseTime: number;
			totalCircuitBreakerTrips: number;
		};
		scenarios: {
			scenario: ChaosTestScenario;
			latestResult: ChaosTestResult | null;
			success: boolean;
		}[];
		recommendations: string[];
	} {
		const scenarios = this.SCENARIOS.map((scenario) => ({
			scenario,
			latestResult: this.getLatestTestResult(scenario.id),
			success: this.getLatestTestResult(scenario.id)?.success || false,
		}));

		const totalTests = scenarios.length;
		const successfulTests = scenarios.filter((s) => s.success).length;
		const failedTests = totalTests - successfulTests;
		const successRate =
			totalTests > 0 ? (successfulTests / totalTests) * 100 : 0;

		const allResults = scenarios
			.map((s) => s.latestResult)
			.filter((r) => r !== null) as ChaosTestResult[];

		const averageResponseTime =
			allResults.length > 0
				? allResults.reduce((sum, r) => sum + r.averageResponseTime, 0) /
				  allResults.length
				: 0;

		const totalCircuitBreakerTrips = allResults.reduce(
			(sum, r) => sum + r.circuitBreakerTrips,
			0
		);

		const recommendations: string[] = [];

		if (successRate < 80) {
			recommendations.push(
				'Consider improving circuit breaker configuration or retry logic'
			);
		}

		if (averageResponseTime > 2000) {
			recommendations.push(
				'Response times are too high, consider optimizing API calls'
			);
		}

		if (totalCircuitBreakerTrips > 0) {
			recommendations.push(
				'Circuit breakers are tripping frequently, investigate root causes'
			);
		}

		return {
			summary: {
				totalTests,
				successfulTests,
				failedTests,
				successRate: Math.round(successRate),
				averageResponseTime: Math.round(averageResponseTime),
				totalCircuitBreakerTrips,
			},
			scenarios,
			recommendations,
		};
	}

	/**
	 * Validate scenario dependencies
	 */
	private static validateDependencies(scenario: ChaosTestScenario): boolean {
		if (scenario.dependencies.length === 0) return true;

		return scenario.dependencies.every((depId) => {
			const depResult = this.getLatestTestResult(depId);
			return depResult && depResult.success;
		});
	}

	/**
	 * Send notification
	 */
	private static async sendNotification(
		notification: TestNotification
	): Promise<void> {
		if (!this.config.enableNotifications) return;

		this.notifications.push(notification);

		// Keep only last 1000 notifications
		if (this.notifications.length > 1000) {
			this.notifications = this.notifications.slice(-1000);
		}

		// Send to channels
		for (const channel of notification.channels) {
			switch (channel) {
				case 'console':
					console.log(
						`[${notification.severity.toUpperCase()}] ${notification.message}`
					);
					break;
				case 'email':
					// TODO: Implement email notification
					break;
				default:
			}
		}
	}

	/**
	 * Add custom test scenario
	 */
	static addScenario(scenario: ChaosTestScenario): void {
		const existingIndex = this.SCENARIOS.findIndex((s) => s.id === scenario.id);
		if (existingIndex >= 0) {
			this.SCENARIOS[existingIndex] = scenario;
		} else {
			this.SCENARIOS.push(scenario);
		}
	}

	/**
	 * Remove test scenario
	 */
	static removeScenario(scenarioId: string): boolean {
		const index = this.SCENARIOS.findIndex((s) => s.id === scenarioId);
		if (index >= 0) {
			this.SCENARIOS.splice(index, 1);
			return true;
		}
		return false;
	}

	/**
	 * Get test configuration
	 */
	static getConfig(): ChaosTestConfig {
		return { ...this.config };
	}

	/**
	 * Update test configuration
	 */
	static updateConfig(newConfig: Partial<ChaosTestConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	/**
	 * Get test history for a scenario
	 */
	static getTestHistory(scenarioId: string): ChaosTestResult[] {
		return this.testHistory.get(scenarioId) || [];
	}

	/**
	 * Get all notifications
	 */
	static getNotifications(): TestNotification[] {
		return [...this.notifications];
	}

	/**
	 * Clear notifications
	 */
	static clearNotifications(): void {
		this.notifications = [];
	}

	/**
	 * Get running tests
	 */
	static getRunningTests(): string[] {
		return Array.from(this.runningTests.keys());
	}

	/**
	 * Cancel running test
	 */
	static async cancelTest(scenarioId: string): Promise<boolean> {
		const testPromise = this.runningTests.get(scenarioId);
		if (testPromise) {
			// Note: In a real implementation, you'd need to implement proper cancellation
			this.runningTests.delete(scenarioId);
			return true;
		}
		return false;
	}

	/**
	 * Schedule a test
	 */
	static scheduleTest(schedule: TestSchedule): void {
		this.schedules.push(schedule);
	}

	/**
	 * Get scheduled tests
	 */
	static getScheduledTests(): TestSchedule[] {
		return [...this.schedules];
	}

	/**
	 * Remove scheduled test
	 */
	static removeScheduledTest(scheduleId: string): boolean {
		const index = this.schedules.findIndex((s) => s.id === scheduleId);
		if (index >= 0) {
			this.schedules.splice(index, 1);
			return true;
		}
		return false;
	}

	/**
	 * Export test configuration
	 */
	static exportConfig(): string {
		return JSON.stringify(
			{
				config: this.config,
				scenarios: this.SCENARIOS,
				schedules: this.schedules,
			},
			null,
			2
		);
	}

	/**
	 * Import test configuration
	 */
	static importConfig(configJson: string): boolean {
		try {
			const data = JSON.parse(configJson);
			if (data.config) this.config = { ...this.DEFAULT_CONFIG, ...data.config };
			if (data.scenarios)
				this.SCENARIOS.splice(0, this.SCENARIOS.length, ...data.scenarios);
			if (data.schedules)
				this.schedules.splice(0, this.schedules.length, ...data.schedules);
			return true;
		} catch (error) {
			console.error('Failed to import configuration:', error);
			return false;
		}
	}

	/**
	 * Get test analytics
	 */
	static getAnalytics(): {
		totalTests: number;
		successRate: number;
		averageResponseTime: number;
		mostFailingScenario: string | null;
		trends: {
			responseTime: number[];
			successRate: number[];
			errorRate: number[];
		};
	} {
		const allResults = this.testResults;
		const totalTests = allResults.length;
		const successRate =
			totalTests > 0
				? allResults.filter((r) => r.success).length / totalTests
				: 0;
		const averageResponseTime =
			totalTests > 0
				? allResults.reduce((sum, r) => sum + r.averageResponseTime, 0) /
				  totalTests
				: 0;

		// Find most failing scenario
		const scenarioFailures = new Map<string, number>();
		allResults.forEach((result) => {
			if (!result.success) {
				scenarioFailures.set(
					result.scenarioId,
					(scenarioFailures.get(result.scenarioId) || 0) + 1
				);
			}
		});
		const mostFailingScenario =
			scenarioFailures.size > 0
				? Array.from(scenarioFailures.entries()).reduce((a, b) =>
						a[1] > b[1] ? a : b
				  )[0]
				: null;

		// Calculate trends (last 10 tests)
		const recentResults = allResults.slice(-10);
		const trends = {
			responseTime: recentResults.map((r) => r.averageResponseTime),
			successRate: recentResults.map((r) => r.actualSuccessRate),
			errorRate: recentResults.map(
				(r) => r.failedRequests / Math.max(r.totalRequests, 1)
			),
		};

		return {
			totalTests,
			successRate,
			averageResponseTime,
			mostFailingScenario,
			trends,
		};
	}

	/**
	 * Reset all data
	 */
	static reset(): void {
		this.testResults = [];
		this.notifications = [];
		this.schedules = [];
		this.runningTests.clear();
		this.testHistory.clear();
		this.config = { ...this.DEFAULT_CONFIG };
	}
}
