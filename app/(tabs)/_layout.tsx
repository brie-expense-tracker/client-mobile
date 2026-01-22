import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { Tabs, usePathname, useRouter, useSegments } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BudgetProvider } from '../../src/context/budgetContext';
import { GoalProvider } from '../../src/context/goalContext';
import { ProfileProvider } from '../../src/context/profileContext';

type TabPressEvent = { preventDefault: () => void };

const trimTrailingSlash = (value: string) =>
	value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value;

const TabLayout: React.FC = () => {
	const router = useRouter();
	const pathname = usePathname();
	const segments = useSegments();

	const segments0 = segments?.[0];
	const segments1 = segments?.[1];

	// stable "which tab am I on?" key
	const tabKey = useMemo(() => {
		const key = segments0 === '(tabs)' ? segments1 : '';
		return String(key ?? '');
	}, [segments0, segments1]);

	const createTabListener = useCallback(
		<Route extends Href>(targetRoute: Route) =>
			() => ({
				tabPress: (event: TabPressEvent) => {
					if (typeof targetRoute !== 'string') return;

					const normalizedTarget = trimTrailingSlash(targetRoute);
					const normalizedPathname = trimTrailingSlash(pathname);

					// If already at root of this tab, do nothing
					if (normalizedPathname === normalizedTarget) {
						event.preventDefault();
						return;
					}

					// If inside this tab stack, pop back to the root route
					if (normalizedPathname.startsWith(`${normalizedTarget}/`)) {
						event.preventDefault();
						router.replace(targetRoute);
					}
				},
			}),
		[pathname, router]
	);

	const isHeavyTab = tabKey === 'wallet' || tabKey === 'transaction';

	return (
		<ProfileProvider>
			<BudgetProvider>
				<GoalProvider>
					<View style={{ flex: 1 }}>
						<Tabs
							screenOptions={{
								headerShown: false,
								tabBarShowLabel: false,
								tabBarActiveTintColor: '#007ACC',
								tabBarInactiveTintColor: '#000',
								tabBarStyle: {
									paddingTop: 6,
									height: 64,
									paddingHorizontal: 20,
								},
								// Freeze most tabs for perf, but keep heavy tabs "live"
								freezeOnBlur: !isHeavyTab,
							}}
						>
							<Tabs.Screen
								name="dashboard"
								options={{
									tabBarIcon: ({ color, size }) => (
										<Ionicons name="grid-outline" color={color} size={size} />
									),
								}}
								listeners={createTabListener('/(tabs)/dashboard')}
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
								}}
								listeners={createTabListener('/(tabs)/transaction')}
							/>

							<Tabs.Screen
								name="wallet"
								options={{
									tabBarIcon: ({ color, size }) => (
										<Ionicons name="wallet-outline" color={color} size={size} />
									),
								}}
								listeners={createTabListener('/(tabs)/wallet')}
							/>

							<Tabs.Screen
								name="settings"
								options={{
									tabBarIcon: ({ color, size }) => (
										<Ionicons name="person-outline" color={color} size={size} />
									),
								}}
								listeners={createTabListener('/(tabs)/settings')}
							/>

							{/* Hidden tabs - removed from tab bar but kept as routes */}
							<Tabs.Screen
								name="chat"
								options={{
									href: null, // Hide from tab bar
								}}
							/>
							<Tabs.Screen
								name="reflections"
								options={{
									href: null, // Hide from tab bar
								}}
							/>
						</Tabs>
					</View>
				</GoalProvider>
			</BudgetProvider>
		</ProfileProvider>
	);
};

TabLayout.displayName = 'TabLayout';
export default TabLayout;
