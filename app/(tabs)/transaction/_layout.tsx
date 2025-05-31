import { Stack } from 'expo-router';

export default function TransactionStack() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
				animation: 'slide_from_right',
				gestureEnabled: true,
			}}
		>
			<Stack.Screen name="index" options={{ animation: 'slide_from_left' }} />
			<Stack.Screen name="historyFilter" />
		</Stack>
	);
}
