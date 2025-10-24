// IntentConfidenceDisplay.tsx - Shows confidence scores and secondary intents
// Provides transparency into the routing decision process

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
	IntentScore,
	RouteDecision,
} from '../../../../src/services/assistant/enhancedIntentMapper';

interface IntentConfidenceDisplayProps {
	routeDecision: RouteDecision;
	onSecondaryIntentSelect?: (intent: IntentScore) => void;
	showDetails?: boolean;
}

export default function IntentConfidenceDisplay({
	routeDecision,
	onSecondaryIntentSelect,
	showDetails = false,
}: IntentConfidenceDisplayProps) {
	const { primary, secondary, routeType, calibrated } = routeDecision;

	const getConfidenceColor = (confidence: 'low' | 'medium' | 'high') => {
		switch (confidence) {
			case 'high':
				return '#10B981';
			case 'medium':
				return '#F59E0B';
			case 'low':
				return '#EF4444';
		}
	};

	const getRouteTypeIcon = (type: string) => {
		switch (type) {
			case 'grounded':
				return 'checkmark-circle';
			case 'llm':
				return 'chatbubble-ellipses';
			case 'unknown':
				return 'help-circle';
			default:
				return 'information-circle';
		}
	};

	const getRouteTypeColor = (type: string) => {
		switch (type) {
			case 'grounded':
				return '#10B981';
			case 'llm':
				return '#3B82F6';
			case 'unknown':
				return '#F59E0B';
			default:
				return '#6B7280';
		}
	};

	return (
		<View style={styles.container}>
			{/* Primary Intent */}
			<View style={styles.primaryIntent}>
				<View style={styles.intentHeader}>
					<Text style={styles.intentLabel}>Primary Intent</Text>
					<View style={styles.confidenceBadge}>
						<Text
							style={[
								styles.confidenceText,
								{ color: getConfidenceColor(primary.confidence) },
							]}
						>
							{primary.confidence.toUpperCase()}
						</Text>
					</View>
				</View>

				<View style={styles.intentContent}>
					<Text style={styles.intentName}>
						{primary.intent.replace(/_/g, ' ')}
					</Text>
					<Text style={styles.confidenceScore}>
						{Math.round(primary.calibratedP * 100)}% confidence
					</Text>
				</View>

				<View style={styles.routeInfo}>
					<Ionicons
						name={getRouteTypeIcon(routeType)}
						size={16}
						color={getRouteTypeColor(routeType)}
					/>
					<Text
						style={[styles.routeType, { color: getRouteTypeColor(routeType) }]}
					>
						{routeType.toUpperCase()} route
					</Text>
					{calibrated && (
						<View style={styles.calibratedBadge}>
							<Ionicons name="thermometer" size={12} color="#6B7280" />
							<Text style={styles.calibratedText}>Calibrated</Text>
						</View>
					)}
				</View>
			</View>

			{/* Secondary Intents */}
			{secondary && secondary.length > 0 && (
				<View style={styles.secondaryIntents}>
					<Text style={styles.secondaryTitle}>Also detected:</Text>
					{secondary.map((intent, index) => (
						<TouchableOpacity
							key={intent.intent}
							style={styles.secondaryIntent}
							onPress={() => onSecondaryIntentSelect?.(intent)}
							disabled={!onSecondaryIntentSelect}
						>
							<View style={styles.secondaryContent}>
								<Text style={styles.secondaryIntentName}>
									{intent.intent.replace(/_/g, ' ')}
								</Text>
								<Text style={styles.secondaryConfidence}>
									{Math.round(intent.calibratedP * 100)}%
								</Text>
							</View>
							{onSecondaryIntentSelect && (
								<Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
							)}
						</TouchableOpacity>
					))}
				</View>
			)}

			{/* Shadow Route Info */}
			{routeDecision.shadowRoute && showDetails && (
				<View style={styles.shadowRoute}>
					<View style={styles.shadowHeader}>
						<Ionicons name="eye" size={16} color="#6B7280" />
						<Text style={styles.shadowTitle}>Shadow Route</Text>
					</View>
					<Text style={styles.shadowInfo}>
						Alternative:{' '}
						{routeDecision.shadowRoute.alternativeIntent.replace(/_/g, ' ')}
					</Text>
					<Text style={styles.shadowDelta}>
						Confidence delta:{' '}
						{Math.round(routeDecision.shadowRoute.delta * 100)}%
					</Text>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#FFFFFF',
		borderRadius: 8,
		padding: 16,
		margin: 8,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	primaryIntent: {
		marginBottom: 16,
	},
	intentHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	intentLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
	},
	confidenceBadge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 12,
		backgroundColor: '#F3F4F6',
	},
	confidenceText: {
		fontSize: 10,
		fontWeight: '600',
	},
	intentContent: {
		marginBottom: 8,
	},
	intentName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1F2937',
		marginBottom: 2,
	},
	confidenceScore: {
		fontSize: 14,
		color: '#6B7280',
	},
	routeInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	routeType: {
		fontSize: 12,
		fontWeight: '500',
	},
	calibratedBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 8,
		backgroundColor: '#F3F4F6',
	},
	calibratedText: {
		fontSize: 10,
		color: '#6B7280',
		fontWeight: '500',
	},
	secondaryIntents: {
		borderTopWidth: 1,
		borderTopColor: '#E5E7EB',
		paddingTop: 16,
	},
	secondaryTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 8,
	},
	secondaryIntent: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 12,
		backgroundColor: '#F9FAFB',
		borderRadius: 6,
		marginBottom: 6,
	},
	secondaryContent: {
		flex: 1,
	},
	secondaryIntentName: {
		fontSize: 14,
		fontWeight: '500',
		color: '#374151',
		marginBottom: 2,
	},
	secondaryConfidence: {
		fontSize: 12,
		color: '#6B7280',
	},
	shadowRoute: {
		borderTopWidth: 1,
		borderTopColor: '#E5E7EB',
		paddingTop: 16,
		marginTop: 16,
	},
	shadowHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginBottom: 8,
	},
	shadowTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
	},
	shadowInfo: {
		fontSize: 12,
		color: '#6B7280',
		marginBottom: 2,
	},
	shadowDelta: {
		fontSize: 12,
		color: '#6B7280',
		fontStyle: 'italic',
	},
});
