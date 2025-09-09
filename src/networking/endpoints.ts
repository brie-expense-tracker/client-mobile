import { getApiBaseUrl } from '../config/environment';

export const API_BASE_URL = getApiBaseUrl();
export const SSE_CHAT_URL = `${API_BASE_URL}/api/orchestrator/chat/stream`;

export function buildSseUrl(input: {
	sessionId: string;
	message: string;
	uid?: string;
}) {
	const u = new URL(SSE_CHAT_URL);
	u.searchParams.set('sessionId', input.sessionId);
	u.searchParams.set('message', input.message);
	if (input.uid) {
		u.searchParams.set('uid', input.uid);
	}
	return u.toString();
}
