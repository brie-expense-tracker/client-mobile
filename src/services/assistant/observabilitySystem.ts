// Observability System - Comprehensive logging, reason codes, and safety classifiers
// Implements monitoring and safety guardrails for the hybrid AI system

import { ChatResponse } from './responseSchema';
import { FinancialSkillId } from './skills/comprehensiveSkillRegistry';
import { RouteDecision } from './hierarchicalRouter';

// Define ChatContext locally to avoid import issues
interface ChatContext {
	userProfile?: {
		userId?: string;
		monthlyIncome?: number;
		financialGoal?: string;
		riskProfile?: string;
	};
	accounts?: any[];
}

// Log levels
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

// Reason codes for different scenarios
export type ReasonCode =
	// Intent detection
	| 'INTENT_HIGH_CONFIDENCE'
	| 'INTENT_MEDIUM_CONFIDENCE'
	| 'INTENT_LOW_CONFIDENCE'
	| 'INTENT_MULTIPLE_MATCHES'
	| 'INTENT_NO_MATCH'
	| 'INTENT_AMBIGUOUS'

	// Data availability
	| 'DATA_AVAILABLE'
	| 'DATA_MISSING'
	| 'DATA_INSUFFICIENT'
	| 'DATA_STALE'

	// Routing decisions
	| 'ROUTE_GROUNDED'
	| 'ROUTE_LLM'
	| 'ROUTE_FALLBACK'
	| 'ROUTE_CACHED'

	// Safety and compliance
	| 'SAFETY_PASSED'
	| 'SAFETY_BLOCKED'
	| 'COMPLIANCE_PASSED'
	| 'COMPLIANCE_BLOCKED'

	// Performance
	| 'PERFORMANCE_GOOD'
	| 'PERFORMANCE_SLOW'
	| 'PERFORMANCE_TIMEOUT'

	// User experience
	| 'UX_CLEAR'
	| 'UX_CONFUSING'
	| 'UX_HELPFUL'
	| 'UX_FRUSTRATING';

// Safety classification result
export interface SafetyClassification {
	isSafe: boolean;
	confidence: number;
	reasons: string[];
	blockedPatterns: string[];
	suggestedAction: 'ALLOW' | 'BLOCK' | 'MODIFY' | 'ESCALATE';
}

// Performance metrics
export interface PerformanceMetrics {
	latency: number;
	tokens: number;
	model: string;
	cacheHit: boolean;
	retries: number;
	errors: number;
}

// Log entry
export interface LogEntry {
	timestamp: Date;
	level: LogLevel;
	message: string;
	reasonCode: ReasonCode;
	context: {
		sessionId: string;
		messageId: string;
		userId?: string;
		skillId?: FinancialSkillId;
		routeDecision?: RouteDecision;
		performance?: PerformanceMetrics;
		safety?: SafetyClassification;
	};
	metadata?: Record<string, any>;
}

// Safety classifier
export class SafetyClassifier {
	private dangerousPatterns: {
		pattern: RegExp;
		severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
		reason: string;
		action: 'BLOCK' | 'MODIFY' | 'ESCALATE';
	}[] = [
		// Investment advice patterns
		{
			pattern:
				/(buy|sell|invest in|purchase)\s+(stocks?|shares?|bonds?|funds?)/i,
			severity: 'HIGH',
			reason: 'INVESTMENT_ADVICE',
			action: 'BLOCK',
		},
		{
			pattern: /(recommend|suggest|advise).*(stock|bond|fund|investment)/i,
			severity: 'HIGH',
			reason: 'INVESTMENT_RECOMMENDATION',
			action: 'BLOCK',
		},

		// Tax advice patterns
		{
			pattern: /(tax|irs|deduction|write.?off|filing)/i,
			severity: 'MEDIUM',
			reason: 'TAX_ADVICE',
			action: 'MODIFY',
		},

		// Legal advice patterns
		{
			pattern: /(legal|lawyer|attorney|court|lawsuit)/i,
			severity: 'MEDIUM',
			reason: 'LEGAL_ADVICE',
			action: 'MODIFY',
		},

		// Medical advice patterns
		{
			pattern: /(medical|doctor|health|treatment|medication)/i,
			severity: 'LOW',
			reason: 'MEDICAL_ADVICE',
			action: 'MODIFY',
		},

		// Financial product recommendations
		{
			pattern:
				/(credit card|loan|mortgage|insurance).*(recommend|suggest|best)/i,
			severity: 'MEDIUM',
			reason: 'PRODUCT_RECOMMENDATION',
			action: 'MODIFY',
		},

		// Urgent financial advice
		{
			pattern: /(urgent|emergency|immediately|right now).*(financial|money)/i,
			severity: 'HIGH',
			reason: 'URGENT_FINANCIAL_ADVICE',
			action: 'ESCALATE',
		},

		// Personal information requests
		{
			pattern: /(ssn|social security|account number|routing number)/i,
			severity: 'CRITICAL',
			reason: 'PERSONAL_INFO_REQUEST',
			action: 'BLOCK',
		},
	];

