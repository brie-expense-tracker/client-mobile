import { getApiBaseUrl } from '../config/environment';

export const API_BASE_URL = getApiBaseUrl();
export const SSE_CHAT_URL = `${API_BASE_URL}/api/stream/chat`;

export function buildSseUrl(input: {
	sessionId: string;
	message: string;
	uid?: string;
	clientMessageId?: string;
	expand?: boolean;
}) {
	const u = new URL(SSE_CHAT_URL);
	u.searchParams.set('sessionId', input.sessionId);
	u.searchParams.set('message', input.message);
	if (input.uid) {
		u.searchParams.set('uid', input.uid);
	}
	if (input.clientMessageId) {
		u.searchParams.set('clientMessageId', input.clientMessageId);
	}
	if (input.expand) {
		u.searchParams.set('expand', 'true');
	}
	console.log('🔧 [SSE] Built URL:', u.toString());
	return u.toString();
}

export function buildTestSseUrl() {
	const u = new URL(`${API_BASE_URL}/api/stream/test`);
	console.log('🧪 [Test] Built test URL:', u.toString());
	return u.toString();
}
