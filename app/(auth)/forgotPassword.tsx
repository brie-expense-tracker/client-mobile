// app/screens/ForgotPasswordScreen.tsx
import React, { useState } from 'react';
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	Alert,
	SafeAreaView,
} from 'react-native';
import { Link, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useAuth from '../../src/context/AuthContext';
import { BorderlessButton, RectButton } from 'react-native-gesture-handler';
import { logger } from '../../src/utils/logger';

export default function ForgotPasswordScreen() {
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const { sendPasswordResetEmail } = useAuth();
	const [isPressed, setIsPressed] = useState(false);
	const [emailIsValid, setEmailIsValid] = useState(false);
	const router = useRouter();

	// Email validator function
	const isValidEmail = (email: string) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	};

	// Handle email input change with validation
	const handleEmailChange = (text: string) => {
		setEmail(text);
		setEmailIsValid(isValidEmail(text));
	};

	const handleReset = async () => {
		if (!email.trim()) {
			Alert.alert('Missing Email', 'Please enter your email address.');
			return;
		}

		if (!isValidEmail(email.trim())) {
			Alert.alert('Invalid Email', 'Please enter a valid email address.');
			return;
		}

		try {
			setLoading(true);
			await sendPasswordResetEmail(email.trim());

			Alert.alert(
				'Reset Email Sent',
				"Check your inbox for the password reset link. If you don't see it, check your spam folder.",
				[
					{
						text: 'OK',
						onPress: () => {
							router.replace('/login');
						},
					},
				]
			);
		} catch (error: any) {
			logger.error('Password reset error', error);
			logger.error('Password reset error details', {
				code: error.code,
				message: error.message,
				stack: error.stack,
			});

			let errorMessage = 'Could not send reset email. Please try again.';
			if (error.code === 'auth/user-not-found') {
				errorMessage = 'No account found with this email address.';
			} else if (error.code === 'auth/invalid-email') {
				errorMessage = 'Invalid email address.';
			} else if (error.code === 'auth/too-many-requests') {
				errorMessage = 'Too many failed attempts. Please try again later.';
			} else if (error.message) {
				// Include the actual error message for debugging
				errorMessage = `${errorMessage}\n\nError: ${error.message}`;
			}

			Alert.alert('Error', errorMessage);
		} finally {
			setLoading(false);
		}
	};

	return (
		<SafeAreaView style={styles.safeAreaContainer}>
			<View style={styles.mainContainer}>
				<View style={styles.formContainer}>
					<View style={styles.iconContainer}>
						<Ionicons name="lock-open-outline" size={48} color="#007AFF" />
					</View>
					<Text style={styles.title}>Reset Your Password</Text>
					<Text style={styles.subtitle}>
						Enter your email address and we&apos;ll send you a link to reset
						your password.
					</Text>

					<Text style={styles.label}>Email Address</Text>
					<TextInput
						style={[styles.input]}
						placeholder="Enter your email"
						placeholderTextColor="#888"
						value={email}
						onChangeText={handleEmailChange}
						keyboardType="email-address"
						autoCapitalize="none"
						autoCorrect={false}
						autoComplete="email"
					/>

					<View style={styles.buttonContainerT}>
						<RectButton
							style={[styles.buttonT, !emailIsValid && styles.buttonDisabled]}
							onPress={handleReset}
							enabled={!loading && emailIsValid}
						>
							<Text style={styles.buttonTextT}>
								{loading ? 'Sending...' : 'Send Reset Email'}
							</Text>
						</RectButton>
					</View>

					<View style={styles.infoContainer}>
						<Ionicons
							name="information-circle-outline"
							size={16}
							color="#666"
						/>
						<Text style={styles.infoText}>
							The reset link will expire in 1 hour for security reasons.
						</Text>
					</View>
				</View>
				<View style={styles.backToLoginContainer}>
					<Text style={styles.backToLoginText}>Remember your password?</Text>
					<Link replace href="/login" asChild>
						<BorderlessButton onActiveStateChange={setIsPressed}>
							<Text
								style={[
									styles.backToLoginLink,
									isPressed && styles.backToLoginLinkPressed,
								]}
							>
								Back to Login
							</Text>
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
		backgroundColor: '#ffffff',
	},
	mainContainer: {
		flex: 1,
		paddingHorizontal: 24,
		justifyContent: 'flex-start',
	},
	formContainer: {
		backgroundColor: '#FFF',
		marginTop: 80,
	},
	iconContainer: {
		alignItems: 'center',
		marginBottom: 24,
	},
	title: {
		fontSize: 22,
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: 24,
		color: '#111',
	},
	subtitle: {
		fontSize: 16,
		textAlign: 'center',
		color: '#666',
		marginBottom: 24,
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		color: '#111',
		marginBottom: 8,
	},
	input: {
		height: 50,
		borderWidth: 1,
		borderColor: '#D1D5DB',
		borderRadius: 10,
		paddingHorizontal: 16,
		backgroundColor: '#FFF',
		marginBottom: 16,
	},
	inputError: {
		borderColor: '#FF3B30',
	},
	errorText: {
		color: '#FF3B30',
		fontSize: 12,
		marginTop: -12,
		marginBottom: 16,
	},
	buttonContainer: {
		backgroundColor: '#007AFF',
		paddingVertical: 14,
		borderRadius: 10,
		alignItems: 'center',
		marginBottom: 16,
	},
	buttonContainerT: {
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
		marginVertical: 5,
	},
	button: {
		backgroundColor: '#007AFF',
		paddingVertical: 14,
		borderRadius: 10,
		alignItems: 'center',
		width: '100%',
	},
	buttonT: {
		width: '100%',
		borderRadius: 9999,
		overflow: 'hidden',
		alignSelf: 'center',
		backgroundColor: '#0095FF',
	},
	buttonDisabled: {
		backgroundColor: '#aeafb1',
	},
	buttonText: {
		color: '#FFF',
		fontWeight: '600',
		fontSize: 16,
		marginVertical: 18,
	},

	buttonTextT: {
		color: 'white',
		fontSize: 20,
		textAlign: 'center',
		fontWeight: '700',
		marginVertical: 18,
	},
	infoContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 16,
	},
	infoText: {
		fontSize: 14,
		color: '#666',
		marginLeft: 8,
	},
	backToLoginContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginTop: 24,
	},
	backToLoginText: {
		fontSize: 14,
		color: '#666',
		marginRight: 8,
	},
	backToLoginLink: {
		fontSize: 14,
		fontWeight: '600',
		color: '#4A5568',
	},
	backToLoginLinkPressed: {
		opacity: 0.6,
	},
});
