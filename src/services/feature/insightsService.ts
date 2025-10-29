import { ApiService } from '../core/apiService';
import { logger } from '../../utils/logger';


export interface AIInsight {
	_id: string;
	userId: string;
	period: 'daily' | 'weekly' | 'monthly';
	title: string;
	message: string;
	detailedExplanation: string;
	insightType: 'budgeting' | 'savings' | 'spending' | 'income' | 'general';
	priority: 'low' | 'medium' | 'high';
	isRead: boolean;
	isActionable: boolean;
	actionItems: {
		title: string;
		description: string;
		completed: boolean;
	}[];
	metadata: {
		totalIncome: number;
		totalExpenses: number;
		netIncome: number;
		topCategories: {
			name: string;
			amount: number;
			percentage: number;
		}[];
		comparisonPeriod: string;
		percentageChange: number;
		historicalComparison?: {
			previousPeriod: {
				totalIncome: number;
				totalExpenses: number;
				netIncome: number;
				topCategories: {
					name: string;
					amount: number;
					percentage: number;
				}[];
			};
			percentageChanges: {
				income: number;
				expenses: number;
				netIncome: number;
			};
		};
	};
	generatedAt: string;
	createdAt: string;
	updatedAt: string;
}

export interface InsightsResponse {
	success: boolean;
	data?: AIInsight[];
	message?: string;
	error?: string;
}

export interface InsightDetailResponse {
	success: boolean;
	data?: AIInsight;
}

export interface UnreadCountResponse {
	success: boolean;
	data?: {
		unreadCount: number;
	};
}

