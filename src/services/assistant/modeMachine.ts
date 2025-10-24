import {
	getRecommendedMode,
	canTransitionFrom,
	getTransitionReason,
} from './modeGuards';

type Mode = 'CHAT' | 'INSIGHTS' | 'ACTIONS' | 'ANALYTICS';

type Event =
	| { type: 'USER_QUERY'; intent: string; query: string }
	| { type: 'ACTION_TAKEN' }
	| { type: 'INSIGHT_ACK' }
	| { type: 'OPEN_ANALYTICS' }
	| { type: 'BACK' }
	| { type: 'FORCE_MODE'; mode: Mode; reason: string };

export interface ModeTransition {
	from: Mode;
	to: Mode;
	reason: string;
	timestamp: number;
	event: Event;
}

export interface ModeState {
	current: Mode;
	history: ModeTransition[];
	lastTransition: number;
	isStable: boolean;
}

export function transition(
	state: ModeState,
	ev: Event
): { newState: ModeState; transition?: ModeTransition } {
	const currentMode = state.current;
	let newMode: Mode = currentMode;
	let reason = 'no_change';

	switch (ev.type) {
		case 'USER_QUERY':
			const recommended = getRecommendedMode(ev.intent, ev.query);
			if (canTransitionFrom(currentMode, recommended)) {
				newMode = recommended;
				reason = getTransitionReason(
					currentMode,
					recommended,
					ev.intent,
					ev.query
				);
			}
			break;

		case 'ACTION_TAKEN':
			if (canTransitionFrom(currentMode, 'CHAT')) {
				newMode = 'CHAT';
				reason = 'action_completed_return_to_chat';
			}
			break;

		case 'INSIGHT_ACK':
			if (canTransitionFrom(currentMode, 'CHAT')) {
				newMode = 'CHAT';
				reason = 'insight_acknowledged_return_to_chat';
			}
			break;

		case 'OPEN_ANALYTICS':
			if (canTransitionFrom(currentMode, 'ANALYTICS')) {
				newMode = 'ANALYTICS';
				reason = 'user_requested_analytics';
			}
			break;

		case 'BACK':
			if (canTransitionFrom(currentMode, 'CHAT')) {
				newMode = 'CHAT';
				reason = 'user_navigated_back';
			}
			break;

		case 'FORCE_MODE':
			if (canTransitionFrom(currentMode, ev.mode)) {
				newMode = ev.mode;
				reason = ev.reason;
			}
			break;

		default:
			return { newState: state };
	}

	// No transition needed
	if (newMode === currentMode) {
		return {
			newState: {
				...state,
				isStable: true,
				lastTransition: Date.now(),
			},
		};
	}

	// Create transition record
	const transition: ModeTransition = {
		from: currentMode,
		to: newMode,
		reason,
		timestamp: Date.now(),
		event: ev,
	};

	// Update state
	const newState: ModeState = {
		current: newMode,
		history: [...state.history, transition].slice(-10), // Keep last 10 transitions
		lastTransition: Date.now(),
		isStable: false,
	};

	// Log transition for analytics
		from: currentMode,
		to: newMode,
		reason,
		event: ev.type,
		timestamp: new Date().toISOString(),
	});

	return { newState, transition };
}

// Initialize mode state
export function createInitialModeState(): ModeState {
	return {
		current: 'CHAT',
		history: [],
		lastTransition: Date.now(),
		isStable: true,
	};
}

// Check if mode is stable (hasn't changed recently)
export function isModeStable(
	state: ModeState,
	stabilityThresholdMs: number = 5000
): boolean {
	return Date.now() - state.lastTransition > stabilityThresholdMs;
}

// Get mode transition analytics
export function getModeAnalytics(state: ModeState) {
	const transitions = state.history;
	const modeCounts = transitions.reduce((acc, t) => {
		acc[t.to] = (acc[t.to] || 0) + 1;
		return acc;
	}, {} as Record<Mode, number>);

	const commonTransitions = transitions.reduce((acc, t) => {
		const key = `${t.from}->${t.to}`;
		acc[key] = (acc[key] || 0) + 1;
		return acc;
	}, {} as Record<string, number>);

	return {
		currentMode: state.current,
		totalTransitions: transitions.length,
		modeCounts,
		commonTransitions,
		lastTransition: state.lastTransition,
		isStable: state.isStable,
	};
}

// Validate mode state
export function validateModeState(state: ModeState): boolean {
	return (
		typeof state.current === 'string' &&
		['CHAT', 'INSIGHTS', 'ACTIONS', 'ANALYTICS'].includes(state.current) &&
		Array.isArray(state.history) &&
		typeof state.lastTransition === 'number' &&
		typeof state.isStable === 'boolean'
	);
}
