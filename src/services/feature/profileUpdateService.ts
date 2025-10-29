import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../../utils/logger';


interface ProfileUpdate {
	action: string;
	timestamp: string;
	profileSnapshot: {
		income?: number;
		savings?: number;
		debt?: number;
		expenses?: any;
	};
	changes: {
		field: string;
		oldValue: any;
		newValue: any;
	}[];
}

interface AIProfileContext {
	lastAction: string;
	actionTaken: boolean;
	timestamp: string;
	profileSnapshot: {
		income?: number;
		savings?: number;
		debt?: number;
		expenses?: any;
	};
	recentUpdates: ProfileUpdate[];
}

class ProfileUpdateService {
	private static instance: ProfileUpdateService;
	private updateCallbacks: ((context: AIProfileContext) => void)[] = [];

	private constructor() {}

	public static getInstance(): ProfileUpdateService {
		if (!ProfileUpdateService.instance) {
			ProfileUpdateService.instance = new ProfileUpdateService();
		}
		return ProfileUpdateService.instance;
	}

	/**
	 * Record a profile update and notify AI assistant
	 */
	public async recordProfileUpdate(
		action: string,
		changes: { field: string; oldValue: any; newValue: any }[],
		profileSnapshot: any
	): Promise<void> {
		try {
			const update: ProfileUpdate = {
				action,
				timestamp: new Date().toISOString(),
				profileSnapshot,
				changes,
			};

			// Get existing context
			const existingContext = await this.getAIProfileContext();

			// Update context with new information
			const updatedContext: AIProfileContext = {
				lastAction: action,
				actionTaken: true,
				timestamp: new Date().toISOString(),
				profileSnapshot,
				recentUpdates: [
					update,
					...(existingContext?.recentUpdates || []),
				].slice(0, 10), // Keep only last 10 updates
			};

			// Store updated context
			await AsyncStorage.setItem(
				'aiProfileContext',
				JSON.stringify(updatedContext)
			);

			// Store last profile update timestamp
			await AsyncStorage.setItem('lastProfileUpdate', new Date().toISOString());

			// Notify all registered callbacks
			this.updateCallbacks.forEach((callback) => {
				try {
					callback(updatedContext);
				} catch (error) {
					logger.error('Error in profile update callback:', error);
				}
			});

			logger.debug('Profile update recorded:', update);
		} catch (error) {
			logger.error('Error recording profile update:', error);
		}
	}

	/**
	 * Get the current AI profile context
	 */
	public async getAIProfileContext(): Promise<AIProfileContext | null> {
		try {
			const contextData = await AsyncStorage.getItem('aiProfileContext');
			return contextData ? JSON.parse(contextData) : null;
		} catch (error) {
			logger.error('Error getting AI profile context:', error);
			return null;
		}
	}

	/**
	 * Clear the AI profile context
	 */
	public async clearAIProfileContext(): Promise<void> {
		try {
			await AsyncStorage.removeItem('aiProfileContext');
			await AsyncStorage.removeItem('lastProfileUpdate');

			// Notify callbacks that context was cleared
			this.updateCallbacks.forEach((callback) => {
				try {
					callback({
						lastAction: '',
						actionTaken: false,
						timestamp: new Date().toISOString(),
						profileSnapshot: {},
						recentUpdates: [],
					});
				} catch (error) {
					logger.error('Error in profile update callback:', error);
				}
			});
		} catch (error) {
			logger.error('Error clearing AI profile context:', error);
		}
	}

	/**
	 * Register a callback to be notified of profile updates
	 */
	public onProfileUpdate(
		callback: (context: AIProfileContext) => void
	): () => void {
		this.updateCallbacks.push(callback);

		// Return unsubscribe function
		return () => {
			const index = this.updateCallbacks.indexOf(callback);
			if (index > -1) {
				this.updateCallbacks.splice(index, 1);
			}
		};
	}

