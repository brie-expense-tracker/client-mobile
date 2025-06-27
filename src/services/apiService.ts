import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:3000/api'; // Updated to include /api prefix

export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

export class ApiService {
	private static async getAuthHeaders(): Promise<Record<string, string>> {
		const firebaseUID = await AsyncStorage.getItem('firebaseUID');

		return {
			'Content-Type': 'application/json',
			...(firebaseUID && { 'x-firebase-uid': firebaseUID }),
		};
	}

	static async get<T>(endpoint: string): Promise<ApiResponse<T>> {
		try {
			const headers = await this.getAuthHeaders();
			const response = await fetch(`${API_BASE_URL}${endpoint}`, {
				method: 'GET',
				headers,
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			return { success: true, data };
		} catch (error) {
			console.error('API GET error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	static async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
		try {
			const headers = await this.getAuthHeaders();
			const response = await fetch(`${API_BASE_URL}${endpoint}`, {
				method: 'POST',
				headers,
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			return { success: true, data };
		} catch (error) {
			console.error('API POST error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	static async put<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
		try {
			const headers = await this.getAuthHeaders();
			const response = await fetch(`${API_BASE_URL}${endpoint}`, {
				method: 'PUT',
				headers,
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			return { success: true, data };
		} catch (error) {
			console.error('API PUT error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	static async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
		try {
			const headers = await this.getAuthHeaders();
			const response = await fetch(`${API_BASE_URL}${endpoint}`, {
				method: 'DELETE',
				headers,
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			return { success: true, data };
		} catch (error) {
			console.error('API DELETE error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}
}
