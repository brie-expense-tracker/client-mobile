import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from '../core/apiService';
import { logger } from '../../../utils/logger';


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
	private isOnline = true;
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
			logger.error('Error loading action queue:', error);
		}
	}

	private async saveQueue() {
		try {
			await AsyncStorage.setItem('actionQueue', JSON.stringify(this.queue));
		} catch (error) {
			logger.error('Error saving action queue:', error);
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

	// Check network connectivity
	private async checkConnectivity(): Promise<boolean> {
		try {
			// Try to fetch a small resource to check connectivity
			await fetch('https://www.google.com/favicon.ico', {
				method: 'HEAD',
				mode: 'no-cors',
				cache: 'no-cache',
			});
			this.isOnline = true;
			return true;
		} catch {
			this.isOnline = false;
			return false;
		}
	}

	// Process the entire queue
	async processQueue(): Promise<void> {
		if (this.isProcessing || this.queue.length === 0) return;

		// Check connectivity before processing
		const isOnline = await this.checkConnectivity();
		if (!isOnline) {
			logger.debug('Action queue: Skipping processing - offline');
			return;
		}

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
					logger.error(`Error executing action ${action.id}:`, error);
					action.retryCount++;

					if (action.retryCount >= action.maxRetries) {
						// Remove permanently failed actions
						logger.error(
							`Action ${action.id} permanently failed after ${action.maxRetries} retries`
						);
						this.queue = this.queue.filter((a) => a.id !== action.id);
					} else {
						// Calculate retry delay with exponential backoff
						const retryDelay = this.calculateRetryDelay(action.retryCount);
						logger.debug(
							`Action ${action.id} will retry in ${retryDelay}ms (attempt ${action.retryCount}/${action.maxRetries})`
						);
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
		logger.debug('Executing budget action:', action);

		switch (action.type) {
			case 'CREATE':
				await ApiService.post('/api/budgets', action.data);
				break;
			case 'UPDATE':
				await ApiService.put(`/api/budgets/${action.data.id}`, action.data);
				break;
			case 'DELETE':
				await ApiService.delete(`/api/budgets/${action.data.id}`);
				break;
			default:
				throw new Error(`Unknown budget action type: ${action.type}`);
		}
	}

	private async executeGoalAction(action: QueuedAction): Promise<void> {
		logger.debug('Executing goal action:', action);

		switch (action.type) {
			case 'CREATE':
				await ApiService.post('/api/goals', action.data);
				break;
			case 'UPDATE':
				await ApiService.put(`/api/goals/${action.data.id}`, action.data);
				break;
			case 'DELETE':
				await ApiService.delete(`/api/goals/${action.data.id}`);
				break;
			default:
				throw new Error(`Unknown goal action type: ${action.type}`);
		}
	}

	private async executeTransactionAction(action: QueuedAction): Promise<void> {
		logger.debug('Executing transaction action:', action);

		switch (action.type) {
			case 'CREATE':
				await ApiService.post('/api/transactions', action.data);
				break;
			case 'UPDATE':
				await ApiService.put(
					`/api/transactions/${action.data.id}`,
					action.data
				);
				break;
			case 'DELETE':
				await ApiService.delete(`/api/transactions/${action.data.id}`);
				break;
			default:
				throw new Error(`Unknown transaction action type: ${action.type}`);
		}
	}

	private async executeRecurringExpenseAction(
		action: QueuedAction
	): Promise<void> {
		logger.debug('Executing recurring expense action:', action);

		switch (action.type) {
			case 'CREATE':
				await ApiService.post('/api/recurring-expenses', action.data);
				break;
			case 'UPDATE':
				await ApiService.put(
					`/api/recurring-expenses/${action.data.patternId}`,
					action.data
				);
				break;
			case 'DELETE':
				await ApiService.delete(
					`/api/recurring-expenses/${action.data.patternId}`
				);
				break;
			default:
				throw new Error(
					`Unknown recurring expense action type: ${action.type}`
				);
		}
	}

	// Get queue status
	getQueueStatus() {
		return {
			total: this.queue.length,
			pending: this.queue.filter((a) => a.retryCount < a.maxRetries).length,
			failed: this.queue.filter((a) => a.retryCount >= a.maxRetries).length,
			isProcessing: this.isProcessing,
			isOnline: this.isOnline,
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
			logger.error(`Error retrying action ${actionId}:`, error);
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

	private calculateRetryDelay(retryCount: number): number {
		// Exponential backoff: base delay * 2^retryCount, with jitter
		const baseDelay = this.config.retryDelay;
		const exponentialDelay = baseDelay * Math.pow(2, retryCount - 1);
		const jitter = Math.random() * 1000; // Add up to 1 second of jitter
		return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
	}

	// Get actions by entity type
	getActionsByEntity(entity: QueuedAction['entity']): QueuedAction[] {
		return this.queue.filter((a) => a.entity === entity);
	}

	// Get actions by priority
	getActionsByPriority(priority: QueuedAction['priority']): QueuedAction[] {
		return this.queue.filter((a) => a.priority === priority);
	}

	// Force connectivity check and process queue
	async forceProcessQueue(): Promise<void> {
		logger.debug('Force processing action queue...');
		await this.checkConnectivity();
		await this.processQueue();
	}

	// Get connectivity status
	getConnectivityStatus(): boolean {
		return this.isOnline;
	}
}

// Export singleton instance
export const actionQueueService = new ActionQueueService();

// Export the class for testing purposes
export default ActionQueueService;
