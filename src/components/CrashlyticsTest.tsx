import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { crashReporting } from '../services/feature/crashReporting';

export const CrashlyticsTest: React.FC = () => {
	const testCrashlytics = () => {
		try {
			// Test various Crashlytics features
			crashReporting.testCrashlytics();

			// Test custom attributes
			crashReporting.setContext('test_screen', 'CrashlyticsTest');
			crashReporting.setContext('test_timestamp', new Date().toISOString());

			// Test error capture
			crashReporting.captureError(
				new Error('Test error from CrashlyticsTest component'),
				{
					screen: 'CrashlyticsTest',
					action: 'test_button_pressed',
					additional_data: { test: true, timestamp: Date.now() },
				}
			);

			Alert.alert(
				'Success',
				'Crashlytics test completed! Check your Firebase console.'
			);
		} catch (error) {
			console.error('Crashlytics test failed:', error);
			Alert.alert(
				'Error',
				'Crashlytics test failed. Check console for details.'
			);
		}
	};

	const testNonFatalError = () => {
		try {
			// This will record an error but won't crash the app
			crashReporting.captureError(new Error('Non-fatal test error'), {
				screen: 'CrashlyticsTest',
				action: 'test_non_fatal_error',
				additional_data: { severity: 'low', test: true },
			});

			Alert.alert('Success', 'Non-fatal error recorded!');
		} catch (error) {
			console.error('Non-fatal error test failed:', error);
			Alert.alert('Error', 'Non-fatal error test failed.');
		}
	};

	const testCustomAttributes = () => {
		try {
			// Set various custom attributes
			crashReporting.setContext('user_preference', 'dark_mode');
			crashReporting.setContext('app_state', 'active');
			crashReporting.setContext('last_action', 'test_attributes');

			Alert.alert('Success', 'Custom attributes set!');
		} catch (error) {
			console.error('Custom attributes test failed:', error);
			Alert.alert('Error', 'Custom attributes test failed.');
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Crashlytics Test Panel</Text>
			<Text style={styles.subtitle}>
				Use these buttons to test Crashlytics functionality
			</Text>

			<TouchableOpacity style={styles.button} onPress={testCrashlytics}>
				<Text style={styles.buttonText}>Test Crashlytics</Text>
			</TouchableOpacity>

			<TouchableOpacity style={styles.button} onPress={testNonFatalError}>
				<Text style={styles.buttonText}>Test Non-Fatal Error</Text>
			</TouchableOpacity>

			<TouchableOpacity style={styles.button} onPress={testCustomAttributes}>
				<Text style={styles.buttonText}>Test Custom Attributes</Text>
			</TouchableOpacity>

			<View style={styles.info}>
				<Text style={styles.infoText}>
					• Check Firebase Console for crash reports{'\n'}• Development builds
					collect logs but not crashes{'\n'}• Production builds collect
					everything when enabled
				</Text>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		padding: 20,
		backgroundColor: '#f5f5f5',
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		textAlign: 'center',
		marginBottom: 10,
		color: '#333',
	},
	subtitle: {
		fontSize: 16,
		textAlign: 'center',
		marginBottom: 20,
		color: '#666',
	},
	button: {
		backgroundColor: '#007AFF',
		padding: 15,
		borderRadius: 8,
		marginBottom: 15,
		alignItems: 'center',
	},
	buttonText: {
		color: 'white',
		fontSize: 16,
		fontWeight: '600',
	},
	info: {
		backgroundColor: '#e8f4fd',
		padding: 15,
		borderRadius: 8,
		borderLeftWidth: 4,
		borderLeftColor: '#007AFF',
	},
	infoText: {
		color: '#333',
		fontSize: 14,
		lineHeight: 20,
	},
});
