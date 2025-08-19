import { Budget, Goal, Transaction } from '../types';

export interface FinancialAnalysis {
	budgetHealth: {
		overBudget: Budget[];
		underBudget: Budget[];
		onTrack: Budget[];
		utilization: number;
	};
	goalProgress: {
		onTrack: Goal[];
		behind: Goal[];
		ahead: Goal[];
		averageProgress: number;
	};
	spendingPatterns: {
		trend: 'increasing' | 'decreasing' | 'stable';
		topCategories: Array<{ name: string; amount: number; percentage: number }>;
		monthlyAverage: number;
		projectedMonthly: number;
	};
	savingsHealth: {
		currentRate: number;
		recommendedRate: number;
		status: 'excellent' | 'good' | 'needs_improvement' | 'critical';
	};
}

export interface IntelligentResponse {
	answer: string;
	analysis: string;
	recommendations: string[];
	actionable: boolean;
	confidence: 'high' | 'medium' | 'low';
}

export class IntelligentLocalAIService {
	private budgets: Budget[] = [];
	private goals: Goal[] = [];
	private transactions: Transaction[] = [];
	private lastQuestion: string = '';

	constructor(budgets: Budget[], goals: Goal[], transactions: Transaction[]) {
		this.budgets = budgets || [];
		this.goals = goals || [];
		this.transactions = transactions || [];
	}

	/**
	 * Get intelligent response based on user's actual financial data
	 */
	getResponse(question: string): IntelligentResponse {
		this.lastQuestion = question; // Store the question for context
		const analysis = this.analyzeFinancialHealth();
		const questionLower = question.toLowerCase();

		// Groceries and food budget questions
		if (this.isGroceryQuestion(questionLower)) {
			return this.getGroceryBudgetResponse(analysis);
		}

		// Budget-related questions
		if (this.isBudgetQuestion(questionLower)) {
			return this.getBudgetResponse(analysis);
		}

		// Goal-related questions
		if (this.isGoalQuestion(questionLower)) {
			return this.getGoalResponse(analysis);
		}

		// Savings questions
		if (this.isSavingsQuestion(questionLower)) {
			return this.getSavingsResponse(analysis);
		}

		// Spending questions
		if (this.isSpendingQuestion(questionLower)) {
			return this.getSpendingResponse(analysis);
		}

		// General financial health
		if (this.isGeneralQuestion(questionLower)) {
			return this.getGeneralFinancialResponse(analysis);
		}

		// Default response
		return this.getDefaultResponse(analysis);
	}

	/**
	 * Analyze the user's financial health comprehensively
	 */
	private analyzeFinancialHealth(): FinancialAnalysis {
		const budgetHealth = this.analyzeBudgetHealth();
		const goalProgress = this.analyzeGoalProgress();
		const spendingPatterns = this.analyzeSpendingPatterns();
		const savingsHealth = this.analyzeSavingsHealth();

		return {
			budgetHealth,
			goalProgress,
			spendingPatterns,
			savingsHealth,
		};
	}

	/**
	 * Analyze budget health and utilization
	 */
	private analyzeBudgetHealth() {
		const overBudget = this.budgets.filter((b) => b.utilization > 100);
		const underBudget = this.budgets.filter((b) => b.utilization < 30);
		const onTrack = this.budgets.filter(
			(b) => b.utilization >= 30 && b.utilization <= 100
		);

		const totalUtilization = this.budgets.reduce(
			(sum, b) => sum + b.utilization,
			0
		);
		const averageUtilization =
			this.budgets.length > 0 ? totalUtilization / this.budgets.length : 0;

		return {
			overBudget,
			underBudget,
			onTrack,
			utilization: averageUtilization,
		};
	}

