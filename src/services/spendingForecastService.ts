import { ApiService } from './apiService';

export interface SpendingAnalysis {
	avgMonthlySpending: number;
	avgDailySpending: number;
	trendDirection: 'increasing' | 'decreasing' | 'stable';
	standardDeviation: number;
	monthlySpending: Record<string, number>;
	dailySpending: Record<string, number>;
	transactionCount: number;
}

export interface MonthlyForecast {
	currentSpending: number;
	projectedTotal: number;
	avgMonthlySpending: number;
	isAboveAverage: boolean;
	percentageDifference: number;
	confidence: number;
	trendDirection: 'increasing' | 'decreasing' | 'stable';
	daysRemaining: number;
	dailyRate: number;
}

export interface BudgetForecast {
	budgetId: string;
	budgetName: string;
	budgetAmount: number;
	currentSpending: number;
	projectedTotal: number;
	utilizationPercentage: number;
	willExceed: boolean;
	excessAmount: number;
	dailyRate: number;
	daysRemaining: number;
	confidence: number;
}

export interface SpendingForecast {
	monthlyForecast: MonthlyForecast;
	budgetForecasts: BudgetForecast[];
	spendingAnalysis: SpendingAnalysis;
	overspendingAlerts: any[];
}

export class SpendingForecastService {
	/**
	 * Generate spending forecast for the current user
	 */
	static async generateSpendingForecast(): Promise<SpendingForecast | null> {
		try {
			const response = await ApiService.post('/spending-forecasts/generate');

			if (response.success) {
				return response.forecast;
			}

			return null;
		} catch (error) {
			console.error(
				'[SpendingForecastService] Error generating forecast:',
				error
			);
			return null;
		}
	}

	/**
	 * Get spending analysis for the current user
	 */
	static async getSpendingAnalysis(): Promise<{
		analysis: SpendingAnalysis;
		monthlyForecast: MonthlyForecast;
		budgetForecasts: BudgetForecast[];
	} | null> {
		try {
			const response = await ApiService.get('/spending-forecasts/analysis');

			if (response.success) {
				return {
					analysis: response.analysis,
					monthlyForecast: response.monthlyForecast,
					budgetForecasts: response.budgetForecasts,
				};
			}

			return null;
		} catch (error) {
			console.error(
				'[SpendingForecastService] Error getting spending analysis:',
				error
			);
			return null;
		}
	}

	/**
	 * Format trend direction for display
	 */
	static formatTrendDirection(trend: string): string {
		switch (trend) {
			case 'increasing':
				return 'Increasing';
			case 'decreasing':
				return 'Decreasing';
			case 'stable':
				return 'Stable';
			default:
				return trend;
		}
	}

	/**
	 * Get trend color
	 */
	static getTrendColor(trend: string): string {
		switch (trend) {
			case 'increasing':
				return '#f44336'; // Red
			case 'decreasing':
				return '#4caf50'; // Green
			case 'stable':
				return '#2196f3'; // Blue
			default:
				return '#757575'; // Gray
		}
	}

	/**
	 * Get trend icon
	 */
	static getTrendIcon(trend: string): string {
		switch (trend) {
			case 'increasing':
				return 'trending-up';
			case 'decreasing':
				return 'trending-down';
			case 'stable':
				return 'remove';
			default:
				return 'help';
		}
	}

	/**
	 * Format percentage difference
	 */
	static formatPercentageDifference(percentage: number): string {
		const sign = percentage >= 0 ? '+' : '';
		return `${sign}${percentage.toFixed(1)}%`;
	}

	/**
	 * Get forecast status
	 */
	static getForecastStatus(forecast: MonthlyForecast): {
		status: string;
		color: string;
		icon: string;
	} {
		if (forecast.isAboveAverage && forecast.percentageDifference > 20) {
			return {
				status: 'High Spending Alert',
				color: '#f44336',
				icon: 'warning',
			};
		} else if (forecast.isAboveAverage) {
			return {
				status: 'Above Average',
				color: '#ff9800',
				icon: 'trending-up',
			};
		} else {
			return {
				status: 'On Track',
				color: '#4caf50',
				icon: 'checkmark-circle',
			};
		}
	}

	/**
	 * Get budget forecast status
	 */
	static getBudgetForecastStatus(forecast: BudgetForecast): {
		status: string;
		color: string;
		icon: string;
	} {
		if (forecast.willExceed && forecast.utilizationPercentage > 120) {
			return {
				status: 'Will Exceed Budget',
				color: '#f44336',
				icon: 'warning',
			};
		} else if (forecast.utilizationPercentage > 90) {
			return {
				status: 'Close to Limit',
				color: '#ff9800',
				icon: 'alert-circle',
			};
		} else {
			return {
				status: 'On Track',
				color: '#4caf50',
				icon: 'checkmark-circle',
			};
		}
	}
}
