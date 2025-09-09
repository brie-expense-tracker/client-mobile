import { signRequestHeaders } from './hmacSigning';
import { getApiBaseUrl } from '../config/environment';

export interface SignedApiRequestOptions {
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
	path: string;
	body?: any;
	headers?: Record<string, string>;
	requireSignature?: boolean;
}

export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
	code?: string;
}

export class SignedApiClient {
	private baseUrl: string;
	private defaultHeaders: Record<string, string>;

	constructor(baseUrl?: string) {
		this.baseUrl = baseUrl || getApiBaseUrl();
		this.defaultHeaders = {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		};
	}

	/**
	 * Make a signed API request
	 */
	async request<T = any>(
		options: SignedApiRequestOptions
	): Promise<ApiResponse<T>> {
		const {
			method,
			path,
			body,
			headers = {},
			requireSignature = true,
		} = options;

		try {
			// Prepare headers
			let requestHeaders = {
				...this.defaultHeaders,
				...headers,
			};

			// Add HMAC signature if required
			if (
				requireSignature &&
				(method === 'POST' ||
					method === 'PUT' ||
					method === 'DELETE' ||
					method === 'PATCH')
			) {
				requestHeaders = signRequestHeaders(
					body || {},
					method,
					path,
					requestHeaders
				);
			}

			// Make the request
			const response = await fetch(`${this.baseUrl}${path}`, {
				method,
				headers: requestHeaders,
				body: body ? JSON.stringify(body) : undefined,
			});

			// Parse response
			const responseData = await response.json();

			if (!response.ok) {
				return {
					success: false,
					error: responseData.error || 'Request failed',
					message: responseData.message || 'An error occurred',
					code: responseData.code,
				};
			}

			return {
				success: true,
				data: responseData.data || responseData,
			};
		} catch (error) {
			console.error('API request failed:', error);
			return {
				success: false,
				error: 'Network error',
				message:
					error instanceof Error ? error.message : 'Unknown error occurred',
			};
		}
	}

	/**
	 * Make a GET request
	 */
	async get<T = any>(
		path: string,
		headers?: Record<string, string>
	): Promise<ApiResponse<T>> {
		return this.request<T>({
			method: 'GET',
			path,
			headers,
			requireSignature: false, // GET requests typically don't need signatures
		});
	}

	/**
	 * Make a POST request
	 */
	async post<T = any>(
		path: string,
		body?: any,
		headers?: Record<string, string>,
		requireSignature: boolean = true
	): Promise<ApiResponse<T>> {
		return this.request<T>({
			method: 'POST',
			path,
			body,
			headers,
			requireSignature,
		});
	}

	/**
	 * Make a PUT request
	 */
	async put<T = any>(
		path: string,
		body?: any,
		headers?: Record<string, string>,
		requireSignature: boolean = true
	): Promise<ApiResponse<T>> {
		return this.request<T>({
			method: 'PUT',
			path,
			body,
			headers,
			requireSignature,
		});
	}

	/**
	 * Make a DELETE request
	 */
	async delete<T = any>(
		path: string,
		body?: any,
		headers?: Record<string, string>,
		requireSignature: boolean = true
	): Promise<ApiResponse<T>> {
		return this.request<T>({
			method: 'DELETE',
			path,
			body,
			headers,
			requireSignature,
		});
	}

	/**
	 * Make a PATCH request
	 */
	async patch<T = any>(
		path: string,
		body?: any,
		headers?: Record<string, string>,
		requireSignature: boolean = true
	): Promise<ApiResponse<T>> {
		return this.request<T>({
			method: 'PATCH',
			path,
			body,
			headers,
			requireSignature,
		});
	}

	/**
	 * Set default headers
	 */
	setDefaultHeaders(headers: Record<string, string>): void {
		this.defaultHeaders = {
			...this.defaultHeaders,
			...headers,
		};
	}

	/**
	 * Set authentication header
	 */
	setAuthHeader(authHeader: string): void {
		this.defaultHeaders['Authorization'] = authHeader;
	}

	/**
	 * Set Firebase UID header
	 */
	setFirebaseUID(firebaseUID: string): void {
		this.defaultHeaders['x-firebase-uid'] = firebaseUID;
	}

	/**
	 * Set request ID header
	 */
	setRequestId(requestId: string): void {
		this.defaultHeaders['x-request-id'] = requestId;
	}
}

// Singleton instance
let apiClient: SignedApiClient | null = null;

export function getSignedApiClient(): SignedApiClient {
	if (!apiClient) {
		apiClient = new SignedApiClient();
	}
	return apiClient;
}

// Convenience functions
export async function signedGet<T = any>(
	path: string,
	headers?: Record<string, string>
): Promise<ApiResponse<T>> {
	return getSignedApiClient().get<T>(path, headers);
}

export async function signedPost<T = any>(
	path: string,
	body?: any,
	headers?: Record<string, string>,
	requireSignature: boolean = true
): Promise<ApiResponse<T>> {
	return getSignedApiClient().post<T>(path, body, headers, requireSignature);
}

export async function signedPut<T = any>(
	path: string,
	body?: any,
	headers?: Record<string, string>,
	requireSignature: boolean = true
): Promise<ApiResponse<T>> {
	return getSignedApiClient().put<T>(path, body, headers, requireSignature);
}

export async function signedDelete<T = any>(
	path: string,
	body?: any,
	headers?: Record<string, string>,
	requireSignature: boolean = true
): Promise<ApiResponse<T>> {
	return getSignedApiClient().delete<T>(path, body, headers, requireSignature);
}

export async function signedPatch<T = any>(
	path: string,
	body?: any,
	headers?: Record<string, string>,
	requireSignature: boolean = true
): Promise<ApiResponse<T>> {
	return getSignedApiClient().patch<T>(path, body, headers, requireSignature);
}
