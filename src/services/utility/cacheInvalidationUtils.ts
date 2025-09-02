import SmartCacheService from './smartCacheService';

/**
 * Utility functions for managing cache invalidation flags
 * This helps ensure cache is invalidated when relevant data changes
 */

const cacheService = SmartCacheService.getInstance();

/**
 * Set cache invalidation flags based on data changes
 */
export const setCacheInvalidationFlags = {
	// Financial data changes
	onNewTransaction: () => {
		cacheService.setInvalidationFlag('NEW_TX');
		// Clear after a short delay to allow immediate invalidation
		setTimeout(() => cacheService.clearInvalidationFlag('NEW_TX'), 5000);
	},

	onBudgetChange: () => {
		cacheService.setInvalidationFlag('BUDGET_CHANGE');
		setTimeout(() => cacheService.clearInvalidationFlag('BUDGET_CHANGE'), 5000);
	},

	onGoalUpdate: () => {
		cacheService.setInvalidationFlag('GOAL_UPDATE');
		setTimeout(() => cacheService.clearInvalidationFlag('GOAL_UPDATE'), 5000);
	},

	onCategoryUpdate: () => {
		cacheService.setInvalidationFlag('CATEGORY_UPDATE');
		setTimeout(
			() => cacheService.clearInvalidationFlag('CATEGORY_UPDATE'),
			5000
		);
	},

	onRecurringExpenseChange: () => {
		cacheService.setInvalidationFlag('RECURRING_EXPENSE_CHANGE');
		setTimeout(
			() => cacheService.clearInvalidationFlag('RECURRING_EXPENSE_CHANGE'),
			5000
		);
	},

	// Profile and settings changes
	onProfileUpdate: () => {
		cacheService.setInvalidationFlag('PROFILE_UPDATE');
		setTimeout(
			() => cacheService.clearInvalidationFlag('PROFILE_UPDATE'),
			5000
		);
	},

	onSettingsChange: () => {
		cacheService.setInvalidationFlag('SETTINGS_CHANGE');
		setTimeout(
			() => cacheService.clearInvalidationFlag('SETTINGS_CHANGE'),
			5000
		);
	},

	// AI and insights related
	onAIResponseGenerated: () => {
		cacheService.setInvalidationFlag('AI_RESPONSE_GENERATED');
		setTimeout(
			() => cacheService.clearInvalidationFlag('AI_RESPONSE_GENERATED'),
			5000
		);
	},

	onInsightGenerated: () => {
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
		const categories: Array<keyof typeof invalidateCacheCategories> = [
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

export default {
	setCacheInvalidationFlags,
	invalidateCacheCategories,
	invalidateUserCache,
	getCacheStats,
	cleanupExpiredCache,
};
