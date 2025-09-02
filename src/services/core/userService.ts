import { ApiService } from './apiService';

// API_BASE_URL is now handled by ApiService

export interface User {
	_id: string;
	firebaseUID: string;
	email: string;
	onboardingVersion: number;
	createdAt: string;
}

export interface Profile {
	_id: string;
	userId: string;
	firstName?: string;
	lastName?: string;
	phone?: string;
	ageRange?: string;
	monthlyIncome?: number;
	financialGoal?: string;
	expenses?: {
		housing?: number;
		loans?: number;
		subscriptions?: number;
	};
	savings?: number;
	debt?: number;
	riskProfile?: {
		tolerance?: string;
		experience?: string;
	};
	preferences?: {
		adviceFrequency?: string;
		autoSave?: {
			enabled: boolean;
			amount: number;
		};
		notifications?: {
			enableNotifications: boolean;
			weeklySummary: boolean;
			overspendingAlert: boolean;
			aiSuggestion: boolean;
			budgetMilestones: boolean;
			monthlyFinancialCheck: boolean;
			monthlySavingsTransfer: boolean;
		};
		budgetSettings?: {
			cycleType: 'monthly' | 'weekly' | 'biweekly';
			cycleStart: number;
			alertPct: number;
			carryOver: boolean;
			autoSync: boolean;
		};
		goalSettings?: {
			defaults: {
				target: number;
				dueDays: number;
				sortBy: 'percent' | 'name' | 'date';
				currency: string;
			};
			ai: {
				enabled: boolean;
				tone: 'friendly' | 'technical' | 'minimal';
				frequency: 'low' | 'medium' | 'high';
				whatIf: boolean;
			};
			notifications: {
				milestoneAlerts: boolean;
				weeklySummary: boolean;
				offTrackAlert: boolean;
			};
			display: {
				showCompleted: boolean;
				autoArchive: boolean;
				rounding: 'none' | '1' | '5';
			};
			security: {
				lockEdit: boolean;
				undoWindow: number;
			};
		};
	};
	createdAt: string;
	updatedAt: string;
}

export interface CreateUserResponse {
	user: User;
	profile: Profile;
}

export interface CreateUserRequest {
	firebaseUID: string;
	email: string;
	name?: string;
}

export interface UpdateUserRequest {
	name?: string;
	email?: string;
}

export class UserService {
	static async createUser(
		userData: CreateUserRequest
	): Promise<CreateUserResponse> {
		console.log('🔍 [UserService] Creating user with data:', {
			firebaseUID: userData.firebaseUID.substring(0, 8) + '...',
			email: userData.email,
			name: userData.name || 'not provided',
		});

		try {
			console.log('🔍 [UserService] Making POST request to /users endpoint');
			const response = await ApiService.post<CreateUserResponse>(
				'/users',
				userData
			);

			console.log('🔍 [UserService] API response received:', {
				success: response.success,
				status: response.status,
				error: response.error,
				hasUser: !!response.data?.user,
				hasProfile: !!response.data?.profile,
			});

			// Check if the response indicates success and has the required data
			// Handle both new user creation and existing user update scenarios
			if (!response.success) {
				console.error('❌ [UserService] User creation failed:', {
					success: response.success,
					error: response.error,
					data: response.data,
				});
				throw new Error(response.error || 'Failed to create user');
			}

			// For existing user updates, the server might return user and profile directly
			// For new user creation, it should have both user and profile
			const hasUser = response.data?.user;
			const hasProfile = response.data?.profile;

			if (!hasUser || !hasProfile) {
				console.error(
					'❌ [UserService] User creation failed - missing user or profile data:',
					{
						success: response.success,
						error: response.error,
						data: response.data,
						hasUser,
						hasProfile,
					}
				);
				throw new Error('User creation failed - missing user or profile data');
			}

			console.log('✅ [UserService] User created successfully:', {
				userId: response.data.user._id,
				profileId: response.data.profile._id,
			});

			return response.data;
		} catch (error) {
			console.error('❌ [UserService] Error in createUser:', error);
			throw error;
		}
	}

	static async getUserByFirebaseUID(firebaseUID: string): Promise<User | null> {
		const response = await ApiService.get<{ user: User }>(
			`/api/users/${firebaseUID}`
		);

		if (!response.success) {
			if (response.error?.includes('404')) {
				return null;
			}
			throw new Error(response.error || 'Failed to fetch user');
		}

		return response.data?.user || null;
	}

	static async getCurrentUser(): Promise<User> {
		const response = await ApiService.get<{ user: User }>('/api/users/me');

		if (!response.success || !response.data?.user) {
			throw new Error(response.error || 'Failed to fetch current user');
		}

		return response.data.user;
	}

	static async updateUserProfile(updates: UpdateUserRequest): Promise<User> {
		const response = await ApiService.put<{ user: User }>('/api/users/me', updates);

		if (!response.success || !response.data?.user) {
			throw new Error(response.error || 'Failed to update user');
		}

		return response.data.user;
	}

	static async getProfileByUserId(userId: string): Promise<Profile | null> {
		const response = await ApiService.get<{ profile: Profile }>(
			`/api/profiles/user/${userId}`
		);

		if (!response.success) {
			if (response.error?.includes('404')) {
				return null;
			}
			throw new Error(response.error || 'Failed to fetch profile');
		}

		return response.data?.profile || null;
	}

	static async deleteUserAccount(): Promise<void> {
		const response = await ApiService.delete<{ message: string }>('/api/users/me');

		if (!response.success) {
			throw new Error(response.error || 'Failed to delete user account');
		}
	}

	static async syncFirebaseAccount(
		firebaseUID: string,
		email: string,
		name?: string
	): Promise<CreateUserResponse> {
		const response = await ApiService.post<CreateUserResponse>(
			'/api/users/sync-firebase',
			{ firebaseUID, email, name }
		);

		if (!response.success || !response.data?.user || !response.data?.profile) {
			throw new Error(response.error || 'Failed to sync Firebase account');
		}

		return response.data;
	}

	static async getSyncStats(): Promise<{
		totalUsers: number;
		usersWithFirebaseUID: number;
		usersWithoutFirebaseUID: number;
		syncPercentage: number;
	}> {
		const response = await ApiService.get<{ stats: any }>('/api/users/sync-stats');

		if (!response.success || !response.data?.stats) {
			throw new Error(response.error || 'Failed to get sync stats');
		}

		return response.data.stats;
	}
}
