import { SecureCacheService } from '../security/secureCacheService';

// Enhanced cache categories with specific TTLs
export type CacheCategory =
	| 'NARRATION'
	| 'FAQ'
	| 'HOWTO'
	| 'INSIGHT'
	| 'FORECAST'
	| 'CATEGORIZATION';

// TTL configuration by category (in milliseconds)
const TTL_BY_CATEGORY: Record<CacheCategory, number> = {
	NARRATION: 2 * 60 * 1000, // 2 minutes - very short for dynamic content
	FAQ: 7 * 24 * 60 * 60 * 1000, // 7 days - longer for static content
	HOWTO: 30 * 24 * 60 * 60 * 1000, // 30 days - longest for educational content
	INSIGHT: 24 * 60 * 60 * 1000, // 24 hours - medium for analytical content
	FORECAST: 6 * 60 * 60 * 1000, // 6 hours - shorter for time-sensitive data
	CATEGORIZATION: 12 * 60 * 60 * 1000, // 12 hours - medium for classification
};

export interface CacheEntry {
	id: string;
	query: string;
	response: any;
	createdAt: number; // Changed from timestamp for clarity
	userId: string;
	usageCount: number;
	lastUsed: number;
	category: CacheCategory;
	confidence: number;
	compressed?: boolean;
	originalSize?: number;
	compressedSize?: number;
}

export interface UserPattern {
	userId: string;
	commonQueries: string[];
	queryFrequency: Map<string, number>;
	responsePreferences: Map<string, any>;
	lastUpdated: number;
}

export class SmartCacheService {
	private static instance: SmartCacheService;
	private cache = new Map<string, CacheEntry>();
	private userPatterns = new Map<string, UserPattern>();
	private readonly MAX_CACHE_SIZE = 1000;
	private readonly MIN_CONFIDENCE = 0.7;

	// Cache invalidation flags for intelligent cache management
	private invalidationFlags = new Set<string>();

	// Hit rate tracking
	private hitCount = 0;
	private missCount = 0;
	private totalRequests = 0;
	private responseTimes: number[] = [];

	static getInstance(): SmartCacheService {
		if (!SmartCacheService.instance) {
			SmartCacheService.instance = new SmartCacheService();
		}
		return SmartCacheService.instance;
	}

	/**
	 * Set invalidation flag to trigger cache invalidation
	 */
	setInvalidationFlag(flag: string): void {
		this.invalidationFlags.add(flag);
		console.log(`[SmartCacheService] Set invalidation flag: ${flag}`);
	}

	/**
	 * Clear invalidation flag
	 */
	clearInvalidationFlag(flag: string): void {
		this.invalidationFlags.delete(flag);
		console.log(`[SmartCacheService] Cleared invalidation flag: ${flag}`);
	}

	/**
	 * Check if cache entry is valid based on category TTL and invalidation flags
	 */
	isCacheValid(entry: CacheEntry): boolean {
		const ttl = TTL_BY_CATEGORY[entry.category] ?? 60_000; // Default 1 minute
		const fresh = Date.now() - entry.createdAt < ttl;

		// Special invalidation rules by category
		if (
			entry.category === 'NARRATION' &&
			this.invalidationFlags.has('NEW_TX')
		) {
			console.log(
				'[SmartCacheService] Invalidating narration cache due to new transactions'
			);
			return false;
		}

		if (
			entry.category === 'FORECAST' &&
			this.invalidationFlags.has('BUDGET_CHANGE')
		) {
			console.log(
				'[SmartCacheService] Invalidating forecast cache due to budget changes'
			);
			return false;
		}

		if (
			entry.category === 'INSIGHT' &&
			this.invalidationFlags.has('GOAL_UPDATE')
		) {
			console.log(
				'[SmartCacheService] Invalidating insight cache due to goal updates'
			);
			return false;
		}

		if (
			entry.category === 'CATEGORIZATION' &&
			this.invalidationFlags.has('CATEGORY_UPDATE')
		) {
			console.log(
				'[SmartCacheService] Invalidating categorization cache due to category updates'
			);
			return false;
		}

		return fresh;
	}

