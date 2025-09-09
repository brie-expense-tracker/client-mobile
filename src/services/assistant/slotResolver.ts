// Slot & Entity Resolver - Handles time periods, money amounts, categories, merchants
// The secret sauce for high coverage - resolves missing parameters before asking questions

import { ChatContext } from '../../services/feature/chatController';

// Type definitions for better type safety
export interface Account {
	id: string;
	name: string;
	type: 'checking' | 'savings' | 'credit' | 'investment' | 'other';
	balance?: number;
}

export interface Goal {
	id: string;
	name: string;
	targetAmount?: number;
	currentAmount?: number;
	deadline?: string;
	category?: string;
}

export interface Transaction {
	id: string;
	amount: number;
	merchant?: string;
	category?: string;
	account?: string;
	date: string;
}

export interface Budget {
	id: string;
	name: string;
	amount: number;
	spent?: number;
	category?: string;
	period?: string;
}

// Slot types
export type SlotType =
	| 'period'
	| 'amount'
	| 'category'
	| 'merchant'
	| 'account'
	| 'goal_id';

// Resolved slot value
export interface ResolvedSlot {
	type: SlotType;
	value: any;
	confidence: number;
	source: 'explicit' | 'inferred' | 'default' | 'context';
	originalText?: string;
}

// Slot resolution result
export interface SlotResolution {
	resolved: Record<string, ResolvedSlot>;
	missing: string[];
	suggestions: Record<string, string[]>;
}

// Time period resolver
export class TimePeriodResolver {
	private patterns: {
		pattern: RegExp;
		period: string;
		confidence: number;
	}[] = [
		// Explicit periods
		{
			pattern: /this month|current month|mtd|month to date/i,
			period: 'this_month',
			confidence: 0.95,
		},
		{
			pattern: /last month|previous month/i,
			period: 'last_month',
			confidence: 0.95,
		},
		{
			pattern: /this week|current week|wtd|week to date/i,
			period: 'this_week',
			confidence: 0.95,
		},
		{
			pattern: /last week|previous week/i,
			period: 'last_week',
			confidence: 0.95,
		},
		{
			pattern: /this year|current year|ytd|year to date/i,
			period: 'this_year',
			confidence: 0.95,
		},
		{
			pattern: /last year|previous year/i,
			period: 'last_year',
			confidence: 0.95,
		},

		// Relative periods
		{ pattern: /last (\d+) days?/i, period: 'last_days', confidence: 0.9 },
		{ pattern: /last (\d+) weeks?/i, period: 'last_weeks', confidence: 0.9 },
		{ pattern: /last (\d+) months?/i, period: 'last_months', confidence: 0.9 },
		{ pattern: /past (\d+) days?/i, period: 'past_days', confidence: 0.9 },
		{ pattern: /past (\d+) weeks?/i, period: 'past_weeks', confidence: 0.9 },
		{ pattern: /past (\d+) months?/i, period: 'past_months', confidence: 0.9 },

		// Quarter references
		{ pattern: /q1|first quarter/i, period: 'q1', confidence: 0.9 },
		{ pattern: /q2|second quarter/i, period: 'q2', confidence: 0.9 },
		{ pattern: /q3|third quarter/i, period: 'q3', confidence: 0.9 },
		{ pattern: /q4|fourth quarter/i, period: 'q4', confidence: 0.9 },

		// Common phrases
		{ pattern: /recently|lately/i, period: 'last_30_days', confidence: 0.7 },
		{ pattern: /so far|up to now/i, period: 'ytd', confidence: 0.8 },
	];

	resolve(utterance: string, context: ChatContext): ResolvedSlot | null {
		const text = utterance.toLowerCase();

		for (const { pattern, period, confidence } of this.patterns) {
			const match = text.match(pattern);
			if (match) {
				return {
					type: 'period',
					value: this.normalizePeriod(period, match),
					confidence,
					source: 'explicit',
					originalText: match[0],
				};
			}
		}

		// Default to current month if no period specified
		return {
			type: 'period',
			value: 'this_month',
			confidence: 0.5,
			source: 'default',
		};
	}

