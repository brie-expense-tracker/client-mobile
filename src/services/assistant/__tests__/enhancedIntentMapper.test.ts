// Test file for Enhanced Intent Mapper
// Tests multi-label intents, confidence calibration, and routing decisions

import { enhancedIntentMapper } from '../enhancedIntentMapper';

describe('EnhancedIntentMapper', () => {
	beforeEach(() => {
		// Reset the mapper state before each test
		// Note: In a real implementation, you might want to add a reset method
	});

	describe('detectMultiLabelIntents', () => {
		it('should detect multiple intents for ambiguous queries', async () => {
			const query = 'How much have I spent and what will I spend next month?';
			const intents = await enhancedIntentMapper.detectMultiLabelIntents(query);

			expect(intents.length).toBeGreaterThan(1);

			// Should detect both budget status and forecast
			const intentTypes = intents.map((i) => i.intent);
			expect(intentTypes).toContain('GET_BUDGET_STATUS');
			expect(intentTypes).toContain('FORECAST_SPEND');
		});

		it('should return UNKNOWN for unclear queries', async () => {
			const query = 'What is the meaning of life?';
			const intents = await enhancedIntentMapper.detectMultiLabelIntents(query);

			expect(intents[0].intent).toBe('UNKNOWN');
		});

		it('should provide calibrated confidence scores', async () => {
			const query = "What's my budget status?";
			const intents = await enhancedIntentMapper.detectMultiLabelIntents(query);

			expect(intents[0].calibratedP).toBeGreaterThan(0);
			expect(intents[0].calibratedP).toBeLessThanOrEqual(1);
			expect(intents[0].confidence).toMatch(/^(low|medium|high)$/);
		});
	});

	describe('makeRouteDecision', () => {
		it('should make routing decisions with hysteresis', async () => {
			const query = 'Show me my budget status';
			const decision = await enhancedIntentMapper.makeRouteDecision(query);

			expect(decision.primary.intent).toBe('GET_BUDGET_STATUS');
			expect(decision.routeType).toMatch(/^(grounded|llm|unknown)$/);
			expect(decision.calibrated).toBe(true);
		});

		it('should include secondary intents when available', async () => {
			const query = "How much have I spent and what's my balance?";
			const decision = await enhancedIntentMapper.makeRouteDecision(query);

			expect(decision.secondary).toBeDefined();
			expect(decision.secondary!.length).toBeGreaterThan(0);
		});

		it('should compute shadow routes for misroute detection', async () => {
			const query = 'What will I spend next month?';
			const decision = await enhancedIntentMapper.makeRouteDecision(query);

			// Shadow route might not always be computed, but the structure should exist
			expect(decision.shadowRoute).toBeDefined();
		});
	});

	describe('confidence calibration', () => {
		it('should calibrate confidence scores appropriately', async () => {
			const query = "What's my account balance?";
			const intents = await enhancedIntentMapper.detectMultiLabelIntents(query);

			const primary = intents[0];
			expect(primary.p).not.toBe(primary.calibratedP); // Raw vs calibrated should differ
			expect(primary.calibratedP).toBeGreaterThanOrEqual(0);
			expect(primary.calibratedP).toBeLessThanOrEqual(1);
		});
	});

	describe('unknown intent handling', () => {
		it('should provide clarifying questions for unknown intents', () => {
			const clarification =
				enhancedIntentMapper.getUnknownIntentClarification();

			expect(clarification.question).toBeDefined();
			expect(clarification.choices.length).toBeGreaterThan(0);
			expect(clarification.choices[0]).toHaveProperty('label');
			expect(clarification.choices[0]).toHaveProperty('intent');
		});

		it('should include common financial intents in choices', () => {
			const clarification =
				enhancedIntentMapper.getUnknownIntentClarification();
			const intentTypes = clarification.choices.map((c) => c.intent);

			expect(intentTypes).toContain('GET_BUDGET_STATUS');
			expect(intentTypes).toContain('CREATE_BUDGET');
			expect(intentTypes).toContain('FORECAST_SPEND');
		});
	});

	describe('system statistics', () => {
		it('should provide system statistics', () => {
			const stats = enhancedIntentMapper.getSystemStats();

			expect(stats).toHaveProperty('calibrationParams');
			expect(stats).toHaveProperty('hysteresisConfig');
			expect(stats).toHaveProperty('lastRouteTime');
			expect(stats).toHaveProperty('confidenceHistoryLength');
			expect(stats).toHaveProperty('averageConfidence');
		});
	});
});
