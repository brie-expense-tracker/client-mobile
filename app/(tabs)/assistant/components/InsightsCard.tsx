import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sharedStyles } from '../../../../src/components/assistant/sharedStyles';
import { logChat } from '../../../../src/services/feature/analyticsService';

interface InsightsCardProps {
	insights: any[];
	suggestions: any[];
	factPackId?: string; // Add fact pack ID for logging
}

export default function InsightsCard({
	insights,
	suggestions,
	factPackId,
}: InsightsCardProps) {
	const getInsightIcon = (type: string) => {
		switch (type) {
			case 'warning':
				return 'warning';
			case 'info':
				return 'information-circle';
			case 'suggestion':
				return 'bulb';
			default:
				return 'sparkles';
		}
	};

	const getInsightColor = (type: string) => {
		switch (type) {
			case 'warning':
				return '#3b82f6';
			case 'info':
				return '#3b82f6';
			case 'suggestion':
				return '#3b82f6';
			default:
				return '#3b82f6';
		}
	};

	const getSuggestionIcon = (type: string) => {
		switch (type) {
			case 'action':
				return 'play-circle';
			case 'tip':
				return 'lightbulb';
			default:
				return 'checkmark-circle';
		}
	};

	const getSuggestionColor = (type: string) => {
		switch (type) {
			case 'action':
				return '#3b82f6';
			case 'tip':
				return '#3b82f6';
			default:
				return '#3b82f6';
		}
	};

	// Handle "Why this?" button press
	const handleWhyThis = (insight: any, index: number) => {
		// Log the insight explanation request
		logChat({
			intent: 'INSIGHT_EXPLANATION',
			usedGrounding: true,
			model: 'localML',
			tokensIn: 0,
			tokensOut: 0,
			hadActions: false,
			hadCard: false,
			fallback: false,
			userSatisfaction: undefined,
			insightId: insight.id || `insight_${index}`,
			factPackId: factPackId || 'unknown',
			insightType: insight.type || 'unknown',
			insightTitle: insight.title || 'Unknown',
		});

		// Show explanation (for now, just an alert - in production this would show detailed reasoning)
		Alert.alert(
			'Why This Insight?',
			insight.explanation || 
			'This insight was generated based on your financial data patterns and spending behavior analysis.',
			[{ text: 'Got it', style: 'default' }]
		);
	};

	// Handle "Mark wrong" button press
	const handleMarkWrong = (insight: any, index: number) => {
		// Log the insight being marked as wrong
		logChat({
			intent: 'INSIGHT_FEEDBACK',
			usedGrounding: true,
			model: 'localML',
			tokensIn: 0,
			tokensOut: 0,
			hadActions: false,
			hadCard: false,
			fallback: false,
			userSatisfaction: 'thumbs_down',
			insightId: insight.id || `insight_${index}`,
			factPackId: factPackId || 'unknown',
			insightType: insight.type || 'unknown',
			insightTitle: insight.title || 'Unknown',
			dissatisfactionReason: 'insight_incorrect',
		});

		Alert.alert(
			'Insight Marked as Wrong',
			'Thank you for the feedback. This helps us improve our insights. The insight has been logged for review.',
			[{ text: 'Got it', style: 'default' }]
		);
	};

	return (
		<>
			{/* Insights Section - Independent of message bubble */}
			{insights.length > 0 && (
				<View style={styles.insightsSection}>
					<View style={styles.insightsHeader}>
						<Ionicons name="sparkles" size={16} color="#3b82f6" />
						<Text style={styles.insightsTitle}>Quick Insights</Text>
					</View>
					<View style={styles.insightsList}>
						{insights.map((insight, index) => (
							<View key={index} style={styles.insightCard}>
								<View style={styles.insightIconContainer}>
									<Ionicons
										name={getInsightIcon(insight.type) as any}
										size={16}
										color={getInsightColor(insight.type)}
									/>
								</View>
								<View style={styles.insightContent}>
									<Text style={styles.insightTitle}>{insight.title}</Text>
									<Text style={styles.insightMessage} numberOfLines={4}>
										{insight.message}
									</Text>
									{insight.priority === 'high' && (
										<View style={styles.priorityBadge}>
											<Text style={styles.priorityText}>High Priority</Text>
										</View>
									)}
									
									{/* Grounding & Guardrails: Why this? + Mark wrong buttons */}
									<View style={styles.insightActions}>
										<TouchableOpacity
											style={styles.actionButton}
											onPress={() => handleWhyThis(insight, index)}
										>
											<Ionicons name="help-circle-outline" size={14} color="#6b7280" />
											<Text style={styles.actionButtonText}>Why this?</Text>
										</TouchableOpacity>
										
										<TouchableOpacity
											style={[styles.actionButton, styles.markWrongButton]}
											onPress={() => handleMarkWrong(insight, index)}
										>
											<Ionicons name="close-circle-outline" size={14} color="#ef4444" />
											<Text style={[styles.actionButtonText, styles.markWrongText]}>Mark wrong</Text>
										</TouchableOpacity>
									</View>
								</View>
							</View>
						))}
					</View>
				</View>
			)}

			{/* Message Bubble */}
			<View style={[sharedStyles.msgWrap, sharedStyles.msgAI]}>
				{/* Suggestions Section */}
				{suggestions.length > 0 && (
					<View style={styles.suggestionsSection}>
						<View style={styles.suggestionsHeader}>
							<Ionicons name="flag" size={16} color="#3b82f6" />
							<Text style={styles.suggestionsTitle}>Smart Suggestions</Text>
						</View>
						<View style={styles.suggestionsList}>
							{suggestions.map((suggestion, index) => (
								<View key={index} style={styles.suggestionCard}>
									<View style={styles.suggestionIconContainer}>
										<Ionicons
											name={getSuggestionIcon(suggestion.type) as any}
											size={16}
											color={getSuggestionColor(suggestion.type)}
										/>
									</View>
									<View style={styles.suggestionContent}>
										<Text style={styles.suggestionTitle}>
											{suggestion.title}
										</Text>
										<Text
											style={styles.suggestionDescription}
											numberOfLines={2}
										>
											{suggestion.description}
										</Text>
										<View style={styles.suggestionBadge}>
											<Text style={styles.suggestionBadgeText}>
												{suggestion.category}
											</Text>
										</View>
									</View>
								</View>
							))}
						</View>
					</View>
				)}
			</View>
		</>
	);
}

