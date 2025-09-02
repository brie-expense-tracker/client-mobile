import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Simple connectivity check using fetch instead of NetInfo
export const useConnectivity = () => {
	const [isOnline, setIsOnline] = useState(true);
	const [isChecking, setIsChecking] = useState(false);

	const checkConnectivity = async () => {
		if (isChecking) return;

		setIsChecking(true);
		try {
			// Try to fetch a small resource to check connectivity
			const response = await fetch('https://www.google.com/favicon.ico', {
				method: 'HEAD',
				mode: 'no-cors',
				cache: 'no-cache',
			});
			setIsOnline(true);
		} catch (error) {
			setIsOnline(false);
		} finally {
			setIsChecking(false);
		}
	};

	useEffect(() => {
		// Check initial connectivity
		checkConnectivity();

		// Set up periodic connectivity checks
		const interval = setInterval(checkConnectivity, 30000); // Check every 30 seconds

		return () => clearInterval(interval);
	}, []);

	return {
		isOnline,
		isChecking,
		checkConnectivity,
	};
};

// Simple offline banner component that doesn't rely on NetInfo
export const SimpleOfflineBanner = ({
	onRetry,
	queuedActions = 0,
	onViewQueuedActions,
}: {
	onRetry?: () => void;
	queuedActions?: number;
	onViewQueuedActions?: () => void;
}) => {
	const { isOnline, checkConnectivity } = useConnectivity();

	if (isOnline) return null;

	return (
		<View style={styles.container}>
			<Text style={styles.text}>
				You&apos;re offline. Some features may be limited.
			</Text>
			<View style={styles.buttonContainer}>
				{onRetry && (
					<TouchableOpacity onPress={onRetry} style={styles.button}>
						<Text style={styles.buttonText}>Retry</Text>
					</TouchableOpacity>
				)}
				{queuedActions > 0 && (
					<Text style={styles.queuedText}>
						{queuedActions} action(s) queued
					</Text>
				)}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		backgroundColor: '#ff6b6b',
		padding: 12,
		zIndex: 1000,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	text: {
		color: 'white',
		flex: 1,
	},
	buttonContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	button: {
		backgroundColor: 'white',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
		marginRight: 8,
	},
	buttonText: {
		color: '#ff6b6b',
		fontSize: 12,
		fontWeight: 'bold',
	},
	queuedText: {
		color: 'white',
		fontSize: 12,
	},
});
