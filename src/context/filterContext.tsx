import React, { createContext, useState, useMemo, ReactNode } from 'react';

interface FilterContextType {
	selectedGoals: string[];
	setSelectedGoals: (goals: string[]) => void;
	selectedBudgets: string[];
	setSelectedBudgets: (budgets: string[]) => void;
	dateFilterMode: string;
	setDateFilterMode: (mode: string) => void;
	selectedPatternId: string | null;
	setSelectedPatternId: (patternId: string | null) => void;
	transactionTypes: {
		income: boolean;
		expense: boolean;
	};
	setTransactionTypes: (types: { income: boolean; expense: boolean }) => void;
}

export const FilterContext = createContext<FilterContextType>({
	selectedGoals: [],
	setSelectedGoals: () => {},
	selectedBudgets: [],
	setSelectedBudgets: () => {},
	dateFilterMode: 'month',
	setDateFilterMode: () => {},
	selectedPatternId: null,
	setSelectedPatternId: () => {},
	transactionTypes: { income: true, expense: true },
	setTransactionTypes: () => {},
});

export const FilterProvider = ({ children }: { children: ReactNode }) => {
	const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
	const [selectedBudgets, setSelectedBudgets] = useState<string[]>([]);
	const [dateFilterMode, setDateFilterMode] = useState<string>('month');
	const [selectedPatternId, setSelectedPatternId] = useState<string | null>(
		null
	);
	const [transactionTypes, setTransactionTypes] = useState<{
		income: boolean;
		expense: boolean;
	}>({ income: true, expense: true });

	const value = useMemo(
		() => ({
			selectedGoals,
			setSelectedGoals,
			selectedBudgets,
			setSelectedBudgets,
			dateFilterMode,
			setDateFilterMode,
			selectedPatternId,
			setSelectedPatternId,
			transactionTypes,
			setTransactionTypes,
		}),
		[
			selectedGoals,
			selectedBudgets,
			dateFilterMode,
			selectedPatternId,
			transactionTypes,
		]
	);

	return (
		<FilterContext.Provider value={value}>{children}</FilterContext.Provider>
	);
};