	private normalizePeriod(period: string, match: RegExpMatchArray): string {
		if (period === 'last_days' && match[1]) {
			return `last_${match[1]}_days`;
		}
		if (period === 'last_weeks' && match[1]) {
			return `last_${match[1]}_weeks`;
		}
		if (period === 'last_months' && match[1]) {
			return `last_${match[1]}_months`;
		}
		if (period === 'past_days' && match[1]) {
			return `past_${match[1]}_days`;
		}
		if (period === 'past_weeks' && match[1]) {
			return `past_${match[1]}_weeks`;
		}
		if (period === 'past_months' && match[1]) {
			return `past_${match[1]}_months`;
		}
		return period;
	}

	getSuggestions(): string[] {
		return [
			'this month',
			'last 30 days',
			'this week',
			'last week',
			'this year',
			'last 3 months',
			'last 6 months',
		];
	}
}

// Money amount resolver
export class MoneyAmountResolver {
	private patterns: {
		pattern: RegExp;
		extractor: (match: RegExpMatchArray) => number;
		confidence: number;
	}[] = [
		// Dollar amounts
		{
			pattern: /\$(\d+(?:\.\d{2})?)/g,
			extractor: (m) => parseFloat(m[1]),
			confidence: 0.95,
		},
		{
			pattern: /(\d+(?:\.\d{2})?)\s*dollars?/gi,
			extractor: (m) => parseFloat(m[1]),
			confidence: 0.9,
		},
		{
			pattern: /(\d+(?:\.\d{2})?)\s*bucks?/gi,
			extractor: (m) => parseFloat(m[1]),
			confidence: 0.8,
		},

		// K notation
		{
			pattern: /\$?(\d+(?:\.\d+)?)k/gi,
			extractor: (m) => parseFloat(m[1]) * 1000,
			confidence: 0.9,
		},
		{
			pattern: /(\d+(?:\.\d+)?)\s*thousand/gi,
			extractor: (m) => parseFloat(m[1]) * 1000,
			confidence: 0.9,
		},

		// M notation
		{
			pattern: /\$?(\d+(?:\.\d+)?)m/gi,
			extractor: (m) => parseFloat(m[1]) * 1000000,
			confidence: 0.9,
		},
		{
			pattern: /(\d+(?:\.\d+)?)\s*million/gi,
			extractor: (m) => parseFloat(m[1]) * 1000000,
			confidence: 0.9,
		},

		// Just numbers
		{
			pattern: /\b(\d+(?:\.\d{2})?)\b/g,
			extractor: (m) => parseFloat(m[1]),
			confidence: 0.6,
		},
	];

	resolve(utterance: string, context: ChatContext): ResolvedSlot | null {
		const text = utterance;
		let bestMatch: ResolvedSlot | null = null;

		for (const { pattern, extractor, confidence } of this.patterns) {
			const matches = [...text.matchAll(pattern)];
			for (const match of matches) {
				const amount = extractor(match);
				if (amount > 0 && amount < 10000000) {
					// Reasonable range
					if (!bestMatch || confidence > bestMatch.confidence) {
						bestMatch = {
							type: 'amount',
							value: amount,
							confidence,
							source: 'explicit',
							originalText: match[0],
						};
					}
				}
			}
		}

		return bestMatch;
	}

	getSuggestions(): string[] {
		return ['$100', '$500', '$1000', '$2000', '$5000'];
	}
}

