/**
 * Fallback Service
 *
 * Provides graceful fallbacks when external services are unavailable.
 * Caches spend plans, budgets, and other financial data for offline access.
 * All cached data is encrypted using SecureCacheService.
 */

import { SecureCacheService } from '../security/secureCacheService';

export interface CachedSpendPlan {
	id: string;
	userId: string;
	plan: {
		monthlyIncome: number;
		totalBudget: number;
		totalSpent: number;
		remaining: number;
		categories: {
			name: string;
			budget: number;
			spent: number;
			remaining: number;
			utilization: number;
		}[];
		recommendations: string[];
		lastUpdated: string;
	};
	createdAt: string;
	expiresAt: string;
}

export interface CachedBudget {
	id: string;
	name: string;
	amount: number;
	spent: number;
	remaining: number;
	utilization: number;
	category: string;
	lastUpdated: string;
}

export interface CachedGoal {
	id: string;
	name: string;
	target: number;
	current: number;
	progress: number;
	dueDate?: string;
	lastUpdated: string;
}

export interface CachedTransaction {
	id: string;
	description: string;
	amount: number;
	category: string;
	date: string;
	type: 'income' | 'expense';
}

export interface FallbackData {
	spendPlans: CachedSpendPlan[];
	budgets: CachedBudget[];
	goals: CachedGoal[];
	transactions: CachedTransaction[];
	lastSync: string;
	version: string;
}

export interface CacheStatistics {
	totalItems: number;
	cacheSize: number;
	hitRate: number;
	lastCleanup: string;
	expiredItems: number;
}

export interface CacheConfig {
	maxCacheSize: number; // in bytes
	maxItems: number;
	compressionEnabled: boolean;
	autoCleanup: boolean;
	cleanupInterval: number; // in milliseconds
}

export class FallbackService {
	private static readonly CACHE_KEYS = {
		FALLBACK_DATA: 'fallback_financial_data',
		SPEND_PLANS: 'cached_spend_plans',
		BUDGETS: 'cached_budgets',
		GOALS: 'cached_goals',
		TRANSACTIONS: 'cached_transactions',
		LAST_SYNC: 'last_sync_timestamp',
		STATISTICS: 'cache_statistics',
		CONFIG: 'cache_config',
	};

	private static readonly CACHE_EXPIRY = {
		SPEND_PLANS: 24 * 60 * 60 * 1000, // 24 hours
		BUDGETS: 2 * 60 * 60 * 1000, // 2 hours
		GOALS: 4 * 60 * 60 * 1000, // 4 hours
		TRANSACTIONS: 30 * 60 * 1000, // 30 minutes
	};

	private static readonly DEFAULT_CONFIG: CacheConfig = {
		maxCacheSize: 10 * 1024 * 1024, // 10MB
		maxItems: 1000,
		compressionEnabled: true,
		autoCleanup: true,
		cleanupInterval: 60 * 60 * 1000, // 1 hour
	};

	private static cacheStats: CacheStatistics = {
		totalItems: 0,
		cacheSize: 0,
		hitRate: 0,
		lastCleanup: new Date().toISOString(),
		expiredItems: 0,
	};

	private static cleanupTimer: ReturnType<typeof setInterval> | null = null;

	/**
	 * Initialize the fallback service with configuration
	 */
	static async initialize(config?: Partial<CacheConfig>): Promise<void> {
		try {
			const mergedConfig = { ...this.DEFAULT_CONFIG, ...config };
			await SecureCacheService.setEncryptedItem(
				this.CACHE_KEYS.CONFIG,
				mergedConfig
			);

			// Load existing statistics
			const stats = await SecureCacheService.getEncryptedItem<CacheStatistics>(
				this.CACHE_KEYS.STATISTICS
			);
			if (stats) {
				this.cacheStats = stats;
			}

			// Start auto cleanup if enabled
			if (mergedConfig.autoCleanup) {
				this.startAutoCleanup();
			}

			console.log('[FallbackService] Initialized successfully');
		} catch (error) {
			console.error('[FallbackService] Failed to initialize:', error);
		}
	}

