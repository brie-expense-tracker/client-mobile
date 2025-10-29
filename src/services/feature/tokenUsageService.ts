import { ApiService } from '../core/apiService';
import { SecureCacheService } from '../security/secureCacheService';
import { logger } from '../../../utils/logger';


// Dynamic import fallback for AsyncStorage to handle potential bundler issues
let AsyncStorage: any = null;

try {
	// Use dynamic import instead of require
	import('@react-native-async-storage/async-storage')
		.then((module) => {
			AsyncStorage = module.default;
		})
		.catch((error) => {
			logger.warn(
				'Failed to import AsyncStorage, token tracking will be disabled:',
				error
			);
		});
} catch (error) {
	logger.warn(
		'Failed to import AsyncStorage, token tracking will be disabled:',
		error
	);
}

interface TokenUsage {
	conversationId: string;
	userId: string;
	tokensUsed: number;
	modelUsed: string;
	timestamp: string;
	messageType: 'user' | 'ai';
	messageLength: number;
	estimatedCost: number;
	complexity?: 'mini' | 'std' | 'pro';
	confidence?: number;
	responseTime?: number;
	apiEndpoint?: string;
}

interface UsageSummary {
	totalTokens: number;
	totalCost: number;
	conversationsCount: number;
	averageTokensPerConversation: number;
	monthlyUsage: {
		[month: string]: {
			tokens: number;
			cost: number;
			conversations: number;
		};
	};
	modelBreakdown: {
		[model: string]: {
			tokens: number;
			cost: number;
			requests: number;
		};
	};
	complexityBreakdown: {
		mini: { tokens: number; cost: number; requests: number };
		std: { tokens: number; cost: number; requests: number };
		pro: { tokens: number; cost: number; requests: number };
	};
	dailyUsage: {
		[date: string]: {
			tokens: number;
			cost: number;
			requests: number;
		};
	};
}

class TokenUsageService {
	private static instance: TokenUsageService;
	private currentConversationId: string | null = null;
	private conversationTokens: number = 0;

	private constructor() {}

	public static getInstance(): TokenUsageService {
		if (!TokenUsageService.instance) {
			TokenUsageService.instance = new TokenUsageService();
		}
		return TokenUsageService.instance;
	}

	/**
	 * Start tracking a new conversation
	 */
	public startConversation(): string {
		try {
			// Test AsyncStorage availability
			if (typeof AsyncStorage === 'undefined') {
				logger.warn('AsyncStorage not available during conversation start');
			}

			this.currentConversationId = `conv_${Date.now()}_${Math.random()
				.toString(36)
				.substr(2, 9)}`;
			this.conversationTokens = 0;
			return this.currentConversationId;
		} catch (error) {
			logger.warn('Failed to start conversation tracking:', error);
			// Generate a fallback conversation ID
			this.currentConversationId = `conv_fallback_${Date.now()}`;
			this.conversationTokens = 0;
			return this.currentConversationId;
		}
	}

	/**
	 * Track user message tokens
	 */
	public async trackUserMessage(
		message: string,
		modelUsed: string = 'gpt-3.5-turbo'
	): Promise<void> {
		// Skip tracking if AsyncStorage is not available
		if (!AsyncStorage) {
			logger.debug('AsyncStorage not available, skipping token tracking');
			return;
		}

		try {
			if (!this.currentConversationId) {
				this.startConversation();
			}

			const tokens = this.estimateTokens(message);
			this.conversationTokens += tokens;

			const userId = await this.getCurrentUserId();
			await this.recordTokenUsage({
				conversationId: this.currentConversationId!,
				userId,
				tokensUsed: tokens,
				modelUsed,
				timestamp: new Date().toISOString(),
				messageType: 'user',
				messageLength: message.length,
				estimatedCost: this.calculateCost(tokens, modelUsed),
			});
		} catch (error) {
			logger.warn(
				'Token tracking failed, continuing without tracking:',
				error
			);
			// Don't let token tracking failures break the app
		}
	}

