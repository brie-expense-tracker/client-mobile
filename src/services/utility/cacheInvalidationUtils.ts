import { SmartCacheService } from './smartCacheService';

/**
 * Utility functions for managing cache invalidation flags
 * This helps ensure cache is invalidated when relevant data changes
 */

const cacheService = SmartCacheService.getInstance();

// Invalidation analytics tracking
interface InvalidationEvent {
	timestamp: number;
	flag: string;
	userId?: string;
	category?: string;
	reason: string;
}

const invalidationEvents: InvalidationEvent[] = [];
const MAX_EVENTS = 1000; // Keep last 1000 events

/**
 * Log invalidation event for analytics
 */
const logInvalidationEvent = (
	flag: string,
	reason: string,
	userId?: string,
	category?: string
) => {
	const event: InvalidationEvent = {
		timestamp: Date.now(),
		flag,
		userId,
		category,
		reason,
	};

	invalidationEvents.push(event);

	// Keep only the most recent events
	if (invalidationEvents.length > MAX_EVENTS) {
		invalidationEvents.splice(0, invalidationEvents.length - MAX_EVENTS);
	}

	console.log(
		`[CacheInvalidation] ${flag}: ${reason}${
			userId ? ` (User: ${userId})` : ''
		}${category ? ` (Category: ${category})` : ''}`
	);
};

/**
 * Set cache invalidation flags based on data changes
 */
export const setCacheInvalidationFlags = {
	// Financial data changes
	onNewTransaction: (userId?: string) => {
		logInvalidationEvent('NEW_TX', 'New transaction added', userId);
		cacheService.setInvalidationFlag('NEW_TX');
		// Clear after a short delay to allow immediate invalidation
		setTimeout(() => cacheService.clearInvalidationFlag('NEW_TX'), 5000);
	},

	onBudgetChange: (userId?: string) => {
		logInvalidationEvent(
			'BUDGET_CHANGE',
			'Budget configuration changed',
			userId
		);
		cacheService.setInvalidationFlag('BUDGET_CHANGE');
		setTimeout(() => cacheService.clearInvalidationFlag('BUDGET_CHANGE'), 5000);
	},

	onGoalUpdate: (userId?: string) => {
		logInvalidationEvent('GOAL_UPDATE', 'Financial goal updated', userId);
		cacheService.setInvalidationFlag('GOAL_UPDATE');
		setTimeout(() => cacheService.clearInvalidationFlag('GOAL_UPDATE'), 5000);
	},

	onCategoryUpdate: (userId?: string) => {
		logInvalidationEvent(
			'CATEGORY_UPDATE',
			'Category configuration changed',
			userId
		);
		cacheService.setInvalidationFlag('CATEGORY_UPDATE');
		setTimeout(
			() => cacheService.clearInvalidationFlag('CATEGORY_UPDATE'),
			5000
		);
	},

	onRecurringExpenseChange: (userId?: string) => {
		logInvalidationEvent(
			'RECURRING_EXPENSE_CHANGE',
			'Recurring expense modified',
			userId
		);
		cacheService.setInvalidationFlag('RECURRING_EXPENSE_CHANGE');
		setTimeout(
			() => cacheService.clearInvalidationFlag('RECURRING_EXPENSE_CHANGE'),
			5000
		);
	},

	// Profile and settings changes
	onProfileUpdate: (userId?: string) => {
		logInvalidationEvent('PROFILE_UPDATE', 'User profile updated', userId);
		cacheService.setInvalidationFlag('PROFILE_UPDATE');
		setTimeout(
			() => cacheService.clearInvalidationFlag('PROFILE_UPDATE'),
			5000
		);
	},

	onSettingsChange: (userId?: string) => {
		logInvalidationEvent(
			'SETTINGS_CHANGE',
			'Application settings changed',
			userId
		);
		cacheService.setInvalidationFlag('SETTINGS_CHANGE');
		setTimeout(
			() => cacheService.clearInvalidationFlag('SETTINGS_CHANGE'),
			5000
		);
	},

	// AI and insights related
	onAIResponseGenerated: (userId?: string) => {
		logInvalidationEvent(
			'AI_RESPONSE_GENERATED',
			'New AI response generated',
			userId
		);
		cacheService.setInvalidationFlag('AI_RESPONSE_GENERATED');
		setTimeout(
			() => cacheService.clearInvalidationFlag('AI_RESPONSE_GENERATED'),
			5000
		);
	},

	onInsightGenerated: (userId?: string) => {
		logInvalidationEvent(
			'INSIGHT_GENERATED',
			'New financial insight generated',
			userId
		);
		cacheService.setInvalidationFlag('INSIGHT_GENERATED');
		setTimeout(
			() => cacheService.clearInvalidationFlag('INSIGHT_GENERATED'),
			5000
		);
	},

	// Clear all flags (useful for testing or manual cache reset)
	clearAll: () => {
		const flags = [
			'NEW_TX',
			'BUDGET_CHANGE',
			'GOAL_UPDATE',
			'CATEGORY_UPDATE',
			'RECURRING_EXPENSE_CHANGE',
			'PROFILE_UPDATE',
			'SETTINGS_CHANGE',
			'AI_RESPONSE_GENERATED',
			'INSIGHT_GENERATED',
		];
		flags.forEach((flag) => cacheService.clearInvalidationFlag(flag));
	},

	// Batch invalidation for multiple flags
	batch: (flags: string[], delay: number = 5000) => {
		flags.forEach((flag) => cacheService.setInvalidationFlag(flag));
		setTimeout(() => {
			flags.forEach((flag) => cacheService.clearInvalidationFlag(flag));
		}, delay);
	},
};

