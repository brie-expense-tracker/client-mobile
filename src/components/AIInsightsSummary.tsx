import React, { useEffect, useState, useCallback } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { InsightsService, AIInsight } from '../services/insightsService';

interface AIInsightsSummaryProps {
	maxInsights?: number;
	showGenerateButton?: boolean;
	onInsightPress?: (insight: AIInsight) => void;
	compact?: boolean;
	title?: string;
}

const AIInsightsSummary: React.FC<AIInsightsSummaryProps> = ({
	maxInsights = 2,
	showGenerateButton = false,
	onInsightPress,
	compact = false,
	title = 'AI Insights',
}) => {
	const [insights, setInsights] = useState<AIInsight[] | null>(null);
	const [loading, setLoading] = useState(true);
	const [generating, setGenerating] = useState(false);

	useEffect(() => {
		fetchInsights();
	}, []);

	const fetchInsights = useCallback(async () => {
		try {
			setLoading(true);
			// Set a timeout to prevent long loading
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Request timeout')), 5000);
			});

			// Try to get existing insights with timeout
			const insightsPromise = Promise.allSettled([
				InsightsService.getInsights('daily'),
				InsightsService.getInsights('weekly'),
				InsightsService.getInsights('monthly'),
			]);

			const results = (await Promise.race([
				insightsPromise,
				timeoutPromise,
			])) as PromiseSettledResult<any>[];

			const [dailyResponse, weeklyResponse, monthlyResponse] = results.map(
				(result: PromiseSettledResult<any>) =>
					result.status === 'fulfilled'
						? result.value
						: {
								success: false,
								data: [],
								error: result.reason?.message || 'Request failed',
						  }
			);

			const allInsights = [
				...(dailyResponse.success &&
				dailyResponse.data &&
				Array.isArray(dailyResponse.data)
					? dailyResponse.data.slice(0, 1)
					: []),
				...(weeklyResponse.success &&
				weeklyResponse.data &&
				Array.isArray(weeklyResponse.data)
					? weeklyResponse.data.slice(0, 1)
					: []),
				...(monthlyResponse.success &&
				monthlyResponse.data &&
				Array.isArray(monthlyResponse.data)
					? monthlyResponse.data.slice(0, 1)
					: []),
			];

			// Sort by most recent
			allInsights.sort(
				(a, b) =>
					new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
			);

			// Take the most recent insights
			const recentInsights = allInsights.slice(0, maxInsights);

			if (recentInsights.length === 0) {
				// Check if any of the responses had specific errors
				const errors = [
					dailyResponse.error,
					weeklyResponse.error,
					monthlyResponse.error,
				].filter(Boolean);

				if (errors.length > 0) {
					console.log('Insights fetch errors:', errors);
					setInsights([]);
				} else {
					// Only generate one insight quickly instead of all three
					await generateQuickInsight();
				}
			} else {
				setInsights(recentInsights);
			}
		} catch (error) {
			console.error('Error fetching insights:', error);
			setInsights([]);
		} finally {
			setLoading(false);
		}
	}, [maxInsights]);

	const generateQuickInsight = async () => {
		try {
			setGenerating(true);
			// Only generate one insight quickly (weekly is usually fastest)
			const response = await InsightsService.generateInsights('weekly');
			console.log('Quick insight generation response:', response);

			if (response.success && response.data && Array.isArray(response.data)) {
				setInsights(response.data.slice(0, 1));
			} else {
				setInsights([]);
			}
		} catch (error) {
			console.error('Error generating quick insight:', error);
			setInsights([]);
		} finally {
			setGenerating(false);
		}
	};

	const generateNewInsights = async () => {
		try {
			console.log('generateNewInsights - Starting generation process...');
			setGenerating(true);

			// Generate insights for all periods
			const [dailyGen, weeklyGen, monthlyGen] = await Promise.all([
				InsightsService.generateInsights('daily'),
				InsightsService.generateInsights('weekly'),
				InsightsService.generateInsights('monthly'),
			]);

			// Collect all generated insights
			const allInsights = [
				...(dailyGen.success && dailyGen.data && Array.isArray(dailyGen.data)
					? dailyGen.data
					: []),
				...(weeklyGen.success && weeklyGen.data && Array.isArray(weeklyGen.data)
					? weeklyGen.data
					: []),
				...(monthlyGen.success &&
				monthlyGen.data &&
				Array.isArray(monthlyGen.data)
					? monthlyGen.data
					: []),
			];

			// Sort by most recent and take top insights
			allInsights.sort(
				(a, b) =>
					new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
			);

			const recentInsights = allInsights.slice(0, maxInsights);
			setInsights(recentInsights);

			// If we have insights, show success message
			if (recentInsights.length > 0) {
				Alert.alert(
					'Success',
					`Generated ${recentInsights.length} new insights!`,
					[{ text: 'OK' }]
				);
			} else {
				// If no insights were generated, try to fetch existing ones
				await fetchInsights();
			}
		} catch (error) {
			console.error('Error generating insights:', error);
			Alert.alert('Error', 'Failed to generate insights. Please try again.');
		} finally {
			setGenerating(false);
		}
	};

	const handleInsightPress = (insight: AIInsight) => {
		if (onInsightPress) {
			onInsightPress(insight);
		} else {
			// Default behavior: navigate to insights page
			router.push('/insights');
		}
	};

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case 'high':
				return '#dc2626';
			case 'medium':
				return '#f59e0b';
			case 'low':
				return '#10b981';
			default:
				return '#6b7280';
		}
	};

	const getInsightIcon = (insightType: string) => {
		switch (insightType) {
			case 'budgeting':
				return 'wallet-outline';
			case 'savings':
				return 'trending-up-outline';
			case 'spending':
				return 'trending-down-outline';
			case 'income':
				return 'cash-outline';
			default:
				return 'bulb-outline';
		}
	};

	if (loading) {
		return (
			<View style={[styles.container, compact && styles.containerCompact]}>
				<View style={styles.header}>
					<Text style={[styles.title, compact && styles.titleCompact]}>
						{title}
					</Text>
					<ActivityIndicator size="small" color="#007AFF" />
				</View>
				{!compact && (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="small" color="#007AFF" />
						<Text style={styles.loadingText}>Loading insights...</Text>
					</View>
				)}
			</View>
		);
	}

	return (
		<View style={[styles.container, compact && styles.containerCompact]}>
			<View style={styles.header}>
				<Text style={[styles.title, compact && styles.titleCompact]}>
					{title}
				</Text>
			</View>

			{insights && insights.length > 0 ? (
				<View style={styles.insightsContainer}>
					{insights.map((insight) => (
						<TouchableOpacity
							key={insight._id}
							style={[styles.insightCard, compact && styles.insightCardCompact]}
							onPress={() => handleInsightPress(insight)}
						>
							<View style={styles.insightHeader}>
								<View style={styles.insightIconContainer}>
									<Ionicons
										name={getInsightIcon(insight.insightType)}
										size={16}
										color="#007AFF"
									/>
								</View>
								<Text style={styles.periodLabel}>
									{insight.period.charAt(0).toUpperCase() +
										insight.period.slice(1)}
								</Text>
								<View
									style={[
										styles.priorityIndicator,
										{ backgroundColor: getPriorityColor(insight.priority) },
									]}
								/>
							</View>
							<Text
								style={[
									styles.insightMessage,
									compact && styles.insightMessageCompact,
								]}
								numberOfLines={compact ? 1 : 2}
							>
								{insight.message}
							</Text>
							{!compact &&
								insight.isActionable &&
								insight.actionItems.length > 0 && (
									<View style={styles.actionItemsContainer}>
										<Text style={styles.actionItemsLabel}>
											{insight.actionItems.length} action item
											{insight.actionItems.length !== 1 ? 's' : ''}
										</Text>
									</View>
								)}
						</TouchableOpacity>
					))}
				</View>
			) : (
				<View
					style={[
						styles.emptyContainer,
						compact && styles.emptyContainerCompact,
					]}
				>
					{!compact && <Ionicons name="bulb-outline" size={32} color="#ccc" />}
					<Text style={[styles.emptyText, compact && styles.emptyTextCompact]}>
						{compact ? 'No insights' : 'No insights available'}
					</Text>
					{showGenerateButton && !compact && (
						<TouchableOpacity
							style={[
								styles.generateButton,
								generating && styles.generateButtonDisabled,
							]}
							onPress={generateNewInsights}
							disabled={generating}
						>
							{generating ? (
								<ActivityIndicator size="small" color="#fff" />
							) : (
								<Text style={styles.generateButtonText}>Generate Insights</Text>
							)}
						</TouchableOpacity>
					)}
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
	},
	containerCompact: {
		padding: 12,
		marginBottom: 12,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
	},
	titleCompact: {
		fontSize: 16,
	},
	viewAllButton: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	viewAllText: {
		color: '#007AFF',
		fontSize: 14,
		fontWeight: '500',
		marginRight: 4,
	},
	loadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 20,
	},
	loadingText: {
		marginLeft: 8,
		fontSize: 14,
		color: '#666',
	},
	insightsContainer: {
		gap: 12,
	},
	insightCard: {
		backgroundColor: '#f8f9fa',
		borderRadius: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: '#e9ecef',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	insightCardCompact: {
		padding: 8,
	},
	insightHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	insightIconContainer: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#e3f2fd',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 8,
	},
	periodLabel: {
		fontSize: 12,
		fontWeight: '500',
		color: '#666',
		textTransform: 'uppercase',
		flex: 1,
	},
	priorityIndicator: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	insightMessage: {
		fontSize: 14,
		color: '#333',
		lineHeight: 18,
		marginBottom: 8,
	},
	insightMessageCompact: {
		fontSize: 13,
		lineHeight: 16,
		marginBottom: 0,
	},
	actionItemsContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	actionItemsLabel: {
		fontSize: 12,
		color: '#007AFF',
		fontWeight: '500',
	},
	emptyContainer: {
		alignItems: 'center',
		paddingVertical: 20,
	},
	emptyContainerCompact: {
		paddingVertical: 8,
		alignItems: 'flex-start',
	},
	emptyText: {
		marginTop: 8,
		fontSize: 14,
		color: '#666',
		fontWeight: '500',
	},
	emptyTextCompact: {
		marginTop: 0,
		fontSize: 13,
	},
	generateButton: {
		backgroundColor: '#007AFF',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 6,
		marginTop: 12,
	},
	generateButtonDisabled: {
		opacity: 0.6,
	},
	generateButtonText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '500',
	},
});

export default AIInsightsSummary;
