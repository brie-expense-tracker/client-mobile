import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TransactionProvider } from '../../src/context/transactionContext';
import { BudgetProvider } from '../../src/context/budgetContext';
import { GoalProvider } from '../../src/context/goalContext';
import { ProfileProvider } from '../../src/context/profileContext';

export default function TabLayout() {
	return (
		<ProfileProvider>
			<TransactionProvider>
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
					</GoalProvider>
				</BudgetProvider>
			</TransactionProvider>
		</ProfileProvider>
	);
}
