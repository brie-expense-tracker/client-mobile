import { API_BASE_URL } from '../config/api';
import { SmartCacheService } from './utility/smartCacheService';

export interface FactPack {
	specVersion: '1.0';
	userId: string;
	generatedAt: string;
	time_window: {
		start: string;
		end: string;
		tz: string;
	};
	balances: {
		id: string;
		accountId: string;
		name: string;
		current: number;
		asOf: string;
		evidence: string[];
	}[];
	budgets: {
		id: string;
		category: string;
		period: string;
		cycleStartDay: number;
		spent: number;
		limit: number;
		remaining: number;
		transactionsCount: number;
		evidence: string[];
	}[];
	recurring: {
		id: string;
		name: string;
		amount: number;
		cycle: 'monthly' | 'weekly' | 'quarterly' | 'yearly';
		nextDue: string;
		lastPaid?: string;
		evidence: string[];
	}[];
	forecasts?: {
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
	}[];
	notes?: string[];
	hash: string;
}

export interface GroundedAIResponse {
	response: string;
	factPack: FactPack;
	cacheHit: boolean;
	evidence: string[];
	processingTime?: number;
	confidence?: number;
	requestId?: string;
}

export interface QueryOptions {
	tz?: string;
	year?: number;
	month?: number;
	includeForecasts?: boolean;
	timeout?: number;
	useCache?: boolean;
	retryAttempts?: number;
}

export interface ServiceMetrics {
	totalQueries: number;
	cacheHits: number;
	cacheMisses: number;
	averageResponseTime: number;
	errorRate: number;
	lastQueryTime?: number;
}

export interface ErrorDetails {
	code: string;
	message: string;
	timestamp: number;
	requestId?: string;
	retryable: boolean;
}

export class GroundedAIService {
	private static instance: GroundedAIService;
	private cacheService = SmartCacheService.getInstance();
	private metrics: ServiceMetrics = {
		totalQueries: 0,
		cacheHits: 0,
		cacheMisses: 0,
		averageResponseTime: 0,
		errorRate: 0,
	};
	private responseTimes: number[] = [];
	private errorCount = 0;
	private readonly MAX_RESPONSE_TIMES = 100;
	private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
	private readonly DEFAULT_RETRY_ATTEMPTS = 3;

	static getInstance(): GroundedAIService {
		if (!GroundedAIService.instance) {
			GroundedAIService.instance = new GroundedAIService();
		}
		return GroundedAIService.instance;
	}

