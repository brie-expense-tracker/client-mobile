// Skill Executor - Handles execution of AI-proposed skills
// Maps AI actions to executable skills in the skillRegistry

import {
	executeSkill,
	getAvailableSkills,
	getSkillDetails,
	validateSkillParameters,
} from './skillRegistry';
import { FinancialContext } from './helpfulFallbacks';
import { ChatResponse } from './responseSchema';

export interface SkillExecutionRequest {
	skillName: string;
	params: any;
	context: FinancialContext;
	userId?: string;
}

export interface SkillExecutionResult {
	success: boolean;
	skillName: string;
	result: any;
	message: string;
	error?: string;
	executionTime: number;
}

export interface SkillExecutionSummary {
	totalSkills: number;
	successfulSkills: number;
	failedSkills: number;
	results: SkillExecutionResult[];
	summary: string;
}

export class SkillExecutor {
	private static instance: SkillExecutor;
	private executionHistory: SkillExecutionResult[] = [];

	static getInstance(): SkillExecutor {
		if (!SkillExecutor.instance) {
			SkillExecutor.instance = new SkillExecutor();
		}
		return SkillExecutor.instance;
	}

	/**
	 * Execute a single skill
	 */
	async executeSkill(
		request: SkillExecutionRequest
	): Promise<SkillExecutionResult> {
		const startTime = Date.now();

		try {
			// Validate the skill exists
			const skillDetails = getSkillDetails(request.skillName);
			if (!skillDetails) {
				return {
					success: false,
					skillName: request.skillName,
					result: null,
					message: `Unknown skill: ${request.skillName}`,
					error: 'UNKNOWN_SKILL',
					executionTime: Date.now() - startTime,
				};
			}

			// Execute the skill
			const result = await executeSkill(
				request.skillName,
				request.params,
				request.context
			);

			const executionResult: SkillExecutionResult = {
				success: result.success,
				skillName: request.skillName,
				result: result.data,
				message: result.message,
				error: result.error,
				executionTime: Date.now() - startTime,
			};

			// Store in history
			this.executionHistory.push(executionResult);

			return executionResult;
		} catch (error) {
			const executionResult: SkillExecutionResult = {
				success: false,
				skillName: request.skillName,
				result: null,
				message: `Failed to execute skill: ${request.skillName}`,
				error: error instanceof Error ? error.message : 'EXECUTION_ERROR',
				executionTime: Date.now() - startTime,
			};

			this.executionHistory.push(executionResult);
			return executionResult;
		}
	}

	/**
	 * Execute multiple skills from a ChatResponse
	 */
	async executeSkillsFromResponse(
		response: ChatResponse,
		context: FinancialContext,
		userId?: string
	): Promise<SkillExecutionSummary> {
		if (!response.skills || response.skills.length === 0) {
			return {
				totalSkills: 0,
				successfulSkills: 0,
				failedSkills: 0,
				results: [],
				summary: 'No skills to execute',
			};
		}

		const results: SkillExecutionResult[] = [];
		let successfulSkills = 0;
		let failedSkills = 0;

		// Execute skills sequentially to avoid conflicts
		for (const skill of response.skills) {
			const request: SkillExecutionRequest = {
				skillName: skill.name,
				params: skill.params,
				context,
				userId,
			};

			const result = await this.executeSkill(request);
			results.push(result);

			if (result.success) {
				successfulSkills++;
			} else {
				failedSkills++;
			}
		}

		const summary = this.generateSummary(
			successfulSkills,
			failedSkills,
			results
		);

		return {
			totalSkills: response.skills.length,
			successfulSkills,
			failedSkills,
			results,
			summary,
		};
	}

	/**
	 * Get available skills for the AI to use
	 */
	getAvailableSkills(): string[] {
		return getAvailableSkills();
	}

	/**
	 * Get skill details for a specific skill
	 */
	getSkillDetails(skillName: string) {
		return getSkillDetails(skillName);
	}

	/**
	 * Validate skill parameters before execution
	 */
	validateSkillParameters(
		skillName: string,
		params: any
	): { valid: boolean; errors: string[] } {
		return validateSkillParameters(skillName, params);
	}

	/**
	 * Get execution history
	 */
	getExecutionHistory(): SkillExecutionResult[] {
		return [...this.executionHistory];
	}

