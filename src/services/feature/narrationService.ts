import {
	narrationPrompt,
	criticPrompt,
	fallbackTemplate,
	NarrationFacts,
	UserProfile,
} from '../../services/assistant/promptBuilder';
import { ChatResponse } from '../../services/assistant/responseSchema';
import TokenUsageService from './tokenUsageService';
import { EnhancedTieredAIService } from './enhancedTieredAIService';

export interface NarrationOptions {
	useMiniModel?: boolean;
	enableCritic?: boolean;
	maxTokens?: number;
	temperature?: number;
}

export class NarrationService {
	private aiService: EnhancedTieredAIService;
	private tokenService: TokenUsageService;

	constructor(
		aiService: EnhancedTieredAIService,
		tokenService: TokenUsageService
	) {
		this.aiService = aiService;
		this.tokenService = tokenService;
	}

	/**
	 * Generate a narrated response based on grounded facts
	 */
	async narrate(
		userQuestion: string,
		facts: NarrationFacts,
		userProfile: UserProfile,
		options: NarrationOptions = {}
	): Promise<ChatResponse> {
		const {
			useMiniModel = true,
			enableCritic = true,
			maxTokens = 150,
			temperature = 0.3,
		} = options;

		// Track user message for token usage
		this.tokenService.trackUserMessage(
			userQuestion,
			useMiniModel ? 'gpt-3.5-turbo' : 'gpt-4'
		);

		try {
			// Determine question type for fallback template
			const questionType = this.detectQuestionType(userQuestion);

			// Check if aiService has the expected methods
			if (!this.aiService || typeof this.aiService.getResponse !== 'function') {
				console.warn(
					'AI service not properly initialized, using fallback template'
				);
				return fallbackTemplate(facts, questionType);
			}

			// Prepare narration prompt with facts and user profile
			const prompt = narrationPrompt(facts, userProfile);
			const fullPrompt = `${prompt}

User Question: ${userQuestion}

Please keep your response concise (max ${maxTokens} tokens) and maintain a professional tone (temperature: ${temperature}).`;

			// Try to get response from the AI service
			let aiResponse;
			try {
				// Use the getResponse method that EnhancedTieredAIService provides
				aiResponse = await this.aiService.getResponse(fullPrompt);

				// Track successful AI response
				const responseText =
					typeof aiResponse.response === 'string'
						? aiResponse.response
						: JSON.stringify(aiResponse.response);
				this.tokenService.trackAIResponse(
					responseText,
					useMiniModel ? 'gpt-3.5-turbo' : 'gpt-4',
					{
						complexity: useMiniModel ? 'mini' : 'std',
						confidence: 0.8,
						responseTime: Date.now(),
					}
				);
			} catch (aiError) {
				console.warn(
					'AI service call failed, using fallback template:',
					aiError
				);

				// Track failed AI response - no need to track failed responses separately

				return fallbackTemplate(facts, questionType);
			}

			// Check if we got a valid response
			if (!aiResponse || !aiResponse.response) {
				console.warn(
					'No valid response from AI service, using fallback template'
				);
				return fallbackTemplate(facts, questionType);
			}

			// Try to parse the response as JSON if it's structured
			let parsedResponse: ChatResponse;
			try {
				// Check if response is already a ChatResponse object
				if (
					typeof aiResponse.response === 'object' &&
					aiResponse.response &&
					'message' in aiResponse.response
				) {
					parsedResponse = aiResponse.response as ChatResponse;
				} else {
					// Try to parse as JSON string
					parsedResponse = JSON.parse(aiResponse.response);
				}
			} catch (parseError) {
				console.warn(
					'Failed to parse AI response, using fallback template:',
					parseError
				);
				return fallbackTemplate(facts, questionType);
			}

			// Validate response structure
			if (!this.isValidResponse(parsedResponse)) {
				console.warn('Invalid response structure, using fallback template');
				return fallbackTemplate(facts, questionType);
			}

			// Run critic pass if enabled and using mini model
			if (enableCritic && useMiniModel) {
				const criticResult = await this.runCriticPass(parsedResponse, facts);

				if (!criticResult.isValid) {
					console.warn('Critic found issues, using fallback template');
					return fallbackTemplate(facts, questionType);
				}
			}

			// Add cost estimation with token limits
			const estimatedTokens = this.estimateTokens(parsedResponse);
			const finalTokens = Math.min(estimatedTokens, maxTokens);

			parsedResponse.cost = {
				model: useMiniModel ? 'mini' : 'std',
				estTokens: finalTokens,
			};

			// Add temperature and token limit info to response
			if (parsedResponse.details) {
				parsedResponse.details += ` (Generated with temperature: ${temperature}, token limit: ${maxTokens})`;
			} else {
				parsedResponse.details = `Generated with temperature: ${temperature}, token limit: ${maxTokens}`;
			}

			// Token usage already tracked in the AI response tracking above

			return parsedResponse;
		} catch (error) {
			console.error('Narration service error:', error);

			// Fallback to deterministic template
			const questionType = this.detectQuestionType(userQuestion);
			return fallbackTemplate(facts, questionType);
		}
	}

