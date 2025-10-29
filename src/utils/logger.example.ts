// logger.example.ts - Example usage of the centralized logger
// This file demonstrates how to migrate from console.* to the logger utility

import { logger, isLogLevelEnabled, getCurrentLogLevel } from './logger';

// ==========================================
// Basic Usage Examples
// ==========================================

// ✅ BEFORE (raw console.log):
// if (__DEV__) {
//   console.log('User logged in', { userId, email });
// }

// ✅ AFTER (with logger):
logger.debug('User logged in', { userId, email });

// ✅ Error logging:
logger.error('Failed to fetch budget', err);

// ✅ Warning for potential issues:
logger.warn('Rate limit approaching', { remaining: 10 });

// ✅ Info for important events:
logger.info('Budget saved successfully', { budgetId, amount });

// ==========================================
// Conditional Expensive Operations
// ==========================================

// ✅ Before: Building expensive objects even when logs are disabled
// const debugInfo = buildExpensiveDebugObject(); // Always executed
// console.log('Debug info:', debugInfo);

// ✅ After: Only build when debug logging is enabled
if (isLogLevelEnabled('debug')) {
	const debugInfo = buildExpensiveDebugObject();
	logger.debug('Debug info:', debugInfo);
}

// ==========================================
// Structured Logging
// ==========================================

// ✅ Pass objects for better debugging
logger.info('Request completed', {
	url: '/api/budgets',
	method: 'GET',
	status: 200,
	duration: 123,
	userId: 'user-123', // Will be scrubbed by PII utilities
});

// ✅ Multiple arguments (will be formatted and scrubbed)
logger.debug(
	'Processing transaction',
	{ id: 'txn-123' },
	{ amount: 50.0 },
	{ category: 'food' }
);

// ==========================================
// Environment-Based Logging
// ==========================================

// The logger automatically respects EXPO_PUBLIC_LOG_LEVEL:
// - debug: Show all logs (default in dev)
// - info: Show info, warn, error (good for staging)
// - warn: Show only warn, error (default in production)
// - error: Show only errors
// - silent: Show nothing

// Check current level programmatically:
const currentLevel = getCurrentLogLevel();
logger.info('Current log level:', currentLevel);

// ==========================================
// Migration Tips
// ==========================================

// ❌ Don't do this anymore:
// console.log('Something happened');

// ✅ Use logger instead:
logger.debug('Something happened');

// ❌ Don't combine with __DEV__ checks manually:
// if (__DEV__) {
//   console.log('Debug info');
// }

// ✅ Let the logger handle it (automatically respects log level):
logger.debug('Debug info');

// ❌ Don't log sensitive data without scrubbing:
// logger.info('API key:', apiKey); // Will be scrubbed automatically!

// ✅ The logger automatically scrubs:
// - API keys, tokens, passwords (via scrubSecrets)
// - PII like emails, phones, credit cards (via piiScrubbing utility)

// Helper function for example
function buildExpensiveDebugObject() {
	// Simulating expensive operation
	return {
		timestamp: Date.now(),
		memory: (performance as any).memory?.usedJSHeapSize || 0,
		stack: new Error().stack,
	};
}
