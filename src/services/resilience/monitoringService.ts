/**
 * Monitoring Service
 *
 * Provides monitoring and alerting for circuit breaker states and service health.
 * Tracks metrics, sends alerts, and provides dashboards for service reliability.
 */

import { CircuitBreakerStats } from './circuitBreaker';
import { ResilientApiService } from './resilientApiService';

export interface ServiceAlert {
	id: string;
	serviceName: string;
	type: 'circuit_open' | 'high_failure_rate' | 'slow_response' | 'service_down';
	severity: 'low' | 'medium' | 'high' | 'critical';
	message: string;
	timestamp: Date;
	resolved: boolean;
	resolvedAt?: Date;
}

export interface ServiceMetrics {
	serviceName: string;
	timestamp: Date;
	state: string;
	totalCalls: number;
	successRate: number;
	averageResponseTime: number;
	failureRate: number;
	circuitBreakerTrips: number;
	lastFailure?: Date;
	lastSuccess?: Date;
}

export interface HealthCheckResult {
	serviceName: string;
	healthy: boolean;
	responseTime: number;
	error?: string;
	timestamp: Date;
}

export class MonitoringService {
	private static readonly ALERT_THRESHOLDS = {
		HIGH_FAILURE_RATE: 0.3, // 30% failure rate
		SLOW_RESPONSE: 5000, // 5 seconds
		CRITICAL_FAILURE_RATE: 0.5, // 50% failure rate
	};

	private static alerts: ServiceAlert[] = [];
	private static metrics: ServiceMetrics[] = [];
	private static healthChecks: HealthCheckResult[] = [];

	/**
	 * Record service metrics
	 */
	static recordMetrics(serviceName: string, stats: CircuitBreakerStats): void {
		const successRate =
			stats.totalCalls > 0 ? stats.totalSuccesses / stats.totalCalls : 0;

		const failureRate =
			stats.totalCalls > 0 ? stats.totalFailures / stats.totalCalls : 0;

		const metrics: ServiceMetrics = {
			serviceName,
			timestamp: new Date(),
			state: stats.state,
			totalCalls: stats.totalCalls,
			successRate,
			averageResponseTime: stats.averageResponseTime,
			failureRate,
			circuitBreakerTrips: stats.state === 'OPEN' ? 1 : 0,
			lastFailure: stats.lastFailureTime,
			lastSuccess: stats.lastSuccessTime,
		};

		this.metrics.push(metrics);

		// Keep only last 1000 metrics per service
		this.metrics = this.metrics.filter(
			(m) =>
				m.serviceName !== serviceName ||
				this.metrics.filter((m2) => m2.serviceName === serviceName).length <=
					1000
		);

		// Check for alerts
		this.checkForAlerts(serviceName, metrics);
	}

	/**
	 * Perform health check on a service
	 */
	static async performHealthCheck(
		serviceName: string
	): Promise<HealthCheckResult> {
		const startTime = Date.now();

		try {
			// This would be the actual health check implementation
			// For now, we'll simulate it based on circuit breaker state
			const healthStatus = ResilientApiService.getHealthStatus();
			const serviceStats = healthStatus[serviceName.toLowerCase()];

			const responseTime = Date.now() - startTime;
			const healthy =
				serviceStats &&
				(serviceStats.state === 'CLOSED' || serviceStats.state === 'HALF_OPEN');

			const result: HealthCheckResult = {
				serviceName,
				healthy,
				responseTime,
				timestamp: new Date(),
			};

			if (!healthy) {
				result.error = `Service is ${serviceStats?.state || 'unknown'}`;
			}

			this.healthChecks.push(result);

			// Keep only last 100 health checks per service
			this.healthChecks = this.healthChecks.filter(
				(h) =>
					h.serviceName !== serviceName ||
					this.healthChecks.filter((h2) => h2.serviceName === serviceName)
						.length <= 100
			);

			return result;
		} catch (error) {
			const result: HealthCheckResult = {
				serviceName,
				healthy: false,
				responseTime: Date.now() - startTime,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date(),
			};

			this.healthChecks.push(result);
			return result;
		}
	}

	/**
	 * Get current service health status
	 */
	static getServiceHealth(): Record<
		string,
		{
			healthy: boolean;
			lastCheck: Date;
			responseTime: number;
			error?: string;
		}
	> {
		const health: Record<string, any> = {};

		// Get latest health check for each service
		const services = ['orchestrator', 'streaming', 'tools'];

		for (const service of services) {
			const latestCheck = this.healthChecks
				.filter((h) => h.serviceName === service)
				.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

			if (latestCheck) {
				health[service] = {
					healthy: latestCheck.healthy,
					lastCheck: latestCheck.timestamp,
					responseTime: latestCheck.responseTime,
					error: latestCheck.error,
				};
			} else {
				health[service] = {
					healthy: false,
					lastCheck: new Date(0),
					responseTime: 0,
					error: 'No health checks performed',
				};
			}
		}

		return health;
	}

	/**
	 * Get service metrics for a time range
	 */
	static getServiceMetrics(
		serviceName: string,
		timeRange: { start: Date; end: Date }
	): ServiceMetrics[] {
		return this.metrics.filter(
			(m) =>
				m.serviceName === serviceName &&
				m.timestamp >= timeRange.start &&
				m.timestamp <= timeRange.end
		);
	}

