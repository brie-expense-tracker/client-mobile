import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import './global.css';
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { AuthProvider } from '../src/context/AuthContext';
import useAuth from '../src/context/AuthContext';

function RootLayoutContent() {
	const { user, firebaseUser, loading } = useAuth();
	const router = useRouter();
	const segments = useSegments();

	useEffect(() => {
		if (loading) return;

		const inAuthGroup = segments[0] === '(auth)';
		const inTabsGroup = segments[0] === '(tabs)';

		// Navigation logic based on user state
		if (firebaseUser && user) {
			// User is authenticated in Firebase AND exists in MongoDB - show main app
			if (!inTabsGroup) {
				console.log('User authenticated, navigating to dashboard');
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
			// User is not authenticated - show login screen
			if (!inAuthGroup) {
				console.log('User not authenticated, redirecting to login');
				router.replace('/(auth)/login');
			}
		}
	}, [user, firebaseUser, loading, segments]);

	if (loading) {
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
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
			</Stack>
		</GestureHandlerRootView>
	);
}

export default function RootLayout() {
	return (
		<AuthProvider>
			<RootLayoutContent />
		</AuthProvider>
	);
}
