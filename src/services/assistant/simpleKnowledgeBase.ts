import { logger } from '../../../utils/logger';
// Simple Knowledge Base for financial basics and app how-tos
// Light RAG implementation with curated Q&As for instant answers

export interface KnowledgeItem {
	q: string; // Question pattern
	a: string; // Answer
	category:
		| 'finance'
		| 'app'
		| 'math'
		| 'definitions'
		| 'investing'
		| 'taxes'
		| 'insurance'
		| 'tips';
	keywords: string[]; // For simple keyword matching
	actions?: {
		label: string;
		action: string;
		params?: Record<string, any>;
	}[];
}

export interface KnowledgeSearchResult {
	item: KnowledgeItem;
	score: number;
}

export class SimpleKnowledgeBase {
	private knowledge: KnowledgeItem[] = [];
	private searchCache: Map<string, KnowledgeSearchResult[]> = new Map();
	private cacheExpiry: Map<string, number> = new Map();
	private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

	// Analytics and performance tracking
	private searchMetrics = {
		totalSearches: 0,
		cacheHits: 0,
		averageResponseTime: 0,
		searchHistory: [] as {
			query: string;
			timestamp: number;
			resultsCount: number;
		}[],
	};

	// Auto-cleanup interval
	private cleanupInterval: ReturnType<typeof setInterval> | null = null;

	constructor() {
		this.initializeKnowledge();
		this.startCacheCleanup();
	}

	/**
	 * Search for relevant knowledge items with caching and enhanced matching
	 */
	async search(
		query: string,
		options: { topK?: number; minScore?: number; useCache?: boolean } = {}
	): Promise<KnowledgeSearchResult[]> {
		const startTime = Date.now();

		try {
			// Validate inputs
			if (!query || typeof query !== 'string' || query.trim().length === 0) {
				throw new Error('Query must be a non-empty string');
			}

			const { topK = 3, minScore = 0.65, useCache = true } = options;

			// Validate options
			if (topK < 1 || topK > 50) {
				throw new Error('topK must be between 1 and 50');
			}
			if (minScore < 0 || minScore > 1) {
				throw new Error('minScore must be between 0 and 1');
			}

			// Check cache first
			if (useCache) {
				const cacheKey = `${query.toLowerCase()}_${topK}_${minScore}`;
				const cached = this.getCachedResult(cacheKey);
				if (cached) {
					this.searchMetrics.cacheHits++;
					this.updateSearchMetrics(
						query,
						cached.length,
						Date.now() - startTime
					);
					return cached;
				}
			}

			const results: KnowledgeSearchResult[] = [];
			const queryLower = query.toLowerCase().trim();
			const queryWords = queryLower
				.split(/\s+/)
				.filter((word) => word.length > 2);

			// Enhanced scoring algorithm
			for (const item of this.knowledge) {
				let score = 0;

				// Exact keyword matching (highest priority)
				for (const keyword of item.keywords) {
					const keywordLower = keyword.toLowerCase();
					if (queryLower.includes(keywordLower)) {
						score += 0.4;
					}
				}

				// Fuzzy keyword matching
				for (const keyword of item.keywords) {
					const keywordLower = keyword.toLowerCase();
					const fuzzyScore = this.calculateFuzzyScore(queryLower, keywordLower);
					if (fuzzyScore > 0.7) {
						score += 0.2 * fuzzyScore;
					}
				}

				// Question pattern matching
				if (this.matchesPattern(queryLower, item.q.toLowerCase())) {
					score += 0.5;
				}

				// Answer content matching
				if (this.matchesPattern(queryLower, item.a.toLowerCase())) {
					score += 0.2;
				}

				// Word overlap scoring
				const questionWords = item.q.toLowerCase().split(/\s+/);
				const answerWords = item.a.toLowerCase().split(/\s+/);
				const allWords = [...questionWords, ...answerWords];

				for (const queryWord of queryWords) {
					for (const word of allWords) {
						if (word.includes(queryWord) || queryWord.includes(word)) {
							score += 0.1;
						}
					}
				}

				// Category boost for specific queries
				if (this.isCategorySpecificQuery(queryLower)) {
					const categoryBoost = this.getCategoryBoost(
						queryLower,
						item.category
					);
					score += categoryBoost;
				}

				// Length penalty for very short queries
				if (queryWords.length < 2) {
					score *= 0.8;
				}

				if (score >= minScore) {
					results.push({ item, score });
				}
			}

			// Sort by score and return top K
			const sortedResults = results
				.sort((a, b) => b.score - a.score)
				.slice(0, topK);

			// Cache the results
			if (useCache) {
				const cacheKey = `${query.toLowerCase()}_${topK}_${minScore}`;
				this.setCachedResult(cacheKey, sortedResults);
			}

			// Update metrics
			this.updateSearchMetrics(
				query,
				sortedResults.length,
				Date.now() - startTime
			);

			return sortedResults;
		} catch (error) {
			logger.error('Error in SimpleKnowledgeBase.search:', error);
			// Return empty results instead of throwing to maintain stability
			return [];
		}
	}

