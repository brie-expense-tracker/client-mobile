# Navigation Flow Documentation

## Overview

This document explains how the app navigates users based on their authentication state and onboarding status.

## User States

### 1. Unauthenticated User

- **Condition**: `user === null`
- **Navigation**: Redirected to `/(auth)/signup-test`
- **Access**: Can only access auth screens

### 2. Authenticated User - First Time

- **Condition**: `user !== null && hasSeenOnboarding === false`
- **Navigation**: Redirected to `/(onboarding)/onboardingOne`
- **Flow**: onboardingOne → onboardingTwo → onboardingThree → main app

### 3. Authenticated User - Returning

- **Condition**: `user !== null && hasSeenOnboarding === true`
- **Navigation**: Redirected to `/(tabs)/dashboard`
- **Access**: Full app access

## Navigation Logic

### Root Layout (`app/_layout.tsx`)

The main navigation logic is handled in the root layout:

```typescript
useEffect(() => {
	if (initializing || hasSeenOnboarding === null) return;

	const inAuthGroup = segments[0] === '(auth)';
	const inOnboardingGroup = segments[0] === '(onboarding)';
	const inTabsGroup = segments[0] === '(tabs)';

	if (user) {
		// User is authenticated
		if (!hasSeenOnboarding) {
			// First time user - show onboarding
			if (!inOnboardingGroup) {
				router.replace('/(onboarding)/onboardingOne');
			}
		} else {
			// Returning user - show main app
			if (!inTabsGroup) {
				router.replace('/(tabs)/dashboard');
			}
		}
	} else {
		// User is not authenticated
		if (!inAuthGroup) {
			router.replace('/(auth)/signup-test');
		}
	}
}, [user, initializing, hasSeenOnboarding, segments]);
```

## Onboarding Flow

### Onboarding Screens

1. **onboardingOne**: Welcome screen with "Get Started" button
2. **onboardingTwo**: Account creation introduction
3. **onboardingThree**: Profile setup with form data collection

### Onboarding Completion

Onboarding is marked as complete when:

- User completes the profile form in onboardingThree
- User skips the onboarding process
- User navigates away from onboarding

**Important**: Onboarding completion is persistent and does not reset on sign out. Once a user completes onboarding, they will not see it again unless manually reset.

### Onboarding Service

The `OnboardingService` provides methods to manage onboarding state:

```typescript
// Mark onboarding as complete
await OnboardingService.markOnboardingComplete();

// Check if user has seen onboarding
const hasSeen = await OnboardingService.hasSeenOnboarding();

// Reset onboarding status (manual operation only)
await OnboardingService.resetOnboardingStatus();
```

## Authentication Flow

### Sign Up

1. User starts at `/(auth)/signup-test`
2. After successful signup, user is authenticated
3. If first time user → onboarding flow
4. If returning user → main app

### Sign In

1. User starts at `/(auth)/login-test`
2. After successful login, user is authenticated
3. If first time user → onboarding flow
4. If returning user → main app

### Sign Out

1. User clicks sign out in settings
2. Firebase auth sign out
3. **Onboarding status is preserved** (not reset)
4. User redirected to auth screens

## Screen Groups

### Auth Group `(auth)`

- `login-test.tsx`
- `signup-test.tsx`
- `forgotPassword.tsx`

### Onboarding Group `(onboarding)`

- `onboardingOne.tsx`
- `onboardingTwo.tsx`
- `onboardingThree.tsx`

### Tabs Group `(tabs)`

- `dashboard/index.tsx`
- `transactions/index.tsx`
- `trackerScreen.tsx`
- `budgets/index.tsx`
- `settings/index.tsx`

## State Management

### AsyncStorage Keys

- `hasSeenOnboarding`: Boolean string indicating if user completed onboarding
- Firebase Auth handles user authentication state

### Loading States

- `initializing`: Firebase Auth initialization
- `hasSeenOnboarding`: Onboarding status check
- Both must be resolved before navigation decisions

## Error Handling

### Network Errors

- Profile submission failures don't prevent onboarding completion
- Onboarding is marked complete even if profile data fails to save

### Storage Errors

- AsyncStorage errors are logged but don't crash the app
- Default to showing onboarding for new users

## Testing

### Reset Onboarding (Manual Only)

To test the onboarding flow again, you must manually reset the onboarding status:

```typescript
await OnboardingService.resetOnboardingStatus();
```

**Note**: This is not done automatically on sign out. Onboarding completion is persistent per user.

### Development Testing

For development purposes, you can add a temporary button to reset onboarding:

```typescript
<TouchableOpacity onPress={() => OnboardingService.resetOnboardingStatus()}>
	<Text>Reset Onboarding (Dev Only)</Text>
</TouchableOpacity>
```

## Future Enhancements

### Potential Improvements

1. Add onboarding progress tracking
2. Allow users to skip specific onboarding steps
3. Add onboarding completion analytics
4. Support for different onboarding flows based on user type
5. Add onboarding tutorial for returning users
6. Add option in settings to re-watch onboarding tutorial

### Considerations

- Onboarding data should be synced with user profile
- Consider adding onboarding completion timestamp
- May want to track onboarding abandonment rates
- Consider adding a "Help" or "Tutorial" section for returning users
