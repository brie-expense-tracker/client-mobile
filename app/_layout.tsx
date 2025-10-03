// MUST be imported before anything that uses uuid/crypto
import '../src/polyfills';

import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { getApp, initializeApp } from '@react-native-firebase/app';
// @ts-ignore - react-query types will be available after install
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
	ActivityIndicator,
	Text,
	View,
	StyleSheet,
	StatusBar,
	Linking,
} from 'react-native';
import {
	SafeAreaProvider,
	initialWindowMetrics,
} from 'react-native-safe-area-context';
import useAuth, { AuthProvider } from '../src/context/AuthContext';
import {
	OnboardingProvider,
	useOnboarding,
} from '../src/context/OnboardingContext';
import { ProfileProvider } from '../src/context/profileContext';
import { NotificationProvider } from '../src/context/notificationContext';
import { TransactionProvider } from '../src/context/transactionContext';
import { TransactionModalProvider } from '../src/context/transactionModalContext';
import { DemoDataProvider } from '../src/context/demoDataContext';
import { ThemeProvider } from '../src/context/ThemeContext';

import * as Notifications from 'expo-notifications';

// Import background task service
import { ensureBgPushRegistered } from '../src/services/notifications/backgroundTaskService';

// Import app initialization hook
import { useAppInit } from '../src/hooks/useAppInit';

// Demo mode toggle - set to true to enable demo mode
const DEMO_MODE = false; // Disable demo mode to enable authentication

// Development mode toggle - set to true to allow onboarding access after completion
const DEV_MODE = true; // Enable dev mode for testing onboarding

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Background task registration is now handled by backgroundTaskService

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
	devIndicator: {
		position: 'absolute',
		top: 90,
		right: 20,
		backgroundColor: '#4CAF50',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		zIndex: 1000,
	},
	devText: {
		color: 'white',
		fontSize: 12,
		fontWeight: 'bold',
	},
});

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60, // 1 minute
			retry: (failureCount, error: any) => {
				// Don't retry on 4xx errors
				if (error && error.status >= 400 && error.status < 500) {
					return false;
				}
				// Retry up to 3 times for other errors
				return failureCount < 3;
			},
		},
	},
});

