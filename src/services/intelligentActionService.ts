import { ApiService } from './apiService';

export interface IntelligentAction {
	id: string;
	_id?: string; // MongoDB ID field
	type:
		| 'create_budget'
		| 'create_goal'
		| 'set_reminder'
		| 'update_preferences'
		| 'export_data'
		| 'detect_completion'; // New type for detecting completed actions
	title: string;
	description: string;
	parameters: Record<string, any>;
	priority: 'low' | 'medium' | 'high';
	requiresConfirmation: boolean;
	executed: boolean;
	executedAt?: string;
	error?: string;
	// New fields for completion detection
	detectionType?:
		| 'transaction_count'
		| 'budget_created'
		| 'goal_created'
		| 'preferences_updated'
		| 'health_check_completed'; // <-- Added new detection type
	detectionCriteria?: {
		threshold?: number;
		timeframe?: string; // 'daily', 'weekly', 'monthly', 'all_time'
		description?: string;
		category?: string;
		amount?: number;
		name?: string;
		target?: number;
		section?: string;
		preference?: string;
	};
	// MongoDB fields
	status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
	completionDetails?: any;
	createdAt?: string;
	updatedAt?: string;
}

export interface ActionExecutionResult {
	success: boolean;
	data?: any;
	error?: string;
	message: string;
}

export interface CompletionDetectionResult {
	isCompleted: boolean;
	completionDate?: string;
	completionDetails?: any;
	message: string;
}

export class IntelligentActionService {
	/**
	 * Get all actions for the current user from MongoDB
	 */
	static async getUserActions(params?: {
		status?: string;
		type?: string;
		limit?: number;
		includeCompleted?: boolean;
	}): Promise<IntelligentAction[]> {
		try {
			const queryParams = new URLSearchParams();
			if (params?.status) queryParams.append('status', params.status);
			if (params?.type) queryParams.append('type', params.type);
			if (params?.limit) queryParams.append('limit', params.limit.toString());
			if (params?.includeCompleted !== undefined)
				queryParams.append(
					'includeCompleted',
					params.includeCompleted.toString()
				);

			const response = await ApiService.get(
				`/intelligent-actions?${queryParams.toString()}`
			);

			console.log('getUserActions response success:', response.success);
			console.log('getUserActions response.data:', response.data);
			console.log('getUserActions response.data type:', typeof response.data);
			console.log(
				'getUserActions response.data is array:',
				Array.isArray(response.data)
			);

			if (response.success && response.data) {
				// Handle nested response structure
				let actionsData: IntelligentAction[] = [];

				// If response.data has its own data property, use that
				if (
					response.data &&
					typeof response.data === 'object' &&
					'data' in response.data &&
					Array.isArray(response.data.data)
				) {
					actionsData = response.data.data as IntelligentAction[];
				} else if (Array.isArray(response.data)) {
					actionsData = response.data as IntelligentAction[];
				} else {
					console.error('Response data is not an array:', response.data);
					return [];
				}

				return actionsData;
			} else {
				console.error(
					'Error getting user actions:',
					response.error || 'Invalid response format'
				);
				return [];
			}
		} catch (error) {
			console.error('Error getting user actions:', error);
			return [];
		}
	}

	/**
	 * Get pending actions for the current user
	 */
	static async getPendingActions(): Promise<IntelligentAction[]> {
		try {
			const response = await ApiService.get('/intelligent-actions/pending');

			if (response.success && Array.isArray(response.data)) {
				return response.data;
			} else {
				console.error(
					'Error getting pending actions:',
					response.error || 'Invalid response format'
				);
				return [];
			}
		} catch (error) {
			console.error('Error getting pending actions:', error);
			return [];
		}
	}

