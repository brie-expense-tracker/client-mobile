/**
 * Jest Setup File
 * 
 * This file runs before all tests and sets up:
 * - Environment variables required by config modules
 * - Global mocks for modules that require env vars
 * 
 * This prevents "Missing required env" errors in tests.
 */

// Set environment variables BEFORE any modules are loaded
// This is critical because env.ts calls parseEnv() at module load time
process.env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
process.env.EXPO_PUBLIC_ENV = process.env.EXPO_PUBLIC_ENV || 'testflight';
process.env.EXPO_PUBLIC_AI_INSIGHTS = process.env.EXPO_PUBLIC_AI_INSIGHTS || '0';
// Logger defaults to 'warn' when __DEV__ is false (Jest); tests expect info/debug to run
process.env.EXPO_PUBLIC_LOG_LEVEL = process.env.EXPO_PUBLIC_LOG_LEVEL || 'debug';

// Note: Logger module is loaded with env vars set above
// The logger module will work correctly now that env vars are available
// We don't mock it globally because some tests need the real logger

// Mock Firebase native modules globally (required by many services)
jest.mock('@react-native-firebase/app', () => ({
	getApp: jest.fn(() => ({
		name: '[DEFAULT]',
		options: {},
	})),
}));

jest.mock('@react-native-firebase/crashlytics', () => ({
	__esModule: true,
	default: jest.fn(() => ({
		recordError: jest.fn(),
		log: jest.fn(),
		setAttribute: jest.fn(),
		setUserId: jest.fn(),
	})),
	getCrashlytics: jest.fn(() => ({
		recordError: jest.fn(),
		log: jest.fn(),
		setAttribute: jest.fn(),
		setUserId: jest.fn(),
	})),
}));

jest.mock('@react-native-firebase/remote-config', () => ({
	__esModule: true,
	default: jest.fn(() => ({
		setDefaults: jest.fn(),
		fetch: jest.fn(),
		activate: jest.fn(),
		getValue: jest.fn(() => ({
			asString: jest.fn(() => ''),
			asNumber: jest.fn(() => 0),
			asBoolean: jest.fn(() => false),
		})),
	})),
	getRemoteConfig: jest.fn(() => ({
		setDefaults: jest.fn(),
		fetch: jest.fn(),
		activate: jest.fn(),
		getValue: jest.fn(() => ({
			asString: jest.fn(() => ''),
			asNumber: jest.fn(() => 0),
			asBoolean: jest.fn(() => false),
		})),
	})),
}));
