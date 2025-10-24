/**
 * Intent-based Missing Info Service
 * Integrates with server-side intent registry and sufficiency checker
 * Converts dead-ends into one-turn resolution
 */

import { MissingInfoChip } from '../../components/assistant/cards/MissingInfoCard';
import { ApiService } from '../core/apiService';

export interface IntentContext {
	profile?: {
		monthlyIncome?: number;
		savings?: number;
		debt?: number;
		riskProfile?: string;
	};
	bills?: {
		name: string;
		amount: number;
		dueDay: number;
	}[];
	budgets?: {
		name: string;
		amount: number;
	}[];
	goals?: {
		name: string;
		target: number;
		deadline: string;
	}[];
	transactions?: {
		amount: number;
		category: string;
	}[];
	recurringExpenses?: {
		vendor: string;
		amount: number;
		frequency: string;
		nextDue: string;
	}[];
}

export interface IntentMissingInfoState {
	chips: MissingInfoChip[];
	collectedData: Record<string, any>;
	isCollecting: boolean;
	completionRate: number;
	currentIntent: string | null;
	refusalMessage: string;
}

export class IntentMissingInfoService {
	private state: IntentMissingInfoState = {
		chips: [],
		collectedData: {},
		isCollecting: false,
		completionRate: 0,
		currentIntent: null,
		refusalMessage: '',
	};

	private listeners: ((state: IntentMissingInfoState) => void)[] = [];
	private cache: Map<string, any> = new Map();
	private retryCount: number = 0;
	private maxRetries: number = 3;

	/**
	 * Check sufficiency for a specific intent and context
	 */
	async checkIntentSufficiency(
		intentId: string,
		context: IntentContext
	): Promise<{
		hasMinimumData: boolean;
		missingSlots: MissingInfoChip[];
		refusalMessage: string;
		completionRate: number;
	}> {
		try {
			// Check cache first
			const cacheKey = `${intentId}_${JSON.stringify(context)}`;
			if (this.cache.has(cacheKey)) {
				return this.cache.get(cacheKey);
			}

			// Call server-side sufficiency checker using ApiService
			const response = await ApiService.post<{
				hasMinimumData: boolean;
				missingSlots: any[];
				refusalMessage: string;
				completionRate: number;
			}>('/api/ai/intents/sufficiency', {
				intentId,
				context,
			});

			if (!response.success || !response.data) {
				throw new Error(response.error || 'Failed to check intent sufficiency');
			}

			const result = response.data;

			// Convert missing slots to UI chips
			const chips = this.convertSlotsToChips(result.missingSlots || []);

			this.state.chips = chips;
			this.state.isCollecting = chips.length > 0;
			this.state.completionRate = result.completionRate || 0;
			this.state.currentIntent = intentId;
			this.state.refusalMessage = result.refusalMessage || '';

			// Cache the result
			const resultData = {
				hasMinimumData: result.hasMinimumData || false,
				missingSlots: chips,
				refusalMessage: result.refusalMessage || '',
				completionRate: result.completionRate || 0,
			};
			this.cache.set(cacheKey, resultData);

			this.notifyListeners();

			return resultData;
		} catch (error) {
			console.error('Error checking intent sufficiency:', error);

			// Retry logic
			if (this.retryCount < this.maxRetries) {
				this.retryCount++;
				console.log(
					`[IntentMissingInfoService] Retrying... (${this.retryCount}/${this.maxRetries})`
				);
				await new Promise((resolve) =>
					setTimeout(resolve, 1000 * this.retryCount)
				);
				return this.checkIntentSufficiency(intentId, context);
			}

			// Reset retry count on success
			this.retryCount = 0;

			return {
				hasMinimumData: false,
				missingSlots: [],
				refusalMessage:
					'Unable to check what information is needed. Please try again.',
				completionRate: 0,
			};
		}
	}

