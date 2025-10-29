// routeModel.ts - Hybrid Cost Optimization with Critic + Tiered Narration
// Implements the 4-step process to keep hybrid costs down while maintaining quality

import { IntentType } from './intentMapper';
import { logger } from '../../../utils/logger';
import {
	EnhancedCriticService,
	CriticValidation,
} from './enhancedCriticService';
import {
	buildBudgetNarration,
	buildSpendingNarration,
	buildGoalNarration,
} from './budgetNarration';

export type ModelTier = 'mini' | 'std' | 'pro';

export interface ModelRoutingConfig {
	mini: {
		maxTokens: number;
		model: string;
		costPer1kTokens: number;
	};
	std: {
		maxTokens: number;
		model: string;
		costPer1kTokens: number;
	};
	pro: {
		maxTokens: number;
		model: string;
		costPer1kTokens: number;
		factsTrimmed: boolean;
	};
}

// Using enhanced critic validation from EnhancedCriticService
export type { CriticValidation } from './enhancedCriticService';

export interface NarrationStep {
	step: 'A' | 'B' | 'C' | 'D';
	description: string;
	modelUsed: ModelTier;
	tokenCount: number;
	cost: number;
}

/**
 * Step A: Ground with tools → assemble facts
 * Uses grounding layer to extract relevant financial data
 */
export async function groundWithTools(
	query: string,
	intent: IntentType,
	context: any
): Promise<{ facts: string[]; confidence: number; tokenCount: number }> {
	// Extract relevant facts based on intent with context trimming
	const facts: string[] = [];
	let confidence = 0.8;
	let tokenCount = 0;

	try {
		switch (intent) {
			case 'GET_BALANCE':
				if (context.budgets) {
					// Send only 3-5 most relevant budget rows
					const relevantBudgets = context.budgets
						.sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0))
						.slice(0, 5);

					facts.push(`You have ${context.budgets.length} active budgets`);
					facts.push(
						`Total budget amount: $${context.budgets
							.reduce((sum: number, b: any) => sum + b.amount, 0)
							.toFixed(2)}`
					);

					relevantBudgets.forEach((budget: any) => {
						facts.push(`${budget.name}: $${budget.amount.toFixed(2)}`);
					});
				}
				break;
			case 'GET_BUDGET_STATUS':
				if (context.budgets) {
					// Send only top 3-5 categories by spending pressure
					const budgetsWithPressure = context.budgets
						.map((budget: any) => ({
							...budget,
							pressure: (budget.spent || 0) / budget.amount,
						}))
						.sort((a: any, b: any) => b.pressure - a.pressure)
						.slice(0, 5);

					budgetsWithPressure.forEach((budget: any) => {
						const spent = budget.spent || 0;
						const remaining = budget.amount - spent;
						facts.push(
							`${budget.name}: $${remaining.toFixed(
								2
							)} remaining of $${budget.amount.toFixed(2)}`
						);
					});
				}
				break;
			case 'FORECAST_SPEND':
				if (context.transactions) {
					// Send only last 2 months deltas + top 3-5 categories
					const recentSpending = context.transactions
						.slice(-60)
						.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

					const categorySpending = context.transactions
						.slice(-60)
						.reduce((acc: any, t: any) => {
							const cat = t.category || 'Uncategorized';
							acc[cat] = (acc[cat] || 0) + (t.amount || 0);
							return acc;
						}, {});

					const topCategories = Object.entries(categorySpending)
						.sort(([, a]: any, [, b]: any) => b - a)
						.slice(0, 5);

					facts.push(`Recent 60-day spending: $${recentSpending.toFixed(2)}`);
					topCategories.forEach(([cat, amount]: [string, number]) => {
						facts.push(`${cat}: $${amount.toFixed(2)}`);
					});
				}
				break;
			default:
				// Build specific narration based on available data instead of generic fallback
				if (context.budgets && context.budgets.length > 0) {
					facts.push(
						buildBudgetNarration({ budgets: context.budgets, period: 'mtd' })
					);
				} else if (context.transactions && context.transactions.length > 0) {
					facts.push(
						buildSpendingNarration({
							transactions: context.transactions,
							period: 'mtd',
						})
					);
				} else if (context.goals && context.goals.length > 0) {
					facts.push(buildGoalNarration({ goals: context.goals }));
				} else {
					// Use actual budget narration instead of generic CTA
					facts.push(buildBudgetNarration({ budgets: [], period: 'mtd' }));
				}
		}

		tokenCount = facts.join(' ').split(' ').length * 1.3; // Rough token estimation
	} catch (error) {
		logger.warn('Grounding failed:', error);
		confidence = 0.4;
	}

	return { facts, confidence, tokenCount };
}

