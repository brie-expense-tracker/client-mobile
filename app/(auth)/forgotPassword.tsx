// app/screens/ForgotPasswordScreen.tsx
import React, { useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	Alert,
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebaseConfig';

export default function ForgotPasswordScreen() {
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);

	const handleReset = async () => {
		if (!email) {
			Alert.alert('Missing Email', 'Please enter your email address.');
			return;
		}

		try {
			setLoading(true);
			await sendPasswordResetEmail(auth, email.trim());
			Alert.alert(
				'Email Sent',
				'Check your inbox for the password reset link.'
			);
			setEmail('');
		} catch (error: any) {
			console.error(error);
			Alert.alert('Error', error.message || 'Could not send reset email.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.select({ ios: 'padding', android: undefined })}
		>
			<Text style={styles.title}>Reset Your Password</Text>

			<TextInput
				placeholder="Email"
				value={email}
				onChangeText={setEmail}
				keyboardType="email-address"
				autoCapitalize="none"
				style={styles.input}
				placeholderTextColor="#888"
			/>

			<TouchableOpacity
				onPress={handleReset}
				style={[styles.button, loading && { opacity: 0.7 }]}
				disabled={loading}
			>
				<Text style={styles.buttonText}>
					{loading ? 'Sending...' : 'Send Reset Email'}
				</Text>
			</TouchableOpacity>

			<Text style={styles.note}>
				Enter the email you registered with. You’ll get a link to reset your
				password.
			</Text>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F9FAFB',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	title: {
		fontSize: 22,
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: 24,
		color: '#111',
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
	button: {
		backgroundColor: '#007AFF',
		paddingVertical: 14,
		borderRadius: 10,
		alignItems: 'center',
	},
	buttonText: {
		color: '#FFF',
		fontWeight: '600',
		fontSize: 16,
	},
	note: {
		marginTop: 20,
		textAlign: 'center',
		color: '#666',
		fontSize: 14,
	},
});
