import { GroundedResponse } from './groundingService';

// Type definitions for better type safety
interface BudgetData {
	name: string;
	amount: number;
	spent: number;
	spentPercentage: number;
	isOverBudget: boolean;
}

interface SubscriptionData {
	name: string;
	amount: number;
}

interface GoalData {
	name: string;
	targetAmount: number;
	currentAmount: number;
	remaining: number;
	progress: number;
	deadline?: string;
}

interface SpendingBreakdownItem {
	category: string;
	amount: number;
	percentage: number;
}

interface TransactionData {
	id: string;
	amount: number;
	type: 'income' | 'expense';
	category?: string;
	description?: string;
	date: string;
}

interface BudgetCreationData {
	name: string;
	amount: number;
	period: 'weekly' | 'monthly';
	categories?: string[];
}

// Export the interface for use in other files
export type {
	BudgetCreationData,
	TransactionData,
	BudgetData,
	SubscriptionData,
	GoalData,
	SpendingBreakdownItem,
};

export class ResponseFormatterService {
	formatBalanceResponse(data: any): string {
		const { totalIncome, totalSpent, availableBalance } = data;

		if (totalIncome === 0) {
			return "I don't have enough information about your income to show your balance. You can set up your profile in settings to get personalized financial insights.";
		}

		const formattedIncome = this.formatCurrency(
			totalIncome,
			data.currency || 'USD'
		);
		const formattedSpent = this.formatCurrency(
			totalSpent,
			data.currency || 'USD'
		);
		const formattedAvailable = this.formatCurrency(
			availableBalance,
			data.currency || 'USD'
		);

		let response = `💰 **Your Financial Summary**\n\n`;
		response += `• **Monthly Income:** ${formattedIncome}\n`;
		response += `• **Total Spent:** ${formattedSpent}\n`;
		response += `• **Available Balance:** ${formattedAvailable}\n\n`;

		if (availableBalance > 0) {
			response += `Great job! You have ${formattedAvailable} available this month.`;
		} else if (availableBalance === 0) {
			response += `You've spent exactly what you've earned this month. Consider setting aside some savings!`;
		} else {
			response += `⚠️ You're currently ${formattedAvailable.replace(
				'-',
				''
			)} over your income. This might be a good time to review your spending.`;
		}

		return response;
	}

	formatBudgetStatusResponse(data: any): string {
		const {
			totalBudget,
			totalSpent,
			totalRemaining,
			overallPercentage,
			budgets,
		} = data;

		if (budgets.length === 0) {
			return "You don't have any budgets set up yet. Would you like me to help you create your first budget?";
		}

		const formattedTotal = this.formatCurrency(
			totalBudget,
			data.currency || 'USD'
		);
		const formattedSpent = this.formatCurrency(
			totalSpent,
			data.currency || 'USD'
		);
		const formattedRemaining = this.formatCurrency(
			totalRemaining,
			data.currency || 'USD'
		);

		let response = `📊 **Budget Status**\n\n`;
		response += `• **Total Budget:** ${formattedTotal}\n`;
		response += `• **Total Spent:** ${formattedSpent}\n`;
		response += `• **Remaining:** ${formattedRemaining}\n`;
		response += `• **Overall Progress:** ${overallPercentage.toFixed(1)}%\n\n`;

		// Add individual budget status
		response += `**Individual Budgets:**\n`;
		budgets.forEach((budget: BudgetData) => {
			const status = budget.isOverBudget
				? '🔴'
				: budget.spentPercentage > 80
				? '🟡'
				: '🟢';
			response += `${status} **${budget.name}:** ${this.formatCurrency(
				budget.spent,
				data.currency || 'USD'
			)} / ${this.formatCurrency(
				budget.amount,
				data.currency || 'USD'
			)} (${budget.spentPercentage.toFixed(1)}%)\n`;
		});

		// Add insights
		if (overallPercentage > 90) {
			response += `\n⚠️ You're close to your total budget limit. Consider reviewing your spending.`;
		} else if (overallPercentage < 50) {
			response += `\n✅ You're doing great! You still have plenty of budget remaining.`;
		}

		return response;
	}

