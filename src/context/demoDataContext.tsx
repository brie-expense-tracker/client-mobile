// demoDataContext.tsx - Manages demo data for demo mode
// Provides sample transactions, budgets, goals, and recurring expenses

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, Budget, Goal, RecurringExpense } from '../types';

interface DemoDataContextType {
	isDemoMode: boolean;
	transactions: Transaction[];
	budgets: Budget[];
	goals: Goal[];
	recurringExpenses: RecurringExpense[];
	loading: boolean;
	refreshDemoData: () => Promise<void>;
}

const DemoDataContext = createContext<DemoDataContextType | undefined>(
	undefined
);

export const useDemoData = () => {
	const context = useContext(DemoDataContext);
	if (context === undefined) {
		throw new Error('useDemoData must be used within a DemoDataProvider');
	}
	return context;
};

interface DemoDataProviderProps {
	children: React.ReactNode;
}

export const DemoDataProvider: React.FC<DemoDataProviderProps> = ({
	children,
}) => {
	const [isDemoMode, setIsDemoMode] = useState(false);
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [budgets, setBudgets] = useState<Budget[]>([]);
	const [goals, setGoals] = useState<Goal[]>([]);
	const [recurringExpenses, setRecurringExpenses] = useState<
		RecurringExpense[]
	>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		checkDemoMode();
	}, []);

	const checkDemoMode = async () => {
		try {
			setLoading(true);

			// Check if we have demo data stored
			const demoTransactions = await AsyncStorage.getItem('demo_transactions');
			const demoBudgets = await AsyncStorage.getItem('demo_budgets');
			const demoGoals = await AsyncStorage.getItem('demo_goals');
			const demoRecurring = await AsyncStorage.getItem('demo_recurring');

			if (demoTransactions && demoBudgets && demoGoals && demoRecurring) {
				console.log('🎯 [DEMO] Demo data found, enabling demo mode');
				setIsDemoMode(true);

				// Parse and set the data
				setTransactions(JSON.parse(demoTransactions));
				setBudgets(JSON.parse(demoBudgets));
				setGoals(JSON.parse(demoGoals));
				setRecurringExpenses(JSON.parse(demoRecurring));

				console.log(
					`🎯 [DEMO] Loaded ${
						JSON.parse(demoTransactions).length
					} transactions, ${JSON.parse(demoBudgets).length} budgets, ${
						JSON.parse(demoGoals).length
					} goals`
				);
			} else {
				console.log('🎯 [DEMO] No demo data found, demo mode disabled');
				setIsDemoMode(false);
			}
		} catch (error) {
			console.error('❌ [DEMO] Error checking demo mode:', error);
			setIsDemoMode(false);
		} finally {
			setLoading(false);
		}
	};

	const refreshDemoData = async () => {
		try {
			setLoading(true);
			await checkDemoMode();
		} catch (error) {
			console.error('❌ [DEMO] Error refreshing demo data:', error);
		} finally {
			setLoading(false);
		}
	};

	const value: DemoDataContextType = {
		isDemoMode,
		transactions,
		budgets,
		goals,
		recurringExpenses,
		loading,
		refreshDemoData,
	};

	return (
		<DemoDataContext.Provider value={value}>
			{children}
		</DemoDataContext.Provider>
	);
};
