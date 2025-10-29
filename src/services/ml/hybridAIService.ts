import { SmartCacheService, CacheEntry } from '../utility/smartCacheService';
import { LocalMLService } from './localMLService';
import { ApiService } from '../core/apiService';
import { logger } from '../../utils/logger';

export interface AIRequest {
	type: 'categorization' | 'insight' | 'advice' | 'forecast' | 'analysis';
	query: string;
	data?: any;
	userId: string;
	priority: 'low' | 'medium' | 'high';
	context?: any;
}

export interface AIResponse {
	response: any;
	source: 'local' | 'cache' | 'ai' | 'hybrid';
	confidence: number;
	cost: number;
	processingTime: number;
	learningOpportunity: boolean;
}

export interface CostMetrics {
	totalRequests: number;
	localRequests: number;
	cachedRequests: number;
	aiRequests: number;
	estimatedSavings: number;
	averageCostPerRequest: number;
}

export interface PerformanceMetrics {
	averageResponseTime: number;
	successRate: number;
	errorRate: number;
	circuitBreakerState: 'closed' | 'open' | 'half-open';
	lastError?: string;
	lastErrorTime?: number;
}

export interface HealthStatus {
	status: 'healthy' | 'degraded' | 'unhealthy';
	services: {
		cache: boolean;
		localML: boolean;
		ai: boolean;
	};
	lastCheck: number;
	issues: string[];
}

export class HybridAIService {
	private static instance: HybridAIService;
	private cacheService = SmartCacheService.getInstance();
	private localMLService = LocalMLService.getInstance();
	private apiService = ApiService;
	private costTracker = new Map<string, number>();
	private requestCounts = {
		total: 0,
		local: 0,
		cached: 0,
		ai: 0,
	};
	private startTime: number = Date.now();

	// Performance monitoring
	private responseTimes: number[] = [];
	private errorCount = 0;
	private successCount = 0;
	private readonly MAX_RESPONSE_TIMES = 100; // Keep last 100 response times

	// Circuit breaker for AI service
	private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
	private circuitBreakerFailures = 0;
	private circuitBreakerLastFailure = 0;
	private readonly CIRCUIT_BREAKER_THRESHOLD = 5; // Open after 5 failures
	private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute timeout

	// Cost estimates (in USD)
	private readonly COST_ESTIMATES = {
		local: 0.0001, // Minimal processing cost
		cache: 0.00001, // Almost free
		ai: 0.01, // OpenAI API cost per request
		hybrid: 0.005, // Mixed approach
	};

	static getInstance(): HybridAIService {
		if (!HybridAIService.instance) {
			HybridAIService.instance = new HybridAIService();
		}
		return HybridAIService.instance;
	}

	/**
	 * Initialize hybrid AI service
	 */
	async initialize(): Promise<void> {
		try {
			logger.debug('[HybridAIService] Starting initialization...');

			// Add individual timeouts for each service
			const cacheInitPromise = this.cacheService.initialize().catch((error) => {
				logger.warn(
					'[HybridAIService] Cache service failed to initialize:',
					error
				);
				return null; // Don't fail completely
			});

			const mlInitPromise = this.localMLService.initialize().catch((error) => {
				logger.warn(
					'[HybridAIService] Local ML service failed to initialize:',
					error
				);
				return null; // Don't fail completely
			});

			// Wait for both services with individual error handling
			const results = await Promise.allSettled([
				cacheInitPromise,
				mlInitPromise,
			]);

			logger.debug(
				'[HybridAIService] Service initialization results:',
				results
			);

			// Check if at least one service initialized successfully
			const successfulServices = results.filter(
				(result) => result.status === 'fulfilled' && result.value !== null
			).length;

			if (successfulServices === 0) {
				logger.warn(
					'[HybridAIService] No services initialized successfully, but continuing'
				);
			} else {
				logger.debug(
					`[HybridAIService] ${successfulServices} out of 2 services initialized successfully`
				);
			}

			logger.debug('[HybridAIService] Initialization complete');
		} catch (error) {
			logger.error(
				'[HybridAIService] Critical error during initialization:',
				error
			);
			// Don't throw - let the service continue in degraded mode
		}
	}

