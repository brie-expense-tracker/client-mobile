import { logger } from '../../utils/logger';
// analyticsService.ts - Lightweight telemetry for chat quality monitoring
// No PII collected, focused on actionable insights for improving chat experience

export interface ChatAnalyticsEvent {
	// Core chat metrics
	intent: string;
	usedGrounding: boolean;
	model: string;
	tokensIn: number;
	tokensOut: number;

	// Response quality indicators
	hadActions: boolean;
	hadCard: boolean;
	fallback: boolean;

	// User satisfaction (set when user provides feedback)
	userSatisfaction?: 'thumbs_up' | 'thumbs_down';
	dissatisfactionReason?: string;

	// Performance metrics
	responseTimeMs: number;
	groundingConfidence?: number;

	// Context indicators
	messageLength: number;
	hasFinancialData: boolean;

	// Error tracking
	error?: {
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
		retryable: boolean;
		retryCount?: number;
		severity: 'low' | 'medium' | 'high' | 'critical';
	};

	// Enhanced performance metrics
	performance?: {
		modelTier: 'mini' | 'std' | 'pro';
		totalCost: number;
		processingSteps: string[];
		cacheHit?: boolean;
		streamingTime?: number;
		firstTokenTime?: number;
	};

	// User engagement metrics
	engagement?: {
		timeSpent: number;
		interactions: number;
		scrollDepth?: number;
		actionsTaken: number;
		conversionRate?: number;
	};

	// Enhanced critic validation data
	criticPassed?: boolean;
	guardFailed?: string;
	escalationTriggered?: boolean;
	escalationReason?: string;
	numericGuardrails?: {
		amountsNonNegative: boolean;
		sumsMatchFactPack: boolean;
		datesInsideWindow: boolean;
		budgetLimitsRespected: boolean;
	};
	claimTypes?: {
		hasForbiddenPhrasing: boolean;
		forbiddenClaims: string[];
		riskLevel: 'low' | 'medium' | 'high';
	};

	// Insight and fact pack tracking
	insightId?: string;
	factPackId?: string;
	insightType?: string;
	insightTitle?: string;

	// Timestamp for trend analysis
	timestamp: number;

	// Session context (non-PII)
	sessionId: string;
	conversationLength: number;
}

export interface DissatisfactionReason {
	tag: 'too_vague' | 'wrong_numbers' | 'not_timely' | 'other';
	description: string;
}

export interface ErrorAnalytics {
	errorType: string;
	frequency: number;
	lastOccurred: Date;
	recoveryRate: number;
	impact: 'low' | 'medium' | 'high' | 'critical';
	trend: 'increasing' | 'decreasing' | 'stable';
}

export interface PerformanceMetrics {
	averageResponseTime: number;
	p95ResponseTime: number;
	p99ResponseTime: number;
	throughput: number;
	errorRate: number;
	costPerRequest: number;
	cacheHitRate: number;
	streamingEfficiency: number;
}

export interface RealTimeAlert {
	id: string;
	type:
		| 'error_spike'
		| 'performance_degradation'
		| 'satisfaction_drop'
		| 'cost_spike';
	severity: 'low' | 'medium' | 'high' | 'critical';
	message: string;
	timestamp: Date;
	threshold: number;
	actualValue: number;
	resolved: boolean;
}

export interface AnalyticsReport {
	period: {
		start: Date;
		end: Date;
	};
	summary: {
		totalEvents: number;
		uniqueUsers: number;
		averageSatisfaction: number;
		totalCost: number;
		errorRate: number;
	};
	performance: PerformanceMetrics;
	errors: ErrorAnalytics[];
	trends: {
		responseTime: 'improving' | 'degrading' | 'stable';
		satisfaction: 'improving' | 'degrading' | 'stable';
		cost: 'increasing' | 'decreasing' | 'stable';
		usage: 'increasing' | 'decreasing' | 'stable';
	};
	recommendations: string[];
}

export class AnalyticsService {
	private sessionId: string;
	private conversationLength: number = 0;
	private events: ChatAnalyticsEvent[] = [];
	private isEnabled: boolean = true;
	private alerts: RealTimeAlert[] = [];
	private errorMetrics: Map<string, ErrorAnalytics> = new Map();
	private performanceHistory: PerformanceMetrics[] = [];

