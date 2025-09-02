import { API_BASE_URL } from '../config/api';

export interface FactPack {
	specVersion: '1.0';
	userId: string;
	generatedAt: string;
	time_window: {
		start: string;
		end: string;
		tz: string;
	};
	balances: Array<{
		id: string;
		accountId: string;
		name: string;
		current: number;
		asOf: string;
		evidence: string[];
	}>;
	budgets: Array<{
		id: string;
		category: string;
		period: string;
		cycleStartDay: number;
		spent: number;
		limit: number;
		remaining: number;
		transactionsCount: number;
		evidence: string[];
	}>;
	recurring: Array<{
		id: string;
		name: string;
		amount: number;
		cycle: 'monthly' | 'weekly' | 'quarterly' | 'yearly';
		nextDue: string;
		lastPaid?: string;
		evidence: string[];
	}>;
	forecasts?: Array<{
		id: string;
		target: 'budget' | 'account';
		targetRef: string;
		method: 'pace_linear_v1';
		estimateEndOfPeriod: number;
		assumptions: {
			elapsedDays: number;
			totalDays: number;
			seasonality?: 'none';
		};
	}>;
	notes?: string[];
	hash: string;
}

export interface GroundedAIResponse {
	response: string;
	factPack: FactPack;
	cacheHit: boolean;
	evidence: string[];
}

export class GroundedAIService {
	static async query(
		userId: string,
		query: string,
		intent: string,
		slots?: Record<string, string>,
		options: {
			tz?: string;
			year?: number;
			month?: number;
			includeForecasts?: boolean;
		} = {}
	): Promise<GroundedAIResponse> {
		try {
			const response = await fetch(`${API_BASE_URL}/api/grounded-ai/query`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					userId,
					query,
					intent,
					slots,
					options,
				}),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			return data.data;
		} catch (error) {
			console.error('Error querying grounded AI:', error);
			throw error;
		}
	}

	static async getFactPack(
		userId: string,
		options: {
			tz?: string;
			year?: number;
			month?: number;
			includeForecasts?: boolean;
		} = {}
	): Promise<FactPack> {
		try {
			const params = new URLSearchParams();
			if (options.tz) params.append('tz', options.tz);
			if (options.year) params.append('year', options.year.toString());
			if (options.month) params.append('month', options.month.toString());
			if (options.includeForecasts) params.append('includeForecasts', 'true');

			const response = await fetch(
				`${API_BASE_URL}/api/grounded-ai/factpack/${userId}?${params.toString()}`,
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
					},
				}
			);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			return data.data;
		} catch (error) {
			console.error('Error fetching FactPack:', error);
			throw error;
		}
	}
}
