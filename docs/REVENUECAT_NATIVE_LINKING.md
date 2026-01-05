# RevenueCat Native Module Linking

## Important: Rebuild Required

After installing `react-native-purchases` and `react-native-purchases-ui`, you **must rebuild** your native app. These packages require native code linking that cannot be done with Expo Go.

## Steps to Fix Linking Errors

If you see errors like:
- "The package 'react-native-purchases-ui' doesn't seem to be linked"
- "NativeEventEmitter requires a non-null argument"

Follow these steps:

### For iOS

1. Navigate to the iOS directory:
   ```bash
   cd ios
   ```

2. Install CocoaPods dependencies:
   ```bash
   pod install
   ```

3. Rebuild the app using Expo:
   ```bash
   cd ..
   npx expo run:ios
   ```

   Or build a development client:
   ```bash
   eas build --profile development --platform ios
   ```

### For Android

1. Rebuild the app:
   ```bash
   npx expo run:android
   ```

   Or build a development client:
   ```bash
   eas build --profile development --platform android
   ```

## Why This Is Necessary

React Native packages with native code (like RevenueCat) require:
1. Native iOS (Swift/Objective-C) code compilation
2. Native Android (Java/Kotlin) code compilation
3. Linking the native modules to the JavaScript bridge

This cannot be done with:
- Expo Go (pre-built client)
- Metro bundler hot reload
- JavaScript-only rebuilds

## Development Workflow

1. **Install packages**: `npm install react-native-purchases react-native-purchases-ui`
2. **Rebuild native app**: `npx expo run:ios` or `npx expo run:android`
3. **Test in development build**: Use the development client, not Expo Go

## Error Handling

The code includes graceful error handling:
- If RevenueCat isn't linked, you'll see helpful error messages
- The app won't crash, but subscription features won't work until rebuilt
- Check the console for specific error messages

## After Rebuild

Once rebuilt:
- RevenueCat SDK will initialize automatically
- Subscription features will work
- Paywall UI will be available
- Customer Center will function properly