// Category resolver
export class CategoryResolver {
	private categoryMap: Record<string, string> = {
		// Food & Dining
		groceries: 'groceries',
		grocery: 'groceries',
		food: 'groceries',
		supermarket: 'groceries',
		dining: 'dining',
		restaurant: 'dining',
		restaurants: 'dining',
		'eating out': 'dining',
		takeout: 'dining',
		delivery: 'dining',

		// Transportation
		transportation: 'transportation',
		transport: 'transportation',
		gas: 'transportation',
		fuel: 'transportation',
		gasoline: 'transportation',
		uber: 'transportation',
		lyft: 'transportation',
		taxi: 'transportation',
		parking: 'transportation',
		tolls: 'transportation',

		// Entertainment
		entertainment: 'entertainment',
		movies: 'entertainment',
		netflix: 'entertainment',
		spotify: 'entertainment',
		games: 'entertainment',
		gaming: 'entertainment',
		hobbies: 'entertainment',

		// Utilities
		utilities: 'utilities',
		electric: 'utilities',
		electricity: 'utilities',
		water: 'utilities',
		internet: 'utilities',
		phone: 'utilities',
		cable: 'utilities',
		heating: 'utilities',
		cooling: 'utilities',

		// Healthcare
		healthcare: 'healthcare',
		medical: 'healthcare',
		doctor: 'healthcare',
		pharmacy: 'healthcare',
		insurance: 'healthcare',
		dental: 'healthcare',
		vision: 'healthcare',

		// Shopping
		shopping: 'shopping',
		clothes: 'shopping',
		clothing: 'shopping',
		amazon: 'shopping',
		retail: 'shopping',
		online: 'shopping',
	};

	resolve(utterance: string, context: ChatContext): ResolvedSlot | null {
		const text = utterance.toLowerCase();

		for (const [keyword, category] of Object.entries(this.categoryMap)) {
			if (text.includes(keyword)) {
				return {
					type: 'category',
					value: category,
					confidence: 0.9,
					source: 'explicit',
					originalText: keyword,
				};
			}
		}

		// Try to infer from context
		if (context.budgets?.length) {
			const budgetCategories = context.budgets
				.map((b) => b.name?.toLowerCase())
				.filter(Boolean);
			for (const budgetCategory of budgetCategories) {
				if (text.includes(budgetCategory)) {
					return {
						type: 'category',
						value: budgetCategory,
						confidence: 0.8,
						source: 'context',
					};
				}
			}
		}

		return null;
	}

	getSuggestions(): string[] {
		return [
			'groceries',
			'dining',
			'transportation',
			'entertainment',
			'utilities',
			'healthcare',
			'shopping',
		];
	}
}

// Merchant resolver
export class MerchantResolver {
	private merchantPatterns: {
		pattern: RegExp;
		merchant: string;
		confidence: number;
	}[] = [
		// Common merchants
		{ pattern: /amazon/i, merchant: 'Amazon', confidence: 0.95 },
		{ pattern: /starbucks/i, merchant: 'Starbucks', confidence: 0.95 },
		{ pattern: /mcdonald/i, merchant: "McDonald's", confidence: 0.95 },
		{ pattern: /walmart/i, merchant: 'Walmart', confidence: 0.95 },
		{ pattern: /target/i, merchant: 'Target', confidence: 0.95 },
		{ pattern: /costco/i, merchant: 'Costco', confidence: 0.95 },
		{ pattern: /whole foods/i, merchant: 'Whole Foods', confidence: 0.95 },
		{ pattern: /trader joe/i, merchant: "Trader Joe's", confidence: 0.95 },
		{ pattern: /uber/i, merchant: 'Uber', confidence: 0.95 },
		{ pattern: /lyft/i, merchant: 'Lyft', confidence: 0.95 },
		{ pattern: /netflix/i, merchant: 'Netflix', confidence: 0.95 },
		{ pattern: /spotify/i, merchant: 'Spotify', confidence: 0.95 },
	];

