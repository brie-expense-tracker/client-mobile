// client-mobile/src/networking/streamingApi.ts
import { STREAM_SETUP_URL } from './endpoints';
import { authService } from '../services/authService';
import { logger } from '../utils/logger';

export type StreamSetupPayload = {
	message: string;
	sessionId: string;
	clientMessageId: string;
	dialogFrame?: any;
	groundingContext?: any;
};

export async function setupStream(payload: StreamSetupPayload): Promise<{
	streamKey: string;
	expiresIn: number;
}> {
	const uid = await authService.getCurrentUserUID();
	if (!uid) throw new Error('No authenticated user found');

	const res = await fetch(STREAM_SETUP_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-firebase-uid': uid, // matches your backend handler
		},
		body: JSON.stringify(payload),
	});

	if (!res.ok) {
		const text = await res.text().catch(() => '');
		logger.warn('[StreamSetup] failed', { status: res.status, text });
		throw new Error(`Stream setup failed (${res.status})`);
	}

	const json = await res.json();
	if (__DEV__)
		logger.debug('[stream/setup] ok', {
			streamKey: json.streamKey?.slice(0, 8) + '...',
		});
	return json;
}

