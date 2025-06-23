import AsyncStorage from '@react-native-async-storage/async-storage';

export const OnboardingService = {
	/**
	 * Mark onboarding as completed
	 */
	markOnboardingComplete: async (): Promise<void> => {
		try {
			await AsyncStorage.setItem('hasSeenOnboarding', 'true');
		} catch (error) {
			console.error('Error saving onboarding status:', error);
			throw error;
		}
	},

	/**
	 * Check if user has seen onboarding
	 */
	hasSeenOnboarding: async (): Promise<boolean> => {
		try {
			const onboardingSeen = await AsyncStorage.getItem('hasSeenOnboarding');
			return onboardingSeen === 'true';
		} catch (error) {
			console.error('Error checking onboarding status:', error);
			return false;
		}
	},

	/**
	 * Reset onboarding status (useful for testing or logout)
	 */
	resetOnboardingStatus: async (): Promise<void> => {
		try {
			await AsyncStorage.removeItem('hasSeenOnboarding');
		} catch (error) {
			console.error('Error resetting onboarding status:', error);
			throw error;
		}
	},
};
