import { Stack, useRouter, useSegments } from 'expo-router';
import React, { Suspense, useEffect, useState } from 'react';
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
	Platform,
} from 'react-native';
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

import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

// Import telemetry services
import { featureFlags } from '../src/services/feature/featureFlags';
import { crashReporting } from '../src/services/feature/crashReporting';

// Import utility services
import { actionQueueService } from '../src/services/utility/actionQueueService';

// Demo mode toggle - set to true to enable demo mode
const DEMO_MODE = true; // Enable demo mode for testing

// Development mode toggle - set to true to allow onboarding access after completion
const DEV_MODE = true; // Enable dev mode for testing onboarding

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

// OK to define the task at module scope
try {
	TaskManager.defineTask(
		BACKGROUND_NOTIFICATION_TASK,
		async ({ data, error, executionInfo }) => {
			try {
				// Do something with the notification data
				return {
					shouldShowBanner: true,
					shouldShowList: true,
					shouldPlaySound: false,
					shouldSetBadge: false,
				};
			} catch (taskError) {
				console.warn('[TaskManager] Background task failed:', taskError);
				return {
					shouldShowBanner: false,
					shouldShowList: false,
					shouldPlaySound: false,
					shouldSetBadge: false,
				};
			}
		}
	);
} catch (error) {
	console.warn('[TaskManager] Failed to define background task:', error);
}

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

		// Avoid running on web and avoid duplicate registration
		if (Platform.OS !== 'web') {
			(async () => {
				try {
					const already = await TaskManager.isTaskRegisteredAsync(
						BACKGROUND_NOTIFICATION_TASK
					);
					if (!already) {
						try {
							await Notifications.registerTaskAsync(
								BACKGROUND_NOTIFICATION_TASK
							);
						} catch (error) {
							console.warn('[Notifications] registerTaskAsync failed:', error);
						}
					}
				} catch (e) {
					console.warn('[Notifications] isTaskRegisteredAsync failed:', e);
				}
			})();
		}
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

	// Initialize telemetry services
	useEffect(() => {
		const initializeTelemetry = async () => {
			try {
				console.log('🚀 [Telemetry] Initializing services...');

				// Initialize feature flags first
				try {
					await featureFlags.initialize();
					console.log('🚩 [FeatureFlags] Initialized');
				} catch (error) {
					console.warn('🚩 [FeatureFlags] Failed to initialize:', error);
				}

				// Initialize crash reporting
				try {
					await crashReporting.initialize();
					console.log('🚨 [CrashReporting] Initialized');
				} catch (error) {
					console.warn('🚨 [CrashReporting] Failed to initialize:', error);
				}

				// Set user consent based on settings (you can integrate with user preferences)
				try {
					crashReporting.setUserConsent(true);
				} catch (error) {
					console.warn(
						'🚨 [CrashReporting] Failed to set user consent:',
						error
					);
				}

				// Initialize analytics
				console.log('📊 [Analytics] Initialized');

				// Test crash reporting in development
				if (__DEV__) {
					try {
						crashReporting.testCrashReporting();
						crashReporting.testCrashlytics();
					} catch (error) {
						console.warn(
							'🚨 [CrashReporting] Failed to test crash reporting:',
							error
						);
					}
				}

				console.log('🚀 [Telemetry] All services initialized successfully');
			} catch (error) {
				console.warn(
					'🚀 [Telemetry] Failed to initialize some services:',
					error
				);
			}
		};

		initializeTelemetry();
	}, []);

	useEffect(() => {
		try {
			if (!isMounted) return;
			if (DEMO_MODE) {
				// In dev mode, allow access to onboarding even in demo mode
				if (DEV_MODE && segments[0] === '(onboarding)') {
					// Allow staying on onboarding screens in dev mode
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
			if (loading || (user && hasSeenOnboarding === null)) return;
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

				if (!hasSeenOnboarding && !inOnboardingGroup) {
					try {
						router.replace('/(onboarding)/profileSetup');
					} catch (error) {
						console.warn('Failed to navigate to onboarding:', error);
					}
				} else if (
					hasSeenOnboarding &&
					!inTabsGroup &&
					!inStackGroup &&
					!inOnboardingGroup &&
					!DEV_MODE // Don't redirect away from onboarding in dev mode
				) {
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
	}, [user, firebaseUser, loading, hasSeenOnboarding, segments, isMounted]);

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

	if (loading || (user && hasSeenOnboarding === null)) {
		try {
			return (
				<View
					style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
				>
					<ActivityIndicator size="large" color="#007ACC" />
					<Text style={{ color: '#007ACC', marginTop: 10 }}>Loading...</Text>
				</View>
			);
		} catch (error) {
			console.warn('Failed to render loading screen:', error);
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

	// If user is authenticated, always wrap all screens in ProfileProvider
	if (firebaseUser && user) {
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
	try {
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
	} catch (error) {
		console.warn('Failed to render unauthenticated user layout:', error);
		// Fallback to basic loading screen
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
				<ActivityIndicator size="large" color="#007ACC" />
				<Text style={{ color: '#007ACC', marginTop: 10 }}>Loading...</Text>
			</View>
		);
	}
}

export default function RootLayout() {
	try {
		return (
			<QueryClientProvider client={queryClient}>
				{/* Default status bar configuration for the entire app */}
				<StatusBar barStyle="dark-content" backgroundColor="transparent" />
				<NotificationProvider>
					<AuthProvider>
						<OnboardingProvider>
							<RootLayoutContent />
						</OnboardingProvider>
					</AuthProvider>
				</NotificationProvider>
			</QueryClientProvider>
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
