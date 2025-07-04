import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__
	? 'http://192.168.1.222:3000/api' // Your computer's local IP address
	: 'https://your-production-api.com/api';

export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

export class ApiService {
	private static async getAuthHeaders(): Promise<Record<string, string>> {
		const firebaseUID = await AsyncStorage.getItem('firebaseUID');

		// Debug: Log the Firebase UID being used
		console.log('ApiService - Firebase UID from AsyncStorage:', firebaseUID);

		// Use the actual Firebase UID from AsyncStorage
		if (!firebaseUID) {
			console.error('ApiService - No Firebase UID found in AsyncStorage');
			throw new Error('User not authenticated');
		}

		const headers = {
			'Content-Type': 'application/json',
			'x-firebase-uid': firebaseUID,
		};

		// Debug: Log the final headers
		console.log('ApiService - Final headers:', headers);
		console.log('ApiService - Using Firebase UID:', firebaseUID);

		return headers;
	}

	static async get<T>(endpoint: string): Promise<ApiResponse<T>> {
		try {
			const headers = await this.getAuthHeaders();
			const url = `${API_BASE_URL}${endpoint}`;

			// Debug: Log the request details
			console.log('ApiService GET - URL:', url);
			console.log('ApiService GET - Headers:', headers);

			const response = await fetch(url, {
				method: 'GET',
				headers,
			});

			// Debug: Log the response status
			console.log('ApiService GET - Response status:', response.status);
			console.log('ApiService GET - Response ok:', response.ok);

			const data = await response.json();

			// Debug: Log the raw server response
			console.log(
				'ApiService GET - Raw server response:',
				JSON.stringify(data, null, 2)
			);

			if (!response.ok) {
				return {
					success: false,
					error: data.error || `HTTP error! status: ${response.status}`,
				};
			}

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

			const data = await response.json();

			if (!response.ok) {
				return {
					success: false,
					error: data.error || `HTTP error! status: ${response.status}`,
				};
			}

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

			const data = await response.json();

			if (!response.ok) {
				return {
					success: false,
					error: data.error || `HTTP error! status: ${response.status}`,
				};
			}

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

			const data = await response.json();

			if (!response.ok) {
				return {
					success: false,
					error: data.error || `HTTP error! status: ${response.status}`,
				};
			}

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
