// Answerability Gating - Prevents responses when data is missing
// Fast path to avoid "I don't know" responses by checking data availability first
import {
	FinancialSkillId,
	COMPREHENSIVE_SKILL_REGISTRY,
} from './skills/comprehensiveSkillRegistry';

// Context type for answerability checks
export interface ChatContext {
	budgets?: {
		id: string;
		name: string;
		amount: number;
		spent?: number;
		category?: string;
		period?: string;
	}[];
	goals?: {
		id: string;
		name: string;
		target: number;
		current?: number;
		percent?: number;
		deadline?: string;
		category?: string;
	}[];
	transactions?: {
		id: string;
		amount: number;
		description?: string;
		merchant?: string;
		category?: string;
		date: string;
		account?: string;
	}[];
	recurring_expenses?: {
		id: string;
		name: string;
		amount: number;
		frequency: 'monthly' | 'weekly' | 'yearly';
		next_due?: string;
		category?: string;
	}[];
	debts?: {
		id: string;
		name: string;
		balance: number;
		minimum_payment: number;
		interest_rate?: number;
		account_type: 'credit_card' | 'loan' | 'mortgage' | 'other';
		due_date?: string;
	}[];
	accounts?: {
		id: string;
		name: string;
		type: 'checking' | 'savings' | 'credit' | 'investment';
		balance: number;
		institution?: string;
	}[];
}

// Answerability check result
export interface AnswerabilityCheck {
	canAnswer: boolean;
	confidence: number;
	reason: string;
	missingData: string[];
	suggestions: string[];
	fallbackAction?: string;
}

// Data requirements for each skill
const SKILL_DATA_REQUIREMENTS: Record<
	FinancialSkillId,
	{
		required: string[];
		optional: string[];
		minThresholds: Record<string, number>;
	}
