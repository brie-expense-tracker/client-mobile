# Logger Migration Guide

## Quick Migration Checklist

- [x] ✅ Core logger implemented (`logger.ts`)
- [x] ✅ Namespaced loggers available (`sublogger.ts`)
- [x] ✅ ESLint rule enforces no raw `console.*`
- [x] ✅ Babel strips `console.*` in production
- [x] ✅ Sentry breadcrumbs integrated
- [ ] 🔄 Migrate existing `console.*` calls (incremental)

## Migration Strategy

### Phase 1: High-Impact Files (Recommended)

Start with files that log frequently or handle sensitive data:

1. **API Services** (`src/services/core/`)
   - `apiService.ts`, `requestManager.ts`, `httpClient.ts`
2. **Auth & Security** (`src/context/AuthContext.tsx`, `src/services/authService.ts`)

   - Contains sensitive authentication flows

3. **Budget/Transaction Context** (`src/context/budgetContext.tsx`, `src/context/transactionContext.tsx`)

   - Critical business logic paths

4. **Error Handling** (`src/services/errorService.ts`)
   - Centralized error reporting

### Phase 2: Remaining Files (Gradual)

Migrate remaining files as you touch them during feature work.

## Migration Patterns

### Pattern 1: Simple console.log → logger.debug

```typescript
// ❌ Before
console.log('User action', { userId });

// ✅ After
import { logger } from '@/utils/logger';
logger.debug('User action', { userId });
```

### Pattern 2: Dev-only logs → logger.debug

```typescript
// ❌ Before
if (__DEV__) {
	console.log('Debug info', data);
}

// ✅ After
import { logger } from '@/utils/logger';
logger.debug('Debug info', data);
// Logger automatically respects log level and __DEV__
```

### Pattern 3: console.error → logger.error

```typescript
// ❌ Before
console.error('API request failed', error);

// ✅ After
import { logger } from '@/utils/logger';
logger.error('API request failed', error);
// Automatically scrubs PII and sends to Sentry in production
```

### Pattern 4: Create namespaced logger for modules

```typescript
// ❌ Before (scattered throughout file)
console.log('[API] Request started', { url });
console.error('[API] Request failed', error);

// ✅ After (at top of file)
import { createLogger } from '@/utils/sublogger';
const apiLog = createLogger('API');

// Use throughout file
apiLog.info('Request started', { url });
apiLog.error('Request failed', error);
```

### Pattern 5: Expensive debug operations → lazy logging

```typescript
// ❌ Before
if (__DEV__) {
	const expensiveData = computeExpensiveDebugInfo();
	console.log('Debug data:', expensiveData);
}

// ✅ After Option 1: Lazy logging
import { logger } from '@/utils/logger';
logger.debugLazy(() => ['Debug data', computeExpensiveDebugInfo()]);

// ✅ After Option 2: Manual guard
import { logger, isLogLevelEnabled } from '@/utils/logger';
if (isLogLevelEnabled('debug')) {
	logger.debug('Debug data:', computeExpensiveDebugInfo());
}
```

### Pattern 6: Hot path logging (temporary)

```typescript
// ❌ Before (always executes)
console.log('Render cycle', { screen, duration });

// ✅ After (with cleanup marker)
// PERF-LOG: remove after issue #1234
import { logger, isLogLevelEnabled } from '@/utils/logger';
if (isLogLevelEnabled('debug')) {
	logger.debug('Render cycle', { screen, duration });
}
```

## Automated Migration (Optional)

For bulk migration, consider a codemod:

### Using jscodeshift

```bash
# Install jscodeshift
npm install -g jscodeshift

# Create codemod script (example)
# transform-logger.js
```

**Note**: Manual review recommended after automated migration to:

- Choose appropriate log levels (`debug` vs `info` vs `warn`)
- Add namespaces where helpful
- Apply lazy logging for expensive operations
- Add namespaced loggers where appropriate

## Example: Full File Migration

### Before

```typescript
// src/services/api.ts
export class ApiService {
	async fetch(url: string) {
		if (__DEV__) {
			console.log('Fetching:', url);
		}

		try {
			const response = await fetch(url);
			console.log('Response:', response.status);
			return response;
		} catch (error) {
			console.error('Fetch failed:', error);
			throw error;
		}
	}
}
```

### After

```typescript
// src/services/api.ts
import { createLogger } from '@/utils/sublogger';
const apiLog = createLogger('API');

export class ApiService {
	async fetch(url: string) {
		apiLog.debug('Fetching:', url);

		try {
			const response = await fetch(url);
			apiLog.info('Response received', { url, status: response.status });
			return response;
		} catch (error) {
			apiLog.error('Fetch failed', error, { url });
			throw error;
		}
	}
}
```

## Common Issues

### Issue: "Cannot find name 'console'"

**Solution**: ESLint is catching raw console usage. Use `logger` instead.

### Issue: Logs not appearing in production

**Solution**: Check `EXPO_PUBLIC_LOG_LEVEL`. Default is `warn` in production, so `debug` and `info` won't show. Use `warn` or `error` for important production logs.

### Issue: Too much noise from Sentry breadcrumbs

**Solution**: Debug logs don't go to Sentry. Use `logger.debug()` instead of `logger.info()` for verbose diagnostic logs.

## Validation

After migration, verify:

1. ✅ No ESLint errors about `no-console`
2. ✅ Logs appear correctly in dev/staging
3. ✅ Logs are appropriately filtered in production
4. ✅ PII is scrubbed (check log output)
5. ✅ Namespaced logs are grep-friendly (e.g., `grep "[API]" logs`)

## Need Help?

See `logger.example.ts` for comprehensive usage examples.
