// Polyfills are loaded in `client-mobile/index.ts` before router entry

import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { getApp } from '@react-native-firebase/app';
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
import { createLogger } from '../src/utils/sublogger';
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
import { BudgetProvider } from '../src/context/budgetContext';
import { GoalProvider } from '../src/context/goalContext';
import { RecurringExpenseProvider } from '../src/context/recurringExpenseContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { loadLocalOverrides, getResolvedFlags } from '../src/config/features';
import * as Notifications from 'expo-notifications';
import { ensureBgPushRegistered } from '../src/services/notifications/backgroundTaskService';
import { useAppInit } from '../src/hooks/useAppInit';
import { DEV_MODE, isDevMode } from '../src/config/environment';

// Create namespaced logger for this service
const layoutLog = createLogger('Layout');

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Background task registration is now handled by backgroundTaskService

const styles = StyleSheet.create({
	devIndicator: {
		position: 'absolute',
		top: 50,
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
			if (isDevMode) {
				layoutLog.debug(`${label}`, {
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
					DEV_MODE,
					isDevMode,
				});
			}
		},
		[loading, loadingTimeout, firebaseUser, user, hasSeenOnboarding, segments]
	);

	useEffect(() => {
		try {
			setIsMounted(true);
		} catch (error) {
			layoutLog.warn('Failed to set mounted state:', error);
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
			layoutLog.warn(
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
				if (isDevMode) {
					layoutLog.debug('Deep link received:', url);
				}
				// expo-router will handle the navigation automatically
			} catch (error) {
				layoutLog.warn('Failed to handle deep link:', error);
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
					layoutLog.warn('Failed to get initial URL:', error);
				});
		} catch (error) {
			layoutLog.warn('Failed to get initial URL:', error);
		}

		// Handle deep links when app is already running
		let subscription: any = null;
		try {
			subscription = Linking.addEventListener('url', (event) => {
				handleDeepLink(event.url);
			});
		} catch (error) {
			layoutLog.warn('Failed to add deep link listener:', error);
		}

		return () => {
			try {
				if (subscription?.remove) {
					subscription.remove();
				}
			} catch (error) {
				layoutLog.warn('Failed to remove deep link listener:', error);
			}
		};
	}, []);

	// Initialize telemetry services using the hook
	useAppInit();

	// Add timeout mechanism to prevent infinite loading ONLY when status is null
	useEffect(() => {
		// Only set timeout if we're truly stuck (status is null, not false)
		if (user && hasSeenOnboarding === null && !loading) {
			// Set a timeout to prevent infinite loading when onboarding status won't load
			const timeout = setTimeout(() => {
				if (isDevMode) {
					layoutLog.debug('Loading timeout reached for null onboarding status');
					layoutLog.debug('Debug state:', {
						loading,
						user: !!user,
						hasSeenOnboarding,
						loadingTimeout,
					});
				}
				setLoadingTimeout(true);
			}, 10000); // Increased to 10 seconds to give more time for status to load

			return () => clearTimeout(timeout);
		} else if (hasSeenOnboarding !== null) {
			// Reset timeout if we successfully got a status
			setLoadingTimeout(false);
		}
	}, [loading, user, hasSeenOnboarding, loadingTimeout]);

	useEffect(() => {
		try {
			if (!isMounted) return;

			// Debug logging
			logState('nav-effect:start');

			// If still loading or onboarding status is unknown and no timeout, wait
			if (loading || (user && hasSeenOnboarding === null && !loadingTimeout))
				return;
			const inAuthGroup = segments[0] === '(auth)';
			const inTabsGroup = segments[0] === '(tabs)';
			const inOnboardingGroup = segments[0] === '(onboarding)';
			const inStackGroup = segments[0] === '(stack)';
			if (firebaseUser && user) {
				// In dev mode, allow access to onboarding even if completed
				if (isDevMode && inOnboardingGroup) {
					// Allow staying on onboarding screens in dev mode
					return;
				}

				// Check if user needs onboarding (use hasSeenOnboarding === false explicitly)
				// If hasSeenOnboarding is null and timeout reached, still check it - don't assume completed
				const needsOnboarding = hasSeenOnboarding === false;
				const hasCompletedOnboarding = hasSeenOnboarding === true;

				if (needsOnboarding && !inOnboardingGroup) {
					logState('nav-effect:redirecting-to-onboarding');
					if (isDevMode) {
						layoutLog.debug(
							'User needs onboarding, redirecting to profile setup'
						);
					}
					try {
						router.replace('/(onboarding)/profileSetup');
					} catch (error) {
						layoutLog.warn('Failed to navigate to onboarding:', error);
					}
				} else if (
					hasCompletedOnboarding &&
					!inTabsGroup &&
					!inStackGroup &&
					!inOnboardingGroup
				) {
					// Only redirect to dashboard if onboarding is confirmed complete
					logState('nav-effect:redirecting-to-dashboard');
					if (isDevMode) {
						layoutLog.debug(
							'User completed onboarding, redirecting to dashboard'
						);
					}
					try {
						router.replace('/(tabs)/dashboard');
					} catch (error) {
						layoutLog.warn('Failed to navigate to dashboard:', error);
					}
				} else if (
					hasSeenOnboarding === null &&
					loadingTimeout &&
					!inTabsGroup &&
					!inStackGroup &&
					!inOnboardingGroup
				) {
					// Timeout reached and status still null - assume completed for now to unblock
					logState('nav-effect:timeout-redirect');
					if (isDevMode) {
						layoutLog.debug(
							'Timeout reached with null onboarding status, redirecting to dashboard'
						);
					}
					try {
						router.replace('/(tabs)/dashboard');
					} catch (error) {
						layoutLog.warn('Failed to navigate to dashboard:', error);
					}
				}
			} else if (firebaseUser && !user) {
				if (!inAuthGroup) {
					try {
						router.replace('/(auth)/login');
					} catch (error) {
						layoutLog.warn('Failed to navigate to login:', error);
					}
				}
			} else {
				if (!inAuthGroup) {
					try {
						router.replace('/(auth)/login');
					} catch (error) {
						layoutLog.warn('Failed to navigate to login:', error);
					}
				}
			}
		} catch (error) {
			layoutLog.warn('Failed to handle navigation logic:', error);
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

	// Show spinner only while we're still genuinely loading AND we haven't timed out
	if (
		(loading && !loadingTimeout) ||
		(user && hasSeenOnboarding === null && !loadingTimeout)
	) {
		if (isDevMode) {
			layoutLog.debug('Rendering: loading screen');
		}
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
		if (isDevMode) {
			layoutLog.debug('Rendering: authenticated app');
		}
		try {
			return (
				<ProfileProvider>
					{isDevMode && (
						<View style={styles.devIndicator}>
							<Text style={styles.devText}>DEV MODE</Text>
						</View>
					)}
					{/* Always mount all providers to ensure onboarding screens have access */}
					<BudgetProvider>
						<GoalProvider>
							<RecurringExpenseProvider>
								<TransactionProvider>
									<TransactionModalProvider>
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
									</TransactionModalProvider>
								</TransactionProvider>
							</RecurringExpenseProvider>
						</GoalProvider>
					</BudgetProvider>
				</ProfileProvider>
			);
		} catch (error) {
			layoutLog.warn('Failed to render authenticated user layout:', error);
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
	if (isDevMode) {
		layoutLog.debug('Rendering: unauthenticated stack');
	}
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

				// Load feature flag overrides
				await loadLocalOverrides();

				// Log resolved feature flags for debugging
				const flags = getResolvedFlags();
				if (isDevMode) {
					layoutLog.debug('Resolved flags:', flags);
				}

				// Production safety check
				if (process.env.NODE_ENV === 'production') {
					if (flags.aiInsights) {
						layoutLog.error('AI Insights must be off in production');
					}
				}

				// Verify Firebase configuration
				try {
					const app = getApp();
					if (isDevMode) {
						layoutLog.debug('Firebase initialized successfully:', app.name);
						layoutLog.debug('Firebase project ID:', app.options.projectId);
					}
				} catch (firebaseError) {
					layoutLog.error('Firebase initialization failed:', firebaseError);
				}
			} catch (error) {
				layoutLog.warn('Failed to load fonts:', error);
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
						<AuthProvider>
							<NotificationProvider>
								<OnboardingProvider>
									<RootLayoutContent />
								</OnboardingProvider>
							</NotificationProvider>
						</AuthProvider>
					</ThemeProvider>
				</QueryClientProvider>
			</SafeAreaProvider>
		);
	} catch (error) {
		layoutLog.warn('Failed to render root layout:', error);
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
