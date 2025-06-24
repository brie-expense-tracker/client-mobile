import React, { useState } from 'react';
import {
	SafeAreaView,
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	Alert,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ForgotPasswordScreen() {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);

	const handleReset = async () => {
		if (!email.trim()) {
			Alert.alert('Missing Email', 'Please enter your email address.');
			return;
		}

		// Basic email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email.trim())) {
			Alert.alert('Invalid Email', 'Please enter a valid email address.');
			return;
		}

		try {
			setLoading(true);
			// TODO: Integrate with your auth backend here
			// await sendPasswordResetEmail(auth, email.trim());

			Alert.alert(
				'Reset Email Sent',
				"Check your inbox for the password reset link. If you don't see it, check your spam folder.",
				[
					{
						text: 'OK',
						onPress: () => router.back(),
					},
				]
			);
		} catch (error: any) {
			console.error('Password reset error:', error);
			Alert.alert(
				'Error',
				error.message || 'Could not send reset email. Please try again.'
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.mainContainer}>
			<KeyboardAvoidingView
				style={styles.container}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			>
				<ScrollView contentContainerStyle={styles.scrollContent}>
					<SafeAreaView style={styles.safeArea}>
						{/* Header */}
						<View style={styles.header}>
							<TouchableOpacity
								style={styles.backButton}
								onPress={() => router.back()}
							>
								<Ionicons name="chevron-back" size={24} color="#333" />
							</TouchableOpacity>
							<Text style={styles.headerTitle}>Forgot Password</Text>
							<View style={styles.placeholder} />
						</View>

						{/* Content */}
						<View style={styles.content}>
							<View style={styles.iconContainer}>
								<Ionicons name="lock-open-outline" size={64} color="#007AFF" />
							</View>

							<Text style={styles.title}>Reset Your Password</Text>
							<Text style={styles.subtitle}>
								Enter your email address and we'll send you a link to reset your
								password.
							</Text>

							<View style={styles.inputContainer}>
								<Text style={styles.label}>Email Address</Text>
								<TextInput
									style={styles.input}
									placeholder="Enter your email"
									placeholderTextColor="#888"
									value={email}
									onChangeText={setEmail}
									keyboardType="email-address"
									autoCapitalize="none"
									autoCorrect={false}
									autoComplete="email"
								/>
							</View>

							<TouchableOpacity
								style={[styles.button, loading && styles.buttonDisabled]}
								onPress={handleReset}
								disabled={loading}
							>
								<Text style={styles.buttonText}>
									{loading ? 'Sending...' : 'Send Reset Email'}
								</Text>
							</TouchableOpacity>

							<View style={styles.infoContainer}>
								<Ionicons
									name="information-circle-outline"
									size={20}
									color="#666"
								/>
								<Text style={styles.infoText}>
									The reset link will expire in 1 hour for security reasons.
								</Text>
							</View>
						</View>
					</SafeAreaView>
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}

const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		backgroundColor: '#fff',
	},
	container: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
	},
	safeArea: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#efefef',
	},
	backButton: {
		padding: 4,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
	},
	placeholder: {
		width: 32,
	},
	content: {
		flex: 1,
		paddingHorizontal: 24,
		paddingTop: 40,
		alignItems: 'center',
	},
	iconContainer: {
		marginBottom: 24,
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: '#333',
		textAlign: 'center',
		marginBottom: 12,
	},
	subtitle: {
		fontSize: 16,
		color: '#666',
		textAlign: 'center',
		lineHeight: 24,
		marginBottom: 32,
		paddingHorizontal: 16,
	},
	inputContainer: {
		width: '100%',
		marginBottom: 24,
	},
	label: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	input: {
		height: 50,
		borderWidth: 1,
		borderColor: '#D1D5DB',
		borderRadius: 12,
		paddingHorizontal: 16,
		backgroundColor: '#F9FAFB',
		fontSize: 16,
		color: '#333',
	},
	button: {
		backgroundColor: '#007AFF',
		paddingVertical: 16,
		paddingHorizontal: 32,
		borderRadius: 12,
		alignItems: 'center',
		width: '100%',
		marginBottom: 24,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	buttonDisabled: {
		opacity: 0.6,
	},
	buttonText: {
		color: '#FFF',
		fontWeight: '600',
		fontSize: 16,
	},
	infoContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingHorizontal: 16,
	},
	infoText: {
		fontSize: 14,
		color: '#666',
		marginLeft: 8,
		flex: 1,
		lineHeight: 20,
	},
});
