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
import { AppState, AppStateStatus } from 'react-native';
import {
	FirebaseAuthTypes,
	getAuth,
	onAuthStateChanged,
	onIdTokenChanged,
	getIdToken,
	signOut,
	GoogleAuthProvider,
	EmailAuthProvider,
} from '@react-native-firebase/auth';
import { isDevMode } from '../config/environment';
import { setItem, removeItem } from '../utils/safeStorage';
import * as Sentry from '@sentry/react-native';
import { UserService, User, Profile } from '../services';
import { ApiService } from '../services/core/apiService';
import { authService } from '../services/authService';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { configureGoogleSignIn } from '../config/googleSignIn';
import { createLogger } from '../utils/sublogger';

const authContextLog = createLogger('AuthContext');

// Use modular getAuth() directly where needed

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

export type DeleteAccountOptions = {
	password?: string;
};

export type AuthContextType = {
	// Core auth state
	user: User | null;
	profile: Profile | null;
	firebaseUser: FirebaseAuthTypes.User | null;
	loading: boolean;
	authState: AuthState;
	error: AuthError | null;
	authProviderId: string | null; // 'password', 'google.com', 'apple.com', etc.

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

	// Account linking
	linkPassword: (email: string, password: string) => Promise<void>;

	// Password management
	sendPasswordResetEmail: (email: string) => Promise<void>;
	confirmPasswordReset: (code: string, newPassword: string) => Promise<void>;
	updatePassword: (newPassword: string) => Promise<void>;

	// Account management
	deleteAccount: (password: string) => Promise<void>;
	deleteAccountAfterReauth: () => Promise<void>;
	deleteAccountFlow: (options?: DeleteAccountOptions) => Promise<void>;
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

// Helper to get human-readable auth provider name
export const getAuthProviderName = (providerId: string | null): string => {
	switch (providerId) {
		case 'password':
			return 'Email & Password';
		case 'google.com':
			return 'Google';
		case 'apple.com':
			return 'Apple';
		default:
			return 'Your account';
	}
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
	// Note: Removed render log to reduce noise - use React DevTools Profiler instead

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
	const isGoogleSignInInProgressRef = useRef(false);
	const [lastActivity, setLastActivity] = useState<number>(Date.now());
	const [sessionTimeout] = useState<number>(4 * 60 * 60 * 1000); // 4 hours

	const appState = useRef<AppStateStatus>(AppState.currentState);

	// Enhanced auth state
	const authState: AuthState = useMemo(() => {
		authContextLog.debug('authState useMemo recalculating', {
			hasUser: !!user,
			loading,
			hasProfile: !!profile,
			hasFirebaseUser: !!firebaseUser,
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

	// Determine the primary auth provider ID
	const authProviderId = useMemo(() => {
		return firebaseUser?.providerData?.[0]?.providerId ?? null;
	}, [firebaseUser]);

	// Subscribe to auth state once
	useEffect(() => {
		authContextLog.debug('Auth useEffect triggered - setting up listeners', {
			loading,
			hasUser: !!user,
			hasProfile: !!profile,
			hasFirebaseUser: !!firebaseUser,
			processingTimeoutRef: processingTimeoutRef.current,
			lastProcessedUID: lastProcessedUIDRef.current,
			isManualLogin: isManualLoginRef.current,
			isGoogleSignInCancelled: isGoogleSignInCancelledRef.current,
		});
		setLoading(true);

		// Configure Google Sign-In
		configureGoogleSignIn();

		// Define ensureUserExists inside useEffect to avoid dependency issues
		const ensureUserExistsLocal = async (fbUser: FirebaseAuthTypes.User) => {
			authContextLog.debug('ensureUserExistsLocal called', {
				firebaseUid: fbUser.uid.substring(0, 12) + '...',
			});
			try {
				// First, try to get existing user
				authContextLog.debug('Step 1: Checking if MongoDB user exists');
				let mongoUser = await UserService.getUserByFirebaseUID(fbUser.uid);

				if (!mongoUser) {
					// User doesn't exist, create them using the ensure endpoint
					authContextLog.debug('MongoDB user NOT FOUND, attempting to create');

					try {
						// Use the ensure endpoint to create the user
						authContextLog.debug('Calling /users/ensure endpoint');
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
							authContextLog.info('User created via /users/ensure endpoint');
						} else {
							throw new Error(
								response.error || 'Failed to create user via ensure endpoint'
							);
						}
					} catch (ensureError) {
						authContextLog.error('/users/ensure failed', ensureError);

						// Fallback to createUser method
						authContextLog.debug('Trying createUser fallback');
						const createResponse = await UserService.createUser({
							firebaseUID: fbUser.uid,
							email: fbUser.email!,
							name: fbUser.displayName || undefined,
						});

						mongoUser = createResponse.user;
						setProfile(createResponse.profile);
						authContextLog.info('User created via createUser fallback');
					}
				} else {
					authContextLog.debug('MongoDB user EXISTS', {
						userId: mongoUser._id,
					});
				}

				// Set the user in state
				authContextLog.debug('Step 2: Setting user in state');
				setUser(mongoUser);

				// Always try to fetch profile for existing users (don't depend on profile state)
				if (mongoUser) {
					try {
						authContextLog.debug('Step 3: Fetching profile');
						const profileResponse = await UserService.getProfileByUserId(
							mongoUser._id
						);
						if (profileResponse) {
							authContextLog.debug('Profile loaded', {
								profileId: profileResponse._id,
							});
							setProfile(profileResponse);
						} else {
							authContextLog.debug('No profile found for user');
						}
					} catch (profileError: any) {
						// Profile fetch failure shouldn't break authentication
						// User is still authenticated and can use the app
						authContextLog.debug('Profile fetch failed', {
							error: profileError?.message || profileError,
							type: profileError?.type || profileError?.name,
							code: profileError?.code,
						});
						// Continue without profile - it can be fetched later or created if needed
						// Don't throw - user is still authenticated
					}
				}
				authContextLog.debug('ensureUserExistsLocal completed successfully');
			} catch (e: any) {
				// Check if this is a network/timeout error (should NOT sign out)
				const isNetworkError =
					e?.message?.includes('timeout') ||
					e?.message?.includes('Aborted') ||
					e?.message?.includes('Network') ||
					e?.response?.status === 408;

				// Check if this is a user not found error (expected after account deletion)
				const isUserNotFoundError =
					e?.message?.includes('User account not found') ||
					e?.message?.includes('User not found') ||
					e?.response?.status === 404;

				// For network errors, don't sign out - allow user to continue with Firebase auth
				// The app should work offline with cached Firebase auth state
				if (isNetworkError) {
					authContextLog.warn(
						'Network/timeout error - keeping Firebase auth state, will retry later'
					);
					// Don't sign out - Firebase auth is still valid
					// Just set loading to false so the app can continue
					setLoading(false);
					return;
				}

				// For user not found errors, check if Firebase user still exists
				// If it does, this likely means the account was deleted, so we should sign out
				// UNLESS we're in the middle of a Google sign-in flow (new user signup)
				if (isUserNotFoundError) {
					// Check if Firebase user still exists (might be a race condition after deletion)
					const currentFirebaseUser = getAuth().currentUser;
					if (currentFirebaseUser && currentFirebaseUser.uid === fbUser.uid) {
						// If Google sign-in is in progress, don't sign out - this is a new user signup
						if (isGoogleSignInInProgressRef.current) {
							authContextLog.debug(
								'User not found in MongoDB but Google sign-in in progress - skipping sign-out (new user signup)'
							);
							// Don't sign out - let the sign-in flow handle account creation
							setLoading(false);
							return;
						}

						// Firebase user exists but MongoDB user doesn't - account was likely deleted
						authContextLog.debug(
							'User not found in MongoDB but Firebase user exists - signing out (likely after account deletion)'
						);
						// Sign out to clear the orphaned Firebase auth state
						// Note: Firebase user may already be deleted by backend, so signOut might fail
						try {
							await signOut(getAuth());
							authContextLog.debug(
								'Successfully signed out after user not found'
							);
						} catch (signOutError: any) {
							// If signOut fails (e.g., user already deleted), that's expected
							// Just clear local state
							if (
								signOutError?.code === 'auth/user-not-found' ||
								signOutError?.message?.includes('user-not-found')
							) {
								authContextLog.debug(
									'Firebase user already deleted (expected after account deletion)'
								);
							} else {
								authContextLog.debug('Error signing out after user not found', {
									code: signOutError?.code,
									message: signOutError?.message,
								});
							}
						} finally {
							// Always clear local state regardless of signOut result
							setUser(null);
							setProfile(null);
							setFirebaseUser(null);
							lastProcessedUIDRef.current = null;
							await removeItem(UID_KEY).catch(() => undefined);
						}
						setLoading(false);
						return;
					}

					// Firebase user doesn't exist either - this is expected after deletion or during app startup
					authContextLog.debug(
						'User not found in MongoDB - expected after account deletion or during app startup'
					);
					// Clear any stale state
					setUser(null);
					setProfile(null);
					setLoading(false);
					return;
				}

				// For other errors (like "Failed to create"), log but don't sign out
				// Only sign out on truly critical errors that indicate auth is invalid
				authContextLog.warn('Could not verify user with server', {
					message: e?.message,
					code: e?.code,
					type: e?.type || 'SERVER_ERROR',
					status: e?.status,
					name: e?.name,
				});
				setError({
					code: 'USER_CREATION_ERROR',
					message: 'Failed to create or fetch user from database',
					details: e,
				});
				// Don't sign out - allow user to retry or continue with Firebase auth
				setLoading(false);
				Sentry.captureException(e);
			}
		};

		// Define hydrateFromFirebase inside useEffect to avoid dependency issues
		const hydrateFromFirebaseLocal = async (
			fbUser: FirebaseAuthTypes.User | null
		) => {
			authContextLog.debug('hydrateFromFirebaseLocal called', {
				hasUser: !!fbUser,
				uid: fbUser ? fbUser.uid.substring(0, 8) + '...' : null,
			});
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
				authContextLog.error('Error fetching user from MongoDB', err);
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

		const unsubAuth = onAuthStateChanged(getAuth(), async (fbUser) => {
			if (isDevMode) {
				authContextLog.debug('Firebase auth state changed', {
					uid: fbUser ? fbUser.uid.substring(0, 8) + '...' : 'null',
					processingTimeoutRef: processingTimeoutRef.current,
					lastProcessedUIDRef: lastProcessedUIDRef.current,
					isManualLoginRef: isManualLoginRef.current,
				});
			}

			// Skip processing if we're handling manual login, reauthentication, or cancelled Google Sign-In
			if (
				isManualLoginRef.current ||
				isReauthInProgressRef.current ||
				isGoogleSignInCancelledRef.current
			) {
				authContextLog.debug(
					'Manual login, reauthentication, or cancelled Google Sign-In in progress, skipping auth state change processing'
				);
				return;
			}

			// Prevent duplicate processing of the same user
			if (fbUser && lastProcessedUIDRef.current === fbUser.uid) {
				authContextLog.debug(
					'Same UID already processed, skipping duplicate MongoDB fetch'
				);
				return;
			}

			// Prevent rapid successive calls
			if (processingTimeoutRef.current) {
				authContextLog.debug('Processing timeout active, skipping rapid call');
				return;
			}

			authContextLog.debug(
				'Processing auth state change - calling setFirebaseUser'
			);
			setFirebaseUser(fbUser);

			// Skip orphaned account cleanup - let the Google sign-in flows handle this
			// The cleanup was too aggressive and interfered with the signup flow
			authContextLog.debug('Calling hydrateFromFirebaseLocal');

			// Add timeout protection to prevent infinite loading
			const timeoutPromise = new Promise<void>((resolve) => {
				setTimeout(() => {
					authContextLog.debug('hydrateFromFirebaseLocal timeout reached');
					resolve();
				}, 5000); // 5 second timeout (fast fail for better UX)
			});

			try {
				await Promise.race([hydrateFromFirebaseLocal(fbUser), timeoutPromise]);
			} catch (error) {
				authContextLog.error('Error in hydrateFromFirebaseLocal', error);
				// Don't throw - we still want to set loading to false
			}

			// Mark this UID as processed
			if (fbUser) {
				authContextLog.debug(
					'Setting lastProcessedUIDRef and processing timeout'
				);
				lastProcessedUIDRef.current = fbUser.uid;
				// Set a timeout to prevent rapid successive calls
				const timeout = setTimeout(() => {
					authContextLog.debug('Processing timeout cleared');
					processingTimeoutRef.current = null;
				}, 1000);
				processingTimeoutRef.current = timeout;
			} else {
				authContextLog.debug('Clearing refs for logout');
				lastProcessedUIDRef.current = null;
				if (processingTimeoutRef.current) {
					clearTimeout(processingTimeoutRef.current);
					processingTimeoutRef.current = null;
				}
				// Clear auth token cache
				authService.clearToken();
			}

			authContextLog.debug('Setting loading to false');
			setLoading(false);
		});

		// Keep ID token fresh (useful for your HMAC + server auth flow)
		// Note: This is separate from onAuthStateChanged to avoid duplicate processing

		const unsubToken = onIdTokenChanged(getAuth(), async (fbUser) => {
			if (!fbUser) return;
			try {
				// Only refresh token, don't trigger user processing
				await getIdToken(fbUser, true); // force refresh
				if (isDevMode) {
					authContextLog.debug('ID token refreshed');
				}
			} catch (err) {
				authContextLog.error('Failed to refresh ID token', err);
				Sentry.captureException(err);
			}
		});

		return () => {
			authContextLog.debug('Auth useEffect cleanup - removing listeners');
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
		if (isDevMode) {
			authContextLog.debug('refreshUserData called');
		}
		const currentFirebaseUser = getAuth().currentUser;
		if (!currentFirebaseUser) return;

		try {
			const mongoUser = await UserService.getUserByFirebaseUID(
				currentFirebaseUser.uid
			);
			if (mongoUser) {
				authContextLog.debug('refreshUserData setting user and profile');
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
				authContextLog.warn(
					'Refresh skipped - user not found (orphaned account)'
				);
			} else {
				authContextLog.error('Error refreshing user data', error);
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
		authContextLog.debug(
			'AppState useEffect triggered with refreshUserData dependency'
		);
		let lastRefreshTime = 0;
		const REFRESH_COOLDOWN = 60000; // Only refresh once per minute

		const onChange = async (nextState: AppStateStatus) => {
			authContextLog.debug('AppState changed', {
				from: appState.current,
				to: nextState,
			});
			const prev = appState.current;
			appState.current = nextState;
			if (prev.match(/inactive|background/) && nextState === 'active') {
				const now = Date.now();
				const timeSinceLastRefresh = now - lastRefreshTime;

				if (timeSinceLastRefresh < REFRESH_COOLDOWN) {
					authContextLog.debug('Skipping refresh', { timeSinceLastRefresh });
					return;
				}

				authContextLog.debug('App became active, refreshing user data');
				lastRefreshTime = now;
				try {
					const fbUser = getAuth().currentUser;
					if (fbUser) {
						// Only refresh token, don't refetch all user data
						await getIdToken(fbUser, true);
						// Skip refreshUserData() - cached data is sufficient
					}
				} catch (err) {
					Sentry.captureException(err);
				}
			}
		};

		const sub = AppState.addEventListener('change', onChange);
		return () => {
			authContextLog.debug('AppState useEffect cleanup');
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
				authContextLog.error('Error creating user in MongoDB', error);
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
				authContextLog.warn('Login timeout after 5s');
				reject(new Error('Login timeout'));
			}, 5000);
		});

		try {
			// Set manual login flag to prevent auth state change interference
			isManualLoginRef.current = true;

			// Set firebaseUser immediately since auth state listener won't do it during manual login
			setFirebaseUser(firebaseUser);

			authContextLog.debug('Login attempt: Regular user');

			// Race the login operation against timeout
			await Promise.race([
				(async () => {
					// Store the Firebase UID
					await setItem(UID_KEY, firebaseUser.uid);

					// Check if user exists in MongoDB
					let mongoUser;
					try {
						authContextLog.debug('Checking if MongoDB user exists');
						mongoUser = await UserService.getUserByFirebaseUID(
							firebaseUser.uid
						);
						authContextLog.debug('MongoDB user found');
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
							authContextLog.debug(
								'MongoDB user does not exist or timeout - will create'
							);
							mongoUser = null;
						} else {
							// Unexpected error - re-throw it
							throw error;
						}
					}

					if (!mongoUser) {
						// User doesn't exist in MongoDB, create them
						authContextLog.debug('Creating new user in MongoDB');
						const userData = {
							firebaseUID: firebaseUser.uid,
							email: firebaseUser.email!,
							name: firebaseUser.displayName || undefined,
						};

						const response = await UserService.createUser(userData);
						mongoUser = response.user;
						setUser(mongoUser);
						setProfile(response.profile);
						authContextLog.info('New user created in MongoDB');
					} else {
						// User exists, fetch their profile
						authContextLog.debug('Existing user found in MongoDB');
						setUser(mongoUser);
						try {
							const userProfile = await UserService.getProfileByUserId(
								mongoUser._id
							);
							if (userProfile) {
								setProfile(userProfile);
							}
						} catch (profileError: any) {
							// Profile fetch failure shouldn't break login
							// User is still authenticated and can use the app
							authContextLog.debug('Profile fetch failed during login', {
								error: profileError?.message || profileError,
								type: profileError?.type || profileError?.name,
							});
							// Continue without profile - it can be fetched later
						}
					}

					// Set loading to false to trigger navigation logic
					setLoading(false);
					authContextLog.info(
						'Firebase login successful, UID stored, MongoDB user ready'
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
				authContextLog.warn('Login timeout - will retry on next app open');
				setLoading(false);
				// Don't throw for timeout - just let the user try again
				return;
			}

			// Downgrade to warning for expected errors (orphaned accounts)
			if (
				error?.message?.includes('User not found') ||
				error?.message?.includes('User account not found')
			) {
				authContextLog.warn(
					'Login failed - user not found (orphaned account)',
					{ message: error.message }
				);
			} else {
				authContextLog.error('Error during login', error);
			}

			setLoading(false);
			setError({
				code: 'LOGIN_ERROR',
				message: 'Failed to complete login process',
				details: error,
			});

			// Re-throw the error so the caller knows login failed
			authContextLog.warn(
				'MongoDB operations failed - throwing error to caller'
			);
			throw error;
		} finally {
			// Reset manual login flag
			isManualLoginRef.current = false;
		}
	}, []);

	const reauthWithGoogle = useCallback(async () => {
		try {
			setError(null);
			isReauthInProgressRef.current = true;

			const currentUser = getAuth().currentUser;
			if (!currentUser) {
				throw Object.assign(new Error('No authenticated user'), {
					code: 'auth/no-current-user',
				});
			}

			authContextLog.debug('Starting Google reauthentication');

			// Ensure Google Sign-In is configured (safe to call multiple times)
			configureGoogleSignIn();

			// Get fresh Google token
			const signInResult = await GoogleSignin.signInSilently().catch(
				async () => {
					return await GoogleSignin.signIn();
				}
			);

			const idToken =
				(signInResult as any)?.idToken ||
				(signInResult as any)?.data?.idToken ||
				undefined;

			if (!idToken) {
				throw Object.assign(new Error('No Google ID token received'), {
					code: 'auth/no-id-token',
				});
			}

			const googleCredential = GoogleAuthProvider.credential(idToken);
			await currentUser.reauthenticateWithCredential(googleCredential);
			await currentUser.reload();
			authContextLog.info('Google reauthentication successful');
		} catch (error: any) {
			authContextLog.error('Google reauthentication error', error);
			const normalized = {
				code: error?.code || 'auth/reauth-failed',
				message: error?.message || 'Failed to reauthenticate.',
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

	const logout = useCallback(async () => {
		try {
			await signOut(getAuth());
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
			authContextLog.error('Error during logout', error);
			setError({
				code: 'LOGOUT_ERROR',
				message: 'Failed to complete logout process',
				details: error,
			});
		}
	}, []);

	const sendPasswordResetEmailToUser = useCallback(async (email: string) => {
		try {
			authContextLog.debug('Starting password reset process', {
				email,
				hasCurrentUser: !!getAuth().currentUser,
			});

			// Check if Firebase is properly initialized
			const authInstance = getAuth();
			if (!authInstance) {
				throw new Error('Firebase Auth is not initialized');
			}

			const { sendPasswordResetEmail } = await import(
				'@react-native-firebase/auth'
			);
			await sendPasswordResetEmail(getAuth(), email);
			authContextLog.info('Password reset email sent successfully', {
				email,
			});
			setError(null); // Clear any existing errors
		} catch (error: any) {
			authContextLog.error('Error sending password reset email', error);
			authContextLog.error('Error details', {
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
				const { confirmPasswordReset } = await import(
					'@react-native-firebase/auth'
				);
				await confirmPasswordReset(getAuth(), code, newPassword);
				setError(null); // Clear any existing errors
			} catch (error) {
				authContextLog.error('Error confirming password reset', error);
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
			const currentUser = getAuth().currentUser;
			if (!currentUser) {
				throw new Error('No user is currently signed in');
			}
			await currentUser.updatePassword(newPassword);
			setError(null); // Clear any existing errors
		} catch (error) {
			authContextLog.error('Error updating password', error);
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
				const { createUserWithEmailAndPassword } = await import(
					'@react-native-firebase/auth'
				);
				const userCredential = await createUserWithEmailAndPassword(
					getAuth(),
					email,
					password
				);
				firebaseUser = userCredential.user;

				// Create user in MongoDB
				await createUserInMongoDB(firebaseUser, name);
			} catch (error: any) {
				// Handle specific Firebase errors
				if (error.code === 'auth/email-already-in-use') {
					// This is an expected outcome for signup; log as warn (not error)
					authContextLog.warn('Signup attempted with existing email', {
						code: error?.code,
					});
					/**
					 * IMPORTANT: Do not attempt a "recovery sign-in" here.
					 *
					 * Signing in (then signing out) during a signup flow causes auth-state
					 * churn and race conditions with our auth listeners, which can surface as
					 * `auth/no-current-user` and redbox errors in dev.
					 *
					 * If the user already has an account, they should use the normal login flow.
					 * If the account is "orphaned" (Firebase exists, MongoDB missing), our login
					 * flow already handles creating the MongoDB record on successful sign-in.
					 */
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

				authContextLog.error('Signup error', error);

				// If Firebase user was created but MongoDB creation failed, delete the Firebase user
				if (firebaseUser && error.code !== 'auth/email-already-in-use') {
					try {
						if (typeof (firebaseUser as any).deleteUser === 'function') {
							await (firebaseUser as any).deleteUser();
						} else {
							await firebaseUser.delete();
						}
						authContextLog.info(
							'Cleaned up Firebase user after MongoDB creation failure'
						);
					} catch (deleteError) {
						authContextLog.error(
							'Error deleting Firebase user during cleanup',
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
			authContextLog.debug('Starting Google Sign-In flow');
			setLoading(true);
			setError(null);
			isGoogleSignInCancelledRef.current = false;
			isGoogleSignInInProgressRef.current = true;

			// Check if your device supports Google Play
			authContextLog.debug('Step 1: Checking Google Play Services');
			await GoogleSignin.hasPlayServices({
				showPlayServicesUpdateDialog: true,
			});
			authContextLog.debug('Google Play Services OK');

			// Get the users ID token
			authContextLog.debug('Step 2: Getting Google ID token');
			const signInResult = await GoogleSignin.signIn();
			let idToken: string | undefined;
			authContextLog.debug('Sign-in result', { type: signInResult.type });

			if (signInResult.type === 'success' && signInResult.data) {
				idToken = signInResult.data.idToken || undefined;
				authContextLog.debug('Got ID token from success data');
			} else if (signInResult.type === 'cancelled') {
				authContextLog.debug('User cancelled sign-in');
				isGoogleSignInCancelledRef.current = true;
				setLoading(false);
				return; // Exit silently without showing error
			} else {
				// Handle other response types
				idToken = (signInResult as any).idToken || undefined;
				authContextLog.debug('Got ID token from direct access');
			}

			if (!idToken) {
				authContextLog.error('No ID token received from Google Sign-In');
				setError({
					code: 'GOOGLE_SIGNIN_ERROR',
					message: 'No ID token received from Google Sign-In',
					details: signInResult,
				});
				setLoading(false);
				throw new Error('No ID token received from Google Sign-In');
			}

			// Create a Google credential with the token
			authContextLog.debug('Step 3: Creating Firebase credential');
			const googleCredential = GoogleAuthProvider.credential(idToken);

			// Sign-in the user with the credential
			const { signInWithCredential } = await import(
				'@react-native-firebase/auth'
			);
			const userCredential = await signInWithCredential(
				getAuth(),
				googleCredential
			);
			const firebaseUser = userCredential.user;

			authContextLog.info('Firebase auth successful', {
				uid: firebaseUser.uid.substring(0, 12) + '...',
			});
			// Always proceed: the backend bootstrap + RootLayout onboarding gate is the "truth".
			// `login()` will auto-provision the MongoDB user if missing.
			await login(firebaseUser);
			authContextLog.info('Google Continue completed successfully');
		} catch (error: any) {
			authContextLog.error('ERROR in signInWithGoogle', {
				code: error.code,
				message: error.message,
			});

			// Handle user cancellation gracefully
			if (
				error.code === 'auth/internal-error' &&
				error.message?.includes('cancelled')
			) {
				authContextLog.debug('Google Sign-In cancelled by user');
				isGoogleSignInCancelledRef.current = true;
				setLoading(false);
				return; // Exit silently without showing error
			}

			// Handle account-exists-with-different-credential (email exists with password, etc.)
			if (error?.code === 'auth/account-exists-with-different-credential') {
				const email = error?.email || error?.customData?.email;
				setError({
					code: 'ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL',
					message:
						'This email is already using a different sign-in method. Sign in with that method first, then you can link Google in Settings.',
					details: { ...error, email },
				});
				setLoading(false);
				return;
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
				isGoogleSignInInProgressRef.current = false;
			}, 1000);
		}
	}, [login]);

	const signUpWithGoogle = useCallback(async () => {
		try {
			authContextLog.debug('Starting Google Sign-Up flow');
			setLoading(true);
			setError(null);
			isGoogleSignInCancelledRef.current = false;
			isGoogleSignInInProgressRef.current = true;

			authContextLog.debug('Step 1: Starting Google Sign-Up process');

			// Ensure Google Sign-In is configured
			authContextLog.debug('Step 2: Configuring Google Sign-In');
			configureGoogleSignIn();

			// Check if your device supports Google Play
			authContextLog.debug('Step 3: Checking Google Play Services');
			await GoogleSignin.hasPlayServices({
				showPlayServicesUpdateDialog: true,
			});
			authContextLog.debug('Google Play Services OK');

			// Sign out from any previous Google session to ensure clean state
			authContextLog.debug('Step 4: Signing out from previous Google session');
			try {
				await GoogleSignin.signOut();
				authContextLog.debug('Previous session signed out');
			} catch {
				authContextLog.debug('No previous Google session to sign out from');
			}

			// Get the users ID token
			authContextLog.debug('Step 5: Requesting Google Sign-In from user');
			const signInResult = await GoogleSignin.signIn();
			authContextLog.debug('Sign-In result', { type: signInResult.type });

			// Handle the actual data structure returned by Google Sign-In
			let idToken, user;

			if (signInResult.type === 'success' && signInResult.data) {
				// Success case - data is in signInResult.data
				({ idToken, user } = signInResult.data);
				authContextLog.debug('Got data from success result');
			} else if (signInResult.type === 'cancelled') {
				// User cancelled - exit silently
				authContextLog.debug('User cancelled sign-in');
				isGoogleSignInCancelledRef.current = true;
				setLoading(false);
				return;
			} else {
				// Direct access for other cases
				({ idToken, user } = signInResult);
				authContextLog.debug('Got data from direct access');
			}
			authContextLog.debug('Sign-in data', {
				email: user?.email,
				hasIdToken: !!idToken,
			});

			if (!idToken) {
				authContextLog.error('No ID token in sign-in result');

				// Try to get the token separately
				authContextLog.debug('Attempting to get ID token separately');
				try {
					const tokens = await GoogleSignin.getTokens();
					authContextLog.debug('Got tokens from getTokens()');
					if (tokens.idToken) {
						authContextLog.debug('ID token found in getTokens()');
						idToken = tokens.idToken;
					} else {
						throw new Error('No ID token received from Google Sign-In');
					}
				} catch (tokenError) {
					authContextLog.error('Failed to get tokens', tokenError);
					throw new Error('No ID token received from Google Sign-In');
				}
			}

			// Create a Google credential with the token
			authContextLog.debug('Step 6: Creating Firebase credential');
			const googleCredential = GoogleAuthProvider.credential(idToken);

			// Sign-in the user with the credential
			authContextLog.debug('Step 7: Signing in with Firebase');
			const { signInWithCredential } = await import(
				'@react-native-firebase/auth'
			);
			const userCredential = await signInWithCredential(
				getAuth(),
				googleCredential
			);

			const firebaseUser = userCredential.user;
			authContextLog.debug('Firebase auth successful', {
				uid: firebaseUser.uid.substring(0, 12) + '...',
			});
			// Treat Google "sign up" as "continue with Google" too.
			// `login()` will create MongoDB user if missing; RootLayout routes based on onboardingVersion.
			await login(firebaseUser);
		} catch (error: any) {
			authContextLog.error('Google Sign-Up error', error);
			authContextLog.error('Error details', {
				code: error.code,
				message: error.message,
			});

			// Handle user cancellation gracefully
			if (
				error.code === 'auth/internal-error' &&
				error.message?.includes('cancelled')
			) {
				authContextLog.debug('Google Sign-Up cancelled by user');
				isGoogleSignInCancelledRef.current = true;
				setLoading(false);
				return; // Exit silently without showing error
			}

			// Handle account-exists-with-different-credential (email exists with password, etc.)
			if (error?.code === 'auth/account-exists-with-different-credential') {
				const email = error?.email || error?.customData?.email;
				setError({
					code: 'ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL',
					message:
						'This email is already using a different sign-in method. Sign in with that method first, then you can link Google in Settings.',
					details: { ...error, email },
				});
				setLoading(false);
				return;
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
				isGoogleSignInInProgressRef.current = false;
			}, 1000);
		}
	}, [login]);

	const linkPassword = useCallback(
		async (email: string, password: string) => {
			const auth = getAuth();
			const currentUser = auth.currentUser;
			if (!currentUser) {
				throw Object.assign(new Error('No authenticated user'), {
					code: 'auth/no-current-user',
				});
			}

			const normalizedEmail = email.trim().toLowerCase();
			const normalizedPassword = password.trim();
			if (!normalizedEmail || !normalizedPassword) {
				throw Object.assign(new Error('Email and password are required'), {
					code: 'link/missing-fields',
				});
			}

			try {
				await currentUser.reload();
			} catch {
				// non-fatal
			}

			const credential = EmailAuthProvider.credential(
				normalizedEmail,
				normalizedPassword
			);

			try {
				await currentUser.linkWithCredential(credential);
				await currentUser.reload();
				// Refresh state so Security screen can update immediately
				setFirebaseUser(auth.currentUser);
				authContextLog.info('Password provider linked successfully');
			} catch (err: any) {
				// If Firebase requires a recent login, do Google reauth then retry once.
				if (err?.code === 'auth/requires-recent-login') {
					authContextLog.debug(
						'linkPassword requires recent login; attempting Google reauth'
					);
					await reauthWithGoogle();
					await currentUser.linkWithCredential(credential);
					await currentUser.reload();
					setFirebaseUser(auth.currentUser);
					authContextLog.info(
						'Password provider linked successfully (after reauth)'
					);
					return;
				}
				throw err;
			}
		},
		[reauthWithGoogle]
	);

	const deleteAccount = useCallback(async (password: string) => {
		setLoading(true);
		try {
			const user = getAuth().currentUser;

			if (!user) throw new Error('No user is currently signed in');
			if (!user.email) throw new Error('User email is missing');

			// Re-authenticate to verify user knows their password (security measure)
			const credential = EmailAuthProvider.credential(user.email, password);
			await user.reauthenticateWithCredential(credential);

			// Delete backend data AND Firebase account (backend handles both)
			// The backend uses Firebase Admin SDK to delete the Firebase account,
			// which bypasses the client-side reauthentication requirement
			await UserService.deleteUserAccount();

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

			const currentUser = getAuth().currentUser;

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

			authContextLog.debug('Starting password reauthentication');

			// Create email/password credential using the correct react-native-firebase auth instance
			const credential = EmailAuthProvider.credential(
				currentUser.email,
				password
			);
			await currentUser.reauthenticateWithCredential(credential);

			// Force refresh so providerData/state are up-to-date before delete
			await currentUser.reload();
			authContextLog.info('Password reauthentication successful');
		} catch (error: any) {
			authContextLog.error('Password reauthentication error', error);
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

	// Delete account after reauthentication (for Google/Apple users)
	// NOTE: The backend handles Firebase account deletion using Admin SDK,
	// which bypasses the client-side reauthentication requirement.
	// This function only needs to call the backend API - no client-side Firebase deletion needed.
	const deleteAccountAfterReauth = useCallback(async () => {
		setLoading(true);
		try {
			const user = getAuth().currentUser;

			if (!user)
				throw Object.assign(new Error('No user signed in'), {
					code: 'auth/no-current-user',
				});

			authContextLog.debug('Starting account deletion process');

			// Delete backend data AND Firebase account (backend handles both)
			// The backend uses Firebase Admin SDK to delete the Firebase account,
			// which bypasses the client-side reauthentication requirement
			await UserService.deleteUserAccount();
			authContextLog.info(
				'Account deletion completed successfully (backend handled Firebase deletion)'
			);

			// Local cleanup
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
				message: error?.message || 'Failed to delete account.',
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

	// High-level orchestration: Reauth (based on provider) → delete backend → delete Firebase
	const deleteAccountFlow = useCallback(
		async (options: DeleteAccountOptions = {}) => {
			const user = firebaseUser;
			if (!user) {
				throw Object.assign(
					new Error('No authenticated user. Please sign in again.'),
					{ code: 'auth/no-current-user' }
				);
			}

			const providerId = user.providerData?.[0]?.providerId ?? null;

			try {
				authContextLog.debug('deleteAccountFlow: Starting', { providerId });

				// 1) Reauthenticate FIRST based on provider
				if (providerId === 'password') {
					if (!options.password) {
						const err: any = Object.assign(
							new Error('Password is required to confirm account deletion.'),
							{ code: 'delete/password-required' }
						);
						throw err;
					}

					authContextLog.debug(
						'deleteAccountFlow: Reauthenticating with password'
					);
					await reauthWithPassword(options.password);
				} else if (providerId === 'google.com') {
					authContextLog.debug(
						'deleteAccountFlow: Reauthenticating with Google'
					);
					await reauthWithGoogle();
				} else {
					// For other providers (apple.com, etc.), we might not need reauth
					// or handle them differently. For now, log a warning.
					authContextLog.warn(
						'deleteAccountFlow: Unknown providerId, skipping reauth',
						{ providerId }
					);
				}

				// 2) Backend + Firebase deletion (backend handles Firebase via Admin SDK)
				authContextLog.debug(
					'deleteAccountFlow: Calling deleteAccountAfterReauth'
				);
				await deleteAccountAfterReauth();
			} catch (error: any) {
				authContextLog.error('deleteAccountFlow: Error', error);
				// Re-throw the error so the UI can handle it
				throw error;
			}
		},
		[
			firebaseUser,
			reauthWithPassword,
			reauthWithGoogle,
			deleteAccountAfterReauth,
		]
	);

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
		const currentFirebaseUser = getAuth().currentUser;
		if (!currentFirebaseUser) return false;
		const now = Date.now();
		return now - lastActivity < sessionTimeout;
	}, [lastActivity, sessionTimeout]); // No firebaseUser dependency needed - uses current user directly

	const extendSession = useCallback((): void => {
		setLastActivity(Date.now());
	}, []);

	// Session timeout effect
	useEffect(() => {
		authContextLog.debug('Session timeout useEffect triggered', {
			hasFirebaseUser: !!firebaseUser,
			lastActivity,
			sessionTimeout,
		});
		if (!firebaseUser) return;

		const interval = setInterval(() => {
			if (!checkSessionValidity()) {
				authContextLog.info('Session expired, logging out');
				logout();
			}
		}, 60000); // Check every minute

		return () => {
			authContextLog.debug('Session timeout useEffect cleanup');
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
			authProviderId,

			// Auth methods
			login,
			logout,
			signup,
			createUserInMongoDB,

			// Google Sign-In methods
			signInWithGoogle,
			signUpWithGoogle,

			// Account linking
			linkPassword,

			// Password management
			sendPasswordResetEmail: sendPasswordResetEmailToUser,
			confirmPasswordReset: confirmPasswordResetCode,
			updatePassword: updatePasswordToUser,

			// Account management
			deleteAccount,
			deleteAccountAfterReauth,
			deleteAccountFlow,
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
			authProviderId,
			login,
			logout,
			signup,
			createUserInMongoDB,
			signInWithGoogle,
			signUpWithGoogle,
			linkPassword,
			sendPasswordResetEmailToUser,
			confirmPasswordResetCode,
			updatePasswordToUser,
			deleteAccount,
			deleteAccountAfterReauth,
			deleteAccountFlow,
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
