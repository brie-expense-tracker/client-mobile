/**
 * Notification Preferences Mapping
 *
 * This module provides a canonical model for notification preferences and
 * mapping functions to convert between the canonical model and view-specific
 * representations. This ensures a single source of truth while allowing
 * different UI screens to have their own simplified views.
 */

// ============================================================================
// Canonical Model: NotificationPreferences
// ============================================================================
// This is the single source of truth that matches what the backend stores
// in the profile model.

export type InsightFrequency = 'daily' | 'weekly' | 'monthly';

export interface NotificationPreferences {
	// Master switch
	masterEnabled: boolean;

	core: {
		budgetAlerts: boolean; // near/over budget
		overspendingAlerts: boolean; // big overspend events
		goalsAndMilestones: boolean; // goal progress + milestones
		// system / security alerts assumed ALWAYS ON (no toggle)
	};

	insights: {
		aiInsightsEnabled: boolean; // allow AI-generated notifications
		weeklyDigestEnabled: boolean;
		monthlyReviewEnabled: boolean;

		frequency: InsightFrequency; // how often AI is allowed to ping
		channels: {
			push: boolean;
			email: boolean;
		};
	};

	marketing: {
		marketingUpdatesEnabled: boolean; // "marketing & product updates"
		newsletterEnabled: boolean; // optional separate email series
	};

	quietHours: {
		enabled: boolean;
		start: string; // '22:00'
		end: string; // '08:00'
	};
}

// ============================================================================
// View Types
// ============================================================================
// These are UI-specific shapes that each screen uses. They're derived from
// and write back to NotificationPreferences using the mapping functions.

/**
 * Main Notifications screen view
 * Lean, user-facing toggles for normal users
 */
export interface NotificationSettingsView {
	notificationsEnabled: boolean;

	// Spending & goals
	budgetAlerts: boolean;
	overspendingAlerts: boolean;
	goalsAndMilestones: boolean;

	// Insights & summaries
	aiInsightsEnabled: boolean;
	weeklyDigestEnabled: boolean;
	monthlyReviewEnabled: boolean;

	// Marketing (simple)
	marketingUpdatesEnabled: boolean;

	// Quiet hours (basic)
	quietHoursEnabled: boolean;
	quietHoursStart: string;
	quietHoursEnd: string;
}

/**
 * Communication / Consent screen view
 * More advanced + legal focused view for detailed preferences
 */
export interface NotificationConsentView {
	aiInsights: {
		enabled: boolean;
		frequency: InsightFrequency;
		channels: {
			push: boolean;
			email: boolean;
		};
	};

	marketing: {
		marketingUpdatesEnabled: boolean;
		newsletterEnabled: boolean;
	};

	quietHours: {
		enabled: boolean;
		start: string;
		end: string;
	};
}

// ============================================================================
// Mapping Functions: Preferences → Settings View
// ============================================================================

/**
 * Canonical → main screen view
 */
export function prefsToSettingsView(
	prefs: NotificationPreferences
): NotificationSettingsView {
	return {
		notificationsEnabled: prefs.masterEnabled,

		budgetAlerts: prefs.core.budgetAlerts,
		overspendingAlerts: prefs.core.overspendingAlerts,
		goalsAndMilestones: prefs.core.goalsAndMilestones,

		aiInsightsEnabled: prefs.insights.aiInsightsEnabled,
		weeklyDigestEnabled: prefs.insights.weeklyDigestEnabled,
		monthlyReviewEnabled: prefs.insights.monthlyReviewEnabled,

		marketingUpdatesEnabled: prefs.marketing.marketingUpdatesEnabled,

		quietHoursEnabled: prefs.quietHours.enabled,
		quietHoursStart: prefs.quietHours.start,
		quietHoursEnd: prefs.quietHours.end,
	};
}

/**
 * main screen view → canonical (overlay)
 */
export function applySettingsViewToPrefs(
	prev: NotificationPreferences,
	view: NotificationSettingsView
): NotificationPreferences {
	return {
		...prev,
		masterEnabled: view.notificationsEnabled,
		core: {
			...prev.core,
			budgetAlerts: view.budgetAlerts,
			overspendingAlerts: view.overspendingAlerts,
			goalsAndMilestones: view.goalsAndMilestones,
		},
		insights: {
			...prev.insights,
			aiInsightsEnabled: view.aiInsightsEnabled,
			weeklyDigestEnabled: view.weeklyDigestEnabled,
			monthlyReviewEnabled: view.monthlyReviewEnabled,
		},
		marketing: {
			...prev.marketing,
			marketingUpdatesEnabled: view.marketingUpdatesEnabled,
		},
		quietHours: {
			...prev.quietHours,
			enabled: view.quietHoursEnabled,
			start: view.quietHoursStart,
			end: view.quietHoursEnd,
		},
	};
}

// ============================================================================
// Mapping Functions: Preferences → Consent View
// ============================================================================

/**
 * Canonical → consent / advanced view
 */
export function prefsToConsentView(
	prefs: NotificationPreferences
): NotificationConsentView {
	return {
		aiInsights: {
			enabled: prefs.insights.aiInsightsEnabled,
			frequency: prefs.insights.frequency,
			channels: {
				push: prefs.insights.channels.push,
				email: prefs.insights.channels.email,
			},
		},
		marketing: {
			marketingUpdatesEnabled: prefs.marketing.marketingUpdatesEnabled,
			newsletterEnabled: prefs.marketing.newsletterEnabled,
		},
		quietHours: {
			enabled: prefs.quietHours.enabled,
			start: prefs.quietHours.start,
			end: prefs.quietHours.end,
		},
	};
}