	formatSubscriptionsResponse(data: any): string {
		const { subscriptions, totalMonthly } = data;

		if (subscriptions.length === 0) {
			return "I don't see any recurring subscriptions or fixed expenses in your transactions yet. This could mean you're not tracking them, or you don't have any.";
		}

		const formattedTotal = this.formatCurrency(
			totalMonthly,
			data.currency || 'USD'
		);

		let response = `📅 **Your Recurring Expenses**\n\n`;
		response += `**Total Monthly:** ${formattedTotal}\n\n`;

		subscriptions.forEach((sub: SubscriptionData) => {
			response += `• **${sub.name}:** ${this.formatCurrency(
				sub.amount,
				data.currency || 'USD'
			)}\n`;
		});

		response += `\n💡 **Insights:** `;
		if (totalMonthly > 1000) {
			response += `Your recurring expenses are quite high. Consider reviewing which subscriptions you really need.`;
		} else if (totalMonthly > 500) {
			response += `Your recurring expenses are moderate. This gives you good flexibility for other spending.`;
		} else {
			response += `Great job keeping your recurring expenses low! This gives you more flexibility.`;
		}

		return response;
	}

	formatGoalProgressResponse(data: any): string {
		const { goals, totalProgress } = data;

		if (goals.length === 0) {
			return "You don't have any financial goals set up yet. Would you like me to help you create your first savings goal?";
		}

		let response = `🎯 **Goal Progress**\n\n`;
		response += `**Overall Progress:** ${totalProgress.toFixed(1)}%\n\n`;

		goals.forEach((goal: GoalData) => {
			const progressBar = this.createProgressBar(goal.progress);
			const formattedTarget = this.formatCurrency(
				goal.targetAmount,
				data.currency || 'USD'
			);
			const formattedCurrent = this.formatCurrency(
				goal.currentAmount,
				data.currency || 'USD'
			);
			const formattedRemaining = this.formatCurrency(
				goal.remaining,
				data.currency || 'USD'
			);

			response += `**${goal.name}**\n`;
			response += `${progressBar} ${goal.progress.toFixed(1)}%\n`;
			response += `• **Target:** ${formattedTarget}\n`;
			response += `• **Current:** ${formattedCurrent}\n`;
			response += `• **Remaining:** ${formattedRemaining}\n`;

			if (goal.deadline) {
				const daysLeft = this.calculateDaysLeft(goal.deadline);
				response += `• **Deadline:** ${daysLeft} days left\n`;
			}

			response += `\n`;
		});

		// Add motivation
		if (totalProgress > 80) {
			response += `🎉 You're so close to your goals! Keep up the great work!`;
		} else if (totalProgress > 50) {
			response += `💪 You're making solid progress! You're more than halfway there.`;
		} else {
			response += `🚀 You're just getting started! Every step counts toward your financial goals.`;
		}

		return response;
	}

	formatSpendingBreakdownResponse(data: any): string {
		const { breakdown, totalSpent, topCategory } = data;

		if (breakdown.length === 0) {
			return "I don't have enough transaction data to show a spending breakdown yet. Start tracking your expenses to see where your money goes!";
		}

		const formattedTotal = this.formatCurrency(
			totalSpent,
			data.currency || 'USD'
		);

		let response = `📈 **Spending Breakdown**\n\n`;
		response += `**Total Spent:** ${formattedTotal}\n\n`;

		// Show top 5 categories
		const topCategories = breakdown.slice(0, 5);
		topCategories.forEach((item: SpendingBreakdownItem) => {
			const percentage = item.percentage.toFixed(1);
			response += `• **${item.category}:** ${this.formatCurrency(
				item.amount,
				data.currency || 'USD'
			)} (${percentage}%)\n`;
		});

		if (breakdown.length > 5) {
			response += `• ... and ${breakdown.length - 5} more categories\n`;
		}

		response += `\n💡 **Top Spending Area:** ${topCategory}\n\n`;

		// Add insights
		const topCategoryPercentage = topCategories[0]?.percentage || 0;
		if (topCategoryPercentage > 40) {
			response += `⚠️ **${topCategory}** makes up a large portion of your spending (${topCategoryPercentage.toFixed(
				1
			)}%). Consider if this aligns with your priorities.`;
		} else if (topCategoryPercentage > 25) {
			response += `📊 **${topCategory}** is your biggest spending category. This is normal for essential expenses.`;
		} else {
			response += `✅ Your spending is well-distributed across categories. This shows good financial balance!`;
		}

		return response;
	}

