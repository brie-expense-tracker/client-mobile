// Feature flags configuration
// This file manages feature toggles for different environments

export interface FeatureFlags {
	devHud: boolean;
	analytics: boolean;
	debugLogging: boolean;
}

// Default feature flags (production-safe)
const defaultFeatureFlags: FeatureFlags = {
	devHud: false, // Disabled by default for safety
	analytics: true,
	debugLogging: false,
};

// Development feature flags
const devFeatureFlags: FeatureFlags = {
	devHud: true,
	analytics: true,
	debugLogging: true,
};

// Get feature flags based on environment
export function getFeatureFlags(): FeatureFlags {
	if (__DEV__) {
		return devFeatureFlags;
	}

	return defaultFeatureFlags;
}

// Runtime feature flag override (for remote config in the future)
let runtimeOverrides: Partial<FeatureFlags> = {};

export function setFeatureFlagOverrides(overrides: Partial<FeatureFlags>) {
	runtimeOverrides = { ...runtimeOverrides, ...overrides };
}

export function getEffectiveFeatureFlags(): FeatureFlags {
	const baseFlags = getFeatureFlags();
	return { ...baseFlags, ...runtimeOverrides };
}

// Production safety assertion
export function assertProductionSafety() {
	const flags = getEffectiveFeatureFlags();

	if (process.env.NODE_ENV === 'production') {
		console.assert(!flags.devHud, 'Dev HUD must be off in production');
	}
}
