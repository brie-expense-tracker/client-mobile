// crashReporting.ts - Crash reporting service with Sentry and Firebase Crashlytics
// Provides production-ready crash reporting with PII protection and user consent

import { TELEMETRY_CONFIG } from '../../config/telemetry';
import { scrubError, scrubAnalyticsEvent } from '../../utils/piiScrubbing';
import { featureFlags } from './featureFlags';
import { isDevMode } from '../../config/environment';

export interface CrashReportingOptions {
	enableSentry?: boolean;
	enableCrashlytics?: boolean;
	enablePIIScrubbing?: boolean;
	enableSampling?: boolean;
	sampleRate?: number;
	userConsent?: boolean;
	environment?: string;
}

export interface CrashContext {
	user_id?: string;
	session_id?: string;
	screen?: string;
	action?: string;
	additional_data?: Record<string, any>;
}

export class CrashReportingService {
	private options: Required<CrashReportingOptions>;
	private isInitialized = false;
	private sentry: any = null;
	private crashlytics: any = null;

	constructor(options: CrashReportingOptions = {}) {
		this.options = {
			enableSentry: options.enableSentry ?? TELEMETRY_CONFIG.SENTRY.ENABLED,
			enableCrashlytics: options.enableCrashlytics ?? true,
			enablePIIScrubbing:
				options.enablePIIScrubbing ??
				TELEMETRY_CONFIG.LOGGING.PII_SCRUBBING_ENABLED,
			enableSampling: options.enableSampling ?? true,
			sampleRate:
				options.sampleRate ?? TELEMETRY_CONFIG.SENTRY.TRACES_SAMPLE_RATE,
			userConsent: options.userConsent ?? false,
			environment: options.environment ?? TELEMETRY_CONFIG.SENTRY.ENVIRONMENT,
		};
	}

	/**
	 * Initialize crash reporting services
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) return;

		try {
			// Check if crash reporting is enabled via feature flags
			if (!featureFlags.isCrashReportingEnabled()) {
				if (isDevMode) {
					console.log('🚨 [CrashReporting] Disabled by feature flag');
				}
				this.isInitialized = true;
				return;
			}

			// Initialize Sentry
			if (this.options.enableSentry) {
				await this.initializeSentry();
			}

			// Initialize Firebase Crashlytics
			if (this.options.enableCrashlytics) {
				await this.initializeCrashlytics();
			}

			this.isInitialized = true;
			if (isDevMode) {
				console.log('🚨 [CrashReporting] Service initialized');
			}
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to initialize:', error);
			this.isInitialized = true;
		}
	}

	/**
	 * Initialize Sentry
	 */
	private async initializeSentry(): Promise<void> {
		try {
			// Check if Sentry is enabled and DSN is properly configured
			if (!TELEMETRY_CONFIG.SENTRY.ENABLED || !TELEMETRY_CONFIG.SENTRY.DSN) {
				console.log(
					'🚨 [CrashReporting] Sentry disabled or DSN not configured, skipping Sentry initialization'
				);
				return;
			}

			const { default: Sentry } = await import('@sentry/react-native');

			// Verify Sentry is properly imported
			if (!Sentry || typeof Sentry.init !== 'function') {
				console.warn('🚨 [CrashReporting] Sentry import failed or invalid');
				return;
			}

			Sentry.init({
				dsn: TELEMETRY_CONFIG.SENTRY.DSN,
				environment: this.options.environment,
				tracesSampleRate: this.options.sampleRate,
				profilesSampleRate: TELEMETRY_CONFIG.SENTRY.PROFILES_SAMPLE_RATE,
				enableAutoSessionTracking: true,
				beforeSend: (event: any) => {
					// Apply sampling
					if (this.options.enableSampling && !this.shouldSample()) {
						return null;
					}

					// Scrub PII if enabled
					if (this.options.enablePIIScrubbing) {
						return this.scrubSentryEvent(event);
					}

					return event;
				},
				beforeBreadcrumb: (breadcrumb: any) => {
					// Scrub PII from breadcrumbs
					if (this.options.enablePIIScrubbing) {
						return this.scrubSentryBreadcrumb(breadcrumb);
					}
					return breadcrumb;
				},
			});

			this.sentry = Sentry;
			if (isDevMode) {
				console.log('🚨 [CrashReporting] Sentry initialized');
			}
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to initialize Sentry:', error);
		}
	}

