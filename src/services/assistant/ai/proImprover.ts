// ai/proImprover.ts - Pro Improver (LLM-C): only when necessary

import { WriterOutput, CriticReport } from './types';
import { FactPack } from '../factPack';
import { LiveApiService } from './liveApiService';
import { logger } from '../../../../utils/logger';


export interface ProImproverConfig {
	maxTokens: number;
	model: string;
	temperature: number;
}

export class ProImprover {
	private apiService: LiveApiService;
	private config: ProImproverConfig;

	constructor(apiService?: LiveApiService) {
		this.apiService = apiService || new LiveApiService();
		this.config = {
			maxTokens: 800,
			model: 'gpt-4',
			temperature: 0.1,
		};
	}

	/**
	 * Improve the Writer's output based on Critic feedback
	 */
	async improveResponse(
		writerOutput: WriterOutput,
		criticReport: CriticReport,
		factPack: FactPack,
		userQuery: string
	): Promise<WriterOutput> {
		try {
			// Create the system prompt
			const systemPrompt = this.createSystemPrompt();

			// Create the improvement prompt
			const improvementPrompt = this.createImprovementPrompt(
				writerOutput,
				criticReport,
				factPack,
				userQuery
			);

			// Call the LLM for improvement
			const response = await this.callLLM(systemPrompt, improvementPrompt);

			// Parse and validate the improved response
			const improvedOutput = this.parseAndValidateResponse(response);

			return improvedOutput;
		} catch (error) {
			logger.error('ProImprover failed:', error);

			// Return the original output with a safety note
			return this.createFallbackOutput(writerOutput, criticReport);
		}
	}

	/**
	 * Create the system prompt for the Pro Improver
	 */
	private createSystemPrompt(): string {
		return `You are Brie's "Improver". Using only FACTS, refine the WRITER_OUTPUT.answer_text to:

CRITICAL RULES:
- Resolve ambiguities by stating assumptions explicitly
- Provide a stepwise plan with reversible actions
- Keep all dollar amounts exactly as in FACTS; do not compute new totals
- Insert an educational disclaimer if content is strategy
- Maintain the same WRITER_OUTPUT structure
- Token cap: 800

OUTPUT FORMAT:
Return the same WRITER_OUTPUT shape with improved answer_text and updated fields.

SAFETY:
- Never invent numbers not in FACTS
- Always include educational disclaimers for strategy content
- Be conservative with recommendations
- Focus on factual accuracy and clarity`;
	}

	/**
	 * Create the improvement prompt
	 */
	private createImprovementPrompt(
		writerOutput: WriterOutput,
		criticReport: CriticReport,
		factPack: FactPack,
		userQuery: string
	): string {
		return `Improve this response based on the critic feedback:

ORIGINAL WRITER_OUTPUT:
${JSON.stringify(writerOutput, null, 2)}

CRITIC FEEDBACK:
${JSON.stringify(criticReport, null, 2)}

USER QUERY:
"${userQuery}"

AVAILABLE FACTS:
${JSON.stringify(
	{
		time_window: factPack.time_window,
		budgets: factPack.budgets?.slice(0, 8),
		goals: factPack.goals?.slice(0, 8),
		balances: factPack.balances?.slice(0, 5),
		spendingPatterns: factPack.spendingPatterns,
	},
	null,
	2
)}

IMPROVEMENT TASKS:
1. Fix any factual inaccuracies flagged by the critic
2. Resolve ambiguities by being more specific
3. Add educational disclaimers if this is strategy content
4. Ensure all numbers match the FACTS exactly
5. Make the response more actionable and clear

Return the improved WRITER_OUTPUT as JSON.`;
	}

	/**
	 * Call the LLM for improvement
	 */
	private async callLLM(
		systemPrompt: string,
		improvementPrompt: string
	): Promise<string> {
		// Use the live API service
		return this.apiService.callLLM(systemPrompt, improvementPrompt, {
			model: this.config.model,
			maxTokens: this.config.maxTokens,
			temperature: this.config.temperature,
		});
	}

	/**
	 * Parse and validate the improved response
	 */
	private parseAndValidateResponse(response: string): WriterOutput {
		try {
			const parsed = JSON.parse(response);

			// Basic validation
			if (!parsed.version || !parsed.answer_text || !parsed.used_fact_ids) {
				throw new Error('Invalid improved response format');
			}

			return {
				version: parsed.version,
				answer_text: parsed.answer_text,
				used_fact_ids: parsed.used_fact_ids || [],
				numeric_mentions: parsed.numeric_mentions || [],
				requires_clarification: parsed.requires_clarification || false,
				clarifying_questions: parsed.clarifying_questions || [],
				suggested_actions: parsed.suggested_actions || [],
				content_kind: parsed.content_kind || 'explanation',
				uncertainty_notes: parsed.uncertainty_notes || [],
			};
		} catch (error) {
			logger.error('Failed to parse improved response:', error);
			throw new Error('Invalid JSON response from improver');
		}
	}

	/**
	 * Create a fallback output when the improver fails
	 */
	private createFallbackOutput(
		writerOutput: WriterOutput,
		criticReport: CriticReport
	): WriterOutput {
		// Add a safety note and educational disclaimer
		const safetyNote =
			'⚠️ Note: This response was reviewed but could not be fully optimized due to technical limitations.';
		const disclaimer =
			'This information is for educational purposes only and should not be considered as financial advice.';

		let improvedText = writerOutput.answer_text;

		if (writerOutput.content_kind === 'strategy') {
			improvedText += ` ${disclaimer}`;
		}

		if (criticReport.issues.length > 0) {
			improvedText += ` ${safetyNote}`;
		}

		return {
			...writerOutput,
			answer_text: improvedText,
			uncertainty_notes: [
				...(writerOutput.uncertainty_notes || []),
				'ProImprover service unavailable, using fallback',
			],
		};
	}

	/**
	 * Check if this query should bypass the Writer and go straight to Pro
	 */
	shouldBypassWriter(userQuery: string): boolean {
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
		];

		return highStakesPatterns.some((pattern) =>
			pattern.test(userQuery.toLowerCase())
		);
	}
}
