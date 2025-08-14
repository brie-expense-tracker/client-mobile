import { Stack, useRouter, useSegments } from 'expo-router';
// @ts-ignore - react-query types will be available after install
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import './global.css';
import React, { useEffect, useState, useContext } from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import useAuth, { AuthProvider } from '../src/context/AuthContext';
import {
	OnboardingProvider,
	useOnboarding,
} from '../src/context/OnboardingContext';
import { ProfileProvider } from '../src/context/profileContext';
import { NotificationProvider } from '../src/context/notificationContext';
import { TransactionProvider } from '../src/context/transactionContext';
import { ProgressionProvider } from '../src/context/progressionContext';
import { TransactionModalProvider } from '../src/context/transactionModalContext';
import { RecurringExpenseProvider } from '../src/context/recurringExpenseContext';

import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

// Demo mode toggle - set to true to enable demo mode
const DEMO_MODE = false;

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowBanner: true,
		shouldShowList: true,
		shouldPlaySound: false,
		shouldSetBadge: false,
	}),
});

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

TaskManager.defineTask(
	BACKGROUND_NOTIFICATION_TASK,
	async ({ data, error, executionInfo }) => {
		console.log('✅ Received a notification in the background!', {
			data,
			error,
			executionInfo,
		});
		// Do something with the notification data
		return {
			shouldShowBanner: true,
			shouldShowList: true,
			shouldPlaySound: false,
			shouldSetBadge: false,
		};
	}
);

Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { staleTime: 1000 * 60 }, // 1 minute
	},
});

export default function RootLayout() {
	return (
		<QueryClientProvider client={queryClient}>
			<NotificationProvider>
				<AuthProvider>
					<OnboardingProvider>
						<RootLayoutContent />
					</OnboardingProvider>
				</AuthProvider>
			</NotificationProvider>
		</QueryClientProvider>
	);
}

// Refactored RootLayoutContent to conditionally mount providers
function RootLayoutContent() {
	const { user, firebaseUser, loading } = useAuth();
	const { hasSeenOnboarding } = useOnboarding();
	const router = useRouter();
	const segments = useSegments();
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		if (!isMounted) return;
		if (DEMO_MODE) {
			if (segments[0] !== '(tabs)') {
				setTimeout(() => {
					router.replace('/(tabs)/dashboard');
				}, 100);
			}
			return;
		}
		if (loading || (user && hasSeenOnboarding === null)) return;
		const inAuthGroup = segments[0] === '(auth)';
		const inTabsGroup = segments[0] === '(tabs)';
		const inOnboardingGroup = segments[0] === '(onboarding)';
		const inStackGroup = segments[0] === '(stack)';
		if (firebaseUser && user) {
			if (!hasSeenOnboarding && !inOnboardingGroup) {
				router.replace('/(onboarding)/onboardingThree');
			} else if (hasSeenOnboarding && !inTabsGroup && !inStackGroup) {
				router.replace('/(tabs)/dashboard');
			}
		} else if (firebaseUser && !user) {
			if (!inAuthGroup) {
				router.replace('/(auth)/login');
			}
		} else {
			if (!inAuthGroup) {
				router.replace('/(auth)/login');
			}
		}
	}, [user, firebaseUser, loading, hasSeenOnboarding, segments, isMounted]);

	if (DEMO_MODE) {
		return (
			<GestureHandlerRootView style={{ flex: 1 }}>
				<View style={styles.demoIndicator}>
					<Text style={styles.demoText}>DEMO MODE</Text>
				</View>
				<Stack>
					<Stack.Screen name="(auth)" options={{ headerShown: false }} />
					<Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
					<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
					<Stack.Screen name="(stack)" options={{ headerShown: false }} />
				</Stack>
			</GestureHandlerRootView>
		);
	}

	if (loading || (user && hasSeenOnboarding === null)) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
				<ActivityIndicator size="large" color="#007ACC" />
				<Text style={{ color: '#007ACC', marginTop: 10 }}>Loading...</Text>
			</View>
		);
	}

	// If user is authenticated, always wrap all screens in ProfileProvider
	if (firebaseUser && user) {
		return (
			<ProfileProvider>
				{/* Mount other providers for main app if onboarding is complete */}
				{hasSeenOnboarding ? (
					<TransactionProvider>
						<ProgressionProvider>
							<RecurringExpenseProvider>
								<TransactionModalProvider>
									<GestureHandlerRootView style={{ flex: 1 }}>
										<Stack>
											<Stack.Screen
												name="(auth)"
												options={{ headerShown: false }}
											/>
											<Stack.Screen
												name="(onboarding)"
												options={{ headerShown: false }}
											/>
											<Stack.Screen
												name="(tabs)"
												options={{ headerShown: false }}
											/>
											<Stack.Screen
												name="(stack)"
												options={{ headerShown: false }}
											/>
										</Stack>
									</GestureHandlerRootView>
								</TransactionModalProvider>
							</RecurringExpenseProvider>
						</ProgressionProvider>
					</TransactionProvider>
				) : (
					// Onboarding screens only need ProfileProvider
					<GestureHandlerRootView style={{ flex: 1 }}>
						<Stack>
							<Stack.Screen name="(auth)" options={{ headerShown: false }} />
							<Stack.Screen
								name="(onboarding)"
								options={{ headerShown: false }}
							/>
							<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
							<Stack.Screen name="(stack)" options={{ headerShown: false }} />
						</Stack>
					</GestureHandlerRootView>
				)}
			</ProfileProvider>
		);
	}

	// For unauthenticated or auth screens, just show the stack (no user-dependent providers)
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<Stack>
				<Stack.Screen name="(auth)" options={{ headerShown: false }} />
				<Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
				<Stack.Screen name="(stack)" options={{ headerShown: false }} />
			</Stack>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	demoIndicator: {
		position: 'absolute',
		top: 50,
		right: 20,
		backgroundColor: '#FF6B6B',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		zIndex: 1000,
	},
	demoText: {
		color: 'white',
		fontSize: 12,
		fontWeight: 'bold',
	},
});
