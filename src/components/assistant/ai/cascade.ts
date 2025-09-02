// ai/cascade.ts - Decision logic (when to clarify vs. escalate)

import {
	WriterOutput,
	CriticReport,
	CascadeDecision,
	GuardReport,
	GuardFailure,
} from './types';
import { FactPack } from '../factPack';
import { guardNumbers } from './guards/numbers';
import { guardTimeStamp } from './guards/window';
import { guardClaims } from './guards/claims';

export function decide(
	out: WriterOutput,
	critic: CriticReport,
	factPack: FactPack
): CascadeDecision {
	// Hard guards first - run all validators
	const guards: GuardReport[] = [
		guardNumbers(out, factPack),
		guardTimeStamp(out, factPack),
		guardClaims(out),
	];

	const flatFailures = guards.flatMap((g) => g.failures);

	// If writer itself asked to clarify
	if (out.requires_clarification) {
		return { path: 'clarify', reason: 'writer_requires_clarification' };
	}

	// Guard fails → either clarify (if easy) or escalate
	if (flatFailures.length > 0) {
		const easy = flatFailures.every((f) =>
			['missing_disclaimer', 'out_of_window_date'].includes(f)
		);

		return easy
			? { path: 'clarify', reason: 'guard_fail_easy' }
			: { path: 'escalate', reason: `guard_fail_${flatFailures.join(',')}` };
	}

	// Critic logic
	if (!critic.ok) {
		if (critic.recommend_escalation || critic.risk === 'high') {
			return { path: 'escalate', reason: 'critic_recommends' };
		}
		return { path: 'clarify', reason: 'critic_ambiguity' };
	}

	// High-stakes content automatically escalates
	if (out.content_kind === 'strategy' && critic.risk === 'medium') {
		return { path: 'escalate', reason: 'high_stakes_strategy' };
	}

	return { path: 'return' };
}

/**
 * Check if this is a high-stakes query that should bypass the cascade
 */
export function isHighStakesQuery(query: string): boolean {
	const highStakesPatterns = [
		/rebuild.*\d+.*month.*savings/i,
		/rebuild.*\d+.*month.*plan/i,
		/emergency.*fund.*plan/i,
		/retirement.*plan.*strategy/i,
		/debt.*payoff.*plan/i,
		/major.*purchase.*plan/i,
		/life.*insurance.*plan/i,
		/estate.*planning/i,
		/consolidate.*debt/i,
		/optimize.*taxes/i,
		/investment.*strategy/i,
		/financial.*planning/i,
		/wealth.*management/i,
		/six.*month.*plan/i,
		/long.*term.*strategy/i,
	];

	return highStakesPatterns.some((pattern) =>
		pattern.test(query.toLowerCase())
	);
}

/**
 * Get the escalation reason for analytics
 */
export function getEscalationReason(
	guardFailures: GuardFailure[],
	criticIssues: any[],
	contentKind: string
): string {
	if (guardFailures.length > 0) {
		return `guard_fail_${guardFailures.join(',')}`;
	}

	if (criticIssues.length > 0) {
		const issueTypes = criticIssues.map((i) => i.type);
		return `critic_${issueTypes.join(',')}`;
	}

	if (contentKind === 'strategy') {
		return 'high_stakes_strategy';
	}

	return 'unknown';
}

/**
 * Check if escalation is recommended based on multiple factors
 */
export function shouldEscalate(
	guardFailures: GuardFailure[],
	criticReport: CriticReport,
	contentKind: string,
	userQuery: string
): boolean {
	// Critical guard failures always escalate
	if (
		guardFailures.some((f) =>
			['unknown_amount', 'mismatched_sum', 'claims_forbidden_phrase'].includes(
				f
			)
		)
	) {
		return true;
	}

	// High-stakes queries escalate
	if (isHighStakesQuery(userQuery)) {
		return true;
	}

	// Strategy content with medium+ risk escalates
	if (contentKind === 'strategy' && criticReport.risk !== 'low') {
		return true;
	}

	// Critic explicitly recommends escalation
	if (criticReport.recommend_escalation) {
		return true;
	}

	return false;
}
