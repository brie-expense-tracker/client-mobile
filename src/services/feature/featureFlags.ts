// featureFlags.ts - Feature flags service with Firebase Remote Config integration
// Provides dynamic feature control and kill-switches for production safety

import {
	TELEMETRY_CONFIG,
	FEATURE_FLAG_KEYS,
	DEFAULT_FEATURE_FLAGS,
} from '../../config/telemetry';
import { isDevMode } from '../../config/environment';

export interface FeatureFlag {
	key: string;
	value: boolean | string | number;
	description?: string;
	lastUpdated?: Date;
	source: 'remote' | 'local' | 'default';
}

export interface FeatureFlagOptions {
	enableRemoteConfig?: boolean;
	enableLocalOverrides?: boolean;
	enableKillSwitches?: boolean;
	fetchTimeout?: number;
	minimumFetchInterval?: number;
}

export class FeatureFlagsService {
	private flags: Map<string, FeatureFlag> = new Map();
	private options: Required<FeatureFlagOptions>;
	private isInitialized = false;
	private lastFetchTime = 0;

	constructor(options: FeatureFlagOptions = {}) {
		try {
			this.options = {
				enableRemoteConfig:
					options.enableRemoteConfig ?? TELEMETRY_CONFIG.FEATURES.ENABLED,
				enableLocalOverrides: options.enableLocalOverrides ?? true,
				enableKillSwitches: options.enableKillSwitches ?? true,
				fetchTimeout:
					options.fetchTimeout ??
					TELEMETRY_CONFIG.FIREBASE.REMOTE_CONFIG_FETCH_TIMEOUT,
				minimumFetchInterval:
					options.minimumFetchInterval ??
					TELEMETRY_CONFIG.FIREBASE.REMOTE_CONFIG_MINIMUM_FETCH_INTERVAL,
			};

			// Initialize with default flags
			this.initializeDefaultFlags();
		} catch (error) {
			console.warn(
				'🚩 [FeatureFlags] Failed to initialize constructor:',
				error
			);
			// Set safe defaults
			this.options = {
				enableRemoteConfig: false,
				enableLocalOverrides: true,
				enableKillSwitches: true,
				fetchTimeout: 10000,
				minimumFetchInterval: 3600,
			};
		}
	}

	/**
	 * Initialize the service
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) return;

		try {
			if (this.options.enableRemoteConfig) {
				try {
					await this.initializeRemoteConfig();
				} catch (error) {
					console.warn(
						'🚩 [FeatureFlags] Failed to initialize remote config, using defaults:',
						error
					);
				}
			}

			this.isInitialized = true;
			if (isDevMode) {
				console.log('🚩 [FeatureFlags] Service initialized');
			}
		} catch (error) {
			console.warn(
				'🚩 [FeatureFlags] Failed to initialize service, using defaults:',
				error
			);
			this.isInitialized = true;
		}
	}

	/**
	 * Initialize Firebase Remote Config
	 */
	private async initializeRemoteConfig(): Promise<void> {
		try {
			// Dynamic import to avoid issues in development
			const {
				getRemoteConfig,
				setConfigSettings,
				setDefaults,
				fetchAndActivate,
			} = await import('@react-native-firebase/remote-config');

			// Verify remote config is available
			if (!getRemoteConfig || typeof getRemoteConfig !== 'function') {
				console.warn('🚩 [FeatureFlags] Remote config not available');
				return;
			}

			const config = getRemoteConfig();
			if (!config) {
				console.warn(
					'🚩 [FeatureFlags] Remote config instance not properly initialized'
				);
				return;
			}

			try {
				// Use the new modular API methods - pass config as first parameter
				await setConfigSettings(config, {
					minimumFetchIntervalMillis: this.options.minimumFetchInterval * 1000,
					fetchTimeMillis: this.options.fetchTimeout,
				});
			} catch (error) {
				console.warn('🚩 [FeatureFlags] Failed to set config settings:', error);
			}

			// Set default values
			try {
				const defaults: Record<string, any> = {};
				Object.entries(DEFAULT_FEATURE_FLAGS).forEach(([key, value]) => {
					defaults[key] = value;
				});

				await setDefaults(config, defaults);
			} catch (error) {
				console.warn('🚩 [FeatureFlags] Failed to set defaults:', error);
			}

			// Fetch and activate
			try {
				await fetchAndActivate(config);
			} catch (error) {
				console.warn('🚩 [FeatureFlags] Failed to fetch and activate:', error);
			}

			// Update local flags
			try {
				await this.updateFlagsFromRemoteConfig(config);
			} catch (error) {
				console.warn(
					'🚩 [FeatureFlags] Failed to update flags from remote config:',
					error
				);
			}

			if (isDevMode) {
				console.log('🚩 [FeatureFlags] Remote config initialized');
			}
		} catch (error) {
			console.warn(
				'🚩 [FeatureFlags] Failed to initialize remote config, using defaults:',
				error
			);
		}
	}

