// piiScrubbing.ts - PII (Personally Identifiable Information) scrubbing utilities
// Removes sensitive data from logs, analytics, and error reports

import { PII_PATTERNS } from '../config/telemetry';

export interface PIIOptions {
	scrubEmails?: boolean;
	scrubPhones?: boolean;
	scrubCreditCards?: boolean;
	scrubSSNs?: boolean;
	scrubBankAccounts?: boolean;
	scrubAmounts?: boolean;
	scrubDates?: boolean;
	customPatterns?: RegExp[];
	replacement?: string;
}

const DEFAULT_PII_OPTIONS: PIIOptions = {
	scrubEmails: true,
	scrubPhones: true,
	scrubCreditCards: true,
	scrubSSNs: true,
	scrubBankAccounts: true,
	scrubAmounts: true,
	scrubDates: true,
	replacement: '[REDACTED]',
};

/**
 * Scrub PII from a string based on configured patterns
 */
export function scrubPII(input: string, options: PIIOptions = {}): string {
	try {
		if (!input || typeof input !== 'string') return input;

		const config = { ...DEFAULT_PII_OPTIONS, ...options };
		let result = input;

		// Apply built-in patterns with error handling
		if (config.scrubEmails && PII_PATTERNS.EMAIL) {
			try {
				result = result.replace(PII_PATTERNS.EMAIL, config.replacement!);
			} catch (error) {
				console.warn('Failed to scrub emails:', error);
			}
		}

		if (config.scrubPhones && PII_PATTERNS.PHONE) {
			try {
				result = result.replace(PII_PATTERNS.PHONE, config.replacement!);
			} catch (error) {
				console.warn('Failed to scrub phones:', error);
			}
		}

		if (config.scrubCreditCards && PII_PATTERNS.CREDIT_CARD) {
			try {
				result = result.replace(PII_PATTERNS.CREDIT_CARD, config.replacement!);
			} catch (error) {
				console.warn('Failed to scrub credit cards:', error);
			}
		}

		if (config.scrubSSNs && PII_PATTERNS.SSN) {
			try {
				result = result.replace(PII_PATTERNS.SSN, config.replacement!);
			} catch (error) {
				console.warn('Failed to scrub SSNs:', error);
			}
		}

		if (config.scrubBankAccounts && PII_PATTERNS.BANK_ACCOUNT) {
			try {
				result = result.replace(PII_PATTERNS.BANK_ACCOUNT, config.replacement!);
			} catch (error) {
				console.warn('Failed to scrub bank accounts:', error);
			}
		}

		if (config.scrubAmounts && PII_PATTERNS.AMOUNT) {
			try {
				result = result.replace(PII_PATTERNS.AMOUNT, config.replacement!);
			} catch (error) {
				console.warn('Failed to scrub amounts:', error);
			}
		}

		if (config.scrubDates && PII_PATTERNS.DATE) {
			try {
				result = result.replace(PII_PATTERNS.DATE, config.replacement!);
			} catch (error) {
				console.warn('Failed to scrub dates:', error);
			}
		}

		// Apply custom patterns
		if (config.customPatterns) {
			config.customPatterns.forEach((pattern) => {
				try {
					result = result.replace(pattern, config.replacement!);
				} catch (error) {
					console.warn('Failed to apply custom PII pattern:', error);
				}
			});
		}

		return result;
	} catch (error) {
		console.warn('Failed to scrub PII:', error);
		return input; // Return original input if scrubbing fails
	}
}

/**
 * Scrub PII from an object recursively
 */
export function scrubPIIFromObject(obj: any, options: PIIOptions = {}): any {
	try {
		if (obj === null || obj === undefined) {
			return obj;
		}

		if (typeof obj === 'string') {
			return scrubPII(obj, options);
		}

		if (Array.isArray(obj)) {
			return obj.map((item) => scrubPIIFromObject(item, options));
		}

		if (typeof obj === 'object') {
			const scrubbed: any = {};
			for (const [key, value] of Object.entries(obj)) {
				try {
					// Skip certain keys that might contain sensitive data
					if (
						key.toLowerCase().includes('password') ||
						key.toLowerCase().includes('secret') ||
						key.toLowerCase().includes('token') ||
						key.toLowerCase().includes('key')
					) {
						scrubbed[key] = '[REDACTED]';
					} else {
						scrubbed[key] = scrubPIIFromObject(value, options);
					}
				} catch (error) {
					console.warn(`Failed to scrub object key ${key}:`, error);
					scrubbed[key] = '[ERROR]';
				}
			}
			return scrubbed;
		}

		return obj;
	} catch (error) {
		console.warn('Failed to scrub PII from object:', error);
		return '[ERROR]';
	}
}

