import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import './global.css';
import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { ActivityIndicator, Text, View } from 'react-native';

function RootLayoutContent() {
	const [initializing, setInitializing] = useState(true);
	const [user, setUser] = useState();
	const router = useRouter();
	const segments = useSegments();

	// Handle user state changes
	function handleAuthStateChanged(user: any) {
		setUser(user);
		if (initializing) setInitializing(false);
	}

	useEffect(() => {
		
		const subscriber = onAuthStateChanged(getAuth(), handleAuthStateChanged);
		return subscriber; // unsubscribe on unmount
	}, []);

	useEffect(() => {
		if (initializing) return;

		const inAuthGroup = segments[0] === '(auth)';
		const inTabsGroup = segments[0] === '(tabs)';

		// Navigation logic based on user state
		if (user) {
			// User is authenticated - show main app
			if (!inTabsGroup) {
				router.replace('/(tabs)/dashboard');
			}
		} else {
			// User is not authenticated
			if (!inAuthGroup) {
				router.replace('/(auth)/signup-test');
			}
		}
	}, [user, initializing, segments]);

	if (initializing) {
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
				<Stack.Screen name="notifications" />
			</Stack>
		</GestureHandlerRootView>
	);
}

export default function RootLayout() {
	return <RootLayoutContent />;
}
