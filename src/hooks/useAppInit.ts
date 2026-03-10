// useAppInit.ts
import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import * as Updates from 'expo-updates';
import { featureFlags } from '../services/feature/featureFlags';
import { crashReporting } from '../services/feature/crashReporting';
import { runCacheMigrations } from '../services/security/cacheMigration';
import { createLogger } from '../utils/sublogger';
import { isLogLevelEnabled } from '../utils/logger';
import { isDevMode } from '../config/environment';

const appInitLog = createLogger('AppInit');

export function useAppInit() {
	const didInit = useRef(false);

	useEffect(() => {
		if (didInit.current) return;
		didInit.current = true;

		const startTime = Date.now();
		// Perf breadcrumbs only when debug is enabled — avoids noisy INFO in TestFlight/dev builds
		if (isLogLevelEnabled('debug')) {
			appInitLog.debug('[Perf] AppInit started');
		}

		const initializeTelemetry = async () => {
			try {
				appInitLog.debug('Initializing services');

				// Check for updates from EAS (skip in __DEV__ / dev client — checkForUpdateAsync throws ERR_NOT_AVAILABLE_IN_DEV_CLIENT)
				if (Updates.isEnabled && !__DEV__) {
					try {
						appInitLog.debug('Checking for updates...');
						const update = await Updates.checkForUpdateAsync();

						if (update.isAvailable) {
							appInitLog.info('Update available, downloading...');
							await Updates.fetchUpdateAsync();
							appInitLog.info('Update downloaded, will apply on next restart');
							// Optionally reload immediately, or let user continue and reload later
							// await Updates.reloadAsync();
						} else {
							appInitLog.debug('No updates available');
						}
					} catch (error) {
						const code =
							error &&
							typeof error === 'object' &&
							'code' in error
								? String((error as { code?: string }).code)
								: undefined;
						// Dev client / local Metro: updates API not available — expected, not a failure
						if (code === 'ERR_NOT_AVAILABLE_IN_DEV_CLIENT') {
							appInitLog.debug(
								'Updates check skipped (not available in dev client)',
								{ code }
							);
						} else {
							appInitLog.warn('Failed to check for updates', error);
						}
					}
				} else if (!Updates.isEnabled) {
					if (isDevMode) {
						appInitLog.debug(
							'Updates disabled (likely using local dev server)'
						);
					}
				} else if (__DEV__ && Updates.isEnabled) {
					// Enabled in dev client but OTA check not supported — avoid calling API
					appInitLog.debug(
						'Updates check skipped in development (dev client)'
					);
				}

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

				// Crash pipeline self-test only when explicitly requested — avoids misleading Crashlytics noise
				if (
					__DEV__ &&
					process.env.EXPO_PUBLIC_CRASH_TEST === 'true'
				) {
					try {
						appInitLog.debug('Crash reporting self-test (EXPO_PUBLIC_CRASH_TEST)', {
							code: 'CRASH_TEST_RUN',
						});
						crashReporting.testCrashReporting();
						crashReporting.testCrashlytics();
					} catch (error) {
						appInitLog.warn('Crash reporting self-test failed', error);
					}
				}

				const duration = Date.now() - startTime;
				// Single INFO on success; structured for support without spamming every boot at debug
				appInitLog.info('All services initialized', {
					code: 'APP_INIT_OK',
					durationMs: duration,
				});
				if (isLogLevelEnabled('debug')) {
					appInitLog.debug('[Perf] AppInit completed', { durationMs: duration });
				}
			} catch (error) {
				appInitLog.warn('Failed to initialize some services', error);
			}
		};

		// Defer telemetry initialization until after interactions complete
		// This improves initial render performance, especially on TestFlight builds
		InteractionManager.runAfterInteractions(() => {
			initializeTelemetry();
		});
	}, []);
}
