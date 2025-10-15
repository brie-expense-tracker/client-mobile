import { API_BASE_URL, API_CONFIG } from '../../config/api';
import { getHMACService } from '../../utils/hmacSigning';
import { RequestManager } from './requestManager';

// API logging: Keep essential info but reduce noise
console.log(`🌐 API: ${__DEV__ ? 'DEV' : 'PROD'} | Base: ${API_BASE_URL}`);

// ==========================================
// Utilities
// ==========================================

/**
 * Stable JSON stringify with sorted keys
 * Use this for HMAC signing, cache keys, and deduplication
 */
export const stableStringify = (value: unknown): string => {
	if (value === null || value === undefined) {
		return String(value);
	}
	if (typeof value !== 'object') {
		return JSON.stringify(value);
	}
	return JSON.stringify(value, Object.keys(value as any).sort());
};

// Rate limiting and deduplication
const inflight = new Map<string, Promise<any>>();

// Request cancellation support
const abortControllers = new Map<string, AbortController>();

// Request throttling and caching
const requestCache = new Map<
	string,
	{ data: any; timestamp: number; ttl: number }
>();
const requestThrottle = new Map<string, number>();
const rateLimitBackoff = new Map<string, number>();

// Configuration
const CACHE_TTL = {
	'/api/notifications/unread-count': 30000, // 30 seconds
	'/api/notifications': 60000, // 1 minute
	'/api/transactions': 30000, // 30 seconds
	'/api/budgets': 60000, // 1 minute
	'/api/goals': 60000, // 1 minute
	default: 10000, // 10 seconds
};

const THROTTLE_DELAY = __DEV__ ? 1000 : 1000; // 1 second delay in development to avoid rate limiting
const RATE_LIMIT_BACKOFF_BASE = __DEV__ ? 2000 : 5000; // 2 seconds in dev, 5 seconds in prod

// Request/Response interceptors
type RequestInterceptor = (
	url: string,
	options: RequestInit
) => Promise<{ url: string; options: RequestInit }>;
type ResponseInterceptor = (response: Response) => Promise<Response>;

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];

// Check if request is cached and still valid
function getCachedRequest<T>(endpoint: string): T | null {
	const cacheKey = endpoint;
	const cached = requestCache.get(cacheKey);

	if (cached) {
		const now = Date.now();
		const isExpired = now - cached.timestamp > cached.ttl;

		if (!isExpired) {
			console.log(`💾 [ApiService] Cache hit for: ${endpoint}`);
			return cached.data as T;
		} else {
			requestCache.delete(cacheKey);
		}
	}

	return null;
}

// Cache successful request response
function cacheRequest(endpoint: string, data: any): void {
	const cacheKey = endpoint;
	const ttl =
		CACHE_TTL[endpoint as keyof typeof CACHE_TTL] || CACHE_TTL.default;

	requestCache.set(cacheKey, {
		data,
		timestamp: Date.now(),
		ttl,
	});

	console.log(
		`💾 [ApiService] Cached response for: ${endpoint} (TTL: ${ttl}ms)`
	);
}

// Check if request should be throttled
function shouldThrottleRequest(endpoint: string): boolean {
	const now = Date.now();
	const lastRequest = requestThrottle.get(endpoint);

	if (lastRequest && now - lastRequest < THROTTLE_DELAY) {
		console.log(`⏳ [ApiService] Throttling request: ${endpoint}`);
		return true;
	}

	requestThrottle.set(endpoint, now);
	return false;
}

// Check if endpoint is in rate limit backoff
function isRateLimited(endpoint: string): boolean {
	const backoffUntil = rateLimitBackoff.get(endpoint);
	if (backoffUntil && Date.now() < backoffUntil) {
		console.log(
			`🚫 [ApiService] Rate limited for: ${endpoint} (backoff until: ${new Date(
				backoffUntil
			).toISOString()})`
		);
		return true;
	}
	return false;
}