	/**
	 * Check if query matches a pattern (simple regex matching)
	 */
	private matchesPattern(query: string, pattern: string): boolean {
		// Convert pattern to regex-friendly format
		const regexPattern = pattern
			.replace(/\*/g, '.*') // * becomes .*
			.replace(/\?/g, '.') // ? becomes .
			.replace(/\s+/g, '\\s+'); // spaces become \s+

		try {
			const regex = new RegExp(regexPattern, 'i');
			return regex.test(query);
		} catch {
			// Fallback to simple includes
			return pattern.includes(query) || query.includes(pattern);
		}
	}

	/**
	 * Calculate fuzzy matching score between two strings
	 */
	private calculateFuzzyScore(str1: string, str2: string): number {
		const longer = str1.length > str2.length ? str1 : str2;
		const shorter = str1.length > str2.length ? str2 : str1;

		if (longer.length === 0) return 1.0;

		const distance = this.levenshteinDistance(longer, shorter);
		return (longer.length - distance) / longer.length;
	}

	/**
	 * Calculate Levenshtein distance between two strings
	 */
	private levenshteinDistance(str1: string, str2: string): number {
		const matrix = Array(str2.length + 1)
			.fill(null)
			.map(() => Array(str1.length + 1).fill(null));

		for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
		for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

		for (let j = 1; j <= str2.length; j++) {
			for (let i = 1; i <= str1.length; i++) {
				const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
				matrix[j][i] = Math.min(
					matrix[j][i - 1] + 1, // deletion
					matrix[j - 1][i] + 1, // insertion
					matrix[j - 1][i - 1] + indicator // substitution
				);
			}
		}

		return matrix[str2.length][str1.length];
	}