	/**
	 * Cache financial data for fallback use with validation
	 */
	static async cacheFinancialData(data: Partial<FallbackData>): Promise<void> {
		try {
			const timestamp = new Date().toISOString();

			// Validate data before caching
			if (data.spendPlans && !this.validateSpendPlans(data.spendPlans)) {
				throw new Error('Invalid spend plans data');
			}
			if (data.budgets && !this.validateBudgets(data.budgets)) {
				throw new Error('Invalid budgets data');
			}
			if (data.goals && !this.validateGoals(data.goals)) {
				throw new Error('Invalid goals data');
			}
			if (data.transactions && !this.validateTransactions(data.transactions)) {
				throw new Error('Invalid transactions data');
			}

			// Check cache size limits
			if (await this.isCacheSizeExceeded()) {
				await this.performCleanup();
			}

			if (data.spendPlans) {
				await this.cacheSpendPlans(data.spendPlans);
			}

			if (data.budgets) {
				await this.cacheBudgets(data.budgets);
			}

			if (data.goals) {
				await this.cacheGoals(data.goals);
			}

			if (data.transactions) {
				await this.cacheTransactions(data.transactions);
			}

			// Update last sync timestamp (encrypted) - normalize to object format
			await SecureCacheService.setEncryptedItem(this.CACHE_KEYS.LAST_SYNC, {
				ts: timestamp,
			});

			// Update statistics
			await this.updateStatistics();

			console.log('[FallbackService] Financial data cached successfully');
		} catch (error) {
			console.error('[FallbackService] Failed to cache financial data:', error);
			throw error;
		}
	}

	/**
	 * Get cached spend plans
	 */
	static async getCachedSpendPlans(): Promise<CachedSpendPlan[]> {
		try {
			const spendPlans = await SecureCacheService.getEncryptedItem<
				CachedSpendPlan[]
			>(this.CACHE_KEYS.SPEND_PLANS);
			if (!spendPlans) return [];

			const now = new Date();

			// Filter out expired plans
			const validPlans = spendPlans.filter((plan) => {
				const expiresAt = new Date(plan.expiresAt);
				return expiresAt > now;
			});

			// If we filtered out expired plans, update cache
			if (validPlans.length !== spendPlans.length) {
				await SecureCacheService.setEncryptedItem(
					this.CACHE_KEYS.SPEND_PLANS,
					validPlans
				);
			}

			return validPlans;
		} catch (error) {
			console.error(
				'[FallbackService] Failed to get cached spend plans:',
				error
			);
			return [];
		}
	}

	/**
	 * Get cached budgets
	 */
	static async getCachedBudgets(): Promise<CachedBudget[]> {
		try {
			const budgets = await SecureCacheService.getEncryptedItem<CachedBudget[]>(
				this.CACHE_KEYS.BUDGETS
			);
			if (!budgets) return [];

			const now = new Date();

			// Filter out expired budgets
			const validBudgets = budgets.filter((budget) => {
				const lastUpdated = new Date(budget.lastUpdated);
				const expiry = new Date(
					lastUpdated.getTime() + this.CACHE_EXPIRY.BUDGETS
				);
				return expiry > now;
			});

			return validBudgets;
		} catch (error) {
			console.error('[FallbackService] Failed to get cached budgets:', error);
			return [];
		}
	}

	/**
	 * Get cached goals
	 */
	static async getCachedGoals(): Promise<CachedGoal[]> {
		try {
			const goals = await SecureCacheService.getEncryptedItem<CachedGoal[]>(
				this.CACHE_KEYS.GOALS
			);
			if (!goals) return [];

			const now = new Date();

			// Filter out expired goals
			const validGoals = goals.filter((goal) => {
				const lastUpdated = new Date(goal.lastUpdated);
				const expiry = new Date(
					lastUpdated.getTime() + this.CACHE_EXPIRY.GOALS
				);
				return expiry > now;
			});

			return validGoals;
		} catch (error) {
			console.error('[FallbackService] Failed to get cached goals:', error);
			return [];
		}
	}