	/**
	 * Initialize Firebase Crashlytics
	 */
	private async initializeCrashlytics(): Promise<void> {
		try {
			const {
				getCrashlytics,
				setCrashlyticsCollectionEnabled,
				log,
				setAttribute,
			} = await import('@react-native-firebase/crashlytics');

			// Verify crashlytics is available
			if (!getCrashlytics || typeof getCrashlytics !== 'function') {
				console.warn(
					'🚨 [CrashReporting] Crashlytics import failed or invalid'
				);
				return;
			}

			const config = getCrashlytics();
			if (!config) {
				console.warn(
					'🚨 [CrashReporting] Crashlytics instance not properly initialized'
				);
				return;
			}

			// Enable crash reporting only in production builds
			// In development, we still want to collect logs but not crash reports
			try {
				await setCrashlyticsCollectionEnabled(config, !__DEV__);
			} catch (error) {
				console.warn(
					'🚨 [CrashReporting] Failed to set Crashlytics collection enabled:',
					error
				);
			}

			// Log app start for debugging
			try {
				log(config, 'App started');
			} catch (error) {
				console.warn('🚨 [CrashReporting] Failed to log app start:', error);
			}

			// Set some default attributes
			try {
				setAttribute(config, 'app_version', '1.0.0');
			} catch (error) {
				console.warn(
					'🚨 [CrashReporting] Failed to set app version attribute:',
					error
				);
			}

			try {
				setAttribute(
					config,
					'build_type',
					__DEV__ ? 'development' : 'production'
				);
			} catch (error) {
				console.warn(
					'🚨 [CrashReporting] Failed to set build type attribute:',
					error
				);
			}

			this.crashlytics = getCrashlytics;
			if (isDevMode) {
				console.log('🚨 [CrashReporting] Crashlytics initialized');
			}
		} catch (error) {
			console.warn(
				'🚨 [CrashReporting] Failed to initialize Crashlytics:',
				error
			);
		}
	}

	/**
	 * Determine if this event should be sampled
	 */
	private shouldSample(): boolean {
		try {
			if (!this.options.enableSampling) return true;
			return Math.random() < this.options.sampleRate;
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to determine sampling:', error);
			return true; // Default to including the event if sampling fails
		}
	}

	/**
	 * Scrub PII from Sentry event
	 */
	private scrubSentryEvent(event: any): any {
		try {
			if (!event) return event;

			const scrubbedEvent = { ...event };

			// Scrub exception messages and values
			if (scrubbedEvent.exception?.values) {
				try {
					scrubbedEvent.exception.values = scrubbedEvent.exception.values.map(
						(exc: any) => ({
							...exc,
							value: exc.value
								? scrubError(new Error(exc.value)).message
								: exc.value,
						})
					);
				} catch (error) {
					console.warn(
						'🚨 [CrashReporting] Failed to scrub exception values:',
						error
					);
				}
			}

			// Scrub breadcrumbs
			if (scrubbedEvent.breadcrumbs?.values) {
				try {
					scrubbedEvent.breadcrumbs.values =
						scrubbedEvent.breadcrumbs.values.map((crumb: any) =>
							this.scrubSentryBreadcrumb(crumb)
						);
				} catch (error) {
					console.warn(
						'🚨 [CrashReporting] Failed to scrub breadcrumbs:',
						error
					);
				}
			}

			// Scrub user context
			if (scrubbedEvent.user) {
				try {
					scrubbedEvent.user = {
						id: scrubbedEvent.user.id,
						// Remove other potentially sensitive fields
					};
				} catch (error) {
					console.warn(
						'🚨 [CrashReporting] Failed to scrub user context:',
						error
					);
				}
			}

			return scrubbedEvent;
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to scrub Sentry event:', error);
			return event;
		}
	}

