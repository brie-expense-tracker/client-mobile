import { ApiService } from './apiService';

export interface RecurringPattern {
	patternId: string;
	vendor: string;
	amount: number;
	frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
	confidence: number;
	nextExpectedDate: string;
	lastTransaction: any;
	transactionCount: number;
}

export interface RecurringExpense {
	patternId: string;
	vendor: string;
	amount: number;
	frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
	confidence: number;
	nextExpectedDate: string;
	transactions: any[];
}

export interface RecurringExpenseAlert {
	patternId: string;
	vendor: string;
	amount: number;
	daysUntilDue: number;
	notificationId: string;
}

export class RecurringExpenseService {
	/**
	 * Detect recurring patterns for the current user
	 */
	static async detectRecurringPatterns(): Promise<RecurringPattern[]> {
		try {
			const response = await ApiService.post('/recurring-expenses/detect');

			if (response.success) {
				return response.patterns || [];
			}

			return [];
		} catch (error) {
			console.error(
				'[RecurringExpenseService] Error detecting patterns:',
				error
			);
			return [];
		}
	}

	/**
	 * Get all recurring expenses for the current user
	 */
	static async getRecurringExpenses(): Promise<RecurringExpense[]> {
		try {
			const response = await ApiService.get('/recurring-expenses');

			if (response.success) {
				return response.recurringExpenses || [];
			}

			return [];
		} catch (error) {
			console.error(
				'[RecurringExpenseService] Error getting recurring expenses:',
				error
			);
			return [];
		}
	}

	/**
	 * Check for upcoming recurring expenses
	 */
	static async checkUpcomingRecurringExpenses(): Promise<
		RecurringExpenseAlert[]
	> {
		try {
			const response = await ApiService.get('/recurring-expenses/upcoming');

			if (response.success) {
				return response.alerts || [];
			}

			return [];
		} catch (error) {
			console.error(
				'[RecurringExpenseService] Error checking upcoming expenses:',
				error
			);
			return [];
		}
	}

	/**
	 * Format frequency for display
	 */
	static formatFrequency(frequency: string): string {
		switch (frequency) {
			case 'weekly':
				return 'Weekly';
			case 'monthly':
				return 'Monthly';
			case 'quarterly':
				return 'Quarterly';
			case 'yearly':
				return 'Yearly';
			default:
				return frequency;
		}
	}

	/**
	 * Get days until next occurrence
	 */
	static getDaysUntilNext(nextExpectedDate: string): number {
		const next = new Date(nextExpectedDate);
		const now = new Date();
		const diffTime = next.getTime() - now.getTime();
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	}

	/**
	 * Get status color for recurring expense
	 */
	static getStatusColor(daysUntilDue: number): string {
		if (daysUntilDue <= 0) {
			return '#f44336'; // Red - overdue
		} else if (daysUntilDue <= 3) {
			return '#ff9800'; // Orange - due soon
		} else if (daysUntilDue <= 7) {
			return '#2196f3'; // Blue - due this week
		} else {
			return '#4caf50'; // Green - not due soon
		}
	}

	/**
	 * Get status text for recurring expense
	 */
	static getStatusText(daysUntilDue: number): string {
		if (daysUntilDue <= 0) {
			return 'Overdue';
		} else if (daysUntilDue === 1) {
			return 'Due tomorrow';
		} else if (daysUntilDue <= 3) {
			return `Due in ${daysUntilDue} days`;
		} else if (daysUntilDue <= 7) {
			return `Due this week`;
		} else {
			return `Due in ${daysUntilDue} days`;
		}
	}

	/**
	 * Format confidence as percentage
	 */
	static formatConfidence(confidence: number): string {
		return `${Math.round(confidence * 100)}%`;
	}
}