	/**
	 * Convert server-side missing slots to UI chips
	 */
	private convertSlotsToChips(
		missingSlots: {
			id: string;
			label: string;
			description: string;
			required: boolean;
			priority: 'high' | 'medium' | 'low';
			examples: string[];
			placeholder: string;
			inputType: 'text' | 'number' | 'date' | 'select';
			options?: string[];
		}[]
	): MissingInfoChip[] {
		return missingSlots.map((slot) => ({
			id: slot.id,
			label: slot.label,
			description: slot.description,
			required: slot.required,
			priority: slot.priority,
			examples: slot.examples,
			placeholder: slot.placeholder,
			inputType: slot.inputType,
			options: slot.options,
			slot: slot.id, // Store the original slot path
		}));
	}

	/**
	 * Submit a value for a specific chip
	 */
	submitValue(chipId: string, value: string | number): void {
		this.state.collectedData[chipId] = value;
		this.updateCompletionRate();
		this.notifyListeners();
	}

	/**
	 * Get current state
	 */
	getState(): IntentMissingInfoState {
		return { ...this.state };
	}

	/**
	 * Check if all required data has been collected
	 */
	isComplete(): boolean {
		const requiredChips = this.state.chips.filter((chip) => chip.required);
		return requiredChips.every(
			(chip) =>
				this.state.collectedData[chip.id] !== undefined &&
				this.state.collectedData[chip.id] !== ''
		);
	}

	/**
	 * Get collected data formatted for API submission
	 */
	getCollectedDataForAPI(): Record<string, any> {
		const formatted: Record<string, any> = {};

		for (const [key, value] of Object.entries(this.state.collectedData)) {
			// Convert string numbers to actual numbers
			if (typeof value === 'string' && !isNaN(Number(value))) {
				formatted[key] = Number(value);
			} else {
				formatted[key] = value;
			}
		}

		return formatted;
	}

	/**
	 * Clear all collected data
	 */
	clearCollectedData(): void {
		this.state.collectedData = {};
		this.state.isCollecting = false;
		this.state.completionRate = 0;
		this.state.currentIntent = null;
		this.state.refusalMessage = '';
		this.notifyListeners();
	}

	/**
	 * Reset to initial state
	 */
	reset(): void {
		this.state = {
			chips: [],
			collectedData: {},
			isCollecting: false,
			completionRate: 0,
			currentIntent: null,
			refusalMessage: '',
		};
		this.notifyListeners();
	}

	/**
	 * Subscribe to state changes
	 */
	subscribe(listener: (state: IntentMissingInfoState) => void): () => void {
		this.listeners.push(listener);
		return () => {
			const index = this.listeners.indexOf(listener);
			if (index > -1) {
				this.listeners.splice(index, 1);
			}
		};
	}

	/**
	 * Update completion rate based on collected data
	 */
	private updateCompletionRate(): void {
		if (this.state.chips.length === 0) {
			this.state.completionRate = 0;
			return;
		}

		const totalChips = this.state.chips.length;
		const collectedChips = Object.keys(this.state.collectedData).length;
		this.state.completionRate = (collectedChips / totalChips) * 100;
	}

	/**
	 * Notify all listeners of state changes
	 */
	private notifyListeners(): void {
		this.listeners.forEach((listener) => listener(this.state));
	}

	/**
	 * Get progress summary for UI display
	 */
	getProgressSummary(): {
		total: number;
		collected: number;
		remaining: number;
		completionRate: number;
		requiredRemaining: number;
	} {
		const total = this.state.chips.length;
		const collected = Object.keys(this.state.collectedData).length;
		const remaining = total - collected;
		const requiredRemaining = this.state.chips.filter(
			(chip) => chip.required && this.state.collectedData[chip.id] === undefined
		).length;

		return {
			total,
			collected,
			remaining,
			completionRate: this.state.completionRate,
			requiredRemaining,
		};
	}

