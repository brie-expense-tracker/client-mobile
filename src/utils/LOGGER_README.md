# Centralized Logging System

This directory contains a centralized logging utility that provides structured, level-based logging with automatic PII scrubbing.

## Features

- ✅ **Log Levels**: `debug`, `info`, `warn`, `error`, `silent`
- ✅ **Environment-aware**: Automatically defaults to `debug` in dev, `warn` in production
- ✅ **PII Scrubbing**: Automatically scrubs sensitive data (API keys, tokens, emails, etc.)
- ✅ **Zero overhead in production**: No-ops when log level is disabled
- ✅ **Babel stripping**: Raw `console.*` calls are removed in production builds
- ✅ **Lazy logging**: Avoid expensive computations when logs are disabled
- ✅ **Namespaced loggers**: Clean, grep-friendly logs with automatic prefixes
- ✅ **Sentry breadcrumbs**: Automatically routes info/warn/error to Sentry in production
- ✅ **OTA control**: Remote debugging via `EXPO_PUBLIC_FORCE_DEBUG` flag
- ✅ **ESLint enforcement**: CI blocks new raw `console.*` calls

## Quick Start

```typescript
import { logger } from '@/utils/logger';
import { createLogger } from '@/utils/sublogger';

// Basic logging
logger.debug('User action', { userId, action: 'login' });
logger.info('Budget saved', { budgetId, amount: 100 });
logger.warn('Rate limit approaching', { remaining: 10 });
logger.error('API request failed', error);

// Lazy logging (avoids expensive computation when disabled)
logger.debugLazy(() => ['Expensive debug data', computeExpensiveDebugInfo()]);

// Namespaced logging (cleaner, grep-friendly)
const apiLog = createLogger('API');
apiLog.info('Request started', { url, method });
// Logs: "[API] Request started { url, method }"

// Pre-built namespaced loggers
import { networkLog, authLog, budgetLog } from '@/utils/sublogger';
networkLog.info('Connection established');
budgetLog.warn('Budget exceeded');
```

## Environment Configuration

### Log Levels

Control log verbosity via `EXPO_PUBLIC_LOG_LEVEL`:

```bash
# Development (default: debug)
EXPO_PUBLIC_LOG_LEVEL=debug

# Staging (default: info)
EXPO_PUBLIC_LOG_LEVEL=info

# Production (default: warn)
EXPO_PUBLIC_LOG_LEVEL=warn

# Silent (no logs)
EXPO_PUBLIC_LOG_LEVEL=silent
```

### OTA Remote Debugging

Enable verbose logging in production builds without a new binary:

```bash
# Temporarily enable debug logging in production
EXPO_PUBLIC_FORCE_DEBUG=1
```

This is useful for:

- Remote debugging production issues
- Investigating TestFlight builds
- Temporary verbose logging for specific investigations

**⚠️ Warning**: Only use this for debugging. Remove the flag after investigation.

## Migration Guide

### Before (Raw Console)

```typescript
if (__DEV__) {
	console.log('User logged in', { userId });
}
console.error('Failed to fetch', err);
```

### After (Centralized Logger)

```typescript
import { logger } from '@/utils/logger';

logger.debug('User logged in', { userId });
logger.error('Failed to fetch', err);
```

## What Gets Scrubbed

The logger automatically scrubs:

- API keys, tokens, passwords, secrets
- Email addresses
- Phone numbers
- Credit card numbers
- SSNs
- Bank account numbers
- Amounts and dates (via PII patterns)

## Production Behavior

1. **Babel Plugin**: Raw `console.log/debug/info` calls are stripped in production builds (keeps `console.error` and `console.warn`)
2. **Logger Levels**: Logger respects `EXPO_PUBLIC_LOG_LEVEL` - defaults to `warn` in production
3. **No-ops**: When log level is disabled, logger methods become no-ops (zero overhead)

## Best Practices

1. **Use appropriate log levels**:

   - `debug`: Detailed diagnostic info (dev only)
   - `info`: Important events (staging/prod)
   - `warn`: Potential issues that don't break functionality
   - `error`: Actual errors that need attention

2. **Pass objects for structured logging**:

   ```typescript
   // ✅ Good
   logger.info('Request completed', { url, method, status, duration });

   // ❌ Avoid
   logger.info(`Request to ${url} completed with status ${status}`);
   ```

3. **Guard expensive operations**:

   ```typescript
   // ✅ Only compute when debug logging is enabled
   if (isLogLevelEnabled('debug')) {
   	const debugData = expensiveComputation();
   	logger.debug('Debug info:', debugData);
   }
   ```

4. **Use logger instead of raw console**:

   ```typescript
   // ❌ Don't do this
   console.log('Something happened');

   // ✅ Do this
   logger.debug('Something happened');
   ```

## Integration with Error Tracking

### Automatic Sentry Breadcrumbs

The logger automatically sends `info`, `warn`, and `error` logs to Sentry breadcrumbs in production. This provides context when crashes occur without the overhead of verbose debug logs.

```typescript
// Automatically added to Sentry breadcrumbs in production
logger.info('User navigated to Budget screen');
logger.warn('API rate limit approaching', { remaining: 10 });
logger.error('Request failed', error);
```

### Manual Error Capture

For critical errors, also explicitly capture exceptions:

```typescript
import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react-native';

try {
	// Your code
} catch (error) {
	logger.error('Operation failed', error);
	Sentry.captureException(error); // Explicit exception capture
}
```

**Note**: Debug logs are NOT sent to Sentry to avoid noise. Only `info`, `warn`, and `error` are captured.

## Files

- `logger.ts` - Main logger utility with levels, scrubbing, and Sentry integration
- `sublogger.ts` - Namespaced logger factory for clean, scoped logging
- `logger.example.ts` - Comprehensive usage examples
- `__tests__/logger.test.ts` - Unit tests for scrubbing and level checks
- `LOGGER_README.md` - This file

## PR Checklist

When submitting PRs, ensure:

- [ ] No new raw `console.*` calls (use `logger` instead)
- [ ] Logs are namespaced and structured
- [ ] No secrets/PII in logs (automatic scrubbing handles common cases)
- [ ] Lazy logging used for expensive operations
- [ ] Appropriate log levels chosen (`debug` vs `info` vs `warn` vs `error`)
- [ ] Temporary hot-path logs marked with `PERF-LOG:` comment
