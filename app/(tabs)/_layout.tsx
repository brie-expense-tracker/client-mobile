import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BudgetProvider } from '../../src/context/budgetContext';
import { GoalProvider } from '../../src/context/goalContext';
import { ProfileProvider } from '../../src/context/profileContext';
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RNModal from 'react-native-modal';
import { router } from 'expo-router';
import { RectButton } from 'react-native-gesture-handler';

export default function TabLayout() {
	const [showTransactionModal, setShowTransactionModal] = useState(false);

	const handleTransactionTabPress = () => {
		setShowTransactionModal(true);
	};

	const navigateToAddTransaction = () => {
		setShowTransactionModal(false);
		router.replace('/transaction');
	};

	const navigateToAddExpense = () => {
		setShowTransactionModal(false);
		router.replace('/transaction/expense');
	};

	return (
		<ProfileProvider>
			<BudgetProvider>
				<GoalProvider>
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
								name="insights"
								options={{
									tabBarIcon: ({ color, size }) => (
										<Ionicons name="timer-outline" color={color} size={size} />
									),
									tabBarShowLabel: false,
									tabBarLabel: 'Insights',
								}}
							/>
							<Tabs.Screen
								name="transaction"
								options={{
									tabBarIcon: ({ color, size }) => (
										<Ionicons
											name="add-circle-outline"
											color={color}
											size={size}
										/>
									),
									tabBarShowLabel: false,
									tabBarLabel: 'Transaction',
								}}
								listeners={{
									tabPress: (e) => {
										e.preventDefault();
										handleTransactionTabPress();
									},
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
										<Ionicons
											name="settings-outline"
											color={color}
											size={size}
										/>
									),
									tabBarShowLabel: false,
									tabBarLabel: 'Settings',
								}}
							/>
						</Tabs>

						{/* Transaction Choice Modal */}
						<RNModal
							isVisible={showTransactionModal}
							onBackdropPress={() => setShowTransactionModal(false)}
							animationIn="slideInUp"
							animationOut="slideOutDown"
							backdropOpacity={0.5}
							useNativeDriver
							style={styles.modal}
						>
							<View style={styles.modalContent}>
								<Text style={styles.modalTitle}>
									What would you like to do?
								</Text>

								<RectButton
									style={styles.modalButton}
									onPress={navigateToAddTransaction}
								>
									<Ionicons
										name="add-circle-outline"
										size={24}
										color="#0095FF"
									/>
									<Text style={styles.modalButtonText}>Add Income</Text>
								</RectButton>

								<RectButton
									style={styles.modalButton}
									onPress={navigateToAddExpense}
								>
									<Ionicons
										name="remove-circle-outline"
										size={24}
										color="#0095FF"
									/>
									<Text style={styles.modalButtonText}>Add Expense</Text>
								</RectButton>

								<RectButton
									style={styles.cancelButton}
									onPress={() => setShowTransactionModal(false)}
								>
									<Text style={styles.cancelButtonText}>Cancel</Text>
								</RectButton>
							</View>
						</RNModal>
				</GoalProvider>
			</BudgetProvider>
		</ProfileProvider>
	);
}

const styles = StyleSheet.create({
	modal: {
		margin: 0,
		justifyContent: 'flex-end',
	},
	modalContent: {
		backgroundColor: 'white',
		borderRadius: 16,
		padding: 24,
		maxWidth: 400,
		alignItems: 'center',
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#212121',
		marginBottom: 24,
		textAlign: 'center',
	},
	modalButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f8f9fa',
		paddingVertical: 16,
		paddingHorizontal: 20,
		borderRadius: 12,
		marginBottom: 12,
		width: '100%',
		justifyContent: 'center',
	},
	modalButtonText: {
		fontSize: 16,
		fontWeight: '500',
		color: '#212121',
		marginLeft: 12,
	},
	cancelButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f8f9fa',
		paddingVertical: 16,
		paddingHorizontal: 20,
		borderRadius: 12,
		marginBottom: 12,
		width: '100%',
		justifyContent: 'center',
	},
	cancelButtonText: {
		fontSize: 16,
		color: '#6b7280',
		fontWeight: '500',
	},
});
