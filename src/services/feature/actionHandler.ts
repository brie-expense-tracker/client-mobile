// actionHandler.ts - Execute pending actions (CREATE_BUDGET, etc.)

// import { nanoid } from 'nanoid';
// import { PendingAction } from '../../types/assistant';
import { ConversationState } from '../ConversationState';
import { ChatResponse } from '../../services/assistant/responseSchema';

// Action execution result
export interface ActionExecutionResult {
	success: boolean;
	message: string;
	details?: string;
	data?: any;
	error?: string;
	actions?: {
		label: string;
		action: string;
		params?: any;
	}[];
}

// Action handler configuration
export interface ActionHandlerConfig {
	enableRetry: boolean;
	maxRetries: number;
	retryDelay: number;
	timeout: number;
	enableLogging: boolean;
}

// Action execution statistics
export interface ActionStats {
	totalExecutions: number;
	successfulExecutions: number;
	failedExecutions: number;
	averageExecutionTime: number;
	lastExecutionTime: number;
	actionTypes: Record<string, number>;
}

// Mock API service - replace with your actual API service
const Api = {
	post: async (endpoint: string, body: any) => {
		// This should be replaced with your actual API service

		// Mock successful response
		return {
			json: async () => ({
				_id: `budget_${Date.now()}`,
				...body,
				createdAt: new Date().toISOString(),
			}),
		};
	},
	put: async (endpoint: string, body: any) => {
		return {
			json: async () => ({
				_id: endpoint.split('/').pop(),
				...body,
				updatedAt: new Date().toISOString(),
			}),
		};
	},
	delete: async (endpoint: string) => {
		return {
			json: async () => ({
				success: true,
				deletedAt: new Date().toISOString(),
			}),
		};
	},
};

// Enhanced Action Handler Class
export class ActionHandler {
	private config: ActionHandlerConfig;
	private stats: ActionStats;
	private executionHistory: {
		conversationId: string;
		actionType: string;
		success: boolean;
		executionTime: number;
		timestamp: Date;
	}[] = [];

	constructor(config: Partial<ActionHandlerConfig> = {}) {
		this.config = {
			enableRetry: true,
			maxRetries: 3,
			retryDelay: 1000,
			timeout: 10000,
			enableLogging: true,
			...config,
		};
		this.stats = {
			totalExecutions: 0,
			successfulExecutions: 0,
			failedExecutions: 0,
			averageExecutionTime: 0,
			lastExecutionTime: 0,
			actionTypes: {},
		};
	}

	// Execute action with retry logic and error handling
	async executeAction(
		conversationId: string,
		action: any
	): Promise<ActionExecutionResult> {
		const startTime = performance.now();
		this.stats.totalExecutions++;
		this.stats.actionTypes[action.type] =
			(this.stats.actionTypes[action.type] || 0) + 1;

		if (this.config.enableLogging) {
		}

		try {
			const result = await this.executeWithRetry(conversationId, action);
			const executionTime = performance.now() - startTime;

			this.updateStats(true, executionTime);
			this.recordExecution(conversationId, action.type, true, executionTime);

			return result;
		} catch (error) {
			const executionTime = performance.now() - startTime;
			this.updateStats(false, executionTime);
			this.recordExecution(conversationId, action.type, false, executionTime);

			return {
				success: false,
				message:
					"I couldn't complete that action right now. Please try again later.",
				details: 'There was an error processing your request.',
				error: error instanceof Error ? error.message : 'Unknown error',
				actions: [
					{
						label: 'Try Again',
						action: 'RETRY_ACTION',
						params: { actionId: action.id },
					},
				],
			};
		}
	}

	// Execute action with retry logic
	private async executeWithRetry(
		conversationId: string,
		action: any
	): Promise<ActionExecutionResult> {
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
			try {
				const result = await this.executeActionInternal(conversationId, action);
				return result;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error('Unknown error');

				if (attempt < this.config.maxRetries) {
					console.log(
						`[ActionHandler] Attempt ${attempt} failed, retrying...`,
						error
					);
					await this.delay(this.config.retryDelay * attempt);
				}
			}
		}

