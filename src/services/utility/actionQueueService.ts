import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QueuedAction {
	id: string;
	type: 'CREATE' | 'UPDATE' | 'DELETE';
	entity: 'BUDGET' | 'GOAL' | 'TRANSACTION' | 'RECURRING_EXPENSE';
	data: any;
	timestamp: number;
	retryCount: number;
	maxRetries: number;
	priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ActionQueueConfig {
	maxRetries: number;
	retryDelay: number;
	maxQueueSize: number;
	autoRetry: boolean;
}

class ActionQueueService {
	private queue: QueuedAction[] = [];
	private isProcessing = false;
	private config: ActionQueueConfig = {
		maxRetries: 3,
		retryDelay: 5000, // 5 seconds
		maxQueueSize: 100,
		autoRetry: true,
	};

	constructor() {
		this.initialize();
	}

	private async initialize() {
		await this.loadQueue();
		// Auto-process queue on initialization
		if (this.config.autoRetry) {
			this.processQueue();
		}
	}

	private async loadQueue() {
		try {
			const stored = await AsyncStorage.getItem('actionQueue');
			if (stored) {
				this.queue = JSON.parse(stored);
				// Clean up expired actions (older than 24 hours)
				this.queue = this.queue.filter(
					(action) => Date.now() - action.timestamp < 24 * 60 * 60 * 1000
				);
				await this.saveQueue();
			}
		} catch (error) {
			console.error('Error loading action queue:', error);
		}
	}

	private async saveQueue() {
		try {
			await AsyncStorage.setItem('actionQueue', JSON.stringify(this.queue));
		} catch (error) {
			console.error('Error saving action queue:', error);
		}
	}

	// Add action to queue
	async enqueueAction(
		action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>
	): Promise<string> {
		const queuedAction: QueuedAction = {
			...action,
			id: this.generateId(),
			timestamp: Date.now(),
			retryCount: 0,
		};

		// Check queue size limit
		if (this.queue.length >= this.config.maxQueueSize) {
			// Remove lowest priority actions to make room
			this.queue.sort(
				(a, b) =>
					this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority)
			);
			this.queue = this.queue.slice(0, this.config.maxQueueSize - 1);
		}

		this.queue.push(queuedAction);
		await this.saveQueue();

		// Try to process immediately if auto-retry is enabled
		if (this.config.autoRetry) {
			this.processQueue();
		}

		return queuedAction.id;
	}

	// Process the entire queue
	async processQueue(): Promise<void> {
		if (this.isProcessing || this.queue.length === 0) return;

		this.isProcessing = true;

		try {
			// Sort by priority and timestamp
			const sortedQueue = [...this.queue].sort((a, b) => {
				const priorityDiff =
					this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority);
				if (priorityDiff !== 0) return priorityDiff;
				return a.timestamp - b.timestamp;
			});

			for (const action of sortedQueue) {
				if (action.retryCount >= action.maxRetries) {
					// Remove failed actions
					this.queue = this.queue.filter((a) => a.id !== action.id);
					continue;
				}

				try {
					await this.executeAction(action);
					// Remove successful actions
					this.queue = this.queue.filter((a) => a.id !== action.id);
				} catch (error) {
					console.error(`Error executing action ${action.id}:`, error);
					action.retryCount++;

					if (action.retryCount >= action.maxRetries) {
						// Remove permanently failed actions
						this.queue = this.queue.filter((a) => a.id !== action.id);
					}
				}

				await this.saveQueue();

				// Add delay between actions to avoid overwhelming the server
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		} finally {
			this.isProcessing = false;
		}
	}

	// Execute a single action
	private async executeAction(action: QueuedAction): Promise<void> {
		// This is a placeholder - in a real implementation, you would:
		// 1. Call the appropriate API endpoint
		// 2. Handle the response
		// 3. Update local state if needed

		switch (action.entity) {
			case 'BUDGET':
				await this.executeBudgetAction(action);
				break;
			case 'GOAL':
				await this.executeGoalAction(action);
				break;
			case 'TRANSACTION':
				await this.executeTransactionAction(action);
				break;
			case 'RECURRING_EXPENSE':
				await this.executeRecurringExpenseAction(action);
				break;
			default:
				throw new Error(`Unknown entity type: ${action.entity}`);
		}
	}

	private async executeBudgetAction(action: QueuedAction): Promise<void> {
		// Implement budget API calls
		console.log('Executing budget action:', action);
		// Simulate API call
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	private async executeGoalAction(action: QueuedAction): Promise<void> {
		// Implement goal API calls
		console.log('Executing goal action:', action);
		// Simulate API call
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	private async executeTransactionAction(action: QueuedAction): Promise<void> {
		// Implement transaction API calls
		console.log('Executing transaction action:', action);
		// Simulate API call
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	private async executeRecurringExpenseAction(
		action: QueuedAction
	): Promise<void> {
		// Implement recurring expense API calls
		console.log('Executing recurring expense action:', action);
		// Simulate API call
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	// Get queue status
	getQueueStatus() {
		return {
			total: this.queue.length,
			pending: this.queue.filter((a) => a.retryCount < a.maxRetries).length,
			failed: this.queue.filter((a) => a.retryCount >= a.maxRetries).length,
			isProcessing: this.isProcessing,
		};
	}

	// Get queued actions
	getQueuedActions(): QueuedAction[] {
		return [...this.queue];
	}

	// Remove specific action from queue
	async removeAction(actionId: string): Promise<boolean> {
		const initialLength = this.queue.length;
		this.queue = this.queue.filter((a) => a.id !== actionId);

		if (this.queue.length !== initialLength) {
			await this.saveQueue();
			return true;
		}
		return false;
	}

	// Clear entire queue
	async clearQueue(): Promise<void> {
		this.queue = [];
		await this.saveQueue();
	}

	// Update configuration
	updateConfig(newConfig: Partial<ActionQueueConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	// Manual retry for specific action
	async retryAction(actionId: string): Promise<boolean> {
		const action = this.queue.find((a) => a.id === actionId);
		if (!action) return false;

		if (action.retryCount >= action.maxRetries) {
			action.retryCount = 0; // Reset retry count
		}

		try {
			await this.executeAction(action);
			this.queue = this.queue.filter((a) => a.id !== actionId);
			await this.saveQueue();
			return true;
		} catch (error) {
			action.retryCount++;
			await this.saveQueue();
			return false;
		}
	}

	// Utility methods
	private generateId(): string {
		return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private getPriorityValue(priority: QueuedAction['priority']): number {
		switch (priority) {
			case 'HIGH':
				return 3;
			case 'MEDIUM':
				return 2;
			case 'LOW':
				return 1;
			default:
				return 0;
		}
	}

	// Get actions by entity type
	getActionsByEntity(entity: QueuedAction['entity']): QueuedAction[] {
		return this.queue.filter((a) => a.entity === entity);
	}

	// Get actions by priority
	getActionsByPriority(priority: QueuedAction['priority']): QueuedAction[] {
		return this.queue.filter((a) => a.priority === priority);
	}
}

// Export singleton instance
export const actionQueueService = new ActionQueueService();

// Export the class for testing purposes
export default ActionQueueService;
