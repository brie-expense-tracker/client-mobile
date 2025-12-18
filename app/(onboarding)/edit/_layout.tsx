import { Stack } from 'expo-router';

export default function EditLayout() {
	return (
		<Stack>
			<Stack.Screen
				name="index"
				options={{
					headerShown: false,
					animation: 'slide_from_bottom',
				}}
			/>
			<Stack.Screen
				name="profile"
				options={{
					headerShown: false,
					animation: 'slide_from_right',
				}}
			/>
			<Stack.Screen
				name="income"
				options={{
					headerShown: false,
					animation: 'slide_from_right',
				}}
			/>
			<Stack.Screen
				name="savings"
				options={{
					headerShown: false,
					animation: 'slide_from_right',
				}}
			/>
			<Stack.Screen
				name="debt"
				options={{
					headerShown: false,
					animation: 'slide_from_right',
				}}
			/>
		</Stack>
	);
}