	/**
	 * Refresh completion status for detection actions
	 */
	static async refreshActionStatus(
		actionIds: string[]
	): Promise<IntelligentAction[]> {
		try {
			console.log('Refreshing action status for IDs:', actionIds);

			const response = await ApiService.post('/intelligent-actions/refresh', {
				actionIds,
			});

			console.log('Refresh response:', response);

			// Handle different response formats
			if (response.success) {
				// Check if response.data exists and is an array
				if (response.data && Array.isArray(response.data)) {
					console.log('Successfully refreshed actions:', response.data.length);
					return response.data;
				} else if (response.data && typeof response.data === 'object') {
					// Handle nested data structure
					const nestedData = (response.data as any).data;
					if (nestedData && Array.isArray(nestedData)) {
						console.log(
							'Successfully refreshed actions (nested):',
							nestedData.length
						);
						return nestedData;
					}
				}

				// If no valid data found, return empty array
				console.log('No valid action data in response, returning empty array');
				return [];
			} else {
				console.error(
					'Error refreshing action status:',
					response.error || 'Server returned failure'
				);
				return [];
			}
		} catch (error) {
			console.error('Error refreshing action status:', error);
			return [];
		}
	}

	/**
	 * Execute an intelligent action based on insight analysis
	 */
	static async executeAction(
		action: IntelligentAction
	): Promise<ActionExecutionResult> {
		try {
			console.log(`🚀 Executing action: ${action.title} (${action.type})`);

			// Handle detection type actions differently
			if (action.type === 'detect_completion') {
				console.log(
					`🔍 Detection action detected, calling detectActionCompletion`
				);
				return await this.detectActionCompletion(action);
			}

			const response = await ApiService.post('/intelligent-actions/execute', {
				actionId: action.id,
				actionType: action.type,
				parameters: action.parameters,
			});

			if (response.success) {
				console.log(`✅ Action executed successfully: ${action.title}`);
				return {
					success: true,
					data: response.data,
					message: response.message || 'Action executed successfully',
				};
			} else {
				console.log(
					`❌ Action execution failed: ${action.title} - ${response.error}`
				);
				return {
					success: false,
					error: response.error,
					message: response.message || 'Failed to execute action',
				};
			}
		} catch (error) {
			console.error('Error executing intelligent action:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				message: 'Failed to execute action',
			};
		}
	}

	/**
	 * Detect if an action has been completed by the user
	 */
	static async detectActionCompletion(
		action: IntelligentAction
	): Promise<ActionExecutionResult> {
		try {
			console.log(`🔍 Detecting completion for action: ${action.title}`);
			console.log(`🔍 Detection type: ${action.detectionType}`);
			console.log(`🔍 Detection criteria:`, action.detectionCriteria);

			// First check if the action is actually completed
			const detectionResult = await this.checkCompletionStatus(action);

			if (detectionResult.isCompleted) {
				console.log(`✅ Action completed: ${action.title}`);
				console.log(
					`✅ Completion details:`,
					detectionResult.completionDetails
				);

				// Now call the backend to mark the action as completed in the database
				const response = await ApiService.post(
					'/intelligent-actions/detect-completion',
					{
						actionType: 'detect_completion',
						parameters: { actionId: action.id },
					}
				);

				if (response.success) {
					console.log(
						`✅ Action marked as completed in database: ${action.title}`
					);
					return {
						success: true,
						data: { ...detectionResult, action: response.data },
						message: detectionResult.message || 'Action has been completed!',
					};
				} else {
					console.log(
						`❌ Failed to mark action as completed in database: ${action.title}`
					);
					return {
						success: false,
						error: response.error,
						message: 'Action completed but failed to save to database',
					};
				}
			} else {
				console.log(
					`❌ Action not completed: ${action.title} - ${detectionResult.message}`
				);
				return {
					success: false,
					error: 'Action not completed',
					message:
						detectionResult.message || 'Action has not been completed yet.',
				};
			}
		} catch (error) {
			console.error('Error detecting action completion:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				message: 'Failed to detect action completion',
			};
		}
	}

