// ai/miniWriter.ts - Mini Writer (LLM-A): JSON-only, "no-compute" contract

import { WriterOutput } from './types';
import { FactPack } from '../factPack';
import { MockApiService } from './mockApiService';

export interface MiniWriterConfig {
	maxTokens: number;
	model: string;
	temperature: number;
}

export class MiniWriter {
	private apiService: ApiService;
	private config: MiniWriterConfig;

	constructor(apiService?: MockApiService) {
		this.apiService = apiService || new MockApiService();
		this.config = {
			maxTokens: 200,
			model: 'gpt-3.5-turbo',
			temperature: 0.1,
		};
	}

	/**
	 * Generate a structured response using only FactPack data
	 */
	async generateResponse(
		userQuery: string,
		factPack: FactPack,
		intent: string
	): Promise<WriterOutput> {
		try {
			// Prepare minimal FactPack subset for token efficiency
			const relevantFacts = this.prepareRelevantFacts(factPack, intent);

			// Create the system prompt
			const systemPrompt = this.createSystemPrompt();

			// Create the user prompt with context
			const userPrompt = this.createUserPrompt(
				userQuery,
				relevantFacts,
				factPack.time_window
			);

			// Call the LLM
			const response = await this.callLLM(systemPrompt, userPrompt);

			// Parse and validate the JSON response
			const writerOutput = this.parseAndValidateResponse(response);

			return writerOutput;
		} catch (error) {
			console.error('MiniWriter failed:', error);

			// Return a safe fallback that requires clarification
			return this.createFallbackResponse(userQuery, factPack);
		}
	}

	/**
	 * Prepare minimal subset of FactPack relevant to the intent
	 */
	private prepareRelevantFacts(factPack: FactPack, intent: string): any {
		const relevant: any = { time_window: factPack.time_window };

		switch (intent) {
			case 'GET_BALANCE':
			case 'GET_BUDGET_STATUS':
				relevant.budgets = factPack.budgets?.slice(0, 5); // Top 5 budgets
				relevant.balances = factPack.balances?.slice(0, 3); // Top 3 accounts
				break;

			case 'GET_GOAL_PROGRESS':
				relevant.goals = factPack.goals?.slice(0, 5); // Top 5 goals
				break;

			case 'FORECAST_SPEND':
				relevant.recentTransactions = factPack.recentTransactions?.slice(0, 10); // Last 10
				relevant.spendingPatterns = factPack.spendingPatterns;
				break;

			default:
				// Include essential data for general queries
				relevant.budgets = factPack.budgets?.slice(0, 3);
				relevant.goals = factPack.goals?.slice(0, 3);
				relevant.balances = factPack.balances?.slice(0, 2);
		}

		return relevant;
	}

	/**
	 * Create the system prompt for the Mini Writer
	 */
	private createSystemPrompt(): string {
		return `You are Brie's "Writer". Only explain what is in FACTS. Do not invent numbers or dates.

CRITICAL RULES:
- Output strict JSON that matches the WRITER_OUTPUT schema (no extra keys, no prose outside JSON)
- If the user's question cannot be fully answered with FACTS, set requires_clarification=true and propose up to 2 short clarifying_questions
- Always include used_fact_ids and numeric_mentions for any $amounts you show
- Always mention the time window {FACTS.time_window.start}–{FACTS.time_window.end} ({FACTS.time_window.tz}) in answer_text
- Do not compute new totals or perform calculations not present in FACTS
- Keep answer_text concise and factual
- Set content_kind to 'status' for informational queries, 'explanation' for analysis, 'strategy' for advice

OUTPUT FORMAT:
{
  "version": "1.0",
  "answer_text": "Your response here...",
  "used_fact_ids": ["fact_id_1", "fact_id_2"],
  "numeric_mentions": [
    {"value": 100, "unit": "USD", "kind": "spent", "fact_id": "fact_id_1"}
  ],
  "requires_clarification": false,
  "content_kind": "status"
}`;
	}

	/**
	 * Create the user prompt with context
	 */
	private createUserPrompt(
		userQuery: string,
		relevantFacts: any,
		timeWindow: any
	): string {
		return `User Question: "${userQuery}"

Available Facts (${timeWindow.start} to ${timeWindow.end}):
${JSON.stringify(relevantFacts, null, 2)}

Generate a response using ONLY the facts above. If you need more information, set requires_clarification=true.`;
	}

	/**
	 * Call the LLM with the prompts
	 */
	private async callLLM(
		systemPrompt: string,
		userPrompt: string
	): Promise<string> {
		// Use the mock API service
		return this.apiService.callLLM(systemPrompt, userPrompt);
	}

	/**
	 * Parse and validate the LLM response
	 */
	private parseAndValidateResponse(response: string): WriterOutput {
		try {
			const parsed = JSON.parse(response);

			// Basic validation
			if (!parsed.version || !parsed.answer_text || !parsed.used_fact_ids) {
				throw new Error('Invalid response format');
			}

			return {
				version: parsed.version,
				answer_text: parsed.answer_text,
				used_fact_ids: parsed.used_fact_ids || [],
				numeric_mentions: parsed.numeric_mentions || [],
				requires_clarification: parsed.requires_clarification || false,
				clarifying_questions: parsed.clarifying_questions || [],
				suggested_actions: parsed.suggested_actions || [],
				content_kind: parsed.content_kind || 'status',
				uncertainty_notes: parsed.uncertainty_notes || [],
			};
		} catch (error) {
			console.error('Failed to parse LLM response:', error);
			throw new Error('Invalid JSON response from LLM');
		}
	}

	/**
	 * Create a fallback response when the writer fails
	 */
	private createFallbackResponse(
		userQuery: string,
		factPack: FactPack
	): WriterOutput {
		return {
			version: '1.0',
			answer_text: `I need more information to answer your question about "${userQuery}".`,
			used_fact_ids: [],
			numeric_mentions: [],
			requires_clarification: true,
			clarifying_questions: [
				'Which specific budget or account are you asking about?',
				'What time period would you like me to focus on?',
			],
			suggested_actions: [
				{ label: 'View Budgets', action: 'OPEN_BUDGET' },
				{ label: 'View Goals', action: 'OPEN_BUDGET' },
			],
			content_kind: 'status',
			uncertainty_notes: ['Writer service unavailable, using fallback'],
		};
	}
}
