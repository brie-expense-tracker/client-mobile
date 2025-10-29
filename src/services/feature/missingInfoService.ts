/**
 * Missing Info Service
 * Handles collection and management of missing financial data
 * Integrates with slot matrices for targeted data capture
 */

import { MissingInfoChip } from '../../components/assistant/cards/MissingInfoCard';
import { logger } from '../../utils/logger';

export interface CollectedData {
	[key: string]: string | number | boolean;
}

export interface MissingInfoState {
	chips: MissingInfoChip[];
	collectedData: CollectedData;
	isCollecting: boolean;
	completionRate: number;
	currentIntent?: string | null;
	refusalMessage?: string;
}

export class MissingInfoService {
	private state: MissingInfoState = {
		chips: [],
		collectedData: {},
		isCollecting: false,
		completionRate: 0,
		currentIntent: null,
		refusalMessage: '',
	};

	private listeners: ((state: MissingInfoState) => void)[] = [];
	private cache: Map<string, any> = new Map();
	private retryCount: number = 0;
	private maxRetries: number = 3;

	/**
	 * Set missing info chips from AI response
	 */
	setMissingInfoChips(
		chips: MissingInfoChip[],
		intentId?: string,
		refusalMessage?: string
	): void {
		this.state.chips = chips;
		this.state.isCollecting = chips.length > 0;
		this.state.currentIntent = intentId || null;
		this.state.refusalMessage = refusalMessage || '';
		this.updateCompletionRate();
		this.notifyListeners();
	}

	/**
	 * Submit a value for a specific chip
	 */
	submitValue(
		chipId: string,
		value: string | number,
		validate: boolean = true
	): { success: boolean; error?: string; warning?: string } {
		// Validate the value if requested
		if (validate) {
			const validation = this.validateChipValue(chipId, value);
			if (!validation.valid) {
				return { success: false, error: validation.error };
			}
			if (validation.warning) {
				// Still submit but return warning
				this.state.collectedData[chipId] = value;
				this.updateCompletionRate();
				this.notifyListeners();
				return { success: true, warning: validation.warning };
			}
		}

		this.state.collectedData[chipId] = value;
		this.updateCompletionRate();
		this.notifyListeners();
		return { success: true };
	}

	/**
	 * Get current missing info state
	 */
	getState(): MissingInfoState {
		return { ...this.state };
	}

	/**
	 * Check if all required data has been collected
	 */
	isComplete(): boolean {
		const requiredChips = this.state.chips.filter((chip) => chip.required);
		return requiredChips.every(
			(chip) => this.state.collectedData[chip.id] !== undefined
		);
	}

