/**
 * Google Sign-In configuration for Firebase Auth.
 * Client IDs: app.config extra (from google-services.json) > env vars > fallback from repo file.
 */
import Constants from 'expo-constants';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const extra = Constants.expoConfig?.extra as
	| { googleWebClientId?: string; googleIosClientId?: string }
	| undefined;

// Fallbacks from google-services.json so dev builds work when extra isn't populated
const FALLBACK_WEB_CLIENT_ID =
	'807336746313-5spjml5hicchm614hbvk67csns8idd66.apps.googleusercontent.com';
const FALLBACK_IOS_CLIENT_ID =
	'807336746313-khft9ts8r9li4cvme5bpjnhr1tdou3je.apps.googleusercontent.com';

const WEB_CLIENT_ID =
	process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
	extra?.googleWebClientId ||
	FALLBACK_WEB_CLIENT_ID;

const IOS_CLIENT_ID =
	process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
	extra?.googleIosClientId ||
	FALLBACK_IOS_CLIENT_ID;

let configured = false;

export function configureGoogleSignIn(): void {
	if (configured) return;
	try {
		GoogleSignin.configure({
			webClientId: WEB_CLIENT_ID || undefined,
			iosClientId: IOS_CLIENT_ID,
			offlineAccess: true,
		});
		configured = true;
	} catch {
		// No-op if config fails (e.g. missing native module)
	}
}