	/**
	 * Scrub PII from Sentry breadcrumb
	 */
	private scrubSentryBreadcrumb(breadcrumb: any): any {
		try {
			if (!breadcrumb) return breadcrumb;

			const scrubbedBreadcrumb = { ...breadcrumb };

			// Scrub message
			if (scrubbedBreadcrumb.message) {
				try {
					scrubbedBreadcrumb.message = scrubError(
						new Error(scrubbedBreadcrumb.message)
					).message;
				} catch (error) {
					console.warn(
						'🚨 [CrashReporting] Failed to scrub breadcrumb message:',
						error
					);
				}
			}

			// Scrub data
			if (scrubbedBreadcrumb.data) {
				try {
					scrubbedBreadcrumb.data = scrubAnalyticsEvent(
						scrubbedBreadcrumb.data
					);
				} catch (error) {
					console.warn(
						'🚨 [CrashReporting] Failed to scrub breadcrumb data:',
						error
					);
				}
			}

			return scrubbedBreadcrumb;
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to scrub breadcrumb:', error);
			return breadcrumb;
		}
	}

	/**
	 * Set user consent for crash reporting
	 */
	async setUserConsent(consent: boolean): Promise<void> {
		try {
			this.options.userConsent = consent;

			if (this.sentry) {
				try {
					this.sentry.setUser({ consent });
				} catch (error) {
					console.warn(
						'🚨 [CrashReporting] Failed to set Sentry user consent:',
						error
					);
				}
			}

			if (this.crashlytics) {
				try {
					// Only enable crash collection in production when user consents
					const shouldEnable = consent && !__DEV__;
					const { setCrashlyticsCollectionEnabled } = await import(
						'@react-native-firebase/crashlytics'
					);
					setCrashlyticsCollectionEnabled(this.crashlytics(), shouldEnable);
				} catch (error) {
					console.warn(
						'🚨 [CrashReporting] Failed to set Crashlytics collection enabled:',
						error
					);
				}
			}

			if (isDevMode) {
				console.log(`🚨 [CrashReporting] User consent set to: ${consent}`);
			}
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to set user consent:', error);
		}
	}

	/**
	 * Set user context for crash reports
	 */
	async setUserContext(
		userId: string,
		additionalData?: Record<string, any>
	): Promise<void> {
		if (!this.isInitialized || !this.options.userConsent) return;

		try {
			if (this.sentry) {
				this.sentry.setUser({
					id: userId,
					...additionalData,
				});
			}

			if (this.crashlytics) {
				const { setUserId, setAttribute } = await import(
					'@react-native-firebase/crashlytics'
				);
				setUserId(this.crashlytics(), userId);
				if (additionalData) {
					Object.entries(additionalData).forEach(([key, value]) => {
						setAttribute(this.crashlytics(), key, String(value));
					});
				}
			}
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to set user context:', error);
		}
	}

	/**
	 * Set additional context for crash reports
	 */
	async setContext(key: string, value: any): Promise<void> {
		if (!this.isInitialized || !this.options.userConsent) return;

		try {
			if (this.sentry) {
				this.sentry.setContext(key, value);
			}

			if (this.crashlytics) {
				const { setAttribute } = await import(
					'@react-native-firebase/crashlytics'
				);
				setAttribute(this.crashlytics(), key, String(value));
			}
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to set context:', error);
		}
	}

