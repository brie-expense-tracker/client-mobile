import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ApiService } from '../services/core/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ConnectivityTest() {
	const [isLoading, setIsLoading] = useState(false);
	const [results, setResults] = useState<string[]>([]);

	const addResult = (message: string) => {
		setResults((prev) => [
			...prev,
			`${new Date().toLocaleTimeString()}: ${message}`,
		]);
	};

	const testConnectivity = async () => {
		setIsLoading(true);
		setResults([]);

		try {
			// Test 1: Basic connectivity
			addResult('Testing server connectivity...');
			const isConnected = await ApiService.testConnection();
			if (isConnected) {
				addResult('✅ Server connectivity: SUCCESS');
			} else {
				addResult('❌ Server connectivity: FAILED');
			}

			// Test 2: Check AsyncStorage
			addResult('Checking AsyncStorage...');
			const firebaseUID = await AsyncStorage.getItem('firebaseUID');
			if (firebaseUID) {
				addResult(`✅ Firebase UID found: ${firebaseUID.substring(0, 8)}...`);
			} else {
				addResult('❌ No Firebase UID in AsyncStorage');
			}

			// Test 3: Test authentication
			if (firebaseUID) {
				addResult('Testing authentication...');
				const isAuthenticated = await ApiService.testAuthentication();
				if (isAuthenticated) {
					addResult('✅ Authentication: SUCCESS');
				} else {
					addResult('❌ Authentication: FAILED');
				}
			} else {
				addResult('⚠️ Skipping authentication test (no Firebase UID)');
			}
		} catch (error) {
			addResult(
				`❌ Test error: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`
			);
		} finally {
			setIsLoading(false);
		}
	};

	const clearResults = () => {
		setResults([]);
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Connectivity Test</Text>

			<TouchableOpacity
				style={styles.testButton}
				onPress={testConnectivity}
				disabled={isLoading}
			>
				<Text style={styles.buttonText}>
					{isLoading ? 'Testing...' : 'Run Connectivity Test'}
				</Text>
			</TouchableOpacity>

			<TouchableOpacity style={styles.clearButton} onPress={clearResults}>
				<Text style={styles.clearButtonText}>Clear Results</Text>
			</TouchableOpacity>

			<View style={styles.resultsContainer}>
				<Text style={styles.resultsTitle}>Test Results:</Text>
				{results.map((result, index) => (
					<Text key={index} style={styles.resultText}>
						{result}
					</Text>
				))}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 20,
		backgroundColor: '#f8f9fa',
		borderRadius: 12,
		margin: 16,
	},
	title: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 16,
		textAlign: 'center',
		color: '#333',
	},
	testButton: {
		backgroundColor: '#007AFF',
		padding: 12,
		borderRadius: 8,
		marginBottom: 12,
	},
	buttonText: {
		color: 'white',
		textAlign: 'center',
		fontWeight: '600',
	},
	clearButton: {
		backgroundColor: '#6c757d',
		padding: 8,
		borderRadius: 6,
		marginBottom: 16,
	},
	clearButtonText: {
		color: 'white',
		textAlign: 'center',
		fontSize: 14,
	},
	resultsContainer: {
		backgroundColor: 'white',
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#dee2e6',
	},
	resultsTitle: {
		fontWeight: 'bold',
		marginBottom: 8,
		color: '#333',
	},
	resultText: {
		fontSize: 12,
		marginBottom: 4,
		color: '#666',
		fontFamily: 'monospace',
	},
});
