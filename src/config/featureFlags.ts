// Legacy feature flags - DEPRECATED
// Use src/config/features.ts instead

import { Features, useFeature, getResolvedFlags } from './features';
import { createLogger } from '../utils/sublogger';

const legacyFlagsLog = createLogger('LegacyFeatureFlags');

// Legacy compatibility exports
export const getEffectiveFeatureFlags = () => ({
	devHud: __DEV__, // Always true in dev, false in prod
	analytics: true,
	debugLogging: __DEV__,
	aiInsights: Features.aiInsights,
});

export { useFeature, getResolvedFlags as getFeatureFlags };

// Legacy function for backward compatibility
export async function loadFeatureFlagOverrides() {
	// This is now handled by the new features system
	legacyFlagsLog.warn(
		'loadFeatureFlagOverrides is deprecated, use loadLocalOverrides from features.ts'
	);
}

export function setFeatureFlagOverrides(overrides: any) {
	legacyFlagsLog.warn(
		'setFeatureFlagOverrides is deprecated, use setLocalOverride from features.ts'
	);
}

export function assertProductionSafety() {
	const flags = getResolvedFlags();

	if (process.env.NODE_ENV === 'production') {
		if (flags.aiInsights) {
			legacyFlagsLog.error('AI Insights must be off in production');
		}
	}
}
