// sampleDataService.ts - Generates sample data for demo mode
// Creates 60-90 days of realistic financial data for reviewers

import { Transaction, Budget, Goal, RecurringExpense } from '../../types';

export interface SampleDataConfig {
	startDate: Date;
	endDate: Date;
	monthlyIncome: number;
	userName: string;
}

export interface GeneratedSampleData {
	transactions: Transaction[];
	budgets: Budget[];
	goals: Goal[];
	recurringExpenses: RecurringExpense[];
}

export class SampleDataService {
	private static readonly CATEGORIES = [
		'Food & Dining',
		'Transportation',
		'Shopping',
		'Entertainment',
		'Utilities',
		'Healthcare',
		'Education',
		'Travel',
		'Subscriptions',
		'Insurance',
		'Investments',
		'Salary',
		'Freelance',
		'Investment Returns',
	];

	private static readonly BUDGET_CATEGORIES = [
		'Food & Dining',
		'Transportation',
		'Shopping',
		'Entertainment',
		'Utilities',
		'Healthcare',
	];

	private static readonly GOAL_TYPES = [
		'Emergency Fund',
		'Vacation',
		'New Car',
		'Home Down Payment',
		'Student Loan Payoff',
		'Investment Portfolio',
	];

	private static readonly RECURRING_EXPENSES = [
		{ name: 'Netflix', amount: 15.99, category: 'Entertainment' },
		{ name: 'Spotify Premium', amount: 9.99, category: 'Subscriptions' },
		{ name: 'Gym Membership', amount: 49.99, category: 'Healthcare' },
		{ name: 'Phone Bill', amount: 89.99, category: 'Utilities' },
		{ name: 'Internet', amount: 79.99, category: 'Utilities' },
		{ name: 'Car Insurance', amount: 129.99, category: 'Insurance' },
		{ name: 'Health Insurance', amount: 299.99, category: 'Insurance' },
	];

	/**
	 * Generate comprehensive sample data for demo mode
	 */
	static generateSampleData(config: SampleDataConfig): GeneratedSampleData {
		const transactions = this.generateTransactions(config);
		const budgets = this.generateBudgets(config);
		const goals = this.generateGoals(config);
		const recurringExpenses = this.generateRecurringExpenses(config);

		return {
			transactions,
			budgets,
			goals,
			recurringExpenses,
		};
	}

	/**
	 * Generate realistic transactions over the date range
	 */
	private static generateTransactions(config: SampleDataConfig): Transaction[] {
		const transactions: Transaction[] = [];
		const currentDate = new Date(config.startDate);
		const endDate = new Date(config.endDate);

		// Generate daily transactions
		while (currentDate <= endDate) {
			const dayOfWeek = currentDate.getDay();
			const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
			const isPayday = this.isPayday(currentDate, config.startDate);

			// Add salary on paydays
			if (isPayday) {
				transactions.push({
					id: `tx_salary_${currentDate.getTime()}`,
					amount: config.monthlyIncome,
					category: 'Salary',
					date: new Date(currentDate),
					type: 'income',
					description: 'Monthly Salary',
					createdAt: new Date(currentDate),
					updatedAt: new Date(currentDate),
				});
			}

			// Generate daily expenses (more on weekends)
			const dailyExpenseCount = isWeekend
				? Math.floor(Math.random() * 3) + 1
				: Math.floor(Math.random() * 2) + 1;

			for (let i = 0; i < dailyExpenseCount; i++) {
				const category = this.getRandomCategory();
				const amount = this.generateRealisticAmount(category);

				transactions.push({
					id: `tx_${currentDate.getTime()}_${i}`,
					amount: -amount, // Negative for expenses
					category,
					date: new Date(currentDate),
					type: 'expense',
					description: this.generateDescription(category, amount),
					createdAt: new Date(currentDate),
					updatedAt: new Date(currentDate),
				});
			}

			// Add some income events
			if (Math.random() < 0.05) {
				// 5% chance of extra income
				const incomeCategory = this.getRandomIncomeCategory();
				const amount = this.generateIncomeAmount(incomeCategory);

				transactions.push({
					id: `tx_income_${currentDate.getTime()}`,
					amount,
					category: incomeCategory,
					date: new Date(currentDate),
					type: 'income',
					description: this.generateIncomeDescription(incomeCategory),
					createdAt: new Date(currentDate),
					updatedAt: new Date(currentDate),
				});
			}

			currentDate.setDate(currentDate.getDate() + 1);
		}

		return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
	}

