// _layout.tsx
import { router, Stack } from 'expo-router';
import { createContext, useState } from 'react';
// Transaction interface defined inline since we removed the mock data file
interface Transaction {
	id: string;
	description: string;
	amount: number;
	date: string; // ISO string
	type: 'income' | 'expense';
	target?: string; // ObjectId of the target Budget or Goal
	targetModel?: 'Budget' | 'Goal';
	updatedAt?: string; // ISO string for sorting by time when dates are the same
	recurringPattern?: {
		patternId: string;
		frequency: string;
		confidence: number;
		nextExpectedDate: string;
	};
}
import { FilterProvider } from '../../../../src/context/filterContext';
import { BorderlessButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

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
	const [isPressed, setIsPressed] = useState(false);
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
				<Stack.Screen
					name="edit"
					options={{
						headerShown: true,
						headerBackButtonDisplayMode: 'minimal',
						headerTitle: 'Edit Transaction',
						headerShadowVisible: false,
						headerStyle: {
							backgroundColor: '#ffffff',
						},
						headerTitleStyle: {
							fontSize: 20,
							fontWeight: '600',
							color: '#333',
						},
						headerLeft: () => (
							<BorderlessButton
								onPress={() => router.back()}
								onActiveStateChange={setIsPressed}
								style={{ width: 50 }}
							>
								<Ionicons name="chevron-back" size={24} color="#333" />
							</BorderlessButton>
						),
					}}
				/>
			</Stack>
		</FilterProvider>
	);
}
