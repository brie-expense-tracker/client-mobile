import AsyncStorage from '@react-native-async-storage/async-storage';
import { isDevMode } from './environment';

type FlagKey =
	| 'aiInsights'
	| 'aiInsightsPreview'
	| 'newBudgetsV2'
	| 'goalsTimeline';

const envDefaults: Record<FlagKey, boolean> = {
	aiInsights: process.env.EXPO_PUBLIC_AI_INSIGHTS === '1',
	aiInsightsPreview: process.env.EXPO_PUBLIC_AI_INSIGHTS_PREVIEW === '1',
	newBudgetsV2: process.env.EXPO_PUBLIC_NEW_BUDGETS_V2 === '1',
	goalsTimeline: process.env.EXPO_PUBLIC_GOALS_TIMELINE === '1',
};

// Debug environment variables at module load time
if (isDevMode) {
	console.log('🔧 [Features] Environment variables at module load:', {
		EXPO_PUBLIC_AI_INSIGHTS: process.env.EXPO_PUBLIC_AI_INSIGHTS,
		EXPO_PUBLIC_AI_INSIGHTS_PREVIEW:
			process.env.EXPO_PUBLIC_AI_INSIGHTS_PREVIEW,
		EXPO_PUBLIC_NEW_BUDGETS_V2: process.env.EXPO_PUBLIC_NEW_BUDGETS_V2,
		EXPO_PUBLIC_GOALS_TIMELINE: process.env.EXPO_PUBLIC_GOALS_TIMELINE,
	});
}

if (isDevMode) {
	console.log('🔧 [Features] Environment defaults computed:', envDefaults);
}

let remote: Partial<Record<FlagKey, boolean>> = {};
let local: Partial<Record<FlagKey, boolean>> = {};

export const Features = new Proxy({} as Record<FlagKey, boolean>, {
	get(_, k: string) {
		const key = k as FlagKey;
		const result = (local[key] ??
			remote[key] ??
			envDefaults[key] ??
			false) as boolean;

		// Debug logging for AI Insights specifically
		if (key === 'aiInsights') {
			if (isDevMode) {
				console.log('🔧 [Features] AI Insights resolution:', {
					key,
					local: local[key],
					remote: remote[key],
					envDefaults: envDefaults[key],
					finalResult: result,
					envValue: process.env.EXPO_PUBLIC_AI_INSIGHTS,
				});
			}
		}

		return result;
	},
});

export async function loadLocalOverrides() {
	try {
		const raw = await AsyncStorage.getItem('@flags');
		local = raw ? JSON.parse(raw) : {};
		if (isDevMode) {
			console.log('🔧 [Features] Loaded local overrides:', local);
			console.log('🔧 [Features] Raw AsyncStorage value:', raw);
			console.log('🔧 [Features] Environment defaults:', envDefaults);
		}
	} catch (error) {
		console.warn('Failed to load local feature flag overrides:', error);
		local = {};
	}
}

export async function setLocalOverride<K extends FlagKey>(
	key: K,
	val: boolean
) {
	local[key] = val;
	try {
		await AsyncStorage.setItem('@flags', JSON.stringify(local));
		if (isDevMode) {
			console.log(`🔧 [Features] Set local override: ${key} = ${val}`);
		}
	} catch (error) {
		console.warn('Failed to save local feature flag override:', error);
	}
}

export function setRemoteFlags(f: Partial<Record<FlagKey, boolean>>) {
	remote = { ...remote, ...f };
	if (isDevMode) {
		console.log('🔧 [Features] Set remote flags:', remote);
	}
}

export function getResolvedFlags(): Record<FlagKey, boolean> {
	return {
		aiInsights: Features.aiInsights,
		aiInsightsPreview: Features.aiInsightsPreview,
		newBudgetsV2: Features.newBudgetsV2,
		goalsTimeline: Features.goalsTimeline,
	};
}

export function clearLocalOverrides() {
	local = {};
	AsyncStorage.removeItem('@flags').catch(console.warn);
	if (isDevMode) {
		console.log('🔧 [Features] Cleared local overrides');
	}
}

// Typed hook for components
export function useFeature(key: FlagKey): boolean {
	return Features[key];
}

// Service layer guard helper
export function guardFeature<K extends FlagKey>(
	key: K,
	callback: () => any
): any {
	if (!Features[key]) {
		if (isDevMode) {
			console.log(`🚫 [Features] ${key} disabled, skipping operation`);
		}
		return null;
	}
	return callback();
}

// Debug function to test feature flag resolution
export function debugFeatureFlags() {
	if (isDevMode) {
		console.log('🔧 [Features] === DEBUG FEATURE FLAGS ===');
		console.log('🔧 [Features] Environment variables:', {
			EXPO_PUBLIC_AI_INSIGHTS: process.env.EXPO_PUBLIC_AI_INSIGHTS,
			EXPO_PUBLIC_AI_INSIGHTS_PREVIEW:
				process.env.EXPO_PUBLIC_AI_INSIGHTS_PREVIEW,
			EXPO_PUBLIC_NEW_BUDGETS_V2: process.env.EXPO_PUBLIC_NEW_BUDGETS_V2,
			EXPO_PUBLIC_GOALS_TIMELINE: process.env.EXPO_PUBLIC_GOALS_TIMELINE,
		});
		console.log('🔧 [Features] Environment defaults:', envDefaults);
		console.log('🔧 [Features] Local overrides:', local);
		console.log('🔧 [Features] Remote flags:', remote);
		console.log('🔧 [Features] Current resolved flags:', getResolvedFlags());
		console.log('🔧 [Features] AI Insights specifically:', {
			envValue: process.env.EXPO_PUBLIC_AI_INSIGHTS,
			envDefault: envDefaults.aiInsights,
			localOverride: local.aiInsights,
			remoteFlag: remote.aiInsights,
			finalValue: Features.aiInsights,
		});
		console.log('🔧 [Features] === END DEBUG ===');
	}
}
