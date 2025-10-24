import auth from '@react-native-firebase/auth';

/**
 * Authentication service for Firebase Bearer tokens
 * Replaces UID header authentication with proper JWT tokens
 */
export class AuthService {
	private static instance: AuthService;
	private cachedToken: string | null = null;
	private tokenExpiry: number = 0;

	static getInstance(): AuthService {
		if (!AuthService.instance) {
			AuthService.instance = new AuthService();
		}
		return AuthService.instance;
	}

	/**
	 * Get Firebase ID token for API authentication
	 * Caches token and refreshes when needed
	 */
	async getAuthToken(): Promise<string> {
		try {
			const user = auth().currentUser;

			if (!user) {
				throw new Error('No authenticated user found');
			}

			// Check if we have a valid cached token
			const now = Date.now();
			if (this.cachedToken && this.tokenExpiry > now + 60000) {
				// 1 minute buffer
				console.log('[AuthService] Using cached token');
				return this.cachedToken;
			}

			console.log('[AuthService] Getting fresh Firebase ID token');

			// Get fresh token from Firebase
			const token = await user.getIdToken(true); // Force refresh

			// Cache the token with expiry (Firebase tokens expire in 1 hour)
			this.cachedToken = token;
			this.tokenExpiry = now + 55 * 60 * 1000; // 55 minutes to be safe

			console.log('[AuthService] Token obtained and cached');
			return token;
		} catch (error) {
			console.error('[AuthService] Error getting auth token:', error);
			throw new Error('Failed to get authentication token');
		}
	}

	/**
	 * Get authentication headers for API requests
	 */
	async getAuthHeaders(): Promise<Record<string, string>> {
		try {
			const token = await this.getAuthToken();

			return {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			};
		} catch (error) {
			console.error('[AuthService] Error getting auth headers:', error);
			throw error;
		}
	}

	/**
	 * Clear cached token (call on logout)
	 */
	clearToken(): void {
		this.cachedToken = null;
		this.tokenExpiry = 0;
		console.log('[AuthService] Token cache cleared');
	}

	/**
	 * Check if user is authenticated
	 */
	isAuthenticated(): boolean {
		return !!auth().currentUser;
	}

	/**
	 * Get current user UID (for compatibility)
	 */
	async getCurrentUserUID(): Promise<string | null> {
		try {
			const user = auth().currentUser;
			return user?.uid || null;
		} catch (error) {
			console.error('[AuthService] Error getting user UID:', error);
			return null;
		}
	}
}

// Export singleton instance
export const authService = AuthService.getInstance();