	/**
	 * Clear execution history
	 */
	clearExecutionHistory(): void {
		this.executionHistory = [];
	}

	/**
	 * Generate a human-readable summary of skill execution
	 */
	private generateSummary(
		successfulSkills: number,
		failedSkills: number,
		results: SkillExecutionResult[]
	): string {
		if (successfulSkills === 0 && failedSkills === 0) {
			return 'No skills were executed';
		}

		if (failedSkills === 0) {
			return `Successfully executed ${successfulSkills} skill${
				successfulSkills === 1 ? '' : 's'
			}`;
		}

		if (successfulSkills === 0) {
			return `Failed to execute ${failedSkills} skill${
				failedSkills === 1 ? '' : 's'
			}`;
		}

		return `Executed ${successfulSkills} skill${
			successfulSkills === 1 ? '' : 's'
		} successfully, ${failedSkills} failed`;
	}

	/**
	 * Get skills that can be suggested based on context
	 */
	getContextualSkills(context: FinancialContext): {
		skillName: string;
		description: string;
		suggestedParams: any;
		confidence: number;
	}[] {
		const suggestions: {
			skillName: string;
			description: string;
			suggestedParams: any;
			confidence: number;
		}[] = [];

		// Suggest budget adjustment if budgets are close to limits
		if (context.budgets) {
			const overBudget = context.budgets.filter((b) => b.utilization > 90);
			if (overBudget.length > 0) {
				const topOverBudget = overBudget.sort(
					(a, b) => b.utilization - a.utilization
				)[0];
				suggestions.push({
					skillName: 'ADJUST_LIMIT',
					description: `Increase budget for ${
						topOverBudget.name
					} (currently at ${topOverBudget.utilization.toFixed(
						0
					)}% utilization)`,
					suggestedParams: {
						cat: topOverBudget.name,
						delta: topOverBudget.amount * 0.2, // Suggest 20% increase
						reason: 'High utilization detected',
					},
					confidence: 0.8,
				});
			}
		}

		// Suggest categorization rules if there are uncategorized transactions
		if (context.transactions && context.transactions.length > 0) {
			const uncategorized = context.transactions.filter(
				(t) => !t.category || t.category === 'Uncategorized'
			);
			if (uncategorized.length > 5) {
				suggestions.push({
					skillName: 'CREATE_RULE',
					description:
						'Create categorization rules for uncategorized transactions',
					suggestedParams: {
						cat: 'General',
						priority: 7,
					},
					confidence: 0.7,
				});
			}
		}

		// Suggest savings target if no goals exist
		if (!context.goals || context.goals.length === 0) {
			if (context.profile?.monthlyIncome) {
				const suggestedTarget = context.profile.monthlyIncome * 0.2; // 20% of income
				suggestions.push({
					skillName: 'SET_SAVINGS_TARGET',
					description: 'Set up your first savings goal',
					suggestedParams: {
						goalName: 'Emergency Fund',
						targetAmount: suggestedTarget,
						monthlyContribution: suggestedTarget / 12,
					},
					confidence: 0.9,
				});
			}
		}

		// Suggest spending insights if there's recent spending data
		if (context.recentSpendByCat && context.recentSpendByCat.length > 0) {
			suggestions.push({
				skillName: 'GET_SPENDING_INSIGHT',
				description: 'Get insights on your recent spending patterns',
				suggestedParams: {},
				confidence: 0.8,
			});
		}

		return suggestions;
	}

	/**
	 * Execute a skill with automatic parameter suggestion
	 */
	async executeSkillWithSuggestion(
		skillName: string,
		context: FinancialContext,
		userId?: string
	): Promise<SkillExecutionResult> {
		const contextualSkills = this.getContextualSkills(context);
		const suggestion = contextualSkills.find((s) => s.skillName === skillName);

		if (suggestion) {
			return this.executeSkill({
				skillName,
				params: suggestion.suggestedParams,
				context,
				userId,
			});
		}

		// Fallback to skill without parameters
		return this.executeSkill({
			skillName,
			params: {},
			context,
			userId,
		});
	}
}

// Export singleton instance
export const skillExecutor = SkillExecutor.getInstance();
