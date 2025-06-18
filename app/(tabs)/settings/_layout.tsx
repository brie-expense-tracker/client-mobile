import React from 'react';
import { Stack } from 'expo-router';

export default function _layout() {
	return (
		<Stack>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen
				name="privacyandsecurity"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerBackTitle: '',
					headerTitle: 'Privacy & Security',
					headerShadowVisible: false,
				}}
			/>
		</Stack>
	);
}
