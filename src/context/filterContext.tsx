import React, { createContext, useState, useMemo, ReactNode } from 'react';

interface FilterContextType {
	selectedCategories: string[];
	setSelectedCategories: (cats: string[]) => void;
	dateFilterMode: string;
	setDateFilterMode: (mode: string) => void;
}

export const FilterContext = createContext<FilterContextType>({
	selectedCategories: [],
	setSelectedCategories: () => {},
	dateFilterMode: 'month',
	setDateFilterMode: () => {},
});

export const FilterProvider = ({ children }: { children: ReactNode }) => {
	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
	const [dateFilterMode, setDateFilterMode] = useState<string>('month');

	const value = useMemo(
		() => ({
			selectedCategories,
			setSelectedCategories,
			dateFilterMode,
			setDateFilterMode,
		}),
		[selectedCategories, dateFilterMode]
	);

	return (
		<FilterContext.Provider value={value}>{children}</FilterContext.Provider>
	);
};
