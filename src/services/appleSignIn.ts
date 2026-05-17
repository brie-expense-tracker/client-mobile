import { Platform } from 'react-native';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import {
	AppleAuthProvider,
	FirebaseAuthTypes,
} from '@react-native-firebase/auth';
import * as Crypto from 'expo-crypto';

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

export function isAppleSignInAvailable(): boolean {
	return Platform.OS === 'ios' && appleAuth.isSupported;
}

export function isAppleSignInCancelled(error: unknown): boolean {
	const code = (error as { code?: string | number })?.code;
	return code === appleAuth.Error.CANCELED || code === '1001';
}

export async function getAppleAuthCredential(): Promise<{
	credential: FirebaseAuthTypes.AuthCredential;
	displayName?: string;
	email?: string | null;
}> {
	const rawNonce = generateRandomNonce();
	const hashedNonce = await sha256(rawNonce);

	const response = await appleAuth.performRequest({
		requestedOperation: appleAuth.Operation.LOGIN,
		requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
		nonce: hashedNonce,
	});

	const { identityToken, fullName, email } = response;
	if (!identityToken) {
		throw Object.assign(
			new Error('Apple Sign-In failed — no identity token returned.'),
			{ code: 'APPLE_SIGNIN_NO_TOKEN' }
		);
	}

	const nameParts = [fullName?.givenName, fullName?.familyName].filter(Boolean);
	const displayName =
		nameParts.length > 0 ? nameParts.join(' ') : undefined;

	return {
		credential: AppleAuthProvider.credential(identityToken, rawNonce),
		displayName,
		email: email ?? null,
	};
}