	/**
	 * Validate collected data
	 */
	validateCollectedData(): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		for (const chip of this.state.chips) {
			const value = this.state.collectedData[chip.id];

			if (chip.required && (value === undefined || value === '')) {
				errors.push(`${chip.label} is required`);
				continue;
			}

			if (value !== undefined && value !== '') {
				// Type validation
				if (chip.inputType === 'number' && typeof value !== 'number') {
					errors.push(`${chip.label} must be a number`);
				}

				// Range validation for numbers
				if (chip.inputType === 'number' && typeof value === 'number') {
					if (value <= 0) {
						errors.push(`${chip.label} must be greater than 0`);
					}
				}

				// Enum validation for select inputs
				if (
					chip.inputType === 'select' &&
					chip.options &&
					!chip.options.includes(String(value))
				) {
					errors.push(
						`${chip.label} must be one of: ${chip.options.join(', ')}`
					);
				}
			}
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Get missing info chips by priority
	 */
	getChipsByPriority(priority: 'high' | 'medium' | 'low'): MissingInfoChip[] {
		return this.state.chips.filter((chip) => chip.priority === priority);
	}

	/**
	 * Get required chips that are still missing
	 */
	getMissingRequiredChips(): MissingInfoChip[] {
		return this.state.chips.filter(
			(chip) => chip.required && this.state.collectedData[chip.id] === undefined
		);
	}

	/**
	 * Get completion status for specific priority
	 */
	getPriorityCompletion(priority: 'high' | 'medium' | 'low'): {
		total: number;
		collected: number;
		completionRate: number;
	} {
		const chips = this.getChipsByPriority(priority);
		const total = chips.length;
		const collected = chips.filter(
			(chip) => this.state.collectedData[chip.id] !== undefined
		).length;

		return {
			total,
			collected,
			completionRate: total > 0 ? (collected / total) * 100 : 100,
		};
	}

	/**
	 * Auto-fill data from context
	 */
	autoFillFromContext(context: IntentContext): void {
		// Auto-fill profile data
		if (context.profile) {
			if (context.profile.monthlyIncome) {
				this.submitValue('monthlyIncome', context.profile.monthlyIncome);
			}
			if (context.profile.savings) {
				this.submitValue('savings', context.profile.savings);
			}
			if (context.profile.debt) {
				this.submitValue('debt', context.profile.debt);
			}
			if (context.profile.riskProfile) {
				this.submitValue('riskProfile', context.profile.riskProfile);
			}
		}

		// Auto-fill budget data
		if (context.budgets && context.budgets.length > 0) {
			context.budgets.forEach((budget, index) => {
				this.submitValue(`budget_${index}_name`, budget.name);
				this.submitValue(`budget_${index}_amount`, budget.amount);
			});
		}

		// Auto-fill goal data
		if (context.goals && context.goals.length > 0) {
			context.goals.forEach((goal, index) => {
				this.submitValue(`goal_${index}_name`, goal.name);
				this.submitValue(`goal_${index}_target`, goal.target);
				this.submitValue(`goal_${index}_deadline`, goal.deadline);
			});
		}
	}

	/**
	 * Clear cache
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; keys: string[] } {
		return {
			size: this.cache.size,
			keys: Array.from(this.cache.keys()),
		};
	}

	/**
	 * Export collected data as JSON
	 */
	exportData(): string {
		return JSON.stringify(
			{
				collectedData: this.state.collectedData,
				completionRate: this.state.completionRate,
				currentIntent: this.state.currentIntent,
				timestamp: new Date().toISOString(),
			},
			null,
			2
		);
	}

	/**
	 * Import data from JSON
	 */
	importData(jsonData: string): boolean {
		try {
			const data = JSON.parse(jsonData);
			if (data.collectedData && typeof data.collectedData === 'object') {
				this.state.collectedData = data.collectedData;
				this.state.completionRate = data.completionRate || 0;
				this.state.currentIntent = data.currentIntent || null;
				this.updateCompletionRate();
				this.notifyListeners();
				return true;
			}
			return false;
		} catch (error) {
			console.error('[IntentMissingInfoService] Failed to import data:', error);
			return false;
		}
	}

	/**
	 * Get service statistics
	 */
	getServiceStats(): {
		requestCount: number;
		cacheSize: number;
		isCollecting: boolean;
		completionRate: number;
		currentIntent: string | null;
	} {
		return {
			requestCount: this.retryCount,
			cacheSize: this.cache.size,
			isCollecting: this.state.isCollecting,
			completionRate: this.state.completionRate,
			currentIntent: this.state.currentIntent,
		};
	}
}

// Singleton instance
export const intentMissingInfoService = new IntentMissingInfoService();
