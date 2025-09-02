// UnknownIntentClarifier.tsx - Handles UNKNOWN intent cases with clarifying questions
// Provides 1-tap choices to help users clarify their intent

import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Intent } from '../../../../src/components/assistant/enhancedIntentMapper';

interface UnknownIntentClarifierProps {
	onIntentSelected: (intent: Intent) => void;
	onDismiss?: () => void;
}

const intentChoices = [
	{
		label: 'Budget status',
		intent: 'GET_BUDGET_STATUS' as Intent,
		icon: 'pie-chart' as keyof typeof Ionicons.glyphMap,
		description: "Check how much you've spent and what's remaining",
	},
	{
		label: 'Create budget',
		intent: 'CREATE_BUDGET' as Intent,
		icon: 'add-circle' as keyof typeof Ionicons.glyphMap,
		description: 'Set up a new spending category',
	},
	{
		label: 'Forecast next month',
		intent: 'FORECAST_SPEND' as Intent,
		icon: 'trending-up' as keyof typeof Ionicons.glyphMap,
		description: 'Predict your future spending',
	},
	{
		label: 'Account balance',
		intent: 'GET_BALANCE' as Intent,
		icon: 'wallet' as keyof typeof Ionicons.glyphMap,
		description: 'See how much money you have available',
	},
	{
		label: 'Goal progress',
		intent: 'GET_GOAL_PROGRESS' as Intent,
		icon: 'flag' as keyof typeof Ionicons.glyphMap,
		description: 'Track your savings goals',
	},
	{
		label: 'General help',
		intent: 'GENERAL_QA' as Intent,
		icon: 'help-circle' as keyof typeof Ionicons.glyphMap,
		description: 'Get financial advice and tips',
	},
];

export default function UnknownIntentClarifier({
	onIntentSelected,
	onDismiss,
}: UnknownIntentClarifierProps) {
	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Ionicons name="help-circle" size={24} color="#6B7280" />
				<Text style={styles.title}>I&apos;m not sure what you&apos;re asking about</Text>
				<Text style={styles.subtitle}>
					Could you clarify? Here are some common topics:
				</Text>
			</View>

			<ScrollView
				style={styles.choicesContainer}
				showsVerticalScrollIndicator={false}
			>
				{intentChoices.map((choice, index) => (
					<TouchableOpacity
						key={choice.intent}
						style={styles.choiceButton}
						onPress={() => onIntentSelected(choice.intent)}
						activeOpacity={0.7}
					>
						<View style={styles.choiceContent}>
							<View style={styles.iconContainer}>
								<Ionicons name={choice.icon} size={20} color="#3B82F6" />
							</View>
							<View style={styles.textContainer}>
								<Text style={styles.choiceLabel}>{choice.label}</Text>
								<Text style={styles.choiceDescription}>
									{choice.description}
								</Text>
							</View>
							<Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
						</View>
					</TouchableOpacity>
				))}
			</ScrollView>

			{onDismiss && (
				<TouchableOpacity
					style={styles.dismissButton}
					onPress={onDismiss}
					activeOpacity={0.7}
				>
					<Text style={styles.dismissText}>Or ask something else</Text>
				</TouchableOpacity>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		padding: 20,
		margin: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
	},
	header: {
		alignItems: 'center',
		marginBottom: 20,
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		color: '#1F2937',
		textAlign: 'center',
		marginTop: 8,
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
		color: '#6B7280',
		textAlign: 'center',
		lineHeight: 20,
	},
	choicesContainer: {
		maxHeight: 400,
	},
	choiceButton: {
		backgroundColor: '#F9FAFB',
		borderRadius: 8,
		padding: 16,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	choiceContent: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#EFF6FF',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	textContainer: {
		flex: 1,
	},
	choiceLabel: {
		fontSize: 16,
		fontWeight: '500',
		color: '#1F2937',
		marginBottom: 2,
	},
	choiceDescription: {
		fontSize: 14,
		color: '#6B7280',
		lineHeight: 18,
	},
	dismissButton: {
		marginTop: 16,
		paddingVertical: 12,
		alignItems: 'center',
	},
	dismissText: {
		fontSize: 14,
		color: '#6B7280',
		textDecorationLine: 'underline',
	},
});
