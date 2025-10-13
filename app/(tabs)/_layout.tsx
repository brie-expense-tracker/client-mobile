import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BudgetProvider } from '../../src/context/budgetContext';
import { GoalProvider } from '../../src/context/goalContext';
import { ProfileProvider } from '../../src/context/profileContext';

export default function TabLayout() {
	return (
		<ProfileProvider>
			<BudgetProvider>
				<GoalProvider>
					<Tabs
						screenOptions={{
							tabBarStyle: {
								elevation: 5,
								paddingTop: 4,
								height: 70,
							},
							tabBarLabelStyle: {
								fontSize: 16,
								paddingBottom: 4,
								paddingTop: 0,
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
							name="assistant"
							options={{
								tabBarIcon: ({ color, size }) => (
									<Ionicons name="sparkles-outline" color={color} size={size} />
								),
								tabBarShowLabel: false,
								tabBarLabel: 'Assistant',
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
							name="reflections"
							options={{
								tabBarIcon: ({ color, size }) => (
									<Ionicons name="journal-outline" color={color} size={size} />
								),
								tabBarShowLabel: false,
								tabBarLabel: 'Reflections',
							}}
						/>
					</Tabs>
				</GoalProvider>
			</BudgetProvider>
		</ProfileProvider>
	);
}
