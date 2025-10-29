// crashReporting.ts - Crash reporting service with Sentry and Firebase Crashlytics
// Provides production-ready crash reporting with PII protection and user consent

import { TELEMETRY_CONFIG } from '../../config/telemetry';
import { scrubError, scrubAnalyticsEvent } from '../../utils/piiScrubbing';
import { featureFlags } from './featureFlags';
import { createLogger } from '../../utils/sublogger';

const crashReportingLog = createLogger('CrashReporting');

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
	private crashlytics: ReturnType<
		typeof import('@react-native-firebase/crashlytics')['getCrashlytics']
	> | null = null;

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
				crashReportingLog.info('Disabled by feature flag');
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
			crashReportingLog.info('Service initialized');
		} catch (error) {
			crashReportingLog.warn('Failed to initialize', error);
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
				crashReportingLog.debug(
					'Sentry disabled or DSN not configured, skipping Sentry initialization'
				);
				return;
			}

			const { default: Sentry } = await import('@sentry/react-native');

			// Verify Sentry is properly imported
			if (!Sentry || typeof Sentry.init !== 'function') {
				crashReportingLog.warn('Sentry import failed or invalid');
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
			crashReportingLog.info('Sentry initialized');
		} catch (error) {
			crashReportingLog.warn('Failed to initialize Sentry', error);
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
				crashReportingLog.warn('Crashlytics import failed or invalid');
				return;
			}

			// Cache the instance (bind to default app explicitly)
			const instance = getCrashlytics();
			if (!instance) {
				crashReportingLog.warn('Crashlytics instance not properly initialized');
				return;
			}

			this.crashlytics = instance;

			// Enable/disable collection (prod only, and only with consent later)
			try {
				await setCrashlyticsCollectionEnabled(instance, !__DEV__);
			} catch (error) {
				crashReportingLog.warn(
					'Failed to set Crashlytics collection enabled',
					error
				);
			}

			// Log app start for debugging
			try {
				log(instance, 'App started');
			} catch (error) {
				crashReportingLog.warn('Failed to log app start', error);
			}

			// Set some default attributes
			try {
				setAttribute(instance, 'app_version', '1.0.0');
			} catch (error) {
				crashReportingLog.warn('Failed to set app version attribute', error);
			}

			try {
				setAttribute(
					instance,
					'build_type',
					__DEV__ ? 'development' : 'production'
				);
			} catch (error) {
				crashReportingLog.warn('Failed to set build type attribute', error);
			}

			crashReportingLog.info('Crashlytics initialized');
		} catch (error) {
			crashReportingLog.warn('Failed to initialize Crashlytics', error);
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
			crashReportingLog.warn('Failed to determine sampling', error);
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
					crashReportingLog.warn('Failed to scrub exception values', error);
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
					crashReportingLog.warn('Failed to scrub breadcrumbs', error);
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
					crashReportingLog.warn('Failed to scrub user context', error);
				}
			}

			return scrubbedEvent;
		} catch (error) {
			crashReportingLog.warn('Failed to scrub Sentry event', error);
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
					crashReportingLog.warn('Failed to scrub breadcrumb message', error);
				}
			}

			// Scrub data
			if (scrubbedBreadcrumb.data) {
				try {
					scrubbedBreadcrumb.data = scrubAnalyticsEvent(
						scrubbedBreadcrumb.data
					);
				} catch (error) {
					crashReportingLog.warn('Failed to scrub breadcrumb data', error);
				}
			}

			return scrubbedBreadcrumb;
		} catch (error) {
			crashReportingLog.warn('Failed to scrub breadcrumb', error);
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
					crashReportingLog.warn('Failed to set Sentry user consent', error);
				}
			}

			if (this.crashlytics) {
				try {
					// Only enable crash collection in production when user consents
					const shouldEnable = consent && !__DEV__;
					const { setCrashlyticsCollectionEnabled } = await import(
						'@react-native-firebase/crashlytics'
					);
					if (this.crashlytics) {
						setCrashlyticsCollectionEnabled(this.crashlytics, shouldEnable);
					}
				} catch (error) {
					crashReportingLog.warn(
						'Failed to set Crashlytics collection enabled',
						error
					);
				}
			}

			crashReportingLog.info(`User consent set to: ${consent}`);
		} catch (error) {
			crashReportingLog.warn('Failed to set user consent', error);
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
				setUserId(this.crashlytics, userId);
				if (additionalData) {
					Object.entries(additionalData).forEach(([key, value]) => {
						setAttribute(this.crashlytics!, key, String(value));
					});
				}
			}
		} catch (error) {
			crashReportingLog.warn('Failed to set user context', error);
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
				setAttribute(this.crashlytics, key, String(value));
			}
		} catch (error) {
			crashReportingLog.warn('Failed to set context', error);
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
				recordError(this.crashlytics, processedError);
			}

			crashReportingLog.debug('Error captured', {
				message: processedError.message,
			});
		} catch (reportingError) {
			crashReportingLog.warn('Failed to capture error', reportingError);
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
					crashReportingLog.warn('Failed to capture Sentry message', error);
				}
			}

			crashReportingLog.debug(`Message captured (${level})`, {
				message: processedMessage,
			});
		} catch (error) {
			crashReportingLog.warn('Failed to capture message', error);
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
					crashReportingLog.warn('Failed to add Sentry breadcrumb', error);
				}
			}
		} catch (error) {
			crashReportingLog.warn('Failed to add breadcrumb', error);
		}
	}

	/**
	 * Test crash reporting (development only)
	 */
	testCrashReporting(): void {
		if (__DEV__ && this.sentry) {
			crashReportingLog.debug('Testing crash reporting');
			this.captureMessage('Test message from development', 'info', {
				screen: 'test',
				action: 'test_crash_reporting',
			});
		} else if (__DEV__) {
			crashReportingLog.debug(
				'Sentry not available, skipping crash reporting test'
			);
		}
	}

	/**
	 * Test Crashlytics specifically (development only)
	 */
	async testCrashlytics(): Promise<void> {
		if (__DEV__ && this.crashlytics) {
			try {
				crashReportingLog.debug('Testing Crashlytics');

				// Test logging
				try {
					const { log } = await import('@react-native-firebase/crashlytics');
					if (this.crashlytics) {
						log(this.crashlytics, 'Test log from development');
					}
				} catch (error) {
					crashReportingLog.warn('Failed to test Crashlytics logging', error);
				}

				// Test custom attributes
				try {
					const { setAttribute } = await import(
						'@react-native-firebase/crashlytics'
					);
					if (this.crashlytics) {
						setAttribute(this.crashlytics, 'test_attribute', 'test_value');
					}
				} catch (error) {
					crashReportingLog.warn(
						'Failed to test Crashlytics attributes',
						error
					);
				}

				// Test non-fatal error (won't crash the app)
				try {
					const { recordError } = await import(
						'@react-native-firebase/crashlytics'
					);
					if (this.crashlytics) {
						recordError(
							this.crashlytics,
							new Error('Test error from development')
						);
					}
				} catch (error) {
					crashReportingLog.warn(
						'Failed to test Crashlytics error recording',
						error
					);
				}

				crashReportingLog.debug('Crashlytics test completed');
			} catch (error) {
				crashReportingLog.warn('Failed to test Crashlytics', error);
			}
		} else if (__DEV__) {
			crashReportingLog.debug('Crashlytics not available, skipping test');
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
			crashReportingLog.warn('Failed to start transaction', error);
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
			crashReportingLog.warn('Failed to finish transaction', error);
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
			crashReportingLog.warn('Failed to add span', error);
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
			crashReportingLog.warn('Failed to finish span', error);
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
				setAttribute(this.crashlytics, key, value);
			}
		} catch (error) {
			crashReportingLog.warn('Failed to set tag', error);
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
					setAttribute(this.crashlytics!, key, value);
				});
			}
		} catch (error) {
			crashReportingLog.warn('Failed to set tags', error);
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
			crashReportingLog.warn('Failed to set user feedback', error);
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
			crashReportingLog.warn('Failed to flush events', error);
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
				setUserId(this.crashlytics, '');
				// Note: Crashlytics doesn't have a direct way to clear all attributes
			}

			crashReportingLog.debug('Context cleared');
		} catch (error) {
			crashReportingLog.warn('Failed to clear context', error);
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
			crashReportingLog.warn('Failed to get session ID', error);
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
			crashReportingLog.warn('Failed to set release', error);
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
			crashReportingLog.warn('Failed to set environment', error);
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

			crashReportingLog.debug('Unhandled rejection capture setup');
		} catch (error) {
			crashReportingLog.warn(
				'Failed to setup unhandled rejection capture',
				error
			);
		}
	}

	/**
	 * Test all crash reporting features
	 */
	async testAllFeatures(): Promise<void> {
		if (!__DEV__) {
			crashReportingLog.debug('Testing only available in development');
			return;
		}

		try {
			crashReportingLog.debug('Testing all crash reporting features');

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

			crashReportingLog.info('All features tested successfully');
		} catch (error) {
			crashReportingLog.warn('Failed to test all features', error);
		}
	}
}

// Export singleton instance
export const crashReporting = new CrashReportingService();
