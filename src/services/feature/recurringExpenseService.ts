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
	// Cache for payment status checks to prevent duplicate API calls
	private static paymentStatusCache = new Map<
		string,
		{ result: boolean | null; timestamp: number }
	>();
	private static CACHE_DURATION = 30000; // 30 seconds

	/**
	 * Detect recurring patterns for the current user
	 */
	static async detectRecurringPatterns(): Promise<RecurringPattern[]> {
		try {
			const response = await ApiService.post<{ patterns: RecurringPattern[] }>(
				'/api/recurring-expenses/detect',
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
			console.log('🔄 Fetching recurring expenses...');
			const response = await ApiService.get<{
				recurringExpenses: RecurringExpense[];
			}>('/api/recurring-expenses');

			if (response.success && response.data) {
				const expenses = response.data.recurringExpenses || [];
				console.log(`✅ Found ${expenses.length} recurring expenses`);
				return expenses;
			}

			return [];
		} catch (error) {
			console.error('❌ Error getting recurring expenses:', error);
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
			}>('/api/recurring-expenses/upcoming');

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
			}>('/api/recurring-expenses', data);

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
			}>('/api/recurring-expenses/process', {});

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
			}>('/api/recurring-expenses/cleanup', {});

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
			}>('/api/recurring-expenses/pay', data);

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
			}>(`/api/recurring-expenses/${patternId}/payments?limit=${limit}`);

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
	 * Check if a recurring expense is paid for the current period
	 */
	static async checkIfCurrentPeriodPaid(
		patternId: string
	): Promise<boolean | null> {
		try {
			// Check cache first
			const cached = this.paymentStatusCache.get(patternId);
			if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
				console.log(`🔍 Using cached payment status for ${patternId}`);
				return cached.result;
			}

			console.log(`🔍 Checking payment status for ${patternId}`);
			const response = await ApiService.get<{ isPaid: boolean | null }>(
				`/api/recurring-expenses/${patternId}/paid`
			);

			if (response.success && response.data) {
				const isPaid = response.data.isPaid;
				console.log(
					`💰 ${patternId}: ${
						isPaid === null ? 'Unknown' : isPaid ? 'Paid' : 'Unpaid'
					}`
				);

				// Cache the result
				this.paymentStatusCache.set(patternId, {
					result: isPaid,
					timestamp: Date.now(),
				});

				return isPaid;
			}

			return null;
		} catch (error) {
			console.error(
				`❌ Error checking payment status for ${patternId}:`,
				error
			);
			return null;
		}
	}

	/**
	 * Check paid status for multiple recurring expenses in a single request
	 */
	static async checkBatchPaidStatus(
		patternIds: string[]
	): Promise<Record<string, boolean | null>> {
		try {
			if (patternIds.length === 0) return {};

			// Check cache for all IDs first
			const uncachedIds: string[] = [];
			const cachedResults: Record<string, boolean | null> = {};

			for (const patternId of patternIds) {
				const cached = this.paymentStatusCache.get(patternId);
				if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
					cachedResults[patternId] = cached.result;
				} else {
					uncachedIds.push(patternId);
				}
			}

			// If all are cached, return cached results
			if (uncachedIds.length === 0) {
				console.log(
					`🔍 Using cached payment status for all ${patternIds.length} expenses`
				);
				return cachedResults;
			}

			console.log(
				`🔍 Batch checking payment status for ${uncachedIds.length} expenses`
			);
			const response = await ApiService.get<Record<string, boolean | null>>(
				`/api/recurring-expenses/paid/status?ids=${uncachedIds.join(',')}`
			);

			if (response.success && response.data) {
				const batchResults = response.data;

				// Cache the new results
				Object.entries(batchResults).forEach(([patternId, isPaid]) => {
					this.paymentStatusCache.set(patternId, {
						result: isPaid,
						timestamp: Date.now(),
					});
				});

				// Combine cached and new results
				const allResults = { ...cachedResults, ...batchResults };

				console.log(`💰 Batch payment status:`, allResults);
				return allResults;
			}

			// If batch request fails, return cached results only
			return cachedResults;
		} catch (error) {
			console.error('❌ Error checking batch payment status:', error);
			// Return cached results if available
			const cachedResults: Record<string, boolean | null> = {};
			patternIds.forEach((patternId) => {
				const cached = this.paymentStatusCache.get(patternId);
				if (cached) {
					cachedResults[patternId] = cached.result;
				}
			});
			return cachedResults;
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
			}>('/api/recurring-expenses/generate-transactions', data);

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
			}>('/api/recurring-expenses/link-transaction', data);

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
			}>(`/api/recurring-expenses/pending-transactions?limit=${limit}`);

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
			}>(`/api/recurring-expenses/${patternId}/transactions?limit=${limit}`);

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
			}>('/api/recurring-expenses/auto-apply', {});

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

	/**
	 * Check if a recurring expense is paid for the current period
	 */
	static async isCurrentPeriodPaid(patternId: string): Promise<{
		isPaid: boolean;
		payment?: {
			paidAt: string;
			amount: number;
		};
	}> {
		try {
			const response = await ApiService.get<{
				isPaid: boolean;
				payment?: {
					paidAt: string;
					amount: number;
				};
			}>(`/api/recurring-expenses/${patternId}/paid`);

			if (response.success && response.data) {
				return {
					isPaid: response.data.isPaid || false,
					payment: response.data.payment,
				};
			}

			return { isPaid: false };
		} catch (error) {
			console.error(
				'[RecurringExpenseService] Error checking if current period is paid:',
				error
			);
			return { isPaid: false };
		}
	}
}