	/**
	 * Capture and report an error
	 */
	async captureError(error: Error, context?: CrashContext): Promise<void> {
		if (!this.isInitialized || !this.options.userConsent) return;

		try {
			// Scrub PII if enabled
			const processedError = this.options.enablePIIScrubbing
				? scrubError(error)
				: error;

			const processedContext =
				context && this.options.enablePIIScrubbing
					? scrubAnalyticsEvent(context)
					: context;

			if (this.sentry) {
				this.sentry.captureException(processedError, {
					contexts: {
						app: processedContext,
					},
				});
			}

			if (this.crashlytics) {
				const { recordError } = await import(
					'@react-native-firebase/crashlytics'
				);
				recordError(this.crashlytics(), processedError);
			}

			console.log(
				'🚨 [CrashReporting] Error captured:',
				processedError.message
			);
		} catch (reportingError) {
			console.warn(
				'🚨 [CrashReporting] Failed to capture error:',
				reportingError
			);
		}
	}

	/**
	 * Capture and report a message
	 */
	captureMessage(
		message: string,
		level: 'info' | 'warning' | 'error' = 'info',
		context?: CrashContext
	): void {
		if (!this.isInitialized || !this.options.userConsent) return;

		try {
			// Scrub PII if enabled
			const processedMessage = this.options.enablePIIScrubbing
				? scrubError(new Error(message)).message
				: message;

			const processedContext =
				context && this.options.enablePIIScrubbing
					? scrubAnalyticsEvent(context)
					: context;

			if (this.sentry) {
				try {
					this.sentry.captureMessage(processedMessage, {
						level,
						contexts: {
							app: processedContext,
						},
					});
				} catch (error) {
					console.warn(
						'🚨 [CrashReporting] Failed to capture Sentry message:',
						error
					);
				}
			}

			console.log(
				`🚨 [CrashReporting] Message captured (${level}):`,
				processedMessage
			);
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to capture message:', error);
		}
	}

	/**
	 * Add breadcrumb for debugging
	 */
	addBreadcrumb(
		message: string,
		category: string,
		data?: Record<string, any>
	): void {
		if (!this.isInitialized || !this.options.userConsent) return;

		try {
			if (this.sentry) {
				try {
					this.sentry.addBreadcrumb({
						message,
						category,
						data:
							data && this.options.enablePIIScrubbing
								? scrubAnalyticsEvent(data)
								: data,
					});
				} catch (error) {
					console.warn(
						'🚨 [CrashReporting] Failed to add Sentry breadcrumb:',
						error
					);
				}
			}
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to add breadcrumb:', error);
		}
	}

	/**
	 * Test crash reporting (development only)
	 */
	testCrashReporting(): void {
		if (__DEV__ && this.sentry) {
			console.log('🚨 [CrashReporting] Testing crash reporting...');
			this.captureMessage('Test message from development', 'info', {
				screen: 'test',
				action: 'test_crash_reporting',
			});
		} else if (__DEV__) {
			console.log(
				'🚨 [CrashReporting] Sentry not available, skipping crash reporting test'
			);
		}
	}

	/**
	 * Test Crashlytics specifically (development only)
	 */
	async testCrashlytics(): Promise<void> {
		if (__DEV__ && this.crashlytics) {
			try {
				console.log('🚨 [CrashReporting] Testing Crashlytics...');

				// Test logging
				try {
					const { log } = await import('@react-native-firebase/crashlytics');
					log(this.crashlytics(), 'Test log from development');
				} catch (error) {
					console.warn(
						'🚨 [CrashReporting] Failed to test Crashlytics logging:',
						error
					);
				}

				// Test custom attributes
				try {
					const { setAttribute } = await import(
						'@react-native-firebase/crashlytics'
					);
					setAttribute(this.crashlytics(), 'test_attribute', 'test_value');
				} catch (error) {
					console.warn(
						'🚨 [CrashReporting] Failed to test Crashlytics attributes:',
						error
					);
				}

				// Test non-fatal error (won't crash the app)
				try {
					const { recordError } = await import(
						'@react-native-firebase/crashlytics'
					);
					recordError(
						this.crashlytics(),
						new Error('Test error from development')
					);
				} catch (error) {
					console.warn(
						'🚨 [CrashReporting] Failed to test Crashlytics error recording:',
						error
					);
				}

				console.log('🚨 [CrashReporting] Crashlytics test completed');
			} catch (error) {
				console.warn('🚨 [CrashReporting] Failed to test Crashlytics:', error);
			}
		} else if (__DEV__) {
			console.log(
				'🚨 [CrashReporting] Crashlytics not available, skipping test'
			);
		}
	}