	/**
	 * Run a critic pass to check for factual accuracy
	 */
	private async runCriticPass(
		response: ChatResponse,
		facts: NarrationFacts
	): Promise<{
		isValid: boolean;
		issues: string[];
		fixes: string[];
		confidence: number;
	}> {
		try {
			// Check if aiService has the required method
			if (!this.aiService || typeof this.aiService.getResponse !== 'function') {
				console.warn(
					'AI service not available for critic pass, assuming response is valid'
				);
				return { isValid: true, issues: [], fixes: [], confidence: 0.7 };
			}

			const criticPromptText = criticPrompt(JSON.stringify(response), facts);

			// Use the available getResponse method instead of generateResponse
			const criticResponse = await this.aiService.getResponse(criticPromptText);

			// Check if we got a valid response
			if (!criticResponse || !criticResponse.response) {
				console.warn('No valid critic response, assuming response is valid');
				return { isValid: true, issues: [], fixes: [], confidence: 0.7 };
			}

			try {
				// Try to parse the critic response
				let criticResult;
				if (typeof criticResponse.response === 'object') {
					criticResult = criticResponse.response;
				} else {
					criticResult = JSON.parse(criticResponse.response);
				}
				return criticResult;
			} catch (parseError) {
				// If critic fails to parse, assume response is valid
				console.warn(
					'Critic response parsing failed, assuming response is valid:',
					parseError
				);
				return { isValid: true, issues: [], fixes: [], confidence: 0.8 };
			}
		} catch (error) {
			console.warn('Critic pass failed, assuming response is valid:', error);
			return { isValid: true, issues: [], fixes: [], confidence: 0.7 };
		}
	}

	/**
	 * Detect the type of question for fallback template selection
	 */
	private detectQuestionType(
		question: string
	): 'budget' | 'goal' | 'spending' | 'general' {
		const q = question.toLowerCase();

		if (q.includes('budget') || q.includes('limit') || q.includes('spending')) {
			return 'budget';
		}

		if (q.includes('goal') || q.includes('save') || q.includes('progress')) {
			return 'goal';
		}

		if (
			q.includes('spend') ||
			q.includes('expense') ||
			q.includes('transaction')
		) {
			return 'spending';
		}

		return 'general';
	}

	/**
	 * Validate that the response has the required structure
	 */
	private isValidResponse(response: any): response is ChatResponse {
		return (
			response &&
			typeof response.message === 'string' &&
			response.message.length > 0 &&
			(!response.actions || Array.isArray(response.actions)) &&
			(!response.sources || Array.isArray(response.sources))
		);
	}

	/**
	 * Estimate token count for cost tracking
	 */
	private estimateTokens(response: ChatResponse): number {
		let tokens = 0;

		// Base message tokens
		tokens += response.message.length / 4;

		// Details tokens
		if (response.details) {
			tokens += response.details.length / 4;
		}

		// Actions tokens
		if (response.actions) {
			response.actions.forEach((action) => {
				tokens += action.label.length / 4;
				tokens += action.action.length / 4;
			});
		}

		// Sources tokens
		if (response.sources) {
			response.sources.forEach((source) => {
				tokens += source.kind.length / 4;
				if (source.note) tokens += source.note.length / 4;
			});
		}

		return Math.round(tokens);
	}

	/**
	 * Estimate tokens from AI service response
	 */
	private estimateTokensFromResponse(response: any): number {
		if (!response || !response.response) {
			return 0;
		}

		let tokens = 0;
		const responseText =
			typeof response.response === 'string'
				? response.response
				: JSON.stringify(response.response);

		tokens += responseText.length / 4;

		// Add tokens for any additional data in the response
		if (response.usage?.estimatedTokens) {
			tokens = response.usage.estimatedTokens;
		}

		return Math.round(tokens);
	}