	/**
	 * Process AI request using hybrid approach
	 */
	async processRequest(request: AIRequest): Promise<AIResponse> {
		const startTime = Date.now();

		try {
			logger.debug(
				`[HybridAIService] Processing ${
					request.type
				} request: ${request.query.substring(0, 50)}...`
			);

			// Check cache first
			const cachedResponse = await this.cacheService.getCachedResponse(
				request.query,
				request.userId,
				request.type as CacheEntry['category']
			);

			if (cachedResponse) {
				this.trackRequest('cache');
				const response = this.createResponse(
					cachedResponse,
					'cache',
					1.0,
					Date.now() - startTime,
					false
				);
				this.recordResponseTime(Date.now() - startTime, true);
				return response;
			}

			// Determine processing strategy
			const strategy = this.determineStrategy(request);

			let response: any;
			let source: AIResponse['source'];
			let confidence: number;
			let learningOpportunity = false;

			switch (strategy) {
				case 'local':
					response = await this.processLocally(request);
					source = 'local';
					confidence = response.confidence || 0.7;
					learningOpportunity = true;
					break;

				case 'ai':
					if (this.isCircuitBreakerOpen()) {
						logger.warn(
							'[HybridAIService] Circuit breaker is open, falling back to local processing'
						);
						response = await this.processLocally(request);
						source = 'local';
						confidence = response.confidence || 0.6;
						learningOpportunity = true;
					} else {
						try {
							response = await this.processWithAI(request);
							source = 'ai';
							confidence = response.confidence || 0.9;
							learningOpportunity = true;
							this.resetCircuitBreaker();
						} catch (error) {
							this.recordCircuitBreakerFailure();
							throw error;
						}
					}
					break;

				case 'hybrid':
					const localPromise = this.processLocally(request);
					let aiPromise: Promise<any> | null = null;

					if (!this.isCircuitBreakerOpen()) {
						aiPromise = this.processWithAI(request).catch((error) => {
							this.recordCircuitBreakerFailure();
							logger.warn(
								'[HybridAIService] AI processing failed in hybrid mode:',
								error
							);
							return null;
						});
					}

					const results = await Promise.allSettled([
						localPromise,
						...(aiPromise ? [aiPromise] : []),
					]);

					const localResult =
						results[0].status === 'fulfilled' ? results[0].value : null;
					const aiResult =
						results[1]?.status === 'fulfilled' ? results[1].value : null;

					if (localResult && aiResult) {
						response = this.combineResults(localResult, aiResult);
						source = 'hybrid';
						confidence = Math.max(
							localResult.confidence || 0,
							aiResult.confidence || 0
						);
					} else if (localResult) {
						response = localResult;
						source = 'local';
						confidence = localResult.confidence || 0.7;
					} else if (aiResult) {
						response = aiResult;
						source = 'ai';
						confidence = aiResult.confidence || 0.9;
					} else {
						throw new Error('Both local and AI processing failed');
					}

					learningOpportunity = true;
					break;

				default:
					throw new Error(`Unknown strategy: ${strategy}`);
			}

			// Cache the response for future use
			if (confidence > 0.7) {
				await this.cacheService.cacheResponse(
					request.query,
					response,
					request.userId,
					request.type as CacheEntry['category'],
					confidence
				);
			}

			// Track request metrics
			this.trackRequest(source);
			this.recordResponseTime(Date.now() - startTime, true);

			return this.createResponse(
				response,
				source,
				confidence,
				Date.now() - startTime,
				learningOpportunity
			);
		} catch (error) {
			logger.error('[HybridAIService] Error processing request:', error);
			this.recordResponseTime(Date.now() - startTime, false);

			// Fallback to local processing
			try {
				const fallbackResponse = await this.processLocally(request);
				this.trackRequest('local');
				this.recordResponseTime(Date.now() - startTime, true);

				return this.createResponse(
					fallbackResponse,
					'local',
					fallbackResponse.confidence || 0.5,
					Date.now() - startTime,
					true
				);
			} catch (fallbackError) {
				logger.error('[HybridAIService] Fallback also failed:', fallbackError);
				this.recordResponseTime(Date.now() - startTime, false);
				throw error;
			}
		}
	}

