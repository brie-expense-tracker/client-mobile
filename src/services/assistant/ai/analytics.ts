import { logger } from '../../../../utils/logger';
// ai/analytics.ts - Analytics you should log for monitoring and optimization

export interface CascadeAnalytics {
	// Writer events
	writer_done: {
		intent: string;
		tokens_in: number;
		tokens_out: number;
		used_fact_ids: string[];
		content_kind: 'fact' | 'strategy' | 'calculation' | 'clarification';
		requires_clarification: boolean;
		timestamp: number;
		session_id: string;
	};

	// Guard events
	guard_fail: {
		failures: string[];
		intent: string;
		timestamp: number;
		session_id: string;
		guard_type: 'numbers' | 'window' | 'claims';
		severity: 'low' | 'medium' | 'high' | 'critical';
	};

	// Critic events
	critic_done: {
		ok: boolean;
		risk: 'low' | 'medium' | 'high';
		recommend_escalation: boolean;
		issues: { type: string; note: string }[];
		confidence: number;
		timestamp: number;
		session_id: string;
	};

	// Decision events
	decision: {
		path: 'return' | 'clarify' | 'escalate';
		reason?: string;
		timestamp: number;
		session_id: string;
		guard_failures: string[];
		critic_issues: string[];
		confidence: number;
	};

	// Improver events
	improver_used: {
		intent: string;
		tokens_in: number;
		tokens_out: number;
		escalation_reason: string;
		improvement_type: 'rewrite' | 'clarify' | 'escalate';
		timestamp: number;
		session_id: string;
	};

	// User outcome events
	user_outcome: {
		resolved: boolean;
		cta?: string;
		timestamp: number;
		session_id: string;
		path_taken: string;
		total_tokens: number;
		total_cost: number;
		user_satisfaction?: 'thumbs_up' | 'thumbs_down';
		dissatisfaction_reason?: string;
	};

	// New: Cascade flow events
	cascade_start: {
		intent: string;
		user_query: string;
		fact_pack_size: number;
		timestamp: number;
		session_id: string;
	};

	cascade_complete: {
		intent: string;
		final_path: 'return' | 'clarify' | 'escalate';
		total_processing_time_ms: number;
		total_tokens: number;
		total_cost: number;
		timestamp: number;
		session_id: string;
	};

	// New: Performance metrics
	performance_metrics: {
		writer_time_ms: number;
		guard_time_ms: number;
		critic_time_ms: number;
		decision_time_ms: number;
		total_time_ms: number;
		memory_usage_mb?: number;
		timestamp: number;
		session_id: string;
	};
}

export class CascadeAnalyticsService {
	private sessionId: string;
	private events: CascadeAnalytics[keyof CascadeAnalytics][] = [];
	private startTime: number;
	private performanceMetrics: Partial<CascadeAnalytics['performance_metrics']> =
		{};

	constructor(sessionId?: string) {
		this.sessionId = sessionId || this.generateSessionId();
		this.startTime = Date.now();
	}

	/**
	 * Log cascade start
	 */
	logCascadeStart(
		data: Omit<CascadeAnalytics['cascade_start'], 'timestamp' | 'session_id'>
	) {
		const event: CascadeAnalytics['cascade_start'] = {
			...data,
			timestamp: Date.now(),
			session_id: this.sessionId,
		};

		this.logEvent('ai.cascade_start', event);
		this.events.push(event);
		this.startTime = Date.now();
	}

	/**
	 * Log writer completion
	 */
	logWriterDone(
		data: Omit<CascadeAnalytics['writer_done'], 'timestamp' | 'session_id'>
	) {
		const event: CascadeAnalytics['writer_done'] = {
			...data,
			timestamp: Date.now(),
			session_id: this.sessionId,
		};

		this.logEvent('ai.writer_done', event);
		this.events.push(event);
		this.performanceMetrics.writer_time_ms = Date.now() - this.startTime;
	}

	/**
	 * Log guard failures
	 */
	logGuardFail(
		data: Omit<CascadeAnalytics['guard_fail'], 'timestamp' | 'session_id'>
	) {
		const event: CascadeAnalytics['guard_fail'] = {
			...data,
			timestamp: Date.now(),
			session_id: this.sessionId,
		};

		this.logEvent('ai.guard_fail', event);
		this.events.push(event);
		this.performanceMetrics.guard_time_ms = Date.now() - this.startTime;
	}

	/**
	 * Log critic completion
	 */
	logCriticDone(
		data: Omit<CascadeAnalytics['critic_done'], 'timestamp' | 'session_id'>
	) {
		const event: CascadeAnalytics['critic_done'] = {
			...data,
			timestamp: Date.now(),
			session_id: this.sessionId,
		};

		this.logEvent('ai.critic_done', event);
		this.events.push(event);
		this.performanceMetrics.critic_time_ms = Date.now() - this.startTime;
	}

