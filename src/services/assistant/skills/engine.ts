// Skill Engine - Orchestrates the hybrid skill system
// Runs skills in order: micro-solvers → KB → research agent → composer

import { ChatResponse } from '../responseSchema';
import { ChatContext } from '../../../services/feature/chatController';
import { skillRegistry } from './registry';
import { scoreUsefulness } from '../usefulness';
import { SkillExecutionResult } from './types';
import { skillMetrics } from './skillMetrics';
import { logger } from '../../../../utils/logger';


// Configuration for skill engine
export interface SkillEngineConfig {
	enableMetrics: boolean;
	enableCaching: boolean;
	enableCircuitBreaker: boolean;
	timeoutMs: number;
	maxRetries: number;
	cacheTtlMs: number;
}

const DEFAULT_CONFIG: SkillEngineConfig = {
	enableMetrics: true,
	enableCaching: true,
	enableCircuitBreaker: true,
	timeoutMs: 30000, // 30 seconds
	maxRetries: 2,
	cacheTtlMs: 300000, // 5 minutes
};

// Cache for skill execution results
const executionCache = new Map<
	string,
	{ result: ChatResponse; timestamp: number }
>();

// Circuit breaker state for skills
const circuitBreakerState = new Map<
	string,
	{
		failures: number;
		lastFailure: number;
		state: 'closed' | 'open' | 'half-open';
	}
>();

