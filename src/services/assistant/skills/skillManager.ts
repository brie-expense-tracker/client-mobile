// Skill Manager - Comprehensive skill management system
// Handles validation, caching, metrics, dependencies, and testing

import {
import { logger } from '../../../../utils/logger';

	EnhancedSkill,
	SkillValidationResult,
	SkillCacheEntry,
	SkillMetrics,
	SkillDependency,
	SkillMiddleware,
	SkillTestCase,
	SkillRegistryConfig,
	SkillExecutionResult,
	SkillStepResult,
	SlotSpec,
} from './types';
import { ChatContext } from '../../feature/chatController';
import { ChatResponse } from '../responseSchema';

// Default configuration
const DEFAULT_CONFIG: SkillRegistryConfig = {
	caching: {
		enabled: true,
		defaultTtlMs: 300000, // 5 minutes
		maxSize: 1000,
	},
	metrics: {
		enabled: true,
		retentionDays: 30,
	},
	middleware: {
		global: [],
	},
	validation: {
		strict: true,
		validateSlots: true,
	},
};

export class SkillManager {
	private static instance: SkillManager;
	private skills: Map<string, EnhancedSkill> = new Map();
	private cache: Map<string, SkillCacheEntry> = new Map();
	private metrics: Map<string, SkillMetrics> = new Map();
	private config: SkillRegistryConfig;
	private globalMiddleware: SkillMiddleware[] = [];

	private constructor(config: Partial<SkillRegistryConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.globalMiddleware = this.config.middleware.global;
	}

	static getInstance(config?: Partial<SkillRegistryConfig>): SkillManager {
		if (!SkillManager.instance) {
			SkillManager.instance = new SkillManager(config);
		}
		return SkillManager.instance;
	}

	/**
	 * Register a skill with enhanced features
	 */
	registerSkill(skill: EnhancedSkill): void {
		// Validate skill before registration
		const validation = this.validateSkill(skill);
		if (!validation.valid) {
			throw new Error(
				`Invalid skill ${skill.id}: ${validation.errors.join(', ')}`
			);
		}

		// Check dependencies
		if (skill.dependencies) {
			for (const dep of skill.dependencies) {
				if (dep.required && !this.skills.has(dep.skillId)) {
					throw new Error(
						`Skill ${skill.id} requires dependency ${dep.skillId} which is not registered`
					);
				}
			}
		}

		this.skills.set(skill.id, skill);
		this.initializeMetrics(skill.id);
		logger.debug(
			`[SkillManager] Registered skill: ${skill.id} v${
				skill.version?.major || 1
			}.${skill.version?.minor || 0}.${skill.version?.patch || 0}`
		);
	}

	/**
	 * Unregister a skill
	 */
	unregisterSkill(skillId: string): boolean {
		if (!this.skills.has(skillId)) {
			return false;
		}

		// Check if other skills depend on this one
		const dependents = Array.from(this.skills.values()).filter((skill) =>
			skill.dependencies?.some((dep) => dep.skillId === skillId)
		);

		if (dependents.length > 0) {
			throw new Error(
				`Cannot unregister skill ${skillId}: ${dependents.length} skills depend on it`
			);
		}

		this.skills.delete(skillId);
		this.metrics.delete(skillId);
		this.clearCacheForSkill(skillId);
		logger.debug(`[SkillManager] Unregistered skill: ${skillId}`);
		return true;
	}

	/**
	 * Get a skill by ID
	 */
	getSkill(skillId: string): EnhancedSkill | undefined {
		return this.skills.get(skillId);
	}

	/**
	 * Get all registered skills
	 */
	getAllSkills(): EnhancedSkill[] {
		return Array.from(this.skills.values());
	}

	/**
	 * Find skills that match a question
	 */
	findMatchingSkills(question: string): EnhancedSkill[] {
		const matchingSkills = Array.from(this.skills.values())
			.filter((skill) => skill.matches(question))
			.sort((a, b) => (b.config?.priority ?? 0) - (a.config?.priority ?? 0));

		return matchingSkills;
	}

