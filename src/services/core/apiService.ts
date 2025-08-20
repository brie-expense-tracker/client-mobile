import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config/api';

// Debug: Log the API configuration
console.log(
	'ApiService - Environment:',
	__DEV__ ? 'development' : 'production'
);
console.log('ApiService - API_BASE_URL:', API_BASE_URL);
console.log('ApiService - API_BASE_URL length:', API_BASE_URL.length);
console.log(
	'ApiService - API_BASE_URL ends with /api:',
	API_BASE_URL.endsWith('/api')
);
console.log(
	'ApiService - API_BASE_URL ends with /api/:',
	API_BASE_URL.endsWith('/api/')
);

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

	static async get<T>(
		endpoint: string,
		retries: number = 2
	): Promise<ApiResponse<T>> {
		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				const headers = await this.getAuthHeaders();
				const url = `${API_BASE_URL}${endpoint}`;

				// Debug: Log the URL construction details
				console.log(`ApiService GET - Attempt ${attempt + 1}/${retries + 1}`);
				console.log('ApiService GET - API_BASE_URL:', API_BASE_URL);
				console.log('ApiService GET - endpoint:', endpoint);
				console.log('ApiService GET - constructed URL:', url);
				console.log('ApiService GET - Headers:', headers);

				// Debug: Log the request details
				console.log(
					`ApiService GET - Attempt ${attempt + 1}/${retries + 1} - URL:`,
					url
				);
				console.log('ApiService GET - Headers:', headers);

				// Add timeout to prevent infinite loading
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

				const response = await fetch(url, {
					method: 'GET',
					headers,
					signal: controller.signal,
				});

				clearTimeout(timeoutId);

				// Debug: Log the response status
				console.log('ApiService GET - Response status:', response.status);
				console.log('ApiService GET - Response ok:', response.ok);

				// Check if response is JSON before parsing
				const contentType = response.headers.get('content-type');
				let data: any;

				if (contentType && contentType.includes('application/json')) {
					try {
						data = await response.json();
					} catch (parseError) {
						console.error('ApiService GET - JSON parse error:', parseError);
						return {
							success: false,
							error: 'Invalid JSON response from server',
						};
					}
				} else {
					// Handle non-JSON responses (like HTML 404 pages)
					const textResponse = await response.text();
					console.log(
						'ApiService GET - Non-JSON response:',
						textResponse.substring(0, 200)
					);

					if (!response.ok) {
						return {
							success: false,
							error: `HTTP error! status: ${response.status}`,
						};
					}

					return {
						success: false,
						error: 'Server returned non-JSON response',
					};
				}

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
				lastError = error as Error;
				console.error(
					`API GET error (attempt ${attempt + 1}/${retries + 1}):`,
					error
				);

				// Handle timeout errors specifically
				if (error instanceof Error && error.name === 'AbortError') {
					if (attempt === retries) {
						return {
							success: false,
							error: 'Request timeout - server may be unavailable',
						};
					}
					// Wait before retrying
					await new Promise((resolve) =>
						setTimeout(resolve, 1000 * (attempt + 1))
					);
					continue;
				}

				// For other errors, don't retry
				break;
			}
		}

		// If we get here, all retries failed
		return {
			success: false,
			error:
				lastError?.message || 'Failed to fetch data after multiple attempts',
		};
	}

	static async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
		try {
			const headers = await this.getAuthHeaders();
			const url = `${API_BASE_URL}${endpoint}`;

			// Debug: Log the request details
			console.log('ApiService POST - URL:', url);
			console.log('ApiService POST - Headers:', headers);
			console.log('ApiService POST - Body:', body);

			const response = await fetch(url, {
				method: 'POST',
				headers,
				body: JSON.stringify(body),
			});

			// Debug: Log the response status
			console.log('ApiService POST - Response status:', response.status);
			console.log('ApiService POST - Response ok:', response.ok);

			// Check if response is JSON before parsing
			const contentType = response.headers.get('content-type');
			let data: any;

			if (contentType && contentType.includes('application/json')) {
				try {
					data = await response.json();
				} catch (parseError) {
					console.error('ApiService POST - JSON parse error:', parseError);
					return {
						success: false,
						error: 'Invalid JSON response from server',
					};
				}
			} else {
				// Handle non-JSON responses (like HTML 404 pages)
				const textResponse = await response.text();
				console.log(
					'ApiService POST - Non-JSON response:',
					textResponse.substring(0, 200)
				);

				if (!response.ok) {
					return {
						success: false,
						error: `HTTP error! status: ${response.status}`,
					};
				}

				return {
					success: false,
					error: 'Server returned non-JSON response',
				};
			}

			// Debug: Log the raw server response
			console.log(
				'ApiService POST - Raw server response:',
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
			const url = `${API_BASE_URL}${endpoint}`;

			// Debug: Log the request details
			console.log('ApiService PUT - URL:', url);
			console.log('ApiService PUT - Headers:', headers);
			console.log('ApiService PUT - Body:', body);

			const response = await fetch(url, {
				method: 'PUT',
				headers,
				body: JSON.stringify(body),
			});

			// Debug: Log the response status
			console.log('ApiService PUT - Response status:', response.status);
			console.log('ApiService PUT - Response ok:', response.ok);

			// Check if response is JSON before parsing
			const contentType = response.headers.get('content-type');
			let data: any;

			if (contentType && contentType.includes('application/json')) {
				try {
					data = await response.json();
				} catch (parseError) {
					console.error('ApiService PUT - JSON parse error:', parseError);
					return {
						success: false,
						error: 'Invalid JSON response from server',
					};
				}
			} else {
				// Handle non-JSON responses (like HTML 404 pages)
				const textResponse = await response.text();
				console.log(
					'ApiService PUT - Non-JSON response:',
					textResponse.substring(0, 200)
				);

				if (!response.ok) {
					return {
						success: false,
						error: `HTTP error! status: ${response.status}`,
					};
				}

				return {
					success: false,
					error: 'Server returned non-JSON response',
				};
			}

			// Debug: Log the raw server response
			console.log(
				'ApiService PUT - Raw server response:',
				JSON.stringify(data, null, 2)
			);

			if (!response.ok) {
				console.error('ApiService PUT - Response not ok:', {
					status: response.status,
					statusText: response.statusText,
					data: data,
				});
				return {
					success: false,
					error:
						data.error ||
						data.message ||
						`HTTP error! status: ${response.status}`,
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

			// Check if response is JSON before parsing
			const contentType = response.headers.get('content-type');
			let data: any;

			if (contentType && contentType.includes('application/json')) {
				try {
					data = await response.json();
				} catch (parseError) {
					console.error('ApiService DELETE - JSON parse error:', parseError);
					return {
						success: false,
						error: 'Invalid JSON response from server',
					};
				}
			} else {
				// Handle non-JSON responses (like HTML 404 pages)
				const textResponse = await response.text();
				console.log(
					'ApiService DELETE - Non-JSON response:',
					textResponse.substring(0, 200)
				);

				if (!response.ok) {
					return {
						success: false,
						error: `HTTP error! status: ${response.status}`,
					};
				}

				return {
					success: false,
					error: 'Server returned non-JSON response',
				};
			}

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
