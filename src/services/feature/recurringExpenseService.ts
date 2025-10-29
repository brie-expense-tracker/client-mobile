import { ApiService } from '../core/apiService';
import { createLogger } from '../../utils/sublogger';

const recurringExpenseLog = createLogger('RecurringExpenseService');

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
	// Appearance customization
	appearanceMode?: 'custom' | 'brand' | 'default';
	icon?: string;
	color?: string;
	categories?: string[];
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
			recurringExpenseLog.error(
				'[RecurringExpenseService] Error detecting patterns:',
				error
			);
			return [];
		}
	}

	/**
	 * Get all recurring expenses for the current user
	 */
	static async getRecurringExpenses(opts?: {
		signal?: AbortSignal;
	}): Promise<RecurringExpense[]> {
		try {
			recurringExpenseLog.debug('Fetching recurring expenses');
			const response = await ApiService.get<{
				recurringExpenses: RecurringExpense[];
			}>('/api/recurring-expenses', { signal: opts?.signal });

			if (response.success && response.data) {
				const expenses = response.data.recurringExpenses || [];
				recurringExpenseLog.info(`Found ${expenses.length} recurring expenses`);
				return expenses;
			}

			return [];
		} catch (error) {
			recurringExpenseLog.error('❌ Error getting recurring expenses:', error);
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
			recurringExpenseLog.error(
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
		appearanceMode?: 'custom' | 'brand' | 'default';
		icon?: string;
		color?: string;
		categories?: string[];
	}): Promise<RecurringExpense> {
		try {
			const response = await ApiService.post<{
				recurringExpense?: RecurringExpense;
			}>('/api/recurring-expenses', data);

			// Check for recurringExpense in data first, then at top level
			const recurringExpense =
				response.data?.recurringExpense ||
				(response as any).recurringExpense ||
				((response as any).data as RecurringExpense);

			if (response.success && recurringExpense) {
				recurringExpenseLog.info('Server returned created item', {
					patternId:
						recurringExpense.patternId ||
						(recurringExpense as any).id ||
						(recurringExpense as any)._id,
				});

				// WORKAROUND: Backend might not return appearance fields immediately after deploy
				// Merge them from the request data if missing from response
				if (!recurringExpense.appearanceMode && data.appearanceMode) {
					recurringExpenseLog.warn(
						'⚠️ [RecurringExpenseService] Backend did not return appearanceMode on create, using request data:',
						data.appearanceMode
					);
					recurringExpense.appearanceMode = data.appearanceMode;
				}
				if (!recurringExpense.icon && data.icon) {
					recurringExpenseLog.warn(
						'⚠️ [RecurringExpenseService] Backend did not return icon field on create, using request data:',
						data.icon
					);
					recurringExpense.icon = data.icon;
				}
				if (!recurringExpense.color && data.color) {
					recurringExpenseLog.warn(
						'⚠️ [RecurringExpenseService] Backend did not return color field on create, using request data:',
						data.color
					);
					recurringExpense.color = data.color;
				}
				if (!recurringExpense.categories && data.categories) {
					recurringExpenseLog.warn(
						'⚠️ [RecurringExpenseService] Backend did not return categories field on create, using request data:',
						data.categories
					);
					recurringExpense.categories = data.categories;
				}

				return recurringExpense;
			}

			// Fallback: server didn't return the created item → refetch & match
			recurringExpenseLog.warn(
				'POST succeeded but no data returned, fetching to resolve ID',
				{
					hasData: !!response.data,
					dataKeys: response.data ? Object.keys(response.data) : [],
					topLevelKeys: Object.keys(response),
				}
			);

			ApiService.clearCacheByPrefix('/api/recurring-expenses');

			// Small delay to allow DB persistence
			await new Promise((resolve) => setTimeout(resolve, 500));

			const all = await this.getRecurringExpenses();
			recurringExpenseLog.debug('Matching created item', {
				vendor: data.vendor,
				amount: data.amount,
				frequency: data.frequency,
				nextExpectedDate: data.nextExpectedDate,
				candidateCount: all.length,
				candidates: all.map((e) => ({
					vendor: e.vendor,
					amount: e.amount,
					frequency: e.frequency,
					date: e.nextExpectedDate?.slice(0, 10),
					id: e.patternId || (e as any).id || (e as any)._id,
				})),
			});

			const created = all.find(
				(e) =>
					e.vendor === data.vendor &&
					Number(e.amount) === Number(data.amount) &&
					e.frequency === data.frequency &&
					// Allow same-day string equality OR near-equality on date
					e.nextExpectedDate?.slice(0, 10) ===
						data.nextExpectedDate.slice(0, 10)
			);

			if (created) {
				const resolvedId =
					created.patternId || (created as any).id || (created as any)._id;
				recurringExpenseLog.info('Resolved created item', { resolvedId });
				return created;
			}

			recurringExpenseLog.error(
				'❌ [RecurringExpenseService] No match found!',
				{
					searchCriteria: data,
					fetchedCount: all.length,
				}
			);
			throw new Error(
				response.error ||
					'Created, but could not resolve new recurring expense ID'
			);
		} catch (error) {
			recurringExpenseLog.error(
				'[RecurringExpenseService] Error creating recurring expense:',
				error
			);
			throw error;
		}
	}

	/**
	 * Update an existing recurring expense
	 */
	static async updateRecurringExpense(
		patternId: string,
		data: {
			vendor?: string;
			amount?: number;
			frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
			nextExpectedDate?: string;
			appearanceMode?: 'custom' | 'brand' | 'default';
			icon?: string;
			color?: string;
			categories?: string[];
		}
	): Promise<RecurringExpense> {
		try {
			const response = await ApiService.put<{
				data?: RecurringExpense;
				recurringExpense?: RecurringExpense;
			}>(`/api/recurring-expenses/${encodeURIComponent(patternId)}`, data);

			recurringExpenseLog.debug(
				'📝 [RecurringExpenseService] Update response:',
				JSON.stringify(response, null, 2)
			);

			if (response.success && response.data) {
				// Backend returns expense in response.data.data (nested)
				const updatedExpense =
					response.data.data || response.data.recurringExpense;

				if (!updatedExpense) {
					recurringExpenseLog.error(
						'⚠️ [RecurringExpenseService] No expense found in response:',
						response
					);
					throw new Error('Server returned success but no expense data');
				}

				recurringExpenseLog.debug(
					'✅ [RecurringExpenseService] Extracted expense:',
					updatedExpense
				);

				// WORKAROUND: Backend might not return appearance fields immediately after deploy
				// Merge them from the request data if missing from response
				if (!updatedExpense.appearanceMode && data.appearanceMode) {
					recurringExpenseLog.warn(
						'⚠️ [RecurringExpenseService] Backend did not return appearanceMode, using request data:',
						data.appearanceMode
					);
					updatedExpense.appearanceMode = data.appearanceMode;
				}
				if (!updatedExpense.icon && data.icon) {
					recurringExpenseLog.warn(
						'⚠️ [RecurringExpenseService] Backend did not return icon field, using request data:',
						data.icon
					);
					updatedExpense.icon = data.icon;
				}
				if (!updatedExpense.color && data.color) {
					recurringExpenseLog.warn(
						'⚠️ [RecurringExpenseService] Backend did not return color field, using request data:',
						data.color
					);
					updatedExpense.color = data.color;
				}
				if (!updatedExpense.categories && data.categories) {
					recurringExpenseLog.warn(
						'⚠️ [RecurringExpenseService] Backend did not return categories field, using request data:',
						data.categories
					);
					updatedExpense.categories = data.categories;
				}

				recurringExpenseLog.debug(
					'✅ [RecurringExpenseService] Final merged expense:',
					updatedExpense
				);

				return updatedExpense;
			}

			// Preserve HTTP status for error handling (especially 404 detection)
			const error: any = new Error(
				response.error || 'Failed to update recurring expense'
			);
			if ('status' in response) {
				error.status = response.status;
			}
			error.response = response;
			throw error;
		} catch (error: any) {
			recurringExpenseLog.error(
				'[RecurringExpenseService] Error updating recurring expense:',
				error
			);
			// Re-throw with status preserved
			if (!error.status && error.response) {
				error.status = error.response.status;
			}
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
			recurringExpenseLog.error(
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
			recurringExpenseLog.error(
				'[RecurringExpenseService] Error cleaning up duplicate expenses:',
				error
			);
			throw error;
		}
	}

	/**
	 * Delete a recurring expense
	 */
	static async deleteRecurringExpense(patternId: string): Promise<{
		success: boolean;
		message: string;
	}> {
		try {
			const response = await ApiService.delete<{ message: string }>(
				`/api/recurring-expenses/${encodeURIComponent(patternId)}`
			);

			if (response.success && response.data) {
				return {
					success: true,
					message:
						response.data.message || 'Recurring expense deleted successfully',
				};
			}

			throw new Error(response.error || 'Failed to delete recurring expense');
		} catch (error) {
			recurringExpenseLog.error(
				'[RecurringExpenseService] Error deleting recurring expense:',
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
			recurringExpenseLog.error(
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
			recurringExpenseLog.error(
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
				recurringExpenseLog.debug(
					`🔍 Using cached payment status for ${patternId}`
				);
				return cached.result;
			}

			recurringExpenseLog.debug(`🔍 Checking payment status for ${patternId}`);
			const response = await ApiService.get<{ isPaid: boolean | null }>(
				`/api/recurring-expenses/${patternId}/paid`
			);

			if (response.success && response.data) {
				const isPaid = response.data.isPaid;
				recurringExpenseLog.debug(
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
			recurringExpenseLog.error(
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
				recurringExpenseLog.debug(
					`Using cached payment status for all ${patternIds.length} expenses`
				);
				return cachedResults;
			}

			recurringExpenseLog.debug(
				`Batch checking payment status for ${uncachedIds.length} expenses`
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

				recurringExpenseLog.debug('Batch payment status', allResults);
				return allResults;
			}

			// If batch request fails, return cached results only
			return cachedResults;
		} catch (error) {
			recurringExpenseLog.error('Error checking batch payment status', error);
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
			recurringExpenseLog.error(
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
			recurringExpenseLog.error(
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
			recurringExpenseLog.error(
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
			recurringExpenseLog.error(
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
			recurringExpenseLog.error(
				'[RecurringExpenseService] Error auto-applying transactions:',
				error
			);
			throw error;
		}
	}
}
