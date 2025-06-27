import { ApiService } from './apiService';

const API_BASE_URL = 'http://localhost:3000/api'; // Updated to include /api prefix

export interface User {
	_id: string;
	firebaseUID: string;
	name?: string;
	email: string;
	createdAt: string;
}

export interface CreateUserRequest {
	firebaseUID: string;
	name?: string;
	email: string;
}

export interface UpdateUserRequest {
	name?: string;
	email?: string;
}

export class UserService {
	static async createUser(userData: CreateUserRequest): Promise<User> {
		const response = await ApiService.post<{ user: User }>('/users', userData);

		if (!response.success || !response.data?.user) {
			throw new Error(response.error || 'Failed to create user');
		}

		return response.data.user;
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
}
