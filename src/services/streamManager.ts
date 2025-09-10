/**
 * Stream Manager - Hard-lock to single stream per message
 * Prevents duplicate streams and ensures proper cleanup
 */

type Active = { key: string; es: EventSource | null };
const activeRef: { current: Active | null } = { current: null };

export function startSSE(
	url: string,
	streamKey: string,
	handlers: {
		onDelta: (d: { text: string; seq?: number }) => void;
		onDone: (full?: string) => void;
		onError: (e: any) => void;
	}
): EventSource | null {
	// If this exact stream is already open, ignore.
	if (activeRef.current?.key === streamKey) {
		console.warn(
			'🚫 [StreamManager] Stream already active for key:',
			streamKey
		);
		return null;
	}

	// Close any prior stream (prevents double output).
	if (activeRef.current?.es) {
		console.log(
			'🔄 [StreamManager] Closing previous stream for key:',
			activeRef.current.key
		);
		activeRef.current.es.close();
	}

	const es = new EventSource(url, { withCredentials: false });
	activeRef.current = { key: streamKey, es };

	console.log('🚀 [StreamManager] Starting new stream for key:', streamKey);

	es.addEventListener('delta', (e: MessageEvent) => {
		try {
			const data = JSON.parse(e.data);
			handlers.onDelta(data);
		} catch (error) {
			console.error('❌ [StreamManager] Failed to parse delta event:', error);
		}
	});

	es.addEventListener('done', (e: MessageEvent) => {
		try {
			const data = JSON.parse(e.data);
			handlers.onDone(data?.full);
		} catch (error) {
			console.error('❌ [StreamManager] Failed to parse done event:', error);
		}

		es.close();
		if (activeRef.current?.key === streamKey) {
			activeRef.current = null;
		}
	});

	es.addEventListener('error', (e: any) => {
		console.error('❌ [StreamManager] Stream error for key:', streamKey, e);
		handlers.onError(e);
		es.close();
		if (activeRef.current?.key === streamKey) {
			activeRef.current = null;
		}
	});

	return es;
}

export function cancelSSE() {
	if (activeRef.current?.es) {
		console.log(
			'🛑 [StreamManager] Cancelling active stream for key:',
			activeRef.current.key
		);
		activeRef.current.es.close();
		activeRef.current = null;
	}
}

export function getActiveStreamKey(): string | null {
	return activeRef.current?.key || null;
}
