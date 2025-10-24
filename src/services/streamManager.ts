/**
 * Stream Manager - Hard-lock to single stream per message
 * Prevents duplicate streams and ensures proper cleanup
 */

type Active = {
	key: string;
	es: EventSource | null;
	inactivityTimer?: ReturnType<typeof setTimeout>;
};
const activeRef: { current: Active | null } = { current: null };

// Stream manager
const INACTIVITY_MS = 120000; // 2m is safer on mobile

function resetInactivityTimer(reason: string, streamKey: string) {
	if (!activeRef.current) return;

	clearTimeout(activeRef.current.inactivityTimer);
	activeRef.current.inactivityTimer = setTimeout(() => {
		console.warn(
			'🚨 [StreamManager] Stream timeout after inactivity:',
			reason,
			{ streamKey }
		);
		cancelSSE(); // abort controller + es.close()
	}, INACTIVITY_MS);
}

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
		clearTimeout(activeRef.current.inactivityTimer);
		activeRef.current.es.close();
	}

	const es = new EventSource(url, { withCredentials: false });
	activeRef.current = { key: streamKey, es };


	// Set up inactivity timer on stream open
	es.addEventListener('open', () => {
		resetInactivityTimer('open', streamKey);
	});

	es.addEventListener('delta', (e: MessageEvent) => {
		try {
			const data = JSON.parse(e.data);
			handlers.onDelta(data);
			resetInactivityTimer('delta', streamKey);
		} catch (error) {
			console.error('❌ [StreamManager] Failed to parse delta event:', error);
		}
	});

	// Add meta and limit event listeners
	es.addEventListener('meta', (e: MessageEvent) => {
		resetInactivityTimer('meta', streamKey);
	});

	es.addEventListener('limit', (e: MessageEvent) => {
		resetInactivityTimer('limit', streamKey);
	});

	es.addEventListener('done', (e: MessageEvent) => {
		try {
			const data = JSON.parse(e.data);
			handlers.onDone(data?.full);
		} catch (error) {
			console.error('❌ [StreamManager] Failed to parse done event:', error);
		}

		// Clear timer on done
		if (activeRef.current?.inactivityTimer) {
			clearTimeout(activeRef.current.inactivityTimer);
		}

		es.close();
		if (activeRef.current?.key === streamKey) {
			activeRef.current = null;
		}
	});

	es.addEventListener('error', (e: any) => {
		console.error('❌ [StreamManager] Stream error for key:', streamKey, e);

		// Clear timer on error
		if (activeRef.current?.inactivityTimer) {
			clearTimeout(activeRef.current.inactivityTimer);
		}

		// Parse error data if available (for structured SSE error events)
		let errorPayload: any = null;
		try {
			if (e && (e as any).data) {
				errorPayload = JSON.parse((e as any).data);
			}
		} catch {
			// Not a structured error, that's fine
		}

		// Pass the error with proper context
		const errorData = {
			...errorPayload,
			streamKey,
			originalEvent: e,
			isStructuredError: !!errorPayload,
		};

		handlers.onError(errorData);
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
		clearTimeout(activeRef.current.inactivityTimer);
		activeRef.current.es.close();
		activeRef.current = null;
	}
}

export function getActiveStreamKey(): string | null {
	return activeRef.current?.key || null;
}
