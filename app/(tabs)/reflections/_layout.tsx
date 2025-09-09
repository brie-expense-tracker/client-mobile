import { Stack } from 'expo-router';
import React from 'react';

export default function ReflectionsLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
			}}
		>
			<Stack.Screen
				name="index"
				options={{
					title: 'Weekly Reflections',
				}}
			/>
		</Stack>
	);
}