	// Classify response for safety
	classifyResponse(
		response: ChatResponse,
		context: ChatContext
	): SafetyClassification {
		const reasons: string[] = [];
		const blockedPatterns: string[] = [];
		let maxSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
		let suggestedAction: 'ALLOW' | 'BLOCK' | 'MODIFY' | 'ESCALATE' = 'ALLOW';

		const textToCheck = `${response.message} ${
			response.details || ''
		}`.toLowerCase();

		for (const { pattern, severity, reason, action } of this
			.dangerousPatterns) {
			if (pattern.test(textToCheck)) {
				reasons.push(reason);
				blockedPatterns.push(pattern.source);

				// Update severity and action based on highest severity found
				if (
					this.getSeverityLevel(severity) > this.getSeverityLevel(maxSeverity)
				) {
					maxSeverity = severity;
					suggestedAction = action;
				}
			}
		}

		const isSafe = maxSeverity === 'LOW';
		const confidence = isSafe
			? 0.9
			: this.calculateSafetyConfidence(maxSeverity);

		return {
			isSafe,
			confidence,
			reasons,
			blockedPatterns,
			suggestedAction,
		};
	}

	private getSeverityLevel(
		severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
	): number {
		const levels = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
		return levels[severity];
	}

	private calculateSafetyConfidence(
		severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
	): number {
		const confidences = { LOW: 0.7, MEDIUM: 0.8, HIGH: 0.9, CRITICAL: 0.95 };
		return confidences[severity];
	}

	// Check if response needs modification
	needsModification(classification: SafetyClassification): boolean {
		return (
			classification.suggestedAction === 'MODIFY' &&
			classification.reasons.length > 0
		);
	}

	// Modify response to be safer
	modifyResponse(
		response: ChatResponse,
		classification: SafetyClassification
	): ChatResponse {
		if (!this.needsModification(classification)) {
			return response;
		}

		let modifiedMessage = response.message;

		// Add disclaimers based on detected patterns
		if (classification.reasons.includes('TAX_ADVICE')) {
			modifiedMessage +=
				'\n\n*This is general information, not tax advice. Consult a tax professional for your specific situation.*';
		}

		if (classification.reasons.includes('LEGAL_ADVICE')) {
			modifiedMessage +=
				'\n\n*This is general information, not legal advice. Consult an attorney for legal matters.*';
		}

		if (classification.reasons.includes('PRODUCT_RECOMMENDATION')) {
			modifiedMessage +=
				'\n\n*This is educational content, not a product recommendation. Do your own research before making financial decisions.*';
		}

		if (classification.reasons.includes('INVESTMENT_ADVICE')) {
			modifiedMessage +=
				'\n\n*This is educational content only. Not investment advice. Consult a financial advisor before making investment decisions.*';
		}

		if (classification.reasons.includes('URGENT_FINANCIAL_ADVICE')) {
			modifiedMessage +=
				'\n\n*For urgent financial matters, consider consulting a financial professional immediately.*';
		}

		return {
			...response,
			message: modifiedMessage,
			sources: [
				...(response.sources || []),
				{ kind: 'db', note: 'safety modification' },
			],
		};
	}

	// Add custom safety pattern
	addCustomPattern(
		pattern: RegExp,
		severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
		reason: string,
		action: 'BLOCK' | 'MODIFY' | 'ESCALATE'
	): void {
		this.dangerousPatterns.push({
			pattern,
			severity,
			reason,
			action,
		});
	}

