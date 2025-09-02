import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatResponse } from '../../../../src/components/assistant/responseSchema';
import StructuredResponse from './StructuredResponse';

interface FallbackTestProps {
	onAction?: (action: string, params?: any) => void;
}

export default function FallbackTest({ onAction }: FallbackTestProps) {
	// Create a sample fallback response to demonstrate the new UX
	const sampleFallback: ChatResponse = {
		message: 'I can partially help now and finish once I have more data.',
		details:
			"Based on your data through Aug 25, you're at $212/$400 for groceries. Want me to predict Sept with your typical cadence?",
		actions: [
			{
				label: 'Connect Checking',
				action: 'OPEN_BUDGETS',
				params: { focus: 'connect' },
			},
			{
				label: 'Pick a time window',
				action: 'OPEN_BUDGETS',
				params: { focus: 'timeframe' },
			},
			{
				label: 'Open Budgets',
				action: 'OPEN_BUDGETS',
			},
		],
		sources: [{ kind: 'cache' }],
		cost: { model: 'mini', estTokens: 0 },
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>New Fallback UX Test</Text>
			<Text style={styles.subtitle}>
				This demonstrates the improved fallback pattern:
			</Text>

			<View style={styles.patternContainer}>
				<View style={styles.patternItem}>
					<Text style={styles.patternNumber}>1</Text>
					<Text style={styles.patternText}>Direct, honest status</Text>
				</View>
				<View style={styles.patternItem}>
					<Text style={styles.patternNumber}>2</Text>
					<Text style={styles.patternText}>Best next action buttons</Text>
				</View>
				<View style={styles.patternItem}>
					<Text style={styles.patternNumber}>3</Text>
					<Text style={styles.patternText}>Useful fact from data</Text>
				</View>
			</View>

			<View style={styles.responseContainer}>
				<Text style={styles.responseTitle}>Example Response:</Text>
				<StructuredResponse response={sampleFallback} onAction={onAction} />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 16,
		backgroundColor: '#ffffff',
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		color: '#1f2937',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 14,
		color: '#6b7280',
		marginBottom: 16,
		lineHeight: 20,
	},
	patternContainer: {
		marginBottom: 24,
	},
	patternItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	patternNumber: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#3b82f6',
		color: '#ffffff',
		textAlign: 'center',
		lineHeight: 24,
		fontSize: 12,
		fontWeight: '600',
		marginRight: 12,
	},
	patternText: {
		fontSize: 14,
		color: '#374151',
		fontWeight: '500',
	},
	responseContainer: {
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 8,
		padding: 16,
		backgroundColor: '#f9fafb',
	},
	responseTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 12,
	},
});
