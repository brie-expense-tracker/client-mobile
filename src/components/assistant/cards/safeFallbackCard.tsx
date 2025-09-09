// Safe Fallback Card Component
// Displays when Tools-Only Contract violations are detected

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SafeFallbackCardProps {
	message: string;
	violations: string[];
	intent: string;
	timeWindow: string;
	onRetry?: () => void;
}

export const SafeFallbackCard: React.FC<SafeFallbackCardProps> = ({
	message,
	violations,
	intent,
	timeWindow,
	onRetry,
}) => {
	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Data Verification Needed</Text>
				<Text style={styles.subtitle}>Time Period: {timeWindow}</Text>
			</View>

			<View style={styles.content}>
				<Text style={styles.message}>{message}</Text>

				{violations.length > 0 && (
					<View style={styles.violationsContainer}>
						<Text style={styles.violationsTitle}>Data Issues Detected:</Text>
						{violations.map((violation, index) => (
							<Text key={index} style={styles.violation}>
								• {violation}
							</Text>
						))}
					</View>
				)}

				<View style={styles.footer}>
					<Text style={styles.footerText}>
						For the most accurate information, please check your account
						directly.
					</Text>
					{onRetry && (
						<Text style={styles.retryText} onPress={onRetry}>
							Try Again
						</Text>
					)}
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#fff8f0',
		borderColor: '#ffa500',
		borderWidth: 1,
		borderRadius: 8,
		padding: 16,
		marginVertical: 8,
	},
	header: {
		marginBottom: 12,
	},
	title: {
		fontSize: 16,
		fontWeight: '600',
		color: '#d97706',
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
		color: '#92400e',
	},
	content: {
		marginBottom: 12,
	},
	message: {
		fontSize: 14,
		color: '#374151',
		lineHeight: 20,
		marginBottom: 12,
	},
	violationsContainer: {
		backgroundColor: '#fef2f2',
		borderColor: '#fecaca',
		borderWidth: 1,
		borderRadius: 6,
		padding: 12,
		marginBottom: 12,
	},
	violationsTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#dc2626',
		marginBottom: 8,
	},
	violation: {
		fontSize: 13,
		color: '#991b1b',
		marginBottom: 4,
	},
	footer: {
		borderTopColor: '#e5e7eb',
		borderTopWidth: 1,
		paddingTop: 12,
	},
	footerText: {
		fontSize: 13,
		color: '#6b7280',
		marginBottom: 8,
	},
	retryText: {
		fontSize: 14,
		color: '#2563eb',
		fontWeight: '500',
		textAlign: 'center',
	},
});

export default SafeFallbackCard;
