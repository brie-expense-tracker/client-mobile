import { ApiService } from './apiService';

// Current onboarding version - should match server config
const CURRENT_ONBOARDING_VERSION = 1;

export const OnboardingService = {
	/**
	 * Mark onboarding as completed
	 */
	markOnboardingComplete: async (): Promise<void> => {
		try {
			const response = await ApiService.post<{
				user: any;
				onboardingVersion: number;
			}>('/users/me/onboarding-complete', {});

			if (!response.success) {
				throw new Error(response.error || 'Failed to mark onboarding complete');
			}

			console.log(
				'Onboarding marked as complete, version:',
				response.data?.onboardingVersion
			);
		} catch (error) {
			console.error('Error marking onboarding complete:', error);
			throw error;
		}
	},

	/**
	 * Check if user has seen the current onboarding version
	 */
	hasSeenOnboarding: async (): Promise<boolean> => {
		try {
			const response = await ApiService.get<{
				user: { onboardingVersion: number };
			}>('/users/me');

			// Debug: Log the full response
			console.log(
				'OnboardingService - Full response:',
				JSON.stringify(response, null, 2)
			);

			if (!response.success || !response.data?.user) {
				console.error('Failed to fetch user data for onboarding check');
				console.error('Response success:', response.success);
				console.error('Response data:', response.data);
				return false;
			}

			const userOnboardingVersion = response.data.user.onboardingVersion;
			const hasSeenCurrentVersion =
				userOnboardingVersion >= CURRENT_ONBOARDING_VERSION;

			console.log('Onboarding check:', {
				userVersion: userOnboardingVersion,
				currentVersion: CURRENT_ONBOARDING_VERSION,
				hasSeen: hasSeenCurrentVersion,
			});

			return hasSeenCurrentVersion;
		} catch (error) {
			console.error('Error checking onboarding status:', error);
			return false;
		}
	},

	/**
	 * Get current onboarding version
	 */
	getCurrentOnboardingVersion: (): number => {
		return CURRENT_ONBOARDING_VERSION;
	},

	/**
	 * Reset onboarding status (useful for testing)
	 * Note: This would require a server endpoint to reset the version
	 */
	resetOnboardingStatus: async (): Promise<void> => {
		try {
			// This would need a server endpoint to reset onboarding version to 0
			console.warn(
				'Reset onboarding status not implemented - requires server endpoint'
			);
		} catch (error) {
			console.error('Error resetting onboarding status:', error);
			throw error;
		}
	},
};
