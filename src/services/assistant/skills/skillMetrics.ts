// Skill Metrics - Comprehensive monitoring and analytics for skills
// Tracks performance, usage patterns, and provides insights

import { SkillExecutionResult } from './types';
import { skillManager } from './skillManager';

export interface SkillAnalytics {
	skillId: string;
	performance: {
		averageExecutionTime: number;
		successRate: number;
		cacheHitRate: number;
		usefulnessScore: number;
	};
	usage: {
		totalExecutions: number;
		uniqueUsers: number;
		peakUsageHour: number;
		popularParams: Record<string, number>;
	};
	trends: {
		executionTrend: number[]; // Last 30 days
		usefulnessTrend: number[]; // Last 30 days
		errorTrend: number[]; // Last 30 days
	};
	insights: {
		topPerformingSkills: string[];
		underperformingSkills: string[];
		recommendations: string[];
	};
}

export interface SkillHealthReport {
	overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
	skillCount: number;
	healthySkills: number;
	unhealthySkills: number;
	criticalIssues: string[];
	warnings: string[];
	recommendations: string[];
	lastUpdated: number;
}

export interface PerformanceThresholds {
	executionTime: {
		excellent: number; // ms
		good: number;
		fair: number;
	};
	successRate: {
		excellent: number; // percentage
		good: number;
		fair: number;
	};
	usefulness: {
		excellent: number; // score
		good: number;
		fair: number;
	};
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
	executionTime: {
		excellent: 1000, // 1 second
		good: 3000, // 3 seconds
		fair: 5000, // 5 seconds
	},
	successRate: {
		excellent: 95,
		good: 85,
		fair: 70,
	},
	usefulness: {
		excellent: 4.0,
		good: 3.0,
		fair: 2.0,
	},
};

export class SkillMetricsCollector {
	private static instance: SkillMetricsCollector;
	private executionHistory: SkillExecutionResult[] = [];
	private userSessions: Map<string, Set<string>> = new Map(); // skillId -> userIds
	private hourlyUsage: Map<string, Map<number, number>> = new Map(); // skillId -> hour -> count
	private paramUsage: Map<string, Map<string, number>> = new Map(); // skillId -> param -> count
	private dailyMetrics: Map<string, Map<string, any>> = new Map(); // skillId -> date -> metrics
	private errorHistory: Map<string, any[]> = new Map(); // skillId -> errors
	private alerts: Map<string, any[]> = new Map(); // skillId -> alerts
	private thresholds: PerformanceThresholds;

	private constructor(thresholds: Partial<PerformanceThresholds> = {}) {
		this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
	}

	static getInstance(
		thresholds?: Partial<PerformanceThresholds>
	): SkillMetricsCollector {
		if (!SkillMetricsCollector.instance) {
			SkillMetricsCollector.instance = new SkillMetricsCollector(thresholds);
		}
		return SkillMetricsCollector.instance;
	}

	/**
	 * Record a skill execution
	 */
	recordExecution(
		result: SkillExecutionResult,
		userId?: string,
		params?: Record<string, any>
	): void {
		const timestamp = Date.now();
		const executionRecord = {
			...result,
			metadata: {
				...result.metadata,
				userId,
				timestamp,
			},
		};

		this.executionHistory.push(executionRecord);

		// Track user sessions
		if (userId) {
			if (!this.userSessions.has(result.skillId)) {
				this.userSessions.set(result.skillId, new Set());
			}
			this.userSessions.get(result.skillId)!.add(userId);
		}

		// Track hourly usage
		const hour = new Date().getHours();
		if (!this.hourlyUsage.has(result.skillId)) {
			this.hourlyUsage.set(result.skillId, new Map());
		}
		const hourlyMap = this.hourlyUsage.get(result.skillId)!;
		hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);

		// Track parameter usage
		if (params) {
			if (!this.paramUsage.has(result.skillId)) {
				this.paramUsage.set(result.skillId, new Map());
			}
			const paramMap = this.paramUsage.get(result.skillId)!;
			for (const [key, value] of Object.entries(params)) {
				const paramKey = `${key}=${JSON.stringify(value)}`;
				paramMap.set(paramKey, (paramMap.get(paramKey) || 0) + 1);
			}
		}

