import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_CONFIG } from '../../config/api';

// Demo logging: Keep essential info but reduce noise
console.log(`🌐 API: ${__DEV__ ? 'DEV' : 'PROD'} | Base: ${API_BASE_URL}`);

// Rate limiting and deduplication
const inflight = new Map<string, Promise<any>>();

// Request cancellation support
const abortControllers = new Map<string, AbortController>();

// Request/Response interceptors
type RequestInterceptor = (
	url: string,
	options: RequestInit
) => Promise<{ url: string; options: RequestInit }>;
type ResponseInterceptor = (response: Response) => Promise<Response>;

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];

// Single-flight pattern to prevent duplicate requests
async function singleflight<T>(key: string, fn: () => Promise<T>): Promise<T> {
	if (inflight.has(key)) {
		console.log(`🔄 [ApiService] Deduplicating request: ${key}`);
		return inflight.get(key) as Promise<T>;
	}

	const promise = fn().finally(() => {
		inflight.delete(key);
	});

	inflight.set(key, promise);
	return promise;
}

// Retry with exponential backoff for non-429 errors
async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	maxRetries: number = 2
): Promise<T> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error: any) {
			lastError = error;

			// Don't retry on 429 rate limit errors - let the caller handle it
			if (error?.response?.status === 429 || error?.status === 429) {
				throw error;
			}

			// Don't retry on 4xx errors
			if (error && error.status >= 400 && error.status < 500) {
				throw error;
			}

			// Only retry on network errors or 5xx errors
			if (attempt < maxRetries) {
				const delay = 250 * Math.pow(2, attempt) + Math.random() * 200;
				console.log(
					`⏳ [ApiService] Retrying in ${delay}ms (attempt ${attempt + 1}/${
						maxRetries + 1
					})`
				);
				await new Promise((resolve) => setTimeout(resolve, delay));
				continue;
			}
		}
	}

	throw lastError;
}

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

export enum ApiErrorType {
	NETWORK_ERROR = 'NETWORK_ERROR',
	AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
	RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	SERVER_ERROR = 'SERVER_ERROR',
	TIMEOUT_ERROR = 'TIMEOUT_ERROR',
	OFFLINE_ERROR = 'OFFLINE_ERROR',
	UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class ApiError extends Error {
	constructor(
		message: string,
		public type: ApiErrorType,
		public status?: number,
		public response?: any
	) {
		super(message);
		this.name = 'ApiError';
	}
}

export class ApiService {
	private static isOnline(): boolean {
		// Check if we're online using navigator.onLine if available
		if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
			return navigator.onLine;
		}
		// Default to true for React Native
		return true;
	}

	private static createAbortController(key: string): AbortController {
		// Cancel any existing request with the same key
		if (abortControllers.has(key)) {
			abortControllers.get(key)?.abort();
		}

		const controller = new AbortController();
		abortControllers.set(key, controller);
		return controller;
	}

	private static cleanupAbortController(key: string): void {
		abortControllers.delete(key);
	}

	private static async applyRequestInterceptors(
		url: string,
		options: RequestInit
	): Promise<{ url: string; options: RequestInit }> {
		let currentUrl = url;
		let currentOptions = options;

		for (const interceptor of requestInterceptors) {
			const result = await interceptor(currentUrl, currentOptions);
			currentUrl = result.url;
			currentOptions = result.options;
		}

		return { url: currentUrl, options: currentOptions };
	}

	private static async applyResponseInterceptors(
		response: Response
	): Promise<Response> {
		let currentResponse = response;

		for (const interceptor of responseInterceptors) {
			currentResponse = await interceptor(currentResponse);
		}

		return currentResponse;
	}

	/**
	 * Cancel a specific request by key
	 */
	static cancelRequest(key: string): void {
		const controller = abortControllers.get(key);
		if (controller) {
			controller.abort();
			abortControllers.delete(key);
		}
	}

	/**
	 * Cancel all pending requests
	 */
	static cancelAllRequests(): void {
		abortControllers.forEach((controller) => controller.abort());
		abortControllers.clear();
	}