	/**
	 * Get service status
	 */
	getStatus(): {
		isInitialized: boolean;
		enableSentry: boolean;
		enableCrashlytics: boolean;
		enablePIIScrubbing: boolean;
		enableSampling: boolean;
		userConsent: boolean;
		environment: string;
	} {
		return {
			isInitialized: this.isInitialized,
			enableSentry: this.options.enableSentry,
			enableCrashlytics: this.options.enableCrashlytics,
			enablePIIScrubbing: this.options.enablePIIScrubbing,
			enableSampling: this.options.enableSampling,
			userConsent: this.options.userConsent,
			environment: this.options.environment,
		};
	}

	/**
	 * Start performance monitoring transaction
	 */
	startTransaction(name: string, operation: string): any {
		if (!this.isInitialized || !this.options.userConsent || !this.sentry) {
			return null;
		}

		try {
			return this.sentry.startTransaction({
				name,
				op: operation,
			});
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to start transaction:', error);
			return null;
		}
	}

	/**
	 * Finish performance monitoring transaction
	 */
	finishTransaction(transaction: any): void {
		if (!transaction) return;

		try {
			transaction.finish();
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to finish transaction:', error);
		}
	}

	/**
	 * Add span to transaction
	 */
	addSpan(transaction: any, name: string, operation: string): any {
		if (!transaction) return null;

		try {
			return transaction.startChild({
				op: operation,
				description: name,
			});
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to add span:', error);
			return null;
		}
	}

	/**
	 * Finish span
	 */
	finishSpan(span: any): void {
		if (!span) return;

		try {
			span.finish();
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to finish span:', error);
		}
	}

	/**
	 * Set custom tags for filtering
	 */
	async setTag(key: string, value: string): Promise<void> {
		if (!this.isInitialized || !this.options.userConsent) return;

		try {
			if (this.sentry) {
				this.sentry.setTag(key, value);
			}

			if (this.crashlytics) {
				const { setAttribute } = await import(
					'@react-native-firebase/crashlytics'
				);
				setAttribute(this.crashlytics(), key, value);
			}
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to set tag:', error);
		}
	}

	/**
	 * Set custom tags in bulk
	 */
	async setTags(tags: Record<string, string>): Promise<void> {
		if (!this.isInitialized || !this.options.userConsent) return;

		try {
			if (this.sentry) {
				this.sentry.setTags(tags);
			}

			if (this.crashlytics) {
				const { setAttribute } = await import(
					'@react-native-firebase/crashlytics'
				);
				Object.entries(tags).forEach(([key, value]) => {
					setAttribute(this.crashlytics(), key, value);
				});
			}
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to set tags:', error);
		}
	}

	/**
	 * Set user feedback for crash reports
	 */
	setUserFeedback(feedback: {
		eventId: string;
		name: string;
		email: string;
		comments: string;
	}): void {
		if (!this.isInitialized || !this.options.userConsent || !this.sentry)
			return;

		try {
			this.sentry.captureUserFeedback(feedback);
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to set user feedback:', error);
		}
	}

	/**
	 * Flush pending events (useful before app termination)
	 */
	async flush(timeout: number = 2000): Promise<boolean> {
		if (!this.isInitialized || !this.sentry) return false;

		try {
			await this.sentry.flush(timeout);
			return true;
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to flush events:', error);
			return false;
		}
	}

