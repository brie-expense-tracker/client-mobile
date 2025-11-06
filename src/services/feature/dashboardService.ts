import { ApiService } from '../core/apiService';

export interface CashflowData {
	totalIncome: number;
	totalExpenses: number;
	netSavings: number;
	period: {
		start: string;
		end: string;
		type: 'monthly';
	};
}

export interface BudgetRollup {
	budgetId: string;
	budgetName: string;
	limit: number;
	spent: number;
	remaining: number;
	percentageUsed: number;
	onTrack: boolean;
}

export interface BudgetsCard {
	totalBudgets: number;
	budgetsOnTrack: number;
	budgets: BudgetRollup[];
	summary: string;
}

export interface DebtRollup {
	debtId: string;
	debtName: string;
	currentBalance: number;
	paidThisMonth: number;
	minPayment: number;
	isSynthetic: boolean;
}

export interface DebtsCard {
	totalDebt: number;
	debtToIncomeRatio: number;
	paidThisMonth: number;
	debts: DebtRollup[];
	summary: string;
	isHealthy: boolean;
}

export interface RecurringCard {
	upcoming: {
		recurringId: string;
		name: string;
		amount: number;
		dueDate: string;
		daysUntilDue: number;
	}[];
	totalMonthlyFixed: number;
	summary: string;
}

export interface DashboardRollup {
	cashflow: CashflowData;
	budgets: BudgetsCard;
	debts: DebtsCard;
	recurring: RecurringCard;
}

export class DashboardService {
	/**
	 * Get dashboard rollup data
	 */
	static async getDashboardRollup(
		month?: number,
		year?: number
	): Promise<DashboardRollup> {
		const params = new URLSearchParams();
		if (month !== undefined) {
			params.append('month', month.toString());
		}
		if (year !== undefined) {
			params.append('year', year.toString());
		}

		const endpoint = `/api/dashboard/rollup${
			params.toString() ? `?${params.toString()}` : ''
		}`;
		// The API returns { success: true, data: rollup }
		// ApiService.get<T> wraps it, so response.data is the raw API response
		const response = await ApiService.get<{
			success: boolean;
			data: DashboardRollup;
		}>(endpoint);

		if (!response.success || !response.data) {
			throw new Error(response.error || 'Failed to fetch dashboard rollup');
		}

		// response.data is the API response body: { success: true, data: rollup }
		// So we need to extract the inner data property
		const apiResponseBody = response.data as any;
		const rollup = apiResponseBody?.data || apiResponseBody;

		// Validate that all required fields exist
		if (
			!rollup ||
			typeof rollup !== 'object' ||
			!rollup.cashflow ||
			!rollup.budgets ||
			!rollup.debts ||
			!rollup.recurring
		) {
			console.error('Invalid rollup structure:', rollup);
			throw new Error('Invalid dashboard rollup data structure');
		}

		return rollup as DashboardRollup;
	}
}
