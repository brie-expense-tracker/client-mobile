import React, { createContext, useContext, useState, useEffect } from 'react';
import { OnboardingService } from '../services/onboardingService';

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

	const refreshOnboardingStatus = async () => {
		try {
			const onboardingSeen = await OnboardingService.hasSeenOnboarding();
			setHasSeenOnboarding(onboardingSeen);
		} catch (error) {
			console.error('Error checking onboarding status:', error);
			setHasSeenOnboarding(false);
		}
	};

	const markOnboardingComplete = async () => {
		try {
			await OnboardingService.markOnboardingComplete();
			setHasSeenOnboarding(true);
		} catch (error) {
			console.error('Error marking onboarding complete:', error);
			throw error;
		}
	};

	useEffect(() => {
		refreshOnboardingStatus();
	}, []);

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
