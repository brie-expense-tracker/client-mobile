import AsyncStorage from '@react-native-async-storage/async-storage';
import { Features, guardFeature } from '../../config/features';

export interface Insight {
	id: string;
	type: 'warning' | 'info' | 'suggestion' | 'success' | 'critical';
	title: string;
	message: string;
	priority: 'low' | 'medium' | 'high' | 'critical';
	action?: string;
	actionLabel?: string;
	value?: number;
	trend?: 'up' | 'down' | 'stable';
	metadata?: Record<string, any>;
	category?:
		| 'savings'
		| 'debt'
		| 'budget'
		| 'goals'
		| 'spending'
		| 'income'
		| 'emergency'
		| 'investment';
	createdAt?: Date;
	isBookmarked?: boolean;
	tags?: string[];
}

export interface InsightsContext {
	lastInsightAction?: string;
	actionTaken?: boolean;
	timestamp?: string;
	profileSnapshot?: {
		income: number;
		savings: number;
		debt: number;
		expenses: Record<string, number>;
	};
}

export class InsightsContextService {
	private static instance: InsightsContextService;
	private insights: Insight[] = [];
	private context: InsightsContext | null = null;

	private constructor() {}

	public static getInstance(): InsightsContextService {
		if (!InsightsContextService.instance) {
			InsightsContextService.instance = new InsightsContextService();
		}
		return InsightsContextService.instance;
	}

	/**
	 * Load insights from the profile component's generation logic
	 */
	public async loadInsights(
		profile: any,
		budgets: any[],
		goals: any[],
		transactions: any[]
	): Promise<Insight[]> {
		return (
			guardFeature('aiInsights', async () => {
				try {
					const insights = await this.generateInsights(
						profile,
						budgets,
						goals,
						transactions
					);
					this.insights = insights;
					return insights;
				} catch (error) {
					console.error(
						'[InsightsContextService] Failed to load insights:',
						error
					);
					return [];
				}
			}) || []
		);
	}

	/**
	 * Get insights relevant to a conversation context
	 */
	public getRelevantInsights(context: string, limit: number = 3): Insight[] {
		if (!Features.aiInsights) return [];
		if (this.insights.length === 0) return [];

		const contextLower = context.toLowerCase();
		const relevantInsights: Insight[] = [];

		// Score insights based on relevance to context
		const scoredInsights = this.insights.map((insight) => {
			let score = 0;
			const insightText = `${insight.title} ${insight.message}`.toLowerCase();

			// Keyword matching
			const keywords = contextLower.split(' ');
			keywords.forEach((keyword) => {
				if (insightText.includes(keyword)) {
					score += 2;
				}
			});

			// Category matching
			if (insight.category) {
				const categoryKeywords = {
					savings: ['save', 'saving', 'emergency', 'fund'],
					debt: ['debt', 'pay', 'credit', 'loan'],
					budget: ['budget', 'spending', 'expense', 'limit'],
					goals: ['goal', 'target', 'plan', 'future'],
					spending: ['spend', 'buy', 'purchase', 'money'],
					income: ['income', 'salary', 'earn', 'job'],
					emergency: ['emergency', 'urgent', 'critical', 'help'],
					investment: ['invest', 'portfolio', 'stock', 'return'],
				};

				const categoryWords = categoryKeywords[insight.category] || [];
				categoryWords.forEach((word) => {
					if (contextLower.includes(word)) {
						score += 3;
					}
				});
			}

			// Priority boost
			switch (insight.priority) {
				case 'critical':
					score += 5;
					break;
				case 'high':
					score += 3;
					break;
				case 'medium':
					score += 2;
					break;
				case 'low':
					score += 1;
					break;
			}

			return { insight, score };
		});

		// Sort by score and return top insights
		return scoredInsights
			.filter((item) => item.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, limit)
			.map((item) => item.insight);
	}

	/**
	 * Get critical insights that need immediate attention
	 */
	public getCriticalInsights(): Insight[] {
		if (!Features.aiInsights) return [];

		return this.insights.filter(
			(insight) =>
				insight.priority === 'critical' || insight.priority === 'high'
		);
	}

	/**
	 * Get insights by category
	 */
	public getInsightsByCategory(category: string): Insight[] {
		return this.insights.filter((insight) => insight.category === category);
	}

	/**
	 * Load context from AsyncStorage (set by profile insights)
	 */
	public async loadContext(): Promise<InsightsContext | null> {
		try {
			const contextData = await AsyncStorage.getItem('aiProfileContext');
			if (contextData) {
				this.context = JSON.parse(contextData);
				return this.context;
			}
		} catch (error) {
			console.error('[InsightsContextService] Failed to load context:', error);
		}
		return null;
	}

