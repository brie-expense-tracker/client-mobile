// logger.ts - Centralized logging utility with log levels and PII scrubbing
//
// Quiet by default:
// - No EXPO_PUBLIC_LOG_LEVEL: production builds → warn; dev → info (not debug).
// - Verbose tracing: EXPO_PUBLIC_LOG_LEVEL=debug or EXPO_PUBLIC_FORCE_DEBUG=1
// - Silence everything: EXPO_PUBLIC_LOG_LEVEL=silent

import { scrubPII } from './piiScrubbing';

declare const __DEV__: boolean;

type Level = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const levelOrder: Record<Exclude<Level, 'silent'>, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
};

const getEnvLevel = (): Level => {
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
	// Quiet by default in dev too: info unless explicitly overridden above
	return __DEV__ ? 'info' : 'warn';
};

const envLevel = getEnvLevel();

const enabled = (target: keyof typeof levelOrder): boolean => {
	if (envLevel === 'silent') return false;
	const targetLevel = levelOrder[target];
	const currentLevel = levelOrder[envLevel as keyof typeof levelOrder] ?? 9999;
	return targetLevel >= currentLevel;
};

const safeFormat = (args: unknown[]): string[] => {
	return args.map((a) => {
		if (a === null || a === undefined) return String(a);
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

const scrubSecrets = (msg: string): string => {
	return msg.replace(
		/(api[_-]?key|token|password|secret|auth)=([^&\s"',]+)/gi,
		'$1=***'
	);
};

const createLogger = () => {
	const logFn = (
		consoleMethod: (...args: unknown[]) => void,
		level: keyof typeof levelOrder
	) => {
		return (...args: unknown[]) => {
			if (!enabled(level)) return;
			const formatted = safeFormat(args);
			const scrubbed = formatted.map((msg) => {
				const secretScrubbed = scrubSecrets(msg);
				try {
					return scrubPII(secretScrubbed);
				} catch {
					return secretScrubbed;
				}
			});
			consoleMethod(...scrubbed);
		};
	};

	const lazyLogFn = (
		consoleMethod: (...args: unknown[]) => void,
		level: keyof typeof levelOrder
	) => {
		return (factory: () => unknown[]) => {
			if (!enabled(level)) return;
			try {
				const args = factory();
				logFn(consoleMethod, level)(...args);
			} catch (error) {
				console.error('[Logger] Lazy log factory failed:', error);
			}
		};
	};

	// Dispatch via globalThis.console at call time so tests can spyOn(console, 'info')
	const out = globalThis.console;
	return {
		debug: logFn((...a: unknown[]) => out.debug(...a), 'debug'),
		debugLazy: lazyLogFn((...a: unknown[]) => out.debug(...a), 'debug'),
		info: logFn((...a: unknown[]) => out.info(...a), 'info'),
		infoLazy: lazyLogFn((...a: unknown[]) => out.info(...a), 'info'),
		warn: logFn((...a: unknown[]) => out.warn(...a), 'warn'),
		warnLazy: lazyLogFn((...a: unknown[]) => out.warn(...a), 'warn'),
		error: logFn((...a: unknown[]) => out.error(...a), 'error'),
		errorLazy: lazyLogFn((...a: unknown[]) => out.error(...a), 'error'),
	};
};

let loggerInstance = createLogger();

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

export const logger = loggerInstance;
export const isLogLevelEnabled = (level: keyof typeof levelOrder): boolean =>
	enabled(level);
export const getCurrentLogLevel = (): Level => envLevel;
