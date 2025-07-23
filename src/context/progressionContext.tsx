import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useRef,
} from 'react';
import {
	ProgressionService,
	ProgressionStatus,
	ProgressionData,
} from '../services/progressionService';
import useAuth from './AuthContext';

interface ProgressionContextType {
	progressionStatus: ProgressionStatus | null;
	progression: ProgressionData | null;
	currentStage: string;
	xp: number;
	completedActions: number;
	loading: boolean;
	refreshProgression: () => Promise<void>;
	checkProgression: () => Promise<void>;
	awardXP: (amount: number, reason?: string) => Promise<void>;
	markLevel2ActionCompleted: () => Promise<void>;
	forceProgressionUpdate: () => Promise<void>;
	isInTutorialStage: boolean;
	isInLevel2Stage: boolean;
	isInLevel3Stage: boolean;
	isInLevel4Stage: boolean;
	isInLevel5Stage: boolean;
	getStageInfo: (stage: string) => any;
}

const ProgressionContext = createContext<ProgressionContextType | undefined>(
	undefined
);

export const ProgressionProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [progressionStatus, setProgressionStatus] =
		useState<ProgressionStatus | null>(null);
	const [loading, setLoading] = useState(true);
	const { user, loading: authLoading } = useAuth();
	const checkProgressionTimeoutRef = useRef<number | null>(null);

	const refreshProgression = async () => {
		if (!user) {
			setProgressionStatus(null);
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			const status = await ProgressionService.getProgressionStatus();
			setProgressionStatus(status);
		} catch (error) {
			console.error('Error refreshing progression:', error);
		} finally {
			setLoading(false);
		}
	};

	const checkProgression = async () => {
		if (!user) return;

		// Clear any existing timeout to prevent multiple calls
		if (checkProgressionTimeoutRef.current) {
			clearTimeout(checkProgressionTimeoutRef.current);
		}

		// Debounce the check to prevent rapid successive calls
		checkProgressionTimeoutRef.current = setTimeout(async () => {
			try {
				const result = await ProgressionService.checkProgression();

				// Get progression data directly from result
				const progressionData = result.progression;

				if (result.success && progressionData) {
					// Always refresh to get the latest progression data, regardless of changes
					// This ensures the client always has the most up-to-date progression state
					await refreshProgression();
				}
			} catch (error) {
				console.error('Error checking progression:', error);
			}
		}, 1000); // 1 second debounce
	};

	const awardXP = async (amount: number, reason?: string) => {
		if (!user) return;

		try {
			const result = await ProgressionService.awardXP(amount, reason);
			if (result.success) {
				// Refresh progression to get updated XP
				await refreshProgression();
			}
		} catch (error) {
			console.error('Error awarding XP:', error);
		}
	};

	const markLevel2ActionCompleted = async () => {
		if (!user) return;

		try {
			const result = await ProgressionService.markLevel2ActionCompleted();
			if (result.success) {
				// Refresh progression to get updated status
				await refreshProgression();
			}
		} catch (error) {
			console.error('Error marking Level 2 action completed:', error);
		}
	};

	const forceProgressionUpdate = async () => {
		if (!user) return;

		try {
			setLoading(true);
			const result = await ProgressionService.forceProgressionUpdate();
			if (result.success) {
				await refreshProgression();
				if (result.hasChanges) {
					console.log('Progression force updated successfully');
				}
			} else {
				console.error('Failed to force progression update:', result.error);
			}
		} catch (error) {
			console.error('Error forcing progression update:', error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (!user || authLoading) {
			setProgressionStatus(null);
			setLoading(true);
			return;
		}
		refreshProgression();
	}, [user, authLoading]);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (checkProgressionTimeoutRef.current) {
				clearTimeout(checkProgressionTimeoutRef.current);
			}
		};
	}, []);

	// Helper function to map server stage names to client format
	const mapStageName = (stage: string): string => {
		switch (stage.toLowerCase()) {
			case 'beginner':
			case 'tutorial':
				return 'Tutorial';
			case 'apprentice':
				return 'Apprentice';
			case 'practitioner':
				return 'Practitioner';
			case 'expert':
				return 'Expert';
			case 'master':
				return 'Master';
			default:
				return 'Tutorial';
		}
	};

	// Computed values
	const progression = progressionStatus?.progression || null;
	const rawCurrentStage = progression?.currentStage || 'Tutorial';
	const currentStage = mapStageName(rawCurrentStage);
	const xp = progression?.xp || 0;
	const completedActions = progression?.completedActions || 0;
	const isInTutorialStage = currentStage === 'Tutorial';
	const isInLevel2Stage = currentStage === 'Apprentice';
	const isInLevel3Stage = currentStage === 'Practitioner';
	const isInLevel4Stage = currentStage === 'Expert';
	const isInLevel5Stage = currentStage === 'Master';

	// Helper function to get stage information
	const getStageInfo = (stage: string) => {
		return ProgressionService.getStageInfo(stage);
	};

	return (
		<ProgressionContext.Provider
			value={{
				progressionStatus,
				progression,
				currentStage,
				xp,
				completedActions,
				loading,
				refreshProgression,
				checkProgression,
				awardXP,
				markLevel2ActionCompleted,
				forceProgressionUpdate,
				isInTutorialStage,
				isInLevel2Stage,
				isInLevel3Stage,
				isInLevel4Stage,
				isInLevel5Stage,
				getStageInfo,
			}}
		>
			{children}
		</ProgressionContext.Provider>
	);
};

export const useProgression = () => {
	const context = useContext(ProgressionContext);
	if (context === undefined) {
		throw new Error('useProgression must be used within a ProgressionProvider');
	}
	return context;
};
