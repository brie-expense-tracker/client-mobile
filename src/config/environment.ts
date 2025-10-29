import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { createLogger } from '../utils/sublogger';

const envLog = createLogger('Environment');

// Environment configuration with proper URL resolution
export const ENV = {
	// NODE_ENV is automatically set by Expo/React Native build system
	// - 'development' when running `expo start` or `npm start`
	// - 'production' when building for production
	// This CANNOT be changed via .env - it's controlled by the build system
	NODE_ENV: process.env.NODE_ENV || 'development',

	// EXPO_PUBLIC_ENV controls which backend/environment to use
	// Set this in your .env file: 'development', 'staging', or 'production'
	EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV || 'development',

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
	// Only log in dev mode
	if (isDevMode) {
		envLog.debug('Using API URL', { url: ENV.API_URL });
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

// Single source of truth for development mode
// This controls whether debug logging, dev tools, and development features are enabled
// Can be toggled independently of NODE_ENV for testing
export const DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

// ==========================================
// Environment Checks
// ==========================================

// NODE_ENV: Controlled by build system (expo/npm)
// - Automatically 'development' when you run `expo start`
// - Automatically 'production' when you build the app
// - Don't try to change this via .env - it won't work!
export const isDevelopment = ENV.NODE_ENV === 'development';
export const isProduction = ENV.NODE_ENV === 'production';
export const isTest = ENV.NODE_ENV === 'test';

// EXPO_PUBLIC_ENV: Controlled by YOU via .env
// - Use this to choose which backend to connect to
// - 'development' = local/staging API
// - 'staging' = staging API
// - 'production' = production API
export const isDev =
	ENV.EXPO_PUBLIC_ENV !== 'production' && ENV.EXPO_PUBLIC_ENV !== 'prod';

// DEV_MODE: Also controlled by YOU via .env
// - Set EXPO_PUBLIC_DEV_MODE=true to enable debug features
// - Set EXPO_PUBLIC_DEV_MODE=false to disable (default)

// Development mode = running from expo start + DEV_MODE enabled
// This controls DevHud, debug logs, and dev-only features
export const isDevMode = isDevelopment && DEV_MODE;

// Debug logging - only when dev mode is enabled
if (isDevMode) {
	envLog.debug('Configuration loaded', {
		NODE_ENV: ENV.NODE_ENV,
		EXPO_PUBLIC_ENV: ENV.EXPO_PUBLIC_ENV,
		DEV_MODE: DEV_MODE,
		isDevMode,
		platform: Platform.OS,
		isDevice: Device.isDevice,
		isSimulator: isSimulator(),
		apiUrl: ENV.API_URL,
		apiBaseUrl: resolveApiBaseUrl(),
		fullApiUrl: getApiUrl(),
		hmacSecretAvailable: !!ENV.HMAC_SECRET_KEY,
		hmacSecretLength: ENV.HMAC_SECRET_KEY?.length || 0,
		hmacSecretPreview:
			ENV.HMAC_SECRET_KEY?.substring(0, 8) + '...' || 'undefined',
	});
}