	constructor() {
		this.sessionId = this.generateSessionId();
	}

	/**
	 * Generate a unique session ID for this conversation
	 */
	private generateSessionId(): string {
		return `chat_session_${Date.now()}_${Math.random()
			.toString(36)
			.substr(2, 9)}`;
	}

	/**
	 * Log a chat event with all relevant metrics
	 */
	logChat(
		event: Omit<
			ChatAnalyticsEvent,
			'timestamp' | 'sessionId' | 'conversationLength'
		>
	): void {
		if (!this.isEnabled) return;

		const chatEvent: ChatAnalyticsEvent = {
			...event,
			timestamp: Date.now(),
			sessionId: this.sessionId,
			conversationLength: this.conversationLength,
		};

		this.events.push(chatEvent);
		this.conversationLength++;

		// Emit to console for development/debugging
		logger.debug('📊 [Analytics] Chat Event:', {
			intent: chatEvent.intent,
			model: chatEvent.model,
			tokens: `${chatEvent.tokensIn}→${chatEvent.tokensOut}`,
			quality: {
				grounding: chatEvent.usedGrounding,
				actions: chatEvent.hadActions,
				cards: chatEvent.hadCard,
				fallback: chatEvent.fallback,
				critic: chatEvent.criticPassed,
				escalation: chatEvent.escalationTriggered,
			},
			critic: {
				passed: chatEvent.criticPassed,
				guardFailed: chatEvent.guardFailed,
				escalationReason: chatEvent.escalationReason,
				numericGuardrails: chatEvent.numericGuardrails,
				claimTypes: chatEvent.claimTypes,
			},
			satisfaction: chatEvent.userSatisfaction,
			responseTime: `${chatEvent.responseTimeMs}ms`,
		});

		// In production, this would send to your analytics backend
		this.sendToAnalytics(chatEvent);
	}

	/**
	 * Log user satisfaction feedback
	 */
	logUserSatisfaction(
		messageId: string,
		satisfaction: 'thumbs_up' | 'thumbs_down',
		reason?: DissatisfactionReason
	): void {
		if (!this.isEnabled) return;

		// Find the corresponding chat event and update it
		const eventIndex = this.events.findIndex(
			(e) => e.timestamp.toString() === messageId || e.sessionId === messageId
		);

		if (eventIndex !== -1) {
			this.events[eventIndex].userSatisfaction = satisfaction;
			if (reason) {
				this.events[eventIndex].dissatisfactionReason = reason.tag;
			}
		}

		// Log satisfaction event
		logger.debug('📊 [Analytics] User Satisfaction:', {
			satisfaction,
			reason: reason?.tag,
			description: reason?.description,
		});

		// Send satisfaction update to analytics
		this.sendSatisfactionUpdate(messageId, satisfaction, reason);
	}