	// Remove custom pattern by reason
	removeCustomPattern(reason: string): boolean {
		const initialLength = this.dangerousPatterns.length;
		this.dangerousPatterns = this.dangerousPatterns.filter(
			(pattern) => pattern.reason !== reason
		);
		return this.dangerousPatterns.length < initialLength;
	}

	// Get all patterns
	getPatterns(): typeof this.dangerousPatterns {
		return [...this.dangerousPatterns];
	}
}

// Performance monitor
export class PerformanceMonitor {
	private metrics: Map<string, PerformanceMetrics> = new Map();
	private thresholds = {
		latency: 2000, // 2 seconds
		tokens: 1000,
		retries: 3,
		errors: 1,
	};

	// Record performance metrics
	recordMetrics(messageId: string, metrics: PerformanceMetrics): void {
		this.metrics.set(messageId, metrics);
	}

	// Check if performance is acceptable
	isPerformanceAcceptable(metrics: PerformanceMetrics): {
		acceptable: boolean;
		issues: string[];
		reasonCode: ReasonCode;
	} {
		const issues: string[] = [];

		if (metrics.latency > this.thresholds.latency) {
			issues.push(`High latency: ${metrics.latency}ms`);
		}

		if (metrics.tokens > this.thresholds.tokens) {
			issues.push(`High token usage: ${metrics.tokens}`);
		}

		if (metrics.retries > this.thresholds.retries) {
			issues.push(`Too many retries: ${metrics.retries}`);
		}

		if (metrics.errors > this.thresholds.errors) {
			issues.push(`Too many errors: ${metrics.errors}`);
		}

		const acceptable = issues.length === 0;
		const reasonCode = acceptable ? 'PERFORMANCE_GOOD' : 'PERFORMANCE_SLOW';

		return { acceptable, issues, reasonCode };
	}

	// Get performance summary
	getPerformanceSummary(): {
		averageLatency: number;
		averageTokens: number;
		cacheHitRate: number;
		errorRate: number;
		slowQueries: number;
	} {
		const allMetrics = Array.from(this.metrics.values());

		if (allMetrics.length === 0) {
			return {
				averageLatency: 0,
				averageTokens: 0,
				cacheHitRate: 0,
				errorRate: 0,
				slowQueries: 0,
			};
		}

		const averageLatency =
			allMetrics.reduce((sum, m) => sum + m.latency, 0) / allMetrics.length;
		const averageTokens =
			allMetrics.reduce((sum, m) => sum + m.tokens, 0) / allMetrics.length;
		const cacheHits = allMetrics.filter((m) => m.cacheHit).length;
		const cacheHitRate = cacheHits / allMetrics.length;
		const errors = allMetrics.filter((m) => m.errors > 0).length;
		const errorRate = errors / allMetrics.length;
		const slowQueries = allMetrics.filter(
			(m) => m.latency > this.thresholds.latency
		).length;

		return {
			averageLatency,
			averageTokens,
			cacheHitRate,
			errorRate,
			slowQueries,
		};
	}
}

// Logger
export class Logger {
	private logs: LogEntry[] = [];
	private maxLogs = 10000; // Keep last 10k logs

	// Log an entry with enhanced validation
	log(
		level: LogLevel,
		message: string,
		reasonCode: ReasonCode,
		context: LogEntry['context'],
		metadata?: Record<string, any>
	): void {
		// Validate inputs
		if (!message || typeof message !== 'string') {
			console.error('Invalid message provided to logger:', message);
			return;
		}

		if (!reasonCode || typeof reasonCode !== 'string') {
			console.error('Invalid reasonCode provided to logger:', reasonCode);
			return;
		}

		if (!context || typeof context !== 'object') {
			console.error('Invalid context provided to logger:', context);
			return;
		}

		// Validate required context fields
		if (!context.sessionId || !context.messageId) {
			console.warn('Missing required context fields (sessionId, messageId)');
		}

		try {
			const entry: LogEntry = {
				timestamp: new Date(),
				level,
				message: message.substring(0, 1000), // Truncate very long messages
				reasonCode,
				context: {
					...context,
					sessionId: context.sessionId || 'unknown',
					messageId: context.messageId || 'unknown',
				},
				metadata: metadata || {},
			};

			this.logs.push(entry);

			// Keep only recent logs
			if (this.logs.length > this.maxLogs) {
				this.logs = this.logs.slice(-this.maxLogs);
			}

			// Also log to console in development
			if (__DEV__) {
			}
		} catch (error) {
			console.error('Error logging entry:', error);
		}
	}