	/**
	 * Get cached transactions
	 */
	static async getCachedTransactions(): Promise<CachedTransaction[]> {
		try {
			const transactions = await SecureCacheService.getEncryptedItem<
				CachedTransaction[]
			>(this.CACHE_KEYS.TRANSACTIONS);
			if (!transactions) return [];

			const now = new Date();

			// Filter out expired transactions
			const validTransactions = transactions.filter((transaction) => {
				const lastUpdated = new Date(transaction.date);
				const expiry = new Date(
					lastUpdated.getTime() + this.CACHE_EXPIRY.TRANSACTIONS
				);
				return expiry > now;
			});

			return validTransactions;
		} catch (error) {
			console.error(
				'[FallbackService] Failed to get cached transactions:',
				error
			);
			return [];
		}
	}

	/**
	 * Generate a fallback spend plan from cached data
	 */
	static async generateFallbackSpendPlan(): Promise<CachedSpendPlan | null> {
		try {
			const [budgets, goals, transactions] = await Promise.all([
				this.getCachedBudgets(),
				this.getCachedGoals(),
				this.getCachedTransactions(),
			]);

			if (budgets.length === 0) {
				return null;
			}

			const totalBudget = budgets.reduce(
				(sum, budget) => sum + budget.amount,
				0
			);
			const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
			const remaining = totalBudget - totalSpent;

			// Calculate monthly income estimate from recent transactions
			const incomeTransactions = transactions
				.filter((t) => t.type === 'income')
				.slice(0, 10); // Last 10 income transactions

			const monthlyIncome =
				incomeTransactions.length > 0
					? (incomeTransactions.reduce((sum, t) => sum + t.amount, 0) /
							incomeTransactions.length) *
					  4.33 // Approximate weeks per month
					: totalBudget * 1.2; // Estimate if no income data

			const categories = budgets.map((budget) => ({
				name: budget.name,
				budget: budget.amount,
				spent: budget.spent,
				remaining: budget.remaining,
				utilization: budget.utilization,
			}));

			const recommendations = this.generateRecommendations(
				budgets,
				goals,
				transactions
			);

			const spendPlan: CachedSpendPlan = {
				id: `fallback_${Date.now()}`,
				userId: 'fallback_user',
				plan: {
					monthlyIncome,
					totalBudget,
					totalSpent,
					remaining,
					categories,
					recommendations,
					lastUpdated: new Date().toISOString(),
				},
				createdAt: new Date().toISOString(),
				expiresAt: new Date(
					Date.now() + this.CACHE_EXPIRY.SPEND_PLANS
				).toISOString(),
			};

			return spendPlan;
		} catch (error) {
			console.error(
				'[FallbackService] Failed to generate fallback spend plan:',
				error
			);
			return null;
		}
	}

	/**
	 * Get last sync timestamp
	 */
	static async getLastSyncTime(): Promise<Date | null> {
		try {
			const data = await SecureCacheService.getEncryptedItem<
				{ ts: string | number } | string | number
			>(this.CACHE_KEYS.LAST_SYNC);

			if (!data) return null;

			// Handle both new object format and legacy string/number format
			let timestamp: string | number;
			if (typeof data === 'object' && 'ts' in data) {
				timestamp = data.ts;
			} else {
				timestamp = data;
			}

			return new Date(timestamp);
		} catch (error) {
			console.error('[FallbackService] Failed to get last sync time:', error);
			return null;
		}
	}

	/**
	 * Check if cached data is still valid
	 */
	static async isDataValid(): Promise<boolean> {
		try {
			const lastSync = await this.getLastSyncTime();
			if (!lastSync) return false;

			const now = new Date();
			const maxAge = Math.min(...Object.values(this.CACHE_EXPIRY));
			const expiry = new Date(lastSync.getTime() + maxAge);

			return expiry > now;
		} catch (error) {
			console.error('[FallbackService] Failed to check data validity:', error);
			return false;
		}
	}

