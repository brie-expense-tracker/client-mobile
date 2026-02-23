import { router } from 'expo-router';

/**
 * Navigation utility functions for common app navigation patterns
 */

/** MVP: Wallet removed - these redirect to dashboard */
export const navigateToGoalsWithModal = () => router.push('/(tabs)/dashboard');
export const navigateToGoals = () => router.push('/(tabs)/dashboard');
export const navigateToBudgets = () => router.push('/(tabs)/dashboard');
export const navigateToBudgetsWithModal = () => router.push('/(tabs)/dashboard');

/**
 * Navigate to the transaction screen
 */
export const navigateToTransaction = () => {
	router.push('/(tabs)/transaction');
};

/**
 * Show the transaction modal (income vs expense choice)
 * This function should be used with the useTransactionModal hook
 */
export const showTransactionModal = () => {
	// This function is a placeholder - the actual implementation
	// should use the useTransactionModal hook in the component
	throw new Error(
		'showTransactionModal should be used with useTransactionModal hook'
	);
};

/**
 * Navigate to the dashboard screen
 */
export const navigateToDashboard = () => {
	router.push('/(tabs)/dashboard');
};

/** MVP: Reflections removed - redirect to dashboard */
export const navigateToInsights = () => router.push('/(tabs)/dashboard');

/**
 * Navigate to the settings screen
 */
export const navigateToSettings = () => {
	router.push('/(stack)/settings');
};
