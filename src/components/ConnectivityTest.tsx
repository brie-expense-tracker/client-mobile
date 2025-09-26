import React, { useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	ActivityIndicator,
	Share,
	Platform,
} from 'react-native';
import { ApiService } from '../services/core/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConnectivity } from '../utils/connectivity';

export default function ConnectivityTest() {
	const [isLoading, setIsLoading] = useState(false);
	const [results, setResults] = useState<string[]>([]);
	const { isOnline, isChecking, checkConnectivity } = useConnectivity();

	const addResult = (message: string) => {
		setResults((prev) => [
			...prev,
			`${new Date().toLocaleTimeString()}: ${message}`,
		]);
	};

	// No need for useEffect since useConnectivity handles network monitoring

	const testConnectivity = async () => {
		setIsLoading(true);
		setResults([]);

		try {
			// Test 0: Network information
			addResult('Checking network information...');
			addResult(`📡 Connection: ${isOnline ? 'Connected' : 'Disconnected'}`);
			addResult(`🔄 Checking: ${isChecking ? 'Yes' : 'No'}`);

			// Force a connectivity check
			await checkConnectivity();
			addResult(`📡 After check: ${isOnline ? 'Connected' : 'Disconnected'}`);

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

			// Test 4: Test API endpoints
			addResult('Testing API endpoints...');
			try {
				const response = await ApiService.get('/health');
				if (response.success) {
					addResult('✅ Health endpoint: SUCCESS');
				} else {
					addResult('❌ Health endpoint: FAILED');
				}
			} catch {
				addResult('❌ Health endpoint: ERROR');
			}

			// Test 5: Performance test
			addResult('Running performance test...');
			const startTime = Date.now();
			try {
				await ApiService.testConnection();
				const endTime = Date.now();
				const responseTime = endTime - startTime;
				addResult(`⏱️ Response time: ${responseTime}ms`);
				if (responseTime < 1000) {
					addResult('✅ Performance: EXCELLENT');
				} else if (responseTime < 3000) {
					addResult('⚠️ Performance: ACCEPTABLE');
				} else {
					addResult('❌ Performance: SLOW');
				}
			} catch {
				addResult('❌ Performance test failed');
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

	const exportResults = async () => {
		if (results.length === 0) {
			return;
		}

		const report = [
			'=== Connectivity Test Report ===',
			`Generated: ${new Date().toLocaleString()}`,
			`Platform: ${Platform.OS} ${Platform.Version}`,
			'',
			'Test Results:',
			...results,
			'',
			'=== End Report ===',
		].join('\n');

		try {
			await Share.share({
				message: report,
				title: 'Connectivity Test Report',
			});
		} catch (error) {
			console.error('Failed to share results:', error);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Connectivity Test</Text>

			{/* Network Info Display */}
			<View style={styles.networkInfoContainer}>
				<Text style={styles.networkInfoTitle}>Network Status</Text>
				<Text style={styles.networkInfoText}>
					{isOnline ? '🟢 Connected' : '🔴 Disconnected'}{' '}
					{isChecking && '- Checking...'}
				</Text>
			</View>

			<TouchableOpacity
				style={[styles.testButton, isLoading && styles.testButtonDisabled]}
				onPress={testConnectivity}
				disabled={isLoading}
				accessibilityLabel="Run connectivity test"
				accessibilityHint="Tap to test server connectivity, authentication, and performance"
				accessibilityRole="button"
			>
				{isLoading ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="small" color="white" />
						<Text style={styles.buttonText}>Testing...</Text>
					</View>
				) : (
					<Text style={styles.buttonText}>Run Connectivity Test</Text>
				)}
			</TouchableOpacity>

			<View style={styles.buttonRow}>
				<TouchableOpacity
					style={styles.clearButton}
					onPress={clearResults}
					accessibilityLabel="Clear test results"
					accessibilityRole="button"
				>
					<Text style={styles.clearButtonText}>Clear Results</Text>
				</TouchableOpacity>

				{results.length > 0 && (
					<TouchableOpacity
						style={styles.exportButton}
						onPress={exportResults}
						accessibilityLabel="Export test results"
						accessibilityRole="button"
					>
						<Text style={styles.exportButtonText}>Export Results</Text>
					</TouchableOpacity>
				)}
			</View>

			<ScrollView
				style={styles.resultsContainer}
				showsVerticalScrollIndicator={true}
			>
				<Text style={styles.resultsTitle}>Test Results:</Text>
				{results.length === 0 ? (
					<Text style={styles.noResultsText}>
						No test results yet. Run a test to see results here.
					</Text>
				) : (
					results.map((result, index) => (
						<Text key={index} style={styles.resultText}>
							{result}
						</Text>
					))
				)}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
		backgroundColor: '#f8f9fa',
	},
	title: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 16,
		textAlign: 'center',
		color: '#333',
	},
	networkInfoContainer: {
		backgroundColor: '#e3f2fd',
		padding: 12,
		borderRadius: 8,
		marginBottom: 16,
		borderLeftWidth: 4,
		borderLeftColor: '#2196f3',
	},
	networkInfoTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1976d2',
		marginBottom: 4,
	},
	networkInfoText: {
		fontSize: 12,
		color: '#424242',
	},
	testButton: {
		backgroundColor: '#007AFF',
		padding: 16,
		borderRadius: 8,
		marginBottom: 16,
	},
	testButtonDisabled: {
		backgroundColor: '#a0a0a0',
	},
	loadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	buttonText: {
		color: 'white',
		textAlign: 'center',
		fontWeight: '600',
		fontSize: 16,
	},
	buttonRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 16,
		gap: 12,
	},
	clearButton: {
		backgroundColor: '#6c757d',
		padding: 12,
		borderRadius: 6,
		flex: 1,
	},
	clearButtonText: {
		color: 'white',
		textAlign: 'center',
		fontSize: 14,
		fontWeight: '500',
	},
	exportButton: {
		backgroundColor: '#28a745',
		padding: 12,
		borderRadius: 6,
		flex: 1,
	},
	exportButtonText: {
		color: 'white',
		textAlign: 'center',
		fontSize: 14,
		fontWeight: '500',
	},
	resultsContainer: {
		backgroundColor: 'white',
		padding: 16,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#dee2e6',
		flex: 1,
		maxHeight: 300,
	},
	resultsTitle: {
		fontWeight: 'bold',
		marginBottom: 12,
		color: '#333',
		fontSize: 16,
	},
	noResultsText: {
		fontSize: 14,
		color: '#666',
		textAlign: 'center',
		fontStyle: 'italic',
		marginTop: 20,
	},
	resultText: {
		fontSize: 12,
		marginBottom: 6,
		color: '#666',
		fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
		lineHeight: 16,
	},
});
