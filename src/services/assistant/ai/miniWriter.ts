// ai/miniWriter.ts - Mini Writer (LLM-A): JSON-only, "no-compute" contract

import { WriterOutput } from './types';
import { FactPack } from '../factPack';
import { LiveApiService } from './liveApiService';
import {
	ToolsOnlyContractService,
	ToolsOnlyInput,
} from '../../../services/feature/toolsOnlyContract';
import { CascadeAnalytics } from './analytics';

export interface MiniWriterConfig {
	maxTokens: number;
	model: string;
	temperature: number;
	retryAttempts?: number;
	enableCaching?: boolean;
	cacheTimeout?: number; // in milliseconds
	enableAnalytics?: boolean;
}

// Error types for better error handling
export class MiniWriterError extends Error {
	constructor(
		message: string,
		public code: string,
		public details?: Record<string, any>
	) {
		super(message);
		this.name = 'MiniWriterError';
	}
}

export class ValidationError extends MiniWriterError {
	constructor(message: string, field: string, value: any) {
		super(message, 'VALIDATION_ERROR', { field, value });
		this.name = 'ValidationError';
	}
}

export class LLMError extends MiniWriterError {
	constructor(message: string, details?: Record<string, any>) {
		super(message, 'LLM_ERROR', details);
		this.name = 'LLMError';
	}
}

export class MiniWriter {
	private apiService: LiveApiService;
	private config: MiniWriterConfig;
	private responseCache: Map<
		string,
		{ response: WriterOutput; timestamp: number }
	> = new Map();
	private analytics: CascadeAnalytics[] = [];

	constructor(apiService?: LiveApiService, config?: Partial<MiniWriterConfig>) {
		this.apiService = apiService || new LiveApiService();
		this.config = {
			maxTokens: 200,
			model: 'gpt-3.5-turbo',
			temperature: 0.1,
			retryAttempts: 3,
			enableCaching: true,
			cacheTimeout: 5 * 60 * 1000, // 5 minutes
			enableAnalytics: true,
			...config,
		};

		// Validate configuration
		this.validateConfig();
	}

	/**
	 * Generate a structured response using tools-only contract
	 */
	async generateResponse(
		userQuery: string,
		factPack: FactPack,
		intent: string,
		sessionId?: string
	): Promise<WriterOutput> {
		// Input validation
		this.validateInputs(userQuery, factPack, intent);

		// Check cache first
		const cacheKey = this.generateCacheKey(userQuery, intent, factPack);
		if (this.config.enableCaching) {
			const cached = this.getCachedResponse(cacheKey);
			if (cached) {
				console.log('[MiniWriter] Using cached response');
				return cached;
			}
		}

		const startTime = Date.now();
		let tokensIn = 0;
		let tokensOut = 0;

		try {
			console.log('[MiniWriter] Starting response generation', {
				intent,
				queryLength: userQuery.length,
				factPackSize: JSON.stringify(factPack).length,
			});

			// Prepare tools-only input (no raw user data, no PII)
			const toolsOnlyInput = ToolsOnlyContractService.prepareToolsOnlyInput(
				userQuery,
				intent,
				factPack
			);

			// Create the system prompt for tools-only contract
			const systemPrompt = this.createToolsOnlySystemPrompt();

			// Create the user prompt with tools-only data
			const userPrompt = this.createToolsOnlyUserPrompt(toolsOnlyInput);

			tokensIn = systemPrompt.length + userPrompt.length;

			console.log('[MiniWriter] Calling LLM', {
				systemPromptLength: systemPrompt.length,
				userPromptLength: userPrompt.length,
				model: this.config.model,
			});

			// Call the LLM with retry logic
			const response = await this.callLLM(systemPrompt, userPrompt);

			tokensOut = response.length;

			console.log('[MiniWriter] LLM response received', {
				responseLength: response.length,
			});

			// Validate response against toolsOut
			const validatedResponse = ToolsOnlyContractService.processLLMResponse(
				response,
				toolsOnlyInput.toolsOut,
				intent
			);

			if (!validatedResponse.isValid) {
				console.warn(
					'MiniWriter: Tools-only contract violation:',
					validatedResponse.violations
				);
				// Return fallback response when validation fails
				return this.createFallbackResponse(userQuery, factPack);
			}

			// Parse and validate the JSON response
			const writerOutput = this.parseAndValidateResponse(
				validatedResponse.response
			);

			// Cache the response
			if (this.config.enableCaching) {
				this.cacheResponse(cacheKey, writerOutput);
			}

			// Log analytics
			if (this.config.enableAnalytics) {
				this.logAnalytics('writer_done', {
					intent,
					tokens_in: tokensIn,
					tokens_out: tokensOut,
					used_fact_ids: writerOutput.used_fact_ids,
					timestamp: Date.now(),
					session_id: sessionId || 'unknown',
				});
			}

			console.log('[MiniWriter] Response generated successfully', {
				contentKind: writerOutput.content_kind,
				requiresClarification: writerOutput.requires_clarification,
				processingTime: Date.now() - startTime,
			});

			return writerOutput;
		} catch (error) {
			console.error('[MiniWriter] Generation failed:', error);

			// Log error analytics
			if (this.config.enableAnalytics) {
				this.logAnalytics('writer_error', {
					intent,
					error: error instanceof Error ? error.message : String(error),
					timestamp: Date.now(),
					session_id: sessionId || 'unknown',
				});
			}

			// Return a safe fallback that requires clarification
			return this.createFallbackResponse(userQuery, factPack);
		}
	}

