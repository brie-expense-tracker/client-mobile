import { Stack } from 'expo-router';
import { createContext, useContext, useState } from 'react';

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
	setAvailableCategories: (categories: string[]) => void;
}>({
	selectedCategories: [],
	setSelectedCategories: () => {},
	dateFilterMode: 'month',
	setDateFilterMode: () => {},
	availableCategories: [],
	setAvailableCategories: () => {},
});

export default function TransactionStack() {
	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
	const [dateFilterMode, setDateFilterMode] = useState<string>('month');
	const [availableCategories, setAvailableCategories] = useState<string[]>([]);

	return (
		<FilterContext.Provider
			value={{
				selectedCategories,
				setSelectedCategories,
				dateFilterMode,
				setDateFilterMode,
				availableCategories,
				setAvailableCategories,
			}}
		>
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
				<Stack.Screen
					name="historyFilter"
					options={{
						title: 'Filters',
						headerTitleStyle: {
							fontSize: 24,
							fontWeight: '500',
						},
						headerBackTitleStyle: {
							fontSize: 16,
						},
						headerTintColor: '#333',
						headerBackButtonDisplayMode: 'minimal',
						headerBackTitle: 'History',
						headerStyle: {
							backgroundColor: '#f9fafb',
						},
						contentStyle: {
							borderTopWidth: 1,
							borderTopColor: '#e8e8e9',
						},
						headerShadowVisible: false,
					}}
				/>
			</Stack>
		</FilterContext.Provider>
	);
}