	/**
	 * Log decision made
	 */
	logDecision(
		data: Omit<CascadeAnalytics['decision'], 'timestamp' | 'session_id'>
	) {
		const event: CascadeAnalytics['decision'] = {
			...data,
			timestamp: Date.now(),
			session_id: this.sessionId,
		};

		this.logEvent('ai.decision', event);
		this.events.push(event);
		this.performanceMetrics.decision_time_ms = Date.now() - this.startTime;
	}

	/**
	 * Log improver usage
	 */
	logImproverUsed(
		data: Omit<CascadeAnalytics['improver_used'], 'timestamp' | 'session_id'>
	) {
		const event: CascadeAnalytics['improver_used'] = {
			...data,
			timestamp: Date.now(),
			session_id: this.sessionId,
		};

		this.logEvent('ai.improver_used', event);
		this.events.push(event);
	}

	/**
	 * Log user outcome
	 */
	logUserOutcome(
		data: Omit<CascadeAnalytics['user_outcome'], 'timestamp' | 'session_id'>
	) {
		const event: CascadeAnalytics['user_outcome'] = {
			...data,
			timestamp: Date.now(),
			session_id: this.sessionId,
		};

		this.logEvent('ai.user_outcome', event);
		this.events.push(event);
	}

	/**
	 * Log cascade completion
	 */
	logCascadeComplete(
		data: Omit<CascadeAnalytics['cascade_complete'], 'timestamp' | 'session_id'>
	) {
		const event: CascadeAnalytics['cascade_complete'] = {
			...data,
			timestamp: Date.now(),
			session_id: this.sessionId,
		};

		this.logEvent('ai.cascade_complete', event);
		this.events.push(event);
	}

	/**
	 * Log performance metrics
	 */
	logPerformanceMetrics(
		data: Omit<
			CascadeAnalytics['performance_metrics'],
			'timestamp' | 'session_id'
		>
	) {
		const event: CascadeAnalytics['performance_metrics'] = {
			...data,
			timestamp: Date.now(),
			session_id: this.sessionId,
		};

		this.logEvent('ai.performance_metrics', event);
		this.events.push(event);
	}

	/**
	 * Log a cascade event to your analytics system
	 */
	private logEvent(
		eventName: string,
		data: CascadeAnalytics[keyof CascadeAnalytics]
	) {
		try {
			// Log to console for development
			logger.debug(`🔍 [Analytics] ${eventName}:`, data);

			// Here you would integrate with your actual analytics service
			// Examples:
			// - Firebase Analytics
			// - Mixpanel
			// - Amplitude
			// - Custom backend endpoint

			// For now, we'll use a mock analytics call
			this.mockAnalyticsCall(eventName, data);
		} catch (error) {
			logger.warn('Failed to log analytics event:', error);
		}
	}

	/**
	 * Mock analytics call - replace with your actual analytics service
	 */
	private mockAnalyticsCall(
		eventName: string,
		data: CascadeAnalytics[keyof CascadeAnalytics]
	) {
		// Simulate analytics API call
		setTimeout(() => {
			logger.debug(`📊 [Mock Analytics] Sent ${eventName} to analytics service`);
		}, 100);
	}

	/**
	 * Persist analytics to local storage
	 */
	private persistAnalytics() {
		try {
			const analyticsData = this.exportEvents();
			localStorage.setItem(
				`cascade_analytics_${this.sessionId}`,
				JSON.stringify(analyticsData)
			);
		} catch (error) {
			logger.warn('Failed to persist analytics:', error);
		}
	}

	/**
	 * Load analytics from local storage
	 */
	private loadAnalytics(sessionId: string) {
		try {
			const stored = localStorage.getItem(`cascade_analytics_${sessionId}`);
			if (stored) {
				const data = JSON.parse(stored);
				this.events = data.events || [];
				return true;
			}
		} catch (error) {
			logger.warn('Failed to load analytics:', error);
		}
		return false;
	}