// Refactored RootLayoutContent to conditionally mount providers
function RootLayoutContent() {
	const { user, firebaseUser, loading } = useAuth();
	const { hasSeenOnboarding } = useOnboarding();
	const router = useRouter();
	const segments = useSegments();
	const [isMounted, setIsMounted] = useState(false);

	// Add timeout mechanism to prevent infinite loading
	const [loadingTimeout, setLoadingTimeout] = useState(false);

	// Debug logging helper
	const logState = useCallback(
		(label: string) => {
			console.log(`🔎 [Layout][${label}]`, {
				loading,
				loadingTimeout,
				firebaseUser: !!firebaseUser,
				user: !!user,
				hasSeenOnboarding,
				segments: segments.join('/'),
				inAuthGroup: segments[0] === '(auth)',
				inTabsGroup: segments[0] === '(tabs)',
				inOnboardingGroup: segments[0] === '(onboarding)',
				inStackGroup: segments[0] === '(stack)',
				DEMO_MODE,
				DEV_MODE,
			});
		},
		[loading, loadingTimeout, firebaseUser, user, hasSeenOnboarding, segments]
	);

	useEffect(() => {
		try {
			setIsMounted(true);
		} catch (error) {
			console.warn('Failed to set mounted state:', error);
		}
	}, []);

	// Initialize notifications and background tasks safely
	useEffect(() => {
		try {
			// Safe to set handler in effect
			Notifications.setNotificationHandler({
				handleNotification: async () => ({
					shouldShowBanner: true,
					shouldShowList: true,
					shouldPlaySound: false,
					shouldSetBadge: false,
				}),
			});
		} catch (error) {
			console.warn(
				'[Notifications] Failed to set notification handler:',
				error
			);
		}

		// Register background tasks using centralized service
		ensureBgPushRegistered();
	}, []);

	// Handle deep links
	useEffect(() => {
		const handleDeepLink = (url: string) => {
			try {
				console.log('Deep link received:', url);
				// expo-router will handle the navigation automatically
			} catch (error) {
				console.warn('Failed to handle deep link:', error);
			}
		};

		// Handle initial URL if app was opened via deep link
		try {
			Linking.getInitialURL()
				.then((url) => {
					if (url) {
						handleDeepLink(url);
					}
				})
				.catch((error) => {
					console.warn('Failed to get initial URL:', error);
				});
		} catch (error) {
			console.warn('Failed to get initial URL:', error);
		}

		// Handle deep links when app is already running
		let subscription: any = null;
		try {
			subscription = Linking.addEventListener('url', (event) => {
				handleDeepLink(event.url);
			});
		} catch (error) {
			console.warn('Failed to add deep link listener:', error);
		}

		return () => {
			try {
				if (subscription?.remove) {
					subscription.remove();
				}
			} catch (error) {
				console.warn('Failed to remove deep link listener:', error);
			}
		};
	}, []);

	// Initialize telemetry services using the hook
	useAppInit();

	// Add timeout mechanism to prevent infinite loading
	useEffect(() => {
		if (loading || (user && hasSeenOnboarding === null)) {
			// Set a timeout to prevent infinite loading
			const timeout = setTimeout(() => {
				console.log('⚠️ [Layout] Loading timeout reached, forcing navigation');
				console.log('🔍 [Layout] Debug state:', {
					loading,
					user: !!user,
					hasSeenOnboarding,
					loadingTimeout,
				});
				setLoadingTimeout(true);
			}, 5000); // Reduced to 5 second timeout

			return () => clearTimeout(timeout);
		}
	}, [loading, user, hasSeenOnboarding, loadingTimeout]);

	useEffect(() => {
		try {
			if (!isMounted) return;

			// Debug logging
			logState('nav-effect:start');

			if (DEMO_MODE) {
				// In dev mode, allow access to onboarding even in demo mode
				if (DEV_MODE && segments[0] === '(onboarding)') {
					// Allow staying on onboarding screens in dev mode
					return;
				}

				// Allow access to (stack) group screens (like addGoal, addBudget, etc.)
				if (segments[0] === '(stack)') {
					// Allow staying on stack screens in demo mode
					return;
				}

				if (segments[0] !== '(tabs)') {
					setTimeout(() => {
						try {
							router.replace('/(tabs)/dashboard');
						} catch (error) {
							console.warn(
								'Failed to navigate to dashboard in demo mode:',
								error
							);
						}
					}, 100);
				}
				return;
			}
			// If still loading or onboarding status is unknown and no timeout, wait
			if (loading || (user && hasSeenOnboarding === null && !loadingTimeout))
				return;
			const inAuthGroup = segments[0] === '(auth)';
			const inTabsGroup = segments[0] === '(tabs)';
			const inOnboardingGroup = segments[0] === '(onboarding)';
			const inStackGroup = segments[0] === '(stack)';
			if (firebaseUser && user) {
				// In dev mode, allow access to onboarding even if completed
				if (DEV_MODE && inOnboardingGroup) {
					// Allow staying on onboarding screens in dev mode
					return;
				}

				// If timeout reached, assume user has completed onboarding
				const shouldShowOnboarding = !hasSeenOnboarding && !loadingTimeout;

				if (shouldShowOnboarding && !inOnboardingGroup) {
					try {
						router.replace('/(onboarding)/profileSetup');
					} catch (error) {
						console.warn('Failed to navigate to onboarding:', error);
					}
				} else if (
					(hasSeenOnboarding || loadingTimeout) &&
					!inTabsGroup &&
					!inStackGroup &&
					!inOnboardingGroup
				) {
					// Allow redirect even in DEV_MODE if we're "nowhere" (+not-found)
					logState('nav-effect:redirecting');
					console.log(
						'🧭 [Layout] Redirecting to dashboard because we are not in any group'
					);
					try {
						router.replace('/(tabs)/dashboard');
					} catch (error) {
						console.warn('Failed to navigate to dashboard:', error);
					}
				}
			} else if (firebaseUser && !user) {
				if (!inAuthGroup) {
					try {
						router.replace('/(auth)/login');
					} catch (error) {
						console.warn('Failed to navigate to login:', error);
					}
				}
			} else {
				if (!inAuthGroup) {
					try {
						router.replace('/(auth)/login');
					} catch (error) {
						console.warn('Failed to navigate to login:', error);
					}
				}
			}
		} catch (error) {
			console.warn('Failed to handle navigation logic:', error);
		}
	}, [
		user,
		firebaseUser,
		loading,
		hasSeenOnboarding,
		loadingTimeout,
		segments,
		isMounted,
		router,
		logState,
	]);

	if (DEMO_MODE) {
		try {
			return (
				<GestureHandlerRootView style={{ flex: 1 }}>
					<View style={styles.demoIndicator}>
						<Text style={styles.demoText}>DEMO MODE</Text>
					</View>
					{DEV_MODE && (
						<View style={styles.devIndicator}>
							<Text style={styles.devText}>DEV MODE</Text>
						</View>
					)}
					<ProfileProvider>
						<TransactionProvider>
							<TransactionModalProvider>
								<DemoDataProvider>
									<Stack
										screenOptions={{
											contentStyle: { backgroundColor: '#fff' },
											animation: 'fade',
										}}
									>
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
								</DemoDataProvider>
							</TransactionModalProvider>
						</TransactionProvider>
					</ProfileProvider>
				</GestureHandlerRootView>
			);
		} catch (error) {
			console.warn('Failed to render demo mode:', error);
			// Fallback to basic loading screen
			return (
				<View
					style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
				>
					<ActivityIndicator size="large" color="#007ACC" />
					<Text style={{ color: '#007ACC', marginTop: 10 }}>Loading...</Text>
				</View>
			);
		}
	}

	// Show spinner only while we're still genuinely loading AND we haven't timed out
	if (
		(loading && !loadingTimeout) ||
		(user && hasSeenOnboarding === null && !loadingTimeout)
	) {
		console.log('🧩 [Layout] Rendering: loading screen');
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
				<ActivityIndicator size="large" color="#007ACC" />
				<Text style={{ color: '#007ACC', marginTop: 10 }}>Loading...</Text>
				{loadingTimeout && (
					<Text style={{ color: '#FF6B6B', marginTop: 10, fontSize: 12 }}>
						Taking longer than expected...
					</Text>
				)}
			</View>
		);
	}

	// If user is authenticated, always wrap all screens in ProfileProvider
	if (firebaseUser && user) {
		console.log('🧩 [Layout] Rendering: authenticated app');
		try {
			return (
				<ProfileProvider>
					{DEV_MODE && (
						<View style={styles.devIndicator}>
							<Text style={styles.devText}>DEV MODE</Text>
						</View>
					)}
					{/* Always mount all providers to ensure onboarding screens have access */}
					<TransactionProvider>
						<TransactionModalProvider>
							<DemoDataProvider>
								<GestureHandlerRootView style={{ flex: 1 }}>
									<Stack
										screenOptions={{
											headerShown: false,
											animation: 'none',
											contentStyle: { backgroundColor: '#fff' },
										}}
									>
										<Stack.Screen
											name="(auth)"
											options={{ headerShown: false, animation: 'none' }}
										/>
										<Stack.Screen
											name="(onboarding)"
											options={{ headerShown: false, animation: 'none' }}
										/>
										<Stack.Screen
											name="(tabs)"
											options={{ headerShown: false, animation: 'none' }}
										/>
										<Stack.Screen
											name="(stack)"
											options={{ headerShown: false, animation: 'none' }}
										/>
									</Stack>
								</GestureHandlerRootView>
							</DemoDataProvider>
						</TransactionModalProvider>
					</TransactionProvider>
				</ProfileProvider>
			);
		} catch (error) {
			console.warn('Failed to render authenticated user layout:', error);
			// Fallback to basic loading screen
			return (
				<View
					style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
				>
					<ActivityIndicator size="large" color="#007ACC" />
					<Text style={{ color: '#007ACC', marginTop: 10 }}>Loading...</Text>
				</View>
			);
		}
	}

	// For unauthenticated or auth screens, just show the stack (no user-dependent providers)
	console.log('🧩 [Layout] Rendering: unauthenticated stack');
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<Stack
				screenOptions={{
					headerShown: false,
					animation: 'none',
					contentStyle: { backgroundColor: '#fff' },
				}}
			>
				<Stack.Screen
					name="(auth)"
					options={{ headerShown: false, animation: 'none' }}
				/>
				<Stack.Screen
					name="(onboarding)"
					options={{ headerShown: false, animation: 'none' }}
				/>
				<Stack.Screen
					name="(tabs)"
					options={{ headerShown: false, animation: 'none' }}
				/>
				<Stack.Screen
					name="(stack)"
					options={{ headerShown: false, animation: 'none' }}
				/>
			</Stack>
		</GestureHandlerRootView>
	);
}