	/**
	 * Create the system prompt for tools-only contract
	 */
	private createToolsOnlySystemPrompt(): string {
		return `You are Brie's "Writer" using a tools-only contract. You can ONLY use numbers and data from the provided toolsOut. Do not invent any numbers or dates.

CRITICAL RULES:
- Output strict JSON that matches the WRITER_OUTPUT schema (no extra keys, no prose outside JSON)
- ONLY use numbers that exist in the toolsOut data - any invented numbers will cause validation failure
- If the user's question cannot be fully answered with toolsOut, set requires_clarification=true and propose up to 2 short clarifying_questions
- Always include used_fact_ids and numeric_mentions for any $amounts you show
- Always mention the time window from toolsOut.time_window in answer_text
- Do not compute new totals or perform calculations not present in toolsOut
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
	 * Create the user prompt for tools-only contract
	 */
	private createToolsOnlyUserPrompt(toolsOnlyInput: ToolsOnlyInput): string {
		return `INTENT: ${toolsOnlyInput.intent}

TOOLS_OUT (JSON):
${JSON.stringify(toolsOnlyInput.toolsOut, null, 2)}

Generate a response using ONLY the data from toolsOut. Do not invent any numbers.`;
	}

	/**
	 * Validate configuration parameters
	 */
	private validateConfig(): void {
		if (this.config.maxTokens <= 0 || this.config.maxTokens > 4000) {
			throw new ValidationError(
				'maxTokens must be between 1 and 4000',
				'maxTokens',
				this.config.maxTokens
			);
		}

		if (this.config.temperature < 0 || this.config.temperature > 2) {
			throw new ValidationError(
				'temperature must be between 0 and 2',
				'temperature',
				this.config.temperature
			);
		}

		if (!this.config.model || typeof this.config.model !== 'string') {
			throw new ValidationError(
				'model must be a non-empty string',
				'model',
				this.config.model
			);
		}
	}

	/**
	 * Validate input parameters
	 */
	private validateInputs(
		userQuery: string,
		factPack: FactPack,
		intent: string
	): void {
		if (
			!userQuery ||
			typeof userQuery !== 'string' ||
			userQuery.trim().length === 0
		) {
			throw new ValidationError(
				'userQuery must be a non-empty string',
				'userQuery',
				userQuery
			);
		}

		if (!factPack || typeof factPack !== 'object') {
			throw new ValidationError(
				'factPack must be a valid FactPack object',
				'factPack',
				factPack
			);
		}

		if (!intent || typeof intent !== 'string' || intent.trim().length === 0) {
			throw new ValidationError(
				'intent must be a non-empty string',
				'intent',
				intent
			);
		}

		// Validate FactPack structure
		if (
			!factPack.time_window ||
			!factPack.time_window.start ||
			!factPack.time_window.end
		) {
			throw new ValidationError(
				'factPack must have a valid time_window',
				'factPack.time_window',
				factPack.time_window
			);
		}
	}

	/**
	 * Call the LLM with retry logic
	 */
	private async callLLM(
		systemPrompt: string,
		userPrompt: string
	): Promise<string> {
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
			try {
				console.log(
					`[MiniWriter] LLM call attempt ${attempt}/${this.config.retryAttempts}`
				);

				// Use the live API service
				return await this.apiService.callLLM(systemPrompt, userPrompt, {
					model: this.config.model,
					maxTokens: this.config.maxTokens,
					temperature: this.config.temperature,
				});
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				console.warn(
					`[MiniWriter] LLM call attempt ${attempt} failed:`,
					lastError.message
				);

				// Don't retry on validation errors or client errors
				if (error instanceof ValidationError || this.isClientError(error)) {
					break;
				}

				// Wait before retrying (exponential backoff)
				if (attempt < this.config.retryAttempts!) {
					const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
					console.log(`[MiniWriter] Waiting ${delay}ms before retry`);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		// All retries failed
		console.error('[MiniWriter] All LLM call attempts failed:', lastError);
		throw new LLMError('Failed to call LLM service after all retry attempts', {
			originalError: lastError?.message || 'Unknown error',
			model: this.config.model,
			maxTokens: this.config.maxTokens,
			attempts: this.config.retryAttempts,
		});
	}

	/**
	 * Check if error is a client error that shouldn't be retried
	 */
	private isClientError(error: any): boolean {
		// Check for common client errors that shouldn't be retried
		const clientErrorPatterns = [
			/validation/i,
			/invalid.*request/i,
			/unauthorized/i,
			/forbidden/i,
			/not found/i,
			/bad request/i,
		];

		const errorMessage = error?.message || String(error);
		return clientErrorPatterns.some((pattern) => pattern.test(errorMessage));
	}

	/**
	 * Generate cache key for response caching
	 */
	private generateCacheKey(
		userQuery: string,
		intent: string,
		factPack: FactPack
	): string {
		// Create a hash of the inputs for caching
		const keyData = {
			query: userQuery.toLowerCase().trim(),
			intent,
			factPackHash: factPack.metadata?.hash || 'no-hash',
			model: this.config.model,
			temperature: this.config.temperature,
		};

		const keyString = JSON.stringify(keyData);
		// Simple hash function - in production, use crypto.createHash('sha256')
		let hash = 0;
		for (let i = 0; i < keyString.length; i++) {
			const char = keyString.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return `miniwriter_${Math.abs(hash).toString(36)}`;
	}

	/**
	 * Get cached response if available and not expired
	 */
	private getCachedResponse(cacheKey: string): WriterOutput | null {
		const cached = this.responseCache.get(cacheKey);
		if (!cached) {
			return null;
		}

		const now = Date.now();
		if (now - cached.timestamp > this.config.cacheTimeout!) {
			// Cache expired, remove it
			this.responseCache.delete(cacheKey);
			return null;
		}

		return cached.response;
	}

	/**
	 * Cache response for future use
	 */
	private cacheResponse(cacheKey: string, response: WriterOutput): void {
		this.responseCache.set(cacheKey, {
			response,
			timestamp: Date.now(),
		});

		// Clean up old cache entries periodically
		if (this.responseCache.size > 100) {
			this.cleanupCache();
		}
	}

	/**
	 * Clean up expired cache entries
	 */
	private cleanupCache(): void {
		const now = Date.now();
		const expiredKeys: string[] = [];

		for (const [key, value] of this.responseCache.entries()) {
			if (now - value.timestamp > this.config.cacheTimeout!) {
				expiredKeys.push(key);
			}
		}

		expiredKeys.forEach((key) => this.responseCache.delete(key));
		console.log(
			`[MiniWriter] Cleaned up ${expiredKeys.length} expired cache entries`
		);
	}

	/**
	 * Log analytics event
	 */
	private logAnalytics(eventType: string, data: any): void {
		if (!this.config.enableAnalytics) {
			return;
		}

		const analyticsEvent = {
			type: eventType,
			data,
			timestamp: Date.now(),
		};

		this.analytics.push(analyticsEvent as any);

		// In production, you would send this to your analytics service
		console.log('[MiniWriter] Analytics event:', analyticsEvent);
	}

	/**
	 * Get analytics data
	 */
	getAnalytics(): CascadeAnalytics[] {
		return [...this.analytics];
	}

	/**
	 * Clear analytics data
	 */
	clearAnalytics(): void {
		this.analytics = [];
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; hitRate: number } {
		return {
			size: this.responseCache.size,
			hitRate: 0, // Would need to track hits/misses in production
		};
	}

	/**
	 * Parse and validate the LLM response
	 */
	private parseAndValidateResponse(response: string): WriterOutput {
		try {
			const parsed = JSON.parse(response);

			// Basic validation
			if (!parsed.version || !parsed.answer_text || !parsed.used_fact_ids) {
				throw new ValidationError(
					'Invalid response format: missing required fields',
					'response',
					parsed
				);
			}

			// Validate version
			if (parsed.version !== '1.0') {
				console.warn(
					'[MiniWriter] Unexpected response version:',
					parsed.version
				);
			}

			// Validate content_kind
			const validContentKinds = ['status', 'explanation', 'strategy'];
			if (
				parsed.content_kind &&
				!validContentKinds.includes(parsed.content_kind)
			) {
				console.warn('[MiniWriter] Invalid content_kind:', parsed.content_kind);
				parsed.content_kind = 'status';
			}

			// Validate numeric_mentions structure
			if (parsed.numeric_mentions && Array.isArray(parsed.numeric_mentions)) {
				parsed.numeric_mentions = parsed.numeric_mentions.filter(
					(mention: any) => {
						return (
							mention &&
							typeof mention.value === 'number' &&
							mention.unit === 'USD' &&
							['spent', 'limit', 'remaining', 'balance', 'forecast'].includes(
								mention.kind
							)
						);
					}
				);
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
			console.error('[MiniWriter] Failed to parse LLM response:', error);
			if (error instanceof ValidationError) {
				throw error;
			}
			throw new ValidationError(
				'Invalid JSON response from LLM',
				'response',
				response
			);
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
