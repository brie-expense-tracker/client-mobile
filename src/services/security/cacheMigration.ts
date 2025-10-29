// cacheMigration.ts - One-time migration for cache format changes
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '../../utils/sublogger';

const cacheMigrationLog = createLogger('CacheMigration');

/**
 * Migrate last_sync_timestamp from raw number/string to normalized object format
 */
export async function migrateLastSyncTimestamp(): Promise<void> {
	try {
		const key = 'last_sync_timestamp';
		const rawValue = await AsyncStorage.getItem(key);

		if (!rawValue) {
			cacheMigrationLog.debug(
				'No last_sync_timestamp found, skipping migration'
			);
			return;
		}

		// Check if it's already in the new format
		try {
			const parsed = JSON.parse(rawValue);
			if (parsed && typeof parsed === 'object' && 'ts' in parsed) {
				cacheMigrationLog.debug(
					'last_sync_timestamp already in new format, skipping migration'
				);
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

		cacheMigrationLog.info(
			'Successfully migrated last_sync_timestamp to new format',
			{
				oldValue: rawValue,
				newValue,
				timestamp: new Date(timestamp).toISOString(),
			}
		);
	} catch (error) {
		cacheMigrationLog.error('Failed to migrate last_sync_timestamp', error);
		// Don't throw - this is a non-critical migration
	}
}

/**
 * Run all cache migrations
 */
export async function runCacheMigrations(): Promise<void> {
	cacheMigrationLog.debug('Starting cache migrations');

	try {
		await migrateLastSyncTimestamp();
		cacheMigrationLog.info('All migrations completed successfully');
	} catch (error) {
		cacheMigrationLog.error('Some migrations failed', error);
	}
}
