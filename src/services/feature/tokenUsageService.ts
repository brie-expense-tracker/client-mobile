import { ApiService } from '../core/apiService';

// Dynamic import fallback for AsyncStorage to handle potential bundler issues
let AsyncStorage: any = null;

try {
	AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (error) {
	console.warn(
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
				console.warn('AsyncStorage not available during conversation start');
			}

			this.currentConversationId = `conv_${Date.now()}_${Math.random()
				.toString(36)
				.substr(2, 9)}`;
			this.conversationTokens = 0;
			return this.currentConversationId;
		} catch (error) {
			console.warn('Failed to start conversation tracking:', error);
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
			console.log('AsyncStorage not available, skipping token tracking');
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
			console.warn(
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
		modelUsed: string = 'gpt-3.5-turbo'
	): Promise<void> {
		// Skip tracking if AsyncStorage is not available
		if (!AsyncStorage) {
			console.log(
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
			});
		} catch (error) {
			console.warn(
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
			console.error('Error fetching token usage summary:', error);
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
			console.error('Error fetching detailed token usage:', error);
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
				console.log(
					'Token usage API endpoint not available yet, storing locally only'
				);
			}
		} catch (error) {
			console.error('Error recording token usage:', error);
			// Keep local storage for retry later
		}
	}

	/**
	 * Store usage locally for offline support
	 */
	private async storeLocalUsage(usage: TokenUsage): Promise<void> {
		try {
			// Check if AsyncStorage is available
			if (typeof AsyncStorage === 'undefined') {
				console.warn('AsyncStorage not available, skipping local storage');
				return;
			}

			const key = `token_usage_${Date.now()}`;
			await AsyncStorage.setItem(key, JSON.stringify(usage));
		} catch (error) {
			console.error('Error storing local token usage:', error);
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
		};

		const rate = rates[model] || rates['gpt-3.5-turbo'];
		return (tokens / 1000) * rate;
	}

	/**
	 * Get current user ID from auth context
	 */
	private async getCurrentUserId(): Promise<string> {
		try {
			// Check if AsyncStorage is available
			if (typeof AsyncStorage === 'undefined') {
				console.warn('AsyncStorage not available, using fallback user ID');
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
			console.error('Error getting user ID:', error);
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
		};
	}

	/**
	 * Sync offline usage data to backend
	 */
	public async syncOfflineUsage(): Promise<void> {
		try {
			// Implementation would depend on your storage solution
			// This is a placeholder for the sync logic
			console.log('Syncing offline token usage data...');
		} catch (error) {
			console.error('Error syncing offline usage:', error);
		}
	}

	/**
	 * Diagnostic method to check AsyncStorage availability
	 */
	public async checkAsyncStorageAvailability(): Promise<boolean> {
		try {
			if (typeof AsyncStorage === 'undefined') {
				console.warn('AsyncStorage is undefined');
				return false;
			}

			// Test basic AsyncStorage functionality
			const testKey = 'test_async_storage';
			const testValue = 'test_value';

			await AsyncStorage.setItem(testKey, testValue);
			const retrievedValue = await AsyncStorage.getItem(testKey);
			await AsyncStorage.removeItem(testKey);

			const isWorking = retrievedValue === testValue;
			console.log('AsyncStorage test result:', isWorking ? 'PASSED' : 'FAILED');

			return isWorking;
		} catch (error) {
			console.error('AsyncStorage diagnostic failed:', error);
			return false;
		}
	}
}

export default TokenUsageService;
