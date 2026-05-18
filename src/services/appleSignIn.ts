import { Platform } from 'react-native';
import { UnavailabilityError } from 'expo-modules-core';
import * as AppleAuthentication from 'expo-apple-authentication';
// Same native binding expo-apple-authentication uses (real module or JS stub).
import ExpoAppleAuthNative from 'expo-apple-authentication/build/ExpoAppleAuthentication';
import {
	AppleAuthProvider,
	FirebaseAuthTypes,
} from '@react-native-firebase/auth';
import * as Crypto from 'expo-crypto';

const OUTDATED_BUILD_MESSAGE =
	'Sign in with Apple is not in this app install. Delete the Brie app from your device/simulator, then install a fresh dev build (npx expo run:ios or eas build --profile development --platform ios).';

function generateRandomNonce(length = 32): string {
	const charset =
		'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._';
	const randomValues = Crypto.getRandomValues(new Uint8Array(length));
	let result = '';
	for (let i = 0; i < randomValues.length; i += 1) {
		result += charset[randomValues[i]! % charset.length];
	}
	return result;
}

async function sha256(input: string): Promise<string> {
	return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

/** Show Sign in with Apple on iOS whenever third-party sign-in (e.g. Google) is offered. */
export function isAppleSignInAvailable(): boolean {
	return Platform.OS === 'ios';
}

/** True when the installed binary includes the native Expo Apple Authentication module. */
export function isAppleSignInNativeModuleLinked(): boolean {
	return typeof ExpoAppleAuthNative.requestAsync === 'function';
}

export function isAppleSignInCancelled(error: unknown): boolean {
	const code = (error as { code?: string | number })?.code;
	return code === 'ERR_REQUEST_CANCELED';
}

export function getAppleSignInErrorMessage(error: unknown): string | null {
	if (isAppleSignInCancelled(error)) {
		return null;
	}

	if (error instanceof UnavailabilityError) {
		return OUTDATED_BUILD_MESSAGE;
	}

	const code = String((error as { code?: string | number })?.code ?? '');
	if (
		code === 'ERR_APPLE_AUTHENTICATION_UNAVAILABLE' ||
		code === 'APPLE_SIGNIN_UNAVAILABLE' ||
		code === 'APPLE_SIGNIN_NATIVE_MODULE_MISSING'
	) {
		if (!isAppleSignInNativeModuleLinked()) {
			return OUTDATED_BUILD_MESSAGE;
		}
		return 'Sign in with Apple is not available on this device.';
	}

	const message = (error as { message?: string })?.message ?? '';
	if (message.includes('error 1000')) {
		return 'Sign in with Apple could not start. Try a physical device, or rebuild the iOS app.';
	}

	return null;
}

export async function getAppleAuthCredential(): Promise<{
	credential: FirebaseAuthTypes.AuthCredential;
	displayName?: string;
	email?: string | null;
}> {
	if (Platform.OS !== 'ios') {
		throw Object.assign(new Error('Apple Sign-In is only available on iOS.'), {
			code: 'APPLE_SIGNIN_UNAVAILABLE',
		});
	}

	if (!isAppleSignInNativeModuleLinked()) {
		throw Object.assign(new Error(OUTDATED_BUILD_MESSAGE), {
			code: 'APPLE_SIGNIN_NATIVE_MODULE_MISSING',
		});
	}

	const available = await AppleAuthentication.isAvailableAsync();
	if (!available) {
		throw Object.assign(new Error(OUTDATED_BUILD_MESSAGE), {
			code: 'ERR_APPLE_AUTHENTICATION_UNAVAILABLE',
		});
	}

	const rawNonce = generateRandomNonce();
	const hashedNonce = await sha256(rawNonce);

	try {
		const response = await AppleAuthentication.signInAsync({
			requestedScopes: [
				AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
				AppleAuthentication.AppleAuthenticationScope.EMAIL,
			],
			nonce: hashedNonce,
		});

		const { identityToken, fullName, email } = response;
		if (!identityToken) {
			throw Object.assign(
				new Error('Apple Sign-In failed — no identity token returned.'),
				{ code: 'APPLE_SIGNIN_NO_TOKEN' }
			);
		}

		const nameParts = [fullName?.givenName, fullName?.familyName].filter(
			Boolean
		);
		const displayName =
			nameParts.length > 0 ? nameParts.join(' ') : undefined;

		return {
			credential: AppleAuthProvider.credential(identityToken, rawNonce),
			displayName,
			email: email ?? null,
		};
	} catch (error) {
		if (error instanceof UnavailabilityError) {
			throw Object.assign(new Error(OUTDATED_BUILD_MESSAGE), {
				code: 'APPLE_SIGNIN_NATIVE_MODULE_MISSING',
			});
		}
		throw error;
	}
}
