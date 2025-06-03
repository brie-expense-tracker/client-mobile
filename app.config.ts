// app.config.ts
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
	...config,
	name: 'brie',
	slug: 'clientMobile',
	version: '1.0.0',
	orientation: 'portrait',
	icon: './assets/images/brie-logo.png',
	userInterfaceStyle: 'light',
	splash: {
		image: './assets/images/brie-logo.png', // make sure this is PNG, not SVG
		resizeMode: 'contain',
		backgroundColor: '#ffffff',
	},
	assetBundlePatterns: ['**/*'],
	ios: {
		supportsTablet: true,
		bundleIdentifier: 'com.xamata.brie',
		infoPlist: {
			ITSAppUsesNonExemptEncryption: false,
		},
	},
	android: {
		adaptiveIcon: {
			foregroundImage: './assets/images/brie-logo.png',
			backgroundColor: '#ffffff',
		},
		package: 'com.xamata.brie',
	},
	web: {
		favicon: './assets/images/brie-logo.png',
	},
	extra: {
		API_URL: process.env.API_URL || 'http://localhost:3000',
		eas: {
			projectId: '5c37bf2f-48a8-4081-bddb-eb7ed5783845',
		},
	},
	plugins: [
		'expo-router',
		[
			'expo-splash-screen',
			{
				image: './assets/images/brie-logo.png', // again, use a PNG for splash
				imageWidth: 150,
				resizeMode: 'contain',
				backgroundColor: '#59A671',
				dark: {
					image: './assets/images/brie-logo.png',
					imageWidth: 150,
					resizeMode: 'contain',
					backgroundColor: '#000',
				},
			},
		],
	],
});