		// Track errors
		if (result.error) {
			if (!this.errorHistory.has(result.skillId)) {
				this.errorHistory.set(result.skillId, []);
			}
			this.errorHistory.get(result.skillId)!.push({
				error: result.error,
				timestamp,
				userId,
				params,
			});
		}

		// Update daily metrics
		this.updateDailyMetrics(result.skillId, executionRecord);

		// Check for alerts
		this.checkAlerts(result.skillId, executionRecord);

		// Clean up old data (keep last 30 days)
		this.cleanupOldData();
	}

	/**
	 * Get analytics for a specific skill
	 */
	getSkillAnalytics(skillId: string, days: number = 30): SkillAnalytics | null {
		const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
		const recentExecutions = this.executionHistory.filter(
			(exec) =>
				exec.skillId === skillId && (exec.metadata?.timestamp || 0) > cutoffTime
		);

		if (recentExecutions.length === 0) {
			return null;
		}

		const successfulExecutions = recentExecutions.filter((exec) => !exec.error);
		const executionTimes = recentExecutions.map((exec) => exec.executionTimeMs);
		const usefulnessScores = recentExecutions.map((exec) => exec.usefulness);

		// Calculate performance metrics
		const averageExecutionTime =
			executionTimes.reduce((sum, time) => sum + time, 0) /
			executionTimes.length;
		const successRate =
			(successfulExecutions.length / recentExecutions.length) * 100;
		const averageUsefulness =
			usefulnessScores.reduce((sum, score) => sum + score, 0) /
			usefulnessScores.length;

		// Calculate cache hit rate
		const cachedExecutions = recentExecutions.filter((exec) => exec.cached);
		const cacheHitRate =
			(cachedExecutions.length / recentExecutions.length) * 100;

		// Calculate usage metrics
		const uniqueUsers = this.userSessions.get(skillId)?.size || 0;
		const peakUsageHour = this.getPeakUsageHour(skillId);
		const popularParams = this.getPopularParams(skillId);

		// Calculate trends (simplified - in real implementation, you'd store daily aggregates)
		const executionTrend = this.calculateExecutionTrend(skillId, days);
		const usefulnessTrend = this.calculateUsefulnessTrend(skillId, days);
		const errorTrend = this.calculateErrorTrend(skillId, days);

		return {
			skillId,
			performance: {
				averageExecutionTime,
				successRate,
				cacheHitRate,
				usefulnessScore: averageUsefulness,
			},
			usage: {
				totalExecutions: recentExecutions.length,
				uniqueUsers,
				peakUsageHour,
				popularParams,
			},
			trends: {
				executionTrend,
				usefulnessTrend,
				errorTrend,
			},
			insights: {
				topPerformingSkills: [],
				underperformingSkills: [],
				recommendations: [],
			},
		};
	}

	/**
	 * Get overall skill health report
	 */
	getHealthReport(): SkillHealthReport {
		const allSkills = skillManager.getAllSkills();
		const skillIds = allSkills.map((skill) => skill.id);

		let healthySkills = 0;
		let unhealthySkills = 0;
		const criticalIssues: string[] = [];
		const warnings: string[] = [];
		const recommendations: string[] = [];

		for (const skillId of skillIds) {
			const analytics = this.getSkillAnalytics(skillId);
			if (!analytics) continue;

			const health = this.assessSkillHealth(analytics);

			if (health === 'excellent' || health === 'good') {
				healthySkills++;
			} else {
				unhealthySkills++;
			}

			// Check for critical issues
			if (
				analytics.performance.successRate < this.thresholds.successRate.fair
			) {
				criticalIssues.push(
					`Skill ${skillId} has low success rate: ${analytics.performance.successRate.toFixed(
						1
					)}%`
				);
			}

			if (
				analytics.performance.averageExecutionTime >
				this.thresholds.executionTime.fair
			) {
				criticalIssues.push(
					`Skill ${skillId} has slow execution time: ${analytics.performance.averageExecutionTime.toFixed(
						0
					)}ms`
				);
			}

			// Check for warnings
			if (
				analytics.performance.usefulnessScore < this.thresholds.usefulness.fair
			) {
				warnings.push(
					`Skill ${skillId} has low usefulness score: ${analytics.performance.usefulnessScore.toFixed(
						1
					)}`
				);
			}

			if (analytics.usage.totalExecutions < 10) {
				warnings.push(
					`Skill ${skillId} has low usage: ${analytics.usage.totalExecutions} executions`
				);
			}

			// Generate recommendations
			if (analytics.performance.cacheHitRate < 50) {
				recommendations.push(
					`Consider enabling caching for skill ${skillId} (current hit rate: ${analytics.performance.cacheHitRate.toFixed(
						1
					)}%)`
				);
			}

			if (
				analytics.performance.averageExecutionTime >
				this.thresholds.executionTime.good
			) {
				recommendations.push(
					`Optimize skill ${skillId} execution time (current: ${analytics.performance.averageExecutionTime.toFixed(
						0
					)}ms)`
				);
			}
		}

		const overallHealth = this.calculateOverallHealth(
			healthySkills,
			unhealthySkills,
			criticalIssues.length
		);

		return {
			overallHealth,
			skillCount: allSkills.length,
			healthySkills,
			unhealthySkills,
			criticalIssues,
			warnings,
			recommendations,
			lastUpdated: Date.now(),
		};
	}

	/**
	 * Get top performing skills
	 */
	getTopPerformingSkills(
		limit: number = 10
	): { skillId: string; score: number }[] {
		const allSkills = skillManager.getAllSkills();
		const performanceScores: { skillId: string; score: number }[] = [];

		for (const skill of allSkills) {
			const analytics = this.getSkillAnalytics(skill.id);
			if (!analytics) continue;

			// Calculate composite score
			const score = this.calculatePerformanceScore(analytics);
			performanceScores.push({ skillId: skill.id, score });
		}

		return performanceScores.sort((a, b) => b.score - a.score).slice(0, limit);
	}

	/**
	 * Get skill usage patterns
	 */
	getUsagePatterns(skillId: string): {
		hourlyDistribution: number[];
		dailyDistribution: number[];
		weeklyDistribution: number[];
	} {
		const hourlyMap = this.hourlyUsage.get(skillId) || new Map();
		const hourlyDistribution = Array.from(
			{ length: 24 },
			(_, hour) => hourlyMap.get(hour) || 0
		);

		// For daily and weekly patterns, you'd need to store more granular data
		// This is a simplified implementation
		const dailyDistribution = Array.from({ length: 7 }, () => 0);
		const weeklyDistribution = Array.from({ length: 52 }, () => 0);

		return {
			hourlyDistribution,
			dailyDistribution,
			weeklyDistribution,
		};
	}

	/**
	 * Export metrics data
	 */
	exportMetrics(format: 'json' | 'csv' = 'json'): string {
		const data = {
			executionHistory: this.executionHistory,
			userSessions: Object.fromEntries(
				Array.from(this.userSessions.entries()).map(([skillId, users]) => [
					skillId,
					Array.from(users),
				])
			),
			hourlyUsage: Object.fromEntries(
				Array.from(this.hourlyUsage.entries()).map(([skillId, hours]) => [
					skillId,
					Object.fromEntries(hours),
				])
			),
			paramUsage: Object.fromEntries(
				Array.from(this.paramUsage.entries()).map(([skillId, params]) => [
					skillId,
					Object.fromEntries(params),
				])
			),
			exportedAt: new Date().toISOString(),
		};

		if (format === 'csv') {
			return this.convertToCSV(data);
		}

		return JSON.stringify(data, null, 2);
	}

	/**
	 * Get error history for a skill
	 */
	getErrorHistory(skillId: string, limit: number = 50): any[] {
		const errors = this.errorHistory.get(skillId) || [];
		return errors.slice(-limit);
	}

	/**
	 * Get alerts for a skill
	 */
	getAlerts(skillId: string, limit: number = 50): any[] {
		const alerts = this.alerts.get(skillId) || [];
		return alerts.slice(-limit);
	}

	/**
	 * Get daily metrics for a skill
	 */
	getDailyMetrics(skillId: string, days: number = 7): any[] {
		const dailyMap = this.dailyMetrics.get(skillId);
		if (!dailyMap) return [];

		const metrics: any[] = [];
		const now = new Date();

		for (let i = days - 1; i >= 0; i--) {
			const date = new Date(now);
			date.setDate(date.getDate() - i);
			const dateKey = date.toISOString().split('T')[0];
			const dayMetrics = dailyMap.get(dateKey);

			if (dayMetrics) {
				metrics.push({
					date: dateKey,
					...dayMetrics,
					uniqueUserCount: dayMetrics.uniqueUserCount || 0,
				});
			}
		}

		return metrics;
	}

	/**
	 * Get real-time monitoring data
	 */
	getRealTimeMonitoring(): {
		totalExecutions: number;
		activeSkills: number;
		errorRate: number;
		averageResponseTime: number;
		topSkills: { skillId: string; executions: number }[];
	} {
		const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
		const recentExecutions = this.executionHistory.filter(
			(exec) => (exec.metadata?.timestamp || 0) > last24Hours
		);

		const skillCounts = new Map<string, number>();
		let totalExecutionTime = 0;
		let errorCount = 0;

		for (const exec of recentExecutions) {
			skillCounts.set(exec.skillId, (skillCounts.get(exec.skillId) || 0) + 1);
			totalExecutionTime += exec.executionTimeMs;
			if (exec.error) errorCount++;
		}

		const topSkills = Array.from(skillCounts.entries())
			.map(([skillId, executions]) => ({ skillId, executions }))
			.sort((a, b) => b.executions - a.executions)
			.slice(0, 5);

		return {
			totalExecutions: recentExecutions.length,
			activeSkills: skillCounts.size,
			errorRate:
				recentExecutions.length > 0
					? (errorCount / recentExecutions.length) * 100
					: 0,
			averageResponseTime:
				recentExecutions.length > 0
					? totalExecutionTime / recentExecutions.length
					: 0,
			topSkills,
		};
	}

	/**
	 * Get skill comparison data
	 */
	getSkillComparison(skillIds: string[]): {
		skillId: string;
		executions: number;
		successRate: number;
		averageTime: number;
		usefulness: number;
	}[] {
		const comparison: any[] = [];

		for (const skillId of skillIds) {
			const analytics = this.getSkillAnalytics(skillId);
			if (!analytics) continue;

			comparison.push({
				skillId,
				executions: analytics.usage.totalExecutions,
				successRate: analytics.performance.successRate,
				averageTime: analytics.performance.averageExecutionTime,
				usefulness: analytics.performance.usefulnessScore,
			});
		}

		return comparison;
	}

	/**
	 * Clear all metrics data
	 */
	clearMetrics(): void {
		this.executionHistory = [];
		this.userSessions.clear();
		this.hourlyUsage.clear();
		this.paramUsage.clear();
		this.dailyMetrics.clear();
		this.errorHistory.clear();
		this.alerts.clear();
	}

	// Private helper methods

	private assessSkillHealth(
		analytics: SkillAnalytics
	): 'excellent' | 'good' | 'fair' | 'poor' {
		const { performance } = analytics;

		let score = 0;

		// Execution time score
		if (
			performance.averageExecutionTime <=
			this.thresholds.executionTime.excellent
		) {
			score += 3;
		} else if (
			performance.averageExecutionTime <= this.thresholds.executionTime.good
		) {
			score += 2;
		} else if (
			performance.averageExecutionTime <= this.thresholds.executionTime.fair
		) {
			score += 1;
		}

		// Success rate score
		if (performance.successRate >= this.thresholds.successRate.excellent) {
			score += 3;
		} else if (performance.successRate >= this.thresholds.successRate.good) {
			score += 2;
		} else if (performance.successRate >= this.thresholds.successRate.fair) {
			score += 1;
		}

		// Usefulness score
		if (performance.usefulnessScore >= this.thresholds.usefulness.excellent) {
			score += 3;
		} else if (performance.usefulnessScore >= this.thresholds.usefulness.good) {
			score += 2;
		} else if (performance.usefulnessScore >= this.thresholds.usefulness.fair) {
			score += 1;
		}

		// Cache hit rate bonus
		if (performance.cacheHitRate > 70) {
			score += 1;
		}

		if (score >= 8) return 'excellent';
		if (score >= 6) return 'good';
		if (score >= 4) return 'fair';
		return 'poor';
	}

	private calculateOverallHealth(
		healthy: number,
		unhealthy: number,
		criticalIssues: number
	): 'excellent' | 'good' | 'fair' | 'poor' {
		const total = healthy + unhealthy;
		if (total === 0) return 'poor';

		const healthRatio = healthy / total;

		if (criticalIssues > 0) return 'poor';
		if (healthRatio >= 0.9) return 'excellent';
		if (healthRatio >= 0.7) return 'good';
		if (healthRatio >= 0.5) return 'fair';
		return 'poor';
	}

	private calculatePerformanceScore(analytics: SkillAnalytics): number {
		const { performance, usage } = analytics;

		// Weighted score based on multiple factors
		const executionTimeScore = Math.max(
			0,
			1 -
				performance.averageExecutionTime /
					this.thresholds.executionTime.excellent
		);
		const successRateScore = performance.successRate / 100;
		const usefulnessScore = performance.usefulnessScore / 5; // Assuming max usefulness is 5
		const cacheScore = performance.cacheHitRate / 100;
		const usageScore = Math.min(1, usage.totalExecutions / 100); // Normalize usage

		return (
			(executionTimeScore * 0.2 +
				successRateScore * 0.3 +
				usefulnessScore * 0.25 +
				cacheScore * 0.15 +
				usageScore * 0.1) *
			100
		);
	}

	private getPeakUsageHour(skillId: string): number {
		const hourlyMap = this.hourlyUsage.get(skillId);
		if (!hourlyMap || hourlyMap.size === 0) return 0;

		let maxCount = 0;
		let peakHour = 0;

		for (const [hour, count] of hourlyMap) {
			if (count > maxCount) {
				maxCount = count;
				peakHour = hour;
			}
		}

		return peakHour;
	}

	private getPopularParams(skillId: string): Record<string, number> {
		const paramMap = this.paramUsage.get(skillId);
		return paramMap ? Object.fromEntries(paramMap) : {};
	}

	private calculateExecutionTrend(skillId: string, days: number): number[] {
		const dailyMap = this.dailyMetrics.get(skillId);
		if (!dailyMap) {
			return Array.from({ length: days }, () => 0);
		}

		const trend: number[] = [];
		const now = new Date();

		for (let i = days - 1; i >= 0; i--) {
			const date = new Date(now);
			date.setDate(date.getDate() - i);
			const dateKey = date.toISOString().split('T')[0];
			const dayMetrics = dailyMap.get(dateKey);
			trend.push(dayMetrics?.executionCount || 0);
		}

		return trend;
	}

	private calculateUsefulnessTrend(skillId: string, days: number): number[] {
		const dailyMap = this.dailyMetrics.get(skillId);
		if (!dailyMap) {
			return Array.from({ length: days }, () => 0);
		}

		const trend: number[] = [];
		const now = new Date();

		for (let i = days - 1; i >= 0; i--) {
			const date = new Date(now);
			date.setDate(date.getDate() - i);
			const dateKey = date.toISOString().split('T')[0];
			const dayMetrics = dailyMap.get(dateKey);
			trend.push(dayMetrics?.averageUsefulness || 0);
		}

		return trend;
	}

	private calculateErrorTrend(skillId: string, days: number): number[] {
		const dailyMap = this.dailyMetrics.get(skillId);
		if (!dailyMap) {
			return Array.from({ length: days }, () => 0);
		}

		const trend: number[] = [];
		const now = new Date();

		for (let i = days - 1; i >= 0; i--) {
			const date = new Date(now);
			date.setDate(date.getDate() - i);
			const dateKey = date.toISOString().split('T')[0];
			const dayMetrics = dailyMap.get(dateKey);
			trend.push(dayMetrics?.errorCount || 0);
		}

		return trend;
	}

	private cleanupOldData(): void {
		const cutoffTime = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
		this.executionHistory = this.executionHistory.filter(
			(exec) => (exec.metadata?.timestamp || 0) > cutoffTime
		);
	}

	private updateDailyMetrics(
		skillId: string,
		execution: SkillExecutionResult
	): void {
		const date = new Date(execution.metadata?.timestamp || Date.now());
		const dateKey = date.toISOString().split('T')[0];

		if (!this.dailyMetrics.has(skillId)) {
			this.dailyMetrics.set(skillId, new Map());
		}

		const dailyMap = this.dailyMetrics.get(skillId)!;
		const existing = dailyMap.get(dateKey) || {
			executionCount: 0,
			totalExecutionTime: 0,
			successCount: 0,
			errorCount: 0,
			totalUsefulness: 0,
			uniqueUsers: new Set(),
		};

		existing.executionCount++;
		existing.totalExecutionTime += execution.executionTimeMs;
		existing.totalUsefulness += execution.usefulness;

		if (execution.error) {
			existing.errorCount++;
		} else {
			existing.successCount++;
		}

		if (execution.metadata?.userId) {
			existing.uniqueUsers.add(execution.metadata.userId);
		}

		// Calculate averages
		existing.averageExecutionTime =
			existing.totalExecutionTime / existing.executionCount;
		existing.averageUsefulness =
			existing.totalUsefulness / existing.executionCount;
		existing.successRate =
			(existing.successCount / existing.executionCount) * 100;
		existing.uniqueUserCount = existing.uniqueUsers.size;

		dailyMap.set(dateKey, existing);
	}

	private checkAlerts(skillId: string, execution: SkillExecutionResult): void {
		const alerts: any[] = [];

		// Check for performance alerts
		if (execution.executionTimeMs > this.thresholds.executionTime.fair) {
			alerts.push({
				type: 'performance',
				severity: 'warning',
				message: `Slow execution: ${execution.executionTimeMs}ms`,
				timestamp: execution.metadata?.timestamp || Date.now(),
			});
		}

		// Check for error alerts
		if (execution.error) {
			alerts.push({
				type: 'error',
				severity: 'error',
				message: `Execution failed: ${execution.error}`,
				timestamp: execution.metadata?.timestamp || Date.now(),
			});
		}

		// Check for low usefulness alerts
		if (execution.usefulness < this.thresholds.usefulness.fair) {
			alerts.push({
				type: 'usefulness',
				severity: 'warning',
				message: `Low usefulness score: ${execution.usefulness}`,
				timestamp: execution.metadata?.timestamp || Date.now(),
			});
		}

		// Store alerts
		if (alerts.length > 0) {
			if (!this.alerts.has(skillId)) {
				this.alerts.set(skillId, []);
			}
			this.alerts.get(skillId)!.push(...alerts);
		}
	}

	private convertToCSV(data: any): string {
		// Simplified CSV conversion
		const headers = [
			'skillId',
			'executionTime',
			'success',
			'usefulness',
			'timestamp',
		];
		const rows = this.executionHistory.map((exec) => [
			exec.skillId,
			exec.executionTimeMs,
			!exec.error,
			exec.usefulness,
			exec.metadata?.timestamp || '',
		]);

		return [headers, ...rows].map((row) => row.join(',')).join('\n');
	}
}

// Export singleton instance
export const skillMetrics = SkillMetricsCollector.getInstance();
