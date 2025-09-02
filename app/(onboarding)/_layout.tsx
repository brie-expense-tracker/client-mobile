import { Stack } from 'expo-router';

export default function OnboardingLayout() {
	return (
		<Stack>
			<Stack.Screen name="profileSetup" options={{ headerShown: false }} />
			<Stack.Screen name="notificationSetup" options={{ headerShown: false }} />
		</Stack>
	);
}
