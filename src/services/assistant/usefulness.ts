// Usefulness Score - Evaluates response quality and triggers escalation
// Prevents "empty" or templated replies from reaching users

import type { ChatResponse } from './responseSchema';

const FILLER_OPENERS = [
	/^i can help with that/i,
	/^let me/i,
	/^here's how/i,
	/^sure[,!]?/i,
];

/**
 * Score the usefulness of a response (0-10 scale)
 * Higher scores indicate more useful responses
 */
export function scoreUsefulness(resp: ChatResponse, userQ?: string): number {
	let s = 0;
	const msg = resp.message ?? '';
	const details = resp.details ?? '';

	// concrete numbers
	if (/\$[\d,]/.test(msg + ' ' + details)) s++;
	if (/\b\d+%|\b\d+(?:\.\d+)?\b/.test(msg)) s++;

	// actionable
	if ((resp.actions?.length ?? 0) > 0) s++;

	// grounded (non-placeholder)
	if (resp.sources?.some((src) => src.kind && src.kind !== 'cache')) s++;

	// cards with real content
	if (resp.cards && resp.cards.length > 0) s++;

	// insights
	if (resp.insights && resp.insights.length > 0) s++;

	// directness bonus
	if (answersTheQuestion(msg, userQ)) s += 2;

	// penalties
	if (FILLER_OPENERS.some((rx) => rx.test(msg))) s--;
	if (/^(please add|i need|first add|to get started|to help you)/i.test(msg))
		s--;

	return s;
}

export function answersTheQuestion(message: string, userQ?: string): boolean {
	if (!message) return false;
	// quick "is not a question" + contains domain tokens
	const domainHit =
		/\b(budget|savings|debt|income|expense|goal|emergency|apr|apy|interest|retirement|subscription|transaction)\b/i.test(
			message
		);
	const notJustAQuestion = message.length > 24 && !/[?]\s*$/.test(message);

	// cheap term overlap bonus when userQ is provided
	let overlap = 0;
	if (userQ) {
		const qTokens = new Set(userQ.toLowerCase().match(/[a-z]+/g) ?? []);
		const aTokens = new Set(message.toLowerCase().match(/[a-z]+/g) ?? []);
		let hits = 0,
			total = 0;
		for (const t of qTokens) {
			if (t.length < 3) continue;
			total++;
			if (aTokens.has(t)) hits++;
		}
		overlap = total ? hits / total : 0;
	}

	return (notJustAQuestion && domainHit) || overlap >= 0.25;
}

// Determine if response should be escalated based on usefulness score
export function shouldEscalate(
	resp: ChatResponse,
	complexity: 'low' | 'medium' | 'high'
): boolean {
	const score = scoreUsefulness(resp);

	// Escalate if usefulness is too low and complexity allows for LLM
	if (score < 3 && complexity !== 'high') {
		return true;
	}

	// Escalate if response contains generic fallback patterns
	if (
		resp.message &&
		(resp.message.includes('general financial context available') ||
			resp.message.includes('I can partially help') ||
			resp.message.includes('limited analysis'))
	) {
		return true;
	}

	// Escalate if no actionable content
	if (score < 2 && !resp.actions?.length) {
		return true;
	}

	return false;
}

// Get escalation reason for logging
export function getEscalationReason(resp: ChatResponse): string {
	const score = scoreUsefulness(resp);

	if (score < 2) return 'insufficient_usefulness';
	if (resp.message?.includes('general financial context available'))
		return 'generic_fallback';
	if (!resp.actions?.length) return 'no_actions';
	if (score < 3) return 'low_usefulness_score';

	return 'unknown';
}
