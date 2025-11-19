import { ApiService } from '../core/apiService';
import { logger } from '../../utils/logger';

export interface WeeklyReflection {
	_id: string;
	userId: string;
	weekStartDate: string;
	weekEndDate: string;
	moodRating?: number;
	winOfTheWeek?: string;
	financialMetrics: {
		totalIncome: number;
		totalExpenses: number;
		netSavings: number;
		budgetUtilization: number;
		goalProgress: number;
	};
	reflectionNotes?: string;
	completed: boolean;
	completedAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface ReflectionStats {
	totalReflections: number;
	averageMoodRating: number;
	moodTrend: {
		week: string;
		rating: number;
	}[];
	completionRate: number;
	mostCommonWins: {
		word: string;
		count: number;
	}[];
}

export interface SaveReflectionData {
	moodRating?: number;
	winOfTheWeek?: string;
	reflectionNotes?: string;
	financialMetrics?: {
		totalIncome: number;
		totalExpenses: number;
		netSavings: number;
		budgetUtilization: number;
		goalProgress: number;
	};
	markCompleted?: boolean;
	reflectionId?: string;
}

export class WeeklyReflectionService {
	static async getCurrentWeekReflection(): Promise<WeeklyReflection> {
		try {
			const response = await ApiService.get('/api/weekly-reflections/current');

			// Handle case where API returns no data or user not found
			if (!response.data || !(response.data as any).reflection) {
				// Return a default reflection structure for new users
				const now = new Date();
				const dayOfWeek = now.getDay();
				const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
				const monday = new Date(
					now.getTime() - daysToMonday * 24 * 60 * 60 * 1000
				);
				const weekStart = new Date(
					monday.getFullYear(),
					monday.getMonth(),
					monday.getDate()
				);
				const weekEnd = new Date(
					monday.getFullYear(),
					monday.getMonth(),
					monday.getDate() + 7
				);

				return {
					_id: 'temp',
					userId: 'temp',
					weekStartDate: weekStart.toISOString(),
					weekEndDate: weekEnd.toISOString(),
					financialMetrics: {
						totalIncome: 0,
						totalExpenses: 0,
						netSavings: 0,
						budgetUtilization: 0,
						goalProgress: 0,
					},
					completed: false,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};
			}

			return (response.data as any).reflection;
		} catch (error) {
			logger.error('Error fetching current week reflection:', error);

			// Always return a default reflection for any error (API or network issues)
			logger.debug('Error detected, returning default reflection structure');
			const now = new Date();
			const dayOfWeek = now.getDay();
			const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
			const monday = new Date(
				now.getTime() - daysToMonday * 24 * 60 * 60 * 1000
			);
			const weekStart = new Date(
				monday.getFullYear(),
				monday.getMonth(),
				monday.getDate()
			);
			const weekEnd = new Date(
				monday.getFullYear(),
				monday.getMonth(),
				monday.getDate() + 7
			);

			return {
				_id: 'temp',
				userId: 'temp',
				weekStartDate: weekStart.toISOString(),
				weekEndDate: weekEnd.toISOString(),
				financialMetrics: {
					totalIncome: 0,
					totalExpenses: 0,
					netSavings: 0,
					budgetUtilization: 0,
					goalProgress: 0,
				},
				completed: false,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};
		}
	}

