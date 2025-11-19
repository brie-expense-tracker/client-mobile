import React from 'react';
import { Stack } from 'expo-router';

const StackLayout = () => {
	return (
		<Stack>
			{/* Settings group - has its own layout */}
			<Stack.Screen name="settings" options={{ headerShown: false }} />

			{/* Budgets group - has its own layout */}
			<Stack.Screen name="budgets" options={{ headerShown: false }} />

			{/* Goals group - has its own layout */}
			<Stack.Screen name="goals" options={{ headerShown: false }} />

			{/* Recurring group - has its own layout */}
			<Stack.Screen name="recurring" options={{ headerShown: false }} />

			{/* Debts group - has its own layout */}
			<Stack.Screen name="debts" options={{ headerShown: false }} />
		</Stack>
	);
};

export default StackLayout;
