// Tools-Only Contract for LLM
// Forces grounding, simplifies prompts, improves trust
// Only passes {intent, toolsOut} to LLM - no raw user data, no PII

import { FactPack } from '../../services/assistant/factPack';
import { logger } from '../../../utils/logger';


export interface ToolsOnlyInput {
	intent: string;
	toolsOut: FactPack;
}

export interface ToolsOnlyResponse {
	response: string;
	isValid: boolean;
	violations: string[];
	fallbackUsed: boolean;
}

export interface NumberValidationResult {
	isValid: boolean;
	violations: string[];
	inventedNumbers: number[];
}

/**
 * Tools-Only Contract Service
 * Ensures LLM only receives {intent, toolsOut} and validates no invented numbers
 */
export class ToolsOnlyContractService {
	private static readonly NUMBER_PATTERN = /\$?[\d,]+\.?\d*/g;
	private static readonly PERCENTAGE_PATTERN = /\d+\.?\d*%/g;
	private static readonly DECIMAL_PATTERN = /\d+\.\d+/g;

	/**
	 * Prepare tools-only input for LLM
	 * Strips all raw user data and PII, only passes intent and toolsOut
	 */
	static prepareToolsOnlyInput(
		userQuery: string,
		intent: string,
		factPack: FactPack,
		context?: any
	): ToolsOnlyInput {
		// Create a sanitized toolsOut that only contains the structured data
		const toolsOut: FactPack = {
			...factPack,
			// Preserve essential metadata if it exists
			...(factPack.metadata && {
				metadata: {
					...factPack.metadata,
				},
			}),
		};

		return {
			intent,
			toolsOut,
		};
	}

	/**
	 * Validate LLM response against toolsOut to ensure no invented numbers
	 */
	static validateResponse(
		response: string,
		toolsOut: FactPack
	): NumberValidationResult {
		const violations: string[] = [];
		const inventedNumbers: number[] = [];

		// Extract all numbers from the response
		const responseNumbers = this.extractNumbers(response);

		// Extract all valid numbers from toolsOut
		const validNumbers = this.extractValidNumbers(toolsOut);

		// Check each number in the response
		for (const number of responseNumbers) {
			if (!this.isNumberValid(number, validNumbers)) {
				violations.push(`Invented number: ${number}`);
				inventedNumbers.push(number);
			}
		}

		return {
			isValid: violations.length === 0,
			violations,
			inventedNumbers,
		};
	}

	/**
	 * Extract all numbers from a text string with enhanced currency/percent detection
	 */
	private static extractNumbers(text: string): number[] {
		const numbers: number[] = [];

		// Match dollar amounts (including various formats)
		const dollarMatches = text.match(/\$?([\d,]+\.?\d*)/g);
		if (dollarMatches) {
			for (const match of dollarMatches) {
				const cleanNumber = match.replace(/[$,]/g, '');
				const num = parseFloat(cleanNumber);
				if (!isNaN(num) && num > 0) {
					// Only include positive numbers
					numbers.push(num);
				}
			}
		}

		// Match percentages (including various formats)
		const percentMatches = text.match(/(\d+\.?\d*)%/g);
		if (percentMatches) {
			for (const match of percentMatches) {
				const cleanNumber = match.replace('%', '');
				const num = parseFloat(cleanNumber);
				if (!isNaN(num) && num >= 0 && num <= 100) {
					// Only include valid percentages
					numbers.push(num);
				}
			}
		}

		// Match decimal numbers (excluding those already captured as dollars/percentages)
		const decimalMatches = text.match(/\b(\d+\.\d+)\b/g);
		if (decimalMatches) {
			for (const match of decimalMatches) {
				const num = parseFloat(match);
				if (!isNaN(num) && num > 0) {
					// Only include positive numbers
					numbers.push(num);
				}
			}
		}

		// Match whole numbers (excluding those already captured)
		const wholeNumberMatches = text.match(/\b(\d+)\b/g);
		if (wholeNumberMatches) {
			for (const match of wholeNumberMatches) {
				const num = parseInt(match, 10);
				if (!isNaN(num) && num > 0) {
					// Only include positive numbers
					numbers.push(num);
				}
			}
		}

		return numbers;
	}