	/**
	 * Determine the best processing strategy for a request
	 */
	private determineStrategy(request: AIRequest): 'local' | 'ai' | 'hybrid' {
		const { type, priority } = request;

		// High priority requests always use AI for best quality
		if (priority === 'high') {
			return 'ai';
		}

		// Categorization requests can often be handled locally
		if (type === 'categorization') {
			const localConfidence = this.estimateLocalConfidence(request);
			if (localConfidence > 0.8) {
				return 'local';
			} else if (localConfidence > 0.6) {
				return 'hybrid';
			}
		}

		// Complex analysis requests benefit from AI
		if (type === 'analysis' || type === 'insight') {
			return 'ai';
		}

		// Forecast and advice can use hybrid approach
		if (type === 'forecast' || type === 'advice') {
			return 'hybrid';
		}

		// Default to hybrid for balanced approach
		return 'hybrid';
	}

	/**
	 * Estimate confidence of local processing
	 */
	private estimateLocalConfidence(request: AIRequest): number {
		const { type, data } = request;

		if (type === 'categorization' && data?.description) {
			// Check if we have vendor patterns for this transaction
			const vendor = this.extractVendorFromDescription(data.description);
			// Check if we have learned patterns for this vendor
			const hasVendorPattern = this.localMLService.hasVendorPattern(vendor);
			return hasVendorPattern ? 0.8 : 0.6;
		}

		if (type === 'forecast') {
			// Local forecasting confidence depends on data availability
			return data?.transactions?.length > 10 ? 0.8 : 0.4;
		}

		return 0.5; // Default confidence
	}

	/**
	 * Extract vendor from transaction description
	 */
	private extractVendorFromDescription(description: string): string {
		// Simple vendor extraction - can be enhanced
		const words = description.toLowerCase().split(/\s+/);
		// Look for common vendor indicators
		const vendorKeywords = [
			'inc',
			'llc',
			'corp',
			'ltd',
			'co',
			'store',
			'shop',
			'market',
		];

		for (let i = 0; i < words.length - 1; i++) {
			if (vendorKeywords.some((keyword) => words[i + 1]?.includes(keyword))) {
				return words[i];
			}
		}

		// Fallback to first word if no pattern found
		return words[0] || 'unknown';
	}

	/**
	 * Process request using local ML
	 */
	private async processLocally(request: AIRequest): Promise<any> {
		const { type, data, userId } = request;

		switch (type) {
			case 'categorization':
				if (data?.description && data?.amount) {
					return await this.localMLService.categorizeTransaction(
						data.description,
						data.amount,
						userId,
						data.budgets || []
					);
				}
				break;

			case 'forecast':
				if (data?.transactions) {
					return await this.localMLService.analyzeSpendingPatterns(
						data.transactions,
						userId
					);
				}
				break;

			case 'insight':
				// Generate simple insights from local data
				return this.generateLocalInsights(data, userId);
		}

		throw new Error(`Local processing not supported for type: ${type}`);
	}

	/**
	 * Process request using external AI
	 */
	private async processWithAI(request: AIRequest): Promise<any> {
		const { type, query, data, userId } = request;

		try {
			// Use existing AI service
			if (type === 'categorization') {
				return await this.apiService.post('/api/ai/categorize', {
					transaction: data,
					userId,
				});
			}

			if (type === 'insight' || type === 'advice') {
				return await this.apiService.post('/api/ai/query', {
					query,
					context: data,
					userId,
				});
			}

			if (type === 'forecast') {
				return await this.apiService.post('/api/ai/forecast', {
					transactions: data.transactions,
					userId,
				});
			}

			throw new Error(`AI processing not supported for type: ${type}`);
		} catch (error) {
			logger.error('[HybridAIService] AI processing failed:', error);
			throw error;
		}
	}

	/**
	 * Combine local and AI results
	 */
	private combineResults(localResult: any, aiResult: any): any {
		// For categorization, use AI result if confidence is higher
		if (localResult.category && aiResult.category) {
			if (aiResult.confidence > localResult.confidence) {
				return {
					...aiResult,
					localSuggestion: localResult.category,
					confidence: Math.max(localResult.confidence, aiResult.confidence),
				};
			} else {
				return {
					...localResult,
					aiSuggestion: aiResult.category,
					confidence: Math.max(localResult.confidence, aiResult.confidence),
				};
			}
		}

		// For other types, merge insights
		return {
			localInsights: localResult,
			aiInsights: aiResult,
			combined: this.mergeInsights(localResult, aiResult),
		};
	}