	/**
	 * Check the completion status of an action
	 */
	static async checkCompletionStatus(
		action: IntelligentAction
	): Promise<CompletionDetectionResult> {
		try {
			const { detectionType, detectionCriteria } = action;

			switch (detectionType) {
				case 'transaction_count':
					return await this.checkTransactionCount(detectionCriteria);
				case 'budget_created':
					return await this.checkBudgetCreated(detectionCriteria);
				case 'goal_created':
					return await this.checkGoalCreated(detectionCriteria);
				case 'preferences_updated':
					return await this.checkPreferencesUpdated(detectionCriteria);
				case 'health_check_completed':
					return await this.checkHealthCheckCompleted(detectionCriteria);
				default:
					return {
						isCompleted: false,
						message: 'Unknown detection type',
					};
			}
		} catch (error) {
			console.error('Error checking completion status:', error);
			return {
				isCompleted: false,
				message: 'Error checking completion status',
			};
		}
	}

	/**
	 * Check if user has added the required number of transactions
	 */
	private static async checkTransactionCount(
		criteria: any
	): Promise<CompletionDetectionResult> {
		try {
			const {
				threshold = 1,
				timeframe = 'all_time',
				description,
				category,
				amount,
			} = criteria;

			// Get user's transactions
			const response = await ApiService.get('/transactions');

			if (!response.success) {
				return {
					isCompleted: false,
					message: 'Unable to fetch transactions',
				};
			}

			let transactions: any[] = Array.isArray(response.data)
				? response.data
				: [];

			// Filter by timeframe if specified
			if (timeframe !== 'all_time') {
				const now = new Date();
				let startDate: Date;

				switch (timeframe) {
					case 'daily':
						startDate = new Date(
							now.getFullYear(),
							now.getMonth(),
							now.getDate()
						);
						break;
					case 'weekly':
						startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
						break;
					case 'monthly':
						startDate = new Date(now.getFullYear(), now.getMonth(), 1);
						break;
					default:
						startDate = new Date(0);
				}

				transactions = transactions.filter(
					(t: any) => new Date(t.date) >= startDate
				);
			}

			// Apply additional filters if specified
			if (description) {
				transactions = transactions.filter((t: any) =>
					t.description.toLowerCase().includes(description.toLowerCase())
				);
			}

			if (category) {
				transactions = transactions.filter((t: any) =>
					t.category?.toLowerCase().includes(category.toLowerCase())
				);
			}

			if (amount) {
				transactions = transactions.filter(
					(t: any) => Math.abs(t.amount - amount) < 0.01 // Allow small floating point differences
				);
			}

			const isCompleted = transactions.length >= threshold;
			const latestTransaction =
				transactions.length > 0 ? transactions[0] : null;

			return {
				isCompleted,
				completionDate: latestTransaction?.date,
				completionDetails: {
					transactionCount: transactions.length,
					requiredCount: threshold,
					latestTransaction: latestTransaction
						? {
								description: latestTransaction.description,
								amount: latestTransaction.amount,
								date: latestTransaction.date,
						  }
						: null,
				},
				message: isCompleted
					? `Great! You've added ${transactions.length} transaction${
							transactions.length > 1 ? 's' : ''
					  }.`
					: `You need to add ${
							threshold - transactions.length
					  } more transaction${
							threshold - transactions.length > 1 ? 's' : ''
					  }.`,
			};
		} catch (error) {
			console.error('Error checking transaction count:', error);
			return {
				isCompleted: false,
				message: 'Error checking transaction count',
			};
		}
	}

