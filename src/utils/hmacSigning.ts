import hmacSHA256 from 'crypto-js/hmac-sha256';
import encHex from 'crypto-js/enc-hex';

export interface SignedRequest {
	timestamp: number;
	nonce: string;
	signature: string;
	body: string;
}

export interface RequestSigningOptions {
	secretKey: string;
	algorithm?: string;
	timestampTolerance?: number; // in seconds
}

export class HMACSigningService {
	private secretKey: string;
	private algorithm: string;
	private timestampTolerance: number;

	constructor(options: RequestSigningOptions) {
		this.secretKey = options.secretKey;
		this.algorithm = options.algorithm || 'sha256';
		this.timestampTolerance = options.timestampTolerance || 300; // 5 minutes default
	}

	/**
	 * Normalize path: strip trailing slashes (but keep root "/")
	 * This ensures client and server sign the same canonical path
	 */
	private normalizePath(path: string): string {
		try {
			// Parse to extract just the pathname
			const url = new URL(path, 'http://localhost');
			// Strip trailing slashes, but keep root "/"
			const normalized = url.pathname.replace(/\/+$/, '') || '/';
			return normalized;
		} catch {
			// Fallback for relative paths
			return path.replace(/\/+$/, '') || '/';
		}
	}

	/**
	 * Generate a cryptographically secure nonce
	 */
	generateNonce(): string {
		const array = new Uint8Array(16);
		crypto.getRandomValues(array);
		return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
			''
		);
	}

	/**
	 * Create a signature for a request
	 */
	signRequest(
		timestamp: number,
		nonce: string,
		body: string,
		method: string,
		path: string
	): string {
		// Normalize the path to match server-side normalization
		const normalizedPath = this.normalizePath(path);

		// Build payload parts - CRITICAL: only include body if non-empty (no trailing dot)
		const parts = [timestamp, nonce, method.toUpperCase(), normalizedPath];
		if (body && body.length > 0) {
			parts.push(body);
		}
		const payload = parts.join('.');

		console.log('🔐 [HMAC] Debug - Full signing details:');
		console.log('  📅 Timestamp:', timestamp);
		console.log('  🎲 Nonce:', nonce);
		console.log('  🔧 Method:', method.toUpperCase());
		console.log('  🛣️  Original Path:', path);
		console.log('  🛣️  Normalized Path:', normalizedPath);
		console.log('  📦 Body length:', body.length);
		console.log('  📦 Body content:', body || '(empty)');
		console.log('  📦 Has body:', body && body.length > 0 ? 'YES' : 'NO');
		console.log('  🔗 Payload to sign:', payload);
		console.log(
			'  🔑 Secret key (first 8 chars):',
			this.secretKey.substring(0, 8) + '...'
		);
		console.log('  🔑 Secret key length:', this.secretKey.length);

		// Create HMAC signature using CryptoJS
		const hmac = hmacSHA256(payload, this.secretKey);
		const signature = hmac.toString(encHex);

		console.log('  ✅ Generated signature:', signature);
		console.log('  ✅ Signature length:', signature.length);

		return signature;
	}

	/**
	 * Create a signed request object
	 */
	createSignedRequest(body: any, method: string, path: string): SignedRequest {
		const timestamp = Math.floor(Date.now() / 1000);
		const nonce = this.generateNonce();

		// For bodyless requests (DELETE, GET), use empty string, NOT "null"
		const hasBody = body !== undefined && body !== null;
		const bodyString = hasBody
			? typeof body === 'string'
				? body
				: JSON.stringify(body, Object.keys(body || {}).sort())
			: ''; // Empty string for no-body requests

		const signature = this.signRequest(
			timestamp,
			nonce,
			bodyString,
			method,
			path
		);

		return {
			timestamp,
			nonce,
			signature,
			body: bodyString,
		};
	}

	/**
	 * Create signature header value
	 */
	createSignatureHeader(signedRequest: SignedRequest): string {
		return `${signedRequest.timestamp}.${signedRequest.nonce}.${signedRequest.signature}`;
	}

	/**
	 * Sign a request and add the signature headers
	 */
	signRequestHeaders(
		body: any,
		method: string,
		path: string,
		existingHeaders: Record<string, string> = {}
	): Record<string, string> {
		console.log('🔐 [HMAC] signRequestHeaders called with:');
		console.log('  📦 Body type:', typeof body);
		console.log('  📦 Body:', body);
		console.log('  🔧 Method:', method);
		console.log('  🛣️  Path:', path);
		console.log('  📋 Existing headers:', Object.keys(existingHeaders));

		const signedRequest = this.createSignedRequest(body, method, path);
		const normalizedPath = this.normalizePath(path);

		// Send both new separate headers AND old combined header for compatibility
		const signatureHeader = this.createSignatureHeader(signedRequest);
		const finalHeaders = {
			...existingHeaders,
			// New separate headers
			'x-timestamp': signedRequest.timestamp.toString(),
			'x-nonce': signedRequest.nonce,
			'x-signature': signedRequest.signature,
			// Old combined header for backward compatibility
			'x-hmac-signature': signatureHeader,
			// Debug headers - use normalized path to match what was signed
			'x-debug-canonical-path': normalizedPath,
			'x-debug-signed-payload': `${signedRequest.timestamp}.${
				signedRequest.nonce
			}.${method.toUpperCase()}.${normalizedPath}.${signedRequest.body}`,
		};

		console.log('🔐 [HMAC] Final headers with both formats for compatibility:');
		console.log('  📅 x-timestamp:', signedRequest.timestamp);
		console.log('  🎲 x-nonce:', signedRequest.nonce);
		console.log('  ✅ x-signature:', signedRequest.signature);
		console.log('  🔗 x-hmac-signature (old format):', signatureHeader);
		console.log('🔐 [HMAC] Final headers keys:', Object.keys(finalHeaders));

		return finalHeaders;
	}
}

// Singleton instance
let hmacService: HMACSigningService | null = null;

export function getHMACService(): HMACSigningService {
	if (!hmacService) {
		const secretKey =
			process.env.EXPO_PUBLIC_HMAC_SECRET_KEY ||
			process.env.HMAC_SECRET_KEY ||
			'dev-hmac-secret-key-32-chars-minimum-required-for-development';

		console.log('🔐 [HMAC] Initializing HMAC service:');
		console.log(
			'  🔑 EXPO_PUBLIC_HMAC_SECRET_KEY exists:',
			!!process.env.EXPO_PUBLIC_HMAC_SECRET_KEY
		);
		console.log('  🔑 HMAC_SECRET_KEY exists:', !!process.env.HMAC_SECRET_KEY);
		console.log(
			'  🔑 Using secret key (first 8 chars):',
			secretKey.substring(0, 8) + '...'
		);
		console.log('  🔑 Secret key length:', secretKey.length);

		hmacService = new HMACSigningService({
			secretKey,
			algorithm: 'sha256',
			timestampTolerance: 300, // 5 minutes
		});
	}

	return hmacService;
}

// Utility functions for common operations
export function createRequestSignature(
	body: any,
	method: string,
	path: string
): SignedRequest {
	return getHMACService().createSignedRequest(body, method, path);
}

export function createSignatureHeader(signedRequest: SignedRequest): string {
	return getHMACService().createSignatureHeader(signedRequest);
}

export function signRequestHeaders(
	body: any,
	method: string,
	path: string,
	existingHeaders: Record<string, string> = {}
): Record<string, string> {
	return getHMACService().signRequestHeaders(
		body,
		method,
		path,
		existingHeaders
	);
}