	formatForecastResponse(data: any): string {
		const { next30Days, dailyAverage, confidence, basedOnDays } = data;

		const formattedNext30 = this.formatCurrency(
			next30Days,
			data.currency || 'USD'
		);
		const formattedDaily = this.formatCurrency(
			dailyAverage,
			data.currency || 'USD'
		);

		let response = `🔮 **Spending Forecast**\n\n`;
		response += `• **Next 30 Days:** ${formattedNext30}\n`;
		response += `• **Daily Average:** ${formattedDaily}\n`;
		if (confidence !== undefined) {
			response += `• **Confidence:** ${(confidence * 100).toFixed(0)}%\n`;
		}
		response += `• **Based on:** ${basedOnDays} days of data\n\n`;

		// Add insights based on confidence
		if (confidence > 0.8) {
			response += `✅ This forecast is highly reliable based on your consistent spending patterns.`;
		} else if (confidence > 0.6) {
			response += `⚠️ This forecast has moderate reliability. Your spending varies, so actual amounts may differ.`;
		} else {
			response += `📊 This forecast has lower reliability due to spending variability. Consider it a rough estimate.`;
		}

		// Add actionable advice
		if (next30Days > 2000) {
			response += `\n\n💡 **Tip:** Your projected spending is quite high. Consider reviewing your budget to identify areas to cut back.`;
		} else if (next30Days < 1000) {
			response += `\n\n💡 **Tip:** Great job keeping spending low! You're on track for a strong financial month.`;
		}

		return response;
	}

	formatCategorizationResponse(data: any): string {
		const { category, confidence, description, amount } = data;

		const formattedAmount = this.formatCurrency(amount, data.currency || 'USD');
		const confidencePercent =
			confidence !== undefined ? (confidence * 100).toFixed(0) : 'N/A';

		let response = `🏷️ **Transaction Categorization**\n\n`;
		response += `• **Description:** ${description}\n`;
		response += `• **Amount:** ${formattedAmount}\n`;
		response += `• **Suggested Category:** ${category}\n`;
		response += `• **Confidence:** ${confidencePercent}%\n\n`;

		if (confidence > 0.8) {
			response += `✅ I'm very confident this belongs in **${category}**.`;
		} else if (confidence > 0.6) {
			response += `⚠️ I'm moderately confident this belongs in **${category}**, but you may want to review it.`;
		} else {
			response += `❓ I'm not very confident about this categorization. You may want to manually assign a category.`;
		}

		return response;
	}

	formatTransactionListResponse(data: any): string {
		const { transactions, totalCount, totalAmount, currency } = data;

		if (transactions.length === 0) {
			return "I don't see any transactions yet. Start adding your income and expenses to track your financial activity!";
		}

		const formattedTotal = this.formatCurrency(totalAmount, currency || 'USD');

		let response = `📋 **Recent Transactions** (${totalCount} total)\n\n`;
		response += `**Total Amount:** ${formattedTotal}\n\n`;

		// Show recent transactions (limit to 10)
		const recentTransactions = transactions.slice(0, 10);
		recentTransactions.forEach((transaction: TransactionData) => {
			const formattedAmount = this.formatCurrency(
				transaction.amount,
				currency || 'USD'
			);
			const typeIcon = transaction.type === 'income' ? '💰' : '💸';
			const date = new Date(transaction.date).toLocaleDateString();

			response += `${typeIcon} **${
				transaction.description || 'Transaction'
			}**\n`;
			response += `   ${formattedAmount} • ${
				transaction.category || 'Uncategorized'
			} • ${date}\n\n`;
		});

		if (transactions.length > 10) {
			response += `... and ${transactions.length - 10} more transactions\n`;
		}

		return response;
	}

	formatBudgetCreationResponse(data: any): string {
		const { budget, success, message } = data;

		if (!success) {
			return `❌ **Budget Creation Failed**\n\n${
				message || 'There was an error creating your budget. Please try again.'
			}`;
		}

		const formattedAmount = this.formatCurrency(
			budget.amount,
			data.currency || 'USD'
		);
		const periodText = budget.period === 'weekly' ? 'week' : 'month';

		let response = `✅ **Budget Created Successfully!**\n\n`;
		response += `• **Name:** ${budget.name}\n`;
		response += `• **Amount:** ${formattedAmount} per ${periodText}\n`;
		if (budget.categories && budget.categories.length > 0) {
			response += `• **Categories:** ${budget.categories.join(', ')}\n`;
		}

		response += `\n💡 **Tip:** I'll help you track your spending against this budget and send alerts when you're approaching your limit.`;

		return response;
	}

