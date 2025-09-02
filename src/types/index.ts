export interface Budget {
	id: string;
	name: string;
	amount: number;
	spent: number;
	period: 'weekly' | 'monthly';
	utilization: number;
	icon?: string;
	color?: string;
	createdAt: Date;
	updatedAt: Date;
	userId?: string;
	weekStartDay?: 0 | 1;
	monthStartDay?:
		| 1
		| 2
		| 3
		| 4
		| 5
		| 6
		| 7
		| 8
		| 9
		| 10
		| 11
		| 12
		| 13
		| 14
		| 15
		| 16
		| 17
		| 18
		| 19
		| 20
		| 21
		| 22
		| 23
		| 24
		| 25
		| 26
		| 27
		| 28;
	rollover?: boolean;
	categories?: string[];
	shouldAlert?: boolean;
	spentPercentage?: number;
}

export interface Goal {
	id: string;
	name: string;
	targetAmount: number;
	currentAmount: number;
	progress: number;
	deadline: Date;
	createdAt: Date;
	updatedAt: Date;
	target?: number;
	current?: number;
	icon?: string;
	color?: string;
	categories?: string[];
	userId?: string;
	isCompleted?: boolean;
	isOverdue?: boolean;
	daysLeft?: number;
	percent?: number;
}

export interface Transaction {
	id: string;
	amount: number;
	type: 'income' | 'expense';
	category?: string;
	description?: string;
	date: Date;
	budgetId?: string;
	goalId?: string;
	createdAt: Date;
	updatedAt: Date;
	target?: string;
	targetModel?: 'Budget' | 'Goal';
	recurringPattern?: {
		patternId: string;
		frequency: string;
		confidence: number;
		nextExpectedDate: string;
	};
}

export interface User {
	id: string;
	firebaseUID: string;
	email: string;
	onboardingVersion: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface Profile {
	userId: string;
	preferences: {
		aiInsights: {
			enabled: boolean;
			frequency: 'daily' | 'weekly' | 'monthly' | 'disabled';
		};
		riskTolerance: 'conservative' | 'moderate' | 'aggressive';
		financialFocus: string[];
		communicationStyle: 'detailed' | 'concise' | 'actionable';
	};
	createdAt: Date;
	updatedAt: Date;
}

export interface RecurringExpense {
	id: string;
	userId: string;
	name: string;
	amount: number;
	category: string;
	frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
	nextDue: Date;
	lastPaid?: Date;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
	description?: string;
	icon?: string;
	color?: string;
	budgetId?: string;
	goalId?: string;
	daysUntilDue?: number;
	isOverdue?: boolean;
	isDueSoon?: boolean;
}
