// enhancedAnalytics.ts - Enhanced analytics service with PII scrubbing and sampling
// Integrates with existing analytics system and adds production-ready features

import { AnalyticsEmitter } from './emit';
import { scrubAnalyticsEvent, scrubError } from '../../../utils/piiScrubbing';
import { TELEMETRY_CONFIG, SAMPLING_CONFIG } from '../../../config/telemetry';
import { AnalyticsEvent } from './types';

export interface EnhancedAnalyticsOptions {
	enablePIIScrubbing?: boolean;
	enableSampling?: boolean;
	sampleRate?: number;
	scrubOptions?: {
		scrubEmails?: boolean;
		scrubPhones?: boolean;
		scrubCreditCards?: boolean;
		scrubSSNs?: boolean;
		scrubBankAccounts?: boolean;
		scrubAmounts?: boolean;
		scrubDates?: boolean;
	};
}

export class EnhancedAnalyticsService {
	private analyticsEmitter: AnalyticsEmitter;
	private options: Required<EnhancedAnalyticsOptions>;
	private sessionId: string;

	constructor(options: EnhancedAnalyticsOptions = {}) {
		this.analyticsEmitter = new AnalyticsEmitter();
		this.sessionId = this.generateSessionId();

		this.options = {
			enablePIIScrubbing:
				options.enablePIIScrubbing ??
				TELEMETRY_CONFIG.LOGGING.PII_SCRUBBING_ENABLED,
			enableSampling: options.enableSampling ?? true,
			sampleRate: options.sampleRate ?? TELEMETRY_CONFIG.ANALYTICS.SAMPLE_RATE,
			scrubOptions: {
				scrubEmails: options.scrubOptions?.scrubEmails ?? true,
				scrubPhones: options.scrubOptions?.scrubPhones ?? true,
				scrubCreditCards: options.scrubOptions?.scrubCreditCards ?? true,
				scrubSSNs: options.scrubOptions?.scrubSSNs ?? true,
				scrubBankAccounts: options.scrubOptions?.scrubBankAccounts ?? true,
				scrubAmounts: options.scrubOptions?.scrubAmounts ?? true,
				scrubDates: options.scrubOptions?.scrubDates ?? true,
			},
		};
	}

	private generateSessionId(): string {
		return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Check if this event should be sampled based on configuration
	 */
	private shouldSample(): boolean {
		if (!this.options.enableSampling) return true;

		const environment = TELEMETRY_CONFIG.SENTRY.ENVIRONMENT;
		const sampleRate =
			environment === 'production'
				? SAMPLING_CONFIG.ANALYTICS.PRODUCTION
				: environment === 'staging'
				? SAMPLING_CONFIG.ANALYTICS.STAGING
				: SAMPLING_CONFIG.ANALYTICS.DEVELOPMENT;

		return Math.random() < sampleRate;
	}

	/**
	 * Emit an analytics event with enhanced features
	 */
	async emit(event: AnalyticsEvent): Promise<void> {
		// Check if analytics is enabled
		if (!TELEMETRY_CONFIG.ANALYTICS.ENABLED) {
			return;
		}

		// Apply sampling
		if (!this.shouldSample()) {
			return;
		}

		// Scrub PII if enabled
		let processedEvent = event;
		if (this.options.enablePIIScrubbing) {
			processedEvent = scrubAnalyticsEvent(event, this.options.scrubOptions);
		}

		// Add session context
		const enhancedEvent = {
			...processedEvent,
			session_id: this.sessionId,
			timestamp: Date.now(),
			environment: TELEMETRY_CONFIG.SENTRY.ENVIRONMENT,
			app_version: '1.0.0', // TODO: Get from app config
		};

		try {
			await this.analyticsEmitter.emit(enhancedEvent);
		} catch (error) {
			console.warn('Failed to emit enhanced analytics event:', error);

			// Log to console in development
			if (__DEV__) {
			}
		}
	}

	/**
	 * Emit a route decision event
	 */
	async emitRouteDecision(data: {
		intent: string;
		p: number;
		route: 'grounded' | 'mini' | 'pro' | 'fallback';
		calibrated: boolean;
		token_budget: number;
		message_id: string;
	}): Promise<void> {
		await this.emit({
			type: 'ai.route_decided',
			...data,
			session_id: this.sessionId,
			timestamp: Date.now(),
		});
	}

	/**
	 * Emit a cost summary event
	 */
	async emitCostSummary(data: {
		model: 'mini' | 'standard' | 'pro';
		input_tokens: number;
		output_tokens: number;
		cache_hit?: boolean;
		message_id: string;
	}): Promise<void> {
		await this.emit({
			type: 'ai.cost_summary',
			...data,
			session_id: this.sessionId,
			timestamp: Date.now(),
		});
	}

	/**
	 * Emit a user outcome event
	 */
	async emitUserOutcome(data: {
		resolved: boolean;
		cta_taken: string | null;
		message_id: string;
	}): Promise<void> {
		await this.emit({
			type: 'ai.user_outcome',
			...data,
			session_id: this.sessionId,
			timestamp: Date.now(),
		});
	}

	/**
	 * Emit a fallback used event
	 */
	async emitFallbackUsed(data: {
		reason: 'missing_data' | 'ambiguous' | 'guard_failed' | 'rate_limited';
		message_id: string;
	}): Promise<void> {
		await this.emit({
			type: 'ai.fallback_used',
			...data,
			session_id: this.sessionId,
			timestamp: Date.now(),
		});
	}

	/**
	 * Emit a guardrail violation event
	 */
	async emitGuardrailViolation(data: {
		violation_type: string;
		details?: Record<string, any>;
		factPackHash: string;
		message_id: string;
	}): Promise<void> {
		await this.emit({
			type: 'ai.guardrail_violation',
			...data,
			session_id: this.sessionId,
			timestamp: Date.now(),
		});
	}

	/**
	 * Emit a shadow result event
	 */
	async emitShadowResult(data: {
		agree: boolean;
		current_meta: {
			route: string;
			model: string;
			tokens: number;
		};
		candidate_meta: {
			route: string;
			model: string;
			tokens: number;
		};
		message_id: string;
	}): Promise<void> {
		await this.emit({
			type: 'ai.shadow_result',
			...data,
			session_id: this.sessionId,
			timestamp: Date.now(),
		});
	}

	/**
	 * Emit a custom event
	 */
	async emitCustomEvent(
		type: string,
		data: Record<string, any>
	): Promise<void> {
		await this.emit({
			type: `custom.${type}`,
			...data,
			session_id: this.sessionId,
			timestamp: Date.now(),
		} as any);
	}

	/**
	 * Emit an error event with PII scrubbing
	 */
	async emitError(error: Error, context?: Record<string, any>): Promise<void> {
		const scrubbedError = this.options.enablePIIScrubbing
			? scrubError(error, this.options.scrubOptions)
			: error;

		await this.emitCustomEvent('error', {
			error_name: scrubbedError.name,
			error_message: scrubbedError.message,
			error_stack: scrubbedError.stack,
			context: context
				? scrubAnalyticsEvent(context, this.options.scrubOptions)
				: undefined,
		});
	}

	/**
	 * Get current session ID
	 */
	getSessionId(): string {
		return this.sessionId;
	}

	/**
	 * Start a new session
	 */
	startNewSession(): void {
		this.sessionId = this.generateSessionId();
	}

	/**
	 * Get analytics configuration
	 */
	getConfig(): typeof TELEMETRY_CONFIG {
		return TELEMETRY_CONFIG;
	}
}

// Export singleton instance
export const enhancedAnalytics = new EnhancedAnalyticsService();
