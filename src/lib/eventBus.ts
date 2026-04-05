type Listener = (...args: unknown[]) => void;

/** Minimal event bus for React Native (no Node `events` module). */
class AppEventEmitter {
	private listeners = new Map<string, Set<Listener>>();

	on(event: string, listener: Listener): this {
		let set = this.listeners.get(event);
		if (!set) {
			set = new Set();
			this.listeners.set(event, set);
		}
		set.add(listener);
		return this;
	}

	off(event: string, listener: Listener): this {
		this.listeners.get(event)?.delete(listener);
		return this;
	}

	removeListener(event: string, listener: Listener): this {
		return this.off(event, listener);
	}

	emit(event: string, ...args: unknown[]): boolean {
		const set = this.listeners.get(event);
		if (!set || set.size === 0) {
			return false;
		}
		for (const listener of [...set]) {
			listener(...args);
		}
		return true;
	}
}

export const AppEvents = new AppEventEmitter();

// Common event names
export const EVT_AI_INSIGHTS_CHANGED = 'ai-insights-changed';
export const EVT_ASSISTANT_CONFIG_CHANGED = 'assistant-config-changed';

export interface AIInsightsChangedEvent {
	enabled: boolean;
}

export interface AssistantConfigChangedEvent {
	config: {
		mode: 'private' | 'personalized' | 'proactive';
		useBudgetsGoals: boolean;
		useTransactions: boolean;
		showProactiveCards: boolean;
		costSaver: boolean;
		privacyHardStop: boolean;
	};
}
