/**
 * Filter context for ledger/transaction views.
 * Holds date filter mode (day/month) for list views.
 */
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type DateFilterMode = 'day' | 'month';

export interface FilterState {
	mode: DateFilterMode;
	setMode: (mode: DateFilterMode) => void;
}

const FilterContext = createContext<FilterState | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
	const [mode, setModeState] = useState<DateFilterMode>('month');
	const setMode = useCallback((m: DateFilterMode) => setModeState(m), []);
	const value: FilterState = { mode, setMode };
	return (
		<FilterContext.Provider value={value}>{children}</FilterContext.Provider>
	);
}

export function useFilter(): FilterState {
	const ctx = useContext(FilterContext);
	if (!ctx) {
		throw new Error('useFilter must be used within FilterProvider');
	}
	return ctx;
}
