import { View, Text } from 'react-native';
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
	return (
		<Tabs>
			<Tabs.Screen
				name="home"
				options={{
					tabBarLabel: 'Home',
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="home" color={color} size={size} />
					),
					title: 'Home',
				}}
			/>
			<Tabs.Screen
				name="transactionsScreen"
				options={{
					tabBarLabel: 'Transactions',
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="list" color={color} size={size} />
					),
					title: 'Transactions',
				}}
			/>
			<Tabs.Screen
				name="addTransactionScreen"
				options={{
					tabBarLabel: 'Add',
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="add-circle" color={color} size={size} />
					),
					title: 'Add Transaction',
				}}
			/>
			<Tabs.Screen
				name="profitDisplay"
				options={{
					tabBarLabel: 'Profits',
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="wallet" color={color} size={size} />
					),
					title: 'Profit Display',
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					tabBarLabel: 'Profile',
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="person" color={color} size={size} />
					),
					title: 'Profile',
				}}
			/>
		</Tabs>
	);
}
