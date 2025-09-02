// featureFlags.ts - Feature flags service with Firebase Remote Config integration
// Provides dynamic feature control and kill-switches for production safety

import {
	TELEMETRY_CONFIG,
	FEATURE_FLAG_KEYS,
	DEFAULT_FEATURE_FLAGS,
} from '../../config/telemetry';

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
			console.log('🚩 [FeatureFlags] Service initialized');
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
				this.updateFlagsFromRemoteConfig(config);
			} catch (error) {
				console.warn(
					'🚩 [FeatureFlags] Failed to update flags from remote config:',
					error
				);
			}

			console.log('🚩 [FeatureFlags] Remote config initialized');
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
	private updateFlagsFromRemoteConfig(remoteConfig: any): void {
		try {
			if (!remoteConfig) {
				console.warn('🚩 [FeatureFlags] Invalid remote config object');
				return;
			}

			Object.entries(FEATURE_FLAG_KEYS).forEach(([name, key]) => {
				try {
					const { getValue } = require('@react-native-firebase/remote-config');
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
			});
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

			console.log(`🚩 [FeatureFlags] Local override set: ${key} = ${value}`);
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
				console.log(`🚩 [FeatureFlags] Local override removed: ${key}`);
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
				this.updateFlagsFromRemoteConfig(config);
			} catch (error) {
				console.warn(
					'🚩 [FeatureFlags] Failed to update flags during refresh:',
					error
				);
			}

			this.lastFetchTime = Date.now();
			console.log('🚩 [FeatureFlags] Refreshed from remote config');
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
}

// Export singleton instance
export const featureFlags = new FeatureFlagsService();
