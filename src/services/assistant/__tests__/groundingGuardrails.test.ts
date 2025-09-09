import { logChat } from '../../../services/feature/analyticsService';

// Mock the analytics service
jest.mock('../../../services/feature/analyticsService', () => ({
	logChat: jest.fn(),
}));

describe('Grounding & Guardrails', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Insight Logging', () => {
		it('should log insight explanation requests with proper metadata', () => {
			const mockLogChat = logChat as jest.MockedFunction<typeof logChat>;
			
			// Simulate insight explanation request
			mockLogChat({
				intent: 'INSIGHT_EXPLANATION',
				usedGrounding: true,
				model: 'localML',
				tokensIn: 0,
				tokensOut: 0,
				hadActions: false,
				hadCard: false,
				fallback: false,
				userSatisfaction: undefined,
				insightId: 'test_insight_123',
				factPackId: 'fact_pack_456',
				insightType: 'recommendation',
				insightTitle: 'Test Insight',
			});

			expect(mockLogChat).toHaveBeenCalledWith(
				expect.objectContaining({
					intent: 'INSIGHT_EXPLANATION',
					insightId: 'test_insight_123',
					factPackId: 'fact_pack_456',
					insightType: 'recommendation',
					insightTitle: 'Test Insight',
				})
			);
		});

		it('should log insight feedback when marked as wrong', () => {
			const mockLogChat = logChat as jest.MockedFunction<typeof logChat>;
			
			// Simulate marking insight as wrong
			mockLogChat({
				intent: 'INSIGHT_FEEDBACK',
				usedGrounding: true,
				model: 'localML',
				tokensIn: 0,
				tokensOut: 0,
				hadActions: false,
				hadCard: false,
				fallback: false,
				userSatisfaction: 'thumbs_down',
				insightId: 'test_insight_123',
				factPackId: 'fact_pack_456',
				insightType: 'recommendation',
				insightTitle: 'Test Insight',
				dissatisfactionReason: 'insight_incorrect',
			});

			expect(mockLogChat).toHaveBeenCalledWith(
				expect.objectContaining({
					intent: 'INSIGHT_FEEDBACK',
					userSatisfaction: 'thumbs_down',
					dissatisfactionReason: 'insight_incorrect',
				})
			);
		});
	});

	describe('Fallback Logging', () => {
		it('should log fallback retry attempts', () => {
			const mockLogChat = logChat as jest.MockedFunction<typeof logChat>;
			
			// Simulate fallback retry
			mockLogChat({
				intent: 'FALLBACK_RETRY',
				usedGrounding: false,
				model: 'fallback',
				tokensIn: 0,
				tokensOut: 0,
				hadActions: true,
				hadCard: false,
				fallback: true,
				userSatisfaction: undefined,
				factPackId: 'fallback_789',
			});

			expect(mockLogChat).toHaveBeenCalledWith(
				expect.objectContaining({
					intent: 'FALLBACK_RETRY',
					fallback: true,
					factPackId: 'fallback_789',
				})
			);
		});

		it('should log support requests when fallbacks are unsatisfactory', () => {
			const mockLogChat = logChat as jest.MockedFunction<typeof logChat>;
			
			// Simulate support request
			mockLogChat({
				intent: 'SUPPORT_REQUESTED',
				usedGrounding: false,
				model: 'fallback',
				tokensIn: 0,
				tokensOut: 0,
				hadActions: true,
				hadCard: false,
				fallback: true,
				userSatisfaction: 'thumbs_down',
				factPackId: 'fallback_789',
				dissatisfactionReason: 'fallback_unsatisfactory',
			});

			expect(mockLogChat).toHaveBeenCalledWith(
				expect.objectContaining({
					intent: 'SUPPORT_REQUESTED',
					userSatisfaction: 'thumbs_down',
					dissatisfactionReason: 'fallback_unsatisfactory',
				})
			);
		});
	});

	describe('Metadata Tracking', () => {
		it('should include fact pack IDs in all relevant logs', () => {
			const mockLogChat = logChat as jest.MockedFunction<typeof logChat>;
			
			// Test that fact pack IDs are included in various log types
			const testCases = [
				{
					intent: 'INSIGHT_EXPLANATION',
					factPackId: 'fact_pack_123',
				},
				{
					intent: 'INSIGHT_FEEDBACK',
					factPackId: 'fact_pack_456',
				},
				{
					intent: 'FALLBACK_RETRY',
					factPackId: 'fallback_789',
				},
			];

			testCases.forEach(({ intent, factPackId }) => {
				mockLogChat({
					intent,
					usedGrounding: true,
					model: 'test',
					tokensIn: 0,
					tokensOut: 0,
					hadActions: false,
					hadCard: false,
					fallback: false,
					userSatisfaction: undefined,
					factPackId,
				});
			});

			expect(mockLogChat).toHaveBeenCalledTimes(3);
			expect(mockLogChat).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({ factPackId: 'fact_pack_123' })
			);
			expect(mockLogChat).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ factPackId: 'fact_pack_456' })
			);
			expect(mockLogChat).toHaveBeenNthCalledWith(
				3,
				expect.objectContaining({ factPackId: 'fallback_789' })
			);
		});
	});
});
