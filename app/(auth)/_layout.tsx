import { Stack } from 'expo-router';

export default function AuthLayout() {
	return (
		<Stack>
			<Stack.Screen name="login-test" options={{ headerShown: false }} />
			<Stack.Screen name="signup-test" options={{ headerShown: false }} />
			<Stack.Screen name="forgotPassword" options={{ headerShown: false }} />
		</Stack>
	);
}
