import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { palette, radius } from '../ui/theme';

// Simple connectivity check using fetch instead of NetInfo
export const useConnectivity = () => {
	const [isOnline, setIsOnline] = useState(true);
	const [isChecking, setIsChecking] = useState(false);

	const checkConnectivity = useCallback(async () => {
		if (isChecking) return isOnline;

		setIsChecking(true);
		try {
			// Try to fetch a small resource to check connectivity
			await fetch('https://www.google.com/favicon.ico', {
				method: 'HEAD',
				mode: 'no-cors',
				cache: 'no-cache',
			});
			setIsOnline(true);
			return true;
		} catch {
			setIsOnline(false);
			return false;
		} finally {
			// Small debounce to prevent UI flicker
			setTimeout(() => setIsChecking(false), 150);
		}
	}, [isChecking, isOnline]);

	useEffect(() => {
		// Check initial connectivity
		checkConnectivity();

		// Set up periodic checks (every 5 seconds)
		const interval = setInterval(() => {
			checkConnectivity();
		}, 5000);

		return () => clearInterval(interval);
	}, [checkConnectivity]);

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
	const { isOnline } = useConnectivity();

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
		backgroundColor: palette.danger,
		padding: 12,
		zIndex: 1000,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	text: {
		color: palette.text,
		flex: 1,
	},
	buttonContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	button: {
		backgroundColor: palette.surface,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: radius.sm,
		marginRight: 8,
	},
	buttonText: {
		color: palette.danger,
		fontSize: 12,
		fontWeight: 'bold',
	},
	queuedText: {
		color: palette.text,
		fontSize: 12,
	},
});
