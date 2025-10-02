// src/context/AuthContext.tsx
import React, {
	createContext,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { getApp } from '@react-native-firebase/app';
import { getItem, setItem, removeItem } from '../utils/safeStorage';
import * as Sentry from '@sentry/react-native';
import { UserService, User, Profile } from '../services';
import { ApiService } from '../services/core/apiService';
import { router } from 'expo-router';
import { SampleDataService } from '../services/feature/sampleDataService';
import { authService } from '../services/authService';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider } from '@react-native-firebase/auth';
import { configureGoogleSignIn } from '../config/googleSignIn';

// Error types for better error handling
export interface AuthError {
	code: string;
	message: string;
	details?: any;
}

export interface AuthState {
	isAuthenticated: boolean;
	isLoading: boolean;
	user: User | null;
	profile: Profile | null;
	firebaseUser: FirebaseAuthTypes.User | null;
	lastActivity: number;
	sessionTimeout: number;
}

export type AuthContextType = {
	// Core auth state
	user: User | null;
	profile: Profile | null;
	firebaseUser: FirebaseAuthTypes.User | null;
	loading: boolean;
	authState: AuthState;
	error: AuthError | null;

	// Auth methods
	login: (firebaseUser: FirebaseAuthTypes.User) => Promise<void>;
	logout: () => Promise<void>;
	signup: (email: string, password: string, name?: string) => Promise<void>;
	createUserInMongoDB: (
		firebaseUser: FirebaseAuthTypes.User,
		name?: string
	) => Promise<User>;

	// Google Sign-In methods
	signInWithGoogle: () => Promise<void>;
	signUpWithGoogle: () => Promise<void>;

	// Password management
	sendPasswordResetEmail: (email: string) => Promise<void>;
	confirmPasswordReset: (code: string, newPassword: string) => Promise<void>;
	updatePassword: (newPassword: string) => Promise<void>;

	// Account management
	deleteAccount: (password: string) => Promise<void>;
	refreshUserData: () => Promise<void>;

	// Security features
	checkSessionValidity: () => boolean;
	extendSession: () => void;
	clearError: () => void;

	// Utility methods
	isAuthenticated: () => boolean;
	getUserDisplayName: () => string;
};

export const AuthContext = createContext<AuthContextType | undefined>(
	undefined
);

// Keys for local storage fallbacks
const UID_KEY = 'firebaseUID';

