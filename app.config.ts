import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
	const profile = process.env.EAS_BUILD_PROFILE ?? ''; // e.g., "production" | "testflight" | "development"
	const isProduction =
		profile === 'production' || process.env.EXPO_PUBLIC_ENV === 'production';
	const isTestflight = profile === 'testflight';

	return {
		...config,
		name: 'Brie',
		slug: 'brie',
		version: '1.1.3',
		orientation: 'portrait',
		icon: './src/assets/icons/adaptive-icon.png',
		scheme: 'brie',
		userInterfaceStyle: 'automatic',
		newArchEnabled: true, // Enable New Architecture for all builds for better performance
		ios: {
			supportsTablet: true,
			bundleIdentifier: 'com.brie.mobile',
			// Let EAS handle buildNumber via autoIncrement in eas.json
			googleServicesFile:
				process.env.GOOGLE_SERVICES_PLIST || './GoogleService-Info.plist',
			icon: {
				light: './src/assets/icons/ios-light.png',
				dark: './src/assets/icons/ios-dark.png',
				tinted: './src/assets/icons/ios-tinted.png',
			},
			infoPlist: {
				ITSAppUsesNonExemptEncryption: false,
				NSAppTransportSecurity: {
					NSAllowsLocalNetworking: true,
					NSExceptionDomains: {
						'brie-staging-api.onrender.com': {
							NSExceptionAllowsInsecureHTTPLoads: false,
							NSExceptionMinimumTLSVersion: '1.2',
						},
						'api.brie.app': {
							NSExceptionAllowsInsecureHTTPLoads: false,
							NSExceptionMinimumTLSVersion: '1.2',
						},
					},
				},
				NSUserNotificationsUsageDescription:
					'This app uses notifications to keep you informed about your budget goals and financial insights.',
				NSLocationWhenInUseUsageDescription:
					'Location is used to provide location-based financial insights and merchant information.',
				// Only enable background modes in production builds
				...(profile === 'production' && {
					UIBackgroundModes: ['remote-notification'],
				}),
			},
		},
		updates: {
			enabled: !isTestflight, // Disable OTA for TestFlight to isolate potential runtime mismatch
			checkAutomatically: 'ON_ERROR_RECOVERY',
			url: 'https://u.expo.dev/86bf0001-bc3c-4327-85d5-9ceca2cd9150',
		},
		runtimeVersion: {
			policy: 'sdkVersion',
		},
		android: {
			package: 'com.brie.mobile',
			versionCode: 1,
			googleServicesFile:
				process.env.GOOGLE_SERVICES_JSON || './google-services.json',
			adaptiveIcon: {
				foregroundImage: './src/assets/icons/adaptive-icon.png',
				monochromeImage: './src/assets/icons/adaptive-icon.png',
				backgroundColor: '#ffffff',
			},
		},
		web: {
			bundler: 'metro',
			output: 'static',
		},
		plugins: [
			'expo-router',
			[
				'expo-build-properties',
				{
					ios: {
						useFrameworks: 'static',
					},
					android: {
						compileSdkVersion: 34,
						targetSdkVersion: 34,
						buildToolsVersion: '34.0.0',
					},
				},
			],
			'@sentry/react-native/expo',
			'@react-native-firebase/app',
			'@react-native-firebase/auth',
			'@react-native-firebase/crashlytics',
			'@react-native-google-signin/google-signin',
			[
				'expo-notifications',
				{
					// Only enable background notifications in production
					enableBackgroundRemoteNotifications: isProduction,
				},
			],
			[
				'expo-splash-screen',
				{
					image: './src/assets/icons/splash-icon-dark.png',
					resizeMode: 'contain',
					imageWidth: 200,
					backgroundColor: '#ffffff',
					dark: {
						image: './src/assets/icons/splash-icon-light.png',
						resizeMode: 'contain',
						imageWidth: 200,
						backgroundColor: '#000000',
					},
				},
			],
		],
		experiments: {
			typedRoutes: true,
		},
		assetBundlePatterns: ['./src/assets/**/*', './assets/**/*'],
		extra: {
			eas: {
				projectId: '86bf0001-bc3c-4327-85d5-9ceca2cd9150',
			},
		},
		owner: 'xamata',
	};
};
