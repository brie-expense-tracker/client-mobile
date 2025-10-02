import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
	const isProduction =
		process.env.EXPO_PUBLIC_ENV === 'prod' ||
		process.env.NODE_ENV === 'production';

	return {
		...config,
		name: 'Brie - AI Financial Assistant',
		slug: 'clientMobile',
		version: '1.0.0',
		orientation: 'portrait',
		icon: './src/assets/icons/adaptive-icon.png',
		scheme: 'brie',
		userInterfaceStyle: 'automatic',
		newArchEnabled: true,
		ios: {
			supportsTablet: true,
			bundleIdentifier: 'com.brie.mobile',
			buildNumber: '1',
			googleServicesFile:
				process.env.GOOGLE_SERVICE_INFO_PLIST || './GoogleService-Info.plist',
			icon: {
				light: './src/assets/icons/ios-light.png',
				dark: './src/assets/icons/ios-dark.png',
				tinted: './src/assets/icons/ios-tinted.png',
			},
			infoPlist: {
				ITSAppUsesNonExemptEncryption: false,
				NSAppTransportSecurity: {
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
				// Only enable background modes in production
				...(isProduction && { UIBackgroundModes: ['remote-notification'] }),
			},
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
						deploymentTarget: '15.1',
					},
					android: {
						compileSdkVersion: 34,
						targetSdkVersion: 35,
						minSdkVersion: 24,
						buildToolsVersion: '34.0.0',
					},
				},
			],
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
		assetBundlePatterns: ['./src/assets/**/*'],
		extra: {
			eas: {
				projectId: '5c37bf2f-48a8-4081-bddb-eb7ed5783845',
			},
		},
		owner: 'xamata',
	};
};
