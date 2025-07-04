import React, { createContext, useState, useMemo, ReactNode } from 'react';

interface FilterContextType {
	selectedGoals: string[];
	setSelectedGoals: (goals: string[]) => void;
	selectedBudgets: string[];
	setSelectedBudgets: (budgets: string[]) => void;
	dateFilterMode: string;
	setDateFilterMode: (mode: string) => void;
}

export const FilterContext = createContext<FilterContextType>({
	selectedGoals: [],
	setSelectedGoals: () => {},
	selectedBudgets: [],
	setSelectedBudgets: () => {},
	dateFilterMode: 'month',
	setDateFilterMode: () => {},
});

export const FilterProvider = ({ children }: { children: ReactNode }) => {
	const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
	const [selectedBudgets, setSelectedBudgets] = useState<string[]>([]);
	const [dateFilterMode, setDateFilterMode] = useState<string>('month');

	const value = useMemo(
		() => ({
			selectedGoals,
			setSelectedGoals,
			selectedBudgets,
			setSelectedBudgets,
			dateFilterMode,
			setDateFilterMode,
		}),
		[selectedGoals, selectedBudgets, dateFilterMode]
	);

	return (
		<FilterContext.Provider value={value}>{children}</FilterContext.Provider>
	);
};