export async function trySkills(
	q: string,
	ctx: ChatContext,
	config: Partial<SkillEngineConfig> = {}
): Promise<ChatResponse | null> {
	const engineConfig = { ...DEFAULT_CONFIG, ...config };
	const startTime = Date.now();

	// Check cache first
	if (engineConfig.enableCaching) {
		const cacheKey = generateCacheKey(q, ctx);
		const cached = executionCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < engineConfig.cacheTtlMs) {
			logger.debug('[Skill Engine] Returning cached result');
			return cached.result;
		}
	}

	// Find all skills that match this question
	const skills = skillRegistry.find(q);
	if (skills.length === 0) {
		logger.debug('[Skill Engine] No matching skills found');
		return null;
	}

	logger.debug(
		`[Skill Engine] Found ${skills.length} matching skills:`,
		skills.map((s) => s.id)
	);

	// Try each skill in priority order
	for (const skill of skills) {
		logger.debug(`[Skill Engine] Trying skill: ${skill.id}`);

		// Check circuit breaker
		if (engineConfig.enableCircuitBreaker && isCircuitBreakerOpen(skill.id)) {
			logger.debug(`[Skill Engine] Circuit breaker open for skill: ${skill.id}`);
			continue;
		}

		try {
			// 1) Try micro-solvers first (fastest, zero-token)
			if (skill.microSolvers) {
				for (const microSolver of skill.microSolvers) {
					const stepStart = Date.now();
					const result = await executeWithTimeout(
						() => microSolver(q, ctx),
						engineConfig.timeoutMs
					);

					if (result?.response) {
						const usefulness =
							result.usefulness ?? scoreUsefulness(result.response);
						const minUsefulness = skill.config?.minUsefulness ?? 3;

						if (usefulness >= minUsefulness) {
							logger.debug(
								`[Skill Engine] ${skill.id} micro-solver success (usefulness: ${usefulness})`
							);

							// Record execution result
							const executionResult: SkillExecutionResult = {
								response: result.response,
								skillId: skill.id,
								step: 'microSolver',
								matchedPattern: result.matchedPattern,
								usefulness,
								executionTimeMs: Date.now() - stepStart,
								success: true,
								cached: false,
								metadata: { userId: ctx.userProfile?.userId },
							};

							// Record metrics
							if (engineConfig.enableMetrics) {
								skillMetrics.recordExecution(
									executionResult,
									ctx.userProfile?.userId
								);
							}

							// Cache result
							if (engineConfig.enableCaching) {
								const cacheKey = generateCacheKey(q, ctx);
								executionCache.set(cacheKey, {
									result: result.response,
									timestamp: Date.now(),
								});
							}

							// Reset circuit breaker on success
							if (engineConfig.enableCircuitBreaker) {
								resetCircuitBreaker(skill.id);
							}

							return result.response;
						} else {
							logger.debug(
								`[Skill Engine] ${skill.id} micro-solver too weak (usefulness: ${usefulness} < ${minUsefulness})`
							);
						}
					}
				}
			}

			// 2) Try KB search (if provided)
			if (skill.kbSearch) {
				const stepStart = Date.now();
				const result = await executeWithTimeout(
					() => skill.kbSearch!(q),
					engineConfig.timeoutMs
				);

				if (result?.response) {
					const usefulness =
						result.usefulness ?? scoreUsefulness(result.response);
					const minUsefulness = skill.config?.minUsefulness ?? 3;

					if (usefulness >= minUsefulness) {
						logger.debug(
							`[Skill Engine] ${skill.id} KB search success (usefulness: ${usefulness})`
						);

						const executionResult: SkillExecutionResult = {
							response: result.response,
							skillId: skill.id,
							step: 'kbSearch',
							matchedPattern: result.matchedPattern,
							usefulness,
							executionTimeMs: Date.now() - stepStart,
							success: true,
							cached: false,
							metadata: { userId: ctx.userProfile?.userId },
						};

						// Record metrics
						if (engineConfig.enableMetrics) {
							skillMetrics.recordExecution(
								executionResult,
								ctx.userProfile?.userId
							);
						}

						// Cache result
						if (engineConfig.enableCaching) {
							const cacheKey = generateCacheKey(q, ctx);
							executionCache.set(cacheKey, {
								result: result.response,
								timestamp: Date.now(),
							});
						}

						// Reset circuit breaker on success
						if (engineConfig.enableCircuitBreaker) {
							resetCircuitBreaker(skill.id);
						}

						return result.response;
					} else {
						logger.debug(
							`[Skill Engine] ${skill.id} KB search too weak (usefulness: ${usefulness} < ${minUsefulness})`
						);
					}
				}
			}

			// 3) Try research agent (for "which/best" requests)
			if (skill.researchAgent) {
				const stepStart = Date.now();
				const result = await executeWithTimeout(
					() => skill.researchAgent!(q, ctx),
					engineConfig.timeoutMs
				);

				if (result?.response) {
					const usefulness =
						result.usefulness ?? scoreUsefulness(result.response);
					const minUsefulness = skill.config?.minUsefulness ?? 3;

					if (usefulness >= minUsefulness) {
						logger.debug(
							`[Skill Engine] ${skill.id} research agent success (usefulness: ${usefulness})`
						);

						const executionResult: SkillExecutionResult = {
							response: result.response,
							skillId: skill.id,
							step: 'researchAgent',
							matchedPattern: result.matchedPattern,
							usefulness,
							executionTimeMs: Date.now() - stepStart,
							success: true,
							cached: false,
							metadata: { userId: ctx.userProfile?.userId },
						};

						// Record metrics
						if (engineConfig.enableMetrics) {
							skillMetrics.recordExecution(
								executionResult,
								ctx.userProfile?.userId
							);
						}

						// Cache result
						if (engineConfig.enableCaching) {
							const cacheKey = generateCacheKey(q, ctx);
							executionCache.set(cacheKey, {
								result: result.response,
								timestamp: Date.now(),
							});
						}

						// Reset circuit breaker on success
						if (engineConfig.enableCircuitBreaker) {
							resetCircuitBreaker(skill.id);
						}

						return result.response;
					} else {
						logger.debug(
							`[Skill Engine] ${skill.id} research agent too weak (usefulness: ${usefulness} < ${minUsefulness})`
						);
					}
				}
			}

			// 4) Try composer (if provided and we have structured data)
			if (skill.composer) {
				// This would be used if earlier steps returned structured data
				// that needs to be composed into a final response
				// Implementation depends on specific use cases
			}
		} catch (error) {
			logger.error(`[Skill Engine] Error in skill ${skill.id}:`, error);

			// Record error metrics
			if (engineConfig.enableMetrics) {
				const errorResult: SkillExecutionResult = {
					response: null,
					skillId: skill.id,
					step: 'unknown',
					matchedPattern: null,
					usefulness: 0,
					executionTimeMs: Date.now() - startTime,
					success: false,
					cached: false,
					error: error instanceof Error ? error.message : String(error),
					metadata: { userId: ctx.userProfile?.userId },
				};
				skillMetrics.recordExecution(errorResult, ctx.userProfile?.userId);
			}

			// Update circuit breaker on error
			if (engineConfig.enableCircuitBreaker) {
				recordCircuitBreakerFailure(skill.id);
			}

			// Continue to next skill instead of failing completely
		}
	}

	logger.debug(
		`[Skill Engine] No skill provided a good enough response (tried ${skills.length} skills)`
	);
	return null;
}

