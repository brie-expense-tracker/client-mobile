import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import AIInsightsSummary from './AIInsightsSummary';

/**
 * Demo component showing different ways to use AIInsightsSummary
 */
const AIInsightsDemo: React.FC = () => {
	return (
		<ScrollView style={styles.container}>
			<Text style={styles.sectionTitle}>AI Insights Summary Examples</Text>

			{/* Compact version for dashboard */}
			<Text style={styles.exampleTitle}>1. Compact Dashboard Version</Text>
			<AIInsightsSummary maxInsights={1} compact={true} title="AI Coach" />

			{/* Standard version */}
			<Text style={styles.exampleTitle}>2. Standard Version</Text>
			<AIInsightsSummary maxInsights={2} showGenerateButton={false} />

			{/* Full version with generate button */}
			<Text style={styles.exampleTitle}>
				3. Full Version with Generate Button
			</Text>
			<AIInsightsSummary maxInsights={3} showGenerateButton={true} />

			{/* Custom title */}
			<Text style={styles.exampleTitle}>4. Custom Title</Text>
			<AIInsightsSummary
				maxInsights={2}
				title="Financial Tips"
				compact={true}
			/>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
		padding: 16,
	},
	sectionTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#333',
		marginBottom: 20,
		textAlign: 'center',
	},
	exampleTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#666',
		marginTop: 20,
		marginBottom: 8,
	},
});

export default AIInsightsDemo;
