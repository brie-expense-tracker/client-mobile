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
					headerTitleStyle: {
						fontSize: 20,
						fontWeight: '600',
						color: '#333',
					},
					headerLeft: () => (
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
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
							<Ionicons name="chevron-back" size={24} color="#333" />
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
							<Ionicons name="chevron-back" size={24} color="#333" />
						</TouchableOpacity>
					),
					headerStyle: {
						backgroundColor: '#f7f7f7',
					},
				}}
			/>

			<Stack.Screen
				name="profile/index"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Profile',
					headerShadowVisible: false,
					headerLargeTitle: true,
					headerLargeStyle: {
						backgroundColor: '#ffffff',
					},
					headerTitleStyle: {
						fontSize: 20,
						fontWeight: '600',
						color: '#333',
					},
					headerStyle: {
						backgroundColor: '#ffffff',
					},

					headerLeft: () => (
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</TouchableOpacity>
					),
				}}
			/>
			<Stack.Screen
				name="profile/editName"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Edit Name',
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
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</TouchableOpacity>
					),
				}}
			/>
			<Stack.Screen
				name="profile/editPhone"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Edit Phone',
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
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</TouchableOpacity>
					),
				}}
			/>
			<Stack.Screen
				name="profile/editPassword"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Edit Password',
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
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</TouchableOpacity>
					),
				}}
			/>
			<Stack.Screen
				name="profile/deleteAccount"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Delete Account',
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
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</TouchableOpacity>
					),
				}}
			/>
			<Stack.Screen
				name="profile/forgotPassword"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Forgot Password',
				}}
			/>
			<Stack.Screen
				name="profile/exportData"
				options={{
					headerShown: true,
					headerTitle: '',
					headerLeft: () => (
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</TouchableOpacity>
					),
					headerStyle: {
						backgroundColor: '#f7f7f7',
					},
					headerShadowVisible: false,
				}}
			/>
			<Stack.Screen
				name="security/index"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Password & Login',
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
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</TouchableOpacity>
					),
				}}
			/>
			<Stack.Screen
				name="about/index"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'About',
					headerShadowVisible: false,
					headerLargeTitle: true,
					headerLargeStyle: {
						backgroundColor: '#ffffff',
					},
					headerTitleStyle: {
						fontSize: 20,
						fontWeight: '600',
						color: '#333',
					},
					headerStyle: {
						backgroundColor: '#ffffff',
					},

					headerLeft: () => (
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</TouchableOpacity>
					),
				}}
			/>

			<Stack.Screen
				name="help/index"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Help & Support',
					headerShadowVisible: false,
					headerLargeTitle: true,
					headerLargeStyle: {
						backgroundColor: '#ffffff',
					},
					headerTitleStyle: {
						fontSize: 20,
						fontWeight: '600',
						color: '#333',
					},
					headerStyle: {
						backgroundColor: '#ffffff',
					},

					headerLeft: () => (
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</TouchableOpacity>
					),
				}}
			/>
			<Stack.Screen
				name="incomeBudget/index"
				options={{
					headerShown: true,
					headerTitle: 'Income & Budgets',
				}}
			/>
			<Stack.Screen
				name="goals/index"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Goals',
					headerShadowVisible: false,
					headerLargeTitle: true,
					headerLargeStyle: {
						backgroundColor: '#ffffff',
					},
					headerTitleStyle: {
						fontSize: 20,
						fontWeight: '600',
						color: '#333',
					},
					headerStyle: {
						backgroundColor: '#ffffff',
					},

					headerLeft: () => (
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</TouchableOpacity>
					),
				}}
			/>
			<Stack.Screen
				name="notification/index"
				options={{
					title: 'Notifications',
					headerShown: true, // or false if you want to hide it
					headerBackTitle: 'Settings',
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
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</TouchableOpacity>
					),
				}}
			/>
			<Stack.Screen
				name="legal/index"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Legal Documents',
					headerShadowVisible: false,
					headerLargeTitle: true,
					headerLargeStyle: {
						backgroundColor: '#ffffff',
					},
					headerTitleStyle: {
						fontSize: 20,
						fontWeight: '600',
						color: '#333',
					},
					headerStyle: {
						backgroundColor: '#ffffff',
					},
					headerLeft: () => (
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</TouchableOpacity>
					),
				}}
			/>
			<Stack.Screen
				name="legal/terms"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Terms of Service',
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
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</TouchableOpacity>
					),
				}}
			/>
			<Stack.Screen
				name="legal/privacyPolicy"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Privacy Policy',
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
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</TouchableOpacity>
					),
				}}
			/>
			<Stack.Screen
				name="legal/licenseAgreement"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'License Agreement',
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
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</TouchableOpacity>
					),
				}}
			/>
			<Stack.Screen
				name="legal/cookiePolicy"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Cookie Policy',
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
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</TouchableOpacity>
					),
				}}
			/>
			<Stack.Screen
				name="legal/disclaimer"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Disclaimer',
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
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</TouchableOpacity>
					),
				}}
			/>
			<Stack.Screen
				name="legal/dataRightsCompliance"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Data Rights & Compliance',
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
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</TouchableOpacity>
					),
				}}
			/>
		</Stack>
	);
}
