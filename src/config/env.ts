// Minimal env parsing without external deps

type PublicEnv = {
	EXPO_PUBLIC_API_URL: string;
	EXPO_PUBLIC_ENV: 'testflight' | 'production';
	EXPO_PUBLIC_AI_INSIGHTS: '0' | '1';
	EXPO_PUBLIC_CRASH_CONSENT?: 'true' | 'false';
	EXPO_PUBLIC_SENTRY_DSN?: string;
	EXPO_PUBLIC_SENTRY_ENVIRONMENT?: string;
};

function requireString(name: keyof PublicEnv, value: unknown): string {
	if (typeof value === 'string' && value.trim().length > 0) return value;
	throw new Error(`Missing required env: ${String(name)}`);
}

function optionalUrl(value: unknown): string | undefined {
	if (typeof value !== 'string' || value.trim() === '') return undefined;
	try {
		// validate
		new URL(value);
		return value;
	} catch {
		return undefined;
	}
}

function requireUrl(name: keyof PublicEnv, value: unknown): string {
	const str = requireString(name, value);
	try {
		new URL(str);
		return str;
	} catch {
		throw new Error(`Invalid URL for env: ${String(name)}`);
	}
}

function normalizeEnv(value: string): 'testflight' | 'production' {
	const v = value.toLowerCase();
	if (v === 'production' || v === 'prod') return 'production';
	if (
		v === 'testflight' ||
		v === 'staging' ||
		v === 'preview' ||
		v === 'dev' ||
		v === 'development'
	) {
		return 'testflight';
	}
	if (typeof __DEV__ !== 'undefined' && __DEV__) return 'testflight';
	throw new Error('EXPO_PUBLIC_ENV must be "testflight" or "production"');
}

function parseEnv(): PublicEnv {
	const apiUrl = requireUrl(
		'EXPO_PUBLIC_API_URL',
		process.env.EXPO_PUBLIC_API_URL
	);

	const envRaw = requireString('EXPO_PUBLIC_ENV', process.env.EXPO_PUBLIC_ENV);
	const env = normalizeEnv(envRaw);

	const ai = (process.env.EXPO_PUBLIC_AI_INSIGHTS as '0' | '1') || '0';
	const crashConsent = process.env.EXPO_PUBLIC_CRASH_CONSENT as
		| 'true'
		| 'false'
		| undefined;
	const dsn = optionalUrl(process.env.EXPO_PUBLIC_SENTRY_DSN);
	const sentryEnv = process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT || undefined;

	return {
		EXPO_PUBLIC_API_URL: apiUrl,
		EXPO_PUBLIC_ENV: env,
		EXPO_PUBLIC_AI_INSIGHTS: ai,
		EXPO_PUBLIC_CRASH_CONSENT: crashConsent,
		EXPO_PUBLIC_SENTRY_DSN: dsn,
		EXPO_PUBLIC_SENTRY_ENVIRONMENT: sentryEnv,
	};
}

export const Env: PublicEnv = parseEnv();
