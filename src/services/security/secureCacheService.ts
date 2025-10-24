/**
 * Secure Cache Service
 *
 * Provides encrypted storage for sensitive cached data using AES-GCM encryption.
 * Uses SecureStore to securely store the encryption key and AsyncStorage for encrypted data.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

// Dynamic imports with fallbacks for development
let SecureStore: any = null;
let Crypto: any = null;

// Initialize modules asynchronously
const initializeModules = async () => {
	// Try to import expo-secure-store
	try {
		const secureStoreModule = await import('expo-secure-store');
		SecureStore = secureStoreModule.default;
	} catch (error) {
		// Only warn in production, silence in development
		if (__DEV__) {
			console.log(
				'[SecureCacheService] ExpoSecureStore not available in development'
			);
		} else {
			console.warn(
				'[SecureCacheService] ExpoSecureStore not available:',
				error
			);
		}
	}

	// Try to import expo-crypto
	try {
		const cryptoModule = await import('expo-crypto');
		Crypto = cryptoModule.default;
	} catch (error) {
		// Only warn in production, silence in development
		if (__DEV__) {
			console.log(
				'[SecureCacheService] ExpoCrypto not available in development'
			);
		} else {
			console.warn('[SecureCacheService] ExpoCrypto not available:', error);
		}
	}
};

// Initialize modules immediately
initializeModules();

export interface CacheItem<T = any> {
	data: T;
	timestamp: number;
	ttl?: number; // Time to live in milliseconds
	version: number;
}

export interface CacheStatistics {
	totalItems: number;
	encryptedItems: number;
	plaintextItems: number;
	expiredItems: number;
	lastCleanup: number;
}

export class SecureCacheService {
	private static readonly AES_KEY_STORAGE_KEY = 'brie.aesKey';
	private static readonly ENCRYPTION_ALGORITHM = 'AES-CBC';
	private static readonly CACHE_VERSION = 1;
	private static readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
	private static readonly STATS_KEY = 'brie.cacheStats';

	/**
	 * Get or generate AES encryption key
	 */
	private static async getAesKey(): Promise<string> {
		try {
			// Check if SecureStore is available
			if (!SecureStore) {
				if (__DEV__) {
					console.log(
						'[SecureCacheService] SecureStore not available in development, using fallback key storage'
					);
				} else {
					console.warn(
						'[SecureCacheService] SecureStore not available, using fallback key storage'
					);
				}
				return await this.getFallbackKey();
			}

			let key = await SecureStore.getItemAsync(this.AES_KEY_STORAGE_KEY);
			if (!key) {
				// Generate a new 256-bit key (32 bytes = 64 hex characters)
				if (Crypto) {
					key =
						Crypto.randomUUID().replace(/-/g, '') +
						Crypto.randomUUID().replace(/-/g, '');
				} else {
					// Fallback to CryptoJS random generation
					key = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
				}
				await SecureStore.setItemAsync(this.AES_KEY_STORAGE_KEY, key);
			}
			return key;
		} catch (error) {
			console.error(
				'[SecureCacheService] Failed to get AES key from SecureStore:',
				error
			);
			// Fallback to AsyncStorage-based key storage
			return await this.getFallbackKey();
		}
	}

	/**
	 * Fallback key storage using AsyncStorage (less secure but functional)
	 */
	private static async getFallbackKey(): Promise<string> {
		try {
			let key: string | null = await AsyncStorage.getItem(
				this.AES_KEY_STORAGE_KEY
			);
			if (!key) {
				// Generate a new 256-bit key
				if (Crypto) {
					key =
						Crypto.randomUUID().replace(/-/g, '') +
						Crypto.randomUUID().replace(/-/g, '');
				} else {
					// Fallback to CryptoJS random generation
					key = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
				}
				await AsyncStorage.setItem(this.AES_KEY_STORAGE_KEY, key as string);
			}
			// At this point, key is guaranteed to be a string
			return key as string;
		} catch (error) {
			console.error('[SecureCacheService] Failed to get fallback key:', error);
			// Ultimate fallback - generate a deterministic key based on device info
			return 'fallback_key_' + Date.now().toString(36);
		}
	}

	/**
	 * Encrypt data using AES-CBC
	 */
	private static async encryptData(data: string, key: string): Promise<string> {
		try {
			// Generate a random IV for each encryption
			const iv = CryptoJS.lib.WordArray.random(16); // 128-bit IV

			// Encrypt the data
			const encrypted = CryptoJS.AES.encrypt(data, key, {
				iv: iv,
				mode: CryptoJS.mode.CBC,
				padding: CryptoJS.pad.Pkcs7,
			});

			// Combine IV and encrypted data
			const combined = iv.concat(encrypted.ciphertext);

			// Return as base64 string
			return combined.toString(CryptoJS.enc.Base64);
		} catch (error) {
			console.error('[SecureCacheService] Encryption failed:', error);
			throw new Error('Failed to encrypt data');
		}
	}

	/**
	 * Decrypt data using AES-CBC
	 */
	private static async decryptData(
		encryptedData: string,
		key: string
	): Promise<string> {
		try {
			// Convert from base64
			const combined = CryptoJS.enc.Base64.parse(encryptedData);

			// Extract IV (first 16 bytes)
			const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4));

			// Extract ciphertext (remaining bytes)
			const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(4));

			// Decrypt the data
			const decrypted = CryptoJS.AES.decrypt(
				{ ciphertext: ciphertext } as any,
				key,
				{
					iv: iv,
					mode: CryptoJS.mode.CBC,
					padding: CryptoJS.pad.Pkcs7,
				}
			);

			return decrypted.toString(CryptoJS.enc.Utf8);
		} catch (error) {
			console.error('[SecureCacheService] Decryption failed:', error);
			throw new Error('Failed to decrypt data');
		}
	}

	/**
	 * Store encrypted data in AsyncStorage with TTL support
	 */
	static async setEncryptedItem(
		key: string,
		value: any,
		ttl?: number
	): Promise<void> {
		try {
			// Create cache item with metadata
			const cacheItem: CacheItem = {
				data: value,
				timestamp: Date.now(),
				ttl: ttl || this.DEFAULT_TTL,
				version: this.CACHE_VERSION,
			};

			// Check if service is available
			if (!this.isServiceAvailable()) {
				if (__DEV__) {
					console.log(
						'[SecureCacheService] Encryption service not available in development, storing as plaintext'
					);
				} else {
					console.warn(
						'[SecureCacheService] Encryption service not available, storing as plaintext'
					);
				}
				await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
				await this.updateCacheStats('plaintext');
				return;
			}

			const aesKey = await this.getAesKey();
			const jsonData = JSON.stringify(cacheItem);
			const encryptedData = await this.encryptData(jsonData, aesKey);

			await AsyncStorage.setItem(key, encryptedData);
			await this.updateCacheStats('encrypted');
		} catch (error) {
			console.error(
				`[SecureCacheService] Failed to store encrypted data for key ${key}:`,
				error
			);
			// Fallback to plaintext storage
			console.warn('[SecureCacheService] Falling back to plaintext storage');
			const cacheItem: CacheItem = {
				data: value,
				timestamp: Date.now(),
				ttl: ttl || this.DEFAULT_TTL,
				version: this.CACHE_VERSION,
			};
			await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
			await this.updateCacheStats('plaintext');
		}
	}

	/**
	 * Check if data looks like an encrypted envelope
	 */
	private static looksLikeEnvelope(
		data: any
	): data is { iv: string; tag: string; encryptedData: string } {
		return (
			data &&
			typeof data === 'object' &&
			'encryptedData' in data &&
			'iv' in data &&
			'tag' in data
		);
	}

	/**
	 * Robust JSON parse that accepts primitives and handles various formats
	 */
	private static safeParse(raw: string | null): any {
		if (raw == null) return null;
		const trimmed = raw.trim();

		// If it looks like JSON, parse it
		if (
			trimmed.startsWith('{') ||
			trimmed.startsWith('[') ||
			trimmed === 'null' ||
			trimmed === 'true' ||
			trimmed === 'false' ||
			/^-?\d+(\.\d+)?$/.test(trimmed)
		) {
			try {
				return JSON.parse(trimmed);
			} catch {
				// If JSON parsing fails, return as string
				return trimmed;
			}
		}

		// Fallback: return as plain string
		return trimmed;
	}

	/**
	 * Retrieve and decrypt data from AsyncStorage with TTL checking
	 */
	static async getEncryptedItem<T>(key: string): Promise<T | null> {
		try {
			const rawData = await AsyncStorage.getItem(key);
			if (!rawData) {
				return null;
			}

			// Check if service is available
			if (!this.isServiceAvailable()) {
				if (__DEV__) {
					console.log(
						'[SecureCacheService] Encryption service not available in development, reading as plaintext'
					);
				} else {
					console.warn(
						'[SecureCacheService] Encryption service not available, reading as plaintext'
					);
				}
				const parsed = this.safeParse(rawData);

				// Handle legacy timestamp format - normalize to object
				if (
					key === 'last_sync_timestamp' &&
					(typeof parsed === 'string' || typeof parsed === 'number')
				) {
					return { ts: parsed } as unknown as T;
				}

				// Handle new CacheItem structure
				if (parsed && typeof parsed === 'object' && 'data' in parsed) {
					const cacheItem = parsed as CacheItem<T>;
					if (this.isExpired(cacheItem)) {
						await this.removeEncryptedItem(key);
						return null;
					}
					return cacheItem.data;
				}

				return parsed as T;
			}

			// Try to parse as encrypted envelope first
			const maybeEnvelope = this.safeParse(rawData);
			if (this.looksLikeEnvelope(maybeEnvelope)) {
				const aesKey = await this.getAesKey();
				const decryptedData = await this.decryptData(
					JSON.stringify(maybeEnvelope),
					aesKey
				);
				return this.safeParse(decryptedData) as T;
			}

			// Try to decrypt as base64 string
			const aesKey = await this.getAesKey();
			const decryptedData = await this.decryptData(rawData, aesKey);
			const parsed = this.safeParse(decryptedData);

			// Handle new CacheItem structure
			if (parsed && typeof parsed === 'object' && 'data' in parsed) {
				const cacheItem = parsed as CacheItem<T>;
				if (this.isExpired(cacheItem)) {
					await this.removeEncryptedItem(key);
					return null;
				}
				return cacheItem.data;
			}

			return parsed as T;
		} catch (error) {
			console.error(
				`[SecureCacheService] Failed to retrieve encrypted data for key ${key}:`,
				error
			);

			// Try to parse as plaintext JSON as fallback
			try {
				const rawData = await AsyncStorage.getItem(key);
				if (!rawData) return null;

				const parsed = this.safeParse(rawData);

				// Handle legacy timestamp format - normalize to object
				if (
					key === 'last_sync_timestamp' &&
					(typeof parsed === 'string' || typeof parsed === 'number')
				) {
					return { ts: parsed } as unknown as T;
				}

				return parsed as T;
			} catch (parseError) {
				console.error(
					'[SecureCacheService] Failed to parse data as plaintext:',
					parseError
				);

				// If completely unreadable, remove it to stop the noise
				await AsyncStorage.removeItem(key);
				return null;
			}
		}
	}

	/**
	 * Remove encrypted item from AsyncStorage
	 */
	static async removeEncryptedItem(key: string): Promise<void> {
		try {
			await AsyncStorage.removeItem(key);
			console.log(
				`[SecureCacheService] Encrypted data removed for key: ${key}`
			);
		} catch (error) {
			console.error(
				`[SecureCacheService] Failed to remove encrypted data for key ${key}:`,
				error
			);
			throw error;
		}
	}

	/**
	 * Clear all encrypted cache data
	 */
	static async clearEncryptedCache(): Promise<void> {
		try {
			// Get all keys from AsyncStorage
			const allKeys = await AsyncStorage.getAllKeys();

			// Filter for encrypted cache keys (you can customize this pattern)
			const cacheKeys = allKeys.filter(
				(key) =>
					key.startsWith('cached_') ||
					key.startsWith('fallback_') ||
					key.startsWith('smart_cache') ||
					key.startsWith('user_patterns') ||
					key.startsWith('token_usage_') ||
					key.startsWith('action_queue')
			);

			// Remove all encrypted cache keys
			await AsyncStorage.multiRemove(cacheKeys);

			console.log(
				`[SecureCacheService] Cleared ${cacheKeys.length} encrypted cache items`
			);
		} catch (error) {
			console.error(
				'[SecureCacheService] Failed to clear encrypted cache:',
				error
			);
			throw error;
		}
	}

	/**
	 * Check if SecureStore is available
	 */
	static async isSecureStoreAvailable(): Promise<boolean> {
		try {
			if (!SecureStore) {
				return false;
			}
			await SecureStore.getItemAsync('test_key');
			return true;
		} catch (error) {
			console.warn('[SecureCacheService] SecureStore not available:', error);
			return false;
		}
	}

	/**
	 * Check if the encryption service is properly initialized
	 */
	static isServiceAvailable(): boolean {
		return SecureStore !== null || Crypto !== null;
	}

	/**
	 * Migrate existing unencrypted data to encrypted storage
	 */
	static async migrateToEncryptedStorage(): Promise<void> {
		try {
			console.log(
				'[SecureCacheService] Starting migration to encrypted storage...'
			);

			// List of keys that should be migrated
			const keysToMigrate = [
				'cached_spend_plans',
				'cached_budgets',
				'cached_goals',
				'cached_transactions',
				'last_sync_timestamp',
				'smart_cache',
				'user_patterns',
			];

			for (const key of keysToMigrate) {
				try {
					// Check if unencrypted data exists
					const unencryptedData = await AsyncStorage.getItem(key);
					if (unencryptedData) {
						// Check if it's already encrypted (encrypted data is base64)
						const isEncrypted = this.isBase64(unencryptedData);

						if (!isEncrypted) {
							// Migrate to encrypted storage
							const parsedData = JSON.parse(unencryptedData);
							await this.setEncryptedItem(key, parsedData);
						}
					}
				} catch (error) {
					console.warn(
						`[SecureCacheService] Failed to migrate key ${key}:`,
						error
					);
				}
			}

		} catch (error) {
			console.error('[SecureCacheService] Migration failed:', error);
		}
	}

	/**
	 * Check if a string is valid base64
	 */
	private static isBase64(str: string): boolean {
		try {
			return btoa(atob(str)) === str;
		} catch {
			return false;
		}
	}

	/**
	 * Check if a cache item is expired
	 */
	private static isExpired(cacheItem: CacheItem): boolean {
		if (!cacheItem.ttl) return false;
		const now = Date.now();
		return now - cacheItem.timestamp > cacheItem.ttl;
	}

	/**
	 * Update cache statistics
	 */
	private static async updateCacheStats(
		type: 'encrypted' | 'plaintext'
	): Promise<void> {
		try {
			const stats = await this.getCacheStatistics();
			stats.totalItems++;
			if (type === 'encrypted') {
				stats.encryptedItems++;
			} else {
				stats.plaintextItems++;
			}
			await AsyncStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
		} catch (error) {
			console.warn('[SecureCacheService] Failed to update cache stats:', error);
		}
	}

	/**
	 * Get cache statistics
	 */
	static async getCacheStatistics(): Promise<CacheStatistics> {
		try {
			const stats = await AsyncStorage.getItem(this.STATS_KEY);
			if (stats) {
				return JSON.parse(stats);
			}
		} catch (error) {
			console.warn('[SecureCacheService] Failed to get cache stats:', error);
		}

		return {
			totalItems: 0,
			encryptedItems: 0,
			plaintextItems: 0,
			expiredItems: 0,
			lastCleanup: 0,
		};
	}

	/**
	 * Clean up expired cache items
	 */
	static async cleanupExpiredItems(): Promise<number> {
		try {
			const allKeys = await AsyncStorage.getAllKeys();
			const cacheKeys = allKeys.filter(
				(key) =>
					key.startsWith('cached_') ||
					key.startsWith('fallback_') ||
					key.startsWith('smart_cache') ||
					key.startsWith('user_patterns') ||
					key.startsWith('token_usage_') ||
					key.startsWith('action_queue')
			);

			let expiredCount = 0;
			for (const key of cacheKeys) {
				try {
					const rawData = await AsyncStorage.getItem(key);
					if (rawData) {
						const parsed = this.safeParse(rawData);
						if (parsed && typeof parsed === 'object' && 'data' in parsed) {
							const cacheItem = parsed as CacheItem;
							if (this.isExpired(cacheItem)) {
								await AsyncStorage.removeItem(key);
								expiredCount++;
							}
						}
					}
				} catch (error) {
					console.warn(
						`[SecureCacheService] Failed to check key ${key}:`,
						error
					);
				}
			}

			// Update stats
			const stats = await this.getCacheStatistics();
			stats.expiredItems += expiredCount;
			stats.lastCleanup = Date.now();
			await AsyncStorage.setItem(this.STATS_KEY, JSON.stringify(stats));

			console.log(
				`[SecureCacheService] Cleaned up ${expiredCount} expired items`
			);
			return expiredCount;
		} catch (error) {
			console.error(
				'[SecureCacheService] Failed to cleanup expired items:',
				error
			);
			return 0;
		}
	}

	/**
	 * Bulk get multiple encrypted items
	 */
	static async getBulkEncryptedItems<T>(
		keys: string[]
	): Promise<Record<string, T | null>> {
		const results: Record<string, T | null> = {};

		try {
			const items = await AsyncStorage.multiGet(keys);
			for (const [key, value] of items) {
				if (value) {
					try {
						const parsed = this.safeParse(value);
						if (parsed && typeof parsed === 'object' && 'data' in parsed) {
							const cacheItem = parsed as CacheItem<T>;
							if (this.isExpired(cacheItem)) {
								await this.removeEncryptedItem(key);
								results[key] = null;
							} else {
								results[key] = cacheItem.data;
							}
						} else {
							results[key] = parsed as T;
						}
					} catch (error) {
						console.warn(
							`[SecureCacheService] Failed to parse key ${key}:`,
							error
						);
						results[key] = null;
					}
				} else {
					results[key] = null;
				}
			}
		} catch (error) {
			console.error('[SecureCacheService] Failed to get bulk items:', error);
		}

		return results;
	}

	/**
	 * Bulk set multiple encrypted items
	 */
	static async setBulkEncryptedItems(
		items: Record<string, { value: any; ttl?: number }>
	): Promise<void> {
		try {
			const operations: [string, string][] = [];

			for (const [key, { value, ttl }] of Object.entries(items)) {
				const cacheItem: CacheItem = {
					data: value,
					timestamp: Date.now(),
					ttl: ttl || this.DEFAULT_TTL,
					version: this.CACHE_VERSION,
				};

				if (this.isServiceAvailable()) {
					try {
						const aesKey = await this.getAesKey();
						const jsonData = JSON.stringify(cacheItem);
						const encryptedData = await this.encryptData(jsonData, aesKey);
						operations.push([key, encryptedData]);
					} catch (encryptError) {
						console.warn(
							`[SecureCacheService] Failed to encrypt key ${key}, storing as plaintext:`,
							encryptError
						);
						operations.push([key, JSON.stringify(cacheItem)]);
					}
				} else {
					operations.push([key, JSON.stringify(cacheItem)]);
				}
			}

			await AsyncStorage.multiSet(operations);
			console.log(
				`[SecureCacheService] Bulk stored ${operations.length} items`
			);
		} catch (error) {
			console.error('[SecureCacheService] Failed to set bulk items:', error);
			throw error;
		}
	}

	/**
	 * Rotate encryption key (re-encrypt all data with new key)
	 */
	static async rotateEncryptionKey(): Promise<void> {
		try {

			// Generate new key
			const newKey = CryptoJS.lib.WordArray.random(32).toString(
				CryptoJS.enc.Hex
			);

			// Get all encrypted keys
			const allKeys = await AsyncStorage.getAllKeys();
			const encryptedKeys = allKeys.filter(
				(key) =>
					key.startsWith('cached_') ||
					key.startsWith('fallback_') ||
					key.startsWith('smart_cache') ||
					key.startsWith('user_patterns') ||
					key.startsWith('token_usage_') ||
					key.startsWith('action_queue')
			);

			// Re-encrypt all data with new key
			for (const key of encryptedKeys) {
				try {
					const rawData = await AsyncStorage.getItem(key);
					if (rawData) {
						// Decrypt with old key
						const oldKey = await this.getAesKey();
						const decryptedData = await this.decryptData(rawData, oldKey);

						// Encrypt with new key
						const encryptedData = await this.encryptData(decryptedData, newKey);
						await AsyncStorage.setItem(key, encryptedData);
					}
				} catch (error) {
					console.warn(
						`[SecureCacheService] Failed to rotate key for ${key}:`,
						error
					);
				}
			}

			// Store new key
			if (SecureStore) {
				await SecureStore.setItemAsync(this.AES_KEY_STORAGE_KEY, newKey);
			} else {
				await AsyncStorage.setItem(this.AES_KEY_STORAGE_KEY, newKey);
			}

		} catch (error) {
			console.error('[SecureCacheService] Key rotation failed:', error);
			throw error;
		}
	}
}

export default SecureCacheService;