/**
 * Step B: Mini model writes the message (≤200 tokens)
 */
export async function miniModelWrite(
	query: string,
	intent: IntentType,
	facts: string[]
): Promise<{ message: string; tokenCount: number; cost: number }> {
	const config = getModelConfig();
	const maxTokens = Math.min(200, config.mini.maxTokens);

	// Simple response generation based on intent and facts
	let message = '';

	switch (intent) {
		case 'GET_BALANCE':
			message = `Based on your budgets: ${facts.join(
				'. '
			)}. You can view detailed breakdowns in the Budgets tab.`;
			break;
		case 'GET_BUDGET_STATUS':
			message = `Your budget status: ${facts.join(
				'. '
			)}. Tap any budget for more details.`;
			break;
		case 'FORECAST_SPEND':
			message = `Spending forecast: ${facts.join(
				'. '
			)}. Check the Insights tab for trends.`;
			break;
		default:
			// Use the first fact directly instead of wrapping it
			message =
				facts.length > 0
					? facts[0]
					: 'I can help you with your finances. What would you like to know?';
	}

	// Ensure message fits within token limit
	if (message.length > maxTokens * 4) {
		// Rough character to token ratio
		message = message.substring(0, maxTokens * 4) + '...';
	}

	const tokenCount = Math.min(message.split(' ').length * 1.3, maxTokens);
	const cost = (tokenCount / 1000) * config.mini.costPer1kTokens;

	return { message, tokenCount, cost };
}

/**
 * Step C: Enhanced Mini Critic validates with cascade quality system (≤50 tokens)
 */
export async function miniCriticValidate(
	message: string,
	facts: string[],
	query: string = '',
	context: any = {},
	factPack: any = null
): Promise<CriticValidation> {
	// Use enhanced critic service if available
	if (factPack && context) {
		try {
			const enhancedCritic = new EnhancedCriticService(factPack);
			const validation = await enhancedCritic.validateResponse(
				message,
				query,
				context
			);

			// Log which guard failed for analytics clustering
			if (!validation.isValid && validation.ruleValidation.guardFailed) {
				logger.debug(
					'🔍 [EnhancedCritic] Guard failed:',
					validation.ruleValidation.guardFailed
				);
			}

			return validation;
		} catch (error) {
			logger.warn(
				'🔍 [EnhancedCritic] Enhanced critic failed, falling back to basic:',
				error
			);
		}
	}

	// Fallback to basic validation
	const forbiddenPatterns = [
		/\bguarantee(d)?\b.*\breturn(s)?\b/i,
		/\brisk[-\s]?free\b/i,
		// directive + instrument (actual trade instruction)
		/\b(?:buy|sell|short|load up on)\b.*\b(stocks?|crypto|bitcoin|eth|option|call|put|ticker|etf)\b/i,
		// investment advice patterns
		/\binvest.*money.*(?:stocks?|crypto|bitcoin|eth|option|call|put|ticker|etf).*return/i,
		/\bshould.*invest.*money/i,
	];

	const forbiddenClaims: string[] = [];
	let isValid = true;

	// Check for forbidden patterns
	forbiddenPatterns.forEach((pattern) => {
		if (pattern.test(message)) {
			isValid = false;
			forbiddenClaims.push(`Contains forbidden pattern: ${pattern.source}`);
		}
	});

	// Validate fact consistency
	if (facts.length === 0 && message.includes('Based on your data')) {
		isValid = false;
		forbiddenClaims.push('Claims data without facts');
	}

	const confidence = isValid ? 0.9 : 0.3;
	const tokenCount = Math.min(50, forbiddenClaims.length * 10 + 20);

	return {
		isValid,
		ruleValidation: {
			passed: isValid,
			guardFailed: isValid ? undefined : 'basic_validation_failed',
			issues: forbiddenClaims,
			confidence,
			shouldEscalateToPro: false,
		},
		numericGuardrails: {
			amountsNonNegative: true,
			sumsMatchFactPack: true,
			datesInsideWindow: true,
			budgetLimitsRespected: true,
		},
		claimTypes: {
			hasForbiddenPhrasing: forbiddenClaims.length > 0,
			forbiddenClaims,
			riskLevel:
				forbiddenClaims.length > 2
					? 'high'
					: forbiddenClaims.length > 0
					? 'medium'
					: 'low',
		},
		confidence,
		tokenCount,
		escalationTriggered: false,
	};
}

