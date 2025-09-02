import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config/api';

// Demo logging: Keep essential info but reduce noise
console.log(`🌐 API: ${__DEV__ ? 'DEV' : 'PROD'} | Base: ${API_BASE_URL}`);

export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
	usage?: {
		estimatedTokens: number;
		remainingTokens: number;
		remainingRequests: number;
	};
}

export class ApiService {
	private static async getAuthHeaders(): Promise<Record<string, string>> {
		try {
			const firebaseUID = await AsyncStorage.getItem('firebaseUID');

			console.log(
				'🔍 [DEBUG] AsyncStorage firebaseUID:',
				firebaseUID ? `${firebaseUID.substring(0, 8)}...` : 'null'
			);

			if (!firebaseUID) {
				console.error('❌ API: No Firebase UID found in AsyncStorage');
				console.error(
					'❌ API: This usually means the user is not authenticated or AsyncStorage failed'
				);
				throw new Error('User not authenticated - no Firebase UID found');
			}

			const headers = {
				'Content-Type': 'application/json',
				'x-firebase-uid': firebaseUID,
			};

			console.log('🔍 [DEBUG] API Headers prepared:', {
				'x-firebase-uid': `${firebaseUID.substring(0, 8)}...`,
			});
			return headers;
		} catch (error) {
			console.error('❌ API: Error getting auth headers:', error);
			throw error;
		}
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
				
				// Debug logging for URL construction
				if (attempt === 0) {
					console.log('🔧 [DEBUG] URL Construction:');
					console.log('🔧 [DEBUG] API_BASE_URL:', API_BASE_URL);
					console.log('🔧 [DEBUG] endpoint:', endpoint);
					console.log('🔧 [DEBUG] final URL:', url);
				}

				// Demo logging: Keep essential request info
				if (attempt === 0) {
					console.log(`📡 GET: ${endpoint}`);
				}

				// Add timeout to prevent infinite loading
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

				const response = await fetch(url, {
					method: 'GET',
					headers,
					signal: controller.signal,
				});

				clearTimeout(timeoutId);

				// Check if response is JSON before parsing
				const contentType = response.headers.get('content-type');
				let data: any;

				if (contentType && contentType.includes('application/json')) {
					try {
						data = await response.json();
					} catch (parseError) {
						console.error('❌ API: JSON parse error');
						return {
							success: false,
							error: 'Invalid JSON response from server',
						};
					}
				} else {
					// Handle non-JSON responses (like HTML 404 pages)
					const textResponse = await response.text();
					console.log(
						'⚠️ API: Non-JSON response:',
						textResponse.substring(0, 100)
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

				// Demo logging: Success response
				console.log(`✅ GET: ${endpoint} (${response.status})`);
				return { success: true, data };
			} catch (error) {
				lastError = error as Error;

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
		console.log('🔍 [ApiService] POST request details:', {
			endpoint,
			dataKeys: Object.keys(body),
			firebaseUID: body.firebaseUID
				? `${body.firebaseUID.substring(0, 8)}...`
				: 'not provided',
		});

		try {
			const headers = await this.getAuthHeaders();
			const url = `${API_BASE_URL}${endpoint}`;

			console.log('🔍 [ApiService] POST request details:', {
				url,
				endpoint,
				headers: {
					'x-firebase-uid': headers['x-firebase-uid']?.substring(0, 8) + '...',
				},
			});

			const response = await fetch(url, {
				method: 'POST',
				headers,
				body: JSON.stringify(body),
			});

			console.log('🔍 [ApiService] POST response received:', {
				status: response.status,
				statusText: response.statusText,
				ok: response.ok,
				url: response.url,
			});

			// Check if response is JSON before parsing
			const contentType = response.headers.get('content-type');
			let data: any;

			if (contentType && contentType.includes('application/json')) {
				try {
					data = await response.json();
					console.log('🔍 [ApiService] JSON response parsed successfully:', {
						success: data.success,
						message: data.message,
						hasData: !!data.data,
						dataKeys: data.data ? Object.keys(data.data) : [],
					});
				} catch (parseError) {
					console.error('❌ [ApiService] JSON parse error:', parseError);
					return {
						success: false,
						error: 'Invalid JSON response from server',
					};
				}
			} else {
				// Handle non-JSON responses (like HTML 404 pages)
				const textResponse = await response.text();
				console.error('⚠️ [ApiService] Non-JSON response:', {
					contentType,
					status: response.status,
					responsePreview: textResponse.substring(0, 200),
				});

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
				console.error('❌ [ApiService] HTTP error response:', {
					status: response.status,
					statusText: response.statusText,
					error: data.error,
					message: data.message,
				});
				return {
					success: false,
					error: data.error || `HTTP error! status: ${response.status}`,
				};
			}

			// Demo logging: Success response
			console.log(`✅ [ApiService] POST: ${endpoint} (${response.status})`);
			return {
				success: true,
				data: data.data || data, // Use data.data if it exists, otherwise use the entire response
				usage: data.usage,
			};
		} catch (error) {
			console.error('❌ [ApiService] POST error:', error);
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

			// Demo logging: Keep essential request info
			console.log(`📝 PUT: ${endpoint}`);

			const response = await fetch(url, {
				method: 'PUT',
				headers,
				body: JSON.stringify(body),
			});

			// Check if response is JSON before parsing
			const contentType = response.headers.get('content-type');
			let data: any;

			if (contentType && contentType.includes('application/json')) {
				try {
					data = await response.json();
				} catch (parseError) {
					console.error('❌ API: JSON parse error');
					return {
						success: false,
						error: 'Invalid JSON response from server',
					};
				}
			} else {
				// Handle non-JSON responses
				const textResponse = await response.text();
				console.log(
					'⚠️ API: Non-JSON response:',
					textResponse.substring(0, 100)
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

			// Demo logging: Success response
			console.log(`✅ PUT: ${endpoint} (${response.status})`);
			return { success: true, data };
		} catch (error) {
			console.error('❌ API PUT error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	static async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
		try {
			const headers = await this.getAuthHeaders();
			const url = `${API_BASE_URL}${endpoint}`;

			// Demo logging: Keep essential request info
			console.log(`🗑️ DELETE: ${endpoint}`);

			const response = await fetch(url, {
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
					console.error('❌ API: JSON parse error');
					return {
						success: false,
						error: 'Invalid JSON response from server',
					};
				}
			} else {
				// Handle non-JSON responses
				const textResponse = await response.text();
				console.log(
					'⚠️ API: Non-JSON response:',
					textResponse.substring(0, 100)
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

			// Demo logging: Success response
			console.log(`✅ DELETE: ${endpoint} (${response.status})`);
			return { success: true, data };
		} catch (error) {
			console.error('❌ API DELETE error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Test basic connectivity to the server (no authentication required)
	 */
	static async testConnection(): Promise<boolean> {
		try {
			console.log('🔍 [DEBUG] Testing server connectivity...');
			console.log('🔧 [DEBUG] testConnection - API_BASE_URL:', API_BASE_URL);
			
			// Use a simple ping endpoint or just test if the server is reachable
			const url = `${API_BASE_URL}/api/budgets`;
			console.log('🔧 [DEBUG] testConnection - final URL:', url);

			// Get auth headers to include Firebase UID
			const headers = await this.getAuthHeaders();

			const response = await fetch(url, {
				method: 'GET',
				headers,
			});

			if (response.ok) {
				console.log('✅ [DEBUG] Server connectivity test successful');
				return true;
			} else {
				console.error(
					'❌ [DEBUG] Server connectivity test failed:',
					response.status,
					response.statusText
				);
				return false;
			}
		} catch (error) {
			console.error('❌ [DEBUG] Server connectivity test error:', error);
			return false;
		}
	}

	/**
	 * Test authentication by making a simple authenticated request
	 */
	static async testAuthentication(): Promise<boolean> {
		try {
			console.log('🔍 [DEBUG] Testing authentication...');
			const response = await this.get('/api/profiles/me');
			console.log('✅ [DEBUG] Authentication test result:', response);
			return response.success;
		} catch (error) {
			console.error('❌ [DEBUG] Authentication test error:', error);
			return false;
		}
	}
}