	/**
	 * Add a request interceptor
	 */
	static addRequestInterceptor(interceptor: RequestInterceptor): void {
		requestInterceptors.push(interceptor);
	}

	/**
	 * Add a response interceptor
	 */
	static addResponseInterceptor(interceptor: ResponseInterceptor): void {
		responseInterceptors.push(interceptor);
	}

	/**
	 * Remove a request interceptor
	 */
	static removeRequestInterceptor(interceptor: RequestInterceptor): void {
		const index = requestInterceptors.indexOf(interceptor);
		if (index > -1) {
			requestInterceptors.splice(index, 1);
		}
	}

	/**
	 * Remove a response interceptor
	 */
	static removeResponseInterceptor(interceptor: ResponseInterceptor): void {
		const index = responseInterceptors.indexOf(interceptor);
		if (index > -1) {
			responseInterceptors.splice(index, 1);
		}
	}

	private static async getAuthHeaders(): Promise<Record<string, string>> {
		try {
			// Import Firebase auth to check if user is actually authenticated
			const auth = (await import('@react-native-firebase/auth')).default;
			const currentUser = auth().currentUser;

			// Check if there's an authenticated Firebase user
			if (!currentUser) {
				// Return a more graceful error that can be handled by callers
				const error = new Error(
					'User not authenticated - no Firebase user found'
				);
				(error as any).isAuthError = true;
				throw error;
			}

			const firebaseUID = currentUser.uid;

			console.log(
				'🔍 [DEBUG] Authenticated Firebase UID:',
				firebaseUID ? `${firebaseUID.substring(0, 8)}...` : 'null'
			);

			const headers = {
				'Content-Type': 'application/json',
				'x-firebase-uid': firebaseUID,
			};

			console.log('🔍 [DEBUG] API Headers prepared:', {
				'x-firebase-uid': `${firebaseUID.substring(0, 8)}...`,
			});
			return headers;
		} catch (error) {
			// Re-throw auth errors with a flag so callers can handle them appropriately
			if ((error as any).isAuthError) {
				throw error;
			}
			console.error('❌ API: Error getting auth headers:', error);
			throw error;
		}
	}