	/**
	 * Generate realistic budgets
	 */
	private static generateBudgets(config: SampleDataConfig): Budget[] {
		const budgets: Budget[] = [];
		const currentDate = new Date(config.startDate);
		const endDate = new Date(config.endDate);

		while (currentDate <= endDate) {
			const monthKey = `${currentDate.getFullYear()}-${String(
				currentDate.getMonth() + 1
			).padStart(2, '0')}`;

			// Create budgets for each category
			this.BUDGET_CATEGORIES.forEach((category) => {
				const baseAmount = this.getBudgetAmount(category);
				const spent = this.calculateBudgetSpent(category, baseAmount, monthKey);

				budgets.push({
					id: `budget_${category
						.toLowerCase()
						.replace(/\s+/g, '_')}_${monthKey}`,
					userId: 'demo_user',
					name: category,
					amount: baseAmount,
					spent,
					utilization: (spent / baseAmount) * 100,
					period: 'monthly',
					monthStartDay: 1,
					createdAt: new Date(currentDate),
					updatedAt: new Date(currentDate),
				});
			});

			// Move to next month
			currentDate.setMonth(currentDate.getMonth() + 1);
		}

		return budgets;
	}

	/**
	 * Generate realistic financial goals
	 */
	private static generateGoals(config: SampleDataConfig): Goal[] {
		const goals: Goal[] = [];
		const currentDate = new Date();

		this.GOAL_TYPES.forEach((goalType, index) => {
			const targetAmount = this.getGoalTargetAmount(goalType);
			const currentAmount = Math.floor(Math.random() * targetAmount * 0.8); // 0-80% progress
			const deadline = new Date(currentDate);
			deadline.setFullYear(
				deadline.getFullYear() + Math.floor(Math.random() * 3) + 1
			);

			goals.push({
				id: `goal_${goalType.toLowerCase().replace(/\s+/g, '_')}_${index}`,
				userId: 'demo_user',
				name: goalType,
				targetAmount,
				currentAmount,
				deadline,
				createdAt: new Date(currentDate),
				updatedAt: new Date(currentDate),
			});
		});

		return goals;
	}

	/**
	 * Generate recurring expenses
	 */
	private static generateRecurringExpenses(
		config: SampleDataConfig
	): RecurringExpense[] {
		const recurringExpenses: RecurringExpense[] = [];
		const currentDate = new Date();

		this.RECURRING_EXPENSES.forEach((expense, index) => {
			const nextDue = new Date(currentDate);
			nextDue.setDate(nextDue.getDate() + Math.floor(Math.random() * 30));

			recurringExpenses.push({
				id: `recurring_${expense.name
					.toLowerCase()
					.replace(/\s+/g, '_')}_${index}`,
				userId: 'demo_user',
				name: expense.name,
				amount: expense.amount,
				category: expense.category,
				frequency: 'monthly',
				nextDue,
				isActive: true,
				createdAt: new Date(currentDate),
				updatedAt: new Date(currentDate),
			});
		});

		return recurringExpenses;
	}

