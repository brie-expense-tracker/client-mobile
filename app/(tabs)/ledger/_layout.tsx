// _layout.tsx
import { Stack } from 'expo-router';
import { createContext } from 'react';
import { Transaction } from '../../../src/data/transactions';
import { FilterProvider } from '../../../src/context/filterContext';

export const dateFilterModes = [
	{ label: 'Day', value: 'day', icon: 'calendar-outline' },
	{ label: 'Month', value: 'month', icon: 'calendar' },
];

export const FilterContext = createContext<{
	selectedCategories: string[];
	setSelectedCategories: (categories: string[]) => void;
	dateFilterMode: string;
	setDateFilterMode: (mode: string) => void;
	availableCategories: string[];
	transactions: Transaction[];
	setTransactions: (transactions: Transaction[]) => void;
	isLoading: boolean;
	setIsLoading: (loading: boolean) => void;
}>({
	selectedCategories: [],
	setSelectedCategories: () => {},
	dateFilterMode: 'month',
	setDateFilterMode: () => {},
	availableCategories: [],
	transactions: [],
	setTransactions: () => {},
	isLoading: true,
	setIsLoading: () => {},
});

export default function TransactionStack() {
	return (
		<FilterProvider>
			<Stack
				screenOptions={{
					animation: 'slide_from_right',
					gestureEnabled: true,
				}}
			>
				<Stack.Screen
					name="index"
					options={{ animation: 'slide_from_left', headerShown: false }}
				/>
				<Stack.Screen name="ledgerFilter" />
			</Stack>
		</FilterProvider>
	);
}
