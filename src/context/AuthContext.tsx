// src/context/AuthContext.tsx
import * as React from 'react';
import {
	createContext,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { getItem, setItem, removeItem } from '../utils/safeStorage';
import * as Sentry from '@sentry/react-native';
import { UserService, User, Profile } from '../services';
import { ApiService } from '../services/core/apiService';
import { authService } from '../services/authService';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
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
	deleteAccountAfterReauth: () => Promise<void>;
	reauthWithPassword: (password: string) => Promise<void>;
	reauthWithGoogle: () => Promise<void>;
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
	if (__DEV__) {
		console.log('🚨 [DEBUG] AuthProvider render - component re-rendering');
	}

	const [firebaseUser, setFirebaseUser] =
		useState<FirebaseAuthTypes.User | null>(null);
	const [user, setUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<AuthError | null>(null);
	const lastProcessedUIDRef = useRef<string | null>(null);
	const processingTimeoutRef = useRef<number | null>(null);
	const isManualLoginRef = useRef(false);
	const isReauthInProgressRef = useRef(false);
	const isGoogleSignInCancelledRef = useRef(false);
	const [lastActivity, setLastActivity] = useState<number>(Date.now());
	const [sessionTimeout] = useState<number>(4 * 60 * 60 * 1000); // 4 hours

	const appState = useRef<AppStateStatus>(AppState.currentState);

	// Enhanced auth state
	const authState: AuthState = useMemo(() => {
		if (__DEV__) {
			console.log('🚨 [DEBUG] authState useMemo recalculating with:', {
				user: !!user,
				loading,
				profile: !!profile,
				firebaseUser: !!firebaseUser,
				lastActivity,
				sessionTimeout,
			});
		}
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
		if (__DEV__) {
			console.log('🚨 [DEBUG] Auth useEffect triggered - setting up listeners');
			console.log('🚨 [DEBUG] Current state values:', {
				loading,
				user: !!user,
				profile: !!profile,
				firebaseUser: !!firebaseUser,
				processingTimeoutRef: processingTimeoutRef.current,
				lastProcessedUIDRef: lastProcessedUIDRef.current,
				isManualLoginRef: isManualLoginRef.current,
				isGoogleSignInCancelledRef: isGoogleSignInCancelledRef.current,
			});
		}
		setLoading(true);

		// Configure Google Sign-In
		configureGoogleSignIn();

		// Define ensureUserExists inside useEffect to avoid dependency issues
		const ensureUserExistsLocal = async (fbUser: FirebaseAuthTypes.User) => {
			if (__DEV__) {
				console.log('🟠 [AUTH-STATE] ===== ensureUserExistsLocal called =====');
				console.log(
					'🟠 [AUTH-STATE] Firebase UID:',
					fbUser.uid.substring(0, 12) + '...'
				);
			}
			try {
				// First, try to get existing user
				if (__DEV__) {
					console.log(
						'🟠 [AUTH-STATE] Step 1: Checking if MongoDB user exists...'
					);
				}
				let mongoUser = await UserService.getUserByFirebaseUID(fbUser.uid);

				if (!mongoUser) {
					// User doesn't exist, create them using the ensure endpoint
					if (__DEV__) {
						console.log(
							'🟡 [AUTH-STATE] MongoDB user NOT FOUND, attempting to create...'
						);
					}

					try {
						// Use the ensure endpoint to create the user
						if (__DEV__) {
							console.log('🟡 [AUTH-STATE] Calling /users/ensure endpoint...');
						}
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
							if (__DEV__) {
								console.log(
									'🟢 [AUTH-STATE] ✅ User created via /users/ensure endpoint!'
								);
							}
						} else {
							throw new Error(
								response.error || 'Failed to create user via ensure endpoint'
							);
						}
					} catch (ensureError) {
						if (__DEV__) {
							console.error(
								'🔴 [AUTH-STATE] ❌ /users/ensure failed:',
								ensureError
							);
						}

						// Fallback to createUser method
						if (__DEV__) {
							console.log('🟡 [AUTH-STATE] Trying createUser fallback...');
						}
						const createResponse = await UserService.createUser({
							firebaseUID: fbUser.uid,
							email: fbUser.email!,
							name: fbUser.displayName || undefined,
						});

						mongoUser = createResponse.user;
						setProfile(createResponse.profile);
						if (__DEV__) {
							console.log(
								'🟢 [AUTH-STATE] ✅ User created via createUser fallback!'
							);
						}
					}
				} else {
					if (__DEV__) {
						console.log(
							'🟢 [AUTH-STATE] ✅ MongoDB user EXISTS! ID:',
							mongoUser._id
						);
					}
				}

				// Set the user in state
				if (__DEV__) {
					console.log('🟠 [AUTH-STATE] Step 2: Setting user in state...');
				}
				setUser(mongoUser);

				// Always try to fetch profile for existing users (don't depend on profile state)
				if (mongoUser) {
					try {
						if (__DEV__) {
							console.log('🟠 [AUTH-STATE] Step 3: Fetching profile...');
						}
						const profileResponse = await UserService.getProfileByUserId(
							mongoUser._id
						);
						if (profileResponse) {
							if (__DEV__) {
								console.log(
									'🟢 [AUTH-STATE] ✅ Profile loaded!',
									profileResponse._id
								);
							}
							setProfile(profileResponse);
						} else {
							if (__DEV__) {
								console.log('🟡 [AUTH-STATE] No profile found for user');
							}
						}
					} catch (profileError) {
						if (__DEV__) {
							console.log(
								'🟡 [AUTH-STATE] Profile fetch failed:',
								profileError
							);
						}
					}
				}
				if (__DEV__) {
					console.log(
						'🟢 [AUTH-STATE] ===== ensureUserExistsLocal completed successfully ====='
					);
				}
			} catch (e: any) {
				if (__DEV__) {
					console.log('🟡 [AUTH-STATE] Could not verify user with server');
				}

				// Network timeouts and auth errors should be treated gracefully
				// Sign out to avoid orphaned Firebase accounts
				if (
					e?.message?.includes('timeout') ||
					e?.message?.includes('Aborted') ||
					e?.message?.includes('Network') ||
					e?.message?.includes('User account not found') ||
					e?.message?.includes('User not found') ||
					e?.message?.includes('Failed to create') ||
					e?.response?.status === 404 ||
					e?.response?.status === 408
				) {
					if (__DEV__) {
						console.log(
							'🟡 [AUTH-STATE] Network/timeout - signing out to prevent orphaned account'
						);
					}

					// Sign out of Firebase to clear orphaned state
					try {
						await auth().signOut();
						setFirebaseUser(null);
						setUser(null);
						setProfile(null);
						if (__DEV__) {
							console.log('🟡 [AUTH-STATE] Signed out successfully');
						}
					} catch (signOutError) {
						if (__DEV__) {
							console.warn('🟡 [AUTH-STATE] Failed to sign out:', signOutError);
						}
					}

					return;
				}

				// Only log truly unexpected errors
				if (__DEV__) {
					console.error('🔴 [AUTH-STATE] Unexpected error:', e?.message);
				}
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
			if (__DEV__) {
				console.log(
					'🚨 [DEBUG] hydrateFromFirebaseLocal called with:',
					fbUser ? `UID: ${fbUser.uid.substring(0, 8)}...` : 'null'
				);
			}
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

			// Skip processing if we're handling manual login, reauthentication, or cancelled Google Sign-In
			if (
				isManualLoginRef.current ||
				isReauthInProgressRef.current ||
				isGoogleSignInCancelledRef.current
			) {
				console.log(
					'🔍 [DEBUG] Manual login, reauthentication, or cancelled Google Sign-In in progress, skipping auth state change processing'
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

			// Skip orphaned account cleanup - let the Google sign-in flows handle this
			// The cleanup was too aggressive and interfered with the signup flow
			console.log('🔍 [DEBUG] Calling hydrateFromFirebaseLocal');

			// Add timeout protection to prevent infinite loading
			const timeoutPromise = new Promise<void>((resolve) => {
				setTimeout(() => {
					console.log('⏰ [DEBUG] hydrateFromFirebaseLocal timeout reached');
					resolve();
				}, 5000); // 5 second timeout (fast fail for better UX)
			});

			try {
				await Promise.race([hydrateFromFirebaseLocal(fbUser), timeoutPromise]);
			} catch (error) {
				console.error('🔴 [DEBUG] Error in hydrateFromFirebaseLocal:', error);
				// Don't throw - we still want to set loading to false
			}

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
		// Note: This is separate from onAuthStateChanged to avoid duplicate processing
		const unsubToken = auth().onIdTokenChanged(async (fbUser) => {
			if (!fbUser) return;
			try {
				// Only refresh token, don't trigger user processing
				await fbUser.getIdToken(true); // force refresh
				console.log('🔑 [DEBUG] ID token refreshed');
			} catch (err) {
				console.error('🔑 [DEBUG] Failed to refresh ID token:', err);
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Remove dependencies to prevent infinite loop

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
		} catch (error: any) {
			// Don't log orphaned account errors - these are expected
			if (
				error?.message?.includes('User not found') ||
				error?.message?.includes('User account not found')
			) {
				console.warn('⚠️ Refresh skipped - user not found (orphaned account)');
			} else {
				console.error('Error refreshing user data:', error);
				setError({
					code: 'REFRESH_ERROR',
					message: 'Failed to refresh user data',
					details: error,
				});
			}
		}
	}, []); // No dependencies needed - function uses current Firebase user directly

	// Foreground refresh via AppState (RN-friendly replacement for any `document` visibility logic)
	useEffect(() => {
		console.log(
			'🚨 [DEBUG] AppState useEffect triggered with refreshUserData dependency'
		);
		let lastRefreshTime = 0;
		const REFRESH_COOLDOWN = 60000; // Only refresh once per minute

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
				const now = Date.now();
				const timeSinceLastRefresh = now - lastRefreshTime;

				if (timeSinceLastRefresh < REFRESH_COOLDOWN) {
					console.log(
						`⏭️ [DEBUG] Skipping refresh, last refresh was ${timeSinceLastRefresh}ms ago`
					);
					return;
				}

				console.log('🚨 [DEBUG] App became active, refreshing user data');
				lastRefreshTime = now;
				try {
					const fbUser = auth().currentUser;
					if (fbUser) {
						// Only refresh token, don't refetch all user data
						await fbUser.getIdToken(true);
						// Skip refreshUserData() - cached data is sufficient
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
	}, []);

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

	const login = useCallback(async (firebaseUser: FirebaseAuthTypes.User) => {
		// Add timeout protection
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => {
				console.log('⏰ [DEBUG] Login timeout after 5s');
				reject(new Error('Login timeout'));
			}, 5000);
		});

		try {
			// Set manual login flag to prevent auth state change interference
			isManualLoginRef.current = true;

			console.log('🔍 [DEBUG] Login attempt: Regular user');

			// Race the login operation against timeout
			await Promise.race([
				(async () => {
					// Store the Firebase UID
					await setItem(UID_KEY, firebaseUser.uid);

					// Check if user exists in MongoDB
					let mongoUser;
					try {
						console.log('🔍 [DEBUG] Checking if MongoDB user exists...');
						mongoUser = await UserService.getUserByFirebaseUID(
							firebaseUser.uid
						);
						console.log('🔍 [DEBUG] MongoDB user found!');
					} catch (error: any) {
						// If user doesn't exist (404), that's okay - we'll create them
						if (
							error?.message?.includes('User not found') ||
							error?.message?.includes('User account not found') ||
							error?.message?.includes('timeout') ||
							error?.message?.includes('Aborted') ||
							error?.response?.status === 404 ||
							error?.response?.status === 408
						) {
							console.log(
								'🔍 [DEBUG] MongoDB user does not exist or timeout - will create'
							);
							mongoUser = null;
						} else {
							// Unexpected error - re-throw it
							throw error;
						}
					}

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
					} else {
						// User exists, fetch their profile
						console.log('🔍 [DEBUG] Existing user found in MongoDB');
						setUser(mongoUser);
						const userProfile = await UserService.getProfileByUserId(
							mongoUser._id
						);
						setProfile(userProfile);
					}

					// Set loading to false to trigger navigation logic
					setLoading(false);
					console.log(
						'✅ Firebase login successful, UID stored, MongoDB user ready'
					);
				})(),
				timeoutPromise,
			]);
		} catch (error: any) {
			// Handle timeout gracefully
			if (
				error?.message?.includes('Login timeout') ||
				error?.message?.includes('timeout') ||
				error?.message?.includes('Aborted')
			) {
				console.log('🟡 [DEBUG] Login timeout - will retry on next app open');
				setLoading(false);
				// Don't throw for timeout - just let the user try again
				return;
			}

			// Downgrade to warning for expected errors (orphaned accounts)
			if (
				error?.message?.includes('User not found') ||
				error?.message?.includes('User account not found')
			) {
				console.warn(
					'⚠️ Login failed - user not found (orphaned account):',
					error.message
				);
			} else {
				console.error('Error during login:', error);
			}

			setLoading(false);
			setError({
				code: 'LOGIN_ERROR',
				message: 'Failed to complete login process',
				details: error,
			});

			// Re-throw the error so the caller knows login failed
			console.log(
				'⚠️ [DEBUG] MongoDB operations failed - throwing error to caller'
			);
			throw error;
		} finally {
			// Reset manual login flag
			isManualLoginRef.current = false;
		}
	}, []);

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
			console.log('🔵 [SIGN-IN] ===== Starting Google Sign-In flow =====');
			setLoading(true);
			setError(null);
			isGoogleSignInCancelledRef.current = false;

			// Check if your device supports Google Play
			console.log('🔵 [SIGN-IN] Step 1: Checking Google Play Services...');
			await GoogleSignin.hasPlayServices({
				showPlayServicesUpdateDialog: true,
			});
			console.log('🔵 [SIGN-IN] Google Play Services OK');

			// Get the users ID token
			console.log('🔵 [SIGN-IN] Step 2: Getting Google ID token...');
			const signInResult = await GoogleSignin.signIn();
			let idToken: string | undefined;
			console.log('🔵 [SIGN-IN] Sign-in result type:', signInResult.type);

			if (signInResult.type === 'success' && signInResult.data) {
				idToken = signInResult.data.idToken || undefined;
				console.log('🔵 [SIGN-IN] Got ID token from success data');
			} else if (signInResult.type === 'cancelled') {
				console.log('🔵 [SIGN-IN] ❌ User cancelled sign-in');
				isGoogleSignInCancelledRef.current = true;
				setLoading(false);
				return; // Exit silently without showing error
			} else {
				// Handle other response types
				idToken = (signInResult as any).idToken || undefined;
				console.log('🔵 [SIGN-IN] Got ID token from direct access');
			}

			if (!idToken) {
				console.error('🔴 [SIGN-IN] ❌ No ID token received!');
				setError({
					code: 'GOOGLE_SIGNIN_ERROR',
					message: 'No ID token received from Google Sign-In',
					details: signInResult,
				});
				setLoading(false);
				throw new Error('No ID token received from Google Sign-In');
			}

			// Create a Google credential with the token
			console.log('🔵 [SIGN-IN] Step 3: Creating Firebase credential...');
			const googleCredential = auth.GoogleAuthProvider.credential(idToken);

			// Sign-in the user with the credential
			console.log('🔵 [SIGN-IN] Step 4: Signing in with Firebase...');
			const userCredential = await auth().signInWithCredential(
				googleCredential
			);
			const firebaseUser = userCredential.user;

			console.log(
				'🟢 [SIGN-IN] Firebase auth successful! UID:',
				firebaseUser.uid.substring(0, 12) + '...'
			);
			console.log('🔵 [SIGN-IN] Step 5: Checking if MongoDB user exists...');

			// Check if MongoDB user exists (regardless of Firebase's isNewUser flag)
			try {
				console.log('🔵 [SIGN-IN] Calling UserService.getUserByFirebaseUID...');
				const existingMongoUser = await UserService.getUserByFirebaseUID(
					firebaseUser.uid
				);

				if (existingMongoUser) {
					// User exists in both Firebase and MongoDB - proceed with login
					console.log(
						'🟢 [SIGN-IN] ✅ MongoDB user EXISTS! ID:',
						existingMongoUser._id
					);
					console.log('🔵 [SIGN-IN] Step 6: Calling login() function...');
					await login(firebaseUser);
					console.log('🟢 [SIGN-IN] ✅ Login completed successfully!');
					return;
				}
				console.log('🟡 [SIGN-IN] MongoDB query returned but no user found');
			} catch (error: any) {
				// User doesn't exist in MongoDB - this is okay, we'll create it
				console.log('🟡 [SIGN-IN] ⚠️ MongoDB user NOT FOUND:', error.message);
				console.log('🟡 [SIGN-IN] Error code:', error.code);
			}

			// No MongoDB user exists - ask user if they want to create an account
			console.log(
				'🟡 [SIGN-IN] Step 7: No MongoDB user - showing confirmation prompt...'
			);

			// Show confirmation prompt
			return new Promise<void>((resolve, reject) => {
				console.log('🟡 [SIGN-IN] Showing Alert dialog...');
				Alert.alert(
					'Create Account?',
					`No account found for ${
						firebaseUser.email || 'this Google account'
					}. Would you like to create a new account?`,
					[
						{
							text: 'Cancel',
							style: 'cancel',
							onPress: async () => {
								console.log('🔴 [SIGN-IN] ❌ User CANCELLED account creation');
								// Delete the Firebase user since they don't want to create an account
								try {
									console.log('🔴 [SIGN-IN] Deleting Firebase user...');
									await firebaseUser.delete();
									console.log('🔴 [SIGN-IN] Firebase user deleted');
								} catch (err) {
									console.warn(
										'🔴 [SIGN-IN] Failed to delete Firebase user:',
										err
									);
								}
								setLoading(false);
								reject(new Error('Account creation cancelled'));
							},
						},
						{
							text: 'Create Account',
							onPress: async () => {
								console.log('🟢 [SIGN-IN] ✅ User CONFIRMED account creation!');
								try {
									// Keep the Firebase user and create MongoDB user through login function
									console.log(
										'🟢 [SIGN-IN] Calling login() to create MongoDB user...'
									);
									await login(firebaseUser);
									console.log(
										'🟢 [SIGN-IN] ✅ Login completed! Account creation successful!'
									);
									resolve();
								} catch (err) {
									console.error(
										'🔴 [SIGN-IN] ❌ Fatal error during login():',
										err
									);
									console.error(
										'🔴 [SIGN-IN] Error details:',
										JSON.stringify(err)
									);
									// Delete Firebase user since account creation failed
									try {
										await firebaseUser.delete();
										console.log(
											'🔴 [SIGN-IN] Cleaned up Firebase user after failed creation'
										);
									} catch (deleteErr) {
										console.error(
											'🔴 [SIGN-IN] Failed to clean up Firebase user:',
											deleteErr
										);
									}
									setLoading(false);
									reject(err);
								}
							},
						},
					],
					{ cancelable: false }
				);
			});
		} catch (error: any) {
			console.error('🔴 [SIGN-IN] ❌ ERROR in signInWithGoogle:', error);
			console.error('🔴 [SIGN-IN] Error code:', error.code);
			console.error('🔴 [SIGN-IN] Error message:', error.message);

			// Handle user cancellation gracefully
			if (
				error.code === 'auth/internal-error' &&
				error.message?.includes('cancelled')
			) {
				console.log('Google Sign-In cancelled by user');
				isGoogleSignInCancelledRef.current = true;
				setLoading(false);
				return; // Exit silently without showing error
			}

			// Handle account creation cancellation gracefully
			if (error.message?.includes('Account creation cancelled')) {
				console.log('User declined account creation');
				setLoading(false);
				return; // Exit silently without showing error
			}

			setError({
				code: 'GOOGLE_SIGNIN_ERROR',
				message: 'Failed to sign in with Google',
				details: error,
			});
			setLoading(false);
			throw error;
		} finally {
			// Reset the cancellation flag after a delay to allow auth state changes to settle
			setTimeout(() => {
				isGoogleSignInCancelledRef.current = false;
			}, 1000);
		}
	}, [login]);

	const signUpWithGoogle = useCallback(async () => {
		try {
			console.log('🟣 [SIGN-UP] ===== Starting Google Sign-Up flow =====');
			setLoading(true);
			setError(null);
			isGoogleSignInCancelledRef.current = false;

			console.log('🟣 [SIGN-UP] Step 1: Starting Google Sign-Up process...');

			// Ensure Google Sign-In is configured
			console.log('🟣 [SIGN-UP] Step 2: Configuring Google Sign-In...');
			configureGoogleSignIn();

			// Check if your device supports Google Play
			console.log('🟣 [SIGN-UP] Step 3: Checking Google Play Services...');
			await GoogleSignin.hasPlayServices({
				showPlayServicesUpdateDialog: true,
			});
			console.log('🟣 [SIGN-UP] Google Play Services OK');

			// Sign out from any previous Google session to ensure clean state
			console.log(
				'🟣 [SIGN-UP] Step 4: Signing out from previous Google session...'
			);
			try {
				await GoogleSignin.signOut();
				console.log('🟣 [SIGN-UP] Previous session signed out');
			} catch {
				console.log('🟣 [SIGN-UP] No previous Google session to sign out from');
			}

			// Get the users ID token
			console.log(
				'🟣 [SIGN-UP] Step 5: Requesting Google Sign-In from user...'
			);
			const signInResult = await GoogleSignin.signIn();
			console.log('🟣 [SIGN-UP] Sign-In result type:', signInResult.type);

			// Handle the actual data structure returned by Google Sign-In
			let idToken, user, serverAuthCode;

			if (signInResult.type === 'success' && signInResult.data) {
				// Success case - data is in signInResult.data
				({ idToken, user, serverAuthCode } = signInResult.data);
				console.log('🟣 [SIGN-UP] Got data from success result');
			} else if (signInResult.type === 'cancelled') {
				// User cancelled - exit silently
				console.log('🟣 [SIGN-UP] ❌ User cancelled sign-in');
				isGoogleSignInCancelledRef.current = true;
				setLoading(false);
				return;
			} else {
				// Direct access for other cases
				({ idToken, user, serverAuthCode } = signInResult);
				console.log('🟣 [SIGN-UP] Got data from direct access');
			}
			console.log('🟣 [SIGN-UP] User email:', user?.email);
			console.log('🟣 [SIGN-UP] ID Token received:', idToken ? 'Yes' : 'No');

			if (!idToken) {
				console.error('🔴 [SIGN-UP] ❌ No ID token in sign-in result!');

				// Try to get the token separately
				console.log('🟣 [SIGN-UP] Attempting to get ID token separately...');
				try {
					const tokens = await GoogleSignin.getTokens();
					console.log('🟣 [SIGN-UP] Got tokens from getTokens()');
					if (tokens.idToken) {
						console.log('🟣 [SIGN-UP] ID token found in getTokens()');
						idToken = tokens.idToken;
					} else {
						throw new Error('No ID token received from Google Sign-In');
					}
				} catch (tokenError) {
					console.error('🔴 [SIGN-UP] ❌ Failed to get tokens:', tokenError);
					throw new Error('No ID token received from Google Sign-In');
				}
			}

			// Create a Google credential with the token
			console.log('🟣 [SIGN-UP] Step 6: Creating Firebase credential...');
			const googleCredential = auth.GoogleAuthProvider.credential(idToken);

			// Sign-in the user with the credential
			console.log('🟣 [SIGN-UP] Step 7: Signing in with Firebase...');
			const userCredential = await auth().signInWithCredential(
				googleCredential
			);
			const firebaseUser = userCredential.user;
			console.log(
				'🟣 [SIGN-UP] Firebase auth successful! UID:',
				firebaseUser.uid.substring(0, 12) + '...'
			);

			// Check if MongoDB user exists (regardless of Firebase's isNewUser flag)
			console.log(
				'🟣 [SIGN-UP] Step 8: Checking if MongoDB user already exists...'
			);
			try {
				console.log('🟣 [SIGN-UP] Calling UserService.getUserByFirebaseUID...');
				const existingMongoUser = await UserService.getUserByFirebaseUID(
					firebaseUser.uid
				);

				if (existingMongoUser) {
					// User already has a Brie account - direct them to login
					console.log(
						'🟡 [SIGN-UP] ⚠️ Account ALREADY EXISTS in MongoDB! ID:',
						existingMongoUser._id
					);
					console.log('🟡 [SIGN-UP] Signing out Firebase and showing alert...');
					await auth().signOut();
					setLoading(false);
					Alert.alert(
						'Account Already Exists',
						`An account with ${
							firebaseUser.email || 'this Google account'
						} already exists. Please use the Sign In screen instead.`,
						[{ text: 'OK' }]
					);
					return;
				}
				console.log('🟣 [SIGN-UP] MongoDB query returned but no user found');
			} catch (error: any) {
				// User doesn't exist in MongoDB - this is what we want for signup
				console.log(
					'🟢 [SIGN-UP] ✅ MongoDB user NOT FOUND (good for signup):',
					error.message
				);
			}

			// No MongoDB user exists - show confirmation prompt to create account
			console.log(
				'🟣 [SIGN-UP] Step 9: Showing confirmation prompt to create account...'
			);

			return new Promise<void>((resolve, reject) => {
				Alert.alert(
					'Create Account?',
					`Create a new Brie account with ${
						firebaseUser.email || 'this Google account'
					}?`,
					[
						{
							text: 'Cancel',
							style: 'cancel',
							onPress: async () => {
								console.log('❌ User cancelled account creation');
								// Delete the Firebase user since they don't want to create an account
								try {
									await firebaseUser.delete();
								} catch (err) {
									console.warn('Failed to delete Firebase user:', err);
								}
								setLoading(false);
								reject(
									Object.assign(new Error('Account creation cancelled'), {
										code: 'GOOGLE_SIGNUP_CANCELED',
									})
								);
							},
						},
						{
							text: 'Create Account',
							onPress: async () => {
								console.log('🟢 [SIGN-UP] ✅ User confirmed account creation');
								try {
									// Proceed with account creation
									console.log(
										'🟢 [SIGN-UP] Calling login() to create MongoDB user...'
									);
									await login(firebaseUser);
									console.log(
										'🟢 [SIGN-UP] ✅ Login completed! Account creation successful!'
									);
									resolve();
								} catch (err) {
									console.error(
										'🔴 [SIGN-UP] ❌ Fatal error during login():',
										err
									);
									console.error(
										'🔴 [SIGN-UP] Error details:',
										JSON.stringify(err)
									);
									// Delete Firebase user since account creation failed
									try {
										await firebaseUser.delete();
										console.log(
											'🔴 [SIGN-UP] Cleaned up Firebase user after failed creation'
										);
									} catch (deleteErr) {
										console.error(
											'🔴 [SIGN-UP] Failed to clean up Firebase user:',
											deleteErr
										);
									}
									setLoading(false);
									reject(err);
								}
							},
						},
					],
					{ cancelable: false }
				);
			});
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
				isGoogleSignInCancelledRef.current = true;
				setLoading(false);
				return; // Exit silently without showing error
			}

			// Handle account creation cancellation gracefully
			if (error.code === 'GOOGLE_SIGNUP_CANCELED') {
				console.log('User cancelled account creation');
				setLoading(false);
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
			setLoading(false);
			throw error;
		} finally {
			// Reset the cancellation flag after a delay to allow auth state changes to settle
			setTimeout(() => {
				isGoogleSignInCancelledRef.current = false;
			}, 1000);
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

	// Password reauthentication for account deletion
	const reauthWithPassword = useCallback(async (password: string) => {
		try {
			setError(null);
			isReauthInProgressRef.current = true;

			const currentUser = auth().currentUser;
			if (!currentUser) {
				throw Object.assign(new Error('No authenticated user'), {
					code: 'auth/no-current-user',
				});
			}
			if (!currentUser.email) {
				// Email/password reauth requires an email. If email is missing, this account is not a pure password account.
				throw Object.assign(new Error('Email not available for current user'), {
					code: 'auth/no-email',
				});
			}

			console.log('🔄 Starting password reauthentication...');

			// Create email/password credential using the correct react-native-firebase auth instance
			const credential = auth.EmailAuthProvider.credential(
				currentUser.email,
				password
			);
			await currentUser.reauthenticateWithCredential(credential);

			// Force refresh so providerData/state are up-to-date before delete
			await currentUser.reload();
			console.log('✅ Password reauthentication successful');
		} catch (error: any) {
			console.error('❌ Password reauthentication error:', error);
			// Normalize common errors for UI
			const normalized = {
				code: error?.code || 'auth/reauth-failed',
				message:
					error?.code === 'auth/wrong-password'
						? 'Incorrect password.'
						: error?.code === 'auth/user-mismatch'
						? 'This credential does not match the current user.'
						: error?.message || 'Failed to reauthenticate.',
				details: error,
			};
			setError(normalized);
			throw Object.assign(new Error(normalized.message), {
				code: normalized.code,
			});
		} finally {
			isReauthInProgressRef.current = false;
		}
	}, []);

	// Google reauthentication for account deletion
	const reauthWithGoogle = useCallback(async () => {
		try {
			setError(null);
			isReauthInProgressRef.current = true;

			console.log('🔄 Starting Google reauthentication...');

			// 1) Configure and sign-in to get an ID token
			configureGoogleSignIn();

			// Check if your device supports Google Play
			await GoogleSignin.hasPlayServices({
				showPlayServicesUpdateDialog: true,
			});

			// Sign out from any previous Google session to ensure clean state
			try {
				await GoogleSignin.signOut();
			} catch {
				console.log('ℹ️ No previous Google session to sign out from');
			}

			// Get the users ID token
			const signInResult = await GoogleSignin.signIn();
			console.log('📋 Google reauth result:', signInResult);

			// Handle the actual data structure returned by Google Sign-In
			let idToken;

			if (signInResult.type === 'success' && signInResult.data) {
				// Success case - data is in signInResult.data
				({ idToken } = signInResult.data);
			} else if (signInResult.type === 'cancelled') {
				throw Object.assign(
					new Error('Google reauthentication was cancelled'),
					{ code: 'auth/popup-closed-by-user' }
				);
			} else {
				// Direct access for other cases
				({ idToken } = signInResult);
			}

			if (!idToken) {
				// Try to get the token separately
				console.log('🔄 Attempting to get ID token separately...');
				const tokens = await GoogleSignin.getTokens();
				if (tokens.idToken) {
					idToken = tokens.idToken;
				} else {
					throw Object.assign(
						new Error('No ID token received from Google reauthentication'),
						{ code: 'auth/no-id-token' }
					);
				}
			}

			// 2) Use RN Firebase's auth.GoogleAuthProvider
			const googleCredential = auth.GoogleAuthProvider.credential(idToken);

			const currentUser = auth().currentUser;
			if (!currentUser) {
				throw Object.assign(new Error('No authenticated user'), {
					code: 'auth/no-current-user',
				});
			}

			await currentUser.reauthenticateWithCredential(googleCredential);
			await currentUser.reload(); // Force refresh to maintain "recent login" state
			console.log('✅ Google reauthentication successful');
		} catch (error: any) {
			console.error('❌ Google reauthentication error:', error);
			const normalized = {
				code: error?.code || 'auth/google-reauth-failed',
				message:
					error?.code === 'auth/popup-closed-by-user'
						? 'Verification was cancelled.'
						: error?.message || 'Failed to reauthenticate with Google.',
				details: error,
			};
			setError(normalized);
			throw Object.assign(new Error(normalized.message), {
				code: normalized.code,
			});
		} finally {
			isReauthInProgressRef.current = false;
		}
	}, []);

	// Delete account after reauthentication (for Google/Apple users)
	const deleteAccountAfterReauth = useCallback(async () => {
		setLoading(true);
		try {
			const user = auth().currentUser;
			if (!user)
				throw Object.assign(new Error('No user signed in'), {
					code: 'auth/no-current-user',
				});

			// 1) Delete app backend data
			await UserService.deleteUserAccount();

			// 2) Delete Firebase user (must be within "recent login" window)
			await user.delete();

			// 3) Local cleanup
			await removeItem(UID_KEY);
			setUser(null);
			setProfile(null);
			setFirebaseUser(null);
			lastProcessedUIDRef.current = null;
			if (processingTimeoutRef.current) {
				clearTimeout(processingTimeoutRef.current);
				processingTimeoutRef.current = null;
			}
		} catch (error: any) {
			const normalized = {
				code: error?.code || 'auth/delete-failed',
				message:
					error?.code === 'auth/requires-recent-login'
						? 'Please verify your identity again and retry.'
						: 'Failed to delete account.',
				details: error,
			};
			setError(normalized);
			throw Object.assign(new Error(normalized.message), {
				code: normalized.code,
			});
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
	}, [lastActivity, sessionTimeout]); // No firebaseUser dependency needed - uses current user directly

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
			deleteAccountAfterReauth,
			reauthWithPassword,
			reauthWithGoogle,
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
			deleteAccountAfterReauth,
			reauthWithPassword,
			reauthWithGoogle,
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
