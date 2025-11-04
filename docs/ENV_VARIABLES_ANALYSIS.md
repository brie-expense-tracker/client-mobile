# Environment Variables Analysis

## Required Variables (for local development)

These variables MUST be set for the app to run locally:

1. **`EXPO_PUBLIC_API_URL`** (Required)

   - Used in: `src/config/env.ts`
   - Default: `https://brie-staging-api.onrender.com`
   - Status: ✅ Already in `eas.json` for builds

2. **`EXPO_PUBLIC_ENV`** (Required)
   - Used in: `src/config/env.ts` (throws error if missing)
   - Valid values: `testflight` or `production`
   - For local dev, you can use: `dev`, `development`, `staging`, `preview`, or `testflight`
   - Status: ✅ Already in `eas.json` for builds

## Optional but Commonly Used Variables

3. **`EXPO_PUBLIC_AI_INSIGHTS`** (Optional)

   - Used in: `src/config/env.ts`, `src/config/features.ts`
   - Values: `'0'` or `'1'`
   - Default: `'0'`
   - Status: ✅ Already in `eas.json` for builds

4. **`EXPO_PUBLIC_AI_INSIGHTS_PREVIEW`** (Optional)

   - Used in: `src/config/features.ts`
   - Values: `'0'` or `'1'`
   - Default: `'0'`
   - Status: ✅ Already in `eas.json` for builds

5. **`EXPO_PUBLIC_CRASH_CONSENT`** (Optional)

   - Used in: `src/config/env.ts`, `src/hooks/useAppInit.ts`
   - Values: `'true'` or `'false'`
   - Status: ✅ Already in `eas.json` for testflight/production builds

6. **`EXPO_PUBLIC_SENTRY_DSN`** (Optional)

   - Used in: `src/config/env.ts`
   - Only needed if you want Sentry crash reporting in local dev
   - Status: ✅ Already in `eas.json` for testflight/production builds

7. **`EXPO_PUBLIC_SENTRY_ENVIRONMENT`** (Optional)
   - Used in: `src/config/env.ts`
   - Status: ✅ Already in `eas.json` for testflight/production builds

## Build-Time Only Variables (NOT needed in .env)

These are only used during build process and are already in `eas.json`:

- **`SENTRY_ALLOW_FAILURE`** - Build-time only, not needed in .env
- **`SENTRY_ORG`** - Build-time only, not needed in .env

## Optional Feature Flags & Development Variables

8. **`EXPO_PUBLIC_NEW_BUDGETS_V2`** (Optional)

   - Used in: `src/config/features.ts`
   - Values: `'0'` or `'1'`
   - Default: `'0'` (disabled)

9. **`EXPO_PUBLIC_GOALS_TIMELINE`** (Optional)

   - Used in: `src/config/features.ts`
   - Values: `'0'` or `'1'`
   - Default: `'0'` (disabled)

10. **`EXPO_PUBLIC_DEV_MODE`** (Optional)

    - Used in: `src/config/environment.ts`
    - Values: `'true'` or `'false'`
    - Default: `false`

11. **`EXPO_PUBLIC_FORCE_DEBUG`** (Optional)

    - Used in: `src/utils/logger.ts`
    - Values: `'1'` or `'0'`
    - Default: disabled

12. **`EXPO_PUBLIC_LOG_LEVEL`** (Optional)

    - Used in: `src/utils/logger.ts`
    - Values: `'debug'`, `'info'`, `'warn'`, `'error'`, `'silent'`
    - Default: based on environment

13. **`EXPO_PUBLIC_API_BASE_PATH`** (Optional)

    - Used in: `src/config/environment.ts`
    - Default: `'/api'`

14. **`EXPO_PUBLIC_API_TIMEOUT_MS`** (Optional)
    - Used in: `src/config/environment.ts`
    - Default: `12000`

## Firebase & Other Optional Variables

15. **`FIREBASE_REMOTE_CONFIG_MINIMUM_FETCH_INTERVAL`** (Optional)

    - Used in: `src/config/telemetry.ts`
    - Default: `3600`

16. **`FIREBASE_REMOTE_CONFIG_FETCH_TIMEOUT`** (Optional)

    - Used in: `src/config/telemetry.ts`
    - Default: `10000`

17. **`FEATURE_FLAGS_ENABLED`** (Optional)

    - Used in: `src/config/telemetry.ts`
    - Default: `'true'` (enabled)

18. **`SHADOW_AB_TESTING_ENABLED`** (Optional)
    - Used in: `src/config/telemetry.ts`
    - Default: `'true'` (enabled)

## Summary

### For Local Development (.env file):

**Minimum required:**

```env
EXPO_PUBLIC_API_URL=https://brie-staging-api.onrender.com
EXPO_PUBLIC_ENV=dev
```

**Commonly useful for local dev:**

```env
EXPO_PUBLIC_API_URL=https://brie-staging-api.onrender.com
EXPO_PUBLIC_ENV=dev
EXPO_PUBLIC_AI_INSIGHTS=1
EXPO_PUBLIC_AI_INSIGHTS_PREVIEW=0
```

**You can safely remove from .env:**

- `SENTRY_ALLOW_FAILURE` (build-time only, already in eas.json)
- `SENTRY_ORG` (build-time only, already in eas.json)
- Any other variables that match what's in `eas.json` if you're only doing EAS builds

### For EAS Builds:

All necessary variables are already configured in `eas.json`, so you don't need them in `.env` for builds.