	/**
	 * Track AI response tokens
	 */
	public async trackAIResponse(
		response: string,
		modelUsed: string = 'gpt-3.5-turbo',
		options?: {
			complexity?: 'mini' | 'std' | 'pro';
			confidence?: number;
			responseTime?: number;
			apiEndpoint?: string;
		}
	): Promise<void> {
		// Skip tracking if AsyncStorage is not available
		if (!AsyncStorage) {
			logger.debug(
				'AsyncStorage not available, skipping AI response token tracking'
			);
			return;
		}

		try {
			if (!this.currentConversationId) {
				return;
			}

			const tokens = this.estimateTokens(response);
			this.conversationTokens += tokens;

			const userId = await this.getCurrentUserId();
			await this.recordTokenUsage({
				conversationId: this.currentConversationId,
				userId,
				tokensUsed: tokens,
				modelUsed,
				timestamp: new Date().toISOString(),
				messageType: 'ai',
				messageLength: response.length,
				estimatedCost: this.calculateCost(tokens, modelUsed),
				complexity: options?.complexity,
				confidence: options?.confidence,
				responseTime: options?.responseTime,
				apiEndpoint: options?.apiEndpoint,
			});
		} catch (error) {
			logger.warn(
				'AI response token tracking failed, continuing without tracking:',
				error
			);
			// Don't let token tracking failures break the app
		}
	}

	/**
	 * End current conversation and get summary
	 */
	public endConversation(): {
		conversationId: string;
		totalTokens: number;
		totalCost: number;
	} {
		const summary = {
			conversationId: this.currentConversationId!,
			totalTokens: this.conversationTokens,
			totalCost: this.calculateCost(this.conversationTokens, 'gpt-3.5-turbo'),
		};

		// Reset for next conversation
		this.currentConversationId = null;
		this.conversationTokens = 0;

		return summary;
	}

	/**
	 * Get current conversation token count
	 */
	public getCurrentConversationTokens(): number {
		return this.conversationTokens;
	}

	/**
	 * Get user's token usage summary
	 */
	public async getUserUsageSummary(): Promise<UsageSummary> {
		try {
			const response = await ApiService.get('/api/token-usage/summary');
			return response.data as UsageSummary;
		} catch (error) {
			logger.error('Error fetching token usage summary:', error);
			// Return default summary if API endpoint doesn't exist yet
			return this.getDefaultUsageSummary();
		}
	}

	/**
	 * Get detailed token usage for current user
	 */
	public async getDetailedUsage(limit: number = 50): Promise<TokenUsage[]> {
		try {
			const response = await ApiService.get(
				`/api/token-usage/detailed?limit=${limit}`
			);
			return response.data as TokenUsage[];
		} catch (error) {
			logger.error('Error fetching detailed token usage:', error);
			// Return empty array if API endpoint doesn't exist yet
			return [];
		}
	}

	/**
	 * Record token usage to backend
	 */
	private async recordTokenUsage(usage: TokenUsage): Promise<void> {
		try {
			// Store locally first for offline support
			await this.storeLocalUsage(usage);

			// Try to send to backend (endpoint might not exist yet)
			try {
				await ApiService.post('/api/token-usage/record', usage);
			} catch (apiError) {
				// Backend endpoint might not be implemented yet, just log it
				logger.debug(
					'Token usage API endpoint not available yet, storing locally only:',
					apiError instanceof Error ? apiError.message : 'Unknown error'
				);
			}
		} catch (error) {
			logger.error('Error recording token usage:', error);
			// Keep local storage for retry later
		}
	}

	/**
	 * Store usage locally for offline support (encrypted)
	 */
	private async storeLocalUsage(usage: TokenUsage): Promise<void> {
		try {
			// Check if SecureCacheService is available
			if (!SecureCacheService.isServiceAvailable()) {
				logger.warn(
					'Encryption service not available, skipping local storage'
				);
				return;
			}

			const key = `token_usage_${Date.now()}`;
			await SecureCacheService.setEncryptedItem(key, usage);
		} catch (error) {
			logger.error('Error storing encrypted local token usage:', error);
			// Don't throw - this is not critical for the app to function
		}
	}

