// chatController.test.ts - Tests for end-to-end chat flow controller

import {
	ChatController,
	handleUserMessage,
	ChatContext,
	ChatControllerConfig,
} from '../chatController';

// Mock dependencies
jest.mock('../../services/assistant/intentMapper', () => ({
	detectIntent: jest.fn(),
}));

jest.mock('../../services/assistant/routeModel', () => ({
	pickModel: jest.fn(),
	executeHybridCostOptimization: jest.fn(),
}));

jest.mock('../../services/assistant/responseSchema', () => ({
	composeStructuredResponse: jest.fn(),
}));

jest.mock('../../services/assistant/helpfulFallbacks', () => ({
	helpfulFallback: jest.fn(),
}));

jest.mock('../analyticsService', () => ({
	logChat: jest.fn(),
}));

describe('ChatController', () => {
	let chatController: ChatController;
	let mockContext: ChatContext;

	beforeEach(() => {
		mockContext = {
			userProfile: {
				monthlyIncome: 5000,
				financialGoal: 'save_for_vacation',
				riskProfile: 'conservative',
			},
			budgets: [
				{ name: 'Groceries', amount: 500, spent: 300 },
				{ name: 'Entertainment', amount: 200, spent: 150 },
			],
			goals: [{ name: 'Vacation', target: 2000, current: 800 }],
			transactions: [{ amount: 50, date: new Date(), type: 'expense' }],
			currentUsage: {
				subscriptionTier: 'free',
				currentTokens: 100,
				tokenLimit: 1000,
			},
		};

		chatController = new ChatController(mockContext);
	});

	describe('constructor', () => {
		it('should create controller with default config', () => {
			const config = chatController.getConfig();
			expect(config.enableLLM).toBe(true);
			expect(config.enableCritic).toBe(true);
			expect(config.enableAnalytics).toBe(true);
			expect(config.maxRetries).toBe(2);
			expect(config.fallbackThreshold).toBe(0.6);
		});

		it('should create controller with custom config', () => {
			const customConfig: Partial<ChatControllerConfig> = {
				enableLLM: false,
				enableCritic: false,
				fallbackThreshold: 0.8,
			};

			const customController = new ChatController(mockContext, customConfig);
			const config = customController.getConfig();

			expect(config.enableLLM).toBe(false);
			expect(config.enableCritic).toBe(false);
			expect(config.fallbackThreshold).toBe(0.8);
		});
	});

	describe('handleUserMessage', () => {
		it('should handle user message with successful flow', async () => {
			const query = 'What is my budget status?';

			// Mock successful grounding
			jest.spyOn(chatController as any, 'tryGrounded').mockResolvedValue({
				confidence: 0.9,
				payload: { budgetCount: 2, totalSpent: 450 },
			});

			// Mock successful narration
			jest
				.spyOn(chatController as any, 'generateNarration')
				.mockResolvedValue(
					'Based on your budgets, you have spent $450 out of $700 total.'
				);

			// Mock successful critic validation
			jest.spyOn(chatController as any, 'criticValidation').mockResolvedValue({
				ok: true,
				text: 'Based on your budgets, you have spent $450 out of $700 total.',
			});

			// Mock successful post-processing
			jest
				.spyOn(chatController as any, 'postProcessToResponse')
				.mockResolvedValue({
					message:
						'Based on your budgets, you have spent $450 out of $700 total.',
					details: 'Budget status overview',
					cards: [],
					actions: [],
					sources: [{ kind: 'db' }],
					cost: { model: 'mini', estTokens: 50 },
				});

			const response = await chatController.handleUserMessage(
				query,
				mockContext
			);

			expect(response.message).toBe(
				'Based on your budgets, you have spent $450 out of $700 total.'
			);
			expect(response.details).toBe('Budget status overview');
		});

		it('should fallback to grounded facts when narration fails', async () => {
			const query = 'Show me my spending?';

			// Mock successful grounding
			jest.spyOn(chatController as any, 'tryGrounded').mockResolvedValue({
				confidence: 0.8,
				payload: { spending: 450, budget: 700 },
			});

			// Mock failed narration
			jest
				.spyOn(chatController as any, 'generateNarration')
				.mockRejectedValue(new Error('LLM unavailable'));

			// Mock successful fact-based composition
			jest
				.spyOn(chatController as any, 'composeFromFactsWithoutLLM')
				.mockResolvedValue({
					message: 'Your spending is $450 out of $700 budget.',
					details: 'Spending overview',
					cards: [],
					actions: [],
					sources: [{ kind: 'db' }],
					cost: { model: 'mini', estTokens: 30 },
				});

			const response = await chatController.handleUserMessage(
				query,
				mockContext
			);

			expect(response.message).toBe(
				'Your spending is $450 out of $700 budget.'
			);
		});

		it('should use helpful fallback when grounding fails', async () => {
			const query = 'What should I do?';

			// Mock failed grounding
			jest.spyOn(chatController as any, 'tryGrounded').mockResolvedValue(null);

			// Mock helpful fallback
			const { helpfulFallback } = jest.requireMock(
				'../../services/assistant/helpfulFallbacks'
			);
			helpfulFallback.mockReturnValue({
				message:
					'I can help you with your finances. What would you like to know?',
				details: 'General help',
				cards: [],
				actions: [],
				sources: [{ kind: 'cache' }],
				cost: { model: 'mini', estTokens: 20 },
			});

			const response = await chatController.handleUserMessage(
				query,
				mockContext
			);

			expect(response.message).toContain('I can help you with your finances');
		});

		it('should handle critic validation failure', async () => {
			const query = 'Analyze my spending?';

			// Mock successful grounding
			jest.spyOn(chatController as any, 'tryGrounded').mockResolvedValue({
				confidence: 0.7,
				payload: { spending: 450 },
			});

			// Mock successful narration
			jest
				.spyOn(chatController as any, 'generateNarration')
				.mockResolvedValue('Your spending is $450 this month.');

			// Mock failed critic validation
			jest.spyOn(chatController as any, 'criticValidation').mockResolvedValue({
				ok: false,
				text: 'Your spending is $450 this month.',
				issues: ['Response too short'],
			});

			// Mock successful fact-based composition
			jest
				.spyOn(chatController as any, 'composeFromFactsWithoutLLM')
				.mockResolvedValue({
					message: 'Based on available data, your spending is $450.',
					details: 'Spending analysis',
					cards: [],
					actions: [],
					sources: [{ kind: 'db' }],
					cost: { model: 'mini', estTokens: 40 },
				});

			const response = await chatController.handleUserMessage(
				query,
				mockContext
			);

			expect(response.message).toBe(
				'Based on available data, your spending is $450.'
			);
		});

		it('should handle errors gracefully', async () => {
			const query = 'What is my balance?';

			// Mock grounding to throw error
			jest
				.spyOn(chatController as any, 'tryGrounded')
				.mockRejectedValue(new Error('Database connection failed'));

			// Mock helpful fallback
			const { helpfulFallback } = jest.requireMock(
				'../../services/assistant/helpfulFallbacks'
			);
			helpfulFallback.mockReturnValue({
				message:
					"I'm having trouble accessing your data right now. Please try again.",
				details: 'Error fallback',
				cards: [],
				actions: [],
				sources: [{ kind: 'cache' }],
				cost: { model: 'mini', estTokens: 25 },
			});

			const response = await chatController.handleUserMessage(
				query,
				mockContext
			);

			expect(response.message).toContain('having trouble accessing your data');
		});
	});

	describe('configuration', () => {
		it('should update configuration', () => {
			const newConfig: Partial<ChatControllerConfig> = {
				enableLLM: false,
				fallbackThreshold: 0.9,
			};

			chatController.updateConfig(newConfig);
			const config = chatController.getConfig();

			expect(config.enableLLM).toBe(false);
			expect(config.fallbackThreshold).toBe(0.9);
			expect(config.enableCritic).toBe(true); // Should remain unchanged
		});

		it('should get current configuration', () => {
			const config = chatController.getConfig();

			expect(config).toEqual({
				enableLLM: true,
				enableCritic: true,
				enableAnalytics: true,
				maxRetries: 2,
				fallbackThreshold: 0.6,
			});
		});
	});

	describe('convenience function', () => {
		it('should work with handleUserMessage convenience function', async () => {
			const query = 'What is my budget?';

			// Mock successful grounding
			jest
				.spyOn(ChatController.prototype as any, 'tryGrounded')
				.mockResolvedValue({
					confidence: 0.8,
					payload: { budget: 700 },
				});

			// Mock successful narration
			jest
				.spyOn(ChatController.prototype as any, 'generateNarration')
				.mockResolvedValue('Your total budget is $700.');

			// Mock successful critic validation
			jest
				.spyOn(ChatController.prototype as any, 'criticValidation')
				.mockResolvedValue({
					ok: true,
					text: 'Your total budget is $700.',
				});

			// Mock successful post-processing
			jest
				.spyOn(ChatController.prototype as any, 'postProcessToResponse')
				.mockResolvedValue({
					message: 'Your total budget is $700.',
					details: 'Budget information',
					cards: [],
					actions: [],
					sources: [{ kind: 'db' }],
					cost: { model: 'mini', estTokens: 30 },
				});

			const response = await handleUserMessage(query, mockContext);

			expect(response.message).toBe('Your total budget is $700.');
		});
	});

	describe('private methods', () => {
		it('should estimate tokens correctly', () => {
			const text = 'Hello world, this is a test message.';
			const estimatedTokens = (chatController as any).estimateTokens(text);

			// Rough estimation: 1 token ≈ 4 characters
			const expectedTokens = Math.ceil(text.length / 4);
			expect(estimatedTokens).toBe(expectedTokens);
		});

		it('should determine response source correctly', () => {
			const vetted = { ok: true, text: 'Valid response' };
			const grounded = { confidence: 0.8 };
			const narration = 'Generated narration';

			const source = (chatController as any).getResponseSource(
				vetted,
				grounded,
				narration
			);
			expect(source).toBe('validated_narration');

			const source2 = (chatController as any).getResponseSource(
				null,
				grounded,
				null
			);
			expect(source2).toBe('grounded_facts');

			const source3 = (chatController as any).getResponseSource(
				null,
				null,
				narration
			);
			expect(source3).toBe('helpful_fallback');
		});
	});
});
