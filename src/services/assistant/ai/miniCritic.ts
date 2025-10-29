// ai/miniCritic.ts - Mini Critic (LLM-B): judge the Writer (not the user)

import { WriterOutput, CriticReport } from './types';
import { FactPack } from '../factPack';
import { LiveApiService } from './liveApiService';
import { logger } from '../../../../utils/logger';


export interface MiniCriticConfig {
	maxTokens: number;
	model: string;
	temperature: number;
}

export class MiniCritic {
	private apiService: LiveApiService;
	private config: MiniCriticConfig;

	constructor(apiService?: LiveApiService) {
		this.apiService = apiService || new LiveApiService();
		this.config = {
			maxTokens: 100,
			model: 'gpt-3.5-turbo',
			temperature: 0.1,
		};
	}

	/**
	 * Review the Writer's output against the FactPack
	 */
	async reviewResponse(
		writerOutput: WriterOutput,
		factPack: FactPack,
		userQuery: string
	): Promise<CriticReport> {
		try {
			// Create the system prompt
			const systemPrompt = this.createSystemPrompt();

			// Create the review prompt
			const reviewPrompt = this.createReviewPrompt(writerOutput, factPack);

			// Call the LLM for review
			const response = await this.callLLM(systemPrompt, reviewPrompt);

			// Parse and validate the critic response
			const criticReport = this.parseAndValidateResponse(response);

			return criticReport;
		} catch (error) {
			logger.error('MiniCritic failed:', error);

			// Return a conservative critic report that recommends escalation
			return this.createFallbackReport(writerOutput, userQuery);
		}
	}

	/**
	 * Create the system prompt for the Mini Critic
	 */
	private createSystemPrompt(): string {
		return `You are Brie's "Critic". You review WRITER_OUTPUT against FACTS.

Return strict JSON:
{
  "ok": boolean,
  "risk": "low"|"medium"|"high",
  "recommend_escalation": boolean,
  "issues": [{"type":"ambiguity"|"safety"|"factuality"|"missing_disclaimer","note": string}, ...]
}

RULES:
- If WRITER_OUTPUT requires_clarification=true, set ok=false and include an "ambiguity" issue.
- If the user asks for strategy/planning, increase risk to "medium" unless FACTS include a forecast.
- If any dollar amount in WRITER_OUTPUT is not directly supported by FACTS, set ok=false and include "factuality".
- Only recommend_escalation for high-stakes planning, repeated ambiguity, or safety concerns.
- Focus on factual accuracy, not writing style.
- Be conservative - when in doubt, flag issues.`;
	}

	/**
	 * Create the review prompt
	 */
	private createReviewPrompt(
		writerOutput: WriterOutput,
		factPack: FactPack
	): string {
		return `Review this WRITER_OUTPUT against the available FACTS:

WRITER_OUTPUT:
${JSON.stringify(writerOutput, null, 2)}

AVAILABLE FACTS:
${JSON.stringify(
	{
		time_window: factPack.time_window,
		budgets: factPack.budgets?.slice(0, 5),
		goals: factPack.goals?.slice(0, 5),
		balances: factPack.balances?.slice(0, 3),
	},
	null,
	2
)}

Analyze for:
1. Factual accuracy (numbers match FACTS)
2. Ambiguity (unclear or incomplete answers)
3. Safety (forbidden claims, missing disclaimers)
4. Completeness (can answer be given with available FACTS)

Return your analysis as JSON.`;
	}

	/**
	 * Call the LLM for the review
	 */
	private async callLLM(
		systemPrompt: string,
		reviewPrompt: string
	): Promise<string> {
		// Use the live API service
		return this.apiService.callLLM(systemPrompt, reviewPrompt, {
			model: this.config.model,
			maxTokens: this.config.maxTokens,
			temperature: this.config.temperature,
		});
	}

	/**
	 * Parse and validate the critic response
	 */
	private parseAndValidateResponse(response: string): CriticReport {
		try {
			const parsed = JSON.parse(response);

			// Basic validation
			if (typeof parsed.ok !== 'boolean') {
				throw new Error('Invalid critic response format');
			}

			return {
				ok: parsed.ok,
				issues: parsed.issues || [],
				risk: parsed.risk || 'low',
				recommend_escalation: parsed.recommend_escalation || false,
			};
		} catch (error) {
			logger.error('Failed to parse critic response:', error);
			throw new Error('Invalid JSON response from critic');
		}
	}

	/**
	 * Create a fallback report when the critic fails
	 */
	private createFallbackReport(
		writerOutput: WriterOutput,
		userQuery: string
	): CriticReport {
		// Conservative fallback - recommend escalation if there are any issues
		const hasIssues =
			writerOutput.requires_clarification ||
			(writerOutput.uncertainty_notes?.length ?? 0) > 0 ||
			writerOutput.content_kind === 'strategy';

		return {
			ok: !hasIssues,
			issues: hasIssues
				? [
						{
							type: 'safety',
							note: 'Critic service unavailable, erring on side of caution',
						},
				  ]
				: [],
			risk: hasIssues ? 'medium' : 'low',
			recommend_escalation: hasIssues,
		};
	}

	/**
	 * Check if the query is high-stakes (auto-escalation trigger)
	 */
	private isHighStakesQuery(query: string): boolean {
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
		];

		return highStakesPatterns.some((pattern) =>
			pattern.test(query.toLowerCase())
		);
	}
}
