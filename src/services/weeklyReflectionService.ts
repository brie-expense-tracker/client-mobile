import { ApiService } from './apiService';

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
}

export class WeeklyReflectionService {
	static async getCurrentWeekReflection(): Promise<WeeklyReflection> {
		try {
			const response = await ApiService.get('/weekly-reflections/current');
			return response.data.reflection;
		} catch (error) {
			console.error('Error fetching current week reflection:', error);
			throw error;
		}
	}

	static async saveWeeklyReflection(
		data: SaveReflectionData
	): Promise<WeeklyReflection> {
		try {
			const response = await ApiService.post('/weekly-reflections/save', data);
			return response.data.reflection;
		} catch (error) {
			console.error('Error saving weekly reflection:', error);
			throw error;
		}
	}

	static async getReflectionHistory(
		limit: number = 10,
		offset: number = 0
	): Promise<WeeklyReflection[]> {
		try {
			const response = await ApiService.get(
				`/weekly-reflections/history?limit=${limit}&offset=${offset}`
			);
			return response.data.reflections;
		} catch (error) {
			console.error('Error fetching reflection history:', error);
			throw error;
		}
	}

	static async getReflectionStats(): Promise<ReflectionStats> {
		try {
			const response = await ApiService.get('/weekly-reflections/stats');
			return response.data.stats;
		} catch (error) {
			console.error('Error fetching reflection stats:', error);
			throw error;
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
		const now = new Date();
		const weekStart = new Date();
		weekStart.setDate(now.getDate() - 7);

		// Filter transactions for the current week
		const weekTransactions = transactions.filter((tx) => {
			const txDate = new Date(tx.date);
			return txDate >= weekStart && txDate <= now;
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