	/**
	 * Update flags from Firebase Remote Config
	 */
	private async updateFlagsFromRemoteConfig(remoteConfig: any): Promise<void> {
		try {
			if (!remoteConfig) {
				console.warn('🚩 [FeatureFlags] Invalid remote config object');
				return;
			}

			const { getValue } = await import('@react-native-firebase/remote-config');

			for (const [name, key] of Object.entries(FEATURE_FLAG_KEYS)) {
				try {
					const value = getValue(remoteConfig, key);
					if (
						value &&
						value.getSource &&
						typeof value.getSource === 'function'
					) {
						try {
							const source = value.getSource();
							if (source === 'remote') {
								this.flags.set(key, {
									key,
									value: this.parseRemoteConfigValue(value),
									description: `Remote config: ${name}`,
									lastUpdated: new Date(),
									source: 'remote',
								});
							}
						} catch (sourceError) {
							console.warn(
								`🚩 [FeatureFlags] Failed to get source for flag ${key}:`,
								sourceError
							);
						}
					}
				} catch (flagError) {
					console.warn(
						`🚩 [FeatureFlags] Failed to process flag ${key}:`,
						flagError
					);
				}
			}
		} catch (error) {
			console.warn(
				'🚩 [FeatureFlags] Failed to update from remote config:',
				error
			);
		}
	}

	/**
	 * Parse remote config value
	 */
	private parseRemoteConfigValue(value: any): boolean | string | number {
		try {
			if (!value) return false;

			if (typeof value.asBoolean === 'function') {
				try {
					return value.asBoolean();
				} catch (error) {
					console.warn(
						'🚩 [FeatureFlags] Failed to parse boolean value:',
						error
					);
				}
			}

			if (typeof value.asString === 'function') {
				try {
					return value.asString();
				} catch (error) {
					console.warn(
						'🚩 [FeatureFlags] Failed to parse string value:',
						error
					);
				}
			}

			if (typeof value.asNumber === 'function') {
				try {
					return value.asNumber();
				} catch (error) {
					console.warn(
						'🚩 [FeatureFlags] Failed to parse number value:',
						error
					);
				}
			}

			// Fallback to string conversion
			if (typeof value.asString === 'function') {
				try {
					return value.asString();
				} catch (error) {
					console.warn(
						'🚩 [FeatureFlags] Failed to parse fallback string value:',
						error
					);
				}
			}

			return false;
		} catch (error) {
			console.warn(
				'🚩 [FeatureFlags] Failed to parse remote config value:',
				error
			);
			return false;
		}
	}

	/**
	 * Initialize default flags
	 */
	private initializeDefaultFlags(): void {
		try {
			Object.entries(DEFAULT_FEATURE_FLAGS).forEach(([key, value]) => {
				try {
					this.flags.set(key, {
						key,
						value,
						description: 'Default value',
						lastUpdated: new Date(),
						source: 'default',
					});
				} catch (error) {
					console.warn(
						`🚩 [FeatureFlags] Failed to set default flag ${key}:`,
						error
					);
				}
			});
		} catch (error) {
			console.warn(
				'🚩 [FeatureFlags] Failed to initialize default flags:',
				error
			);
		}
	}

	/**
	 * Get a feature flag value
	 */
	getFlag(key: string, defaultValue: boolean = false): boolean {
		try {
			if (!key || typeof key !== 'string') return defaultValue;

			const flag = this.flags.get(key);
			if (!flag) return defaultValue;

			// Handle kill switches
			if (this.options.enableKillSwitches && this.isKillSwitch(key)) {
				return false; // Kill switches always return false
			}

			return typeof flag.value === 'boolean' ? flag.value : defaultValue;
		} catch (error) {
			console.warn(`🚩 [FeatureFlags] Failed to get flag ${key}:`, error);
			return defaultValue;
		}
	}