export function AuthProvider({ children }: { children: React.ReactNode }) {
	console.log('🚨 [DEBUG] AuthProvider render - component re-rendering');

	const [firebaseUser, setFirebaseUser] =
		useState<FirebaseAuthTypes.User | null>(null);
	const [user, setUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<AuthError | null>(null);
	const lastProcessedUIDRef = useRef<string | null>(null);
	const processingTimeoutRef = useRef<number | null>(null);
	const isManualLoginRef = useRef(false);
	const [lastActivity, setLastActivity] = useState<number>(Date.now());
	const [sessionTimeout] = useState<number>(4 * 60 * 60 * 1000); // 4 hours

	const appState = useRef<AppStateStatus>(AppState.currentState);

	// Enhanced auth state
	const authState: AuthState = useMemo(() => {
		console.log('🚨 [DEBUG] authState useMemo recalculating with:', {
			user: !!user,
			loading,
			profile: !!profile,
			firebaseUser: !!firebaseUser,
			lastActivity,
			sessionTimeout,
		});
		return {
			isAuthenticated: !!firebaseUser,
			isLoading: loading,
			user,
			profile,
			firebaseUser,
			lastActivity,
			sessionTimeout,
		};
	}, [firebaseUser, loading, user, profile, lastActivity, sessionTimeout]);

	// Subscribe to auth state once
	useEffect(() => {
		console.log('🚨 [DEBUG] Auth useEffect triggered - setting up listeners');
		console.log('🚨 [DEBUG] Current state values:', {
			loading,
			user: !!user,
			profile: !!profile,
			firebaseUser: !!firebaseUser,
			processingTimeoutRef: processingTimeoutRef.current,
			lastProcessedUIDRef: lastProcessedUIDRef.current,
			isManualLoginRef: isManualLoginRef.current,
		});
		setLoading(true);

		// Configure Google Sign-In
		configureGoogleSignIn();

		// Define ensureUserExists inside useEffect to avoid dependency issues
		const ensureUserExistsLocal = async (fbUser: FirebaseAuthTypes.User) => {
			console.log('🚨 [DEBUG] ensureUserExistsLocal called');
			try {
				console.log(
					'🔍 [DEBUG] Ensuring user exists for Firebase UID:',
					fbUser.uid.substring(0, 8) + '...'
				);

				// First, try to get existing user
				let mongoUser = await UserService.getUserByFirebaseUID(fbUser.uid);

				if (!mongoUser) {
					// User doesn't exist, create them using the ensure endpoint
					console.log(
						'🔍 [DEBUG] User not found in database, creating new user...'
					);

					try {
						// Use the ensure endpoint to create the user
						const response = await ApiService.post<{
							user: User;
							profile: Profile;
						}>('/users/ensure', {
							firebaseUid: fbUser.uid,
							email: fbUser.email,
							displayName: fbUser.displayName,
						});

						if (response.success && response.data) {
							mongoUser = response.data.user;
							if (response.data.profile) {
								setProfile(response.data.profile);
							}
							console.log(
								'✅ [DEBUG] User and profile created successfully via ensure endpoint'
							);
						} else {
							throw new Error(
								response.error || 'Failed to create user via ensure endpoint'
							);
						}
					} catch (ensureError) {
						console.error(
							'❌ [DEBUG] Ensure endpoint failed, trying createUser:',
							ensureError
						);

						// Fallback to createUser method
						const createResponse = await UserService.createUser({
							firebaseUID: fbUser.uid,
							email: fbUser.email!,
							name: fbUser.displayName || undefined,
						});

						mongoUser = createResponse.user;
						setProfile(createResponse.profile);
						console.log(
							'✅ [DEBUG] User created successfully via createUser method'
						);
					}
				} else {
					console.log('✅ [DEBUG] Existing user found in database');
				}

				// Set the user in state
				console.log(
					'🔍 [DEBUG] Setting user state:',
					mongoUser ? `ID: ${mongoUser._id}` : 'null'
				);
				setUser(mongoUser);

				// Always try to fetch profile for existing users (don't depend on profile state)
				if (mongoUser) {
					try {
						console.log('🔍 [DEBUG] Fetching profile for user:', mongoUser._id);
						const profileResponse = await UserService.getProfileByUserId(
							mongoUser._id
						);
						if (profileResponse) {
							console.log(
								'🔍 [DEBUG] Setting profile state:',
								profileResponse._id
							);
							setProfile(profileResponse);
						} else {
							console.log('🔍 [DEBUG] No profile found for user');
						}
					} catch (profileError) {
						console.log(
							'🔍 [DEBUG] Profile fetch failed, continuing without profile:',
							profileError
						);
					}
				}
			} catch (e) {
				console.error('❌ Error ensuring user exists:', e);
				setError({
					code: 'USER_CREATION_ERROR',
					message: 'Failed to create or fetch user from database',
					details: e,
				});
				Sentry.captureException(e);
			}
		};

		// Define hydrateFromFirebase inside useEffect to avoid dependency issues
		const hydrateFromFirebaseLocal = async (
			fbUser: FirebaseAuthTypes.User | null
		) => {
			console.log(
				'🚨 [DEBUG] hydrateFromFirebaseLocal called with:',
				fbUser ? `UID: ${fbUser.uid.substring(0, 8)}...` : 'null'
			);
			try {
				if (fbUser) {
					// Persist UID for other parts of the app that expect it
					await setItem(UID_KEY, fbUser.uid).catch(() => undefined);

					// Ensure user exists in MongoDB (auto-provision)
					await ensureUserExistsLocal(fbUser);
				} else {
					await removeItem(UID_KEY).catch(() => undefined);
					setUser(null);
					setProfile(null);
				}
			} catch (err) {
				console.error('AuthContext - Error fetching user from MongoDB:', err);
				setUser(null);
				setProfile(null);
				setError({
					code: 'MONGO_FETCH_ERROR',
					message: 'Failed to fetch user data from database',
					details: err,
				});
				Sentry.captureException(err);
			}
		};

		const unsubAuth = auth().onAuthStateChanged(async (fbUser) => {
			console.log(
				'🔍 [DEBUG] Firebase auth state changed:',
				fbUser ? `UID: ${fbUser.uid.substring(0, 8)}...` : 'null'
			);
			console.log('🔍 [DEBUG] Current refs before processing:', {
				processingTimeoutRef: processingTimeoutRef.current,
				lastProcessedUIDRef: lastProcessedUIDRef.current,
				isManualLoginRef: isManualLoginRef.current,
			});

			// Skip processing if we're handling manual login
			if (isManualLoginRef.current) {
				console.log(
					'🔍 [DEBUG] Manual login in progress, skipping auth state change processing'
				);
				return;
			}

			// Prevent duplicate processing of the same user
			if (fbUser && lastProcessedUIDRef.current === fbUser.uid) {
				console.log(
					'🔍 [DEBUG] Same UID already processed, skipping duplicate MongoDB fetch'
				);
				return;
			}

			// Prevent rapid successive calls
			if (processingTimeoutRef.current) {
				console.log(
					'🔍 [DEBUG] Processing timeout active, skipping rapid call'
				);
				return;
			}

			console.log(
				'🔍 [DEBUG] Processing auth state change - calling setFirebaseUser'
			);
			setFirebaseUser(fbUser);

			console.log('🔍 [DEBUG] Calling hydrateFromFirebaseLocal');
			await hydrateFromFirebaseLocal(fbUser);

			// Mark this UID as processed
			if (fbUser) {
				console.log(
					'🔍 [DEBUG] Setting lastProcessedUIDRef and processing timeout'
				);
				lastProcessedUIDRef.current = fbUser.uid;
				// Set a timeout to prevent rapid successive calls
				const timeout = setTimeout(() => {
					console.log('🔍 [DEBUG] Processing timeout cleared');
					processingTimeoutRef.current = null;
				}, 1000);
				processingTimeoutRef.current = timeout;
			} else {
				console.log('🔍 [DEBUG] Clearing refs for logout');
				lastProcessedUIDRef.current = null;
				if (processingTimeoutRef.current) {
					clearTimeout(processingTimeoutRef.current);
					processingTimeoutRef.current = null;
				}
				// Clear auth token cache
				authService.clearToken();
			}

			console.log('🔍 [DEBUG] Setting loading to false');
			setLoading(false);
		});

		// Keep ID token fresh (useful for your HMAC + server auth flow)
		const unsubToken = auth().onIdTokenChanged(async (fbUser) => {
			if (!fbUser) return;
			try {
				await fbUser.getIdToken(true); // force refresh
			} catch (err) {
				Sentry.captureException(err);
			}
		});

		return () => {
			console.log('🚨 [DEBUG] Auth useEffect cleanup - removing listeners');
			unsubAuth();
			unsubToken();
			if (processingTimeoutRef.current) {
				clearTimeout(processingTimeoutRef.current);
			}
		};
	}, []); // ✅ Make completely stable - no dependencies

	// Refresh user data function
	const refreshUserData = useCallback(async (): Promise<void> => {
		console.log('🚨 [DEBUG] refreshUserData called');
		const currentFirebaseUser = auth().currentUser;
		if (!currentFirebaseUser) return;

		try {
			const mongoUser = await UserService.getUserByFirebaseUID(
				currentFirebaseUser.uid
			);
			if (mongoUser) {
				console.log('🚨 [DEBUG] refreshUserData setting user and profile');
				setUser(mongoUser);
				const userProfile = await UserService.getProfileByUserId(mongoUser._id);
				setProfile(userProfile);
			}
		} catch (error) {
			console.error('Error refreshing user data:', error);
			setError({
				code: 'REFRESH_ERROR',
				message: 'Failed to refresh user data',
				details: error,
			});
		}
	}, []); // Remove firebaseUser dependency to prevent infinite loop

	// Foreground refresh via AppState (RN-friendly replacement for any `document` visibility logic)
	useEffect(() => {
		console.log(
			'🚨 [DEBUG] AppState useEffect triggered with refreshUserData dependency'
		);
		const onChange = async (nextState: AppStateStatus) => {
			console.log(
				'🚨 [DEBUG] AppState changed from',
				appState.current,
				'to',
				nextState
			);
			const prev = appState.current;
			appState.current = nextState;
			if (prev.match(/inactive|background/) && nextState === 'active') {
				console.log('🚨 [DEBUG] App became active, refreshing user data');
				try {
					const fbUser = auth().currentUser;
					if (fbUser) {
						await fbUser.getIdToken(true);
						await refreshUserData();
					}
				} catch (err) {
					Sentry.captureException(err);
				}
			}
		};

		const sub = AppState.addEventListener('change', onChange);
		return () => {
			console.log('🚨 [DEBUG] AppState useEffect cleanup');
			sub.remove();
		};
	}, [refreshUserData]);

	// Cleanup effect for component unmount
	useEffect(() => {
		return () => {
			if (processingTimeoutRef.current) {
				clearTimeout(processingTimeoutRef.current);
			}
		};
	}, []);

	const createUserInMongoDB = useCallback(
		async (
			firebaseUser: FirebaseAuthTypes.User,
			name?: string
		): Promise<User> => {
			try {
				const userData = {
					firebaseUID: firebaseUser.uid,
					email: firebaseUser.email!,
					name: name || firebaseUser.displayName || undefined,
				};

				const response = await UserService.createUser(userData);
				setUser(response.user);
				setProfile(response.profile);
				await setItem(UID_KEY, firebaseUser.uid);
				return response.user;
			} catch (error) {
				console.error('Error creating user in MongoDB:', error);
				// Clear any partial state that might have been set
				setUser(null);
				setProfile(null);
				await removeItem(UID_KEY);
				throw error;
			}
		},
		[]
	);

	// Sample data seeding for demo mode
	const seedSampleData = async (userId: string) => {
		try {
			console.log('🎯 [DEMO] Starting sample data generation...');

			// Generate 90 days of sample data
			const endDate = new Date();
			const startDate = new Date();
			startDate.setDate(startDate.getDate() - 90);

			const sampleData = SampleDataService.generateSampleData({
				startDate,
				endDate,
				monthlyIncome: 6500,
				userName: 'Demo User',
			});

			console.log(
				`🎯 [DEMO] Generated ${sampleData.transactions.length} transactions, ${sampleData.budgets.length} budgets, ${sampleData.goals.length} goals`
			);

			// Store sample data in AsyncStorage for demo mode
			await setItem(
				'demo_transactions',
				JSON.stringify(sampleData.transactions)
			);
			await setItem('demo_budgets', JSON.stringify(sampleData.budgets));
			await setItem('demo_goals', JSON.stringify(sampleData.goals));
			await setItem(
				'demo_recurring',
				JSON.stringify(sampleData.recurringExpenses)
			);
			await setItem('demo_data_timestamp', new Date().toISOString());

			console.log('✅ [DEMO] Sample data stored in AsyncStorage');
		} catch (error) {
			console.error('❌ [DEMO] Error seeding sample data:', error);
			throw error;
		}
	};

	const refreshDemoData = useCallback(async (userId: string) => {
		try {
			const lastRefresh = await getItem('demo_data_timestamp');
			if (lastRefresh) {
				const lastRefreshDate = new Date(lastRefresh);
				const daysSinceRefresh =
					(Date.now() - lastRefreshDate.getTime()) / (1000 * 60 * 60 * 24);

				// Refresh data if it's older than 7 days
				if (daysSinceRefresh > 7) {
					console.log('🎯 [DEMO] Demo data is stale, refreshing...');
					await seedSampleData(userId);
				} else {
					console.log('🎯 [DEMO] Demo data is fresh, no refresh needed');
				}
			} else {
				// No timestamp found, seed fresh data
				console.log(
					'🎯 [DEMO] No demo data timestamp found, seeding fresh data...'
				);
				await seedSampleData(userId);
			}
		} catch (error) {
			console.error('❌ [DEMO] Error refreshing demo data:', error);
			throw error;
		}
	}, []);

	const login = useCallback(
		async (firebaseUser: FirebaseAuthTypes.User) => {
			try {
				// Set manual login flag to prevent auth state change interference
				isManualLoginRef.current = true;

				// Check if this is a demo login
				const isDemoLogin = firebaseUser.email === 'demo@brie.app';
				console.log(
					'🔍 [DEBUG] Login attempt:',
					isDemoLogin ? 'DEMO MODE' : 'Regular user'
				);

				// Store the Firebase UID
				await setItem(UID_KEY, firebaseUser.uid);

				// Check if user exists in MongoDB
				let mongoUser = await UserService.getUserByFirebaseUID(
					firebaseUser.uid
				);

				if (!mongoUser) {
					// User doesn't exist in MongoDB, create them
					console.log('🔍 [DEBUG] Creating new user in MongoDB...');
					const userData = {
						firebaseUID: firebaseUser.uid,
						email: firebaseUser.email!,
						name: firebaseUser.displayName || undefined,
					};

					const response = await UserService.createUser(userData);
					mongoUser = response.user;
					setUser(mongoUser);
					setProfile(response.profile);
					console.log('✅ [DEBUG] New user created in MongoDB');

					// Seed sample data for demo users
					if (isDemoLogin) {
						console.log('🎯 [DEMO] Seeding sample data for demo user...');
						try {
							await seedSampleData(mongoUser._id);
							console.log('✅ [DEMO] Sample data seeded successfully');
						} catch (seedError) {
							console.error('❌ [DEMO] Error seeding sample data:', seedError);
						}
					}
				} else {
					// User exists, fetch their profile
					console.log('🔍 [DEBUG] Existing user found in MongoDB');
					setUser(mongoUser);
					const userProfile = await UserService.getProfileByUserId(
						mongoUser._id
					);
					setProfile(userProfile);

					// Check if demo user needs sample data refresh
					if (isDemoLogin && mongoUser.email === 'demo@brie.app') {
						console.log('🎯 [DEMO] Checking if sample data needs refresh...');
						try {
							await refreshDemoData(mongoUser._id);
							console.log('✅ [DEMO] Demo data refreshed');
						} catch (refreshError) {
							console.error(
								'❌ [DEMO] Error refreshing demo data:',
								refreshError
							);
						}
					}
				}

				// Set loading to false to trigger navigation logic
				setLoading(false);
				console.log(
					'✅ Firebase login successful, UID stored, MongoDB user ready'
				);

				// Directly navigate to dashboard after successful login
				// Check if user has seen onboarding first
				if (mongoUser.onboardingVersion > 0) {
					console.log(
						'🔍 [DEBUG] User has seen onboarding, checking current route before navigation'
					);
					// Use setTimeout to ensure navigation stack is ready
					setTimeout(() => {
						try {
							// Check if we're already on a valid screen to prevent unwanted navigation
							const currentPath = router.canGoBack() ? 'unknown' : 'root';
							console.log('🔍 [DEBUG] Current navigation state:', {
								currentPath,
								canGoBack: router.canGoBack(),
							});

							// Only navigate if we're not already on a valid screen
							if (!router.canGoBack()) {
								router.replace('/(tabs)/dashboard');
								console.log('✅ Navigation to dashboard successful');
							} else {
								console.log(
									'🔍 [DEBUG] Already on a valid screen, skipping navigation'
								);
							}
						} catch (navError) {
							console.error('❌ Navigation error:', navError);
							// Only fallback if we're not already on a valid screen
							if (!router.canGoBack()) {
								router.replace('/(tabs)/dashboard');
							}
						}
					}, 100);
				} else {
					console.log(
						'🔍 [DEBUG] User needs onboarding, checking current route before navigation'
					);
					// Use setTimeout to ensure navigation stack is ready
					setTimeout(() => {
						try {
							// Check if we're already on a valid screen to prevent unwanted navigation
							const currentPath = router.canGoBack() ? 'unknown' : 'root';
							console.log('🔍 [DEBUG] Current navigation state:', {
								currentPath,
								canGoBack: router.canGoBack(),
							});

							// Only navigate if we're not already on a valid screen
							if (!router.canGoBack()) {
								router.replace('/(onboarding)/profileSetup');
								console.log('✅ Navigation to onboarding successful');
							} else {
								console.log(
									'🔍 [DEBUG] Already on a valid screen, skipping navigation'
								);
							}
						} catch (navError) {
							console.error('❌ Navigation error:', navError);
							// Only fallback if we're not already on a valid screen
							if (!router.canGoBack()) {
								router.replace('/(onboarding)/profileSetup');
							}
						}
					}, 100);
				}
			} catch (error) {
				console.error('Error during login:', error);
				setLoading(false);
				setError({
					code: 'LOGIN_ERROR',
					message: 'Failed to complete login process',
					details: error,
				});

				// If MongoDB operations fail, still allow login with Firebase
				// and let the auth state change listener handle navigation
				console.log(
					'⚠️ [DEBUG] MongoDB operations failed, falling back to Firebase-only auth'
				);

				// Create a minimal user object for navigation
				const fallbackUser = {
					_id: 'temp',
					firebaseUID: firebaseUser.uid,
					email: firebaseUser.email!,
					onboardingVersion: 0, // Assume they need onboarding
					createdAt: new Date().toISOString(),
				};
				setUser(fallbackUser as User);

				// Navigate to onboarding as fallback (only if not already on a valid screen)
				if (!router.canGoBack()) {
					router.replace('/(onboarding)/profileSetup');
				} else {
					console.log(
						'🔍 [DEBUG] Already on a valid screen, skipping fallback navigation'
					);
				}
			} finally {
				// Reset manual login flag
				isManualLoginRef.current = false;
			}
		},
		[refreshDemoData]
	);

	const logout = useCallback(async () => {
		try {
			await auth().signOut();
			setUser(null);
			setProfile(null);
			setFirebaseUser(null);
			lastProcessedUIDRef.current = null;
			setError(null); // Clear any existing errors
			if (processingTimeoutRef.current) {
				clearTimeout(processingTimeoutRef.current);
				processingTimeoutRef.current = null;
			}
			await removeItem(UID_KEY);
		} catch (error) {
			console.error('Error during logout:', error);
			setError({
				code: 'LOGOUT_ERROR',
				message: 'Failed to complete logout process',
				details: error,
			});
		}
	}, []);

	const sendPasswordResetEmailToUser = useCallback(async (email: string) => {
		try {
			console.log('🔍 Starting password reset process...');
			console.log('📧 Email:', email);
			console.log('🔥 Firebase Auth instance:', auth());
			console.log('🔥 Firebase Auth current user:', auth().currentUser);

			// Check if Firebase is properly initialized
			const authInstance = auth();
			if (!authInstance) {
				throw new Error('Firebase Auth is not initialized');
			}

			await authInstance.sendPasswordResetEmail(email);
			setError(null); // Clear any existing errors
		} catch (error: any) {
			console.error('❌ Error sending password reset email:', error);
			console.error('❌ Error details:', {
				message: error.message,
				code: error.code,
				stack: error.stack,
			});
			setError({
				code: 'PASSWORD_RESET_ERROR',
				message: 'Failed to send password reset email',
				details: error,
			});
			throw error;
		}
	}, []);

	const confirmPasswordResetCode = useCallback(
		async (code: string, newPassword: string) => {
			try {
				await auth().confirmPasswordReset(code, newPassword);
				setError(null); // Clear any existing errors
			} catch (error) {
				console.error('Error confirming password reset:', error);
				setError({
					code: 'PASSWORD_CONFIRM_ERROR',
					message: 'Failed to confirm password reset',
					details: error,
				});
				throw error;
			}
		},
		[]
	);

	const updatePasswordToUser = useCallback(async (newPassword: string) => {
		try {
			const currentUser = auth().currentUser;
			if (!currentUser) {
				throw new Error('No user is currently signed in');
			}
			await currentUser.updatePassword(newPassword);
			setError(null); // Clear any existing errors
		} catch (error) {
			console.error('Error updating password:', error);
			setError({
				code: 'PASSWORD_UPDATE_ERROR',
				message: 'Failed to update password',
				details: error,
			});
			throw error;
		}
	}, []);

	const signup = useCallback(
		async (email: string, password: string, name?: string) => {
			let firebaseUser: FirebaseAuthTypes.User | null = null;

			try {
				// Create user in Firebase first
				const userCredential = await auth().createUserWithEmailAndPassword(
					email,
					password
				);
				firebaseUser = userCredential.user;

				// Create user in MongoDB
				await createUserInMongoDB(firebaseUser, name);
			} catch (error: any) {
				console.error('Signup error:', error);

				// Handle specific Firebase errors
				if (error.code === 'auth/email-already-in-use') {
					// An account with this email already exists - don't log them in automatically
					const signupError = new Error(
						'An account with this email already exists. Please log in instead.'
					);
					setError({
						code: 'EMAIL_ALREADY_IN_USE',
						message: signupError.message,
						details: error,
					});
					throw signupError;
				}

				// If Firebase user was created but MongoDB creation failed, delete the Firebase user
				if (firebaseUser && error.code !== 'auth/email-already-in-use') {
					try {
						await firebaseUser.delete();
						console.log(
							'Cleaned up Firebase user after MongoDB creation failure'
						);
					} catch (deleteError) {
						console.error(
							'Error deleting Firebase user during cleanup:',
							deleteError
						);
					}
				}

				setError({
					code: 'SIGNUP_ERROR',
					message: 'Failed to create account',
					details: error,
				});
				throw error;
			}
		},
		[createUserInMongoDB]
	);

	// Google Sign-In methods
	const signInWithGoogle = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			// Check if your device supports Google Play
			await GoogleSignin.hasPlayServices({
				showPlayServicesUpdateDialog: true,
			});

			// Get the users ID token
			const { idToken } = await GoogleSignin.signIn();

			// Create a Google credential with the token
			const googleCredential = GoogleAuthProvider.credential(idToken);

			// Sign-in the user with the credential
			const userCredential = await auth().signInWithCredential(
				googleCredential
			);
			const firebaseUser = userCredential.user;

			// Use the existing login method to handle MongoDB user creation
			await login(firebaseUser);
		} catch (error: any) {
			console.error('Google Sign-In error:', error);

			// Handle user cancellation gracefully
			if (
				error.code === 'auth/internal-error' &&
				error.message?.includes('cancelled')
			) {
				console.log('Google Sign-In cancelled by user');
				return; // Exit silently without showing error
			}

			setError({
				code: 'GOOGLE_SIGNIN_ERROR',
				message: 'Failed to sign in with Google',
				details: error,
			});
			throw error;
		} finally {
			setLoading(false);
		}
	}, [login]);

	const signUpWithGoogle = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			console.log('🔐 Starting Google Sign-Up process...');

			// Ensure Google Sign-In is configured
			console.log('🔧 Ensuring Google Sign-In is configured...');
			configureGoogleSignIn();

			// Check if your device supports Google Play
			console.log('🔍 Checking Google Play Services...');
			await GoogleSignin.hasPlayServices({
				showPlayServicesUpdateDialog: true,
			});
			console.log('✅ Google Play Services available');

			// Sign out from any previous Google session to ensure clean state
			console.log('🔄 Signing out from any previous Google session...');
			try {
				await GoogleSignin.signOut();
			} catch (signOutError) {
				console.log('ℹ️ No previous Google session to sign out from');
			}

			// Get the users ID token
			console.log('🔑 Requesting Google Sign-In...');
			const { idToken, user } = await GoogleSignin.signIn();
			console.log('✅ Google Sign-In successful, user:', user?.email);

			if (!idToken) {
				throw new Error('No ID token received from Google Sign-In');
			}

			// Create a Google credential with the token
			console.log('🔐 Creating Firebase credential...');
			const googleCredential = GoogleAuthProvider.credential(idToken);

			// Sign-in the user with the credential
			console.log('🔥 Signing in with Firebase...');
			const userCredential = await auth().signInWithCredential(
				googleCredential
			);
			const firebaseUser = userCredential.user;
			console.log('✅ Firebase authentication successful:', firebaseUser.uid);

			// Use the existing login method to handle MongoDB user creation
			console.log('👤 Creating user profile...');
			await login(firebaseUser);
			console.log('✅ Google Sign-Up completed successfully');
		} catch (error: any) {
			console.error('❌ Google Sign-Up error:', error);
			console.error('Error code:', error.code);
			console.error('Error message:', error.message);

			// Handle user cancellation gracefully
			if (
				error.code === 'auth/internal-error' &&
				error.message?.includes('cancelled')
			) {
				console.log('Google Sign-Up cancelled by user');
				return; // Exit silently without showing error
			}

			// Handle specific error cases
			let errorMessage = 'Failed to sign up with Google';
			if (error.code === 'auth/network-request-failed') {
				errorMessage = 'Network error. Please check your internet connection.';
			} else if (error.code === 'auth/too-many-requests') {
				errorMessage = 'Too many attempts. Please try again later.';
			} else if (error.code === 'auth/invalid-credential') {
				errorMessage = 'Invalid Google credentials. Please try again.';
			}

			setError({
				code: 'GOOGLE_SIGNUP_ERROR',
				message: errorMessage,
				details: error,
			});
			throw error;
		} finally {
			setLoading(false);
		}
	}, [login]);

	const deleteAccount = useCallback(async (password: string) => {
		setLoading(true);
		try {
			const user = auth().currentUser;
			if (!user) throw new Error('No user is currently signed in');
			if (!user.email) throw new Error('User email is missing');

			// Re-authenticate
			const credential = auth.EmailAuthProvider.credential(
				user.email,
				password
			);
			await user.reauthenticateWithCredential(credential);

			// Delete backend data
			await UserService.deleteUserAccount();

			// Delete Firebase user
			await user.delete();

			// Clear AsyncStorage and context state
			await removeItem(UID_KEY);
			setUser(null);
			setProfile(null);
			setFirebaseUser(null);
			lastProcessedUIDRef.current = null;
			if (processingTimeoutRef.current) {
				clearTimeout(processingTimeoutRef.current);
				processingTimeoutRef.current = null;
			}
		} catch (error) {
			setError({
				code: 'DELETE_ACCOUNT_ERROR',
				message: 'Failed to delete account',
				details: error,
			});
			throw error;
		} finally {
			setLoading(false);
		}
	}, []);

	// Enhanced utility methods
	const isAuthenticated = useCallback((): boolean => {
		return !!firebaseUser && !!user;
	}, [firebaseUser, user]);

	const getUserDisplayName = useCallback((): string => {
		if (profile?.firstName && profile?.lastName) {
			return `${profile.firstName} ${profile.lastName}`;
		}
		if (firebaseUser?.displayName) return firebaseUser.displayName;
		if (firebaseUser?.email) return firebaseUser.email.split('@')[0];
		return 'User';
	}, [profile, firebaseUser]);

	const clearError = useCallback((): void => {
		setError(null);
	}, []);

	const checkSessionValidity = useCallback((): boolean => {
		const currentFirebaseUser = auth().currentUser;
		if (!currentFirebaseUser) return false;
		const now = Date.now();
		return now - lastActivity < sessionTimeout;
	}, [lastActivity, sessionTimeout]); // Remove firebaseUser dependency

	const extendSession = useCallback((): void => {
		setLastActivity(Date.now());
	}, []);

	// Session timeout effect
	useEffect(() => {
		console.log(
			'🚨 [DEBUG] Session timeout useEffect triggered with dependencies:',
			{
				firebaseUser: !!firebaseUser,
				lastActivity,
				sessionTimeout,
			}
		);
		if (!firebaseUser) return;

		const interval = setInterval(() => {
			if (!checkSessionValidity()) {
				console.log('Session expired, logging out...');
				logout();
			}
		}, 60000); // Check every minute

		return () => {
			console.log('🚨 [DEBUG] Session timeout useEffect cleanup');
			clearInterval(interval);
		};
	}, [
		firebaseUser,
		lastActivity,
		sessionTimeout,
		checkSessionValidity,
		logout,
	]);

	// Activity tracking effect - React Native compatible
	useEffect(() => {
		const handleActivity = () => {
			extendSession();
		};

		// Track user activity using AppState instead of document events
		const sub = AppState.addEventListener('change', (nextAppState) => {
			if (nextAppState === 'active') {
				handleActivity();
			}
		});

		return () => sub.remove();
	}, [extendSession]);

	const value = useMemo<AuthContextType>(
		() => ({
			// Core auth state
			user,
			profile,
			firebaseUser,
			loading,
			authState,
			error,

			// Auth methods
			login,
			logout,
			signup,
			createUserInMongoDB,

			// Google Sign-In methods
			signInWithGoogle,
			signUpWithGoogle,

			// Password management
			sendPasswordResetEmail: sendPasswordResetEmailToUser,
			confirmPasswordReset: confirmPasswordResetCode,
			updatePassword: updatePasswordToUser,

			// Account management
			deleteAccount,
			refreshUserData,

			// Security features
			checkSessionValidity,
			extendSession,
			clearError,

			// Utility methods
			isAuthenticated,
			getUserDisplayName,
		}),
		[
			user,
			profile,
			firebaseUser,
			loading,
			authState,
			error,
			login,
			logout,
			signup,
			createUserInMongoDB,
			signInWithGoogle,
			signUpWithGoogle,
			sendPasswordResetEmailToUser,
			confirmPasswordResetCode,
			updatePasswordToUser,
			deleteAccount,
			refreshUserData,
			checkSessionValidity,
			extendSession,
			clearError,
			isAuthenticated,
			getUserDisplayName,
		]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default function useAuth() {
	const context = React.useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