const styles = StyleSheet.create({
	// Insights Card styles
	insightsSection: {
		marginBottom: 12,
		width: '100%',
		alignSelf: 'stretch',
	},
	insightsHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
		gap: 6,
	},
	insightsTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1e293b',
	},
	insightsList: {
		gap: 10,
	},
	insightCard: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: '#f1f5f9',
		borderRadius: 8,
		padding: 12,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		shadowColor: '#000',
		shadowOpacity: 0.04,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 1 },
		elevation: 1,
		minHeight: 60,
	},
	insightIconContainer: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#f8fafc',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 8,
		flexShrink: 0,
	},
	insightContent: {
		flex: 1,
		minWidth: 0,
		paddingRight: 4,
	},
	insightTitle: {
		fontSize: 13,
		fontWeight: '600',
		color: '#1e293b',
		marginBottom: 2,
	},
	insightMessage: {
		fontSize: 12,
		color: '#64748b',
		lineHeight: 18,
		marginBottom: 6,
		flexWrap: 'wrap',
	},
	priorityBadge: {
		alignSelf: 'flex-start',
		backgroundColor: '#fef2f2',
		borderRadius: 8,
		paddingHorizontal: 6,
		paddingVertical: 2,
	},
	priorityText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#dc2626',
	},

	// Suggestions Section styles
	suggestionsSection: {
		marginTop: 12,
	},
	suggestionsHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
		gap: 6,
	},
	suggestionsTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1e293b',
	},
	suggestionsList: {
		gap: 8,
	},
	suggestionCard: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: '#f1f5f9',
		borderRadius: 8,
		padding: 8,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		shadowColor: '#000',
		shadowOpacity: 0.04,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 1 },
		elevation: 1,
	},
	suggestionIconContainer: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#f8fafc',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 8,
		flexShrink: 0,
	},
	suggestionContent: {
		flex: 1,
		minWidth: 0,
	},
	suggestionTitle: {
		fontSize: 13,
		fontWeight: '600',
		color: '#1e293b',
		marginBottom: 2,
	},
	suggestionDescription: {
		fontSize: 12,
		color: '#64748b',
		lineHeight: 16,
		marginBottom: 6,
		flexWrap: 'wrap',
	},
	suggestionBadge: {
		alignSelf: 'flex-start',
		backgroundColor: '#f0f9ff',
		borderRadius: 8,
		paddingHorizontal: 6,
		paddingVertical: 2,
	},
	suggestionBadgeText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#0369a1',
		textTransform: 'capitalize',
	},

	// Grounding & Guardrails styles
	insightActions: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 8,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#e0e7ff',
		borderRadius: 8,
		paddingVertical: 6,
		paddingHorizontal: 12,
		gap: 4,
	},
	actionButtonText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#3b82f6',
	},
	markWrongButton: {
		backgroundColor: '#fef2f2',
	},
	markWrongText: {
		color: '#ef4444',
	},
});
