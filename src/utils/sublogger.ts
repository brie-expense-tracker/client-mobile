// sublogger.ts - Namespaced logger utility for cleaner, grep-friendly logs
// Create scoped loggers that automatically prefix messages with a namespace

import { logger } from './logger';
import { isLogLevelEnabled } from './logger';

export interface NamespacedLogger {
	debug: (...args: unknown[]) => void;
	debugLazy: (factory: () => unknown[]) => void;
	info: (...args: unknown[]) => void;
	infoLazy: (factory: () => unknown[]) => void;
	warn: (...args: unknown[]) => void;
	warnLazy: (factory: () => unknown[]) => void;
	error: (...args: unknown[]) => void;
	errorLazy: (factory: () => unknown[]) => void;
}

/**
 * Create a namespaced logger that automatically prefixes log messages
 *
 * @param namespace - The namespace prefix (e.g., "Network", "Auth", "Budget")
 * @returns A logger instance with namespace-prefixed methods
 *
 * @example
 * ```ts
 * const netLog = createLogger("Network");
 * netLog.info("Request started", { url, method });
 * // Logs: "[Network] Request started { url, method }"
 * ```
 */
export const createLogger = (namespace: string): NamespacedLogger => {
	const prefix = `[${namespace}]`;

	const wrapArgs = (args: unknown[]): unknown[] => {
		// If first arg is a string, prepend namespace. Otherwise, add namespace as first arg.
		if (args.length > 0 && typeof args[0] === 'string') {
			return [`${prefix} ${args[0]}`, ...args.slice(1)];
		}
		return [prefix, ...args];
	};

	return {
		debug: (...args: unknown[]) => {
			if (!isLogLevelEnabled('debug')) return;
			logger.debug(...wrapArgs(args));
		},
		debugLazy: (factory: () => unknown[]) => {
			if (!isLogLevelEnabled('debug')) return;
			logger.debugLazy(() => wrapArgs(factory()));
		},
		info: (...args: unknown[]) => {
			if (!isLogLevelEnabled('info')) return;
			logger.info(...wrapArgs(args));
		},
		infoLazy: (factory: () => unknown[]) => {
			if (!isLogLevelEnabled('info')) return;
			logger.infoLazy(() => wrapArgs(factory()));
		},
		warn: (...args: unknown[]) => {
			if (!isLogLevelEnabled('warn')) return;
			logger.warn(...wrapArgs(args));
		},
		warnLazy: (factory: () => unknown[]) => {
			if (!isLogLevelEnabled('warn')) return;
			logger.warnLazy(() => wrapArgs(factory()));
		},
		error: (...args: unknown[]) => {
			if (!isLogLevelEnabled('error')) return;
			logger.error(...wrapArgs(args));
		},
		errorLazy: (factory: () => unknown[]) => {
			if (!isLogLevelEnabled('error')) return;
			logger.errorLazy(() => wrapArgs(factory()));
		},
	};
};

/**
 * Common namespace shortcuts for frequently used loggers
 */
export const networkLog = createLogger('Network');
export const authLog = createLogger('Auth');
export const apiLog = createLogger('API');
export const cacheLog = createLogger('Cache');
export const budgetLog = createLogger('Budget');
