import React, { useState, useEffect, useCallback } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
	InsightsService,
	AIInsight,
} from '../../../src/services/insightsService';
import {
	IntelligentActionService,
	IntelligentAction,
} from '../../../src/services/intelligentActionService';
import { useProfile } from '../../../src/context/profileContext';

export default function InsightSmartActionsScreen() {
	const router = useRouter();
	const { insightId } = useLocalSearchParams<{ insightId: string }>();
	const { profile } = useProfile();

	const [insight, setInsight] = useState<AIInsight | null>(null);
	const [smartActions, setSmartActions] = useState<IntelligentAction[]>([]);
	const [loading, setLoading] = useState(true);
	const [generatingActions, setGeneratingActions] = useState(false);

	// Check if AI insights are enabled
	const aiInsightsEnabled = profile?.preferences?.aiInsights?.enabled ?? false;

	useEffect(() => {
		if (insightId) {
			loadInsightAndActions();
		}
	}, [insightId]);

	const loadInsightAndActions = useCallback(async () => {
		if (!insightId) return;

		try {
			setLoading(true);

			// Load the insight
			const insightsResponse = await InsightsService.getInsights('weekly');
			if (insightsResponse.success && insightsResponse.data) {
				const foundInsight = insightsResponse.data.find(
					(ins) => ins._id === insightId
				);
				if (foundInsight) {
					setInsight(foundInsight);
				}
			}

			// Load smart actions for this insight
			await loadSmartActions();
		} catch (error) {
			console.error('Error loading insight and actions:', error);
			Alert.alert('Error', 'Failed to load insight and actions.');
		} finally {
			setLoading(false);
		}
	}, [insightId]);

	const loadSmartActions = useCallback(async () => {
		if (!insightId) return;

		try {
			// Get all user actions
			const userActions = await IntelligentActionService.getUserActions({
				limit: 50,
				includeCompleted: false,
			});

			// Filter actions that might be related to this insight
			// For now, we'll show all pending actions, but in the future
			// we could link actions to specific insights
			const pendingActions = Array.isArray(userActions) ? userActions : [];
			setSmartActions(pendingActions.slice(0, 5)); // Show top 5 actions
		} catch (error) {
			console.error('Error loading smart actions:', error);
		}
	}, [insightId]);

	const generateActionsForInsight = useCallback(async () => {
		if (!insight) return;

		try {
			setGeneratingActions(true);

			// Generate actions based on this insight
			const generatedActions =
				await IntelligentActionService.analyzeInsightForActions(insight);

			if (Array.isArray(generatedActions) && generatedActions.length > 0) {
				setSmartActions(generatedActions);
				Alert.alert(
					'Success',
					`Generated ${generatedActions.length} smart actions for this insight!`
				);
			} else {
				Alert.alert(
					'No Actions Generated',
					'Unable to generate actions for this insight at this time.'
				);
			}
		} catch (error) {
			console.error('Error generating actions:', error);
			Alert.alert('Error', 'Failed to generate actions for this insight.');
		} finally {
			setGeneratingActions(false);
		}
	}, [insight]);

	const handleActionPress = (action: IntelligentAction) => {
		// Navigate based on action type
		switch (action.type) {
			case 'create_budget':
				router.push('/budgets');
				break;
			case 'create_goal':
				router.push('/budgets/goals');
				break;
			case 'set_reminder':
				router.push('/settings/notification');
				break;
			case 'update_preferences':
				router.push('/settings/aiInsights');
				break;
			case 'detect_completion':
				// For detection actions, navigate based on detection type
				switch (action.detectionType) {
					case 'transaction_count':
						router.push('/transaction');
						break;
					case 'budget_created':
						router.push('/budgets');
						break;
					case 'goal_created':
						router.push('/budgets/goals');
						break;
					case 'preferences_updated':
						router.push('/settings/aiInsights');
						break;
					default:
						router.push('/insights');
				}
				break;
			default:
				router.push('/insights');
		}
	};

	const getActionIcon = (actionType: string) => {
		switch (actionType) {
			case 'create_budget':
				return 'wallet-outline';
			case 'create_goal':
				return 'flag-outline';
			case 'set_reminder':
				return 'notifications-outline';
			case 'update_preferences':
				return 'settings-outline';
			case 'detect_completion':
				return 'checkmark-circle-outline';
			default:
				return 'flash-outline';
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
			<SafeAreaView style={styles.container}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#2E78B7" />
					<Text style={styles.loadingText}>Loading insight and actions...</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (!insight) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.errorContainer}>
					<Ionicons name="alert-circle" size={48} color="#dc2626" />
					<Text style={styles.errorText}>Insight not found</Text>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.back()}
					>
						<Text style={styles.backButtonText}>Go Back</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
				>
					<Ionicons name="arrow-back" size={24} color="#333" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Smart Actions</Text>
				<View style={styles.headerRight} />
			</View>

			<ScrollView
				style={styles.scrollView}
				showsVerticalScrollIndicator={false}
			>
				{/* Insight Card */}
				<View style={styles.insightCard}>
					<LinearGradient
						colors={['#2E78B7', '#1e40af']}
						style={styles.insightGradient}
					>
						<View style={styles.insightHeader}>
							<Ionicons name="bulb" size={24} color="white" />
							<Text style={styles.insightTitle}>AI Insight</Text>
						</View>
						<Text style={styles.insightMessage}>{insight.message}</Text>
						<View style={styles.insightMeta}>
							<View style={styles.metaItem}>
								<Ionicons
									name="calendar"
									size={16}
									color="rgba(255,255,255,0.8)"
								/>
								<Text style={styles.metaText}>
									{insight.period.charAt(0).toUpperCase() +
										insight.period.slice(1)}
								</Text>
							</View>
							<View style={styles.metaItem}>
								<Ionicons
									name="trending-up"
									size={16}
									color="rgba(255,255,255,0.8)"
								/>
								<Text style={styles.metaText}>
									{insight.priority.charAt(0).toUpperCase() +
										insight.priority.slice(1)}{' '}
									Priority
								</Text>
							</View>
						</View>
					</LinearGradient>
				</View>

				{/* Smart Actions Section */}
				<View style={styles.actionsSection}>
					<View style={styles.actionsHeader}>
						<Text style={styles.actionsTitle}>Smart Actions</Text>
						<TouchableOpacity
							style={styles.generateButton}
							onPress={generateActionsForInsight}
							disabled={generatingActions}
						>
							{generatingActions ? (
								<ActivityIndicator size="small" color="white" />
							) : (
								<Ionicons name="refresh" size={16} color="white" />
							)}
							<Text style={styles.generateButtonText}>
								{generatingActions ? 'Generating...' : 'Generate'}
							</Text>
						</TouchableOpacity>
					</View>

					{smartActions.length > 0 ? (
						<View style={styles.actionsList}>
							{smartActions.map((action, index) => (
								<TouchableOpacity
									key={action.id || action._id || index}
									style={styles.actionCard}
									onPress={() => handleActionPress(action)}
								>
									<View style={styles.actionHeader}>
										<View style={styles.actionIconContainer}>
											<Ionicons
												name={getActionIcon(action.type)}
												size={20}
												color="#2E78B7"
											/>
										</View>
										<View style={styles.actionContent}>
											<Text style={styles.actionTitle}>{action.title}</Text>
											<Text style={styles.actionDescription}>
												{action.description}
											</Text>
										</View>
										<View style={styles.actionPriority}>
											<View
												style={[
													styles.priorityDot,
													{
														backgroundColor: getPriorityColor(action.priority),
													},
												]}
											/>
										</View>
									</View>
								</TouchableOpacity>
							))}
						</View>
					) : (
						<View style={styles.emptyActions}>
							<Ionicons name="flash-outline" size={48} color="#ccc" />
							<Text style={styles.emptyText}>No smart actions available</Text>
							<Text style={styles.emptySubtext}>
								Tap "Generate" to create actions based on this insight
							</Text>
						</View>
					)}
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8f9fa',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#666',
		fontWeight: '500',
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24,
	},
	errorText: {
		marginTop: 16,
		fontSize: 18,
		color: '#666',
		fontWeight: '500',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 24,
		paddingVertical: 16,
		backgroundColor: 'white',
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#1f2937',
	},
	headerRight: {
		width: 24,
	},
	backButton: {
		padding: 8,
	},
	backButtonText: {
		color: '#2E78B7',
		fontSize: 16,
		fontWeight: '500',
	},
	scrollView: {
		flex: 1,
	},
	insightCard: {
		margin: 24,
		borderRadius: 16,
		overflow: 'hidden',
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
	},
	insightGradient: {
		padding: 20,
	},
	insightHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	insightTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: 'white',
		marginLeft: 8,
	},
	insightMessage: {
		fontSize: 16,
		color: 'white',
		lineHeight: 24,
		marginBottom: 16,
	},
	insightMeta: {
		flexDirection: 'row',
		gap: 16,
	},
	metaItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	metaText: {
		fontSize: 12,
		color: 'rgba(255,255,255,0.8)',
		fontWeight: '500',
	},
	actionsSection: {
		marginHorizontal: 24,
		marginBottom: 24,
	},
	actionsHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	actionsTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#1f2937',
	},
	generateButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#2E78B7',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
		gap: 6,
	},
	generateButtonText: {
		color: 'white',
		fontSize: 14,
		fontWeight: '500',
	},
	actionsList: {
		gap: 12,
	},
	actionCard: {
		backgroundColor: 'white',
		borderRadius: 12,
		padding: 16,
		borderLeftWidth: 4,
		borderLeftColor: '#8b5cf6',
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
	},
	actionHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	actionIconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#f3f4f6',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	actionContent: {
		flex: 1,
	},
	actionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1f2937',
		marginBottom: 4,
	},
	actionDescription: {
		fontSize: 14,
		color: '#6b7280',
		lineHeight: 20,
	},
	actionPriority: {
		marginLeft: 8,
	},
	priorityDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	emptyActions: {
		alignItems: 'center',
		paddingVertical: 40,
	},
	emptyText: {
		marginTop: 16,
		fontSize: 16,
		color: '#666',
		fontWeight: '500',
	},
	emptySubtext: {
		marginTop: 8,
		fontSize: 14,
		color: '#9ca3af',
		textAlign: 'center',
	},
});