	/**
	 * Clear all cached data
	 */
	static async clearCache(): Promise<void> {
		try {
			await Promise.all([
				SecureCacheService.removeEncryptedItem(this.CACHE_KEYS.SPEND_PLANS),
				SecureCacheService.removeEncryptedItem(this.CACHE_KEYS.BUDGETS),
				SecureCacheService.removeEncryptedItem(this.CACHE_KEYS.GOALS),
				SecureCacheService.removeEncryptedItem(this.CACHE_KEYS.TRANSACTIONS),
				SecureCacheService.removeEncryptedItem(this.CACHE_KEYS.LAST_SYNC),
			]);

			console.log('[FallbackService] Encrypted cache cleared successfully');
		} catch (error) {
			console.error(
				'[FallbackService] Failed to clear encrypted cache:',
				error
			);
		}
	}

	private static async cacheSpendPlans(
		plans: CachedSpendPlan[]
	): Promise<void> {
		await SecureCacheService.setEncryptedItem(
			this.CACHE_KEYS.SPEND_PLANS,
			plans
		);
	}

	private static async cacheBudgets(budgets: CachedBudget[]): Promise<void> {
		await SecureCacheService.setEncryptedItem(this.CACHE_KEYS.BUDGETS, budgets);
	}

	private static async cacheGoals(goals: CachedGoal[]): Promise<void> {
		await SecureCacheService.setEncryptedItem(this.CACHE_KEYS.GOALS, goals);
	}

	private static async cacheTransactions(
		transactions: CachedTransaction[]
	): Promise<void> {
		await SecureCacheService.setEncryptedItem(
			this.CACHE_KEYS.TRANSACTIONS,
			transactions
		);
	}

	private static generateRecommendations(
		budgets: CachedBudget[],
		goals: CachedGoal[],
		transactions: CachedTransaction[]
	): string[] {
		const recommendations: string[] = [];

		// Check for over-budget categories
		const overBudget = budgets.filter((b) => b.utilization > 1);
		if (overBudget.length > 0) {
			recommendations.push(
				`You're over budget in ${overBudget
					.map((b) => b.name)
					.join(', ')}. Consider reducing spending in these categories.`
			);
		}

		// Check for under-utilized budgets
		const underUtilized = budgets.filter((b) => b.utilization < 0.3);
		if (underUtilized.length > 0) {
			recommendations.push(
				`You have unused budget in ${underUtilized
					.map((b) => b.name)
					.join(', ')}. Consider reallocating or saving more.`
			);
		}

		// Check goal progress
		const behindGoals = goals.filter((g) => g.progress < 0.5);
		if (behindGoals.length > 0) {
			recommendations.push(
				`You're behind on ${behindGoals
					.map((g) => g.name)
					.join(', ')}. Consider increasing your savings rate.`
			);
		}

		// Check spending trends
		const recentTransactions = transactions.slice(0, 10);
		const avgSpending =
			recentTransactions
				.filter((t) => t.type === 'expense')
				.reduce((sum, t) => sum + t.amount, 0) / recentTransactions.length;

		if (avgSpending > 0) {
			const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
			const dailyBudget = totalBudget / 30;

			if (avgSpending > dailyBudget * 1.5) {
				recommendations.push(
					'Your recent spending is higher than your daily budget. Consider tracking expenses more closely.'
				);
			}
		}

		// Default recommendation if no specific issues
		if (recommendations.length === 0) {
			recommendations.push(
				'Your spending looks on track! Keep monitoring your budgets and goals.'
			);
		}

		return recommendations;
	}

	/**
	 * Get cache configuration
	 */
	private static async getConfig(): Promise<CacheConfig> {
		const config = await SecureCacheService.getEncryptedItem<CacheConfig>(
			this.CACHE_KEYS.CONFIG
		);
		return config || this.DEFAULT_CONFIG;
	}

	/**
	 * Validate spend plans data
	 */
	private static validateSpendPlans(plans: CachedSpendPlan[]): boolean {
		return plans.every(
			(plan) =>
				plan.id &&
				plan.userId &&
				plan.plan &&
				typeof plan.plan.monthlyIncome === 'number' &&
				typeof plan.plan.totalBudget === 'number' &&
				Array.isArray(plan.plan.categories) &&
				Array.isArray(plan.plan.recommendations) &&
				plan.createdAt &&
				plan.expiresAt
		);
	}

