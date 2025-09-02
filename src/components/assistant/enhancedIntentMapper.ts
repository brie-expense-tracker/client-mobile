// Enhanced Intent Mapper - Advanced intent detection with confidence calibration
// Implements multi-label intents, calibrated confidence, hysteresis, and shadow routing

import { ChatResponse } from './responseSchema';
import { FinancialContext } from './helpfulFallbacks';

// Enhanced intent types including UNKNOWN
export type Intent =
	| 'GET_BALANCE'
	| 'GET_BUDGET_STATUS'
	| 'LIST_SUBSCRIPTIONS'
	| 'FORECAST_SPEND'
	| 'CREATE_BUDGET'
	| 'GET_GOAL_PROGRESS'
	| 'GET_SPENDING_BREAKDOWN'
	| 'CATEGORIZE_TX'
	| 'GENERAL_QA'
	| 'UNKNOWN';

// Intent scoring with calibrated confidence
export interface IntentScore {
	intent: Intent;
	p: number; // Raw probability from model
	calibratedP: number; // Calibrated probability (0-1)
	confidence: 'low' | 'medium' | 'high'; // Human-readable confidence
}

// Route decision with primary and secondary intents
export interface RouteDecision {
	primary: IntentScore;
	secondary?: IntentScore[];
	calibrated: boolean;
	routeType: 'grounded' | 'llm' | 'unknown';
	shadowRoute?: {
		alternativeIntent: Intent;
		alternativeResponse: ChatResponse;
		delta: number; // Difference in confidence scores
	};
}

// Confidence calibration parameters
interface CalibrationParams {
	temperature: number;
	bias: number;
	scale: number;
}

// Hysteresis configuration
interface HysteresisConfig {
	enterThreshold: number; // Confidence needed to enter grounded path
	exitThreshold: number; // Confidence needed to remain in grounded path
	minStableTime: number; // Minimum time (ms) to stay in current route
}

// Enhanced intent detection with multi-label support
export class EnhancedIntentMapper {
	private calibrationParams: CalibrationParams;
	private hysteresisConfig: HysteresisConfig;
	private lastRouteDecision: RouteDecision | null = null;
	private lastRouteTime: number = 0;
	private confidenceHistory: Array<{ timestamp: number; confidence: number }> =
		[];

	constructor() {
		// Initialize with default calibration parameters
		this.calibrationParams = {
			temperature: 0.3,
			bias: 0.1,
			scale: 1.2,
		};

		this.hysteresisConfig = {
			enterThreshold: 0.6,
			exitThreshold: 0.55,
			minStableTime: 5000, // 5 seconds
		};
	}

	/**
	 * Detect multiple intents with confidence scores
	 */
	async detectMultiLabelIntents(
		userQuestion: string,
		context?: FinancialContext
	): Promise<IntentScore[]> {
		const question = userQuestion.toLowerCase();
		const scores: IntentScore[] = [];

		// Multi-label detection - some queries can match multiple intents
		const intentPatterns = [
			{
				intent: 'GET_BALANCE' as Intent,
				patterns: [
					/balance|how much.*have|total.*money|available.*funds/,
					/account.*balance|checking.*balance|savings.*balance/,
				],
				baseScore: 0.8,
			},
			{
				intent: 'GET_BUDGET_STATUS' as Intent,
				patterns: [
					/budget.*status|how.*budget|spent.*budget|remaining.*budget/,
					/over.*budget|budget.*used|budget.*left/,
				],
				baseScore: 0.85,
			},
			{
				intent: 'FORECAST_SPEND' as Intent,
				patterns: [
					/forecast|predict.*spend|next.*month.*spending|future.*spending/,
					/how much.*spend.*month|spending.*projection/,
				],
				baseScore: 0.75,
			},
			{
				intent: 'CREATE_BUDGET' as Intent,
				patterns: [
					/new budget|create budget|set up.*budget|start.*budget/,
					/make.*budget|establish.*budget/,
				],
				baseScore: 0.9,
			},
			{
				intent: 'LIST_SUBSCRIPTIONS' as Intent,
				patterns: [
					/subscriptions?|recurring.*expenses?|monthly.*payments?/,
					/fixed.*expenses?|regular.*payments?/,
				],
				baseScore: 0.8,
			},
			{
				intent: 'GET_GOAL_PROGRESS' as Intent,
				patterns: [
					/goal.*progress|saving.*goal|target.*amount|how.*saving/,
					/progress.*goal|goal.*status/,
				],
				baseScore: 0.8,
			},
			{
				intent: 'GET_SPENDING_BREAKDOWN' as Intent,
				patterns: [
					/breakdown|spending.*by|category.*spending|where.*money/,
					/spending.*analysis|money.*breakdown/,
				],
				baseScore: 0.75,
			},
			{
				intent: 'CATEGORIZE_TX' as Intent,
				patterns: [
					/categorize|category.*for|what.*category|classify.*transaction/,
					/transaction.*category|auto.*categorize/,
				],
				baseScore: 0.85,
			},
			{
				intent: 'GENERAL_QA' as Intent,
				patterns: [
					/how.*work|what.*mean|explain|help|advice/,
					/tips|suggestions|recommendations/,
				],
				baseScore: 0.6,
			},
		];

		// Calculate scores for each intent
		for (const pattern of intentPatterns) {
			let maxScore = 0;

			for (const regex of pattern.patterns) {
				if (regex.test(question)) {
					// Boost score for exact matches
					const matchScore =
						pattern.baseScore + (question.match(regex) ? 0.1 : 0);
					maxScore = Math.max(maxScore, matchScore);
				}
			}

			// Context-aware scoring
			if (context) {
				maxScore = this.applyContextBoost(maxScore, pattern.intent, context);
			}

			if (maxScore > 0) {
				scores.push({
					intent: pattern.intent,
					p: maxScore,
					calibratedP: this.calibrateConfidence(maxScore),
					confidence: this.getConfidenceLevel(maxScore),
				});
			}
		}

		// Sort by calibrated probability
		scores.sort((a, b) => b.calibratedP - a.calibratedP);

		// If no clear intent detected, add UNKNOWN
		if (scores.length === 0 || scores[0].calibratedP < 0.3) {
			scores.unshift({
				intent: 'UNKNOWN',
				p: 0.5,
				calibratedP: 0.5,
				confidence: 'medium',
			});
		}

		return scores;
	}

