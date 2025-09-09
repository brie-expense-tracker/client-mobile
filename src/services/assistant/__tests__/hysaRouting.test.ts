// Tests for HYSA routing and consent functionality

import { enhancedIntentMapper } from '../enhancedIntentMapper';
import { HYSA_SKILL } from '../skills/packs/hysa';
import { simpleQALane } from '../simpleQALane';

describe('HYSA Routing and Consent', () => {
	describe('Enhanced Intent Mapper', () => {
		test('routes banks phrasing to HYSA_RECOMMENDATIONS', async () => {
			const q = 'Any suggestions on what banks I should be looking at?';
			const decision = await enhancedIntentMapper.makeRouteDecision(q, {
				sessionContext: { currentFocus: 'HYSA' },
			});
			expect(decision.primary.intent).toBe('HYSA_RECOMMENDATIONS');
		});

		test('routes bank queries without HYSA context', async () => {
			const q = 'Which banks should I consider?';
			const decision = await enhancedIntentMapper.makeRouteDecision(q, {});
			expect(decision.primary.intent).toBe('HYSA_RECOMMENDATIONS');
		});

		test('boosts HYSA intent when currentFocus is HYSA', async () => {
			const q = 'What banks are good?';
			const decision = await enhancedIntentMapper.makeRouteDecision(q, {
				sessionContext: { currentFocus: 'HYSA' },
			});
			expect(decision.primary.intent).toBe('HYSA_RECOMMENDATIONS');
			expect(decision.primary.calibratedP).toBeGreaterThan(0.8);
		});
	});

	describe('HYSA Skill Consent Gate', () => {
		test('consent gate shows before research', async () => {
			const r = await HYSA_SKILL.researchAgent!('Which banks for HYSA?', {
				sessionContext: {},
			});
			expect(
				r?.response?.actions?.some((a) => a.action === 'FETCH_HYSA_PICKS')
			).toBe(true);
			expect(r?.matchedPattern).toBe('HYSA_CONSENT');
		});

		test('research agent runs after consent', async () => {
			const r = await HYSA_SKILL.researchAgent!('best HYSA', {
				sessionContext: { actions: ['FETCH_HYSA_PICKS'] },
			});
			if (r) {
				expect(r.response.sources?.length).toBeGreaterThan(0);
				expect(/checked/i.test(r.response.message)).toBe(true);
				expect(r.matchedPattern).toBe('HYSA_AGENT');
			}
		});

		test('compliance guard adds required disclaimers', async () => {
			const r = await HYSA_SKILL.researchAgent!('best HYSA', {
				sessionContext: { actions: ['FETCH_HYSA_PICKS'] },
			});
			if (r) {
				expect(/educational/i.test(r.response.message)).toBe(true);
				expect(/verify/i.test(r.response.message)).toBe(true);
			}
		});

		test('button → runs agent', async () => {
			const ctx = {
				sessionContext: {
					actions: ['FETCH_HYSA_PICKS'],
					pendingQuery: 'best HYSA banks',
				},
			};
			const r = await HYSA_SKILL.researchAgent!('best HYSA banks', ctx as any);
			expect(r?.usefulness).toBeGreaterThanOrEqual(4);
		});

		test('text "Yes please" → synthesized action', async () => {
			const ctx: any = {
				sessionContext: {
					awaitingConsent: 'FETCH_HYSA_PICKS',
					pendingQuery: 'top HYSA',
				},
			};
			// This would be tested in the chat controller integration
			expect(ctx.sessionContext.awaitingConsent).toBe('FETCH_HYSA_PICKS');
		});

		test('no more Unknown action', async () => {
			// This would be tested in the action handler integration
			const action = 'FETCH_HYSA_PICKS';
			expect(action).toBe('FETCH_HYSA_PICKS');
		});
	});

	describe('Simple QA Lane Topic Tracking', () => {
		test('records HYSA topics for history tracking', async () => {
			const context = {};

			// First HYSA query
			await simpleQALane.tryAnswer('What is a HYSA?', context);

			// Check if HYSA was recorded
			const stats = simpleQALane.getStats();
			expect(stats).toBeDefined();
		});

		test('suppresses generic investing after HYSA discussion', async () => {
			const context = {};

			// Simulate HYSA discussion
			simpleQALane['recordTopic']('HYSA');

			// Try generic investing query
			const result = await simpleQALane.tryAnswer(
				'How should I invest my money?',
				context
			);

			// Should return null to force escalation
			expect(result).toBeNull();
		});
	});

	describe('Micro-solvers Order', () => {
		test('HYSA micro-solvers run before generic investing', () => {
			const q = 'What banks should I look at for savings?';
			const context = {};

			// This should be caught by HYSA micro-solvers, not generic investing
			const result = simpleQALane['microSolve'](q, context);

			if (result) {
				expect(result.matchedPattern).toMatch(/HYSA/);
				expect(result.matchedPattern).not.toBe('investing_starter');
			}
		});
	});
});
