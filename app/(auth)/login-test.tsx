import {
	View,
	Text,
	Pressable,
	TextInput,
	Alert,
	StyleSheet,
	Image,
} from 'react-native';
import React, { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router, Stack } from 'expo-router';

export default function Login() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');

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

		// Fake login logic
		if (email === 'test' && password === 'password') {
			Alert.alert('Success', `Logged in with ${email}`);
			console.log('201: Successfully logged in.');
			router.replace('/onboardingThree');
		} else {
			Alert.alert('Error', 'Invalid email or password.');
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.contentContainer}>
				<Image
					source={require('../../assets/images/brie-logos.png')}
					style={styles.logo}
					resizeMode="contain"
				/>
				<View style={styles.formContainer}>
					<Text style={styles.title}>Login</Text>
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
						<Pressable style={styles.button} onPress={handleLogin}>
							<LinearGradient
								colors={['#0095FF', '#0095FF']}
								style={styles.gradient}
							>
								<Text style={styles.buttonText}>Sign In</Text>
							</LinearGradient>
						</Pressable>
					</View>

					<View style={styles.signupContainer}>
						<Link replace href={'/signup-test'}>
							<Text style={styles.signupLink}>Create An Account</Text>
						</Link>
					</View>
				</View>
			</View>
			<Stack.Screen options={{ headerShown: false }} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F0F7FF',
	},
	contentContainer: {
		flex: 1,
		paddingHorizontal: 32,
		justifyContent: 'center',
		alignItems: 'center',
	},
	logo: {
		width: 100,
		height: 40,
		marginBottom: 40,
		resizeMode: 'contain',
	},
	formContainer: {
		width: '100%',
		height: '50%',
		justifyContent: 'center',
		alignItems: 'center',
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
		fontWeight: '600',
		marginVertical: 10,
	},
	label: {
		fontWeight: 'bold',
		fontSize: 14,
		color: '#4A5568',
		textAlign: 'left',
		width: '100%',
		marginBottom: 8,
	},
	input: {
		borderWidth: 2,
		borderColor: '#0095FF',
		width: '100%',
		padding: 16,
		marginBottom: 16,
		borderRadius: 12,
	},
	buttonContainer: {
		width: '80%',
		alignSelf: 'center',
		shadowColor: '#0095FF',
		shadowOffset: {
			width: 0,
			height: 8,
		},
		shadowOpacity: 0.3,
		shadowRadius: 15,
		elevation: 5,
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
	signupContainer: {
		width: '100%',
		marginVertical: 40,
		justifyContent: 'center',
		alignItems: 'center',
	},
	signupLink: {
		color: '#2C5282',
		opacity: 0.7,
		fontWeight: 'bold',
	},
});
