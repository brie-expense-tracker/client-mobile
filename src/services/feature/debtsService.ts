import { ApiService } from '../core/apiService';
import { createLogger } from '../../utils/sublogger';

const debtsLog = createLogger('DebtsService');

export interface Debt {
	_id: string;
	userId: string;
	name: string;
	type: 'creditCard' | 'loan' | 'studentLoan' | 'personal' | 'mortgage' | 'other';
	principal: number;
	interestRate: number; // Annual interest rate as decimal (0.05 = 5%)
	minPayment: number;
	currentBalance: number;
	dueDay?: number; // Day of month payment is due (1-31)
	linkedTransactionPattern?: string; // Merchant/vendor pattern to match transactions
	isActive: boolean;
	isSynthetic: boolean; // If true, this is a synthetic debt created from Profile.totalDebt
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

export interface CreateDebtInput {
	name: string;
	type: 'creditCard' | 'loan' | 'studentLoan' | 'personal' | 'mortgage' | 'other';
	principal: number;
	interestRate: number;
	minPayment: number;
	currentBalance: number;
	dueDay?: number;
	linkedTransactionPattern?: string;
	notes?: string;
}

export interface UpdateDebtInput {
	name?: string;
	type?: 'creditCard' | 'loan' | 'studentLoan' | 'personal' | 'mortgage' | 'other';
	principal?: number;
	interestRate?: number;
	minPayment?: number;
	currentBalance?: number;
	dueDay?: number;
	linkedTransactionPattern?: string;
	notes?: string;
	isActive?: boolean;
}

// Simplified DTO for cleaner screen usage
export interface DebtDTO {
	_id: string;
	name: string;
	currentBalance: number;
	interestRate?: number;
	minPayment?: number;
	dueDayOfMonth?: number;
	activity?: Array<{
		_id?: string;
		date: string;
		amount: number;
		note?: string;
	}>;
	// Include other fields from Debt for compatibility
	type?: Debt['type'];
	principal?: number;
	linkedTransactionPattern?: string;
	isActive?: boolean;
	isSynthetic?: boolean;
	notes?: string;
	createdAt?: string;
	updatedAt?: string;
}

export class DebtsService {
	/**
	 * Get all active debts for the current user
	 */
	static async getDebts(): Promise<Debt[]> {
		try {
			debtsLog.debug('Fetching debts');
			const response = await ApiService.get<{
				success: boolean;
				data: Debt[];
			}>('/api/debts');

			if (response.success && response.data) {
				// Handle both nested and flat response structures
				const apiResponseBody = response.data as any;
				const debts = apiResponseBody?.data || apiResponseBody;
				
				if (Array.isArray(debts)) {
					debtsLog.info(`Found ${debts.length} debts`);
					return debts;
				}
			}

			return [];
		} catch (error) {
			debtsLog.error('Error getting debts:', error);
			return [];
		}
	}

	/**
	 * Get a single debt by ID
	 */
	static async getDebt(debtId: string): Promise<Debt | null> {
		try {
			const response = await ApiService.get<{
				success: boolean;
				data: Debt;
			}>(`/api/debts/${encodeURIComponent(debtId)}`);

			if (response.success && response.data) {
				const apiResponseBody = response.data as any;
				const debt = apiResponseBody?.data || apiResponseBody;
				return debt as Debt;
			}

			return null;
		} catch (error) {
			debtsLog.error(`Error getting debt ${debtId}:`, error);
			return null;
		}
	}

	/**
	 * Create a new debt
	 */
	static async createDebt(data: CreateDebtInput): Promise<Debt> {
		try {
			debtsLog.debug('Creating debt:', data);
			const response = await ApiService.post<{
				success: boolean;
				data: Debt;
			}>('/api/debts', data);

			if (response.success && response.data) {
				const apiResponseBody = response.data as any;
				const debt = apiResponseBody?.data || apiResponseBody;

				if (!debt) {
					throw new Error('Server returned success but no debt data');
				}

				debtsLog.info('Debt created successfully:', debt._id);
				return debt as Debt;
			}

			throw new Error(response.error || 'Failed to create debt');
		} catch (error) {
			debtsLog.error('Error creating debt:', error);
			throw error;
		}
	}

	/**
	 * Update an existing debt
	 */
	static async updateDebt(debtId: string, data: UpdateDebtInput): Promise<Debt> {
		try {
			debtsLog.debug(`Updating debt ${debtId}:`, data);
			const response = await ApiService.put<{
				success: boolean;
				data: Debt;
			}>(`/api/debts/${encodeURIComponent(debtId)}`, data);

			if (response.success && response.data) {
				const apiResponseBody = response.data as any;
				const debt = apiResponseBody?.data || apiResponseBody;

				if (!debt) {
					throw new Error('Server returned success but no debt data');
				}

				debtsLog.info('Debt updated successfully:', debt._id);
				return debt as Debt;
			}

			throw new Error(response.error || 'Failed to update debt');
		} catch (error) {
			debtsLog.error(`Error updating debt ${debtId}:`, error);
			throw error;
		}
	}

	/**
	 * Delete a debt (soft delete by setting isActive to false)
	 */
	static async deleteDebt(debtId: string): Promise<void> {
		try {
			debtsLog.debug(`Deleting debt ${debtId}`);
			const response = await ApiService.delete<{
				success: boolean;
				message?: string;
			}>(`/api/debts/${encodeURIComponent(debtId)}`);

			if (!response.success) {
				throw new Error(response.error || 'Failed to delete debt');
			}

			debtsLog.info('Debt deleted successfully:', debtId);
		} catch (error) {
			debtsLog.error(`Error deleting debt ${debtId}:`, error);
			throw error;
		}
	}