export class InsightsService {
	// Get insights for a specific period
	static async getInsights(
		period: 'daily' | 'weekly' | 'monthly'
	): Promise<InsightsResponse> {
		try {
			logger.debug(`🧠 Fetching ${period} insights...`);
			const response = await ApiService.get<any>(`/insights/${period}`);

			// Simplified response processing
			let insightsArray: AIInsight[] = [];

			if (response.success && response.data) {
				// Handle different response structures
				if (Array.isArray(response.data)) {
					// Direct array
					insightsArray = response.data;
				} else if (
					typeof response.data === 'object' &&
					response.data.success !== undefined &&
					response.data.data
				) {
					// Nested response object
					if (Array.isArray(response.data.data)) {
						insightsArray = response.data.data;
					} else if (
						typeof response.data.data === 'object' &&
						response.data.data.success !== undefined &&
						response.data.data.data &&
						Array.isArray(response.data.data.data)
					) {
						// Double nested
						insightsArray = response.data.data.data;
					}
				}
			}

			logger.debug(`✅ Found ${insightsArray.length} ${period} insights`);
			return {
				success: response.success,
				data: insightsArray,
				error: response.error,
			};
		} catch (error) {
			logger.error(`❌ Error fetching ${period} insights:`, error);
			return {
				success: false,
				data: [],
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	// Get insight detail by ID
	static async getInsightDetail(id: string): Promise<InsightDetailResponse> {
		return ApiService.get<AIInsight>(`/insights/detail/${id}`);
	}

	// Generate new insights for a period
	static async generateInsights(
		period: 'daily' | 'weekly' | 'monthly'
	): Promise<InsightsResponse> {
		try {
			logger.debug(`🚀 Generating ${period} insights...`);

			const response = await ApiService.post<any>(
				`/insights/generate/${period}`,
				{}
			);

			// Handle double-nested response structure that the server actually returns
			let insightsArray: AIInsight[] = [];

			if (response.data) {
				// Check if response.data is a nested response object
				if (
					typeof response.data === 'object' &&
					response.data.success !== undefined
				) {
					// First level nesting
					if (response.data.data && Array.isArray(response.data.data)) {
						insightsArray = response.data.data;
					} else if (
						response.data.data &&
						typeof response.data.data === 'object' &&
						response.data.data.success !== undefined
					) {
						// Second level nesting
						if (
							response.data.data.data &&
							Array.isArray(response.data.data.data)
						) {
							insightsArray = response.data.data.data;
						}
					}
				} else if (Array.isArray(response.data)) {
					// Direct array
					insightsArray = response.data;
				}
			}

			if (!Array.isArray(insightsArray)) {
				logger.warn(`⚠️ Generated data is not an array for ${period}`);
				insightsArray = [];
			}

			logger.debug(`✅ Generated ${insightsArray.length} ${period} insights`);
			return {
				success: response.success,
				data: insightsArray,
				error: response.error,
			};
		} catch (error) {
			logger.error(`❌ Error generating ${period} insights:`, error);
			throw error;
		}
	}

	// Generate profile-based weekly insights using user profile data
	static async generateProfileBasedWeeklyInsights(): Promise<InsightsResponse> {
		try {
			logger.debug(
				'InsightsService.generateProfileBasedWeeklyInsights() - Starting generation...'
			);

			const response = await ApiService.post<any>(
				'/insights/profile-based/weekly',
				{}
			);

			// Debug: Log the response to see what we're getting
			logger.debug(
				'InsightsService.generateProfileBasedWeeklyInsights() - Response:',
				JSON.stringify(response, null, 2)
			);

			// Handle double-nested response structure that the server actually returns
			let insightsArray: AIInsight[] = [];

			if (response.data) {
				// Check if response.data is a nested response object
				if (
					typeof response.data === 'object' &&
					response.data.success !== undefined
				) {
					// First level nesting
					if (response.data.data && Array.isArray(response.data.data)) {
						insightsArray = response.data.data;
					} else if (
						response.data.data &&
						typeof response.data.data === 'object' &&
						response.data.data.success !== undefined
					) {
						// Second level nesting
						if (
							response.data.data.data &&
							Array.isArray(response.data.data.data)
						) {
							insightsArray = response.data.data.data;
						}
					}
				} else if (Array.isArray(response.data)) {
					// Direct array
					insightsArray = response.data;
				}
			}

			if (!Array.isArray(insightsArray)) {
				logger.warn(
					'InsightsService.generateProfileBasedWeeklyInsights() - Data is not an array:',
					response.data
				);
				insightsArray = [];
			}

			logger.debug(
				'InsightsService.generateProfileBasedWeeklyInsights() - Final processed data:',
				insightsArray
			);

			return {
				success: response.success,
				data: insightsArray,
				error: response.error,
			};
		} catch (error) {
			logger.error(
				'InsightsService.generateProfileBasedWeeklyInsights() - Error:',
				error
			);
			throw error;
		}
	}

	// Mark insight as read
	static async markInsightAsRead(id: string): Promise<InsightDetailResponse> {
		return ApiService.put<AIInsight>(`/insights/read/${id}`, {});
	}

	// Get unread insights count
	static async getUnreadCount(): Promise<UnreadCountResponse> {
		return ApiService.get<{ unreadCount: number }>('/insights/unread/count');
	}

	// Refresh insights after actions are completed
	static async refreshInsightsAfterActions(
		period: 'daily' | 'weekly' | 'monthly'
	): Promise<InsightsResponse> {
		try {
			logger.debug(
				`InsightsService.refreshInsightsAfterActions(${period}) - Starting refresh...`
			);

			// First, try to generate new insights based on updated financial state
			const generateResponse = await this.generateInsights(period);

			if (
				generateResponse.success &&
				generateResponse.data &&
				Array.isArray(generateResponse.data)
			) {
				logger.debug(
					`InsightsService.refreshInsightsAfterActions(${period}) - Generated ${generateResponse.data.length} new insights`
				);
				return generateResponse;
			}

			// If generation fails, fall back to fetching existing insights
			logger.debug(
				`InsightsService.refreshInsightsAfterActions(${period}) - Generation failed, fetching existing insights`
			);
			return await this.getInsights(period);
		} catch (error) {
			logger.error(
				`InsightsService.refreshInsightsAfterActions(${period}) - Error:`,
				error
			);
			// Fall back to fetching existing insights
			return await this.getInsights(period);
		}
	}
}
