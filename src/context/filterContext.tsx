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
});

export const FilterProvider = ({ children }: { children: ReactNode }) => {
	const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
	const [selectedBudgets, setSelectedBudgets] = useState<string[]>([]);
	const [dateFilterMode, setDateFilterMode] = useState<string>('month');
	const [selectedPatternId, setSelectedPatternId] = useState<string | null>(
		null
	);

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
		}),
		[selectedGoals, selectedBudgets, dateFilterMode, selectedPatternId]
	);

	return (
		<FilterContext.Provider value={value}>{children}</FilterContext.Provider>
	);
};
