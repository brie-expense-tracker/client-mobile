import { nanoid } from 'nanoid/non-secure';

type StreamHandlers = {
	onMeta?: (m: any) => void;
	onDelta: (clientMessageId: string, text: string) => void;
	onDone: (clientMessageId: string) => void;
	onError: (clientMessageId: string, err: Error) => void;
};

let current: { id: string | null; connecting: boolean } = {
	id: null,
	connecting: false,
};

export function startChatStream(
	prompt: string,
	handlers: StreamHandlers,
	uid?: string
) {
	const clientMessageId = nanoid();
	current = { id: clientMessageId, connecting: true };

	const url = new URL('http://192.168.1.65:3000/api/stream/chat');
	url.searchParams.set('sessionId', 'default');
	if (uid) {
		url.searchParams.set('uid', uid);
	}
	url.searchParams.set('clientMessageId', clientMessageId);
	url.searchParams.set('message', prompt);

	const es = new EventSource(url.toString());
	let started = false;

	const guard = (incomingId: string) =>
		!!current.id && incomingId === current.id;

	es.addEventListener('meta', (e) => {
		const m = JSON.parse((e as MessageEvent).data);
		if (!guard(m.clientMessageId)) return;
		started = true;
		current.connecting = false;
		console.log('🧠 [SSE] meta', m);
		handlers.onMeta?.(m);
	});

	es.addEventListener('delta', (e) => {
		const d = JSON.parse((e as MessageEvent).data) as {
			clientMessageId: string;
			text: string;
		};
		if (!guard(d.clientMessageId)) {
			console.warn('⚠️ Ignoring delta for stale message', {
				incoming: d.clientMessageId,
				current: current.id,
			});
			return;
		}
		handlers.onDelta(d.clientMessageId, d.text);
	});

	es.addEventListener('done', (e) => {
		const d = JSON.parse((e as MessageEvent).data);
		if (!guard(d.clientMessageId)) return;
		es.close();
		handlers.onDone(d.clientMessageId);
		current = { id: null, connecting: false };
	});

	es.addEventListener('ping', () => {
		// keep-alive; no-op
	});

	es.addEventListener('error', (e) => {
		const data = (e as any)?.data;
		const err = new Error(typeof data === 'string' ? data : 'SSE error');
		if (current.id) handlers.onError(current.id, err);
		try {
			es.close();
		} catch {}
		current = { id: null, connecting: false };
	});

	console.log('🚀 [SSE] Started', { clientMessageId, url: url.toString() });
	return clientMessageId;
}
