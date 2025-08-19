import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useProfile } from '@/src/context/profileContext';

const AICoachSection = () => {
	const { profile } = useProfile();
	const aiInsightsEnabled = profile?.preferences?.aiInsights?.enabled ?? false;

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
