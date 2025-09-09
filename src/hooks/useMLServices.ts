import { useState, useCallback, useEffect, useContext } from 'react';
import {
	HybridAIService,
	AIRequest,
	AIResponse,
	SmartCacheService,
	InsightsService,
	BudgetAnalysisService,
	type AIInsight,
	type BudgetAnalysis,
} from '../services';
import { useBudget } from '../context/budgetContext';
import { useGoal } from '../context/goalContext';
import { TransactionContext } from '../context/transactionContext';
import useAuth from '../context/AuthContext';

export interface MLInsight {
	type:
		| 'recommendation'
		| 'warning'
		| 'info'
		| 'suggestion'
		| 'budget'
		| 'goal'
		| 'spending'
		| 'pattern';
	title: string;
	message: string;
	confidence: number;
	actionable: boolean;
}

export interface MLServiceStatus {
	isInitialized: boolean;
	isLearning: boolean;
	cacheHitRate: number;
	localMLConfidence: number;
	costSavings: number;
	totalRequests: number;
	lastError?: string;
	lastErrorTime?: Date;
	retryCount: number;
}

export const useMLServices = () => {
	const { user } = useAuth();
	const { budgets } = useBudget();
	const { goals } = useGoal();
	const { transactions } = useContext(TransactionContext);

	console.log('[useMLServices] Hook initialized with:', {
		hasUser: !!user,
		userId: user?._id,
		hasBudgets: !!budgets,
		hasGoals: !!goals,
		hasTransactions: !!transactions,
	});

	const [status, setStatus] = useState<MLServiceStatus>({
		isInitialized: false,
		isLearning: false,
		cacheHitRate: 0,
		localMLConfidence: 0,
		costSavings: 0,
		totalRequests: 0,
		retryCount: 0,
	});

	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	/**
	 * Initialize ML services
	 */
	const initializeML = useCallback(async () => {
		if (!user?._id) {
			console.log('[useMLServices] No user ID, skipping initialization');
			return;
		}

		try {
			setIsLoading(true);
			setError(null);

			console.log('[useMLServices] Starting ML services initialization...');
			console.log('[useMLServices] User ID:', user._id);

			// Add timeout to prevent hanging
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(
					() => reject(new Error('ML initialization timeout after 10 seconds')),
					10000
				);
			});

			const initPromise = HybridAIService.getInstance().initialize();

			try {
				console.log('[useMLServices] Waiting for service initialization...');
				await Promise.race([initPromise, timeoutPromise]);
				console.log('[useMLServices] HybridAIService initialized successfully');
			} catch (initError) {
				console.warn(
					'[useMLServices] Service initialization had issues, but continuing:',
					initError
				);
				// Continue with partial initialization
			}

			// Update status
			try {
				const metrics = HybridAIService.getInstance().getServiceMetrics();
				console.log('[useMLServices] Got service metrics:', metrics);

				setStatus((prev) => ({
					...prev,
					isInitialized: true,
					cacheHitRate: metrics.cacheStats.hitRate,
					localMLConfidence: metrics.mlStats.averageConfidence,
					costSavings: metrics.costMetrics.estimatedSavings,
					totalRequests: metrics.costMetrics.totalRequests,
				}));
			} catch (metricsError) {
				console.warn(
					'[useMLServices] Could not get metrics, using defaults:',
					metricsError
				);
				// Set default status to allow the UI to work
				setStatus((prev) => ({
					...prev,
					isInitialized: true,
					cacheHitRate: 0,
					localMLConfidence: 0.5,
					costSavings: 0,
					totalRequests: 0,
				}));
			}

			console.log('[useMLServices] ML services initialization complete');
		} catch (err) {
			console.error(
				'[useMLServices] Critical error during initialization:',
				err
			);
			setError(
				err instanceof Error ? err.message : 'Failed to initialize ML services'
			);

			// Even on critical error, try to set a basic initialized state
			try {
				setStatus((prev) => ({
					...prev,
					isInitialized: true,
					cacheHitRate: 0,
					localMLConfidence: 0.3,
					costSavings: 0,
					totalRequests: 0,
				}));
				console.log('[useMLServices] Set fallback initialized state');
			} catch (fallbackError) {
				console.error(
					'[useMLServices] Failed to set fallback state:',
					fallbackError
				);
			}
		} finally {
			setIsLoading(false);
			console.log('[useMLServices] Initialization process finished');
		}
	}, [user?._id]);

	/**
	 * Reset error state and allow re-initialization
	 */
	const reset = useCallback(() => {
		setError(null);
		setStatus((prev) => ({
			...prev,
			isInitialized: false,
			retryCount: 0,
			lastError: undefined,
			lastErrorTime: undefined,
		}));
	}, []);

	/**
	 * Handle errors with retry logic
	 */
	const handleError = useCallback((error: Error, context: string) => {
		const errorMessage = `${context}: ${error.message}`;
		console.error(`[useMLServices] ${errorMessage}`, error);

		setError(errorMessage);
		setStatus((prev) => ({
			...prev,
			lastError: errorMessage,
			lastErrorTime: new Date(),
			retryCount: prev.retryCount + 1,
		}));
	}, []);

	/**
	 * Retry initialization with exponential backoff
	 */
	const retryInitialization = useCallback(async () => {
		if (status.retryCount >= 3) {
			console.warn('[useMLServices] Max retry attempts reached');
			return;
		}

		const delay = Math.pow(2, status.retryCount) * 1000; // Exponential backoff
		console.log(
			`[useMLServices] Retrying initialization in ${delay}ms (attempt ${
				status.retryCount + 1
			})`
		);

		setTimeout(() => {
			initializeML();
		}, delay);
	}, [status.retryCount, initializeML]);

	/**
	 * Get insights from ML services
	 */
	const getInsights = useCallback(
		async (
			query: string,
			priority: 'low' | 'medium' | 'high' = 'medium'
		): Promise<MLInsight[]> => {
			if (!user?._id || !status.isInitialized) {
				throw new Error('ML services not initialized');
			}

			try {
				const request: AIRequest = {
					type: 'insight',
					query,
					userId: user._id,
					priority,
					data: {
						transactions,
						budgets,
						goals,
						userId: user._id,
					},
				};

				const response: AIResponse =
					await HybridAIService.getInstance().processRequest(request);

				return convertResponseToInsights(response);
			} catch (err) {
				handleError(err as Error, 'Error getting insights');
				throw err;
			}
		},
		[user?._id, status.isInitialized, transactions, budgets, goals, handleError]
	);

	/**
	 * Categorize a transaction
	 */
	const categorizeTransaction = useCallback(
		async (
			description: string,
			amount: number
		): Promise<{ category: string; confidence: number; reason: string }> => {
			if (!user?._id || !status.isInitialized) {
				throw new Error('ML services not initialized');
			}

			try {
				const request: AIRequest = {
					type: 'categorization',
					query: `Categorize transaction: ${description}`,
					userId: user._id,
					priority: 'medium',
					data: {
						description,
						amount,
						budgets,
						userId: user._id,
					},
				};

				const response: AIResponse =
					await HybridAIService.getInstance().processRequest(request);

				return {
					category: response.response.category || 'uncategorized',
					confidence: response.confidence,
					reason: response.response.reason || 'No reason provided',
				};
			} catch (err) {
				console.error('[useMLServices] Error categorizing transaction:', err);
				throw err;
			}
		},
		[user?._id, status.isInitialized, budgets]
	);

	/**
	 * Get spending forecast
	 */
	const getSpendingForecast = useCallback(async (): Promise<any> => {
		if (!user?._id || !status.isInitialized) {
			throw new Error('ML services not initialized');
		}

		try {
			const request: AIRequest = {
				type: 'forecast',
				query: 'Generate spending forecast for next month',
				userId: user._id,
				priority: 'medium',
				data: {
					transactions,
					budgets,
					goals,
					userId: user._id,
				},
			};

			const response: AIResponse =
				await HybridAIService.getInstance().processRequest(request);

			return response.response;
		} catch (err) {
			console.error('[useMLServices] Error getting spending forecast:', err);
			throw err;
		}
	}, [user?._id, status.isInitialized, transactions, budgets, goals]);

	/**
	 * Get financial advice
	 */
	const getAdvice = useCallback(
		async (
			topic: string,
			priority: 'low' | 'medium' | 'high' = 'medium'
		): Promise<string> => {
			if (!user?._id || !status.isInitialized) {
				throw new Error('ML services not initialized');
			}

			try {
				const request: AIRequest = {
					type: 'advice',
					query: `Provide financial advice about: ${topic}`,
					userId: user._id,
					priority,
					data: {
						transactions,
						budgets,
						goals,
						userId: user._id,
					},
				};

				const response: AIResponse =
					await HybridAIService.getInstance().processRequest(request);

				return response.response;
			} catch (err) {
				console.error('[useMLServices] Error getting advice:', err);
				throw err;
			}
		},
		[user?._id, status.isInitialized, transactions, budgets, goals]
	);

	/**
	 * Provide feedback on AI response
	 */
	const provideFeedback = useCallback(
		async (
			requestId: string,
			originalResponse: AIResponse,
			userFeedback: any
		): Promise<void> => {
			if (!user?._id) return;

			try {
				await HybridAIService.getInstance().learnFromFeedback(
					requestId,
					originalResponse,
					userFeedback,
					user._id
				);
			} catch (err) {
				console.error('[useMLServices] Error providing feedback:', err);
			}
		},
		[user?._id]
	);

	/**
	 * Get ML service performance metrics
	 */
	const getMetrics = useCallback(() => {
		if (!status.isInitialized) return null;

		return HybridAIService.getInstance().getServiceMetrics();
	}, [status.isInitialized]);

	/**
	 * Update service status
	 */
	const updateStatus = useCallback(() => {
		if (!status.isInitialized) return;

		try {
			const metrics = HybridAIService.getInstance().getServiceMetrics();
			setStatus((prev) => ({
				...prev,
				cacheHitRate: metrics.cacheStats.hitRate,
				localMLConfidence: metrics.mlStats.averageConfidence,
				costSavings: metrics.costMetrics.estimatedSavings,
				totalRequests: metrics.costMetrics.totalRequests,
			}));
		} catch (err) {
			console.error('[useMLServices] Error updating status:', err);
		}
	}, [status.isInitialized]);

	/**
	 * Clear ML cache
	 */
	const clearCache = useCallback(async () => {
		try {
			await SmartCacheService.getInstance().cleanupExpiredCache();
			updateStatus();
			console.log('[useMLServices] Cache cleared successfully');
		} catch (error) {
			console.error('[useMLServices] Error clearing cache:', error);
		}
	}, [updateStatus]);

	/**
	 * Get budget analysis
	 */
	const getBudgetAnalysis = useCallback(
		async (budgetId: string): Promise<BudgetAnalysis> => {
			if (!user?._id || !status.isInitialized) {
				throw new Error('ML services not initialized');
			}

			try {
				const analysis = await BudgetAnalysisService.getBudgetAnalysis(
					budgetId,
					{
						includeTransactions: true,
						timeRange: 'month',
						includeRecommendations: true,
						includeTrends: true,
					}
				);

				return analysis;
			} catch (err) {
				console.error('[useMLServices] Error getting budget analysis:', err);
				throw new Error('Failed to analyze budget');
			}
		},
		[user?._id, status.isInitialized]
	);

	/**
	 * Get AI insights from the insights service
	 */
	const getAIInsights = useCallback(async (): Promise<AIInsight[]> => {
		if (!user?._id || !status.isInitialized) {
			throw new Error('ML services not initialized');
		}

		try {
			const response = await InsightsService.getInsights('monthly');

			if (response.success && response.data) {
				return response.data;
			}

			return [];
		} catch (err) {
			console.error('[useMLServices] Error getting AI insights:', err);
			throw new Error('Failed to get AI insights');
		}
	}, [user?._id, status.isInitialized]);

	/**
	 * Mark insight as read
	 */
	const markInsightAsRead = useCallback(
		async (insightId: string): Promise<void> => {
			if (!user?._id) return;

			try {
				await InsightsService.markInsightAsRead(insightId);
			} catch (err) {
				console.error('[useMLServices] Error marking insight as read:', err);
			}
		},
		[user?._id]
	);

	/**
	 * Get unread insights count
	 */
	const getUnreadInsightsCount = useCallback(async (): Promise<number> => {
		if (!user?._id) return 0;

		try {
			const response = await InsightsService.getUnreadCount();
			return response.success && response.data ? response.data.unreadCount : 0;
		} catch (err) {
			console.error('[useMLServices] Error getting unread count:', err);
			return 0;
		}
	}, [user?._id]);

	/**
	 * Get spending patterns analysis
	 */
	const getSpendingPatterns = useCallback(async (): Promise<any> => {
		if (!user?._id || !status.isInitialized) {
			throw new Error('ML services not initialized');
		}

		try {
			const request: AIRequest = {
				type: 'analysis',
				query: 'Analyze spending patterns and trends',
				userId: user._id,
				priority: 'medium',
				data: {
					transactions,
					budgets,
					goals,
					userId: user._id,
				},
			};

			const response: AIResponse =
				await HybridAIService.getInstance().processRequest(request);

			return response.response;
		} catch (err) {
			console.error('[useMLServices] Error getting spending patterns:', err);
			throw new Error('Failed to analyze spending patterns');
		}
	}, [user?._id, status.isInitialized, transactions, budgets, goals]);

	/**
	 * Get financial health score
	 */
	const getFinancialHealthScore = useCallback(async (): Promise<{
		score: number;
		grade: string;
		recommendations: string[];
		trends: any;
	}> => {
		if (!user?._id || !status.isInitialized) {
			throw new Error('ML services not initialized');
		}

		try {
			const request: AIRequest = {
				type: 'analysis',
				query: 'Calculate financial health score and provide recommendations',
				userId: user._id,
				priority: 'high',
				data: {
					transactions,
					budgets,
					goals,
					userId: user._id,
				},
			};

			const response: AIResponse =
				await HybridAIService.getInstance().processRequest(request);

			return response.response;
		} catch (err) {
			console.error(
				'[useMLServices] Error getting financial health score:',
				err
			);
			throw new Error('Failed to calculate financial health score');
		}
	}, [user?._id, status.isInitialized, transactions, budgets, goals]);

	/**
	 * Convert AI response to insights
	 */
	const convertResponseToInsights = (response: AIResponse): MLInsight[] => {
		const insights: MLInsight[] = [];

		if (response.response && Array.isArray(response.response.insights)) {
			response.response.insights.forEach((insight: any) => {
				insights.push({
					type: insight.type || 'recommendation',
					title: insight.title || 'Insight',
					message:
						insight.message || insight.description || 'No message provided',
					confidence: response.confidence,
					actionable: insight.actionable || false,
				});
			});
		}

		return insights;
	};

	// Initialize ML services when user is available
	useEffect(() => {
		if (user?._id && !status.isInitialized) {
			console.log('[useMLServices] User available, starting initialization...');
			initializeML();
		}
	}, [user?._id, status.isInitialized, initializeML]);

	// Emergency fallback: if initialization takes too long, force it to complete
	useEffect(() => {
		if (user?._id && !status.isInitialized && !isLoading) {
			const emergencyTimeout = setTimeout(() => {
				console.warn(
					'[useMLServices] Emergency timeout reached, forcing initialization'
				);
				setStatus((prev) => ({
					...prev,
					isInitialized: true,
					cacheHitRate: 0,
					localMLConfidence: 0.3,
					costSavings: 0,
					totalRequests: 0,
				}));
				setError('Initialization took too long, using basic mode');
			}, 15000); // 15 seconds total emergency timeout

			return () => clearTimeout(emergencyTimeout);
		}
	}, [user?._id, status.isInitialized, isLoading]);

	// Ultimate fallback: ensure service is ready after 20 seconds regardless
	useEffect(() => {
		if (user?._id && !status.isInitialized) {
			const ultimateTimeout = setTimeout(() => {
				console.warn(
					'[useMLServices] Ultimate fallback: forcing service to be ready'
				);
				setStatus((prev) => ({
					...prev,
					isInitialized: true,
					cacheHitRate: 0,
					localMLConfidence: 0.2,
					costSavings: 0,
					totalRequests: 0,
				}));
				setError('Using basic mode due to initialization issues');
				setIsLoading(false);
			}, 20000); // 20 seconds ultimate fallback

			return () => clearTimeout(ultimateTimeout);
		}
	}, [user?._id, status.isInitialized]);

	// Update status periodically
	useEffect(() => {
		if (!status.isInitialized) return;

		const interval = setInterval(updateStatus, 30000); // Update every 30 seconds

		return () => clearInterval(interval);
	}, [status.isInitialized, updateStatus]);

	return {
		// State
		status,
		isLoading,
		error,

		// Core Actions
		initializeML,
		getInsights,
		categorizeTransaction,
		getSpendingForecast,
		getAdvice,
		provideFeedback,
		getMetrics,
		clearCache,
		reset,
		retryInitialization,

		// Enhanced Features
		getBudgetAnalysis,
		getAIInsights,
		markInsightAsRead,
		getUnreadInsightsCount,
		getSpendingPatterns,
		getFinancialHealthScore,

		// Utilities
		isReady: status.isInitialized && !isLoading,
		hasError: !!error,
	};
};

export default useMLServices;