> = {
	// Snapshot & Overview
	OVERVIEW: {
		required: [],
		optional: ['budgets', 'goals', 'transactions'],
		minThresholds: { totalDataPoints: 1 },
	},
	CASHFLOW_SUMMARY: {
		required: ['transactions'],
		optional: [],
		minThresholds: { transactions: 5 },
	},
	SPENDING_BY_CATEGORY: {
		required: ['transactions'],
		optional: ['budgets'],
		minThresholds: { transactions: 3 },
	},
	TOP_MERCHANTS: {
		required: ['transactions'],
		optional: [],
		minThresholds: { transactions: 5 },
	},
	TOP_CATEGORIES: {
		required: ['transactions'],
		optional: [],
		minThresholds: { transactions: 3 },
	},
	RECURRING_BILLS_UPCOMING: {
		required: ['recurring_expenses'],
		optional: [],
		minThresholds: { recurring_expenses: 1 },
	},
	RECURRING_BILLS_PAST_DUE: {
		required: ['recurring_expenses'],
		optional: [],
		minThresholds: { recurring_expenses: 1 },
	},
	SUBSCRIPTIONS_DETECT: {
		required: ['transactions'],
		optional: [],
		minThresholds: { transactions: 10 },
	},

	// Budgets
	BUDGET_CREATE: {
		required: [],
		optional: [],
		minThresholds: {},
	},
	BUDGET_EDIT: {
		required: ['budgets'],
		optional: [],
		minThresholds: { budgets: 1 },
	},
	BUDGET_STATUS: {
		required: ['budgets'],
		optional: ['transactions'],
		minThresholds: { budgets: 1 },
	},
	BUDGET_CAN_INCREASE: {
		required: ['budgets', 'transactions'],
		optional: [],
		minThresholds: { budgets: 1, transactions: 5 },
	},
	BUDGET_ALERTS: {
		required: ['budgets'],
		optional: ['transactions'],
		minThresholds: { budgets: 1 },
	},

	// Goals
	GOAL_CREATE: {
		required: [],
		optional: [],
		minThresholds: {},
	},
	GOAL_EDIT: {
		required: ['goals'],
		optional: [],
		minThresholds: { goals: 1 },
	},
	GOAL_PROGRESS: {
		required: ['goals'],
		optional: ['transactions'],
		minThresholds: { goals: 1 },
	},
	GOAL_MONTHLY_AMOUNT: {
		required: ['goals'],
		optional: ['transactions'],
		minThresholds: { goals: 1 },
	},
	GOAL_REPRIORITIZE: {
		required: ['goals'],
		optional: [],
		minThresholds: { goals: 2 },
	},

	// Transactions
	TRANSACTION_SEARCH: {
		required: ['transactions'],
		optional: [],
		minThresholds: { transactions: 1 },
	},
	TRANSACTION_CATEGORIZE: {
		required: ['transactions'],
		optional: [],
		minThresholds: { transactions: 1 },
	},
	TRANSACTION_DISPUTE: {
		required: ['transactions'],
		optional: [],
		minThresholds: { transactions: 1 },
	},
	REFUND_DETECT: {
		required: ['transactions'],
		optional: [],
		minThresholds: { transactions: 5 },
	},

	// Income & Savings
	SAVINGS_RATE: {
		required: ['transactions'],
		optional: ['goals'],
		minThresholds: { transactions: 10 },
	},
	PAYCHECK_BREAKDOWN: {
		required: ['transactions'],
		optional: [],
		minThresholds: { transactions: 5 },
	},
	EMERGENCY_FUND_TRACKER: {
		required: ['goals'],
		optional: ['transactions'],
		minThresholds: { goals: 1 },
	},

	// Debts
	DEBT_LIST: {
		required: ['debts'],
		optional: [],
		minThresholds: { debts: 1 },
	},
	DEBT_PAYOFF_SIMULATION: {
		required: ['debts'],
		optional: ['transactions'],
		minThresholds: { debts: 1 },
	},
	DEBT_EXTRA_PAYMENT: {
		required: ['debts'],
		optional: ['transactions'],
		minThresholds: { debts: 1 },
	},

	// Planning & What-ifs
	SCENARIO_PLANNING: {
		required: ['budgets', 'transactions'],
		optional: ['goals'],
		minThresholds: { budgets: 1, transactions: 5 },
	},
	AFFORDABILITY_CHECK: {
		required: ['budgets', 'transactions'],
		optional: ['goals'],
		minThresholds: { budgets: 1, transactions: 5 },
	},
	SAVINGS_PROJECTION: {
		required: ['goals', 'transactions'],
		optional: ['budgets'],
		minThresholds: { goals: 1, transactions: 5 },
	},

	// Education (always available)
	EDUCATION_BUDGETS_VS_GOALS: {
		required: [],
		optional: [],
		minThresholds: {},
	},
	EDUCATION_APR_VS_APY: {
		required: [],
		optional: [],
		minThresholds: {},
	},
	EDUCATION_INDEX_FUNDS: {
		required: [],
		optional: [],
		minThresholds: {},
	},
};

// Performance metrics interface
export interface AnswerabilityMetrics {
	totalChecks: number;
	cacheHits: number;
	cacheMisses: number;
	averageResponseTime: number;
	skillUsageCounts: Record<string, number>;
	errorCounts: Record<string, number>;
}

// Answerability gating service
export class AnswerabilityGating {
	private dataCounters: Map<string, number> = new Map();
	private answerabilityCache: Map<string, AnswerabilityCheck> = new Map();
	private cacheExpiry: Map<string, number> = new Map();
	private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

	// Performance metrics
	private metrics: AnswerabilityMetrics = {
		totalChecks: 0,
		cacheHits: 0,
		cacheMisses: 0,
		averageResponseTime: 0,
		skillUsageCounts: {},
		errorCounts: {},
	};
	private responseTimes: number[] = [];

