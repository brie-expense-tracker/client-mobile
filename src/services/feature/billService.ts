import { ApiService } from '../core/apiService';
import { createLogger } from '../../utils/sublogger';

const billServiceLog = createLogger('BillService');

export interface BillPattern {
	patternId: string;
	vendor: string;
	amount: number;
	frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
	confidence: number;
	nextExpectedDate: string;
	lastTransaction: any;
	transactionCount: number;
}

export interface Bill {
	patternId: string;
	vendor: string;
	amount: number;
	frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
	confidence: number;
	nextExpectedDate: string;
	autoPay?: boolean; // Whether this bill is set to auto-pay (default: false)
	transactions: any[];
	// Appearance customization
	appearanceMode?: 'custom' | 'brand' | 'default';
	icon?: string;
	color?: string;
	categories?: string[];
}

export interface BillAlert {
	patternId: string;
	vendor: string;
	amount: number;
	daysUntilDue: number;
	notificationId: string;
}

export class BillService {
	// Cache for payment status checks to prevent duplicate API calls
	private static paymentStatusCache = new Map<
		string,
		{ result: boolean | null; timestamp: number }
	>();
	private static CACHE_DURATION = 30000; // 30 seconds

	/**
	 * Detect recurring patterns for the current user
	 */
	static async detectRecurringPatterns(): Promise<BillPattern[]> {
		try {
			const response = await ApiService.post<{ patterns: BillPattern[] }>(
				'/api/recurring-expenses/detect',
				{}
			);

			if (response.success && response.data) {
				return response.data.patterns || [];
			}

			return [];
		} catch (error) {
			billServiceLog.error('[BillService] Error detecting patterns:', error);
			return [];
		}
	}

	/**
	 * Get all recurring expenses for the current user
	 */
	static async getRecurringExpenses(opts?: {
		signal?: AbortSignal;
		useCache?: boolean;
	}): Promise<Bill[]> {
		try {
			billServiceLog.debug('Fetching bills', {
				useCache: opts?.useCache !== false,
			});
			const response = await ApiService.get<{
				success: boolean;
				bills: Bill[];
				count: number;
			}>('/api/recurring-expenses', {
				signal: opts?.signal,
				useCache: opts?.useCache,
			});

			billServiceLog.debug('GET bills response', {
				success: response.success,
				hasData: !!response.data,
				dataKeys: response.data ? Object.keys(response.data) : [],
				dataType: typeof response.data,
				rawData: JSON.stringify(response.data).substring(0, 500),
			});

			if (response.success && response.data) {
				// Server returns: { success: true, bills: [...], count: ... }
				// RequestManager returns raw JSON, ApiService.get wraps as: { success: true, data: <raw JSON> }
				// So response.data = { success: true, bills: [...], count: ... }
				const serverResponse = response.data as any;

				// Try multiple paths to find bills array
				let expenses =
					serverResponse.bills ||
					serverResponse.data?.bills ||
					(response.data as any)?.data?.bills ||
					[];

				// If serverResponse itself is an array, use it
				if (Array.isArray(serverResponse) && expenses.length === 0) {
					expenses = serverResponse;
				}

				billServiceLog.info(`Found ${expenses.length} bills`, {
					billsCount: expenses.length,
					serverHasBills: !!serverResponse.bills,
					serverBillsCount: serverResponse.bills?.length || 0,
					serverResponseKeys: serverResponse ? Object.keys(serverResponse) : [],
					serverResponseType: Array.isArray(serverResponse)
						? 'array'
						: typeof serverResponse,
				});

				return expenses;
			}

			billServiceLog.warn('No bills found in response', {
				success: response.success,
				hasData: !!response.data,
			});
			return [];
		} catch (error) {
			billServiceLog.error('❌ Error getting bills:', error);
			return [];
		}
	}

