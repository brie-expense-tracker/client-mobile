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
