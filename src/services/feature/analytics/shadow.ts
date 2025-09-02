// analytics/shadow.ts - Shadow A/B testing for safe AI experimentation
// Runs current and candidate prompts in parallel without changing UX

import { emit } from './emit';
import { getSessionId, getMessageId } from './emit';

export interface ShadowConfig {
	rate: number; // 0.05 = 5% of traffic
	dailyCap: number; // Max dual-runs per day
	skipHighTokenRoutes: boolean; // Skip for expensive routes
	tokenThreshold: number; // Skip if current > this many tokens
}

const DEFAULT_CONFIG: ShadowConfig = {
	rate: 0.05,
	dailyCap: 1000,
	skipHighTokenRoutes: true,
	tokenThreshold: 500,
};

export class ShadowABService {
	private config: ShadowConfig;
	private dailyCount: number = 0;
	private lastResetDate: string;

	constructor(config: Partial<ShadowConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.lastResetDate = this.getDateKey();
		this.loadDailyCount();
	}

	/**
	 * Check if user should be in shadow group
	 */
	inShadow(userId: string): boolean {
		// Reset daily count if needed
		this.resetDailyCountIfNeeded();

		// Check daily cap
		if (this.dailyCount >= this.config.dailyCap) {
			return false;
		}

		// Hash-based bucketing for consistent behavior per user
		const hash = this.hashUserId(userId);
		const bucket = hash / 0xffffff; // 0..1

		return bucket < this.config.rate;
	}

	/**
	 * Run current and candidate functions, return current result
	 */
	async dualRunIfNeeded<T>(
		userId: string,
		currentFn: () => Promise<T>,
		candidateFn: () => Promise<T>,
		currentMeta?: { route?: string; model?: string; tokens?: number }
	): Promise<T> {
		// Always run current
		const current = await currentFn();

		// Check if we should run candidate
		if (
			this.inShadow(userId) &&
			this.shouldRunCandidate(current, currentMeta)
		) {
			// Increment daily count
			this.incrementDailyCount();

			// Run candidate in background (don't await)
			this.runCandidateInBackground(candidateFn, current, currentMeta);
		}

		return current; // Only show current result
	}

	/**
	 * Check if we should run candidate based on current result
	 */
	private shouldRunCandidate(current: any, currentMeta?: any): boolean {
		if (!this.config.skipHighTokenRoutes) return true;

		// Skip if current already used high token count
		const tokens = currentMeta?.tokens || current?.cost?.totalTokens || 0;
		return tokens <= this.config.tokenThreshold;
	}

	/**
	 * Run candidate function in background and emit results
	 */
	private async runCandidateInBackground<T>(
		candidateFn: () => Promise<T>,
		current: T,
		currentMeta?: any
	): Promise<void> {
		try {
			const candidate = await candidateFn();

			// Extract metadata for comparison
			const currentMetaData = this.extractMeta(current, currentMeta);
			const candidateMetaData = this.extractMeta(candidate);

			// Check if responses agree
			const agree = this.responsesAgree(current, candidate);

			// Emit shadow result
			await emit({
				type: 'ai.shadow_result',
				agree,
				current_meta: currentMetaData,
				candidate_meta: candidateMetaData,
				session_id: getSessionId(),
				message_id: getMessageId(),
			} as const);
		} catch (error) {
			console.warn('Shadow candidate failed:', error);
			// Don't emit error - just log it
		}
	}

	/**
	 * Extract metadata from response
	 */
	private extractMeta(
		response: any,
		overrideMeta?: any
	): { route: string; model: string; tokens: number } {
		return {
			route: overrideMeta?.route || response?.route || 'unknown',
			model: overrideMeta?.model || response?.cost?.model || 'unknown',
			tokens: overrideMeta?.tokens || response?.cost?.totalTokens || 0,
		};
	}

	/**
	 * Check if current and candidate responses agree
	 */
	private responsesAgree(current: any, candidate: any): boolean {
		try {
			// Compare fact IDs if available
			const currentFacts =
				current?.used_fact_ids || current?.card?.evidence?.factIds || [];
			const candidateFacts =
				candidate?.used_fact_ids || candidate?.card?.evidence?.factIds || [];

			if (currentFacts.length > 0 && candidateFacts.length > 0) {
				const currentSorted = [...currentFacts].sort().join(',');
				const candidateSorted = [...candidateFacts].sort().join(',');
				return currentSorted === candidateSorted;
			}

			// Fallback: compare response length and key indicators
			const currentLength =
				current?.response?.length || current?.message?.length || 0;
			const candidateLength =
				candidate?.response?.length || candidate?.message?.length || 0;

			// Consider responses similar if length difference is < 20%
			const lengthDiff =
				Math.abs(currentLength - candidateLength) / Math.max(currentLength, 1);
			return lengthDiff < 0.2;
		} catch (error) {
			console.warn('Error comparing responses:', error);
			return false;
		}
	}

	/**
	 * Hash user ID for consistent bucketing
	 */
	private hashUserId(userId: string): number {
		let hash = 0;
		for (let i = 0; i < userId.length; i++) {
			const char = userId.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash);
	}

	/**
	 * Get date key for daily counting
	 */
	private getDateKey(): string {
		return new Date().toISOString().split('T')[0];
	}

	/**
	 * Reset daily count if needed
	 */
	private resetDailyCountIfNeeded(): void {
		const today = this.getDateKey();
		if (today !== this.lastResetDate) {
			this.dailyCount = 0;
			this.lastResetDate = today;
			this.saveDailyCount();
		}
	}

	/**
	 * Increment daily count
	 */
	private incrementDailyCount(): void {
		this.dailyCount++;
		this.saveDailyCount();
	}

	/**
	 * Load daily count from storage
	 */
	private loadDailyCount(): void {
		try {
			const stored = localStorage.getItem('shadow_ab_daily_count');
			if (stored) {
				const data = JSON.parse(stored);
				if (data.date === this.lastResetDate) {
					this.dailyCount = data.count;
				}
			}
		} catch (error) {
			console.warn('Failed to load shadow AB daily count:', error);
		}
	}

	/**
	 * Save daily count to storage
	 */
	private saveDailyCount(): void {
		try {
			localStorage.setItem(
				'shadow_ab_daily_count',
				JSON.stringify({
					date: this.lastResetDate,
					count: this.dailyCount,
				})
			);
		} catch (error) {
			console.warn('Failed to save shadow AB daily count:', error);
		}
	}

	/**
	 * Get current shadow statistics
	 */
	getStats(): { dailyCount: number; dailyCap: number; rate: number } {
		return {
			dailyCount: this.dailyCount,
			dailyCap: this.config.dailyCap,
			rate: this.config.rate,
		};
	}

	/**
	 * Update configuration
	 */
	updateConfig(newConfig: Partial<ShadowConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}
}

// Singleton instance
export const shadowABService = new ShadowABService();

// Convenience function
export function dualRunIfNeeded<T>(
	userId: string,
	currentFn: () => Promise<T>,
	candidateFn: () => Promise<T>,
	currentMeta?: { route?: string; model?: string; tokens?: number }
): Promise<T> {
	return shadowABService.dualRunIfNeeded(
		userId,
		currentFn,
		candidateFn,
		currentMeta
	);
}
