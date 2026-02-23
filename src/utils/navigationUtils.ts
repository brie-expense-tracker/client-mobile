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

/** MVP: Transaction modal removed - navigates to transaction screen */
export const showTransactionModal = () =>
	router.push('/(tabs)/transaction');

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