	/**
	 * Check if user has created a budget
	 */
	private static async checkBudgetCreated(
		criteria: any
	): Promise<CompletionDetectionResult> {
		try {
			const { name, amount } = criteria;

			// Get user's budgets
			const response = await ApiService.get('/budgets');

			if (!response.success) {
				return {
					isCompleted: false,
					message: 'Unable to fetch budgets',
				};
			}

			const budgets: any[] = Array.isArray(response.data) ? response.data : [];
			let matchingBudget = null;

			if (name) {
				matchingBudget = budgets.find((b: any) =>
					b.name.toLowerCase().includes(name.toLowerCase())
				);
			} else if (amount) {
				matchingBudget = budgets.find(
					(b: any) => Math.abs(b.amount - amount) < 0.01
				);
			} else {
				// If no specific criteria, check if any budget exists
				matchingBudget = budgets.length > 0 ? budgets[0] : null;
			}

			const isCompleted = !!matchingBudget;

			return {
				isCompleted,
				completionDate: matchingBudget?.createdAt,
				completionDetails: {
					budgetCount: budgets.length,
					matchingBudget: matchingBudget
						? {
								name: matchingBudget.name,
								amount: matchingBudget.amount,
								createdAt: matchingBudget.createdAt,
						  }
						: null,
				},
				message: isCompleted
					? `Great! You've created a budget${name ? ` for ${name}` : ''}.`
					: `You still need to create a budget${name ? ` for ${name}` : ''}.`,
			};
		} catch (error) {
			console.error('Error checking budget creation:', error);
			return {
				isCompleted: false,
				message: 'Error checking budget creation',
			};
		}
	}

	/**
	 * Check if user has created a goal
	 */
	private static async checkGoalCreated(
		criteria: any
	): Promise<CompletionDetectionResult> {
		try {
			const { name, target } = criteria;

			// Get user's goals
			const response = await ApiService.get('/goals');

			if (!response.success) {
				return {
					isCompleted: false,
					message: 'Unable to fetch goals',
				};
			}

			const goals: any[] = Array.isArray(response.data) ? response.data : [];
			let matchingGoal = null;

			if (name) {
				matchingGoal = goals.find((g: any) =>
					g.name.toLowerCase().includes(name.toLowerCase())
				);
			} else if (target) {
				matchingGoal = goals.find(
					(g: any) => Math.abs(g.target - target) < 0.01
				);
			} else {
				// If no specific criteria, check if any goal exists
				matchingGoal = goals.length > 0 ? goals[0] : null;
			}

			const isCompleted = !!matchingGoal;

			return {
				isCompleted,
				completionDate: matchingGoal?.createdAt,
				completionDetails: {
					goalCount: goals.length,
					matchingGoal: matchingGoal
						? {
								name: matchingGoal.name,
								target: matchingGoal.target,
								createdAt: matchingGoal.createdAt,
						  }
						: null,
				},
				message: isCompleted
					? `Great! You've created a goal${name ? ` for ${name}` : ''}.`
					: `You still need to create a goal${name ? ` for ${name}` : ''}.`,
			};
		} catch (error) {
			console.error('Error checking goal creation:', error);
			return {
				isCompleted: false,
				message: 'Error checking goal creation',
			};
		}
	}

	/**
	 * Check if user preferences have been updated
	 */
	private static async checkPreferencesUpdated(
		criteria: any
	): Promise<CompletionDetectionResult> {
		try {
			const { section, preference } = criteria;

			// Get user's profile/preferences
			const response = await ApiService.get('/profiles/me');

			if (!response.success) {
				// If profile doesn't exist, preferences are not updated
				if ('status' in response && response.status === 404) {
					return {
						isCompleted: false,
						message: 'Profile not found - preferences not yet set',
					};
				}
				return {
					isCompleted: false,
					message: 'Unable to fetch profile',
				};
			}

			const profile = response.data as any;
			let isCompleted = false;

			if (section && preference) {
				// Check specific preference
				isCompleted = profile.preferences?.[section]?.[preference] === true;
			} else if (section) {
				// Check if any preference in the section is enabled
				const sectionPrefs = profile.preferences?.[section];
				isCompleted =
					sectionPrefs &&
					typeof sectionPrefs === 'object' &&
					Object.values(sectionPrefs).some((value) => value === true);
			} else {
				// Check if any preferences are set
				isCompleted =
					profile.preferences &&
					typeof profile.preferences === 'object' &&
					Object.values(profile.preferences).some(
						(sectionPrefs) =>
							sectionPrefs &&
							typeof sectionPrefs === 'object' &&
							Object.values(sectionPrefs).some((value) => value === true)
					);
			}

			return {
				isCompleted,
				completionDate: isCompleted ? new Date().toISOString() : undefined,
				completionDetails: {
					section,
					preference,
					preferences: profile.preferences,
				},
				message: isCompleted
					? `Preferences updated successfully`
					: `Preferences not yet updated`,
			};
		} catch (error) {
			console.error('Error checking preferences:', error);
			return {
				isCompleted: false,
				message: 'Error checking preferences',
			};
		}
	}

