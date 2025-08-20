import { ApiService } from '../core/apiService';

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
			const response = await ApiService.post<{ patterns: RecurringPattern[] }>(
				'/recurring-expenses/detect',
				{}
			);

			if (response.success && response.data) {
				return response.data.patterns || [];
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
			console.log('[RecurringExpenseService] Fetching recurring expenses...');
			const response = await ApiService.get<{
				recurringExpenses: RecurringExpense[];
			}>('/recurring-expenses');
			console.log('[RecurringExpenseService] API response:', response);

			if (response.success && response.data) {
				console.log(
					'[RecurringExpenseService] Returning expenses:',
					response.data.recurringExpenses
				);
				return response.data.recurringExpenses || [];
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
			const response = await ApiService.get<{
				alerts: RecurringExpenseAlert[];
			}>('/recurring-expenses/upcoming');

			if (response.success && response.data) {
				return response.data.alerts || [];
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
	 * Create a new recurring expense manually
	 */
	static async createRecurringExpense(data: {
		vendor: string;
		amount: number;
		frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
		nextExpectedDate: string;
	}): Promise<RecurringExpense> {
		try {
			const response = await ApiService.post<{
				recurringExpense: RecurringExpense;
			}>('/recurring-expenses', data);

			if (response.success && response.data) {
				return response.data.recurringExpense;
			}

			throw new Error(response.error || 'Failed to create recurring expense');
		} catch (error) {
			console.error(
				'[RecurringExpenseService] Error creating recurring expense:',
				error
			);
			throw error;
		}
	}

	/**
	 * Manually trigger recurring expense processing
	 */
	static async processRecurringExpenses(): Promise<{
		success: boolean;
		message: string;
		processedCount: number;
	}> {
		try {
			const response = await ApiService.post<{
				message: string;
				processedCount: number;
			}>('/recurring-expenses/process', {});

			if (response.success && response.data) {
				return {
					success: true,
					message: response.data.message,
					processedCount: response.data.processedCount,
				};
			}

			throw new Error(response.error || 'Failed to process recurring expenses');
		} catch (error) {
			console.error(
				'[RecurringExpenseService] Error processing recurring expenses:',
				error
			);
			throw error;
		}
	}

	/**
	 * Clean up duplicate manual recurring expenses
	 */
	static async cleanupDuplicateExpenses(): Promise<{
		success: boolean;
		message: string;
		removedCount: number;
	}> {
		try {
			const response = await ApiService.post<{
				message: string;
				removedCount: number;
			}>('/recurring-expenses/cleanup', {});

			if (response.success && response.data) {
				return {
					success: true,
					message: response.data.message,
					removedCount: response.data.removedCount,
				};
			}

			throw new Error(
				response.error || 'Failed to clean up duplicate expenses'
			);
		} catch (error) {
			console.error(
				'[RecurringExpenseService] Error cleaning up duplicate expenses:',
				error
			);
			throw error;
		}
	}

	/**
	 * Mark a recurring expense as paid for a specific period
	 */
	static async markRecurringExpensePaid(data: {
		patternId: string;
		periodStart: string;
		periodEnd: string;
		paymentMethod?: string;
		notes?: string;
	}): Promise<{
		success: boolean;
		payment: any;
		message: string;
	}> {
		try {
			const response = await ApiService.post<{
				payment: any;
				message: string;
			}>('/recurring-expenses/pay', data);

			if (response.success && response.data) {
				return {
					success: true,
					payment: response.data.payment,
					message: response.data.message,
				};
			}

			throw new Error(
				response.error || 'Failed to mark recurring expense as paid'
			);
		} catch (error) {
			console.error(
				'[RecurringExpenseService] Error marking recurring expense as paid:',
				error
			);
			throw error;
		}
	}

	/**
	 * Get payment history for a recurring expense
	 */
	static async getPaymentHistory(
		patternId: string,
		limit: number = 10
	): Promise<any[]> {
		try {
			const response = await ApiService.get<{
				payments: any[];
			}>(`/recurring-expenses/${patternId}/payments?limit=${limit}`);

			if (response.success && response.data) {
				return response.data.payments || [];
			}

			return [];
		} catch (error) {
			console.error(
				'[RecurringExpenseService] Error getting payment history:',
				error
			);
			return [];
		}
	}

	/**
	 * Check if current period is paid for a recurring expense
	 */
	static async isCurrentPeriodPaid(patternId: string): Promise<{
		isPaid: boolean;
		payment: any | null;
	}> {
		try {
			console.log(
				`[RecurringExpenseService] Checking if current period is paid for ${patternId}`
			);
			const response = await ApiService.get<{
				isPaid: boolean;
				payment: any | null;
			}>(`/recurring-expenses/${patternId}/paid`);

			console.log(
				`[RecurringExpenseService] Response for ${patternId}:`,
				response
			);

			if (response.success && response.data) {
				return {
					isPaid: response.data.isPaid,
					payment: response.data.payment,
				};
			}

			return { isPaid: false, payment: null };
		} catch (error) {
			console.error(
				'[RecurringExpenseService] Error checking current period paid:',
				error
			);
			return { isPaid: false, payment: null };
		}
	}

	/**
	 * Generate recurring transactions for a recurring expense
	 */
	static async generateRecurringTransactions(data: {
		patternId: string;
		cycles?: number;
	}): Promise<{
		success: boolean;
		transactions: any[];
		message: string;
	}> {
		try {
			const response = await ApiService.post<{
				transactions: any[];
				message: string;
			}>('/recurring-expenses/generate-transactions', data);

			if (response.success && response.data) {
				return {
					success: true,
					transactions: response.data.transactions,
					message: response.data.message,
				};
			}

			throw new Error(
				response.error || 'Failed to generate recurring transactions'
			);
		} catch (error) {
			console.error(
				'[RecurringExpenseService] Error generating recurring transactions:',
				error
			);
			throw error;
		}
	}

	/**
	 * Link a transaction to a recurring expense
	 */
	static async linkTransactionToRecurring(data: {
		transactionId: string;
		patternId: string;
	}): Promise<{
		success: boolean;
		linkedTransaction: any;
		message: string;
	}> {
		try {
			const response = await ApiService.post<{
				linkedTransaction: any;
				message: string;
			}>('/recurring-expenses/link-transaction', data);

			if (response.success && response.data) {
				return {
					success: true,
					linkedTransaction: response.data.linkedTransaction,
					message: response.data.message,
				};
			}

			throw new Error(response.error || 'Failed to link transaction');
		} catch (error) {
			console.error(
				'[RecurringExpenseService] Error linking transaction:',
				error
			);
			throw error;
		}
	}

	/**
	 * Get pending recurring transactions
	 */
	static async getPendingRecurringTransactions(
		limit: number = 50
	): Promise<any[]> {
		try {
			const response = await ApiService.get<{
				transactions: any[];
			}>(`/recurring-expenses/pending-transactions?limit=${limit}`);

			if (response.success && response.data) {
				return response.data.transactions || [];
			}

			return [];
		} catch (error) {
			console.error(
				'[RecurringExpenseService] Error getting pending recurring transactions:',
				error
			);
			return [];
		}
	}

	/**
	 * Get recurring transactions for a specific pattern
	 */
	static async getRecurringTransactionsForPattern(
		patternId: string,
		limit: number = 20
	): Promise<any[]> {
		try {
			const response = await ApiService.get<{
				transactions: any[];
			}>(`/recurring-expenses/${patternId}/transactions?limit=${limit}`);

			if (response.success && response.data) {
				return response.data.transactions || [];
			}

			return [];
		} catch (error) {
			console.error(
				'[RecurringExpenseService] Error getting recurring transactions:',
				error
			);
			return [];
		}
	}

	/**
	 * Auto-apply transactions to recurring expenses
	 */
	static async autoApplyTransactions(): Promise<{
		success: boolean;
		appliedCount: number;
		message: string;
	}> {
		try {
			const response = await ApiService.post<{
				appliedCount: number;
				message: string;
			}>('/recurring-expenses/auto-apply', {});

			if (response.success && response.data) {
				return {
					success: true,
					appliedCount: response.data.appliedCount,
					message: response.data.message,
				};
			}

			throw new Error(response.error || 'Failed to auto-apply transactions');
		} catch (error) {
			console.error(
				'[RecurringExpenseService] Error auto-applying transactions:',
				error
			);
			throw error;
		}
	}
}
