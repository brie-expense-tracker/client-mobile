import React, { createContext, useContext, useState, useEffect } from 'react';
import { OnboardingService } from '../services/onboardingService';
import useAuth from './AuthContext'; // Import useAuth

interface OnboardingContextType {
	hasSeenOnboarding: boolean | null;
	markOnboardingComplete: () => Promise<void>;
	refreshOnboardingStatus: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
	undefined
);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(
		null
	);
	const { user, loading: authLoading } = useAuth(); // Get user and loading

	const refreshOnboardingStatus = async () => {
		if (!user) {
			setHasSeenOnboarding(null);
			return;
		}
		try {
			const onboardingSeen = await OnboardingService.hasSeenOnboarding();
			setHasSeenOnboarding(onboardingSeen);
		} catch (error) {
			console.error('Error checking onboarding status:', error);
			setHasSeenOnboarding(false);
		}
	};

	useEffect(() => {
		if (!user || authLoading) {
			setHasSeenOnboarding(null);
			return;
		}
		refreshOnboardingStatus();
	}, [user, authLoading]);

	const markOnboardingComplete = async () => {
		try {
			await OnboardingService.markOnboardingComplete();
			setHasSeenOnboarding(true);
		} catch (error) {
			console.error('Error marking onboarding complete:', error);
			throw error;
		}
	};

	return (
		<OnboardingContext.Provider
			value={{
				hasSeenOnboarding,
				markOnboardingComplete,
				refreshOnboardingStatus,
			}}
		>
			{children}
		</OnboardingContext.Provider>
	);
};

export const useOnboarding = () => {
	const context = useContext(OnboardingContext);
	if (context === undefined) {
		throw new Error('useOnboarding must be used within an OnboardingProvider');
	}
	return context;
};
