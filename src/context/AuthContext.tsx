import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
	getAuth,
	onAuthStateChanged,
	sendPasswordResetEmail,
	confirmPasswordReset,
	updatePassword,
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	reauthenticateWithCredential,
	deleteUser,
	EmailAuthProvider,
} from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { UserService, User, Profile } from '../services';
import { router } from 'expo-router';
import { SampleDataService } from '../services/feature/sampleDataService';

interface AuthContextType {
	user: User | null;
	profile: Profile | null;
	firebaseUser: FirebaseAuthTypes.User | null;
	loading: boolean;
	login: (firebaseUser: FirebaseAuthTypes.User) => Promise<void>;
	logout: () => Promise<void>;
	signup: (email: string, password: string, name?: string) => Promise<void>;
	createUserInMongoDB: (
		firebaseUser: FirebaseAuthTypes.User,
		name?: string
	) => Promise<User>;
	sendPasswordResetEmail: (email: string) => Promise<void>;
	confirmPasswordReset: (code: string, newPassword: string) => Promise<void>;
	updatePassword: (newPassword: string) => Promise<void>;
	deleteAccount: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [firebaseUser, setFirebaseUser] =
		useState<FirebaseAuthTypes.User | null>(null);
	const [loading, setLoading] = useState(true);
	const [skipMongoDBCheck, setSkipMongoDBCheck] = useState(false);
	const [lastProcessedUID, setLastProcessedUID] = useState<string | null>(null);
	const [processingTimeout, setProcessingTimeout] = useState<number | null>(
		null
	);
	const [isManualLogin, setIsManualLogin] = useState(false);

	useEffect(() => {
		// Listen for Firebase auth state changes
		const unsubscribe = onAuthStateChanged(getAuth(), async (firebaseUser) => {
			console.log(
				'🔍 [DEBUG] Firebase auth state changed:',
				firebaseUser ? `UID: ${firebaseUser.uid.substring(0, 8)}...` : 'null'
			);

			// Skip processing if we're handling manual login
			if (isManualLogin) {
				console.log(
					'🔍 [DEBUG] Manual login in progress, skipping auth state change processing'
				);
				return;
			}

			// Prevent duplicate processing of the same user
			if (firebaseUser && lastProcessedUID === firebaseUser.uid) {
				console.log(
					'🔍 [DEBUG] Same UID already processed, skipping duplicate MongoDB fetch'
				);
				return;
			}

			// Prevent rapid successive calls
			if (processingTimeout) {
				console.log(
					'🔍 [DEBUG] Processing timeout active, skipping rapid call'
				);
				return;
			}

			setFirebaseUser(firebaseUser);

			if (firebaseUser) {
				// User is signed in - always store the Firebase UID
				console.log(
					'🔍 [DEBUG] Storing Firebase UID in AsyncStorage:',
					firebaseUser.uid.substring(0, 8) + '...'
				);
				await AsyncStorage.setItem('firebaseUID', firebaseUser.uid);

				// Verify storage worked
				const storedUID = await AsyncStorage.getItem('firebaseUID');
				console.log(
					'🔍 [DEBUG] Verified Firebase UID in AsyncStorage:',
					storedUID ? `${storedUID.substring(0, 8)}...` : 'null'
				);

				try {
					// Try to get user from MongoDB
					const mongoUser = await UserService.getUserByFirebaseUID(
						firebaseUser.uid
					);
					if (mongoUser) {
						console.log('🔍 [DEBUG] Found MongoDB user:', mongoUser._id);
						setUser(mongoUser);
						// Fetch the user's profile
						const userProfile = await UserService.getProfileByUserId(
							mongoUser._id
						);
						setProfile(userProfile);
					} else {
						console.log(
							'🔍 [DEBUG] No MongoDB user found, will handle during signup'
						);
						// User exists in Firebase but not in MongoDB
						// This will be handled during signup flow
						setUser(null);
						setProfile(null);
					}
					// Mark this UID as processed
					setLastProcessedUID(firebaseUser.uid);
					// Set a timeout to prevent rapid successive calls
					const timeout = setTimeout(() => setProcessingTimeout(null), 1000);
					setProcessingTimeout(timeout);
				} catch (error) {
					console.error(
						'AuthContext - Error fetching user from MongoDB:',
						error
					);
					setUser(null);
					setProfile(null);
					// Note: Firebase UID is still stored in AsyncStorage above
					// Still mark as processed to prevent infinite retries
					setLastProcessedUID(firebaseUser.uid);
					// Set a timeout to prevent rapid successive calls
					const timeout = setTimeout(() => setProcessingTimeout(null), 1000);
					setProcessingTimeout(timeout);
				}
			} else {
				// User is signed out
				console.log(
					'🔍 [DEBUG] User signed out, clearing state and AsyncStorage'
				);
				setUser(null);
				setProfile(null);
				setLastProcessedUID(null);
				if (processingTimeout) {
					clearTimeout(processingTimeout);
					setProcessingTimeout(null);
				}
				await AsyncStorage.removeItem('firebaseUID');
			}

			setLoading(false);
		});

		return () => {
			unsubscribe();
			if (processingTimeout) {
				clearTimeout(processingTimeout);
			}
		};
	}, [lastProcessedUID, processingTimeout]);