export default function RootLayout() {
	const [fontsLoaded, setFontsLoaded] = useState(false);
	const [isBootDataReady, setIsBootDataReady] = useState(false);

	useEffect(() => {
		(async () => {
			try {
				// Load fonts and icons
				await Font.loadAsync({
					...Ionicons.font, // Preload vector icons
					// Add custom fonts here if needed
				});
				setFontsLoaded(true);

				// Verify Firebase configuration
				try {
					const app = getApp();
					console.log('✅ Firebase initialized successfully:', app.name);
					console.log('Firebase project ID:', app.options.projectId);
				} catch (firebaseError) {
					console.error('❌ Firebase initialization failed:', firebaseError);
				}
			} catch (error) {
				console.warn('Failed to load fonts:', error);
				setFontsLoaded(true);
			}
		})();
	}, []);

	// Track when boot data is ready (auth + initial data)
	useEffect(() => {
		// Set a timeout to ensure boot data is ready
		const timer = setTimeout(() => {
			setIsBootDataReady(true);
		}, 1000); // Give 1 second for initial data to load

		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		if (fontsLoaded && isBootDataReady) {
			// Hide splash screen after fonts and boot data are ready
			SplashScreen.hideAsync();
		}
	}, [fontsLoaded, isBootDataReady]);

	// Don't render anything until fonts and boot data are loaded
	if (!fontsLoaded || !isBootDataReady) {
		return null; // Splash screen is visible
	}

	try {
		return (
			<SafeAreaProvider initialMetrics={initialWindowMetrics}>
				<QueryClientProvider client={queryClient}>
					<ThemeProvider>
						{/* Default status bar configuration for the entire app */}
						<StatusBar
							barStyle="dark-content"
							backgroundColor="#fff"
							translucent={false}
						/>
						<NotificationProvider>
							<AuthProvider>
								<OnboardingProvider>
									<RootLayoutContent />
								</OnboardingProvider>
							</AuthProvider>
						</NotificationProvider>
					</ThemeProvider>
				</QueryClientProvider>
			</SafeAreaProvider>
		);
	} catch (error) {
		console.warn('Failed to render root layout:', error);
		// Fallback to basic error screen
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
				<Text style={{ color: '#FF0000', fontSize: 16, textAlign: 'center' }}>
					Something went wrong. Please restart the app.
				</Text>
			</View>
		);
	}
}