	/**
	 * Get a feature flag value as string
	 */
	getFlagString(key: string, defaultValue: string = ''): string {
		try {
			if (!key || typeof key !== 'string') return defaultValue;

			const flag = this.flags.get(key);
			if (!flag) return defaultValue;

			return typeof flag.value === 'string' ? flag.value : defaultValue;
		} catch (error) {
			console.warn(
				`🚩 [FeatureFlags] Failed to get string flag ${key}:`,
				error
			);
			return defaultValue;
		}
	}

	/**
	 * Get a feature flag value as number
	 */
	getFlagNumber(key: string, defaultValue: number = 0): number {
		try {
			if (!key || typeof key !== 'string') return defaultValue;

			const flag = this.flags.get(key);
			if (!flag) return defaultValue;

			return typeof flag.value === 'number' ? flag.value : defaultValue;
		} catch (error) {
			console.warn(
				`🚩 [FeatureFlags] Failed to get number flag ${key}:`,
				error
			);
			return defaultValue;
		}
	}

	/**
	 * Check if a flag is a kill switch
	 */
	private isKillSwitch(key: string): boolean {
		try {
			if (!key || typeof key !== 'string') return false;

			const lowerKey = key.toLowerCase();
			return (
				lowerKey.includes('kill') ||
				lowerKey.includes('disable') ||
				lowerKey.includes('emergency')
			);
		} catch (error) {
			console.warn(
				'🚩 [FeatureFlags] Failed to check if flag is kill switch:',
				error
			);
			return false;
		}
	}

	/**
	 * Set a local override for a feature flag
	 */
	setLocalOverride(
		key: string,
		value: boolean | string | number,
		description?: string
	): void {
		try {
			if (!this.options.enableLocalOverrides) return;

			if (!key || typeof key !== 'string') {
				console.warn('🚩 [FeatureFlags] Invalid key for local override');
				return;
			}

			this.flags.set(key, {
				key,
				value,
				description: description || 'Local override',
				lastUpdated: new Date(),
				source: 'local',
			});

			if (isDevMode) {
				console.log(`🚩 [FeatureFlags] Local override set: ${key} = ${value}`);
			}
		} catch (error) {
			console.warn(
				`🚩 [FeatureFlags] Failed to set local override for ${key}:`,
				error
			);
		}
	}

	/**
	 * Remove a local override
	 */
	removeLocalOverride(key: string): void {
		try {
			if (!key || typeof key !== 'string') {
				console.warn(
					'🚩 [FeatureFlags] Invalid key for removing local override'
				);
				return;
			}

			const flag = this.flags.get(key);
			if (flag?.source === 'local') {
				this.flags.delete(key);
				if (isDevMode) {
					console.log(`🚩 [FeatureFlags] Local override removed: ${key}`);
				}
			}
		} catch (error) {
			console.warn(
				`🚩 [FeatureFlags] Failed to remove local override for ${key}:`,
				error
			);
		}
	}

	/**
	 * Force refresh from remote config
	 */
	async refresh(): Promise<void> {
		if (!this.options.enableRemoteConfig) return;

		try {
			const { getRemoteConfig, fetchAndActivate } = await import(
				'@react-native-firebase/remote-config'
			);

			// Verify remote config is available
			if (!getRemoteConfig || typeof getRemoteConfig !== 'function') {
				console.warn(
					'🚩 [FeatureFlags] Remote config not available for refresh'
				);
				return;
			}

			const config = getRemoteConfig();
			if (!config) {
				console.warn(
					'🚩 [FeatureFlags] Remote config instance not properly initialized for refresh'
				);
				return;
			}

			try {
				await fetchAndActivate(config);
			} catch (error) {
				console.warn(
					'🚩 [FeatureFlags] Failed to fetch and activate during refresh:',
					error
				);
			}

			try {
				await this.updateFlagsFromRemoteConfig(config);
			} catch (error) {
				console.warn(
					'🚩 [FeatureFlags] Failed to update flags during refresh:',
					error
				);
			}

			this.lastFetchTime = Date.now();
			if (isDevMode) {
				console.log('🚩 [FeatureFlags] Refreshed from remote config');
			}
		} catch (error) {
			console.warn('🚩 [FeatureFlags] Failed to refresh:', error);
		}
	}

	/**
	 * Get all feature flags
	 */
	getAllFlags(): FeatureFlag[] {
		return Array.from(this.flags.values());
	}

	/**
	 * Check if a feature is enabled
	 */
	isEnabled(key: string): boolean {
		return this.getFlag(key, false);
	}

