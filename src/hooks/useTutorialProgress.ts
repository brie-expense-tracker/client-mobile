import React, {
	useState,
	useCallback,
	useMemo,
	useEffect,
	useContext,
} from 'react';
import { useProgression } from '../context/progressionContext';
import { useProfile } from '../context/profileContext';
import { useBudget } from '../context/budgetContext';
import { useGoal } from '../context/goalContext';
import { TransactionContext } from '../context/transactionContext';
import { ProgressionService } from '../services/progressionService';

export interface TutorialStep {
	id: string;
	title: string;
	description: string;
	icon: string;
	action: () => void;
}

export interface TutorialProgress {
	completed: boolean;
	steps: Record<string, boolean>;
	totalCompleted: number;
}

export interface CompletionStats {
	total: number;
	completed: number;
	pending: number;
	percentage: number;
}

export const useTutorialProgress = () => {
	const [tutorialProgress, setTutorialProgress] =
		useState<TutorialProgress | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	// Use existing contexts
	const {
		checkProgression,
		progression,
		isInTutorialStage,
		loading: progressionLoading,
	} = useProgression();
	const { refreshProfile, profile, loading: profileLoading } = useProfile();
	const { budgets, refetch: refetchBudgets } = useBudget();
	const { goals, refetch: refetchGoals } = useGoal();
	const { transactions, refetch: refetchTransactions } =
		useContext(TransactionContext);

	// Get progression data from either progression context or profile
	const effectiveProgression = progression || profile?.progression || null;

	const tutorialSteps: TutorialStep[] = useMemo(
		() => [
			{
				id: 'firstSmartAction',
				title: 'Add Your First Transaction',
				description:
					'Start by adding a transaction to track your spending or income',
				icon: 'card-outline',
				action: () => {}, // Will be set by component
			},
			{
				id: 'secondSmartAction',
				title: 'Create Your First Budget',
				description: 'Create a budget for your biggest expense category',
				icon: 'wallet-outline',
				action: () => {}, // Will be set by component
			},
			{
				id: 'thirdSmartAction',
				title: 'Set Your First Financial Goal',
				description:
					'Create a savings goal to start building your financial future',
				icon: 'flag-outline',
				action: () => {}, // Will be set by component
			},
			{
				id: 'fourthSmartAction',
				title: 'Enable Weekly Updates',
				description: 'Enable weekly financial insights and recommendations',
				icon: 'bulb-outline',
				action: () => {}, // Will be set by component
			},
		],
		[]
	);

	const updateTutorialProgressFromProgression = useCallback(() => {
		if (!effectiveProgression) return;

		const progressionSteps = effectiveProgression.tutorialSteps || {};
		const totalCompleted =
			Object.values(progressionSteps).filter(Boolean).length;
		const completed = effectiveProgression.tutorialCompleted || false;

		setTutorialProgress({
			completed,
			steps: progressionSteps,
			totalCompleted,
		});
	}, [effectiveProgression]);

	const getStepStatus = useCallback(
		(stepId: string): 'completed' | 'pending' => {
			// Always prioritize progression data from server
			if (tutorialProgress?.steps && tutorialProgress.steps[stepId]) {
				return 'completed';
			}

			// Only use context-based checking if we don't have progression data
			if (!tutorialProgress?.steps && profile) {
				switch (stepId) {
					case 'firstSmartAction':
						return transactions.length > 0 ? 'completed' : 'pending';

					case 'secondSmartAction':
						return budgets.length > 0 ? 'completed' : 'pending';

					case 'thirdSmartAction':
						return goals.length > 0 ? 'completed' : 'pending';

					case 'fourthSmartAction':
						return profile.preferences?.aiInsights?.enabled
							? 'completed'
							: 'pending';

					default:
						return 'pending';
				}
			}

			return 'pending';
		},
		[
			tutorialProgress?.steps,
			profile,
			transactions.length,
			budgets.length,
			goals.length,
		]
	);

	const getProgressPercentage = useCallback((): number => {
		const completedSteps = tutorialSteps.filter(
			(step) => getStepStatus(step.id) === 'completed'
		).length;

		const totalSteps = tutorialSteps.length;
		if (totalSteps === 0) return 0;

		return Math.round((completedSteps / totalSteps) * 100);
	}, [tutorialSteps, getStepStatus]);

	const getCompletionStats = useCallback((): CompletionStats => {
		const completedSteps = tutorialSteps.filter(
			(step) => getStepStatus(step.id) === 'completed'
		).length;

		return {
			total: tutorialSteps.length,
			completed: completedSteps,
			pending: tutorialSteps.length - completedSteps,
			percentage: getProgressPercentage(),
		};
	}, [tutorialSteps, getStepStatus, getProgressPercentage]);

	const refreshAllData = useCallback(async () => {
		try {
			setRefreshing(true);

			// Force progression check and update
			await checkProgression();

			// Refresh all context data in parallel
			await Promise.all([
				refreshProfile(),
				refetchGoals(),
				refetchBudgets(),
				refetchTransactions(),
			]);
		} catch (error) {
			console.error('Error refreshing all data:', error);
			throw error;
		} finally {
			setRefreshing(false);
		}
	}, [
		checkProgression,
		refreshProfile,
		refetchGoals,
		refetchBudgets,
		refetchTransactions,
	]);

	const hasCompletedActions = useCallback((): boolean => {
		if (!profile) return false;
		return tutorialSteps.some((step) => getStepStatus(step.id) === 'completed');
	}, [profile, tutorialSteps, getStepStatus]);

	const isTutorialCompleted = useCallback((): boolean => {
		return ProgressionService.isTutorialFullyCompleted(effectiveProgression);
	}, [effectiveProgression]);

	// Force progression check when there's a mismatch between context data and progression data
	const checkForDataMismatch = useCallback(() => {
		if (!profile || !effectiveProgression) return;

		// Check if there's a mismatch between context data and progression data
		const contextBasedSteps = {
			firstSmartAction: transactions.length > 0,
			secondSmartAction: budgets.length > 0,
			thirdSmartAction: goals.length > 0,
			fourthSmartAction: profile.preferences?.aiInsights?.enabled,
		};

		const progressionSteps = effectiveProgression.tutorialSteps || {};
		const hasMismatch = Object.keys(contextBasedSteps).some(
			(step) =>
				contextBasedSteps[step as keyof typeof contextBasedSteps] !==
				progressionSteps[step as keyof typeof contextBasedSteps]
		);

		if (hasMismatch) {
			console.log('🔍 Detected data mismatch, forcing progression check...');
			// Force a progression check to get fresh data
			checkProgression();
		}
	}, [
		profile,
		effectiveProgression,
		transactions.length,
		budgets.length,
		goals.length,
		checkProgression,
	]);

	// Update tutorial progress when progression changes
	useEffect(() => {
		if (effectiveProgression) {
			updateTutorialProgressFromProgression();
		}
	}, [effectiveProgression, updateTutorialProgressFromProgression]);

	// Check for data mismatch when context data changes
	useEffect(() => {
		checkForDataMismatch();
	}, [checkForDataMismatch]);

	// Set loading to false after initial data is loaded
	useEffect(() => {
		// Check if all required contexts have finished loading
		const contextsLoaded = !progressionLoading && !profileLoading;

		// Check if we have the required data (profile is required, progression can come from profile)
		const hasRequiredData = profile !== null;

		if (contextsLoaded && hasRequiredData) {
			console.log(
				'📱 Tutorial progress: Data loaded, setting loading to false'
			);
			setLoading(false);
		} else {
			console.log('📱 Tutorial progress: Still loading...', {
				progressionLoading,
				profileLoading,
				hasProfile: profile !== null,
				hasProgression: effectiveProgression !== null,
				effectiveProgressionSource: progression
					? 'context'
					: profile?.progression
					? 'profile'
					: 'none',
			});
		}
	}, [profile, effectiveProgression, progressionLoading, profileLoading]);

	return {
		// Data
		tutorialProgress,
		tutorialSteps,
		completionStats: getCompletionStats(),
		progressPercentage: getProgressPercentage(),

		// State
		loading,
		refreshing,
		isInTutorialStage,
		isTutorialCompleted: isTutorialCompleted(),
		hasCompletedActions: hasCompletedActions(),

		// Actions
		refreshAllData,
		getStepStatus,
		checkProgression,
	};
};