	/**
	 * Clear context after use
	 */
	public async clearContext(): Promise<void> {
		try {
			await AsyncStorage.removeItem('aiProfileContext');
			this.context = null;
		} catch (error) {
			console.error('[InsightsContextService] Failed to clear context:', error);
		}
	}

	/**
	 * Clear all insights data
	 */
	public clearInsights(): void {
		this.insights = [];
		this.context = null;
	}

	/**
	 * Get context for conversation
	 */
	public getContextForConversation(): string {
		if (!this.context) return '';

		const contextParts: string[] = [];

		if (this.context.lastInsightAction) {
			contextParts.push(
				`User recently took action: ${this.context.lastInsightAction}`
			);
		}

		if (this.context.actionTaken) {
			contextParts.push('This action was successfully completed');
		}

		if (this.context.profileSnapshot) {
			const snapshot = this.context.profileSnapshot;
			contextParts.push(
				`Recent profile snapshot - Income: $${snapshot.income}, Savings: $${snapshot.savings}, Debt: $${snapshot.debt}`
			);
		}

		return contextParts.join('. ');
	}

	/**
	 * Generate insights using the same logic as the profile component
	 */
	private async generateInsights(
		profile: any,
		budgets: any[],
		goals: any[],
		transactions: any[]
	): Promise<Insight[]> {
		const insights: Insight[] = [];

		// Financial analysis calculations
		const monthlyIncome = profile.monthlyIncome || 0;
		const savings = profile.savings || 0;
		const debt = profile.debt || 0;
		const expenses = profile.expenses || {};

		// Calculate total monthly expenses
		const totalExpenses = Object.values(expenses).reduce(
			(sum: number, expense: any) => sum + (expense || 0),
			0
		);

		// Calculate savings rate
		const savingsRate =
			monthlyIncome > 0
				? ((monthlyIncome - totalExpenses) / monthlyIncome) * 100
				: 0;

		// Calculate debt-to-income ratio
		const debtToIncomeRatio =
			monthlyIncome > 0 ? (debt / monthlyIncome) * 100 : 0;

		// Calculate emergency fund ratio
		const emergencyFundRatio =
			totalExpenses > 0 ? savings / (totalExpenses * 6) : 0;

		// Financial Health Score Insight
		let healthScore = 0;
		if (savingsRate >= 20) healthScore += 30;
		else if (savingsRate >= 10) healthScore += 20;
		else if (savingsRate > 0) healthScore += 10;

		if (debtToIncomeRatio <= 20) healthScore += 25;
		else if (debtToIncomeRatio <= 36) healthScore += 15;
		else if (debtToIncomeRatio <= 50) healthScore += 5;

		if (emergencyFundRatio >= 1) healthScore += 25;
		else if (emergencyFundRatio >= 0.5) healthScore += 15;
		else if (emergencyFundRatio > 0) healthScore += 5;

		if (budgets.length > 0) healthScore += 20;
		else healthScore -= 10;

		healthScore = Math.max(0, Math.min(100, healthScore));

		if (healthScore >= 80) {
			insights.push({
				id: 'health_excellent',
				type: 'success',
				title: 'Excellent Financial Health!',
				message: `Your financial health score is ${healthScore.toFixed(
					0
				)}/100. Keep up the great work!`,
				priority: 'low',
				value: healthScore,
				action: 'view_detailed_report',
				actionLabel: 'View Report',
				category: 'savings',
				tags: ['health-score', 'overview'],
				createdAt: new Date(),
			});
		} else if (healthScore >= 60) {
			insights.push({
				id: 'health_good',
				type: 'info',
				title: 'Good Financial Health',
				message: `Your financial health score is ${healthScore.toFixed(
					0
				)}/100. There's room for improvement.`,
				priority: 'medium',
				value: healthScore,
				action: 'improve_health',
				actionLabel: 'Get Tips',
				category: 'savings',
				tags: ['health-score', 'improvement'],
				createdAt: new Date(),
			});
		} else {
			insights.push({
				id: 'health_needs_attention',
				type: 'warning',
				title: 'Financial Health Needs Attention',
				message: `Your financial health score is ${healthScore.toFixed(
					0
				)}/100. Let's work on improving it.`,
				priority: 'high',
				value: healthScore,
				action: 'financial_planning',
				actionLabel: 'Get Help',
				category: 'savings',
				tags: ['health-score', 'attention'],
				createdAt: new Date(),
			});
		}

		// Savings Rate Analysis
		if (savingsRate >= 20) {
			insights.push({
				id: 'savings_excellent',
				type: 'success',
				title: 'Excellent Savings Rate!',
				message: `You're saving ${savingsRate.toFixed(
					1
				)}% of your income. This is fantastic!`,
				priority: 'low',
				value: savingsRate,
				trend: 'up',
				category: 'savings',
				tags: ['savings-rate', 'excellent'],
				createdAt: new Date(),
			});
		} else if (savingsRate >= 10) {
			insights.push({
				id: 'savings_good',
				type: 'info',
				title: 'Good Savings Rate',
				message: `You're saving ${savingsRate.toFixed(
					1
				)}% of your income. Consider increasing to 20% for better financial security.`,
				priority: 'medium',
				value: savingsRate,
				action: 'increase_savings',
				actionLabel: 'Learn How',
				category: 'savings',
				tags: ['savings-rate', 'improvement'],
				createdAt: new Date(),
			});
		} else if (savingsRate < 0) {
			insights.push({
				id: 'savings_negative',
				type: 'critical',
				title: 'Spending More Than Earning',
				message: `You're spending ${Math.abs(savingsRate).toFixed(
					1
				)}% more than you earn. This needs immediate attention.`,
				priority: 'critical',
				value: savingsRate,
				trend: 'down',
				action: 'emergency_budget',
				actionLabel: 'Create Budget',
				category: 'budget',
				tags: ['savings-rate', 'critical'],
				createdAt: new Date(),
			});
		} else if (savingsRate < 5) {
			insights.push({
				id: 'savings_low',
				type: 'warning',
				title: 'Low Savings Rate',
				message: `You're only saving ${savingsRate.toFixed(
					1
				)}% of your income. Aim for at least 10-20%.`,
				priority: 'high',
				value: savingsRate,
				action: 'increase_savings',
				actionLabel: 'Improve Savings',
				category: 'savings',
				tags: ['savings-rate', 'low'],
				createdAt: new Date(),
			});
		}

		// Debt Analysis
		if (debtToIncomeRatio > 50) {
			insights.push({
				id: 'debt_high',
				type: 'critical',
				title: 'High Debt-to-Income Ratio',
				message: `Your debt is ${debtToIncomeRatio.toFixed(
					1
				)}% of your income. This is concerning and needs immediate attention.`,
				priority: 'critical',
				value: debtToIncomeRatio,
				action: 'debt_strategy',
				actionLabel: 'Debt Plan',
				category: 'debt',
				tags: ['debt-ratio', 'critical'],
				createdAt: new Date(),
			});
		} else if (debtToIncomeRatio > 36) {
			insights.push({
				id: 'debt_moderate',
				type: 'warning',
				title: 'Moderate Debt Level',
				message: `Your debt is ${debtToIncomeRatio.toFixed(
					1
				)}% of your income. Consider reducing this to under 36%.`,
				priority: 'medium',
				value: debtToIncomeRatio,
				action: 'debt_strategy',
				actionLabel: 'Reduce Debt',
				category: 'debt',
				tags: ['debt-ratio', 'moderate'],
				createdAt: new Date(),
			});
		}

		// Emergency Fund Analysis
		if (emergencyFundRatio < 0.5) {
			insights.push({
				id: 'emergency_fund_low',
				type: 'warning',
				title: 'Low Emergency Fund',
				message: `You have ${(emergencyFundRatio * 6).toFixed(
					1
				)} months of expenses saved. Aim for 3-6 months.`,
				priority: 'high',
				value: emergencyFundRatio,
				action: 'set_savings_goal',
				actionLabel: 'Build Emergency Fund',
				category: 'emergency',
				tags: ['emergency-fund', 'low'],
				createdAt: new Date(),
			});
		} else if (emergencyFundRatio >= 1) {
			insights.push({
				id: 'emergency_fund_good',
				type: 'success',
				title: 'Great Emergency Fund!',
				message: `You have ${(emergencyFundRatio * 6).toFixed(
					1
				)} months of expenses saved. Excellent preparation!`,
				priority: 'low',
				value: emergencyFundRatio,
				category: 'emergency',
				tags: ['emergency-fund', 'excellent'],
				createdAt: new Date(),
			});
		}

		// Budget Analysis
		if (budgets.length === 0) {
			insights.push({
				id: 'no_budgets',
				type: 'warning',
				title: 'No Budgets Created',
				message:
					'Creating budgets helps you track spending and reach your financial goals.',
				priority: 'medium',
				action: 'create_budget',
				actionLabel: 'Create Budget',
				category: 'budget',
				tags: ['budget', 'missing'],
				createdAt: new Date(),
			});
		}

		// Goals Analysis
		if (goals.length === 0) {
			insights.push({
				id: 'no_goals',
				type: 'info',
				title: 'No Financial Goals Set',
				message:
					'Setting specific goals helps you stay motivated and track progress.',
				priority: 'medium',
				action: 'set_savings_goal',
				actionLabel: 'Set Goals',
				category: 'goals',
				tags: ['goals', 'missing'],
				createdAt: new Date(),
			});
		}

		return insights;
	}
}

export default InsightsContextService;
