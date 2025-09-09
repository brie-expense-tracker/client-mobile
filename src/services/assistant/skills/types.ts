// Generic Skill interface for the Hybrid Skill Engine
// Each finance topic becomes a skill with the same skeleton: micro-solvers → KB → research agent → composer

import { ChatResponse } from '../responseSchema';
import { ChatContext } from '../../../services/feature/chatController';

// Slot specifications for skills
export interface SlotSpec {
	type:
		| 'string'
		| 'number'
		| 'date'
		| 'category'
		| 'merchant'
		| 'account'
		| 'goal_id';
	required: boolean;
	description: string;
	examples: string[];
	validator?: (value: any) => boolean;
}

export type SkillStepResult = {
	response: ChatResponse | null;
	matchedPattern?: string;
	usefulness?: number; // reuse your scoreUsefulness()
};

export interface Skill {
	id: string;
	name: string;
	description?: string;
	slots?: Record<string, SlotSpec>;
	// Quick test whether this skill should run on this question
	matches: (q: string) => boolean;
	// Plan execution steps
	plan?: (params: any, ctx: ChatContext) => any;
	// Execute the skill
	run: (
		params: any,
		ctx: ChatContext
	) => Promise<{ success: boolean; data?: any; error?: string }>;
	// Check if skill can handle the context
	canHandle?: (ctx: ChatContext) => {
		canAnswer: boolean;
		reason?: string;
		confidence?: number;
	};
	// Render skill data into UI components
	render?: (data: any, params: any) => any;
	// Generate coach note
	coach?: (data: any) => { message: string };
	// Deterministic steps (cheap → expensive)
	microSolvers?: ((q: string, ctx: ChatContext) => SkillStepResult | null)[];
	kbSearch?: (q: string) => SkillStepResult | null;
	researchAgent?: (
		q: string,
		ctx: ChatContext
	) => Promise<SkillStepResult | null>;
	// Final composition if earlier steps returned structured data
	composer?: (q: string, ctx: ChatContext, data: any) => ChatResponse;
	// Optional feature flags / TTLs
	config?: {
		ttlMs?: number;
		minUsefulness?: number;
		priority?: number; // Higher priority skills run first
	};
}

// Research agent configuration
export type ResearchSource = {
	editorialAllow: string[]; // e.g., bankrate/nerdwallet…
	domainAllowPatterns: RegExp[]; // official sites you trust
	recencyDays?: number; // freshness
};

export type ResearchSchema = {
	// normalized fields this topic cares about
	fields: string[]; // ['apy','minBalance','fees','achSpeed','buckets', ...]
};

export interface ResearchResult<T> {
	items: T[];
	checkedAt: string;
}

// Web functions interface (inject real search/fetch/extract)
export interface WebFns {
	search: (
		q: string,
		recencyDays?: number
	) => Promise<{ title: string; url: string }[]>;
	fetchText: (url: string) => Promise<string>;
	extract: (html: string) => Record<string, any>; // topic-specific parser
}

// Skill execution result
export interface SkillExecutionResult {
	response: ChatResponse | null;
	skillId: string;
	step: 'microSolver' | 'kbSearch' | 'researchAgent' | 'composer' | 'unknown';
	matchedPattern?: string | null;
	usefulness: number;
	executionTimeMs: number;
	success: boolean;
	cached?: boolean;
	error?: string;
	metadata?: Record<string, any>;
}

// Skill validation result
export interface SkillValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
	missingSlots: string[];
	invalidSlots: string[];
}

// Skill cache entry
export interface SkillCacheEntry<T = any> {
	data: T;
	timestamp: number;
	ttl: number;
	key: string;
	skillId: string;
	params: any;
}

// Skill execution metrics
export interface SkillMetrics {
	skillId: string;
	executionCount: number;
	successCount: number;
	failureCount: number;
	averageExecutionTime: number;
	lastExecuted: number;
	cacheHitRate: number;
	usefulnessScores: number[];
}

// Skill dependency
export interface SkillDependency {
	skillId: string;
	version?: string;
	required: boolean;
	condition?: (ctx: ChatContext) => boolean;
}

// Skill middleware
export interface SkillMiddleware {
	beforeExecution?: (
		skillId: string,
		params: any,
		ctx: ChatContext
	) => Promise<{ shouldContinue: boolean; modifiedParams?: any }>;
	afterExecution?: (
		skillId: string,
		result: SkillExecutionResult,
		ctx: ChatContext
	) => Promise<void>;
	onError?: (skillId: string, error: Error, ctx: ChatContext) => Promise<void>;
}

// Skill version info
export interface SkillVersion {
	major: number;
	minor: number;
	patch: number;
	deprecated?: boolean;
	migrationGuide?: string;
}

// Enhanced skill interface with new features
export interface EnhancedSkill extends Skill {
	version?: SkillVersion;
	dependencies?: SkillDependency[];
	middleware?: SkillMiddleware[];
	cacheConfig?: {
		enabled: boolean;
		ttlMs: number;
		keyGenerator?: (params: any, ctx: ChatContext) => string;
	};
	metrics?: {
		enabled: boolean;
		retentionDays: number;
	};
	testing?: {
		testCases: SkillTestCase[];
		mockData?: Record<string, any>;
	};
}

// Skill test case
export interface SkillTestCase {
	name: string;
	description: string;
	input: {
		question: string;
		params: any;
		context: ChatContext;
	};
	expected: {
		success: boolean;
		responseType?: string;
		containsText?: string[];
		excludesText?: string[];
	};
}

// Skill registry configuration
export interface SkillRegistryConfig {
	caching: {
		enabled: boolean;
		defaultTtlMs: number;
		maxSize: number;
	};
	metrics: {
		enabled: boolean;
		retentionDays: number;
	};
	middleware: {
		global: SkillMiddleware[];
	};
	validation: {
		strict: boolean;
		validateSlots: boolean;
	};
}
