import { ApiService } from './apiService';

export interface BudgetTransaction {
	id: string;
	description: string;
	amount: number;
	date: string;
	type: 'income' | 'expense';
	target?: string;
	targetModel?: 'Budget' | 'Goal';
}

export interface SpendingBreakdown {
	category: string;
	amount: number;
	percentage: number;
	color: string;
}

export interface BudgetAnalysis {
	transactions: BudgetTransaction[];
	spendingBreakdown: SpendingBreakdown[];
	totalSpent: number;
	averageSpent: number;
	transactionCount: number;
}

export class BudgetAnalysisService {
	/**
	 * Get detailed analysis for a specific budget
	 * @param budgetId - The budget ID to analyze
	 * @returns Promise<BudgetAnalysis> - Budget analysis data
	 */
	static async getBudgetAnalysis(budgetId: string): Promise<BudgetAnalysis> {
		try {
			console.log(`[BudgetAnalysisService] Fetching analysis for budget ${budgetId}`);
			
			const response = await ApiService.get<{
				data: any[];
				budget: any;
			}>(`/transactions/budget/${budgetId}`);

			if (response.success && response.data) {
				const transactions = response.data.data || [];
				const budget = response.data.budget;

				console.log(`[BudgetAnalysisService] Received ${transactions.length} transactions for budget ${budget?.name}`);

				// Process transactions to create spending breakdown
				const spendingBreakdown = this.createSpendingBreakdown(transactions);

				// Calculate totals
				const totalSpent = transactions
					.filter((tx) => tx.type === 'expense')
					.reduce((sum, tx) => sum + (tx.amount || 0), 0);

				const averageSpent =
					transactions.length > 0 ? totalSpent / transactions.length : 0;
				const transactionCount = transactions.length;

				const analysis = {
					transactions,
					spendingBreakdown,
					totalSpent,
					averageSpent,
					transactionCount,
				};

				console.log(`[BudgetAnalysisService] Analysis result:`, analysis);
				return analysis;
			}

			throw new Error(response.error || 'Failed to fetch budget analysis');
		} catch (error) {
			console.error(
				'[BudgetAnalysisService] Error getting budget analysis:',
				error
			);
			throw error;
		}
	}

	/**
	 * Create spending breakdown from transactions
	 * @param transactions - Array of transactions
	 * @returns SpendingBreakdown[] - Categorized spending breakdown
	 */
	private static createSpendingBreakdown(
		transactions: any[]
	): SpendingBreakdown[] {
		// Group transactions by category (using description patterns)
		const categoryMap = new Map<string, number>();

		transactions.forEach((tx) => {
			if (tx.type === 'expense') {
				const category = this.categorizeTransaction(tx.description);
				const currentAmount = categoryMap.get(category) || 0;
				categoryMap.set(category, currentAmount + (tx.amount || 0));
			}
		});

		// Calculate total for percentages
		const total = Array.from(categoryMap.values()).reduce(
			(sum, amount) => sum + amount,
			0
		);

		// Convert to breakdown array with colors
		const breakdown: SpendingBreakdown[] = [];
		const colors = [
			'#10b981',
			'#f59e0b',
			'#3b82f6',
			'#8b5cf6',
			'#6b7280',
			'#ef4444',
			'#06b6d4',
			'#84cc16',
		];

		let colorIndex = 0;
		categoryMap.forEach((amount, category) => {
			const percentage = total > 0 ? (amount / total) * 100 : 0;
			breakdown.push({
				category,
				amount,
				percentage: Math.round(percentage),
				color: colors[colorIndex % colors.length],
			});
			colorIndex++;
		});

		// Sort by amount (highest first)
		return breakdown.sort((a, b) => b.amount - a.amount);
	}

	/**
	 * Categorize transaction based on description
	 * @param description - Transaction description
	 * @returns string - Category name
	 */
	private static categorizeTransaction(description: string): string {
		const desc = description.toLowerCase();

		// Food and dining
		if (
			desc.includes('restaurant') ||
			desc.includes('food') ||
			desc.includes('dining') ||
			desc.includes('cafe') ||
			desc.includes('coffee') ||
			desc.includes('lunch') ||
			desc.includes('dinner') ||
			desc.includes('breakfast') ||
			desc.includes('pizza') ||
			desc.includes('burger') ||
			desc.includes('sushi') ||
			desc.includes('taco')
		) {
			return 'Dining Out';
		}

		// Groceries
		if (
			desc.includes('grocery') ||
			desc.includes('supermarket') ||
			desc.includes('market') ||
			desc.includes('food store') ||
			desc.includes('whole foods') ||
			desc.includes('trader joe') ||
			desc.includes('kroger') ||
			desc.includes('safeway') ||
			desc.includes('walmart')
		) {
			return 'Groceries';
		}

		// Transportation
		if (
			desc.includes('gas') ||
			desc.includes('fuel') ||
			desc.includes('uber') ||
			desc.includes('lyft') ||
			desc.includes('taxi') ||
			desc.includes('parking') ||
			desc.includes('toll') ||
			desc.includes('bus') ||
			desc.includes('train') ||
			desc.includes('subway') ||
			desc.includes('metro')
		) {
			return 'Transportation';
		}

		// Entertainment
		if (
			desc.includes('movie') ||
			desc.includes('theater') ||
			desc.includes('concert') ||
			desc.includes('show') ||
			desc.includes('game') ||
			desc.includes('amusement') ||
			desc.includes('park') ||
			desc.includes('museum') ||
			desc.includes('zoo')
		) {
			return 'Entertainment';
		}

		// Shopping
		if (
			desc.includes('amazon') ||
			desc.includes('target') ||
			desc.includes('walmart') ||
			desc.includes('mall') ||
			desc.includes('store') ||
			desc.includes('shop') ||
			desc.includes('clothing') ||
			desc.includes('shoes') ||
			desc.includes('electronics')
		) {
			return 'Shopping';
		}

		// Utilities
		if (
			desc.includes('electric') ||
			desc.includes('water') ||
			desc.includes('gas') ||
			desc.includes('internet') ||
			desc.includes('phone') ||
			desc.includes('cable') ||
			desc.includes('wifi') ||
			desc.includes('utility')
		) {
			return 'Utilities';
		}

		// Health
		if (
			desc.includes('doctor') ||
			desc.includes('medical') ||
			desc.includes('pharmacy') ||
			desc.includes('hospital') ||
			desc.includes('clinic') ||
			desc.includes('dental') ||
			desc.includes('vision') ||
			desc.includes('health')
		) {
			return 'Healthcare';
		}

		// Default category
		return 'Other';
	}
}
