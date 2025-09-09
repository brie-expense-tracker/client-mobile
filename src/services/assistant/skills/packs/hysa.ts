// HYSA Skill Pack - Migrated from existing HYSA implementation
// Each topic pack supplies: matchers, micro-solvers, KB fallback, and BaseResearchAgent instance

import { Skill } from '../types';
import { BaseResearchAgent } from '../baseResearchAgent';
import { hysaInterestEstimator, hysaAdvisor } from '../../microSolvers';
import { scoreUsefulness } from '../../usefulness';
import { webFnsForHYSA } from './webFns/hysaWebFns';
import { ChatResponse } from '../../responseSchema';
import { ActionType } from '../../actionTypes';

type HysaItem = {
	bank: string;
	product: string;
	apy?: number;
	minBalance?: number;
	fees?: string;
	achSpeed?: '1-2d' | '3-5d' | 'unknown';
	buckets?: boolean;
	url: string;
};

// Create the research agent instance
const agent = new BaseResearchAgent<HysaItem>(
	'high yield savings account',
	webFnsForHYSA,
	{
		editorialAllow: [
			'nerdwallet.com',
			'bankrate.com',
			'forbes.com',
			'investopedia.com',
			'thebalance.com',
			'wallethub.com',
		],
		domainAllowPatterns: [
			/ally\.com/i,
			/marcus\.com/i,
			/capitalone\.com/i,
			/discover\.com/i,
			/americanexpress\.com/i,
			/synchronybank\.com/i,
			/sofi\.com/i,
			/barclays\.us/i,
		],
	},
	(url, raw) => ({
		bank: raw.bank || new URL(url).hostname,
		product: raw.product || 'High-Yield Savings',
		apy: raw.apy,
		minBalance: raw.minBalance ?? 0,
		fees: raw.fees || 'no monthly fee',
		achSpeed: raw.achSpeed || 'unknown',
		buckets: !!raw.buckets,
		url,
	}),
	(item, query) => {
		let score = item.apy ?? 0; // Base score from APY
		if (item.minBalance === 0) score += 0.6; // Bonus for no minimum
		if (/no/i.test(item.fees || '')) score += 0.5; // Bonus for no fees
		if (item.buckets) score += 0.3; // Bonus for buckets
		if (item.achSpeed === '1-2d') score += 0.4; // Bonus for fast ACH

		// Query-specific boosts
		if (/\bbucket|sub[-\s]?account\b/i.test(query) && item.buckets)
			score += 0.2;
		if (
			/\bno\s+fees|avoid\s+fees\b/i.test(query) &&
			/no/i.test(item.fees || '')
		)
			score += 0.2;
		if (
			/\bfast\s+ach|instant\s+transfer|1-2\s*day\b/i.test(query) &&
			item.achSpeed === '1-2d'
		)
			score += 0.2;

		return score;
	}
);

function userConsentedNow(ctx: any): boolean {
	// e.g., set by UI action "FETCH_HYSA_PICKS"
	return ctx?.sessionContext?.actions?.includes?.('FETCH_HYSA_PICKS');
}

function complianceGuard(resp: ChatResponse): ChatResponse {
	const must = [/educational/i, /verify/i];
	const has = must.every((rx) => rx.test(resp.message));
	if (!has) {
		resp.message += `\n\n*Educational, not advice. Verify rates on the bank's site before opening. FDIC/NCUA where applicable.*`;
	}
	return resp;
}

