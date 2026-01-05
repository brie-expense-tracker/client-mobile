/**
 * Conditional imports for RevenueCat UI components
 * These may not be available if native modules aren't linked yet
 */

let PurchasesPaywall: any = null;
let PurchasesCustomerInfo: any = null;
let isUIAvailable = false;
let isUILoading = false;

// Lazy load RevenueCat UI components to avoid NativeEventEmitter errors on initial load
const loadUIModules = () => {
	if (isUILoading || isUIAvailable) {
		return { PurchasesPaywall, PurchasesCustomerInfo, isUIAvailable };
	}

	isUILoading = true;
	
	try {
		// Use dynamic import to avoid issues during module initialization
		const uiModule = require('react-native-purchases-ui');
		
		// Check if the module has the expected exports
		if (uiModule && (uiModule.default || uiModule.PurchasesPaywall || uiModule.PurchasesCustomerInfo)) {
			PurchasesPaywall = uiModule.default || uiModule.PurchasesPaywall;
			PurchasesCustomerInfo = uiModule.default || uiModule.PurchasesCustomerInfo;
			
			// Verify the components are actually available (not just placeholder)
			if (PurchasesPaywall || PurchasesCustomerInfo) {
				isUIAvailable = true;
			}
		}
	} catch (error: any) {
		// UI components not available - this is okay during development
		// The error might be from NativeEventEmitter initialization
		if (error?.message && !error.message.includes('NativeEventEmitter')) {
			console.warn('[RevenueCat UI] Failed to load UI components:', error.message);
		}
		isUIAvailable = false;
	} finally {
		isUILoading = false;
	}

	return { PurchasesPaywall, PurchasesCustomerInfo, isUIAvailable };
};

// Export getter function that lazily loads modules
export const getRevenueCatUI = () => loadUIModules();

// Export constants (will be set when modules load)
export { PurchasesPaywall, PurchasesCustomerInfo, isUIAvailable };

