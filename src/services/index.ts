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
