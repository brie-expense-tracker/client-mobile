# Development Onboarding Access

This document explains how to access onboarding screens during development, even after onboarding has been completed.

## Overview

The app includes a development mode that allows you to access onboarding screens for testing purposes, even when the user has already completed onboarding.

## How to Enable

### 1. Enable Development Mode

In `client-mobile/app/_layout.tsx`, set the `DEV_MODE` constant to `true`:

```typescript
// Development mode toggle - set to true to allow onboarding access after completion
const DEV_MODE = true; // Enable dev mode for testing onboarding
```

### 2. Visual Indicators

When development mode is enabled, you'll see:

- A green "DEV MODE" indicator in the top-right corner of the screen
- A green settings button in the dashboard header (only visible in development builds)

## How to Access Onboarding

### Method 1: Dashboard Button (Recommended)

1. Navigate to the dashboard
2. Look for the green settings icon in the top-right corner of the header
3. Tap it to navigate to the onboarding flow

### Method 2: Direct Navigation

You can also navigate directly to onboarding screens:

- `/(onboarding)/profileSetup` - Profile setup screen
- `/(onboarding)/notificationSetup` - Notification setup screen

## How It Works

The development mode modifies the navigation logic in `_layout.tsx` for both demo mode and normal mode:

**Demo Mode:**

```typescript
if (DEMO_MODE) {
	// In dev mode, allow access to onboarding even in demo mode
	if (DEV_MODE && segments[0] === '(onboarding)') {
		// Allow staying on onboarding screens in dev mode
		return;
	}
	// ... rest of demo mode logic
}
```

**Normal Mode:**

```typescript
// In dev mode, allow access to onboarding even if completed
if (DEV_MODE && inOnboardingGroup) {
	// Allow staying on onboarding screens in dev mode
	return;
}

// And prevents automatic redirects away from onboarding in dev mode
} else if (
	hasSeenOnboarding &&
	!inTabsGroup &&
	!inStackGroup &&
	!inOnboardingGroup &&
	!DEV_MODE // Don't redirect away from onboarding in dev mode
) {
	router.replace('/(tabs)/dashboard');
}
```

This bypasses the normal onboarding completion check and allows you to stay on onboarding screens even when `hasSeenOnboarding` is `true`, regardless of whether you're in demo mode or normal mode.

## Important Notes

1. **Development Only**: The dashboard button only appears in development builds (`__DEV__` is true)
2. **Server State**: This doesn't reset the server-side onboarding version - it only affects client-side navigation
3. **Testing**: Use this for testing onboarding flows, UI changes, and user experience improvements
4. **Production**: Remember to set `DEV_MODE = false` before production builds

## Disabling

To disable development mode:

1. Set `DEV_MODE = false` in `_layout.tsx`
2. The green indicators will disappear
3. Normal onboarding navigation logic will be restored

## Troubleshooting

If you can't access onboarding screens:

1. Ensure `DEV_MODE = true` in `_layout.tsx`
2. Check that you're in a development build (`__DEV__` should be true)
3. Try navigating directly to `/(onboarding)/profileSetup`
4. Restart the app if needed