	/**
	 * Calculate total debt from a list of debts
	 */
	static calculateTotalDebt(debts: Debt[]): number {
		return debts.reduce((sum, debt) => sum + (debt.currentBalance || 0), 0);
	}

	/**
	 * Format debt type for display
	 */
	static formatDebtType(type: Debt['type']): string {
		switch (type) {
			case 'creditCard':
				return 'Credit Card';
			case 'studentLoan':
				return 'Student Loan';
			case 'personal':
				return 'Personal Loan';
			case 'mortgage':
				return 'Mortgage';
			case 'loan':
				return 'Loan';
			case 'other':
				return 'Other';
			default:
				return type;
		}
	}

	/**
	 * Format interest rate as percentage
	 * Accepts either decimal (0.20) or percentage (20) format
	 */
	static formatInterestRate(rate: number): string {
		// If rate is > 1, assume it's already a percentage; otherwise it's a decimal
		if (rate > 1) {
			return `${rate.toFixed(2)}%`;
		}
		return `${(rate * 100).toFixed(2)}%`;
	}

	// Simplified wrapper methods for cleaner screen usage
	/**
	 * Get all debts (simplified wrapper)
	 */
	static async list(): Promise<DebtDTO[]> {
		const debts = await this.getDebts();
		return debts.map(this.toDTO);
	}

	/**
	 * Get a debt by ID (simplified wrapper)
	 */
	static async getById(id: string): Promise<DebtDTO> {
		const debt = await this.getDebt(id);
		if (!debt) {
			throw new Error('Debt not found');
		}
		return this.toDTO(debt);
	}

	/**
	 * Create a debt (simplified wrapper)
	 */
	static async create(payload: {
		name: string;
		currentBalance: number;
		interestRate?: number;
		minPayment?: number;
		dueDayOfMonth?: number;
		type?: Debt['type'];
	}): Promise<DebtDTO> {
		// Convert simplified format to full CreateDebtInput
		const createInput: CreateDebtInput = {
			name: payload.name,
			type: payload.type || 'other',
			principal: payload.currentBalance, // Use current balance as principal if not provided
			interestRate: payload.interestRate ? payload.interestRate / 100 : 0, // Convert percentage to decimal
			minPayment: payload.minPayment || 0,
			currentBalance: payload.currentBalance,
			dueDay: payload.dueDayOfMonth,
		};

		const debt = await this.createDebt(createInput);
		return this.toDTO(debt);
	}

	/**
	 * Update a debt (simplified wrapper)
	 */
	static async update(id: string, payload: Partial<DebtDTO>): Promise<DebtDTO> {
		// Convert simplified format to UpdateDebtInput
		const updateInput: UpdateDebtInput = {
			name: payload.name,
			currentBalance: payload.currentBalance,
			dueDay: payload.dueDayOfMonth,
			type: payload.type,
		};

		// Convert interest rate from percentage to decimal if provided
		if (payload.interestRate !== undefined) {
			updateInput.interestRate = payload.interestRate / 100;
		}

		if (payload.minPayment !== undefined) {
			updateInput.minPayment = payload.minPayment;
		}

		// Use PUT for updates (server supports PUT, not PATCH)
		try {
			debtsLog.debug(`Updating debt ${id}:`, updateInput);
			const response = await ApiService.put<{
				success: boolean;
				data: Debt;
			}>(`/api/debts/${encodeURIComponent(id)}`, updateInput);

			if (response.success && response.data) {
				const apiResponseBody = response.data as any;
				const debt = apiResponseBody?.data || apiResponseBody;

				if (!debt) {
					throw new Error('Server returned success but no debt data');
				}

				debtsLog.info('Debt updated successfully:', debt._id);
				return this.toDTO(debt as Debt);
			}

			// Provide more detailed error message
			const errorMessage = response.error || 
				(response as any)?.details || 
				'Failed to update debt';
			debtsLog.error(`Error updating debt ${id}:`, {
				error: errorMessage,
				response: response,
			});
			throw new Error(errorMessage);
		} catch (error) {
			const errorMessage = error instanceof Error 
				? error.message 
				: 'Failed to update debt';
			debtsLog.error(`Error updating debt ${id}:`, {
				error: errorMessage,
				originalError: error,
			});
			throw error instanceof Error ? error : new Error(errorMessage);
		}
	}

	/**
	 * Convert Debt to DebtDTO
	 */
	private static toDTO(debt: Debt | any): DebtDTO {
		return {
			_id: debt._id,
			name: debt.name,
			currentBalance: debt.currentBalance,
			interestRate: debt.interestRate ? debt.interestRate * 100 : undefined, // Convert to percentage
			minPayment: debt.minPayment,
			dueDayOfMonth: debt.dueDay,
			activity: debt.activity || [], // Activity will be populated by backend if available
			type: debt.type,
			principal: debt.principal,
			linkedTransactionPattern: debt.linkedTransactionPattern,
			isActive: debt.isActive,
			isSynthetic: debt.isSynthetic,
			notes: debt.notes,
			createdAt: debt.createdAt,
			updatedAt: debt.updatedAt,
		};
	}
}
