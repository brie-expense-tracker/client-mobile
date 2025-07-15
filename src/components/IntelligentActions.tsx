import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Alert,
	Modal,
	ScrollView,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
	IntelligentActionService,
	IntelligentAction,
	ActionExecutionResult,
} from '../services/intelligentActionService';
import { AIInsight } from '../services/insightsService';

interface IntelligentActionsProps {
	insight: AIInsight;
	onActionExecuted?: (
		action: IntelligentAction,
		result: ActionExecutionResult
	) => void;
	onClose?: () => void;
}

export default function IntelligentActions({
	insight,
	onActionExecuted,
	onClose,
}: IntelligentActionsProps) {
	const [actions, setActions] = useState<IntelligentAction[]>([]);
	const [loading, setLoading] = useState(true);
	const [executingAction, setExecutingAction] = useState<string | null>(null);
	const [selectedAction, setSelectedAction] =
		useState<IntelligentAction | null>(null);
	const [modalVisible, setModalVisible] = useState(false);
	const [refreshing, setRefreshing] = useState(false);

	useEffect(() => {
		analyzeInsight();
	}, [insight]);

	// Auto-refresh detection actions every 30 seconds
	useEffect(() => {
		const interval = setInterval(() => {
			refreshDetectionActions();
		}, 30000);

		return () => clearInterval(interval);
	}, [actions]);

	const analyzeInsight = async () => {
		try {
			setLoading(true);

			// Get actions from MongoDB instead of generating them locally
			const userActions = await IntelligentActionService.getUserActions({
				limit: 50,
			});

			console.log('User actions from MongoDB:', userActions);
			console.log('User actions length:', userActions.length);

			// Ensure userActions is an array
			const safeUserActions = Array.isArray(userActions) ? userActions : [];

			// If no actions exist for this insight, generate them
			if (safeUserActions.length === 0) {
				const generatedActions =
					await IntelligentActionService.analyzeInsightForActions(insight);

				console.log('Generated actions:', generatedActions);
				console.log('Generated actions type:', typeof generatedActions);
				console.log('Is array:', Array.isArray(generatedActions));

				// Ensure generatedActions is an array
				const safeGeneratedActions = Array.isArray(generatedActions)
					? generatedActions
					: [];

				// Add detection actions for common scenarios
				const detectionActions = generateDetectionActions(insight);
				const allActions = [...safeGeneratedActions, ...detectionActions];

				console.log('All actions:', allActions);
				console.log('All actions length:', allActions.length);

				// Check completion status for detection actions
				const actionsWithStatus =
					await IntelligentActionService.refreshCompletionStatus(allActions);

				console.log('Actions with status:', actionsWithStatus);
				console.log('Actions with status length:', actionsWithStatus.length);

				// Ensure actionsWithStatus is an array
				const safeActionsWithStatus = Array.isArray(actionsWithStatus)
					? actionsWithStatus
					: [];

				setActions(safeActionsWithStatus);
			} else {
				// Use existing actions from MongoDB
				const actionsWithStatus =
					await IntelligentActionService.refreshCompletionStatus(
						safeUserActions
					);

				console.log('Actions with status from MongoDB:', actionsWithStatus);
				console.log('Actions with status length:', actionsWithStatus.length);

				// Ensure actionsWithStatus is an array
				const safeActionsWithStatus = Array.isArray(actionsWithStatus)
					? actionsWithStatus
					: [];

				setActions(safeActionsWithStatus);
			}
		} catch (error) {
			console.error('Error analyzing insight for actions:', error);
			// Set empty array as fallback
			setActions([]);
		} finally {
			setLoading(false);
		}
	};

	const generateDetectionActions = (
		insight: AIInsight
	): IntelligentAction[] => {
		const detectionActions: IntelligentAction[] = [];

		// Detect if user has added their first transaction
		detectionActions.push({
			id: `detect_first_transaction_${Date.now()}`,
			type: 'detect_completion',
			title: 'Add Your First Transaction',
			description:
				'Start tracking your finances by adding your first transaction.',
			parameters: {},
			priority: 'high',
			requiresConfirmation: false,
			executed: false,
			detectionType: 'transaction_count',
			detectionCriteria: {
				threshold: 1,
				timeframe: 'all_time',
			},
		});

		// Detect if user has created their first budget
		detectionActions.push({
			id: `detect_first_budget_${Date.now()}`,
			type: 'detect_completion',
			title: 'Create Your First Budget',
			description:
				'Set up a budget to start managing your spending effectively.',
			parameters: {},
			priority: 'high',
			requiresConfirmation: false,
			executed: false,
			detectionType: 'budget_created',
			detectionCriteria: {},
		});

		// Detect if user has created their first goal
		detectionActions.push({
			id: `detect_first_goal_${Date.now()}`,
			type: 'detect_completion',
			title: 'Set Your First Goal',
			description: 'Create a financial goal to work towards your dreams.',
			parameters: {},
			priority: 'medium',
			requiresConfirmation: false,
			executed: false,
			detectionType: 'goal_created',
			detectionCriteria: {},
		});

		// Detect if user has enabled AI insights
		detectionActions.push({
			id: `detect_ai_insights_${Date.now()}`,
			type: 'detect_completion',
			title: 'Enable AI Insights',
			description: 'Get personalized financial advice by enabling AI insights.',
			parameters: {},
			priority: 'low',
			requiresConfirmation: false,
			executed: false,
			detectionType: 'preferences_updated',
			detectionCriteria: {
				section: 'aiInsights',
				preference: 'enabled',
			},
		});

		return detectionActions;
	};

	const refreshDetectionActions = async () => {
		try {
			setRefreshing(true);

			// Get fresh actions from MongoDB
			const userActions = await IntelligentActionService.getUserActions({
				limit: 50,
			});

			// Ensure userActions is an array
			const safeUserActions = Array.isArray(userActions) ? userActions : [];

			// Refresh completion status
			const updatedActions =
				await IntelligentActionService.refreshCompletionStatus(safeUserActions);

			// Ensure updatedActions is an array
			const safeUpdatedActions = Array.isArray(updatedActions)
				? updatedActions
				: [];

			setActions(safeUpdatedActions);
		} catch (error) {
			console.error('Error refreshing detection actions:', error);
		} finally {
			setRefreshing(false);
		}
	};

	const handleActionPress = async (action: IntelligentAction) => {
		if (action.type === 'detect_completion') {
			// For detection actions, check completion status and trigger callback
			try {
				setRefreshing(true);

				let updatedAction: IntelligentAction | null = null;

				// Check if this is a locally generated detection action
				if (action.id.startsWith('detect_')) {
					// For locally generated actions, check completion status directly
					const completionResult =
						await IntelligentActionService.checkCompletionStatus(action);
					updatedAction = {
						...action,
						executed: completionResult.isCompleted,
						completionDetails: completionResult.completionDetails,
						status: completionResult.isCompleted ? 'completed' : 'pending',
					};
				} else {
					// For MongoDB actions, refresh from server
					const updatedActions =
						await IntelligentActionService.refreshActionStatus([action.id]);
					const safeUpdatedActions = Array.isArray(updatedActions)
						? updatedActions
						: [];
					updatedAction =
						safeUpdatedActions.find((a) => a.id === action.id) || null;
				}

				if (updatedAction) {
					// Update actions list
					setActions((prev) =>
						prev.map((a) => (a.id === action.id ? updatedAction! : a))
					);

					// If action was completed, trigger callback
					if (updatedAction.executed && onActionExecuted) {
						onActionExecuted(updatedAction, {
							success: true,
							data: updatedAction.completionDetails,
							message:
								updatedAction.completionDetails?.message ||
								'Action completed successfully',
						});
					}
				}
			} catch (error) {
				console.error('Error checking detection action:', error);
			} finally {
				setRefreshing(false);
			}
			return;
		}

		if (action.requiresConfirmation) {
			setSelectedAction(action);
			setModalVisible(true);
		} else {
			executeAction(action);
		}
	};

	const executeAction = async (action: IntelligentAction) => {
		try {
			setExecutingAction(action.id);
			const result = await IntelligentActionService.executeAction(action);

			// Update the action with execution result
			const updatedAction: IntelligentAction = {
				...action,
				executed: result.success,
				executedAt: result.success ? new Date().toISOString() : undefined,
				error: result.success ? undefined : result.error,
			};

			// Update actions list
			setActions((prev) =>
				prev.map((a) => (a.id === action.id ? updatedAction : a))
			);

			// Show result to user
			Alert.alert(result.success ? 'Success' : 'Error', result.message, [
				{ text: 'OK' },
			]);

			// Call callback
			if (onActionExecuted) {
				onActionExecuted(updatedAction, result);
			}

			// Close modal if open
			if (modalVisible) {
				setModalVisible(false);
				setSelectedAction(null);
			}
		} catch (error) {
			console.error('Error executing action:', error);
			Alert.alert('Error', 'Failed to execute action. Please try again.');
		} finally {
			setExecutingAction(null);
		}
	};

	const confirmAction = () => {
		if (selectedAction) {
			executeAction(selectedAction);
		}
	};

	const getActionIcon = (type: IntelligentAction['type']) => {
		switch (type) {
			case 'create_budget':
				return 'wallet-outline';
			case 'create_goal':
				return 'flag-outline';
			case 'set_reminder':
				return 'notifications-outline';
			case 'update_preferences':
				return 'settings-outline';
			case 'export_data':
				return 'download-outline';
			case 'detect_completion':
				return 'checkmark-circle-outline';
			default:
				return 'bulb-outline';
		}
	};

	const getActionColor = (type: IntelligentAction['type']) => {
		switch (type) {
			case 'create_budget':
				return '#4A90E2';
			case 'create_goal':
				return '#66BB6A';
			case 'set_reminder':
				return '#FF9500';
			case 'update_preferences':
				return '#8E44AD';
			case 'export_data':
				return '#E74C3C';
			case 'detect_completion':
				return '#27AE60';
			default:
				return '#4A90E2';
		}
	};

	const getPriorityColor = (priority: IntelligentAction['priority']) => {
		switch (priority) {
			case 'high':
				return '#E74C3C';
			case 'medium':
				return '#F39C12';
			case 'low':
				return '#27AE60';
			default:
				return '#95A5A6';
		}
	};

	const getActionStatusText = (action: IntelligentAction) => {
		if (action.type === 'detect_completion') {
			return action.executed ? 'Completed' : 'Not Completed';
		}
		return action.executed ? 'Executed' : 'Not Executed';
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#4A90E2" />
				<Text style={styles.loadingText}>Analyzing your insight...</Text>
			</View>
		);
	}

	if (actions.length === 0) {
		return (
			<View style={styles.emptyContainer}>
				<Ionicons name="bulb-outline" size={48} color="#CCC" />
				<Text style={styles.emptyTitle}>No Smart Actions Available</Text>
				<Text style={styles.emptyText}>
					Add more transactions to get personalized intelligent actions.
				</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<LinearGradient colors={['#4A90E2', '#50C9CE']} style={styles.header}>
				<View style={styles.headerContent}>
					<Ionicons name="sparkles" size={24} color="#fff" />
					<Text style={styles.headerTitle}>Smart Actions</Text>
				</View>
				<Text style={styles.headerSubtitle}>
					AI-powered recommendations based on your insight
				</Text>
			</LinearGradient>

			<ScrollView
				style={styles.actionsList}
				showsVerticalScrollIndicator={false}
			>
				{actions.map((action) => (
					<TouchableOpacity
						key={action.id}
						style={[
							styles.actionCard,
							action.executed && styles.actionCardExecuted,
						]}
						onPress={() => handleActionPress(action)}
						disabled={
							action.type !== 'detect_completion' &&
							(action.executed || executingAction === action.id)
						}
					>
						<View style={styles.actionHeader}>
							<View
								style={[
									styles.actionIconContainer,
									{ backgroundColor: getActionColor(action.type) + '20' },
								]}
							>
								<Ionicons
									name={getActionIcon(action.type)}
									size={20}
									color={getActionColor(action.type)}
								/>
							</View>
							<View style={styles.actionInfo}>
								<Text style={styles.actionTitle}>{action.title}</Text>
								<View style={styles.actionMeta}>
									<View
										style={[
											styles.priorityBadge,
											{ backgroundColor: getPriorityColor(action.priority) },
										]}
									>
										<Text style={styles.priorityText}>
											{action.priority.toUpperCase()}
										</Text>
									</View>
									{action.type === 'detect_completion' && (
										<View
											style={[
												styles.statusBadge,
												{
													backgroundColor: action.executed
														? '#E8F5E8'
														: '#FFF3CD',
												},
											]}
										>
											<Ionicons
												name={
													action.executed ? 'checkmark-circle' : 'time-outline'
												}
												size={12}
												color={action.executed ? '#27AE60' : '#F39C12'}
											/>
											<Text
												style={[
													styles.statusText,
													{ color: action.executed ? '#27AE60' : '#F39C12' },
												]}
											>
												{getActionStatusText(action)}
											</Text>
										</View>
									)}
									{action.requiresConfirmation && (
										<View style={styles.confirmationBadge}>
											<Ionicons
												name="shield-checkmark"
												size={12}
												color="#4A90E2"
											/>
											<Text style={styles.confirmationText}>
												Confirmation Required
											</Text>
										</View>
									)}
								</View>
							</View>
							{action.executed ? (
								<Ionicons name="checkmark-circle" size={24} color="#66BB6A" />
							) : executingAction === action.id ? (
								<ActivityIndicator size="small" color="#4A90E2" />
							) : action.type === 'detect_completion' ? (
								<TouchableOpacity
									onPress={() => refreshDetectionActions()}
									disabled={refreshing}
								>
									{refreshing ? (
										<ActivityIndicator size="small" color="#4A90E2" />
									) : (
										<Ionicons name="refresh" size={20} color="#4A90E2" />
									)}
								</TouchableOpacity>
							) : (
								<Ionicons name="chevron-forward" size={20} color="#CCC" />
							)}
						</View>
						<Text style={styles.actionDescription}>{action.description}</Text>
						{action.executed && action.executedAt && (
							<Text style={styles.executedText}>
								{action.type === 'detect_completion' ? 'Completed' : 'Executed'}{' '}
								on {new Date(action.executedAt).toLocaleDateString()}
							</Text>
						)}
						{action.error && (
							<Text style={styles.errorText}>Error: {action.error}</Text>
						)}
					</TouchableOpacity>
				))}
			</ScrollView>

			{/* Confirmation Modal */}
			<Modal
				visible={modalVisible}
				transparent={true}
				animationType="fade"
				onRequestClose={() => setModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Ionicons
								name={
									selectedAction
										? getActionIcon(selectedAction.type)
										: 'bulb-outline'
								}
								size={32}
								color={
									selectedAction
										? getActionColor(selectedAction.type)
										: '#4A90E2'
								}
							/>
							<Text style={styles.modalTitle}>Confirm Action</Text>
						</View>
						{selectedAction && (
							<>
								<Text style={styles.modalActionTitle}>
									{selectedAction.title}
								</Text>
								<Text style={styles.modalActionDescription}>
									{selectedAction.description}
								</Text>
								<View style={styles.modalActions}>
									<TouchableOpacity
										style={styles.cancelButton}
										onPress={() => setModalVisible(false)}
									>
										<Text style={styles.cancelButtonText}>Cancel</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[
											styles.confirmButton,
											{
												backgroundColor: getActionColor(selectedAction.type),
											},
										]}
										onPress={confirmAction}
									>
										<Text style={styles.confirmButtonText}>Execute</Text>
									</TouchableOpacity>
								</View>
							</>
						)}
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	loadingText: {
		marginTop: 12,
		fontSize: 16,
		color: '#666',
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#999',
		marginTop: 12,
	},
	emptyText: {
		fontSize: 14,
		color: '#BBB',
		textAlign: 'center',
		marginTop: 8,
	},
	header: {
		padding: 20,
		paddingTop: 60,
		borderBottomLeftRadius: 20,
		borderBottomRightRadius: 20,
	},
	headerContent: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: '700',
		color: '#fff',
		marginLeft: 8,
	},
	headerSubtitle: {
		fontSize: 14,
		color: '#e0eaf0',
	},
	actionsList: {
		flex: 1,
		padding: 16,
	},
	actionCard: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
		borderWidth: 1,
		borderColor: '#f0f0f0',
	},
	actionCardExecuted: {
		backgroundColor: '#f8f9fa',
		borderColor: '#e9ecef',
	},
	actionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	actionIconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	actionInfo: {
		flex: 1,
	},
	actionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 4,
	},
	actionMeta: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
	},
	priorityBadge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
		marginRight: 8,
	},
	priorityText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#fff',
	},
	statusBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		marginRight: 8,
	},
	statusText: {
		fontSize: 10,
		marginLeft: 2,
	},
	confirmationBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		backgroundColor: '#E3F2FD',
	},
	confirmationText: {
		fontSize: 10,
		color: '#4A90E2',
		marginLeft: 2,
	},
	actionDescription: {
		fontSize: 14,
		color: '#666',
		lineHeight: 20,
	},
	executedText: {
		fontSize: 12,
		color: '#66BB6A',
		marginTop: 8,
		fontWeight: '500',
	},
	errorText: {
		fontSize: 12,
		color: '#E74C3C',
		marginTop: 8,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	modalContent: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 24,
		width: '100%',
		maxWidth: 400,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.25,
		shadowRadius: 8,
		elevation: 8,
	},
	modalHeader: {
		alignItems: 'center',
		marginBottom: 20,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#333',
		marginTop: 8,
	},
	modalActionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
		textAlign: 'center',
	},
	modalActionDescription: {
		fontSize: 14,
		color: '#666',
		lineHeight: 20,
		marginBottom: 24,
		textAlign: 'center',
	},
	modalActions: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	cancelButton: {
		flex: 1,
		backgroundColor: '#f8f9fa',
		borderRadius: 8,
		paddingVertical: 12,
		marginRight: 8,
		alignItems: 'center',
	},
	cancelButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#666',
	},
	confirmButton: {
		flex: 1,
		borderRadius: 8,
		paddingVertical: 12,
		marginLeft: 8,
		alignItems: 'center',
	},
	confirmButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#fff',
	},
});