	/**
	 * Get analytics summary for this session
	 */
	getSessionSummary() {
		const writerEvents = this.events.filter(
			(e) => 'used_fact_ids' in e
		) as CascadeAnalytics['writer_done'][];
		const guardEvents = this.events.filter(
			(e) => 'failures' in e
		) as CascadeAnalytics['guard_fail'][];
		const criticEvents = this.events.filter(
			(e) => 'risk' in e
		) as CascadeAnalytics['critic_done'][];
		const decisionEvents = this.events.filter(
			(e) => 'path' in e
		) as CascadeAnalytics['decision'][];
		const improverEvents = this.events.filter(
			(e) => 'escalation_reason' in e
		) as CascadeAnalytics['improver_used'][];
		const cascadeStartEvents = this.events.filter(
			(e) => 'user_query' in e
		) as CascadeAnalytics['cascade_start'][];
		const cascadeCompleteEvents = this.events.filter(
			(e) => 'final_path' in e
		) as CascadeAnalytics['cascade_complete'][];

		const totalTokens = writerEvents.reduce(
			(sum, e) => sum + e.tokens_in + e.tokens_out,
			0
		);
		const totalCost = cascadeCompleteEvents.reduce(
			(sum, e) => sum + e.total_cost,
			0
		);
		const avgProcessingTime =
			cascadeCompleteEvents.reduce(
				(sum, e) => sum + e.total_processing_time_ms,
				0
			) / Math.max(cascadeCompleteEvents.length, 1);

		return {
			session_id: this.sessionId,
			total_events: this.events.length,
			writer_calls: writerEvents.length,
			guard_failures: guardEvents.length,
			critic_calls: criticEvents.length,
			decisions: decisionEvents.length,
			improver_calls: improverEvents.length,
			cascade_starts: cascadeStartEvents.length,
			cascade_completions: cascadeCompleteEvents.length,
			escalation_rate:
				decisionEvents.filter((e) => e.path === 'escalate').length /
				Math.max(decisionEvents.length, 1),
			guard_failure_rate:
				guardEvents.filter((e) => e.failures.length > 0).length /
				Math.max(guardEvents.length, 1),
			clarification_rate:
				decisionEvents.filter((e) => e.path === 'clarify').length /
				Math.max(decisionEvents.length, 1),
			total_tokens: totalTokens,
			total_cost: totalCost,
			avg_processing_time_ms: avgProcessingTime,
			content_kind_distribution: this.getContentKindDistribution(writerEvents),
			risk_distribution: this.getRiskDistribution(criticEvents),
		};
	}