	resolve(utterance: string, context: ChatContext): ResolvedSlot | null {
		const text = utterance;

		for (const { pattern, merchant, confidence } of this.merchantPatterns) {
			if (pattern.test(text)) {
				return {
					type: 'merchant',
					value: merchant,
					confidence,
					source: 'explicit',
					originalText: text.match(pattern)?.[0],
				};
			}
		}

		// Try to find merchant in transaction history
		if (context.transactions?.length) {
			const merchants = [
				...new Set(context.transactions.map((t) => t.merchant).filter(Boolean)),
			];
			for (const merchant of merchants) {
				if (text.toLowerCase().includes(merchant.toLowerCase())) {
					return {
						type: 'merchant',
						value: merchant,
						confidence: 0.8,
						source: 'context',
					};
				}
			}
		}

		return null;
	}

	getSuggestions(): string[] {
		return [
			'Amazon',
			'Starbucks',
			"McDonald's",
			'Walmart',
			'Target',
			'Costco',
			'Uber',
			'Netflix',
		];
	}
}

// Account resolver
export class AccountResolver {
	private accountPatterns: {
		pattern: RegExp;
		accountType: string;
		confidence: number;
	}[] = [
		// Account type patterns
		{
			pattern: /checking|checking account/i,
			accountType: 'checking',
			confidence: 0.95,
		},
		{
			pattern: /savings|savings account/i,
			accountType: 'savings',
			confidence: 0.95,
		},
		{
			pattern: /credit|credit card|credit account/i,
			accountType: 'credit',
			confidence: 0.95,
		},
		{
			pattern: /investment|investments|investment account/i,
			accountType: 'investment',
			confidence: 0.95,
		},
		{ pattern: /debit|debit card/i, accountType: 'checking', confidence: 0.9 },
		{ pattern: /cash/i, accountType: 'checking', confidence: 0.8 },
	];

	resolve(utterance: string, context: ChatContext): ResolvedSlot | null {
		const text = utterance.toLowerCase();

		// Try to match account type patterns
		for (const { pattern, accountType, confidence } of this.accountPatterns) {
			if (pattern.test(text)) {
				return {
					type: 'account',
					value: accountType,
					confidence,
					source: 'explicit',
					originalText: text.match(pattern)?.[0],
				};
			}
		}

		// Try to find specific account by name
		if (context.accounts?.length) {
			for (const account of context.accounts) {
				if (account.name && text.includes(account.name.toLowerCase())) {
					return {
						type: 'account',
						value: account.id,
						confidence: 0.9,
						source: 'explicit',
						originalText: account.name,
					};
				}
			}
		}

		// Default to checking account if no specific account mentioned
		return {
			type: 'account',
			value: 'checking',
			confidence: 0.5,
			source: 'default',
		};
	}

	getSuggestions(): string[] {
		return ['checking', 'savings', 'credit card', 'investment'];
	}
}

// Goal resolver
export class GoalResolver {
	resolve(utterance: string, context: ChatContext): ResolvedSlot | null {
		const text = utterance.toLowerCase();

		// Try to find goal by name or ID
		if (context.goals?.length) {
			for (const goal of context.goals) {
				if (goal.name && text.includes(goal.name.toLowerCase())) {
					return {
						type: 'goal_id',
						value: goal.id,
						confidence: 0.9,
						source: 'explicit',
						originalText: goal.name,
					};
				}
			}

			// Try to match goal categories
			const goalCategories = context.goals
				.map((g) => g.category?.toLowerCase())
				.filter(Boolean);

			for (const category of goalCategories) {
				if (text.includes(category)) {
					const matchingGoal = context.goals.find(
						(g) => g.category?.toLowerCase() === category
					);
					if (matchingGoal) {
						return {
							type: 'goal_id',
							value: matchingGoal.id,
							confidence: 0.8,
							source: 'context',
							originalText: category,
						};
					}
				}
			}

			// If only one goal exists, suggest it
			if (context.goals.length === 1) {
				return {
					type: 'goal_id',
					value: context.goals[0].id,
					confidence: 0.6,
					source: 'context',
				};
			}
		}

		return null;
	}

