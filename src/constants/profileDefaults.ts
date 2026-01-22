/**
 * Canonical defaults factory for profile preferences.
 * 
 * This is the single source of truth for default preferences.
 * All onboarding and profile creation should use this factory
 * to ensure consistency and avoid schema drift.
 */

export const defaultPreferences = () => ({
	adviceFrequency: 'Weekly summary',
	autoSave: {
		enabled: false,
		amount: 0,
	},
	notifications: {
		enableNotifications: true,
		weeklySummary: true,
		overspendingAlert: true,
		aiSuggestion: true,
		budgetMilestones: true,
		monthlyFinancialCheck: true,
		monthlySavingsTransfer: false,
	},
	aiInsights: {
		enabled: true,
		frequency: 'weekly' as const,
		pushNotifications: true,
		emailAlerts: false,
		insightTypes: {
			budgetingTips: true,
			expenseReduction: true,
			incomeSuggestions: true,
		},
	},
	budgetSettings: {
		cycleType: 'monthly' as const,
		cycleStart: 1,
		alertPct: 80,
		carryOver: false,
		autoSync: true,
	},
	goalSettings: {
		defaults: {
			target: 1000,
			dueDays: 90,
			sortBy: 'percent' as const,
			currency: 'USD',
			emergencyFundMonths: 3,
		},
		ai: {
			enabled: true,
			tone: 'friendly' as const,
			frequency: 'medium' as const,
			whatIf: true,
		},
		notifications: {
			milestoneAlerts: true,
			weeklySummary: false,
			offTrackAlert: true,
		},
		display: {
			showCompleted: true,
			autoArchive: true,
			rounding: '1' as const,
		},
		security: {
			lockEdit: false,
			undoWindow: 24,
		},
	},
});