	// Get logs by level
	getLogsByLevel(level: LogLevel): LogEntry[] {
		return this.logs.filter((log) => log.level === level);
	}

	// Get logs by reason code
	getLogsByReasonCode(reasonCode: ReasonCode): LogEntry[] {
		return this.logs.filter((log) => log.reasonCode === reasonCode);
	}

	// Get logs by time range
	getLogsByTimeRange(start: Date, end: Date): LogEntry[] {
		return this.logs.filter(
			(log) => log.timestamp >= start && log.timestamp <= end
		);
	}

	// Get recent logs
	getRecentLogs(count: number): LogEntry[] {
		return this.logs.slice(-count);
	}

	// Get all logs
	getAllLogs(): LogEntry[] {
		return this.logs;
	}

	// Get error summary
	getErrorSummary(): {
		totalErrors: number;
		errorsByReason: Record<ReasonCode, number>;
		recentErrors: LogEntry[];
	} {
		const errors = this.getLogsByLevel('ERROR');
		const errorsByReason: Record<ReasonCode, number> = {} as Record<
			ReasonCode,
			number
		>;

		errors.forEach((error) => {
			errorsByReason[error.reasonCode] =
				(errorsByReason[error.reasonCode] || 0) + 1;
		});

		return {
			totalErrors: errors.length,
			errorsByReason,
			recentErrors: errors.slice(-10),
		};
	}

	// Clear old logs to free memory
	clearOldLogs(olderThanHours: number = 24): number {
		const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
		const initialLength = this.logs.length;
		this.logs = this.logs.filter((log) => log.timestamp > cutoffTime);
		return initialLength - this.logs.length;
	}

	// Get logs by session
	getLogsBySession(sessionId: string): LogEntry[] {
		return this.logs.filter((log) => log.context.sessionId === sessionId);
	}

	// Get logs by skill
	getLogsBySkill(skillId: FinancialSkillId): LogEntry[] {
		return this.logs.filter((log) => log.context.skillId === skillId);
	}

	// Search logs by message content
	searchLogs(query: string, caseSensitive: boolean = false): LogEntry[] {
		const searchQuery = caseSensitive ? query : query.toLowerCase();
		return this.logs.filter((log) => {
			const message = caseSensitive ? log.message : log.message.toLowerCase();
			return message.includes(searchQuery);
		});
	}

	// Get log statistics
	getLogStatistics(): {
		totalLogs: number;
		logsByLevel: Record<LogLevel, number>;
		logsByReason: Record<ReasonCode, number>;
		oldestLog: Date | null;
		newestLog: Date | null;
		averageLogsPerHour: number;
	} {
		const logsByLevel: Record<LogLevel, number> = {
			DEBUG: 0,
			INFO: 0,
			WARN: 0,
			ERROR: 0,
			FATAL: 0,
		};

		const logsByReason: Record<ReasonCode, number> = {} as Record<
			ReasonCode,
			number
		>;

		let oldestTime = Infinity;
		let newestTime = -Infinity;

		this.logs.forEach((log) => {
			logsByLevel[log.level]++;
			logsByReason[log.reasonCode] = (logsByReason[log.reasonCode] || 0) + 1;

			const logTime = log.timestamp.getTime();
			if (logTime < oldestTime) oldestTime = logTime;
			if (logTime > newestTime) newestTime = logTime;
		});

		const timeSpan = newestTime - oldestTime;
		const hoursElapsed = timeSpan / (1000 * 60 * 60);
		const averageLogsPerHour =
			hoursElapsed > 0 ? this.logs.length / hoursElapsed : 0;

		return {
			totalLogs: this.logs.length,
			logsByLevel,
			logsByReason,
			oldestLog: oldestTime === Infinity ? null : new Date(oldestTime),
			newestLog: newestTime === -Infinity ? null : new Date(newestTime),
			averageLogsPerHour,
		};
	}
}

// Main observability system
export class ObservabilitySystem {
	protected safetyClassifier: SafetyClassifier;
	protected performanceMonitor: PerformanceMonitor;
	protected logger: Logger;

