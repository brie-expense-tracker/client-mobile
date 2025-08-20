import React, { useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Alert,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	// withSpring removed - no longer animating progress bars
} from 'react-native-reanimated';
import useMLServices, { MLInsight } from '../../../../src/hooks/useMLServices';
import { useBudget } from '../../../../src/context/budgetContext';
import { useGoal } from '../../../../src/context/goalContext';

interface MLInsightsPanelProps {
	onInsightPress?: (insight: MLInsight) => void;
	// showMetrics removed - users don't need to see technical metrics
}

export default function MLInsightsPanel({
	onInsightPress,
}: // showMetrics = true, // removed
MLInsightsPanelProps) {
	const {
		status,
		isLoading,
		error,
		getInsights,
		// getMetrics, // removed - users don't need technical metrics
		// clearCache, // removed - users shouldn't clear cache
		isReady,
		hasError,
		reset,
	} = useMLServices();

	const { budgets } = useBudget();
	const { goals } = useGoal();

	const [insights, setInsights] = useState<MLInsight[]>([]);
	const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
	// showAdvancedMetrics removed - users don't need to see technical details

	// Animation values
	// progressValue and scaleValue removed - users don't see progress bars or learning indicators
	const scaleValue = useSharedValue(1);

	// Animated styles
	// progressStyle removed - users don't see progress bars
	const scaleStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scaleValue.value }],
	}));

	// Update progress animation
	React.useEffect(() => {
		if (status.isInitialized) {
			scaleValue.value = withTiming(1.05, {
				duration: 300,
			});
		}
	}, [status.localMLConfidence]);

	// Generate insights
	const generateInsights = async () => {
		if (!isReady) return;

		try {
			setIsGeneratingInsights(true);

			// Try to use ML services first
			try {
				const newInsights = await getInsights(
					'Analyze my spending patterns and provide actionable insights',
					'medium'
				);
				setInsights(newInsights);
			} catch (mlError) {
				console.warn(
					'[MLInsightsPanel] ML services failed, generating basic insights:',
					mlError
				);

				// Generate basic insights based on available data
				const basicInsights: MLInsight[] = [
					{
						type: 'recommendation',
						title: 'Basic Financial Overview',
						message:
							'Your financial data is loaded and ready for analysis. The ML services are currently in basic mode.',
						confidence: 0.5,
						actionable: false,
					},
				];

				if (budgets && budgets.length > 0) {
					basicInsights.push({
						type: 'budget',
						title: 'Budget Summary',
						message: `You have ${budgets.length} active budgets. Consider reviewing your spending against these budgets regularly.`,
						confidence: 0.7,
						actionable: true,
					});
				}

				if (goals && goals.length > 0) {
					basicInsights.push({
						type: 'goal',
						title: 'Goal Progress',
						message: `You have ${goals.length} financial goals. Track your progress and adjust your savings strategy as needed.`,
						confidence: 0.7,
						actionable: true,
					});
				}

				setInsights(basicInsights);
			}

			// Animate success
			scaleValue.value = withTiming(1.05, { duration: 200 }, () => {
				scaleValue.value = withTiming(1, { duration: 200 });
			});
		} catch (err) {
			Alert.alert('Error', 'Failed to generate insights. Please try again.');
		} finally {
			setIsGeneratingInsights(false);
		}
	};

	// Clear cache functionality removed - users shouldn't have access to technical operations

	// Get insight icon
	const getInsightIcon = (type: MLInsight['type']) => {
		switch (type) {
			case 'spending':
				return 'trending-down';
			case 'budget':
				return 'wallet';
			case 'goal':
				return 'flag';
			case 'pattern':
				return 'analytics';
			case 'recommendation':
				return 'bulb';
			default:
				return 'information-circle';
		}
	};

	// Get insight color
	const getInsightColor = (type: MLInsight['type']) => {
		switch (type) {
			case 'spending':
				return '#ef4444';
			case 'budget':
				return '#3b82f6';
			case 'goal':
				return '#10b981';
			case 'pattern':
				return '#8b5cf6';
			case 'recommendation':
				return '#f59e0b';
			default:
				return '#6b7280';
		}
	};

	if (!isReady) {
		return (
			<View style={styles.container}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#3b82f6" />
					<Text style={styles.loadingText}>Initializing ML Services...</Text>
					{error && (
						<View style={styles.errorContainer}>
							<Text style={styles.errorText}>{error}</Text>
							<TouchableOpacity
								style={styles.retryButton}
								onPress={() => {
									// Reset error and try to initialize again
									reset();
								}}
							>
								<Text style={styles.retryButtonText}>Retry</Text>
							</TouchableOpacity>

							{/* Fallback mode button */}
							<TouchableOpacity
								style={[
									styles.retryButton,
									{ backgroundColor: '#10b981', marginTop: 8 },
								]}
								onPress={() => {
									// Force basic mode
									// The emergency timeout in useMLServices will handle this
								}}
							>
								<Text style={styles.retryButtonText}>Use Basic Mode</Text>
							</TouchableOpacity>
						</View>
					)}

					{/* Show loading progress */}
					<Text style={styles.loadingSubtext}>
						This may take a few seconds on first launch...
					</Text>
				</View>
			</View>
		);
	}

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{/* Header */}
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<Ionicons name="analytics" size={24} color="#3b82f6" />
					<Text style={styles.headerTitle}>AI Insights</Text>
				</View>
				<TouchableOpacity
					style={styles.generateButton}
					onPress={generateInsights}
					disabled={isGeneratingInsights}
				>
					{isGeneratingInsights ? (
						<ActivityIndicator size="small" color="white" />
					) : (
						<Ionicons name="refresh" size={16} color="white" />
					)}
					<Text style={styles.generateButtonText}>
						{isGeneratingInsights ? 'Generating...' : 'Generate'}
					</Text>
				</TouchableOpacity>
			</View>

			{/* ML Status Overview removed - users don't need to see technical system status */}

			{/* Insights */}
			{insights.length > 0 && (
				<View style={styles.insightsContainer}>
					<Text style={styles.sectionTitle}>Generated Insights</Text>

					{insights.map((insight, index) => (
						<TouchableOpacity
							key={index}
							style={styles.insightCard}
							onPress={() => onInsightPress?.(insight)}
							activeOpacity={0.7}
						>
							<View style={styles.insightHeader}>
								<View style={styles.insightIconContainer}>
									<Ionicons
										name={getInsightIcon(insight.type)}
										size={20}
										color={getInsightColor(insight.type)}
									/>
								</View>
								<View style={styles.insightMeta}>
									<Text style={styles.insightTitle}>{insight.title}</Text>
									<Text style={styles.insightType}>
										{insight.type.charAt(0).toUpperCase() +
											insight.type.slice(1)}
									</Text>
								</View>
								{/* Confidence badge removed - users don't need to see technical confidence scores */}
							</View>

							<Text style={styles.insightMessage}>{insight.message}</Text>

							{insight.actionable && (
								<View style={styles.actionableIndicator}>
									<Ionicons name="checkmark-circle" size={16} color="#10b981" />
									<Text style={styles.actionableText}>Actionable</Text>
								</View>
							)}
						</TouchableOpacity>
					))}
				</View>
			)}

			{/* Advanced Metrics - REMOVED for user privacy */}
			{/* Users don't need to see technical learning progress */}

			{/* Empty State */}
			{insights.length === 0 && !isGeneratingInsights && (
				<View style={styles.emptyState}>
					<Ionicons name="bulb-outline" size={48} color="#d1d5db" />
					<Text style={styles.emptyStateTitle}>No Insights Yet</Text>
					<Text style={styles.emptyStateText}>
						Tap &quot;Generate&quot; to get AI-powered financial insights based
						on your data
					</Text>
				</View>
			)}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
	},

	// Header
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#f3f4f6',
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#111827',
		marginLeft: 8,
	},
	generateButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#3b82f6',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
	},
	generateButtonText: {
		color: 'white',
		fontWeight: '500',
		marginLeft: 6,
	},

	// Loading
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 32,
	},
	loadingText: {
		fontSize: 16,
		color: '#6b7280',
		marginTop: 16,
	},
	errorText: {
		color: '#ef4444',
		fontSize: 14,
		textAlign: 'center',
		marginTop: 8,
	},
	errorContainer: {
		marginTop: 16,
		alignItems: 'center',
	},
	retryButton: {
		backgroundColor: '#3b82f6',
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 8,
		marginTop: 8,
	},
	retryButtonText: {
		color: 'white',
		fontWeight: '500',
		fontSize: 14,
	},
	loadingSubtext: {
		fontSize: 14,
		color: '#9ca3af',
		marginTop: 8,
	},

	// Status styles removed - users don't see technical status information

	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#111827',
		marginBottom: 16,
	},

	// Progress styles removed - users don't see learning progress bar

	// Insights
	insightsContainer: {
		padding: 16,
	},
	insightCard: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#f3f4f6',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 2,
	},
	insightHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	insightIconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#f3f4f6',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	insightMeta: {
		flex: 1,
	},
	insightTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#111827',
		marginBottom: 2,
	},
	insightType: {
		fontSize: 12,
		color: '#6b7280',
		textTransform: 'capitalize',
	},
	insightMessage: {
		fontSize: 14,
		color: '#374151',
		lineHeight: 20,
		marginBottom: 12,
	},
	actionableIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	actionableText: {
		fontSize: 12,
		color: '#10b981',
		marginLeft: 6,
		fontWeight: '500',
	},

	// Empty State
	emptyState: {
		alignItems: 'center',
		padding: 32,
		marginTop: 32,
	},
	emptyStateTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#6b7280',
		marginTop: 16,
		marginBottom: 8,
	},
	emptyStateText: {
		fontSize: 14,
		color: '#9ca3af',
		textAlign: 'center',
		lineHeight: 20,
	},
});
