import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	useCallback,
} from 'react';
import { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import revenueCatService, {
	SubscriptionStatus,
	type Offerings,
} from '../services/subscriptions/revenueCatService';
import useAuth from './AuthContext';
import { createLogger } from '../utils/sublogger';

const logger = createLogger('SubscriptionContext');

interface SubscriptionContextType {
	// State
	isLoading: boolean;
	isPro: boolean;
	subscriptionStatus: SubscriptionStatus;
	customerInfo: CustomerInfo | null;
	offerings: Offerings | null;
	availablePackages: PurchasesPackage[];
	error: string | null;

	// Actions
	refreshSubscription: () => Promise<void>;
	purchasePackage: (
		packageToPurchase: PurchasesPackage
	) => Promise<CustomerInfo>;
	restorePurchases: () => Promise<CustomerInfo>;
	checkSubscriptionStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
	undefined
);

export function SubscriptionProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	// Note: This component must be rendered inside AuthProvider
	// The layout ensures this by placing SubscriptionProvider inside AuthProvider
	const { firebaseUser } = useAuth();
	const [isLoading, setIsLoading] = useState(true);
	const [isPro, setIsPro] = useState(false);
	const [subscriptionStatus, setSubscriptionStatus] =
		useState<SubscriptionStatus>({
			isActive: false,
			isPro: false,
			entitlements: [],
			customerInfo: null,
			activeSubscriptions: [],
			expirationDate: null,
			willRenew: false,
		});
	const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
	const [offerings, setOfferings] = useState<Offerings | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Check subscription status
	const checkSubscriptionStatus = useCallback(async () => {
		try {
			setError(null);
			const info = await revenueCatService.getCustomerInfo();
			const status = revenueCatService.getSubscriptionStatus(info);

			setCustomerInfo(info);
			setSubscriptionStatus(status);
			setIsPro(status.isPro);
		} catch (err: any) {
			logger.error('Failed to check subscription status:', err);
			setError(err.message || 'Failed to check subscription status');
		}
	}, []);

	// Refresh subscription data
	const refreshSubscription = useCallback(async () => {
		try {
			setError(null);
			setIsLoading(true);

			// Refresh both customer info and offerings
			const [info, offeringsData] = await Promise.all([
				revenueCatService.refreshCustomerInfo(),
				revenueCatService.getOfferings(),
			]);

			const status = revenueCatService.getSubscriptionStatus(info);

			setCustomerInfo(info);
			setOfferings(offeringsData);
			setSubscriptionStatus(status);
			setIsPro(status.isPro);
		} catch (err: any) {
			logger.error('Failed to refresh subscription:', err);
			setError(err.message || 'Failed to refresh subscription');
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Purchase a package
	const purchasePackage = useCallback(
		async (packageToPurchase: PurchasesPackage): Promise<CustomerInfo> => {
			try {
				setError(null);
				setIsLoading(true);

				const info = await revenueCatService.purchasePackage(packageToPurchase);
				const status = revenueCatService.getSubscriptionStatus(info);

				setCustomerInfo(info);
				setSubscriptionStatus(status);
				setIsPro(status.isPro);

				return info;
			} catch (err: any) {
				logger.error('Purchase failed:', err);
				setError(err.message || 'Purchase failed');
				throw err;
			} finally {
				setIsLoading(false);
			}
		},
		[]
	);

	// Restore purchases
	const restorePurchases = useCallback(async (): Promise<CustomerInfo> => {
		try {
			setError(null);
			setIsLoading(true);

			const info = await revenueCatService.restorePurchases();
			const status = revenueCatService.getSubscriptionStatus(info);

			setCustomerInfo(info);
			setSubscriptionStatus(status);
			setIsPro(status.isPro);

			return info;
		} catch (err: any) {
			logger.error('Restore purchases failed:', err);
			setError(err.message || 'Failed to restore purchases');
			throw err;
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Initialize RevenueCat when user is authenticated
	useEffect(() => {
		let isMounted = true;

		if (!firebaseUser?.uid) {
			// User not authenticated, log out from RevenueCat
			revenueCatService.logOut().catch((err) => {
				// Logout failures are non-fatal - just log and continue
				if (err && Object.keys(err).length > 0) {
					logger.debug('RevenueCat logOut error (non-fatal):', err);
				}
			});

			// Reset state
			if (isMounted) {
				setIsPro(false);
				setCustomerInfo(null);
				setOfferings(null);
				setSubscriptionStatus({
					isActive: false,
					isPro: false,
					entitlements: [],
					customerInfo: null,
					activeSubscriptions: [],
					expirationDate: null,
					willRenew: false,
				});
				setIsLoading(false);
			}
			return;
		}

		// Configure RevenueCat with Firebase UID
		const initRevenueCat = async () => {
			try {
				if (!isMounted) return;
				setIsLoading(true);
				setError(null);

				await revenueCatService.configure(firebaseUser.uid);

				if (!isMounted) return;
				await refreshSubscription();
			} catch (err: any) {
				if (!isMounted) return;
				logger.error('Failed to initialize RevenueCat:', err);

				// Check if error is due to native module not being linked
				if (
					err?.message?.includes('not linked') ||
					err?.message?.includes("doesn't seem to be linked")
				) {
					setError(
						'RevenueCat SDK requires a rebuild. Please rebuild the app after installing native packages.'
					);
				} else if (
					err?.readableErrorCode ===
						'OPERATION_ALREADY_IN_PROGRESS_FOR_PRODUCT_ERROR' ||
					err?.message?.includes('operation is already in progress')
				) {
					// This error usually resolves itself - just refresh subscription
					logger.warn('RevenueCat operation in progress, will retry');
					setTimeout(() => {
						if (isMounted) {
							refreshSubscription().catch(() => {
								// Ignore errors from retry
							});
						}
					}, 2000);
				} else {
					setError(err.message || 'Failed to initialize subscriptions');
				}
			} finally {
				if (isMounted) {
					setIsLoading(false);
				}
			}
		};

		initRevenueCat();

		return () => {
			isMounted = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [firebaseUser?.uid]); // Only depend on firebaseUser.uid, not refreshSubscription

	// Get available packages from offerings
	const availablePackages = offerings
		? revenueCatService.getAvailablePackages()
		: [];

	const value: SubscriptionContextType = {
		isLoading,
		isPro,
		subscriptionStatus,
		customerInfo,
		offerings,
		availablePackages,
		error,
		refreshSubscription,
		purchasePackage,
		restorePurchases,
		checkSubscriptionStatus,
	};

	return (
		<SubscriptionContext.Provider value={value}>
			{children}
		</SubscriptionContext.Provider>
	);
}

export function useSubscription() {
	const context = useContext(SubscriptionContext);
	if (!context) {
		throw new Error('useSubscription must be used within SubscriptionProvider');
	}
	return context;
}