	/**
	 * Prepare facts from app data for narration
	 */
	prepareFacts(
		budgets: any[],
		goals: any[],
		transactions: any[],
		profile: any,
		insights: any[] = [],
		recurringExpenses: any[] = []
	): NarrationFacts {
		return {
			budgets:
				budgets?.map((b) => ({
					name: b.name || 'Unknown',
					amount: b.amount || 0,
					spent: b.spent || 0,
					category: b.category,
				})) || [],

			goals:
				goals?.map((g) => ({
					name: g.name || 'Unknown',
					target: g.target || 0,
					current: g.current || 0,
					deadline: g.deadline,
				})) || [],

			transactions:
				transactions?.slice(0, 10).map((t) => ({
					amount: t.amount || 0,
					category: t.category || 'Unknown',
					date: t.date || new Date().toISOString(),
					description: t.description || 'No description',
				})) || [],

			recurringExpenses:
				recurringExpenses?.map((r) => ({
					vendor: r.vendor || 'Unknown',
					amount: r.amount || 0,
					frequency: r.frequency || 'monthly',
					nextDue: r.nextExpectedDate,
					isOverdue: new Date(r.nextExpectedDate) < new Date(),
				})) || [],

			profile: profile
				? {
						monthlyIncome: profile.monthlyIncome,
						savings: profile.savings,
						debt: profile.debt,
						riskProfile: profile.riskProfile?.tolerance,
				  }
				: undefined,

			insights:
				insights?.map((i) => ({
					type: i.type || 'general',
					message: i.message || '',
					confidence: i.confidence || 0.5,
					data: i.data,
				})) || [],
		};
	}

	/**
	 * Prepare user profile for narration
	 */
	prepareUserProfile(goals: any[], preferences: any): UserProfile {
		return {
			goals:
				goals?.map((g) => ({
					name: g.name || 'Unknown',
					priority: g.priority || 'medium',
					category: g.category || 'general',
				})) || [],

			preferences: preferences
				? {
						riskTolerance: preferences.riskTolerance || 'moderate',
						focusAreas: preferences.focusAreas || ['budgeting', 'saving'],
				  }
				: undefined,
		};
	}

	/**
	 * Create a more sophisticated narration using the prompt system
	 */
	async createNarrationWithPrompt(
		userQuestion: string,
		facts: NarrationFacts,
		userProfile: UserProfile,
		options: NarrationOptions = {}
	): Promise<ChatResponse> {
		const {
			useMiniModel = true,
			enableCritic = true,
			maxTokens = 150,
			temperature = 0.3,
		} = options;

		try {
			// Create a more detailed prompt that includes context
			const basePrompt = narrationPrompt(facts, userProfile);
			const enhancedPrompt = `${basePrompt}

CONTEXT:
- Question: ${userQuestion}
- Max tokens: ${maxTokens}
- Temperature: ${temperature}
- Model: ${useMiniModel ? 'mini' : 'std'}

Please provide a structured response that follows the format exactly.`;

			// Track user message
			this.tokenService.trackUserMessage(
				userQuestion,
				useMiniModel ? 'gpt-3.5-turbo' : 'gpt-4'
			);

			// Get AI response
			const aiResponse = await this.aiService.getResponse(enhancedPrompt);

			if (!aiResponse || !aiResponse.response) {
				return fallbackTemplate(facts, this.detectQuestionType(userQuestion));
			}

			// Parse and validate response
			let parsedResponse: ChatResponse;
			try {
				if (
					typeof aiResponse.response === 'object' &&
					'message' in aiResponse.response
				) {
					parsedResponse = aiResponse.response as ChatResponse;
				} else {
					parsedResponse = JSON.parse(aiResponse.response);
				}
			} catch (parseError) {
				console.warn('Failed to parse enhanced AI response:', parseError);
				return fallbackTemplate(facts, this.detectQuestionType(userQuestion));
			}

			// Validate response structure
			if (!this.isValidResponse(parsedResponse)) {
				console.warn('Invalid enhanced response structure');
				return fallbackTemplate(facts, this.detectQuestionType(userQuestion));
			}

			// Run critic if enabled
			if (enableCritic) {
				const criticResult = await this.runCriticPass(parsedResponse, facts);
				if (!criticResult.isValid) {
					console.warn('Critic found issues with enhanced response');
					return fallbackTemplate(facts, this.detectQuestionType(userQuestion));
				}
			}

			// Add cost and metadata
			const estimatedTokens = this.estimateTokens(parsedResponse);
			parsedResponse.cost = {
				model: useMiniModel ? 'mini' : 'std',
				estTokens: Math.min(estimatedTokens, maxTokens),
			};

			// Track AI response
			const responseText =
				typeof aiResponse.response === 'string'
					? aiResponse.response
					: JSON.stringify(aiResponse.response);
			this.tokenService.trackAIResponse(
				responseText,
				useMiniModel ? 'gpt-3.5-turbo' : 'gpt-4',
				{
					complexity: useMiniModel ? 'mini' : 'std',
					confidence: 0.9,
					responseTime: Date.now(),
				}
			);

			return parsedResponse;
		} catch (error) {
			console.error('Enhanced narration failed:', error);
			return fallbackTemplate(facts, this.detectQuestionType(userQuestion));
		}
	}
}