	/**
	 * Merge insights from different sources
	 */
	private mergeInsights(local: any, ai: any): any {
		// Simple merging logic - can be enhanced
		if (Array.isArray(local) && Array.isArray(ai)) {
			return [...local, ...ai];
		}

		if (typeof local === 'object' && typeof ai === 'object') {
			return { ...local, ...ai };
		}

		return { local, ai };
	}

	/**
	 * Generate local insights without AI
	 */
	private generateLocalInsights(data: any, userId: string): any {
		const insights = [];

		if (data?.transactions) {
			const totalSpending = data.transactions.reduce(
				(sum: number, t: any) => sum + t.amount,
				0
			);
			const avgSpending = totalSpending / data.transactions.length;

			if (avgSpending > 100) {
				insights.push({
					type: 'warning',
					message:
						'Your average transaction amount is high. Consider reviewing large purchases.',
					confidence: 0.8,
				});
			}

			// Add more local insights based on spending patterns
			const weekendSpending = data.transactions.filter((t: any) => {
				const day = new Date(t.date).getDay();
				return day === 0 || day === 6;
			});

			if (weekendSpending.length > data.transactions.length * 0.4) {
				insights.push({
					type: 'info',
					message:
						'You tend to spend more on weekends. Consider weekday alternatives.',
					confidence: 0.7,
				});
			}
		}

		return {
			insights,
			source: 'local',
			confidence: 0.7,
		};
	}

	/**
	 * Track request metrics for cost analysis
	 */
	private trackRequest(source: AIResponse['source']): void {
		this.requestCounts.total++;

		switch (source) {
			case 'local':
				this.requestCounts.local++;
				break;
			case 'cache':
				this.requestCounts.cached++;
				break;
			case 'ai':
				this.requestCounts.ai++;
				break;
			case 'hybrid':
				this.requestCounts.ai++; // Count as AI request
				break;
		}
	}

	/**
	 * Create standardized response
	 */
	private createResponse(
		response: any,
		source: AIResponse['source'],
		confidence: number,
		processingTime: number,
		learningOpportunity: boolean
	): AIResponse {
		const cost = this.COST_ESTIMATES[source];

		return {
			response,
			source,
			confidence,
			cost,
			processingTime,
			learningOpportunity,
		};
	}

	/**
	 * Get cost metrics and savings analysis
	 */
	getCostMetrics(): CostMetrics {
		const totalRequests = this.requestCounts.total;
		const localRequests = this.requestCounts.local;
		const cachedRequests = this.requestCounts.cached;
		const aiRequests = this.requestCounts.ai;

		const totalCost =
			localRequests * this.COST_ESTIMATES.local +
			cachedRequests * this.COST_ESTIMATES.cache +
			aiRequests * this.COST_ESTIMATES.ai;

		// Estimate what it would cost if all requests used AI
		const estimatedAICost = totalRequests * this.COST_ESTIMATES.ai;
		const estimatedSavings = estimatedAICost - totalCost;

		return {
			totalRequests,
			localRequests,
			cachedRequests,
			aiRequests,
			estimatedSavings,
			averageCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
		};
	}

	/**
	 * Get service health and performance metrics
	 */
	getServiceMetrics(): {
		cacheStats: any;
		mlStats: any;
		costMetrics: CostMetrics;
		uptime: number;
	} {
		try {
			return {
				cacheStats: this.cacheService.getCacheStats(),
				mlStats: this.localMLService.getModelMetrics(),
				costMetrics: this.getCostMetrics(),
				uptime: Date.now() - this.startTime,
			};
		} catch (error) {
			logger.error('[HybridAIService] Error getting service metrics:', error);
			// Return safe defaults
			return {
				cacheStats: {
					totalEntries: 0,
					hitRate: 0,
					memoryUsage: 0,
					userPatterns: 0,
				},
				mlStats: {
					totalVendorPatterns: 0,
					totalCategoryPatterns: 0,
					averageConfidence: 0,
					learningProgress: 0,
				},
				costMetrics: {
					totalRequests: 0,
					localRequests: 0,
					cachedRequests: 0,
					aiRequests: 0,
					estimatedSavings: 0,
					averageCostPerRequest: 0,
				},
				uptime: 0,
			};
		}
	}

