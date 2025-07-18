import React, { useEffect, useState, useCallback } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
	InsightsService,
	AIInsight,
	InsightsResponse,
} from '../services/insightsService';
import { useProfile } from '../context/profileContext';

interface InsightsSummaryProps {
	maxInsights?: number;
	compact?: boolean;
	title?: string;
}

const InsightsSummary: React.FC<InsightsSummaryProps> = ({
	maxInsights = 1,
	compact = false,
	title = 'AI Insights',
}) => {
	const [insights, setInsights] = useState<AIInsight[] | null>(null);
	const [loading, setLoading] = useState(true);
	const { profile } = useProfile();

	// Check if AI insights are enabled for this user
	const aiInsightsEnabled = profile?.preferences?.aiInsights?.enabled ?? false;

	const fetchInsights = useCallback(async () => {
		// Don't fetch if AI insights are disabled
		if (!aiInsightsEnabled) {
			setInsights([]);
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			// Set a timeout to prevent long loading
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Request timeout')), 5000);
			});

			// Fetch insights for weekly period (most common)
			const insightsPromise = InsightsService.getInsights('weekly');

			const response = (await Promise.race([
				insightsPromise,
				timeoutPromise,
			])) as InsightsResponse;

			if (response.success && response.data && Array.isArray(response.data)) {
				// Sort by most recent and take top insights
				const sortedInsights = response.data
					.sort(
						(a, b) =>
							new Date(b.generatedAt).getTime() -
							new Date(a.generatedAt).getTime()
					)
					.slice(0, maxInsights);

				setInsights(sortedInsights);
			} else {
				setInsights([]);
			}
		} catch (error) {
			console.error('Error fetching insights:', error);
			setInsights([]);
		} finally {
			setLoading(false);
		}
	}, [maxInsights, aiInsightsEnabled]);

	// Automatically fetch insights when component mounts
	useEffect(() => {
		fetchInsights();
	}, [fetchInsights]);

	// Handle insight press - mark as read and navigate to smart actions
	const handleInsightPress = async (insight: AIInsight) => {
		try {
			// Mark as read if not already read
			if (!insight.isRead) {
				await InsightsService.markInsightAsRead(insight._id);

				// Update local state to mark as read
				setInsights(
					(prevInsights) =>
						prevInsights?.map((ins) =>
							ins._id === insight._id ? { ...ins, isRead: true } : ins
						) || null
				);
			}

			// Navigate to smart actions for this insight
			router.push(`/insights/${insight.period}?insightId=${insight._id}`);
		} catch (error) {
			console.error('Error marking insight as read:', error);
			// Still navigate even if marking as read fails
			router.push(`/insights/${insight.period}?insightId=${insight._id}`);
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

	if (loading) {
		return (
			<View style={[styles.container, compact && styles.containerCompact]}>
				<View style={styles.header}>
					<Text style={[styles.title, compact && styles.titleCompact]}>
						{title}
					</Text>
				</View>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="small" color="#2E78B7" />
					<Text style={styles.loadingText}>Loading insights...</Text>
				</View>
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
								<View style={styles.insightMeta}>
									<Text style={styles.periodLabel}>
										{insight.period.charAt(0).toUpperCase() +
											insight.period.slice(1)}{' '}
										Insight
									</Text>
									<View style={styles.priorityContainer}>
										<View
											style={[
												styles.priorityDot,
												{ backgroundColor: getPriorityColor(insight.priority) },
											]}
										/>
										<Text style={styles.priorityText}>
											{insight.priority.charAt(0).toUpperCase() +
												insight.priority.slice(1)}{' '}
											Priority
										</Text>
									</View>
								</View>
								<View style={styles.headerRight}>
									{/* Orange dot for unread insights */}
									{!insight.isRead && <View style={styles.unreadDot} />}
								</View>
							</View>
							<Text
								style={[
									styles.insightTitle,
									compact && styles.insightTitleCompact,
								]}
								numberOfLines={compact ? 1 : 2}
							>
								{insight.title}
							</Text>
							<Text
								style={[
									styles.insightMessage,
									compact && styles.insightMessageCompact,
								]}
								numberOfLines={compact ? 2 : 3}
							>
								{insight.message}
							</Text>
							{!compact && insight.isActionable && (
								<View style={styles.actionableIndicator}>
									<Ionicons name="checkmark-circle" size={14} color="#10b981" />
									<Text style={styles.actionableText}>Actionable</Text>
								</View>
							)}
						</TouchableOpacity>
					))}
				</View>
			) : (
				<View style={styles.emptyState}>
					{!aiInsightsEnabled ? (
						<>
							<Text style={styles.emptyText}>AI Insights are disabled</Text>
							<TouchableOpacity
								style={styles.generateButton}
								onPress={() => router.push('/settings/aiInsights')}
							>
								<Text style={styles.generateButtonText}>
									Enable AI Insights
								</Text>
							</TouchableOpacity>
						</>
					) : (
						<>
							<Text style={styles.emptyText}>No insights available</Text>
							<TouchableOpacity
								style={styles.generateButton}
								onPress={() => router.push('/insights')}
							>
								<Text style={styles.generateButtonText}>Generate Insights</Text>
							</TouchableOpacity>
						</>
					)}
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
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
		color: '#1f2937',
	},
	titleCompact: {
		fontSize: 16,
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
		color: '#6b7280',
	},
	insightsContainer: {
		gap: 8,
	},
	insightCard: {
		backgroundColor: '#f9fafb',
		borderRadius: 8,
		padding: 12,
		borderLeftWidth: 3,
		borderLeftColor: '#2E78B7',
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
		marginRight: 8,
	},
	insightMeta: {
		flex: 1,
	},
	periodLabel: {
		fontSize: 12,
		fontWeight: '500',
		color: '#6b7280',
		textTransform: 'uppercase',
	},
	priorityContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 2,
	},
	priorityDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		marginRight: 4,
	},
	priorityText: {
		fontSize: 10,
		color: '#6b7280',
		fontWeight: '400',
	},
	headerRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	unreadDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#FF9500',
	},
	insightTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1f2937',
		marginBottom: 4,
		lineHeight: 18,
	},
	insightTitleCompact: {
		fontSize: 13,
		lineHeight: 16,
	},
	insightMessage: {
		fontSize: 13,
		fontWeight: '400',
		color: '#374151',
		lineHeight: 18,
	},
	insightMessageCompact: {
		fontSize: 12,
		lineHeight: 16,
	},
	actionableIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 6,
		gap: 4,
	},
	actionableText: {
		fontSize: 11,
		color: '#10b981',
		fontWeight: '500',
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: 20,
	},
	emptyText: {
		fontSize: 14,
		color: '#6b7280',
		marginBottom: 12,
	},
	generateButton: {
		backgroundColor: '#2E78B7',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 6,
	},
	generateButtonText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '500',
	},
});

export default InsightsSummary;