	/**
	 * Check if demo mode is enabled
	 */
	isDemoModeEnabled(): boolean {
		try {
			return this.getFlag(
				FEATURE_FLAG_KEYS.DEMO_MODE,
				DEFAULT_FEATURE_FLAGS[FEATURE_FLAG_KEYS.DEMO_MODE]
			);
		} catch (error) {
			console.warn('🚩 [FeatureFlags] Failed to check demo mode:', error);
			return DEFAULT_FEATURE_FLAGS[FEATURE_FLAG_KEYS.DEMO_MODE];
		}
	}

	/**
	 * Check if shadow A/B testing is enabled
	 */
	isShadowABTestingEnabled(): boolean {
		try {
			return this.getFlag(
				FEATURE_FLAG_KEYS.SHADOW_AB_TESTING,
				DEFAULT_FEATURE_FLAGS[FEATURE_FLAG_KEYS.SHADOW_AB_TESTING]
			);
		} catch (error) {
			console.warn(
				'🚩 [FeatureFlags] Failed to check shadow A/B testing:',
				error
			);
			return DEFAULT_FEATURE_FLAGS[FEATURE_FLAG_KEYS.SHADOW_AB_TESTING];
		}
	}

	/**
	 * Check if AI model selection is enabled
	 */
	isAIModelSelectionEnabled(): boolean {
		try {
			return this.getFlag(
				FEATURE_FLAG_KEYS.AI_MODEL_SELECTION,
				DEFAULT_FEATURE_FLAGS[FEATURE_FLAG_KEYS.AI_MODEL_SELECTION]
			);
		} catch (error) {
			console.warn(
				'🚩 [FeatureFlags] Failed to check AI model selection:',
				error
			);
			return DEFAULT_FEATURE_FLAGS[FEATURE_FLAG_KEYS.AI_MODEL_SELECTION];
		}
	}

	/**
	 * Check if grounding layer is enabled
	 */
	isGroundingLayerEnabled(): boolean {
		try {
			return this.getFlag(
				FEATURE_FLAG_KEYS.GROUNDING_LAYER,
				DEFAULT_FEATURE_FLAGS[FEATURE_FLAG_KEYS.GROUNDING_LAYER]
			);
		} catch (error) {
			console.warn('🚩 [FeatureFlags] Failed to check grounding layer:', error);
			return DEFAULT_FEATURE_FLAGS[FEATURE_FLAG_KEYS.GROUNDING_LAYER];
		}
	}

	/**
	 * Check if critic validation is enabled
	 */
	isCriticValidationEnabled(): boolean {
		try {
			return this.getFlag(
				FEATURE_FLAG_KEYS.CRITIC_VALIDATION,
				DEFAULT_FEATURE_FLAGS[FEATURE_FLAG_KEYS.CRITIC_VALIDATION]
			);
		} catch (error) {
			console.warn(
				'🚩 [FeatureFlags] Failed to check critic validation:',
				error
			);
			return DEFAULT_FEATURE_FLAGS[FEATURE_FLAG_KEYS.CRITIC_VALIDATION];
		}
	}

	/**
	 * Check if insight generation is enabled
	 */
	isInsightGenerationEnabled(): boolean {
		try {
			return this.getFlag(
				FEATURE_FLAG_KEYS.INSIGHT_GENERATION,
				DEFAULT_FEATURE_FLAGS[FEATURE_FLAG_KEYS.INSIGHT_GENERATION]
			);
		} catch (error) {
			console.warn(
				'🚩 [FeatureFlags] Failed to check insight generation:',
				error
			);
			return DEFAULT_FEATURE_FLAGS[FEATURE_FLAG_KEYS.INSIGHT_GENERATION];
		}
	}

	/**
	 * Check if notification system is enabled
	 */
	isNotificationSystemEnabled(): boolean {
		try {
			return this.getFlag(
				FEATURE_FLAG_KEYS.NOTIFICATION_SYSTEM,
				DEFAULT_FEATURE_FLAGS[FEATURE_FLAG_KEYS.NOTIFICATION_SYSTEM]
			);
		} catch (error) {
			console.warn(
				'🚩 [FeatureFlags] Failed to check notification system:',
				error
			);
			return DEFAULT_FEATURE_FLAGS[FEATURE_FLAG_KEYS.NOTIFICATION_SYSTEM];
		}
	}