	static async get<T>(
		endpoint: string,
		retries: number = 2
	): Promise<ApiResponse<T>> {
		// Check if offline
		if (!this.isOnline()) {
			throw new ApiError('No internet connection', ApiErrorType.OFFLINE_ERROR);
		}

		// Create a unique key for deduplication
		const requestKey = `GET:${endpoint}`;

		return singleflight(requestKey, async () => {
			return retryWithBackoff(async () => {
				let headers: Record<string, string>;
				try {
					headers = await this.getAuthHeaders();
				} catch (authError: any) {
					// Handle authentication errors gracefully
					if (authError.isAuthError) {
						console.log('🔒 [API] User not authenticated, skipping request');
						return {
							success: false,
							error: 'User not authenticated',
							data: [] as T, // Return empty array for data fetching hooks
						};
					}
					throw authError;
				}

				const url = `${API_BASE_URL}${endpoint}`;

				// Debug logging for URL construction
				console.log('🔧 [DEBUG] URL Construction:');
				console.log('🔧 [DEBUG] API_BASE_URL:', API_BASE_URL);
				console.log('🔧 [DEBUG] endpoint:', endpoint);
				console.log('🔧 [DEBUG] final URL:', url);

				// Demo logging: Keep essential request info
				console.log(`📡 GET: ${endpoint}`);

				// Create abort controller for this request
				const controller = this.createAbortController(requestKey);
				const timeoutId = setTimeout(
					() => controller.abort(),
					API_CONFIG.timeout
				);

				try {
					// Apply request interceptors
					const { url: finalUrl, options: finalOptions } =
						await this.applyRequestInterceptors(url, {
							method: 'GET',
							headers,
							signal: controller.signal,
						});

					const response = await fetch(finalUrl, finalOptions);

					clearTimeout(timeoutId);
					this.cleanupAbortController(requestKey);

					// Apply response interceptors
					const processedResponse = await this.applyResponseInterceptors(
						response
					);

					// Check if response is JSON before parsing
					const contentType = processedResponse.headers.get('content-type');
					let data: any;

					if (contentType && contentType.includes('application/json')) {
						try {
							data = await processedResponse.json();
						} catch (parseError) {
							console.error('❌ API: JSON parse error:', parseError);
							return {
								success: false,
								error: 'Invalid JSON response from server',
							};
						}
					} else {
						// Handle non-JSON responses (like HTML 404 pages)
						const textResponse = await processedResponse.text();
						console.log(
							'⚠️ API: Non-JSON response:',
							textResponse.substring(0, 100)
						);

						if (!processedResponse.ok) {
							return {
								success: false,
								error: `HTTP error! status: ${processedResponse.status}`,
							};
						}

						return {
							success: false,
							error: 'Server returned non-JSON response',
						};
					}

					if (!processedResponse.ok) {
						// Handle 429 rate limiting specifically
						if (processedResponse.status === 429) {
							throw new ApiError(
								'Rate limit exceeded',
								ApiErrorType.RATE_LIMIT_ERROR,
								429
							);
						}

						// Handle authentication errors
						if (processedResponse.status === 401) {
							throw new ApiError(
								'Authentication failed',
								ApiErrorType.AUTHENTICATION_ERROR,
								401
							);
						}

						// Handle validation errors
						if (processedResponse.status === 400) {
							throw new ApiError(
								data.error || 'Validation error',
								ApiErrorType.VALIDATION_ERROR,
								400
							);
						}

						// Handle server errors
						if (processedResponse.status >= 500) {
							throw new ApiError(
								data.error || 'Server error',
								ApiErrorType.SERVER_ERROR,
								processedResponse.status
							);
						}

						return {
							success: false,
							error:
								data.error || `HTTP error! status: ${processedResponse.status}`,
						};
					}

					// Demo logging: Success response
					console.log(`✅ GET: ${endpoint} (${processedResponse.status})`);
					return { success: true, data };
				} catch (error: unknown) {
					clearTimeout(timeoutId);
					this.cleanupAbortController(requestKey);

					if (error instanceof ApiError) {
						throw error;
					}

					// Handle network errors
					if (error instanceof TypeError && error.message.includes('fetch')) {
						throw new ApiError('Network error', ApiErrorType.NETWORK_ERROR);
					}

					// Handle timeout errors
					if (error instanceof Error && error.name === 'AbortError') {
						throw new ApiError('Request timeout', ApiErrorType.TIMEOUT_ERROR);
					}

					throw new ApiError(
						error instanceof Error ? error.message : 'Unknown error',
						ApiErrorType.UNKNOWN_ERROR
					);
				}
			}, retries);
		});
	}

	static async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
		// Check if offline
		if (!this.isOnline()) {
			throw new ApiError('No internet connection', ApiErrorType.OFFLINE_ERROR);
		}

		// Create a unique key for deduplication (include body hash for POST requests)
		const bodyHash = JSON.stringify(body).slice(0, 50); // Use first 50 chars as hash
		const requestKey = `POST:${endpoint}:${bodyHash}`;

