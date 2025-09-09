import { Budget, Transaction } from '../../types';
import { ApiService } from '../core/apiService';

export interface BudgetAnalysis {
	id: string;
	budgetId: string;
	spent: number;
	remaining: number;
	percentageUsed: number;
	trend: 'increasing' | 'decreasing' | 'stable';
	recommendations: string[];
	lastUpdated: Date;
	spendingBreakdown: {
		category: string;
		amount: number;
		percentage: number;
		color?: string;
	}[];
	totalSpent: number;
	transactionCount: number;
	averageSpent: number;
}

export interface BudgetAnalysisOptions {
	includeTransactions?: boolean;
	timeRange?: 'week' | 'month' | 'quarter' | 'year';
	includeRecommendations?: boolean;
	includeTrends?: boolean;
}

export interface PerformanceMetrics {
	totalRequests: number;
	successfulRequests: number;
	failedRequests: number;
	averageResponseTime: number;
	cacheHits: number;
	lastError?: string;
	lastErrorTime?: Date;
}

export class BudgetAnalysisService {
	private static performanceMetrics: PerformanceMetrics = {
		totalRequests: 0,
		successfulRequests: 0,
		failedRequests: 0,
		averageResponseTime: 0,
		cacheHits: 0,
	};
	private static responseTimes: number[] = [];
	private static analysisCache = new Map<
		string,
		{ data: BudgetAnalysis; timestamp: number }
	>();
	private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

