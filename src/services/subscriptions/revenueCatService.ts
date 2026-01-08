import Purchases, {
	type CustomerInfo,
	type PurchasesOfferings,
	type PurchasesPackage,
	type PurchasesStoreProduct,
	type PurchasesEntitlementInfo,
	LOG_LEVEL,
	type LogInResult,
} from 'react-native-purchases';
import { createLogger } from '../../utils/sublogger';

// Re-export types for use in other files (with aliases for backward compatibility)
export type {
	CustomerInfo,
	PurchasesPackage,
	PurchasesStoreProduct,
	PurchasesEntitlementInfo,
};
// Export Offerings as an alias for PurchasesOfferings for backward compatibility
export type Offerings = PurchasesOfferings;

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
	private offerings: PurchasesOfferings | null = null;
	private configurePromise: Promise<void> | null = null;

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
		// If already configured, return immediately
		if (this.isConfigured) {
			logger.debug('RevenueCat already configured, skipping');
			return;
		}

		// If configuration is in progress, return the existing promise
		if (this.configurePromise) {
			logger.debug('RevenueCat configuration already in progress, waiting...');
			return this.configurePromise;
		}

		// Create and store the configuration promise
		this.configurePromise = this._configureInternal(userId);

		try {
			await this.configurePromise;
		} catch (error) {
			// Reset promise on error so we can retry
			this.configurePromise = null;
			throw error;
		}

		return this.configurePromise;
	}

	private async _configureInternal(userId?: string): Promise<void> {
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
			await Promise.all([this.refreshCustomerInfo(), this.getOfferings()]);

			this.isConfigured = true;
			logger.info('RevenueCat configured successfully');
		} catch (error: any) {
			logger.error('Failed to configure RevenueCat:', error);

			// Handle OPERATION_ALREADY_IN_PROGRESS errors gracefully
			if (
				error?.readableErrorCode ===
					'OPERATION_ALREADY_IN_PROGRESS_FOR_PRODUCT_ERROR' ||
				error?.message?.includes('operation is already in progress')
			) {
				logger.warn(
					'RevenueCat operation already in progress, this should resolve automatically'
				);
				// Wait a bit and try to get customer info to verify everything is working
				await new Promise((resolve) => setTimeout(resolve, 1000));
				try {
					await this.refreshCustomerInfo();
					this.isConfigured = true;
					logger.info('RevenueCat recovered from concurrent operation error');
					return;
				} catch (recoveryError) {
					logger.error(
						'Failed to recover from concurrent operation:',
						recoveryError
					);
				}
			}

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
			const loginResult: LogInResult = await Purchases.logIn(userId);
			// logIn returns an object with customerInfo property
			const customerInfo = loginResult.customerInfo;
			this.customerInfo = customerInfo;
			logger.info('User identified successfully');
			return customerInfo;
		} catch (error: any) {
			// Handle OPERATION_ALREADY_IN_PROGRESS gracefully
			if (
				error?.readableErrorCode ===
					'OPERATION_ALREADY_IN_PROGRESS_FOR_PRODUCT_ERROR' ||
				error?.message?.includes('operation is already in progress')
			) {
				logger.warn(
					'logIn already in progress, fetching current customer info instead'
				);
				// If login is already in progress, just get the current customer info
				const customerInfo = await Purchases.getCustomerInfo();
				this.customerInfo = customerInfo;
				return customerInfo;
			}
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
			this.offerings = null;
			// Reset configured state so we can reconfigure for the next user
			this.isConfigured = false;
			this.configurePromise = null;
			logger.info('User logged out successfully');
			return customerInfo;
		} catch (error: any) {
			// RevenueCat sometimes returns empty error objects on logout when no user is logged in
			// This is not a fatal error - just log and continue
			if (!error || Object.keys(error).length === 0) {
				logger.debug(
					'RevenueCat logOut returned empty error (user likely not logged in)'
				);
				this.customerInfo = null;
				this.offerings = null;
				this.isConfigured = false;
				this.configurePromise = null;
				return null;
			}
			logger.warn('Failed to log out user:', error);
			// Don't throw - logOut failures shouldn't block user sign-out
			this.customerInfo = null;
			this.offerings = null;
			this.isConfigured = false;
			this.configurePromise = null;
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
	async getOfferings(): Promise<PurchasesOfferings | null> {
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
	async purchasePackage(
		packageToPurchase: PurchasesPackage
	): Promise<CustomerInfo> {
		try {
			logger.info('Purchasing package:', packageToPurchase.identifier);

			const { customerInfo } = await Purchases.purchasePackage(
				packageToPurchase
			);
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
	 * Falls back to "test_default" offering if "default" has no packages
	 */
	getAvailablePackages(): PurchasesPackage[] {
		if (!this.offerings?.current) {
			// Try to use test_default offering if current is not available
			const testDefault = this.offerings?.all?.['test_default'];
			if (testDefault?.availablePackages?.length) {
				logger.debug('Using test_default offering as fallback');
				return this.sortPackages(testDefault.availablePackages);
			}
			return [];
		}

		const packages = this.offerings.current.availablePackages;

		// If default offering has no packages, try test_default as fallback
		if (!packages || packages.length === 0) {
			const testDefault = this.offerings.all?.['test_default'];
			if (testDefault?.availablePackages?.length) {
				logger.debug(
					'Default offering has no packages, using test_default as fallback'
				);
				return this.sortPackages(testDefault.availablePackages);
			}
			return [];
		}

		return this.sortPackages(packages);
	}

	/**
	 * Sort packages by type (monthly first, then yearly)
	 */
	private sortPackages(packages: PurchasesPackage[]): PurchasesPackage[] {
		return packages.sort((a: PurchasesPackage, b: PurchasesPackage) => {
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

		// requestDate is a number (timestamp in milliseconds)
		const requestTimestamp =
			typeof requestDate === 'number'
				? requestDate
				: new Date(requestDate).getTime();
		const ageMs = Date.now() - requestTimestamp;
		return ageMs > 5 * 60 * 1000; // 5 minutes
	}
}

export default RevenueCatService.getInstance();
