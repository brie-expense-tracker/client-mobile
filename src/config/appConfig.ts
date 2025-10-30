import { Env } from './env';

const perEnv = {
	testflight: { logLevel: 'info' as const, traces: 0.1, profiles: 0.1 },
	production: { logLevel: 'warn' as const, traces: 0.05, profiles: 0.05 },
}[Env.EXPO_PUBLIC_ENV];

export const AppConfig = Object.freeze({
	// Keep base without '/api' to match existing call sites that append '/api'
	apiBaseUrl: Env.EXPO_PUBLIC_API_URL,
	env: Env.EXPO_PUBLIC_ENV,
	flags: {
		aiInsights: Env.EXPO_PUBLIC_AI_INSIGHTS === '1',
		crashConsentDefault: Env.EXPO_PUBLIC_CRASH_CONSENT === 'true',
	},
	telemetry: {
		enabled: Boolean(Env.EXPO_PUBLIC_SENTRY_DSN),
		dsn: Env.EXPO_PUBLIC_SENTRY_DSN,
		environment: Env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? Env.EXPO_PUBLIC_ENV,
		tracesSampleRate: perEnv.traces,
		profilesSampleRate: perEnv.profiles,
		logLevel: perEnv.logLevel,
	},
	// Hardcode sensible defaults; override only if truly needed later
	network: {
		timeoutMs: 15000,
	},
});
