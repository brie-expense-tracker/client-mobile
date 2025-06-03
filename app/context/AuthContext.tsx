import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
	id: string;
	token: string;
}

interface AuthContextType {
	user: User | null;
	login: (token: string, userId: string) => Promise<void>;
	logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);

	useEffect(() => {
		// Load user data from storage on mount
		loadUser();
	}, []);

	const loadUser = async () => {
		try {
			const token = await AsyncStorage.getItem('token');
			const userId = await AsyncStorage.getItem('userId');
			if (token && userId) {
				setUser({ id: userId, token });
			}
		} catch (error) {
			console.error('Error loading user:', error);
		}
	};

	const login = async (token: string, userId: string) => {
		try {
			await AsyncStorage.setItem('token', token);
			await AsyncStorage.setItem('userId', userId);
			setUser({ id: userId, token });
		} catch (error) {
			console.error('Error saving user:', error);
		}
	};

	const logout = async () => {
		try {
			await AsyncStorage.removeItem('token');
			await AsyncStorage.removeItem('userId');
			setUser(null);
		} catch (error) {
			console.error('Error removing user:', error);
		}
	};

	return (
		<AuthContext.Provider value={{ user, login, logout }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
