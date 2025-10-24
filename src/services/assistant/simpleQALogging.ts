// Simple QA Lane Logging - Track metrics and performance
// Provides insights into Simple QA effectiveness and user satisfaction

export interface SimpleQAMetrics {
	tookSimpleQALane: boolean;
	microSolverUsed?: 'calc' | 'date' | 'appNav' | 'financialBasics' | null;
	hadDirectAnswer: boolean;
	answerabilityFailedButAnsweredGenerically: boolean;
	timeToFirstToken: number;
	finalTokens: number;
	userSatisfaction?: 'high' | 'medium' | 'low';
	responseSource: 'microSolver' | 'knowledgeBase' | 'miniModel' | 'fallback';
	questionType:
		| 'general'
		| 'howto'
		| 'definition'
		| 'appNav'
		| 'math'
		| 'other';
	timestamp: number; // Unix timestamp for time-based filtering
}

export interface SimpleQAAnalytics {
	totalQueries: number;
	simpleQAHitRate: number;
	averageTimeToFirstToken: number;
	averageTokens: number;
	microSolverUsage: Record<string, number>;
	knowledgeBaseUsage: number;
	miniModelUsage: number;
	userSatisfaction: Record<string, number>;
	responseSourceBreakdown: Record<string, number>;
	questionTypeBreakdown: Record<string, number>;
}

export class SimpleQALogger {
	private metrics: SimpleQAMetrics[] = [];
	private maxMetrics = 1000; // Keep last 1000 metrics
	private storageKey = 'simpleQA_metrics';