	/**
	 * Check if user has completed the monthly financial health check
	 */
	private static async checkHealthCheckCompleted(
		criteria: any
	): Promise<CompletionDetectionResult> {
		try {
			// Get user's profile/preferences
			const response = await ApiService.get('/profiles/me');

			if (!response.success) {
				return {
					isCompleted: false,
					message: 'Unable to fetch profile',
				};
			}

			const profile = response.data as any;
			const isCompleted =
				profile.preferences?.notifications?.monthlyFinancialCheck === true;

			return {
				isCompleted,
				completionDate: isCompleted ? new Date().toISOString() : undefined,
				completionDetails: {
					monthlyFinancialCheck:
						profile.preferences?.notifications?.monthlyFinancialCheck,
				},
				message: isCompleted
					? 'Monthly Financial Health Check is enabled and completed.'
					: 'Monthly Financial Health Check is not yet completed.',
			};
		} catch (error) {
			console.error('Error checking health check completion:', error);
			return {
				isCompleted: false,
				message: 'Error checking health check completion',
			};
		}
	}

	/**
	 * Refresh completion status for a list of actions using MongoDB
	 */
	static async refreshCompletionStatus(
		actions: any
	): Promise<IntelligentAction[]> {
		try {
			// Ensure actions is an array
			if (!Array.isArray(actions)) {
				console.error('Actions is not an array:', actions);
				return [];
			}

			const actionsArray = actions as IntelligentAction[];
			console.log(
				'Refreshing completion status for actions:',
				actionsArray.length
			);

			// Helper function to safely get action ID
			const getActionId = (action: any): string => {
				// Handle both MongoDB _id and regular id
				return (
					action.id || action._id || `action_${Date.now()}_${Math.random()}`
				);
			};

			// Separate MongoDB actions from locally generated detection actions
			const mongoDBActions = actionsArray.filter(
				(action) =>
					action.type === 'detect_completion' &&
					!getActionId(action).startsWith('detect_') // MongoDB actions don't have this prefix
			);

			const localDetectionActions = actionsArray.filter(
				(action) =>
					action.type === 'detect_completion' &&
					getActionId(action).startsWith('detect_') // Locally generated detection actions
			);

			// Handle MongoDB actions
			let updatedActions: IntelligentAction[] = [];
			if (mongoDBActions.length > 0) {
				try {
					const mongoDBActionIds = mongoDBActions.map((action) =>
						getActionId(action)
					);
					const refreshedMongoDBActions = await this.refreshActionStatus(
						mongoDBActionIds
					);

					if (Array.isArray(refreshedMongoDBActions)) {
						updatedActions = [...refreshedMongoDBActions];
					} else {
						console.warn(
							'refreshActionStatus did not return an array, using original actions'
						);
						updatedActions = [...mongoDBActions];
					}
				} catch (error) {
					console.error('Error refreshing MongoDB actions:', error);
					// Fall back to original actions if refresh fails
					updatedActions = [...mongoDBActions];
				}
			}

			// Handle locally generated detection actions
			const refreshedLocalActions: IntelligentAction[] = await Promise.all(
				localDetectionActions.map(async (action) => {
					try {
						const completionResult = await this.checkCompletionStatus(action);
						return {
							...action,
							id: getActionId(action), // Ensure id is set
							executed: completionResult.isCompleted,
							completionDetails: completionResult.completionDetails,
							status: completionResult.isCompleted
								? 'completed'
								: ('pending' as const),
						} as IntelligentAction;
					} catch (error) {
						console.error(
							`Error checking completion for action ${getActionId(action)}:`,
							error
						);
						return {
							...action,
							id: getActionId(action), // Ensure id is set
						};
					}
				})
			);

			// Combine all actions
			const allUpdatedActions = [...updatedActions, ...refreshedLocalActions];

			// Create a map of updated actions by ID
			const updatedActionsMap = new Map(
				allUpdatedActions.map((action) => [getActionId(action), action])
			);

			// Merge updated actions with original actions
			const mergedActions = actionsArray.map((action) => {
				const actionId = getActionId(action);
				if (updatedActionsMap.has(actionId)) {
					return updatedActionsMap.get(actionId)!;
				}
				return {
					...action,
					id: actionId, // Ensure id is set
				};
			});

			console.log('Updated actions:', mergedActions.length);
			return mergedActions;
		} catch (error) {
			console.error('Error refreshing completion status:', error);
			// Return original actions if refresh fails completely
			return Array.isArray(actions) ? (actions as IntelligentAction[]) : [];
		}
	}

