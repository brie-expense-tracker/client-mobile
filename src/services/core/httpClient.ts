// httpClient.ts - Pure leaf module for HTTP requests with Firebase auth
// No imports from apiService or requestManager to break the cycle
import { getApp } from '@react-native-firebase/app';
import { getAuth, getIdToken } from '@react-native-firebase/auth';
import { API_BASE_URL } from '../../config/api';
import { createLogger } from '../../utils/sublogger';

const httpLog = createLogger('HttpClient');

/**
 * Get Firebase ID token for authenticated requests
 */
async function getBearer(): Promise<string | null> {
	try {
		const auth = getAuth(getApp());
		const user = auth.currentUser;

		if (!user) {
			httpLog.debug('No authenticated user found');
			return null;
		}

		const token = await getIdToken(user);
		return token;
	} catch (error) {
		httpLog.warn('Failed to get Firebase token', error);
		return null;
	}
}

/**
 * Get Firebase UID for x-firebase-uid header
 */
function getFirebaseUID(): string | null {
	try {
		const auth = getAuth(getApp());
		const user = auth.currentUser;
		return user?.uid || null;
	} catch {
		return null;
	}
}

/**
 * Get base auth headers (x-firebase-uid)
 * Does not throw if user is not authenticated
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	};

	const uid = getFirebaseUID();
	if (uid) {
		headers['x-firebase-uid'] = uid;
		httpLog.debug('Auth headers prepared', {
			uid: uid.substring(0, 8) + '...',
		});
	} else {
		httpLog.debug('No UID available - user not authenticated');
	}

	return headers;
}

/**
 * Perform a fetch with Firebase authentication
 * Adds x-firebase-uid header automatically
 */
export async function httpFetch(
	path: string,
	init: RequestInit = {}
): Promise<Response> {
	const headers = new Headers(await getAuthHeaders());

	// Merge with provided headers (provided headers take precedence)
	if (init.headers) {
		const providedHeaders = new Headers(init.headers);
		providedHeaders.forEach((value, key) => {
			headers.set(key, value);
		});
	}

	const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

	httpLog.debug(`${init.method || 'GET'} ${url}`);

	try {
		const response = await fetch(url, {
			...init,
			headers,
		});

		if (!response.ok) {
			httpLog.warn(`Response ${response.status} for ${path}`);
		}

		return response;
	} catch (error) {
		httpLog.error(`Fetch error for ${path}`, error);
		throw error;
	}
}

/**
 * Perform a fetch with Firebase authentication and automatic token refresh on 401
 */
export async function httpFetchWithRefresh(
	path: string,
	init: RequestInit = {}
): Promise<Response> {
	// First attempt
	let response = await httpFetch(path, init);

	// If 401, try to refresh token and retry once
	if (response.status === 401) {
		httpLog.info('401 detected, attempting token refresh');

		const auth = getAuth(getApp());
		const user = auth.currentUser;

		if (user) {
			try {
				// Force refresh token
				const freshToken = await getIdToken(user, true);
				if (freshToken) {
					// Retry with fresh token
					const headers = new Headers(await getAuthHeaders());
					headers.set('Authorization', `Bearer ${freshToken}`);

					// Merge with provided headers
					if (init.headers) {
						const providedHeaders = new Headers(init.headers);
						providedHeaders.forEach((value, key) => {
							headers.set(key, value);
						});
					}

					const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

					response = await fetch(url, {
						...init,
						headers,
					});

					httpLog.info('Retry after refresh', { status: response.status });
				}
			} catch (tokenError) {
				httpLog.warn('Failed to refresh token', tokenError);
				// Return original 401 response
			}
		}
	}

	return response;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
	try {
		const auth = getAuth(getApp());
		return !!auth.currentUser;
	} catch {
		return false;
	}
}