	formatErrorResponse(error: any): string {
		const { message, code, details } = error;

		let response = `❌ **Error**\n\n`;
		response += `**Message:** ${message || 'An unexpected error occurred'}\n`;
		if (code) {
			response += `**Code:** ${code}\n`;
		}
		if (details) {
			response += `**Details:** ${details}\n`;
		}

		response += `\nPlease try again or contact support if the problem persists.`;

		return response;
	}

	formatGeneralQAResponse(data: any): string {
		const { answer, confidence, sources } = data;

		let response =
			answer ||
			"I'm not sure how to help with that. Could you please rephrase your question?";

		if (confidence !== undefined && confidence < 0.7) {
			response += `\n\n⚠️ *Note: I\'m not entirely confident in this answer. Please verify with additional sources.*`;
		}

		if (sources && sources.length > 0) {
			response += `\n\n**Sources:**\n`;
			sources.forEach((source: string, index: number) => {
				response += `${index + 1}. ${source}\n`;
			});
		}

		return response;
	}

	formatFinancialHealthResponse(data: any): string {
		const { score, message, factors, recommendations } =
			this.getFinancialHealthScore(data);
		const { totalIncome, totalExpenses, netWorth, emergencyFund, debtAmount } =
			data;

		let response = `🏥 **Financial Health Report**\n\n`;
		response += `**Overall Score:** ${score}/100\n`;
		response += `**Status:** ${message}\n\n`;

		// Key metrics
		response += `**Key Metrics:**\n`;
		if (totalIncome) {
			response += `• **Monthly Income:** ${this.formatCurrency(
				totalIncome,
				data.currency || 'USD'
			)}\n`;
		}
		if (totalExpenses) {
			response += `• **Monthly Expenses:** ${this.formatCurrency(
				totalExpenses,
				data.currency || 'USD'
			)}\n`;
		}
		if (netWorth !== undefined) {
			response += `• **Net Worth:** ${this.formatCurrency(
				netWorth,
				data.currency || 'USD'
			)}\n`;
		}
		if (emergencyFund !== undefined) {
			response += `• **Emergency Fund:** ${this.formatCurrency(
				emergencyFund,
				data.currency || 'USD'
			)}\n`;
		}
		if (debtAmount !== undefined) {
			response += `• **Total Debt:** ${this.formatCurrency(
				debtAmount,
				data.currency || 'USD'
			)}\n`;
		}

		// Factors affecting score
		if (factors && factors.length > 0) {
			response += `\n**Factors:**\n`;
			factors.forEach((factor: string) => {
				response += `• ${factor}\n`;
			});
		}

		// Recommendations
		if (recommendations && recommendations.length > 0) {
			response += `\n**Recommendations:**\n`;
			recommendations.forEach((rec: string, index: number) => {
				response += `${index + 1}. ${rec}\n`;
			});
		}

		return response;
	}

	formatGroundedResponse(
		groundedResponse: GroundedResponse,
		originalQuery: string
	): string {
		if (groundedResponse.type === 'fallback') {
			return "I couldn't process that request with my current data. Let me connect you to my AI assistant for a more detailed response.";
		}

		const { payload, confidence } = groundedResponse;

		// Route to appropriate formatter based on the data structure
		if (payload.totalIncome !== undefined) {
			return this.formatBalanceResponse(payload);
		} else if (payload.totalBudget !== undefined) {
			return this.formatBudgetStatusResponse(payload);
		} else if (payload.subscriptions !== undefined) {
			return this.formatSubscriptionsResponse(payload);
		} else if (payload.goals !== undefined) {
			return this.formatGoalProgressResponse(payload);
		} else if (payload.breakdown !== undefined) {
			return this.formatSpendingBreakdownResponse(payload);
		} else if (payload.next30Days !== undefined) {
			return this.formatForecastResponse(payload);
		} else if (payload.category !== undefined) {
			return this.formatCategorizationResponse(payload);
		} else if (payload.transactions !== undefined) {
			return this.formatTransactionListResponse(payload);
		} else if (payload.budget && payload.success !== undefined) {
			return this.formatBudgetCreationResponse(payload);
		} else if (payload.error !== undefined) {
			return this.formatErrorResponse(payload.error);
		} else if (payload.answer !== undefined) {
			return this.formatGeneralQAResponse(payload);
		} else if (
			payload.score !== undefined ||
			payload.financialHealth !== undefined
		) {
			return this.formatFinancialHealthResponse(payload);
		}

		// Fallback for unknown data structure
		const confidenceText =
			confidence !== undefined
				? `*Confidence: ${(confidence * 100).toFixed(0)}%*`
				: '';
		return `Here's what I found:\n\n${JSON.stringify(payload, null, 2)}${
			confidenceText ? `\n\n${confidenceText}` : ''
		}`;
	}