	/**
	 * Get failure analysis for debugging
	 */
	getFailureAnalysis() {
		const guardEvents = this.events.filter(
			(e) => 'failures' in e
		) as CascadeAnalytics['guard_fail'][];
		const guardFailures = guardEvents
			.filter((e) => e.failures.length > 0)
			.flatMap((e) => e.failures);

		const failureCounts = guardFailures.reduce((acc, failure) => {
			acc[failure] = (acc[failure] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);

		const criticEvents = this.events.filter(
			(e) => 'issues' in e
		) as CascadeAnalytics['critic_done'][];
		const criticIssues = criticEvents
			.filter((e) => e.issues.length > 0)
			.flatMap((e) =>
				e.issues.map((i: { type: string; note: string }) => i.type)
			);

		const issueCounts = criticIssues.reduce((acc, issue) => {
			acc[issue] = (acc[issue] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);

		const severityDistribution = guardEvents.reduce((acc, e) => {
			acc[e.severity] = (acc[e.severity] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);

		return {
			guard_failures: failureCounts,
			critic_issues: issueCounts,
			severity_distribution: severityDistribution,
			most_common_failure: Object.entries(failureCounts).sort(
				([, a], [, b]) => (b as number) - (a as number)
			)[0]?.[0],
			most_common_issue: Object.entries(issueCounts).sort(
				([, a], [, b]) => (b as number) - (a as number)
			)[0]?.[0],
			critical_failures: guardEvents.filter((e) => e.severity === 'critical')
				.length,
		};
	}

	/**
	 * Get content kind distribution
	 */
	private getContentKindDistribution(
		writerEvents: CascadeAnalytics['writer_done'][]
	) {
		return writerEvents.reduce((acc, e) => {
			acc[e.content_kind] = (acc[e.content_kind] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);
	}

	/**
	 * Get risk distribution
	 */
	private getRiskDistribution(criticEvents: CascadeAnalytics['critic_done'][]) {
		return criticEvents.reduce((acc, e) => {
			acc[e.risk] = (acc[e.risk] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);
	}

	/**
	 * Generate a unique session ID
	 */
	private generateSessionId(): string {
		return `cascade_session_${Date.now()}_${Math.random()
			.toString(36)
			.substr(2, 9)}`;
	}

	/**
	 * Export events for external analysis
	 */
	exportEvents() {
		// Persist before exporting
		this.persistAnalytics();

		return {
			session_id: this.sessionId,
			events: this.events,
			summary: this.getSessionSummary(),
			failure_analysis: this.getFailureAnalysis(),
			export_timestamp: Date.now(),
			export_version: '1.0.0',
		};
	}

	/**
	 * Clear all analytics data
	 */
	clearAnalytics() {
		this.events = [];
		this.performanceMetrics = {};
		this.startTime = Date.now();
		localStorage.removeItem(`cascade_analytics_${this.sessionId}`);
	}

	/**
	 * Get performance insights
	 */
	getPerformanceInsights() {
		const performanceEvents = this.events.filter(
			(e) => 'total_time_ms' in e
		) as CascadeAnalytics['performance_metrics'][];

		if (performanceEvents.length === 0) {
			return null;
		}

		const avgTotalTime =
			performanceEvents.reduce((sum, e) => sum + e.total_time_ms, 0) /
			performanceEvents.length;
		const avgWriterTime =
			performanceEvents.reduce((sum, e) => sum + (e.writer_time_ms || 0), 0) /
			performanceEvents.length;
		const avgGuardTime =
			performanceEvents.reduce((sum, e) => sum + (e.guard_time_ms || 0), 0) /
			performanceEvents.length;
		const avgCriticTime =
			performanceEvents.reduce((sum, e) => sum + (e.critic_time_ms || 0), 0) /
			performanceEvents.length;
		const avgDecisionTime =
			performanceEvents.reduce((sum, e) => sum + (e.decision_time_ms || 0), 0) /
			performanceEvents.length;

		return {
			avg_total_time_ms: avgTotalTime,
			avg_writer_time_ms: avgWriterTime,
			avg_guard_time_ms: avgGuardTime,
			avg_critic_time_ms: avgCriticTime,
			avg_decision_time_ms: avgDecisionTime,
			bottleneck: this.identifyBottleneck(
				avgWriterTime,
				avgGuardTime,
				avgCriticTime,
				avgDecisionTime
			),
			total_events: performanceEvents.length,
		};
	}

	/**
	 * Identify performance bottleneck
	 */
	private identifyBottleneck(
		writerTime: number,
		guardTime: number,
		criticTime: number,
		decisionTime: number
	) {
		const times = {
			writer: writerTime,
			guard: guardTime,
			critic: criticTime,
			decision: decisionTime,
		};
		const maxTime = Math.max(...Object.values(times));
		return (
			Object.entries(times).find(([, time]) => time === maxTime)?.[0] ||
			'unknown'
		);
	}
}

/**
 * Create a global analytics instance
 */
export const cascadeAnalytics = new CascadeAnalyticsService();

/**
 * Helper function to log cascade events
 */
export function logCascadeEvent<T extends keyof CascadeAnalytics>(
	eventType: T,
	data: Omit<CascadeAnalytics[T], 'timestamp' | 'session_id'>
) {
	switch (eventType) {
		case 'cascade_start':
			cascadeAnalytics.logCascadeStart(
				data as Omit<
					CascadeAnalytics['cascade_start'],
					'timestamp' | 'session_id'
				>
			);
			break;
		case 'writer_done':
			cascadeAnalytics.logWriterDone(
				data as Omit<
					CascadeAnalytics['writer_done'],
					'timestamp' | 'session_id'
				>
			);
			break;
		case 'guard_fail':
			cascadeAnalytics.logGuardFail(
				data as Omit<CascadeAnalytics['guard_fail'], 'timestamp' | 'session_id'>
			);
			break;
		case 'critic_done':
			cascadeAnalytics.logCriticDone(
				data as Omit<
					CascadeAnalytics['critic_done'],
					'timestamp' | 'session_id'
				>
			);
			break;
		case 'decision':
			cascadeAnalytics.logDecision(
				data as Omit<CascadeAnalytics['decision'], 'timestamp' | 'session_id'>
			);
			break;
		case 'improver_used':
			cascadeAnalytics.logImproverUsed(
				data as Omit<
					CascadeAnalytics['improver_used'],
					'timestamp' | 'session_id'
				>
			);
			break;
		case 'user_outcome':
			cascadeAnalytics.logUserOutcome(
				data as Omit<
					CascadeAnalytics['user_outcome'],
					'timestamp' | 'session_id'
				>
			);
			break;
		case 'cascade_complete':
			cascadeAnalytics.logCascadeComplete(
				data as Omit<
					CascadeAnalytics['cascade_complete'],
					'timestamp' | 'session_id'
				>
			);
			break;
		case 'performance_metrics':
			cascadeAnalytics.logPerformanceMetrics(
				data as Omit<
					CascadeAnalytics['performance_metrics'],
					'timestamp' | 'session_id'
				>
			);
			break;
	}
}

/**
 * Helper function to create a new analytics session
 */
export function createAnalyticsSession(
	sessionId?: string
): CascadeAnalyticsService {
	return new CascadeAnalyticsService(sessionId);
}

/**
 * Helper function to get analytics summary for a specific session
 */
export function getAnalyticsSummary(sessionId: string) {
	const service = new CascadeAnalyticsService(sessionId);
	return service.getSessionSummary();
}

/**
 * Helper function to export analytics for a specific session
 */
export function exportAnalyticsForSession(sessionId: string) {
	const service = new CascadeAnalyticsService(sessionId);
	return service.exportEvents();
}