	/**
	 * Get analytics summary for current session
	 */
	getSessionSummary(): {
		totalEvents: number;
		averageResponseTime: number;
		satisfactionRate: number;
		groundingUsage: number;
		fallbackRate: number;
		mostCommonIntent: string;
		qualityIssues: string[];
	} {
		if (this.events.length === 0) {
			return {
				totalEvents: 0,
				averageResponseTime: 0,
				satisfactionRate: 0,
				groundingUsage: 0,
				fallbackRate: 0,
				mostCommonIntent: '',
				qualityIssues: [],
			};
		}

		const totalEvents = this.events.length;
		const averageResponseTime =
			this.events.reduce((sum, e) => sum + e.responseTimeMs, 0) / totalEvents;

		const satisfactionEvents = this.events.filter((e) => e.userSatisfaction);
		const satisfactionRate =
			satisfactionEvents.length > 0
				? satisfactionEvents.filter((e) => e.userSatisfaction === 'thumbs_up')
						.length / satisfactionEvents.length
				: 0;

		const groundingUsage =
			this.events.filter((e) => e.usedGrounding).length / totalEvents;
		const fallbackRate =
			this.events.filter((e) => e.fallback).length / totalEvents;

		// Find most common intent
		const intentCounts = this.events.reduce((counts, e) => {
			counts[e.intent] = (counts[e.intent] || 0) + 1;
			return counts;
		}, {} as Record<string, number>);

		const mostCommonIntent =
			Object.entries(intentCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || '';

		// Identify quality issues
		const qualityIssues: string[] = [];
		if (fallbackRate > 0.3) qualityIssues.push('High fallback rate');
		if (satisfactionRate < 0.7) qualityIssues.push('Low satisfaction rate');
		if (groundingUsage < 0.5) qualityIssues.push('Low grounding usage');

		return {
			totalEvents,
			averageResponseTime,
			satisfactionRate,
			groundingUsage,
			fallbackRate,
			mostCommonIntent,
			qualityIssues,
		};
	}

	/**
	 * Get events that need attention (low satisfaction, high fallback, etc.)
	 */
	getEventsNeedingAttention(): ChatAnalyticsEvent[] {
		return this.events.filter(
			(event) =>
				event.userSatisfaction === 'thumbs_down' ||
				event.fallback ||
				(event.groundingConfidence && event.groundingConfidence < 0.5)
		);
	}

	/**
	 * Export analytics data (for debugging/development)
	 */
	exportAnalytics(): ChatAnalyticsEvent[] {
		return [...this.events];
	}

	/**
	 * Clear analytics data (for privacy/cleanup)
	 */
	clearAnalytics(): void {
		this.events = [];
		this.conversationLength = 0;
		this.sessionId = this.generateSessionId();
	}

	/**
	 * Enable/disable analytics
	 */
	setEnabled(enabled: boolean): void {
		this.isEnabled = enabled;
	}

	/**
	 * Send event to analytics backend (production implementation)
	 */
	private sendToAnalytics(event: ChatAnalyticsEvent): void {
		// In production, this would send to your analytics service
		// For now, we just log to console
		if (process.env.NODE_ENV === 'production') {
			// Example: send to analytics service
			// analytics.track('chat_response', event);
		}
	}

	/**
	 * Send satisfaction update to analytics backend
	 */
	private sendSatisfactionUpdate(
		messageId: string,
		satisfaction: 'thumbs_up' | 'thumbs_down',
		reason?: DissatisfactionReason
	): void {
		// In production, this would send to your analytics service
		if (process.env.NODE_ENV === 'production') {
			// Example: send to analytics service
			// analytics.track('user_satisfaction', { messageId, satisfaction, reason });
		}
	}

	/**
	 * Log an error event with detailed tracking
	 */
	logError(
		error: {
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
			retryable: boolean;
			retryCount?: number;
			severity: 'low' | 'medium' | 'high' | 'critical';
		},
		context?: {
			intent?: string;
			model?: string;
			responseTime?: number;
		}
	): void {
		if (!this.isEnabled) return;

		// Update error metrics
		const existing = this.errorMetrics.get(error.type);
		if (existing) {
			existing.frequency += 1;
			existing.lastOccurred = new Date();
		} else {
			this.errorMetrics.set(error.type, {
				errorType: error.type,
				frequency: 1,
				lastOccurred: new Date(),
				recoveryRate: 0,
				impact:
					error.severity === 'critical' || error.severity === 'high'
						? 'high'
						: 'medium',
				trend: 'stable',
			});
		}

		// Check for error spike alerts
		this.checkErrorSpikeAlert(error);

		logger.debug('🚨 [Analytics] Error Event:', {
			type: error.type,
			message: error.message,
			severity: error.severity,
			retryable: error.retryable,
			context,
		});
	}

	/**
	 * Log performance metrics
	 */
	logPerformance(metrics: {
		responseTime: number;
		modelTier: 'mini' | 'std' | 'pro';
		totalCost: number;
		cacheHit?: boolean;
		streamingTime?: number;
		firstTokenTime?: number;
		processingSteps?: string[];
	}): void {
		if (!this.isEnabled) return;

		// Update performance history
		const performanceMetrics: PerformanceMetrics = {
			averageResponseTime: metrics.responseTime,
			p95ResponseTime: metrics.responseTime, // Simplified for now
			p99ResponseTime: metrics.responseTime,
			throughput: 1, // Events per minute
			errorRate: 0,
			costPerRequest: metrics.totalCost,
			cacheHitRate: metrics.cacheHit ? 1 : 0,
			streamingEfficiency: metrics.streamingTime
				? metrics.firstTokenTime! / metrics.streamingTime
				: 1,
		};

		this.performanceHistory.push(performanceMetrics);

		// Keep only last 100 performance entries
		if (this.performanceHistory.length > 100) {
			this.performanceHistory = this.performanceHistory.slice(-100);
		}

		// Check for performance degradation alerts
		this.checkPerformanceAlert(performanceMetrics);

		logger.debug('⚡ [Analytics] Performance Metrics:', {
			responseTime: metrics.responseTime,
			modelTier: metrics.modelTier,
			cost: metrics.totalCost,
			cacheHit: metrics.cacheHit,
			streamingEfficiency: performanceMetrics.streamingEfficiency,
		});
	}

	/**
	 * Get error analytics summary
	 */
	getErrorAnalytics(): ErrorAnalytics[] {
		return Array.from(this.errorMetrics.values());
	}

	/**
	 * Get performance metrics
	 */
	getPerformanceMetrics(): PerformanceMetrics {
		if (this.performanceHistory.length === 0) {
			return {
				averageResponseTime: 0,
				p95ResponseTime: 0,
				p99ResponseTime: 0,
				throughput: 0,
				errorRate: 0,
				costPerRequest: 0,
				cacheHitRate: 0,
				streamingEfficiency: 0,
			};
		}

		const recent = this.performanceHistory.slice(-10); // Last 10 entries
		const avgResponseTime =
			recent.reduce((sum, m) => sum + m.averageResponseTime, 0) / recent.length;
		const avgCost =
			recent.reduce((sum, m) => sum + m.costPerRequest, 0) / recent.length;
		const avgCacheHit =
			recent.reduce((sum, m) => sum + m.cacheHitRate, 0) / recent.length;

		return {
			averageResponseTime: avgResponseTime,
			p95ResponseTime: avgResponseTime * 1.5, // Simplified calculation
			p99ResponseTime: avgResponseTime * 2,
			throughput: recent.length,
			errorRate: this.calculateErrorRate(),
			costPerRequest: avgCost,
			cacheHitRate: avgCacheHit,
			streamingEfficiency:
				recent.reduce((sum, m) => sum + m.streamingEfficiency, 0) /
				recent.length,
		};
	}

	/**
	 * Get active alerts
	 */
	getActiveAlerts(): RealTimeAlert[] {
		return this.alerts.filter((alert) => !alert.resolved);
	}

	/**
	 * Resolve an alert
	 */
	resolveAlert(alertId: string): void {
		const alert = this.alerts.find((a) => a.id === alertId);
		if (alert) {
			alert.resolved = true;
		}
	}

	/**
	 * Generate analytics report
	 */
	generateReport(period: { start: Date; end: Date }): AnalyticsReport {
		const periodEvents = this.events.filter(
			(e) =>
				e.timestamp >= period.start.getTime() &&
				e.timestamp <= period.end.getTime()
		);

		const performance = this.getPerformanceMetrics();
		const errors = this.getErrorAnalytics();
		const trends = this.calculateTrends();

		return {
			period,
			summary: {
				totalEvents: periodEvents.length,
				uniqueUsers: new Set(periodEvents.map((e) => e.sessionId)).size,
				averageSatisfaction: this.calculateAverageSatisfaction(periodEvents),
				totalCost: periodEvents.reduce(
					(sum, e) => sum + (e.performance?.totalCost || 0),
					0
				),
				errorRate: this.calculateErrorRate(),
			},
			performance,
			errors,
			trends,
			recommendations: this.generateRecommendations(
				performance,
				errors,
				trends
			),
		};
	}

	/**
	 * Check for error spike alerts
	 */
	private checkErrorSpikeAlert(error: any): void {
		const recentErrors = this.events.filter(
			(e) => e.timestamp > Date.now() - 5 * 60 * 1000 && e.error // Last 5 minutes
		);

		if (recentErrors.length > 10) {
			// More than 10 errors in 5 minutes
			const alert: RealTimeAlert = {
				id: `error_spike_${Date.now()}`,
				type: 'error_spike',
				severity: 'high',
				message: `High error rate detected: ${recentErrors.length} errors in the last 5 minutes`,
				timestamp: new Date(),
				threshold: 10,
				actualValue: recentErrors.length,
				resolved: false,
			};

			this.alerts.push(alert);
			logger.warn('🚨 [Analytics] Error Spike Alert:', alert);
		}
	}

	/**
	 * Check for performance degradation alerts
	 */
	private checkPerformanceAlert(metrics: PerformanceMetrics): void {
		if (metrics.averageResponseTime > 5000) {
			// More than 5 seconds
			const alert: RealTimeAlert = {
				id: `performance_degradation_${Date.now()}`,
				type: 'performance_degradation',
				severity: 'medium',
				message: `Performance degradation detected: ${metrics.averageResponseTime}ms average response time`,
				timestamp: new Date(),
				threshold: 5000,
				actualValue: metrics.averageResponseTime,
				resolved: false,
			};

			this.alerts.push(alert);
			logger.warn('🚨 [Analytics] Performance Alert:', alert);
		}
	}

	/**
	 * Calculate error rate
	 */
	private calculateErrorRate(): number {
		if (this.events.length === 0) return 0;
		const errorEvents = this.events.filter((e) => e.error);
		return errorEvents.length / this.events.length;
	}

	/**
	 * Calculate average satisfaction
	 */
	private calculateAverageSatisfaction(events: ChatAnalyticsEvent[]): number {
		const satisfactionEvents = events.filter((e) => e.userSatisfaction);
		if (satisfactionEvents.length === 0) return 0;

		const positive = satisfactionEvents.filter(
			(e) => e.userSatisfaction === 'thumbs_up'
		).length;
		return positive / satisfactionEvents.length;
	}

	/**
	 * Calculate trends
	 */
	private calculateTrends(): AnalyticsReport['trends'] {
		// Simplified trend calculation
		return {
			responseTime: 'stable',
			satisfaction: 'stable',
			cost: 'stable',
			usage: 'stable',
		};
	}

	/**
	 * Generate recommendations
	 */
	private generateRecommendations(
		performance: PerformanceMetrics,
		errors: ErrorAnalytics[],
		trends: AnalyticsReport['trends']
	): string[] {
		const recommendations: string[] = [];

		if (performance.averageResponseTime > 3000) {
			recommendations.push(
				'Consider optimizing model selection or implementing caching to improve response times'
			);
		}

		if (performance.costPerRequest > 0.01) {
			recommendations.push(
				'Review model usage and consider using more cost-effective models for simple queries'
			);
		}

		if (errors.some((e) => e.impact === 'high')) {
			recommendations.push(
				'Address high-impact errors to improve user experience'
			);
		}

		if (performance.cacheHitRate < 0.3) {
			recommendations.push('Implement more aggressive caching strategies');
		}

		return recommendations;
	}
}

// Singleton instance
export const analyticsService = new AnalyticsService();

// Convenience function for logging chat events
export function logChat(
	event: Omit<
		ChatAnalyticsEvent,
		'timestamp' | 'sessionId' | 'conversationLength'
	>
): void {
	analyticsService.logChat(event);
}

// Convenience function for logging user satisfaction
export function logUserSatisfaction(
	messageId: string,
	satisfaction: 'thumbs_up' | 'thumbs_down',
	reason?: DissatisfactionReason
): void {
	analyticsService.logUserSatisfaction(messageId, satisfaction, reason);
}

// Convenience function for logging errors
export function logError(
	error: {
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
		retryable: boolean;
		retryCount?: number;
		severity: 'low' | 'medium' | 'high' | 'critical';
	},
	context?: {
		intent?: string;
		model?: string;
		responseTime?: number;
	}
): void {
	analyticsService.logError(error, context);
}

// Convenience function for logging performance metrics
export function logPerformance(metrics: {
	responseTime: number;
	modelTier: 'mini' | 'std' | 'pro';
	totalCost: number;
	cacheHit?: boolean;
	streamingTime?: number;
	firstTokenTime?: number;
	processingSteps?: string[];
}): void {
	analyticsService.logPerformance(metrics);
}
