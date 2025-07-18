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
	IntelligentActionService,
	IntelligentAction,
} from '../services/intelligentActionService';
import { useProfile } from '../context/profileContext';

interface SmartActionsSummaryProps {
	maxActions?: number;
	compact?: boolean;
	title?: string;
}

const SmartActionsSummary: React.FC<SmartActionsSummaryProps> = ({
	maxActions = 2,
	compact = false,
	title = 'Smart Actions',
}) => {
	const [actions, setActions] = useState<IntelligentAction[]>([]);
	const [loading, setLoading] = useState(true);
	const { profile } = useProfile();

	// Check if AI insights are enabled for this user
	const aiInsightsEnabled = profile?.preferences?.aiInsights?.enabled ?? false;

	// Automatically fetch actions when component mounts
	useEffect(() => {
		fetchActions();
	}, [fetchActions]);

	const fetchActions = useCallback(async () => {
		// Don't fetch if AI insights are disabled
		if (!aiInsightsEnabled) {
			setActions([]);
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			// Set a timeout to prevent long loading
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Request timeout')), 5000);
			});

			// Fetch user actions from MongoDB
			const actionsPromise = IntelligentActionService.getUserActions({
				limit: maxActions,
				includeCompleted: false, // Only show pending actions
			});

			const response = (await Promise.race([
				actionsPromise,
				timeoutPromise,
			])) as IntelligentAction[];

			// Ensure response is an array
			const safeActions = Array.isArray(response) ? response : [];

			// Sort by priority and take top actions
			const sortedActions = safeActions
				.sort((a, b) => {
					// Sort by priority: high > medium > low
					const priorityOrder = { high: 3, medium: 2, low: 1 };
					const aPriority = priorityOrder[a.priority] || 1;
					const bPriority = priorityOrder[b.priority] || 1;

					if (aPriority !== bPriority) {
						return bPriority - aPriority;
					}

					// If same priority, sort by creation date (newest first)
					const aDate = new Date(a.createdAt || 0);
					const bDate = new Date(b.createdAt || 0);
					return bDate.getTime() - aDate.getTime();
				})
				.slice(0, maxActions);

			setActions(sortedActions);
		} catch (error) {
			console.error('Error fetching smart actions:', error);
			setActions([]);
		} finally {
			setLoading(false);
		}
	}, [maxActions, aiInsightsEnabled]);

	// Handle action press - navigate to appropriate screen
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

	const getActionTypeLabel = (actionType: string) => {
		switch (actionType) {
			case 'create_budget':
				return 'Budget';
			case 'create_goal':
				return 'Goal';
			case 'set_reminder':
				return 'Reminder';
			case 'update_preferences':
				return 'Settings';
			case 'detect_completion':
				return 'Task';
			default:
				return 'Action';
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
					<Text style={styles.loadingText}>Loading actions...</Text>
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

			{actions && actions.length > 0 ? (
				<View style={styles.actionsContainer}>
					{actions.map((action) => (
						<TouchableOpacity
							key={action.id || action._id}
							style={[styles.actionCard, compact && styles.actionCardCompact]}
							onPress={() => handleActionPress(action)}
						>
							<View style={styles.actionHeader}>
								<View style={styles.actionIconContainer}>
									<Ionicons
										name={getActionIcon(action.type)}
										size={16}
										color="#007AFF"
									/>
								</View>
								<View style={styles.actionMeta}>
									<Text style={styles.actionTypeLabel}>
										{getActionTypeLabel(action.type)}
									</Text>
									<View style={styles.priorityContainer}>
										<View
											style={[
												styles.priorityDot,
												{ backgroundColor: getPriorityColor(action.priority) },
											]}
										/>
										<Text style={styles.priorityText}>
											{action.priority.charAt(0).toUpperCase() +
												action.priority.slice(1)}{' '}
											Priority
										</Text>
									</View>
								</View>
								<View style={styles.headerRight}>
									{action.requiresConfirmation && (
										<Ionicons
											name="shield-checkmark"
											size={14}
											color="#f59e0b"
										/>
									)}
								</View>
							</View>
							<Text
								style={[
									styles.actionTitle,
									compact && styles.actionTitleCompact,
								]}
								numberOfLines={compact ? 1 : 2}
							>
								{action.title}
							</Text>
							<Text
								style={[
									styles.actionDescription,
									compact && styles.actionDescriptionCompact,
								]}
								numberOfLines={compact ? 2 : 3}
							>
								{action.description}
							</Text>
							{!compact && action.detectionType && (
								<View style={styles.detectionIndicator}>
									<Ionicons
										name="analytics-outline"
										size={14}
										color="#8b5cf6"
									/>
									<Text style={styles.detectionText}>Auto-detect</Text>
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
							<Text style={styles.emptyText}>No smart actions available</Text>
							<TouchableOpacity
								style={styles.generateButton}
								onPress={() => router.push('/insights')}
							>
								<Text style={styles.generateButtonText}>Generate Actions</Text>
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
	actionsContainer: {
		gap: 8,
	},
	actionCard: {
		backgroundColor: '#f9fafb',
		borderRadius: 8,
		padding: 12,
		borderLeftWidth: 3,
		borderLeftColor: '#8b5cf6',
	},
	actionCardCompact: {
		padding: 8,
	},
	actionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	actionIconContainer: {
		marginRight: 8,
	},
	actionMeta: {
		flex: 1,
	},
	actionTypeLabel: {
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
	actionTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1f2937',
		marginBottom: 4,
		lineHeight: 18,
	},
	actionTitleCompact: {
		fontSize: 13,
		lineHeight: 16,
	},
	actionDescription: {
		fontSize: 13,
		fontWeight: '400',
		color: '#374151',
		lineHeight: 18,
	},
	actionDescriptionCompact: {
		fontSize: 12,
		lineHeight: 16,
	},
	detectionIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 6,
		gap: 4,
	},
	detectionText: {
		fontSize: 11,
		color: '#8b5cf6',
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
		backgroundColor: '#8b5cf6',
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

export default SmartActionsSummary;