	/**
	 * Check for upcoming recurring expenses
	 */
	static async checkUpcomingRecurringExpenses(): Promise<BillAlert[]> {
		try {
			const response = await ApiService.get<{
				alerts: BillAlert[];
			}>('/api/recurring-expenses/upcoming');

			if (response.success && response.data) {
				return response.data.alerts || [];
			}

			return [];
		} catch (error) {
			billServiceLog.error(
				'[BillService] Error checking upcoming expenses:',
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
		// Parse date-only string (YYYY-MM-DD) as local date to avoid timezone issues
		const datePart = nextExpectedDate.slice(0, 10);
		if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
			const [year, month, day] = datePart.split('-').map(Number);
			const next = new Date(year, month - 1, day); // month is 0-indexed
			const now = new Date();
			// Set now to start of day for accurate day comparison
			const nowStartOfDay = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate()
			);
			const nextStartOfDay = new Date(
				next.getFullYear(),
				next.getMonth(),
				next.getDate()
			);
			const diffTime = nextStartOfDay.getTime() - nowStartOfDay.getTime();
			return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		}
		// Fallback for ISO strings with time
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
		autoPay?: boolean; // Default to false (manual payment)
		appearanceMode?: 'custom' | 'brand' | 'default';
		icon?: string;
		color?: string;
		category?: string; // Single category that will be applied to each generated transaction
	}): Promise<Bill> {
		try {
			// Convert single category to categories array for server
			const requestData = {
				...data,
				categories: data.category ? [data.category] : undefined,
			};
			// Remove category from request since server expects categories
			delete (requestData as any).category;

			billServiceLog.debug('Creating recurring expense', {
				vendor: requestData.vendor,
				amount: requestData.amount,
				frequency: requestData.frequency,
				hasCategories: !!requestData.categories,
			});

			const response = await ApiService.post<{
				bill?: Bill;
			}>('/api/recurring-expenses', requestData);

			// Log the full response structure for debugging
			// Always use fallback refetch since server response doesn't reliably include bill
			// The server returns 201 (created) but the bill object is often missing from response
			billServiceLog.debug('POST response received', {
				success: response.success,
				status: 201,
				hasData: !!response.data,
				dataKeys: response.data ? Object.keys(response.data) : [],
			});

			// Since server response is unreliable, always refetch after creation
			billServiceLog.debug(
				'Bill creation succeeded, refetching to get the created bill'
			);

			// Clear cache and refetch to get the created bill
			ApiService.clearCacheByPrefix('/api/recurring-expenses');

			// Retry logic: try multiple times with increasing delays
			let all: Bill[] = [];
			let created: Bill | undefined;
			const maxRetries = 3;

			for (let attempt = 0; attempt < maxRetries; attempt++) {
				// Increasing delay: 500ms, 1000ms, 2000ms
				const delay = 500 * Math.pow(2, attempt);
				await new Promise((resolve) => setTimeout(resolve, delay));

				// Clear cache and fetch fresh
				ApiService.clearCacheByPrefix('/api/recurring-expenses');
				all = await this.getRecurringExpenses({ useCache: false });

				billServiceLog.debug(`Refetch attempt ${attempt + 1}/${maxRetries}`, {
					vendor: data.vendor,
					amount: data.amount,
					frequency: data.frequency,
					billsFound: all.length,
					candidates: all.map((e) => ({
						vendor: e.vendor,
						amount: e.amount,
						frequency: e.frequency,
						date: e.nextExpectedDate?.slice(0, 10),
						id: e.patternId || (e as any).id || (e as any)._id,
					})),
				});

				// Try to find the created bill
				created = all.find(
					(e) =>
						e.vendor?.toLowerCase().trim() ===
							data.vendor.toLowerCase().trim() &&
						Math.abs(Number(e.amount) - Number(data.amount)) < 0.01 &&
						e.frequency === data.frequency &&
						// Allow same-day string equality
						e.nextExpectedDate?.slice(0, 10) ===
							data.nextExpectedDate.slice(0, 10)
				);

				if (created) {
					const resolvedId =
						created.patternId || (created as any).id || (created as any)._id;
					billServiceLog.info('✅ Found created bill', {
						resolvedId,
						vendor: created.vendor,
						attempt: attempt + 1,
					});
					return created;
				}
			}

			// If we still can't find it after retries, log detailed error
			billServiceLog.error('❌ [BillService] No match found after retries!', {
				searchCriteria: {
					vendor: data.vendor,
					amount: data.amount,
					frequency: data.frequency,
					nextExpectedDate: data.nextExpectedDate,
				},
				fetchedCount: all.length,
				allBills: all.map((e) => ({
					vendor: e.vendor,
					amount: e.amount,
					frequency: e.frequency,
					date: e.nextExpectedDate?.slice(0, 10),
					id: e.patternId || (e as any).id || (e as any)._id,
				})),
			});

			// Don't throw - return a temporary bill object so the UI updates
			// The bill should appear on the next refresh
			billServiceLog.warn(
				'⚠️ Returning temporary bill object - bill will appear on next refresh'
			);
			return {
				patternId: `temp-${Date.now()}`,
				vendor: data.vendor,
				amount: data.amount,
				frequency: data.frequency,
				nextExpectedDate: data.nextExpectedDate,
				confidence: 1.0,
				autoPay: data.autoPay || false,
				transactions: [],
				appearanceMode: data.appearanceMode,
				icon: data.icon,
				color: data.color,
				categories: requestData.categories,
			};
		} catch (error) {
			billServiceLog.error(
				'[BillService] Error creating recurring expense:',
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
	): Promise<Bill> {
		try {
			const response = await ApiService.put<{
				data?: Bill;
				recurringExpense?: Bill;
			}>(`/api/recurring-expenses/${encodeURIComponent(patternId)}`, data);

			billServiceLog.debug(
				'📝 [BillService] Update response:',
				JSON.stringify(response, null, 2)
			);

			if (response.success && response.data) {
				// Backend returns expense in response.data.data (nested)
				const updatedExpense =
					response.data.data || response.data.recurringExpense;

				if (!updatedExpense) {
					billServiceLog.error(
						'⚠️ [BillService] No expense found in response:',
						response
					);
					throw new Error('Server returned success but no expense data');
				}

				billServiceLog.debug(
					'✅ [BillService] Extracted expense:',
					updatedExpense
				);

				// WORKAROUND: Backend might not return appearance fields immediately after deploy
				// Merge them from the request data if missing from response
				if (!updatedExpense.appearanceMode && data.appearanceMode) {
					billServiceLog.warn(
						'⚠️ [BillService] Backend did not return appearanceMode, using request data:',
						data.appearanceMode
					);
					updatedExpense.appearanceMode = data.appearanceMode;
				}
				if (!updatedExpense.icon && data.icon) {
					billServiceLog.warn(
						'⚠️ [BillService] Backend did not return icon field, using request data:',
						data.icon
					);
					updatedExpense.icon = data.icon;
				}
				if (!updatedExpense.color && data.color) {
					billServiceLog.warn(
						'⚠️ [BillService] Backend did not return color field, using request data:',
						data.color
					);
					updatedExpense.color = data.color;
				}
				if (!updatedExpense.categories && data.categories) {
					billServiceLog.warn(
						'⚠️ [BillService] Backend did not return categories field, using request data:',
						data.categories
					);
					updatedExpense.categories = data.categories;
				}

				billServiceLog.debug(
					'✅ [BillService] Final merged expense:',
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
			billServiceLog.error(
				'[BillService] Error updating recurring expense:',
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
			billServiceLog.error(
				'[BillService] Error processing recurring expenses:',
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
			billServiceLog.error(
				'[BillService] Error cleaning up duplicate expenses:',
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
			billServiceLog.error(
				'[BillService] Error deleting recurring expense:',
				error
			);
			throw error;
		}
	}

	/**
	 * Pay a bill for the current period - creates a transaction and advances the period
	 */
	static async payBill(
		patternId: string,
		date?: string
	): Promise<{
		bill: Bill;
		transaction: any;
	}> {
		try {
			const response = await ApiService.post<{
				bill: Bill;
				transaction: any;
			}>(`/api/recurring-expenses/${patternId}/pay`, {
				date, // optional ISO string
			});

			if (response.success && response.data) {
				return response.data;
			}

			// Check if it's an "already paid" case before throwing
			const errorMessage = response.error || 'Failed to pay bill';
			const isAlreadyPaid =
				errorMessage.includes('already been paid') ||
				errorMessage.includes('already paid') ||
				errorMessage.toLowerCase().includes('already paid');

			// Log at appropriate level before throwing - DEBUG for expected "already paid" case
			if (isAlreadyPaid) {
				billServiceLog.debug('[BillService] Bill already paid:', {
					message: errorMessage,
				});
			} else {
				billServiceLog.error('[BillService] Error paying bill:', {
					message: errorMessage,
				});
			}

			// Throw error with message - mark it so we know we already logged
			const err = new Error(errorMessage);
			(err as any)._alreadyLogged = true;
			(err as any)._isAlreadyPaid = isAlreadyPaid;
			throw err;
		} catch (error: any) {
			// If we already logged above (when response.success was false), just re-throw
			// Check for our marker to avoid double logging
			if (error instanceof Error && (error as any)._alreadyLogged) {
				// Error was already logged above, just re-throw
				throw error;
			}

			// This is an unexpected error (network error, etc.) - extract and check message
			const errorMessage =
				error?.message ||
				error?.error ||
				error?.toString?.() ||
				(typeof error === 'string' ? error : 'Failed to pay bill');

			// Check if it's an "already paid" case even for unexpected errors
			const isAlreadyPaid =
				errorMessage.includes('already been paid') ||
				errorMessage.includes('already paid') ||
				errorMessage.toLowerCase().includes('already paid');

			// Log at appropriate level
			if (isAlreadyPaid) {
				billServiceLog.debug(
					'[BillService] Bill already paid (unexpected path):',
					{
						message: errorMessage,
					}
				);
			} else {
				billServiceLog.error('[BillService] Unexpected error paying bill:', {
					message: errorMessage,
					error: error?.error,
					toString: error?.toString?.(),
				});
			}

			throw new Error(errorMessage);
		}
	}

	/**
	 * Mark a recurring expense as paid for a specific period
	 * @deprecated Use payBill instead
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
			billServiceLog.error(
				'[BillService] Error marking recurring expense as paid:',
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
			billServiceLog.error(
				'[BillService] Error getting payment history:',
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
				billServiceLog.debug(`🔍 Using cached payment status for ${patternId}`);
				return cached.result;
			}

			billServiceLog.debug(`🔍 Checking payment status for ${patternId}`);
			const response = await ApiService.get<{ isPaid: boolean | null }>(
				`/api/recurring-expenses/${patternId}/paid`
			);

			if (response.success && response.data) {
				const isPaid = response.data.isPaid;
				billServiceLog.debug(
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
			billServiceLog.error(
				`❌ Error checking payment status for ${patternId}:`,
				error
			);
			return null;
		}
	}

	/**
	 * Clear payment status cache for a specific patternId
	 * Useful when transactions linked to a bill are deleted
	 */
	static clearPaymentStatusCache(patternId: string): void {
		this.paymentStatusCache.delete(patternId);
		billServiceLog.debug(
			`Cleared payment status cache for patternId: ${patternId}`
		);
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
				billServiceLog.debug(
					`Using cached payment status for all ${patternIds.length} expenses`
				);
				return cachedResults;
			}

			billServiceLog.debug(
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

				billServiceLog.debug('Batch payment status', allResults);
				return allResults;
			}

			// If batch request fails, return cached results only
			return cachedResults;
		} catch (error) {
			billServiceLog.error('Error checking batch payment status', error);
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
			billServiceLog.error(
				'[BillService] Error generating recurring transactions:',
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
			billServiceLog.error('[BillService] Error linking transaction:', error);
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
			billServiceLog.error(
				'[BillService] Error getting pending recurring transactions:',
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
			billServiceLog.error(
				'[BillService] Error getting recurring transactions:',
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
			billServiceLog.error(
				'[BillService] Error auto-applying transactions:',
				error
			);
			throw error;
		}
	}
}
