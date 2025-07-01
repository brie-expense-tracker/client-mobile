import {
	View,
	Text,
	TextInput,
	Alert,
	StyleSheet,
	Image,
	SafeAreaView,
} from 'react-native';
import React, { useState } from 'react';
import { Link, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
	getAuth,
	signInWithEmailAndPassword,
} from '@react-native-firebase/auth';
import useAuth from '../../src/context/AuthContext';
import { RectButton, BorderlessButton } from 'react-native-gesture-handler';

export default function Login() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [isPressed, setIsPressed] = useState(false);
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

			console.log('Successfully logged in user');
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
			<View style={styles.mainContainer}>
				<Image
					source={require('../../assets/images/brie-logos.png')}
					style={styles.logo}
					resizeMode="contain"
				/>
				<View style={styles.formContainer}>
					<Text style={styles.title}>Welcome Back</Text>
					<Text style={styles.label}>Email</Text>
					<TextInput
						style={styles.input}
						placeholder="Enter your email"
						value={email}
						onChangeText={setEmail}
						keyboardType="email-address"
						autoCapitalize="none"
					/>
					<Text style={styles.label}>Password</Text>
					<TextInput
						style={styles.input}
						placeholder="Enter your password"
						value={password}
						onChangeText={setPassword}
						secureTextEntry
					/>
					<View style={styles.forgotPasswordContainer}>
						<Link href="/forgotPassword" asChild>
							<BorderlessButton onActiveStateChange={setIsPressed}>
								<Text style={styles.forgotPasswordText}>Forgot Password?</Text>
							</BorderlessButton>
						</Link>
					</View>
					<View style={styles.buttonContainer}>
						<RectButton
							style={[styles.button, isLoading && styles.buttonDisabled]}
							onPress={handleLogin}
							enabled={!isLoading}
						>
							<Text style={styles.buttonText}>
								{isLoading ? 'Signing In...' : 'Sign In'}
							</Text>
						</RectButton>
					</View>

					<View style={styles.dividerContainer}>
						<View style={styles.divider} />
						<Text style={styles.dividerText}>or sign in with</Text>
						<View style={styles.divider} />
					</View>

					<View style={styles.socialButtonsContainer}>
						<RectButton
							style={styles.socialButton}
							onPress={() =>
								Alert.alert(
									'Coming Soon',
									'Google Sign In will be available soon!'
								)
							}
						>
							<Ionicons name="logo-google" size={24} color="#0051ff" />
							<Text style={styles.socialButtonText}>Continue with Google</Text>
						</RectButton>

						<RectButton
							style={styles.socialButton}
							onPress={() =>
								Alert.alert(
									'Coming Soon',
									'Apple Sign In will be available soon!'
								)
							}
						>
							<Ionicons name="logo-apple" size={24} color="#000000" />
							<Text style={styles.socialButtonText}>Continue with Apple</Text>
						</RectButton>
					</View>
				</View>
				<View style={styles.signupContainer}>
					<Text style={styles.signupText}>Don't have an account?</Text>
					<Link replace href={'/signup'} asChild>
						<BorderlessButton onActiveStateChange={setIsPressed}>
							<Text style={styles.signupLink}>Sign Up</Text>
						</BorderlessButton>
					</Link>
				</View>
			</View>

			<Stack.Screen options={{ headerShown: false }} />
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeAreaContainer: {
		flex: 1,
		backgroundColor: '#fff',
	},
	mainContainer: {
		flex: 1,
		alignItems: 'center',
		paddingHorizontal: 24,
	},
	logo: {
		width: 100,
		height: 40,
		marginVertical: 40,
		resizeMode: 'contain',
	},
	formContainer: {
		width: '100%',
		height: '50%',
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		backgroundColor: 'white',
		alignSelf: 'center',
		borderRadius: 24,
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
		position: 'absolute',
		bottom: 0,
		justifyContent: 'center',
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
});
