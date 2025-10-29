// analytics/emit.ts - Analytics event emitter for AI evaluation & monitoring
// Sends events to server for reliable tracking and cost analysis

import { AnalyticsEventInput } from './types';

// API configuration - inline to avoid import issues
import { API_BASE_URL } from '../../../config/api';
import { logger } from '../../../../utils/logger';


class AnalyticsEmitter {
	private sessionId: string;
	private messageId: string;
	private isEnabled: boolean = true;

	constructor() {
		this.sessionId = this.generateSessionId();
		this.messageId = this.generateMessageId();
	}

	private generateSessionId(): string {
		return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private generateMessageId(): string {
		return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Start tracking a new message
	 */
	startMessage(): string {
		this.messageId = this.generateMessageId();
		return this.messageId;
	}

	/**
	 * Emit an analytics event to the server
	 */
	async emit(event: AnalyticsEventInput): Promise<void> {
		if (!this.isEnabled) return;

		const fullEvent = {
			...event,
			timestamp: Date.now(),
			session_id: this.sessionId,
			message_id: this.messageId,
		};

		try {
			// Send to server for reliable tracking
			await fetch(`${API_BASE_URL}/analytics/emit`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(fullEvent),
			});

			// Also log to console for development
			logger.debug('📊 [Analytics] Event emitted:', fullEvent);
		} catch (error) {
			logger.warn('Failed to emit analytics event:', error);

			// Fallback: store locally for retry
			this.storeForRetry(fullEvent);

			// In development, also log to console for debugging
			if (__DEV__) {
				logger.debug('📊 [Analytics] Event stored for retry:', fullEvent);
			}
		}
	}

	/**
	 * Store failed events for retry
	 */
	private storeForRetry(event: any): void {
		try {
			const failedEvents = JSON.parse(
				localStorage.getItem('analytics_failed') || '[]'
			);
			failedEvents.push(event);
			localStorage.setItem(
				'analytics_failed',
				JSON.stringify(failedEvents.slice(-50))
			); // Keep last 50
		} catch (error) {
			logger.warn('Failed to store analytics event for retry:', error);
		}
	}

	/**
	 * Retry failed events
	 */
	async retryFailedEvents(): Promise<void> {
		try {
			const failedEvents = JSON.parse(
				localStorage.getItem('analytics_failed') || '[]'
			);
			if (failedEvents.length === 0) return;

			const successful: any[] = [];

			for (const event of failedEvents) {
				try {
					await fetch(`${API_BASE_URL}/analytics/emit`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(event),
					});
					successful.push(event);
				} catch (error) {
					logger.warn('Retry failed for event:', event, error);
				}
			}

			// Remove successful retries
			const remaining = failedEvents.filter((e) => !successful.includes(e));
			localStorage.setItem('analytics_failed', JSON.stringify(remaining));

			if (successful.length > 0) {
				logger.debug(
					`📊 [Analytics] Retried ${successful.length} failed events`
				);
			}
		} catch (error) {
			logger.warn('Failed to retry analytics events:', error);
		}
	}

	/**
	 * Enable/disable analytics
	 */
	setEnabled(enabled: boolean): void {
		this.isEnabled = enabled;
	}

	/**
	 * Get current session ID
	 */
	getSessionId(): string {
		return this.sessionId;
	}

	/**
	 * Get current message ID
	 */
	getMessageId(): string {
		return this.messageId;
	}
}

// Singleton instance
export const analyticsEmitter = new AnalyticsEmitter();

// Convenience functions
export function emit(event: AnalyticsEventInput): Promise<void> {
	return analyticsEmitter.emit(event);
}

export function startMessage(): string {
	return analyticsEmitter.startMessage();
}

export function getSessionId(): string {
	return analyticsEmitter.getSessionId();
}

export function getMessageId(): string {
	return analyticsEmitter.getMessageId();
}
