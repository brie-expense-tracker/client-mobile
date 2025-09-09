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
	numeric_mentions: {
		value: number;
		unit: 'USD';
		kind: 'spent' | 'limit' | 'remaining' | 'balance' | 'forecast';
		fact_id?: string;
	}[];

	// If the writer thinks it needs info before answering confidently
	requires_clarification: boolean;
	clarifying_questions?: string[]; // short, 1-tap friendly
	suggested_actions?: {
		label: string;
		action: 'OPEN_BUDGET' | 'CONNECT_ACCOUNT' | 'ADJUST_LIMIT';
		payload?: any;
	}[];

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
	issues: (
		| { type: 'ambiguity'; note: string }
		| { type: 'safety'; note: string }
		| { type: 'factuality'; note: string }
		| { type: 'missing_disclaimer'; note: string }
	)[];
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
	options: {
		label: string;
		action: string;
		payload?: any;
	}[];
}

export interface EscalatedResponse {
	improved_answer: WriterOutput;
	escalation_reason: string;
	risk_level: RiskLevel;
}

// Enhanced AI system types
export interface AIRequest {
	id: string;
	user_id: string;
	message: string;
	context: Record<string, any>;
	timestamp: number;
	metadata?: {
		session_id?: string;
		conversation_id?: string;
		user_agent?: string;
		platform?: string;
	};
}

export interface AIResponse {
	id: string;
	request_id: string;
	content: WriterOutput | ClarifyUI | EscalatedResponse;
	processing_time: number;
	model_used: string;
	tokens_used: {
		prompt: number;
		completion: number;
		total: number;
	};
	quality_score?: number;
	confidence_score?: number;
	timestamp: number;
}

// Error handling types
export interface AIError {
	code: string;
	message: string;
	details?: Record<string, any>;
	stack?: string;
	timestamp: number;
	request_id?: string;
}

export interface ValidationError extends AIError {
	field: string;
	value: any;
	constraint: string;
}

// Model configuration types
export interface ModelConfig {
	name: string;
	version: string;
	max_tokens: number;
	temperature: number;
	top_p: number;
	frequency_penalty: number;
	presence_penalty: number;
	stop_sequences?: string[];
}

export interface ModelCapabilities {
	supports_streaming: boolean;
	supports_function_calling: boolean;
	supports_vision: boolean;
	supports_audio: boolean;
	max_context_length: number;
	response_time_ms: number;
}

// Quality assurance types
export interface QualityCheck {
	score: number;
	dimensions: {
		accuracy: number;
		relevance: number;
		completeness: number;
		clarity: number;
		safety: number;
	};
	flags: string[];
	recommendations: string[];
}

export interface SafetyCheck {
	is_safe: boolean;
	risk_factors: string[];
	confidence: number;
	mitigation_suggestions: string[];
}

// Analytics and monitoring types
export interface AIAnalytics {
	request_count: number;
	response_time_avg: number;
	error_rate: number;
	quality_score_avg: number;
	user_satisfaction: number;
	model_performance: Record<
		string,
		{
			usage_count: number;
			avg_response_time: number;
			error_rate: number;
			quality_score: number;
		}
	>;
}

export interface PerformanceMetrics {
	latency: {
		p50: number;
		p95: number;
		p99: number;
	};
	throughput: {
		requests_per_second: number;
		tokens_per_second: number;
	};
	reliability: {
		uptime: number;
		error_rate: number;
		success_rate: number;
	};
}

// Content moderation types
export interface ContentModerationResult {
	flagged: boolean;
	categories: {
		hate: number;
		harassment: number;
		self_harm: number;
		sexual: number;
		violence: number;
	};
	confidence: number;
	action_required: boolean;
}

// Fact checking types
export interface FactCheckResult {
	is_verified: boolean;
	confidence: number;
	sources: {
		url: string;
		title: string;
		reliability_score: number;
	}[];
	contradictions: {
		claim: string;
		contradicting_source: string;
		confidence: number;
	}[];
}

// Conversation management types
export interface ConversationState {
	id: string;
	user_id: string;
	messages: Message[];
	context: Record<string, any>;
	active_intent?: string;
	conversation_goals: string[];
	last_activity: number;
	status: 'active' | 'paused' | 'completed' | 'abandoned';
}

export interface Message {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: number;
	metadata?: Record<string, any>;
}

// Intent and routing types
export interface IntentClassification {
	intent: string;
	confidence: number;
	entities: {
		name: string;
		value: string;
		confidence: number;
	}[];
	alternative_intents: {
		intent: string;
		confidence: number;
	}[];
}

export interface RoutingDecision {
	route: string;
	confidence: number;
	reasoning: string;
	fallback_route?: string;
	requires_human: boolean;
}

// Caching and optimization types
export interface CacheEntry<T = any> {
	key: string;
	value: T;
	timestamp: number;
	ttl: number;
	access_count: number;
	last_accessed: number;
}

export interface CacheStats {
	hit_rate: number;
	miss_rate: number;
	total_entries: number;
	memory_usage: number;
	eviction_count: number;
}

