import { Tabs, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { BudgetProvider } from '../../src/context/budgetContext';
import { GoalProvider } from '../../src/context/goalContext';
import { ProfileProvider } from '../../src/context/profileContext';

type TabPressEvent = {
	preventDefault: () => void;
};

const TabLayout: React.FC = () => {
	const router = useRouter();
	const pathname = usePathname();

	const trimTrailingSlash = (value: string) =>
		value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value;

	const createTabListener =
		<Route extends Href>(targetRoute: Route) =>
		() => ({
			tabPress: (event: TabPressEvent) => {
				if (typeof targetRoute !== 'string') {
					return;
				}

				const normalizedTarget = trimTrailingSlash(targetRoute);
				const normalizedPathname = trimTrailingSlash(pathname);

				if (
					normalizedPathname === normalizedTarget ||
					normalizedPathname.startsWith(`${normalizedTarget}/`)
				) {
					event.preventDefault();
					router.replace(targetRoute);
				}
			},
		});

	return (
		<ProfileProvider>
			<BudgetProvider>
				<GoalProvider>
					<Tabs
						screenOptions={{
							tabBarStyle: {
								paddingTop: 4,
								height: 70,
							},
							tabBarLabelStyle: {
								fontSize: 16,
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
									<Ionicons name="grid-outline" color={color} size={size} />
								),
								tabBarShowLabel: false,
								tabBarLabel: 'Home',
							}}
							listeners={createTabListener('/(tabs)/dashboard')}
						/>
						<Tabs.Screen
							name="chat"
							options={{
								tabBarIcon: ({ color, size }) => (
									<Ionicons name="sparkles-outline" color={color} size={size} />
								),
								tabBarShowLabel: false,
								tabBarLabel: 'Chat',
							}}
							listeners={createTabListener('/(tabs)/chat')}
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
							listeners={createTabListener('/(tabs)/transaction')}
						/>
						<Tabs.Screen
							name="wallet"
							options={{
								tabBarIcon: ({ color, size }) => (
									<Ionicons name="wallet-outline" color={color} size={size} />
								),
								tabBarShowLabel: false,
								tabBarLabel: 'Wallet',
							}}
							listeners={createTabListener('/(tabs)/wallet')}
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
							listeners={createTabListener('/(tabs)/reflections')}
						/>
					</Tabs>
				</GoalProvider>
			</BudgetProvider>
		</ProfileProvider>
	);
};

TabLayout.displayName = 'TabLayout';

export default TabLayout;
