import { ApiService } from './apiService';

export interface ProgressionData {
	currentLevel: number;
	currentStage:
		| 'Tutorial'
		| 'Apprentice'
		| 'Practitioner'
		| 'Expert'
		| 'Master';
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
		category: 'Tutorial' | 'Apprentice' | 'Practitioner' | 'Expert' | 'Master';
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

			// Handle nested response structure from server
			const nestedData = response.data?.data || response.data;

			return {
				success: response.success,
				progression: nestedData?.progression,
				stageDetails: nestedData?.stageDetails,
				nextStageRequirements: nestedData?.nextStageRequirements,
				error: response.error,
			};
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
			case 'Tutorial':
				return {
					title: 'Level 1: Beginner',
					subtitle: 'Learn the basics of financial tracking',
					description:
						'Welcome! Complete these basic steps to unlock smart actions and start your financial journey.',
					color: '#FF9800',
					icon: 'school-outline',
					nextStage: 'Apprentice',
					requirements: [
						'Add your first transaction',
						'Create your first budget',
						'Set a savings goal',
						'Enable AI insights',
					],
				};
			case 'Apprentice':
				return {
					title: 'Level 2: Apprentice',
					subtitle: 'Master smart actions and basic financial habits',
					description:
						"Great job! You've unlocked smart actions. Complete missions to earn XP and build better financial habits.",
					color: '#4CAF50',
					icon: 'sparkles',
					nextStage: 'Practitioner',
					requirements: [
						'Complete 3 smart actions',
						'Stay under budget for 1 week',
						'Save money for 2 weeks',
						'Follow 2 AI recommendations',
					],
				};
			case 'Practitioner':
				return {
					title: 'Level 3: Practitioner',
					subtitle: 'Build consistent financial habits',
					description:
						"You're building great habits! Keep going to unlock advanced features and accelerate your financial growth.",
					color: '#2196F3',
					icon: 'trending-up',
					nextStage: 'Expert',
					requirements: [
						'Complete 5 smart actions',
						'Stay under budget for 1 month',
						'Save money for 1 month',
						'Achieve 1 financial goal',
					],
				};
			case 'Expert':
				return {
					title: 'Level 4: Expert',
					subtitle: 'Optimize and accelerate your financial growth',
					description:
						"You're an expert! Enjoy advanced insights and optimization features to maximize your financial success.",
					color: '#9C27B0',
					icon: 'rocket',
					nextStage: 'Master',
					requirements: [
						'Complete 10 smart actions',
						'Stay under budget for 3 months',
						'Save money for 3 months',
						'Achieve 3 financial goals',
					],
				};
			case 'Master':
				return {
					title: 'Level 5: Master',
					subtitle: 'Achieve financial mastery and help others',
					description:
						"You've reached the pinnacle! You're a financial master. Share your knowledge and help others succeed.",
					color: '#E91E63',
					icon: 'trophy',
					nextStage: null,
					requirements: [
						'Complete 20 smart actions',
						'Stay under budget for 6 months',
						'Save money for 6 months',
						'Achieve 5 financial goals',
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
					nextStage: 'Beginner',
					requirements: [],
				};
		}
	}
}
