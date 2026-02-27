# client-mobile/src cleanup status

After removing legacy from the tree, this is the state of `src/` and what can be removed.

## Fix applied

- **budgetContext** was importing `../services/utility/cacheInvalidationUtils`, which was removed with legacy. A minimal no-op `cacheInvalidationUtils.ts` was added under `src/services/utility/` so the app builds.

## Used by the app (keep)

| Area | Files | Used by |
|------|--------|--------|
| **context** | AuthContext, OnboardingContext, profileContext, notificationContext, transactionContext, localTransactionContext, stubProviders, ThemeContext, SubscriptionContext | _layout, screens |
| **context** | budgetContext, goalContext, billContext | stubProviders (types + stub values) |
| **config** | environment, features, api, appConfig, env | _layout, screens, apiService, appConfig |
| **services** | core (apiService, requestManager, httpClient, apiErrors, apiTypes, userService, onboardingService), feature (featureFlags, crashReporting, notificationService, billService), notifications, notificationMapping, security/cacheMigration, subscriptions (revenueCatService), errorService, index barrel | contexts, app, ErrorBoundary |
| **services/utility** | cacheInvalidationUtils (minimal no-op) | budgetContext |
| **hooks** | useAppInit, useDevModeEasterEgg, useMigrateLocalTransactions | _layout |
| **components** | LocalMigrationRunner, ErrorBoundary, BottomSheet | _layout, dashboard, transaction, settings |
| **storage** | localModeStorage, localTransactionStorage, migrateLocalTransactions | _layout, login, migration |
| **utils** | sublogger, safeStorage, accessibility, connectivity, logger | app, contexts, services |
| **ui** | theme, primitives | screens |
| **lib** | eventBus | profileContext |
| **polyfills** | polyfills.ts | index.ts |

## Unused (safe to remove)

These are not imported anywhere in `app/` or by the kept `src/` modules:

| File(s) | Notes |
|---------|--------|
| **src/context/filterContext.tsx** | Never imported |
| **src/services/insights/insightsContextService.ts** | Never imported |
| **src/networking/streamingApi.ts** | Never imported |
| **src/networking/endpoints.ts** | Never imported |
| **src/constants/uiConstants.ts** | Never imported |
| **src/types/assistant.ts** | Never imported |
| **src/utils/debounce.ts** | Never imported |
| **src/utils/piiScrubbing.ts** | Never imported |
| **src/utils/registerForPushNotificationsAsync.ts** | Never imported (notificationContext may use expo-notifications directly) |
| **src/components/DateField.tsx** | Never imported |
| **src/services/core/requestQueueManager.ts** | Never imported (apiService uses requestManager, not this) |
| **src/lib/firebaseClient.ts** | Never imported |
| **src/config/telemetry.ts** | Never imported (appConfig has telemetry config; this module is separate) |
| **src/config/googleSignIn.ts** | Never imported |

## Optional / check before removing

- **config/index.ts** – Only re-exports `api`. If nothing uses `from '../config'` or `from '@/config'`, you could simplify to not re-export or remove the barrel.
- **SubscriptionContext** and **revenueCatService** – Used by _layout. If you don’t need paywall/subscriptions in MVP, you could remove SubscriptionProvider and the subscriptions service and stub the context.

## Summary

- **Fix:** `src/services/utility/cacheInvalidationUtils.ts` added (minimal no-op) so budgetContext works.
- **Safe to delete:** filterContext, services/insights, networking/, constants/, types/assistant.ts, utils (debounce, piiScrubbing, registerForPushNotificationsAsync), DateField, requestQueueManager, lib/firebaseClient, config/telemetry, config/googleSignIn.