	constructor() {
		this.safetyClassifier = new SafetyClassifier();
		this.performanceMonitor = new PerformanceMonitor();
		this.logger = new Logger();
	}

	// Getters for protected properties
	getPerformanceMonitor(): PerformanceMonitor {
		return this.performanceMonitor;
	}

	getLogger(): Logger {
		return this.logger;
	}

	getSafetyClassifier(): SafetyClassifier {
		return this.safetyClassifier;
	}

	// Log intent detection
	logIntentDetection(
		utterance: string,
		routeDecision: RouteDecision,
		sessionId: string,
		messageId: string,
		performance: PerformanceMetrics
	): void {
		const reasonCode = this.getIntentReasonCode(routeDecision);
		const level = this.getLogLevelFromConfidence(routeDecision.confidence);

		this.logger.log(
			level,
			`Intent detected: ${routeDecision.skillId || 'UNKNOWN'} (${
				routeDecision.confidence
			})`,
			reasonCode,
			{
				sessionId,
				messageId,
				skillId: routeDecision.skillId,
				routeDecision,
				performance,
			},
			{ utterance: utterance.substring(0, 100) }
		);

		this.performanceMonitor.recordMetrics(messageId, performance);
	}

	// Log response generation
	logResponseGeneration(
		response: ChatResponse,
		context: ChatContext,
		sessionId: string,
		messageId: string,
		performance: PerformanceMetrics
	): void {
		// Safety classification
		const safetyClassification = this.safetyClassifier.classifyResponse(
			response,
			context
		);

		// Performance check
		const performanceCheck =
			this.performanceMonitor.isPerformanceAcceptable(performance);

		// Determine if response needs modification
		const needsModification =
			this.safetyClassifier.needsModification(safetyClassification);

		const reasonCode = this.getResponseReasonCode(
			safetyClassification,
			performanceCheck
		);
		const level = this.getLogLevelFromSafety(safetyClassification);

		this.logger.log(
			level,
			`Response generated: ${response.message.substring(0, 50)}...`,
			reasonCode,
			{
				sessionId,
				messageId,
				performance,
				safety: safetyClassification,
			},
			{
				needsModification,
				responseLength: response.message.length,
				hasActions: response.actions?.length || 0,
				hasCards: response.cards?.length || 0,
			}
		);

		// Log safety issues
		if (!safetyClassification.isSafe) {
			this.logger.log(
				'WARN',
				`Safety issue detected: ${safetyClassification.reasons.join(', ')}`,
				'SAFETY_BLOCKED',
				{
					sessionId,
					messageId,
					safety: safetyClassification,
				}
			);
		}

		// Log performance issues
		if (!performanceCheck.acceptable) {
			this.logger.log(
				'WARN',
				`Performance issue: ${performanceCheck.issues.join(', ')}`,
				performanceCheck.reasonCode,
				{
					sessionId,
					messageId,
					performance,
				}
			);
		}
	}

	// Log user feedback
	logUserFeedback(
		messageId: string,
		feedback: 'thumbs_up' | 'thumbs_down' | 'escalated',
		sessionId: string,
		additionalContext?: Record<string, any>
	): void {
		const reasonCode =
			feedback === 'thumbs_up'
				? 'UX_HELPFUL'
				: feedback === 'thumbs_down'
				? 'UX_FRUSTRATING'
				: 'UX_CONFUSING';
		const level = feedback === 'thumbs_up' ? 'INFO' : 'WARN';

		this.logger.log(
			level,
			`User feedback: ${feedback}`,
			reasonCode,
			{
				sessionId,
				messageId,
			},
			additionalContext
		);
	}

