/**
 * PII scrubbing for log output and Sentry/crash reporting.
 * Redacts emails, phone numbers, and other common personal identifiers.
 */

/** Scrubs common PII patterns from a string. */
export function scrubPII(text: string): string {
	if (typeof text !== 'string') return text;

	return (
		text
			// Email addresses (keep domain hint for debugging, redact local part)
			.replace(
				/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
				(_, _local, domain) => `***@${domain}`
			)
			// US-style phone numbers (with optional separators)
			.replace(
				/\b(\+?1?[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
				'***-***-****'
			)
			// Generic 10–15 digit sequences that might be phone/ID (conservative)
			.replace(/\b\d{10,15}\b/g, (m) => '*'.repeat(Math.min(m.length, 10)))
			// SSN-like XXX-XX-XXXX
			.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****')
	);
}

/** Scrubs PII from an Error's message; returns a new Error so the original is not mutated. */
export function scrubError(error: Error): Error {
	const scrubbedMessage = scrubPII(error.message);
	return new Error(scrubbedMessage);
}

/** Recursively scrubs string values in an object (for Sentry context/breadcrumbs). */
export function scrubAnalyticsEvent<T>(data: T): T {
	if (data === null || data === undefined) {
		return data;
	}
	if (typeof data === 'string') {
		return scrubPII(data) as T;
	}
	if (Array.isArray(data)) {
		return data.map((item) => scrubAnalyticsEvent(item)) as T;
	}
	if (typeof data === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(data)) {
			out[k] = scrubAnalyticsEvent(v);
		}
		return out as T;
	}
	return data;
}
