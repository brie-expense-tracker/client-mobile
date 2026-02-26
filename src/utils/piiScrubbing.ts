/**
 * PII Scrubbing for client-side logging
 * Redacts personally identifiable information from log messages
 */

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_REGEX = /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g;
const SSN_REGEX = /\b\d{3}-?\d{2}-?\d{4}\b/g;
const CREDIT_CARD_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;

/**
 * Scrub PII from a string. Used by the logger to avoid leaking PII in logs.
 */
export function scrubPII(text: string): string {
	return text
		.replace(EMAIL_REGEX, '[email]')
		.replace(PHONE_REGEX, '[phone]')
		.replace(SSN_REGEX, '[ssn]')
		.replace(CREDIT_CARD_REGEX, '[card]');
}
