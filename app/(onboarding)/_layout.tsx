import { Stack } from 'expo-router';

export default function OnboardingLayout() {
	return (
		<Stack>
			<Stack.Screen name="onboardingOne" options={{ headerShown: false }} />
			<Stack.Screen name="onboardingTwo" options={{ headerShown: false }} />
			<Stack.Screen name="onboardingThree" options={{ headerShown: false }} />
		</Stack>
	);
}
