import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import StructuredResponse from './StructuredResponse';
import {
	composeBudgetStatus,
	composeSpendingInsight,
	composeGoalProgress,
	composeGenericResponse,
} from '../../../../src/components/assistant/responseSchema';

export default function StructuredResponseDemo() {
	// Demo data
	const demoBudgetData = {
		spent: 850,
		total: 1200,
		byCat: [
			{ cat: 'Food', spent: 300, limit: 400 },
			{ cat: 'Transport', spent: 200, limit: 250 },
			{ cat: 'Entertainment', spent: 150, limit: 200 },
		],
	};

	const demoGoalData = {
		id: '1',
		name: 'Emergency Fund',
		current: 2500,
		target: 5000,
	};

	const demoInsightData = {
		summary: 'Your spending is 15% higher than last month',
		details: 'Main increases in food and entertainment categories',
		data: {
			prediction: "At this rate, you'll exceed budget by month end",
		},
		actions: [
			{ label: 'View detailed breakdown', action: 'OPEN_BUDGETS' as const },
		],
		sources: [{ kind: 'localML' as const }],
	};

	const demoGenericData = composeGenericResponse(
		"Here's a helpful tip: Consider setting up automatic transfers to your savings account on payday.",
		{ budgets: [], goals: [], transactions: [] }
	);

	return (
		<ScrollView style={styles.container}>
			<Text style={styles.title}>Structured Response Demo</Text>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Budget Status Response</Text>
				<StructuredResponse
					response={composeBudgetStatus(demoBudgetData, {})}
					onAction={(action, params) => console.log('Action:', action, params)}
				/>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Goal Progress Response</Text>
				<StructuredResponse
					response={composeGoalProgress(demoGoalData, {})}
					onAction={(action, params) => console.log('Action:', action, params)}
				/>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Spending Insight Response</Text>
				<StructuredResponse
					response={composeSpendingInsight(demoInsightData, {})}
					onAction={(action, params) => console.log('Action:', action, params)}
				/>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Generic Response</Text>
				<StructuredResponse
					response={demoGenericData}
					onAction={(action, params) => console.log('Action:', action, params)}
				/>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafc',
		padding: 16,
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: '#1f2937',
		marginBottom: 24,
		textAlign: 'center',
	},
	section: {
		marginBottom: 32,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 16,
	},
});