	/**
	 * Get insights based on recent profile changes
	 */
	public getProfileInsights(context: AIProfileContext): string[] {
		const insights: string[] = [];

		if (!context.recentUpdates.length) {
			return insights;
		}

		const latestUpdate = context.recentUpdates[0];
		const changes = latestUpdate.changes;

		// Analyze income changes
		const incomeChange = changes.find((c) => c.field === 'monthlyIncome');
		if (incomeChange) {
			const increase =
				(incomeChange.newValue || 0) > (incomeChange.oldValue || 0);
			if (increase) {
				insights.push(
					'Your income has increased! This is a great opportunity to boost your savings or pay down debt faster.'
				);
			} else {
				insights.push(
					"Your income has decreased. Let's review your budget to ensure you can maintain your financial goals."
				);
			}
		}

		// Analyze savings changes
		const savingsChange = changes.find((c) => c.field === 'savings');
		if (savingsChange) {
			const increase =
				(savingsChange.newValue || 0) > (savingsChange.oldValue || 0);
			if (increase) {
				insights.push(
					'Great job increasing your savings! Consider setting a new savings goal or exploring investment options.'
				);
			} else {
				insights.push(
					"Your savings have decreased. This might be due to an emergency or planned expense. Let's review your budget."
				);
			}
		}

		// Analyze debt changes
		const debtChange = changes.find((c) => c.field === 'debt');
		if (debtChange) {
			const decrease = (debtChange.newValue || 0) < (debtChange.oldValue || 0);
			if (decrease) {
				insights.push(
					"Excellent! You've reduced your debt. Keep up the momentum with a structured debt payoff plan."
				);
			} else {
				insights.push(
					"Your debt has increased. Let's create a plan to manage this effectively and avoid high-interest charges."
				);
			}
		}

		// Analyze expense changes
		const expenseChanges = changes.filter((c) =>
			c.field.startsWith('expenses.')
		);
		if (expenseChanges.length > 0) {
			const totalOldExpenses = expenseChanges.reduce(
				(sum, c) => sum + (c.oldValue || 0),
				0
			);
			const totalNewExpenses = expenseChanges.reduce(
				(sum, c) => sum + (c.newValue || 0),
				0
			);

			if (totalNewExpenses < totalOldExpenses) {
				insights.push(
					"You've reduced your expenses! This will help you save more and reach your financial goals faster."
				);
			} else if (totalNewExpenses > totalOldExpenses) {
				insights.push(
					"Your expenses have increased. Let's review your budget to ensure this aligns with your financial goals."
				);
			}
		}

		return insights;
	}

	/**
	 * Get suggested actions based on profile changes
	 */
	public getSuggestedActions(
		context: AIProfileContext
	): { action: string; label: string; priority: 'low' | 'medium' | 'high' }[] {
		const suggestions: {
			action: string;
			label: string;
			priority: 'low' | 'medium' | 'high';
		}[] = [];

		if (!context.recentUpdates.length) {
			return suggestions;
		}

		const latestUpdate = context.recentUpdates[0];
		const changes = latestUpdate.changes;

		// Income-related suggestions
		const incomeChange = changes.find((c) => c.field === 'monthlyIncome');
		if (
			incomeChange &&
			(incomeChange.newValue || 0) > (incomeChange.oldValue || 0)
		) {
			suggestions.push({
				action: 'review_budget',
				label: 'Review Budget Allocation',
				priority: 'medium',
			});
			suggestions.push({
				action: 'increase_savings',
				label: 'Increase Savings Goals',
				priority: 'high',
			});
		}

		// Savings-related suggestions
		const savingsChange = changes.find((c) => c.field === 'savings');
		if (
			savingsChange &&
			(savingsChange.newValue || 0) > (savingsChange.oldValue || 0)
		) {
			suggestions.push({
				action: 'set_new_goal',
				label: 'Set New Financial Goal',
				priority: 'medium',
			});
		}

		// Debt-related suggestions
		const debtChange = changes.find((c) => c.field === 'debt');
		if (debtChange && (debtChange.newValue || 0) < (debtChange.oldValue || 0)) {
			suggestions.push({
				action: 'accelerate_debt_payoff',
				label: 'Accelerate Debt Payoff',
				priority: 'high',
			});
		}

		return suggestions;
	}
}

export default ProfileUpdateService;
