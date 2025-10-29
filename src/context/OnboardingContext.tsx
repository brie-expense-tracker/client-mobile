import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
} from 'react';
import { OnboardingService } from '../services';
import useAuth from './AuthContext'; // Import useAuth
import { createLogger } from '../utils/sublogger';

const onboardingContextLog = createLogger('OnboardingContext');

interface OnboardingContextType {
	hasSeenOnboarding: boolean | null;
	onboardingVersion: number | null;
	markOnboardingComplete: () => Promise<void>;
	refreshOnboardingStatus: () => Promise<void>;
	resetOnboardingStatus: () => Promise<void>;
	getCurrentOnboardingVersion: () => number;
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
	const [onboardingVersion, setOnboardingVersion] = useState<number | null>(
		null
	);
	const { user, loading: authLoading } = useAuth(); // Get user and loading

	const refreshOnboardingStatus = useCallback(async () => {
		if (!user) {
			setHasSeenOnboarding(null);
			setOnboardingVersion(null);
			return;
		}
		try {
			onboardingContextLog.debug('Refreshing onboarding status');
			const onboardingSeen = await OnboardingService.hasSeenOnboarding();
			const currentVersion = OnboardingService.getCurrentOnboardingVersion();
			onboardingContextLog.debug('Onboarding status result', {
				onboardingSeen,
				currentVersion,
			});
			setHasSeenOnboarding(onboardingSeen);
			setOnboardingVersion(currentVersion);
		} catch (error) {
			onboardingContextLog.error('Error checking onboarding status', error);
			// Set to true as fallback to prevent infinite loading
			setHasSeenOnboarding(true);
			setOnboardingVersion(OnboardingService.getCurrentOnboardingVersion());
		}
	}, [user]);

	useEffect(() => {
		if (!user || authLoading) {
			setHasSeenOnboarding(null);
			setOnboardingVersion(null);
			return;
		}
		refreshOnboardingStatus();
	}, [user, authLoading, refreshOnboardingStatus]);

	const markOnboardingComplete = useCallback(async () => {
		try {
			await OnboardingService.markOnboardingComplete();
			setHasSeenOnboarding(true);
			const currentVersion = OnboardingService.getCurrentOnboardingVersion();
			setOnboardingVersion(currentVersion);
		} catch (error) {
			onboardingContextLog.error('Error marking onboarding complete', error);
			throw error;
		}
	}, []);

	const resetOnboardingStatus = useCallback(async () => {
		try {
			await OnboardingService.resetOnboardingStatus();
			setHasSeenOnboarding(false);
			setOnboardingVersion(0);
		} catch (error) {
			onboardingContextLog.error('Error resetting onboarding status', error);
			throw error;
		}
	}, []);

	const getCurrentOnboardingVersion = useCallback(() => {
		return OnboardingService.getCurrentOnboardingVersion();
	}, []);

	return (
		<OnboardingContext.Provider
			value={{
				hasSeenOnboarding,
				onboardingVersion,
				markOnboardingComplete,
				refreshOnboardingStatus,
				resetOnboardingStatus,
				getCurrentOnboardingVersion,
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
