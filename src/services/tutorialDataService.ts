import { ApiService } from './apiService';
import { ProgressionService } from './progressionService';

export interface TutorialData {
	transactions: any[];
	budgets: any[];
	goals: any[];
	profile: any;
	progression: any;
}

export interface TutorialDataResult {
	success: boolean;
	data?: TutorialData;
	error?: string;
}

export class TutorialDataService {
	private static cache: {
		data: TutorialData | null;
		timestamp: number;
		ttl: number;
	} = {
		data: null,
		timestamp: 0,
		ttl: 30000, // 30 seconds cache
	};

	/**
	 * Fetch all tutorial-related data in parallel
	 */
	static async fetchAllTutorialData(): Promise<TutorialDataResult> {
		try {
			// Check cache first
			const now = Date.now();
			if (this.cache.data && now - this.cache.timestamp < this.cache.ttl) {
				return {
					success: true,
					data: this.cache.data,
				};
			}

			// Fetch all data in parallel
			const [
				transactionsResult,
				budgetsResult,
				goalsResult,
				progressionResult,
			] = await Promise.allSettled([
				ApiService.get('/transactions'),
				ApiService.get('/budgets'),
				ApiService.get('/goals'),
				ProgressionService.getProgressionStatus(),
			]);

			// Process results
			const data: TutorialData = {
				transactions: [],
				budgets: [],
				goals: [],
				profile: null,
				progression: null,
			};

			// Handle transactions
			if (
				transactionsResult.status === 'fulfilled' &&
				transactionsResult.value.success
			) {
				data.transactions = Array.isArray(transactionsResult.value.data)
					? transactionsResult.value.data
					: [];
			}

			// Handle budgets
			if (budgetsResult.status === 'fulfilled' && budgetsResult.value.success) {
				data.budgets = Array.isArray(budgetsResult.value.data)
					? budgetsResult.value.data
					: [];
			}

			// Handle goals
			if (goalsResult.status === 'fulfilled' && goalsResult.value.success) {
				data.goals = Array.isArray(goalsResult.value.data)
					? goalsResult.value.data
					: [];
			}

			// Handle progression
			if (progressionResult.status === 'fulfilled' && progressionResult.value) {
				data.progression = progressionResult.value;
			}

			// Update cache
			this.cache.data = data;
			this.cache.timestamp = now;

			return {
				success: true,
				data,
			};
		} catch (error) {
			console.error('Error fetching tutorial data:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Clear the cache
	 */
	static clearCache(): void {
		this.cache.data = null;
		this.cache.timestamp = 0;
	}

	/**
	 * Set cache TTL
	 */
	static setCacheTTL(ttl: number): void {
		this.cache.ttl = ttl;
	}

	/**
	 * Check if user has completed tutorial steps based on data
	 */
	static checkTutorialCompletion(data: TutorialData): {
		firstSmartAction: boolean;
		secondSmartAction: boolean;
		thirdSmartAction: boolean;
		fourthSmartAction: boolean;
		totalCompleted: number;
		completed: boolean;
	} {
		const firstSmartAction = data.transactions.length > 0;
		const secondSmartAction = data.budgets.length > 0;
		const thirdSmartAction = data.goals.length > 0;
		const fourthSmartAction =
			data.profile?.preferences?.aiInsights?.enabled || false;

		const totalCompleted = [
			firstSmartAction,
			secondSmartAction,
			thirdSmartAction,
			fourthSmartAction,
		].filter(Boolean).length;

		return {
			firstSmartAction,
			secondSmartAction,
			thirdSmartAction,
			fourthSmartAction,
			totalCompleted,
			completed: totalCompleted >= 4,
		};
	}

	/**
	 * Get tutorial progress with intelligent fallback
	 */
	static async getTutorialProgress(): Promise<{
		success: boolean;
		progress?: any;
		error?: string;
	}> {
		try {
			// Try to get from progression service first
			const progressionResult = await ProgressionService.getTutorialProgress();
			if (progressionResult) {
				return {
					success: true,
					progress: progressionResult,
				};
			}

			// Fallback to calculating from raw data
			const dataResult = await this.fetchAllTutorialData();
			if (!dataResult.success || !dataResult.data) {
				return {
					success: false,
					error: dataResult.error || 'Failed to fetch tutorial data',
				};
			}

			const completion = this.checkTutorialCompletion(dataResult.data);
			const progress = {
				completed: completion.completed,
				steps: {
					firstSmartAction: completion.firstSmartAction,
					secondSmartAction: completion.secondSmartAction,
					thirdSmartAction: completion.thirdSmartAction,
					fourthSmartAction: completion.fourthSmartAction,
				},
				totalCompleted: completion.totalCompleted,
			};

			return {
				success: true,
				progress,
			};
		} catch (error) {
			console.error('Error getting tutorial progress:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}
}