	// Cleanup effect for component unmount
	useEffect(() => {
		return () => {
			if (processingTimeout) {
				clearTimeout(processingTimeout);
			}
		};
	}, [processingTimeout]);

	const createUserInMongoDB = async (
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
			await AsyncStorage.setItem('firebaseUID', firebaseUser.uid);
			return response.user;
		} catch (error) {
			console.error('Error creating user in MongoDB:', error);
			// Clear any partial state that might have been set
			setUser(null);
			setProfile(null);
			await AsyncStorage.removeItem('firebaseUID');
			throw error;
		}
	};

	// Method to manually sync with MongoDB when user data is actually needed
	const syncWithMongoDB = async () => {
		if (!firebaseUser) return null;

		try {
			const mongoUser = await UserService.getUserByFirebaseUID(
				firebaseUser.uid
			);
			if (mongoUser) {
				setUser(mongoUser);
				const userProfile = await UserService.getProfileByUserId(mongoUser._id);
				setProfile(userProfile);
				return mongoUser;
			}
			return null;
		} catch (error) {
			console.error('Error syncing with MongoDB:', error);
			return null;
		}
	};

	// Check if user is authenticated (Firebase only)
	const isAuthenticated = () => {
		return !!firebaseUser;
	};

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
			await AsyncStorage.setItem(
				'demo_transactions',
				JSON.stringify(sampleData.transactions)
			);
			await AsyncStorage.setItem(
				'demo_budgets',
				JSON.stringify(sampleData.budgets)
			);
			await AsyncStorage.setItem(
				'demo_goals',
				JSON.stringify(sampleData.goals)
			);
			await AsyncStorage.setItem(
				'demo_recurring',
				JSON.stringify(sampleData.recurringExpenses)
			);
			await AsyncStorage.setItem(
				'demo_data_timestamp',
				new Date().toISOString()
			);

			console.log('✅ [DEMO] Sample data stored in AsyncStorage');
		} catch (error) {
			console.error('❌ [DEMO] Error seeding sample data:', error);
			throw error;
		}
	};

	const refreshDemoData = async (userId: string) => {
		try {
			const lastRefresh = await AsyncStorage.getItem('demo_data_timestamp');
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
	};

	const login = async (firebaseUser: FirebaseAuthTypes.User) => {
		try {
			// Set manual login flag to prevent auth state change interference
			setIsManualLogin(true);

			// Check if this is a demo login
			const isDemoLogin = firebaseUser.email === 'demo@brie.app';
			console.log(
				'🔍 [DEBUG] Login attempt:',
				isDemoLogin ? 'DEMO MODE' : 'Regular user'
			);

			// Store the Firebase UID
			await AsyncStorage.setItem('firebaseUID', firebaseUser.uid);

			// Check if user exists in MongoDB
			let mongoUser = await UserService.getUserByFirebaseUID(firebaseUser.uid);

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
				const userProfile = await UserService.getProfileByUserId(mongoUser._id);
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
					'🔍 [DEBUG] User has seen onboarding, navigating to dashboard'
				);
				// Use setTimeout to ensure navigation stack is ready
				setTimeout(() => {
					try {
						router.replace('/(tabs)/dashboard');
						console.log('✅ Navigation to dashboard successful');
					} catch (navError) {
						console.error('❌ Navigation error:', navError);
						// Fallback navigation
						router.replace('/(tabs)/dashboard');
					}
				}, 100);
			} else {
				console.log(
					'🔍 [DEBUG] User needs onboarding, navigating to onboarding'
				);
				// Use setTimeout to ensure navigation stack is ready
				setTimeout(() => {
					try {
						router.replace('/(onboarding)/onboardingThree');
						console.log('✅ Navigation to onboarding successful');
					} catch (navError) {
						console.error('❌ Navigation error:', navError);
						// Fallback navigation
						router.replace('/(onboarding)/onboardingThree');
					}
				}, 100);
			}
		} catch (error) {
			console.error('Error during login:', error);
			setLoading(false);

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

			// Navigate to onboarding as fallback
			router.replace('/(onboarding)/onboardingThree');
		} finally {
			// Reset manual login flag
			setIsManualLogin(false);
		}
	};

	const logout = async () => {
		try {
			await getAuth().signOut();
			setUser(null);
			setProfile(null);
			setFirebaseUser(null);
			setLastProcessedUID(null);
			if (processingTimeout) {
				clearTimeout(processingTimeout);
				setProcessingTimeout(null);
			}
			await AsyncStorage.removeItem('firebaseUID');
		} catch (error) {
			console.error('Error during logout:', error);
		}
	};

	const sendPasswordResetEmailToUser = async (email: string) => {
		try {
			console.log('🔍 Starting password reset process...');
			console.log('📧 Email:', email);
			console.log('🔥 Firebase Auth instance:', getAuth());
			console.log('🔥 Firebase Auth current user:', getAuth().currentUser);

			// Check if Firebase is properly initialized
			const auth = getAuth();
			if (!auth) {
				throw new Error('Firebase Auth is not initialized');
			}

			await sendPasswordResetEmail(auth, email);
		} catch (error: any) {
			console.error('❌ Error sending password reset email:', error);
			console.error('❌ Error details:', {
				message: error.message,
				code: error.code,
				stack: error.stack,
			});
			throw error;
		}
	};

	const confirmPasswordResetCode = async (
		code: string,
		newPassword: string
	) => {
		try {
			await confirmPasswordReset(getAuth(), code, newPassword);
		} catch (error) {
			console.error('Error confirming password reset:', error);
			throw error;
		}
	};

	const updatePasswordToUser = async (newPassword: string) => {
		try {
			const currentUser = getAuth().currentUser;
			if (!currentUser) {
				throw new Error('No user is currently signed in');
			}
			await updatePassword(currentUser, newPassword);
		} catch (error) {
			console.error('Error updating password:', error);
			throw error;
		}
	};

	const signup = async (email: string, password: string, name?: string) => {
		let firebaseUser: FirebaseAuthTypes.User | null = null;

		try {
			// Create user in Firebase first
			const userCredential = await createUserWithEmailAndPassword(
				getAuth(),
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
				throw new Error(
					'An account with this email already exists. Please log in instead.'
				);
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

			throw error;
		}
	};

	const deleteAccount = async (password: string) => {
		setLoading(true);
		try {
			const user = getAuth().currentUser;
			if (!user) throw new Error('No user is currently signed in');
			if (!user.email) throw new Error('User email is missing');

			// Re-authenticate
			const credential = EmailAuthProvider.credential(user.email, password);
			await reauthenticateWithCredential(user, credential);

			// Delete backend data
			await UserService.deleteUserAccount();

			// Delete Firebase user
			await deleteUser(user);

			// Clear AsyncStorage and context state
			await AsyncStorage.clear();
			setUser(null);
			setProfile(null);
			setFirebaseUser(null);
			setLastProcessedUID(null);
			if (processingTimeout) {
				clearTimeout(processingTimeout);
				setProcessingTimeout(null);
			}
		} catch (error) {
			throw error;
		} finally {
			setLoading(false);
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				profile,
				firebaseUser,
				loading,
				login,
				logout,
				signup,
				createUserInMongoDB,
				sendPasswordResetEmail: sendPasswordResetEmailToUser,
				confirmPasswordReset: confirmPasswordResetCode,
				updatePassword: updatePasswordToUser,
				deleteAccount,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export default function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
