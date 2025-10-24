// Hierarchical Router - 3-pass system for 90%+ coverage
// Implements rules → ML → LLM routing with confidence calibration

import { FinancialSkillId } from './skills/comprehensiveSkillRegistry';

type ChatContext = any;

// Route decision types
export type RouteDecision = {
	type: 'SKILL' | 'FALLBACK_GUIDED' | 'FALLBACK_UNKNOWN';
	skillId?: FinancialSkillId;
	confidence: number;
	reason: string;
	params?: Record<string, any>;
	missingSlots?: string[];
	alternatives?: RouteDecision[];
};

// Rule-based router (fast path)
export class RulesRouter {
	private patterns: {
		skillId: FinancialSkillId;
		patterns: RegExp[];
		baseScore: number;
		requiredSlots?: string[];
	}[] = [
		// High-frequency patterns that should be caught quickly
		{
			skillId: 'OVERVIEW',
			patterns: [
				/tell me about (my )?finances?/i,
				/how am i doing/i,
				/financial overview|summary|health check/i,
				/what.*financial.*picture/i,
			],
			baseScore: 0.9,
		},
		{
			skillId: 'BUDGET_STATUS',
			patterns: [
				/budget.*status|how.*budget|spent.*budget/i,
				/over.*budget|budget.*used|budget.*left/i,
				/budget.*performance/i,
			],
			baseScore: 0.9,
		},
		{
			skillId: 'GOAL_PROGRESS',
			patterns: [
				/goal.*progress|saving.*goal|how.*saving/i,
				/progress.*goal|goal.*status/i,
				/am i on track/i,
			],
			baseScore: 0.9,
		},
		{
			skillId: 'CASHFLOW_SUMMARY',
			patterns: [
				/cashflow|cash flow|income.*expenses/i,
				/net.*income|money.*in.*out/i,
			],
			baseScore: 0.85,
		},
		{
			skillId: 'SPENDING_BY_CATEGORY',
			patterns: [
				/spending.*category|categories.*spent/i,
				/breakdown.*spending|spend.*by/i,
			],
			baseScore: 0.85,
		},
		{
			skillId: 'TRANSACTION_SEARCH',
			patterns: [
				/find.*transaction|search.*transaction/i,
				/show.*transactions|transaction.*history/i,
			],
			baseScore: 0.8,
		},
		{
			skillId: 'BUDGET_CREATE',
			patterns: [
				/create.*budget|new budget|set up.*budget/i,
				/make.*budget|establish.*budget/i,
			],
			baseScore: 0.9,
			requiredSlots: ['category', 'amount'],
		},
	];

	route(utterance: string, context: ChatContext): RouteDecision | null {
		const question = utterance.toLowerCase();

		for (const rule of this.patterns) {
			for (const pattern of rule.patterns) {
				if (pattern.test(question)) {
					// Check if required slots are present
					const missingSlots = this.checkRequiredSlots(
						rule.requiredSlots || [],
						utterance,
						context
					);

					return {
						type: 'SKILL',
						skillId: rule.skillId,
						confidence: rule.baseScore,
						reason: 'RULE_MATCH',
						missingSlots: missingSlots.length > 0 ? missingSlots : undefined,
					};
				}
			}
		}

		return null;
	}

	private checkRequiredSlots(
		requiredSlots: string[],
		utterance: string,
		context: ChatContext
	): string[] {
		const missing: string[] = [];

		for (const slot of requiredSlots) {
			if (slot === 'category' && !this.extractCategory(utterance)) {
				missing.push('category');
			} else if (slot === 'amount' && !this.extractAmount(utterance)) {
				missing.push('amount');
			}
		}

		return missing;
	}

	private extractCategory(utterance: string): string | null {
		const categoryKeywords = [
			'groceries',
			'dining',
			'transportation',
			'entertainment',
			'utilities',
		];
		for (const keyword of categoryKeywords) {
			if (utterance.includes(keyword)) {
				return keyword;
			}
		}
		return null;
	}

	private extractAmount(utterance: string): number | null {
		const amountMatch = utterance.match(/\$?(\d+(?:\.\d{2})?)/);
		return amountMatch ? parseFloat(amountMatch[1]) : null;
	}
}

// ML-based router (semantic understanding)
export class MLRouter {
	private intentModel: any; // Would be loaded from a trained model