	/**
	 * Get budget analysis for a specific budget
	 * @param budgetId - The budget ID
	 * @param options - Analysis options
	 * @returns Promise<BudgetAnalysis> - Budget analysis data
	 */
	static async getBudgetAnalysis(
		budgetId: string,
		options: BudgetAnalysisOptions = {}
	): Promise<BudgetAnalysis> {
		const startTime = Date.now();
		this.performanceMetrics.totalRequests++;

		try {
			// Check cache first
			const cacheKey = `${budgetId}-${JSON.stringify(options)}`;
			const cached = this.analysisCache.get(cacheKey);
			if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
				this.performanceMetrics.cacheHits++;
				console.log('[BudgetAnalysisService] Returning cached analysis');
				return cached.data;
			}

			console.log(
				'[BudgetAnalysisService] Getting analysis for budget:',
				budgetId
			);

			// Get budget data
			const budget = await this.getBudgetData(budgetId);
			if (!budget) {
				throw new Error(`Budget with ID ${budgetId} not found`);
			}

			// Get transactions if requested
			let transactions: Transaction[] = [];
			if (options.includeTransactions) {
				transactions = await this.getBudgetTransactions(
					budgetId,
					options.timeRange
				);
			}

			// Calculate analysis
			const analysis = await this.calculateBudgetAnalysis(
				budget,
				transactions,
				options
			);

			// Cache the result
			this.analysisCache.set(cacheKey, {
				data: analysis,
				timestamp: Date.now(),
			});

			// Update performance metrics
			const responseTime = Date.now() - startTime;
			this.performanceMetrics.successfulRequests++;
			this.updateResponseTime(responseTime);

			console.log('[BudgetAnalysisService] Analysis completed:', {
				budgetId,
				responseTime,
				spent: analysis.spent,
				percentageUsed: analysis.percentageUsed,
			});

			return analysis;
		} catch (error) {
			console.error('[BudgetAnalysisService] Analysis failed:', error);
			this.performanceMetrics.failedRequests++;
			this.performanceMetrics.lastError =
				error instanceof Error ? error.message : String(error);
			this.performanceMetrics.lastErrorTime = new Date();
			throw error;
		}
	}

	/**
	 * Get budget data from API
	 */
	private static async getBudgetData(budgetId: string): Promise<Budget | null> {
		try {
			const response = await ApiService.get(`/api/budgets/${budgetId}`);
			return response.success ? (response.data as Budget) : null;
		} catch (error) {
			console.error(
				'[BudgetAnalysisService] Failed to get budget data:',
				error
			);
			return null;
		}
	}

	/**
	 * Get transactions for a budget
	 */
	private static async getBudgetTransactions(
		budgetId: string,
		timeRange: string = 'month'
	): Promise<Transaction[]> {
		try {
			const response = await ApiService.get(
				`/api/budgets/${budgetId}/transactions?timeRange=${timeRange}`
			);
			return response.success ? (response.data as Transaction[]) || [] : [];
		} catch (error) {
			console.error(
				'[BudgetAnalysisService] Failed to get transactions:',
				error
			);
			return [];
		}
	}

	/**
	 * Calculate budget analysis
	 */
	private static async calculateBudgetAnalysis(
		budget: Budget,
		transactions: Transaction[],
		options: BudgetAnalysisOptions
	): Promise<BudgetAnalysis> {
		const spent = budget.spent || 0;
		const amount = budget.amount || 0;
		const remaining = Math.max(0, amount - spent);
		const percentageUsed = amount > 0 ? (spent / amount) * 100 : 0;

		// Calculate trend
		const trend = this.calculateSpendingTrend(transactions);

		// Calculate spending breakdown
		const spendingBreakdown = this.calculateSpendingBreakdown(transactions);

		// Generate recommendations
		const recommendations = options.includeRecommendations
			? this.generateRecommendations(
					budget,
					transactions,
					percentageUsed,
					trend
			  )
			: [];

		// Calculate additional metrics
		const totalSpent = transactions.reduce(
			(sum, t) => sum + (t.amount || 0),
			0
		);
		const transactionCount = transactions.length;
		const averageSpent =
			transactionCount > 0 ? totalSpent / transactionCount : 0;

		return {
			id: `analysis-${budget.id}`,
			budgetId: budget.id,
			spent,
			remaining,
			percentageUsed: Math.round(percentageUsed * 100) / 100,
			trend,
			recommendations,
			lastUpdated: new Date(),
			spendingBreakdown,
			totalSpent,
			transactionCount,
			averageSpent: Math.round(averageSpent * 100) / 100,
		};
	}

	/**
	 * Calculate spending trend from transactions
	 */
	private static calculateSpendingTrend(
		transactions: Transaction[]
	): 'increasing' | 'decreasing' | 'stable' {
		if (transactions.length < 2) return 'stable';

		// Group transactions by week
		const weeklySpending = new Map<string, number>();
		transactions.forEach((transaction) => {
			const week = this.getWeekKey(transaction.date);
			weeklySpending.set(
				week,
				(weeklySpending.get(week) || 0) + (transaction.amount || 0)
			);
		});

		const weeks = Array.from(weeklySpending.keys()).sort();
		if (weeks.length < 2) return 'stable';

		const recentWeeks = weeks.slice(-2);
		const olderWeeks = weeks.slice(-4, -2);

		const recentTotal = recentWeeks.reduce(
			(sum, week) => sum + (weeklySpending.get(week) || 0),
			0
		);
		const olderTotal = olderWeeks.reduce(
			(sum, week) => sum + (weeklySpending.get(week) || 0),
			0
		);

		if (olderTotal === 0) return 'stable';

		const changePercent = ((recentTotal - olderTotal) / olderTotal) * 100;

		if (changePercent > 10) return 'increasing';
		if (changePercent < -10) return 'decreasing';
		return 'stable';
	}

	/**
	 * Calculate spending breakdown by category
	 */
	private static calculateSpendingBreakdown(transactions: Transaction[]): {
		category: string;
		amount: number;
		percentage: number;
		color?: string;
	}[] {
		const categoryTotals = new Map<string, number>();
		const totalAmount = transactions.reduce(
			(sum, t) => sum + (t.amount || 0),
			0
		);

		transactions.forEach((transaction) => {
			const category = transaction.category || 'Uncategorized';
			categoryTotals.set(
				category,
				(categoryTotals.get(category) || 0) + (transaction.amount || 0)
			);
		});

		const colors = [
			'#FF6B6B',
			'#4ECDC4',
			'#45B7D1',
			'#96CEB4',
			'#FFEAA7',
			'#DDA0DD',
			'#98D8C8',
		];

		return Array.from(categoryTotals.entries())
			.map(([category, amount], index) => ({
				category,
				amount: Math.round(amount * 100) / 100,
				percentage:
					totalAmount > 0
						? Math.round((amount / totalAmount) * 100 * 100) / 100
						: 0,
				color: colors[index % colors.length],
			}))
			.sort((a, b) => b.amount - a.amount);
	}

	/**
	 * Generate recommendations based on budget analysis
	 */
	private static generateRecommendations(
		budget: Budget,
		transactions: Transaction[],
		percentageUsed: number,
		trend: 'increasing' | 'decreasing' | 'stable'
	): string[] {
		const recommendations: string[] = [];

		// Budget utilization recommendations
		if (percentageUsed > 90) {
			recommendations.push(
				"⚠️ You're over 90% of your budget. Consider reducing spending or increasing your budget limit."
			);
		} else if (percentageUsed > 75) {
			recommendations.push(
				"⚠️ You're over 75% of your budget. Monitor your spending closely for the rest of the period."
			);
		} else if (percentageUsed < 25) {
			recommendations.push(
				"💡 You're using less than 25% of your budget. Consider reallocating funds to other categories."
			);
		}

		// Trend-based recommendations
		if (trend === 'increasing') {
			recommendations.push(
				'📈 Your spending is increasing. Review recent transactions to identify areas for improvement.'
			);
		} else if (trend === 'decreasing') {
			recommendations.push(
				'📉 Great job! Your spending is decreasing. Keep up the good work!'
			);
		}

		// Transaction frequency recommendations
		const avgDailySpending =
			transactions.length > 0
				? transactions.reduce((sum, t) => sum + (t.amount || 0), 0) / 30
				: 0;

		if (avgDailySpending > (budget.amount || 0) / 30) {
			recommendations.push(
				"💸 Your daily average spending exceeds your budget's daily allowance. Consider spreading expenses more evenly."
			);
		}

		// Category-specific recommendations
		const categoryBreakdown = this.calculateSpendingBreakdown(transactions);
		const topCategory = categoryBreakdown[0];
		if (topCategory && topCategory.percentage > 50) {
			recommendations.push(
				`🎯 ${topCategory.category} accounts for ${topCategory.percentage}% of your spending. Consider diversifying your expenses.`
			);
		}

		return recommendations;
	}

	/**
	 * Get week key for grouping transactions
	 */
	private static getWeekKey(date: Date | string): string {
		const d = new Date(date);
		const year = d.getFullYear();
		const week = this.getWeekNumber(d);
		return `${year}-W${week}`;
	}

	/**
	 * Get week number of the year
	 */
	private static getWeekNumber(date: Date): number {
		const d = new Date(
			Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
		);
		const dayNum = d.getUTCDay() || 7;
		d.setUTCDate(d.getUTCDate() + 4 - dayNum);
		const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
		return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	}

	/**
	 * Update response time tracking
	 */
	private static updateResponseTime(responseTime: number): void {
		this.responseTimes.push(responseTime);

		// Keep only last 100 response times for rolling average
		if (this.responseTimes.length > 100) {
			this.responseTimes = this.responseTimes.slice(-100);
		}

		// Calculate rolling average
		this.performanceMetrics.averageResponseTime =
			this.responseTimes.reduce((sum, time) => sum + time, 0) /
			this.responseTimes.length;
	}

	/**
	 * Get performance metrics
	 */
	static getPerformanceMetrics(): PerformanceMetrics {
		return { ...this.performanceMetrics };
	}

	/**
	 * Reset performance metrics
	 */
	static resetPerformanceMetrics(): void {
		this.performanceMetrics = {
			totalRequests: 0,
			successfulRequests: 0,
			failedRequests: 0,
			averageResponseTime: 0,
			cacheHits: 0,
		};
		this.responseTimes = [];
	}

	/**
	 * Clear analysis cache
	 */
	static clearCache(): void {
		this.analysisCache.clear();
		console.log('[BudgetAnalysisService] Cache cleared');
	}

	/**
	 * Get cache statistics
	 */
	static getCacheStats(): { size: number; hitRate: number } {
		const totalRequests = this.performanceMetrics.totalRequests;
		const cacheHits = this.performanceMetrics.cacheHits;
		return {
			size: this.analysisCache.size,
			hitRate: totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0,
		};
	}
}