	/**
	 * Check if a date is a payday (bi-weekly on Fridays)
	 */
	private static isPayday(date: Date, startDate: Date): boolean {
		const daysSinceStart = Math.floor(
			(date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
		);
		return date.getDay() === 5 && daysSinceStart % 14 === 0; // Friday every 2 weeks
	}

	/**
	 * Get a random category for transactions
	 */
	private static getRandomCategory(): string {
		return this.CATEGORIES[Math.floor(Math.random() * this.CATEGORIES.length)];
	}

	/**
	 * Get a random income category
	 */
	private static getRandomIncomeCategory(): string {
		const incomeCategories = ['Salary', 'Freelance', 'Investment Returns'];
		return incomeCategories[
			Math.floor(Math.random() * incomeCategories.length)
		];
	}

	/**
	 * Generate realistic transaction amounts based on category
	 */
	private static generateRealisticAmount(category: string): number {
		const ranges: { [key: string]: [number, number] } = {
			'Food & Dining': [8, 85],
			Transportation: [2.5, 45],
			Shopping: [15, 200],
			Entertainment: [12, 150],
			Utilities: [25, 200],
			Healthcare: [15, 300],
			Education: [50, 500],
			Travel: [100, 2000],
			Subscriptions: [5, 50],
			Insurance: [50, 500],
			Investments: [100, 1000],
		};

		const [min, max] = ranges[category] || [10, 100];
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	/**
	 * Generate income amounts
	 */
	private static generateIncomeAmount(category: string): number {
		const ranges: { [key: string]: [number, number] } = {
			Salary: [3000, 8000],
			Freelance: [100, 500],
			'Investment Returns': [50, 300],
		};

		const [min, max] = ranges[category] || [100, 1000];
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	/**
	 * Generate realistic descriptions for transactions
	 */
	private static generateDescription(category: string, amount: number): string {
		const descriptions: { [key: string]: string[] } = {
			'Food & Dining': [
				'Grocery Store',
				'Restaurant',
				'Coffee Shop',
				'Fast Food',
				'Food Delivery',
			],
			Transportation: [
				'Gas Station',
				'Uber Ride',
				'Bus Fare',
				'Parking',
				'Car Maintenance',
			],
			Shopping: ['Amazon', 'Target', 'Walmart', 'Mall', 'Online Store'],
			Entertainment: [
				'Movie Theater',
				'Concert',
				'Game',
				'Streaming Service',
				'Hobby Store',
			],
			Utilities: [
				'Electric Bill',
				'Water Bill',
				'Internet Bill',
				'Phone Bill',
				'Gas Bill',
			],
			Healthcare: [
				'Doctor Visit',
				'Pharmacy',
				'Dental',
				'Vision',
				'Medical Supplies',
			],
		};

		const categoryDescriptions = descriptions[category] || ['Purchase'];
		return categoryDescriptions[
			Math.floor(Math.random() * categoryDescriptions.length)
		];
	}

	/**
	 * Generate income descriptions
	 */
	private static generateIncomeDescription(category: string): string {
		const descriptions: { [key: string]: string[] } = {
			Salary: ['Monthly Salary', 'Bi-weekly Pay', 'Regular Paycheck'],
			Freelance: ['Freelance Work', 'Side Project', 'Consulting'],
			'Investment Returns': [
				'Dividend Payment',
				'Interest Payment',
				'Investment Gains',
			],
		};

		const categoryDescriptions = descriptions[category] || ['Income'];
		return categoryDescriptions[
			Math.floor(Math.random() * categoryDescriptions.length)
		];
	}

	/**
	 * Get budget amounts for different categories
	 */
	private static getBudgetAmount(category: string): number {
		const amounts: { [key: string]: number } = {
			'Food & Dining': 600,
			Transportation: 300,
			Shopping: 400,
			Entertainment: 200,
			Utilities: 350,
			Healthcare: 250,
		};

		return amounts[category] || 300;
	}

	/**
	 * Calculate realistic budget spending for a month
	 */
	private static calculateBudgetSpent(
		category: string,
		budgetAmount: number,
		monthKey: string
	): number {
		// Simulate realistic spending patterns
		const utilization = Math.random() * 0.4 + 0.6; // 60-100% utilization
		return Math.floor(budgetAmount * utilization);
	}

	/**
	 * Get goal target amounts
	 */
	private static getGoalTargetAmount(goalType: string): number {
		const amounts: { [key: string]: number } = {
			'Emergency Fund': 10000,
			Vacation: 3000,
			'New Car': 25000,
			'Home Down Payment': 50000,
			'Student Loan Payoff': 15000,
			'Investment Portfolio': 20000,
		};

		return amounts[goalType] || 10000;
	}
}
