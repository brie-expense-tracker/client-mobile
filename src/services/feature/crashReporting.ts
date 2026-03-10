// crashReporting.ts - Crash reporting via Firebase Crashlytics only (no Sentry).
// PII scrubbing and user consent are respected before recording.

import { TELEMETRY_CONFIG } from '../../config/telemetry';
import { scrubError, scrubAnalyticsEvent } from '../../utils/piiScrubbing';
import { featureFlags } from './featureFlags';
import { createLogger } from '../../utils/sublogger';

const crashReportingLog = createLogger('CrashReporting');

export interface CrashReportingOptions {
	enableCrashlytics?: boolean;
	enablePIIScrubbing?: boolean;
	userConsent?: boolean;
	environment?: string;
}

export interface CrashContext {
	user_id?: string;
	session_id?: string;
	screen?: string;
	action?: string;
	additional_data?: Record<string, unknown>;
}

export class CrashReportingService {
	private options: Required<
		Omit<CrashReportingOptions, 'environment'> & { environment: string }
	>;
	private isInitialized = false;
	private crashlytics: ReturnType<
		typeof import('@react-native-firebase/crashlytics')['getCrashlytics']
	> | null = null;

	constructor(options: CrashReportingOptions = {}) {
		this.options = {
			enableCrashlytics: options.enableCrashlytics ?? true,
			enablePIIScrubbing:
				options.enablePIIScrubbing ??
				TELEMETRY_CONFIG.LOGGING.PII_SCRUBBING_ENABLED,
			userConsent: options.userConsent ?? false,
			environment:
				options.environment ?? TELEMETRY_CONFIG.ENVIRONMENT ?? 'production',
		};
	}

