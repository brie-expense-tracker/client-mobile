import { Stack } from 'expo-router';

export default function OnboardingLayout() {
	return (
		<Stack screenOptions={{ headerShown: false, animation: 'none' }}>
			<Stack.Screen name="profileSetup" />
			<Stack.Screen name="notificationSetup" />
			<Stack.Screen name="edit" />
		</Stack>
	);
}
