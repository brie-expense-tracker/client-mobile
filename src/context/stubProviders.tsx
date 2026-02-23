/**
 * Stub providers for local-only MVP mode.
 * Provides empty data so screens that use Budget/Goal/Bill don't crash.
 */
import React, { ReactNode } from 'react';
import { BudgetContext } from './budgetContext';
import { GoalContext } from './goalContext';
import { BillContext } from './billContext';

const stubBudgetValue = {
	budgets: [],
	isLoading: false,
	hasLoaded: true,
	refetch: async () => {},
	addBudget: async () => {
		throw new Error('Budgets unavailable in local mode');
	},
	updateBudget: async () => {
		throw new Error('Budgets unavailable in local mode');
	},
	deleteBudget: async () => {},
	updateBudgetSpent: async () => {
		throw new Error('Budgets unavailable in local mode');
	},
	checkBudgetAlerts: async () => {},
	getBudgetSummary: () => ({
		totalBudgets: 0,
		totalAllocated: 0,
		totalSpent: 0,
		totalRemaining: 0,
		averageUtilization: 0,
		overBudgetCount: 0,
		underBudgetCount: 0,
		onTrackCount: 0,
		monthlyBudgets: 0,
		weeklyBudgets: 0,
	}),
	getBudgetUtilization: () => 0,
	getOverBudgetBudgets: () => [],
	getUnderBudgetBudgets: () => [],
	filterBudgets: () => [],
	getAllCategories: () => [],
	getBudgetsByCategory: () => [],
	monthlySummary: { totalAllocated: 0, totalSpent: 0 },
	weeklySummary: { totalAllocated: 0, totalSpent: 0 },
	monthlyPercentage: 0,
	weeklyPercentage: 0,
};

const stubGoalValue = {
	goals: [],
	isLoading: false,
	hasLoaded: true,
	refetch: async () => {},
	addGoal: async () => {
		throw new Error('Goals unavailable in local mode');
	},
	updateGoal: async () => {
		throw new Error('Goals unavailable in local mode');
	},
	deleteGoal: async () => {},
	updateGoalCurrent: async () => {
		throw new Error('Goals unavailable in local mode');
	},
};

const stubBillValue = {
	expenses: [],
	isLoading: false,
	hasLoaded: true,
	refetch: async () => {},
	addBill: async () => {
		throw new Error('Bills unavailable in local mode');
	},
	updateBill: async () => {
		throw new Error('Bills unavailable in local mode');
	},
	deleteBill: async () => {},
};

export function StubProviders({ children }: { children: ReactNode }) {
	return (
		<BudgetContext.Provider value={stubBudgetValue}>
			<GoalContext.Provider value={stubGoalValue}>
				<BillContext.Provider value={stubBillValue}>
					{children}
				</BillContext.Provider>
			</GoalContext.Provider>
		</BudgetContext.Provider>
	);
}