	/**
	 * Clear all context and user data
	 */
	async clearContext(): Promise<void> {
		if (!this.isInitialized) return;

		try {
			if (this.sentry) {
				this.sentry.setUser(null);
				this.sentry.setContext('app', {});
				this.sentry.setTags({});
			}

			if (this.crashlytics) {
				const { setUserId } = await import(
					'@react-native-firebase/crashlytics'
				);
				setUserId(this.crashlytics(), '');
				// Note: Crashlytics doesn't have a direct way to clear all attributes
			}

			console.log('🚨 [CrashReporting] Context cleared');
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to clear context:', error);
		}
	}

	/**
	 * Get current session ID
	 */
	getSessionId(): string | null {
		if (!this.isInitialized || !this.sentry) return null;

		try {
			return this.sentry.getCurrentScope()?.getSession()?.getId() || null;
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to get session ID:', error);
			return null;
		}
	}

	/**
	 * Set release version for better debugging
	 */
	setRelease(release: string): void {
		if (!this.isInitialized || !this.sentry) return;

		try {
			this.sentry.setRelease(release);
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to set release:', error);
		}
	}

	/**
	 * Set environment
	 */
	setEnvironment(environment: string): void {
		if (!this.isInitialized || !this.sentry) return;

		try {
			this.sentry.setEnvironment(environment);
			this.options.environment = environment;
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to set environment:', error);
		}
	}

	/**
	 * Capture unhandled promise rejections
	 */
	setupUnhandledRejectionCapture(): void {
		if (!this.isInitialized || !this.sentry) return;

		try {
			// Capture unhandled promise rejections
			global.addEventListener?.('unhandledrejection', (event) => {
				this.captureError(
					new Error(`Unhandled Promise Rejection: ${event.reason}`),
					{
						action: 'unhandled_promise_rejection',
						additional_data: {
							reason: event.reason,
							promise: event.promise,
						},
					}
				);
			});

			// Capture uncaught exceptions
			global.addEventListener?.('error', (event) => {
				this.captureError(new Error(`Uncaught Exception: ${event.error}`), {
					action: 'uncaught_exception',
					additional_data: {
						error: event.error,
						filename: event.filename,
						lineno: event.lineno,
						colno: event.colno,
					},
				});
			});

			console.log('🚨 [CrashReporting] Unhandled rejection capture setup');
		} catch (error) {
			console.warn(
				'🚨 [CrashReporting] Failed to setup unhandled rejection capture:',
				error
			);
		}
	}

	/**
	 * Test all crash reporting features
	 */
	async testAllFeatures(): Promise<void> {
		if (!__DEV__) {
			console.log('🚨 [CrashReporting] Testing only available in development');
			return;
		}

		try {
			console.log(
				'🚨 [CrashReporting] Testing all crash reporting features...'
			);

			// Test basic message capture
			await this.captureMessage(
				'Test message from crash reporting service',
				'info',
				{
					screen: 'test',
					action: 'test_all_features',
				}
			);

			// Test error capture
			await this.captureError(
				new Error('Test error from crash reporting service'),
				{
					screen: 'test',
					action: 'test_error_capture',
				}
			);

			// Test breadcrumb
			this.addBreadcrumb('Test breadcrumb', 'test', {
				test_data: 'test_value',
			});

			// Test performance monitoring
			const transaction = this.startTransaction('test-transaction', 'test');
			if (transaction) {
				const span = this.addSpan(transaction, 'test-span', 'test');
				if (span) {
					// Simulate some work
					await new Promise((resolve) => setTimeout(resolve, 100));
					this.finishSpan(span);
				}
				this.finishTransaction(transaction);
			}

			// Test tags
			await this.setTag('test_tag', 'test_value');
			await this.setTags({
				test_tag_2: 'test_value_2',
				test_tag_3: 'test_value_3',
			});

			// Test context
			await this.setContext('test_context', { test_data: 'test_value' });

			// Test Crashlytics
			await this.testCrashlytics();

			console.log('🚨 [CrashReporting] All features tested successfully');
		} catch (error) {
			console.warn('🚨 [CrashReporting] Failed to test all features:', error);
		}
	}
}

// Export singleton instance
export const crashReporting = new CrashReportingService();
