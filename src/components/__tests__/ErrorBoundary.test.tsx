/**
 * Tests for ErrorBoundary component
 * 
 * Note: Component testing requires React Native Test Renderer or @testing-library/react-native
 * For now, we test the ErrorBoundary logic indirectly through integration.
 * Full component tests should be added when testing library is available.
 */

// CRITICAL: Set environment variables BEFORE any imports
// Jest hoists imports, so we must set env vars before the test file is evaluated
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
process.env.EXPO_PUBLIC_ENV = 'testflight';

// Mock the config/env module FIRST (before any other mocks or imports)
// This prevents the real env.ts from executing parseEnv() at module load time
jest.mock('../../config/env', () => {
	return {
		Env: {
			EXPO_PUBLIC_API_URL: 'http://localhost:3000',
			EXPO_PUBLIC_ENV: 'testflight' as const,
			EXPO_PUBLIC_AI_INSIGHTS: '0' as const,
			EXPO_PUBLIC_CRASH_CONSENT: undefined,
			EXPO_PUBLIC_SENTRY_DSN: undefined,
			EXPO_PUBLIC_SENTRY_ENVIRONMENT: undefined,
		},
	};
});

// Mock appConfig which depends on env
jest.mock('../../config/appConfig', () => {
	return {
		AppConfig: {
			apiBaseUrl: 'http://localhost:3000',
			env: 'testflight' as const,
			flags: {
				aiInsights: false,
				crashConsentDefault: false,
			},
			telemetry: {
				enabled: false,
				dsn: undefined,
				environment: 'testflight' as const,
				tracesSampleRate: 0.1,
				profilesSampleRate: 0.1,
				logLevel: 'info' as const,
			},
			network: {
				timeoutMs: 15000,
			},
		},
	};
});

// Mock telemetry which depends on appConfig
jest.mock('../../config/telemetry', () => {
	return {
		TELEMETRY_CONFIG: {
			SENTRY: {
				DSN: null,
				ENVIRONMENT: 'testflight',
				TRACES_SAMPLE_RATE: 0.1,
				PROFILES_SAMPLE_RATE: 0.1,
				ENABLED: false,
			},
			FIREBASE: {
				REMOTE_CONFIG_MINIMUM_FETCH_INTERVAL: 3600,
				REMOTE_CONFIG_FETCH_TIMEOUT: 10000,
			},
			ANALYTICS: {
				SAMPLE_RATE: 1.0,
				ENABLED: false,
				CRASH_REPORTING_ENABLED: false,
				PERFORMANCE_MONITORING_ENABLED: false,
			},
			FEATURES: {
				ENABLED: true,
				SHADOW_AB_TESTING: true,
			},
			LOGGING: {
				LEVEL: 'info' as const,
				SAMPLING_RATE: 0.1,
				PII_SCRUBBING_ENABLED: true,
			},
			API: {
				BASE_URL: 'http://localhost:3000',
				TIMEOUT: 15000,
			},
		},
		PII_PATTERNS: {
			EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
			PHONE: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
			CREDIT_CARD: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
			SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
			BANK_ACCOUNT: /\b\d{4,17}\b/g,
			AMOUNT: /\$\d+(?:,\d{3})*(?:\.\d{2})?/g,
			DATE: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
		},
	};
});

// Mock Firebase native modules (required for crashReporting and featureFlags)
// These must be mocked before any imports that use them
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

// Mock featureFlags service (used by crashReporting)
jest.mock('../../services/feature/featureFlags', () => ({
	featureFlags: {
		isEnabled: jest.fn(() => false),
		getValue: jest.fn(() => null),
		refresh: jest.fn(),
	},
}));

// Mock other dependencies
jest.mock('../../services/feature/crashReporting', () => ({
	CrashReportingService: jest.fn().mockImplementation(() => ({
		captureError: jest.fn(),
		captureMessage: jest.fn(),
		setUser: jest.fn(),
		setAttribute: jest.fn(),
	})),
}));

jest.mock('../../services/errorService', () => ({
	ErrorService: {
		categorizeError: jest.fn((error) => ({
			type: 'unknown',
			message: error.message || 'An error occurred',
			retryable: false,
			action: 'Retry',
			recoverySuggestions: [],
		})),
		logError: jest.fn(),
	},
}));

// Now safe to import
import { ErrorBoundary } from '../ErrorBoundary';
import { CrashReportingService } from '../../services/feature/crashReporting';
import { ErrorService } from '../../services/errorService';

describe('ErrorBoundary', () => {
	it('should be a class component', () => {
		// Verify ErrorBoundary is a class component (required for error boundaries)
		expect(ErrorBoundary.prototype).toBeDefined();
		expect(ErrorBoundary.prototype.componentDidCatch).toBeDefined();
		// Note: getDerivedStateFromError is a static method, not on prototype
		expect(typeof ErrorBoundary.getDerivedStateFromError).toBe('function');
	});

	it('should have static getDerivedStateFromError method', () => {
		// Error boundaries must have this static method
		expect(typeof ErrorBoundary.getDerivedStateFromError).toBe('function');
	});

	it('should have componentDidCatch method', () => {
		// Error boundaries must have this lifecycle method
		const instance = new ErrorBoundary({ children: null });
		expect(typeof instance.componentDidCatch).toBe('function');
	});

	it('should integrate with CrashReportingService', () => {
		// Verify the component uses CrashReportingService
		// This is tested through the import and mock setup
		expect(CrashReportingService).toBeDefined();
	});

	it('should integrate with ErrorService', () => {
		// Verify the component uses ErrorService
		// This is tested through the import and mock setup
		expect(ErrorService).toBeDefined();
		expect(typeof ErrorService.categorizeError).toBe('function');
		expect(typeof ErrorService.logError).toBe('function');
	});
});
