# Firebase Crashlytics Implementation Guide

This guide covers the complete implementation of Firebase Crashlytics in your Expo development build.

## ✅ What's Already Done

Your project already has:

- ✅ Required packages installed (`@react-native-firebase/app`, `@react-native-firebase/crashlytics`, `expo-build-properties`)
- ✅ Firebase config files (`google-services.json`, `GoogleService-Info.plist`)
- ✅ Updated `app.config.ts` with Crashlytics plugin
- ✅ Enhanced crash reporting service with Crashlytics integration
- ✅ Test component for verifying functionality

## 🚀 Next Steps: Build and Test

### 1. Build Development Client

You need to build a development client (not Expo Go) to test Crashlytics:

```bash
# For iOS
eas build --profile development --platform ios

# For Android
eas build --profile development --platform android

# Or build both
eas build --profile development --platform all
```

### 2. Install Development Build

1. Download the built app from EAS
2. Install it on your device/simulator
3. **Important**: This is NOT Expo Go - it's a custom build with native modules

### 3. Test Crashlytics

1. Launch your development build
2. Navigate to the Crashlytics test component (you can add it to any screen)
3. Use the test buttons to verify functionality

## 🔧 Configuration Details

### app.config.ts Updates

Your config now includes:

```typescript
plugins: [
	// ... other plugins
	'@react-native-firebase/crashlytics',
	[
		'expo-build-properties',
		{
			ios: {
				deploymentTarget: '13.4',
				useFrameworks: 'static',
			},
			android: {
				minSdkVersion: 24,
				targetSdkVersion: 35,
				compileSdkVersion: 34,
			},
		},
	],
];
```

### Crashlytics Service Features

- **Development vs Production**: Automatically enables crash collection only in production builds
- **User Consent**: Respects user preferences for data collection
- **PII Scrubbing**: Protects sensitive information
- **Custom Attributes**: Set user context and app state
- **Non-fatal Errors**: Record errors without crashing the app

## 🧪 Testing Features

### Test Methods Available

```typescript
// Test basic functionality
crashReporting.testCrashlytics();

// Record non-fatal errors
crashReporting.captureError(new Error('Test error'), {
	screen: 'TestScreen',
	action: 'test_action',
});

// Set custom attributes
crashReporting.setContext('user_id', '12345');
crashReporting.setContext('app_state', 'active');

// Test user consent
crashReporting.setUserConsent(true);
```

### What to Expect

- **Development Builds**: Logs and non-fatal errors are recorded, but actual crashes are not
- **Production Builds**: Full crash reporting when user consents
- **Firebase Console**: Check for logs, errors, and crash reports

## 📱 Adding Test Component to Your App

You can add the `CrashlyticsTest` component to any screen for testing:

```typescript
import { CrashlyticsTest } from '../components/CrashlyticsTest';

// In your screen component
<CrashlyticsTest />;
```

## 🔍 Verifying in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (`brie-24`)
3. Navigate to Crashlytics
4. Look for:
   - Non-fatal errors
   - Custom logs
   - User attributes
   - Crash reports (in production builds)

## 🚨 Troubleshooting

### Common Issues

1. **"Module not found" errors**: Ensure you're using the development build, not Expo Go
2. **No data in Firebase**: Check that Crashlytics is enabled in Firebase Console
3. **Build failures**: Verify your `app.config.ts` syntax and plugin configuration

### Debug Steps

1. Check console logs for initialization messages
2. Verify Firebase config files are in the correct location
3. Ensure you're testing with a development build, not Expo Go
4. Check that Crashlytics is enabled in Firebase Console

## 📊 Production Deployment

When ready for production:

1. **Build production app**:

   ```bash
   eas build --profile production --platform all
   ```

2. **Verify Crashlytics settings** in Firebase Console
3. **Test with real crashes** (be careful!)
4. **Monitor crash reports** and user feedback

## 🔐 Security & Privacy

- **PII Protection**: Sensitive data is automatically scrubbed
- **User Consent**: Crash reporting respects user preferences
- **Development Safety**: Crash collection is disabled in development builds
- **Data Minimization**: Only necessary crash data is collected

## 📚 Additional Resources

- [Firebase Crashlytics Documentation](https://firebase.google.com/docs/crashlytics)
- [React Native Firebase Crashlytics](https://rnfirebase.io/crashlytics/usage)
- [Expo Build Properties](https://docs.expo.dev/versions/latest/sdk/build-properties/)

## 🎯 Next Steps

1. **Build your development client** using EAS
2. **Test the functionality** with the test component
3. **Verify data appears** in Firebase Console
4. **Deploy to production** when ready
5. **Monitor and analyze** crash reports

---

**Note**: Remember that Crashlytics requires a native build to function. Expo Go will not work for testing this functionality.
