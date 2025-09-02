import { GroundedResponse } from './groundingService';

export class ResponseFormatterService {
	formatBalanceResponse(data: any): string {
		const { totalIncome, totalSpent, availableBalance, currency } = data;

		if (totalIncome === 0) {
			return "I don't have enough information about your income to show your balance. You can set up your profile in settings to get personalized financial insights.";
		}

		const formattedIncome = this.formatCurrency(totalIncome);
		const formattedSpent = this.formatCurrency(totalSpent);
		const formattedAvailable = this.formatCurrency(availableBalance);

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

		const formattedTotal = this.formatCurrency(totalBudget);
		const formattedSpent = this.formatCurrency(totalSpent);
		const formattedRemaining = this.formatCurrency(totalRemaining);

		let response = `📊 **Budget Status**\n\n`;
		response += `• **Total Budget:** ${formattedTotal}\n`;
		response += `• **Total Spent:** ${formattedSpent}\n`;
		response += `• **Remaining:** ${formattedRemaining}\n`;
		response += `• **Overall Progress:** ${overallPercentage.toFixed(1)}%\n\n`;

		// Add individual budget status
		response += `**Individual Budgets:**\n`;
		budgets.forEach((budget) => {
			const status = budget.isOverBudget
				? '🔴'
				: budget.spentPercentage > 80
				? '🟡'
				: '🟢';
			response += `${status} **${budget.name}:** ${this.formatCurrency(
				budget.spent
			)} / ${this.formatCurrency(
				budget.amount
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

		const formattedTotal = this.formatCurrency(totalMonthly);

		let response = `📅 **Your Recurring Expenses**\n\n`;
		response += `**Total Monthly:** ${formattedTotal}\n\n`;

		subscriptions.forEach((sub) => {
			response += `• **${sub.name}:** ${this.formatCurrency(sub.amount)}\n`;
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

		goals.forEach((goal) => {
			const progressBar = this.createProgressBar(goal.progress);
			const formattedTarget = this.formatCurrency(goal.targetAmount);
			const formattedCurrent = this.formatCurrency(goal.currentAmount);
			const formattedRemaining = this.formatCurrency(goal.remaining);

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

		const formattedTotal = this.formatCurrency(totalSpent);

		let response = `📈 **Spending Breakdown**\n\n`;
		response += `**Total Spent:** ${formattedTotal}\n\n`;

		// Show top 5 categories
		const topCategories = breakdown.slice(0, 5);
		topCategories.forEach((item) => {
			const percentage = item.percentage.toFixed(1);
			response += `• **${item.category}:** ${this.formatCurrency(
				item.amount
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

		const formattedNext30 = this.formatCurrency(next30Days);
		const formattedDaily = this.formatCurrency(dailyAverage);

		let response = `🔮 **Spending Forecast**\n\n`;
		response += `• **Next 30 Days:** ${formattedNext30}\n`;
		response += `• **Daily Average:** ${formattedDaily}\n`;
		response += `• **Confidence:** ${(confidence * 100).toFixed(0)}%\n`;
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

		const formattedAmount = this.formatCurrency(amount);
		const confidencePercent = (confidence * 100).toFixed(0);

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
		}

		// Fallback for unknown data structure
		return `Here's what I found:\n\n${JSON.stringify(
			payload,
			null,
			2
		)}\n\n*Confidence: ${(confidence * 100).toFixed(0)}%*`;
	}

	private formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
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
}
