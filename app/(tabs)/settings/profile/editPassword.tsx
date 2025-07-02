import React, { useState } from 'react';
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	Alert,
	ScrollView,
	SafeAreaView,
	Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RectButton } from 'react-native-gesture-handler';
import useAuth from '../../../../src/context/AuthContext';

export default function EditPasswordScreen() {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const { sendPasswordResetEmail } = useAuth();
	const [emailIsValid, setEmailIsValid] = useState(false);

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

	const handlePasswordChange = async () => {
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
				'Password Reset Email Sent',
				"Check your inbox for the password reset link. If you don't see it, check your spam folder.",
				[
					{
						text: 'OK',
						onPress: () => {
							// Clear form and navigate back
							setEmail('');
							setEmailIsValid(false);
							router.back();
						},
					},
				]
			);
		} catch (error: any) {
			console.error('Password reset error:', error);

			let errorMessage = 'Could not send reset email. Please try again.';
			if (error.code === 'auth/user-not-found') {
				errorMessage = 'No account found with this email address.';
			} else if (error.code === 'auth/invalid-email') {
				errorMessage = 'Invalid email address.';
			} else if (error.code === 'auth/too-many-requests') {
				errorMessage = 'Too many failed attempts. Please try again later.';
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
					<Text style={styles.title}>Change Your Password</Text>
					<Text style={styles.subtitle}>
						Enter your email address and we'll send you a link to change your
						password.
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

					<RectButton
						style={[
							styles.actionButton,
							!emailIsValid && styles.buttonDisabled,
						]}
						onPress={handlePasswordChange}
						enabled={!loading && emailIsValid}
					>
						<Text style={styles.actionButtonText}>
							{loading ? 'Sending...' : 'Send Password Change Email'}
						</Text>
					</RectButton>

					<View style={styles.infoContainer}>
						<Ionicons
							name="information-circle-outline"
							size={16}
							color="#666"
						/>
						<Text style={styles.infoText}>
							The password change link will expire in 1 hour for security
							reasons.
						</Text>
					</View>
				</View>
			</View>
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
		justifyContent: 'center',
		marginBottom: 100,
	},

	formContainer: {
		flex: 1,
		justifyContent: 'center',
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
		marginVertical: 5,
	},
	button: {
		width: '100%',
		borderRadius: 9999,
		overflow: 'hidden',
		alignSelf: 'center',
		backgroundColor: '#0095FF',
	},
	actionButton: {
		paddingVertical: 12,
		alignItems: 'center',
		borderRadius: 8,
		backgroundColor: '#007AFF',
		marginTop: 10,
		borderWidth: 1,
		borderColor: '#ddd',
	},
	actionButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
	actionButtonDisabled: {
		paddingVertical: 12,
		alignItems: 'center',
		borderRadius: 8,
		backgroundColor: '#EFEFF4',
		marginTop: 10,
		borderWidth: 1,
		borderColor: '#ddd',
	},

	buttonDisabled: {
		backgroundColor: '#aeafb1',
	},
	buttonText: {
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
});
