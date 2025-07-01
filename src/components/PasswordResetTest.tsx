import React, { useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	Alert,
	ScrollView,
} from 'react-native';
import useAuth from '../context/AuthContext';

export default function PasswordResetTest() {
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const [testResults, setTestResults] = useState<string[]>([]);
	const { sendPasswordResetEmail } = useAuth();

	const addTestResult = (result: string) => {
		setTestResults((prev) => [
			...prev,
			`${new Date().toLocaleTimeString()}: ${result}`,
		]);
	};

	const testPasswordReset = async () => {
		if (!email.trim()) {
			Alert.alert('Error', 'Please enter an email address');
			return;
		}

		setLoading(true);
		setTestResults([]);

		try {
			addTestResult('Starting password reset test...');
			addTestResult(`Testing with email: ${email}`);

			// Test the function
			await sendPasswordResetEmail(email.trim());

			addTestResult('✅ sendPasswordResetEmail completed successfully');
			addTestResult('📧 Check your email inbox and spam folder');

			Alert.alert(
				'Test Successful',
				'Password reset email was sent successfully. Check your email inbox and spam folder.',
				[{ text: 'OK' }]
			);
		} catch (error: any) {
			addTestResult(`❌ Error occurred: ${error.message}`);
			addTestResult(`Error code: ${error.code || 'N/A'}`);
			addTestResult(`Error details: ${JSON.stringify(error, null, 2)}`);

			console.error('Password reset test error:', error);

			let errorMessage = 'Unknown error occurred';
			if (error.code === 'auth/user-not-found') {
				errorMessage = 'No account found with this email address';
			} else if (error.code === 'auth/invalid-email') {
				errorMessage = 'Invalid email address format';
			} else if (error.code === 'auth/too-many-requests') {
				errorMessage = 'Too many requests. Please try again later';
			} else if (error.code === 'auth/network-request-failed') {
				errorMessage = 'Network error. Please check your internet connection';
			}

			Alert.alert('Test Failed', errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const clearResults = () => {
		setTestResults([]);
	};

	return (
		<ScrollView style={styles.container}>
			<Text style={styles.title}>Password Reset Test</Text>

			<View style={styles.inputContainer}>
				<Text style={styles.label}>Email Address:</Text>
				<TextInput
					style={styles.input}
					placeholder="Enter email to test"
					value={email}
					onChangeText={setEmail}
					keyboardType="email-address"
					autoCapitalize="none"
					autoCorrect={false}
				/>
			</View>

			<TouchableOpacity
				style={[styles.button, loading && styles.buttonDisabled]}
				onPress={testPasswordReset}
				disabled={loading}
			>
				<Text style={styles.buttonText}>
					{loading ? 'Testing...' : 'Test Password Reset'}
				</Text>
			</TouchableOpacity>

			<TouchableOpacity style={styles.clearButton} onPress={clearResults}>
				<Text style={styles.clearButtonText}>Clear Results</Text>
			</TouchableOpacity>

			<View style={styles.resultsContainer}>
				<Text style={styles.resultsTitle}>Test Results:</Text>
				{testResults.map((result, index) => (
					<Text key={index} style={styles.resultText}>
						{result}
					</Text>
				))}
				{testResults.length === 0 && (
					<Text style={styles.noResults}>No test results yet</Text>
				)}
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
		backgroundColor: '#f5f5f5',
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		textAlign: 'center',
		marginBottom: 20,
		color: '#333',
	},
	inputContainer: {
		marginBottom: 20,
	},
	label: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 8,
		color: '#333',
	},
	input: {
		height: 50,
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		paddingHorizontal: 12,
		backgroundColor: '#fff',
		fontSize: 16,
	},
	button: {
		backgroundColor: '#007AFF',
		paddingVertical: 15,
		borderRadius: 8,
		alignItems: 'center',
		marginBottom: 10,
	},
	buttonDisabled: {
		opacity: 0.6,
	},
	buttonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	clearButton: {
		backgroundColor: '#ff3b30',
		paddingVertical: 10,
		borderRadius: 8,
		alignItems: 'center',
		marginBottom: 20,
	},
	clearButtonText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '600',
	},
	resultsContainer: {
		backgroundColor: '#fff',
		padding: 15,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#ddd',
	},
	resultsTitle: {
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 10,
		color: '#333',
	},
	resultText: {
		fontSize: 14,
		marginBottom: 5,
		color: '#666',
		fontFamily: 'monospace',
	},
	noResults: {
		fontSize: 14,
		color: '#999',
		fontStyle: 'italic',
	},
});