	/**
	 * Check if crash reporting is enabled
	 */
	isCrashReportingEnabled(): boolean {
		try {
			return this.getFlag(
				FEATURE_FLAG_KEYS.CRASH_REPORTING,
				DEFAULT_FEATURE_FLAGS[FEATURE_FLAG_KEYS.CRASH_REPORTING]
			);
		} catch (error) {
			console.warn('🚩 [FeatureFlags] Failed to check crash reporting:', error);
			return DEFAULT_FEATURE_FLAGS[FEATURE_FLAG_KEYS.CRASH_REPORTING];
		}
	}

	/**
	 * Check if analytics collection is enabled
	 */
	isAnalyticsCollectionEnabled(): boolean {
		try {
			return this.getFlag(
				FEATURE_FLAG_KEYS.ANALYTICS_COLLECTION,
				DEFAULT_FEATURE_FLAGS[FEATURE_FLAG_KEYS.ANALYTICS_COLLECTION]
			);
		} catch (error) {
			console.warn(
				'🚩 [FeatureFlags] Failed to check analytics collection:',
				error
			);
			return DEFAULT_FEATURE_FLAGS[FEATURE_FLAG_KEYS.ANALYTICS_COLLECTION];
		}
	}

	/**
	 * Check if performance monitoring is enabled
	 */
	isPerformanceMonitoringEnabled(): boolean {
		try {
			return this.getFlag(
				FEATURE_FLAG_KEYS.PERFORMANCE_MONITORING,
				DEFAULT_FEATURE_FLAGS[FEATURE_FLAG_KEYS.PERFORMANCE_MONITORING]
			);
		} catch (error) {
			console.warn(
				'🚩 [FeatureFlags] Failed to check performance monitoring:',
				error
			);
			return DEFAULT_FEATURE_FLAGS[FEATURE_FLAG_KEYS.PERFORMANCE_MONITORING];
		}
	}

	/**
	 * Get service status
	 */
	getStatus(): {
		isInitialized: boolean;
		enableRemoteConfig: boolean;
		enableLocalOverrides: boolean;
		enableKillSwitches: boolean;
		flagCount: number;
		lastFetchTime: number;
	} {
		try {
			return {
				isInitialized: this.isInitialized,
				enableRemoteConfig: this.options.enableRemoteConfig,
				enableLocalOverrides: this.options.enableLocalOverrides,
				enableKillSwitches: this.options.enableKillSwitches,
				flagCount: this.flags.size,
				lastFetchTime: this.lastFetchTime,
			};
		} catch (error) {
			console.warn('🚩 [FeatureFlags] Failed to get status:', error);
			return {
				isInitialized: false,
				enableRemoteConfig: false,
				enableLocalOverrides: false,
				enableKillSwitches: false,
				flagCount: 0,
				lastFetchTime: 0,
			};
		}
	}

	/**
	 * Get flag with type validation
	 */
	getFlagTyped<T extends boolean | string | number>(
		key: string,
		type: 'boolean' | 'string' | 'number',
		defaultValue: T
	): T {
		try {
			if (!key || typeof key !== 'string') return defaultValue;

			const flag = this.flags.get(key);
			if (!flag) return defaultValue;

			// Handle kill switches
			if (this.options.enableKillSwitches && this.isKillSwitch(key)) {
				return (type === 'boolean' ? false : type === 'string' ? '' : 0) as T;
			}

			// Type validation
			if (type === 'boolean' && typeof flag.value === 'boolean') {
				return flag.value as T;
			}
			if (type === 'string' && typeof flag.value === 'string') {
				return flag.value as T;
			}
			if (type === 'number' && typeof flag.value === 'number') {
				return flag.value as T;
			}

			return defaultValue;
		} catch (error) {
			console.warn(`🚩 [FeatureFlags] Failed to get typed flag ${key}:`, error);
			return defaultValue;
		}
	}

	/**
	 * Set multiple local overrides at once
	 */
	setMultipleLocalOverrides(
		overrides: Record<string, boolean | string | number>,
		description?: string
	): { success: boolean; errors: string[] } {
		const errors: string[] = [];
		let successCount = 0;

		try {
			if (!this.options.enableLocalOverrides) {
				errors.push('Local overrides are disabled');
				return { success: false, errors };
			}

			for (const [key, value] of Object.entries(overrides)) {
				try {
					if (!key || typeof key !== 'string') {
						errors.push(`Invalid key: ${key}`);
						continue;
					}

					this.flags.set(key, {
						key,
						value,
						description: description || 'Batch local override',
						lastUpdated: new Date(),
						source: 'local',
					});
					successCount++;
				} catch (error) {
					errors.push(`Failed to set ${key}: ${error}`);
				}
			}

			console.log(
				`🚩 [FeatureFlags] Batch override: ${successCount}/${
					Object.keys(overrides).length
				} flags set`
			);

			return {
				success: errors.length === 0,
				errors,
			};
		} catch (error) {
			console.warn(
				'🚩 [FeatureFlags] Failed to set multiple overrides:',
				error
			);
			return { success: false, errors: [String(error)] };
		}
	}