	/**
	 * Validate budgets data
	 */
	private static validateBudgets(budgets: CachedBudget[]): boolean {
		return budgets.every(
			(budget) =>
				budget.id &&
				budget.name &&
				typeof budget.amount === 'number' &&
				typeof budget.spent === 'number' &&
				typeof budget.remaining === 'number' &&
				typeof budget.utilization === 'number' &&
				budget.category &&
				budget.lastUpdated
		);
	}

	/**
	 * Validate goals data
	 */
	private static validateGoals(goals: CachedGoal[]): boolean {
		return goals.every(
			(goal) =>
				goal.id &&
				goal.name &&
				typeof goal.target === 'number' &&
				typeof goal.current === 'number' &&
				typeof goal.progress === 'number' &&
				goal.lastUpdated
		);
	}

	/**
	 * Validate transactions data
	 */
	private static validateTransactions(
		transactions: CachedTransaction[]
	): boolean {
		return transactions.every(
			(transaction) =>
				transaction.id &&
				transaction.description &&
				typeof transaction.amount === 'number' &&
				transaction.category &&
				transaction.date &&
				(transaction.type === 'income' || transaction.type === 'expense')
		);
	}

	/**
	 * Check if cache size is exceeded
	 */
	private static async isCacheSizeExceeded(): Promise<boolean> {
		const config = await this.getConfig();
		return (
			this.cacheStats.cacheSize > config.maxCacheSize ||
			this.cacheStats.totalItems > config.maxItems
		);
	}

	/**
	 * Perform cache cleanup
	 */
	private static async performCleanup(): Promise<void> {
		try {
			let cleanedItems = 0;

			// Clean expired spend plans
			const spendPlans = await this.getCachedSpendPlans();
			const validSpendPlans = spendPlans.filter((plan) => {
				const expiresAt = new Date(plan.expiresAt);
				return expiresAt > new Date();
			});
			if (validSpendPlans.length !== spendPlans.length) {
				await this.cacheSpendPlans(validSpendPlans);
				cleanedItems += spendPlans.length - validSpendPlans.length;
			}

			// Clean expired budgets
			const budgets = await this.getCachedBudgets();
			const validBudgets = budgets.filter((budget) => {
				const lastUpdated = new Date(budget.lastUpdated);
				const expiry = new Date(
					lastUpdated.getTime() + this.CACHE_EXPIRY.BUDGETS
				);
				return expiry > new Date();
			});
			if (validBudgets.length !== budgets.length) {
				await this.cacheBudgets(validBudgets);
				cleanedItems += budgets.length - validBudgets.length;
			}

			// Clean expired goals
			const goals = await this.getCachedGoals();
			const validGoals = goals.filter((goal) => {
				const lastUpdated = new Date(goal.lastUpdated);
				const expiry = new Date(
					lastUpdated.getTime() + this.CACHE_EXPIRY.GOALS
				);
				return expiry > new Date();
			});
			if (validGoals.length !== goals.length) {
				await this.cacheGoals(validGoals);
				cleanedItems += goals.length - validGoals.length;
			}

			// Clean expired transactions
			const transactions = await this.getCachedTransactions();
			const validTransactions = transactions.filter((transaction) => {
				const lastUpdated = new Date(transaction.date);
				const expiry = new Date(
					lastUpdated.getTime() + this.CACHE_EXPIRY.TRANSACTIONS
				);
				return expiry > new Date();
			});
			if (validTransactions.length !== transactions.length) {
				await this.cacheTransactions(validTransactions);
				cleanedItems += transactions.length - validTransactions.length;
			}

			// Update statistics
			this.cacheStats.expiredItems += cleanedItems;
			this.cacheStats.lastCleanup = new Date().toISOString();
			await this.updateStatistics();

			console.log(`[FallbackService] Cleaned up ${cleanedItems} expired items`);
		} catch (error) {
			console.error('[FallbackService] Failed to perform cleanup:', error);
		}
	}

	/**
	 * Start auto cleanup timer
	 */
	private static startAutoCleanup(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
		}