/**
 * Invalidate specific cache categories
 */
export const invalidateCacheCategories = {
	narration: () => cacheService.invalidateCacheByCategory('NARRATION'),
	faq: () => cacheService.invalidateCacheByCategory('FAQ'),
	howto: () => cacheService.invalidateCacheByCategory('HOWTO'),
	insight: () => cacheService.invalidateCacheByCategory('INSIGHT'),
	forecast: () => cacheService.invalidateCacheByCategory('FORECAST'),
	categorization: () =>
		cacheService.invalidateCacheByCategory('CATEGORIZATION'),
	all: async () => {
		const categories: (keyof typeof invalidateCacheCategories)[] = [
			'narration',
			'faq',
			'howto',
			'insight',
			'forecast',
			'categorization',
		];

		for (const category of categories) {
			if (category !== 'all') {
				await invalidateCacheCategories[category]();
			}
		}
	},
};

/**
 * Invalidate cache for a specific user
 */
export const invalidateUserCache = (userId: string) => {
	return cacheService.invalidateCacheByUser(userId);
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
	return cacheService.getCacheStats();
};

/**
 * Clean up expired cache entries
 */
export const cleanupExpiredCache = () => {
	return cacheService.cleanupExpiredCache();
};

/**
 * Get invalidation analytics
 */
export const getInvalidationAnalytics = () => {
	const now = Date.now();
	const last24Hours = now - 24 * 60 * 60 * 1000;
	const last7Days = now - 7 * 24 * 60 * 60 * 1000;

	const recentEvents = invalidationEvents.filter(
		(event) => event.timestamp >= last24Hours
	);
	const weeklyEvents = invalidationEvents.filter(
		(event) => event.timestamp >= last7Days
	);

	// Count events by flag
	const flagCounts: Record<string, number> = {};
	const userCounts: Record<string, number> = {};
	const categoryCounts: Record<string, number> = {};

	recentEvents.forEach((event) => {
		flagCounts[event.flag] = (flagCounts[event.flag] || 0) + 1;
		if (event.userId) {
			userCounts[event.userId] = (userCounts[event.userId] || 0) + 1;
		}
		if (event.category) {
			categoryCounts[event.category] =
				(categoryCounts[event.category] || 0) + 1;
		}
	});

	// Find most frequent invalidation patterns
	const mostFrequentFlags = Object.entries(flagCounts)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 5);

	const mostActiveUsers = Object.entries(userCounts)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 5);

	return {
		totalEvents: invalidationEvents.length,
		recentEvents: recentEvents.length,
		weeklyEvents: weeklyEvents.length,
		mostFrequentFlags,
		mostActiveUsers,
		categoryBreakdown: categoryCounts,
		averageEventsPerDay: weeklyEvents.length / 7,
		lastEvent: invalidationEvents[invalidationEvents.length - 1] || null,
	};
};

/**
 * Get invalidation events for a specific user
 */
export const getUserInvalidationEvents = (
	userId: string,
	limit: number = 50
) => {
	return invalidationEvents
		.filter((event) => event.userId === userId)
		.sort((a, b) => b.timestamp - a.timestamp)
		.slice(0, limit);
};

/**
 * Clear invalidation analytics (useful for testing)
 */
export const clearInvalidationAnalytics = () => {
	invalidationEvents.length = 0;
	console.log('[CacheInvalidation] Analytics cleared');
};

/**
 * Conditional invalidation based on data types and user patterns
 */
