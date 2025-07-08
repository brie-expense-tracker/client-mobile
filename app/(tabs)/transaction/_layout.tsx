import React from 'react';
import { Stack } from 'expo-router';

export default function _layout() {
	return (
		<Stack screenOptions={{ animation: 'none', headerShown: false }}>
			<Stack.Screen name="index" />
			<Stack.Screen name="expense" />
		</Stack>
	);
}