	async initialize(): Promise<void> {
		if (this.isInitialized) return;

		try {
			if (!featureFlags.isCrashReportingEnabled()) {
				crashReportingLog.info('Disabled by feature flag');
				this.isInitialized = true;
				return;
			}

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

	private async initializeCrashlytics(): Promise<void> {
		try {
			const {
				getCrashlytics,
				setCrashlyticsCollectionEnabled,
				log,
				setAttribute,
			} = await import('@react-native-firebase/crashlytics');

			if (!getCrashlytics || typeof getCrashlytics !== 'function') {
				crashReportingLog.warn('Crashlytics import failed or invalid');
				return;
			}

			const instance = getCrashlytics();
			if (!instance) {
				crashReportingLog.warn('Crashlytics instance not properly initialized');
				return;
			}

			this.crashlytics = instance;

			try {
				await setCrashlyticsCollectionEnabled(instance, !__DEV__);
			} catch (error) {
				crashReportingLog.warn(
					'Failed to set Crashlytics collection enabled',
					error
				);
			}

			try {
				log(instance, 'App started');
			} catch (error) {
				crashReportingLog.warn('Failed to log app start', error);
			}

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

	async setUserConsent(consent: boolean): Promise<void> {
		try {
			this.options.userConsent = consent;

			if (this.crashlytics) {
				try {
					const shouldEnable = consent && !__DEV__;
					const { setCrashlyticsCollectionEnabled } = await import(
						'@react-native-firebase/crashlytics'
					);
					setCrashlyticsCollectionEnabled(this.crashlytics, shouldEnable);
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

	async setUserContext(
		userId: string,
		additionalData?: Record<string, unknown>
	): Promise<void> {
		if (!this.isInitialized || !this.options.userConsent) return;

		try {
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

	async setContext(key: string, value: unknown): Promise<void> {
		if (!this.isInitialized || !this.options.userConsent) return;

		try {
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

	async captureError(error: Error, context?: CrashContext): Promise<void> {
		if (!this.isInitialized || !this.options.userConsent) return;

		try {
			const processedError = this.options.enablePIIScrubbing
				? scrubError(error)
				: error;

			const processedContext =
				context && this.options.enablePIIScrubbing
					? scrubAnalyticsEvent(context as Record<string, unknown>)
					: context;

			if (this.crashlytics) {
				const { recordError, log } = await import(
					'@react-native-firebase/crashlytics'
				);
				if (processedContext?.action) {
					try {
						log(this.crashlytics, `captureError: ${processedContext.action}`);
					} catch {
						// non-fatal
					}
				}
				recordError(this.crashlytics, processedError);
			}

			crashReportingLog.debug('Error captured', {
				message: processedError.message,
			});
		} catch (reportingError) {
			crashReportingLog.warn('Failed to capture error', reportingError);
		}
	}

	captureMessage(
		message: string,
		_level: 'info' | 'warning' | 'error' = 'info',
		_context?: CrashContext
	): void {
		if (!this.isInitialized || !this.options.userConsent) return;

		try {
			const processedMessage = this.options.enablePIIScrubbing
				? scrubError(new Error(message)).message
				: message;

			if (this.crashlytics) {
				import('@react-native-firebase/crashlytics')
					.then(({ log }) => {
						if (this.crashlytics) {
							log(this.crashlytics, processedMessage);
						}
					})
					.catch(() => {});
			}

			crashReportingLog.debug('Message captured', { message: processedMessage });
		} catch (error) {
			crashReportingLog.warn('Failed to capture message', error);
		}
	}

	addBreadcrumb(
		message: string,
		_category: string,
		_data?: Record<string, unknown>
	): void {
		if (!this.isInitialized || !this.options.userConsent || !this.crashlytics)
			return;
		try {
			import('@react-native-firebase/crashlytics').then(({ log }) => {
				if (this.crashlytics) {
					log(this.crashlytics, message);
				}
			});
		} catch {
			// ignore
		}
	}

	testCrashReporting(): void {
		if (__DEV__) {
			crashReportingLog.debug('Testing crash reporting (Crashlytics only)');
			this.captureMessage('Test message from development', 'info', {
				screen: 'test',
				action: 'test_crash_reporting',
			});
		}
	}

	async testCrashlytics(): Promise<void> {
		if (__DEV__ && this.crashlytics) {
			try {
				crashReportingLog.debug('Testing Crashlytics');
				const { log, setAttribute, recordError } = await import(
					'@react-native-firebase/crashlytics'
				);
				if (this.crashlytics) {
					log(this.crashlytics, 'Test log from development');
					setAttribute(this.crashlytics, 'test_attribute', 'test_value');
					recordError(
						this.crashlytics,
						new Error('Test error from development')
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

	getStatus(): {
		isInitialized: boolean;
		enableCrashlytics: boolean;
		enablePIIScrubbing: boolean;
		userConsent: boolean;
		environment: string;
	} {
		return {
			isInitialized: this.isInitialized,
			enableCrashlytics: this.options.enableCrashlytics,
			enablePIIScrubbing: this.options.enablePIIScrubbing,
			userConsent: this.options.userConsent,
			environment: this.options.environment,
		};
	}

	// No-op stubs for APIs that previously targeted Sentry (callers may still exist)
	startTransaction(_name: string, _operation: string): null {
		return null;
	}
	finishTransaction(_transaction: unknown): void {}
	addSpan(_transaction: unknown, _name: string, _operation: string): null {
		return null;
	}
	finishSpan(_span: unknown): void {}

	async setTag(key: string, value: string): Promise<void> {
		if (!this.isInitialized || !this.options.userConsent || !this.crashlytics)
			return;
		try {
			const { setAttribute } = await import(
				'@react-native-firebase/crashlytics'
			);
			setAttribute(this.crashlytics, key, value);
		} catch (error) {
			crashReportingLog.warn('Failed to set tag', error);
		}
	}

	async setTags(tags: Record<string, string>): Promise<void> {
		if (!this.isInitialized || !this.options.userConsent || !this.crashlytics)
			return;
		try {
			const { setAttribute } = await import(
				'@react-native-firebase/crashlytics'
			);
			Object.entries(tags).forEach(([key, value]) => {
				setAttribute(this.crashlytics!, key, value);
			});
		} catch (error) {
			crashReportingLog.warn('Failed to set tags', error);
		}
	}

	setUserFeedback(_feedback: {
		eventId: string;
		name: string;
		email: string;
		comments: string;
	}): void {
		// Not supported without Sentry; use Crashlytics console for feedback
	}

	async flush(_timeout?: number): Promise<boolean> {
		return false;
	}

	async clearContext(): Promise<void> {
		if (!this.isInitialized || !this.crashlytics) return;
		try {
			const { setUserId } = await import(
				'@react-native-firebase/crashlytics'
			);
			setUserId(this.crashlytics, '');
			crashReportingLog.debug('Context cleared');
		} catch (error) {
			crashReportingLog.warn('Failed to clear context', error);
		}
	}

	getSessionId(): string | null {
		return null;
	}

	setRelease(_release: string): void {}
	setEnvironment(environment: string): void {
		this.options.environment = environment;
	}

	setupUnhandledRejectionCapture(): void {
		if (!this.isInitialized) return;
		try {
			global.addEventListener?.('unhandledrejection', (event) => {
				void this.captureError(
					new Error(`Unhandled Promise Rejection: ${event.reason}`),
					{
						action: 'unhandled_promise_rejection',
						additional_data: {
							reason: event.reason,
						} as Record<string, unknown>,
					}
				);
			});
			global.addEventListener?.('error', (event) => {
				void this.captureError(
					new Error(`Uncaught Exception: ${event.error}`),
					{
						action: 'uncaught_exception',
						additional_data: {
							error: event.error,
						} as Record<string, unknown>,
					}
				);
			});
			crashReportingLog.debug('Unhandled rejection capture setup');
		} catch (error) {
			crashReportingLog.warn(
				'Failed to setup unhandled rejection capture',
				error
			);
		}
	}

	async testAllFeatures(): Promise<void> {
		if (!__DEV__) return;
		try {
			this.captureMessage('Test message', 'info', {
				action: 'test_all_features',
			});
			await this.captureError(new Error('Test error'), {
				action: 'test_error_capture',
			});
			this.addBreadcrumb('Test breadcrumb', 'test', {});
			await this.setTag('test_tag', 'test_value');
			await this.testCrashlytics();
			crashReportingLog.info('All features tested successfully');
		} catch (error) {
			crashReportingLog.warn('Failed to test all features', error);
		}
	}
}

export const crashReporting = new CrashReportingService();