	/**
	 * Make routing decision with hysteresis and shadow routing
	 */
	async makeRouteDecision(
		userQuestion: string,
		context?: FinancialContext
	): Promise<RouteDecision> {
		const intentScores = await this.detectMultiLabelIntents(
			userQuestion,
			context
		);
		const primary = intentScores[0];
		const secondary = intentScores.slice(1).filter((s) => s.calibratedP > 0.3);

		// Apply hysteresis
		const shouldUseHysteresis = this.shouldApplyHysteresis(primary.calibratedP);
		const routeType = this.determineRouteType(primary, shouldUseHysteresis);

		// Shadow routing - compute alternative route in background
		const shadowRoute = await this.computeShadowRoute(
			userQuestion,
			primary.intent,
			context
		);

		const decision: RouteDecision = {
			primary,
			secondary: secondary.length > 0 ? secondary : undefined,
			calibrated: true,
			routeType,
			shadowRoute,
		};

		// Update state for hysteresis
		this.lastRouteDecision = decision;
		this.lastRouteTime = Date.now();
		this.confidenceHistory.push({
			timestamp: Date.now(),
			confidence: primary.calibratedP,
		});

		// Keep only recent history (last 10 decisions)
		if (this.confidenceHistory.length > 10) {
			this.confidenceHistory = this.confidenceHistory.slice(-10);
		}

		return decision;
	}

	/**
	 * Calibrate confidence using temperature scaling
	 */
	private calibrateConfidence(rawScore: number): number {
		// Temperature scaling: p_calibrated = softmax(logits / temperature)
		const scaled = rawScore / this.calibrationParams.temperature;
		const calibrated = 1 / (1 + Math.exp(-scaled));

		// Apply bias and scale
		const adjusted = Math.max(
			0,
			Math.min(
				1,
				(calibrated + this.calibrationParams.bias) *
					this.calibrationParams.scale
			)
		);

		return adjusted;
	}

	/**
	 * Get human-readable confidence level
	 */
	private getConfidenceLevel(score: number): 'low' | 'medium' | 'high' {
		if (score >= 0.7) return 'high';
		if (score >= 0.4) return 'medium';
		return 'low';
	}

	/**
	 * Apply context-aware scoring boost
	 */
	private applyContextBoost(
		baseScore: number,
		intent: Intent,
		context: FinancialContext
	): number {
		let boost = 0;

		switch (intent) {
			case 'GET_BALANCE':
				if (context.budgets?.length > 0) boost += 0.1;
				if (context.transactions?.length > 0) boost += 0.05;
				break;
			case 'GET_BUDGET_STATUS':
				if (context.budgets?.length > 0) boost += 0.15;
				break;
			case 'FORECAST_SPEND':
				if (context.transactions?.length > 10) boost += 0.1;
				if (context.budgets?.length > 0) boost += 0.05;
				break;
			case 'GET_GOAL_PROGRESS':
				if (context.goals?.length > 0) boost += 0.15;
				break;
			case 'LIST_SUBSCRIPTIONS':
				if (context.transactions?.length > 5) boost += 0.1;
				break;
		}

		return Math.min(1, baseScore + boost);
	}

	/**
	 * Determine if hysteresis should be applied
	 */
	private shouldApplyHysteresis(currentConfidence: number): boolean {
		if (!this.lastRouteDecision) return false;

		const timeSinceLastRoute = Date.now() - this.lastRouteTime;
		if (timeSinceLastRoute < this.hysteresisConfig.minStableTime) {
			return true;
		}

		// Check if we're in a stable confidence range
		const recentConfidences = this.confidenceHistory
			.filter((h) => Date.now() - h.timestamp < 30000) // Last 30 seconds
			.map((h) => h.confidence);

		if (recentConfidences.length < 3) return false;

		const avgConfidence =
			recentConfidences.reduce((a, b) => a + b, 0) / recentConfidences.length;
		const variance =
			recentConfidences.reduce(
				(sum, c) => sum + Math.pow(c - avgConfidence, 2),
				0
			) / recentConfidences.length;

		// Apply hysteresis if confidence is stable (low variance)
		return variance < 0.01;
	}