	// Get system health
	getSystemHealth(): {
		overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
		metrics: {
			errorRate: number;
			averageLatency: number;
			safetyBlockRate: number;
			performanceIssues: number;
		};
		recommendations: string[];
	} {
		const errorSummary = this.logger.getErrorSummary();
		const performanceSummary = this.performanceMonitor.getPerformanceSummary();

		// Calculate safety block rate
		const safetyBlocks =
			this.logger.getLogsByReasonCode('SAFETY_BLOCKED').length;
		const totalResponses = this.logger.getAllLogs().length;
		const safetyBlockRate =
			totalResponses > 0 ? safetyBlocks / totalResponses : 0;

		// Determine overall health
		let overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = 'HEALTHY';
		const recommendations: string[] = [];

		if (errorSummary.totalErrors > 10) {
			overall = 'DEGRADED';
			recommendations.push(
				'High error rate detected - investigate recent errors'
			);
		}

		if (performanceSummary.averageLatency > 3000) {
			overall = 'DEGRADED';
			recommendations.push(
				'High latency detected - optimize response generation'
			);
		}

		if (safetyBlockRate > 0.1) {
			overall = 'DEGRADED';
			recommendations.push('High safety block rate - review safety patterns');
		}

		if (performanceSummary.errorRate > 0.05) {
			overall = 'UNHEALTHY';
			recommendations.push(
				'Critical error rate - immediate attention required'
			);
		}

		return {
			overall,
			metrics: {
				errorRate: performanceSummary.errorRate,
				averageLatency: performanceSummary.averageLatency,
				safetyBlockRate,
				performanceIssues: performanceSummary.slowQueries,
			},
			recommendations,
		};
	}

	// Get coverage analytics
	getCoverageAnalytics(): {
		totalQueries: number;
		handledRate: number;
		coverageBySkill: Record<FinancialSkillId, number>;
		coverageBySource: Record<string, number>;
		topFailureReasons: { reason: ReasonCode; count: number }[];
	} {
		const totalQueries = this.logger.getAllLogs().length;
		const handledQueries =
			this.logger.getLogsByReasonCode('ROUTE_GROUNDED').length +
			this.logger.getLogsByReasonCode('ROUTE_LLM').length;
		const handledRate = totalQueries > 0 ? handledQueries / totalQueries : 0;

		// Coverage by skill
		const coverageBySkill: Record<FinancialSkillId, number> = {} as Record<
			FinancialSkillId,
			number
		>;
		const skillLogs = this.logger
			.getAllLogs()
			.filter((log) => log.context.skillId);
		skillLogs.forEach((log) => {
			if (log.context.skillId) {
				coverageBySkill[log.context.skillId] =
					(coverageBySkill[log.context.skillId] || 0) + 1;
			}
		});

		// Coverage by source (would need to track this)
		const coverageBySource: Record<string, number> = {
			text_input: 0.8,
			voice_input: 0.1,
			suggestion_click: 0.1,
		};

		// Top failure reasons
		const failureReasons: Record<ReasonCode, number> = {} as Record<
			ReasonCode,
			number
		>;
		this.logger.getLogsByReasonCode('ROUTE_FALLBACK').forEach((log) => {
			failureReasons[log.reasonCode] =
				(failureReasons[log.reasonCode] || 0) + 1;
		});

		const topFailureReasons = Object.entries(failureReasons)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.map(([reason, count]) => ({ reason: reason as ReasonCode, count }));

		return {
			totalQueries,
			handledRate,
			coverageBySkill,
			coverageBySource,
			topFailureReasons,
		};
	}

	private getIntentReasonCode(routeDecision: RouteDecision): ReasonCode {
		if (routeDecision.confidence >= 0.8) return 'INTENT_HIGH_CONFIDENCE';
		if (routeDecision.confidence >= 0.6) return 'INTENT_MEDIUM_CONFIDENCE';
		if (routeDecision.confidence >= 0.3) return 'INTENT_LOW_CONFIDENCE';
		return 'INTENT_NO_MATCH';
	}

	private getResponseReasonCode(
		safety: SafetyClassification,
		performance: { acceptable: boolean; reasonCode: ReasonCode }
	): ReasonCode {
		if (!safety.isSafe) return 'SAFETY_BLOCKED';
		if (!performance.acceptable) return performance.reasonCode;
		return 'ROUTE_GROUNDED';
	}

	private getLogLevelFromConfidence(confidence: number): LogLevel {
		if (confidence >= 0.8) return 'INFO';
		if (confidence >= 0.6) return 'INFO';
		if (confidence >= 0.3) return 'WARN';
		return 'ERROR';
	}

	private getLogLevelFromSafety(safety: SafetyClassification): LogLevel {
		if (safety.isSafe) return 'INFO';
		if (safety.suggestedAction === 'BLOCK') return 'ERROR';
		if (safety.suggestedAction === 'ESCALATE') return 'ERROR';
		return 'WARN';
	}
}