export const conditionalInvalidation = {
	/**
	 * Invalidate based on transaction amount thresholds
	 */
	onTransactionByAmount: (amount: number, userId?: string) => {
		const reason =
			amount > 1000 ? 'High-value transaction' : 'Transaction added';
		logInvalidationEvent('NEW_TX', reason, userId);

		// For high-value transactions, invalidate more cache categories
		if (amount > 1000) {
			cacheService.setInvalidationFlag('NEW_TX');
			cacheService.setInvalidationFlag('BUDGET_CHANGE'); // High-value affects budget
			setTimeout(() => {
				cacheService.clearInvalidationFlag('NEW_TX');
				cacheService.clearInvalidationFlag('BUDGET_CHANGE');
			}, 5000);
		} else {
			// Regular invalidation for normal transactions
			cacheService.setInvalidationFlag('NEW_TX');
			setTimeout(() => cacheService.clearInvalidationFlag('NEW_TX'), 5000);
		}
	},

	/**
	 * Invalidate based on user activity patterns
	 */
	onUserActivityPattern: (
		userId: string,
		activityType: 'frequent' | 'occasional' | 'rare'
	) => {
		const reason = `User activity pattern: ${activityType}`;
		logInvalidationEvent('USER_ACTIVITY', reason, userId);

		// Adjust invalidation strategy based on user activity
		switch (activityType) {
			case 'frequent':
				// Frequent users get more aggressive invalidation
				cacheService.setInvalidationFlag('NEW_TX');
				cacheService.setInvalidationFlag('BUDGET_CHANGE');
				setTimeout(() => {
					cacheService.clearInvalidationFlag('NEW_TX');
					cacheService.clearInvalidationFlag('BUDGET_CHANGE');
				}, 3000); // Shorter delay for frequent users
				break;
			case 'occasional':
				// Standard invalidation
				cacheService.setInvalidationFlag('NEW_TX');
				setTimeout(() => cacheService.clearInvalidationFlag('NEW_TX'), 5000);
				break;
			case 'rare':
				// Rare users get minimal invalidation to preserve cache
				cacheService.setInvalidationFlag('NEW_TX');
				setTimeout(() => cacheService.clearInvalidationFlag('NEW_TX'), 10000); // Longer delay
				break;
		}
	},

	/**
	 * Invalidate based on data sensitivity
	 */
	onSensitiveDataChange: (
		dataType: 'financial' | 'personal' | 'preferences',
		userId?: string
	) => {
		const reason = `Sensitive data change: ${dataType}`;
		logInvalidationEvent('SENSITIVE_DATA', reason, userId);

		// Different invalidation strategies based on data sensitivity
		switch (dataType) {
			case 'financial':
				// Financial data changes invalidate most cache
				const financialFlags = [
					'NEW_TX',
					'BUDGET_CHANGE',
					'GOAL_UPDATE',
					'FORECAST',
				];
				financialFlags.forEach((flag) =>
					cacheService.setInvalidationFlag(flag)
				);
				setTimeout(() => {
					financialFlags.forEach((flag) =>
						cacheService.clearInvalidationFlag(flag)
					);
				}, 5000);
				break;
			case 'personal':
				// Personal data changes invalidate user-specific cache
				cacheService.setInvalidationFlag('PROFILE_UPDATE');
				if (userId) {
					cacheService.invalidateCacheByUser(userId);
				}
				setTimeout(
					() => cacheService.clearInvalidationFlag('PROFILE_UPDATE'),
					5000
				);
				break;
			case 'preferences':
				// Preferences changes invalidate AI and insight cache
				cacheService.setInvalidationFlag('SETTINGS_CHANGE');
				cacheService.setInvalidationFlag('AI_RESPONSE_GENERATED');
				setTimeout(() => {
					cacheService.clearInvalidationFlag('SETTINGS_CHANGE');
					cacheService.clearInvalidationFlag('AI_RESPONSE_GENERATED');
				}, 5000);
				break;
		}
	},

	/**
	 * Smart invalidation based on cache hit rate
	 */
	onLowCacheHitRate: (hitRate: number, userId?: string) => {
		const reason = `Low cache hit rate: ${(hitRate * 100).toFixed(1)}%`;
		logInvalidationEvent('LOW_HIT_RATE', reason, userId);

		// If hit rate is very low, clear more cache to force refresh
		if (hitRate < 0.3) {
			// Clear all user cache for very low hit rates
			if (userId) {
				cacheService.invalidateCacheByUser(userId);
			}
			// Set multiple flags to invalidate various categories
			const flags = [
				'NEW_TX',
				'BUDGET_CHANGE',
				'GOAL_UPDATE',
				'INSIGHT_GENERATED',
			];
			flags.forEach((flag) => cacheService.setInvalidationFlag(flag));
			setTimeout(() => {
				flags.forEach((flag) => cacheService.clearInvalidationFlag(flag));
			}, 5000);
		} else if (hitRate < 0.5) {
			// Moderate invalidation for low hit rates
			cacheService.setInvalidationFlag('NEW_TX');
			cacheService.setInvalidationFlag('BUDGET_CHANGE');
			setTimeout(() => {
				cacheService.clearInvalidationFlag('NEW_TX');
				cacheService.clearInvalidationFlag('BUDGET_CHANGE');
			}, 5000);
		}
	},
};

export default {
	setCacheInvalidationFlags,
	invalidateCacheCategories,
	invalidateUserCache,
	getCacheStats,
	cleanupExpiredCache,
	getInvalidationAnalytics,
	getUserInvalidationEvents,
	clearInvalidationAnalytics,
	conditionalInvalidation,
};