export const HYSA_SKILL: Skill = {
	id: 'HYSA',
	name: 'High-Yield Savings Account Assistant',
	description:
		'Provides information and recommendations about high-yield savings accounts',
	matches: (q) =>
		/\b(high[-\s]?yield\s+savings|hysa|banks?|accounts?)\b/i.test(q),
	run: async (params: any, ctx: any) => {
		// This skill uses microSolvers and researchAgent instead of run
		return { success: false, error: 'Use microSolvers or researchAgent' };
	},

	microSolvers: [
		// Zero-token answers (fastest)
		(q, ctx) => {
			const result = hysaInterestEstimator(q, ctx);
			if (!result) return null;
			return {
				response: {
					message: result.answer,
					actions: (result.actions || []).map((action) => ({
						...action,
						action: action.action as any,
					})),
					sources: [{ kind: 'localML' as const }],
					cost: {
						model: 'mini' as const,
						estTokens: Math.ceil(result.answer.length / 4),
					},
					confidence: result.confidence,
				},
				matchedPattern: result.matchedPattern,
				usefulness: scoreUsefulness({
					message: result.answer,
					actions: (result.actions || []).map((action) => ({
						...action,
						action: action.action as any,
					})),
					sources: [{ kind: 'localML' as const }],
					cost: { model: 'mini' as const, estTokens: 0 },
					confidence: result.confidence,
				}),
			};
		},

		(q, ctx) => {
			const result = hysaAdvisor(q, ctx);
			if (!result) return null;
			return {
				response: {
					message: result.answer,
					actions: (result.actions || []).map((action) => ({
						...action,
						action: action.action as any,
					})),
					sources: [{ kind: 'localML' as const }],
					cost: {
						model: 'mini' as const,
						estTokens: Math.ceil(result.answer.length / 4),
					},
					confidence: result.confidence,
				},
				matchedPattern: result.matchedPattern,
				usefulness: scoreUsefulness({
					message: result.answer,
					actions: (result.actions || []).map((action) => ({
						...action,
						action: action.action as any,
					})),
					sources: [{ kind: 'localML' as const }],
					cost: { model: 'mini' as const, estTokens: 0 },
					confidence: result.confidence,
				}),
			};
		},

		// General HYSA knowledge micro-solver
		(q, ctx) => {
			// Handle general "What is a HYSA?" type questions
			if (
				!/\b(what\s+is|what'?s|explain|tell\s+me\s+about)\b.*\b(high[-\s]?yield\s+savings|hysa)\b/i.test(
					q
				)
			) {
				return null;
			}

			const answer = `A **High-Yield Savings Account (HYSA)** is a type of savings account that offers significantly higher interest rates than traditional savings accounts.

**Key features:**
• **Higher APY** - typically 4-5% vs 0.01% for regular savings
• **FDIC insured** up to $250,000 per bank
• **Online-only** - no physical branches, lower overhead costs
• **No monthly fees** and often no minimum balance requirements
• **Easy access** - can transfer money in/out as needed

**Best for:** Emergency funds, short-term savings goals, money you want to keep liquid but earning more than a checking account.

**Current rates:** Top HYSA accounts offer 4.5-5.0% APY (rates change frequently).`;

			const response = {
				message: answer,
				actions: [
					{
						label: 'Create Savings Goal',
						action: ActionType.OPEN_GOAL_FORM as any,
						params: { type: 'savings' },
					},
					{
						label: 'Calculate Interest',
						action: ActionType.OPEN_COMPOUND_CALCULATOR as any,
						params: { type: 'hysa' },
					},
				],
				sources: [{ kind: 'localML' as const }],
				cost: {
					model: 'mini' as const,
					estTokens: Math.ceil(answer.length / 4),
				},
				confidence: 0.9,
			};

			return {
				response,
				matchedPattern: 'HYSA_GENERAL_KNOWLEDGE',
				usefulness: scoreUsefulness(response),
			};
		},

		// Rate comparison micro-solver
		(q, ctx) => {
			// Handle rate comparison questions
			if (
				!/\b(compare|comparison|rates?|apy|interest)\b.*\b(hysa|savings|account)\b/i.test(
					q
				)
			) {
				return null;
			}

			const answer = `**Current HYSA Rate Comparison:**

**Top Tier (4.5-5.0% APY):**
• Marcus by Goldman Sachs
• Ally Bank
• Capital One 360
• Discover Bank

**Mid Tier (4.0-4.5% APY):**
• SoFi
• American Express
• Synchrony Bank

**Key factors to compare:**
• APY (Annual Percentage Yield)
• Minimum balance requirements
• Monthly fees
• ACH transfer speed
• Mobile app quality
• Customer service

*Rates change frequently - always verify current rates on the bank's website.*`;

			const response = {
				message: answer,
				actions: [
					{
						label: 'Get Current Rates',
						action: ActionType.FETCH_HYSA_PICKS as any,
					},
					{
						label: 'Compare Accounts',
						action: ActionType.OPEN_LINKS as any,
						params: {
							urls: [
								'https://www.marcus.com',
								'https://www.ally.com',
								'https://www.capitalone.com',
							],
						},
					},
				],
				sources: [{ kind: 'localML' as const }],
				cost: {
					model: 'mini' as const,
					estTokens: Math.ceil(answer.length / 4),
				},
				confidence: 0.85,
			};

			return {
				response,
				matchedPattern: 'HYSA_RATE_COMPARISON',
				usefulness: scoreUsefulness(response),
			};
		},

		// Safety and security micro-solver
		(q, ctx) => {
			// Handle safety/security questions
			if (
				!/\b(safe|secure|fdic|insured|risk|protect)\b.*\b(hysa|savings|account)\b/i.test(
					q
				)
			) {
				return null;
			}

			const answer = `**HYSA Safety & Security:**

**FDIC Insurance:**
• Up to $250,000 per depositor, per bank
• Covers principal and interest
• Automatic protection - no signup required
• Covers all deposit accounts (checking, savings, CDs)

**Security Features:**
• Bank-level encryption
• Two-factor authentication
• Fraud monitoring
• Account alerts
• Secure mobile apps

**Risk Level:** Very low - HYSA accounts are among the safest places to keep money, especially when FDIC insured.

**What's NOT covered:**
• Investment losses
• Cryptocurrency
• Accounts over $250,000 (per bank)
• Non-deposit products`;

			const response = {
				message: answer,
				actions: [
					{
						label: 'Learn More About FDIC',
						action: ActionType.OPEN_ARTICLE as any,
						params: { slug: 'fdic-insurance' },
					},
					{
						label: 'Check Bank Safety',
						action: ActionType.OPEN_LINKS as any,
						params: {
							urls: ['https://www.fdic.gov/resources/deposit-insurance/'],
						},
					},
				],
				sources: [{ kind: 'localML' as const }],
				cost: {
					model: 'mini' as const,
					estTokens: Math.ceil(answer.length / 4),
				},
				confidence: 0.95,
			};

			return {
				response,
				matchedPattern: 'HYSA_SAFETY_SECURITY',
				usefulness: scoreUsefulness(response),
			};
		},
	],

	researchAgent: async (q, ctx) => {
		const asksPicks =
			/\b(best|which|recommend|suggest|top|banks?|accounts?)\b/i.test(q);
		if (!asksPicks) return null;

		// For general HYSA questions, provide criteria directly instead of asking for consent
		if (/\b(what|how|look for|criteria|features)\b/i.test(q)) {
			const message = `**What to look for in a high-yield savings account (HYSA):**

• **FDIC/NCUA insured** at the bank/credit union level
• **APY** near the current top tier (rates change—avoid teaser promo traps)
• **No/low fees** and **$0 minimums** if possible
• **ACH transfer speed** (1-2 business days) and decent daily limits
• **Sub-accounts/"buckets"** to separate goals
• Solid mobile app and customer support

*Educational, not advice. Verify rates on the bank's site before opening. FDIC/NCUA where applicable.*`;

			return {
				response: {
					message,
					actions: [
						{
							label: 'Create Savings Goal',
							action: ActionType.OPEN_GOAL_FORM as any,
							params: { type: 'savings' },
						},
						{ label: 'Open Goals', action: ActionType.OPEN_GOAL_WIZARD as any },
					],
					sources: [],
					cost: { model: 'mini', estTokens: Math.ceil(message.length / 4) },
					confidence: 0.9,
				},
				matchedPattern: 'HYSA_CRITERIA',
				usefulness: 4,
			};
		}

		if (!userConsentedNow(ctx)) {
			const message = `I can fetch **current HYSA options** from bank sites and rank them by APY, fees, and $0 minimums.  
This is *educational, not advice* and rates change—please verify before opening.`;

			// Set consent flags for follow-up handling
			ctx.sessionContext = ctx.sessionContext || {};
			ctx.sessionContext.awaitingConsent = 'FETCH_HYSA_PICKS';
			ctx.sessionContext.pendingQuery = q;
			ctx.sessionContext.currentFocus = 'HYSA';
			ctx.sessionContext.focusExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

			return {
				response: {
					message,
					actions: [
						{
							label: 'Fetch current HYSA picks',
							action: ActionType.FETCH_HYSA_PICKS as any,
						},
						{
							label: 'What to look for',
							action: ActionType.OPEN_ARTICLE as any,
							params: { slug: 'hysa-criteria' },
						},
					],
					sources: [],
					cost: { model: 'mini', estTokens: Math.ceil(message.length / 4) },
					confidence: 0.8,
				},
				matchedPattern: 'HYSA_CONSENT',
				usefulness: 4,
			};
		}

		// user tapped consent → run your research agent (already implemented)
		console.log(`[HYSA Skill] Running research agent for: ${q}`);

		// Clear consent flags and set focus
		ctx.sessionContext = ctx.sessionContext || {};
		ctx.sessionContext.actions = [];
		ctx.sessionContext.awaitingConsent = undefined;
		ctx.sessionContext.pendingQuery = undefined;
		ctx.sessionContext.currentFocus = 'HYSA';
		ctx.sessionContext.focusExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

		try {
			const data = await agent.run(q);
			if (!data || data.items.length === 0) {
				return {
					response: {
						message:
							'No current HYSA data available. Please try again later or check individual bank websites for current rates.',
						actions: [
							{
								label: 'Try Again',
								action: ActionType.FETCH_HYSA_PICKS as any,
							},
							{
								label: 'Check Bank Sites',
								action: ActionType.OPEN_LINKS as any,
								params: {
									urls: [
										'https://www.marcus.com',
										'https://www.ally.com',
										'https://www.capitalone.com',
									],
								},
							},
						],
						sources: [{ kind: 'gpt' as const, note: 'no_data_available' }],
						cost: { model: 'mini' as const, estTokens: 20 },
						confidence: 0.3,
					},
					matchedPattern: 'HYSA_NO_DATA',
					usefulness: 2,
				};
			}

			const topItems = data.items.slice(0, 3);
			const bullets = topItems
				.map(
					(item, i) =>
						`${i + 1}) **${item.bank} – ${item.product}** — ${item.apy?.toFixed(
							2
						)}% APY` +
						`${item.minBalance ? `, $${item.minBalance} min` : ''}` +
						`${item.fees ? `, ${item.fees}` : ''}` +
						`${item.buckets ? ', buckets' : ''}` +
						`${
							item.achSpeed && item.achSpeed !== 'unknown'
								? `, ACH ${item.achSpeed}`
								: ''
						}.`
				)
				.join('\n');

			const message = `**Top HYSA picks (checked ${data.checkedAt})**\n${bullets}\n\n*Why these:* competitive APY, low/no fees, low minimums. **Verify terms on the bank page.**`;

			const response = {
				message,
				actions: [
					{
						label: 'Open bank pages',
						action: ActionType.OPEN_LINKS as any,
						params: { urls: topItems.map((x) => x.url) },
					},
					{
						label: 'Plan monthly transfer',
						action: ActionType.OPEN_TRANSFER_PLANNER as any,
						params: { amount: 100 },
					},
				],
				sources: topItems.map((item) => ({
					kind: 'gpt' as const,
					note: `HYSA data from ${item.bank}`,
				})),
				cost: {
					model: 'std' as const,
					estTokens: Math.ceil(message.length / 4),
				},
				confidence: 0.75,
			};

			return {
				response: complianceGuard(response),
				usefulness: 5,
				matchedPattern: 'HYSA_AGENT',
			};
		} catch (error) {
			console.error('[HYSA Skill] Research agent error:', error);
			return {
				response: {
					message:
						'Sorry, I encountered an error while fetching current HYSA data. Please try again or check individual bank websites.',
					actions: [
						{
							label: 'Try Again',
							action: ActionType.FETCH_HYSA_PICKS as any,
						},
						{
							label: 'Check Bank Sites',
							action: ActionType.OPEN_LINKS as any,
							params: {
								urls: [
									'https://www.marcus.com',
									'https://www.ally.com',
									'https://www.capitalone.com',
								],
							},
						},
					],
					sources: [{ kind: 'gpt' as const, note: 'error_occurred' }],
					cost: { model: 'mini' as const, estTokens: 25 },
					confidence: 0.2,
				},
				matchedPattern: 'HYSA_ERROR',
				usefulness: 1,
			};
		}
	},

	config: {
		minUsefulness: 3,
		priority: 10, // High priority for HYSA
	},
};
