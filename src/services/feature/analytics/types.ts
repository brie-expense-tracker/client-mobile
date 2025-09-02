// analytics/types.ts - Core event types for AI evaluation & monitoring
// No PII collected, focused on actionable insights for improving AI quality

export type RouteDecided = {
	type: 'ai.route_decided';
	intent: string;
	p: number;
	route: 'grounded' | 'mini' | 'pro' | 'fallback';
	calibrated: boolean;
	token_budget: number;
	session_id: string;
	message_id: string;
	timestamp: number;
};

export type GuardrailViolation = {
	type: 'ai.guardrail_violation';
	violation_type:
		| 'unknown_amount'
		| 'mismatched_sum'
		| 'out_of_window_date'
		| 'claims_forbidden_phrase'
		| 'missing_disclaimer'
		| 'references_missing_fact';
	details?: Record<string, any>;
	factPackHash: string;
	session_id: string;
	message_id: string;
	timestamp: number;
};

export type FallbackUsed = {
	type: 'ai.fallback_used';
	reason: 'missing_data' | 'ambiguous' | 'guard_failed' | 'rate_limited';
	session_id: string;
	message_id: string;
	timestamp: number;
};

export type UserOutcome = {
	type: 'ai.user_outcome';
	resolved: boolean;
	cta_taken: string | null;
	session_id: string;
	message_id: string;
	timestamp: number;
};

export type CostSummary = {
	type: 'ai.cost_summary';
	model: 'mini' | 'standard' | 'pro';
	input_tokens: number;
	output_tokens: number;
	cache_hit?: boolean;
	session_id: string;
	message_id: string;
	timestamp: number;
};

export type ShadowResult = {
	type: 'ai.shadow_result';
	agree: boolean;
	current_meta: {
		route: string;
		model: string;
		tokens: number;
	};
	candidate_meta: {
		route: string;
		model: string;
		tokens: number;
	};
	session_id: string;
	message_id: string;
	timestamp: number;
};

export type AnalyticsEvent =
	| RouteDecided
	| GuardrailViolation
	| FallbackUsed
	| UserOutcome
	| CostSummary
	| ShadowResult;

// Helper type for events without auto-generated fields
export type AnalyticsEventInput = Omit<AnalyticsEvent, 'timestamp'>;