// Helper functions

/**
 * Generate cache key for a query and context
 */
function generateCacheKey(q: string, ctx: ChatContext): string {
	const contextHash = JSON.stringify({
		userId: ctx.userProfile?.userId,
		locale: ctx.locale,
		currency: ctx.currency,
	});
	return `${q}:${contextHash}`;
}

/**
 * Execute a function with timeout
 */
async function executeWithTimeout<T>(
	fn: () => T | Promise<T>,
	timeoutMs: number
): Promise<T | null> {
	return new Promise((resolve) => {
		const timer = setTimeout(() => {
			resolve(null);
		}, timeoutMs);

		Promise.resolve(fn())
			.then((result) => {
				clearTimeout(timer);
				resolve(result);
			})
			.catch((error) => {
				clearTimeout(timer);
				logger.error('[Skill Engine] Execution error:', error);
				resolve(null);
			});
	});
}

/**
 * Check if circuit breaker is open for a skill
 */
function isCircuitBreakerOpen(skillId: string): boolean {
	const state = circuitBreakerState.get(skillId);
	if (!state) return false;

	const now = Date.now();
	const timeSinceLastFailure = now - state.lastFailure;

	// If circuit is open and enough time has passed, move to half-open
	if (state.state === 'open' && timeSinceLastFailure > 60000) {
		// 1 minute
		state.state = 'half-open';
		return false;
	}

	return state.state === 'open';
}

/**
 * Record a circuit breaker failure
 */
function recordCircuitBreakerFailure(skillId: string): void {
	const state = circuitBreakerState.get(skillId) || {
		failures: 0,
		lastFailure: 0,
		state: 'closed' as const,
	};

	state.failures++;
	state.lastFailure = Date.now();

	// Open circuit after 5 failures
	if (state.failures >= 5) {
		state.state = 'open';
		logger.debug(`[Skill Engine] Circuit breaker opened for skill: ${skillId}`);
	}

	circuitBreakerState.set(skillId, state);
}

/**
 * Reset circuit breaker for a skill
 */
function resetCircuitBreaker(skillId: string): void {
	const state = circuitBreakerState.get(skillId);
	if (state) {
		state.failures = 0;
		state.state = 'closed';
		circuitBreakerState.set(skillId, state);
	}
}

/**
 * Clear execution cache
 */
export function clearExecutionCache(): void {
	executionCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; entries: string[] } {
	return {
		size: executionCache.size,
		entries: Array.from(executionCache.keys()),
	};
}

/**
 * Get circuit breaker status for all skills
 */
export function getCircuitBreakerStatus(): Record<
	string,
	{ state: string; failures: number; lastFailure: number }
> {
	const status: Record<
		string,
		{ state: string; failures: number; lastFailure: number }
	> = {};

	for (const [skillId, state] of circuitBreakerState) {
		status[skillId] = {
			state: state.state,
			failures: state.failures,
			lastFailure: state.lastFailure,
		};
	}

	return status;
}

