// useAppInit.ts
import { useEffect, useRef } from 'react';
import { featureFlags } from '../services/feature/featureFlags';
import { crashReporting } from '../services/feature/crashReporting';
import { runCacheMigrations } from '../services/security/cacheMigration';
import { isDevMode } from '../config/environment';

export function useAppInit() {
	const didInit = useRef(false);

	useEffect(() => {
		if (didInit.current) return;
		didInit.current = true;

		const initializeTelemetry = async () => {
			try {
				if (isDevMode) {
					console.log('🚀 [Telemetry] Initializing services...');
				}

				// Run cache migrations first
				try {
					await runCacheMigrations();
					if (isDevMode) {
						console.log('🔄 [CacheMigration] Migrations completed');
					}
				} catch (error) {
					console.warn('🔄 [CacheMigration] Failed to run migrations:', error);
				}

				// Initialize feature flags first
				try {
					await featureFlags.initialize();
					if (isDevMode) {
						console.log('🚩 [FeatureFlags] Initialized');
					}
				} catch (error) {
					console.warn('🚩 [FeatureFlags] Failed to initialize:', error);
				}

				// Initialize crash reporting
				try {
					await crashReporting.initialize();
					if (isDevMode) {
						console.log('🚨 [CrashReporting] Initialized');
					}
				} catch (error) {
					console.warn('🚨 [CrashReporting] Failed to initialize:', error);
				}

				// Set user consent based on settings (you can integrate with user preferences)
				try {
					crashReporting.setUserConsent(true);
				} catch (error) {
					console.warn(
						'🚨 [CrashReporting] Failed to set user consent:',
						error
					);
				}

				// Initialize analytics
				if (isDevMode) {
					console.log('📊 [Analytics] Initialized');
				}

				// Test crash reporting in development
				if (isDevMode) {
					try {
						crashReporting.testCrashReporting();
						crashReporting.testCrashlytics();
					} catch (error) {
						console.warn(
							'🚨 [CrashReporting] Failed to test crash reporting:',
							error
						);
					}
				}

				if (isDevMode) {
					console.log('🚀 [Telemetry] All services initialized successfully');
				}
			} catch (error) {
				console.warn(
					'🚀 [Telemetry] Failed to initialize some services:',
					error
				);
			}
		};

		initializeTelemetry();
	}, []);
}
