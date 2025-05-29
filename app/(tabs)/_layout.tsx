import { View, Text } from 'react-native';
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
	return (
		<Tabs>
			<Tabs.Screen
				name="dashboard"
				options={{
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="home" color={color} size={size} />
					),
					headerShown: false,
					tabBarShowLabel: false,
				}}
			/>
			<Tabs.Screen
				name="transactionScreen"
				options={{
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="list" color={color} size={size} />
					),
					headerShown: false,
					tabBarShowLabel: false,
				}}
			/>
			<Tabs.Screen
				name="addTransactionScreen"
				options={{
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="add-circle" color={color} size={size} />
					),
					headerShown: false,
					tabBarShowLabel: false,
				}}
			/>
			<Tabs.Screen
				name="chatScreen"
				options={{
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="wallet" color={color} size={size} />
					),
					headerShown: false,
					tabBarShowLabel: false,
				}}
			/>
			<Tabs.Screen
				name="profileScreen"
				options={{
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="person" color={color} size={size} />
					),
					headerShown: false,
					tabBarShowLabel: false,
				}}
			/>
		</Tabs>
	);
}
