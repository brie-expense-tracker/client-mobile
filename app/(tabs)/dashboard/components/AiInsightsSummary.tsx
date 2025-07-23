import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
} from '../../../../src/services/insightsService';
import { useProfile } from '../../../../src/context/profileContext';
import { useProgression } from '../../../../src/context/progressionContext';
import { ProgressionService } from '../../../../src/services/progressionService';

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
	const [insights, setInsights] = useState<AIInsight[]>([]);
	const [loading, setLoading] = useState(true);
	const { profile, loading: profileLoading } = useProfile();
	const { progression } = useProgression();

	// Check if AI insights are enabled for this user
	const aiInsightsEnabled = profile?.preferences?.aiInsights?.enabled ?? true;
	const userFrequency = profile?.preferences?.aiInsights?.frequency ?? 'weekly';

	// Check if tutorial is actually completed (same logic as insights page)
	const isTutorialActuallyCompleted = useMemo(() => {
		// Use progression from context or fall back to profile
		const effectiveProgression = progression || profile?.progression || null;

		const completed =
			ProgressionService.isTutorialFullyCompleted(effectiveProgression);

		// Also check if all steps are completed based on completion stats
		const allStepsCompleted =
			effectiveProgression?.tutorialSteps &&
			Object.values(effectiveProgression.tutorialSteps).every(
				(step) => step === true
			);

		return completed || allStepsCompleted;
	}, [progression, profile]);

	// Map user frequency to insights period (match AICoach/useInsightsHub)
	const getInsightsPeriod = (frequency: string) => {
		switch (frequency) {
			case 'daily':
				return 'weekly';
			case 'weekly':
				return 'weekly';
			case 'monthly':
				return 'monthly';
			default:
				return 'weekly';
		}
	};

	const fetchInsights = useCallback(async () => {
		// Debug: Log the AI insights enabled status
		console.log('AIInsightsSummary - aiInsightsEnabled:', aiInsightsEnabled);
		console.log(
			'AIInsightsSummary - profile preferences:',
			profile?.preferences?.aiInsights
		);

		// Don't fetch if AI insights are disabled
		if (!aiInsightsEnabled) {
			console.log(
				'AIInsightsSummary - AI insights disabled, setting empty array'
			);
			setInsights([]);
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			console.log('AIInsightsSummary - Starting to fetch insights...');

			// Set a timeout to prevent long loading
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Request timeout')), 5000);
			});

			// Fetch insights for mapped period
			const insightsPromise = InsightsService.getInsights(
				getInsightsPeriod(userFrequency)
			);

			const response = (await Promise.race([
				insightsPromise,
				timeoutPromise,
			])) as InsightsResponse;

			console.log(
				'AIInsightsSummary - Raw response:',
				JSON.stringify(response, null, 2)
			);

			if (response.success && response.data && Array.isArray(response.data)) {
				console.log(
					'AIInsightsSummary - Found insights:',
					response.data.length
				);
				// Sort by most recent and take top insights
				const sortedInsights = response.data
					.sort(
						(a, b) =>
							new Date(b.generatedAt).getTime() -
							new Date(a.generatedAt).getTime()
					)
					.slice(0, maxInsights);

				console.log(
					'AIInsightsSummary - Setting insights:',
					sortedInsights.length
				);
				setInsights(sortedInsights);

				// If tutorial is completed but no insights found, try to generate them
				if (isTutorialActuallyCompleted && sortedInsights.length === 0) {
					console.log(
						'AIInsightsSummary - Tutorial completed but no insights, attempting to generate...'
					);
					try {
						const generateResult = await InsightsService.generateInsights(
							userFrequency
						);
						if (generateResult.success) {
							console.log(
								'AIInsightsSummary - Successfully generated insights, refetching...'
							);
							// Refetch insights after generation
							const newResponse = await InsightsService.getInsights(
								getInsightsPeriod(userFrequency)
							);
							if (
								newResponse.success &&
								newResponse.data &&
								Array.isArray(newResponse.data)
							) {
								const newSortedInsights = newResponse.data
									.sort(
										(a, b) =>
											new Date(b.generatedAt).getTime() -
											new Date(a.generatedAt).getTime()
									)
									.slice(0, maxInsights);
								setInsights(newSortedInsights);
							}
						}
					} catch (generateError) {
						console.error(
							'AIInsightsSummary - Error generating insights:',
							generateError
						);
					}
				}
			} else {
				console.log(
					'AIInsightsSummary - No valid insights data, setting empty array'
				);
				console.log('AIInsightsSummary - response.success:', response.success);
				console.log('AIInsightsSummary - response.data:', response.data);
				console.log(
					'AIInsightsSummary - Array.isArray(response.data):',
					Array.isArray(response.data)
				);
				setInsights([]);
			}
		} catch (error) {
			console.error('AIInsightsSummary - Error fetching insights:', error);
			setInsights([]);
		} finally {
			setLoading(false);
		}
	}, [
		maxInsights,
		aiInsightsEnabled,
		userFrequency,
		isTutorialActuallyCompleted,
	]);

	// Automatically fetch insights when component mounts and profile is loaded
	useEffect(() => {
		if (!profileLoading && profile) {
			fetchInsights();
		}
	}, [fetchInsights, profileLoading, profile]);

	// Handle insight press - mark as read and navigate to smart actions
	const handleInsightPress = async (insight: AIInsight) => {
		try {
			// Mark as read if not already read
			if (!insight.isRead) {
				await InsightsService.markInsightAsRead(insight._id);

				// Update local state to mark as read
				setInsights((prevInsights) =>
					prevInsights.map((ins) =>
						ins._id === insight._id ? { ...ins, isRead: true } : ins
					)
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

	// Debug: Log current state
	console.log('AIInsightsSummary - Current state:', {
		loading,
		profileLoading,
		insights: insights.length,
		aiInsightsEnabled,
		profile: profile ? 'loaded' : 'not loaded',
	});

	if (loading || profileLoading || !profile) {
		return (
			<>
				<View style={styles.header}>
					<Text style={[styles.title, compact && styles.titleCompact]}>
						{title}
					</Text>
				</View>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="small" color="#2E78B7" />
					<Text style={styles.loadingText}>Loading insights...</Text>
				</View>
			</>
		);
	}

	return (
		<View style={styles.container}>
			{insights.length > 0 && (
				<View style={styles.header}>
					<Text style={[styles.title, compact && styles.titleCompact]}>
						{title}
					</Text>
				</View>
			)}

			{insights.length > 0 ? (
				<View style={styles.insightsContainer}>
					{insights.map((insight) => (
						<TouchableOpacity
							key={insight._id}
							style={[styles.insightCard, compact && styles.insightCardCompact]}
							onPress={() => handleInsightPress(insight)}
						>
							<View style={styles.insightHeader}>
								<View>
									<Ionicons
										name={getInsightIcon(insight.insightType)}
										size={20}
										color="#007AFF"
									/>
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
								<View style={styles.headerRight}>
									{/* Orange dot for unread insights */}
									{!insight.isRead && <View style={styles.unreadDot} />}
									<Ionicons name="chevron-forward" size={20} color="#6b7280" />
								</View>
							</View>
							<Text
								style={[
									styles.insightMessage,
									compact && styles.insightMessageCompact,
								]}
							>
								{insight.message}
							</Text>
							{!compact && insight.isActionable && (
								<View style={styles.actionableIndicator}>
									<Ionicons name="checkmark-circle" size={18} color="#10b981" />
									<Text style={styles.actionableText}>Actionable</Text>
								</View>
							)}
						</TouchableOpacity>
					))}
				</View>
			) : // Only wrap the tutorial prompt in a card
			!aiInsightsEnabled ? (
				<View style={styles.emptyState}>
					<Text style={styles.emptyText}>AI Insights are disabled</Text>
					<TouchableOpacity
						style={styles.generateButton}
						onPress={() => router.push('/settings/aiInsights')}
					>
						<Text style={styles.generateButtonText}>Enable AI Insights</Text>
					</TouchableOpacity>
				</View>
			) : !isTutorialActuallyCompleted ? (
				<View style={styles.tutorialCard}>
					<View style={styles.emptyState}>
						<Ionicons
							name="bulb-outline"
							size={32}
							color="#d1d5db"
							style={styles.emptyIcon}
						/>
						<Text style={styles.emptyText}>
							Complete tutorial to unlock AI insights
						</Text>
						<Text style={styles.emptySubtext}>
							Finish the onboarding steps to get personalized financial
							recommendations
						</Text>
						<TouchableOpacity
							style={styles.generateButton}
							onPress={() => router.push('/insights')}
						>
							<Text style={styles.generateButtonText}>Go to Tutorial</Text>
						</TouchableOpacity>
					</View>
				</View>
			) : (
				<View style={styles.emptyState}>
					<Ionicons
						name="bulb-outline"
						size={32}
						color="#d1d5db"
						style={styles.emptyIcon}
					/>
					<Text style={styles.emptyText}>No insights yet</Text>
					<Text style={styles.emptySubtext}>
						Insights are automatically generated based on your spending patterns
						and financial goals
					</Text>
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	title: {
		fontWeight: '600',
		fontSize: 18,
		color: '#333',
	},
	titleCompact: {
		fontSize: 20,
	},
	loadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 20,
	},
	loadingText: {
		marginLeft: 8,
		fontSize: 16,
		color: '#6b7280',
	},
	insightsContainer: {
		gap: 8,
	},
	insightCard: {
		backgroundColor: '#ffffff',
		borderRadius: 8,
		padding: 16,
		borderLeftWidth: 5,
		borderLeftColor: '#2E78B7',
		borderWidth: 1,
		borderColor: '#efefef',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	insightCardCompact: {
		padding: 16,
	},
	insightHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 8,
		gap: 8,
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
		marginLeft: 'auto',
	},
	unreadDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#FF9500',
	},
	insightTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#444446',
		lineHeight: 20,
		flex: 1,
	},
	insightTitleCompact: {
		fontSize: 15,
		lineHeight: 18,
	},
	insightMessage: {
		fontSize: 15,
		fontWeight: '400',
		color: '#374151',
		lineHeight: 20,
	},
	insightMessageCompact: {
		fontSize: 14,
		lineHeight: 18,
	},
	actionableIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 6,
		gap: 4,
	},
	actionableText: {
		fontSize: 13,
		color: '#10b981',
		fontWeight: '500',
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: 20,
	},
	emptyText: {
		fontSize: 16,
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
		fontSize: 16,
		fontWeight: '500',
	},
	viewAllButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	viewAllText: {
		fontSize: 16,
		color: '#2E78B7',
		fontWeight: '500',
	},
	emptyIcon: {
		marginBottom: 8,
	},
	emptySubtext: {
		fontSize: 14,
		color: '#9ca3af',
		textAlign: 'center',
		paddingHorizontal: 20,
		marginTop: 4,
		lineHeight: 18,
		marginBottom: 12,
	},
	tutorialCard: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 20,
		borderWidth: 1,
		borderColor: '#efefef',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
});

export default InsightsSummary;
