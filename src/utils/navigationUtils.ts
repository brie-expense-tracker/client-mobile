import { router } from 'expo-router';

/**
 * Navigation utility functions for common app navigation patterns
 */

/**
 * Navigate to the goals screen and automatically open the goal creation modal
 */
export const navigateToGoalsWithModal = () => {
	router.replace('/(tabs)/budgets/goals?openModal=true&tab=goals');
};

/**
 * Navigate to the goals screen without opening the modal
 */
export const navigateToGoals = () => {
	router.replace('/(tabs)/budgets/goals');
};

/**
 * Navigate to the budgets screen
 */
export const navigateToBudgets = () => {
	router.replace('/(tabs)/budgets');
};

/**
 * Navigate to the budgets screen and automatically open the budget creation modal
 */
export const navigateToBudgetsWithModal = () => {
	router.replace('/(tabs)/budgets?openModal=true');
};

/**
 * Navigate to the transaction screen
 */
export const navigateToTransaction = () => {
	router.replace('/(tabs)/transaction');
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
	router.replace('/(tabs)/dashboard');
};

/**
 * Navigate to the insights screen
 */
export const navigateToInsights = () => {
	router.replace('/(tabs)/insights');
};

/**
 * Navigate to the settings screen
 */
export const navigateToSettings = () => {
	router.replace('/(tabs)/settings');
};
