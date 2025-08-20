import { ApiService } from '../core/apiService';
import { Budget } from '../../context/budgetContext';

export interface BudgetSuggestion {
	id: string;
	name: string;
	icon?: string;
	color?: string;
	score: number;
}

export class BudgetSuggestionService {
	/**
	 * Get budget suggestions based on transaction description
	 * @param description - The transaction description
	 * @returns Promise<Budget[]> - Array of suggested budgets
	 */
	static async getBudgetSuggestions(description: string): Promise<Budget[]> {
		try {
			if (!description || description.trim().length === 0) {
				return [];
			}

			const response = await ApiService.get<Budget[]>(
				`/transactions/budget-suggestions?description=${encodeURIComponent(
					description.trim()
				)}`
			);

			if (response.success && response.data) {
				return response.data;
			}

			console.error('Failed to get budget suggestions:', response.error);
			return [];
		} catch (error) {
			console.error('Error getting budget suggestions:', error);
			return [];
		}
	}

	/**
	 * Find the best matching budget for a transaction description
	 * @param description - The transaction description
	 * @param availableBudgets - Array of available budgets
	 * @returns Budget | null - The best matching budget or null
	 */
	static findBestMatch(
		description: string,
		availableBudgets: Budget[]
	): Budget | null {
		if (!description || !availableBudgets || availableBudgets.length === 0) {
			return null;
		}

		const normalizedDescription = description.toLowerCase().trim();

		// First, try exact match
		let bestMatch = availableBudgets.find(
			(budget) => budget.name.toLowerCase().trim() === normalizedDescription
		);

		if (bestMatch) {
			return bestMatch;
		}

		// Then, try partial matches
		bestMatch = availableBudgets.find((budget) =>
			normalizedDescription.includes(budget.name.toLowerCase().trim())
		);

		if (bestMatch) {
			return bestMatch;
		}

		// Finally, try reverse partial matches
		bestMatch = availableBudgets.find((budget) =>
			budget.name.toLowerCase().trim().includes(normalizedDescription)
		);

		return bestMatch || null;
	}
}
