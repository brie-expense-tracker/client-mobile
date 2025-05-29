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
					paddingTop: 6,
				},
				tabBarInactiveTintColor: '#2f5ae9',
				tabBarActiveTintColor: '#3719ca',
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
						<Ionicons name="home" color={color} size={size} />
					),
					headerShown: false,
					// tabBarShowLabel: false,
					tabBarLabel: 'Home',
					// tabBarItemStyle: {
					// 	marginRight: -10,
					// },
				}}
			/>
			<Tabs.Screen
				name="transactionScreen"
				options={{
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="timer" color={color} size={size} />
					),
					headerShown: false,
					// tabBarShowLabel: false,
					tabBarLabel: 'History',
					// tabBarItemStyle: {
					// 	marginLeft: -10,
					// },
				}}
			/>
			<Tabs.Screen
				name="trackerScreen"
				options={{
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="add-circle" color={color} size={size} />
					),
					headerShown: false,
					tabBarLabel: 'Add',
					// tabBarButton: (props) => <NonInteractiveButton {...props} />,
				}}
			/>
			<Tabs.Screen
				name="chatScreen"
				options={{
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="chatbox" color={color} size={size} />
					),
					headerShown: false,
					// tabBarShowLabel: false,
					tabBarLabel: 'Chat',
					// tabBarItemStyle: {
					// 	marginRight: -10,
					// },
				}}
			/>
			<Tabs.Screen
				name="profileScreen"
				options={{
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="person" color={color} size={size} />
					),
					headerShown: false,
					// tabBarShowLabel: false,
					tabBarLabel: 'Me',
					// tabBarItemStyle: {
					// 	marginLeft: -10,
					// },
				}}
			/>
		</Tabs>
	);
}