/**
 * consent / advanced view → canonical (overlay)
 */
export function applyConsentViewToPrefs(
	prev: NotificationPreferences,
	view: NotificationConsentView
): NotificationPreferences {
	return {
		...prev,
		insights: {
			...prev.insights,
			aiInsightsEnabled: view.aiInsights.enabled,
			frequency: view.aiInsights.frequency,
			channels: {
				...prev.insights.channels,
				push: view.aiInsights.channels.push,
				email: view.aiInsights.channels.email,
			},
		},
		marketing: {
			...prev.marketing,
			marketingUpdatesEnabled: view.marketing.marketingUpdatesEnabled,
			newsletterEnabled: view.marketing.newsletterEnabled,
		},
		quietHours: {
			...prev.quietHours,
			enabled: view.quietHours.enabled,
			start: view.quietHours.start,
			end: view.quietHours.end,
		},
	};
}

// ============================================================================
// Helper: Convert from legacy profile format to canonical model
// ============================================================================

/**
 * Convert from the legacy profile.preferences.notifications format
 * to the canonical NotificationPreferences model.
 *
 * This is used for migration/compatibility with existing backend data.
 */
export function legacyProfileToPreferences(
	profileNotifications: {
		enableNotifications?: boolean;
		weeklySummary?: boolean;
		overspendingAlert?: boolean;
		aiSuggestion?: boolean;
		budgetMilestones?: boolean;
		monthlyFinancialCheck?: boolean;
		monthlySavingsTransfer?: boolean;
	},
	profileAiInsights?: {
		enabled?: boolean;
		frequency?: 'daily' | 'weekly' | 'monthly' | 'disabled';
		pushNotifications?: boolean;
		emailAlerts?: boolean;
	},
	profileMarketing?: {
		enabled?: boolean;
		promotional?: boolean;
		newsletter?: boolean;
		productUpdates?: boolean;
		specialOffers?: boolean;
	}
): NotificationPreferences {
	// Map legacy frequency (which includes 'disabled') to new InsightFrequency
	const frequency: InsightFrequency =
		profileAiInsights?.frequency === 'disabled' ||
		profileAiInsights?.frequency === undefined
			? 'weekly'
			: profileAiInsights.frequency;

	return {
		masterEnabled: profileNotifications?.enableNotifications ?? true,
		core: {
			budgetAlerts: profileNotifications?.budgetMilestones ?? true,
			overspendingAlerts: profileNotifications?.overspendingAlert ?? false,
			goalsAndMilestones: profileNotifications?.budgetMilestones ?? true,
		},
		insights: {
			aiInsightsEnabled:
				profileAiInsights?.enabled ??
				profileNotifications?.aiSuggestion ??
				true,
			weeklyDigestEnabled: profileNotifications?.weeklySummary ?? true,
			monthlyReviewEnabled: profileNotifications?.monthlyFinancialCheck ?? true,
			frequency,
			channels: {
				push: profileAiInsights?.pushNotifications ?? true,
				email: profileAiInsights?.emailAlerts ?? false,
			},
		},
		marketing: {
			marketingUpdatesEnabled:
				profileMarketing?.productUpdates ?? profileMarketing?.enabled ?? false,
			newsletterEnabled: profileMarketing?.newsletter ?? false,
		},
		quietHours: {
			enabled: false,
			start: '22:00',
			end: '08:00',
		},
	};
}

/**
 * Convert canonical NotificationPreferences back to legacy profile format
 * for API compatibility.
 */
export function preferencesToLegacyProfile(prefs: NotificationPreferences): {
	notifications: {
		enableNotifications: boolean;
		weeklySummary: boolean;
		overspendingAlert: boolean;
		aiSuggestion: boolean;
		budgetMilestones: boolean;
		monthlyFinancialCheck: boolean;
		monthlySavingsTransfer: boolean;
	};
	aiInsights: {
		enabled: boolean;
		frequency: 'daily' | 'weekly' | 'monthly' | 'disabled';
		pushNotifications: boolean;
		emailAlerts: boolean;
	};
	marketing: {
		enabled: boolean;
		promotional: boolean;
		newsletter: boolean;
		productUpdates: boolean;
		specialOffers: boolean;
	};
} {
	return {
		notifications: {
			enableNotifications: prefs.masterEnabled,
			weeklySummary: prefs.insights.weeklyDigestEnabled,
			overspendingAlert: prefs.core.overspendingAlerts,
			aiSuggestion:
				prefs.insights.aiInsightsEnabled && prefs.insights.channels.push,
			budgetMilestones: prefs.core.budgetAlerts,
			monthlyFinancialCheck: prefs.insights.monthlyReviewEnabled,
			monthlySavingsTransfer: false, // Not in new model, default to false
		},
		aiInsights: {
			enabled: prefs.insights.aiInsightsEnabled,
			frequency: prefs.insights.frequency,
			pushNotifications: prefs.insights.channels.push,
			emailAlerts: prefs.insights.channels.email,
		},
		marketing: {
			enabled:
				prefs.marketing.marketingUpdatesEnabled ||
				prefs.marketing.newsletterEnabled,
			promotional: false, // Not in new model
			newsletter: prefs.marketing.newsletterEnabled,
			productUpdates: prefs.marketing.marketingUpdatesEnabled,
			specialOffers: false, // Not in new model
		},
	};
}
