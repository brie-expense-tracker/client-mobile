import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs, usePathname, useRouter, useSegments } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../../src/ui/theme';

// MVP: BudgetProvider, GoalProvider removed - cash-only tracking with fixed categories
// ProfileProvider is from root app/_layout; do not duplicate here or Profile tab would read stale state

type TabPressEvent = { preventDefault: () => void };

const trimTrailingSlash = (value: string) =>
	value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value;

const TabLayout: React.FC = () => {
	const router = useRouter();
	const pathname = usePathname();
	const segments = useSegments();

	// Keep pathname in a ref so tab listeners can read current value without
	// being recreated on every pathname change (avoids "Maximum update depth exceeded"
	// when switching e.g. cash in → dashboard → cash out).
	const pathnameRef = useRef(pathname);
	useEffect(() => {
		pathnameRef.current = pathname;
	}, [pathname]);

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
					const normalizedPathname = trimTrailingSlash(pathnameRef.current);

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
		[router]
	);

	const isHeavyTab = tabKey === 'transaction';

	// Memoize listener objects so React Navigation doesn't see new references every render
	// (avoids "Maximum update depth exceeded" when switching e.g. cash in → dashboard → cash out).
	const dashboardListeners = useMemo(
		() => createTabListener('/(tabs)/dashboard')(),
		[createTabListener]
	);
	const transactionListeners = useMemo(
		() => createTabListener('/(tabs)/transaction')(),
		[createTabListener]
	);
	const settingsListeners = useMemo(
		() => createTabListener('/(tabs)/settings')(),
		[createTabListener]
	);

	const screenOptions = useMemo(
		() => ({
			headerShown: false,
			tabBarShowLabel: false,
			tabBarActiveTintColor: palette.primaryStrong,
			tabBarInactiveTintColor: palette.textSubtle,
			tabBarStyle: {
				paddingTop: 6,
				height: 64,
				paddingHorizontal: 20,
				backgroundColor: palette.shell,
				borderTopWidth: StyleSheet.hairlineWidth,
				borderTopColor: palette.border,
			},
			freezeOnBlur: !isHeavyTab,
		}),
		[isHeavyTab]
	);

	return (
		<View style={{ flex: 1 }}>
			<Tabs screenOptions={screenOptions}>
				<Tabs.Screen
					name="dashboard"
					options={{
						tabBarIcon: ({ color, size }) => (
							<Ionicons name="grid-outline" color={color} size={size} />
						),
					}}
					listeners={dashboardListeners}
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
					listeners={transactionListeners}
				/>
				<Tabs.Screen
					name="settings"
					options={{
						tabBarIcon: ({ color, size }) => (
							<Ionicons name="person-outline" color={color} size={size} />
						),
					}}
					listeners={settingsListeners}
				/>
			</Tabs>
		</View>
	);
};

TabLayout.displayName = 'TabLayout';
export default TabLayout;
