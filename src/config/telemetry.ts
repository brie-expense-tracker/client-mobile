/**
 * Telemetry / crash reporting configuration (PII scrubbing).
 * Crash reporting uses Firebase Crashlytics only (no Sentry).
 */

export const TELEMETRY_CONFIG = {
	LOGGING: {
		PII_SCRUBBING_ENABLED: true,
	},
	/** Used by FeatureFlagsService for Remote Config */
	FEATURES: {
		ENABLED: true,
	},
	FIREBASE: {
		REMOTE_CONFIG_FETCH_TIMEOUT: 10000,
		REMOTE_CONFIG_MINIMUM_FETCH_INTERVAL: 3600,
	},
	/** Sampling for any future crash/perf pipeline (Crashlytics handles its own) */
	SAMPLING: {
		DEFAULT_RATE: 0.2,
	},
	ENVIRONMENT:
		process.env.EXPO_PUBLIC_ENV ||
		(typeof __DEV__ !== 'undefined' && __DEV__
			? 'development'
			: 'production'),
};

/** Remote Config parameter names (must match Firebase console if used) */
export const FEATURE_FLAG_KEYS = {
	SHADOW_AB_TESTING: 'shadow_ab_testing',
	AI_MODEL_SELECTION: 'ai_model_selection',
	GROUNDING_LAYER: 'grounding_layer',
	CRITIC_VALIDATION: 'critic_validation',
	INSIGHT_GENERATION: 'insight_generation',
	NOTIFICATION_SYSTEM: 'notification_system',
	CRASH_REPORTING: 'crash_reporting',
	ANALYTICS_COLLECTION: 'analytics_collection',
	PERFORMANCE_MONITORING: 'performance_monitoring',
} as const;

/** Default flag values when Remote Config is unavailable */
export const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
	[FEATURE_FLAG_KEYS.SHADOW_AB_TESTING]: false,
	[FEATURE_FLAG_KEYS.AI_MODEL_SELECTION]: false,
	[FEATURE_FLAG_KEYS.GROUNDING_LAYER]: false,
	[FEATURE_FLAG_KEYS.CRITIC_VALIDATION]: false,
	[FEATURE_FLAG_KEYS.INSIGHT_GENERATION]: false,
	[FEATURE_FLAG_KEYS.NOTIFICATION_SYSTEM]: true,
	[FEATURE_FLAG_KEYS.CRASH_REPORTING]: true,
	[FEATURE_FLAG_KEYS.ANALYTICS_COLLECTION]: false,
	[FEATURE_FLAG_KEYS.PERFORMANCE_MONITORING]: false,
};