		return singleflight(requestKey, async () => {
			return retryWithBackoff(async () => {
				console.log('🔍 [ApiService] POST request details:', {
					endpoint,
					dataKeys: Object.keys(body),
					firebaseUID: body.firebaseUID
						? `${body.firebaseUID.substring(0, 8)}...`
						: 'not provided',
				});

				let headers: Record<string, string>;
				try {
					headers = await this.getAuthHeaders();
				} catch (authError: any) {
					// Handle authentication errors gracefully
					if (authError.isAuthError) {
						console.log(
							'🔒 [API] User not authenticated, skipping POST request'
						);
						return {
							success: false,
							error: 'User not authenticated',
						};
					}
					throw authError;
				}

				const url = `${API_BASE_URL}${endpoint}`;

				console.log('🔍 [ApiService] POST request details:', {
					url,
					endpoint,
					headers: {
						'x-firebase-uid':
							headers['x-firebase-uid']?.substring(0, 8) + '...',
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
					// Handle 429 rate limiting specifically
					if (response.status === 429) {
						const error = new Error('Rate limit exceeded');
						(error as any).status = 429;
						throw error;
					}

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

				// Validate response has a message for orchestrator endpoints
				if (endpoint.includes('/orchestrator/chat') && data?.success) {
					const message =
						data.message || data.data?.message || data.data?.response;
					if (!message || typeof message !== 'string' || !message.trim()) {
						console.error('❌ [ApiService] Empty message from orchestrator:', {
							endpoint,
							success: data.success,
							message: message,
							hasData: !!data.data,
						});
						return {
							success: false,
							error: 'Empty message from orchestrator',
						};
					}
				}

				// Demo logging: Success response
				console.log(`✅ [ApiService] POST: ${endpoint} (${response.status})`);
				return {
					success: true,
					data: data.data || data, // Use data.data if it exists, otherwise use the entire response
					usage: data.usage,
				};
			});
		});
	}

	static async put<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
		try {
			let headers: Record<string, string>;
			try {
				headers = await this.getAuthHeaders();
			} catch (authError: any) {
				// Handle authentication errors gracefully
				if (authError.isAuthError) {
					console.log('🔒 [API] User not authenticated, skipping PUT request');
					return {
						success: false,
						error: 'User not authenticated',
					};
				}
				throw authError;
			}

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
					console.error('❌ API: JSON parse error:', parseError);
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

	static async patch<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
		try {
			let headers: Record<string, string>;
			try {
				headers = await this.getAuthHeaders();
			} catch (authError: any) {
				// Handle authentication errors gracefully
				if (authError.isAuthError) {
					console.log(
						'🔒 [API] User not authenticated, skipping PATCH request'
					);
					return {
						success: false,
						error: 'User not authenticated',
					};
				}
				throw authError;
			}

			const url = `${API_BASE_URL}${endpoint}`;

			// Demo logging: Keep essential request info
			console.log(`🔧 PATCH: ${endpoint}`);

			const response = await fetch(url, {
				method: 'PATCH',
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
					console.error('❌ API: JSON parse error:', parseError);
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
			console.log(`✅ PATCH: ${endpoint} (${response.status})`);
			return { success: true, data };
		} catch (error) {
			console.error('❌ API PATCH error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	static async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
		try {
			let headers: Record<string, string>;
			try {
				headers = await this.getAuthHeaders();
			} catch (authError: any) {
				// Handle authentication errors gracefully
				if (authError.isAuthError) {
					console.log(
						'🔒 [API] User not authenticated, skipping DELETE request'
					);
					return {
						success: false,
						error: 'User not authenticated',
					};
				}
				throw authError;
			}

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
					console.error('❌ API: JSON parse error:', parseError);
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

	/**
	 * Get authentication headers for API requests
	 * Public method for use by other services
	 */
	static async getApiHeaders(): Promise<Record<string, string>> {
		return this.getAuthHeaders();
	}

	/**
	 * Execute multiple requests in parallel with a concurrency limit
	 */
	static async batch<T>(
		requests: (() => Promise<ApiResponse<T>>)[],
		concurrency: number = 5
	): Promise<ApiResponse<T>[]> {
		const results: ApiResponse<T>[] = [];

		for (let i = 0; i < requests.length; i += concurrency) {
			const batch = requests.slice(i, i + concurrency);
			const batchResults = await Promise.allSettled(
				batch.map((request) => request())
			);

			results.push(
				...batchResults.map((result) =>
					result.status === 'fulfilled'
						? result.value
						: { success: false, error: 'Request failed' }
				)
			);
		}

		return results;
	}

	/**
	 * Check if the API service is healthy
	 */
	static async healthCheck(): Promise<{
		healthy: boolean;
		latency?: number;
		error?: string;
	}> {
		const startTime = Date.now();

		try {
			const response = await this.testConnection();
			const latency = Date.now() - startTime;

			return {
				healthy: response,
				latency: response ? latency : undefined,
				error: response ? undefined : 'Connection test failed',
			};
		} catch (error) {
			return {
				healthy: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Get current request queue status
	 */
	static getQueueStatus(): { pending: number; inflight: number } {
		return {
			pending: inflight.size,
			inflight: abortControllers.size,
		};
	}
}
