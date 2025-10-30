// useAppInit.ts
import { useEffect, useRef } from 'react';
import { featureFlags } from '../services/feature/featureFlags';
import { crashReporting } from '../services/feature/crashReporting';
import { runCacheMigrations } from '../services/security/cacheMigration';
import { createLogger } from '../utils/sublogger';

const appInitLog = createLogger('AppInit');

export function useAppInit() {
	const didInit = useRef(false);

	useEffect(() => {
		if (didInit.current) return;
		didInit.current = true;

		const initializeTelemetry = async () => {
			try {
				appInitLog.debug('Initializing services');

				// Run cache migrations first
				try {
					await runCacheMigrations();
					appInitLog.debug('Cache migrations completed');
				} catch (error) {
					appInitLog.warn('Failed to run migrations', error);
				}

				// Initialize feature flags first
				try {
					await featureFlags.initialize();
					appInitLog.debug('FeatureFlags initialized');
				} catch (error) {
					appInitLog.warn('FeatureFlags failed to initialize', error);
				}

				// Initialize crash reporting
				try {
					await crashReporting.initialize();
					appInitLog.debug('CrashReporting initialized');
				} catch (error) {
					appInitLog.warn('CrashReporting failed to initialize', error);
				}

				// Set user consent via environment (default off outside dev)
				try {
					const consent =
						process.env.EXPO_PUBLIC_CRASH_CONSENT === 'true' || isDevMode;
					crashReporting.setUserConsent(consent);
				} catch (error) {
					appInitLog.warn('Failed to set user consent', error);
				}

				// Initialize analytics
				appInitLog.debug('Analytics initialized');

				// Test crash reporting in development
				if (__DEV__) {
					try {
						crashReporting.testCrashReporting();
						crashReporting.testCrashlytics();
					} catch (error) {
						appInitLog.warn('Failed to test crash reporting', error);
					}
				}

				appInitLog.info('All services initialized successfully');
			} catch (error) {
				appInitLog.warn('Failed to initialize some services', error);
			}
		};

		initializeTelemetry();
	}, []);
}