	/**
	 * Query grounded AI with enhanced error handling and caching
	 */
	async query(
		userId: string,
		query: string,
		intent: string,
		slots?: Record<string, string>,
		options: QueryOptions = {}
	): Promise<GroundedAIResponse> {
		const startTime = Date.now();
		const requestId = this.generateRequestId();
		const cacheKey = this.generateCacheKey(userId, query, intent, options);

		// Validate inputs
		this.validateQueryInputs(userId, query, intent);

		try {
			// Check cache first if enabled
			if (options.useCache !== false) {
				const cachedResponse = await this.getCachedResponse(cacheKey);
				if (cachedResponse) {
					this.recordMetrics(Date.now() - startTime, true);
					return {
						...cachedResponse,
						cacheHit: true,
						requestId,
					};
				}
			}

			// Make API request with timeout and retry logic
			const response = await this.makeRequestWithRetry(
				`${API_BASE_URL}/api/grounded-ai/query`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						userId,
						query,
						intent,
						slots,
						options: this.sanitizeOptions(options),
					}),
				},
				options.timeout || this.DEFAULT_TIMEOUT,
				options.retryAttempts || this.DEFAULT_RETRY_ATTEMPTS
			);

			const data = await response.json();
			const result: GroundedAIResponse = {
				...data.data,
				processingTime: Date.now() - startTime,
				requestId,
			};

			// Cache successful response
			if (options.useCache !== false && result.response) {
				await this.cacheResponse(cacheKey, result);
			}

			this.recordMetrics(Date.now() - startTime, true);
			return result;
		} catch (error) {
			this.recordMetrics(Date.now() - startTime, false);
			const errorDetails = this.createErrorDetails(error, requestId);
			console.error('[GroundedAIService] Query failed:', errorDetails);
			throw new Error(`Grounded AI query failed: ${errorDetails.message}`);
		}
	}

	/**
	 * Get fact pack with caching and validation
	 */
	async getFactPack(
		userId: string,
		options: QueryOptions = {}
	): Promise<FactPack> {
		const startTime = Date.now();
		const requestId = this.generateRequestId();
		const cacheKey = `factpack_${userId}_${JSON.stringify(options)}`;

		// Validate inputs
		if (!userId || typeof userId !== 'string') {
			throw new Error('Valid userId is required');
		}

		try {
			// Check cache first if enabled
			if (options.useCache !== false) {
				const cachedFactPack = await this.getCachedFactPack(cacheKey);
				if (cachedFactPack) {
					this.recordMetrics(Date.now() - startTime, true);
					return cachedFactPack;
				}
			}

			// Build query parameters
			const params = new URLSearchParams();
			if (options.tz) params.append('tz', options.tz);
			if (options.year) params.append('year', options.year.toString());
			if (options.month) params.append('month', options.month.toString());
			if (options.includeForecasts) params.append('includeForecasts', 'true');

			const url = `${API_BASE_URL}/api/grounded-ai/factpack/${userId}?${params.toString()}`;

			// Make API request with timeout and retry logic
			const response = await this.makeRequestWithRetry(
				url,
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
					},
				},
				options.timeout || this.DEFAULT_TIMEOUT,
				options.retryAttempts || this.DEFAULT_RETRY_ATTEMPTS
			);

			const data = await response.json();
			const factPack: FactPack = data.data;

			// Validate fact pack structure
			this.validateFactPack(factPack);

			// Cache successful response
			if (options.useCache !== false) {
				await this.cacheFactPack(cacheKey, factPack);
			}

			this.recordMetrics(Date.now() - startTime, true);
			return factPack;
		} catch (error) {
			this.recordMetrics(Date.now() - startTime, false);
			const errorDetails = this.createErrorDetails(error, requestId);
			console.error('[GroundedAIService] FactPack fetch failed:', errorDetails);
			throw new Error(`FactPack fetch failed: ${errorDetails.message}`);
		}
	}

	/**
	 * Get service metrics
	 */
	getMetrics(): ServiceMetrics {
		return { ...this.metrics };
	}

	/**
	 * Reset metrics (useful for testing)
	 */
	resetMetrics(): void {
		this.metrics = {
			totalQueries: 0,
			cacheHits: 0,
			cacheMisses: 0,
			averageResponseTime: 0,
			errorRate: 0,
		};
		this.responseTimes = [];
		this.errorCount = 0;
	}

	// Private helper methods

	private validateQueryInputs(
		userId: string,
		query: string,
		intent: string
	): void {
		if (!userId || typeof userId !== 'string') {
			throw new Error('Valid userId is required');
		}
		if (!query || typeof query !== 'string' || query.trim().length === 0) {
			throw new Error('Valid query is required');
		}
		if (!intent || typeof intent !== 'string') {
			throw new Error('Valid intent is required');
		}
	}

	private validateFactPack(factPack: any): void {
		if (!factPack || typeof factPack !== 'object') {
			throw new Error('Invalid fact pack structure');
		}
		if (!factPack.userId || !factPack.generatedAt || !factPack.hash) {
			throw new Error('Fact pack missing required fields');
		}
	}

	private sanitizeOptions(options: QueryOptions): QueryOptions {
		const sanitized = { ...options };
		// Remove internal options that shouldn't be sent to API
		delete sanitized.timeout;
		delete sanitized.useCache;
		delete sanitized.retryAttempts;
		return sanitized;
	}

	private generateRequestId(): string {
		return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private generateCacheKey(
		userId: string,
		query: string,
		intent: string,
		options: QueryOptions
	): string {
		const keyData = {
			userId,
			query: query.trim().toLowerCase(),
			intent,
			options: this.sanitizeOptions(options),
		};
		return `grounded_ai_${Buffer.from(JSON.stringify(keyData)).toString(
			'base64'
		)}`;
	}

	private async makeRequestWithRetry(
		url: string,
		options: RequestInit,
		timeout: number,
		maxRetries: number
	): Promise<Response> {
		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), timeout);

				const response = await fetch(url, {
					...options,
					signal: controller.signal,
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				return response;
			} catch (error: any) {
				lastError = error;

				// Don't retry on certain errors
				if (error.name === 'AbortError' || error.message.includes('400')) {
					break;
				}

				// Wait before retry (exponential backoff)
				if (attempt < maxRetries) {
					const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		throw lastError || new Error('Request failed after all retries');
	}

	private async getCachedResponse(
		cacheKey: string
	): Promise<GroundedAIResponse | null> {
		try {
			const cached = await this.cacheService.getCachedResponse(
				cacheKey,
				'',
				'INSIGHT' // Use INSIGHT category for grounded AI responses
			);
			return cached as GroundedAIResponse | null;
		} catch {
			return null;
		}
	}

	private async cacheResponse(
		cacheKey: string,
		response: GroundedAIResponse
	): Promise<void> {
		try {
			await this.cacheService.cacheResponse(
				cacheKey,
				response,
				response.factPack.userId,
				'INSIGHT',
				0.8 // High confidence for grounded AI responses
			);
		} catch (error) {
			console.warn('[GroundedAIService] Failed to cache response:', error);
		}
	}

	private async getCachedFactPack(cacheKey: string): Promise<FactPack | null> {
		try {
			const cached = await this.cacheService.getCachedResponse(
				cacheKey,
				'',
				'INSIGHT'
			);
			return cached as FactPack | null;
		} catch {
			return null;
		}
	}

	private async cacheFactPack(
		cacheKey: string,
		factPack: FactPack
	): Promise<void> {
		try {
			await this.cacheService.cacheResponse(
				cacheKey,
				factPack,
				factPack.userId,
				'INSIGHT',
				0.9 // Very high confidence for fact packs
			);
		} catch (error) {
			console.warn('[GroundedAIService] Failed to cache fact pack:', error);
		}
	}

	private recordMetrics(responseTime: number, success: boolean): void {
		this.metrics.totalQueries++;
		this.metrics.lastQueryTime = Date.now();

		// Record response time
		this.responseTimes.push(responseTime);
		if (this.responseTimes.length > this.MAX_RESPONSE_TIMES) {
			this.responseTimes.shift();
		}

		// Update average response time
		this.metrics.averageResponseTime =
			this.responseTimes.reduce((sum, time) => sum + time, 0) /
			this.responseTimes.length;

		// Update error rate
		if (!success) {
			this.errorCount++;
		}
		this.metrics.errorRate = this.errorCount / this.metrics.totalQueries;

		// Update cache metrics
		if (success) {
			// This is a simplified approach - in a real implementation,
			// you'd track cache hits/misses more precisely
			this.metrics.cacheMisses++;
		}
	}

	private createErrorDetails(error: any, requestId?: string): ErrorDetails {
		const isRetryable =
			error.name !== 'AbortError' &&
			!error.message?.includes('400') &&
			!error.message?.includes('401') &&
			!error.message?.includes('403');

		return {
			code: error.name || 'UNKNOWN_ERROR',
			message: error.message || 'An unknown error occurred',
			timestamp: Date.now(),
			requestId,
			retryable: isRetryable,
		};
	}
}