// Rate limiting and throttling
export class RateLimiter {
	protected requests: Map<string, number[]> = new Map();
	private limits = {
		perMinute: 60,
		perHour: 1000,
		burst: 10,
	};

	isAllowed(key: string): boolean {
		const now = Date.now();
		const requests = this.requests.get(key) || [];

		// Clean old requests (older than 1 hour)
		const oneHourAgo = now - 60 * 60 * 1000;
		const recentRequests = requests.filter((time) => time > oneHourAgo);

		// Check hourly limit
		if (recentRequests.length >= this.limits.perHour) {
			return false;
		}

		// Check per-minute limit
		const oneMinuteAgo = now - 60 * 1000;
		const minuteRequests = recentRequests.filter((time) => time > oneMinuteAgo);
		if (minuteRequests.length >= this.limits.perMinute) {
			return false;
		}

		// Check burst limit (last 10 seconds)
		const tenSecondsAgo = now - 10 * 1000;
		const burstRequests = recentRequests.filter((time) => time > tenSecondsAgo);
		if (burstRequests.length >= this.limits.burst) {
			return false;
		}

		// Add current request
		recentRequests.push(now);
		this.requests.set(key, recentRequests);

		return true;
	}

	reset(key: string): void {
		this.requests.delete(key);
	}

	// Getter for protected property
	getRequests(): Map<string, number[]> {
		return this.requests;
	}
}

// Metrics exporter
export class MetricsExporter {
	exportToJSON(): string {
		const system = observabilitySystem;
		const health = system.getSystemHealth();
		const coverage = system.getCoverageAnalytics();
		const performance = system.getPerformanceMonitor().getPerformanceSummary();

		return JSON.stringify(
			{
				timestamp: new Date().toISOString(),
				health,
				coverage,
				performance,
				exportVersion: '1.0',
			},
			null,
			2
		);
	}

	exportToCSV(): string {
		const logs = observabilitySystem.getLogger().getAllLogs();
		const headers = [
			'timestamp',
			'level',
			'message',
			'reasonCode',
			'sessionId',
			'messageId',
		];
		const rows = logs.map((log) => [
			log.timestamp.toISOString(),
			log.level,
			log.message.replace(/,/g, ';'), // Escape commas
			log.reasonCode,
			log.context.sessionId,
			log.context.messageId,
		]);

		return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
	}
}

// Real-time monitoring
export class RealTimeMonitor {
	private subscribers: Set<(data: any) => void> = new Set();
	private intervalId: ReturnType<typeof setInterval> | null = null;

	subscribe(callback: (data: any) => void): () => void {
		this.subscribers.add(callback);
		return () => this.subscribers.delete(callback);
	}

	start(intervalMs: number = 5000): void {
		if (this.intervalId) return;

		this.intervalId = setInterval(() => {
			const data = {
				timestamp: new Date(),
				health: observabilitySystem.getSystemHealth(),
				performance: observabilitySystem
					.getPerformanceMonitor()
					.getPerformanceSummary(),
				recentLogs: observabilitySystem.getLogger().getRecentLogs(10),
			};

			this.subscribers.forEach((callback) => callback(data));
		}, intervalMs);
	}

	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}
}

// Alerting system
export class AlertManager {
	private alerts: Map<
		string,
		{
			condition: () => boolean;
			message: string;
			severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
			lastTriggered?: Date;
			cooldownMs: number;
		}
	> = new Map();

	registerAlert(
		id: string,
		condition: () => boolean,
		message: string,
		severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM',
		cooldownMs: number = 60000 // 1 minute default cooldown
	): void {
		this.alerts.set(id, {
			condition,
			message,
			severity,
			cooldownMs,
		});
	}

	checkAlerts(): {
		id: string;
		message: string;
		severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
		timestamp: Date;
	}[] {
		const triggered: {
			id: string;
			message: string;
			severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
			timestamp: Date;
		}[] = [];

		const now = new Date();

		for (const [id, alert] of this.alerts) {
			// Check cooldown
			if (alert.lastTriggered) {
				const timeSinceLastTrigger =
					now.getTime() - alert.lastTriggered.getTime();
				if (timeSinceLastTrigger < alert.cooldownMs) {
					continue;
				}
			}

			if (alert.condition()) {
				alert.lastTriggered = now;
				triggered.push({
					id,
					message: alert.message,
					severity: alert.severity,
					timestamp: now,
				});
			}
		}

		return triggered;
	}