	/**
	 * Log Simple QA metrics
	 */
	logMetrics(metrics: Omit<SimpleQAMetrics, 'timestamp'>): void {
		try {
			// Validate required fields
			if (typeof metrics.tookSimpleQALane !== 'boolean') {
				console.warn(
					'🔍 [SimpleQALogger] Invalid tookSimpleQALane value:',
					metrics.tookSimpleQALane
				);
				return;
			}

			if (
				typeof metrics.timeToFirstToken !== 'number' ||
				metrics.timeToFirstToken < 0
			) {
				console.warn(
					'🔍 [SimpleQALogger] Invalid timeToFirstToken value:',
					metrics.timeToFirstToken
				);
				return;
			}

			if (typeof metrics.finalTokens !== 'number' || metrics.finalTokens < 0) {
				console.warn(
					'🔍 [SimpleQALogger] Invalid finalTokens value:',
					metrics.finalTokens
				);
				return;
			}

			// Add timestamp if not provided
			const metricsWithTimestamp: SimpleQAMetrics = {
				...metrics,
				timestamp: Date.now(),
			};

			this.metrics.push(metricsWithTimestamp);

			// Keep only recent metrics
			if (this.metrics.length > this.maxMetrics) {
				this.metrics = this.metrics.slice(-this.maxMetrics);
			}

			// Save to persistent storage
			this.saveToStorage();

				tookSimpleQALane: metricsWithTimestamp.tookSimpleQALane,
				microSolverUsed: metricsWithTimestamp.microSolverUsed,
				responseSource: metricsWithTimestamp.responseSource,
				timeToFirstToken: metricsWithTimestamp.timeToFirstToken,
				hadDirectAnswer: metricsWithTimestamp.hadDirectAnswer,
				timestamp: new Date(metricsWithTimestamp.timestamp).toISOString(),
			});
		} catch (error) {
			console.error('🔍 [SimpleQALogger] Error logging metrics:', error);
		}
	}

	/**
	 * Get analytics summary
	 */
	getAnalytics(): SimpleQAAnalytics {
		if (this.metrics.length === 0) {
			return {
				totalQueries: 0,
				simpleQAHitRate: 0,
				averageTimeToFirstToken: 0,
				averageTokens: 0,
				microSolverUsage: {},
				knowledgeBaseUsage: 0,
				miniModelUsage: 0,
				userSatisfaction: {},
				responseSourceBreakdown: {},
				questionTypeBreakdown: {},
			};
		}

		const simpleQAQueries = this.metrics.filter((m) => m.tookSimpleQALane);
		const hitRate = simpleQAQueries.length / this.metrics.length;

		const averageTimeToFirstToken =
			simpleQAQueries.length > 0
				? simpleQAQueries.reduce((sum, m) => sum + m.timeToFirstToken, 0) /
				  simpleQAQueries.length
				: 0;

		const averageTokens =
			simpleQAQueries.length > 0
				? simpleQAQueries.reduce((sum, m) => sum + m.finalTokens, 0) /
				  simpleQAQueries.length
				: 0;

		// Micro-solver usage breakdown
		const microSolverUsage: Record<string, number> = {};
		simpleQAQueries.forEach((m) => {
			if (m.microSolverUsed) {
				microSolverUsage[m.microSolverUsed] =
					(microSolverUsage[m.microSolverUsed] || 0) + 1;
			}
		});

		// Response source breakdown
		const responseSourceBreakdown: Record<string, number> = {};
		simpleQAQueries.forEach((m) => {
			responseSourceBreakdown[m.responseSource] =
				(responseSourceBreakdown[m.responseSource] || 0) + 1;
		});

		// Question type breakdown
		const questionTypeBreakdown: Record<string, number> = {};
		simpleQAQueries.forEach((m) => {
			questionTypeBreakdown[m.questionType] =
				(questionTypeBreakdown[m.questionType] || 0) + 1;
		});

		// User satisfaction breakdown
		const userSatisfaction: Record<string, number> = {};
		simpleQAQueries.forEach((m) => {
			if (m.userSatisfaction) {
				userSatisfaction[m.userSatisfaction] =
					(userSatisfaction[m.userSatisfaction] || 0) + 1;
			}
		});

		return {
			totalQueries: this.metrics.length,
			simpleQAHitRate: hitRate,
			averageTimeToFirstToken,
			averageTokens,
			microSolverUsage,
			knowledgeBaseUsage: responseSourceBreakdown['knowledgeBase'] || 0,
			miniModelUsage: responseSourceBreakdown['miniModel'] || 0,
			userSatisfaction,
			responseSourceBreakdown,
			questionTypeBreakdown,
		};
	}

	/**
	 * Get recent performance metrics
	 */
	getRecentPerformance(hours: number = 24): SimpleQAAnalytics {
		const cutoff = Date.now() - hours * 60 * 60 * 1000;
		const recentMetrics = this.metrics.filter((m) => m.timestamp >= cutoff);

		// Create a temporary logger with recent metrics
		const tempLogger = new SimpleQALogger();
		tempLogger.metrics = recentMetrics;
		return tempLogger.getAnalytics();
	}

	/**
	 * Get question type from question text
	 */
	static getQuestionType(question: string): SimpleQAMetrics['questionType'] {
		const text = question.toLowerCase();

		if (
			/how.*do.*i|how.*to|how.*can.*i|how.*should.*i|step.*by.*step/.test(text)
		) {
			return 'howto';
		}

		if (
			/what.*is|what.*does.*mean|define|definition|explain.*term/.test(text)
		) {
			return 'definition';
		}

		if (
			/mark.*paid|create.*budget|add.*goal|edit.*budget|link.*bank|categorize/.test(
				text
			)
		) {
			return 'appNav';
		}

		if (
			/if.*save|how.*much.*save|calculate|percentage.*of|monthly.*to.*yearly/.test(
				text
			)
		) {
			return 'math';
		}

		if (/what'?s.*rule|explain|help|advice|tips|suggestions/.test(text)) {
			return 'general';
		}

		return 'other';
	}

	/**
	 * Determine if response had direct answer
	 */
	static hadDirectAnswer(message: string): boolean {
		if (!message) return false;

		// Check for direct answer patterns
		const directAnswerPatterns = [
			/^[A-Z]/, // Starts with capital letter
			/^[0-9]/, // Starts with number
			/^[A-Z][a-z]+ is/, // "X is..." pattern
			/^[A-Z][a-z]+ means/, // "X means..." pattern
			/^The /, // "The..." pattern
			/^Here'?s/, // "Here's..." pattern
			/^You can/, // "You can..." pattern
			/^To /, // "To..." pattern
			/^At /, // "At..." pattern
			/^If /, // "If..." pattern
			/^Yes,/, // "Yes,..." pattern
			/^No,/, // "No,..." pattern
		];

		return directAnswerPatterns.some((pattern) => pattern.test(message));
	}

	/**
	 * Get micro-solver type from question
	 */
	static getMicroSolverType(
		question: string
	): SimpleQAMetrics['microSolverUsed'] {
		const text = question.toLowerCase();

		if (
			/save.*month|percentage.*of|monthly.*to.*yearly|emergency.*fund.*amount|debt.*payoff/.test(
				text
			)
		) {
			return 'calc';
		}

		if (/days.*until|next.*payday|business.*days|when.*due/.test(text)) {
			return 'date';
		}

		if (
			/mark.*paid|create.*budget|add.*goal|edit.*budget|link.*bank|categorize/.test(
				text
			)
		) {
			return 'appNav';
		}

		if (
			/50.*30.*20|emergency.*fund|apr.*apy|snowball.*avalanche|compound.*interest/.test(
				text
			)
		) {
			return 'financialBasics';
		}

		return null;
	}

	/**
	 * Clear old metrics
	 */
	clearOldMetrics(): void {
		// Keep only last 500 metrics
		if (this.metrics.length > 500) {
			this.metrics = this.metrics.slice(-500);
		}
	}

	/**
	 * Export metrics for analysis
	 */
	exportMetrics(): SimpleQAMetrics[] {
		return [...this.metrics];
	}

	/**
	 * Save metrics to persistent storage
	 */
	private saveToStorage(): void {
		try {
			const data = JSON.stringify(this.metrics);
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem(this.storageKey, data);
			}
		} catch (error) {
			console.error('🔍 [SimpleQALogger] Error saving to storage:', error);
		}
	}

	/**
	 * Load metrics from persistent storage
	 */
	private loadFromStorage(): void {
		try {
			if (typeof localStorage !== 'undefined') {
				const data = localStorage.getItem(this.storageKey);
				if (data) {
					const parsed = JSON.parse(data);
					if (Array.isArray(parsed)) {
						this.metrics = parsed;
						// Clean up old metrics on load
						this.cleanupOldMetrics();
					}
				}
			}
		} catch (error) {
			console.error('🔍 [SimpleQALogger] Error loading from storage:', error);
			this.metrics = [];
		}
	}

	/**
	 * Clean up metrics older than 7 days
	 */
	private cleanupOldMetrics(): void {
		const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
		this.metrics = this.metrics.filter((m) => m.timestamp >= sevenDaysAgo);
	}

	/**
	 * Initialize logger with persisted data
	 */
	initialize(): void {
		this.loadFromStorage();
	}

	/**
	 * Clear all metrics and storage
	 */
	clearAllMetrics(): void {
		this.metrics = [];
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem(this.storageKey);
		}
	}

	/**
	 * Get performance trends over time
	 */
	getPerformanceTrends(days: number = 7): {
		dates: string[];
		hitRates: number[];
		avgResponseTimes: number[];
		userSatisfaction: number[];
	} {
		const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
		const recentMetrics = this.metrics.filter((m) => m.timestamp >= cutoff);

		// Group by day
		const dailyData: Record<string, SimpleQAMetrics[]> = {};
		recentMetrics.forEach((metric) => {
			const date = new Date(metric.timestamp).toISOString().split('T')[0];
			if (!dailyData[date]) {
				dailyData[date] = [];
			}
			dailyData[date].push(metric);
		});

		const dates = Object.keys(dailyData).sort();
		const hitRates: number[] = [];
		const avgResponseTimes: number[] = [];
		const userSatisfaction: number[] = [];

		dates.forEach((date) => {
			const dayMetrics = dailyData[date];
			const simpleQAQueries = dayMetrics.filter((m) => m.tookSimpleQALane);

			// Hit rate
			hitRates.push(simpleQAQueries.length / dayMetrics.length);

			// Average response time
			const avgTime =
				simpleQAQueries.length > 0
					? simpleQAQueries.reduce((sum, m) => sum + m.timeToFirstToken, 0) /
					  simpleQAQueries.length
					: 0;
			avgResponseTimes.push(avgTime);

			// User satisfaction (convert to numeric: high=3, medium=2, low=1)
			const satisfactionValues: number[] = simpleQAQueries
				.filter((m) => m.userSatisfaction)
				.map((m) => {
					switch (m.userSatisfaction) {
						case 'high':
							return 3;
						case 'medium':
							return 2;
						case 'low':
							return 1;
						default:
							return 0;
					}
				});
			const avgSatisfaction =
				satisfactionValues.length > 0
					? satisfactionValues.reduce((sum, val) => sum + val, 0) /
					  satisfactionValues.length
					: 0;
			userSatisfaction.push(avgSatisfaction);
		});

		return { dates, hitRates, avgResponseTimes, userSatisfaction };
	}

	/**
	 * Get top performing micro-solvers
	 */
	getTopMicroSolvers(limit: number = 5): {
		solver: string;
		count: number;
		avgResponseTime: number;
		hitRate: number;
	}[] {
		const simpleQAQueries = this.metrics.filter(
			(m) => m.tookSimpleQALane && m.microSolverUsed
		);
		const solverStats: Record<
			string,
			{ count: number; totalTime: number; queries: SimpleQAMetrics[] }
		> = {};

		simpleQAQueries.forEach((metric) => {
			const solver = metric.microSolverUsed!;
			if (!solverStats[solver]) {
				solverStats[solver] = { count: 0, totalTime: 0, queries: [] };
			}
			solverStats[solver].count++;
			solverStats[solver].totalTime += metric.timeToFirstToken;
			solverStats[solver].queries.push(metric);
		});

		return Object.entries(solverStats)
			.map(([solver, stats]) => ({
				solver,
				count: stats.count,
				avgResponseTime: stats.totalTime / stats.count,
				hitRate:
					stats.queries.filter((q) => q.hadDirectAnswer).length / stats.count,
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, limit);
	}
}

// Export singleton instance
export const simpleQALogger = new SimpleQALogger();

// Initialize the logger on module load
if (typeof window !== 'undefined') {
	simpleQALogger.initialize();
}