	static async saveWeeklyReflection(
		data: SaveReflectionData
	): Promise<WeeklyReflection> {
		try {
			const response = await ApiService.post(
				'/api/weekly-reflections/save',
				data
			);

			// Handle different response structures
			// Server returns: { success: true, reflection: {...}, message: '...' }
			// ApiService wraps it as: { success: true, data: { success: true, reflection: {...}, message: '...' } }
			const reflection =
				(response.data as any)?.reflection ||
				(response as any).reflection ||
				response.data;

			if (!reflection || !reflection._id) {
				logger.error('Invalid reflection response', { response });
				throw new Error('Invalid response from server');
			}

			return reflection;
		} catch (error) {
			logger.error('Error saving weekly reflection:', error);

			// Always return a default reflection with saved data for any error
			logger.debug(
				'Error detected, returning default reflection with saved data'
			);
			const now = new Date();
			const dayOfWeek = now.getDay();
			const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
			const monday = new Date(
				now.getTime() - daysToMonday * 24 * 60 * 60 * 1000
			);
			const weekStart = new Date(
				monday.getFullYear(),
				monday.getMonth(),
				monday.getDate()
			);
			const weekEnd = new Date(
				monday.getFullYear(),
				monday.getMonth(),
				monday.getDate() + 7
			);

			return {
				_id: 'temp',
				userId: 'temp',
				weekStartDate: weekStart.toISOString(),
				weekEndDate: weekEnd.toISOString(),
				moodRating: data.moodRating,
				winOfTheWeek: data.winOfTheWeek,
				reflectionNotes: data.reflectionNotes,
				financialMetrics: data.financialMetrics || {
					totalIncome: 0,
					totalExpenses: 0,
					netSavings: 0,
					budgetUtilization: 0,
					goalProgress: 0,
				},
				completed: !!(data.moodRating || data.winOfTheWeek),
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};
		}
	}

	static async getReflectionHistory(
		limit: number = 10,
		offset: number = 0
	): Promise<WeeklyReflection[]> {
		try {
			const response = await ApiService.get(
				`/api/weekly-reflections/history?limit=${limit}&offset=${offset}`
			);
			return (response.data as any).reflections;
		} catch (error) {
			logger.error('Error fetching reflection history:', error);

			// Always return empty array for any error
			logger.debug('Error detected, returning empty reflection history');
			return [];
		}
	}

	static async getReflectionStats(): Promise<ReflectionStats> {
		try {
			const response = await ApiService.get('/api/weekly-reflections/stats');
			return (response.data as any).stats;
		} catch (error) {
			logger.error('Error fetching reflection stats:', error);

			// Always return default stats for any error
			logger.debug('Error detected, returning default reflection stats');
			return {
				totalReflections: 0,
				averageMoodRating: 0,
				moodTrend: [],
				completionRate: 0,
				mostCommonWins: [],
			};
		}
	}

	// Helper method to calculate financial metrics from transactions, budgets, and goals
	static calculateFinancialMetrics(
		transactions: any[],
		budgets: any[],
		goals: any[]
	): {
		totalIncome: number;
		totalExpenses: number;
		netSavings: number;
		budgetUtilization: number;
		goalProgress: number;
	} {
		// Get calendar-aligned week range (Monday to Sunday)
		const now = new Date();
		const dayOfWeek = now.getDay();
		const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days
		const monday = new Date(now.getTime() - daysToMonday * 24 * 60 * 60 * 1000);
		const weekStart = new Date(
			monday.getFullYear(),
			monday.getMonth(),
			monday.getDate()
		);
		const weekEnd = new Date(
			monday.getFullYear(),
			monday.getMonth(),
			monday.getDate() + 7
		);

		// Filter transactions for the current week
		const weekTransactions = transactions.filter((tx) => {
			const txDate = new Date(tx.date);
			return txDate >= weekStart && txDate < weekEnd;
		});

		const totalIncome = weekTransactions
			.filter((tx) => tx.type === 'income')
			.reduce((sum, tx) => sum + tx.amount, 0);

		const totalExpenses = weekTransactions
			.filter((tx) => tx.type === 'expense')
			.reduce((sum, tx) => sum + tx.amount, 0);

		const netSavings = totalIncome - totalExpenses;

		// Calculate budget utilization
		const totalBudgetAllocated = budgets.reduce(
			(sum, budget) => sum + budget.amount,
			0
		);
		const totalBudgetSpent = budgets.reduce(
			(sum, budget) => sum + (budget.spent || 0),
			0
		);
		const budgetUtilization =
			totalBudgetAllocated > 0
				? (totalBudgetSpent / totalBudgetAllocated) * 100
				: 0;

		// Calculate goal progress
		const totalGoalTarget = goals.reduce((sum, goal) => sum + goal.target, 0);
		const totalGoalCurrent = goals.reduce((sum, goal) => sum + goal.current, 0);
		const goalProgress =
			totalGoalTarget > 0 ? (totalGoalCurrent / totalGoalTarget) * 100 : 0;

		return {
			totalIncome,
			totalExpenses,
			netSavings,
			budgetUtilization,
			goalProgress,
		};
	}
}