// Set rate limit backoff
function setRateLimitBackoff(
	endpoint: string,
	backoffMs: number = RATE_LIMIT_BACKOFF_BASE
): void {
	const backoffUntil = Date.now() + backoffMs;
	rateLimitBackoff.set(endpoint, backoffUntil);
	console.log(
		`🚫 [ApiService] Rate limit backoff set for: ${endpoint} (${backoffMs}ms)`
	);
}

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
	maxRetries: number = 2,
	endpoint?: string
): Promise<T> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error: any) {
			lastError = error;

			// Handle 429 rate limit errors with backoff
			if (error?.response?.status === 429 || error?.status === 429) {
				if (endpoint) {
					// Set exponential backoff for this endpoint
					const backoffMs = RATE_LIMIT_BACKOFF_BASE * Math.pow(2, attempt);
					setRateLimitBackoff(endpoint, backoffMs);
				}
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
	status?: number;
	statusText?: string;
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

	// Check if endpoint requires HMAC signing
	private static requiresHMACSigning(endpoint: string): boolean {
		const hmacEndpoints = [
			'/api/budgets',
			'/api/budgets/',
			'/api/goals',
			'/api/goals/',
		];

		return hmacEndpoints.some((hmacEndpoint) =>
			endpoint.startsWith(hmacEndpoint)
		);
	}

	// Add HMAC signature to headers if required
	private static async addHMACSignatureIfRequired(
		endpoint: string,
		method: string,
		body: any,
		headers: Record<string, string>
	): Promise<{ headers: Record<string, string>; bodyString: string | null }> {
		// Determine if this request has a body
		const hasBody = body !== undefined && body !== null;

		if (!this.requiresHMACSigning(endpoint)) {
			return {
				headers,
				bodyString: hasBody
					? typeof body === 'string'
						? body
						: JSON.stringify(body)
					: null,
			};
		}

		try {
			const hmacService = getHMACService();

			console.log('🔐 [ApiService] HMAC signing process starting...');
			console.log('🔐 [ApiService] Has body:', hasBody);
			console.log('🔐 [ApiService] Original body:', body);
			console.log('🔐 [ApiService] Body type:', typeof body);

			// For bodyless requests, bodyString will be empty string for signing
			// but we return null to indicate no body should be sent in fetch
			const bodyString = hasBody
				? typeof body === 'string'
					? body
					: stableStringify(body)
				: null;

			console.log('🔐 [ApiService] HMAC Debug - Body string:', bodyString);
			console.log('🔐 [ApiService] HMAC Debug - Method:', method);
			console.log('🔐 [ApiService] HMAC Debug - Endpoint:', endpoint);

			const signedHeaders = hmacService.signRequestHeaders(
				body,
				method,
				endpoint,
				headers
			);

			console.log('🔐 [ApiService] HMAC signing completed for:', endpoint);
			console.log(
				'🔐 [ApiService] Final signed headers keys:',
				Object.keys(signedHeaders)
			);
			console.log(
				'🔐 [ApiService] Will send body:',
				bodyString === null ? 'NO BODY' : `"${bodyString.substring(0, 100)}..."`
			);

			return { headers: signedHeaders, bodyString };
		} catch (error) {
			console.error('❌ [ApiService] Failed to add HMAC signature:', error);
			console.error('❌ [ApiService] Error details:', error);
			// Continue without HMAC signature - let the server handle the error
			return {
				headers,
				bodyString: hasBody
					? typeof body === 'string'
						? body
						: JSON.stringify(body)
					: null,
			};
		}
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
		options?: { retries?: number; useCache?: boolean; signal?: AbortSignal }
	): Promise<ApiResponse<T>> {
		const { retries = 2, useCache = true, signal } = options || {};

		// Check if offline
		if (!this.isOnline()) {
			throw new ApiError('No internet connection', ApiErrorType.OFFLINE_ERROR);
		}

		// Check cache first
		if (useCache) {
			const cached = getCachedRequest<ApiResponse<T>>(endpoint);
			if (cached) {
				return cached;
			}
		}

		try {
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

			// API logging: Keep essential request info
			console.log(`📡 GET: ${endpoint}`);

			// Use RequestManager for intelligent request handling
			const data = await RequestManager.request<T>('GET', url, {
				headers,
				...(signal && { signal }),
			});

			const result: ApiResponse<T> = {
				success: true,
				data,
			};

			// Cache successful response
			if (useCache) {
				cacheRequest(endpoint, result);
			}

			// Demo logging: Keep essential success info
			console.log(`✅ GET: ${endpoint} (200)`);

			return result;
		} catch (error: any) {
			// Handle errors from RequestManager
			if (error instanceof ApiError) {
				throw error;
			}

			throw new ApiError(
				error.message || 'Network error',
				ApiErrorType.NETWORK_ERROR
			);
		}
	}

	static async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
		// Check if offline
		if (!this.isOnline()) {
			throw new ApiError('No internet connection', ApiErrorType.OFFLINE_ERROR);
		}

		// Create a unique key for deduplication (use stable stringify to prevent key drift)
		const bodyHash = stableStringify(body).slice(0, 50);
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

					// Add Firebase ID token for write operations
					if (this.requiresHMACSigning(endpoint)) {
						const auth = (await import('@react-native-firebase/auth')).default;
						const currentUser = auth().currentUser;
						if (currentUser) {
							try {
								const idToken = await currentUser.getIdToken();
								headers['Authorization'] = `Bearer ${idToken}`;
								console.log(
									'🔐 [ApiService] Added Firebase ID token for write operation'
								);
							} catch (tokenError) {
								console.warn(
									'⚠️ [ApiService] Failed to get Firebase ID token:',
									tokenError
								);
							}
						}
					}
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

				// Add HMAC signature if required
				const { headers: signedHeaders, bodyString } =
					await this.addHMACSignatureIfRequired(
						endpoint,
						'POST',
						body,
						headers
					);

				const url = `${API_BASE_URL}${endpoint}`;

				console.log('🔍 [ApiService] POST request details:', {
					url,
					endpoint,
					headers: {
						'x-firebase-uid':
							signedHeaders['x-firebase-uid']?.substring(0, 8) + '...',
					},
				});

				const response = await fetch(url, {
					method: 'POST',
					headers: signedHeaders,
					body: bodyString,
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

						// Log full debug data if present (HMAC debugging)
						if (data.debug) {
							console.log('🐛 [ApiService] Server Debug Info:', data.debug);
						}

						// Log full error response for debugging
						if (!response.ok) {
							console.log(
								'🔍 [ApiService] Full error response:',
								JSON.stringify(data, null, 2)
							);
						}
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

				// API logging: Success response
				console.log(`✅ [ApiService] POST: ${endpoint} (${response.status})`);

				// Clear cache by prefix after successful POST (resource created)
				this.clearCacheByPrefix(endpoint);

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

				// Add Firebase ID token for write operations
				if (this.requiresHMACSigning(endpoint)) {
					const auth = (await import('@react-native-firebase/auth')).default;
					const currentUser = auth().currentUser;
					if (currentUser) {
						try {
							const idToken = await currentUser.getIdToken();
							headers['Authorization'] = `Bearer ${idToken}`;
							console.log(
								'🔐 [ApiService] Added Firebase ID token for write operation'
							);
						} catch (tokenError) {
							console.warn(
								'⚠️ [ApiService] Failed to get Firebase ID token:',
								tokenError
							);
						}
					}
				}
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

			// Add HMAC signature if required
			const { headers: signedHeaders, bodyString } =
				await this.addHMACSignatureIfRequired(endpoint, 'PUT', body, headers);

			const url = `${API_BASE_URL}${endpoint}`;

			// Comprehensive request debugging
			console.log(`📝 PUT: ${endpoint}`);
			console.log('📝 [PUT] Complete request details:');
			console.log('  🌐 URL:', url);
			console.log('  🔧 Method: PUT');
			console.log('  📋 Headers:');
			Object.entries(signedHeaders).forEach(([key, value]) => {
				if (
					key.toLowerCase().includes('signature') ||
					key.toLowerCase().includes('authorization')
				) {
					console.log(`    ${key}: ${value.substring(0, 20)}...`);
				} else if (key === 'x-hmac-signature') {
					console.log(`    ${key}: ${value.substring(0, 30)}...`);
				} else {
					console.log(`    ${key}: ${value}`);
				}
			});
			console.log('  📦 Body string:', bodyString);
			console.log('  📦 Body string length:', bodyString.length);

			const response = await fetch(url, {
				method: 'PUT',
				headers: signedHeaders,
				body: bodyString,
			});

			console.log('📝 [PUT] Response received:');
			console.log('  📊 Status:', response.status);
			console.log('  📊 Status Text:', response.statusText);
			console.log('  ✅ OK:', response.ok);
			console.log('  🌐 Response URL:', response.url);

			// Check if response is JSON before parsing
			const contentType = response.headers.get('content-type');
			let data: any;

			console.log('📝 [PUT] Response content type:', contentType);
			console.log('📝 [PUT] Response headers:');
			response.headers.forEach((value, key) => {
				console.log(`  ${key}: ${value}`);
			});

			if (contentType && contentType.includes('application/json')) {
				try {
					data = await response.json();
					console.log('📝 [PUT] JSON response data:', data);
				} catch (parseError) {
					console.error('❌ [PUT] JSON parse error:', parseError);
					const textResponse = await response.text();
					console.error('❌ [PUT] Raw response text:', textResponse);
					return {
						success: false,
						error: 'Invalid JSON response from server',
						rawResponse: textResponse,
					};
				}
			} else {
				// Handle non-JSON responses
				const textResponse = await response.text();
				console.log('📝 [PUT] Non-JSON response:', textResponse);

				if (!response.ok) {
					console.error('❌ [PUT] Non-JSON error response:', {
						status: response.status,
						statusText: response.statusText,
						text: textResponse,
					});
					return {
						success: false,
						error: `HTTP error! status: ${response.status}`,
						rawResponse: textResponse,
					};
				}

				return {
					success: false,
					error: 'Server returned non-JSON response',
					rawResponse: textResponse,
				};
			}

			if (!response.ok) {
				console.error('❌ [PUT] Request failed:');
				console.error('  📊 Status:', response.status);
				console.error('  📊 Status Text:', response.statusText);
				console.error('  📦 Response Data:', data);

				return {
					success: false,
					error:
						data?.error ||
						data?.message ||
						`HTTP error! status: ${response.status}`,
					data,
					status: response.status,
					statusText: response.statusText,
				};
			}

			// API logging: Success response
			console.log(`✅ [PUT] Success: ${endpoint} (${response.status})`);
			console.log('✅ [PUT] Response data:', data);

			// Clear cache by prefix to handle all variants
			const baseEndpoint = endpoint.replace(/\/[^/]+$/, '');
			this.clearCacheByPrefix(baseEndpoint);

			// Also clear the specific item cache if different
			if (baseEndpoint !== endpoint) {
				this.clearCache(endpoint);
			}

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

			// API logging: Keep essential request info
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

			// API logging: Success response
			console.log(`✅ PATCH: ${endpoint} (${response.status})`);

			// Clear cache by prefix to handle all variants
			const baseEndpoint = endpoint.replace(/\/[^/]+$/, '');
			this.clearCacheByPrefix(baseEndpoint);

			// Also clear the specific item cache if different
			if (baseEndpoint !== endpoint) {
				this.clearCache(endpoint);
			}

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

				// Add Firebase ID token for write operations
				if (this.requiresHMACSigning(endpoint)) {
					const auth = (await import('@react-native-firebase/auth')).default;
					const currentUser = auth().currentUser;
					if (currentUser) {
						try {
							const idToken = await currentUser.getIdToken();
							headers['Authorization'] = `Bearer ${idToken}`;
							console.log(
								'🔐 [ApiService] Added Firebase ID token for write operation'
							);
						} catch (tokenError) {
							console.warn(
								'⚠️ [ApiService] Failed to get Firebase ID token:',
								tokenError
							);
						}
					}
				}
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

			// Add HMAC signature if required (pass null for body since DELETE is bodyless)
			const { headers: signedHeaders, bodyString } =
				await this.addHMACSignatureIfRequired(
					endpoint,
					'DELETE',
					null,
					headers
				);

			const url = `${API_BASE_URL}${endpoint}`;

			// Determine if we have a body to send
			const hasBody = bodyString !== null;

			// IMPORTANT: Keep Content-Type for DELETE (server policy requires it)
			// But we still won't send a body - Content-Length: 0 prevents JSON parsing
			const requestHeaders: Record<string, string> = {
				...signedHeaders,
				// Ensure Content-Type is set even for bodyless DELETE (server requires it)
				'Content-Type': 'application/json',
			};

			// API logging: Request details
			console.log(`🗑️ [ApiService] Sending DELETE to ${url}`);
			console.log(`🔑 [ApiService] DELETE has body:`, hasBody);
			console.log(
				`🔑 [ApiService] DELETE headers:`,
				Object.keys(requestHeaders)
			);

			let response: Response;
			try {
				// Build fetch options - omit body property entirely if bodyless
				const fetchOptions: RequestInit = {
					method: 'DELETE',
					headers: requestHeaders,
				};

				// CRITICAL: Only include body if we actually have one
				// DELETE typically has no body, so this will be skipped
				if (hasBody && bodyString) {
					fetchOptions.body = bodyString;
					console.log(
						`🔑 [ApiService] Including body in DELETE:`,
						bodyString.substring(0, 100)
					);
				} else {
					console.log(`🔑 [ApiService] DELETE is bodyless (Content-Length: 0)`);
				}

				response = await fetch(url, fetchOptions);
			} catch (networkError) {
				console.error('❌ [ApiService] DELETE network error:', networkError);
				throw networkError;
			}

			// CRITICAL: Log response immediately
			console.log(
				`📥 [ApiService] DELETE response: ${response.status} ${response.statusText}`
			);

			// Handle 204 No Content (successful delete with no body)
			if (response.status === 204) {
				console.log(`✅ [ApiService] DELETE successful (204 No Content)`);
				// Skip to cache clearing
				const baseEndpoint = endpoint.replace(/\/[^/]+$/, '');
				this.clearCacheByPrefix(baseEndpoint);
				if (baseEndpoint !== endpoint) {
					this.clearCache(endpoint);
				}
				return { success: true, data: {} as T };
			}

			// Check if response is JSON before parsing
			const contentType = response.headers.get('content-type');
			let data: any;

			if (contentType && contentType.includes('application/json')) {
				try {
					data = await response.json();
				} catch (parseError) {
					console.error('❌ [ApiService] DELETE JSON parse error:', parseError);
					return {
						success: false,
						error: 'Invalid JSON response from server',
					};
				}
			} else {
				// Handle non-JSON responses (but not 204, already handled above)
				const textResponse = await response.text();
				console.log(
					`⚠️ [ApiService] DELETE non-JSON response: ${textResponse.substring(
						0,
						100
					)}`
				);

				if (!response.ok) {
					console.error(
						`❌ [ApiService] DELETE failed (${response.status}): ${textResponse}`
					);
					return {
						success: false,
						error: `HTTP ${response.status}: ${
							textResponse || response.statusText
						}`,
					};
				}

				// Success but no JSON body - treat as 200 OK
				data = {};
			}

			if (!response.ok) {
				const errorMsg = data.error || `HTTP error! status: ${response.status}`;
				console.error(
					`❌ [ApiService] DELETE failed (${response.status}): ${errorMsg}`
				);

				// Log response headers for debugging
				console.error('❌ [ApiService] DELETE failed - Response headers:', {
					'content-type': response.headers.get('content-type'),
					'content-length': response.headers.get('content-length'),
				});

				// Log full server response for debugging
				console.error(
					`🔍 [ApiService] DELETE failed - Full server response:`,
					data
				);

				// Log server debug info if available
				if (data?.debug) {
					console.error(`🔍 [ApiService] Server debug info:`, data.debug);
				}
				if (data?.stack) {
					console.error(`🔍 [ApiService] Server stack trace:`, data.stack);
				}

				return {
					success: false,
					error: errorMsg,
				};
			}

			// API logging: Success response
			console.log(`✅ [ApiService] DELETE successful (${response.status})`);
			console.log(`🔍 [DELETE] About to clear cache for endpoint: ${endpoint}`);

			// Clear cache by prefix to handle all variants
			const baseEndpoint = endpoint.replace(/\/[^/]+$/, '');
			console.log(
				`🔍 [DELETE] Base endpoint: ${baseEndpoint}, Original: ${endpoint}`
			);

			// Clear all caches starting with the base endpoint (e.g., /api/budgets, /api/budgets/123, etc.)
			this.clearCacheByPrefix(baseEndpoint);

			// Also clear the specific item cache if different
			if (baseEndpoint !== endpoint) {
				this.clearCache(endpoint);
			}

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

	/**
	 * Clear cache for a specific endpoint or all endpoints
	 */
	static clearCache(endpoint?: string): void {
		if (endpoint) {
			requestCache.delete(endpoint);
			console.log(`🗑️ [ApiService] Cache cleared for: ${endpoint}`);
		} else {
			requestCache.clear();
			console.log(`🗑️ [ApiService] All cache cleared`);
		}
	}

	/**
	 * Clear cache for all endpoints starting with a prefix
	 * Handles query strings: /api/budgets clears /api/budgets, /api/budgets?foo=bar, etc.
	 * Normalizes URLs to handle trailing slashes and different origins (staging/prod)
	 */
	static clearCacheByPrefix(prefix: string): void {
		let clearedCacheCount = 0;
		let clearedInflightCount = 0;
		const keysToDelete: string[] = [];

		// Normalize URL: extract pathname, strip trailing slashes
		const normalizeUrl = (url: string): string => {
			try {
				if (url.startsWith('http')) {
					const parsed = new URL(url);
					return parsed.pathname.replace(/\/+$/, '');
				}
				return url.replace(/\/+$/, '');
			} catch {
				return url.replace(/\/+$/, '');
			}
		};

		const normalizedPrefix = normalizeUrl(prefix);

		// Collect cache keys to delete (matches /api/budgets and /api/budgets?...)
		for (const key of requestCache.keys()) {
			const normalizedKey = normalizeUrl(key);
			if (normalizedKey.startsWith(normalizedPrefix)) {
				keysToDelete.push(key);
			}
		}

		// Delete cache entries
		for (const key of keysToDelete) {
			requestCache.delete(key);
			clearedCacheCount++;
		}

		// Clear inflight requests for this prefix
		// Inflight keys are like "GET:https://example.com/api/budgets:{}"
		for (const key of inflight.keys()) {
			const parts = key.split(':');
			if (parts.length >= 2) {
				const url = parts[1];
				const normalizedUrl = normalizeUrl(url);
				// Match normalized URLs and fallback to includes for safety
				if (
					normalizedUrl.startsWith(normalizedPrefix) ||
					url.includes(prefix)
				) {
					inflight.delete(key);
					clearedInflightCount++;
					console.log(
						`🧹 [ApiService] Cleared inflight: ${key.substring(0, 60)}...`
					);
				}
			}
		}

		console.log(
			`🗑️ [ApiService] Cleared ${clearedCacheCount} cache + ${clearedInflightCount} inflight with prefix: ${normalizedPrefix}`
		);
	}

	/**
	 * Clear rate limit backoff for a specific endpoint or all endpoints
	 */
	static clearRateLimit(endpoint?: string): void {
		if (endpoint) {
			rateLimitBackoff.delete(endpoint);
			console.log(`🚫 [ApiService] Rate limit cleared for: ${endpoint}`);
		} else {
			rateLimitBackoff.clear();
			console.log(`🚫 [ApiService] All rate limits cleared`);
		}
	}

	/**
	 * Clear all rate limits - useful for development
	 */
	static resetRateLimits(): void {
		rateLimitBackoff.clear();
		requestThrottle.clear();
		console.log(`🚫 [ApiService] All rate limits and throttles reset`);
	}

	/**
	 * Get cache statistics
	 */
	static getCacheStats(): { size: number; entries: string[] } {
		return {
			size: requestCache.size,
			entries: Array.from(requestCache.keys()),
		};
	}

	/**
	 * Force refresh data by bypassing cache
	 */
	static async getFresh<T>(
		endpoint: string,
		options?: { retries?: number; signal?: AbortSignal }
	): Promise<ApiResponse<T>> {
		return this.get<T>(endpoint, { ...options, useCache: false });
	}
}