	/**
	 * Execute a skill with full feature support
	 */
	async executeSkill(
		skillId: string,
		params: any,
		ctx: ChatContext
	): Promise<SkillExecutionResult> {
		const startTime = Date.now();
		const skill = this.getSkill(skillId);

		if (!skill) {
			throw new Error(`Skill ${skillId} not found`);
		}

		// Check dependencies
		if (skill.dependencies) {
			for (const dep of skill.dependencies) {
				if (dep.required && !this.isDependencySatisfied(dep, ctx)) {
					throw new Error(
						`Dependency ${dep.skillId} not satisfied for skill ${skillId}`
					);
				}
			}
		}

		// Check cache
		const cacheKey = this.generateCacheKey(skill, params, ctx);
		if (this.config.caching.enabled && skill.cacheConfig?.enabled !== false) {
			const cached = this.getFromCache(cacheKey);
			if (cached) {
				this.updateMetrics(skillId, true, Date.now() - startTime, true);
				return {
					response: cached.data.response,
					skillId,
					step: 'microSolver', // Cached results are treated as micro-solver results
					usefulness: cached.data.usefulness || 0,
					executionTimeMs: Date.now() - startTime,
					success: true,
					cached: true,
					metadata: cached.data.metadata,
				};
			}
		}

		// Apply global middleware
		let modifiedParams = params;
		for (const middleware of this.globalMiddleware) {
			if (middleware.beforeExecution) {
				const result = await middleware.beforeExecution(
					skillId,
					modifiedParams,
					ctx
				);
				if (!result.shouldContinue) {
					throw new Error(`Skill ${skillId} execution cancelled by middleware`);
				}
				modifiedParams = result.modifiedParams || modifiedParams;
			}
		}

		// Apply skill-specific middleware
		if (skill.middleware) {
			for (const middleware of skill.middleware) {
				if (middleware.beforeExecution) {
					const result = await middleware.beforeExecution(
						skillId,
						modifiedParams,
						ctx
					);
					if (!result.shouldContinue) {
						throw new Error(
							`Skill ${skillId} execution cancelled by skill middleware`
						);
					}
					modifiedParams = result.modifiedParams || modifiedParams;
				}
			}
		}

		try {
			// Execute the skill
			const result = await skill.run(modifiedParams, ctx);
			const executionTime = Date.now() - startTime;

			if (!result.success) {
				throw new Error(result.error || 'Skill execution failed');
			}

			// Create response
			const response: ChatResponse = {
				message: result.data?.message || 'Skill executed successfully',
				details: result.data?.details,
				cards: result.data?.cards,
				skills: [],
				actions: [],
			};

			const executionResult: SkillExecutionResult = {
				response,
				skillId,
				step: 'microSolver',
				usefulness: this.calculateUsefulness(response),
				executionTimeMs: executionTime,
				success: true,
				metadata: result.data?.metadata,
			};

			// Cache the result
			if (this.config.caching.enabled && skill.cacheConfig?.enabled !== false) {
				this.setCache(cacheKey, {
					data: executionResult,
					timestamp: Date.now(),
					ttl: skill.cacheConfig?.ttlMs || this.config.caching.defaultTtlMs,
					key: cacheKey,
					skillId,
					params: modifiedParams,
				});
			}

			// Update metrics
			this.updateMetrics(skillId, true, executionTime, false);

			// Apply post-execution middleware
			for (const middleware of this.globalMiddleware) {
				if (middleware.afterExecution) {
					await middleware.afterExecution(skillId, executionResult, ctx);
				}
			}

			if (skill.middleware) {
				for (const middleware of skill.middleware) {
					if (middleware.afterExecution) {
						await middleware.afterExecution(skillId, executionResult, ctx);
					}
				}
			}

			return executionResult;
		} catch (error) {
			const executionTime = Date.now() - startTime;
			this.updateMetrics(skillId, false, executionTime, false);

			// Apply error middleware
			for (const middleware of this.globalMiddleware) {
				if (middleware.onError) {
					await middleware.onError(skillId, error as Error, ctx);
				}
			}

			if (skill.middleware) {
				for (const middleware of skill.middleware) {
					if (middleware.onError) {
						await middleware.onError(skillId, error as Error, ctx);
					}
				}
			}

			throw error;
		}
	}

