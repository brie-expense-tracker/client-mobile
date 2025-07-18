import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import './global.css';
import React, { useEffect, useState, useContext } from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import useAuth, { AuthProvider } from '../src/context/AuthContext';
import { OnboardingProvider , useOnboarding } from '../src/context/OnboardingContext';
import { ProfileProvider } from '../src/context/profileContext';
import { NotificationProvider } from '../src/context/notificationContext';
import { TransactionProvider } from '../src/context/transactionContext';
import { ProgressionProvider } from '../src/context/progressionContext';
import { TransactionModalProvider } from '../src/context/transactionModalContext';

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

function RootLayoutContent() {
	const { user, firebaseUser, loading } = useAuth();
	const { hasSeenOnboarding } = useOnboarding();
	const router = useRouter();
	const segments = useSegments();
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		// Mark component as mounted after initial render
		setIsMounted(true);
	}, []);

	useEffect(() => {
		// Don't navigate until component is mounted
		if (!isMounted) return;

		// If demo mode is enabled, skip all authentication and go directly to main app
		if (DEMO_MODE) {
			if (segments[0] !== '(tabs)') {
				console.log('Demo mode: Navigating directly to main app');
				// Add a small delay to ensure navigation is ready
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

		// Navigation logic based on user state and onboarding status
		if (firebaseUser && user) {
			// User is authenticated in Firebase AND exists in MongoDB
			if (!hasSeenOnboarding && !inOnboardingGroup) {
				// User hasn't seen onboarding - show onboarding
				console.log(
					'User authenticated but needs onboarding, navigating to onboarding'
				);
				router.replace('/(onboarding)/onboardingThree');
			} else if (hasSeenOnboarding && !inTabsGroup) {
				// User has seen onboarding - show main app
				console.log(
					'User authenticated and has seen onboarding, navigating to dashboard'
				);
				router.replace('/(tabs)/dashboard');
			}
		} else if (firebaseUser && !user) {
			// User is authenticated in Firebase but not in MongoDB - redirect to signup
			if (!inAuthGroup) {
				console.log(
					'Firebase user exists but not in MongoDB, redirecting to signup'
				);
				router.replace('/(auth)/signup');
			}
		} else {
			// User is not authenticated - show auth screens
			if (!inAuthGroup) {
				console.log('User not authenticated, redirecting to signup');
				router.replace('/(auth)/signup');
			}
		}
	}, [user, firebaseUser, loading, hasSeenOnboarding, segments, isMounted]);

	// Show demo mode indicator if demo mode is enabled
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
				</Stack>
			</GestureHandlerRootView>
		);
	}

	// Show spinner if loading auth, or if user is authenticated and onboarding status is loading
	if (loading || (user && hasSeenOnboarding === null)) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
				<ActivityIndicator size="large" color="#007ACC" />
				<Text style={{ color: '#007ACC', marginTop: 10 }}>Loading...</Text>
			</View>
		);
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<Stack>
				<Stack.Screen name="(auth)" options={{ headerShown: false }} />
				<Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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

export default function RootLayout() {
	return (
		<NotificationProvider>
			<AuthProvider>
				<OnboardingProvider>
					<ProfileProvider>
						<TransactionProvider>
							<ProgressionProvider>
								<TransactionModalProvider>
									<RootLayoutContent />
								</TransactionModalProvider>
							</ProgressionProvider>
						</TransactionProvider>
					</ProfileProvider>
				</OnboardingProvider>
			</AuthProvider>
		</NotificationProvider>
	);
}
