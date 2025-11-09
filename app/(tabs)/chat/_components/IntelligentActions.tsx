import React, { useState, useEffect, useCallback } from 'react';
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
import { logger } from '../../../../src/utils/logger';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
// Note: IntelligentActionService was removed as it was a stub implementation
// This component now provides basic action suggestions without backend integration

// Local type definitions (previously from the deleted service)
export interface IntelligentAction {
	id: string;
	type:
		| 'create_budget'
		| 'create_goal'
		| 'add_transaction'
		| 'detect_completion';
	title: string;
	description: string;
	priority: 'low' | 'medium' | 'high';
	executed: boolean;
	executedAt?: string;
	detectionType?: string;
	parameters?: Record<string, any>;
}

export interface ActionExecutionResult {
	success: boolean;
	message: string;
	data?: any;
	error?: string;
}

import { AIInsight } from '../../../../src/services/feature/insightsService';
import {
	navigateToBudgetsWithModal,
	navigateToGoalsWithModal,
} from '../../../../src/utils/navigationUtils';
import { useTransactionModal } from '../../../../src/context/transactionModalContext';

interface IntelligentActionsProps {
	insight: AIInsight;
	period: 'daily' | 'weekly' | 'monthly';
	onActionExecuted?: (
		action: IntelligentAction,
		result: ActionExecutionResult
	) => void;
	onClose?: () => void;
	onAllActionsCompleted?: () => void; // New prop for when all actions are completed
}

