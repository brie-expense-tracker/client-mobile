import Purchases, {
	type CustomerInfo,
	type Offerings,
	type PurchasesPackage,
	type PurchasesStoreProduct,
	type PurchasesEntitlementInfo,
	LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { createLogger } from '../../utils/sublogger';

// Re-export types for use in other files
export type {
	CustomerInfo,
	Offerings,
	PurchasesPackage,
	PurchasesStoreProduct,
	PurchasesEntitlementInfo,
};

const logger = createLogger('RevenueCat');

// RevenueCat API key - test key for now
const REVENUECAT_API_KEY = 'test_XEuKZYJZDHHfOqxNxoLUxtCsbAH';

// Entitlement identifier
export const BRIE_PRO_ENTITLEMENT = 'Brie Pro';

// Product identifiers (these should match your RevenueCat dashboard)
export const PRODUCT_IDS = {
	MONTHLY: 'monthly',
	YEARLY: 'yearly',
};

export interface SubscriptionStatus {
	isActive: boolean;
	isPro: boolean;
	entitlements: PurchasesEntitlementInfo[];
	customerInfo: CustomerInfo | null;
	activeSubscriptions: string[];
	expirationDate: Date | null;
	willRenew: boolean;
}

/**
 * RevenueCat Service
 * Handles all subscription-related operations using RevenueCat SDK
 */
class RevenueCatService {
	private static instance: RevenueCatService;
	private isConfigured = false;
	private customerInfo: CustomerInfo | null = null;
	private offerings: Offerings | null = null;

	private constructor() {}

	static getInstance(): RevenueCatService {
		if (!RevenueCatService.instance) {
			RevenueCatService.instance = new RevenueCatService();
		}
		return RevenueCatService.instance;
	}

	/**
	 * Initialize RevenueCat SDK
	 * Should be called once when app starts, after user is authenticated
	 */
	async configure(userId?: string): Promise<void> {
		if (this.isConfigured) {
			logger.debug('RevenueCat already configured, skipping');
			return;
		}

		try {
			logger.info('Configuring RevenueCat SDK');

			// Set log level for debugging (change to ERROR in production)
			if (__DEV__ && LOG_LEVEL) {
				Purchases.setLogLevel(LOG_LEVEL.DEBUG);
			} else if (LOG_LEVEL) {
				Purchases.setLogLevel(LOG_LEVEL.ERROR);
			}

			// Configure RevenueCat with API key
			await Purchases.configure({ apiKey: REVENUECAT_API_KEY });

			// Set user ID if provided (should be Firebase UID)
			if (userId) {
				await this.identifyUser(userId);
			}

			// Load initial customer info and offerings
			await Promise.all([
				this.refreshCustomerInfo(),
				this.getOfferings(),
			]);

			this.isConfigured = true;
			logger.info('RevenueCat configured successfully');
		} catch (error) {
			logger.error('Failed to configure RevenueCat:', error);
			throw error;
		}
	}

	/**
	 * Identify user with Firebase UID
	 * This links the RevenueCat customer with your Firebase user
	 */
	async identifyUser(userId: string): Promise<CustomerInfo> {
		try {
			logger.debug('Identifying user:', userId);
			const customerInfo = await Purchases.logIn(userId);
			this.customerInfo = customerInfo;
			logger.info('User identified successfully');
			return customerInfo;
		} catch (error) {
			logger.error('Failed to identify user:', error);
			throw error;
		}
	}

	/**
	 * Log out current user
	 * Should be called when user logs out
	 */
	async logOut(): Promise<CustomerInfo | null> {
		try {
			logger.debug('Logging out RevenueCat user');
			const customerInfo = await Purchases.logOut();
			this.customerInfo = null;
			logger.info('User logged out successfully');
			return customerInfo;
		} catch (error: any) {
			// RevenueCat sometimes returns empty error objects on logout when no user is logged in
			// This is not a fatal error - just log and continue
			if (!error || Object.keys(error).length === 0) {
				logger.debug('RevenueCat logOut returned empty error (user likely not logged in)');
				this.customerInfo = null;
				return null;
			}
			logger.warn('Failed to log out user:', error);
			// Don't throw - logOut failures shouldn't block user sign-out
			this.customerInfo = null;
			return null;
		}
	}

	/**
	 * Get current customer info
	 */
	async getCustomerInfo(): Promise<CustomerInfo> {
		try {
			const customerInfo = await Purchases.getCustomerInfo();
			this.customerInfo = customerInfo;
			return customerInfo;
		} catch (error) {
			logger.error('Failed to get customer info:', error);
			throw error;
		}
	}

	/**
	 * Refresh customer info from RevenueCat servers
	 */
	async refreshCustomerInfo(): Promise<CustomerInfo> {
		try {
			logger.debug('Refreshing customer info');
			const customerInfo = await Purchases.getCustomerInfo();
			this.customerInfo = customerInfo;
			return customerInfo;
		} catch (error) {
			logger.error('Failed to refresh customer info:', error);
			throw error;
		}
	}

	/**
	 * Get available offerings (products/packages)
	 */
	async getOfferings(): Promise<Offerings | null> {
		try {
			const offerings = await Purchases.getOfferings();
			this.offerings = offerings;
			return offerings;
		} catch (error) {
			logger.error('Failed to get offerings:', error);
			return null;
		}
	}

	/**
	 * Check if user has active subscription for Brie Pro
	 */
	hasBriePro(customerInfo?: CustomerInfo): boolean {
		const info = customerInfo || this.customerInfo;
		if (!info) return false;

		const entitlement = info.entitlements.active[BRIE_PRO_ENTITLEMENT];
		return !!entitlement && entitlement.isActive;
	}

	/**
	 * Get subscription status
	 */
	getSubscriptionStatus(customerInfo?: CustomerInfo): SubscriptionStatus {
		const info = customerInfo || this.customerInfo;
		
		if (!info) {
			return {
				isActive: false,
				isPro: false,
				entitlements: [],
				customerInfo: null,
				activeSubscriptions: [],
				expirationDate: null,
				willRenew: false,
			};
		}

		const entitlement = info.entitlements.active[BRIE_PRO_ENTITLEMENT];
		const isPro = !!entitlement && entitlement.isActive;
		const expirationDate = entitlement?.expirationDate 
			? new Date(entitlement.expirationDate) 
			: null;

		return {
			isActive: isPro,
			isPro,
			entitlements: Object.values(info.entitlements.active),
			customerInfo: info,
			activeSubscriptions: Object.keys(info.activeSubscriptions),
			expirationDate,
			willRenew: entitlement?.willRenew ?? false,
		};
	}

	/**
	 * Purchase a package
	 */
	async purchasePackage(packageToPurchase: PurchasesPackage): Promise<CustomerInfo> {
		try {
			logger.info('Purchasing package:', packageToPurchase.identifier);
			
			const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
			this.customerInfo = customerInfo;
			
			logger.info('Purchase successful');
			return customerInfo;
		} catch (error: any) {
			logger.error('Purchase failed:', error);
			
			// Handle user cancellation gracefully
			if (error.userCancelled) {
				logger.debug('User cancelled purchase');
				throw new Error('Purchase was cancelled');
			}
			
			throw error;
		}
	}

	/**
	 * Restore purchases
	 */
	async restorePurchases(): Promise<CustomerInfo> {
		try {
			logger.info('Restoring purchases');
			const customerInfo = await Purchases.restorePurchases();
			this.customerInfo = customerInfo;
			logger.info('Purchases restored successfully');
			return customerInfo;
		} catch (error) {
			logger.error('Failed to restore purchases:', error);
			throw error;
		}
	}

	/**
	 * Get available packages for purchase
	 */
	getAvailablePackages(): PurchasesPackage[] {
		if (!this.offerings?.current) {
			return [];
		}

		// Return packages sorted by price (monthly first, then yearly)
		return this.offerings.current.availablePackages.sort((a, b) => {
			// Prefer monthly over yearly for display order
			if (a.packageType === 'MONTHLY' && b.packageType === 'ANNUAL') {
				return -1;
			}
			if (a.packageType === 'ANNUAL' && b.packageType === 'MONTHLY') {
				return 1;
			}
			return 0;
		});
	}

	/**
	 * Check if customer info is stale and needs refresh
	 */
	shouldRefreshCustomerInfo(): boolean {
		// Refresh if we don't have customer info or it's older than 5 minutes
		if (!this.customerInfo) return true;
		
		const requestDate = this.customerInfo.requestDate;
		if (!requestDate) return true;
		
		const ageMs = Date.now() - requestDate;
		return ageMs > 5 * 60 * 1000; // 5 minutes
	}
}

export default RevenueCatService.getInstance();