	/**
	 * Validate skill parameters
	 */
	validateSkillParameters(skillId: string, params: any): SkillValidationResult {
		const skill = this.getSkill(skillId);
		if (!skill) {
			return {
				valid: false,
				errors: [`Skill ${skillId} not found`],
				warnings: [],
				missingSlots: [],
				invalidSlots: [],
			};
		}

		if (!skill.slots || !this.config.validation.validateSlots) {
			return {
				valid: true,
				errors: [],
				warnings: [],
				missingSlots: [],
				invalidSlots: [],
			};
		}

		const errors: string[] = [];
		const warnings: string[] = [];
		const missingSlots: string[] = [];
		const invalidSlots: string[] = [];

		for (const [slotName, slotSpec] of Object.entries(skill.slots)) {
			const value = params[slotName];

			if (slotSpec.required && (value === undefined || value === null)) {
				missingSlots.push(slotName);
				errors.push(`Required slot '${slotName}' is missing`);
			}

			if (value !== undefined && value !== null) {
				// Type validation
				const expectedType = slotSpec.type;
				let isValidType = false;

				switch (expectedType) {
					case 'string':
						isValidType = typeof value === 'string';
						break;
					case 'number':
						isValidType = typeof value === 'number' && !isNaN(value);
						break;
					case 'date':
						isValidType = value instanceof Date || !isNaN(Date.parse(value));
						break;
					case 'category':
					case 'merchant':
					case 'account':
					case 'goal_id':
						isValidType = typeof value === 'string';
						break;
				}

				if (!isValidType) {
					invalidSlots.push(slotName);
					errors.push(`Slot '${slotName}' must be of type ${expectedType}`);
				}

				// Custom validator
				if (slotSpec.validator && !slotSpec.validator(value)) {
					invalidSlots.push(slotName);
					errors.push(`Slot '${slotName}' failed custom validation`);
				}
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
			missingSlots,
			invalidSlots,
		};
	}

	/**
	 * Get skill metrics
	 */
	getSkillMetrics(skillId: string): SkillMetrics | undefined {
		return this.metrics.get(skillId);
	}

	/**
	 * Get all skill metrics
	 */
	getAllMetrics(): Map<string, SkillMetrics> {
		return new Map(this.metrics);
	}

	/**
	 * Clear cache for a specific skill
	 */
	clearCacheForSkill(skillId: string): void {
		const keysToDelete = Array.from(this.cache.keys()).filter(
			(key) => this.cache.get(key)?.skillId === skillId
		);
		keysToDelete.forEach((key) => this.cache.delete(key));
	}

	/**
	 * Clear all cache
	 */
	clearAllCache(): void {
		this.cache.clear();
	}

	/**
	 * Run skill tests
	 */
	async runSkillTests(
		skillId: string
	): Promise<{ passed: number; failed: number; results: any[] }> {
		const skill = this.getSkill(skillId);
		if (!skill || !skill.testing?.testCases) {
			return { passed: 0, failed: 0, results: [] };
		}

		const results: any[] = [];
		let passed = 0;
		let failed = 0;

		for (const testCase of skill.testing.testCases) {
			try {
				const result = await this.executeSkill(
					skillId,
					testCase.input.params,
					testCase.input.context
				);
				const testResult = this.evaluateTestCase(testCase, result);
				results.push(testResult);

				if (testResult.passed) {
					passed++;
				} else {
					failed++;
				}
			} catch (error) {
				results.push({
					name: testCase.name,
					passed: false,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
				failed++;
			}
		}

		return { passed, failed, results };
	}

	/**
	 * Add global middleware
	 */
	addGlobalMiddleware(middleware: SkillMiddleware): void {
		this.globalMiddleware.push(middleware);
	}

	/**
	 * Remove global middleware
	 */
	removeGlobalMiddleware(middleware: SkillMiddleware): void {
		const index = this.globalMiddleware.indexOf(middleware);
		if (index > -1) {
			this.globalMiddleware.splice(index, 1);
		}
	}

	/**
	 * Plan skill execution steps
	 */
	async planSkillExecution(
		skillId: string,
		params: any,
		ctx: ChatContext
	): Promise<any> {
		const skill = this.getSkill(skillId);
		if (!skill) {
			throw new Error(`Skill ${skillId} not found`);
		}

		if (skill.plan) {
			return await skill.plan(params, ctx);
		}

		// Default planning logic
		return {
			steps: ['validate', 'execute', 'compose'],
			estimatedTime: 1000,
			dependencies: skill.dependencies || [],
		};
	}

	/**
	 * Check if a skill can handle the given context
	 */
	canSkillHandleContext(
		skillId: string,
		ctx: ChatContext
	): {
		canAnswer: boolean;
		reason?: string;
		confidence?: number;
	} {
		const skill = this.getSkill(skillId);
		if (!skill) {
			return {
				canAnswer: false,
				reason: 'Skill not found',
				confidence: 0,
			};
		}

		if (skill.canHandle) {
			return skill.canHandle(ctx);
		}

		// Default context checking logic
		const hasRequiredData = this.checkRequiredContextData(skill, ctx);
		return {
			canAnswer: hasRequiredData,
			reason: hasRequiredData
				? 'Context requirements met'
				: 'Missing required context data',
			confidence: hasRequiredData ? 0.8 : 0.2,
		};
	}

	/**
	 * Render skill data into UI components
	 */
	renderSkillData(skillId: string, data: any, params: any): any {
		const skill = this.getSkill(skillId);
		if (!skill) {
			throw new Error(`Skill ${skillId} not found`);
		}

		if (skill.render) {
			return skill.render(data, params);
		}

		// Default rendering - return data as-is
		return data;
	}

	/**
	 * Generate coach note from skill data
	 */
	generateCoachNote(skillId: string, data: any): { message: string } | null {
		const skill = this.getSkill(skillId);
		if (!skill) {
			return null;
		}

		if (skill.coach) {
			return skill.coach(data);
		}

		// Default coach note generation
		return {
			message: `Skill ${skill.name} executed successfully. Consider reviewing the results.`,
		};
	}

	/**
	 * Execute skill using the micro-solvers pipeline
	 */
	async executeSkillWithMicroSolvers(
		skillId: string,
		question: string,
		ctx: ChatContext
	): Promise<SkillExecutionResult> {
		const skill = this.getSkill(skillId);
		if (!skill) {
			throw new Error(`Skill ${skillId} not found`);
		}

		const startTime = Date.now();
		let result: SkillStepResult | null = null;

		// Try micro-solvers first (cheap, fast)
		if (skill.microSolvers) {
			for (const microSolver of skill.microSolvers) {
				result = microSolver(question, ctx);
				if (result && result.response) {
					break;
				}
			}
		}

		// If no result from micro-solvers, try KB search
		if (!result && skill.kbSearch) {
			result = skill.kbSearch(question);
		}

		// If still no result, try research agent (expensive)
		if (!result && skill.researchAgent) {
			result = await skill.researchAgent(question, ctx);
		}

		// If we have structured data, use composer
		if (result && result.response && skill.composer) {
			const composedResponse = skill.composer(question, ctx, result.response);
			result.response = composedResponse;
		}

		const executionTime = Date.now() - startTime;

		return {
			response: result?.response || null,
			skillId,
			step: result ? 'microSolver' : 'unknown',
			matchedPattern: result?.matchedPattern,
			usefulness: result?.usefulness || 0,
			executionTimeMs: executionTime,
			success: result !== null,
			metadata: result?.response ? { source: 'microSolvers' } : undefined,
		};
	}

	/**
	 * Find and recommend skills based on context
	 */
	recommendSkills(ctx: ChatContext, limit: number = 5): EnhancedSkill[] {
		const recommendations: { skill: EnhancedSkill; score: number }[] = [];

		for (const skill of this.skills.values()) {
			const canHandle = this.canSkillHandleContext(skill.id, ctx);
			if (canHandle.canAnswer) {
				const score = this.calculateSkillRelevanceScore(skill, ctx);
				recommendations.push({ skill, score });
			}
		}

		return recommendations
			.sort((a, b) => b.score - a.score)
			.slice(0, limit)
			.map((r) => r.skill);
	}

	/**
	 * Get skill statistics and health metrics
	 */
	getSkillHealth(skillId: string): {
		health: 'healthy' | 'warning' | 'critical';
		metrics: SkillMetrics | undefined;
		issues: string[];
	} {
		const metrics = this.getSkillMetrics(skillId);
		const issues: string[] = [];

		if (!metrics) {
			return {
				health: 'critical',
				metrics: undefined,
				issues: ['No metrics available'],
			};
		}

		// Check for issues
		if (metrics.failureCount > metrics.successCount) {
			issues.push('High failure rate');
		}

		if (metrics.averageExecutionTime > 5000) {
			issues.push('Slow execution time');
		}

		if (metrics.cacheHitRate < 0.1) {
			issues.push('Low cache hit rate');
		}

		if (metrics.lastExecuted < Date.now() - 7 * 24 * 60 * 60 * 1000) {
			issues.push('Not used recently');
		}

		let health: 'healthy' | 'warning' | 'critical' = 'healthy';
		if (issues.length > 2) {
			health = 'critical';
		} else if (issues.length > 0) {
			health = 'warning';
		}

		return { health, metrics, issues };
	}

	// Private helper methods

	private validateSkill(skill: EnhancedSkill): SkillValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		if (!skill.id) {
			errors.push('Skill must have an ID');
		}

		if (!skill.name) {
			errors.push('Skill must have a name');
		}

		if (!skill.matches || typeof skill.matches !== 'function') {
			errors.push('Skill must have a matches function');
		}

		if (!skill.run || typeof skill.run !== 'function') {
			errors.push('Skill must have a run function');
		}

		if (skill.version && skill.version.deprecated) {
			warnings.push(`Skill ${skill.id} is deprecated`);
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
			missingSlots: [],
			invalidSlots: [],
		};
	}

	private isDependencySatisfied(
		dependency: SkillDependency,
		ctx: ChatContext
	): boolean {
		if (!this.skills.has(dependency.skillId)) {
			return false;
		}

		if (dependency.condition && !dependency.condition(ctx)) {
			return false;
		}

		return true;
	}

	private generateCacheKey(
		skill: EnhancedSkill,
		params: any,
		ctx: ChatContext
	): string {
		if (skill.cacheConfig?.keyGenerator) {
			return skill.cacheConfig.keyGenerator(params, ctx);
		}

		const paramStr = JSON.stringify(params);
		const ctxStr = JSON.stringify({
			userId: ctx.userProfile?.userId,
			budgetCount: ctx.budgets?.length || 0,
			goalCount: ctx.goals?.length || 0,
			transactionCount: ctx.transactions?.length || 0,
		});

		return `${skill.id}:${Buffer.from(paramStr + ctxStr)
			.toString('base64')
			.slice(0, 32)}`;
	}

	private getFromCache(key: string): SkillCacheEntry | null {
		const entry = this.cache.get(key);
		if (!entry) {
			return null;
		}

		if (Date.now() - entry.timestamp > entry.ttl) {
			this.cache.delete(key);
			return null;
		}

		return entry;
	}

	private setCache(key: string, entry: SkillCacheEntry): void {
		// Implement LRU eviction if cache is full
		if (this.cache.size >= this.config.caching.maxSize) {
			const oldestKey = this.cache.keys().next().value;
			if (oldestKey) {
				this.cache.delete(oldestKey);
			}
		}

		this.cache.set(key, entry);
	}

	private initializeMetrics(skillId: string): void {
		this.metrics.set(skillId, {
			skillId,
			executionCount: 0,
			successCount: 0,
			failureCount: 0,
			averageExecutionTime: 0,
			lastExecuted: 0,
			cacheHitRate: 0,
			usefulnessScores: [],
		});
	}

	private updateMetrics(
		skillId: string,
		success: boolean,
		executionTime: number,
		cached: boolean
	): void {
		const metrics = this.metrics.get(skillId);
		if (!metrics) return;

		metrics.executionCount++;
		metrics.lastExecuted = Date.now();

		if (success) {
			metrics.successCount++;
		} else {
			metrics.failureCount++;
		}

		// Update average execution time
		metrics.averageExecutionTime =
			(metrics.averageExecutionTime * (metrics.executionCount - 1) +
				executionTime) /
			metrics.executionCount;

		// Update cache hit rate
		const cacheHits = metrics.executionCount - (this.cache.size > 0 ? 0 : 1);
		metrics.cacheHitRate = cacheHits / metrics.executionCount;
	}

	private calculateUsefulness(response: ChatResponse): number {
		// Simple usefulness calculation based on response content
		let score = 0;

		if (response.message && response.message.length > 10) score += 1;
		if (response.details) score += 1;
		if (response.cards && response.cards.length > 0) score += 1;
		if (response.actions && response.actions.length > 0) score += 1;
		if (response.skills && response.skills.length > 0) score += 1;

		return Math.min(score, 5); // Max score of 5
	}

	private evaluateTestCase(
		testCase: SkillTestCase,
		result: SkillExecutionResult
	): any {
		const passed =
			result.response?.message?.includes(
				testCase.expected.containsText?.[0] || ''
			) || false;
		return {
			name: testCase.name,
			passed,
			expected: testCase.expected,
			actual: {
				success: result.response !== null,
				message: result.response?.message || 'No response',
			},
		};
	}

	private checkRequiredContextData(
		skill: EnhancedSkill,
		ctx: ChatContext
	): boolean {
		// Check if skill has specific context requirements
		if (skill.slots) {
			for (const [slotName, slotSpec] of Object.entries(skill.slots)) {
				if (slotSpec.required) {
					// Check if required data exists in context
					const hasData = this.checkContextForSlot(slotName, slotSpec, ctx);
					if (!hasData) {
						return false;
					}
				}
			}
		}

		// Check if skill has dependencies
		if (skill.dependencies) {
			for (const dep of skill.dependencies) {
				if (dep.required && !this.isDependencySatisfied(dep, ctx)) {
					return false;
				}
			}
		}

		return true;
	}

	private checkContextForSlot(
		slotName: string,
		slotSpec: SlotSpec,
		ctx: ChatContext
	): boolean {
		// Check various context properties for the required data
		const contextData = [
			ctx.accounts,
			ctx.budgets,
			ctx.goals,
			ctx.transactions,
			ctx.userProfile,
		];

		for (const data of contextData) {
			if (data && Array.isArray(data) && data.length > 0) {
				return true;
			}
			if (data && typeof data === 'object' && Object.keys(data).length > 0) {
				return true;
			}
		}

		return false;
	}

	private calculateSkillRelevanceScore(
		skill: EnhancedSkill,
		ctx: ChatContext
	): number {
		let score = 0;

		// Base score from priority
		score += skill.config?.priority || 0;

		// Boost score if skill can handle context well
		const canHandle = this.canSkillHandleContext(skill.id, ctx);
		if (canHandle.canAnswer) {
			score += canHandle.confidence || 0.5;
		}

		// Boost score based on recent usage
		const metrics = this.getSkillMetrics(skill.id);
		if (metrics) {
			// Recent usage boost
			const daysSinceLastUse =
				(Date.now() - metrics.lastExecuted) / (1000 * 60 * 60 * 24);
			if (daysSinceLastUse < 1) {
				score += 2;
			} else if (daysSinceLastUse < 7) {
				score += 1;
			}

			// Success rate boost
			if (metrics.executionCount > 0) {
				const successRate = metrics.successCount / metrics.executionCount;
				score += successRate;
			}
		}

		// Boost score for skills with good cache performance
		if (metrics && metrics.cacheHitRate > 0.5) {
			score += 0.5;
		}

		return Math.max(0, score);
	}
}

// Export singleton instance
export const skillManager = SkillManager.getInstance();
