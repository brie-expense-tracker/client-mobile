import React from 'react';
import { router, Stack } from 'expo-router';
import { BorderlessButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

export default function DebtsLayout() {
	return (
		<Stack>
			<Stack.Screen
				name="new"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Add Debt',
					headerShadowVisible: false,
					headerStyle: {
						backgroundColor: '#ffffff',
					},
					headerTitleStyle: {
						fontSize: 20,
						fontWeight: '600',
						color: '#333',
					},
					headerLeft: () => (
						<BorderlessButton
							onPress={() => router.push('/(tabs)/budgets/debts')}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</BorderlessButton>
					),
				}}
			/>
			<Stack.Screen
				name="[id]"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Edit Debt',
					headerShadowVisible: false,
					headerStyle: {
						backgroundColor: '#ffffff',
					},
					headerTitleStyle: {
						fontSize: 20,
						fontWeight: '600',
						color: '#333',
					},
					headerLeft: () => (
						<BorderlessButton
							onPress={() => router.push('/(tabs)/budgets/debts')}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</BorderlessButton>
					),
				}}
			/>
		</Stack>
	);
}
