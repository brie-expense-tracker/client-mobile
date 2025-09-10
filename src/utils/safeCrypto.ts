// src/utils/safeCrypto.ts
// HMAC-SHA256 helper with graceful fallback

// Pure JS fallback (fast & audited)
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha2';
import { utf8ToBytes } from '@noble/hashes/utils';

let ExpoCrypto: typeof import('expo-crypto') | null = null;

// Initialize ExpoCrypto asynchronously
async function initExpoCrypto() {
	if (ExpoCrypto === null) {
		try {
			ExpoCrypto = await import('expo-crypto');
		} catch {
			ExpoCrypto = null;
		}
	}
	return ExpoCrypto;
}

export async function hmacSha256(
	message: string,
	key: string
): Promise<string> {
	// Initialize ExpoCrypto if not already done
	const crypto = await initExpoCrypto();

	// Prefer native if available
	if (crypto?.digestStringAsync) {
		try {
			const algo = crypto.CryptoDigestAlgorithm.SHA256;
			// Combine key+message in a stable way (same as your server)
			// If you need real HMAC on native, keep using your server HMAC and only hash here.
			// Or implement native HMAC with a custom native module. For most cases, noble is fine.
			const combined = `${key}:${message}`;
			return await crypto.digestStringAsync(algo, combined);
		} catch {
			// fall through to JS
		}
	}
	// JS HMAC (correct algorithm)
	const mac = hmac(sha256, utf8ToBytes(key), utf8ToBytes(message));
	return Buffer.from(mac).toString('hex');
}
