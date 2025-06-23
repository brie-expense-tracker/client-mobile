import React from 'react';
import { router, Stack } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function _layout() {
	return (
		<Stack>
			<Stack.Screen
				name="index"
				options={{ headerShown: false, title: 'Settings' }}
			/>
			<Stack.Screen
				name="privacyandsecurity/index"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Security & Privacy',
					headerShadowVisible: false,
					headerStyle: {
						backgroundColor: '#ffffff',
					},
					headerLeft: () => (
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#0a5cea" />
						</TouchableOpacity>
					),
				}}
			/>
			<Stack.Screen
				name="privacyandsecurity/changePassword"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: '',
					headerShadowVisible: false,
					headerStyle: {
						backgroundColor: '#ffffff',
					},
					headerLeft: () => (
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#0a5cea" />
						</TouchableOpacity>
					),
				}}
			/>
			<Stack.Screen
				name="privacyandsecurity/privacyPolicy"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Privacy Policy',
					headerShadowVisible: false,
					headerStyle: {
						backgroundColor: '#ffffff',
					},
					headerLeft: () => (
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#0a5cea" />
						</TouchableOpacity>
					),
				}}
			/>
			<Stack.Screen
				name="privacyandsecurity/manageData"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: '',
					headerShadowVisible: false,
					headerLeft: () => (
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#0a5cea" />
						</TouchableOpacity>
					),
					headerStyle: {
						backgroundColor: '#f7f7f7',
					},
				}}
			/>
			<Stack.Screen
				name="privacyandsecurity/downloadData"
				options={{
					headerShown: true,
					headerTitle: '',
					headerLeft: () => (
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#0a5cea" />
						</TouchableOpacity>
					),
					headerStyle: {
						backgroundColor: '#f7f7f7',
					},
					headerShadowVisible: false,
				}}
			/>
			<Stack.Screen
				name="account/index"
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="about/index"
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="help/index"
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="notification/notificationSettings"
				options={{
					title: 'Notification Settings',
					headerShown: true, // or false if you want to hide it
					headerBackTitle: 'Settings',
				}}
			/>
		</Stack>
	);
}