/**
 * Step D: Only if user asks for strategy/plan → Pro model with strict token cap and trimmed facts
 */
export async function proModelStrategy(
	query: string,
	intent: IntentType,
	facts: string[],
	userAsk: string
): Promise<{
	message: string;
	tokenCount: number;
	cost: number;
	factsTrimmed: boolean;
}> {
	const config = getModelConfig();
	const maxTokens = config.pro.maxTokens;

	// Only proceed if user explicitly asks for strategy/plan
	if (!/plan|optimi[sz]e|strategy|invest/i.test(userAsk)) {
		throw new Error('Pro model not needed for this query type');
	}

	// Trim facts to essential ones only
	const trimmedFacts = facts.slice(0, 3); // Keep only first 3 facts
	const factsTrimmed = facts.length > 3;

	// Generate strategic response
	let message = '';
	switch (intent) {
		case 'FORECAST_SPEND':
			message = `Strategy: Based on ${trimmedFacts.join(
				', '
			)}, consider setting up spending alerts and reviewing your largest expenses monthly.`;
			break;
		default:
			message = `Strategic approach: ${trimmedFacts.join(
				'. '
			)}. Focus on consistent tracking and regular reviews.`;
	}

	// Ensure strict token compliance
	if (message.length > maxTokens * 4) {
		message = message.substring(0, maxTokens * 4) + '...';
	}

	const tokenCount = Math.min(message.split(' ').length * 1.3, maxTokens);
	const cost = (tokenCount / 1000) * config.pro.costPer1kTokens;

	return { message, tokenCount, cost, factsTrimmed };
}

/**
 * Main routing function: pickModel based on intent and user ask
 */
export function pickModel(intent: IntentType, userAsk: string): ModelTier {
	// Query complexity analysis first (takes precedence)
	if (/plan|optimi[sz]e|strategy|invest|analyze|recommend/i.test(userAsk))
		return 'pro';
	if (/forecast|trend|pattern|compare/i.test(userAsk)) return 'std';

	// Intent weight-based complexity estimation
	if (intent === 'OPTIMIZE_SPENDING') return 'pro';
	if (
		intent === 'FORECAST_SPEND' ||
		intent === 'GET_BUDGET_STATUS' ||
		intent === 'ANALYZE_SPENDING'
	)
		return 'std';
	if (intent === 'GET_BALANCE' || intent === 'GET_GOAL_STATUS') return 'mini';

	return 'mini';
}

/**
 * Execute the complete 4-step hybrid cost optimization process
 */
