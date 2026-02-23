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
export { TieredAIService } from './feature/tieredAIService';
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
// ML/AI Services
export { default as HybridAIService } from './ml/hybridAIService';
export { default as LocalMLService } from './ml/localMLService';
export type { AIRequest, AIResponse } from './ml/hybridAIService';

// Utility Services
export { default as SmartCacheService } from './utility/smartCacheService';
