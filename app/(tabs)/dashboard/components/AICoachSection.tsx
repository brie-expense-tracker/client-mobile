import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AICoachSection = () => {
	return (
		<View style={styles.aiInsightsContainer}>
			<View style={styles.aiInsightsHeader}>
				<Text style={styles.aiInsightsTitle}>AI Insights</Text>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	aiInsightsContainer: {
		marginBottom: 16,
	},
	aiInsightsHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	aiInsightsTitle: {
		fontWeight: '600',
		fontSize: 18,
		color: '#333',
	},
	viewAllInsightsText: {
		color: '#889195',
		fontSize: 14,
		fontWeight: '500',
	},
});

export default AICoachSection;
