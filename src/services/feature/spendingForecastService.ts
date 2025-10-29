import { logger } from '../../utils/logger';
// Stub service for SpendingForecastService - was removed during reorganization
// This provides the expected interface to prevent import errors

export interface MonthlyForecast {
	period: string;
	projectedTotal: number;
	currentSpending: number;
	avgMonthlySpending: number;
	trendDirection: 'increasing' | 'decreasing' | 'stable';
	percentageDifference: number;
	confidence: number;
}

export interface BudgetForecast {
	budgetId: string;
	budgetName: string;
	projectedOverspend: number;
	riskLevel: 'low' | 'medium' | 'high';
	recommendations: string[];
}

export class SpendingForecastService {
	static async getSpendingAnalysis(): Promise<{
		monthlyForecast: MonthlyForecast;
		budgetForecasts: BudgetForecast[];
	}> {
		logger.warn(
			'SpendingForecastService.getSpendingAnalysis called - stub implementation'
		);
		return {
			monthlyForecast: {
				period: 'current',
				projectedTotal: 0,
				currentSpending: 0,
				avgMonthlySpending: 0,
				trendDirection: 'stable',
				percentageDifference: 0,
				confidence: 0,
			},
			budgetForecasts: [],
		};
	}

	static getForecastStatus(forecast: MonthlyForecast): {
		status: string;
		color: string;
		icon: string;
	} {
		logger.warn(
			'SpendingForecastService.getForecastStatus called - stub implementation'
		);
		return {
			status: 'Stable',
			color: '#4caf50',
			icon: 'checkmark-circle',
		};
	}

	static getTrendColor(trendDirection: string): string {
		logger.warn(
			'SpendingForecastService.getTrendColor called - stub implementation'
		);
		switch (trendDirection) {
			case 'increasing':
				return '#f44336';
			case 'decreasing':
				return '#4caf50';
			default:
				return '#666';
		}
	}

	static getTrendIcon(trendDirection: string): string {
		logger.warn(
			'SpendingForecastService.getTrendIcon called - stub implementation'
		);
		switch (trendDirection) {
			case 'increasing':
				return 'trending-up';
			case 'decreasing':
				return 'trending-down';
			default:
				return 'trending-neutral';
		}
	}

	static formatTrendDirection(trendDirection: string): string {
		logger.warn(
			'SpendingForecastService.formatTrendDirection called - stub implementation'
		);
		switch (trendDirection) {
			case 'increasing':
				return 'Increasing';
			case 'decreasing':
				return 'Decreasing';
			default:
				return 'No change';
		}
	}

	static formatPercentageDifference(percentageDifference: number): string {
		logger.warn(
			'SpendingForecastService.formatPercentageDifference called - stub implementation'
		);
		return `${percentageDifference}%`;
	}

	static getBudgetForecastStatus(forecast: BudgetForecast): {
		status: string;
		color: string;
	} {
		logger.warn(
			'SpendingForecastService.getBudgetForecastStatus called - stub implementation'
		);
		return {
			status: 'No risk',
			color: '#4caf50',
		};
	}
}
