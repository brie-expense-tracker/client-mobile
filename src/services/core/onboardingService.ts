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
			}>('/api/users/me/onboarding-complete', {});

			if (!response.success) {
				throw new Error(response.error || 'Failed to mark onboarding complete');
			}

			console.log(
				`✅ Onboarding complete (v${response.data?.onboardingVersion})`
			);
		} catch (error) {
			console.error('❌ Error marking onboarding complete:', error);
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
			}>('/api/users/me');

				success: response.success,
				hasData: !!response.data,
				hasUser: !!response.data?.user,
				onboardingVersion: response.data?.user?.onboardingVersion,
				error: response.error,
			});

			if (!response.success || !response.data?.user) {
				console.error('❌ Failed to fetch user data for onboarding check:', {
					success: response.success,
					error: response.error,
					hasData: !!response.data,
					hasUser: !!response.data?.user,
				});
				// Return true as fallback to prevent infinite loading
				// This assumes the user has completed onboarding if we can't determine status
				return true;
			}

			const userOnboardingVersion = response.data.user.onboardingVersion;
			const hasSeenCurrentVersion =
				userOnboardingVersion >= CURRENT_ONBOARDING_VERSION;

			console.log(
				`👤 Onboarding: v${userOnboardingVersion}/${CURRENT_ONBOARDING_VERSION} (${
					hasSeenCurrentVersion ? 'Seen' : 'New'
				})`
			);

			return hasSeenCurrentVersion;
		} catch (error) {
			console.error('❌ Error checking onboarding status:', error);
			// Return true as fallback to prevent infinite loading
			// This assumes the user has completed onboarding if we can't determine status
			return true;
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
