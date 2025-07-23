import React, {
	useState,
	useCallback,
	useMemo,
	useEffect,
	useContext,
	useRef,
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
	const lastMismatchCheckRef = useRef<string>('');
	const isUpdatingRef = useRef(false);
	const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

	// Always prioritize progression data from the progression context over profile
	const effectiveProgression = progression || profile?.progression || null;

	const tutorialSteps: TutorialStep[] = useMemo(
		() => [
			{
				id: 'firstTutorialAction',
				title: 'Add Your First Transaction',
				description:
					'Start by adding a transaction to track your spending or income',
				icon: 'card-outline',
				action: () => {}, // Will be set by component
			},
			{
				id: 'secondTutorialAction',
				title: 'Create Your First Budget',
				description: 'Create a budget for your biggest expense category',
				icon: 'wallet-outline',
				action: () => {}, // Will be set by component
			},
			{
				id: 'thirdTutorialAction',
				title: 'Set Your First Financial Goal',
				description:
					'Create a savings goal to start building your financial future',
				icon: 'flag-outline',
				action: () => {}, // Will be set by component
			},
			{
				id: 'fourthTutorialAction',
				title: 'Enable Automatic Updates',
				description:
					'Choose your preferred frequency for automatic financial insights and recommendations',
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
			// Map tutorial step IDs to server progression step IDs
			const stepIdMapping: Record<string, string> = {
				firstTutorialAction: 'firstSmartAction',
				secondTutorialAction: 'secondSmartAction',
				thirdTutorialAction: 'thirdSmartAction',
				fourthTutorialAction: 'fourthSmartAction',
			};

			const serverStepId = stepIdMapping[stepId];

			// Always prioritize progression data from server
			if (
				tutorialProgress?.steps &&
				serverStepId &&
				tutorialProgress.steps[serverStepId]
			) {
				return 'completed';
			}

			// Only use context-based checking if we don't have progression data
			if (!tutorialProgress?.steps && profile) {
				switch (stepId) {
					case 'firstTutorialAction':
						return transactions.length > 0 ? 'completed' : 'pending';

					case 'secondTutorialAction':
						return budgets.length > 0 ? 'completed' : 'pending';

					case 'thirdTutorialAction':
						return goals.length > 0 ? 'completed' : 'pending';

					case 'fourthTutorialAction':
						// Check if AI insights are enabled and any frequency is set
						const aiInsights = profile.preferences?.aiInsights;
						return aiInsights?.enabled && aiInsights?.frequency
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

	const hasCompletedActions = useCallback((): boolean => {
		if (!profile) return false;
		return tutorialSteps.some((step) => getStepStatus(step.id) === 'completed');
	}, [profile, tutorialSteps, getStepStatus]);

	const isTutorialCompleted = useCallback((): boolean => {
		const completed =
			ProgressionService.isTutorialFullyCompleted(effectiveProgression);
		return completed;
	}, [effectiveProgression]);

	// Update tutorial progress when progression changes
	useEffect(() => {
		if (effectiveProgression) {
			console.log(
				'📱 TutorialProgress: Updating from effectiveProgression:',
				effectiveProgression
			);
			updateTutorialProgressFromProgression();
		}
	}, [effectiveProgression, updateTutorialProgressFromProgression]);

	// Check for data mismatch when context data changes - but only when we have both profile and progression data
	useEffect(() => {
		if (!profile || !effectiveProgression || isUpdatingRef.current) return;

		// Clear any existing debounce timeout
		if (debounceTimeoutRef.current) {
			clearTimeout(debounceTimeoutRef.current);
		}

		// Debounce the mismatch check to prevent rapid successive calls
		debounceTimeoutRef.current = setTimeout(() => {
			// Create a hash of the current data state to check if it's changed
			const currentDataHash = JSON.stringify({
				transactionsLength: transactions.length,
				budgetsLength: budgets.length,
				goalsLength: goals.length,
				aiInsightsEnabled: profile.preferences?.aiInsights?.enabled,
				aiInsightsFrequency: profile.preferences?.aiInsights?.frequency,
				progressionSteps: effectiveProgression.tutorialSteps,
			});

			// Only check for mismatch if the data has actually changed
			if (currentDataHash === lastMismatchCheckRef.current) return;
			lastMismatchCheckRef.current = currentDataHash;

			// Check if there's a mismatch between context data and progression data
			const contextBasedSteps = {
				firstSmartAction: transactions.length > 0,
				secondSmartAction: budgets.length > 0,
				thirdSmartAction: goals.length > 0,
				fourthSmartAction:
					profile.preferences?.aiInsights?.enabled &&
					profile.preferences?.aiInsights?.frequency,
			};

			const progressionSteps = effectiveProgression.tutorialSteps || {};
			const hasMismatch = Object.keys(contextBasedSteps).some(
				(step) =>
					contextBasedSteps[step as keyof typeof contextBasedSteps] !==
					progressionSteps[step as keyof typeof contextBasedSteps]
			);

			// Only trigger progression check if there's a significant mismatch
			// and we haven't checked recently (prevent infinite loops)
			if (hasMismatch && !isUpdatingRef.current) {
				console.log('🔍 Detected data mismatch, forcing progression check...');
				// Set updating flag to prevent recursive calls
				isUpdatingRef.current = true;
				// Force a progression check to get fresh data
				checkProgression().finally(() => {
					// Reset updating flag after a delay to allow for state updates
					setTimeout(() => {
						isUpdatingRef.current = false;
					}, 2000); // Increased delay to prevent rapid successive calls
				});
			}
		}, 1000); // Increased debounce to 1 second

		// Cleanup timeout on unmount or dependency change
		return () => {
			if (debounceTimeoutRef.current) {
				clearTimeout(debounceTimeoutRef.current);
			}
		};
	}, [
		profile,
		effectiveProgression,
		transactions.length,
		budgets.length,
		goals.length,
		profile?.preferences?.aiInsights?.frequency,
	]);

	// Set loading to false after initial data is loaded
	useEffect(() => {
		// Check if all required contexts have finished loading
		const contextsLoaded = !progressionLoading && !profileLoading;

		// Check if we have the required data (profile is required, progression can come from profile)
		const hasRequiredData = profile !== null;

		console.log('📱 Tutorial progress: Loading check:', {
			contextsLoaded,
			hasRequiredData,
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

	// Debug logging for the current state
	useEffect(() => {
		console.log('📱 TutorialProgress: Current state:', {
			effectiveProgression,
			tutorialProgress,
			completionStats: getCompletionStats(),
			isTutorialCompleted: isTutorialCompleted(),
			stepStatuses: tutorialSteps.map((step) => ({
				id: step.id,
				status: getStepStatus(step.id),
			})),
		});
	}, [
		effectiveProgression,
		tutorialProgress,
		getCompletionStats,
		isTutorialCompleted,
		tutorialSteps,
		getStepStatus,
	]);

	// Cleanup timeouts on unmount
	useEffect(() => {
		return () => {
			if (debounceTimeoutRef.current) {
				clearTimeout(debounceTimeoutRef.current);
			}
		};
	}, []);

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
		getStepStatus,
		checkProgression,
	};
};
