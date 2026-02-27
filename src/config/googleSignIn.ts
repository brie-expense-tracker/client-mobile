/**
 * Google Sign-In configuration for Firebase Auth.
 * Call configureGoogleSignIn() before using GoogleSignin (e.g. on app init and before sign-in flows).
 */
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const WEB_CLIENT_ID =
	process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

let configured = false;

export function configureGoogleSignIn(): void {
	if (configured) return;
	try {
		GoogleSignin.configure({
			webClientId: WEB_CLIENT_ID || undefined,
			offlineAccess: true,
		});
		configured = true;
	} catch {
		// No-op if config fails (e.g. missing native module)
	}
}
