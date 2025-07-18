import { ApiService } from './apiService';

export interface ProgressionData {
	currentLevel: number;
	currentStage: 'tutorial' | 'level2' | 'dynamic' | 'smartPath' | 'realtime';
	xp: number;
	completedActions: number;
	tutorialCompleted: boolean;
	tutorialSteps: {
		firstSmartAction: boolean;
		secondSmartAction: boolean;
		thirdSmartAction: boolean;
		fourthSmartAction: boolean;
	};
	level2Unlocked: boolean;
	level2ActionsCompleted: number;
	dynamicProgressionUnlocked: boolean;
	smartPathUnlocked: boolean;
	realtimeReactivityUnlocked: boolean;
	lastProgressionCheck: string;
	achievements: {
		id: string;
		name: string;
		description: string;
		unlockedAt: string;
		category: 'tutorial' | 'level2' | 'dynamic' | 'smartPath' | 'realtime';
	}[];
	skillPaths: {
		budgeting: { progress: number; unlocked: boolean };
		savings: { progress: number; unlocked: boolean };
		spending: { progress: number; unlocked: boolean };
		goals: { progress: number; unlocked: boolean };
		investment: { progress: number; unlocked: boolean };
	};
	masteryLevels: {
		beginner: { unlocked: boolean; completed: boolean };
		intermediate: { unlocked: boolean; completed: boolean };
		advanced: { unlocked: boolean; completed: boolean };
		expert: { unlocked: boolean; completed: boolean };
		master: { unlocked: boolean; completed: boolean };
	};
}

export interface ProgressionStatus {
	success: boolean;
	progression?: ProgressionData;
	stageDetails?: {
		name: string;
		description: string;
		objectives: string[];
		rewards: string[];
	};
	nextStageRequirements?: {
		stage: string;
		requirements: string[];
		progress: number;
	};
	error?: string;
}

export class ProgressionService {
	/**
	 * Check if all tutorial steps are completed
	 */
	static isTutorialFullyCompleted(
		progression: ProgressionData | null
	): boolean {
		if (!progression) return false;

		// Check if tutorial is marked as completed
		if (progression.tutorialCompleted) return true;

		// Check if all 4 tutorial steps are completed
		const tutorialSteps = progression.tutorialSteps || {};
		const allStepsCompleted = Object.values(tutorialSteps).every(
			(step) => step === true
		);

		return allStepsCompleted;
	}

	/**
	 * Get the number of completed tutorial steps
	 */
	static getCompletedTutorialSteps(
		progression: ProgressionData | null
	): number {
		if (!progression) return 0;

		const tutorialSteps = progression.tutorialSteps || {};
		return Object.values(tutorialSteps).filter((step) => step === true).length;
	}

