# Google Sign-In Implementation Guide

This document outlines the implementation of Google Sign-In authentication in the Brie mobile app using `@react-native-google-signin/google-signin` library.

## Overview

Google Sign-In has been integrated into both the login and signup screens, allowing users to authenticate using their Google accounts. The implementation follows Firebase Auth integration patterns and maintains consistency with the existing authentication flow.

## Implementation Details

### 1. Configuration

**File: `src/config/googleSignIn.ts`**

- Contains Google Sign-In configuration with OAuth client IDs
- Configured for both Android and iOS platforms
- Uses client IDs from `google-services.json` and `GoogleService-Info.plist`

### 2. AuthContext Integration

**File: `src/context/AuthContext.tsx`**

- Added `signInWithGoogle()` and `signUpWithGoogle()` methods
- Both methods use the same underlying logic since Google Sign-In handles both login and signup
- Integrated with existing Firebase Auth and MongoDB user creation flow
- Proper error handling and loading states

### 3. UI Implementation

**Login Screen (`app/(auth)/login.tsx`)**

- Updated Google Sign-In button to use actual functionality
- Added loading states and error handling
- Maintains consistent UI design with existing buttons

**Signup Screen (`app/(auth)/signup.tsx`)**

- Updated Google Sign-Up button to use actual functionality
- Added loading states and error handling
- Maintains consistent UI design with existing buttons

### 4. App Configuration

**File: `app.config.ts`**

- Added `@react-native-google-signin/google-signin` plugin
- Ensures proper native module linking

## Key Features

### Error Handling

- Comprehensive error handling for various Google Sign-In scenarios
- User-friendly error messages for common issues
- Proper fallback behavior

### Loading States

- Visual feedback during authentication process
- Disabled buttons during loading to prevent multiple requests
- Consistent loading indicators across both screens

### Integration with Existing Auth Flow

- Seamless integration with Firebase Auth
- Automatic MongoDB user creation/retrieval
- Consistent with existing authentication patterns

## OAuth Configuration

### Android

- Client ID: `807336746313-kd44ucrcq96j08sm9l5ihei70mtqrjp2.apps.googleusercontent.com`
- Package name: `com.brie.mobile`
- SHA-1 fingerprint configured in Google Console

### iOS

- Client ID: `807336746313-khft9ts8r9li4cvme5bpjnhr1tdou3je.apps.googleusercontent.com`
- Bundle ID: `com.brie.mobile`

## Usage

### For Login

```typescript
const { signInWithGoogle } = useAuth();

const handleGoogleSignIn = async () => {
	try {
		await signInWithGoogle();
	} catch (error) {
		// Handle error
	}
};
```

### For Signup

```typescript
const { signUpWithGoogle } = useAuth();

const handleGoogleSignUp = async () => {
	try {
		await signUpWithGoogle();
	} catch (error) {
		// Handle error
	}
};
```

## Testing

### Prerequisites

1. Ensure Google Play Services is available on Android device
2. Verify OAuth configuration in Google Console
3. Test on both development and production builds

### Test Scenarios

1. **Successful Sign-In**: User successfully authenticates with Google
2. **Account Already Exists**: User tries to sign in with Google but account exists with different provider
3. **Network Errors**: Test behavior when network is unavailable
4. **Cancellation**: User cancels Google Sign-In flow
5. **Invalid Credentials**: Test with invalid or expired credentials

## Troubleshooting

### Common Issues

1. **"Google Play Services not available"**

   - Ensure Google Play Services is installed and updated
   - Check device compatibility

2. **"Invalid client ID"**

   - Verify OAuth client IDs in configuration
   - Check package name/bundle ID matches Google Console

3. **"Sign-in failed"**
   - Check network connectivity
   - Verify Firebase configuration
   - Check Google Console project settings

### Debug Steps

1. Check console logs for detailed error messages
2. Verify Google Sign-In configuration
3. Test with different Google accounts
4. Check Firebase Auth logs
5. Verify OAuth consent screen configuration

## Security Considerations

- OAuth client IDs are properly configured for each platform
- No sensitive credentials are exposed in client code
- Proper error handling prevents information leakage
- Integration with Firebase Auth ensures secure token management

## Future Enhancements

- Add Apple Sign-In for iOS users
- Implement social login analytics
- Add support for additional OAuth providers
- Enhanced error recovery mechanisms

## Dependencies

- `@react-native-google-signin/google-signin`: ^14.0.2
- `@react-native-firebase/auth`: ^22.2.1
- `@react-native-firebase/app`: ^22.4.0

## Related Files

- `src/config/googleSignIn.ts` - Configuration
- `src/context/AuthContext.tsx` - Auth context with Google methods
- `app/(auth)/login.tsx` - Login screen implementation
- `app/(auth)/signup.tsx` - Signup screen implementation
- `app.config.ts` - App configuration with Google Sign-In plugin
- `google-services.json` - Android OAuth configuration
- `GoogleService-Info.plist` - iOS OAuth configuration
