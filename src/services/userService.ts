import { ApiService } from './apiService';

const API_BASE_URL = 'http://localhost:3000/api'; // Updated to include /api prefix

export interface User {
	_id: string;
	firebaseUID: string;
	email: string;
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
		const response = await ApiService.post<CreateUserResponse>(
			'/users',
			userData
		);

		if (!response.success || !response.data?.user || !response.data?.profile) {
			throw new Error(response.error || 'Failed to create user');
		}

		return response.data;
	}

	static async getUserByFirebaseUID(firebaseUID: string): Promise<User | null> {
		const response = await ApiService.get<{ user: User }>(
			`/users/${firebaseUID}`
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
		const response = await ApiService.get<{ user: User }>('/users/me');

		if (!response.success || !response.data?.user) {
			throw new Error(response.error || 'Failed to fetch current user');
		}

		return response.data.user;
	}

	static async updateUserProfile(updates: UpdateUserRequest): Promise<User> {
		const response = await ApiService.put<{ user: User }>('/users/me', updates);

		if (!response.success || !response.data?.user) {
			throw new Error(response.error || 'Failed to update user');
		}

		return response.data.user;
	}

	static async getProfileByUserId(userId: string): Promise<Profile | null> {
		const response = await ApiService.get<{ profile: Profile }>(
			`/profiles/user/${userId}`
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
		const response = await ApiService.delete<{ message: string }>('/users/me');

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
			'/users/sync-firebase',
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
		const response = await ApiService.get<{ stats: any }>('/users/sync-stats');

		if (!response.success || !response.data?.stats) {
			throw new Error(response.error || 'Failed to get sync stats');
		}

		return response.data.stats;
	}
}