export default function IntelligentActions({
	insight,
	period,
	onActionExecuted,
	onClose,
	onAllActionsCompleted, // Add new prop
}: IntelligentActionsProps) {
	const router = useRouter();
	const { showTransactionModal } = useTransactionModal();
	const [actions, setActions] = useState<IntelligentAction[]>([]);
	const [loading, setLoading] = useState(true);
	const [executingAction, setExecutingAction] = useState<string | null>(null);
	const [selectedAction, setSelectedAction] =
		useState<IntelligentAction | null>(null);
	const [modalVisible, setModalVisible] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [completionCallbackTriggered, setCompletionCallbackTriggered] =
		useState(false); // Prevent duplicate alerts
	const [globalRefreshing, setGlobalRefreshing] = useState(false); // For global refresh
	const [error, setError] = useState<string | null>(null); // Error state
	const [retryCount, setRetryCount] = useState(0); // Retry counter

	// Helper function to safely get action ID
	const getActionId = (action: IntelligentAction): string => {
		return (
			action.id ||
			(action as any)._id ||
			`action_${Date.now()}_${Math.random()}`
		);
	};

	// Function to check if this is the last action being completed
	const checkIfLastActionCompleted = useCallback(
		async (completedActionId: string) => {
			if (actions.length === 0) return false;

			// Check if all actions are completed
			const allCompleted = actions.every((action) => action.executed);

			// If all actions are completed and we haven't triggered the callback yet
			if (
				allCompleted &&
				onAllActionsCompleted &&
				!completionCallbackTriggered
			) {
				setCompletionCallbackTriggered(true); // Mark as triggered to prevent duplicates
				onAllActionsCompleted();
				return true;
			}

			return false;
		},
		[actions, onAllActionsCompleted, completionCallbackTriggered]
	);

	// Reset completion callback flag when actions change (new insight loaded)
	useEffect(() => {
		setCompletionCallbackTriggered(false);
	}, [insight._id]); // Reset when insight changes

	// Reset completion callback flag when component mounts (modal opened)
	useEffect(() => {
		setCompletionCallbackTriggered(false);
	}, []); // Reset when component mounts

	// Calculate completion statistics
	const completionStats = {
		total: actions.length,
		completed: actions.filter((action) => action.executed).length,
		pending: actions.filter((action) => !action.executed).length,
		percentage:
			actions.length > 0
				? Math.round(
						(actions.filter((action) => action.executed).length /
							actions.length) *
							100
				  )
				: 0,
	};

	// Global refresh function
	const handleGlobalRefresh = async () => {
		try {
			setGlobalRefreshing(true);
			setError(null);
			await refreshDetectionActions();
			setRetryCount(0); // Reset retry count on successful refresh
		} catch (error) {
			logger.error('Error during global refresh:', error);
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to refresh actions';
			setError(errorMessage);
			setRetryCount((prev) => prev + 1);
		} finally {
			setGlobalRefreshing(false);
		}
	};

	// Retry function
	const handleRetry = async () => {
		if (retryCount < 3) {
			// Limit retries to 3
			await analyzeInsight();
		} else {
			Alert.alert(
				'Max Retries Reached',
				'Unable to load actions after multiple attempts. Please check your connection and try again later.',
				[{ text: 'OK' }]
			);
		}
	};

	const analyzeInsight = useCallback(async () => {
		try {
			setLoading(true);
			setError(null); // Clear any previous errors

			// Generate basic actions based on insight type (no backend integration)
			const userActions: IntelligentAction[] = [];

			logger.debug('User actions from MongoDB:', userActions);
			logger.debug('User actions length:', userActions.length);

			// Ensure userActions is an array
			const safeUserActions = Array.isArray(userActions) ? userActions : [];

			// Check if we have relevant actions for this insight type and period
			const relevantActions = safeUserActions.filter((action) => {
				// Check if action is relevant to current insight type and period
				if (action.type === 'detect_completion') {
					const actionId = action.id || '';
					return (
						actionId.includes(insight.insightType) && actionId.includes(period)
					);
				}
				return true; // Keep non-detection actions
			});

			// If no relevant actions exist for this insight, generate them
			if (relevantActions.length === 0) {
				const generatedActions = generateBasicActions(insight);

				logger.debug('Generated actions:', generatedActions);
				logger.debug('Generated actions type:', typeof generatedActions);
				logger.debug('Is array:', Array.isArray(generatedActions));

				// Ensure generatedActions is an array
				const safeGeneratedActions = Array.isArray(generatedActions)
					? generatedActions
					: [];

				// Only add detection actions if we don't have enough variety from the backend
				let allActions = [...safeGeneratedActions];

				if (safeGeneratedActions.length < 2) {
					// Add minimal detection actions only if backend didn't provide enough
					const detectionActions = generateMinimalDetectionActions(
						insight,
						period
					);
					allActions = [...safeGeneratedActions, ...detectionActions];
				}

				logger.debug('All actions:', allActions);
				logger.debug('All actions length:', allActions.length);

				// Check completion status for detection actions
				const actionsWithStatus = allActions; // No backend integration, use as-is

				logger.debug('Actions with status:', actionsWithStatus);
				logger.debug('Actions with status length:', actionsWithStatus.length);

				// Ensure actionsWithStatus is an array
				const safeActionsWithStatus = Array.isArray(actionsWithStatus)
					? actionsWithStatus
					: [];

				setActions(safeActionsWithStatus);
			} else {
				// Use existing relevant actions from MongoDB
				const actionsWithStatus = relevantActions; // No backend integration, use as-is

				const safeActionsWithStatus = Array.isArray(actionsWithStatus)
					? actionsWithStatus
					: [];

				setActions(safeActionsWithStatus);
			}
		} catch (error) {
			logger.error('Error analyzing insight:', error);
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to load actions';
			setError(errorMessage);

			// Fallback to minimal detection actions if everything fails
			const fallbackActions = generateMinimalDetectionActions(insight, period);
			setActions(fallbackActions);
		} finally {
			setLoading(false);
		}
	}, [insight, period]);

	useEffect(() => {
		analyzeInsight();
	}, [analyzeInsight]);

	// Generate minimal detection actions only when needed
	// Generate basic actions based on insight type
	const generateBasicActions = (insight: AIInsight): IntelligentAction[] => {
		const actions: IntelligentAction[] = [];

		// Generate actions based on insight type
		switch (insight.insightType) {
			case 'budget_overspend':
				actions.push({
					id: `create_budget_${Date.now()}`,
					type: 'create_budget',
					title: 'Create Budget',
					description: 'Set up a budget to track your spending',
					priority: 'high',
					executed: false,
				});
				break;
			case 'savings_goal':
				actions.push({
					id: `create_goal_${Date.now()}`,
					type: 'create_goal',
					title: 'Set Savings Goal',
					description: 'Create a savings goal to reach your target',
					priority: 'medium',
					executed: false,
				});
				break;
			case 'transaction_analysis':
				actions.push({
					id: `add_transaction_${Date.now()}`,
					type: 'add_transaction',
					title: 'Add Transaction',
					description: 'Record a new transaction',
					priority: 'low',
					executed: false,
				});
				break;
			default:
				// Default action for any insight
				actions.push({
					id: `general_action_${Date.now()}`,
					type: 'create_budget',
					title: 'Take Action',
					description: 'Follow the insight recommendation',
					priority: 'medium',
					executed: false,
				});
		}

		return actions;
	};

	const generateMinimalDetectionActions = (
		insight: AIInsight,
		period: 'daily' | 'weekly' | 'monthly'
	): IntelligentAction[] => {
		const detectionActions: IntelligentAction[] = [];

		// Only add the most relevant detection action based on insight type
		switch (insight.insightType) {
			case 'spending':
				// For spending insights, suggest adding transactions if they haven't
				// Use period-appropriate timeframe
				let timeframe: string;
				let threshold: number;
				let description: string;

				switch (period) {
					case 'daily':
						timeframe = 'daily';
						threshold = 2;
						description =
							'Add your daily transactions to get better spending insights.';
						break;
					case 'weekly':
						timeframe = 'weekly';
						threshold = 5;
						description =
							'Add your weekly transactions to get better spending insights.';
						break;
					case 'monthly':
						timeframe = 'monthly';
						threshold = 15;
						description =
							'Add your monthly transactions to get better spending insights.';
						break;
					default:
						timeframe = 'weekly';
						threshold = 5;
						description =
							'Add your transactions to get better spending insights.';
				}

				detectionActions.push({
					id: `detect_transaction_count_${insight.insightType}_${period}`,
					type: 'detect_completion',
					title: 'Track Your Spending',
					description: description,
					parameters: {},
					priority: 'high',
					requiresConfirmation: false,
					executed: false,
					detectionType: 'transaction_count',
					detectionCriteria: {
						threshold: threshold,
						timeframe: timeframe,
					},
				});
				break;
			case 'budgeting':
				// For budgeting insights, suggest creating a budget
				// Use period-appropriate messaging
				let budgetTitle: string;
				let budgetDescription: string;

				switch (period) {
					case 'daily':
						budgetTitle = 'Create Your Daily Budget';
						budgetDescription =
							'Set up a daily budget to track your spending throughout the day.';
						break;
					case 'weekly':
						budgetTitle = 'Create Your Weekly Budget';
						budgetDescription =
							'Set up a weekly budget to manage your spending effectively.';
						break;
					case 'monthly':
						budgetTitle = 'Create Your Monthly Budget';
						budgetDescription =
							'Set up a monthly budget to plan your finances for the month.';
						break;
					default:
						budgetTitle = 'Create Your First Budget';
						budgetDescription =
							'Set up a budget to start managing your spending effectively.';
				}

				detectionActions.push({
					id: `detect_budget_created_${insight.insightType}_${period}`,
					type: 'detect_completion',
					title: budgetTitle,
					description: budgetDescription,
					parameters: {},
					priority: 'high',
					requiresConfirmation: false,
					executed: false,
					detectionType: 'budget_created',
					detectionCriteria: {},
				});
				break;
			case 'savings':
				// For savings insights, suggest creating a goal
				// Use period-appropriate messaging
				let goalTitle: string;
				let goalDescription: string;

				switch (period) {
					case 'daily':
						goalTitle = 'Set Your Daily Savings Goal';
						goalDescription =
							'Create a daily savings target to build good habits.';
						break;
					case 'weekly':
						goalTitle = 'Set Your Weekly Savings Goal';
						goalDescription =
							'Create a weekly savings goal to work towards your dreams.';
						break;
					case 'monthly':
						goalTitle = 'Set Your Monthly Savings Goal';
						goalDescription =
							'Create a monthly savings goal to achieve your financial objectives.';
						break;
					default:
						goalTitle = 'Set Your First Goal';
						goalDescription =
							'Create a financial goal to work towards your dreams.';
				}

				detectionActions.push({
					id: `detect_goal_created_${insight.insightType}_${period}`,
					type: 'detect_completion',
					title: goalTitle,
					description: goalDescription,
					parameters: {},
					priority: 'medium',
					requiresConfirmation: false,
					executed: false,
					detectionType: 'goal_created',
					detectionCriteria: {},
				});
				break;
			default:
				// For general insights, suggest enabling AI features
				detectionActions.push({
					id: `detect_ai_insights_${insight.insightType}_${period}`,
					type: 'detect_completion',
					title: 'Enable AI Insights',
					description:
						'Get personalized financial advice by enabling AI insights.',
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
		}

		return detectionActions;
	};

	const refreshDetectionActions = async () => {
		try {
			setRefreshing(true);

			// Get fresh actions (no backend integration)
			const userActions: IntelligentAction[] = [];

			// Ensure userActions is an array
			const safeUserActions = Array.isArray(userActions) ? userActions : [];

			// Refresh completion status (no backend integration)
			const updatedActions = safeUserActions;

			// Ensure updatedActions is an array
			const safeUpdatedActions = Array.isArray(updatedActions)
				? updatedActions
				: [];

			// Only update state if we got valid actions back
			if (safeUpdatedActions.length > 0) {
				setActions(safeUpdatedActions);
			} else {
				logger.warn(
					'No valid actions returned from refresh, keeping current actions'
				);
			}
		} catch (error) {
			logger.error('Error refreshing detection actions:', error);
			// Don't update state on error, keep current actions
		} finally {
			setRefreshing(false);
		}
	};

	const handleActionPress = async (action: IntelligentAction) => {
		// For detection actions, check completion status and navigate intelligently
		if (action.type === 'detect_completion') {
			try {
				setRefreshing(true);
				const result: ActionExecutionResult = {
					success: false, // No backend integration, always return false
					message: 'Action detection not available',
				};

				if (result.success) {
					// Update the action with completion status
					const updatedAction: IntelligentAction = {
						...action,
						executed: true,
						executedAt: new Date().toISOString(),
						completionDetails: result.data,
					};

					// Update actions list immediately
					setActions((prev) =>
						prev.map((a) =>
							getActionId(a) === getActionId(action) ? updatedAction : a
						)
					);

					// Trigger callback
					if (onActionExecuted) {
						onActionExecuted(updatedAction, result);
					}

					// Check if this was the last action completed
					await checkIfLastActionCompleted(getActionId(action));

					// Show immediate feedback
					setTimeout(() => {
						Alert.alert(
							'✅ Action Completed!',
							`${action.title}\n\n${
								result.message || 'Action has been completed!'
							}`,
							[{ text: 'OK' }]
						);
					}, 100);
				} else {
					// If not completed, navigate to the appropriate screen to help user complete it
					handleIntelligentNavigation(action);
				}
			} catch (error) {
				logger.error('Error checking detection action:', error);
				Alert.alert(
					'Error',
					'Failed to check action status. Please try again.'
				);
			} finally {
				setRefreshing(false);
			}
			return;
		}

		// For auto-completed actions (like Monthly Financial Health Check), show completion message
		if (
			action.executed &&
			action.completionDetails?.reason === 'auto_completed'
		) {
			// Show completion message explaining why it was auto-completed
			Alert.alert(
				'Already Completed',
				action.completionDetails?.message ||
					'This action has already been completed based on your current settings.',
				[
					{ text: 'OK' },
					{
						text: 'View Settings',
						onPress: () => {
							// Navigate to notification settings where the user can change the underlying preference
							router.push('/(stack)/settings/notification');
						},
					},
				]
			);
			return;
		}

		// For other action types that require confirmation or execution
		if (action.requiresConfirmation) {
			setSelectedAction(action);
			setModalVisible(true);
		} else {
			executeAction(action);
		}
	};

	// New function to handle intelligent navigation based on action type
	const handleIntelligentNavigation = (action: IntelligentAction) => {
		switch (action.detectionType) {
			case 'transaction_count':
				// Show transaction modal instead of navigating directly
				showTransactionModal();
				break;
			case 'budget_created':
				// Navigate to budgets screen with modal open
				navigateToBudgetsWithModal();
				break;
			case 'goal_created':
				// Navigate to goals screen with modal open
				navigateToGoalsWithModal();
				break;
			case 'preferences_updated':
				// Navigate to AI insights settings
				router.push('/(stack)/settings/aiInsights');
				break;
			case 'health_check_completed':
				// Navigate to notification settings for health check preferences
				router.push('/(stack)/settings/notification');
				break;
			default:
				// For unknown detection types, show a helpful message
				Alert.alert(
					'Action Required',
					action.description || 'Please complete this action to continue.',
					[{ text: 'OK' }]
				);
		}
	};

	// Function to handle intelligent navigation after action execution
	const handleIntelligentNavigationAfterExecution = (
		action: IntelligentAction
	) => {
		switch (action.type) {
			case 'create_budget':
				// Navigate to budgets screen to see the created budget
				router.push('/(tabs)/wallet/budgets');
				break;
			case 'create_goal':
				// Navigate to goals screen to see the created goal
				router.push('/(tabs)/wallet/goals');
				break;
			case 'set_reminder':
				// Navigate to notification settings
				router.push('/(stack)/settings/notification');
				break;
			case 'update_preferences':
				// Navigate to AI insights settings
				router.push('/(stack)/settings/aiInsights');
				break;
			case 'export_data':
				// Navigate to settings screen (data export not implemented yet)
				router.push('/(stack)/settings');
				break;
			default:
				// For other action types, stay on current screen
				break;
		}
	};

	// Function to handle refresh of action status
	const handleRefreshActionStatus = async (action: IntelligentAction) => {
		try {
			setRefreshing(true);
			const result: ActionExecutionResult = {
				success: false, // No backend integration, always return false
				message: 'Action detection not available',
			};

			if (result.success) {
				// Update the action with completion status
				const updatedAction: IntelligentAction = {
					...action,
					executed: true,
					executedAt: new Date().toISOString(),
					completionDetails: result.data,
				};

				// Update actions list immediately
				setActions((prev) =>
					prev.map((a) =>
						getActionId(a) === getActionId(action) ? updatedAction : a
					)
				);

				// Trigger callback
				if (onActionExecuted) {
					onActionExecuted(updatedAction, result);
				}

				// Check if this was the last action completed
				await checkIfLastActionCompleted(getActionId(action));

				// Show immediate feedback for successful detection
				setTimeout(() => {
					Alert.alert(
						'✅ Action Detected as Completed!',
						`${action.title}\n\n${
							result.message || 'Action has been completed!'
						}`,
						[{ text: 'OK' }]
					);
				}, 100);
			} else {
				// If not completed, show helpful message
				Alert.alert(
					'⏳ Action Not Yet Completed',
					`${action.title}\n\n${
						result.message ||
						'This action has not been completed yet. Complete the required steps and try refreshing again.'
					}`,
					[
						{ text: 'OK' },
						{
							text: 'Navigate to Complete',
							onPress: () => handleIntelligentNavigation(action),
						},
					]
				);
			}
		} catch (error) {
			logger.error('Error refreshing action status:', error);
			Alert.alert('Error', 'Failed to check action status. Please try again.');
		} finally {
			setRefreshing(false);
		}
	};

	const executeAction = async (action: IntelligentAction) => {
		try {
			setExecutingAction(getActionId(action));
			const result: ActionExecutionResult = {
				success: true, // Simulate successful execution
				message: 'Action executed successfully',
			};

			// Update the action with execution result
			const updatedAction: IntelligentAction = {
				...action,
				executed: result.success,
				executedAt: result.success ? new Date().toISOString() : undefined,
				error: result.success ? undefined : result.error,
				completionDetails: result.success
					? {
							reason: 'executed',
							message: result.message,
							timestamp: new Date().toISOString(),
					  }
					: undefined,
			};

			// Update actions list immediately
			setActions((prev) =>
				prev.map((a) =>
					getActionId(a) === getActionId(action) ? updatedAction : a
				)
			);

			// Call callback
			if (onActionExecuted) {
				onActionExecuted(updatedAction, result);
			}

			// Check if this was the last action completed
			if (result.success) {
				await checkIfLastActionCompleted(getActionId(action));
			}

			// Handle intelligent navigation after successful execution
			if (result.success) {
				handleIntelligentNavigationAfterExecution(action);
			}

			// Show immediate feedback for successful execution
			if (result.success) {
				// Small delay to ensure UI updates are visible
				setTimeout(() => {
					Alert.alert(
						'✅ Action Completed!',
						`${action.title}\n\n${
							result.message || 'Action completed successfully!'
						}`,
						[{ text: 'OK' }]
					);
				}, 100);
			}
		} catch (error) {
			logger.error('Error executing action:', error);
			Alert.alert('Error', 'Failed to execute action. Please try again.');
		} finally {
			setExecutingAction(null);
		}
	};

	const confirmAction = () => {
		if (selectedAction) {
			setModalVisible(false); // Close the modal immediately
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

	// Error state with retry option
	if (error && actions.length === 0) {
		return (
			<View style={styles.errorContainer}>
				<Ionicons name="alert-circle-outline" size={48} color="#E74C3C" />
				<Text style={styles.errorTitle}>Unable to Load Actions</Text>
				<Text style={styles.errorText}>{error}</Text>
				<TouchableOpacity
					style={styles.retryButton}
					onPress={handleRetry}
					disabled={retryCount >= 3}
				>
					<Text style={styles.retryButtonText}>
						{retryCount >= 3 ? 'Max Retries Reached' : 'Try Again'}
					</Text>
				</TouchableOpacity>
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
			{/* Error Banner */}
			{error && actions.length > 0 && (
				<View style={styles.errorBanner}>
					<Ionicons name="warning-outline" size={16} color="#E74C3C" />
					<Text style={styles.errorBannerText}>
						Some actions may not be up to date. {error}
					</Text>
					<TouchableOpacity
						style={styles.retrySmallButton}
						onPress={handleRetry}
						disabled={retryCount >= 3}
					>
						<Text style={styles.retrySmallButtonText}>Retry</Text>
					</TouchableOpacity>
				</View>
			)}

			{/* Completion Summary Section */}
			{actions.length > 0 && (
				<View style={styles.completionSummary}>
					<View style={styles.summaryHeader}>
						<Text style={styles.summaryTitle}>Progress Summary</Text>
						<TouchableOpacity
							onPress={handleGlobalRefresh}
							disabled={globalRefreshing}
							style={styles.refreshButton}
							accessibilityLabel="Refresh action status"
							accessibilityHint="Tap to check for updated action completion status"
						>
							{globalRefreshing ? (
								<ActivityIndicator size="small" color="#4A90E2" />
							) : (
								<Ionicons name="refresh" size={16} color="#4A90E2" />
							)}
						</TouchableOpacity>
					</View>
					<View style={styles.progressBar}>
						<View
							style={[
								styles.progressFill,
								{ width: `${completionStats.percentage}%` },
							]}
						/>
					</View>
					<View style={styles.statsRow}>
						<View style={styles.statItem}>
							<Text style={styles.statNumber}>{completionStats.completed}</Text>
							<Text style={styles.statLabel}>Completed</Text>
						</View>
						<View style={styles.statItem}>
							<Text style={styles.statNumber}>{completionStats.pending}</Text>
							<Text style={styles.statLabel}>Pending</Text>
						</View>
						<View style={styles.statItem}>
							<Text style={styles.statNumber}>
								{completionStats.percentage}%
							</Text>
							<Text style={styles.statLabel}>Progress</Text>
						</View>
					</View>
				</View>
			)}

			<ScrollView
				style={styles.actionsList}
				showsVerticalScrollIndicator={false}
			>
				{actions
					.sort((a, b) => {
						// Sort by completion status: uncompleted first, then completed
						if (a.executed && !b.executed) return 1;
						if (!a.executed && b.executed) return -1;
						// If both have same completion status, maintain original order
						return 0;
					})
					.map((action, index) => {
						// Ensure each action has a unique key
						const actionKey = getActionId(action);

						return (
							<TouchableOpacity
								key={actionKey}
								style={[
									styles.actionCard,
									action.executed && styles.actionCardExecuted,
									action.executed && styles.actionCardCompleted,
								]}
								onPress={() => handleActionPress(action)}
								disabled={
									action.type !== 'detect_completion' &&
									(action.executed || executingAction === actionKey)
								}
								accessibilityLabel={`${action.title}. ${
									action.description
								}. ${getActionStatusText(action)}. Priority: ${
									action.priority
								}`}
								accessibilityHint={
									action.executed
										? 'Action completed'
										: action.type === 'detect_completion'
										? 'Tap to check completion status'
										: 'Tap to execute action'
								}
								accessibilityRole="button"
							>
								{action.executed && (
									<View style={styles.completionBanner}>
										<Ionicons
											name="checkmark-circle"
											size={16}
											color="#27AE60"
										/>
										<Text style={styles.completionBannerText}>
											{action.type === 'detect_completion'
												? 'Completed'
												: 'Action Completed'}
										</Text>
									</View>
								)}
								{(executingAction === actionKey || refreshing) && (
									<View style={styles.processingBanner}>
										<ActivityIndicator size="small" color="#4A90E2" />
										<Text style={styles.processingBannerText}>
											{executingAction === actionKey
												? 'Processing...'
												: 'Checking...'}
										</Text>
									</View>
								)}
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
										<Text
											style={[
												styles.actionTitle,
												action.executed && styles.actionTitleCompleted,
											]}
										>
											{action.title}
										</Text>
										<View style={styles.actionMeta}>
											<View
												style={[
													styles.priorityBadge,
													{
														backgroundColor: getPriorityColor(action.priority),
													},
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
															action.executed
																? 'checkmark-circle'
																: 'time-outline'
														}
														size={12}
														color={action.executed ? '#27AE60' : '#F39C12'}
													/>
													<Text
														style={[
															styles.statusText,
															{
																color: action.executed ? '#27AE60' : '#F39C12',
															},
														]}
													>
														{getActionStatusText(action)}
													</Text>
												</View>
											)}
											{action.executed &&
												action.type !== 'detect_completion' && (
													<View
														style={[
															styles.statusBadge,
															{ backgroundColor: '#E8F5E8' },
														]}
													>
														<Ionicons
															name="checkmark-circle"
															size={12}
															color="#27AE60"
														/>
														<Text
															style={[styles.statusText, { color: '#27AE60' }]}
														>
															Completed
														</Text>
													</View>
												)}
											{action.requiresConfirmation && (
												<TouchableOpacity
													style={styles.confirmationBadge}
													onPress={() => {
														Alert.alert(
															'Review Required',
															'This action requires your review before execution. Tap the action to see details and confirm.',
															[{ text: 'OK' }]
														);
													}}
												>
													<Ionicons
														name="shield-checkmark"
														size={12}
														color="#4A90E2"
													/>
													<Text style={styles.confirmationText}>
														Review Required
													</Text>
													<Ionicons
														name="information-circle"
														size={12}
														color="#4A90E2"
														style={{ marginLeft: 4 }}
													/>
												</TouchableOpacity>
											)}
										</View>
									</View>
									{action.executed ? (
										// For auto-completed actions, show toggle button
										action.completionDetails?.reason === 'auto_completed' ? (
											<TouchableOpacity
												onPress={() => handleActionPress(action)}
												disabled={executingAction === actionKey}
											>
												{executingAction === actionKey ? (
													<ActivityIndicator size="small" color="#4A90E2" />
												) : (
													<Ionicons
														name="checkmark-circle"
														size={24}
														color="#66BB6A"
													/>
												)}
											</TouchableOpacity>
										) : (
											<Ionicons
												name="checkmark-circle"
												size={24}
												color="#66BB6A"
											/>
										)
									) : executingAction === actionKey ? (
										<ActivityIndicator size="small" color="#4A90E2" />
									) : action.type === 'detect_completion' ? (
										<TouchableOpacity
											onPress={() => handleRefreshActionStatus(action)}
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
								<Text
									style={[
										styles.actionDescription,
										action.executed && styles.actionDescriptionCompleted,
									]}
								>
									{action.description}
								</Text>
								{action.executed && action.executedAt && (
									<Text style={styles.executedText}>
										{action.type === 'detect_completion'
											? 'Completed'
											: 'Executed'}{' '}
										on {new Date(action.executedAt).toLocaleDateString()}
										{action.completionDetails?.reason === 'auto_completed' &&
											' (Auto-completed)'}
									</Text>
								)}
								{/* Show auto-completion message */}
								{action.executed &&
									action.completionDetails?.reason === 'auto_completed' && (
										<View style={styles.autoCompletedMessage}>
											<Ionicons
												name="checkmark-circle"
												size={16}
												color="#66BB6A"
											/>
											<Text style={styles.autoCompletedText}>
												{action.completionDetails?.message ||
													'Automatically completed based on your settings'}
											</Text>
											<TouchableOpacity
												style={styles.settingsLink}
												onPress={() =>
													router.push('/(stack)/settings/notification')
												}
											>
												<Text style={styles.settingsLinkText}>
													Change Settings
												</Text>
											</TouchableOpacity>
										</View>
									)}
								{action.error && (
									<Text style={styles.errorText}>Error: {action.error}</Text>
								)}
							</TouchableOpacity>
						);
					})}
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
		paddingTop: 8,
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
	actionsList: {
		flex: 1,
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
		opacity: 0.8,
	},
	actionCardCompleted: {
		backgroundColor: '#E8F5E8',
		borderColor: '#66BB6A',
		borderWidth: 2,
		shadowColor: '#66BB6A',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 4,
		position: 'relative',
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
	actionTitleCompleted: {
		textDecorationLine: 'line-through',
		color: '#999',
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
	actionDescriptionCompleted: {
		textDecorationLine: 'line-through',
		color: '#999',
	},
	executedText: {
		fontSize: 12,
		color: '#66BB6A',
		marginTop: 8,
		fontWeight: '500',
		backgroundColor: '#E8F5E8',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
		alignSelf: 'flex-start',
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
	completionBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E8F5E8',
		padding: 8,
		borderRadius: 6,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#66BB6A',
	},
	completionText: {
		marginLeft: 8,
		color: '#2E7D32',
		fontSize: 14,
		fontWeight: '500',
	},
	completionBannerText: {
		marginLeft: 8,
		fontSize: 13,
		color: '#27AE60',
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	autoCompletedMessage: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E8F5E8',
		padding: 8,
		borderRadius: 6,
		marginTop: 8,
		borderWidth: 1,
		borderColor: '#66BB6A',
	},
	autoCompletedText: {
		flex: 1,
		fontSize: 12,
		color: '#2E7D32',
		marginLeft: 4,
	},
	settingsLink: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		backgroundColor: '#66BB6A',
		borderRadius: 4,
	},
	settingsLinkText: {
		fontSize: 11,
		color: '#fff',
		fontWeight: '500',
	},
	// Completion Summary Styles
	completionSummary: {
		backgroundColor: '#f8f9fa',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#e9ecef',
	},
	summaryHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	summaryTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
	},
	refreshButton: {
		padding: 8,
		borderRadius: 8,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#e9ecef',
	},
	progressBar: {
		height: 8,
		backgroundColor: '#e9ecef',
		borderRadius: 4,
		marginBottom: 12,
		overflow: 'hidden',
	},
	progressFill: {
		height: '100%',
		backgroundColor: '#4CAF50',
		borderRadius: 4,
	},
	statsRow: {
		flexDirection: 'row',
		justifyContent: 'space-around',
	},
	statItem: {
		alignItems: 'center',
	},
	statNumber: {
		fontSize: 18,
		fontWeight: '700',
		color: '#333',
		marginBottom: 2,
	},
	statLabel: {
		fontSize: 12,
		color: '#666',
		fontWeight: '500',
	},
	processingBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E3F2FD',
		padding: 8,
		borderRadius: 6,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#4A90E2',
	},
	processingBannerText: {
		marginLeft: 8,
		fontSize: 13,
		color: '#1976D2',
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	// Error handling styles
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	errorTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#E74C3C',
		marginTop: 12,
		marginBottom: 8,
	},
	errorText: {
		fontSize: 14,
		color: '#666',
		textAlign: 'center',
		marginBottom: 20,
		lineHeight: 20,
	},
	retryButton: {
		backgroundColor: '#4A90E2',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
	},
	retryButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	errorBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FEF2F2',
		borderColor: '#FECACA',
		borderWidth: 1,
		borderRadius: 8,
		padding: 12,
		marginBottom: 16,
	},
	errorBannerText: {
		flex: 1,
		fontSize: 14,
		color: '#DC2626',
		marginLeft: 8,
	},
	retrySmallButton: {
		backgroundColor: '#DC2626',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 4,
		marginLeft: 8,
	},
	retrySmallButtonText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '600',
	},
});
