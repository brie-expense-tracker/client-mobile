import {
	View,
	Text,
	TextInput,
	Alert,
	StyleSheet,
	Image,
	SafeAreaView,
	TouchableOpacity,
	KeyboardAvoidingView,
	ScrollView,
	Platform,
} from 'react-native';
import React, { useState } from 'react';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
	getAuth,
	signInWithEmailAndPassword,
} from '@react-native-firebase/auth';
import useAuth from '../../src/context/AuthContext';
import { RectButton, BorderlessButton } from 'react-native-gesture-handler';

// Demo credentials for reviewers
const DEMO_CREDENTIALS = {
	email: 'demo@brie.app',
	password: 'demo123',
};

export default function Login() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [isPressed, setIsPressed] = useState(false);
	const [isDemoMode, setIsDemoMode] = useState(false);
	const { login } = useAuth();

	// Email validator function
	const isValidEmail = (email: string) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	};

	// Password validator function
	const isValidPassword = (password: string) => {
		return password.length >= 6; // Minimum 6 characters for this example
	};

	const handleDemoLogin = async () => {
		setIsLoading(true);
		setIsDemoMode(true);

		try {
			// Sign in with demo credentials
			const userCredential = await signInWithEmailAndPassword(
				getAuth(),
				DEMO_CREDENTIALS.email,
				DEMO_CREDENTIALS.password
			);
			const firebaseUser = userCredential.user;

			// Use the auth context to handle MongoDB user verification
			await login(firebaseUser);
		} catch (error: any) {
			console.error('Demo login error:', error);
			Alert.alert(
				'Demo Error',
				'Demo mode is currently unavailable. Please contact support.'
			);
			setIsDemoMode(false);
		} finally {
			setIsLoading(false);
		}
	};

	const handleLogin = async () => {
		if (!email || !password) {
			Alert.alert('Error', 'Please fill in all fields.');
			return;
		}

		if (!isValidPassword(password)) {
			Alert.alert('Error', 'Password must be at least 6 characters long.');
			return;
		}

		if (!isValidEmail(email)) {
			Alert.alert('Error', 'Please enter a valid email address.');
			return;
		}

		setIsLoading(true);

		try {
			// Sign in with Firebase
			const userCredential = await signInWithEmailAndPassword(
				getAuth(),
				email,
				password
			);
			const firebaseUser = userCredential.user;

			// Use the auth context to handle MongoDB user verification
			await login(firebaseUser);
		} catch (error: any) {
			console.error('Login error:', error);

			let errorMessage = 'Invalid email or password.';
			if (error.code === 'auth/user-not-found') {
				errorMessage = 'No account found with this email address.';
			} else if (error.code === 'auth/wrong-password') {
				errorMessage = 'Incorrect password.';
			} else if (error.code === 'auth/invalid-email') {
				errorMessage = 'Invalid email address.';
			} else if (error.code === 'auth/too-many-requests') {
				errorMessage = 'Too many failed attempts. Please try again later.';
			}

			Alert.alert('Error', errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<SafeAreaView style={styles.safeAreaContainer}>
			<KeyboardAvoidingView
				style={styles.keyboardAvoidingView}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
			>
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
				>
					<View style={styles.mainContainer}>
						<Image
							source={require('../../src/assets/images/brie-logos.png')}
							style={styles.logo}
							resizeMode="contain"
						/>

						{/* Demo Mode Banner */}
						<View style={styles.demoBanner}>
							<Text style={styles.demoBannerText}>🎯 Demo Mode Available</Text>
							<Text style={styles.demoBannerSubtext}>
								Try the app with sample data (60-90 days of transactions,
								budgets, and goals)
							</Text>
						</View>

						<View style={styles.formContainer}>
							<Text style={styles.title}>Welcome Back</Text>

							{/* Demo Login Button */}
							<TouchableOpacity
								style={[
									styles.demoButton,
									isDemoMode && styles.demoButtonActive,
								]}
								onPress={handleDemoLogin}
								disabled={isLoading}
							>
								<Ionicons
									name="play-circle"
									size={20}
									color={isDemoMode ? '#fff' : '#007ACC'}
								/>
								<Text
									style={[
										styles.demoButtonText,
										isDemoMode && styles.demoButtonTextActive,
									]}
								>
									{isDemoMode ? 'Loading Demo...' : 'Try Demo Mode'}
								</Text>
							</TouchableOpacity>

							<View style={styles.dividerContainer}>
								<View style={styles.divider} />
								<Text style={styles.dividerText}>or sign in with</Text>
								<View style={styles.divider} />
							</View>

							<Text style={styles.label}>Email</Text>
							<TextInput
								style={styles.input}
								placeholder="Enter your email"
								placeholderTextColor="#999"
								value={email}
								onChangeText={setEmail}
								keyboardType="email-address"
								autoCapitalize="none"
								autoCorrect={false}
								editable={!isDemoMode}
							/>

							<Text style={styles.label}>Password</Text>
							<TextInput
								style={styles.input}
								placeholder="Enter your password"
								placeholderTextColor="#999"
								value={password}
								onChangeText={setPassword}
								secureTextEntry
								autoCapitalize="none"
								autoCorrect={false}
								editable={!isDemoMode}
							/>

							<RectButton
								style={[
									styles.loginButton,
									(isLoading || isDemoMode) && styles.loginButtonDisabled,
								]}
								onPress={handleLogin}
							>
								{isLoading ? (
									<Text style={styles.loginButtonText}>Signing In...</Text>
								) : (
									<Text style={styles.loginButtonText}>Sign In</Text>
								)}
							</RectButton>

							<View style={styles.dividerContainer}>
								<View style={styles.divider} />
								<Text style={styles.dividerText}>or continue with</Text>
								<View style={styles.divider} />
							</View>

							<View style={styles.socialButtonsContainer}>
								<RectButton
									style={[
										styles.socialButton,
										isDemoMode && styles.socialButtonDisabled,
									]}
									onPress={() =>
										Alert.alert(
											'Coming Soon',
											'Google Sign In will be available soon!'
										)
									}
								>
									<Ionicons name="logo-google" size={24} color="#0051ff" />
									<Text style={styles.socialButtonText}>
										Continue with Google
									</Text>
								</RectButton>

								<RectButton
									style={[
										styles.socialButton,
										isDemoMode && styles.socialButtonDisabled,
									]}
									onPress={() =>
										Alert.alert(
											'Coming Soon',
											'Apple Sign In will be available soon!'
										)
									}
								>
									<Ionicons name="logo-apple" size={24} color="#000000" />
									<Text style={styles.socialButtonText}>
										Continue with Apple
									</Text>
								</RectButton>
							</View>
						</View>

						<View style={styles.signupContainer}>
							<Text style={styles.signupText}>Don&apos;t have an account?</Text>

							<BorderlessButton
								onActiveStateChange={setIsPressed}
								onPress={() => {
									router.replace('/signup');
								}}
							>
								<Text
									style={[
										styles.signupLink,
										isDemoMode && styles.signupLinkDisabled,
										isPressed && styles.signupLinkPressed,
									]}
								>
									Sign Up
								</Text>
							</BorderlessButton>
						</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>

			<Stack.Screen options={{ headerShown: false }} />
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeAreaContainer: {
		flex: 1,
		backgroundColor: '#fff',
	},
	keyboardAvoidingView: {
		flex: 1,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
	},
	mainContainer: {
		flex: 1,
		alignItems: 'center',
		paddingHorizontal: 24,
		minHeight: '100%',
	},
	logo: {
		width: 100,
		height: 40,
		marginVertical: 40,
		resizeMode: 'contain',
	},
	formContainer: {
		width: '100%',
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		backgroundColor: 'white',
		alignSelf: 'center',
		borderRadius: 24,
		padding: 20,
		marginBottom: 20,
	},
	title: {
		fontSize: 24,
		color: '#000000',
		fontWeight: '500',
		marginVertical: 10,
	},
	label: {
		fontWeight: '500',
		fontSize: 14,
		color: '#4A5568',
		textAlign: 'left',
		width: '100%',
		marginBottom: 8,
	},
	input: {
		width: '100%',
		padding: 16,
		marginBottom: 16,
		borderRadius: 8,
		backgroundColor: '#fff',
		shadowColor: '#b9b9b9',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 5,
	},
	buttonContainer: {
		width: '100%',
		alignSelf: 'center',
		shadowColor: '#000000',
		shadowOffset: {
			width: 0,
			height: 4,
		},
		shadowOpacity: 0.2,
		shadowRadius: 6,
		elevation: 5,
		marginTop: 10,
	},
	button: {
		width: '100%',
		borderRadius: 9999,
		overflow: 'hidden',
		alignSelf: 'center',
		backgroundColor: '#0095FF',
	},
	buttonText: {
		color: 'white',
		fontSize: 20,
		textAlign: 'center',
		fontWeight: '700',
		marginVertical: 18,
	},
	signupContainer: {
		flexDirection: 'row',
		gap: 4,
		width: '100%',
		justifyContent: 'center',
		paddingVertical: 20,
	},
	signupText: {
		color: '#4A5568',
	},
	signupLink: {
		color: '#2C5282',
		opacity: 0.7,
		fontWeight: 'bold',
	},
	dividerContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '100%',
		marginVertical: 40,
	},
	divider: {
		flex: 1,
		height: 1,
		backgroundColor: '#E2E8F0',
	},
	dividerText: {
		marginHorizontal: 10,
		color: '#4A5568',
		fontSize: 14,
	},
	socialButtonsContainer: {
		width: '100%',
		gap: 12,
	},
	socialButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
		borderRadius: 12,
		marginBottom: 10,
		borderColor: '#E2E8F0',
		backgroundColor: 'white',
		gap: 12,
		shadowColor: '#afafaf',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.3,
		shadowRadius: 6,
		elevation: 5,
	},
	socialButtonText: {
		fontSize: 16,
		color: '#4A5568',
		fontWeight: '500',
	},
	buttonDisabled: {
		backgroundColor: '#E2E8F0',
	},
	forgotPasswordContainer: {
		width: '100%',
		alignItems: 'flex-end',
		marginBottom: 10,
	},
	forgotPasswordText: {
		color: '#4A5568',
		fontSize: 14,
		fontWeight: '500',
	},
	demoBanner: {
		backgroundColor: '#E6F7FF',
		padding: 12,
		borderRadius: 8,
		marginBottom: 20,
		alignItems: 'center',
	},
	demoBannerText: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#007ACC',
	},
	demoBannerSubtext: {
		fontSize: 12,
		color: '#4A5568',
		marginTop: 4,
	},
	demoButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 12,
		borderRadius: 12,
		marginBottom: 10,
		backgroundColor: '#E6F7FF',
		gap: 8,
	},
	demoButtonActive: {
		backgroundColor: '#007ACC',
	},
	demoButtonText: {
		fontSize: 16,
		fontWeight: '500',
		color: '#007ACC',
	},
	demoButtonTextActive: {
		color: '#fff',
	},
	loginButton: {
		width: '100%',
		borderRadius: 9999,
		overflow: 'hidden',
		alignSelf: 'center',
		backgroundColor: '#0095FF',
		marginTop: 10,
	},
	loginButtonText: {
		color: 'white',
		fontSize: 20,
		textAlign: 'center',
		fontWeight: '700',
		marginVertical: 18,
	},
	loginButtonDisabled: {
		backgroundColor: '#E2E8F0',
	},
	socialButtonDisabled: {
		backgroundColor: '#E2E8F0',
		opacity: 0.7,
	},
	signupLinkDisabled: {
		opacity: 0.5,
	},
	signupLinkPressed: {
		opacity: 0.6,
	},
});