	/**
	 * Get active alerts
	 */
	static getActiveAlerts(): ServiceAlert[] {
		return this.alerts.filter((alert) => !alert.resolved);
	}

	/**
	 * Get all alerts for a service
	 */
	static getServiceAlerts(serviceName: string): ServiceAlert[] {
		return this.alerts.filter((alert) => alert.serviceName === serviceName);
	}

	/**
	 * Resolve an alert
	 */
	static resolveAlert(alertId: string): void {
		const alert = this.alerts.find((a) => a.id === alertId);
		if (alert) {
			alert.resolved = true;
			alert.resolvedAt = new Date();
		}
	}

	/**
	 * Get service reliability score (0-100)
	 */
	static getServiceReliabilityScore(serviceName: string): number {
		const recentMetrics = this.metrics
			.filter((m) => m.serviceName === serviceName)
			.slice(-100); // Last 100 metrics

		if (recentMetrics.length === 0) return 0;

		const avgSuccessRate =
			recentMetrics.reduce((sum, m) => sum + m.successRate, 0) /
			recentMetrics.length;
		const avgResponseTime =
			recentMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) /
			recentMetrics.length;

		// Calculate score based on success rate and response time
		let score = avgSuccessRate * 100;

		// Penalize slow response times
		if (avgResponseTime > 2000) {
			score *= 0.8;
		} else if (avgResponseTime > 5000) {
			score *= 0.6;
		}

		return Math.round(Math.max(0, Math.min(100, score)));
	}

	/**
	 * Get overall system health
	 */
	static getOverallHealth(): {
		score: number;
		status: 'healthy' | 'degraded' | 'unhealthy';
		services: Record<string, number>;
	} {
		const services = ['orchestrator', 'streaming', 'tools'];
		const serviceScores: Record<string, number> = {};
		let totalScore = 0;

		for (const service of services) {
			const score = this.getServiceReliabilityScore(service);
			serviceScores[service] = score;
			totalScore += score;
		}

		const avgScore = totalScore / services.length;

		let status: 'healthy' | 'degraded' | 'unhealthy';
		if (avgScore >= 90) {
			status = 'healthy';
		} else if (avgScore >= 70) {
			status = 'degraded';
		} else {
			status = 'unhealthy';
		}

		return {
			score: Math.round(avgScore),
			status,
			services: serviceScores,
		};
	}

	/**
	 * Check for alerts based on metrics
	 */
	private static checkForAlerts(
		serviceName: string,
		metrics: ServiceMetrics
	): void {
		const alerts: ServiceAlert[] = [];

		// Check for circuit breaker open
		if (metrics.state === 'OPEN') {
			alerts.push({
				id: `circuit_open_${serviceName}_${Date.now()}`,
				serviceName,
				type: 'circuit_open',
				severity: 'high',
				message: `Circuit breaker for ${serviceName} is OPEN`,
				timestamp: new Date(),
				resolved: false,
			});
		}

		// Check for high failure rate
		if (metrics.failureRate > this.ALERT_THRESHOLDS.HIGH_FAILURE_RATE) {
			const severity =
				metrics.failureRate > this.ALERT_THRESHOLDS.CRITICAL_FAILURE_RATE
					? 'critical'
					: 'medium';

			alerts.push({
				id: `high_failure_rate_${serviceName}_${Date.now()}`,
				serviceName,
				type: 'high_failure_rate',
				severity,
				message: `High failure rate detected for ${serviceName}: ${(
					metrics.failureRate * 100
				).toFixed(1)}%`,
				timestamp: new Date(),
				resolved: false,
			});
		}

		// Check for slow response times
		if (metrics.averageResponseTime > this.ALERT_THRESHOLDS.SLOW_RESPONSE) {
			alerts.push({
				id: `slow_response_${serviceName}_${Date.now()}`,
				serviceName,
				type: 'slow_response',
				severity: 'medium',
				message: `Slow response time detected for ${serviceName}: ${metrics.averageResponseTime.toFixed(
					0
				)}ms`,
				timestamp: new Date(),
				resolved: false,
			});
		}

		// Add new alerts
		this.alerts.push(...alerts);

		// Keep only last 1000 alerts
		if (this.alerts.length > 1000) {
			this.alerts = this.alerts.slice(-1000);
		}
	}

	/**
	 * Clear old data
	 */
	static clearOldData(maxAge: number = 24 * 60 * 60 * 1000): void {
		const cutoff = new Date(Date.now() - maxAge);

		this.metrics = this.metrics.filter((m) => m.timestamp > cutoff);
		this.healthChecks = this.healthChecks.filter((h) => h.timestamp > cutoff);
		this.alerts = this.alerts.filter((a) => a.timestamp > cutoff);
	}

	/**
	 * Export metrics for external monitoring
	 */
	static exportMetrics(): {
		metrics: ServiceMetrics[];
		alerts: ServiceAlert[];
		healthChecks: HealthCheckResult[];
		overallHealth: any;
	} {
		return {
			metrics: this.metrics,
			alerts: this.alerts,
			healthChecks: this.healthChecks,
			overallHealth: this.getOverallHealth(),
		};
	}
}