		this.cleanupTimer = setInterval(async () => {
			await this.performCleanup();
		}, this.DEFAULT_CONFIG.cleanupInterval);
	}

	/**
	 * Stop auto cleanup timer
	 */
	static stopAutoCleanup(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
			this.cleanupTimer = null;
		}
	}

	/**
	 * Update cache statistics
	 */
	private static async updateStatistics(): Promise<void> {
		try {
			const [spendPlans, budgets, goals, transactions] = await Promise.all([
				this.getCachedSpendPlans(),
				this.getCachedBudgets(),
				this.getCachedGoals(),
				this.getCachedTransactions(),
			]);

			this.cacheStats.totalItems =
				spendPlans.length + budgets.length + goals.length + transactions.length;

			// Estimate cache size (rough calculation)
			const spendPlansSize = JSON.stringify(spendPlans).length;
			const budgetsSize = JSON.stringify(budgets).length;
			const goalsSize = JSON.stringify(goals).length;
			const transactionsSize = JSON.stringify(transactions).length;

			this.cacheStats.cacheSize =
				spendPlansSize + budgetsSize + goalsSize + transactionsSize;

			await SecureCacheService.setEncryptedItem(
				this.CACHE_KEYS.STATISTICS,
				this.cacheStats
			);
		} catch (error) {
			console.error('[FallbackService] Failed to update statistics:', error);
		}
	}

	/**
	 * Get cache statistics
	 */
	static async getCacheStatistics(): Promise<CacheStatistics> {
		const stats = await SecureCacheService.getEncryptedItem<CacheStatistics>(
			this.CACHE_KEYS.STATISTICS
		);
		return stats || this.cacheStats;
	}

	/**
	 * Batch cache multiple data types
	 */
	static async batchCacheData(data: FallbackData): Promise<void> {
		try {
			await this.cacheFinancialData(data);
			console.log('[FallbackService] Batch cache completed successfully');
		} catch (error) {
			console.error('[FallbackService] Batch cache failed:', error);
			throw error;
		}
	}

	/**
	 * Warm cache with essential data
	 */
	static async warmCache(): Promise<void> {
		try {
			// Try to generate fallback spend plan to warm cache
			await this.generateFallbackSpendPlan();
			console.log('[FallbackService] Cache warmed successfully');
		} catch (error) {
			console.error('[FallbackService] Cache warming failed:', error);
		}
	}

	/**
	 * Get cache health status
	 */
	static async getCacheHealth(): Promise<{
		isHealthy: boolean;
		issues: string[];
		recommendations: string[];
	}> {
		const issues: string[] = [];
		const recommendations: string[] = [];
		const config = await this.getConfig();
		const stats = await this.getCacheStatistics();

		// Check cache size
		if (stats.cacheSize > config.maxCacheSize * 0.9) {
			issues.push('Cache size is approaching limit');
			recommendations.push(
				'Consider increasing maxCacheSize or performing cleanup'
			);
		}

		// Check item count
		if (stats.totalItems > config.maxItems * 0.9) {
			issues.push('Item count is approaching limit');
			recommendations.push(
				'Consider increasing maxItems or performing cleanup'
			);
		}

		// Check expired items
		if (stats.expiredItems > stats.totalItems * 0.5) {
			issues.push('High number of expired items');
			recommendations.push('Consider adjusting cache expiry times');
		}

		// Check last cleanup
		const lastCleanup = new Date(stats.lastCleanup);
		const hoursSinceCleanup =
			(Date.now() - lastCleanup.getTime()) / (1000 * 60 * 60);
		if (hoursSinceCleanup > 24) {
			issues.push('Cache cleanup is overdue');
			recommendations.push('Perform manual cleanup or enable auto cleanup');
		}

		return {
			isHealthy: issues.length === 0,
			issues,
			recommendations,
		};
	}

	/**
	 * Reset cache statistics
	 */
	static async resetStatistics(): Promise<void> {
		this.cacheStats = {
			totalItems: 0,
			cacheSize: 0,
			hitRate: 0,
			lastCleanup: new Date().toISOString(),
			expiredItems: 0,
		};
		await SecureCacheService.setEncryptedItem(
			this.CACHE_KEYS.STATISTICS,
			this.cacheStats
		);
	}
}
