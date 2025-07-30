import React, { useState } from 'react';
import { router, Stack } from 'expo-router';
import { BorderlessButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardLayout() {
	const [sPressed, setIsPressed] = useState(false);

	return (
		<Stack>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen
				name="notifications"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Notifcations',
					headerShadowVisible: false,
					headerTitleStyle: {
						fontSize: 20,
						fontWeight: '600',
						color: '#333',
					},
					headerStyle: {
						backgroundColor: '#ffffff',
					},

					headerLeft: () => (
						<BorderlessButton
							onPress={() => router.back()}
							onActiveStateChange={setIsPressed}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</BorderlessButton>
					),
				}}
			/>
			<Stack.Screen name="ledger" options={{ headerShown: false }} />
		</Stack>
	);
}
