import { ApiService } from './apiService';

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
	actionItems: Array<{
		title: string;
		description: string;
		completed: boolean;
	}>;
	metadata: {
		totalIncome: number;
		totalExpenses: number;
		netIncome: number;
		topCategories: Array<{
			name: string;
			amount: number;
			percentage: number;
		}>;
		comparisonPeriod: string;
		percentageChange: number;
		historicalComparison?: {
			previousPeriod: {
				totalIncome: number;
				totalExpenses: number;
				netIncome: number;
				topCategories: Array<{
					name: string;
					amount: number;
					percentage: number;
				}>;
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
		const response = await ApiService.get<AIInsight[]>(`/insights/${period}`);

		// Debug: Log the response to see what we're getting
		console.log(
			`InsightsService.getInsights(${period}) - Response:`,
			JSON.stringify(response, null, 2)
		);

		// Handle double-nested response structure
		let arr: any = response.data;

		// First level: check if response.data is a nested response object
		if (arr && typeof arr === 'object' && arr.success !== undefined) {
			// Second level: check if arr.data is the actual array or another nested response
			if (arr.data && Array.isArray(arr.data)) {
				arr = arr.data;
			} else if (
				arr.data &&
				typeof arr.data === 'object' &&
				arr.data.success !== undefined
			) {
				// Handle double-nested case
				if (Array.isArray(arr.data.data)) {
					arr = arr.data.data;
				} else {
					arr = [];
				}
			} else {
				arr = [];
			}
		}

		if (!Array.isArray(arr)) {
			console.warn(
				`InsightsService.getInsights(${period}) - Data is not an array:`,
				response.data
			);
			arr = [];
		}
		response.data = arr;

		return response;
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
			console.log(
				`InsightsService.generateInsights(${period}) - Starting generation...`
			);

			const response = await ApiService.post<AIInsight[]>(
				`/insights/generate/${period}`,
				{}
			);

			// Debug: Log the response to see what we're getting
			console.log(
				`InsightsService.generateInsights(${period}) - Response:`,
				JSON.stringify(response, null, 2)
			);

			// Handle double-nested response structure
			let arr: any = response.data;

			// First level: check if response.data is a nested response object
			if (arr && typeof arr === 'object' && arr.success !== undefined) {
				// Second level: check if arr.data is the actual array or another nested response
				if (arr.data && Array.isArray(arr.data)) {
					arr = arr.data;
				} else if (
					arr.data &&
					typeof arr.data === 'object' &&
					arr.data.success !== undefined
				) {
					// Handle double-nested case
					if (Array.isArray(arr.data.data)) {
						arr = arr.data.data;
					} else {
						arr = [];
					}
				} else {
					arr = [];
				}
			}

			if (!Array.isArray(arr)) {
				console.warn(
					`InsightsService.generateInsights(${period}) - Data is not an array:`,
					response.data
				);
				arr = [];
			}
			response.data = arr;

			console.log(
				`InsightsService.generateInsights(${period}) - Final processed data:`,
				arr
			);
			return response;
		} catch (error) {
			console.error(
				`InsightsService.generateInsights(${period}) - Error:`,
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
}