	/**
	 * Create a budget based on insight analysis
	 */
	private static async createBudgetFromInsight(
		parameters: Record<string, any>
	): Promise<ActionExecutionResult> {
		try {
			const {
				name,
				amount,
				period = 'monthly',
				icon = 'cart-outline',
				color = '#4A90E2',
				categories = [],
			} = parameters;

			if (!name || !amount) {
				return {
					success: false,
					error: 'Missing required parameters',
					message: 'Budget name and amount are required',
				};
			}

			const response = await ApiService.post('/budgets', {
				name,
				amount: parseFloat(amount),
				period,
				icon,
				color,
				categories,
			});

			if (response.success) {
				return {
					success: true,
					data: response.data,
					message: `Budget "${name}" created successfully with $${amount} limit`,
				};
			} else {
				return {
					success: false,
					error: response.error,
					message: 'Failed to create budget',
				};
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				message: 'Failed to create budget',
			};
		}
	}

	/**
	 * Create a goal based on insight analysis
	 */
	private static async createGoalFromInsight(
		parameters: Record<string, any>
	): Promise<ActionExecutionResult> {
		try {
			const {
				name,
				target,
				deadline,
				icon = 'flag-outline',
				color = '#4A90E2',
				categories = [],
			} = parameters;

			if (!name || !target) {
				return {
					success: false,
					error: 'Missing required parameters',
					message: 'Goal name and target are required',
				};
			}

			// Set default deadline if not provided (90 days from now)
			const goalDeadline =
				deadline ||
				new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split('T')[0];

			const response = await ApiService.post('/goals', {
				name,
				target: parseFloat(target),
				deadline: goalDeadline,
				icon,
				color,
				categories,
			});

			if (response.success) {
				return {
					success: true,
					data: response.data,
					message: `Goal "${name}" created successfully with $${target} target`,
				};
			} else {
				return {
					success: false,
					error: response.error,
					message: 'Failed to create goal',
				};
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				message: 'Failed to create goal',
			};
		}
	}

	/**
	 * Set a reminder based on insight analysis
	 */
	private static async setReminderFromInsight(
		parameters: Record<string, any>
	): Promise<ActionExecutionResult> {
		try {
			const {
				title,
				message,
				scheduledFor,
				type = 'budget_reminder',
			} = parameters;

			if (!title || !message) {
				return {
					success: false,
					error: 'Missing required parameters',
					message: 'Reminder title and message are required',
				};
			}

			// For now, we'll just return success since notification system is separate
			// In a full implementation, this would integrate with the notification service
			return {
				success: true,
				data: { title, message, scheduledFor, type },
				message: `Reminder "${title}" scheduled successfully`,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				message: 'Failed to set reminder',
			};
		}
	}