	/**
	 * Estimate tokens based on message length (rough approximation)
	 */
	private estimateTokens(message: string): number {
		// Rough estimation: 1 token ≈ 4 characters for English text
		// This is a simplified approach - actual tokenization varies by model
		return Math.ceil(message.length / 4);
	}

	/**
	 * Calculate estimated cost based on tokens and model
	 */
	private calculateCost(tokens: number, model: string): number {
		const rates: { [key: string]: number } = {
			'gpt-3.5-turbo': 0.000002, // $0.002 per 1K tokens
			'gpt-4': 0.00003, // $0.03 per 1K tokens
			'gpt-4-turbo': 0.00001, // $0.01 per 1K tokens
			'gpt-4o': 0.000005, // $0.005 per 1K tokens
			'gpt-4o-mini': 0.00000015, // $0.00015 per 1K tokens
			'claude-3-haiku': 0.00000025, // $0.00025 per 1K tokens
			'claude-3-sonnet': 0.000003, // $0.003 per 1K tokens
			'claude-3-opus': 0.000015, // $0.015 per 1K tokens
		};

		const rate = rates[model] || rates['gpt-3.5-turbo'];
		return (tokens / 1000) * rate;
	}

	/**
	 * Get model pricing information
	 */
	public getModelPricing(): {
		[model: string]: { input: number; output: number; description: string };
	} {
		return {
			'gpt-3.5-turbo': {
				input: 0.0005,
				output: 0.0015,
				description: 'Fast and cost-effective for most tasks',
			},
			'gpt-4': {
				input: 0.03,
				output: 0.06,
				description: 'Most capable model for complex reasoning',
			},
			'gpt-4-turbo': {
				input: 0.01,
				output: 0.03,
				description: 'Faster and cheaper than GPT-4',
			},
			'gpt-4o': {
				input: 0.005,
				output: 0.015,
				description: 'Optimized for speed and cost',
			},
			'gpt-4o-mini': {
				input: 0.00015,
				output: 0.0006,
				description: 'Ultra-cheap for simple tasks',
			},
			'claude-3-haiku': {
				input: 0.00025,
				output: 0.00125,
				description: "Anthropic's fastest model",
			},
			'claude-3-sonnet': {
				input: 0.003,
				output: 0.015,
				description: 'Balanced performance and cost',
			},
			'claude-3-opus': {
				input: 0.015,
				output: 0.075,
				description: 'Most capable Anthropic model',
			},
		};
	}

	/**
	 * Estimate cost for a given text and model
	 */
	public estimateTextCost(
		text: string,
		model: string
	): {
		tokens: number;
		cost: number;
		characterCount: number;
		modelInfo: { input: number; output: number; description: string };
	} {
		const tokens = this.estimateTokens(text);
		const cost = this.calculateCost(tokens, model);
		const pricing = this.getModelPricing();
		const modelInfo = pricing[model] || pricing['gpt-3.5-turbo'];

		return {
			tokens,
			cost,
			characterCount: text.length,
			modelInfo,
		};
	}

	/**
	 * Get cost comparison between models for a given text
	 */
	public compareModelCosts(
		text: string,
		models: string[] = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4o', 'gpt-4o-mini']
	): {
		model: string;
		tokens: number;
		cost: number;
		savings: number;
		modelInfo: { input: number; output: number; description: string };
	}[] {
		const estimates = models.map((model) => this.estimateTextCost(text, model));
		const baseCost = estimates[0]?.cost || 0;

		return estimates.map((estimate, index) => ({
			model: models[index],
			tokens: estimate.tokens,
			cost: estimate.cost,
			savings: baseCost - estimate.cost,
			modelInfo: estimate.modelInfo,
		}));
	}

	/**
	 * Get current user ID from auth context
	 */
	private async getCurrentUserId(): Promise<string> {
		try {
			// Check if AsyncStorage is available
			if (typeof AsyncStorage === 'undefined') {
				logger.warn('AsyncStorage not available, using fallback user ID');
				return 'user_' + Date.now();
			}

			// Try to get from AsyncStorage first
			const storedUID = await AsyncStorage.getItem('firebaseUID');
			if (storedUID) {
				return storedUID;
			}

			// Fallback to timestamp-based ID
			return 'user_' + Date.now();
		} catch (error) {
			logger.error('Error getting user ID:', error);
			return 'user_' + Date.now();
		}
	}

