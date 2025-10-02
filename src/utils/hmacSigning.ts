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
		// Create the payload to sign: timestamp + nonce + method + path + body
		const payload = `${timestamp}.${nonce}.${method.toUpperCase()}.${path}.${body}`;

		console.log('🔐 [HMAC] Debug - Payload to sign:', payload);
		console.log(
			'🔐 [HMAC] Debug - Secret key (first 8 chars):',
			this.secretKey.substring(0, 8) + '...'
		);

		// Create HMAC signature using CryptoJS
		const hmac = hmacSHA256(payload, this.secretKey);
		const signature = hmac.toString(encHex);

		console.log('🔐 [HMAC] Debug - Generated signature:', signature);

		return signature;
	}

	/**
	 * Create a signed request object
	 */
	createSignedRequest(body: any, method: string, path: string): SignedRequest {
		const timestamp = Math.floor(Date.now() / 1000);
		const nonce = this.generateNonce();
		const bodyString = typeof body === 'string' ? body : JSON.stringify(body);

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
	 * Sign a request and add the signature header
	 */
	signRequestHeaders(
		body: any,
		method: string,
		path: string,
		existingHeaders: Record<string, string> = {}
	): Record<string, string> {
		const signedRequest = this.createSignedRequest(body, method, path);
		const signatureHeader = this.createSignatureHeader(signedRequest);

		return {
			...existingHeaders,
			'x-hmac-signature': signatureHeader,
		};
	}
}

// Singleton instance
let hmacService: HMACSigningService | null = null;

export function getHMACService(): HMACSigningService {
	if (!hmacService) {
		const secretKey =
			process.env.EXPO_PUBLIC_HMAC_SECRET_KEY ||
			'dev-hmac-secret-key-32-chars-minimum-required-for-development';

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