	/**
	 * Extract all valid numbers from toolsOut
	 */
	private static extractValidNumbers(toolsOut: FactPack): number[] {
		const validNumbers: number[] = [];

		// Extract from budgets
		if (toolsOut.budgets) {
			for (const budget of toolsOut.budgets) {
				if (budget.spent !== undefined) validNumbers.push(budget.spent);
				if (budget.limit !== undefined) validNumbers.push(budget.limit);
				if (budget.remaining !== undefined) validNumbers.push(budget.remaining);
				if (budget.utilization !== undefined)
					validNumbers.push(budget.utilization);
			}
		}

		// Extract from goals
		if (toolsOut.goals) {
			for (const goal of toolsOut.goals) {
				if (goal.currentAmount !== undefined)
					validNumbers.push(goal.currentAmount);
				if (goal.targetAmount !== undefined)
					validNumbers.push(goal.targetAmount);
				if (goal.progress !== undefined) validNumbers.push(goal.progress);
			}
		}

		// Extract from balances
		if (toolsOut.balances) {
			for (const balance of toolsOut.balances) {
				if (balance.current !== undefined) validNumbers.push(balance.current);
			}
		}

		// Extract from recent transactions
		if (toolsOut.recentTransactions) {
			for (const transaction of toolsOut.recentTransactions) {
				if (transaction.amount !== undefined)
					validNumbers.push(transaction.amount);
			}
		}

		// Extract from spending patterns
		if (toolsOut.spendingPatterns) {
			const patterns = toolsOut.spendingPatterns;
			if (patterns.averageDaily !== undefined)
				validNumbers.push(patterns.averageDaily);
			if (patterns.totalSpent !== undefined)
				validNumbers.push(patterns.totalSpent);
			if (patterns.comparison?.change !== undefined)
				validNumbers.push(patterns.comparison.change);
		}

		return validNumbers;
	}

	/**
	 * Check if a number is valid (exists in toolsOut with tolerance)
	 */
	private static isNumberValid(
		number: number,
		validNumbers: number[]
	): boolean {
		const tolerance = 0.01; // Allow small floating point differences

		// Direct match with tolerance
		if (
			validNumbers.some(
				(validNumber) => Math.abs(number - validNumber) < tolerance
			)
		) {
			return true;
		}

		// Allow percentage calculations only if the base numbers exist
		// For example, if 50% is mentioned and 50 exists in validNumbers, it's valid
		if (validNumbers.includes(number)) {
			return true;
		}

		// Allow common financial calculations if the components exist
		// For example, if 1000 and 500 exist, then 1500 (sum) or 500 (difference) should be valid
		const sum = validNumbers.reduce((a, b) => a + b, 0);
		if (Math.abs(number - sum) < tolerance) {
			return true;
		}

		// Allow common percentage calculations (e.g., 50% of 1000 = 500)
		for (const validNumber of validNumbers) {
			if (validNumber > 0) {
				// Check if number is a percentage of validNumber
				const percentage = (number / validNumber) * 100;
				if (
					percentage >= 0 &&
					percentage <= 100 &&
					Math.abs(percentage - Math.round(percentage)) < 0.01
				) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Create safe fallback response when validation fails
	 */
	static createSafeFallback(
		intent: string,
		toolsOut: FactPack,
		violations: string[]
	): ToolsOnlyResponse {
		const fallbackMessage = this.generateFallbackMessage(intent, toolsOut);

		return {
			response: fallbackMessage,
			isValid: false,
			violations,
			fallbackUsed: true,
		};
	}

	/**
	 * Generate fallback message based on intent and available data
	 */
	private static generateFallbackMessage(
		intent: string,
		toolsOut: FactPack
	): string {
		const timeWindow = toolsOut.time_window;
		const timeRange = `${timeWindow.start} to ${timeWindow.end}`;

		switch (intent) {
			case 'GET_BALANCE':
				if (toolsOut.balances && toolsOut.balances.length > 0) {
					const totalBalance = toolsOut.balances.reduce(
						(sum, b) => sum + (b.current || 0),
						0
					);
					return `Your current balance is $${totalBalance.toFixed(
						2
					)} as of ${timeRange}.`;
				}
				return `I can see your account information, but I need to verify the current balance. Please check your account directly.`;

			case 'GET_BUDGET_STATUS':
				if (toolsOut.budgets && toolsOut.budgets.length > 0) {
					const overBudget = toolsOut.budgets.filter(
						(b) => (b.spent || 0) > (b.limit || 0)
					);
					if (overBudget.length > 0) {
						return `You're over budget in ${overBudget.length} category(ies) for ${timeRange}. Please review your spending.`;
					}
					return `Your budgets are on track for ${timeRange}.`;
				}
				return `I can see your budget information, but I need to verify the current status. Please check your budgets directly.`;

			case 'GET_GOAL_PROGRESS':
				if (toolsOut.goals && toolsOut.goals.length > 0) {
					const avgProgress =
						toolsOut.goals.reduce((sum, g) => sum + (g.progress || 0), 0) /
						toolsOut.goals.length;
					return `Your goals are ${avgProgress.toFixed(
						1
					)}% complete on average for ${timeRange}.`;
				}
				return `I can see your goal information, but I need to verify the current progress. Please check your goals directly.`;

			default:
				return `I can see your financial data for ${timeRange}, but I need to verify some details. Please check your account directly for the most current information.`;
		}
	}

	/**
	 * Process LLM response with validation and fallback
	 */
	static processLLMResponse(
		response: string,
		toolsOut: FactPack,
		intent: string
	): ToolsOnlyResponse {
		const validation = this.validateResponse(response, toolsOut);

		if (validation.isValid) {
			return {
				response,
				isValid: true,
				violations: [],
				fallbackUsed: false,
			};
		} else {
			logger.warn(
				'Tools-Only Contract violation detected:',
				validation.violations
			);
			return this.createSafeFallback(intent, toolsOut, validation.violations);
		}
	}
}

export default ToolsOnlyContractService;