	/**
	 * Get default usage summary when backend is unavailable
	 */
	private getDefaultUsageSummary(): UsageSummary {
		return {
			totalTokens: 0,
			totalCost: 0,
			conversationsCount: 0,
			averageTokensPerConversation: 0,
			monthlyUsage: {},
			modelBreakdown: {},
			complexityBreakdown: {
				mini: { tokens: 0, cost: 0, requests: 0 },
				std: { tokens: 0, cost: 0, requests: 0 },
				pro: { tokens: 0, cost: 0, requests: 0 },
			},
			dailyUsage: {},
		};
	}

	/**
	 * Sync offline usage data to backend
	 */
	public async syncOfflineUsage(): Promise<void> {
		try {
			// Implementation would depend on your storage solution
			// This is a placeholder for the sync logic
			logger.debug('Syncing offline token usage data...');
		} catch (error) {
			logger.error('Error syncing offline usage:', error);
		}
	}

	/**
	 * Get cost analysis for different time periods
	 */
	public async getCostAnalysis(
		period: 'daily' | 'weekly' | 'monthly' | 'yearly'
	): Promise<{
		period: string;
		totalCost: number;
		totalTokens: number;
		averageCostPerRequest: number;
		modelBreakdown: {
			[model: string]: { cost: number; tokens: number; requests: number };
		};
		complexityBreakdown: {
			[complexity: string]: { cost: number; tokens: number; requests: number };
		};
		trend: 'increasing' | 'decreasing' | 'stable';
		projectedMonthlyCost: number;
	}> {
		try {
			const response = await ApiService.get(
				`/api/token-usage/cost-analysis?period=${period}`
			);
			return response.data as {
				period: string;
				totalCost: number;
				totalTokens: number;
				averageCostPerRequest: number;
				modelBreakdown: {
					[model: string]: { cost: number; tokens: number; requests: number };
				};
				complexityBreakdown: {
					[complexity: string]: {
						cost: number;
						tokens: number;
						requests: number;
					};
				};
				trend: 'increasing' | 'decreasing' | 'stable';
				projectedMonthlyCost: number;
			};
		} catch (error) {
			logger.error('Error fetching cost analysis:', error);
			return this.getDefaultCostAnalysis(period);
		}
	}

	/**
	 * Set and track budget limits
	 */
	public async setBudgetLimit(monthlyLimit: number): Promise<void> {
		try {
			if (!AsyncStorage) return;

			await AsyncStorage.setItem('token_budget_limit', monthlyLimit.toString());
			logger.debug(`Budget limit set to $${monthlyLimit} per month`);
		} catch (error) {
			logger.error('Error setting budget limit:', error);
		}
	}

	/**
	 * Get current budget status
	 */
	public async getBudgetStatus(): Promise<{
		monthlyLimit: number;
		currentSpent: number;
		remaining: number;
		percentageUsed: number;
		daysRemaining: number;
		projectedOverage: number;
		status: 'safe' | 'warning' | 'critical' | 'exceeded';
	}> {
		try {
			const monthlyLimit = await this.getMonthlyBudgetLimit();
			const currentMonthUsage = await this.getCurrentMonthUsage();

			const percentageUsed = (currentMonthUsage.totalCost / monthlyLimit) * 100;
			const remaining = monthlyLimit - currentMonthUsage.totalCost;
			const daysRemaining =
				new Date(
					new Date().getFullYear(),
					new Date().getMonth() + 1,
					0
				).getDate() - new Date().getDate();
			const dailyAverage =
				currentMonthUsage.totalCost / (new Date().getDate() || 1);
			const projectedOverage = Math.max(
				0,
				dailyAverage *
					new Date(
						new Date().getFullYear(),
						new Date().getMonth() + 1,
						0
					).getDate() -
					monthlyLimit
			);

			let status: 'safe' | 'warning' | 'critical' | 'exceeded';
			if (percentageUsed >= 100) status = 'exceeded';
			else if (percentageUsed >= 80) status = 'critical';
			else if (percentageUsed >= 60) status = 'warning';
			else status = 'safe';

			return {
				monthlyLimit,
				currentSpent: currentMonthUsage.totalCost,
				remaining,
				percentageUsed,
				daysRemaining,
				projectedOverage,
				status,
			};
		} catch (error) {
			logger.error('Error getting budget status:', error);
			return {
				monthlyLimit: 0,
				currentSpent: 0,
				remaining: 0,
				percentageUsed: 0,
				daysRemaining: 0,
				projectedOverage: 0,
				status: 'safe',
			};
		}
	}

