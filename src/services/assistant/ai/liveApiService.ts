// ai/liveApiService.ts - Live API service for production LLM calls

import { ApiService } from '../../core/apiService';

export interface LLMRequest {
	systemPrompt: string;
	userPrompt: string;
	model?: string;
	maxTokens?: number;
	temperature?: number;
}

export interface LLMResponse {
	response: string;
	usage?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

export class LiveApiService {
	/**
	 * Make a live LLM API call
	 */
	async callLLM(
		systemPrompt: string,
		userPrompt: string,
		options?: {
			model?: string;
			maxTokens?: number;
			temperature?: number;
		}
	): Promise<string> {
		try {
			const requestPayload: LLMRequest = {
				systemPrompt,
				userPrompt,
				model: options?.model || 'gpt-3.5-turbo',
				maxTokens: options?.maxTokens || 1000,
				temperature: options?.temperature || 0.1,
			};

				model: requestPayload.model,
				maxTokens: requestPayload.maxTokens,
				temperature: requestPayload.temperature,
				systemPromptLength: systemPrompt.length,
				userPromptLength: userPrompt.length,
			});

			const response = await ApiService.post<LLMResponse>(
				'/api/llm/chat',
				requestPayload
			);

			if (response.success && response.data) {
					responseLength: response.data.response.length,
					usage: response.data.usage,
				});
				return response.data.response;
			}

			throw new Error(response.error || 'LLM API call failed');
		} catch (error) {
			console.error('[LiveApiService] LLM call failed:', error);
			throw error;
		}
	}
}