	/**
	 * Get remaining required chips
	 */
	getRemainingRequiredChips(): MissingInfoChip[] {
		return this.state.chips.filter(
			(chip) => chip.required && this.state.collectedData[chip.id] === undefined
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
	subscribe(listener: (state: MissingInfoState) => void): () => void {
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
	 * Validate collected data against chip requirements
	 */
	validateCollectedData(): {
		valid: boolean;
		errors: string[];
		warnings: string[];
	} {
		const errors: string[] = [];
		const warnings: string[] = [];

		for (const chip of this.state.chips) {
			const value = this.state.collectedData[chip.id];

			// Required field validation
			if (chip.required && (value === undefined || value === '')) {
				errors.push(`${chip.label} is required`);
				continue;
			}

			if (value !== undefined && value !== '') {
				// Type validation
				if (chip.inputType === 'number' && typeof value !== 'number') {
					errors.push(`${chip.label} must be a number`);
					continue;
				}

				// Range validation for numbers
				if (chip.inputType === 'number' && typeof value === 'number') {
					if (
						chip.id === 'amount' ||
						chip.id === 'income' ||
						chip.id === 'rent' ||
						chip.id === 'limit'
					) {
						if (value <= 0) {
							errors.push(`${chip.label} must be greater than 0`);
						} else if (value > 1000000) {
							warnings.push(`${chip.label} seems unusually high (${value})`);
						}
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

				// Date validation
				if (chip.inputType === 'date') {
					const dateValue = new Date(String(value));
					if (isNaN(dateValue.getTime())) {
						errors.push(`${chip.label} must be a valid date`);
					} else {
						// Check if date is in the future for certain fields
						if (chip.id.includes('deadline') || chip.id.includes('due')) {
							const now = new Date();
							if (dateValue < now) {
								warnings.push(`${chip.label} is in the past`);
							}
						}
					}
				}

				// Text length validation
				if (chip.inputType === 'text' && typeof value === 'string') {
					if (value.length < 2) {
						warnings.push(`${chip.label} is very short`);
					} else if (value.length > 100) {
						warnings.push(`${chip.label} is very long`);
					}
				}
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Validate a single chip value
	 */
	validateChipValue(
		chipId: string,
		value: string | number
	): { valid: boolean; error?: string; warning?: string } {
		const chip = this.state.chips.find((c) => c.id === chipId);
		if (!chip) {
			return { valid: false, error: 'Chip not found' };
		}

		// Required field validation
		if (chip.required && (value === undefined || value === '')) {
			return { valid: false, error: `${chip.label} is required` };
		}

		if (value !== undefined && value !== '') {
			// Type validation
			if (chip.inputType === 'number' && typeof value !== 'number') {
				return { valid: false, error: `${chip.label} must be a number` };
			}

			// Range validation for numbers
			if (chip.inputType === 'number' && typeof value === 'number') {
				if (value <= 0) {
					return {
						valid: false,
						error: `${chip.label} must be greater than 0`,
					};
				}
				if (value > 1000000) {
					return { valid: true, warning: `${chip.label} seems unusually high` };
				}
			}

			// Enum validation for select inputs
			if (
				chip.inputType === 'select' &&
				chip.options &&
				!chip.options.includes(String(value))
			) {
				return {
					valid: false,
					error: `${chip.label} must be one of: ${chip.options.join(', ')}`,
				};
			}

			// Date validation
			if (chip.inputType === 'date') {
				const dateValue = new Date(String(value));
				if (isNaN(dateValue.getTime())) {
					return { valid: false, error: `${chip.label} must be a valid date` };
				}
			}
		}

		return { valid: true };
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
		const requiredRemaining = this.getRemainingRequiredChips().length;

		return {
			total,
			collected,
			remaining,
			completionRate: this.state.completionRate,
			requiredRemaining,
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
	 * Clear cache
	 */
	clearCache(): void {
		this.cache.clear();
		logger.debug('[MissingInfoService] Cache cleared');
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
			logger.error('[MissingInfoService] Failed to import data:', error);
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
			currentIntent: this.state.currentIntent || null,
		};
	}

	/**
	 * Set current intent context
	 */
	setCurrentIntent(intentId: string | null): void {
		this.state.currentIntent = intentId;
		this.notifyListeners();
	}

	/**
	 * Set refusal message
	 */
	setRefusalMessage(message: string): void {
		this.state.refusalMessage = message;
		this.notifyListeners();
	}

	/**
	 * Get current intent
	 */
	getCurrentIntent(): string | null {
		return this.state.currentIntent ?? null;
	}

	/**
	 * Get refusal message
	 */
	getRefusalMessage(): string {
		return this.state.refusalMessage || '';
	}

	/**
	 * Get chips by input type
	 */
	getChipsByInputType(
		inputType: 'text' | 'number' | 'date' | 'select'
	): MissingInfoChip[] {
		return this.state.chips.filter((chip) => chip.inputType === inputType);
	}

	/**
	 * Get completion status by input type
	 */
	getInputTypeCompletion(inputType: 'text' | 'number' | 'date' | 'select'): {
		total: number;
		collected: number;
		completionRate: number;
	} {
		const chips = this.getChipsByInputType(inputType);
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
	 * Check if a specific chip has been completed
	 */
	isChipCompleted(chipId: string): boolean {
		return this.state.collectedData[chipId] !== undefined;
	}

	/**
	 * Get the value for a specific chip
	 */
	getChipValue(chipId: string): string | number | undefined {
		const value = this.state.collectedData[chipId];
		return typeof value === 'boolean' ? undefined : value;
	}

	/**
	 * Remove a specific chip value
	 */
	removeChipValue(chipId: string): void {
		delete this.state.collectedData[chipId];
		this.updateCompletionRate();
		this.notifyListeners();
	}

	/**
	 * Get all completed chips
	 */
	getCompletedChips(): MissingInfoChip[] {
		return this.state.chips.filter(
			(chip) => this.state.collectedData[chip.id] !== undefined
		);
	}

	/**
	 * Get all incomplete chips
	 */
	getIncompleteChips(): MissingInfoChip[] {
		return this.state.chips.filter(
			(chip) => this.state.collectedData[chip.id] === undefined
		);
	}

	/**
	 * Bulk submit multiple values
	 */
	bulkSubmitValues(
		values: Record<string, string | number>,
		validate: boolean = true
	): {
		success: boolean;
		errors: string[];
		warnings: string[];
	} {
		const errors: string[] = [];
		const warnings: string[] = [];

		for (const [chipId, value] of Object.entries(values)) {
			const result = this.submitValue(chipId, value, validate);
			if (!result.success && result.error) {
				errors.push(result.error);
			}
			if (result.warning) {
				warnings.push(result.warning);
			}
		}

		return {
			success: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Get data summary for analytics
	 */
	getDataSummary(): {
		totalChips: number;
		completedChips: number;
		requiredChips: number;
		completedRequiredChips: number;
		completionRate: number;
		priorityBreakdown: Record<string, { total: number; completed: number }>;
		inputTypeBreakdown: Record<string, { total: number; completed: number }>;
	} {
		const totalChips = this.state.chips.length;
		const completedChips = Object.keys(this.state.collectedData).length;
		const requiredChips = this.state.chips.filter((c) => c.required).length;
		const completedRequiredChips = this.state.chips.filter(
			(c) => c.required && this.state.collectedData[c.id] !== undefined
		).length;

		const priorityBreakdown: Record<
			string,
			{ total: number; completed: number }
		> = {
			high: { total: 0, completed: 0 },
			medium: { total: 0, completed: 0 },
			low: { total: 0, completed: 0 },
		};

		const inputTypeBreakdown: Record<
			string,
			{ total: number; completed: number }
		> = {
			text: { total: 0, completed: 0 },
			number: { total: 0, completed: 0 },
			date: { total: 0, completed: 0 },
			select: { total: 0, completed: 0 },
		};

		for (const chip of this.state.chips) {
			const isCompleted = this.state.collectedData[chip.id] !== undefined;

			priorityBreakdown[chip.priority].total++;
			if (isCompleted) {
				priorityBreakdown[chip.priority].completed++;
			}

			inputTypeBreakdown[chip.inputType].total++;
			if (isCompleted) {
				inputTypeBreakdown[chip.inputType].completed++;
			}
		}

		return {
			totalChips,
			completedChips,
			requiredChips,
			completedRequiredChips,
			completionRate: this.state.completionRate,
			priorityBreakdown,
			inputTypeBreakdown,
		};
	}
}

// Singleton instance
export const missingInfoService = new MissingInfoService();
