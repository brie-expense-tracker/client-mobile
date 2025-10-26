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
	HMAC_SECRET_KEY:
		process.env.EXPO_PUBLIC_HMAC_SECRET_KEY ||
		'dev-hmac-secret-key-32-chars-minimum-required-for-development',

	// Primary API URL - use EXPO_PUBLIC_API_URL everywhere
	API_URL:
		process.env.EXPO_PUBLIC_API_URL || 'https://brie-staging-api.onrender.com',
};

// Helper function to detect if running on simulator
function isSimulator(): boolean {
	// expo-device is the most reliable
	return !Device.isDevice;
}

// URL resolution logic - now uses single EXPO_PUBLIC_API_URL
export function resolveApiBaseUrl(): string {
	if (__DEV__) {
		console.log('🔧 [Environment] Using API URL:', ENV.API_URL);
	}
	return ENV.API_URL;
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

// Debug logging - only in development
if (__DEV__) {
	console.log('🔧 [Environment] Configuration loaded:');
	console.log('🔧 [Environment] NODE_ENV:', ENV.NODE_ENV);
	console.log('🔧 [Environment] EXPO_PUBLIC_ENV:', ENV.EXPO_PUBLIC_ENV);
	console.log('🔧 [Environment] Platform:', Platform.OS);
	console.log('🔧 [Environment] Is Device:', Device.isDevice);
	console.log('🔧 [Environment] Is Simulator:', isSimulator());
	console.log('🔧 [Environment] API URL:', ENV.API_URL);
	console.log('🔧 [Environment] API Base URL:', resolveApiBaseUrl());
	console.log('🔧 [Environment] Full API URL:', getApiUrl());
	console.log('🔧 [Environment] HMAC Secret available:', !!ENV.HMAC_SECRET_KEY);
	console.log(
		'🔧 [Environment] HMAC Secret length:',
		ENV.HMAC_SECRET_KEY?.length || 0
	);
	console.log(
		'🔧 [Environment] HMAC Secret (first 8 chars):',
		ENV.HMAC_SECRET_KEY?.substring(0, 8) + '...' || 'undefined'
	);
}