	/**
	 * Get optimization recommendations
	 */
	public async getOptimizationRecommendations(): Promise<{
		recommendations: {
			type: 'model_switch' | 'complexity_reduction' | 'caching' | 'batching';
			title: string;
			description: string;
			potentialSavings: number;
			impact: 'low' | 'medium' | 'high';
		}[];
		totalPotentialSavings: number;
	}> {
		try {
			const response = await ApiService.get(
				'/api/token-usage/optimization-recommendations'
			);
			return response.data as {
				recommendations: {
					type:
						| 'model_switch'
						| 'complexity_reduction'
						| 'caching'
						| 'batching';
					title: string;
					description: string;
					potentialSavings: number;
					impact: 'low' | 'medium' | 'high';
				}[];
				totalPotentialSavings: number;
			};
		} catch (error) {
			logger.error('Error fetching optimization recommendations:', error);
			return {
				recommendations: [],
				totalPotentialSavings: 0,
			};
		}
	}

	/**
	 * Track streaming response with real-time updates
	 */
	public async trackStreamingResponse(
		response: string,
		modelUsed: string,
		streamingMetrics: {
			timeToFirstToken: number;
			totalTime: number;
			chunksReceived: number;
			averageChunkSize: number;
		}
	): Promise<void> {
		await this.trackAIResponse(response, modelUsed, {
			responseTime: streamingMetrics.totalTime,
			apiEndpoint: 'streaming',
		});
	}

	/**
	 * Get current month usage
	 */
	private async getCurrentMonthUsage(): Promise<{
		totalCost: number;
		totalTokens: number;
	}> {
		try {
			const response = await ApiService.get('/api/token-usage/current-month');
			return response.data as { totalCost: number; totalTokens: number };
		} catch (error) {
			logger.error('Error fetching current month usage:', error);
			return { totalCost: 0, totalTokens: 0 };
		}
	}

	/**
	 * Get monthly budget limit
	 */
	private async getMonthlyBudgetLimit(): Promise<number> {
		try {
			if (!AsyncStorage) return 100; // Default limit

			const limit = await AsyncStorage.getItem('token_budget_limit');
			return limit ? parseFloat(limit) : 100;
		} catch (error) {
			logger.error('Error getting budget limit:', error);
			return 100;
		}
	}

	/**
	 * Get default cost analysis when API is unavailable
	 */
	private getDefaultCostAnalysis(period: string) {
		return {
			period,
			totalCost: 0,
			totalTokens: 0,
			averageCostPerRequest: 0,
			modelBreakdown: {},
			complexityBreakdown: {},
			trend: 'stable' as const,
			projectedMonthlyCost: 0,
		};
	}

	/**
	 * Diagnostic method to check AsyncStorage availability
	 */
	public async checkAsyncStorageAvailability(): Promise<boolean> {
		try {
			if (typeof AsyncStorage === 'undefined') {
				logger.warn('AsyncStorage is undefined');
				return false;
			}

			// Test basic AsyncStorage functionality
			const testKey = 'test_async_storage';
			const testValue = 'test_value';

			await AsyncStorage.setItem(testKey, testValue);
			const retrievedValue = await AsyncStorage.getItem(testKey);
			await AsyncStorage.removeItem(testKey);

			const isWorking = retrievedValue === testValue;
			logger.debug('AsyncStorage test result:', isWorking ? 'PASSED' : 'FAILED');

			return isWorking;
		} catch (error) {
			logger.error('AsyncStorage diagnostic failed:', error);
			return false;
		}
	}
}

export default TokenUsageService;
