/**
 * Why This Tray Component
 *
 * Expandable tray that shows reasoning and performance data from trace events
 * Provides transparency into AI decision-making process
 */

import React, { useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	Animated,
	StyleSheet,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TraceEventData } from '../../../../src/services/feature/enhancedStreamingService';

interface WhyThisTrayProps {
	traceData?: TraceEventData;
	performance?: {
		timeToFirstToken: number;
		totalTime: number;
		cacheHit: boolean;
		modelUsed: string;
		tokensUsed: number;
	};
}

export default function WhyThisTray({
	traceData,
	performance,
}: WhyThisTrayProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [animationValue] = useState(new Animated.Value(0));

	const toggleExpanded = () => {
		const toValue = isExpanded ? 0 : 1;
		Animated.timing(animationValue, {
			toValue,
			duration: 300,
			useNativeDriver: false,
		}).start();
		setIsExpanded(!isExpanded);
	};

	const formatTime = (ms: number) => {
		if (ms < 1000) return `${ms}ms`;
		return `${(ms / 1000).toFixed(1)}s`;
	};

	const formatPercentage = (value: number) => {
		return `${Math.round(value * 100)}%`;
	};

	const formatPercentageWidth = (value: number) => {
		return value;
	};

	if (!traceData && !performance) {
		return null;
	}

	return (
		<View style={styles.container}>
			<TouchableOpacity
				style={styles.header}
				onPress={toggleExpanded}
				activeOpacity={0.7}
			>
				<View style={styles.headerContent}>
					<Ionicons name="analytics-outline" size={20} color="#6B7280" />
					<Text style={styles.headerText}>Why this response?</Text>
					<Animated.View
						style={[
							styles.chevron,
							{
								transform: [
									{
										rotate: animationValue.interpolate({
											inputRange: [0, 1],
											outputRange: ['0deg', '180deg'],
										}),
									},
								],
							},
						]}
					>
						<Ionicons name="chevron-down" size={16} color="#6B7280" />
					</Animated.View>
				</View>
			</TouchableOpacity>

			<Animated.View
				style={[
					styles.content,
					{
						height: animationValue.interpolate({
							inputRange: [0, 1],
							outputRange: [0, 300], // Adjust based on content
						}),
						opacity: animationValue,
					},
				]}
			>
				<ScrollView
					style={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					{/* Performance Metrics */}
					{performance && (
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Performance</Text>
							<View style={styles.metricRow}>
								<Text style={styles.metricLabel}>Time to first token:</Text>
								<Text style={styles.metricValue}>
									{formatTime(performance.timeToFirstToken)}
								</Text>
							</View>
							<View style={styles.metricRow}>
								<Text style={styles.metricLabel}>Total time:</Text>
								<Text style={styles.metricValue}>
									{formatTime(performance.totalTime)}
								</Text>
							</View>
							<View style={styles.metricRow}>
								<Text style={styles.metricLabel}>Model:</Text>
								<Text style={styles.metricValue}>{performance.modelUsed}</Text>
							</View>
							<View style={styles.metricRow}>
								<Text style={styles.metricLabel}>Cache hit:</Text>
								<Text style={styles.metricValue}>
									{performance.cacheHit ? 'Yes' : 'No'}
								</Text>
							</View>
							<View style={styles.metricRow}>
								<Text style={styles.metricLabel}>Tokens used:</Text>
								<Text style={styles.metricValue}>{performance.tokensUsed}</Text>
							</View>
						</View>
					)}

					{/* Why This Analysis */}
					{traceData?.whyThis && (
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Analysis</Text>

							{/* Confidence Scores */}
							<View style={styles.scoresContainer}>
								<View style={styles.scoreItem}>
									<Text style={styles.scoreLabel}>Confidence</Text>
									<View style={styles.scoreBar}>
										<View
											style={[
												styles.scoreFill,
												{
													width: formatPercentageWidth(
														traceData.whyThis.totals.confidence
													),
													backgroundColor: '#10B981',
												},
											]}
										/>
									</View>
									<Text style={styles.scoreValue}>
										{formatPercentage(traceData.whyThis.totals.confidence)}
									</Text>
								</View>

								<View style={styles.scoreItem}>
									<Text style={styles.scoreLabel}>Relevance</Text>
									<View style={styles.scoreBar}>
										<View
											style={[
												styles.scoreFill,
												{
													width: formatPercentageWidth(
														traceData.whyThis.totals.relevance
													),
													backgroundColor: '#3B82F6',
												},
											]}
										/>
									</View>
									<Text style={styles.scoreValue}>
										{formatPercentage(traceData.whyThis.totals.relevance)}
									</Text>
								</View>

								<View style={styles.scoreItem}>
									<Text style={styles.scoreLabel}>Completeness</Text>
									<View style={styles.scoreBar}>
										<View
											style={[
												styles.scoreFill,
												{
													width: formatPercentageWidth(
														traceData.whyThis.totals.completeness
													),
													backgroundColor: '#8B5CF6',
												},
											]}
										/>
									</View>
									<Text style={styles.scoreValue}>
										{formatPercentage(traceData.whyThis.totals.completeness)}
									</Text>
								</View>
							</View>

							{/* Reasoning */}
							{traceData.whyThis.reasoning &&
								traceData.whyThis.reasoning.length > 0 && (
									<View style={styles.reasoningContainer}>
										<Text style={styles.reasoningTitle}>Reasoning:</Text>
										{traceData.whyThis.reasoning.map((reason, index) => (
											<View key={index} style={styles.reasoningItem}>
												<Text style={styles.reasoningBullet}>•</Text>
												<Text style={styles.reasoningText}>{reason}</Text>
											</View>
										))}
									</View>
								)}
						</View>
					)}
				</ScrollView>
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#F9FAFB',
		borderRadius: 12,
		marginVertical: 8,
		overflow: 'hidden',
	},
	header: {
		padding: 16,
		backgroundColor: '#FFFFFF',
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
	},
	headerContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	headerText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#374151',
		flex: 1,
		marginLeft: 8,
	},
	chevron: {
		marginLeft: 8,
	},
	content: {
		overflow: 'hidden',
	},
	scrollContent: {
		padding: 16,
	},
	section: {
		marginBottom: 20,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#111827',
		marginBottom: 12,
	},
	metricRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 4,
	},
	metricLabel: {
		fontSize: 14,
		color: '#6B7280',
		flex: 1,
	},
	metricValue: {
		fontSize: 14,
		fontWeight: '500',
		color: '#111827',
	},
	scoresContainer: {
		marginBottom: 16,
	},
	scoreItem: {
		marginBottom: 12,
	},
	scoreLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#374151',
		marginBottom: 4,
	},
	scoreBar: {
		height: 8,
		backgroundColor: '#E5E7EB',
		borderRadius: 4,
		overflow: 'hidden',
		marginBottom: 4,
	},
	scoreFill: {
		height: '100%',
		borderRadius: 4,
	},
	scoreValue: {
		fontSize: 12,
		fontWeight: '600',
		color: '#6B7280',
		textAlign: 'right',
	},
	reasoningContainer: {
		marginTop: 8,
	},
	reasoningTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#111827',
		marginBottom: 8,
	},
	reasoningItem: {
		flexDirection: 'row',
		marginBottom: 6,
	},
	reasoningBullet: {
		fontSize: 16,
		color: '#6B7280',
		marginRight: 8,
		width: 16,
	},
	reasoningText: {
		fontSize: 14,
		color: '#374151',
		flex: 1,
		lineHeight: 20,
	},
});