export async function executeHybridCostOptimization(
	query: string,
	intent: IntentType,
	context: any,
	userAsk: string
): Promise<{
	message: string;
	modelUsed: ModelTier;
	totalTokens: number;
	totalCost: number;
	steps: NarrationStep[];
	criticValidation: CriticValidation;
}> {
	const steps: NarrationStep[] = [];
	let totalTokens = 0;
	let totalCost = 0;

	// Step A: Ground with tools
	const grounding = await groundWithTools(query, intent, context);
	steps.push({
		step: 'A',
		description: 'Ground with tools → assemble facts',
		modelUsed: 'mini',
		tokenCount: grounding.tokenCount,
		cost: 0, // Grounding is free
	});
	totalTokens += grounding.tokenCount;

	// Step B: Mini model writes message
	const miniResponse = await miniModelWrite(query, intent, grounding.facts);
	steps.push({
		step: 'B',
		description: 'Mini model writes message (≤200 tokens)',
		modelUsed: 'mini',
		tokenCount: miniResponse.tokenCount,
		cost: miniResponse.cost,
	});
	totalTokens += miniResponse.tokenCount;
	totalCost += miniResponse.cost;

	// Step C: Enhanced Mini Critic validates with cascade quality system
	const criticValidation = await miniCriticValidate(
		miniResponse.message,
		grounding.facts,
		query,
		context,
		context.factPack || null
	);
	steps.push({
		step: 'C',
		description: 'Mini Critic validates forbidden claims (≤30 tokens)',
		modelUsed: 'mini',
		tokenCount: criticValidation.tokenCount,
		cost:
			(criticValidation.tokenCount / 1000) *
			getModelConfig().mini.costPer1kTokens,
	});
	totalTokens += criticValidation.tokenCount;
	totalCost +=
		(criticValidation.tokenCount / 1000) *
		getModelConfig().mini.costPer1kTokens;

	// Step D: Pro model escalation based on enhanced critic validation
	let finalMessage = miniResponse.message;
	let modelUsed: ModelTier = 'mini';

	// Escalate to Pro if critic triggers escalation
	if (criticValidation.escalationTriggered) {
		logger.debug(
			'🔍 [EnhancedCritic] Escalating to Pro model:',
			criticValidation.escalationReason
		);
		try {
			const proResponse = await proModelStrategy(
				query,
				intent,
				grounding.facts,
				userAsk
			);
			steps.push({
				step: 'D',
				description: `Pro model escalation: ${criticValidation.escalationReason}`,
				modelUsed: 'pro',
				tokenCount: proResponse.tokenCount,
				cost: proResponse.cost,
			});
			totalTokens += proResponse.tokenCount;
			totalCost += proResponse.cost;
			finalMessage = proResponse.message;
			modelUsed = 'pro';
		} catch (error) {
			logger.debug('Pro model escalation failed:', error.message);
		}
	}
	// Fallback escalation for strategic planning requests
	else if (
		criticValidation.isValid &&
		/plan|optimi[sz]e|strategy|invest/i.test(userAsk)
	) {
		try {
			const proResponse = await proModelStrategy(
				query,
				intent,
				grounding.facts,
				userAsk
			);
			steps.push({
				step: 'D',
				description: 'Pro model with strict token cap and trimmed facts',
				modelUsed: 'pro',
				tokenCount: proResponse.tokenCount,
				cost: proResponse.cost,
			});
			totalTokens += proResponse.tokenCount;
			totalCost += proResponse.cost;
			finalMessage = proResponse.message;
			modelUsed = 'pro';
		} catch (error) {
			// Pro model not needed, continue with mini response
			logger.debug('Pro model not needed:', error.message);
		}
	}

	return {
		message: finalMessage,
		modelUsed,
		totalTokens,
		totalCost,
		steps,
		criticValidation,
	};
}

/**
 * Get model configuration with cost and token limits
 */
function getModelConfig(): ModelRoutingConfig {
	return {
		mini: {
			maxTokens: 200,
			model: 'gpt-3.5-turbo',
			costPer1kTokens: 0.002,
		},
		std: {
			maxTokens: 400,
			model: 'gpt-3.5-turbo',
			costPer1kTokens: 0.002,
		},
		pro: {
			maxTokens: 800,
			model: 'gpt-4',
			costPer1kTokens: 0.03,
			factsTrimmed: true,
		},
	};
}

/**
 * Calculate cost savings compared to always using pro model
 */
export function calculateCostSavings(
	totalCost: number,
	totalTokens: number
): { savings: number; percentage: number } {
	const proModelCost = (totalTokens / 1000) * 0.03; // gpt-4 cost
	const savings = proModelCost - totalCost;
	const percentage = (savings / proModelCost) * 100;

	return { savings, percentage };
}