	async route(
		utterance: string,
		context: ChatContext
	): Promise<RouteDecision[]> {
		// This would use a small ML model (DistilBERT/fastText) for semantic understanding
		// For now, we'll simulate with keyword-based scoring

		const question = utterance.toLowerCase();
		const scores: {
			skillId: FinancialSkillId;
			score: number;
			reason: string;
		}[] = [];

		// Simulate ML scoring based on semantic similarity
		const semanticPatterns: Partial<Record<FinancialSkillId, string[]>> = {
			OVERVIEW: [
				'overview',
				'summary',
				'how am i doing',
				'financial health',
				'status',
			],
			BUDGET_STATUS: ['budget', 'spending limit', 'used up', 'remaining'],
			GOAL_PROGRESS: ['goal', 'saving', 'target', 'progress', 'on track'],
			CASHFLOW_SUMMARY: [
				'income',
				'expenses',
				'cashflow',
				'money in',
				'money out',
			],
			SPENDING_BY_CATEGORY: [
				'category',
				'breakdown',
				'spending by',
				'where did my money go',
			],
			TRANSACTION_SEARCH: [
				'find',
				'search',
				'transaction',
				'history',
				'show me',
			],
			BUDGET_CREATE: [
				'create budget',
				'new budget',
				'set up budget',
				'make budget',
			],
			EDUCATION_BUDGETS_VS_GOALS: [
				'difference',
				'budget vs goal',
				'explain',
				'what is',
			],
		};

		for (const [skillId, keywords] of Object.entries(semanticPatterns)) {
			let score = 0;
			let matchedKeywords = 0;

			for (const keyword of keywords) {
				if (question.includes(keyword)) {
					score += 1 / keywords.length;
					matchedKeywords++;
				}
			}

			if (matchedKeywords > 0) {
				scores.push({
					skillId: skillId as FinancialSkillId,
					score: Math.min(score, 0.95), // Cap at 0.95
					reason: `ML_SEMANTIC_${matchedKeywords}_KEYWORDS`,
				});
			}
		}

		// Return top 3 matches
		return scores
			.sort((a, b) => b.score - a.score)
			.slice(0, 3)
			.map((s) => ({
				type: 'SKILL' as const,
				skillId: s.skillId,
				confidence: s.score,
				reason: s.reason,
			}));
	}
}

// LLM-based router (fallback for complex cases)
export class LLMRouter {
	async route(
		utterance: string,
		context: ChatContext
	): Promise<RouteDecision | null> {
		// This would use a small LLM (like GPT-3.5-turbo) for complex intent detection
		// For now, we'll simulate with a simple pattern matcher

		const question = utterance.toLowerCase();

		// Complex multi-intent detection
		if (question.includes('compare') && question.includes('budget')) {
			return {
				type: 'SKILL',
				skillId: 'BUDGET_STATUS',
				confidence: 0.7,
				reason: 'LLM_COMPLEX_INTENT',
			};
		}

		if (question.includes('what if') && question.includes('spend')) {
			return {
				type: 'SKILL',
				skillId: 'SCENARIO_PLANNING',
				confidence: 0.8,
				reason: 'LLM_WHAT_IF_INTENT',
			};
		}

		if (
			question.includes('explain') ||
			question.includes('what is') ||
			question.includes('difference')
		) {
			return {
				type: 'SKILL',
				skillId: 'EDUCATION_BUDGETS_VS_GOALS',
				confidence: 0.75,
				reason: 'LLM_EDUCATION_INTENT',
			};
		}

		return null;
	}
}

// Main hierarchical router
export class HierarchicalRouter {
	private rulesRouter: RulesRouter;
	private mlRouter: MLRouter;
	private llmRouter: LLMRouter;
	private threshold = 0.6;
	private minConfidence = 0.3;

	constructor() {
		this.rulesRouter = new RulesRouter();
		this.mlRouter = new MLRouter();
		this.llmRouter = new LLMRouter();
	}

	async route(utterance: string, context: ChatContext): Promise<RouteDecision> {
		console.log(`[HierarchicalRouter] Routing: "${utterance}"`);

		// Pass 1: Rules-based routing (fast path)
		const ruleResult = this.rulesRouter.route(utterance, context);
		if (ruleResult && ruleResult.confidence >= this.threshold) {
			console.log(
				`[HierarchicalRouter] Rule match: ${ruleResult.skillId} (${ruleResult.confidence})`
			);
			return ruleResult;
		}

		// Pass 2: ML-based routing
		const mlResults = await this.mlRouter.route(utterance, context);
		const bestML = mlResults[0];

		if (bestML && bestML.confidence >= this.threshold) {
			console.log(
				`[HierarchicalRouter] ML match: ${bestML.skillId} (${bestML.confidence})`
			);
			return {
				...bestML,
				alternatives: mlResults.slice(1, 3),
			};
		}

		// Pass 3: LLM-based routing (only if rules and ML disagree or low confidence)
		const needsLLM = this.shouldUseLLM(ruleResult, bestML);
		if (needsLLM) {
			const llmResult = await this.llmRouter.route(utterance, context);
			if (llmResult && llmResult.confidence >= this.minConfidence) {
				console.log(
					`[HierarchicalRouter] LLM match: ${llmResult.skillId} (${llmResult.confidence})`
				);
				return llmResult;
			}
		}

		// Combine results and pick best
		const allResults = [ruleResult, bestML].filter(Boolean) as RouteDecision[];
		const bestResult = this.combineResults(allResults);

		if (bestResult && bestResult.confidence >= this.minConfidence) {
			console.log(
				`[HierarchicalRouter] Combined match: ${bestResult.skillId} (${bestResult.confidence})`
			);
			return bestResult;
		}

		// Fallback to guided suggestions
		console.log(
			`[HierarchicalRouter] No confident match, using guided fallback`
		);
		return this.createGuidedFallback(context);
	}