	/**
	 * Clear all local overrides
	 */
	clearAllLocalOverrides(): { success: boolean; clearedCount: number } {
		try {
			let clearedCount = 0;
			const keysToDelete: string[] = [];

			// Find all local overrides
			for (const [key, flag] of this.flags.entries()) {
				if (flag.source === 'local') {
					keysToDelete.push(key);
				}
			}

			// Remove them
			keysToDelete.forEach((key) => {
				this.flags.delete(key);
				clearedCount++;
			});

			console.log(`🚩 [FeatureFlags] Cleared ${clearedCount} local overrides`);
			return { success: true, clearedCount };
		} catch (error) {
			console.warn('🚩 [FeatureFlags] Failed to clear local overrides:', error);
			return { success: false, clearedCount: 0 };
		}
	}

	/**
	 * Get flags by source
	 */
	getFlagsBySource(source: 'remote' | 'local' | 'default'): FeatureFlag[] {
		try {
			return Array.from(this.flags.values()).filter(
				(flag) => flag.source === source
			);
		} catch (error) {
			console.warn(
				`🚩 [FeatureFlags] Failed to get flags by source ${source}:`,
				error
			);
			return [];
		}
	}

	/**
	 * Check if flag exists
	 */
	hasFlag(key: string): boolean {
		try {
			return this.flags.has(key);
		} catch (error) {
			console.warn(
				`🚩 [FeatureFlags] Failed to check if flag exists ${key}:`,
				error
			);
			return false;
		}
	}

	/**
	 * Get flag metadata
	 */
	getFlagMetadata(key: string): FeatureFlag | null {
		try {
			return this.flags.get(key) || null;
		} catch (error) {
			console.warn(
				`🚩 [FeatureFlags] Failed to get flag metadata ${key}:`,
				error
			);
			return null;
		}
	}

	/**
	 * Validate flag value type
	 */
	validateFlagValue(
		key: string,
		value: any,
		expectedType: 'boolean' | 'string' | 'number'
	): { valid: boolean; error?: string } {
		try {
			if (expectedType === 'boolean' && typeof value !== 'boolean') {
				return { valid: false, error: 'Expected boolean value' };
			}
			if (expectedType === 'string' && typeof value !== 'string') {
				return { valid: false, error: 'Expected string value' };
			}
			if (expectedType === 'number' && typeof value !== 'number') {
				return { valid: false, error: 'Expected number value' };
			}
			return { valid: true };
		} catch (error) {
			return { valid: false, error: String(error) };
		}
	}

	/**
	 * Get all flag keys
	 */
	getAllFlagKeys(): string[] {
		try {
			return Array.from(this.flags.keys());
		} catch (error) {
			console.warn('🚩 [FeatureFlags] Failed to get all flag keys:', error);
			return [];
		}
	}

	/**
	 * Export flags to JSON
	 */
	exportFlags(): string {
		try {
			const exportData = {
				flags: Array.from(this.flags.entries()).reduce((acc, [key, flag]) => {
					acc[key] = {
						value: flag.value,
						description: flag.description,
						source: flag.source,
						lastUpdated: flag.lastUpdated?.toISOString(),
					};
					return acc;
				}, {} as Record<string, any>),
				exportedAt: new Date().toISOString(),
				version: '1.0',
			};

			return JSON.stringify(exportData, null, 2);
		} catch (error) {
			console.warn('🚩 [FeatureFlags] Failed to export flags:', error);
			return '{}';
		}
	}

