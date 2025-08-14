import { ApiService } from './apiService';

export interface BudgetHistoryItem {
	periodStart: string;
	periodEnd: string;
	periodType: 'weekly' | 'monthly';
	allocatedAmount: number;
	spentAmount: number;
	remainingAmount: number;
	rolloverAmount: number;
	utilizationPercentage: number;
	categoryBreakdown: Array<{
		category: string;
		amount: number;
		percentage: number;
	}>;
	periodHealth: number;
	summary: {
		totalIncome: number;
		totalExpenses: number;
		netSavings: number;
		budgetUtilization: number;
		goalProgress: number;
		topSpendingCategories: Array<{
			category: string;
			amount: number;
			percentage: number;
		}>;
	};
}

export interface FinancialHistoryItem {
	periodStart: string;
	periodEnd: string;
	periodType: 'weekly' | 'monthly';
	summary: {
		totalIncome: number;
		totalExpenses: number;
		netSavings: number;
		budgetUtilization: number;
		goalProgress: number;
		topSpendingCategories: Array<{
			category: string;
			amount: number;
			percentage: number;
		}>;
	};
	metadata: {
		transactionCount: number;
		averageDailySpending: number;
		highestSpendingDay: string | null;
		lowestSpendingDay: string | null;
		budgetAlerts: string[];
		goalMilestones: string[];
	};
	healthScore: number;
	budgetCount: number;
	goalCount: number;
	recurringExpenseCount: number;
}

export interface SnapshotStats {
	totalSnapshots: number;
	monthlySnapshots: number;
	weeklySnapshots: number;
	latestSnapshot: {
		periodEnd: string;
		periodType: 'weekly' | 'monthly';
		transactionCount: number;
	} | null;
}

/**
 * Service for managing financial period snapshots
 */
export class FinancialSnapshotService {
	/**
	 * Get budget history from snapshots
	 * @param budgetId - Budget ID
	 * @param limit - Number of periods to return
	 * @returns Promise<BudgetHistoryItem[]> - Budget history
	 */
	static async getBudgetHistory(
		budgetId: string,
		limit: number = 12
	): Promise<BudgetHistoryItem[]> {
		try {
			console.log(
				`[FinancialSnapshotService] Getting budget history for budget ${budgetId}`
			);

			const response = await ApiService.get<{ data: BudgetHistoryItem[] }>(
				`/financial-snapshots/budget/${budgetId}/history?limit=${limit}`
			);

			if (response.success && response.data) {
				console.log(
					`[FinancialSnapshotService] Retrieved ${response.data.length} budget history items`
				);
				return response.data;
			}

			throw new Error(response.error || 'Failed to fetch budget history');
		} catch (error) {
			console.error(
				'[FinancialSnapshotService] Error getting budget history:',
				error
			);
			throw error;
		}
	}

	/**
	 * Get financial history for user
	 * @param periodType - 'weekly' or 'monthly'
	 * @param limit - Number of periods to return
	 * @returns Promise<FinancialHistoryItem[]> - Financial history
	 */
	static async getFinancialHistory(
		periodType: 'weekly' | 'monthly' = 'monthly',
		limit: number = 12
	): Promise<FinancialHistoryItem[]> {
		try {
			console.log(
				`[FinancialSnapshotService] Getting financial history for period type: ${periodType}`
			);

			const response = await ApiService.get<{ data: FinancialHistoryItem[] }>(
				`/financial-snapshots/history?periodType=${periodType}&limit=${limit}`
			);

			if (response.success && response.data) {
				console.log(
					`[FinancialSnapshotService] Retrieved ${response.data.length} financial history items`
				);
				return response.data;
			}

			throw new Error(response.error || 'Failed to fetch financial history');
		} catch (error) {
			console.error(
				'[FinancialSnapshotService] Error getting financial history:',
				error
			);
			throw error;
		}
	}

