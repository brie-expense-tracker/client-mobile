import { View, Text, Image, TouchableOpacity } from 'react-native';
import React, { ReactNode } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface NonInteractiveButtonProps {
	children: ReactNode;
}

const NonInteractiveButton = ({ children }: NonInteractiveButtonProps) => (
	<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
		{children}
	</View>
);

export default function TabLayout() {
	return (
		<Tabs
			screenOptions={{
				tabBarStyle: {
					elevation: 5,
					paddingTop: 10,
					height: 80,
				},

				tabBarLabelStyle: {
					fontSize: 16,
					paddingBottom: 10,
					paddingTop: 2,
				},
				tabBarInactiveTintColor: '#000',
				tabBarActiveTintColor: '#007ACC',
				tabBarItemStyle: {
					padding: 0,
					margin: 0,
				},
				headerShown: false,
			}}
		>
			<Tabs.Screen
				name="dashboard"
				options={{
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="home-outline" color={color} size={size} />
					),
					tabBarShowLabel: false,
					tabBarLabel: 'Home',
				}}
			/>
			<Tabs.Screen
				name="transactions"
				options={{
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="timer-outline" color={color} size={size} />
					),
					tabBarShowLabel: false,
					tabBarLabel: 'History',
				}}
			/>
			<Tabs.Screen
				name="trackerScreen"
				options={{
					tabBarIcon: ({ color, size, focused }) => (
						<View
							style={{
								backgroundColor: focused ? '#007bff' : '#09a1ff',
								borderRadius: 15,
								width: 50,
								height: 50,
								justifyContent: 'center',
								alignItems: 'center',
							}}
						>
							<Ionicons name="contract-outline" color="white" size={32} />
						</View>
					),
					tabBarShowLabel: false,
					tabBarLabel: 'Add',
				}}
			/>
			<Tabs.Screen
				name="budgets"
				options={{
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="wallet-outline" color={color} size={size} />
					),
					tabBarShowLabel: false,
					tabBarLabel: 'Budgets',
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="settings-outline" color={color} size={size} />
					),
					tabBarShowLabel: false,
					tabBarLabel: 'Settings',
				}}
			/>
		</Tabs>
	);
}
