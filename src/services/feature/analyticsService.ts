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

export class AnalyticsService {
	private sessionId: string;
	private conversationLength: number = 0;
	private events: ChatAnalyticsEvent[] = [];
	private isEnabled: boolean = true;

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
		console.log('📊 [Analytics] Chat Event:', {
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
		console.log('📊 [Analytics] User Satisfaction:', {
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
