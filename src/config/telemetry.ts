/**
 * Telemetry/crash reporting configuration (Sentry, PII scrubbing).
 */

export const TELEMETRY_CONFIG = {
	SENTRY: {
		ENABLED: process.env.EXPO_PUBLIC_SENTRY_ENABLED === '1',
		DSN: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
		ENVIRONMENT:
			process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ||
			process.env.EXPO_PUBLIC_ENV ||
			'development',
		TRACES_SAMPLE_RATE: Number(
			process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.2'
		),
		PROFILES_SAMPLE_RATE: Number(
			process.env.EXPO_PUBLIC_SENTRY_PROFILES_SAMPLE_RATE || '0'
		),
	},
	LOGGING: {
		PII_SCRUBBING_ENABLED: true,
	},
};