	/**
	 * Update user preferences based on insight analysis
	 */
	private static async updatePreferencesFromInsight(
		parameters: Record<string, any>
	): Promise<ActionExecutionResult> {
		try {
			const { preferences, section = 'aiInsights' } = parameters;

			if (!preferences) {
				return {
					success: false,
					error: 'Missing required parameters',
					message: 'Preferences object is required',
				};
			}

			const response = await ApiService.put('/profile/preferences', {
				section,
				preferences,
			});

			if (response.success) {
				return {
					success: true,
					data: response.data,
					message: 'Preferences updated successfully',
				};
			} else {
				return {
					success: false,
					error: response.error,
					message: 'Failed to update preferences',
				};
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				message: 'Failed to update preferences',
			};
		}
	}

	/**
	 * Export data based on insight analysis
	 */
	private static async exportDataFromInsight(
		parameters: Record<string, any>
	): Promise<ActionExecutionResult> {
		try {
			const {
				format = 'csv',
				dateRange,
				includeTransactions = true,
				includeBudgets = true,
				includeGoals = true,
			} = parameters;

			const response = await ApiService.post('/data/export', {
				format,
				dateRange,
				includeTransactions,
				includeBudgets,
				includeGoals,
			});

			if (response.success) {
				return {
					success: true,
					data: response.data,
					message: `Data exported successfully in ${format.toUpperCase()} format`,
				};
			} else {
				return {
					success: false,
					error: response.error,
					message: 'Failed to export data',
				};
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				message: 'Failed to export data',
			};
		}
	}

	/**
	 * Analyze an insight and generate intelligent actions
	 */
	static async analyzeInsightForActions(
		insight: any
	): Promise<IntelligentAction[]> {
		try {
			console.log(
				'Analyzing insight for actions:',
				insight?.title || 'Unknown insight'
			);

			const response = await ApiService.post('/intelligent-actions/analyze', {
				insight,
			});

			console.log('Analysis response:', response);

			if (response.success && response.data) {
				// Handle nested response structure
				let actionsData: IntelligentAction[] = [];

				// If response.data has its own data property, use that
				if (
					response.data &&
					typeof response.data === 'object' &&
					'data' in response.data &&
					Array.isArray(response.data.data)
				) {
					actionsData = response.data.data as IntelligentAction[];
				} else if (Array.isArray(response.data)) {
					actionsData = response.data as IntelligentAction[];
				} else {
					console.error('Response data is not an array:', response.data);
					return [];
				}

				console.log('Returning actions array with length:', actionsData.length);
				return actionsData;
			} else {
				console.error('Failed to analyze insight for actions:', response.error);
				return [];
			}
		} catch (error) {
			console.error('Error analyzing insight for actions:', error);
			return [];
		}
	}

	/**
	 * Get appropriate icon for a category
	 */
	private static getCategoryIcon(categoryName: string): string {
		const categoryIcons: Record<string, string> = {
			food: 'restaurant-outline',
			groceries: 'cart-outline',
			transportation: 'car-outline',
			entertainment: 'game-controller-outline',
			shopping: 'bag-outline',
			utilities: 'flash-outline',
			rent: 'home-outline',
			healthcare: 'medical-outline',
			education: 'school-outline',
			travel: 'airplane-outline',
		};

		const lowerCategory = categoryName.toLowerCase();
		for (const [key, icon] of Object.entries(categoryIcons)) {
			if (lowerCategory.includes(key)) {
				return icon;
			}
		}

		return 'pricetag-outline'; // Default icon
	}

	/**
	 * Get appropriate color for a category
	 */
	private static getCategoryColor(categoryName: string): string {
		const categoryColors: Record<string, string> = {
			food: '#FF6B6B',
			groceries: '#4ECDC4',
			transportation: '#45B7D1',
			entertainment: '#96CEB4',
			shopping: '#FFEAA7',
			utilities: '#DDA0DD',
			rent: '#98D8C8',
			healthcare: '#F7DC6F',
			education: '#BB8FCE',
			travel: '#85C1E9',
		};

		const lowerCategory = categoryName.toLowerCase();
		for (const [key, color] of Object.entries(categoryColors)) {
			if (lowerCategory.includes(key)) {
				return color;
			}
		}

		return '#4A90E2'; // Default color
	}
}
