import { Stack } from 'expo-router';

export default function TransactionStack() {
	return (
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
			<Stack.Screen
				name="historyFilter"
				options={{
					title: 'Filters',
					headerTitleStyle: {
						fontSize: 24,
						fontWeight: '500',
					},
					headerBackTitleStyle: {
						fontSize: 16,
					},
					headerTintColor: '#333',
					headerBackButtonDisplayMode: 'minimal',
					headerBackTitle: 'History',
					headerStyle: {
						backgroundColor: '#f9fafb',
					},
					contentStyle: {
						borderTopWidth: 1,
						borderTopColor: '#e8e8e9',
					},
					headerShadowVisible: false,
				}}
			/>
		</Stack>
	);
}