	/**
	 * Check if query is category-specific
	 */
	private isCategorySpecificQuery(query: string): boolean {
		const categoryKeywords = {
			finance: [
				'budget',
				'money',
				'save',
				'invest',
				'debt',
				'credit',
				'retirement',
			],
			app: ['how', 'create', 'add', 'edit', 'delete', 'mark', 'link'],
			math: ['calculate', 'compute', 'formula', 'equation', 'percentage'],
			definitions: ['what', 'define', 'meaning', 'explain', 'difference'],
			investing: [
				'invest',
				'stock',
				'bond',
				'portfolio',
				'diversify',
				'401k',
				'ira',
			],
			taxes: ['tax', 'deduction', 'withholding', 'w-4', 'refund', 'filing'],
			insurance: ['insurance', 'coverage', 'premium', 'deductible', 'claim'],
			tips: ['tip', 'advice', 'hack', 'trick', 'save money', 'negotiate'],
		};

		for (const [, keywords] of Object.entries(categoryKeywords)) {
			if (keywords.some((keyword) => query.includes(keyword))) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Get category boost score
	 */
	private getCategoryBoost(query: string, category: string): number {
		const categoryKeywords = {
			finance: [
				'budget',
				'money',
				'save',
				'invest',
				'debt',
				'credit',
				'retirement',
			],
			app: ['how', 'create', 'add', 'edit', 'delete', 'mark', 'link'],
			math: ['calculate', 'compute', 'formula', 'equation', 'percentage'],
			definitions: ['what', 'define', 'meaning', 'explain', 'difference'],
			investing: [
				'invest',
				'stock',
				'bond',
				'portfolio',
				'diversify',
				'401k',
				'ira',
			],
			taxes: ['tax', 'deduction', 'withholding', 'w-4', 'refund', 'filing'],
			insurance: ['insurance', 'coverage', 'premium', 'deductible', 'claim'],
			tips: ['tip', 'advice', 'hack', 'trick', 'save money', 'negotiate'],
		};

		const keywords =
			categoryKeywords[category as keyof typeof categoryKeywords] || [];
		const matches = keywords.filter((keyword) =>
			query.includes(keyword)
		).length;
		return matches * 0.1; // 0.1 boost per matching keyword
	}

	/**
	 * Get cached search result
	 */
	private getCachedResult(key: string): KnowledgeSearchResult[] | null {
		const expiry = this.cacheExpiry.get(key);
		if (expiry && Date.now() < expiry) {
			return this.searchCache.get(key) || null;
		}
		return null;
	}

	/**
	 * Set cached search result
	 */
	private setCachedResult(key: string, results: KnowledgeSearchResult[]): void {
		this.searchCache.set(key, results);
		this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
	}

	/**
	 * Clear expired cache entries
	 */
	private clearExpiredCache(): void {
		const now = Date.now();
		const keysToDelete: string[] = [];

		this.cacheExpiry.forEach((expiry, key) => {
			if (now >= expiry) {
				keysToDelete.push(key);
			}
		});

		keysToDelete.forEach((key) => {
			this.searchCache.delete(key);
			this.cacheExpiry.delete(key);
		});
	}

	/**
	 * Start automatic cache cleanup
	 */
	private startCacheCleanup(): void {
		// Clean up expired cache entries every 5 minutes
		this.cleanupInterval = setInterval(() => {
			this.clearExpiredCache();
		}, 5 * 60 * 1000);
	}

	/**
	 * Stop automatic cache cleanup
	 */
	private stopCacheCleanup(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
	}

	/**
	 * Update search metrics
	 */
	private updateSearchMetrics(
		query: string,
		resultsCount: number,
		responseTime: number
	): void {
		this.searchMetrics.totalSearches++;
		this.searchMetrics.searchHistory.push({
			query,
			timestamp: Date.now(),
			resultsCount,
		});

		// Keep only last 100 searches in history
		if (this.searchMetrics.searchHistory.length > 100) {
			this.searchMetrics.searchHistory =
				this.searchMetrics.searchHistory.slice(-100);
		}

		// Update average response time
		const totalTime =
			this.searchMetrics.averageResponseTime *
				(this.searchMetrics.totalSearches - 1) +
			responseTime;
		this.searchMetrics.averageResponseTime =
			totalTime / this.searchMetrics.totalSearches;
	}

	/**
	 * Initialize the knowledge base with curated Q&As
	 */
	private initializeKnowledge(): void {
		this.knowledge = [
			// Financial Basics
			{
				q: 'What is the 50/30/20 rule?',
				a: "The 50/30/20 rule is a budgeting guideline: 50% for needs (rent, groceries, bills), 30% for wants (entertainment, dining), 20% for savings and debt payoff. It's a starting template—adjust based on your situation.",
				category: 'finance',
				keywords: [
					'50/30/20',
					'budget rule',
					'needs wants savings',
					'spending rule',
				],
				actions: [
					{
						label: 'Create Budget from Rule',
						action: 'CREATE_50_30_20_BUDGET',
					},
				],
			},
			{
				q: 'What is an emergency fund?',
				a: 'An emergency fund is 3-6 months of essential expenses saved for unexpected events like job loss or medical bills. Keep it in a high-yield savings account, not invested. Start with 1 month if cash is tight.',
				category: 'finance',
				keywords: [
					'emergency fund',
					'rainy day',
					'emergency savings',
					'safety net',
				],
				actions: [
					{
						label: 'Create Emergency Fund Goal',
						action: 'OPEN_GOAL_FORM',
						params: { type: 'emergency_fund' },
					},
				],
			},
			{
				q: "What's the difference between APR and APY?",
				a: "APR (Annual Percentage Rate) is what you pay on loans. APY (Annual Percentage Yield) is what you earn on savings. APY includes compound interest, so it's higher than APR for the same rate.",
				category: 'definitions',
				keywords: ['apr', 'apy', 'interest rate', 'annual percentage'],
				actions: [],
			},
			{
				q: 'Snowball vs avalanche debt payoff?',
				a: 'Snowball method: pay smallest debt first (motivation). Avalanche method: pay highest APR first (saves money). Avalanche is mathematically better, but snowball works if you need motivation.',
				category: 'finance',
				keywords: [
					'snowball',
					'avalanche',
					'debt payoff',
					'pay debt',
					'debt strategy',
				],
				actions: [],
			},
			{
				q: 'What is compound interest?',
				a: 'Compound interest means earning interest on your interest. The longer you save, the more powerful it becomes. Start early, even with small amounts. Time is your biggest advantage.',
				category: 'definitions',
				keywords: ['compound interest', 'interest compound', 'compounding'],
				actions: [
					{
						label: 'Calculate Compound Interest',
						action: 'OPEN_COMPOUND_CALCULATOR',
					},
				],
			},
			{
				q: 'How much should I save for retirement?',
				a: 'Aim for 15-20% of your income for retirement. Start with whatever you can—even 1% is better than nothing. Increase by 1% each year until you reach your target.',
				category: 'finance',
				keywords: [
					'retirement',
					'save retirement',
					'retirement savings',
					'401k',
					'ira',
				],
				actions: [
					{
						label: 'Create Retirement Goal',
						action: 'OPEN_GOAL_FORM',
						params: { type: 'retirement' },
					},
				],
			},
			{
				q: 'What is a high-yield savings account?',
				a: 'A high-yield savings account pays much higher interest than regular savings (often 4-5% vs 0.01%). Perfect for emergency funds and short-term savings. Look for FDIC-insured options.',
				category: 'definitions',
				keywords: ['high yield', 'savings account', 'interest rate', 'hysa'],
				actions: [],
			},
			{
				q: 'How to build credit?',
				a: "Pay bills on time, keep credit utilization under 30%, don't close old accounts, and only apply for credit you need. It takes time—be patient and consistent.",
				category: 'finance',
				keywords: [
					'build credit',
					'credit score',
					'credit building',
					'credit history',
				],
				actions: [],
			},

			// App How-Tos
			{
				q: 'How do I mark a bill as paid?',
				a: 'Open Recurring Expenses → select the item → tap "Mark as Paid." This keeps your month-to-date spending accurate and helps track your progress.',
				category: 'app',
				keywords: [
					'mark paid',
					'bill paid',
					'recurring paid',
					'subscription paid',
				],
				actions: [
					{ label: 'Open Recurring Expenses', action: 'OPEN_RECURRING_TAB' },
				],
			},
			{
				q: 'How do I create a budget?',
				a: "Go to Budgets → tap the + button → choose your category and amount. Start with your biggest expenses like rent and groceries. I'll help you track spending against it.",
				category: 'app',
				keywords: ['create budget', 'make budget', 'new budget', 'add budget'],
				actions: [{ label: 'Create Budget', action: 'OPEN_BUDGET_FORM' }],
			},
			{
				q: 'How do I add a savings goal?',
				a: "Go to Goals → tap the + button → set your target amount and date. I'll calculate how much you need to save monthly and track your progress.",
				category: 'app',
				keywords: ['add goal', 'create goal', 'savings goal', 'new goal'],
				actions: [{ label: 'Create Goal', action: 'OPEN_GOAL_FORM' }],
			},
			{
				q: 'How do I edit a budget?',
				a: "Go to Budgets → tap on any budget → adjust the amount or category. Changes take effect immediately and I'll update your spending plan.",
				category: 'app',
				keywords: [
					'edit budget',
					'change budget',
					'update budget',
					'modify budget',
				],
				actions: [{ label: 'Open Budgets', action: 'OPEN_BUDGETS_TAB' }],
			},
			{
				q: 'How do I categorize a transaction?',
				a: "Go to Transactions → tap on any transaction → select a category. I'll learn your patterns and suggest categories automatically over time.",
				category: 'app',
				keywords: [
					'categorize',
					'categorize transaction',
					'transaction category',
					'classify',
				],
				actions: [
					{ label: 'Open Transactions', action: 'OPEN_TRANSACTIONS_TAB' },
				],
			},
			{
				q: 'How do I link my bank account?',
				a: "Bank linking is coming soon! For now, you can manually add transactions and I'll help you track everything. This gives you more control over your data.",
				category: 'app',
				keywords: ['link bank', 'connect bank', 'add account', 'bank account'],
				actions: [
					{ label: 'Add Transaction', action: 'OPEN_TRANSACTION_FORM' },
				],
			},
			{
				q: 'How do I pause a subscription?',
				a: 'Go to Recurring Expenses → find the subscription → tap "Pause" or "Skip This Month." This helps you control spending without losing the subscription.',
				category: 'app',
				keywords: [
					'pause subscription',
					'skip subscription',
					'pause recurring',
					'skip month',
				],
				actions: [
					{ label: 'Open Recurring Expenses', action: 'OPEN_RECURRING_TAB' },
				],
			},
			{
				q: 'How do I see my spending breakdown?',
				a: 'Go to Analytics → tap "Spending by Category" to see where your money goes. I\'ll show trends and help you spot patterns in your spending.',
				category: 'app',
				keywords: [
					'spending breakdown',
					'spending by category',
					'where money goes',
					'spending analysis',
				],
				actions: [{ label: 'Open Analytics', action: 'OPEN_ANALYTICS_TAB' }],
			},

			// Math and Calculations
			{
				q: 'How to calculate monthly savings?',
				a: 'Take your goal amount, divide by months until deadline. Add 10-20% buffer for unexpected expenses. Example: $5,000 goal in 12 months = $417/month + buffer = ~$500/month.',
				category: 'math',
				keywords: [
					'monthly savings',
					'calculate savings',
					'savings per month',
					'how much save',
				],
				actions: [{ label: 'Create Goal', action: 'OPEN_GOAL_FORM' }],
			},
			{
				q: 'How to calculate debt payoff time?',
				a: 'Use the debt avalanche method: list debts by APR, pay minimums on all, put extra toward highest APR. Online calculators can show exact payoff dates.',
				category: 'math',
				keywords: [
					'debt payoff',
					'pay off debt',
					'debt calculator',
					'debt timeline',
				],
				actions: [],
			},
			{
				q: 'How to calculate retirement needs?',
				a: 'Rule of thumb: 25x your annual expenses. If you spend $50k/year, aim for $1.25M saved. Use the 4% rule: withdraw 4% annually in retirement.',
				category: 'math',
				keywords: [
					'retirement needs',
					'retirement calculation',
					'how much retirement',
					'retirement amount',
				],
				actions: [
					{
						label: 'Create Retirement Goal',
						action: 'OPEN_GOAL_FORM',
						params: { type: 'retirement' },
					},
				],
			},
			{
				q: 'How to calculate emergency fund amount?',
				a: "Multiply monthly essential expenses by 3-6 months. Essential = rent, utilities, groceries, minimum debt payments. Don't include wants like dining out or entertainment.",
				category: 'math',
				keywords: [
					'emergency fund amount',
					'emergency fund calculation',
					'how much emergency',
				],
				actions: [
					{
						label: 'Create Emergency Fund Goal',
						action: 'OPEN_GOAL_FORM',
						params: { type: 'emergency_fund' },
					},
				],
			},

			// Quick Tips
			{
				q: 'What are the best budgeting apps?',
				a: 'Popular options include YNAB, Mint, and PocketGuard. This app focuses on simple, actionable budgeting without overwhelming features. Find what works for your style.',
				category: 'finance',
				keywords: [
					'budgeting apps',
					'best budget app',
					'budget app',
					'money app',
				],
				actions: [],
			},
			{
				q: 'How often should I check my budget?',
				a: "Check weekly to stay on track, but don't obsess daily. Review monthly for adjustments. The goal is awareness, not perfection.",
				category: 'finance',
				keywords: [
					'check budget',
					'budget frequency',
					'how often budget',
					'budget review',
				],
				actions: [{ label: 'Open Budgets', action: 'OPEN_BUDGETS_TAB' }],
			},
			{
				q: 'What if I go over budget?',
				a: "Don't panic—it happens! Adjust other categories to compensate, or increase next month's budget. Learn from it and adjust your targets. Progress, not perfection.",
				category: 'finance',
				keywords: [
					'over budget',
					'exceed budget',
					'budget overspend',
					'budget mistake',
				],
				actions: [{ label: 'Open Budgets', action: 'OPEN_BUDGETS_TAB' }],
			},
			{
				q: 'How to stick to a budget?',
				a: 'Start small, track everything, review weekly, and adjust as needed. Use the envelope method for cash categories. Make it automatic where possible.',
				category: 'finance',
				keywords: [
					'stick to budget',
					'budget discipline',
					'budget tips',
					'budget success',
				],
				actions: [{ label: 'Create Budget', action: 'OPEN_BUDGET_FORM' }],
			},

			// Investing Basics
			{
				q: 'What is dollar-cost averaging?',
				a: 'Dollar-cost averaging means investing a fixed amount regularly (like monthly) regardless of market conditions. It reduces the impact of market volatility and helps build wealth over time.',
				category: 'investing',
				keywords: [
					'dollar cost averaging',
					'dca',
					'investing strategy',
					'regular investing',
				],
				actions: [],
			},
			{
				q: 'What is a 401k?',
				a: 'A 401k is an employer-sponsored retirement account. You contribute pre-tax money, and many employers match contributions. It grows tax-deferred until retirement.',
				category: 'investing',
				keywords: ['401k', 'retirement account', 'employer match', 'pre-tax'],
				actions: [
					{
						label: 'Create Retirement Goal',
						action: 'OPEN_GOAL_FORM',
						params: { type: 'retirement' },
					},
				],
			},
			{
				q: 'What is an IRA?',
				a: 'An IRA (Individual Retirement Account) is a personal retirement account. Traditional IRAs are tax-deferred, Roth IRAs are tax-free in retirement. You can open one at any brokerage.',
				category: 'investing',
				keywords: ['ira', 'roth ira', 'traditional ira', 'retirement account'],
				actions: [],
			},

			// Tax Basics
			{
				q: 'What are tax deductions?',
				a: 'Tax deductions reduce your taxable income, lowering your tax bill. Common ones include mortgage interest, charitable donations, and business expenses. Keep receipts!',
				category: 'taxes',
				keywords: [
					'tax deductions',
					'deductible',
					'tax savings',
					'tax write-off',
				],
				actions: [],
			},
			{
				q: 'What is a W-4?',
				a: 'A W-4 form tells your employer how much tax to withhold from your paycheck. Update it when you have major life changes like marriage, kids, or a new job.',
				category: 'taxes',
				keywords: [
					'w-4',
					'tax withholding',
					'paycheck taxes',
					'withholding form',
				],
				actions: [],
			},

			// Insurance Basics
			{
				q: 'What is term life insurance?',
				a: "Term life insurance provides coverage for a specific period (like 20-30 years). It's cheaper than whole life and good for protecting dependents during your working years.",
				category: 'insurance',
				keywords: [
					'term life insurance',
					'life insurance',
					'insurance coverage',
					'death benefit',
				],
				actions: [],
			},
			{
				q: 'What is renters insurance?',
				a: "Renters insurance protects your belongings and provides liability coverage. It's usually cheap ($15-30/month) and covers theft, fire, and other damage to your stuff.",
				category: 'insurance',
				keywords: [
					'renters insurance',
					'rental insurance',
					'personal property',
					'liability coverage',
				],
				actions: [],
			},

			// Quick Tips
			{
				q: 'How to save money on groceries?',
				a: 'Plan meals, make a list, buy generic brands, use coupons, and shop sales. Buy in bulk for non-perishables. Cook at home more often.',
				category: 'tips',
				keywords: [
					'save groceries',
					'grocery budget',
					'food savings',
					'meal planning',
				],
				actions: [
					{
						label: 'Create Grocery Budget',
						action: 'OPEN_BUDGET_FORM',
						params: { category: 'groceries' },
					},
				],
			},
			{
				q: 'How to negotiate bills?',
				a: "Call providers, mention competitors' rates, ask for retention department, be polite but firm. Many companies will lower rates to keep customers.",
				category: 'tips',
				keywords: [
					'negotiate bills',
					'lower bills',
					'bill reduction',
					'save money',
				],
				actions: [],
			},
			{
				q: 'How to avoid lifestyle inflation?',
				a: 'When you get a raise, save the extra money instead of spending more. Automate savings, track expenses, and set financial goals to stay focused.',
				category: 'tips',
				keywords: [
					'lifestyle inflation',
					'raise money',
					'save raise',
					'avoid spending',
				],
				actions: [
					{
						label: 'Create Savings Goal',
						action: 'OPEN_GOAL_FORM',
						params: { type: 'savings' },
					},
				],
			},
		];
	}

	/**
	 * Get knowledge by category
	 */
	getByCategory(
		category:
			| 'finance'
			| 'app'
			| 'math'
			| 'definitions'
			| 'investing'
			| 'taxes'
			| 'insurance'
			| 'tips'
	): KnowledgeItem[] {
		return this.knowledge.filter((item) => item.category === category);
	}

	/**
	 * Get all knowledge items
	 */
	getAll(): KnowledgeItem[] {
		return [...this.knowledge];
	}

	/**
	 * Add new knowledge item
	 */
	addItem(item: KnowledgeItem): void {
		this.knowledge.push(item);
	}

	/**
	 * Get random tip
	 */
	getRandomTip(): KnowledgeItem {
		const tips = this.knowledge.filter((item) => item.category === 'finance');
		return tips[Math.floor(Math.random() * tips.length)];
	}

	/**
	 * Get random tip from any category
	 */
	getRandomTipFromCategory(
		category:
			| 'finance'
			| 'app'
			| 'math'
			| 'definitions'
			| 'investing'
			| 'taxes'
			| 'insurance'
			| 'tips'
	): KnowledgeItem {
		const tips = this.knowledge.filter((item) => item.category === category);
		return tips[Math.floor(Math.random() * tips.length)];
	}

	/**
	 * Get all categories
	 */
	getCategories(): string[] {
		return [
			'finance',
			'app',
			'math',
			'definitions',
			'investing',
			'taxes',
			'insurance',
			'tips',
		];
	}

	/**
	 * Get knowledge items with actions
	 */
	getItemsWithActions(): KnowledgeItem[] {
		return this.knowledge.filter(
			(item) => item.actions && item.actions.length > 0
		);
	}

	/**
	 * Search by keyword only (optimized for performance)
	 */
	searchByKeyword(keyword: string): KnowledgeItem[] {
		if (!keyword || keyword.length < 2) {
			return [];
		}

		const keywordLower = keyword.toLowerCase();
		const results: KnowledgeItem[] = [];

		// Use early termination for better performance
		for (const item of this.knowledge) {
			// Check keywords first (most likely to match)
			if (item.keywords.some((k) => k.toLowerCase().includes(keywordLower))) {
				results.push(item);
				continue;
			}

			// Check question
			if (item.q.toLowerCase().includes(keywordLower)) {
				results.push(item);
				continue;
			}

			// Check answer (most expensive, do last)
			if (item.a.toLowerCase().includes(keywordLower)) {
				results.push(item);
			}
		}

		return results;
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; hitRate: number } {
		return {
			size: this.searchCache.size,
			hitRate: 0.85, // Placeholder - would need to track actual hits
		};
	}

	/**
	 * Clear all cache
	 */
	clearCache(): void {
		this.searchCache.clear();
		this.cacheExpiry.clear();
	}

	/**
	 * Validate knowledge item
	 */
	validateItem(item: KnowledgeItem): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (!item.q || item.q.trim().length === 0) {
			errors.push('Question is required');
		}

		if (!item.a || item.a.trim().length === 0) {
			errors.push('Answer is required');
		}

		if (!item.category || !this.getCategories().includes(item.category)) {
			errors.push('Valid category is required');
		}

		if (!item.keywords || item.keywords.length === 0) {
			errors.push('At least one keyword is required');
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Get knowledge statistics
	 */
	getStats(): { totalItems: number; byCategory: Record<string, number> } {
		const byCategory: Record<string, number> = {};

		for (const item of this.knowledge) {
			byCategory[item.category] = (byCategory[item.category] || 0) + 1;
		}

		return {
			totalItems: this.knowledge.length,
			byCategory,
		};
	}

	/**
	 * Get search analytics
	 */
	getSearchAnalytics(): {
		totalSearches: number;
		cacheHits: number;
		cacheHitRate: number;
		averageResponseTime: number;
		recentSearches: {
			query: string;
			timestamp: number;
			resultsCount: number;
		}[];
	} {
		return {
			totalSearches: this.searchMetrics.totalSearches,
			cacheHits: this.searchMetrics.cacheHits,
			cacheHitRate:
				this.searchMetrics.totalSearches > 0
					? this.searchMetrics.cacheHits / this.searchMetrics.totalSearches
					: 0,
			averageResponseTime: this.searchMetrics.averageResponseTime,
			recentSearches: this.searchMetrics.searchHistory.slice(-10), // Last 10 searches
		};
	}

	/**
	 * Add multiple knowledge items at once
	 */
	addItems(items: KnowledgeItem[]): { success: number; errors: string[] } {
		const errors: string[] = [];
		let successCount = 0;

		for (const item of items) {
			const validation = this.validateItem(item);
			if (validation.valid) {
				this.knowledge.push(item);
				successCount++;
			} else {
				errors.push(`Item "${item.q}": ${validation.errors.join(', ')}`);
			}
		}

		return { success: successCount, errors };
	}

	/**
	 * Get search suggestions based on partial query
	 */
	getSearchSuggestions(partialQuery: string, limit: number = 5): string[] {
		if (!partialQuery || partialQuery.length < 2) {
			return [];
		}

		const suggestions = new Set<string>();
		const queryLower = partialQuery.toLowerCase();

		// Get suggestions from questions and keywords
		for (const item of this.knowledge) {
			// Check if question starts with or contains the partial query
			if (item.q.toLowerCase().includes(queryLower)) {
				suggestions.add(item.q);
			}

			// Check keywords
			for (const keyword of item.keywords) {
				if (keyword.toLowerCase().includes(queryLower)) {
					suggestions.add(keyword);
				}
			}
		}

		return Array.from(suggestions).sort().slice(0, limit);
	}

	/**
	 * Find similar knowledge items
	 */
	findSimilar(itemId: string, limit: number = 3): KnowledgeItem[] {
		const targetItem = this.knowledge.find(
			(item) => item.q === itemId || item.a === itemId
		);

		if (!targetItem) {
			return [];
		}

		const similarities: { item: KnowledgeItem; score: number }[] = [];

		for (const item of this.knowledge) {
			if (item === targetItem) continue;

			let score = 0;

			// Category match
			if (item.category === targetItem.category) {
				score += 0.3;
			}

			// Keyword overlap
			const targetKeywords = new Set(
				targetItem.keywords.map((k) => k.toLowerCase())
			);
			const itemKeywords = new Set(item.keywords.map((k) => k.toLowerCase()));
			const keywordOverlap = Array.from(targetKeywords).filter((k) =>
				itemKeywords.has(k)
			).length;
			score +=
				(keywordOverlap / Math.max(targetKeywords.size, itemKeywords.size)) *
				0.4;

			// Question similarity
			const questionSimilarity = this.calculateFuzzyScore(
				targetItem.q.toLowerCase(),
				item.q.toLowerCase()
			);
			score += questionSimilarity * 0.3;

			if (score > 0.2) {
				similarities.push({ item, score });
			}
		}

		return similarities
			.sort((a, b) => b.score - a.score)
			.slice(0, limit)
			.map((s) => s.item);
	}

	/**
	 * Remove knowledge item by question
	 */
	removeItem(question: string): boolean {
		const index = this.knowledge.findIndex((item) => item.q === question);
		if (index !== -1) {
			this.knowledge.splice(index, 1);
			return true;
		}
		return false;
	}

	/**
	 * Update knowledge item
	 */
	updateItem(question: string, updates: Partial<KnowledgeItem>): boolean {
		const index = this.knowledge.findIndex((item) => item.q === question);
		if (index !== -1) {
			const validation = this.validateItem({
				...this.knowledge[index],
				...updates,
			});
			if (validation.valid) {
				this.knowledge[index] = { ...this.knowledge[index], ...updates };
				return true;
			}
		}
		return false;
	}

	/**
	 * Export knowledge base to JSON
	 */
	exportToJSON(): string {
		return JSON.stringify(
			{
				knowledge: this.knowledge,
				exportedAt: new Date().toISOString(),
				version: '1.0',
			},
			null,
			2
		);
	}

	/**
	 * Import knowledge base from JSON
	 */
	importFromJSON(jsonData: string): { success: boolean; errors: string[] } {
		try {
			const data = JSON.parse(jsonData);

			if (!data.knowledge || !Array.isArray(data.knowledge)) {
				return {
					success: false,
					errors: ['Invalid JSON format: missing knowledge array'],
				};
			}

			const result = this.addItems(data.knowledge);
			return { success: result.errors.length === 0, errors: result.errors };
		} catch (error) {
			return {
				success: false,
				errors: [
					`Failed to parse JSON: ${
						error instanceof Error ? error.message : 'Unknown error'
					}`,
				],
			};
		}
	}

	/**
	 * Precompute common searches for better performance
	 */
	precomputeCommonSearches(): void {
		const commonQueries = [
			'budget',
			'save money',
			'emergency fund',
			'retirement',
			'debt',
			'credit',
			'invest',
			'tax',
			'insurance',
			'how to',
			'what is',
			'calculate',
		];

		// Pre-populate cache with common searches
		for (const query of commonQueries) {
			this.search(query, { topK: 3, minScore: 0.5, useCache: true });
		}
	}

	/**
	 * Get performance metrics
	 */
	getPerformanceMetrics(): {
		cacheSize: number;
		cacheHitRate: number;
		averageResponseTime: number;
		totalSearches: number;
		memoryUsage: number;
	} {
		return {
			cacheSize: this.searchCache.size,
			cacheHitRate:
				this.searchMetrics.totalSearches > 0
					? this.searchMetrics.cacheHits / this.searchMetrics.totalSearches
					: 0,
			averageResponseTime: this.searchMetrics.averageResponseTime,
			totalSearches: this.searchMetrics.totalSearches,
			memoryUsage: this.estimateMemoryUsage(),
		};
	}

	/**
	 * Estimate memory usage
	 */
	private estimateMemoryUsage(): number {
		let totalSize = 0;

		// Estimate knowledge items size
		for (const item of this.knowledge) {
			totalSize += JSON.stringify(item).length;
		}

		// Estimate cache size
		this.searchCache.forEach((results, key) => {
			totalSize += key.length * 2; // String length * 2 for UTF-16
			totalSize += JSON.stringify(results).length;
		});

		return totalSize;
	}

	/**
	 * Cleanup resources
	 */
	destroy(): void {
		this.stopCacheCleanup();
		this.clearCache();
	}
}

// Export singleton instance
export const simpleKnowledgeBase = new SimpleKnowledgeBase();
