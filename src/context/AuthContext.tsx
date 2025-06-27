import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { UserService, User } from '../services/userService';

interface AuthContextType {
	user: User | null;
	firebaseUser: FirebaseAuthTypes.User | null;
	loading: boolean;
	login: (firebaseUser: FirebaseAuthTypes.User) => Promise<void>;
	logout: () => Promise<void>;
	createUserInMongoDB: (
		firebaseUser: FirebaseAuthTypes.User,
		name?: string
	) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [firebaseUser, setFirebaseUser] =
		useState<FirebaseAuthTypes.User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Listen for Firebase auth state changes
		const unsubscribe = onAuthStateChanged(getAuth(), async (firebaseUser) => {
			setFirebaseUser(firebaseUser);

			if (firebaseUser) {
				// User is signed in
				try {
					// Try to get user from MongoDB
					const mongoUser = await UserService.getUserByFirebaseUID(
						firebaseUser.uid
					);
					if (mongoUser) {
						setUser(mongoUser);
						await AsyncStorage.setItem('firebaseUID', firebaseUser.uid);
					} else {
						// User exists in Firebase but not in MongoDB
						// This will be handled during signup flow
						setUser(null);
					}
				} catch (error) {
					console.error('Error fetching user from MongoDB:', error);
					setUser(null);
				}
			} else {
				// User is signed out
				setUser(null);
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

			const newUser = await UserService.createUser(userData);
			setUser(newUser);
			await AsyncStorage.setItem('firebaseUID', firebaseUser.uid);
			return newUser;
		} catch (error) {
			console.error('Error creating user in MongoDB:', error);
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
				await AsyncStorage.setItem('firebaseUID', firebaseUser.uid);
			} else {
				// User doesn't exist in MongoDB, create them
				await createUserInMongoDB(firebaseUser);
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
			setFirebaseUser(null);
			await AsyncStorage.removeItem('firebaseUID');
		} catch (error) {
			console.error('Error during logout:', error);
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				firebaseUser,
				loading,
				login,
				logout,
				createUserInMongoDB,
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