	private shouldUseLLM(
		ruleResult: RouteDecision | null,
		mlResult: RouteDecision | null
	): boolean {
		// Use LLM if:
		// 1. No rule match and ML confidence is low
		// 2. Rule and ML disagree significantly
		// 3. Both have low confidence

		if (!ruleResult && (!mlResult || mlResult.confidence < 0.5)) {
			return true;
		}

		if (ruleResult && mlResult) {
			const confidenceDiff = Math.abs(
				ruleResult.confidence - mlResult.confidence
			);
			const bothLow = ruleResult.confidence < 0.5 && mlResult.confidence < 0.5;
			return confidenceDiff > 0.3 || bothLow;
		}

		return false;
	}

	private combineResults(results: RouteDecision[]): RouteDecision | null {
		if (results.length === 0) return null;
		if (results.length === 1) return results[0];

		// Weighted combination: rules (0.4), ML (0.4), LLM (0.2)
		const weights = { RULE_MATCH: 0.4, ML_SEMANTIC: 0.4, LLM: 0.2 };

		const combined = results.reduce(
			(acc, result) => {
				const weight =
					weights[result.reason.split('_')[0] as keyof typeof weights] || 0.1;
				const weightedScore = result.confidence * weight;

				if (weightedScore > acc.score) {
					return {
						score: weightedScore,
						skillId: result.skillId || null,
						confidence: result.confidence,
						reason: result.reason,
					};
				}
				return acc;
			},
			{
				score: 0,
				skillId: null as FinancialSkillId | null,
				confidence: 0,
				reason: '',
			}
		);

		if (combined.skillId) {
			return {
				type: 'SKILL',
				skillId: combined.skillId,
				confidence: combined.confidence,
				reason: `COMBINED_${combined.reason}`,
			};
		}

		return null;
	}

	private createGuidedFallback(context: ChatContext): RouteDecision {
		// Create guided fallback with most relevant skills based on available data
		const availableSkills: {
			skillId: FinancialSkillId;
			priority: number;
			reason: string;
		}[] = [];

		if (context.budgets?.length) {
			availableSkills.push(
				{ skillId: 'BUDGET_STATUS', priority: 0.9, reason: 'HAS_BUDGETS' },
				{
					skillId: 'SPENDING_BY_CATEGORY',
					priority: 0.8,
					reason: 'HAS_BUDGETS',
				}
			);
		}

		if (context.goals?.length) {
			availableSkills.push({
				skillId: 'GOAL_PROGRESS',
				priority: 0.9,
				reason: 'HAS_GOALS',
			});
		}

		if (context.transactions?.length) {
			availableSkills.push(
				{
					skillId: 'CASHFLOW_SUMMARY',
					priority: 0.8,
					reason: 'HAS_TRANSACTIONS',
				},
				{
					skillId: 'TRANSACTION_SEARCH',
					priority: 0.7,
					reason: 'HAS_TRANSACTIONS',
				}
			);
		}

		// Always include overview and education
		availableSkills.push(
			{ skillId: 'OVERVIEW', priority: 0.6, reason: 'GENERAL' },
			{
				skillId: 'EDUCATION_BUDGETS_VS_GOALS',
				priority: 0.5,
				reason: 'EDUCATION',
			}
		);

		const topSkills = availableSkills
			.sort((a, b) => b.priority - a.priority)
			.slice(0, 6)
			.map((s) => s.skillId);

		return {
			type: 'FALLBACK_GUIDED',
			confidence: 0.5,
			reason: 'GUIDED_FALLBACK',
			params: { suggestedSkills: topSkills },
		};
	}
}

// Export singleton instance
export const hierarchicalRouter = new HierarchicalRouter();
