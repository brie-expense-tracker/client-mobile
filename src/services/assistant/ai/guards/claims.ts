// ai/guards/claims.ts - Claim-type linter (phrases to forbid + require disclaimers)

import { WriterOutput, GuardReport, GuardFailure } from '../types';

const FORBIDDEN = [
	/guarantee/i,
	/guaranteed/i,
	/surefire/i,
	/risk\-free/i,
	/certainly will/i,
	/can't lose/i,
	/never fail/i,
	/always win/i,
	/100% success/i,
	/guaranteed profit/i,
	/sure thing/i,
	/invest all money/i,
	/put everything in/i,
	/mortgage house invest/i,
	/borrow invest/i,
	/credit card invest/i,
	/will certainly/i,
	/definitely will/i,
	/absolutely will/i,
	/cannot fail/i,
	/impossible to lose/i,
	/guaranteed return/i,
	/promise.*return/i,
	/assure.*profit/i,
];

export function guardClaims(out: WriterOutput): GuardReport {
	const failures: GuardFailure[] = [];

	// Check for forbidden patterns
	const bad = FORBIDDEN.some((rx) => rx.test(out.answer_text));
	if (bad) {
		failures.push('claims_forbidden_phrase');
	}

	// Require specific educational disclaimer for strategy content
	if (
		out.content_kind === 'strategy' &&
		!/These are educational insights, not financial advice/i.test(
			out.answer_text
		)
	) {
		failures.push('missing_disclaimer');
	}

	// Additional safety checks for high-risk content
	if (out.content_kind === 'strategy') {
		const highRiskPatterns = [
			/invest.*all/i,
			/borrow.*invest/i,
			/mortgage.*invest/i,
			/credit.*card.*invest/i,
			/put.*everything.*invest/i,
			/leverage.*invest/i,
			/margin.*invest/i,
		];

		if (highRiskPatterns.some((pattern) => pattern.test(out.answer_text))) {
			failures.push('claims_forbidden_phrase');
		}
	}

	return {
		ok: failures.length === 0,
		failures,
		details: {
			contentKind: out.content_kind,
			hasForbiddenPhrases: bad,
			requiresDisclaimer: out.content_kind === 'strategy',
			disclaimerRequired: out.content_kind === 'strategy',
		},
	};
}
