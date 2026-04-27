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
import auth from '@react-native-firebase/auth';
import useAuth from '../../src/context/AuthContext';
import { BorderlessButton, RectButton } from 'react-native-gesture-handler';
import { logger } from '../../src/utils/logger';
import { palette, radius } from '../../src/ui/theme';

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
			const emailTrimmed = email.trim().toLowerCase();

			// CRITICAL: Check if the account exists before sending password reset email
			// Firebase's sendPasswordResetEmail may not throw an error for non-existent accounts
			// (to prevent email enumeration attacks), so we must verify account existence first.
			// This prevents users from creating accounts via the forgot password flow.
			// Password reset links can only reset passwords for existing accounts, never create new ones.
			try {
				await auth().fetchSignInMethodsForEmail(emailTrimmed);
				// If we get here, the account exists (even if signInMethods is empty)
				// Empty array might mean user exists but no methods are available (edge case)
			} catch (fetchError: any) {
				// fetchSignInMethodsForEmail throws auth/user-not-found if account doesn't exist
				if (fetchError?.code === 'auth/user-not-found') {
					const errorMessage =
						'No account found with this email address. Please sign up to create an account.';
					logger.warn('Password reset attempted for non-existent account', {
						email: emailTrimmed,
					});
					Alert.alert('Account Not Found', errorMessage, [
						{
							text: 'Sign Up',
							onPress: () => {
								router.replace('/signup');
							},
						},
						{ text: 'Cancel', style: 'cancel' },
					]);
					return;
				}
				// For other errors (network, etc.), we cannot verify account existence
				// Don't proceed - this prevents sending reset emails for non-existent accounts
				logger.error('Error verifying account existence', {
					error: fetchError,
					email: emailTrimmed,
				});
				Alert.alert(
					'Verification Error',
					'Unable to verify if this account exists. Please check your connection and try again.',
					[{ text: 'OK' }]
				);
				return;
			}

			// Account exists - verified by fetchSignInMethodsForEmail above
			// Proceed with sending password reset email
			await sendPasswordResetEmail(emailTrimmed);

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
				errorMessage =
					'No account found with this email address. Please sign up to create an account.';
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
						<Ionicons name="lock-open-outline" size={48} color={palette.primary} />
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
						placeholderTextColor={palette.textSubtle}
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
							<Text
								style={[
									styles.buttonTextT,
									!emailIsValid && { color: palette.textMuted },
								]}
							>
								{loading ? 'Sending...' : 'Send Reset Email'}
							</Text>
						</RectButton>
					</View>

					<View style={styles.infoContainer}>
						<Ionicons
							name="information-circle-outline"
							size={16}
							color={palette.textMuted}
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
		backgroundColor: palette.bg,
	},
	mainContainer: {
		flex: 1,
		paddingHorizontal: 24,
		justifyContent: 'flex-start',
	},
	formContainer: {
		backgroundColor: 'transparent',
		marginTop: 80,
	},
	iconContainer: {
		alignItems: 'center',
		marginBottom: 24,
	},
	title: {
		fontSize: 17,
		fontWeight: '600',
		letterSpacing: -0.16,
		lineHeight: 23,
		textAlign: 'center',
		marginBottom: 16,
		color: palette.text,
	},
	subtitle: {
		fontSize: 14,
		lineHeight: 20,
		textAlign: 'center',
		color: palette.textMuted,
		marginBottom: 24,
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		color: palette.text,
		marginBottom: 8,
	},
	input: {
		minHeight: 48,
		borderWidth: 1,
		borderColor: palette.border,
		borderRadius: radius.xl2,
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: palette.input,
		color: palette.text,
		fontSize: 17,
		marginBottom: 16,
	},
	inputError: {
		borderColor: palette.danger,
	},
	errorText: {
		color: palette.danger,
		fontSize: 12,
		marginTop: -12,
		marginBottom: 16,
	},
	buttonContainerT: {
		width: '100%',
		alignSelf: 'center',
		marginVertical: 5,
	},
	buttonT: {
		width: '100%',
		borderRadius: radius.xl2,
		overflow: 'hidden',
		alignSelf: 'center',
		backgroundColor: palette.primary,
	},
	buttonDisabled: {
		backgroundColor: palette.panel2,
	},
	buttonTextT: {
		color: palette.textOnPrimary,
		fontSize: 15,
		textAlign: 'center',
		fontWeight: '600',
		paddingVertical: 14,
	},
	infoContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 16,
	},
	infoText: {
		fontSize: 14,
		color: palette.textMuted,
		marginLeft: 8,
	},
	backToLoginContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginTop: 24,
	},
	backToLoginText: {
		fontSize: 14,
		color: palette.textMuted,
		marginRight: 8,
	},
	backToLoginLink: {
		fontSize: 14,
		fontWeight: '600',
		color: palette.primaryStrong,
	},
	backToLoginLinkPressed: {
		opacity: 0.6,
	},
});
