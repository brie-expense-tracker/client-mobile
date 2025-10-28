// cacheMigration.ts - One-time migration for cache format changes
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isDevMode } from '../../config/environment';

/**
 * Migrate last_sync_timestamp from raw number/string to normalized object format
 */
export async function migrateLastSyncTimestamp(): Promise<void> {
	try {
		const key = 'last_sync_timestamp';
		const rawValue = await AsyncStorage.getItem(key);

		if (!rawValue) {
			if (isDevMode) {
				console.log(
					'[CacheMigration] No last_sync_timestamp found, skipping migration'
				);
			}
			return;
		}

		// Check if it's already in the new format
		try {
			const parsed = JSON.parse(rawValue);
			if (parsed && typeof parsed === 'object' && 'ts' in parsed) {
				if (isDevMode) {
					console.log(
						'[CacheMigration] last_sync_timestamp already in new format, skipping migration'
					);
				}
				return;
			}
		} catch {
			// Not JSON, continue with migration
		}

		// Parse the raw value
		let timestamp: number;
		const numValue = Number(rawValue);

		if (Number.isFinite(numValue)) {
			// It's a number
			timestamp = numValue;
		} else {
			// Try to parse as date string
			const dateValue = Date.parse(rawValue);
			if (!isNaN(dateValue)) {
				timestamp = dateValue;
			} else {
				// Fallback to current time
				timestamp = Date.now();
			}
		}

		// Store in new format
		const newValue = JSON.stringify({ ts: timestamp });
		await AsyncStorage.setItem(key, newValue);

		if (isDevMode) {
			console.log(
				'[CacheMigration] Successfully migrated last_sync_timestamp to new format:',
				{
					oldValue: rawValue,
					newValue,
					timestamp: new Date(timestamp).toISOString(),
				}
			);
		}
	} catch (error) {
		console.error(
			'[CacheMigration] Failed to migrate last_sync_timestamp:',
			error
		);
		// Don't throw - this is a non-critical migration
	}
}

/**
 * Run all cache migrations
 */
export async function runCacheMigrations(): Promise<void> {
	if (isDevMode) {
		console.log('[CacheMigration] Starting cache migrations...');
	}

	try {
		await migrateLastSyncTimestamp();
		if (isDevMode) {
			console.log('[CacheMigration] All migrations completed successfully');
		}
	} catch (error) {
		console.error('[CacheMigration] Some migrations failed:', error);
	}
}
