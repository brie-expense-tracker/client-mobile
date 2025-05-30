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
					shadowColor: '#888888',
					shadowOffset: {
						width: 0,
						height: -1,
					},
					shadowOpacity: 0.25,
					shadowRadius: 3.5,
					elevation: 5,
					paddingTop: 10,
					height: 100,
				},

				tabBarLabelStyle: {
					fontWeight: 'bold',
					fontSize: 16,
					paddingBottom: 10,
					paddingTop: 2,
				},
				tabBarInactiveTintColor: '#0095FF',
				tabBarActiveTintColor: '#007ACC',
				tabBarItemStyle: {
					padding: 0,
					margin: 0,
				},
			}}
		>
			<Tabs.Screen
				name="dashboard"
				options={{
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="home-outline" color={color} size={size} />
					),
					headerShown: false,
					tabBarLabel: 'Home',
				}}
			/>
			<Tabs.Screen
				name="transactionScreen"
				options={{
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="timer-outline" color={color} size={size} />
					),
					headerShown: false,
					tabBarLabel: 'History',
				}}
			/>
			<Tabs.Screen
				name="trackerScreen"
				options={{
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="add-circle-outline" color={color} size={size} />
					),
					headerShown: false,
					tabBarLabel: 'Add',
				}}
			/>
			<Tabs.Screen
				name="chatScreen"
				options={{
					tabBarIcon: ({ color, size }) => (
						<Ionicons
							name="chatbox-ellipses-outline"
							color={color}
							size={size}
						/>
					),
					headerShown: false,
					tabBarLabel: 'Chat',
				}}
			/>
			<Tabs.Screen
				name="profileScreen"
				options={{
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="person-outline" color={color} size={size} />
					),
					headerShown: false,
					tabBarLabel: 'Me',
				}}
			/>
		</Tabs>
	);
}
