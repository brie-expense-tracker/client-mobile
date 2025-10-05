import { EventEmitter } from 'events';

export const AppEvents = new EventEmitter();

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