	getSuggestions(): string[] {
		return ['emergency fund', 'vacation', 'house', 'car', 'retirement'];
	}
}

// Main slot resolver
export class SlotResolver {
	private timeResolver: TimePeriodResolver;
	private moneyResolver: MoneyAmountResolver;
	private categoryResolver: CategoryResolver;
	private merchantResolver: MerchantResolver;
	private accountResolver: AccountResolver;
	private goalResolver: GoalResolver;

	constructor() {
		this.timeResolver = new TimePeriodResolver();
		this.moneyResolver = new MoneyAmountResolver();
		this.categoryResolver = new CategoryResolver();
		this.merchantResolver = new MerchantResolver();
		this.accountResolver = new AccountResolver();
		this.goalResolver = new GoalResolver();
	}

	resolveSlots(
		utterance: string,
		requiredSlots: string[],
		context: ChatContext
	): SlotResolution {
		const resolved: Record<string, ResolvedSlot> = {};
		const missing: string[] = [];
		const suggestions: Record<string, string[]> = {};

		// Validate inputs
		if (!utterance || typeof utterance !== 'string') {
			throw new Error('Invalid utterance: must be a non-empty string');
		}

		if (!Array.isArray(requiredSlots)) {
			throw new Error('Invalid requiredSlots: must be an array');
		}

		if (!context) {
			throw new Error('Invalid context: context is required');
		}

		// Resolve each required slot
		for (const slotName of requiredSlots) {
			try {
				let resolvedSlot: ResolvedSlot | null = null;

				switch (slotName) {
					case 'period':
						resolvedSlot = this.timeResolver.resolve(utterance, context);
						suggestions.period = this.timeResolver.getSuggestions();
						break;
					case 'amount':
						resolvedSlot = this.moneyResolver.resolve(utterance, context);
						suggestions.amount = this.moneyResolver.getSuggestions();
						break;
					case 'category':
						resolvedSlot = this.categoryResolver.resolve(utterance, context);
						suggestions.category = this.categoryResolver.getSuggestions();
						break;
					case 'merchant':
						resolvedSlot = this.merchantResolver.resolve(utterance, context);
						suggestions.merchant = this.merchantResolver.getSuggestions();
						break;
					case 'account':
						resolvedSlot = this.accountResolver.resolve(utterance, context);
						suggestions.account = this.accountResolver.getSuggestions();
						break;
					case 'goal_id':
						resolvedSlot = this.goalResolver.resolve(utterance, context);
						suggestions.goal_id = this.goalResolver.getSuggestions();
						break;
					default:
						console.warn(`Unknown slot type: ${slotName}`);
						missing.push(slotName);
						continue;
				}

				if (resolvedSlot) {
					resolved[slotName] = resolvedSlot;
				} else {
					missing.push(slotName);
				}
			} catch (error) {
				console.error(`Error resolving slot ${slotName}:`, error);
				missing.push(slotName);
			}
		}

		return {
			resolved,
			missing,
			suggestions,
		};
	}

	// Create clarifying question for missing slots
	createClarifyingQuestion(
		skillId: string,
		missingSlots: string[],
		suggestions: Record<string, string[]>
	): string {
		if (missingSlots.length === 0) return '';

		// Validate inputs
		if (!skillId || typeof skillId !== 'string') {
			throw new Error('Invalid skillId: must be a non-empty string');
		}

		if (!Array.isArray(missingSlots)) {
			throw new Error('Invalid missingSlots: must be an array');
		}

		const slotQuestions: Record<string, string> = {
			period: 'Which time period?',
			amount: 'What amount?',
			category: 'Which category?',
			merchant: 'Which merchant?',
			account: 'Which account?',
			goal_id: 'Which goal?',
		};

		const questions = missingSlots.map(
			(slot) => slotQuestions[slot] || `What ${slot}?`
		);
		const question =
			questions.length === 1 ? questions[0] : questions.join(', ');

		return `${question} ${this.formatSuggestions(missingSlots, suggestions)}`;
	}

