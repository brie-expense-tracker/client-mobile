import { router } from 'expo-router';

/**
 * Navigation utility functions for common app navigation patterns
 */

/**
 * Navigate to the goals screen and automatically open the goal creation modal
 */
export const navigateToGoalsWithModal = () => {
	router.replace('/budgets/goals?openModal=true');
};

/**
 * Navigate to the goals screen without opening the modal
 */
export const navigateToGoals = () => {
	router.replace('/budgets/goals');
};

/**
 * Navigate to the budgets screen
 */
export const navigateToBudgets = () => {
	router.replace('/budgets');
};

/**
 * Navigate to the budgets screen and automatically open the budget creation modal
 */
export const navigateToBudgetsWithModal = () => {
	router.replace('/budgets?openModal=true');
};

/**
 * Navigate to the transaction screen
 */
export const navigateToTransaction = () => {
	router.replace('/transaction');
};

/**
 * Navigate to the dashboard screen
 */
export const navigateToDashboard = () => {
	router.replace('/dashboard');
};

/**
 * Navigate to the insights screen
 */
export const navigateToInsights = () => {
	router.replace('/insights');
};

/**
 * Navigate to the settings screen
 */
export const navigateToSettings = () => {
	router.replace('/settings');
};
