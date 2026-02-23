import React, { createContext, useState, useMemo, ReactNode } from 'react';

interface FilterContextType {
	dateFilterMode: string;
	setDateFilterMode: (mode: string) => void;
	transactionTypes: {
		income: boolean;
		expense: boolean;
	};
	setTransactionTypes: (types: { income: boolean; expense: boolean }) => void;
}

export const FilterContext = createContext<FilterContextType>({
	dateFilterMode: 'month',
	setDateFilterMode: () => {},
	transactionTypes: { income: true, expense: true },
	setTransactionTypes: () => {},
});

export const FilterProvider = ({ children }: { children: ReactNode }) => {
	const [dateFilterMode, setDateFilterMode] = useState<string>('month');
	const [transactionTypes, setTransactionTypes] = useState<{
		income: boolean;
		expense: boolean;
	}>({ income: true, expense: true });

	const value = useMemo(
		() => ({
			dateFilterMode,
			setDateFilterMode,
			transactionTypes,
			setTransactionTypes,
		}),
		[dateFilterMode, transactionTypes]
	);

	return (
		<FilterContext.Provider value={value}>{children}</FilterContext.Provider>
	);
};