	private formatCurrency(amount: number, currency: string = 'USD'): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount);
	}

	private createProgressBar(percentage: number): string {
		const filled = Math.round(percentage / 10);
		const empty = 10 - filled;
		return '█'.repeat(filled) + '░'.repeat(empty);
	}

	private calculateDaysLeft(deadline: string): number {
		const deadlineDate = new Date(deadline);
		const today = new Date();
		const diffTime = deadlineDate.getTime() - today.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return Math.max(0, diffDays);
	}

	// Utility method to format large numbers with K, M, B suffixes
	private formatLargeNumber(num: number): string {
		if (num >= 1000000000) {
			return (num / 1000000000).toFixed(1) + 'B';
		} else if (num >= 1000000) {
			return (num / 1000000).toFixed(1) + 'M';
		} else if (num >= 1000) {
			return (num / 1000).toFixed(1) + 'K';
		}
		return num.toString();
	}

	// Utility method to get trend indicators
	private getTrendIndicator(current: number, previous: number): string {
		if (current > previous) {
			return '📈';
		} else if (current < previous) {
			return '📉';
		} else {
			return '➡️';
		}
	}

	// Utility method to format percentage with color indicators
	private formatPercentage(percentage: number): string {
		if (percentage >= 90) {
			return `🔴 ${percentage.toFixed(1)}%`;
		} else if (percentage >= 80) {
			return `🟡 ${percentage.toFixed(1)}%`;
		} else {
			return `🟢 ${percentage.toFixed(1)}%`;
		}
	}

	// Utility method to format date ranges
	private formatDateRange(startDate: string, endDate: string): string {
		const start = new Date(startDate);
		const end = new Date(endDate);
		const startStr = start.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
		});
		const endStr = end.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
		});
		return `${startStr} - ${endStr}`;
	}

	// Utility method to get financial health score
	private getFinancialHealthScore(data: any): {
		score: number;
		message: string;
		factors: string[];
		recommendations: string[];
	} {
		let score = 0;
		let factors: string[] = [];
		let recommendations: string[] = [];

		// Check if user has emergency fund (3+ months of expenses)
		if (data.emergencyFund && data.emergencyFund >= data.monthlyExpenses * 3) {
			score += 25;
			factors.push('Emergency fund');
		} else {
			factors.push('No emergency fund');
			recommendations.push('Build an emergency fund of 3-6 months of expenses');
		}

		// Check budget adherence
		if (data.budgetAdherence && data.budgetAdherence > 0.8) {
			score += 25;
			factors.push('Good budget adherence');
		} else {
			factors.push('Poor budget adherence');
			recommendations.push('Stick to your budget and track expenses regularly');
		}

		// Check debt-to-income ratio
		if (data.debtToIncome && data.debtToIncome < 0.3) {
			score += 25;
			factors.push('Low debt ratio');
		} else {
			factors.push('High debt ratio');
			recommendations.push('Focus on paying down high-interest debt');
		}

		// Check savings rate
		if (data.savingsRate && data.savingsRate > 0.2) {
			score += 25;
			factors.push('Good savings rate');
		} else {
			factors.push('Low savings rate');
			recommendations.push('Aim to save at least 20% of your income');
		}

		let message = '';
		if (score >= 80) {
			message = 'Excellent financial health! 🎉';
		} else if (score >= 60) {
			message = 'Good financial health! 👍';
		} else if (score >= 40) {
			message = 'Fair financial health. Room for improvement. ⚠️';
		} else {
			message = 'Poor financial health. Consider financial planning. 🚨';
		}

		return { score, message, factors, recommendations };
	}
}