	/**
	 * Import flags from JSON
	 */
	importFlags(jsonData: string): {
		success: boolean;
		importedCount: number;
		errors: string[];
	} {
		const errors: string[] = [];
		let importedCount = 0;

		try {
			const data = JSON.parse(jsonData);
			if (!data.flags || typeof data.flags !== 'object') {
				errors.push('Invalid JSON format: missing flags object');
				return { success: false, importedCount: 0, errors };
			}

			for (const [key, flagData] of Object.entries(data.flags)) {
				try {
					if (typeof flagData !== 'object' || !flagData) {
						errors.push(`Invalid flag data for ${key}`);
						continue;
					}

					const flagDataTyped = flagData as {
						value: boolean | string | number;
						description?: string;
						lastUpdated?: string;
					};

					const flag: FeatureFlag = {
						key,
						value: flagDataTyped.value,
						description: flagDataTyped.description,
						source: 'local', // Imported flags are treated as local overrides
						lastUpdated: flagDataTyped.lastUpdated
							? new Date(flagDataTyped.lastUpdated)
							: new Date(),
					};

					this.flags.set(key, flag);
					importedCount++;
				} catch (error) {
					errors.push(`Failed to import ${key}: ${error}`);
				}
			}

			console.log(`🚩 [FeatureFlags] Imported ${importedCount} flags`);
			return {
				success: errors.length === 0,
				importedCount,
				errors,
			};
		} catch (error) {
			console.warn('🚩 [FeatureFlags] Failed to import flags:', error);
			return { success: false, importedCount: 0, errors: [String(error)] };
		}
	}

	/**
	 * Get flag statistics
	 */
	getFlagStatistics(): {
		total: number;
		bySource: Record<string, number>;
		byType: Record<string, number>;
		localOverrides: number;
		killSwitches: number;
	} {
		try {
			const bySource: Record<string, number> = {
				remote: 0,
				local: 0,
				default: 0,
			};
			const byType: Record<string, number> = {
				boolean: 0,
				string: 0,
				number: 0,
			};
			let localOverrides = 0;
			let killSwitches = 0;

			for (const flag of this.flags.values()) {
				bySource[flag.source]++;
				byType[typeof flag.value]++;

				if (flag.source === 'local') {
					localOverrides++;
				}

				if (this.isKillSwitch(flag.key)) {
					killSwitches++;
				}
			}

			return {
				total: this.flags.size,
				bySource,
				byType,
				localOverrides,
				killSwitches,
			};
		} catch (error) {
			console.warn('🚩 [FeatureFlags] Failed to get flag statistics:', error);
			return {
				total: 0,
				bySource: { remote: 0, local: 0, default: 0 },
				byType: { boolean: 0, string: 0, number: 0 },
				localOverrides: 0,
				killSwitches: 0,
			};
		}
	}

	/**
	 * Check if refresh is needed based on minimum fetch interval
	 */
	shouldRefresh(): boolean {
		try {
			if (!this.options.enableRemoteConfig) return false;
			const now = Date.now();
			const timeSinceLastFetch = now - this.lastFetchTime;
			return timeSinceLastFetch >= this.options.minimumFetchInterval * 1000;
		} catch (error) {
			console.warn(
				'🚩 [FeatureFlags] Failed to check if refresh is needed:',
				error
			);
			return false;
		}
	}

	/**
	 * Auto-refresh if needed
	 */
	async autoRefresh(): Promise<boolean> {
		try {
			if (this.shouldRefresh()) {
				await this.refresh();
				return true;
			}
			return false;
		} catch (error) {
			console.warn('🚩 [FeatureFlags] Failed to auto-refresh:', error);
			return false;
		}
	}

	/**
	 * Get flags that match a pattern
	 */
	getFlagsByPattern(pattern: string | RegExp): FeatureFlag[] {
		try {
			const regex =
				typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
			return Array.from(this.flags.values()).filter((flag) =>
				regex.test(flag.key)
			);
		} catch (error) {
			console.warn(
				`🚩 [FeatureFlags] Failed to get flags by pattern ${pattern}:`,
				error
			);
			return [];
		}
	}

	/**
	 * Get flags by type
	 */
	getFlagsByType(type: 'boolean' | 'string' | 'number'): FeatureFlag[] {
		try {
			return Array.from(this.flags.values()).filter(
				(flag) => typeof flag.value === type
			);
		} catch (error) {
			console.warn(
				`🚩 [FeatureFlags] Failed to get flags by type ${type}:`,
				error
			);
			return [];
		}
	}

	/**
	 * Check if any flags have been updated since a timestamp
	 */
	hasFlagsUpdatedSince(timestamp: number): boolean {
		try {
			return Array.from(this.flags.values()).some(
				(flag) => flag.lastUpdated && flag.lastUpdated.getTime() > timestamp
			);
		} catch (error) {
			console.warn(
				'🚩 [FeatureFlags] Failed to check if flags updated since timestamp:',
				error
			);
			return false;
		}
	}