	private formatSuggestions(
		missingSlots: string[],
		suggestions: Record<string, string[]>
	): string {
		const suggestionTexts = missingSlots
			.map((slot) => {
				const slotSuggestions = suggestions[slot] || [];
				if (slotSuggestions.length === 0) return '';

				const formatted = slotSuggestions
					.slice(0, 3)
					.map((s) => `[${s}]`)
					.join(' ');
				return `${slot}: ${formatted}`;
			})
			.filter(Boolean);

		return suggestionTexts.length > 0
			? `\n\nQuick picks: ${suggestionTexts.join(', ')}`
			: '';
	}

	// Get all available slot types
	getAvailableSlotTypes(): SlotType[] {
		return ['period', 'amount', 'category', 'merchant', 'account', 'goal_id'];
	}

	// Get resolver for a specific slot type
	getResolver(slotType: SlotType) {
		switch (slotType) {
			case 'period':
				return this.timeResolver;
			case 'amount':
				return this.moneyResolver;
			case 'category':
				return this.categoryResolver;
			case 'merchant':
				return this.merchantResolver;
			case 'account':
				return this.accountResolver;
			case 'goal_id':
				return this.goalResolver;
			default:
				throw new Error(`Unknown slot type: ${slotType}`);
		}
	}

	// Validate slot resolution result
	validateResolution(resolution: SlotResolution): boolean {
		if (!resolution || typeof resolution !== 'object') {
			return false;
		}

		const { resolved, missing, suggestions } = resolution;

		if (!resolved || typeof resolved !== 'object') {
			return false;
		}

		if (!Array.isArray(missing)) {
			return false;
		}

		if (!suggestions || typeof suggestions !== 'object') {
			return false;
		}

		// Validate resolved slots
		for (const [, slot] of Object.entries(resolved)) {
			if (!slot || typeof slot !== 'object') {
				return false;
			}

			if (!slot.type || !slot.value || typeof slot.confidence !== 'number') {
				return false;
			}

			if (slot.confidence < 0 || slot.confidence > 1) {
				return false;
			}
		}

		return true;
	}

	// Get overall confidence score for a resolution
	getOverallConfidence(resolution: SlotResolution): number {
		if (!this.validateResolution(resolution)) {
			return 0;
		}

		const { resolved } = resolution;
		const slots = Object.values(resolved);

		if (slots.length === 0) {
			return 0;
		}

		const totalConfidence = slots.reduce(
			(sum, slot) => sum + slot.confidence,
			0
		);
		return totalConfidence / slots.length;
	}

	// Get high-confidence slots (confidence > 0.8)
	getHighConfidenceSlots(
		resolution: SlotResolution
	): Record<string, ResolvedSlot> {
		if (!this.validateResolution(resolution)) {
			return {};
		}

		const { resolved } = resolution;
		const highConfidence: Record<string, ResolvedSlot> = {};

		for (const [slotName, slot] of Object.entries(resolved)) {
			if (slot.confidence > 0.8) {
				highConfidence[slotName] = slot;
			}
		}

		return highConfidence;
	}

	// Get low-confidence slots (confidence < 0.5)
	getLowConfidenceSlots(
		resolution: SlotResolution
	): Record<string, ResolvedSlot> {
		if (!this.validateResolution(resolution)) {
			return {};
		}

		const { resolved } = resolution;
		const lowConfidence: Record<string, ResolvedSlot> = {};

		for (const [slotName, slot] of Object.entries(resolved)) {
			if (slot.confidence < 0.5) {
				lowConfidence[slotName] = slot;
			}
		}

		return lowConfidence;
	}
}

// Export singleton instance
export const slotResolver = new SlotResolver();
