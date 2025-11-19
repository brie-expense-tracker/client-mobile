import React from 'react';
import { Stack } from 'expo-router';

export default function RecurringLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
				headerTitle: '',
				title: '',
			}}
		>
			<Stack.Screen
				name="new"
				options={{
					headerShown: false,
					headerTitle: '',
					title: '',
				}}
			/>
		</Stack>
	);
}