	/**
	 * Learn from user feedback to improve future predictions
	 */
	async learnFromFeedback(
		requestId: string,
		originalResponse: AIResponse,
		userFeedback: any,
		userId: string
	): Promise<void> {
		try {
			// Update local ML models
			if (originalResponse.learningOpportunity) {
				await this.localMLService.learnFromFeedback(
					requestId,
					originalResponse.response,
					userFeedback.correctCategory || userFeedback.feedback,
					userId
				);
			}

			// Update cache with corrected responses
			if (userFeedback.correctResponse) {
				await this.cacheService.cacheResponse(
					originalResponse.response.query || requestId,
					userFeedback.correctResponse,
					userId,
					'categorization' as CacheEntry['category'],
					0.9 // High confidence for user-corrected responses
				);
			}

			logger.debug(
				`[HybridAIService] Learned from feedback for request: ${requestId}`
			);
		} catch (error) {
			logger.error('[HybridAIService] Error learning from feedback:', error);
		}
	}

	/**
	 * Record response time and success/failure for performance monitoring
	 */
	private recordResponseTime(responseTime: number, success: boolean): void {
		// Add response time to rolling window
		this.responseTimes.push(responseTime);
		if (this.responseTimes.length > this.MAX_RESPONSE_TIMES) {
			this.responseTimes.shift();
		}

		// Update success/error counts
		if (success) {
			this.successCount++;
		} else {
			this.errorCount++;
		}
	}

	/**
	 * Check if circuit breaker is open
	 */
	private isCircuitBreakerOpen(): boolean {
		if (this.circuitBreakerState === 'open') {
			// Check if timeout has passed
			if (
				Date.now() - this.circuitBreakerLastFailure >
				this.CIRCUIT_BREAKER_TIMEOUT
			) {
				this.circuitBreakerState = 'half-open';
				return false;
			}
			return true;
		}
		return false;
	}

	/**
	 * Record a circuit breaker failure
	 */
	private recordCircuitBreakerFailure(): void {
		this.circuitBreakerFailures++;
		this.circuitBreakerLastFailure = Date.now();

		if (this.circuitBreakerFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
			this.circuitBreakerState = 'open';
			logger.warn('[HybridAIService] Circuit breaker opened due to failures');
		}
	}

	/**
	 * Reset circuit breaker after successful request
	 */
	private resetCircuitBreaker(): void {
		if (this.circuitBreakerState === 'half-open') {
			this.circuitBreakerState = 'closed';
			this.circuitBreakerFailures = 0;
			logger.debug('[HybridAIService] Circuit breaker reset to closed');
		}
	}

	/**
	 * Get performance metrics
	 */
	getPerformanceMetrics(): PerformanceMetrics {
		const totalRequests = this.successCount + this.errorCount;
		const averageResponseTime =
			this.responseTimes.length > 0
				? this.responseTimes.reduce((sum, time) => sum + time, 0) /
				  this.responseTimes.length
				: 0;

		const successRate =
			totalRequests > 0 ? this.successCount / totalRequests : 0;
		const errorRate = totalRequests > 0 ? this.errorCount / totalRequests : 0;

		return {
			averageResponseTime,
			successRate,
			errorRate,
			circuitBreakerState: this.circuitBreakerState,
			lastError: this.errorCount > 0 ? 'See logs for details' : undefined,
			lastErrorTime: this.errorCount > 0 ? Date.now() : undefined,
		};
	}

	/**
	 * Get health status of all services
	 */
	async getHealthStatus(): Promise<HealthStatus> {
		const issues: string[] = [];
		let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

		// Check cache service
		let cacheHealthy = true;
		try {
			await this.cacheService.getCacheStats();
		} catch {
			cacheHealthy = false;
			issues.push('Cache service unavailable');
		}

		// Check local ML service
		let localMLHealthy = true;
		try {
			await this.localMLService.getModelMetrics();
		} catch {
			localMLHealthy = false;
			issues.push('Local ML service unavailable');
		}

		// Check AI service (circuit breaker state)
		const aiHealthy = !this.isCircuitBreakerOpen();
		if (!aiHealthy) {
			issues.push('AI service circuit breaker is open');
		}

		// Determine overall status
		if (!cacheHealthy && !localMLHealthy) {
			status = 'unhealthy';
		} else if (!cacheHealthy || !localMLHealthy || !aiHealthy) {
			status = 'degraded';
		}

		return {
			status,
			services: {
				cache: cacheHealthy,
				localML: localMLHealthy,
				ai: aiHealthy,
			},
			lastCheck: Date.now(),
			issues,
		};
	}
}

export default HybridAIService;
