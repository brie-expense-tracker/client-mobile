// logger.ts - Centralized logging utility with log levels and PII scrubbing
// Provides a single source of truth for all logging throughout the app

import { scrubPII } from './piiScrubbing';

// Type declaration for __DEV__ (provided by Metro bundler in React Native)
declare const __DEV__: boolean;

type Level = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const levelOrder: Record<Exclude<Level, 'silent'>, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
};

// Determine log level from environment variable or default based on __DEV__
// Supports OTA/channel control via EXPO_PUBLIC_FORCE_DEBUG flag
const getEnvLevel = (): Level => {
	// Check for OTA override (useful for remote debugging without new binary)
	if (!__DEV__ && process.env.EXPO_PUBLIC_FORCE_DEBUG === '1') {
		return 'debug';
	}

	const envLevel = process.env.EXPO_PUBLIC_LOG_LEVEL as Level;
	if (
		envLevel &&
		['debug', 'info', 'warn', 'error', 'silent'].includes(envLevel)
	) {
		return envLevel;
	}
	// Default: verbose in dev, quieter in prod
	return __DEV__ ? 'debug' : 'warn';
};

const envLevel = getEnvLevel();

// Check if a log level is enabled
const enabled = (target: keyof typeof levelOrder): boolean => {
	if (envLevel === 'silent') return false;
	const targetLevel = levelOrder[target];
	const currentLevel = levelOrder[envLevel as keyof typeof levelOrder] ?? 9999;
	return targetLevel >= currentLevel;
};

// Safely format arguments for logging
const safeFormat = (args: unknown[]): string[] => {
	return args.map((a) => {
		if (a === null || a === undefined) {
			return String(a);
		}
		if (typeof a === 'object') {
			try {
				return JSON.stringify(a, null, 2);
			} catch {
				return String(a);
			}
		}
		return String(a);
	});
};

// Basic secret/token scrubbing for API keys, tokens, passwords
const scrubSecrets = (msg: string): string => {
	return msg.replace(
		/(api[_-]?key|token|password|secret|auth)=([^&\s"',]+)/gi,
		'$1=***'
	);
};

// Sentry integration (lazy-loaded to avoid import errors if not available)
let Sentry: any = null;
let sentryEnabled = false;

const tryInitSentry = () => {
	if (sentryEnabled || Sentry !== null) return;
	try {
		// Dynamic import to avoid issues if Sentry isn't configured
		import('@sentry/react-native')
			.then((module) => {
				Sentry = module;
				sentryEnabled = true;
			})
			.catch(() => {
				// Sentry not available, that's okay
			});
	} catch {
		// Sentry not available
	}
};

// Initialize Sentry on first use (only in production)
if (!__DEV__) {
	tryInitSentry();
}

// Pass logs to Sentry breadcrumbs (only info/warn/error, not debug)
const passToSentry = (
	level: 'info' | 'warning' | 'error',
	message: string,
	data?: unknown
) => {
	if (!sentryEnabled || !Sentry) return;
	try {
		const scrubbedData =
			typeof data === 'object' && data !== null
				? JSON.stringify(data).slice(0, 1000) // Limit size
				: data;
		Sentry.addBreadcrumb({
			category: 'app',
			level,
			message: message.slice(0, 500), // Limit message size
			data: scrubbedData,
		});
	} catch {
		// Silently fail if Sentry isn't available or configured
	}
};

// Log output with PII scrubbing and level checks
const createLogger = () => {
	const logFn = (
		consoleMethod: (...args: unknown[]) => void,
		level: keyof typeof levelOrder,
		shouldSendToSentry: boolean = false
	) => {
		return (...args: unknown[]) => {
			if (!enabled(level)) return;

			const formatted = safeFormat(args);
			const scrubbed = formatted.map((msg) => {
				const secretScrubbed = scrubSecrets(msg);
				// Use existing PII scrubbing utility for comprehensive scrubbing
				try {
					return scrubPII(secretScrubbed);
				} catch {
					return secretScrubbed;
				}
			});

			consoleMethod(...scrubbed);

			// Send to Sentry breadcrumbs in production (not debug)
			if (shouldSendToSentry && !__DEV__) {
				const message = scrubbed[0] || '';
				const data = args.length > 1 ? args.slice(1) : undefined;
				const sentryLevel =
					level === 'error' ? 'error' : level === 'warn' ? 'warning' : 'info';
				passToSentry(sentryLevel, message, data);
			}
		};
	};

	// Lazy logging: factory function that only executes if level is enabled
	const lazyLogFn = (
		consoleMethod: (...args: unknown[]) => void,
		level: keyof typeof levelOrder,
		shouldSendToSentry: boolean = false
	) => {
		return (factory: () => unknown[]) => {
			if (!enabled(level)) return;

			try {
				const args = factory();
				logFn(consoleMethod, level, shouldSendToSentry)(...args);
			} catch (error) {
				// If factory fails, log the error instead
				console.error('[Logger] Lazy log factory failed:', error);
			}
		};
	};

	return {
		debug: logFn(console.debug, 'debug', false),
		debugLazy: lazyLogFn(console.debug, 'debug', false),
		info: logFn(console.info, 'info', true),
		infoLazy: lazyLogFn(console.info, 'info', true),
		warn: logFn(console.warn, 'warn', true),
		warnLazy: lazyLogFn(console.warn, 'warn', true),
		error: logFn(console.error, 'error', true),
		errorLazy: lazyLogFn(console.error, 'error', true),
	};
};

// Create logger instance
let loggerInstance = createLogger();

// If level is silent, replace with no-ops (micro-optimization)
if (envLevel === 'silent') {
	loggerInstance = {
		debug: () => {},
		debugLazy: () => {},
		info: () => {},
		infoLazy: () => {},
		warn: () => {},
		warnLazy: () => {},
		error: () => {},
		errorLazy: () => {},
	};
}

// Export logger
export const logger = loggerInstance;

// Export utility to check if a level is enabled (useful for conditional expensive operations)
export const isLogLevelEnabled = (level: keyof typeof levelOrder): boolean => {
	return enabled(level);
};

// Export current log level for debugging
export const getCurrentLogLevel = (): Level => {
	return envLevel;
};
