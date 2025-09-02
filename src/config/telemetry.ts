// telemetry.ts - Centralized telemetry and stability configuration
// Environment variables and feature flags for production monitoring

export const TELEMETRY_CONFIG = {
	// Crash Reporting
	SENTRY: {
		DSN: process.env.SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN || null,
		ENVIRONMENT:
			process.env.SENTRY_ENVIRONMENT ||
			process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ||
			'development',
		TRACES_SAMPLE_RATE: parseFloat(
			process.env.SENTRY_TRACES_SAMPLE_RATE ||
				process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ||
				'0.1'
		),
		PROFILES_SAMPLE_RATE: parseFloat(
			process.env.SENTRY_PROFILES_SAMPLE_RATE ||
				process.env.EXPO_PUBLIC_SENTRY_PROFILES_SAMPLE_RATE ||
				'0.1'
		),
		ENABLED:
			(process.env.SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN) !==
			undefined,
	},

	// Firebase Remote Config
	FIREBASE: {
		REMOTE_CONFIG_MINIMUM_FETCH_INTERVAL: parseInt(
			process.env.FIREBASE_REMOTE_CONFIG_MINIMUM_FETCH_INTERVAL || '3600'
		),
		REMOTE_CONFIG_FETCH_TIMEOUT: parseInt(
			process.env.FIREBASE_REMOTE_CONFIG_FETCH_TIMEOUT || '10000'
		),
	},

	// Analytics & Monitoring
	ANALYTICS: {
		SAMPLE_RATE: parseFloat(process.env.ANALYTICS_SAMPLE_RATE || '1.0'),
		ENABLED: process.env.ANALYTICS_ENABLED !== 'false',
		CRASH_REPORTING_ENABLED: process.env.CRASH_REPORTING_ENABLED !== 'false',
		PERFORMANCE_MONITORING_ENABLED:
			process.env.PERFORMANCE_MONITORING_ENABLED !== 'false',
	},

	// Feature Flags
	FEATURES: {
		ENABLED: process.env.FEATURE_FLAGS_ENABLED !== 'false',
		DEMO_MODE: process.env.DEMO_MODE_ENABLED === 'true',
		SHADOW_AB_TESTING: process.env.SHADOW_AB_TESTING_ENABLED !== 'false',
	},

	// Logging
	LOGGING: {
		LEVEL: process.env.LOG_LEVEL || 'info',
		SAMPLING_RATE: parseFloat(process.env.LOG_SAMPLING_RATE || '0.1'),
		PII_SCRUBBING_ENABLED: process.env.PII_SCRUBBING_ENABLED !== 'false',
	},

	// API Configuration
	API: {
		BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
		TIMEOUT: parseInt(process.env.API_TIMEOUT || '10000'),
	},
} as const;

// Feature flag keys for remote config
export const FEATURE_FLAG_KEYS = {
	DEMO_MODE: 'demo_mode_enabled',
	SHADOW_AB_TESTING: 'shadow_ab_testing_enabled',
	AI_MODEL_SELECTION: 'ai_model_selection_enabled',
	GROUNDING_LAYER: 'grounding_layer_enabled',
	CRITIC_VALIDATION: 'critic_validation_enabled',
	INSIGHT_GENERATION: 'insight_generation_enabled',
	NOTIFICATION_SYSTEM: 'notification_system_enabled',
	CRASH_REPORTING: 'crash_reporting_enabled',
	ANALYTICS_COLLECTION: 'analytics_collection_enabled',
	PERFORMANCE_MONITORING: 'performance_monitoring_enabled',
} as const;

// Default feature flag values
export const DEFAULT_FEATURE_FLAGS = {
	[FEATURE_FLAG_KEYS.DEMO_MODE]: true,
	[FEATURE_FLAG_KEYS.SHADOW_AB_TESTING]: true,
	[FEATURE_FLAG_KEYS.AI_MODEL_SELECTION]: true,
	[FEATURE_FLAG_KEYS.GROUNDING_LAYER]: true,
	[FEATURE_FLAG_KEYS.CRITIC_VALIDATION]: true,
	[FEATURE_FLAG_KEYS.INSIGHT_GENERATION]: true,
	[FEATURE_FLAG_KEYS.NOTIFICATION_SYSTEM]: true,
	[FEATURE_FLAG_KEYS.CRASH_REPORTING]: true,
	[FEATURE_FLAG_KEYS.ANALYTICS_COLLECTION]: true,
	[FEATURE_FLAG_KEYS.PERFORMANCE_MONITORING]: true,
} as const;

// PII patterns for scrubbing
export const PII_PATTERNS = {
	EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
	PHONE: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
	CREDIT_CARD: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
	SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
	BANK_ACCOUNT: /\b\d{4,17}\b/g,
	AMOUNT: /\$\d+(?:,\d{3})*(?:\.\d{2})?/g,
	DATE: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
} as const;

// Sampling configuration
export const SAMPLING_CONFIG = {
	ANALYTICS: {
		PRODUCTION: 0.1, // 10% of users
		STAGING: 0.5, // 50% of users
		DEVELOPMENT: 1.0, // 100% of users
	},
	CRASH_REPORTING: {
		PRODUCTION: 1.0, // 100% of crashes
		STAGING: 0.5, // 50% of crashes
		DEVELOPMENT: 0.1, // 10% of crashes
	},
	PERFORMANCE: {
		PRODUCTION: 0.05, // 5% of users
		STAGING: 0.2, // 20% of users
		DEVELOPMENT: 0.5, // 50% of users
	},
} as const;
