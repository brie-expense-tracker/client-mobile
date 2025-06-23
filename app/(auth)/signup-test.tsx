import {
	View,
	Text,
	Pressable,
	TextInput,
	Alert,
	StyleSheet,
	Image,
	SafeAreaView,
} from 'react-native';
import React, { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
	getAuth,
	createUserWithEmailAndPassword,
} from '@react-native-firebase/auth';

export default function Signup() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	// const signUp = async () => {
	// 	setIsLoading(true);
	// 	try {
	// 		await auth().createUserWithEmailAndPassword(email, password);
	// 	} catch (error) {
	// 		console.log(error);
	// 		Alert.alert('Error', 'Please fill in all fields.');
	// 	} finally {
	// 		setIsLoading(false);
	// 	}
	// };

	// const signIn = async () => {
	// 	setIsLoading(true);
	// 	try {
	// 		await auth().signInWithEmailAndPassword(email, password);
	// 	} catch (error) {
	// 		console.log(error);
	// 		Alert.alert('Error', 'Please fill in all fields.');
	// 	} finally {
	// 		setIsLoading(false);
	// 	}
	// };

	// Email validator function
	const isValidEmail = (email: string) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	};

	// Password validator function
	const isValidPassword = (password: string) => {
		return password.length >= 6; // Minimum 6 characters for this example
	};

	const handleSignup = async () => {
		if (!email || !password) {
			Alert.alert('Error', 'Please fill in all fields.');
			return;
		}

		if (!isValidEmail(email)) {
			Alert.alert('Error', 'Please enter a valid email address.');
			return;
		}

		if (!isValidPassword(password)) {
			Alert.alert('Error', 'Password must be at least 6 characters long.');
			return;
		}

		// Fake signup logic
		// if (email === 'user@email.com' && password === 'Password123') {
		// 	Alert.alert('Success', `Account created for ${email}`);
		// 	console.log('201: Successfully created User.');
		// 	router.replace('/onboardingThree');
		// } else {
		// 	Alert.alert('Error', 'Email already in use or invalid password.');
		// }
		// setIsLoading(true);

		// Real signup logic
		try {
			// await auth().createUserWithEmailAndPassword(email, password);
			Alert.alert('Success', `Account created for ${email}`);
			console.log('201: Successfully created User.');
			createUserWithEmailAndPassword(getAuth(), email, password);
		} catch (error) {
			console.log(error);
			Alert.alert('Error', 'Please fill in all fields.');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.contentContainer}>
				<Image
					source={require('../../assets/images/brie-logos.png')}
					style={styles.logo}
					resizeMode="contain"
				/>
				<View style={styles.formContainer}>
					<Text style={styles.title}>Create Your Account</Text>
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
					<View style={styles.buttonContainer}>
						<Pressable style={styles.button} onPress={handleSignup}>
							<LinearGradient
								colors={['#0095FF', '#008cff']}
								style={styles.gradient}
							>
								<Text style={styles.buttonText}>Sign Up</Text>
							</LinearGradient>
						</Pressable>
					</View>

					<View style={styles.dividerContainer}>
						<View style={styles.divider} />
						<Text style={styles.dividerText}>or sign up with</Text>
						<View style={styles.divider} />
					</View>

					<View style={styles.socialButtonsContainer}>
						<Pressable
							style={styles.socialButton}
							onPress={() =>
								Alert.alert(
									'Coming Soon',
									'Google Sign Up will be available soon!'
								)
							}
						>
							<Ionicons name="logo-google" size={24} color="#0051ff" />
							<Text style={styles.socialButtonText}>Continue with Google</Text>
						</Pressable>

						<Pressable
							style={styles.socialButton}
							onPress={() =>
								Alert.alert(
									'Coming Soon',
									'Apple Sign Up will be available soon!'
								)
							}
						>
							<Ionicons name="logo-apple" size={24} color="#000000" />
							<Text style={styles.socialButtonText}>Continue with Apple</Text>
						</Pressable>
					</View>
				</View>
				<View style={styles.loginContainer}>
					<Text style={styles.loginText}>Already have account?</Text>
					<Link replace href={'/login-test'}>
						<Text style={styles.loginLink}>Log In</Text>
					</Link>
				</View>
			</View>

			<Stack.Screen options={{ headerShown: false }} />
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	contentContainer: {
		flex: 1,
		paddingHorizontal: 10,
		justifyContent: 'flex-start',
		alignItems: 'center',
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
		shadowRadius: 3,
		elevation: 5,
		borderRadius: 24,
		padding: 24,
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
	},
	gradient: {
		width: '100%',
	},
	buttonText: {
		color: 'white',
		fontSize: 20,
		textAlign: 'center',
		fontWeight: 'bold',
		marginVertical: 18,
	},
	loginContainer: {
		flexDirection: 'row',
		gap: 4,
		width: '100%',
		position: 'absolute',
		bottom: 0,
		justifyContent: 'center',
	},
	loginText: {
		color: '#4A5568',
	},
	loginLink: {
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
});