// Feature flags and configuration
export interface FeatureFlags {
	enable_streaming: boolean;
	enable_function_calling: boolean;
	enable_vision: boolean;
	enable_audio: boolean;
	enable_caching: boolean;
	enable_analytics: boolean;
	enable_quality_checks: boolean;
	enable_safety_checks: boolean;
}

export interface AIConfig {
	models: ModelConfig[];
	features: FeatureFlags;
	quality_thresholds: {
		min_quality_score: number;
		min_confidence_score: number;
		max_response_time: number;
	};
	safety_settings: {
		content_moderation: boolean;
		fact_checking: boolean;
		risk_assessment: boolean;
	};
	analytics: {
		enabled: boolean;
		retention_days: number;
		anonymize_data: boolean;
	};
}

// Utility types and enums
export enum AIErrorCode {
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	MODEL_ERROR = 'MODEL_ERROR',
	RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
	INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
	MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
	CONTENT_FILTERED = 'CONTENT_FILTERED',
	CONTEXT_TOO_LONG = 'CONTEXT_TOO_LONG',
	INVALID_REQUEST = 'INVALID_REQUEST',
	INTERNAL_ERROR = 'INTERNAL_ERROR',
	TIMEOUT = 'TIMEOUT',
}

export enum ContentCategory {
	FINANCIAL_ADVICE = 'FINANCIAL_ADVICE',
	BUDGET_PLANNING = 'BUDGET_PLANNING',
	GOAL_TRACKING = 'GOAL_TRACKING',
	TRANSACTION_ANALYSIS = 'TRANSACTION_ANALYSIS',
	EDUCATION = 'EDUCATION',
	GENERAL_QUERY = 'GENERAL_QUERY',
	SYSTEM_MESSAGE = 'SYSTEM_MESSAGE',
}

export enum ProcessingStage {
	RECEIVED = 'RECEIVED',
	VALIDATED = 'VALIDATED',
	ROUTED = 'ROUTED',
	PROCESSING = 'PROCESSING',
	QUALITY_CHECKED = 'QUALITY_CHECKED',
	SAFETY_CHECKED = 'SAFETY_CHECKED',
	COMPLETED = 'COMPLETED',
	FAILED = 'FAILED',
}

// Advanced AI processing types
export interface ProcessingPipeline {
	stages: ProcessingStage[];
	current_stage: ProcessingStage;
	stage_results: Record<ProcessingStage, any>;
	start_time: number;
	estimated_completion: number;
}

export interface AIContext {
	user_profile: {
		financial_goals: string[];
		risk_tolerance: 'low' | 'medium' | 'high';
		experience_level: 'beginner' | 'intermediate' | 'advanced';
		preferences: Record<string, any>;
	};
	conversation_history: Message[];
	active_facts: Record<string, any>;
	session_data: Record<string, any>;
}

export interface AIFeedback {
	user_id: string;
	request_id: string;
	rating: 1 | 2 | 3 | 4 | 5;
	feedback_text?: string;
	categories: {
		helpful: boolean;
		accurate: boolean;
		clear: boolean;
		relevant: boolean;
	};
	timestamp: number;
}

// Streaming and real-time types
export interface StreamChunk {
	id: string;
	content: string;
	is_final: boolean;
	metadata?: Record<string, any>;
	timestamp: number;
}

export interface StreamResponse {
	request_id: string;
	chunks: StreamChunk[];
	metadata: {
		model_used: string;
		total_tokens: number;
		processing_time: number;
	};
}

// Multi-modal types
export interface MediaContent {
	type: 'image' | 'audio' | 'video' | 'document';
	url: string;
	metadata: {
		size: number;
		format: string;
		duration?: number;
		dimensions?: { width: number; height: number };
	};
}

export interface MultiModalRequest extends AIRequest {
	media: MediaContent[];
	text_prompt: string;
}

// Function calling types
export interface FunctionDefinition {
	name: string;
	description: string;
	parameters: {
		type: 'object';
		properties: Record<
			string,
			{
				type: string;
				description: string;
				required?: boolean;
				enum?: string[];
			}
		>;
		required: string[];
	};
}

export interface FunctionCall {
	name: string;
	arguments: Record<string, any>;
	call_id: string;
}

export interface FunctionResult {
	call_id: string;
	result: any;
	error?: string;
	execution_time: number;
}

// Advanced analytics types
export interface UserBehaviorAnalytics {
	user_id: string;
	session_duration: number;
	messages_sent: number;
	topics_discussed: string[];
	features_used: string[];
	satisfaction_trend: number[];
	conversion_events: {
		event: string;
		timestamp: number;
		value?: number;
	}[];
}

export interface SystemHealthMetrics {
	cpu_usage: number;
	memory_usage: number;
	active_connections: number;
	queue_length: number;
	error_rate: number;
	response_time_p95: number;
	throughput: number;
	timestamp: number;
}

// Compliance and audit types
export interface AuditLog {
	id: string;
	user_id: string;
	action: string;
	resource: string;
	timestamp: number;
	ip_address?: string;
	user_agent?: string;
	metadata: Record<string, any>;
}

export interface ComplianceReport {
	period: {
		start: number;
		end: number;
	};
	metrics: {
		total_requests: number;
		flagged_content: number;
		human_reviews: number;
		compliance_violations: number;
	};
	recommendations: string[];
}

// All types are already exported above