	/**
	 * Create snapshot for current period
	 * @returns Promise<Object> - Created snapshot
	 */
	static async createCurrentPeriodSnapshot(): Promise<any> {
		try {
			console.log(
				'[FinancialSnapshotService] Creating snapshot for current period'
			);

			const response = await ApiService.post<any>(
				'/financial-snapshots/current',
				{}
			);

			if (response.success && response.data) {
				console.log(
					'[FinancialSnapshotService] Successfully created current period snapshot'
				);
				return response.data;
			}

			throw new Error(
				response.error || 'Failed to create current period snapshot'
			);
		} catch (error) {
			console.error(
				'[FinancialSnapshotService] Error creating current period snapshot:',
				error
			);
			throw error;
		}
	}

	/**
	 * Get snapshot statistics
	 * @returns Promise<SnapshotStats> - Snapshot statistics
	 */
	static async getSnapshotStats(): Promise<SnapshotStats> {
		try {
			console.log('[FinancialSnapshotService] Getting snapshot statistics');

			const response = await ApiService.get<{ data: SnapshotStats }>(
				'/financial-snapshots/stats'
			);

			if (response.success && response.data) {
				console.log('[FinancialSnapshotService] Retrieved snapshot statistics');
				return response.data;
			}

			throw new Error(response.error || 'Failed to fetch snapshot statistics');
		} catch (error) {
			console.error(
				'[FinancialSnapshotService] Error getting snapshot statistics:',
				error
			);
			throw error;
		}
	}

	/**
	 * Create snapshot for specific period
	 * @param periodStart - Period start date
	 * @param periodEnd - Period end date
	 * @param periodType - 'weekly' or 'monthly'
	 * @returns Promise<Object> - Created snapshot
	 */
	static async createPeriodSnapshot(
		periodStart: string,
		periodEnd: string,
		periodType: 'weekly' | 'monthly'
	): Promise<any> {
		try {
			console.log(
				`[FinancialSnapshotService] Creating snapshot for period ${periodStart} to ${periodEnd}`
			);

			const response = await ApiService.post<any>(
				'/financial-snapshots/period',
				{
					periodStart,
					periodEnd,
					periodType,
				}
			);

			if (response.success && response.data) {
				console.log(
					'[FinancialSnapshotService] Successfully created period snapshot'
				);
				return response.data;
			}

			throw new Error(response.error || 'Failed to create period snapshot');
		} catch (error) {
			console.error(
				'[FinancialSnapshotService] Error creating period snapshot:',
				error
			);
			throw error;
		}
	}

	/**
	 * Get snapshot for specific period
	 * @param periodStart - Period start date
	 * @param periodType - 'weekly' or 'monthly'
	 * @returns Promise<Object> - Period snapshot
	 */
	static async getPeriodSnapshot(
		periodStart: string,
		periodType: 'weekly' | 'monthly'
	): Promise<any> {
		try {
			console.log(
				`[FinancialSnapshotService] Getting snapshot for period ${periodStart}`
			);

			const response = await ApiService.get<any>(
				`/financial-snapshots/period/${periodStart}/${periodType}`
			);

			if (response.success && response.data) {
				console.log('[FinancialSnapshotService] Retrieved period snapshot');
				return response.data;
			}

			throw new Error(response.error || 'Failed to fetch period snapshot');
		} catch (error) {
			console.error(
				'[FinancialSnapshotService] Error getting period snapshot:',
				error
			);
			throw error;
		}
	}

	/**
	 * Delete snapshot
	 * @param snapshotId - Snapshot ID
	 * @returns Promise<boolean> - Success status
	 */
	static async deleteSnapshot(snapshotId: string): Promise<boolean> {
		try {
			console.log(`[FinancialSnapshotService] Deleting snapshot ${snapshotId}`);

			const response = await ApiService.delete<any>(
				`/financial-snapshots/${snapshotId}`
			);

			if (response.success) {
				console.log('[FinancialSnapshotService] Successfully deleted snapshot');
				return true;
			}

			throw new Error(response.error || 'Failed to delete snapshot');
		} catch (error) {
			console.error(
				'[FinancialSnapshotService] Error deleting snapshot:',
				error
			);
			throw error;
		}
	}
}
