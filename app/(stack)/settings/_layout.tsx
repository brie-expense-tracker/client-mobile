import React, { useState } from 'react';
import { router, Stack } from 'expo-router';
import { BorderlessButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

export default function Layout() {
	const [isPressed, setIsPressed] = useState(false);
	return (
		<Stack>
			<Stack.Screen
				name="index"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Settings',
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
							onPress={() => router.back()}
							onActiveStateChange={setIsPressed}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</BorderlessButton>
					),
				}}
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
			<Stack.Screen
				name="privacyandsecurity/manageData"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: '',
					headerShadowVisible: false,
					headerLeft: () => (
						<BorderlessButton
							onPress={() => router.back()}
							onActiveStateChange={setIsPressed}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</BorderlessButton>
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
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Download Data',
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

			<Stack.Screen
				name="profile/index"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Profile',
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
			<Stack.Screen
				name="profile/editPassword"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Change Password',
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
			<Stack.Screen
				name="profile/editFinancial"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Edit Financial Information',
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
			<Stack.Screen
				name="profile/editExpenses"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Edit Expenses',
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
			<Stack.Screen
				name="profile/forgotPassword"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Forgot Password',
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
			<Stack.Screen
				name="about/index"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'About',
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

			<Stack.Screen
				name="faq/index"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Frequently Asked Questions',
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
			<Stack.Screen
				name="budgets/index"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Budgets',
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
						<BorderlessButton
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</BorderlessButton>
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
			<Stack.Screen
				name="legal/index"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Legal Documents',
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
						<BorderlessButton
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</BorderlessButton>
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
			<Stack.Screen
				name="data/index"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Data Handling',
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
			<Stack.Screen
				name="data/exportData"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Export Data',
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
			<Stack.Screen
				name="aiInsights/index"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'AI Insights',
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

			<Stack.Screen
				name="recurringExpenses/index"
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Recurring Expenses',
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
		</Stack>
	);
}
