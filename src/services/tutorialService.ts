import { ApiService } from './apiService';

export interface TutorialProgress {
	completed: boolean;
	steps: {
		firstSmartAction: boolean;
		secondSmartAction: boolean;
		thirdSmartAction: boolean;
		fourthSmartAction: boolean;
	};
	totalCompleted: number;
}

export interface TutorialCompletionStatus {
	completed: boolean;
}

export class TutorialService {
	/**
	 * Generate tutorial actions for the current user
	 */
	static async generateTutorialActions(): Promise<{
		success: boolean;
		data?: any;
		error?: string;
	}> {
		try {
			const response = await ApiService.post('/tutorial/generate-actions', {});
			return {
				success: response.success,
				data: response.data,
				error: response.error,
			};
		} catch (error) {
			console.error('Error generating tutorial actions:', error);
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to generate tutorial actions',
			};
		}
	}

	/**
	 * Get tutorial progress for the current user
	 */
	static async getTutorialProgress(): Promise<{
		success: boolean;
		data?: TutorialProgress;
		error?: string;
	}> {
		try {
			const response = await ApiService.get<TutorialProgress>(
				'/tutorial/progress'
			);
			return {
				success: response.success,
				data: response.data,
				error: response.error,
			};
		} catch (error) {
			console.error('Error getting tutorial progress:', error);
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to get tutorial progress',
			};
		}
	}

	/**
	 * Check if tutorial is completed
	 */
	static async isTutorialCompleted(): Promise<{
		success: boolean;
		data?: TutorialCompletionStatus;
		error?: string;
	}> {
		try {
			const response = await ApiService.get<TutorialCompletionStatus>(
				'/tutorial/completed'
			);
			return {
				success: response.success,
				data: response.data,
				error: response.error,
			};
		} catch (error) {
			console.error('Error checking tutorial completion:', error);
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to check tutorial completion',
			};
		}
	}

	/**
	 * Enable weekly updates after tutorial completion
	 */
	static async enableWeeklyUpdates(): Promise<{
		success: boolean;
		error?: string;
	}> {
		try {
			const response = await ApiService.post(
				'/tutorial/enable-weekly-updates',
				{}
			);
			return {
				success: response.success,
				error: response.error,
			};
		} catch (error) {
			console.error('Error enabling weekly updates:', error);
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to enable weekly updates',
			};
		}
	}
}
