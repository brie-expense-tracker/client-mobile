import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import './global.css';
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { AuthProvider } from '../src/context/AuthContext';
import { OnboardingProvider } from '../src/context/OnboardingContext';
import useAuth from '../src/context/AuthContext';
import { useOnboarding } from '../src/context/OnboardingContext';

function RootLayoutContent() {
	const { user, firebaseUser, loading } = useAuth();
	const { hasSeenOnboarding } = useOnboarding();
	const router = useRouter();
	const segments = useSegments();

	useEffect(() => {
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
				router.replace('/(onboarding)/onboardingOne');
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
	}, [user, firebaseUser, loading, hasSeenOnboarding, segments]);

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

export default function RootLayout() {
	return (
		<AuthProvider>
			<OnboardingProvider>
				<RootLayoutContent />
			</OnboardingProvider>
		</AuthProvider>
	);
}
