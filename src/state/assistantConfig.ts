export type AssistantConfig = {
	mode: 'private' | 'personalized' | 'proactive';
	useBudgetsGoals: boolean;
	useTransactions: boolean;
	showProactiveCards: boolean;
	costSaver: boolean;
	privacyHardStop: boolean;
};

// Helper functions for derived behavior
export const isPersonalizationOn = (config: AssistantConfig): boolean => {
	return config.mode !== 'private';
};

export const allowProactive = (config: AssistantConfig): boolean => {
	return config.mode === 'proactive' && config.showProactiveCards;
};

export const shouldEnrichPrompts = (
	config: AssistantConfig,
	userInput: string
): boolean => {
	if (!isPersonalizationOn(config)) return false;

	// Always enrich in proactive mode
	if (config.mode === 'proactive') return true;

	// In personalized mode, only enrich when user explicitly asks for analysis
	const userRequestedAnalysis =
		/\b(analyze|budget|goal|spending|optimize|can i afford|how much|tracking|progress)\b/i.test(
			userInput
		);
	return userRequestedAnalysis;
};

export const getStreamOptions = (config: AssistantConfig) => {
	return {
		modelTier: config.costSaver ? 'economy' : 'standard',
		maxChars: config.costSaver ? 1200 : 4000,
	};
};

// Convert from profile preferences to AssistantConfig
export const toAssistantConfig = (
	prefs?: Partial<ProfilePreferences['assistant']>,
	legacyAIInsights?: any
): AssistantConfig => {
	// If we have legacy aiInsights but no new assistant config, migrate
	if (!prefs && legacyAIInsights) {
		return migrateFromAIInsights(legacyAIInsights);
	}

	// If we have new config, use it
	if (prefs) {
		return {
			mode: prefs.mode || 'personalized',
			useBudgetsGoals: prefs.useBudgetsGoals ?? true,
			useTransactions: prefs.useTransactions ?? true,
			showProactiveCards:
				prefs.showProactiveCards ?? prefs.mode === 'proactive',
			costSaver: prefs.costSaver ?? false,
			privacyHardStop: prefs.privacyHardStop ?? false,
		};
	}

	// Default config
	return DEFAULT_ASSISTANT_CONFIG;
};

// Migration helper from old aiInsights format
export const migrateFromAIInsights = (aiInsights?: any): AssistantConfig => {
	if (!aiInsights || !aiInsights.enabled) {
		return {
			mode: 'private',
			useBudgetsGoals: true,
			useTransactions: true,
			showProactiveCards: false,
			costSaver: false,
			privacyHardStop: false,
		};
	}

	// If insights were enabled, determine the mode based on context
	// For now, default to personalized - user can upgrade to proactive if they want
	return {
		mode: 'personalized',
		useBudgetsGoals: aiInsights.insightTypes?.budgetingTips ?? true,
		useTransactions: aiInsights.insightTypes?.expenseReduction ?? true,
		showProactiveCards: false, // Start with off, let user enable
		costSaver: false,
		privacyHardStop: false,
	};
};

// Default configuration
export const DEFAULT_ASSISTANT_CONFIG: AssistantConfig = {
	mode: 'personalized',
	useBudgetsGoals: true,
	useTransactions: true,
	showProactiveCards: false,
	costSaver: false,
	privacyHardStop: false,
};

// Type for profile preferences (imported from context)
interface ProfilePreferences {
	assistant: {
		mode: 'private' | 'personalized' | 'proactive';
		useBudgetsGoals: boolean;
		useTransactions: boolean;
		showProactiveCards: boolean;
		costSaver: boolean;
		privacyHardStop: boolean;
	};
}