	/**
	 * Get progression status for the current user
	 */
	static async getProgressionStatus(): Promise<ProgressionStatus> {
		try {
			const response = await ApiService.get('/progression/status');
			return response;
		} catch (error) {
			console.error('Error getting progression status:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Check and update progression for the current user
	 */
	static async checkProgression(): Promise<{
		success: boolean;
		hasChanges?: boolean;
		progression?: ProgressionData;
		error?: string;
	}> {
		try {
			const response = await ApiService.post<{
				data?: {
					success: boolean;
					hasChanges?: boolean;
					progression?: ProgressionData;
				};
				success?: boolean;
				hasChanges?: boolean;
				progression?: ProgressionData;
			}>('/progression/check', {});

			// Handle nested response structure from server
			const nestedData = response.data?.data || response.data;

			return {
				success: response.success,
				hasChanges: nestedData?.hasChanges,
				progression: nestedData?.progression,
				error: response.error,
			};
		} catch (error) {
			console.error('Error checking progression:', error);
			return {
				success: false,
				hasChanges: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Award XP to the current user
	 */
	static async awardXP(
		amount: number,
		reason?: string
	): Promise<{
		success: boolean;
		xp?: number;
		error?: string;
	}> {
		try {
			const response = await ApiService.post('/progression/award-xp', {
				amount,
				reason,
			});
			return response;
		} catch (error) {
			console.error('Error awarding XP:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Mark Level 2 action as completed
	 */
	static async markLevel2ActionCompleted(): Promise<{
		success: boolean;
		error?: string;
	}> {
		try {
			const response = await ApiService.post(
				'/progression/mark-level2-completed',
				{}
			);
			return response;
		} catch (error) {
			console.error('Error marking Level 2 action completed:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Force progression update for the current user
	 */
	static async forceProgressionUpdate(): Promise<{
		success: boolean;
		hasChanges?: boolean;
		error?: string;
	}> {
		try {
			const response = await ApiService.post<{
				hasChanges?: boolean;
			}>('/progression/force-update', {});
			return {
				success: response.success,
				hasChanges: response.data?.hasChanges,
				error: response.error,
			};
		} catch (error) {
			console.error('Error forcing progression update:', error);
			return {
				success: false,
				hasChanges: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Get stage information for the current progression stage
	 */
	static getStageInfo(currentStage: string) {
		switch (currentStage) {
			case 'tutorial':
				return {
					title: 'Stage 1: Tutorial Zone',
					subtitle: 'Complete initial setup to unlock personalized insights',
					description:
						"You're in the tutorial zone! Complete the basic setup steps to unlock advanced AI features.",
					color: '#FF9800',
					icon: 'school-outline',
					nextStage: 'Level 2 - Smart Actions',
					requirements: [
						'Add your first transaction',
						'Create your first budget',
						'Set a savings goal',
						'Enable weekly updates',
					],
				};
			case 'level2':
				return {
					title: 'Stage 2: Smart Actions',
					subtitle: 'Personalized recommendations and smart actions',
					description:
						"Great job! You've unlocked personalized smart actions. Complete missions to earn XP and unlock advanced features.",
					color: '#4CAF50',
					icon: 'sparkles',
					nextStage: 'Dynamic Progression',
					requirements: [
						'Complete 2+ additional smart actions',
						'Follow AI-generated recommendations',
						'Improve your financial habits',
					],
				};
			case 'dynamic':
				return {
					title: 'Stage 3: Dynamic Progression',
					subtitle: 'Advanced AI insights and continuous optimization',
					description:
						"You've reached the advanced stage! Enjoy continuous optimization and advanced financial insights.",
					color: '#9C27B0',
					icon: 'rocket',
					nextStage: 'Smart Path Customization',
					requirements: [
						'Stay under budget consistently',
						'Save money regularly',
						'Improve weekly spending patterns',
						'Achieve financial goals faster',
					],
				};
			case 'smartPath':
				return {
					title: 'Stage 4: Smart Path Customization',
					subtitle: 'Gamified skill trees and mastery paths',
					description:
						'Master your financial skills through customizable skill paths and unlock advanced mastery levels.',
					color: '#E91E63',
					icon: 'trophy',
					nextStage: 'Real-time Reactivity',
					requirements: [
						'Master 3+ skill paths',
						'Unlock advanced achievements',
						'Complete skill tree objectives',
						'Reach intermediate mastery level',
					],
				};
			case 'realtime':
				return {
					title: 'Stage 5: Real-time Reactivity',
					subtitle: 'Ongoing monitoring and reactive prompts',
					description:
						"You've reached the pinnacle! Experience real-time financial monitoring and adaptive AI responses.",
					color: '#00BCD4',
					icon: 'flash',
					nextStage: null,
					requirements: [
						'Maintain consistent spending patterns',
						'Use predictive budget management',
						'Adapt goal progress dynamically',
						'Achieve expert mastery level',
					],
				};
			default:
				return {
					title: 'AI Coach Progression',
					subtitle: 'Your financial journey',
					description:
						"Welcome to AI Coach! Let's get started with your financial journey.",
					color: '#2196F3',
					icon: 'bulb-outline',
					nextStage: 'Tutorial Zone',
					requirements: [],
				};
		}
	}
}
