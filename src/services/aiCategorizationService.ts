import { ApiService } from './apiService';

export interface CategorizationSuggestion {
	type: 'ai' | 'historical' | 'vendor_pattern';
	category: string;
	confidence: number;
	reason: string;
	budget?: any;
}

export interface CategorizationResult {
	vendor: string;
	aiSuggestion: {
		suggestedCategory: string;
		confidence: number;
		reason: string;
	};
	bestBudget: any;
	confidence: number;
}

export interface AutoCategorizationResult {
	success: boolean;
	categorization: CategorizationResult;
	suggestedBudget: any;
	error?: string;
}

export class AICategorizationService {
	/**
	 * Auto-categorize a transaction
	 */
	static async autoCategorizeTransaction(
		transactionId: string
	): Promise<AutoCategorizationResult> {
		try {
			const response = await ApiService.post(
				`/ai-categorization/auto-categorize/${transactionId}`
			);

			return {
				success: response.success,
				categorization: response.categorization,
				suggestedBudget: response.suggestedBudget,
				error: response.error,
			};
		} catch (error) {
			console.error(
				'[AICategorizationService] Error auto-categorizing transaction:',
				error
			);
			return {
				success: false,
				categorization: null,
				suggestedBudget: null,
				error: 'Failed to auto-categorize transaction',
			};
		}
	}

	/**
	 * Get categorization suggestions for a transaction
	 */
	static async getCategorizationSuggestions(
		transactionId: string
	): Promise<CategorizationSuggestion[]> {
		try {
			const response = await ApiService.get(
				`/ai-categorization/suggestions/${transactionId}`
			);

			if (response.success) {
				return response.suggestions || [];
			}

			return [];
		} catch (error) {
			console.error(
				'[AICategorizationService] Error getting categorization suggestions:',
				error
			);
			return [];
		}
	}

	/**
	 * Learn from user correction
	 */
	static async learnFromUserCorrection(
		transactionId: string,
		userSelectedCategory: string
	): Promise<{
		success: boolean;
		message?: string;
		error?: string;
	}> {
		try {
			const response = await ApiService.post(
				`/ai-categorization/learn/${transactionId}`,
				{
					userSelectedCategory,
				}
			);

			return {
				success: response.success,
				message: response.message,
				error: response.error,
			};
		} catch (error) {
			console.error(
				'[AICategorizationService] Error learning from user correction:',
				error
			);
			return {
				success: false,
				error: 'Failed to learn from user correction',
			};
		}
	}

	/**
	 * Categorize a new transaction
	 */
	static async categorizeNewTransaction(
		description: string,
		amount: number,
		type: 'income' | 'expense'
	): Promise<CategorizationResult> {
		try {
			const response = await ApiService.post('/ai-categorization/categorize', {
				description,
				amount,
				type,
			});

			if (response.success) {
				return response.categorization;
			}

			return null;
		} catch (error) {
			console.error(
				'[AICategorizationService] Error categorizing new transaction:',
				error
			);
			return null;
		}
	}

	/**
	 * Format confidence for display
	 */
	static formatConfidence(confidence: number): string {
		return `${(confidence * 100).toFixed(0)}%`;
	}

	/**
	 * Get confidence color
	 */
	static getConfidenceColor(confidence: number): string {
		if (confidence >= 0.8) {
			return '#4caf50'; // Green - high confidence
		} else if (confidence >= 0.6) {
			return '#ff9800'; // Orange - medium confidence
		} else {
			return '#f44336'; // Red - low confidence
		}
	}

	/**
	 * Get suggestion type icon
	 */
	static getSuggestionTypeIcon(type: string): string {
		switch (type) {
			case 'ai':
				return 'brain';
			case 'historical':
				return 'time';
			case 'vendor_pattern':
				return 'storefront';
			default:
				return 'help';
		}
	}

	/**
	 * Get suggestion type color
	 */
	static getSuggestionTypeColor(type: string): string {
		switch (type) {
			case 'ai':
				return '#2196f3'; // Blue
			case 'historical':
				return '#4caf50'; // Green
			case 'vendor_pattern':
				return '#ff9800'; // Orange
			default:
				return '#757575'; // Gray
		}
	}

	/**
	 * Format suggestion type for display
	 */
	static formatSuggestionType(type: string): string {
		switch (type) {
			case 'ai':
				return 'AI Suggestion';
			case 'historical':
				return 'Based on History';
			case 'vendor_pattern':
				return 'Vendor Pattern';
			default:
				return type;
		}
	}
}