	/**
	 * Get the most recently updated flag
	 */
	getMostRecentlyUpdatedFlag(): FeatureFlag | null {
		try {
			let mostRecent: FeatureFlag | null = null;
			let mostRecentTime = 0;

			for (const flag of this.flags.values()) {
				if (flag.lastUpdated && flag.lastUpdated.getTime() > mostRecentTime) {
					mostRecent = flag;
					mostRecentTime = flag.lastUpdated.getTime();
				}
			}

			return mostRecent;
		} catch (error) {
			console.warn(
				'🚩 [FeatureFlags] Failed to get most recently updated flag:',
				error
			);
			return null;
		}
	}

	/**
	 * Reset flag to default value
	 */
	resetFlagToDefault(key: string): { success: boolean; error?: string } {
		try {
			if (!key || typeof key !== 'string') {
				return { success: false, error: 'Invalid key' };
			}

			// Check if it exists in default flags
			if (!(key in DEFAULT_FEATURE_FLAGS)) {
				return { success: false, error: 'Flag not found in default flags' };
			}

			const defaultValue =
				DEFAULT_FEATURE_FLAGS[key as keyof typeof DEFAULT_FEATURE_FLAGS];

			this.flags.set(key, {
				key,
				value: defaultValue,
				description: 'Reset to default',
				lastUpdated: new Date(),
				source: 'default',
			});

			console.log(`🚩 [FeatureFlags] Reset flag ${key} to default value`);
			return { success: true };
		} catch (error) {
			console.warn(
				`🚩 [FeatureFlags] Failed to reset flag ${key} to default:`,
				error
			);
			return { success: false, error: String(error) };
		}
	}

	/**
	 * Reset all flags to default values
	 */
	resetAllFlagsToDefault(): {
		success: boolean;
		resetCount: number;
		errors: string[];
	} {
		const errors: string[] = [];
		let resetCount = 0;

		try {
			for (const key of Object.keys(DEFAULT_FEATURE_FLAGS)) {
				const result = this.resetFlagToDefault(key);
				if (result.success) {
					resetCount++;
				} else if (result.error) {
					errors.push(`${key}: ${result.error}`);
				}
			}

			console.log(
				`🚩 [FeatureFlags] Reset ${resetCount} flags to default values`
			);
			return {
				success: errors.length === 0,
				resetCount,
				errors,
			};
		} catch (error) {
			console.warn(
				'🚩 [FeatureFlags] Failed to reset all flags to default:',
				error
			);
			return { success: false, resetCount: 0, errors: [String(error)] };
		}
	}

	/**
	 * Get flag usage analytics
	 */
	getFlagUsageAnalytics(): {
		totalFlags: number;
		remoteFlags: number;
		localOverrides: number;
		defaultFlags: number;
		killSwitches: number;
		lastUpdated: Date | null;
		mostUsedType: string;
	} {
		try {
			const flags = Array.from(this.flags.values());
			const totalFlags = flags.length;
			const remoteFlags = flags.filter((f) => f.source === 'remote').length;
			const localOverrides = flags.filter((f) => f.source === 'local').length;
			const defaultFlags = flags.filter((f) => f.source === 'default').length;
			const killSwitches = flags.filter((f) => this.isKillSwitch(f.key)).length;

			// Find most used type
			const typeCount: Record<string, number> = {};
			flags.forEach((flag) => {
				const type = typeof flag.value;
				typeCount[type] = (typeCount[type] || 0) + 1;
			});
			const mostUsedType = Object.entries(typeCount).reduce((a, b) =>
				typeCount[a[0]] > typeCount[b[0]] ? a : b
			)[0];

			// Find most recently updated
			const lastUpdated = flags.reduce((latest, flag) => {
				if (!flag.lastUpdated) return latest;
				if (!latest) return flag.lastUpdated;
				return flag.lastUpdated > latest ? flag.lastUpdated : latest;
			}, null as Date | null);

			return {
				totalFlags,
				remoteFlags,
				localOverrides,
				defaultFlags,
				killSwitches,
				lastUpdated,
				mostUsedType,
			};
		} catch (error) {
			console.warn(
				'🚩 [FeatureFlags] Failed to get flag usage analytics:',
				error
			);
			return {
				totalFlags: 0,
				remoteFlags: 0,
				localOverrides: 0,
				defaultFlags: 0,
				killSwitches: 0,
				lastUpdated: null,
				mostUsedType: 'boolean',
			};
		}
	}
}

// Export singleton instance
export const featureFlags = new FeatureFlagsService();