	// Check if a skill can be answered with current data
	checkAnswerability(
		skillId: FinancialSkillId,
		context: ChatContext
	): AnswerabilityCheck {
		const startTime = performance.now();

		// Update metrics
		this.metrics.totalChecks++;
		this.metrics.skillUsageCounts[skillId] =
			(this.metrics.skillUsageCounts[skillId] || 0) + 1;

		// Input validation
		if (!skillId || typeof skillId !== 'string') {
			this.metrics.errorCounts['INVALID_SKILL_ID'] =
				(this.metrics.errorCounts['INVALID_SKILL_ID'] || 0) + 1;
			return {
				canAnswer: false,
				confidence: 0,
				reason: 'INVALID_SKILL_ID',
				missingData: [],
				suggestions: ['Please provide a valid skill ID'],
			};
		}

		if (!context || typeof context !== 'object') {
			this.metrics.errorCounts['INVALID_CONTEXT'] =
				(this.metrics.errorCounts['INVALID_CONTEXT'] || 0) + 1;
			return {
				canAnswer: false,
				confidence: 0,
				reason: 'INVALID_CONTEXT',
				missingData: [],
				suggestions: ['Please provide a valid context object'],
			};
		}
		// Generate cache key based on skill and context data counts
		const contextHash = this.generateContextHash(context);
		const cacheKey = `${skillId}:${contextHash}`;

		// Check cache first
		const cached = this.answerabilityCache.get(cacheKey);
		const expiry = this.cacheExpiry.get(cacheKey);
		if (cached && expiry && Date.now() < expiry) {
			this.metrics.cacheHits++;
			this.updateResponseTime(startTime);
			return cached;
		}

		this.metrics.cacheMisses++;

		const requirements = SKILL_DATA_REQUIREMENTS[skillId];
		if (!requirements) {
			const result = {
				canAnswer: false,
				confidence: 0,
				reason: 'UNKNOWN_SKILL',
				missingData: [],
				suggestions: [],
			};
			this.cacheResult(cacheKey, result);
			return result;
		}

		// Count available data
		const dataCounts = this.countAvailableData(context);

		// Check required data
		const missingRequired = requirements.required.filter(
			(dataType) =>
				dataCounts[dataType] < (requirements.minThresholds[dataType] || 1)
		);

		// Check minimum thresholds
		const thresholdViolations = Object.entries(
			requirements.minThresholds
		).filter(([dataType, minCount]) => dataCounts[dataType] < minCount);

		// Determine if we can answer
		const canAnswer =
			missingRequired.length === 0 && thresholdViolations.length === 0;

		// Calculate confidence based on data availability
		const totalRequired =
			requirements.required.length +
			Object.keys(requirements.minThresholds).length;
		const availableRequired =
			totalRequired - missingRequired.length - thresholdViolations.length;
		const confidence =
			totalRequired > 0 ? availableRequired / totalRequired : 1.0;

		// Generate suggestions based on missing data
		const suggestions = this.generateSuggestions(
			missingRequired,
			thresholdViolations,
			context
		);

		// Determine fallback action
		const fallbackAction = this.determineFallbackAction(
			skillId,
			missingRequired,
			context
		);

		const result = {
			canAnswer,
			confidence,
			reason: canAnswer ? 'SUFFICIENT_DATA' : 'INSUFFICIENT_DATA',
			missingData: [
				...missingRequired,
				...thresholdViolations.map(([type]) => type),
			],
			suggestions,
			fallbackAction,
		};

		// Cache the result
		this.cacheResult(cacheKey, result);
		this.updateResponseTime(startTime);
		return result;
	}