		throw lastError || new Error('Max retries exceeded');
	}

	// Internal action execution
	private async executeActionInternal(
		conversationId: string,
		action: any
	): Promise<ActionExecutionResult> {
		// Check for duplicate execution
		if (ConversationState.isDuplicateAction(conversationId, action.id)) {
			return {
				success: true,
				message:
					'I already handled that request! What else can I help you with?',
				details: 'This action was already executed.',
			};
		}

		// Execute the action based on type
		switch (action.type) {
			case 'CREATE_BUDGET':
				return await this.handleCreateBudget(action);
			case 'CREATE_GOAL':
				return await this.handleCreateGoal(action);
			case 'ADJUST_BUDGET':
				return await this.handleAdjustBudget(action);
			case 'DELETE_BUDGET':
				return await this.handleDeleteBudget(action);
			case 'CREATE_TRANSACTION':
				return await this.handleCreateTransaction(action);
			case 'UPDATE_GOAL':
				return await this.handleUpdateGoal(action);
			default:
				throw new Error(`Unknown action type: ${action.type}`);
		}
	}

	// Handle CREATE_BUDGET action
	private async handleCreateBudget(
		action: any
	): Promise<ActionExecutionResult> {
		const body = {
			name:
				action.params.category[0].toUpperCase() +
				action.params.category.slice(1),
			category: action.params.category,
			period: action.params.period ?? 'monthly',
			amount: action.params.amount ?? 300,
		};

		const res = await Api.post('/api/budgets', body);
		const budget = await res.json();

		// Mark as executed
		ConversationState.setLastExecutedAction(action.conversationId, action.id);

		return {
			success: true,
			message: `Done! I created a ${body.name} budget for $${body.amount}/month.`,
			details: `Your new budget is ready to track your ${body.category} spending.`,
			data: budget,
			actions: [
				{
					label: 'Open Budget',
					action: 'OPEN_BUDGETS',
					params: { period: 'mtd', category: body.category },
				},
				{
					label: 'Adjust Amount',
					action: 'ADJUST_LIMIT',
					params: { category: body.category },
				},
			],
		};
	}

	// Handle CREATE_GOAL action
	private async handleCreateGoal(action: any): Promise<ActionExecutionResult> {
		const body = {
			name: action.params.name,
			target: action.params.target,
			deadline:
				action.params.deadline ??
				new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
		};

		const res = await Api.post('/api/goals', body);
		const goal = await res.json();

		ConversationState.setLastExecutedAction(action.conversationId, action.id);

		return {
			success: true,
			message: `Done! I created a ${body.name} goal for $${body.target}.`,
			details: `You can track your progress in the Goals tab.`,
			data: goal,
			actions: [
				{
					label: 'View Goals',
					action: 'OPEN_GOALS' as any,
					params: { goalId: goal._id },
				},
			],
		};
	}

	// Handle ADJUST_BUDGET action
	private async handleAdjustBudget(
		action: any
	): Promise<ActionExecutionResult> {
		const body = {
			amount: action.params.newAmount,
		};

		const res = await Api.put(`/api/budgets/${action.params.budgetId}`, body);
		const budget = await res.json();

		ConversationState.setLastExecutedAction(action.conversationId, action.id);

		return {
			success: true,
			message: `Done! I updated your budget to $${body.amount}/month.`,
			details: `Your budget limit has been adjusted.`,
			data: budget,
			actions: [
				{
					label: 'View Budget',
					action: 'OPEN_BUDGETS',
					params: { period: 'mtd' },
				},
			],
		};
	}

	// Handle DELETE_BUDGET action
	private async handleDeleteBudget(
		action: any
	): Promise<ActionExecutionResult> {
		const res = await Api.delete(`/api/budgets/${action.params.budgetId}`);
		const result = await res.json();

		ConversationState.setLastExecutedAction(action.conversationId, action.id);

		return {
			success: true,
			message: `Done! I deleted the ${action.params.category} budget.`,
			details: `The budget has been removed from your account.`,
			data: result,
		};
	}

	// Handle CREATE_TRANSACTION action
	private async handleCreateTransaction(
		action: any
	): Promise<ActionExecutionResult> {
		const body = {
			amount: action.params.amount,
			description: action.params.description,
			category: action.params.category,
			date: action.params.date ?? new Date().toISOString(),
		};

		const res = await Api.post('/api/transactions', body);
		const transaction = await res.json();

		ConversationState.setLastExecutedAction(action.conversationId, action.id);

		return {
			success: true,
			message: `Done! I added a $${body.amount} transaction for ${body.description}.`,
			details: `The transaction has been recorded in your account.`,
			data: transaction,
			actions: [
				{
					label: 'View Transactions',
					action: 'OPEN_TRANSACTIONS',
					params: { category: body.category },
				},
			],
		};
	}

	// Handle UPDATE_GOAL action
	private async handleUpdateGoal(action: any): Promise<ActionExecutionResult> {
		const body = {
			target: action.params.newTarget,
			deadline: action.params.newDeadline,
		};

		const res = await Api.put(`/api/goals/${action.params.goalId}`, body);
		const goal = await res.json();

		ConversationState.setLastExecutedAction(action.conversationId, action.id);

		return {
			success: true,
			message: `Done! I updated your ${goal.name} goal.`,
			details: `The goal target and deadline have been updated.`,
			data: goal,
			actions: [
				{
					label: 'View Goals',
					action: 'OPEN_GOALS' as any,
					params: { goalId: goal._id },
				},
			],
		};
	}

	// Update statistics
	private updateStats(success: boolean, executionTime: number): void {
		if (success) {
			this.stats.successfulExecutions++;
		} else {
			this.stats.failedExecutions++;
		}

		// Update average execution time
		const totalTime =
			this.stats.averageExecutionTime * (this.stats.totalExecutions - 1);
		this.stats.averageExecutionTime =
			(totalTime + executionTime) / this.stats.totalExecutions;
		this.stats.lastExecutionTime = executionTime;
	}

	// Record execution in history
	private recordExecution(
		conversationId: string,
		actionType: string,
		success: boolean,
		executionTime: number
	): void {
		this.executionHistory.push({
			conversationId,
			actionType,
			success,
			executionTime,
			timestamp: new Date(),
		});

		// Keep only last 100 executions
		if (this.executionHistory.length > 100) {
			this.executionHistory = this.executionHistory.slice(-100);
		}
	}

	// Utility method for delays
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	// Get execution statistics
	getStats(): ActionStats {
		return { ...this.stats };
	}

	// Get execution history
	getExecutionHistory(limit: number = 50): typeof this.executionHistory {
		return this.executionHistory.slice(-limit);
	}

	// Clear execution history
	clearHistory(): void {
		this.executionHistory = [];
	}

	// Get success rate
	getSuccessRate(): number {
		if (this.stats.totalExecutions === 0) return 0;
		return this.stats.successfulExecutions / this.stats.totalExecutions;
	}

	// Get most common action types
	getMostCommonActions(
		limit: number = 5
	): { actionType: string; count: number }[] {
		return Object.entries(this.stats.actionTypes)
			.sort(([, a], [, b]) => b - a)
			.slice(0, limit)
			.map(([actionType, count]) => ({ actionType, count }));
	}
}

// Create singleton instance
const actionHandler = new ActionHandler();

// Legacy function for backward compatibility
export async function handleActionIntent(
	conversationId: string
): Promise<ChatResponse> {
	const action = ConversationState.consumePendingAction(conversationId);

	if (!action) {
		return {
			message: 'Got it! What would you like me to do?',
			details: '',
			cards: [],
			actions: [],
			sources: [{ kind: 'db', note: 'no_action' }],
			cost: { model: 'mini', estTokens: 20 },
		};
	}

	// Use the new ActionHandler class
	const result = await actionHandler.executeAction(conversationId, action);

	// Convert ActionExecutionResult to ChatResponse
	return {
		message: result.message,
		details: result.details || '',
		cards: [],
		actions: (result.actions || []) as any[],
		sources: [
			{
				kind: 'db',
				note: result.success ? 'action_executed' : 'action_failed',
			},
		],
		cost: { model: 'mini', estTokens: 50 },
	};
}

// Export the ActionHandler class and singleton instance
export { actionHandler };
export default ActionHandler;