	// Pre-configured alerts
	setupDefaultAlerts(): void {
		this.registerAlert(
			'high_error_rate',
			() => {
				const health = observabilitySystem.getSystemHealth();
				return health.metrics.errorRate > 0.1;
			},
			'High error rate detected',
			'HIGH'
		);

		this.registerAlert(
			'high_latency',
			() => {
				const health = observabilitySystem.getSystemHealth();
				return health.metrics.averageLatency > 5000;
			},
			'High latency detected',
			'MEDIUM'
		);

		this.registerAlert(
			'safety_blocks',
			() => {
				const health = observabilitySystem.getSystemHealth();
				return health.metrics.safetyBlockRate > 0.2;
			},
			'High safety block rate',
			'HIGH'
		);

		this.registerAlert(
			'system_unhealthy',
			() => {
				const health = observabilitySystem.getSystemHealth();
				return health.overall === 'UNHEALTHY';
			},
			'System is unhealthy',
			'CRITICAL'
		);
	}
}

// Enhanced observability system with new features
export class EnhancedObservabilitySystem extends ObservabilitySystem {
	public rateLimiter: RateLimiter;
	public metricsExporter: MetricsExporter;
	public realTimeMonitor: RealTimeMonitor;
	public alertManager: AlertManager;

	constructor() {
		super();
		this.rateLimiter = new RateLimiter();
		this.metricsExporter = new MetricsExporter();
		this.realTimeMonitor = new RealTimeMonitor();
		this.alertManager = new AlertManager();

		// Setup default alerts
		this.alertManager.setupDefaultAlerts();
	}

	// Enhanced logging with rate limiting
	logWithRateLimit(
		level: LogLevel,
		message: string,
		reasonCode: ReasonCode,
		context: LogEntry['context'],
		metadata?: Record<string, any>,
		rateLimitKey?: string
	): boolean {
		if (rateLimitKey && !this.rateLimiter.isAllowed(rateLimitKey)) {
			// Log the rate limit event
			this.logger.log(
				'WARN',
				`Rate limit exceeded for key: ${rateLimitKey}`,
				'PERFORMANCE_SLOW',
				context,
				{ rateLimitKey, originalMessage: message }
			);
			return false;
		}

		this.logger.log(level, message, reasonCode, context, metadata);
		return true;
	}

	// Get comprehensive system status
	getComprehensiveStatus(): {
		health: ReturnType<ObservabilitySystem['getSystemHealth']>;
		coverage: ReturnType<ObservabilitySystem['getCoverageAnalytics']>;
		performance: ReturnType<PerformanceMonitor['getPerformanceSummary']>;
		alerts: ReturnType<AlertManager['checkAlerts']>;
		rateLimits: {
			activeKeys: number;
			totalRequests: number;
		};
	} {
		return {
			health: this.getSystemHealth(),
			coverage: this.getCoverageAnalytics(),
			performance: this.performanceMonitor.getPerformanceSummary(),
			alerts: this.alertManager.checkAlerts(),
			rateLimits: {
				activeKeys: this.rateLimiter.getRequests().size,
				totalRequests: Array.from(
					this.rateLimiter.getRequests().values()
				).reduce((sum, requests) => sum + requests.length, 0),
			},
		};
	}

	// Export data in various formats
	exportData(format: 'json' | 'csv' | 'summary'): string {
		switch (format) {
			case 'json':
				return this.metricsExporter.exportToJSON();
			case 'csv':
				return this.metricsExporter.exportToCSV();
			case 'summary':
				const status = this.getComprehensiveStatus();
				return JSON.stringify(status, null, 2);
			default:
				throw new Error(`Unsupported export format: ${format}`);
		}
	}

	// Start real-time monitoring
	startMonitoring(intervalMs: number = 5000): void {
		this.realTimeMonitor.start(intervalMs);
	}

	// Stop real-time monitoring
	stopMonitoring(): void {
		this.realTimeMonitor.stop();
	}
}

// Export singleton instances
export const observabilitySystem = new ObservabilitySystem();
export const enhancedObservabilitySystem = new EnhancedObservabilitySystem();