	// Generate a hash for context to use as cache key
	private generateContextHash(context: ChatContext): string {
		const dataCounts = this.countAvailableData(context);
		return Object.entries(dataCounts)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, value]) => `${key}:${value}`)
			.join('|');
	}

	// Cache a result with expiry
	private cacheResult(cacheKey: string, result: AnswerabilityCheck): void {
		this.answerabilityCache.set(cacheKey, result);
		this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);
	}

	// Clear expired cache entries
	private clearExpiredCache(): void {
		const now = Date.now();
		for (const [key, expiry] of this.cacheExpiry.entries()) {
			if (now >= expiry) {
				this.answerabilityCache.delete(key);
				this.cacheExpiry.delete(key);
			}
		}
	}

	// Clear all cache
	clearCache(): void {
		this.answerabilityCache.clear();
		this.cacheExpiry.clear();
	}

	// Update response time metrics
	private updateResponseTime(startTime: number): void {
		const responseTime = performance.now() - startTime;
		this.responseTimes.push(responseTime);

		// Keep only last 100 response times for rolling average
		if (this.responseTimes.length > 100) {
			this.responseTimes = this.responseTimes.slice(-100);
		}

		// Update average response time
		this.metrics.averageResponseTime =
			this.responseTimes.reduce((sum, time) => sum + time, 0) /
			this.responseTimes.length;
	}

	// Get performance metrics
	getMetrics(): AnswerabilityMetrics {
		return { ...this.metrics };
	}

	// Reset metrics
	resetMetrics(): void {
		this.metrics = {
			totalChecks: 0,
			cacheHits: 0,
			cacheMisses: 0,
			averageResponseTime: 0,
			skillUsageCounts: {},
			errorCounts: {},
		};
		this.responseTimes = [];
	}

	// Get cache statistics
	getCacheStats(): {
		size: number;
		hitRate: number;
		missRate: number;
	} {
		const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
		return {
			size: this.answerabilityCache.size,
			hitRate: totalRequests > 0 ? this.metrics.cacheHits / totalRequests : 0,
			missRate:
				totalRequests > 0 ? this.metrics.cacheMisses / totalRequests : 0,
		};
	}

	// Count available data in context
	private countAvailableData(context: ChatContext): Record<string, number> {
		const counts: Record<string, number> = {
			budgets: context.budgets?.length || 0,
			goals: context.goals?.length || 0,
			transactions: context.transactions?.length || 0,
			recurring_expenses: context.recurring_expenses?.length || 0,
			debts: context.debts?.length || 0,
			accounts: context.accounts?.length || 0,
			totalDataPoints: 0,
		};

		// Calculate total data points
		counts.totalDataPoints = Object.values(counts).reduce(
			(sum, count) => sum + count,
			0
		);

		return counts;
	}

	// Generate helpful suggestions based on missing data
	private generateSuggestions(
		missingRequired: string[],
		thresholdViolations: [string, number][],
		context: ChatContext
	): string[] {
		const suggestions: string[] = [];

		if (
			missingRequired.includes('budgets') ||
			thresholdViolations.some(([type]) => type === 'budgets')
		) {
			suggestions.push('Create your first budget to track spending');
			suggestions.push('Set up a grocery budget for $300/month');
			suggestions.push('Create a dining budget for $200/month');
			suggestions.push('Add a transportation budget');
		}

		if (
			missingRequired.includes('goals') ||
			thresholdViolations.some(([type]) => type === 'goals')
		) {
			suggestions.push('Set up a savings goal');
			suggestions.push('Create an emergency fund goal ($1,000 starter)');
			suggestions.push('Set a vacation savings target');
			suggestions.push('Add a home down payment goal');
		}

		if (
			missingRequired.includes('transactions') ||
			thresholdViolations.some(([type]) => type === 'transactions')
		) {
			suggestions.push('Connect your bank account to import transactions');
			suggestions.push('Add some manual transactions to get started');
			suggestions.push('Import your transaction history from CSV');
			suggestions.push('Link your credit card for automatic tracking');
		}

		if (missingRequired.includes('recurring_expenses')) {
			suggestions.push('Set up recurring expense tracking');
			suggestions.push('Add your monthly bills (rent, utilities, etc.)');
			suggestions.push('Track subscription services');
			suggestions.push('Set up automatic bill reminders');
		}

		if (missingRequired.includes('debts')) {
			suggestions.push('Add your debt information');
			suggestions.push('Set up debt tracking for credit cards');
			suggestions.push('Add student loan information');
			suggestions.push('Track mortgage or car loan details');
		}

		// If no specific suggestions, provide general ones
		if (suggestions.length === 0) {
			suggestions.push('Try asking about your financial overview');
			suggestions.push('Ask me to explain budgets vs goals');
			suggestions.push('Get help with financial planning');
			suggestions.push('Learn about emergency funds');
		}

		return suggestions;
	}

	// Determine appropriate fallback action
	private determineFallbackAction(
		skillId: FinancialSkillId,
		missingRequired: string[],
		context: ChatContext
	): string | undefined {
		// If missing critical data, suggest setup actions
		if (
			missingRequired.includes('budgets') &&
			missingRequired.includes('goals')
		) {
			return 'SETUP_FINANCIAL_TRACKING';
		}

		if (missingRequired.includes('budgets')) {
			return 'CREATE_FIRST_BUDGET';
		}

		if (missingRequired.includes('goals')) {
			return 'CREATE_FIRST_GOAL';
		}

		if (missingRequired.includes('transactions')) {
			return 'CONNECT_ACCOUNT';
		}

		// For education skills, always allow
		if (skillId.startsWith('EDUCATION_')) {
			return undefined;
		}

		// Default fallback
		return 'GUIDED_SETUP';
	}

	// Get skills that can be answered with current data
	getAvailableSkills(context: ChatContext): {
		skillId: FinancialSkillId;
		confidence: number;
		reason: string;
	}[] {
		const availableSkills: {
			skillId: FinancialSkillId;
			confidence: number;
			reason: string;
		}[] = [];

		for (const skillId of Object.keys(
			COMPREHENSIVE_SKILL_REGISTRY
		) as FinancialSkillId[]) {
			const check = this.checkAnswerability(skillId, context);
			if (check.canAnswer) {
				availableSkills.push({
					skillId,
					confidence: check.confidence,
					reason: check.reason,
				});
			}
		}

		return availableSkills.sort((a, b) => b.confidence - a.confidence);
	}

	// Get guided fallback suggestions based on available data
	getGuidedFallbackSuggestions(context: ChatContext): {
		skillId: FinancialSkillId;
		title: string;
		description: string;
		priority: number;
	}[] {
		const availableSkills = this.getAvailableSkills(context);

		// High-priority skills based on data availability
		const prioritySkills: {
			skillId: FinancialSkillId;
			title: string;
			description: string;
			priority: number;
		}[] = [
			{
				skillId: 'OVERVIEW',
				title: 'Financial Overview',
				description: 'See your complete financial picture',
				priority: 0.9,
			},
			{
				skillId: 'BUDGET_STATUS',
				title: 'Budget Status',
				description: 'Check how your budgets are doing',
				priority: 0.8,
			},
			{
				skillId: 'GOAL_PROGRESS',
				title: 'Goal Progress',
				description: 'Track your savings goals',
				priority: 0.8,
			},
			{
				skillId: 'CASHFLOW_SUMMARY',
				title: 'Cashflow Summary',
				description: 'See income vs expenses',
				priority: 0.7,
			},
			{
				skillId: 'EDUCATION_BUDGETS_VS_GOALS',
				title: 'Learn: Budgets vs Goals',
				description: 'Understand the difference',
				priority: 0.6,
			},
		];

		// Filter to only available skills and sort by priority
		return prioritySkills
			.filter((skill) =>
				availableSkills.some((available) => available.skillId === skill.skillId)
			)
			.sort((a, b) => b.priority - a.priority)
			.slice(0, 6);
	}

	// Get data quality metrics for the current context
	getDataQualityMetrics(context: ChatContext): {
		overallScore: number;
		metrics: {
			dataType: string;
			count: number;
			quality: 'excellent' | 'good' | 'fair' | 'poor';
			recommendations: string[];
		}[];
	} {
		const dataCounts = this.countAvailableData(context);
		const metrics: {
			dataType: string;
			count: number;
			quality: 'excellent' | 'good' | 'fair' | 'poor';
			recommendations: string[];
		}[] = [];

		// Define quality thresholds for each data type
		const qualityThresholds: Record<
			string,
			{ excellent: number; good: number; fair: number }
		> = {
			transactions: { excellent: 50, good: 20, fair: 5 },
			budgets: { excellent: 5, good: 3, fair: 1 },
			goals: { excellent: 5, good: 3, fair: 1 },
			recurring_expenses: { excellent: 10, good: 5, fair: 2 },
			debts: { excellent: 3, good: 2, fair: 1 },
		};

		Object.entries(dataCounts).forEach(([dataType, count]) => {
			if (dataType === 'totalDataPoints') return;

			const thresholds = qualityThresholds[dataType] || {
				excellent: 10,
				good: 5,
				fair: 1,
			};
			let quality: 'excellent' | 'good' | 'fair' | 'poor';
			let recommendations: string[] = [];

			if (count >= thresholds.excellent) {
				quality = 'excellent';
			} else if (count >= thresholds.good) {
				quality = 'good';
			} else if (count >= thresholds.fair) {
				quality = 'fair';
			} else {
				quality = 'poor';
			}

			// Generate recommendations based on quality
			if (quality === 'poor') {
				recommendations = this.generateSuggestions([dataType], [], context);
			} else if (quality === 'fair') {
				recommendations = [
					`Consider adding more ${dataType} for better insights`,
				];
			}

			metrics.push({
				dataType,
				count,
				quality,
				recommendations,
			});
		});

		// Calculate overall score
		const totalScore = metrics.reduce((sum, metric) => {
			const score =
				metric.quality === 'excellent'
					? 4
					: metric.quality === 'good'
					? 3
					: metric.quality === 'fair'
					? 2
					: 1;
			return sum + score;
		}, 0);
		const overallScore = metrics.length > 0 ? totalScore / metrics.length : 0;

		return {
			overallScore,
			metrics,
		};
	}

	// Get skill-specific recommendations based on current data
	getSkillRecommendations(context: ChatContext): {
		skillId: FinancialSkillId;
		title: string;
		description: string;
		canUse: boolean;
		confidence: number;
		nextSteps: string[];
	}[] {
		const recommendations: {
			skillId: FinancialSkillId;
			title: string;
			description: string;
			canUse: boolean;
			confidence: number;
			nextSteps: string[];
		}[] = [];

		// Get all skills from the registry
		const allSkillIds = Object.keys(
			COMPREHENSIVE_SKILL_REGISTRY
		) as FinancialSkillId[];

		allSkillIds.forEach((skillId) => {
			const skill = COMPREHENSIVE_SKILL_REGISTRY[skillId];
			if (!skill) return;

			const check = this.checkAnswerability(skillId, context);
			const nextSteps = check.canAnswer
				? ['Ready to use!', 'Try asking about this topic']
				: check.suggestions.slice(0, 3);

			recommendations.push({
				skillId,
				title: skill.name || 'Unknown Skill',
				description: skill.description || 'No description available',
				canUse: check.canAnswer,
				confidence: check.confidence,
				nextSteps,
			});
		});

		return recommendations.sort((a, b) => {
			// Sort by canUse first, then by confidence
			if (a.canUse !== b.canUse) {
				return a.canUse ? -1 : 1;
			}
			return b.confidence - a.confidence;
		});
	}

	// Validate context data integrity
	validateContext(context: ChatContext): {
		isValid: boolean;
		errors: string[];
		warnings: string[];
	} {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Validate budgets
		if (context.budgets) {
			context.budgets.forEach((budget, index) => {
				if (!budget.id) errors.push(`Budget ${index} missing ID`);
				if (!budget.name) warnings.push(`Budget ${index} missing name`);
				if (typeof budget.amount !== 'number' || budget.amount < 0) {
					errors.push(`Budget ${index} has invalid amount`);
				}
			});
		}

		// Validate goals
		if (context.goals) {
			context.goals.forEach((goal, index) => {
				if (!goal.id) errors.push(`Goal ${index} missing ID`);
				if (!goal.name) warnings.push(`Goal ${index} missing name`);
				if (typeof goal.target !== 'number' || goal.target <= 0) {
					errors.push(`Goal ${index} has invalid target amount`);
				}
			});
		}

		// Validate transactions
		if (context.transactions) {
			context.transactions.forEach((transaction, index) => {
				if (!transaction.id) errors.push(`Transaction ${index} missing ID`);
				if (typeof transaction.amount !== 'number') {
					errors.push(`Transaction ${index} has invalid amount`);
				}
				if (!transaction.date)
					warnings.push(`Transaction ${index} missing date`);
			});
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		};
	}

	// Get data completeness score
	getDataCompletenessScore(context: ChatContext): {
		score: number;
		details: Record<string, { count: number; completeness: number }>;
	} {
		const dataCounts = this.countAvailableData(context);
		const details: Record<string, { count: number; completeness: number }> = {};

		// Define expected minimums for completeness scoring
		const expectedMinimums: Record<string, number> = {
			transactions: 10,
			budgets: 3,
			goals: 2,
			recurring_expenses: 3,
			debts: 1,
			accounts: 1,
		};

		let totalScore = 0;
		let totalWeight = 0;

		Object.entries(dataCounts).forEach(([dataType, count]) => {
			if (dataType === 'totalDataPoints') return;

			const expected = expectedMinimums[dataType] || 1;
			const completeness = Math.min(count / expected, 1);

			details[dataType] = { count, completeness };

			// Weight different data types differently
			const weight =
				dataType === 'transactions'
					? 0.3
					: dataType === 'budgets'
					? 0.25
					: dataType === 'goals'
					? 0.2
					: dataType === 'accounts'
					? 0.15
					: 0.1;

			totalScore += completeness * weight;
			totalWeight += weight;
		});

		return {
			score: totalWeight > 0 ? totalScore / totalWeight : 0,
			details,
		};
	}
}

// Export singleton instance
export const answerabilityGating = new AnswerabilityGating();