/**
 * Scrub PII from error objects
 */
export function scrubError(error: Error, options: PIIOptions = {}): Error {
	try {
		if (!error || typeof error !== 'object') {
			return new Error('[INVALID_ERROR]');
		}

		const scrubbedError = new Error(scrubPII(error.message || '', options));
		scrubbedError.name = error.name || 'Error';
		scrubbedError.stack = error.stack
			? scrubPII(error.stack, options)
			: undefined;

		// Copy any additional properties
		try {
			Object.getOwnPropertyNames(error).forEach((key) => {
				if (key !== 'name' && key !== 'message' && key !== 'stack') {
					try {
						(scrubbedError as any)[key] = scrubPIIFromObject(
							(error as any)[key],
							options
						);
					} catch (propError) {
						console.warn(`Failed to scrub error property ${key}:`, propError);
						(scrubbedError as any)[key] = '[ERROR]';
					}
				}
			});
		} catch (propError) {
			console.warn('Failed to scrub error properties:', propError);
		}

		return scrubbedError;
	} catch (error) {
		console.warn('Failed to scrub error:', error);
		return new Error('[SCRUBBING_ERROR]');
	}
}

/**
 * Scrub PII from analytics events
 */
export function scrubAnalyticsEvent(event: any, options: PIIOptions = {}): any {
	try {
		if (!event || typeof event !== 'object') {
			return event;
		}

		// Create a copy to avoid mutating the original
		const scrubbedEvent = { ...event };

		// Scrub common analytics fields that might contain PII
		const fieldsToScrub = [
			'message',
			'query',
			'response',
			'context',
			'details',
			'description',
			'reason',
			'error',
			'stack',
		];

		fieldsToScrub.forEach((field) => {
			try {
				if (scrubbedEvent[field]) {
					scrubbedEvent[field] = scrubPIIFromObject(
						scrubbedEvent[field],
						options
					);
				}
			} catch (fieldError) {
				console.warn(`Failed to scrub analytics field ${field}:`, fieldError);
				scrubbedEvent[field] = '[ERROR]';
			}
		});

		return scrubbedEvent;
	} catch (error) {
		console.warn('Failed to scrub analytics event:', error);
		return { error: '[SCRUBBING_ERROR]' };
	}
}

/**
 * Check if a string contains PII patterns
 */
export function containsPII(input: string): boolean {
	try {
		if (!input || typeof input !== 'string') return false;

		return Object.values(PII_PATTERNS).some((pattern) => {
			try {
				return (
					pattern &&
					pattern.test &&
					typeof pattern.test === 'function' &&
					pattern.test(input)
				);
			} catch (error) {
				console.warn('Failed to test PII pattern:', error);
				return false;
			}
		});
	} catch (error) {
		console.warn('Failed to check for PII:', error);
		return false;
	}
}

/**
 * Get a summary of PII found in a string
 */
export function getPIISummary(input: string): Record<string, number> {
	try {
		if (!input || typeof input !== 'string') return {};

		const summary: Record<string, number> = {};

		Object.entries(PII_PATTERNS).forEach(([type, pattern]) => {
			try {
				if (pattern && pattern.test && typeof pattern.test === 'function') {
					const matches = input.match(pattern);
					summary[type] = matches ? matches.length : 0;
				} else {
					summary[type] = 0;
				}
			} catch (error) {
				console.warn(`Failed to get PII summary for ${type}:`, error);
				summary[type] = 0;
			}
		});

		return summary;
	} catch (error) {
		console.warn('Failed to get PII summary:', error);
		return {};
	}
}
