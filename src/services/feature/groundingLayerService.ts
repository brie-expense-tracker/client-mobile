// Grounding Layer Service - Prevents AI hallucinations using structured FactPack data
// Provides deterministic calculations and semantic caching for consistent responses

import {
	FactPack,
	FactPackBuilder,
	FactPackCalculator,
} from '../../services/assistant/factPack';

export interface GroundedResponse {
	response: string;
	factPack: FactPack;
	confidence: number;
	sources: string[];
	calculations: {
		type: string;
		input: any;
		output: any;
		method: string;
	}[];
}

export interface CacheEntry {
	response: string;
	factPackHash: string;
	timestamp: number;
	confidence: number;
	expiresAt: number;
}

export class GroundingLayerService {
	private cache = new Map<string, CacheEntry>();
	private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
	private readonly MAX_CACHE_SIZE = 1000;

	constructor() {
		// Clean up expired cache entries periodically
		setInterval(() => this.cleanupCache(), this.CACHE_TTL);
	}

	// Generate FactPack from app data
	generateFactPack(
		budgets: any[],
		goals: any[],
		transactions: any[],
		profile: any,
		timezone: string = 'America/Los_Angeles'
	): FactPack {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

		// Get recent transactions (last 30 days)
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
		const recentTransactions = transactions
			.filter((t) => new Date(t.date) >= thirtyDaysAgo)
			.map((t) => ({
				id: t.id || `tx_${Date.now()}_${Math.random()}`,
				amount: t.amount || 0,
				category: t.category || 'Uncategorized',
				date: new Date(t.date).toISOString(),
				type: t.type || 'expense',
				description: t.description || t.name || 'Transaction',
			}));

		// Calculate spending patterns
		const totalSpent = recentTransactions
			.filter((t) => t.type === 'expense')
			.reduce((sum, t) => sum + Math.abs(t.amount), 0);

		const daysInPeriod = Math.ceil(
			(now.getTime() - thirtyDaysAgo.getTime()) / (1000 * 60 * 60 * 24)
		);
		const averageDaily = FactPackCalculator.calculateDailyAverage(
			totalSpent,
			daysInPeriod
		);

		// Group by category
		const categoryMap = new Map<string, { total: number; count: number }>();
		recentTransactions
			.filter((t) => t.type === 'expense')
			.forEach((t) => {
				const existing = categoryMap.get(t.category) || { total: 0, count: 0 };
				existing.total += Math.abs(t.amount);
				existing.count += 1;
				categoryMap.set(t.category, existing);
			});

		const topCategories = Array.from(categoryMap.entries())
			.map(([name, data]) => ({
				name,
				total: data.total,
				count: data.count,
				percentage: Math.round((data.total / totalSpent) * 100),
			}))
			.sort((a, b) => b.total - a.total)
			.slice(0, 5);

		// Determine trend (simplified - in production, compare with previous period)
		const trend: 'increasing' | 'decreasing' | 'stable' = 'stable';

		const builder = new FactPackBuilder()
			.setTimeWindow(startOfMonth, endOfMonth, timezone)
			.setBalances(
				budgets.map((b) => ({
					accountId: b.id || `budget_${b.name}`,
					name: b.name,
					current: (b.amount || 0) - (b.spent || 0),
					total: b.amount || 0,
					spent: b.spent || 0,
					type: 'checking' as const,
				}))
			)
			.setBudgets(
				budgets.map((b) => ({
					id: b.id || `budget_${b.name}`,
					name: b.name,
					period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
						2,
						'0'
					)}`,
					spent: b.spent || 0,
					limit: b.amount || 0,
					remaining: 0, // Will be calculated by builder
					utilization: 0, // Will be calculated by builder
					status: 'under' as const, // Will be calculated by builder
					topCategories: [], // Simplified for now
				}))
			)
			.setGoals(
				goals.map((g) => ({
					id: g.id || `goal_${g.name}`,
					name: g.name,
					targetAmount: g.target || g.targetAmount || 0,
					currentAmount: g.current || g.currentAmount || 0,
					progress: 0, // Will be calculated by builder
					remaining: 0, // Will be calculated by builder
					deadline: g.deadline
						? new Date(g.deadline).toISOString()
						: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
					status: 'on_track' as const, // Will be calculated by builder
				}))
			)
			.setRecurring([]) // Simplified for now
			.setRecentTransactions(recentTransactions)
			.setSpendingPatterns({
				totalSpent,
				averageDaily,
				topCategories,
				trend,
				comparison: {
					previousPeriod: 'Previous 30 days',
					change: 0,
					isImprovement: false,
				},
			})
			.setUserProfile({
				monthlyIncome: profile?.monthlyIncome || 0,
				financialGoal: profile?.financialGoal || 'Build savings',
				riskProfile: profile?.riskProfile?.tolerance || 'moderate',
				preferences: {
					notifications: true,
					insights: true,
					autoCategorization: true,
				},
			});

		return builder.build();
	}

	// Generate grounded response using FactPack data
	async generateGroundedResponse(
		userQuestion: string,
		factPack: FactPack,
		intent: string
	): Promise<GroundedResponse> {
		// Check cache first
		const cacheKey = this.generateCacheKey(
			userQuestion,
			factPack.metadata.hash,
			intent
		);
		const cached = this.cache.get(cacheKey);

		if (cached && Date.now() < cached.expiresAt) {
			return {
				response: cached.response,
				factPack,
				confidence: cached.confidence,
				sources: ['cache'],
				calculations: [],
			};
		}

		// Generate new grounded response
		const response = await this.composeGroundedResponse(
			userQuestion,
			factPack,
			intent
		);

		// Cache the response
		this.cache.set(cacheKey, {
			response: response.response,
			factPackHash: factPack.metadata.hash,
			timestamp: Date.now(),
			confidence: response.confidence,
			expiresAt: Date.now() + this.CACHE_TTL,
		});

		// Enforce cache size limit
		if (this.cache.size > this.MAX_CACHE_SIZE) {
			this.cleanupCache();
		}

		return response;
	}

	// Compose response using only FactPack data (no hallucinations)
	private async composeGroundedResponse(
		userQuestion: string,
		factPack: FactPack,
		intent: string
	): Promise<GroundedResponse> {
		const question = userQuestion.toLowerCase();
		const calculations: any[] = [];

		let response = '';
		let confidence = 0.9;

		// Budget-related questions
		if (
			question.includes('budget') ||
			question.includes('spending') ||
			question.includes('limit')
		) {
			const budgetData = factPack.budgets;
			const totalBudget = budgetData.reduce((sum, b) => sum + b.limit, 0);
			const totalSpent = budgetData.reduce((sum, b) => sum + b.spent, 0);
			const totalRemaining = budgetData.reduce(
				(sum, b) => sum + b.remaining,
				0
			);

			calculations.push({
				type: 'budget_summary',
				input: { budgets: budgetData.length, totalBudget, totalSpent },
				output: {
					totalRemaining,
					utilization: Math.round((totalSpent / totalBudget) * 100),
				},
				method: 'sum_aggregation',
			});

			if (
				question.includes('how much left') ||
				question.includes('remaining')
			) {
				response = `For ${
					factPack.time_window.period
				}, you have $${totalRemaining.toFixed(
					2
				)} remaining from your $${totalBudget.toFixed(2)} total budget.`;
			} else if (question.includes('over') || question.includes('exceed')) {
				const overBudgets = budgetData.filter((b) => b.status === 'over');
				if (overBudgets.length > 0) {
					response = `You're over budget in ${overBudgets.length} category${
						overBudgets.length > 1 ? 's' : ''
					}: ${overBudgets.map((b) => b.name).join(', ')}.`;
				} else {
					response = `You're currently under budget in all categories for ${factPack.time_window.period}.`;
				}
			} else {
				response = `Your budget status for ${
					factPack.time_window.period
				}: $${totalSpent.toFixed(2)} spent, $${totalRemaining.toFixed(
					2
				)} remaining.`;
			}
		}

		// Goal-related questions
		else if (
			question.includes('goal') ||
			question.includes('progress') ||
			question.includes('save')
		) {
			const goalData = factPack.goals;
			if (goalData.length === 0) {
				response =
					"You don't have any financial goals set up yet. Would you like me to help you create one?";
				confidence = 0.8;
			} else {
				const avgProgress =
					goalData.reduce((sum, g) => sum + g.progress, 0) / goalData.length;
				const behindGoals = goalData.filter((g) => g.status === 'behind');

				calculations.push({
					type: 'goal_progress',
					input: { goals: goalData.length },
					output: {
						averageProgress: Math.round(avgProgress),
						behindCount: behindGoals.length,
					},
					method: 'average_calculation',
				});

				if (question.includes('progress')) {
					response = `Your goals are ${Math.round(
						avgProgress
					)}% complete on average. ${
						behindGoals.length > 0
							? `${behindGoals.length} goal${
									behindGoals.length > 1 ? 's are' : ' is'
							  } behind schedule.`
							: 'All goals are on track!'
					}`;
				} else {
					response = `You have ${goalData.length} financial goal${
						goalData.length > 1 ? 's' : ''
					} with an average progress of ${Math.round(avgProgress)}%.`;
				}
			}
		}

		// Spending pattern questions
		else if (
			question.includes('spend') ||
			question.includes('pattern') ||
			question.includes('trend')
		) {
			const patterns = factPack.spendingPatterns;

			calculations.push({
				type: 'spending_analysis',
				input: { totalSpent: patterns.totalSpent, days: 30 },
				output: {
					averageDaily: patterns.averageDaily,
					topCategories: patterns.topCategories.length,
				},
				method: 'daily_average_calculation',
			});

			if (question.includes('daily') || question.includes('average')) {
				response = `Your average daily spending is $${patterns.averageDaily.toFixed(
					2
				)} for ${factPack.time_window.period}.`;
			} else if (question.includes('category') || question.includes('top')) {
				const topCategory = patterns.topCategories[0];
				if (topCategory) {
					response = `Your top spending category is ${
						topCategory.name
					} at $${topCategory.total.toFixed(2)} (${
						topCategory.percentage
					}% of total spending).`;
				} else {
					response =
						"I don't have enough transaction data to identify spending categories yet.";
				}
			} else {
				response = `Your spending pattern for ${
					factPack.time_window.period
				}: $${patterns.totalSpent.toFixed(
					2
				)} total, averaging $${patterns.averageDaily.toFixed(2)} per day.`;
			}
		}

		// Balance questions
		else if (
			question.includes('balance') ||
			question.includes('account') ||
			question.includes('money')
		) {
			const balanceData = factPack.balances;
			const totalBalance = balanceData.reduce((sum, b) => sum + b.current, 0);

			calculations.push({
				type: 'balance_summary',
				input: { accounts: balanceData.length },
				output: { totalBalance },
				method: 'sum_aggregation',
			});

			response = `Your total balance across ${balanceData.length} account${
				balanceData.length > 1 ? 's' : ''
			} is $${totalBalance.toFixed(2)}.`;
		}

		// General financial health
		else if (
			question.includes('how am i doing') ||
			question.includes('financial health') ||
			question.includes('overview')
		) {
			const budgetUtilization =
				factPack.budgets.reduce((sum, b) => sum + b.utilization, 0) /
				factPack.budgets.length;
			const goalProgress =
				factPack.goals.reduce((sum, g) => sum + g.progress, 0) /
				factPack.goals.length;

			calculations.push({
				type: 'financial_health',
				input: {
					budgets: factPack.budgets.length,
					goals: factPack.goals.length,
				},
				output: {
					avgBudgetUtilization: Math.round(budgetUtilization),
					avgGoalProgress: Math.round(goalProgress),
				},
				method: 'average_calculation',
			});

			let healthStatus = 'good';
			if (budgetUtilization > 80 || goalProgress < 30)
				healthStatus = 'needs_attention';
			else if (budgetUtilization > 60 || goalProgress < 50)
				healthStatus = 'moderate';

			response = `Your financial health for ${
				factPack.time_window.period
			} is ${healthStatus}. Budget utilization: ${Math.round(
				budgetUtilization
			)}%, Goal progress: ${Math.round(goalProgress)}%.`;
		}

		// Fallback for unknown questions
		else {
			response = `I can help you with budgets, goals, spending patterns, and account balances. What specific financial information would you like to know?`;
			confidence = 0.6;
		}

		// Always include time context to prevent confusion
		response += `\n\n*Data reflects ${factPack.time_window.period}*`;

		return {
			response,
			factPack,
			confidence,
			sources: ['factpack', 'deterministic_calculations'],
			calculations,
		};
	}

	// Generate cache key for semantic caching
	private generateCacheKey(
		userQuestion: string,
		factPackHash: string,
		intent: string
	): string {
		const canonicalizedQuery = userQuestion
			.toLowerCase()
			.replace(/[^\w\s]/g, '')
			.replace(/\s+/g, ' ')
			.trim();

		return `${intent}:${canonicalizedQuery}:${factPackHash}`;
	}

	// Clean up expired cache entries
	private cleanupCache(): void {
		const now = Date.now();
		for (const [key, entry] of this.cache.entries()) {
			if (now > entry.expiresAt) {
				this.cache.delete(key);
			}
		}
	}

	// Get cache statistics for monitoring
	getCacheStats(): { size: number; hitRate: number; avgAge: number } {
		const now = Date.now();
		let totalAge = 0;
		let hitCount = 0;

		for (const entry of this.cache.values()) {
			totalAge += now - entry.timestamp;
			if (entry.timestamp > now - this.CACHE_TTL) {
				hitCount++;
			}
		}

		return {
			size: this.cache.size,
			hitRate: this.cache.size > 0 ? hitCount / this.cache.size : 0,
			avgAge: this.cache.size > 0 ? totalAge / this.cache.size : 0,
		};
	}

	// Clear cache (useful for testing or when data changes significantly)
	clearCache(): void {
		this.cache.clear();
	}

	// Validate FactPack before use
	validateFactPack(factPack: FactPack): boolean {
		const validation = FactPackCalculator.validateFactPack(factPack);
		if (!validation.isValid) {
			console.error('FactPack validation failed:', validation.errors);
			return false;
		}
		return true;
	}
}