	/**
	 * Analyze goal progress and timeline
	 */
	private analyzeGoalProgress() {
		const now = new Date();
		const onTrack = this.goals.filter((g) => {
			const daysLeft = Math.ceil(
				(g.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
			);
			const expectedProgress = this.calculateExpectedProgress(
				g.deadline,
				g.createdAt
			);
			return g.progress >= expectedProgress * 0.8; // 80% of expected progress
		});

		const behind = this.goals.filter((g) => {
			const daysLeft = Math.ceil(
				(g.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
			);
			const expectedProgress = this.calculateExpectedProgress(
				g.deadline,
				g.createdAt
			);
			return g.progress < expectedProgress * 0.8 && daysLeft > 0;
		});

		const ahead = this.goals.filter((g) => {
			const expectedProgress = this.calculateExpectedProgress(
				g.deadline,
				g.createdAt
			);
			return g.progress > expectedProgress * 1.2; // 20% ahead of expected progress
		});

		const totalProgress = this.goals.reduce((sum, g) => sum + g.progress, 0);
		const averageProgress =
			this.goals.length > 0 ? totalProgress / this.goals.length : 0;

		return {
			onTrack,
			behind,
			ahead,
			averageProgress,
		};
	}

	/**
	 * Analyze spending patterns and trends
	 */
	private analyzeSpendingPatterns() {
		if (this.transactions.length === 0) {
			return {
				trend: 'stable' as const,
				topCategories: [],
				monthlyAverage: 0,
				projectedMonthly: 0,
			};
		}

		// Group transactions by month and calculate trends
		const monthlyTotals = this.groupTransactionsByMonth();
		const trend = this.calculateSpendingTrend(monthlyTotals);

		// Calculate category breakdown
		const categoryTotals = this.calculateCategoryTotals();
		const topCategories = this.getTopCategories(categoryTotals);

		// Calculate averages
		const monthlyAverage = this.calculateMonthlyAverage(monthlyTotals);
		const projectedMonthly = this.projectMonthlySpending(monthlyTotals, trend);

		return {
			trend,
			topCategories,
			monthlyAverage,
			projectedMonthly,
		};
	}

	/**
	 * Analyze savings health
	 */
	private analyzeSavingsHealth() {
		// Calculate savings rate based on transactions
		const totalIncome = this.transactions
			.filter((t) => t.type === 'income')
			.reduce((sum, t) => sum + t.amount, 0);

		const totalExpenses = this.transactions
			.filter((t) => t.type === 'expense')
			.reduce((sum, t) => sum + t.amount, 0);

		const currentRate =
			totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
		const recommendedRate = 20; // 20% is a good target

		let status: 'excellent' | 'good' | 'needs_improvement' | 'critical';
		if (currentRate >= 25) status = 'excellent';
		else if (currentRate >= 15) status = 'good';
		else if (currentRate >= 5) status = 'needs_improvement';
		else status = 'critical';

		return {
			currentRate,
			recommendedRate,
			status,
		};
	}

	/**
	 * Get intelligent response for grocery budget questions
	 */
	private getGroceryBudgetResponse(
		financialAnalysis: FinancialAnalysis
	): IntelligentResponse {
		const groceryBudget = this.budgets.find(
			(b) =>
				b.name.toLowerCase().includes('grocery') ||
				b.name.toLowerCase().includes('food') ||
				b.name.toLowerCase().includes('dining')
		);

		if (!groceryBudget) {
			return {
				answer:
					"I don't see a grocery budget set up yet. Based on typical spending patterns, I recommend setting aside 10-15% of your monthly income for food.",
				analysis:
					'No grocery budget found. This is a common first budget to create.',
				recommendations: [
					'Create a grocery budget: Tap + → Add Budget → Food & Dining',
					'Start with 10-15% of your monthly income',
					'Track your grocery spending for a month to see your actual needs',
				],
				actionable: true,
				confidence: 'high',
			};
		}

		const utilization = groceryBudget.utilization;
		const daysLeft = this.getDaysLeftInPeriod(groceryBudget);
		const dailySpending = this.calculateDailySpending(groceryBudget);
		const projectedSpending = this.projectPeriodSpending(
			groceryBudget,
			dailySpending
		);

		let answer: string;
		let analysis: string;
		let recommendations: string[] = [];

		if (utilization > 100) {
			const overspend = projectedSpending - groceryBudget.amount;
			const dailyReduction = overspend / Math.max(daysLeft, 1);

			answer = `Your grocery budget is at ${utilization.toFixed(
				1
			)}% with ${daysLeft} days left. At this rate, you'll overspend by $${overspend.toFixed(
				2
			)}.`;
			analysis = `Current spending rate: $${dailySpending.toFixed(
				2
			)}/day. Need to reduce to $${(dailySpending - dailyReduction).toFixed(
				2
			)}/day to stay on budget.`;
			recommendations = [
				`Reduce daily spending by $${dailyReduction.toFixed(2)}`,
				'Plan meals to avoid impulse purchases',
				'Use grocery store apps for deals and coupons',
				'Consider buying in bulk for non-perishables',
			];
		} else if (utilization < 50) {
			const savings = groceryBudget.amount - projectedSpending;
			answer = `Your grocery budget is only ${utilization.toFixed(
				1
			)}% used with ${daysLeft} days left. You're on track to save $${savings.toFixed(
				2
			)} this month.`;
			analysis = `Great job staying under budget! Current spending rate: $${dailySpending.toFixed(
				2
			)}/day.`;
			recommendations = [
				'Consider reallocating savings to other financial goals',
				'Maintain this spending pattern for consistent savings',
				'Use savings for quality ingredients or bulk purchases',
			];
		} else {
			answer = `Your grocery budget is ${utilization.toFixed(
				1
			)}% used. You're on track to finish the month ${
				utilization > 75 ? 'slightly over' : 'slightly under'
			} budget.`;
			analysis = `Current spending rate: $${dailySpending.toFixed(2)}/day. ${
				utilization > 75
					? 'Watch spending in the remaining days.'
					: 'Good pace to stay on track.'
			}`;
			recommendations = [
				'Continue monitoring daily spending',
				'Plan meals for the remaining period',
				'Avoid large grocery purchases unless necessary',
			];
		}

		return {
			answer,
			analysis,
			recommendations,
			actionable: true,
			confidence: 'high',
		};
	}

	/**
	 * Get intelligent response for budget questions
	 */
	private getBudgetResponse(
		financialAnalysis: FinancialAnalysis
	): IntelligentResponse {
		if (this.budgets.length === 0) {
			return {
				answer:
					"You don't have any budgets set up yet. Creating a budget is the first step to financial success!",
				analysis:
					'No budgets found. This is the foundation of financial management.',
				recommendations: [
					'Start with essential categories: Food, Transportation, Housing',
					'Use the 50/30/20 rule: 50% needs, 30% wants, 20% savings',
					'Set realistic limits based on your income and past spending',
				],
				actionable: true,
				confidence: 'high',
			};
		}

		const { overBudget, underBudget, utilization } =
			financialAnalysis.budgetHealth;

		let answer: string;
		let analysis: string;
		let recommendations: string[] = [];

		if (overBudget.length > 0) {
			const overBudgetNames = overBudget.map((b) => b.name).join(', ');
			answer = `You're over budget in ${overBudget.length} category${
				overBudget.length > 1 ? 'ies' : 'y'
			}: ${overBudgetNames}.`;
			analysis = `Overall budget utilization: ${utilization.toFixed(1)}%. ${
				overBudget.length
			} budget(s) exceeding limits.`;
			recommendations = [
				'Review spending in over-budget categories',
				'Consider reallocating from under-utilized budgets',
				'Set up budget alerts to catch overspending early',
				"Adjust budget limits if they're unrealistic",
			];
		} else if (utilization < 60) {
			answer = `Great job! Your budgets are only ${utilization.toFixed(
				1
			)}% utilized. You're well under budget across all categories.`;
			analysis = `Low budget utilization suggests conservative budgeting or reduced spending.`;
			recommendations = [
				'Consider reallocating unused budget to savings goals',
				'Review if budget limits are too conservative',
				'Use savings for debt reduction or investments',
			];
		} else {
			answer = `Your budgets are ${utilization.toFixed(
				1
			)}% utilized. You're managing your spending well and staying within limits.`;
			analysis = `Healthy budget utilization indicates good financial discipline.`;
			recommendations = [
				'Continue monitoring your spending patterns',
				'Consider setting up savings goals with excess funds',
				'Review budget allocations quarterly for optimization',
			];
		}

		return {
			answer,
			analysis,
			recommendations,
			actionable: true,
			confidence: 'high',
		};
	}

	/**
	 * Get intelligent response for goal-related questions
	 */
	private getGoalResponse(
		financialAnalysis: FinancialAnalysis
	): IntelligentResponse {
		// Check if this is a goal creation request
		const questionLower = this.lastQuestion?.toLowerCase() || '';
		const isGoalCreationRequest =
			questionLower.includes('setup') ||
			questionLower.includes('set up') ||
			questionLower.includes('create') ||
			questionLower.includes('help me') ||
			questionLower.includes('buy a house') ||
			questionLower.includes('buy house') ||
			questionLower.includes('purchase') ||
			questionLower.includes('dream') ||
			questionLower.includes('planning') ||
			questionLower.includes('plan to');

		if (isGoalCreationRequest) {
			return this.getGoalCreationResponse();
		}

		if (this.goals.length === 0) {
			return {
				answer:
					"You don't have any financial goals set up yet. Setting goals gives you direction and motivation!",
				analysis:
					'No financial goals found. Goals are essential for long-term financial success.',
				recommendations: [
					'Start with an emergency fund goal (3-6 months of expenses)',
					'Set a savings goal for a major purchase',
					'Create debt reduction goals if applicable',
					'Set retirement or investment goals for long-term planning',
				],
				actionable: true,
				confidence: 'high',
			};
		}

		const { onTrack, behind, ahead, averageProgress } =
			financialAnalysis.goalProgress;

		let answer: string;
		let analysis: string;
		let recommendations: string[] = [];

		if (behind.length > 0) {
			const behindNames = behind.map((g) => g.name).join(', ');
			answer = `You have ${behind.length} goal${
				behind.length > 1 ? 's' : ''
			} that are behind schedule: ${behindNames}.`;
			analysis = `Average goal progress: ${averageProgress.toFixed(
				1
			)}%. Some goals need attention to meet deadlines.`;
			recommendations = [
				'Increase contributions to behind-schedule goals',
				'Review goal deadlines and adjust if necessary',
				'Prioritize goals based on importance and urgency',
				'Consider reallocating funds from ahead-schedule goals',
			];
		} else if (ahead.length > 0) {
			const aheadNames = ahead.map((g) => g.name).join(', ');
			answer = `Excellent progress! You have ${ahead.length} goal${
				ahead.length > 1 ? 's' : ''
			} ahead of schedule: ${aheadNames}.`;
			analysis = `Average goal progress: ${averageProgress.toFixed(
				1
			)}%. You're exceeding expectations on some goals.`;
			recommendations = [
				'Consider setting more ambitious goals',
				'Use excess progress to accelerate other goals',
				'Maintain momentum while avoiding burnout',
				'Celebrate your achievements!',
			];
		} else {
			answer = `Your goals are progressing well with an average completion of ${averageProgress.toFixed(
				1
			)}%. You're on track to meet your targets.`;
			analysis = `Steady progress across all goals indicates good financial planning and execution.`;
			recommendations = [
				'Continue your current contribution strategy',
				'Review goal priorities periodically',
				'Consider adding new goals as you complete current ones',
				'Maintain consistent saving habits',
			];
		}

		return {
			answer,
			analysis,
			recommendations,
			actionable: true,
			confidence: 'high',
		};
	}

	/**
	 * Get response for goal creation requests
	 */
	private getGoalCreationResponse(): IntelligentResponse {
		const questionLower = this.lastQuestion.toLowerCase();

		// Check for specific goal types mentioned
		if (questionLower.includes('house') || questionLower.includes('home')) {
			return {
				answer:
					'Great idea! Buying a house is a significant financial goal that requires careful planning. Let me help you set this up properly.',
				analysis:
					'House buying typically requires a 20% down payment, closing costs, and ongoing maintenance expenses. Planning 5 years ahead gives you time to build savings.',
				recommendations: [
					'Set a down payment goal: Aim for 20% of your target home price',
					'Create a separate emergency fund for home maintenance',
					'Factor in property taxes, insurance, and utilities in your budget',
					'Consider your credit score and debt-to-income ratio',
					"Tap + → Add Goal → 'House Down Payment' to get started",
				],
				actionable: true,
				confidence: 'high',
			};
		}

		if (questionLower.includes('car') || questionLower.includes('vehicle')) {
			return {
				answer:
					'Smart thinking! A car purchase is a major expense that benefits from advance planning.',
				analysis:
					'Car purchases often involve financing, insurance, maintenance, and fuel costs. Planning ahead helps avoid high-interest loans.',
				recommendations: [
					'Set a down payment goal: Aim for at least 20% of car value',
					'Factor in insurance, maintenance, and fuel costs',
					'Consider buying used vs. new based on your budget',
					'Plan for regular maintenance and unexpected repairs',
					"Tap + → Add Goal → 'Car Purchase Fund' to get started",
				],
				actionable: true,
				confidence: 'high',
			};
		}

		if (
			questionLower.includes('emergency') ||
			questionLower.includes('emergency fund')
		) {
			return {
				answer:
					'Excellent priority! An emergency fund is the foundation of financial security.',
				analysis:
					'Emergency funds should cover 3-6 months of essential expenses. This protects you from unexpected financial shocks.',
				recommendations: [
					'Calculate your monthly essential expenses (rent, food, utilities)',
					'Multiply by 3-6 months to get your target amount',
					'Start with a smaller goal and build up gradually',
					'Keep it in a high-yield savings account for easy access',
					"Tap + → Add Goal → 'Emergency Fund' to get started",
				],
				actionable: true,
				confidence: 'high',
			};
		}

		if (
			questionLower.includes('vacation') ||
			questionLower.includes('travel')
		) {
			return {
				answer:
					'Fun goal! Travel and experiences are great motivators for saving.',
				analysis:
					"Vacation goals help you enjoy life while building good saving habits. They're perfect for short to medium-term planning.",
				recommendations: [
					'Research your destination and estimate total costs',
					'Include flights, accommodation, food, activities, and souvenirs',
					'Add 10-15% buffer for unexpected expenses',
					'Consider seasonal pricing and travel deals',
					"Tap + → Add Goal → 'Vacation Fund' to get started",
				],
				actionable: true,
				confidence: 'high',
			};
		}

		// Generic goal creation response
		return {
			answer:
				"I'd love to help you create a financial goal! Goals give you direction and motivation to save.",
			analysis:
				'Financial goals should be specific, measurable, achievable, relevant, and time-bound (SMART).',
			recommendations: [
				'Think about what you want to achieve financially',
				'Set a specific amount and deadline',
				'Break it down into monthly savings targets',
				'Make it meaningful to you personally',
				'Tap + → Add Goal to create your first goal',
			],
			actionable: true,
			confidence: 'high',
		};
	}

	/**
	 * Get intelligent response for savings questions
	 */
	private getSavingsResponse(
		financialAnalysis: FinancialAnalysis
	): IntelligentResponse {
		const { currentRate, recommendedRate, status } =
			financialAnalysis.savingsHealth;

		let answer: string;
		let analysis: string;
		let recommendations: string[] = [];

		if (status === 'excellent') {
			answer = `Excellent work! Your savings rate is ${currentRate.toFixed(
				1
			)}%, which is above the recommended ${recommendedRate}%.`;
			analysis = `You're building wealth effectively and have a strong financial foundation.`;
			recommendations = [
				'Consider investing excess savings for higher returns',
				'Set more ambitious financial goals',
				'Maintain your excellent saving habits',
				'Help others by sharing your strategies',
			];
		} else if (status === 'good') {
			answer = `Good job! Your savings rate is ${currentRate.toFixed(
				1
			)}%, which is close to the recommended ${recommendedRate}%.`;
			analysis = `You're on the right track with saving, with room for improvement.`;
			recommendations = [
				'Aim to increase savings to 20% of income',
				'Look for areas to reduce non-essential spending',
				'Automate your savings to make it easier',
				'Set specific savings targets for motivation',
			];
		} else if (status === 'needs_improvement') {
			answer = `Your savings rate is ${currentRate.toFixed(
				1
			)}%, which is below the recommended ${recommendedRate}%. There's room for improvement.`;
			analysis = `While you are saving, increasing your rate will accelerate your financial goals.`;
			recommendations = [
				'Review your spending for non-essential items',
				'Use the 50/30/20 rule: 50% needs, 30% wants, 20% savings',
				'Set up automatic transfers to savings accounts',
				'Start small and increase gradually',
			];
		} else {
			answer = `Your current savings rate of ${currentRate.toFixed(
				1
			)}% needs immediate attention. Building savings is crucial for financial security.`;
			analysis = `Low savings rate puts you at risk for emergencies and limits long-term wealth building.`;
			recommendations: [
				'Create a strict budget to identify spending areas',
				'Start with saving 5% and increase monthly',
				'Build an emergency fund first (3-6 months of expenses)',
				"Consider additional income sources if expenses can't be reduced",
			];
		}

		return {
			answer,
			analysis,
			recommendations,
			actionable: true,
			confidence: 'high',
		};
	}

	/**
	 * Get intelligent response for spending questions
	 */
	private getSpendingResponse(
		financialAnalysis: FinancialAnalysis
	): IntelligentResponse {
		const { trend, topCategories, monthlyAverage, projectedMonthly } =
			financialAnalysis.spendingPatterns;

		let answer: string;
		let analysis: string;
		let recommendations: string[] = [];

		if (trend === 'increasing') {
			answer = `Your spending has been increasing recently. Your monthly average is $${monthlyAverage.toFixed(
				2
			)}, and you're projected to spend $${projectedMonthly.toFixed(
				2
			)} this month.`;
			analysis = `Increasing spending trend detected. This could impact your savings and budget goals.`;
			recommendations = [
				'Review recent transactions to identify spending increases',
				'Check if increases are in essential or discretionary categories',
				'Set spending alerts to catch trends early',
				'Consider implementing spending freezes for non-essential items',
			];
		} else if (trend === 'decreasing') {
			answer = `Great job! Your spending has been decreasing. Your monthly average is $${monthlyAverage.toFixed(
				2
			)}, and you're projected to spend $${projectedMonthly.toFixed(
				2
			)} this month.`;
			analysis = `Decreasing spending trend detected. This is positive for your financial goals.`;
			recommendations = [
				'Maintain your reduced spending habits',
				'Redirect savings to your financial goals',
				'Consider if reductions are sustainable long-term',
				'Celebrate your progress and set new targets',
			];
		} else {
			answer = `Your spending has been stable at around $${monthlyAverage.toFixed(
				2
			)} per month. You're projected to spend $${projectedMonthly.toFixed(
				2
			)} this month.`;
			analysis = `Stable spending indicates good financial discipline and predictable patterns.`;
			recommendations = [
				'Use stability to plan for future expenses',
				'Consider if current spending aligns with your goals',
				'Look for opportunities to optimize further',
				'Maintain your current financial habits',
			];
		}

		if (topCategories.length > 0) {
			const topCategory = topCategories[0];
			answer += ` Your highest spending category is ${
				topCategory.name
			} at ${topCategory.percentage.toFixed(1)}% of total spending.`;

			if (topCategory.percentage > 40) {
				recommendations.push(
					`Review if ${topCategory.name} spending aligns with your priorities`
				);
				recommendations.push(
					`Consider setting a specific budget for ${topCategory.name}`
				);
			}
		}

		return {
			answer,
			analysis,
			recommendations,
			actionable: true,
			confidence: 'high',
		};
	}

	/**
	 * Get general financial health response
	 */
	private getGeneralFinancialResponse(
		financialAnalysis: FinancialAnalysis
	): IntelligentResponse {
		const { budgetHealth, goalProgress, savingsHealth } = financialAnalysis;

		let answer: string;
		let analysis: string;
		let recommendations: string[] = [];

		// Overall assessment
		const budgetScore =
			budgetHealth.utilization <= 100 ? 'good' : 'needs_attention';
		const goalScore =
			goalProgress.averageProgress >= 50 ? 'good' : 'needs_attention';
		const savingsScore = savingsHealth.status;

		if (
			budgetScore === 'good' &&
			goalScore === 'good' &&
			['excellent', 'good'].includes(savingsScore)
		) {
			answer =
				"Your overall financial health is excellent! You're managing budgets well, making progress on goals, and maintaining a healthy savings rate.";
			analysis =
				'Strong performance across all financial areas indicates good financial management.';
			recommendations = [
				'Continue your current financial practices',
				'Consider more advanced financial strategies',
				'Set new, more ambitious goals',
				'Share your knowledge with others',
			];
		} else if (
			budgetScore === 'good' ||
			goalScore === 'good' ||
			['excellent', 'good'].includes(savingsScore)
		) {
			answer =
				"Your financial health is mixed. You're doing well in some areas but could improve in others.";
			analysis =
				'Mixed performance suggests some good habits with room for improvement in specific areas.';
			recommendations = [
				'Focus on your strongest financial areas first',
				'Set specific improvement targets for weaker areas',
				'Use your strengths to support improvement in weaker areas',
				'Consider seeking financial advice for specific challenges',
			];
		} else {
			answer =
				'Your financial health needs attention. There are several areas where improvements could make a significant difference.';
			analysis =
				'Multiple areas needing improvement suggest a comprehensive financial review would be beneficial.';
			recommendations = [
				'Start with one area and build momentum',
				'Create a financial improvement plan',
				'Consider working with a financial advisor',
				'Focus on building one good habit at a time',
			];
		}

		return {
			answer,
			analysis,
			recommendations,
			actionable: true,
			confidence: 'medium',
		};
	}

	/**
	 * Get default response for unrecognized questions
	 */
	private getDefaultResponse(
		financialAnalysis: FinancialAnalysis
	): IntelligentResponse {
		return {
			answer:
				'I can help you with specific questions about your budgets, goals, spending, and savings. What would you like to know more about?',
			analysis:
				'General question detected. Need more specific information to provide targeted advice.',
			recommendations: [
				"Ask about your grocery budget: 'How is my grocery budget doing?'",
				"Check your goals: 'How are my financial goals progressing?'",
				"Review spending: 'How is my spending trending?'",
				"Assess savings: 'How is my savings rate?'",
			],
			actionable: false,
			confidence: 'low',
		};
	}

	// Helper methods
	private isGroceryQuestion(question: string): boolean {
		return (
			question.includes('grocery') ||
			question.includes('food') ||
			question.includes('eating') ||
			(question.includes('budget') &&
				(question.includes('high') ||
					question.includes('low') ||
					question.includes('cut')))
		);
	}

	private isBudgetQuestion(question: string): boolean {
		return (
			question.includes('budget') ||
			question.includes('create budget') ||
			question.includes('budgeting')
		);
	}

	private isGoalQuestion(question: string): boolean {
		return (
			question.includes('goal') ||
			question.includes('save') ||
			question.includes('saving') ||
			question.includes('setup') ||
			question.includes('set up') ||
			question.includes('create') ||
			question.includes('help me') ||
			question.includes('buy a house') ||
			question.includes('buy house') ||
			question.includes('purchase') ||
			question.includes('dream') ||
			question.includes('target') ||
			question.includes('planning') ||
			question.includes('plan to')
		);
	}

	private isSavingsQuestion(question: string): boolean {
		return (
			question.includes('savings') ||
			question.includes('save') ||
			question.includes('rate')
		);
	}

	private isSpendingQuestion(question: string): boolean {
		return (
			question.includes('spending') ||
			question.includes('spend') ||
			question.includes('expense')
		);
	}

	private isGeneralQuestion(question: string): boolean {
		return (
			question.includes('how') ||
			question.includes('what') ||
			question.includes('financial') ||
			question.includes('health') ||
			question.includes('overall')
		);
	}

	private calculateExpectedProgress(deadline: Date, createdAt: Date): number {
		const totalDays = Math.ceil(
			(deadline.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
		);
		const daysElapsed = Math.ceil(
			(Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
		);
		return Math.min((daysElapsed / totalDays) * 100, 100);
	}

	private getDaysLeftInPeriod(budget: Budget): number {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		return Math.ceil(
			(endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
		);
	}

	private calculateDailySpending(budget: Budget): number {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const daysElapsed = Math.ceil(
			(now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24)
		);
		return daysElapsed > 0 ? budget.spent / daysElapsed : 0;
	}

	private projectPeriodSpending(budget: Budget, dailySpending: number): number {
		const daysLeft = this.getDaysLeftInPeriod(budget);
		return budget.spent + dailySpending * daysLeft;
	}

	private groupTransactionsByMonth(): Map<string, number> {
		const monthlyTotals = new Map<string, number>();

		this.transactions.forEach((transaction) => {
			const monthKey = `${transaction.date.getFullYear()}-${transaction.date.getMonth()}`;
			const currentTotal = monthlyTotals.get(monthKey) || 0;
			monthlyTotals.set(monthKey, currentTotal + transaction.amount);
		});

		return monthlyTotals;
	}

	private calculateSpendingTrend(
		monthlyTotals: Map<string, number>
	): 'increasing' | 'decreasing' | 'stable' {
		const months = Array.from(monthlyTotals.keys()).sort();
		if (months.length < 2) return 'stable';

		const values = months.map((month) => monthlyTotals.get(month) || 0);
		const trend = values[values.length - 1] - values[0];

		if (Math.abs(trend) < values[0] * 0.1) return 'stable';
		return trend > 0 ? 'increasing' : 'decreasing';
	}

	private calculateCategoryTotals(): Map<string, number> {
		const categoryTotals = new Map<string, number>();

		this.transactions.forEach((transaction) => {
			const category = transaction.category || 'Uncategorized';
			const currentTotal = categoryTotals.get(category) || 0;
			categoryTotals.set(category, currentTotal + transaction.amount);
		});

		return categoryTotals;
	}

	private getTopCategories(
		categoryTotals: Map<string, number>
	): Array<{ name: string; amount: number; percentage: number }> {
		const total = Array.from(categoryTotals.values()).reduce(
			(sum, amount) => sum + amount,
			0
		);

		return Array.from(categoryTotals.entries())
			.map(([name, amount]) => ({
				name,
				amount,
				percentage: total > 0 ? (amount / total) * 100 : 0,
			}))
			.sort((a, b) => b.amount - a.amount)
			.slice(0, 5);
	}

	private calculateMonthlyAverage(monthlyTotals: Map<string, number>): number {
		const values = Array.from(monthlyTotals.values());
		return values.length > 0
			? values.reduce((sum, amount) => sum + amount, 0) / values.length
			: 0;
	}

	private projectMonthlySpending(
		monthlyTotals: Map<string, number>,
		trend: 'increasing' | 'decreasing' | 'stable'
	): number {
		const average = this.calculateMonthlyAverage(monthlyTotals);

		if (trend === 'stable') return average;
		if (trend === 'increasing') return average * 1.1; // 10% increase
		return average * 0.9; // 10% decrease
	}
}