	/**
	 * Determine route type based on confidence and hysteresis
	 */
	private determineRouteType(
		primary: IntentScore,
		useHysteresis: boolean
	): 'grounded' | 'llm' | 'unknown' {
		if (primary.intent === 'UNKNOWN') return 'unknown';

		const threshold = useHysteresis
			? this.hysteresisConfig.exitThreshold
			: this.hysteresisConfig.enterThreshold;

		if (primary.calibratedP >= threshold) {
			return 'grounded';
		} else if (primary.calibratedP >= 0.3) {
			return 'llm';
		} else {
			return 'unknown';
		}
	}

	/**
	 * Compute shadow route for misroute detection
	 */
	private async computeShadowRoute(
		userQuestion: string,
		primaryIntent: Intent,
		context?: FinancialContext
	): Promise<RouteDecision['shadowRoute']> {
		try {
			// Find the second most likely intent
			const intentScores = await this.detectMultiLabelIntents(
				userQuestion,
				context
			);
			const alternativeIntent = intentScores.find(
				(s) => s.intent !== primaryIntent
			);

			if (!alternativeIntent || alternativeIntent.calibratedP < 0.2) {
				return undefined;
			}

			// Generate alternative response (this would be computed in background)
			const alternativeResponse = await this.generateAlternativeResponse(
				alternativeIntent.intent,
				userQuestion,
				context
			);

			const delta = 0.1; // Placeholder delta for shadow routing

			return {
				alternativeIntent: alternativeIntent.intent,
				alternativeResponse,
				delta,
			};
		} catch (error) {
			console.warn('Shadow routing failed:', error);
			return undefined;
		}
	}

	/**
	 * Generate alternative response for shadow routing
	 */
	private async generateAlternativeResponse(
		intent: Intent,
		question: string,
		context?: FinancialContext
	): Promise<ChatResponse> {
		// This would integrate with your existing response generation
		// For now, return a placeholder
		return {
			message: `Alternative response for ${intent}`,
			details: `This would be the response if we routed to ${intent}`,
			cards: [],
			actions: [],
			sources: [{ kind: 'localML' }],
			cost: { model: 'mini', estTokens: 0 },
		};
	}

	/**
	 * Update calibration parameters based on feedback
	 */
	updateCalibration(feedback: {
		expectedIntent: Intent;
		actualIntent: Intent;
		confidence: number;
	}) {
		// Simple online calibration update
		const error = feedback.expectedIntent === feedback.actualIntent ? 0 : 1;

		// Adjust temperature based on error
		if (error > 0) {
			this.calibrationParams.temperature *= 0.95; // Reduce temperature for more conservative predictions
		} else {
			this.calibrationParams.temperature *= 1.02; // Slightly increase temperature
		}

		// Clamp temperature to reasonable range
		this.calibrationParams.temperature = Math.max(
			0.1,
			Math.min(1.0, this.calibrationParams.temperature)
		);
	}

	/**
	 * Get unknown intent clarifying questions
	 */
	getUnknownIntentClarification(): {
		question: string;
		choices: Array<{ label: string; intent: Intent }>;
	} {
		return {
			question: "I'm not sure what you're asking about. Could you clarify?",
			choices: [
				{ label: 'Budget status', intent: 'GET_BUDGET_STATUS' },
				{ label: 'Create budget', intent: 'CREATE_BUDGET' },
				{ label: 'Forecast next month', intent: 'FORECAST_SPEND' },
				{ label: 'Account balance', intent: 'GET_BALANCE' },
				{ label: 'Goal progress', intent: 'GET_GOAL_PROGRESS' },
				{ label: 'General help', intent: 'GENERAL_QA' },
			],
		};
	}

	/**
	 * Get system statistics for monitoring
	 */
	getSystemStats() {
		return {
			calibrationParams: this.calibrationParams,
			hysteresisConfig: this.hysteresisConfig,
			lastRouteTime: this.lastRouteTime,
			confidenceHistoryLength: this.confidenceHistory.length,
			averageConfidence:
				this.confidenceHistory.length > 0
					? this.confidenceHistory.reduce((sum, h) => sum + h.confidence, 0) /
					  this.confidenceHistory.length
					: 0,
		};
	}
}

// Export singleton instance
export const enhancedIntentMapper = new EnhancedIntentMapper();

// Backward compatibility functions
export async function detectIntent(
	userQuestion: string
): Promise<Intent | null> {
	const scores = await enhancedIntentMapper.detectMultiLabelIntents(
		userQuestion
	);
	return scores[0]?.intent || null;
}

export type IntentType = Intent;
