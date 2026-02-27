/**
 * Filter context for ledger/transaction views.
 * Holds date filter mode (day/month), transaction type toggles, and optional pattern filter.
 */
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type DateFilterMode = 'day' | 'month';

export interface TransactionTypesFilter {
	expense: boolean;
	income: boolean;
}

export interface FilterState {
	mode: DateFilterMode;
	setMode: (mode: DateFilterMode) => void;
	dateFilterMode: DateFilterMode;
	setDateFilterMode: (mode: DateFilterMode) => void;
	transactionTypes: TransactionTypesFilter;
	setTransactionTypes: (t: TransactionTypesFilter) => void;
	selectedPatternId: string | null;
	setSelectedPatternId: (id: string | null) => void;
}

const defaultTransactionTypes: TransactionTypesFilter = { expense: true, income: true };

const FilterContext = createContext<FilterState | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
	const [mode, setModeState] = useState<DateFilterMode>('month');
	const [transactionTypes, setTransactionTypesState] = useState<TransactionTypesFilter>(defaultTransactionTypes);
	const [selectedPatternId, setSelectedPatternIdState] = useState<string | null>(null);

	const setMode = useCallback((m: DateFilterMode) => setModeState(m), []);
	const setDateFilterMode = setMode;
	const setTransactionTypes = useCallback((t: TransactionTypesFilter) => setTransactionTypesState(t), []);
	const setSelectedPatternId = useCallback((id: string | null) => setSelectedPatternIdState(id), []);

	const value: FilterState = {
		mode,
		setMode,
		dateFilterMode: mode,
		setDateFilterMode,
		transactionTypes,
		setTransactionTypes,
		selectedPatternId,
		setSelectedPatternId,
	};

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

export { FilterContext };
