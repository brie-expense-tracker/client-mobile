import React from 'react';
import { Stack } from 'expo-router';

const StackLayout = () => {
	return (
		<Stack>
			<Stack.Screen name="settings" options={{ headerShown: false }} />
			<Stack.Screen
				name="addRecurringExpense"
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="editRecurringExpense"
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="addGoal"
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="editGoal"
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="addBudget"
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="editBudget"
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="budgetDetails"
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="goalDetails"
				options={{
					headerShown: false,
				}}
			/>

			<Stack.Screen
				name="recurringExpenseDetails"
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="debts"
				options={{
					headerShown: false,
				}}
			/>
		</Stack>
	);
};

export default StackLayout;
