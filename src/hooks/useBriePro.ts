import { useMemo } from 'react';
import useSubscription from '../context/SubscriptionContext';
import { BRIE_PRO_ENTITLEMENT } from '../services/subscriptions/revenueCatService';

/**
 * Hook to check if user has Brie Pro subscription
 * @returns {Object} - { isPro: boolean, isLoading: boolean, subscriptionStatus: SubscriptionStatus }
 */
export function useBriePro() {
	const { isPro, isLoading, subscriptionStatus } = useSubscription();

	const entitlement = useMemo(() => {
		if (!subscriptionStatus.customerInfo) return null;
		return subscriptionStatus.customerInfo.entitlements.active[BRIE_PRO_ENTITLEMENT];
	}, [subscriptionStatus.customerInfo]);

	return {
		isPro,
		isLoading,
		subscriptionStatus,
		entitlement,
		expirationDate: subscriptionStatus.expirationDate,
		willRenew: subscriptionStatus.willRenew,
	};
}


