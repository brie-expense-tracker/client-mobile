import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface CacheEntry {
	id: string;
	query: string;
	response: any;
	timestamp: number;
	userId: string;
	usageCount: number;
	lastUsed: number;
	category: 'categorization' | 'insight' | 'advice' | 'forecast';
	confidence: number;
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
	private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
	private readonly MAX_CACHE_SIZE = 1000;
	private readonly MIN_CONFIDENCE = 0.7;

	static getInstance(): SmartCacheService {
		if (!SmartCacheService.instance) {
			SmartCacheService.instance = new SmartCacheService();
		}
		return SmartCacheService.instance;
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
		category: CacheEntry['category']
	): Promise<any | null> {
		const cacheKey = this.generateCacheKey(query, userId, category);
		const entry = this.cache.get(cacheKey);

		if (!entry) return null;

		// Check if cache is still valid
		if (!this.isCacheValid(entry)) {
			this.cache.delete(cacheKey);
			return null;
		}

		// Update usage statistics
		entry.usageCount++;
		entry.lastUsed = Date.now();
		this.cache.set(cacheKey, entry);

		// Update user patterns
		this.updateUserPattern(userId, query, category);

		console.log(
			`[SmartCacheService] Cache hit for: ${query.substring(0, 50)}...`
		);
		return entry.response;
	}

	/**
	 * Cache a response for future use
	 */
	async cacheResponse(
		query: string,
		response: any,
		userId: string,
		category: CacheEntry['category'],
		confidence: number = 1.0
	): Promise<void> {
		if (confidence < this.MIN_CONFIDENCE) {
			console.log(
				`[SmartCacheService] Skipping cache for low confidence response: ${confidence}`
			);
			return;
		}

		const cacheKey = this.generateCacheKey(query, userId, category);
		const entry: CacheEntry = {
			id: cacheKey,
			query,
			response,
			timestamp: Date.now(),
			userId,
			usageCount: 1,
			lastUsed: Date.now(),
			category,
			confidence,
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
			`[SmartCacheService] Cached response for: ${query.substring(0, 50)}...`
		);
	}

	/**
	 * Check if we should use AI or cached response
	 */
	shouldUseAI(
		query: string,
		userId: string,
		category: CacheEntry['category']
	): boolean {
		const pattern = this.userPatterns.get(userId);
		if (!pattern) return true;

		// Check if this is a common query that we can cache
		const isCommonQuery = pattern.commonQueries.includes(query);
		const hasRecentCache = this.hasRecentCache(query, userId, category);

		// Use AI for new or complex queries, cache for common ones
		return !isCommonQuery || !hasRecentCache;
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): {
		totalEntries: number;
		hitRate: number;
		memoryUsage: number;
		userPatterns: number;
	} {
		try {
			const totalEntries = this.cache.size;
			const userPatterns = this.userPatterns.size;

			// Calculate approximate memory usage
			const memoryUsage = this.estimateMemoryUsage();

			return {
				totalEntries,
				hitRate: this.calculateHitRate(),
				memoryUsage,
				userPatterns,
			};
		} catch (error) {
			console.error('[SmartCacheService] Error getting cache stats:', error);
			// Return safe defaults
			return {
				totalEntries: 0,
				hitRate: 0,
				memoryUsage: 0,
				userPatterns: 0,
			};
		}
	}

	/**
	 * Clear expired cache entries
	 */
	async cleanupExpiredCache(): Promise<void> {
		const now = Date.now();
		const expiredKeys: string[] = [];

		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.timestamp > this.CACHE_EXPIRY) {
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

	private isCacheValid(entry: CacheEntry): boolean {
		const now = Date.now();
		return now - entry.timestamp < this.CACHE_EXPIRY;
	}

	private hasRecentCache(
		query: string,
		userId: string,
		category: string
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
		let leastUsedKey = '';
		let lowestUsage = Infinity;

		for (const [key, entry] of this.cache.entries()) {
			if (entry.usageCount < lowestUsage) {
				lowestUsage = entry.usageCount;
				leastUsedKey = key;
			}
		}

		if (leastUsedKey) {
			this.cache.delete(leastUsedKey);
			console.log(`[SmartCacheService] Evicted least used cache entry`);
		}
	}

	private calculateHitRate(): number {
		// This would need to be implemented with actual hit/miss tracking
		// For now, return a placeholder
		return 0.75; // 75% estimated hit rate
	}

	private estimateMemoryUsage(): number {
		// Rough estimation: each cache entry ~2KB
		return this.cache.size * 2;
	}

	private async loadCacheFromStorage(): Promise<void> {
		try {
			console.log('[SmartCacheService] Loading cache from storage...');
			const cached = await AsyncStorage.getItem('smart_cache');
			if (cached) {
				const parsed = JSON.parse(cached);
				// Convert back to Map
				this.cache = new Map(Object.entries(parsed));
				console.log(
					`[SmartCacheService] Loaded ${this.cache.size} cache entries`
				);
			} else {
				console.log(
					'[SmartCacheService] No cached data found, starting with empty cache'
				);
			}
		} catch (error) {
			console.error(
				'[SmartCacheService] Error loading cache from storage:',
				error
			);
			// Continue with empty cache
			this.cache = new Map();
		}
	}

	private async persistCacheToStorage(): Promise<void> {
		try {
			// Convert Map to object for storage
			const cacheObj = Object.fromEntries(this.cache);
			await AsyncStorage.setItem('smart_cache', JSON.stringify(cacheObj));
		} catch (error) {
			console.error(
				'[SmartCacheService] Error persisting cache to storage:',
				error
			);
		}
	}

	private async loadUserPatterns(): Promise<void> {
		try {
			const patterns = await AsyncStorage.getItem('user_patterns');
			if (patterns) {
				const parsed = JSON.parse(patterns);
				// Convert back to Map
				this.userPatterns = new Map(Object.entries(parsed));
			}
		} catch (error) {
			console.error('[SmartCacheService] Error loading user patterns:', error);
		}
	}

	private async persistUserPatterns(): Promise<void> {
		try {
			// Convert Map to object for storage
			const patternsObj = Object.fromEntries(this.userPatterns);
			await AsyncStorage.setItem('user_patterns', JSON.stringify(patternsObj));
		} catch (error) {
			console.error(
				'[SmartCacheService] Error persisting user patterns:',
				error
			);
		}
	}
}

export default SmartCacheService;
