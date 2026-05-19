/**
 * Profile AsyncStorage cache — scoped by userId so data does not leak across accounts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profile } from '../services';
import { ApiService } from '../services/core/apiService';
import { createLogger } from '../utils/sublogger';

const profileCacheLog = createLogger('ProfileCache');

const CACHE_KEY = 'profile_cache';
const CACHE_TIMESTAMP_KEY = 'profile_cache_timestamp';
const CACHE_USER_ID_KEY = 'profile_cache_user_id';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export async function saveProfileToCache(profile: Profile): Promise<void> {
	try {
		await AsyncStorage.multiSet([
			[CACHE_KEY, JSON.stringify(profile)],
			[CACHE_TIMESTAMP_KEY, Date.now().toString()],
			[CACHE_USER_ID_KEY, profile.userId],
		]);
	} catch (error) {
		profileCacheLog.warn('Failed to save profile to cache', error);
	}
}

export async function loadProfileFromCache(
	expectedUserId: string
): Promise<Profile | null> {
	try {
		const [cachedProfile, timestamp, cachedUserId] = await Promise.all([
			AsyncStorage.getItem(CACHE_KEY),
			AsyncStorage.getItem(CACHE_TIMESTAMP_KEY),
			AsyncStorage.getItem(CACHE_USER_ID_KEY),
		]);

		if (!cachedProfile || !timestamp) {
			return null;
		}

		if (!cachedUserId || cachedUserId !== expectedUserId) {
			profileCacheLog.debug('Profile cache user mismatch; clearing stale cache', {
				expectedUserId,
				cachedUserId: cachedUserId ?? null,
			});
			await clearProfileCacheStorage();
			return null;
		}

		const cacheAge = Date.now() - parseInt(timestamp, 10);
		if (cacheAge > CACHE_EXPIRY_MS) {
			await clearProfileCacheStorage();
			return null;
		}

		return JSON.parse(cachedProfile) as Profile;
	} catch (error) {
		profileCacheLog.warn('Failed to load profile from cache', error);
		return null;
	}
}

/** Remove persisted profile cache (call on logout / account deletion). */
export async function clearProfileCacheStorage(): Promise<void> {
	try {
		await AsyncStorage.multiRemove([
			CACHE_KEY,
			CACHE_TIMESTAMP_KEY,
			CACHE_USER_ID_KEY,
		]);
	} catch (error) {
		profileCacheLog.warn('Failed to clear profile cache', error);
	}
}

/** Clear all local session data that must not carry over to another account. */
export async function clearUserSessionLocalData(): Promise<void> {
	await clearProfileCacheStorage();
	ApiService.clearCache();
}
