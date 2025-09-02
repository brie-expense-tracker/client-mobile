// ai/types.ts - Shared types for Writer → Checker → Improver cascade

export type GuardFailure =
	| 'unknown_amount'
	| 'mismatched_sum'
	| 'out_of_window_date'
	| 'claims_forbidden_phrase'
	| 'missing_disclaimer'
	| 'references_missing_fact';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface WriterOutput {
	version: '1.0';
	// Human text you'll show (but keep numbers minimal; see guard below)
	answer_text: string;

	// Canonical pointers back to facts
	used_fact_ids: string[]; // e.g., ["bud_groceries_2025-08","bal_chk_1"]

	// Model must echo any dollar amounts it shows
	numeric_mentions: Array<{
		value: number;
		unit: 'USD';
		kind: 'spent' | 'limit' | 'remaining' | 'balance' | 'forecast';
		fact_id?: string;
	}>;

	// If the writer thinks it needs info before answering confidently
	requires_clarification: boolean;
	clarifying_questions?: string[]; // short, 1-tap friendly
	suggested_actions?: Array<{
		label: string;
		action: 'OPEN_BUDGET' | 'CONNECT_ACCOUNT' | 'ADJUST_LIMIT';
		payload?: any;
	}>;

	// Tag when it's strategy/opinion vs. status
	content_kind: 'status' | 'explanation' | 'strategy';

	// The writer can flag uncertainty (critic will double-check)
	uncertainty_notes?: string[];
}

export interface GuardReport {
	ok: boolean;
	failures: GuardFailure[];
	details?: Record<string, any>;
}

export interface CriticReport {
	ok: boolean;
	issues: Array<
		| { type: 'ambiguity'; note: string }
		| { type: 'safety'; note: string }
		| { type: 'factuality'; note: string }
		| { type: 'missing_disclaimer'; note: string }
	>;
	risk: RiskLevel; // classify impact to user decisions
	recommend_escalation: boolean; // if true, go Pro
}

export interface CascadeDecision {
	path: 'return' | 'clarify' | 'escalate';
	reason?: string;
}

export interface CascadeResult {
	kind: 'answer' | 'clarify' | 'escalated';
	data: WriterOutput | ClarifyUI | EscalatedResponse;
	analytics: {
		writer_tokens: number;
		critic_tokens: number;
		improver_tokens?: number;
		guard_failures: GuardFailure[];
		decision_path: string;
		decision_reason?: string;
	};
}

export interface ClarifyUI {
	question: string;
	options: Array<{
		label: string;
		action: string;
		payload?: any;
	}>;
}

export interface EscalatedResponse {
	improved_answer: WriterOutput;
	escalation_reason: string;
	risk_level: RiskLevel;
}
