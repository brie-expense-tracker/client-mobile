import React from 'react';
import { Stack } from 'expo-router';

const StackLayout = () => {
	return (
		<Stack>
			{/* Settings group - has its own layout */}
			<Stack.Screen name="settings" options={{ headerShown: false }} />
		</Stack>
	);
};

export default StackLayout;
