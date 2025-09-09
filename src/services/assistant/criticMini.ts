// Critic Rules - Blocks low-value cards and triggers escalation
// Simple guards to prevent generic or templated responses

import { ChatResponse } from './responseSchema';

export function criticChecks(resp: ChatResponse): string[] {
	const issues: string[] = [];
	const text = `${resp.message} ${resp.details ?? ''}`.trim();

	// Check for completely empty responses
	if (!text || text.trim().length === 0) {
		issues.push('empty');
	}

	// Check for very short responses (less than 10 characters)
	if (text.length < 10) {
		issues.push('too_short');
	}

	// Check for obvious error patterns
	if (
		text.includes('Error:') ||
		text.includes('Failed to') ||
		text.includes('undefined')
	) {
		issues.push('error_pattern');
	}

	// Only check for generic patterns if the response is very short
	if (text.length < 30 && /general financial context available/i.test(text)) {
		issues.push('generic');
	}

	return issues;
}

// Determine if response should be blocked
export function shouldBlockResponse(resp: ChatResponse): boolean {
	const issues = criticChecks(resp);

	// Only block if critical issues found (empty, too short, or error patterns)
	const criticalIssues = issues.filter(
		(issue) =>
			issue === 'empty' || issue === 'too_short' || issue === 'error_pattern'
	);

	return criticalIssues.length > 0;
}

// Get blocking reason for logging
export function getBlockingReason(resp: ChatResponse): string {
	const issues = criticChecks(resp);
	return issues.join(', ');
}
