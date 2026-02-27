/**
 * Auth service: token cache clearing for logout.
 * Used by AuthContext to clear cached auth token on sign out.
 */

export const authService = {
	clearToken(): void {
		try {
			// Clear any in-memory or persisted token cache.
			// AsyncStorage/SecureStore clearing is done in AuthContext (UID_KEY, etc.).
			// This is a no-op placeholder for any extra token cache this module would own.
			if (typeof global !== 'undefined' && (global as any).__authTokenCache) {
				(global as any).__authTokenCache = undefined;
			}
		} catch {
			// Ignore
		}
	},
};
