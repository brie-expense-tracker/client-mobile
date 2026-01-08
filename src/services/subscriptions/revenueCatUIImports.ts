/**
 * Lazy import for RevenueCat UI (react-native-purchases-ui)
 *
 * RevenueCat UI exports a default object (RevenueCatUI) that contains:
 * - Paywall component at RevenueCatUI.Paywall
 * - Methods like presentPaywall() and presentPaywallIfNeeded()
 */

let RevenueCatUI: any = null;
let Paywall: any = null;

let isUIAvailable = false;
let isUILoading = false;

const loadUIModules = () => {
	if (isUILoading) return { RevenueCatUI, Paywall, isUIAvailable };
	if (isUIAvailable) return { RevenueCatUI, Paywall, isUIAvailable };

	isUILoading = true;

	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const mod = require('react-native-purchases-ui');

		// Some builds export { default: RevenueCatUI }, some export RevenueCatUI directly.
		const rcui = mod?.default ?? mod;

		// Paywall is a property on the default export
		const paywall = rcui?.Paywall;

		RevenueCatUI = rcui;
		Paywall = paywall;

		// Consider UI "available" if we have either Paywall component or the presentation methods
		isUIAvailable =
			!!Paywall ||
			typeof RevenueCatUI?.presentPaywall === 'function' ||
			typeof RevenueCatUI?.presentPaywallIfNeeded === 'function';
	} catch (e: any) {
		// In Expo Go / dev situations, this can fail due to native module availability
		// The error might be from NativeEventEmitter initialization
		if (e?.message && !e.message.includes('NativeEventEmitter')) {
			console.warn('[RevenueCat UI] Failed to load UI components:', e.message);
		}
		isUIAvailable = false;
	} finally {
		isUILoading = false;
	}

	return { RevenueCatUI, Paywall, isUIAvailable };
};

export const getRevenueCatUI = () => loadUIModules();