	/**
	 * Initialize cache from storage
	 */
	async initialize(): Promise<void> {
		try {
			console.log('[SmartCacheService] Starting cache initialization...');

			// Add timeout protection for storage operations
			const storageTimeout = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Storage operation timeout')), 5000);
			});

			const initPromise = Promise.all([
				this.loadCacheFromStorage(),
				this.loadUserPatterns(),
			]);

			await Promise.race([initPromise, storageTimeout]);

			console.log('[SmartCacheService] Cache initialized successfully');
		} catch (error) {
			console.error('[SmartCacheService] Error initializing cache:', error);
			// Don't throw - allow service to continue with empty cache
			this.cache = new Map();
			this.userPatterns = new Map();
		}
	}

	/**
	 * Get cached response if available and valid
	 */
	async getCachedResponse(
		query: string,
		userId: string,
		category: CacheCategory
	): Promise<any | null> {
		this.totalRequests++;
		const cacheKey = this.generateCacheKey(query, userId, category);
		const entry = this.cache.get(cacheKey);

		if (!entry) {
			this.missCount++;
			return null;
		}

		// Check if cache is still valid using enhanced validation
		if (!this.isCacheValid(entry)) {
			this.cache.delete(cacheKey);
			this.missCount++;
			return null;
		}

		// Update usage statistics
		entry.usageCount++;
		entry.lastUsed = Date.now();
		this.cache.set(cacheKey, entry);

		// Update user patterns
		this.updateUserPattern(userId, query, category);

		// Track hit
		this.hitCount++;

		// Track response time for analytics
		const responseTime = Date.now() - entry.createdAt;
		this.responseTimes.push(responseTime);

		// Keep only last 100 response times for memory efficiency
		if (this.responseTimes.length > 100) {
			this.responseTimes = this.responseTimes.slice(-100);
		}

		// Decompress response if needed
		const response = entry.compressed
			? this.decompressResponse(entry.response)
			: entry.response;

		console.log(
			`[SmartCacheService] Cache hit for ${category}: ${query.substring(
				0,
				50
			)}...`
		);
		return response;
	}

	/**
	 * Cache a response for future use
	 */
	async cacheResponse(
		query: string,
		response: any,
		userId: string,
		category: CacheCategory,
		confidence: number = 1.0
	): Promise<void> {
		if (confidence < this.MIN_CONFIDENCE) {
			console.log(
				`[SmartCacheService] Skipping cache for low confidence response: ${confidence}`
			);
			return;
		}

		const cacheKey = this.generateCacheKey(query, userId, category);

		// Compress response if it's large enough
		const { compressedResponse, compressed, originalSize, compressedSize } =
			this.compressResponse(response);

		const entry: CacheEntry = {
			id: cacheKey,
			query,
			response: compressedResponse,
			createdAt: Date.now(),
			userId,
			usageCount: 1,
			lastUsed: Date.now(),
			category,
			confidence,
			compressed,
			originalSize,
			compressedSize,
		};

		// Check cache size limit
		if (this.cache.size >= this.MAX_CACHE_SIZE) {
			this.evictLeastUsed();
		}

		this.cache.set(cacheKey, entry);
		this.updateUserPattern(userId, query, category);

		// Persist to storage
		await this.persistCacheToStorage();
		console.log(
			`[SmartCacheService] Cached ${category} response for: ${query.substring(
				0,
				50
			)}... ${
				compressed
					? `(compressed: ${originalSize} -> ${compressedSize} bytes)`
					: ''
			}`
		);
	}

	/**
	 * Check if we should use AI or cached response
	 */
	shouldUseAI(query: string, userId: string, category: CacheCategory): boolean {
		const pattern = this.userPatterns.get(userId);
		if (!pattern) return true;

		// Check if this is a common query that we can cache
		const isCommonQuery = pattern.commonQueries.includes(query);
		const hasRecentCache = this.hasRecentCache(query, userId, category);

		// Use AI for new or complex queries, cache for common ones
		return !isCommonQuery || !hasRecentCache;
	}

	/**
	 * Get cache statistics with category breakdown
	 */
	getCacheStats(): {
		totalEntries: number;
		hitRate: number;
		memoryUsage: number;
		userPatterns: number;
		categoryBreakdown: Record<CacheCategory, number>;
		hitCount: number;
		missCount: number;
		totalRequests: number;
		averageResponseTime: number;
		mostUsedQueries: {
			query: string;
			usageCount: number;
			category: CacheCategory;
		}[];
		oldestEntry: number;
		newestEntry: number;
	} {
		try {
			const totalEntries = this.cache.size;
			const userPatterns = this.userPatterns.size;

			// Calculate category breakdown
			const categoryBreakdown: Record<CacheCategory, number> = {} as Record<
				CacheCategory,
				number
			>;
			for (const category of Object.keys(TTL_BY_CATEGORY) as CacheCategory[]) {
				categoryBreakdown[category] = 0;
			}

			let oldestEntry = Date.now();
			let newestEntry = 0;
			const mostUsedQueries: {
				query: string;
				usageCount: number;
				category: CacheCategory;
			}[] = [];

			for (const entry of this.cache.values()) {
				if (categoryBreakdown[entry.category] !== undefined) {
					categoryBreakdown[entry.category]++;
				}

				// Track oldest and newest entries
				if (entry.createdAt < oldestEntry) {
					oldestEntry = entry.createdAt;
				}
				if (entry.createdAt > newestEntry) {
					newestEntry = entry.createdAt;
				}

				// Track most used queries
				mostUsedQueries.push({
					query: entry.query,
					usageCount: entry.usageCount,
					category: entry.category,
				});
			}

			// Sort by usage count and take top 10
			mostUsedQueries.sort((a, b) => b.usageCount - a.usageCount);
			const topQueries = mostUsedQueries.slice(0, 10);

			// Calculate approximate memory usage
			const memoryUsage = this.estimateMemoryUsage();

			return {
				totalEntries,
				hitRate: this.calculateHitRate(),
				memoryUsage,
				userPatterns,
				categoryBreakdown,
				hitCount: this.hitCount,
				missCount: this.missCount,
				totalRequests: this.totalRequests,
				averageResponseTime: this.calculateAverageResponseTime(),
				mostUsedQueries: topQueries,
				oldestEntry,
				newestEntry,
			};
		} catch (error) {
			console.error('[SmartCacheService] Error getting cache stats:', error);
			// Return safe defaults
			return {
				totalEntries: 0,
				hitRate: 0,
				memoryUsage: 0,
				userPatterns: 0,
				categoryBreakdown: {} as Record<CacheCategory, number>,
				hitCount: 0,
				missCount: 0,
				totalRequests: 0,
				averageResponseTime: 0,
				mostUsedQueries: [],
				oldestEntry: 0,
				newestEntry: 0,
			};
		}
	}

	/**
	 * Get detailed analytics for a specific user
	 */
	getUserAnalytics(userId: string): {
		userPattern: UserPattern | null;
		cacheEntries: number;
		totalUsage: number;
		mostFrequentQueries: { query: string; frequency: number }[];
		categoryPreferences: Record<CacheCategory, number>;
		lastActivity: number;
	} {
		const pattern = this.userPatterns.get(userId);
		if (!pattern) {
			return {
				userPattern: null,
				cacheEntries: 0,
				totalUsage: 0,
				mostFrequentQueries: [],
				categoryPreferences: {} as Record<CacheCategory, number>,
				lastActivity: 0,
			};
		}

		// Count user's cache entries
		let cacheEntries = 0;
		let totalUsage = 0;
		const categoryPreferences: Record<CacheCategory, number> = {} as Record<
			CacheCategory,
			number
		>;
		let lastActivity = 0;

		for (const entry of this.cache.values()) {
			if (entry.userId === userId) {
				cacheEntries++;
				totalUsage += entry.usageCount;

				if (categoryPreferences[entry.category] === undefined) {
					categoryPreferences[entry.category] = 0;
				}
				categoryPreferences[entry.category]++;

				if (entry.lastUsed > lastActivity) {
					lastActivity = entry.lastUsed;
				}
			}
		}

		// Get most frequent queries
		const mostFrequentQueries = Array.from(pattern.queryFrequency.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([query, frequency]) => ({ query, frequency }));

		return {
			userPattern: pattern,
			cacheEntries,
			totalUsage,
			mostFrequentQueries,
			categoryPreferences,
			lastActivity,
		};
	}

	/**
	 * Clear expired cache entries using category-specific TTLs
	 */
	async cleanupExpiredCache(): Promise<void> {
		const now = Date.now();
		const expiredKeys: string[] = [];

		for (const [key, entry] of this.cache.entries()) {
			const ttl = TTL_BY_CATEGORY[entry.category] ?? 60_000;
			if (now - entry.createdAt > ttl) {
				expiredKeys.push(key);
			}
		}

		expiredKeys.forEach((key) => this.cache.delete(key));

		if (expiredKeys.length > 0) {
			console.log(
				`[SmartCacheService] Cleaned up ${expiredKeys.length} expired entries`
			);
			await this.persistCacheToStorage();
		}
	}

	/**
	 * Invalidate cache by category
	 */
	async invalidateCacheByCategory(category: CacheCategory): Promise<void> {
		const keysToDelete: string[] = [];

		for (const [key, entry] of this.cache.entries()) {
			if (entry.category === category) {
				keysToDelete.push(key);
			}
		}

		keysToDelete.forEach((key) => this.cache.delete(key));

		if (keysToDelete.length > 0) {
			console.log(
				`[SmartCacheService] Invalidated ${keysToDelete.length} ${category} cache entries`
			);
			await this.persistCacheToStorage();
		}
	}

	/**
	 * Invalidate cache by user
	 */
	async invalidateCacheByUser(userId: string): Promise<void> {
		const keysToDelete: string[] = [];

		for (const [key, entry] of this.cache.entries()) {
			if (entry.userId === userId) {
				keysToDelete.push(key);
			}
		}

		keysToDelete.forEach((key) => this.cache.delete(key));

		if (keysToDelete.length > 0) {
			console.log(
				`[SmartCacheService] Invalidated ${keysToDelete.length} cache entries for user ${userId}`
			);
			await this.persistCacheToStorage();
		}
	}

	/**
	 * Warm cache with common queries for a user
	 */
	async warmCacheForUser(
		userId: string,
		aiQueryFunction: (query: string, category: CacheCategory) => Promise<any>
	): Promise<void> {
		const pattern = this.userPatterns.get(userId);
		if (!pattern || pattern.commonQueries.length === 0) {
			console.log(
				`[SmartCacheService] No common queries found for user ${userId}`
			);
			return;
		}

		console.log(
			`[SmartCacheService] Warming cache for user ${userId} with ${pattern.commonQueries.length} common queries`
		);

		// Warm cache with top common queries
		const queriesToWarm = pattern.commonQueries.slice(0, 10); // Top 10 most common

		for (const query of queriesToWarm) {
			try {
				// Determine category based on query content
				const category = this.determineQueryCategory(query);

				// Check if already cached and valid
				const existing = await this.getCachedResponse(query, userId, category);
				if (existing) {
					continue; // Already cached and valid
				}

				// Query AI and cache response
				const response = await aiQueryFunction(query, category);
				if (response) {
					await this.cacheResponse(query, response, userId, category, 0.9);
				}
			} catch (error) {
				console.error(
					`[SmartCacheService] Error warming cache for query "${query}":`,
					error
				);
			}
		}

		console.log(
			`[SmartCacheService] Cache warming completed for user ${userId}`
		);
	}

	/**
	 * Determine query category based on content analysis
	 */
	private determineQueryCategory(query: string): CacheCategory {
		const lowerQuery = query.toLowerCase();

		if (lowerQuery.includes('how to') || lowerQuery.includes('how do')) {
			return 'HOWTO';
		}
		if (lowerQuery.includes('what is') || lowerQuery.includes('explain')) {
			return 'FAQ';
		}
		if (lowerQuery.includes('forecast') || lowerQuery.includes('predict')) {
			return 'FORECAST';
		}
		if (lowerQuery.includes('insight') || lowerQuery.includes('analyze')) {
			return 'INSIGHT';
		}
		if (lowerQuery.includes('categorize') || lowerQuery.includes('classify')) {
			return 'CATEGORIZATION';
		}

		// Default to narration for general queries
		return 'NARRATION';
	}

	/**
	 * Get cache health status and recommendations
	 */
	getCacheHealth(): {
		status: 'healthy' | 'warning' | 'critical';
		recommendations: string[];
		metrics: {
			hitRate: number;
			memoryUsage: number;
			avgResponseTime: number;
			compressionRatio: number;
		};
	} {
		const stats = this.getCacheStats();
		const recommendations: string[] = [];
		let status: 'healthy' | 'warning' | 'critical' = 'healthy';

		// Check hit rate
		if (stats.hitRate < 0.5) {
			status = 'critical';
			recommendations.push(
				'Hit rate is very low. Consider warming cache or adjusting TTL settings.'
			);
		} else if (stats.hitRate < 0.7) {
			status = 'warning';
			recommendations.push(
				'Hit rate is below optimal. Consider cache warming.'
			);
		}

		// Check memory usage
		if (stats.memoryUsage > 10 * 1024 * 1024) {
			// 10MB
			status = status === 'critical' ? 'critical' : 'warning';
			recommendations.push(
				'Memory usage is high. Consider increasing cache size limit or enabling more aggressive compression.'
			);
		}

		// Check response time
		if (stats.averageResponseTime > 1000) {
			// 1 second
			status = status === 'critical' ? 'critical' : 'warning';
			recommendations.push(
				'Average response time is high. Consider optimizing cache retrieval.'
			);
		}

		// Calculate compression ratio
		let totalOriginalSize = 0;
		let totalCompressedSize = 0;
		for (const entry of this.cache.values()) {
			if (entry.compressed && entry.originalSize && entry.compressedSize) {
				totalOriginalSize += entry.originalSize;
				totalCompressedSize += entry.compressedSize;
			}
		}
		const compressionRatio =
			totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 1;

		if (compressionRatio > 0.8) {
			recommendations.push(
				'Compression ratio is low. Consider enabling more aggressive compression.'
			);
		}

		return {
			status,
			recommendations,
			metrics: {
				hitRate: stats.hitRate,
				memoryUsage: stats.memoryUsage,
				avgResponseTime: stats.averageResponseTime,
				compressionRatio,
			},
		};
	}

	// Private helper methods

	private generateCacheKey(
		query: string,
		userId: string,
		category: string
	): string {
		const normalizedQuery = query.toLowerCase().trim();
		return `${userId}:${category}:${this.hashString(normalizedQuery)}`;
	}

	private hashString(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash).toString(36);
	}

	private hasRecentCache(
		query: string,
		userId: string,
		category: CacheCategory
	): boolean {
		const cacheKey = this.generateCacheKey(query, userId, category);
		const entry = this.cache.get(cacheKey);
		if (!entry) return false;

		// Consider cache recent if used within last 12 hours
		const recentThreshold = 12 * 60 * 60 * 1000;
		return Date.now() - entry.lastUsed < recentThreshold;
	}

	private updateUserPattern(
		userId: string,
		query: string,
		category: string
	): void {
		let pattern = this.userPatterns.get(userId);
		if (!pattern) {
			pattern = {
				userId,
				commonQueries: [],
				queryFrequency: new Map(),
				responsePreferences: new Map(),
				lastUpdated: Date.now(),
			};
			this.userPatterns.set(userId, pattern);
		}

		// Update query frequency
		const currentFreq = pattern.queryFrequency.get(query) || 0;
		pattern.queryFrequency.set(query, currentFreq + 1);

		// Update common queries (top 20 most frequent)
		const sortedQueries = Array.from(pattern.queryFrequency.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 20)
			.map(([query]) => query);

		pattern.commonQueries = sortedQueries;
		pattern.lastUpdated = Date.now();

		// Persist patterns
		this.persistUserPatterns();
	}

	private evictLeastUsed(): void {
		// Use intelligent prioritization for eviction
		const entries = Array.from(this.cache.entries());

		// Calculate priority score for each entry
		const scoredEntries = entries.map(([key, entry]) => ({
			key,
			entry,
			score: this.calculatePriorityScore(entry),
		}));

		// Sort by priority score (lowest first for eviction)
		scoredEntries.sort((a, b) => a.score - b.score);

		// Evict the lowest priority entry
		if (scoredEntries.length > 0) {
			const toEvict = scoredEntries[0];
			this.cache.delete(toEvict.key);
			console.log(
				`[SmartCacheService] Evicted cache entry with priority score ${toEvict.score}`
			);
		}
	}

	/**
	 * Calculate priority score for cache entry (lower score = more likely to be evicted)
	 */
	private calculatePriorityScore(entry: CacheEntry): number {
		const now = Date.now();
		const age = now - entry.createdAt;
		const timeSinceLastUse = now - entry.lastUsed;

		// Base score starts with usage count (higher usage = higher priority)
		let score = entry.usageCount;

		// Adjust for confidence (higher confidence = higher priority)
		score += entry.confidence * 10;

		// Adjust for category importance
		const categoryWeight = this.getCategoryWeight(entry.category);
		score += categoryWeight;

		// Penalize old entries
		const agePenalty = age / (24 * 60 * 60 * 1000); // Days since creation
		score -= agePenalty * 0.1;

		// Penalize unused entries
		const unusedPenalty = timeSinceLastUse / (60 * 60 * 1000); // Hours since last use
		score -= unusedPenalty * 0.05;

		// Bonus for recent entries
		if (age < 60 * 60 * 1000) {
			// Less than 1 hour old
			score += 5;
		}

		return Math.max(0, score); // Ensure non-negative score
	}

	/**
	 * Get category weight for prioritization
	 */
	private getCategoryWeight(category: CacheCategory): number {
		const weights: Record<CacheCategory, number> = {
			FAQ: 10, // High priority - frequently accessed
			HOWTO: 8, // High priority - educational content
			INSIGHT: 6, // Medium priority - analytical content
			FORECAST: 4, // Lower priority - time-sensitive
			CATEGORIZATION: 3, // Lower priority - classification
			NARRATION: 2, // Lowest priority - dynamic content
		};
		return weights[category] || 1;
	}

	private calculateHitRate(): number {
		if (this.totalRequests === 0) return 0;
		return this.hitCount / this.totalRequests;
	}

	private calculateAverageResponseTime(): number {
		if (this.responseTimes.length === 0) return 0;
		const sum = this.responseTimes.reduce((a, b) => a + b, 0);
		return sum / this.responseTimes.length;
	}

	private estimateMemoryUsage(): number {
		// Calculate actual memory usage including compression
		let totalSize = 0;
		for (const entry of this.cache.values()) {
			if (entry.compressed && entry.compressedSize) {
				totalSize += entry.compressedSize;
			} else {
				// Estimate size for uncompressed entries
				totalSize += JSON.stringify(entry.response).length;
			}
		}
		return totalSize;
	}

	/**
	 * Compress response if it's large enough to benefit from compression
	 */
	private compressResponse(response: any): {
		compressedResponse: any;
		compressed: boolean;
		originalSize: number;
		compressedSize: number;
	} {
		const originalSize = JSON.stringify(response).length;
		const COMPRESSION_THRESHOLD = 1024; // 1KB threshold

		if (originalSize < COMPRESSION_THRESHOLD) {
			return {
				compressedResponse: response,
				compressed: false,
				originalSize,
				compressedSize: originalSize,
			};
		}

		try {
			// Simple compression using JSON stringify with replacer to remove whitespace
			const compressed = JSON.stringify(response, null, 0);
			const compressedSize = compressed.length;

			// Only use compression if it actually saves space
			if (compressedSize < originalSize * 0.9) {
				return {
					compressedResponse: compressed,
					compressed: true,
					originalSize,
					compressedSize,
				};
			}
		} catch (error) {
			console.warn(
				'[SmartCacheService] Compression failed, storing uncompressed:',
				error
			);
		}

		return {
			compressedResponse: response,
			compressed: false,
			originalSize,
			compressedSize: originalSize,
		};
	}

	/**
	 * Decompress response if it was compressed
	 */
	private decompressResponse(compressedResponse: any): any {
		try {
			// If it's a string, try to parse it as JSON
			if (typeof compressedResponse === 'string') {
				return JSON.parse(compressedResponse);
			}
			// If it's already an object, return as-is
			return compressedResponse;
		} catch (error) {
			console.warn(
				'[SmartCacheService] Decompression failed, returning as-is:',
				error
			);
			return compressedResponse;
		}
	}

	private async loadCacheFromStorage(): Promise<void> {
		try {
			console.log(
				'[SmartCacheService] Loading encrypted cache from storage...'
			);
			const cached = await SecureCacheService.getEncryptedItem<
				Record<string, CacheEntry>
			>('smart_cache');
			if (cached) {
				// Convert back to Map
				this.cache = new Map(Object.entries(cached));
				console.log(
					`[SmartCacheService] Loaded ${this.cache.size} encrypted cache entries`
				);
			} else {
				console.log(
					'[SmartCacheService] No encrypted cached data found, starting with empty cache'
				);
			}
		} catch (error) {
			console.error(
				'[SmartCacheService] Error loading encrypted cache from storage:',
				error
			);
			// Continue with empty cache
			this.cache = new Map();
		}
	}

	private async persistCacheToStorage(): Promise<void> {
		try {
			// Convert Map to object for encrypted storage
			const cacheObj = Object.fromEntries(this.cache);
			await SecureCacheService.setEncryptedItem('smart_cache', cacheObj);
		} catch (error) {
			console.error(
				'[SmartCacheService] Error persisting encrypted cache to storage:',
				error
			);
		}
	}

	private async loadUserPatterns(): Promise<void> {
		try {
			const patterns = await SecureCacheService.getEncryptedItem<
				Record<string, UserPattern>
			>('user_patterns');
			if (patterns) {
				// Convert back to Map
				this.userPatterns = new Map(Object.entries(patterns));
			}
		} catch (error) {
			console.error(
				'[SmartCacheService] Error loading encrypted user patterns:',
				error
			);
		}
	}

	private async persistUserPatterns(): Promise<void> {
		try {
			// Convert Map to object for encrypted storage
			const patternsObj = Object.fromEntries(this.userPatterns);
			await SecureCacheService.setEncryptedItem('user_patterns', patternsObj);
		} catch (error) {
			console.error(
				'[SmartCacheService] Error persisting encrypted user patterns:',
				error
			);
		}
	}
}

export default SmartCacheService;