/**
 * Get skill engine statistics
 */
export function getSkillEngineStats() {
	const registryStats = skillRegistry.getStats();
	return {
		...registryStats,
		engineVersion: '1.0.0',
	};
}

/**
 * Test a specific skill (for debugging)
 */
export async function testSkill(
	skillId: string,
	q: string,
	ctx: ChatContext,
	config: Partial<SkillEngineConfig> = {}
): Promise<SkillExecutionResult | null> {
	const engineConfig = { ...DEFAULT_CONFIG, ...config };
	const skill = skillRegistry.getById(skillId);
	if (!skill) {
		logger.error(`[Skill Engine] Skill ${skillId} not found`);
		return null;
	}

	const startTime = Date.now();

	try {
		// Try micro-solvers
		if (skill.microSolvers) {
			for (const microSolver of skill.microSolvers) {
				const result = await executeWithTimeout(
					() => microSolver(q, ctx),
					engineConfig.timeoutMs
				);
				if (result?.response) {
					const executionResult: SkillExecutionResult = {
						response: result.response,
						skillId,
						step: 'microSolver',
						matchedPattern: result.matchedPattern,
						usefulness: result.usefulness ?? scoreUsefulness(result.response),
						executionTimeMs: Date.now() - startTime,
						success: true,
						cached: false,
						metadata: { userId: ctx.userProfile?.userId },
					};

					// Record metrics
					if (engineConfig.enableMetrics) {
						skillMetrics.recordExecution(
							executionResult,
							ctx.userProfile?.userId
						);
					}

					return executionResult;
				}
			}
		}

		// Try KB search
		if (skill.kbSearch) {
			const result = await executeWithTimeout(
				() => skill.kbSearch!(q),
				engineConfig.timeoutMs
			);
			if (result?.response) {
				const executionResult: SkillExecutionResult = {
					response: result.response,
					skillId,
					step: 'kbSearch',
					matchedPattern: result.matchedPattern,
					usefulness: result.usefulness ?? scoreUsefulness(result.response),
					executionTimeMs: Date.now() - startTime,
					success: true,
					cached: false,
					metadata: { userId: ctx.userProfile?.userId },
				};

				// Record metrics
				if (engineConfig.enableMetrics) {
					skillMetrics.recordExecution(
						executionResult,
						ctx.userProfile?.userId
					);
				}

				return executionResult;
			}
		}

		// Try research agent
		if (skill.researchAgent) {
			const result = await executeWithTimeout(
				() => skill.researchAgent!(q, ctx),
				engineConfig.timeoutMs
			);
			if (result?.response) {
				const executionResult: SkillExecutionResult = {
					response: result.response,
					skillId,
					step: 'researchAgent',
					matchedPattern: result.matchedPattern,
					usefulness: result.usefulness ?? scoreUsefulness(result.response),
					executionTimeMs: Date.now() - startTime,
					success: true,
					cached: false,
					metadata: { userId: ctx.userProfile?.userId },
				};

				// Record metrics
				if (engineConfig.enableMetrics) {
					skillMetrics.recordExecution(
						executionResult,
						ctx.userProfile?.userId
					);
				}

				return executionResult;
			}
		}

		return null;
	} catch (error) {
		const errorResult: SkillExecutionResult = {
			response: null,
			skillId,
			step: 'unknown',
			matchedPattern: null,
			usefulness: 0,
			executionTimeMs: Date.now() - startTime,
			success: false,
			cached: false,
			error: error instanceof Error ? error.message : String(error),
			metadata: { userId: ctx.userProfile?.userId },
		};

		// Record error metrics
		if (engineConfig.enableMetrics) {
			skillMetrics.recordExecution(errorResult, ctx.userProfile?.userId);
		}

		return errorResult;
	}
}
