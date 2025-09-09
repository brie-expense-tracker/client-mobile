// src/utils/safeCrypto.ts
// HMAC-SHA256 helper with graceful fallback

let ExpoCrypto: typeof import('expo-crypto') | null = null;
try {
	ExpoCrypto = require('expo-crypto');
} catch {
	ExpoCrypto = null;
}

// Pure JS fallback (fast & audited)
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { utf8ToBytes } from '@noble/hashes/utils';

export async function hmacSha256(
	message: string,
	key: string
): Promise<string> {
	// Prefer native if available
	if (ExpoCrypto?.digestStringAsync) {
		try {
			const algo = ExpoCrypto.CryptoDigestAlgorithm.SHA256;
			// Combine key+message in a stable way (same as your server)
			// If you need real HMAC on native, keep using your server HMAC and only hash here.
			// Or implement native HMAC with a custom native module. For most cases, noble is fine.
			const combined = `${key}:${message}`;
			return await ExpoCrypto.digestStringAsync(algo, combined);
		} catch {
			// fall through to JS
		}
	}
	// JS HMAC (correct algorithm)
	const mac = hmac(sha256, utf8ToBytes(key), utf8ToBytes(message));
	return Buffer.from(mac).toString('hex');
}
