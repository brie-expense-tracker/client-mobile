import {
	trySkills,
	testSkill,
	getSkillEngineStats,
	clearExecutionCache,
	getCacheStats,
	getCircuitBreakerStatus,
} from '../engine';
import { ChatContext } from '../../../../services/feature/chatController';
import { skillMetrics } from '../skillMetrics';
import { skillRegistry } from '../registry';

// Mock the skill registry
jest.mock('../registry', () => ({
	skillRegistry: {
		find: jest.fn(),
		getById: jest.fn(),
		getStats: jest.fn(() => ({ totalSkills: 5, activeSkills: 3 })),
	},
}));

// Mock the usefulness scoring
jest.mock('../../usefulness', () => ({
	scoreUsefulness: jest.fn((response) => 4.0),
}));

// Mock skill metrics
jest.mock('../skillMetrics', () => ({
	skillMetrics: {
		recordExecution: jest.fn(),
	},
}));

describe('Skill Engine', () => {
	let mockContext: ChatContext;

	beforeEach(() => {
		mockContext = {
			userProfile: {
				userId: 'test-user-123',
				monthlyIncome: 5000,
				financialGoal: 'Save for house',
				riskProfile: 'moderate',
			},
			accounts: [],
			budgets: [],
			goals: [],
			transactions: [],
			recurringExpenses: [],
			locale: 'en-US',
			currency: 'USD',
		};

		// Clear mocks
		jest.clearAllMocks();
		clearExecutionCache();
	});

	describe('trySkills', () => {
		it('should return null when no skills match', async () => {
			(skillRegistry.find as jest.Mock).mockReturnValue([]);

			const result = await trySkills('test question', mockContext);
			expect(result).toBeNull();
		});

		it('should try skills in priority order', async () => {
			const mockSkill = {
				id: 'test-skill',
				microSolvers: [
					jest
						.fn()
						.mockReturnValue({ response: 'test response', usefulness: 4.0 }),
				],
				config: { minUsefulness: 3 },
			};
			(skillRegistry.find as jest.Mock).mockReturnValue([mockSkill]);

			const result = await trySkills('test question', mockContext);
			expect(result).toBe('test response');
		});

		it('should use caching when enabled', async () => {
			const mockSkill = {
				id: 'test-skill',
				microSolvers: [
					jest
						.fn()
						.mockReturnValue({ response: 'cached response', usefulness: 4.0 }),
				],
				config: { minUsefulness: 3 },
			};
			(skillRegistry.find as jest.Mock).mockReturnValue([mockSkill]);

			// First call
			const result1 = await trySkills('test question', mockContext);
			expect(result1).toBe('cached response');

			// Second call should use cache
			const result2 = await trySkills('test question', mockContext);
			expect(result2).toBe('cached response');

			// Micro-solver should only be called once
			expect(mockSkill.microSolvers[0]).toHaveBeenCalledTimes(1);
		});

		it('should handle timeouts', async () => {
			const mockSkill = {
				id: 'test-skill',
				microSolvers: [
					jest.fn().mockImplementation(() => {
						return new Promise((resolve) =>
							setTimeout(() => resolve({ response: 'slow response' }), 100)
						);
					}),
				],
				config: { minUsefulness: 3 },
			};
			(skillRegistry.find as jest.Mock).mockReturnValue([mockSkill]);

			const result = await trySkills('test question', mockContext, {
				timeoutMs: 50,
			});
			expect(result).toBeNull();
		});

		it('should record metrics when enabled', async () => {
			const mockSkill = {
				id: 'test-skill',
				microSolvers: [
					jest
						.fn()
						.mockReturnValue({ response: 'test response', usefulness: 4.0 }),
				],
				config: { minUsefulness: 3 },
			};
			(skillRegistry.find as jest.Mock).mockReturnValue([mockSkill]);

			await trySkills('test question', mockContext, { enableMetrics: true });

			expect(skillMetrics.recordExecution).toHaveBeenCalledWith(
				expect.objectContaining({
					skillId: 'test-skill',
					step: 'microSolver',
					success: true,
					usefulness: 4.0,
				}),
				'test-user-123'
			);
		});

		it('should handle circuit breaker', async () => {
			const mockSkill = {
				id: 'failing-skill',
				microSolvers: [
					jest.fn().mockImplementation(() => {
						throw new Error('Skill failed');
					}),
				],
				config: { minUsefulness: 3 },
			};
			(skillRegistry.find as jest.Mock).mockReturnValue([mockSkill]);

			// Call multiple times to trigger circuit breaker
			for (let i = 0; i < 6; i++) {
				await trySkills('test question', mockContext, {
					enableCircuitBreaker: true,
				});
			}

			const circuitStatus = getCircuitBreakerStatus();
			expect(circuitStatus['failing-skill'].state).toBe('open');
		});
	});

	describe('testSkill', () => {
		it('should test a specific skill', async () => {
			const mockSkill = {
				id: 'test-skill',
				microSolvers: [
					jest
						.fn()
						.mockReturnValue({ response: 'test response', usefulness: 4.0 }),
				],
				config: { minUsefulness: 3 },
			};
			(skillRegistry.getById as jest.Mock).mockReturnValue(mockSkill);

			const result = await testSkill(
				'test-skill',
				'test question',
				mockContext
			);

			expect(result).toEqual(
				expect.objectContaining({
					skillId: 'test-skill',
					step: 'microSolver',
					success: true,
					usefulness: 4.0,
				})
			);
		});

		it('should return null for non-existent skill', async () => {
			(skillRegistry.getById as jest.Mock).mockReturnValue(null);

			const result = await testSkill(
				'non-existent',
				'test question',
				mockContext
			);
			expect(result).toBeNull();
		});

		it('should handle errors gracefully', async () => {
			const mockSkill = {
				id: 'error-skill',
				microSolvers: [
					jest.fn().mockImplementation(() => {
						throw new Error('Test error');
					}),
				],
				config: { minUsefulness: 3 },
			};
			(skillRegistry.getById as jest.Mock).mockReturnValue(mockSkill);

			const result = await testSkill(
				'error-skill',
				'test question',
				mockContext
			);

			expect(result).toEqual(
				expect.objectContaining({
					skillId: 'error-skill',
					success: false,
					error: 'Test error',
				})
			);
		});
	});

	describe('utility functions', () => {
		it('should get skill engine stats', () => {
			const stats = getSkillEngineStats();
			expect(stats).toEqual(
				expect.objectContaining({
					totalSkills: 5,
					activeSkills: 3,
					engineVersion: '1.0.0',
				})
			);
		});

		it('should clear execution cache', async () => {
			// Add something to cache first
			const mockSkill = {
				id: 'test-skill',
				microSolvers: [
					jest
						.fn()
						.mockReturnValue({ response: 'test response', usefulness: 4.0 }),
				],
				config: { minUsefulness: 3 },
			};
			(skillRegistry.find as jest.Mock).mockReturnValue([mockSkill]);

			await trySkills('test question', mockContext, { enableCaching: true });

			let cacheStats = getCacheStats();
			expect(cacheStats.size).toBeGreaterThan(0);

			clearExecutionCache();

			cacheStats = getCacheStats();
			expect(cacheStats.size).toBe(0);
		});

		it('should get cache statistics', () => {
			const cacheStats = getCacheStats();
			expect(cacheStats).toEqual(
				expect.objectContaining({
					size: expect.any(Number),
					entries: expect.any(Array),
				})
			);
		});

		it('should get circuit breaker status', () => {
			const circuitStatus = getCircuitBreakerStatus();
			expect(circuitStatus).toEqual(expect.any(Object));
		});
	});

	describe('configuration', () => {
		it('should use default configuration', async () => {
			const mockSkill = {
				id: 'test-skill',
				microSolvers: [
					jest
						.fn()
						.mockReturnValue({ response: 'test response', usefulness: 4.0 }),
				],
				config: { minUsefulness: 3 },
			};
			(skillRegistry.find as jest.Mock).mockReturnValue([mockSkill]);

			const result = await trySkills('test question', mockContext);
			expect(result).toBe('test response');
		});

		it('should use custom configuration', async () => {
			const mockSkill = {
				id: 'test-skill',
				microSolvers: [
					jest
						.fn()
						.mockReturnValue({ response: 'test response', usefulness: 4.0 }),
				],
				config: { minUsefulness: 3 },
			};
			(skillRegistry.find as jest.Mock).mockReturnValue([mockSkill]);

			const customConfig = {
				enableMetrics: false,
				enableCaching: false,
				timeoutMs: 1000,
			};

			const result = await trySkills(
				'test question',
				mockContext,
				customConfig
			);
			expect(result).toBe('test response');

			// Metrics should not be recorded
			expect(skillMetrics.recordExecution).not.toHaveBeenCalled();
		});
	});

	describe('error handling', () => {
		it('should continue to next skill on error', async () => {
			const mockSkills = [
				{
					id: 'failing-skill',
					microSolvers: [
						jest.fn().mockImplementation(() => {
							throw new Error('First skill failed');
						}),
					],
					config: { minUsefulness: 3 },
				},
				{
					id: 'working-skill',
					microSolvers: [
						jest.fn().mockReturnValue({
							response: 'working response',
							usefulness: 4.0,
						}),
					],
					config: { minUsefulness: 3 },
				},
			];
			(skillRegistry.find as jest.Mock).mockReturnValue(mockSkills);

			const result = await trySkills('test question', mockContext);
			expect(result).toBe('working response');
		});

		it('should record error metrics', async () => {
			const mockSkill = {
				id: 'error-skill',
				microSolvers: [
					jest.fn().mockImplementation(() => {
						throw new Error('Test error');
					}),
				],
				config: { minUsefulness: 3 },
			};
			(skillRegistry.find as jest.Mock).mockReturnValue([mockSkill]);

			await trySkills('test question', mockContext, { enableMetrics: true });

			expect(skillMetrics.recordExecution).toHaveBeenCalledWith(
				expect.objectContaining({
					skillId: 'error-skill',
					success: false,
					error: 'Test error',
				}),
				'test-user-123'
			);
		});
	});
});
