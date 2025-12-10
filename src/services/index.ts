// Core Services
export { ApiService } from './core/apiService';
export { UserService, type User, type Profile } from './core/userService';
export { OnboardingService } from './core/onboardingService';

// Feature Services
export {
	BillService,
	type Bill,
	type BillPattern,
	type BillAlert,
} from './feature/billService';
export { BudgetSuggestionService } from './feature/budgetSuggestionService';
export { TieredAIService } from './feature/tieredAIService';
export {
	InsightsService,
	type AIInsight,
	type InsightsResponse,
} from './feature/insightsService';
export {
	notificationService,
	type NotificationData,
	type NotificationResponse,
	type NotificationConsent,
} from './feature/notificationService';
export {
	type NotificationPreferences,
	type NotificationSettingsView,
	type NotificationConsentView,
	prefsToSettingsView,
	applySettingsViewToPrefs,
	prefsToConsentView,
	applyConsentViewToPrefs,
	legacyProfileToPreferences,
	preferencesToLegacyProfile,
} from './notificationMapping';
export {
	WeeklyReflectionService,
	type WeeklyReflection,
	type SaveReflectionData,
} from './feature/weeklyReflectionService';
export {
	BudgetAnalysisService,
	type BudgetAnalysis,
} from './feature/budgetAnalysisService';
export {
	FinancialSnapshotService,
	type BudgetHistoryItem,
} from './feature/financialSnapshotService';
export {
	SpendingForecastService,
	type MonthlyForecast,
	type BudgetForecast,
} from './feature/spendingForecastService';

// ML/AI Services
export { default as HybridAIService } from './ml/hybridAIService';
export { default as LocalMLService } from './ml/localMLService';
export type { AIRequest, AIResponse } from './ml/hybridAIService';

// Utility Services
export { default as SmartCacheService } from './utility/smartCacheService';
