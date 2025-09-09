import { Platform } from 'react-native';
import * as Device from 'expo-device';

// Environment configuration with proper URL resolution
export const ENV = {
	// Environment
	NODE_ENV: process.env.NODE_ENV || 'development',
	EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV || 'dev',

	// API Configuration
	API_BASE_PATH: process.env.EXPO_PUBLIC_API_BASE_PATH || '/api',
	API_TIMEOUT_MS: parseInt(
		process.env.EXPO_PUBLIC_API_TIMEOUT_MS || '12000',
		10
	),

	// Security
	HMAC_SECRET_KEY: process.env.EXPO_PUBLIC_HMAC_SECRET_KEY,

	// URLs
	LOCAL_SIM_API_URL:
		process.env.EXPO_PUBLIC_LOCAL_SIM_API_URL || 'http://localhost:3000',
	LOCAL_DEVICE_API_URL:
		process.env.EXPO_PUBLIC_LOCAL_DEVICE_API_URL || 'http://192.168.1.65:3000',
	PRODUCTION_API_URL:
		process.env.EXPO_PUBLIC_API_URL || 'https://api.briefinance.com',
};

// Helper function to detect if running on simulator
function isSimulator(): boolean {
	// expo-device is the most reliable
	return !Device.isDevice;
}

// URL resolution logic
export function resolveApiBaseUrl(): string {
	const env = ENV.EXPO_PUBLIC_ENV;

	console.log('🔧 [Environment] Resolving API URL for environment:', env);
	console.log(
		'🔧 [Environment] LOCAL_DEVICE_API_URL:',
		ENV.LOCAL_DEVICE_API_URL
	);
	console.log('🔧 [Environment] LOCAL_SIM_API_URL:', ENV.LOCAL_SIM_API_URL);

	if (env === 'dev' || env === 'dev_sim' || env === 'development') {
		// Use simulator URL for simulators, device URL for physical devices
		const base = isSimulator()
			? ENV.LOCAL_SIM_API_URL
			: ENV.LOCAL_DEVICE_API_URL;
		console.log(
			'🔧 [Environment] Using',
			isSimulator() ? 'simulator' : 'device',
			'API URL:',
			base
		);
		return base;
	}

	// Production
	console.log(
		'🔧 [Environment] Using production API URL:',
		ENV.PRODUCTION_API_URL
	);
	return ENV.PRODUCTION_API_URL;
}

// Get full API URL with base path
export function getApiUrl(): string {
	const baseUrl = resolveApiBaseUrl();
	return `${baseUrl}${ENV.API_BASE_PATH}`;
}

// Get API base URL (without path)
export function getApiBaseUrl(): string {
	return resolveApiBaseUrl();
}

// Environment checks
export const isDevelopment = ENV.NODE_ENV === 'development';
export const isProduction = ENV.NODE_ENV === 'production';
export const isTest = ENV.NODE_ENV === 'test';
export const isDev = ENV.EXPO_PUBLIC_ENV === 'dev';

// Debug logging
console.log('🔧 [Environment] Configuration loaded:');
console.log('🔧 [Environment] NODE_ENV:', ENV.NODE_ENV);
console.log('🔧 [Environment] EXPO_PUBLIC_ENV:', ENV.EXPO_PUBLIC_ENV);
console.log('🔧 [Environment] Platform:', Platform.OS);
console.log('🔧 [Environment] Is Device:', Device.isDevice);
console.log('🔧 [Environment] Is Simulator:', isSimulator());
console.log(
	'🔧 [Environment] LOCAL_SIM_API_URL from env:',
	ENV.LOCAL_SIM_API_URL
);
console.log(
	'🔧 [Environment] LOCAL_DEVICE_API_URL from env:',
	ENV.LOCAL_DEVICE_API_URL
);
console.log('🔧 [Environment] API Base URL:', resolveApiBaseUrl());
console.log('🔧 [Environment] Full API URL:', getApiUrl());
