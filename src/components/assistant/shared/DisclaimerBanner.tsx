import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DisclaimerBannerProps {
	contentKind?: string;
	showDisclaimer?: boolean;
}

export default function DisclaimerBanner({
	contentKind,
	showDisclaimer,
}: DisclaimerBannerProps) {
	// Show disclaimer for strategy content or when explicitly requested
	if (contentKind !== 'strategy' && !showDisclaimer) {
		return null;
	}

	return (
		<View style={styles.disclaimerContainer}>
			<Ionicons name="information-circle" size={16} color="#ef4444" />
			<Text style={styles.disclaimerText}>
				These are educational insights, not financial advice.
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	disclaimerContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fef2f2',
		borderLeftWidth: 4,
		borderLeftColor: '#ef4444',
		padding: 12,
		marginTop: 8,
		borderRadius: 8,
		gap: 8,
	},
	disclaimerText: {
		fontSize: 14,
		color: '#dc2626',
		fontWeight: '500',
		flex: 1,
	},
});
