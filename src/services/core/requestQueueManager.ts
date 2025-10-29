import { logger } from '../../../utils/logger';
/**
 * Request Queue Manager
 * Manages concurrent requests to prevent rate limiting and improve performance
 */

interface QueuedRequest {
	id: string;
	endpoint: string;
	method: string;
	priority: number;
	timestamp: number;
	resolve: (value: any) => void;
	reject: (error: any) => void;
}

interface QueueConfig {
	maxConcurrent: number;
	retryDelay: number;
	maxRetries: number;
	priorityThreshold: number;
}

class RequestQueueManager {
	private queue: QueuedRequest[] = [];
	private activeRequests = new Set<string>();
	private config: QueueConfig;
	private processing = false;

	constructor(config: Partial<QueueConfig> = {}) {
		this.config = {
			maxConcurrent: 3,
			retryDelay: 1000,
			maxRetries: 2,
			priorityThreshold: 5,
			...config,
		};
	}

	/**
	 * Add a request to the queue
	 */
	async enqueue<T>(
		endpoint: string,
		method: string,
		requestFn: () => Promise<T>,
		priority: number = 1
	): Promise<T> {
		return new Promise((resolve, reject) => {
			const requestId = `${method}:${endpoint}:${Date.now()}`;

			// Check if request is already active
			if (this.activeRequests.has(requestId)) {
				logger.debug(`🔄 [RequestQueue] Request already active: ${requestId}`);
				reject(new Error('Request already in progress'));
				return;
			}

			const queuedRequest: QueuedRequest = {
				id: requestId,
				endpoint,
				method,
				priority,
				timestamp: Date.now(),
				resolve,
				reject,
			};

			// Add to queue with priority sorting
			this.queue.push(queuedRequest);
			this.queue.sort((a, b) => b.priority - a.priority);

			logger.debug(
				`📋 [RequestQueue] Enqueued request: ${requestId} (priority: ${priority})`
			);

			// Start processing if not already running
			if (!this.processing) {
				this.processQueue();
			}
		});
	}

	/**
	 * Process the request queue
	 */
	private async processQueue(): Promise<void> {
		if (this.processing) return;

		this.processing = true;
		logger.debug(
			`🔄 [RequestQueue] Starting queue processing (${this.queue.length} queued)`
		);

		while (
			this.queue.length > 0 &&
			this.activeRequests.size < this.config.maxConcurrent
		) {
			const request = this.queue.shift();
			if (!request) break;

			// Check if request is too old (5 minutes)
			const age = Date.now() - request.timestamp;
			if (age > 300000) {
				logger.debug(`⏰ [RequestQueue] Request expired: ${request.id}`);
				request.reject(new Error('Request expired'));
				continue;
			}

			this.activeRequests.add(request.id);
			this.executeRequest(request);
		}

		this.processing = false;
	}

	/**
	 * Execute a single request
	 */
	private async executeRequest(request: QueuedRequest): Promise<void> {
		logger.debug(`🚀 [RequestQueue] Executing request: ${request.id}`);

		try {
			// Simulate the actual request execution
			// In a real implementation, this would call the actual API service
			const result = await this.makeRequest(request);
			request.resolve(result);
		} catch (error) {
			request.reject(error);
		} finally {
			this.activeRequests.delete(request.id);

			// Continue processing queue
			setTimeout(() => this.processQueue(), 100);
		}
	}

	/**
	 * Make the actual request (placeholder for now)
	 */
	private async makeRequest(request: QueuedRequest): Promise<any> {
		// This would be replaced with actual API calls
		// For now, we'll just simulate a delay
		await new Promise((resolve) => setTimeout(resolve, 100));
		return { success: true, data: null };
	}

	/**
	 * Get queue status
	 */
	getStatus(): {
		queued: number;
		active: number;
		processing: boolean;
	} {
		return {
			queued: this.queue.length,
			active: this.activeRequests.size,
			processing: this.processing,
		};
	}

	/**
	 * Clear the queue
	 */
	clearQueue(): void {
		this.queue.forEach((request) => {
			request.reject(new Error('Queue cleared'));
		});
		this.queue = [];
		logger.debug(`🗑️ [RequestQueue] Queue cleared`);
	}

	/**
	 * Update configuration
	 */
	updateConfig(newConfig: Partial<QueueConfig>): void {
		this.config = { ...this.config, ...newConfig };
		logger.debug(`⚙️ [RequestQueue] Config updated:`, this.config);
	}
}

// Export singleton instance
export const requestQueueManager = new RequestQueueManager();

// Export types
export type { QueuedRequest, QueueConfig };
