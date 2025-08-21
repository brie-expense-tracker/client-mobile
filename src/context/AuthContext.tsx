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

	useEffect(() => {
		// Listen for Firebase auth state changes
		const unsubscribe = onAuthStateChanged(getAuth(), async (firebaseUser) => {
			setFirebaseUser(firebaseUser);

			if (firebaseUser) {
				// User is signed in - always store the Firebase UID
				await AsyncStorage.setItem('firebaseUID', firebaseUser.uid);

				try {
					// Try to get user from MongoDB
					const mongoUser = await UserService.getUserByFirebaseUID(
						firebaseUser.uid
					);
					if (mongoUser) {
						setUser(mongoUser);
						// Fetch the user's profile
						const userProfile = await UserService.getProfileByUserId(
							mongoUser._id
						);
						setProfile(userProfile);
					} else {
						// User exists in Firebase but not in MongoDB
						// This will be handled during signup flow
						setUser(null);
						setProfile(null);
					}
				} catch (error) {
					console.error(
						'AuthContext - Error fetching user from MongoDB:',
						error
					);
					setUser(null);
					setProfile(null);
					// Note: Firebase UID is still stored in AsyncStorage above
				}
			} else {
				// User is signed out
				setUser(null);
				setProfile(null);
				await AsyncStorage.removeItem('firebaseUID');
			}

			setLoading(false);
		});

		return unsubscribe;
	}, []);

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

	const login = async (firebaseUser: FirebaseAuthTypes.User) => {
		try {
			// Check if user exists in MongoDB
			const mongoUser = await UserService.getUserByFirebaseUID(
				firebaseUser.uid
			);
			if (mongoUser) {
				setUser(mongoUser);
				// Fetch the user's profile
				const userProfile = await UserService.getProfileByUserId(mongoUser._id);
				setProfile(userProfile);
				await AsyncStorage.setItem('firebaseUID', firebaseUser.uid);
			} else {
				// User doesn't exist in MongoDB, try to sync first
				try {
					console.log(
						'User not found in MongoDB, attempting to sync Firebase account...'
					);
					const syncResult = await UserService.syncFirebaseAccount(
						firebaseUser.uid,
						firebaseUser.email!,
						firebaseUser.displayName || undefined
					);
					setUser(syncResult.user);
					setProfile(syncResult.profile);
					await AsyncStorage.setItem('firebaseUID', firebaseUser.uid);
				} catch (syncError) {
					console.error(
						'Error syncing Firebase account during login:',
						syncError
					);
					// Fallback to createUserInMongoDB if sync fails
					await createUserInMongoDB(firebaseUser);
				}
			}
		} catch (error) {
			console.error('Error during login:', error);
			throw error;
		}
	};

	const logout = async () => {
		try {
			await getAuth().signOut();
			setUser(null);
			setProfile(null);
			setFirebaseUser(null);
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
