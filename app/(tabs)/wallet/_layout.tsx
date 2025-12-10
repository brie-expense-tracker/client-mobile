import React from 'react';
import { Stack } from 'expo-router';

export default function WalletLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
			}}
		>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen
				name="budgetDetailScreen"
				options={{ headerShown: false }}
			/>
			{/* Nested routes are handled by their own _layout.tsx files */}
			<Stack.Screen name="budgets" options={{ headerShown: false }} />
			<Stack.Screen name="goals" options={{ headerShown: false }} />
			<Stack.Screen name="debts" options={{ headerShown: false }} />
			<Stack.Screen name="bills" options={{ headerShown: false }} />
		</Stack>
	);
}
