// MUST be imported before anything that uses uuid/crypto
import 'react-native-get-random-values';
import { logger } from './utils/logger';

// EventSource polyfill for React Native/Expo
// Import EventSource polyfill with proper error handling
import EventSource from 'react-native-sse';
let EventSourcePolyfill: any;

try {
	// Use the maintained react-native-sse implementation
	EventSourcePolyfill = EventSource;
} catch {
	logger.warn(
		'[Polyfill] react-native-sse not available, EventSource will not be polyfilled'
	);
	EventSourcePolyfill = undefined;
}

// Install the polyfill only if native EventSource is not available
if (
	typeof (globalThis as any).EventSource === 'undefined' &&
	EventSourcePolyfill
) {
	try {
		// Verify the polyfill has the expected interface
		if (typeof EventSourcePolyfill !== 'function') {
			throw new Error('EventSource polyfill is not a constructor');
		}

		// Test basic functionality in development
		if (__DEV__) {
			const testES = new EventSourcePolyfill('data:text/event-stream,test');
			if (typeof testES.addEventListener !== 'function') {
				throw new Error('EventSource polyfill missing addEventListener method');
			}
			testES.close();
		}

		(globalThis as any).EventSource = EventSourcePolyfill;
		logger.info('[Polyfill] EventSource polyfill attached successfully');
	} catch (error) {
		logger.error('[Polyfill] Failed to attach EventSource polyfill', error);
		// Don't throw here to prevent app crashes, just log the error
	}
}

// TypeScript global declaration for EventSource
declare global {
	var EventSource: {
		new (
			url: string | URL,
			eventSourceInitDict?: EventSourceInit | undefined
		): EventSource;
		prototype: EventSource;
		readonly CONNECTING: 0;
		readonly OPEN: 1;
		readonly CLOSED: 2;
	};
}

// Utility function for debugging EventSource connections
export function debugEventSource(
	es: EventSource,
	label: string = 'EventSource'
) {
	// Only enable debugging in development mode
	if (__DEV__) {
		logger.debug(`EventSource instance created for debugging`, { label });

		// Add event listeners for debugging
		es.addEventListener('open', () => {
			logger.debug(`Connection opened`, { label });
		});

		es.addEventListener('error', (event: any) => {
			logger.error(`Connection error`, { label, event });
		});

		es.addEventListener('close', () => {
			logger.debug(`Connection closed`, { label });
		});
	}
}

// Export a function to check if EventSource is available
export function isEventSourceAvailable(): boolean {
	return typeof (globalThis as any).EventSource === 'function';
}

// Export a function to get EventSource constructor
export function getEventSourceConstructor(): typeof EventSource | null {
	return typeof (globalThis as any).EventSource === 'function'
		? (globalThis as any).EventSource
		: null;
}
