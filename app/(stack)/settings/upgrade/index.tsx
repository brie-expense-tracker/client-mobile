import React, { useEffect, useState, useMemo } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	SafeAreaView,
	StatusBar,
	Alert,
	ActivityIndicator,
	Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { getRevenueCatUI } from '../../../../src/services/subscriptions/revenueCatUIImports';
import { useSubscription } from '../../../../src/context/SubscriptionContext';
import { PurchasesPackage } from 'react-native-purchases';

export default function UpgradeScreen() {
	const router = useRouter();
	const {
		isLoading: subscriptionLoading,
		isPro,
		subscriptionStatus,
		availablePackages,
		offerings,
		purchasePackage,
		restorePurchases,
		refreshSubscription,
		error: subscriptionError,
	} = useSubscription();

	const [loading, setLoading] = useState(false);
	const [selectedPackage, setSelectedPackage] =
		useState<PurchasesPackage | null>(null);
	const [restoring, setRestoring] = useState(false);

	useEffect(() => {
		// Refresh subscription status when screen loads
		refreshSubscription().catch(() => {
			// Silently handle errors - they're already shown via subscriptionError state
		});
	}, [refreshSubscription]);

	// Get the best available offering (fallback to test_default if default has no packages)
	const bestOffering = useMemo(() => {
		if (!offerings) return null;

		// Use current offering if it has packages
		if (offerings.current?.availablePackages?.length) {
			return offerings.current;
		}

		// Fallback to test_default if available
		const testDefault = offerings.all?.['test_default'];
		if (testDefault?.availablePackages?.length) {
			return testDefault;
		}

		return offerings.current || null;
	}, [offerings]);

	// Handle purchase
	const handlePurchase = async (pkg: PurchasesPackage) => {
		try {
			setLoading(true);
			setSelectedPackage(pkg);

			await purchasePackage(pkg);

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			Alert.alert(
				'Welcome to Brie Pro!',
				'Your subscription is now active. Enjoy all Pro features!',
				[
					{
						text: 'Get Started',
						onPress: () => router.back(),
					},
				]
			);
		} catch (error: any) {
			if (error.message === 'Purchase was cancelled') {
				// User cancelled, don't show error
				return;
			}

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			Alert.alert(
				'Purchase Failed',
				error.message || 'Unable to complete purchase. Please try again.',
				[{ text: 'OK' }]
			);
		} finally {
			setLoading(false);
			setSelectedPackage(null);
		}
	};

	// Handle restore purchases
	const handleRestore = async () => {
		try {
			setRestoring(true);
			await restorePurchases();

			if (isPro) {
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
				Alert.alert(
					'Purchases Restored',
					'Your subscription has been restored.',
					[{ text: 'OK', onPress: () => router.back() }]
				);
			} else {
				Alert.alert(
					'No Purchases Found',
					"We couldn't find any active subscriptions to restore.",
					[{ text: 'OK' }]
				);
			}
		} catch (error: any) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			Alert.alert(
				'Restore Failed',
				error.message || 'Unable to restore purchases. Please try again.',
				[{ text: 'OK' }]
			);
		} finally {
			setRestoring(false);
		}
	};

	// Format price

	// Get package display name
	const getPackageDisplayName = (pkg: PurchasesPackage) => {
		switch (pkg.packageType) {
			case 'MONTHLY':
				return 'Monthly';
			case 'ANNUAL':
				return 'Yearly';
			case 'SIX_MONTH':
				return '6 Months';
			case 'THREE_MONTH':
				return '3 Months';
			case 'TWO_MONTH':
				return '2 Months';
			case 'WEEKLY':
				return 'Weekly';
			case 'LIFETIME':
				return 'Lifetime';
			default:
				return pkg.identifier;
		}
	};

	// If user already has Pro, show success state
	if (isPro) {
		const expirationDate = subscriptionStatus.expirationDate;
		const willRenew = subscriptionStatus.willRenew;

		return (
			<SafeAreaView style={styles.container}>
				<StatusBar
					barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
				/>
				<ScrollView
					contentContainerStyle={styles.scroll}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.proContainer}>
						<View style={styles.proBadge}>
							<Ionicons name="checkmark-circle" size={48} color="#10B981" />
						</View>
						<Text style={styles.proTitle}>You&apos;re a Brie Pro Member!</Text>
						<Text style={styles.proSubtitle}>
							Enjoy all the premium features
						</Text>

						{expirationDate && (
							<View style={styles.proInfo}>
								<Text style={styles.proInfoText}>
									{willRenew
										? `Renews on ${expirationDate.toLocaleDateString()}`
										: `Expires on ${expirationDate.toLocaleDateString()}`}
								</Text>
							</View>
						)}
					</View>
				</ScrollView>
			</SafeAreaView>
		);
	}

	// Show RevenueCat Paywall directly if available (skip custom UI step)
	if (bestOffering) {
		const { Paywall: PaywallComponent, isUIAvailable: uiAvailable } =
			getRevenueCatUI();

		if (uiAvailable && PaywallComponent) {
			return (
				<PaywallComponent
					offering={bestOffering}
					onDismiss={() => {
						refreshSubscription();
						router.back();
					}}
					onPurchaseCompleted={(customerInfo: any) => {
						refreshSubscription();
						Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
						Alert.alert(
							'Welcome to Brie Pro!',
							'Your subscription is now active.',
							[{ text: 'Get Started', onPress: () => router.back() }]
						);
					}}
					onPurchaseError={(error: any) => {
						if (error.userCancelled) {
							return;
						}
						Alert.alert('Purchase Failed', error.message);
					}}
					onRestoreCompleted={(customerInfo: any) => {
						refreshSubscription();
						if (isPro) {
							Alert.alert(
								'Purchases Restored',
								'Your subscription has been restored.',
								[{ text: 'OK', onPress: () => router.back() }]
							);
						} else {
							Alert.alert(
								'No Purchases Found',
								"We couldn't find any active subscriptions to restore.",
								[{ text: 'OK' }]
							);
						}
					}}
					onRestoreError={(error: any) => {
						Alert.alert('Restore Failed', error.message);
					}}
				/>
			);
		}
		// If UI components not available, fall through to show custom fallback UI
	}

	// Custom fallback UI
	return (
		<SafeAreaView style={styles.container}>
			<StatusBar
				barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
			/>
			<ScrollView
				contentContainerStyle={styles.scroll}
				showsVerticalScrollIndicator={false}
			>
				{/* Hero */}
				<LinearGradient
					colors={['#EEF2FF', '#FFFFFF']}
					start={{ x: 0, y: 0 }}
					end={{ x: 0.2, y: 1 }}
					style={styles.hero}
				>
					<View style={styles.heroIconWrap}>
						<View style={styles.heroIcon}>
							<Ionicons name="sparkles" size={28} color="#6D28D9" />
						</View>
					</View>
					<Text style={styles.heroTitle}>Unlock Brie Pro</Text>
					<Text style={styles.heroSubtitle}>
						Get advanced features, unlimited insights, and premium support to
						take your financial journey to the next level.
					</Text>
				</LinearGradient>

				{/* Loading State */}
				{subscriptionLoading ? (
					<View style={styles.loadingBox}>
						<ActivityIndicator size="large" color="#4F46E5" />
						<Text style={styles.loadingText}>Loading plans…</Text>
					</View>
				) : subscriptionError ? (
					<View style={styles.errorBox}>
						<Ionicons name="warning" size={18} color="#B91C1C" />
						<Text style={styles.errorText}>{subscriptionError}</Text>
						<TouchableOpacity
							onPress={() => refreshSubscription()}
							style={styles.retryBtn}
						>
							<Text style={styles.retryText}>Retry</Text>
						</TouchableOpacity>
					</View>
				) : availablePackages.length === 0 ? (
					<View style={styles.errorBox}>
						<Ionicons name="information-circle" size={18} color="#3B82F6" />
						<Text style={styles.errorText}>
							No subscription plans available at this time.
						</Text>
					</View>
				) : (
					<>
						{/* Packages */}
						<View style={styles.packagesWrap}>
							{availablePackages.map((pkg) => {
								const isSelected =
									selectedPackage?.identifier === pkg.identifier;
								const isPurchasing = loading && isSelected;
								const isYearly = pkg.packageType === 'ANNUAL';
								const displayName = getPackageDisplayName(pkg);
								const priceString = pkg.product.priceString;

								return (
									<TouchableOpacity
										key={pkg.identifier}
										activeOpacity={0.9}
										onPress={() => !loading && handlePurchase(pkg)}
										disabled={loading}
										style={[
											styles.card,
											isYearly && styles.cardPopular,
											isSelected && styles.cardActive,
										]}
									>
										{isYearly && (
											<View style={styles.popularTag}>
												<Ionicons name="star" size={12} color="#fff" />
												<Text style={styles.popularTagText}>Best Value</Text>
											</View>
										)}

										<View style={styles.cardHeader}>
											<Text style={styles.cardTitle}>{displayName}</Text>
											<View style={styles.priceRow}>
												<Text style={styles.priceText}>{priceString}</Text>
												{isYearly && (
													<View style={styles.discountPill}>
														<Text style={styles.discountPillText}>
															Save 17%
														</Text>
													</View>
												)}
											</View>
										</View>

										<View style={styles.selectRow}>
											{isPurchasing ? (
												<ActivityIndicator color="#4F46E5" />
											) : isSelected ? (
												<View style={styles.selectedBadge}>
													<Ionicons
														name="checkmark-circle"
														size={18}
														color="#10B981"
													/>
													<Text style={styles.selectedBadgeText}>
														Purchasing...
													</Text>
												</View>
											) : (
												<Text style={styles.tapHint}>Tap to subscribe</Text>
											)}
										</View>
									</TouchableOpacity>
								);
							})}
						</View>

						{/* Restore Purchases */}
						<TouchableOpacity
							onPress={handleRestore}
							disabled={restoring}
							style={styles.restoreButton}
						>
							{restoring ? (
								<ActivityIndicator color="#4F46E5" />
							) : (
								<>
									<Ionicons name="refresh" size={16} color="#4F46E5" />
									<Text style={styles.restoreButtonText}>
										Restore Purchases
									</Text>
								</>
							)}
						</TouchableOpacity>

						{/* Legal */}
						<Text style={styles.legalText}>
							Subscriptions auto-renew unless cancelled. Cancel anytime in
							Settings or your App Store account settings. By subscribing, you
							agree to our Terms of Service and Privacy Policy.
						</Text>
					</>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
	scroll: {
		paddingBottom: 40,
	},

	/* Hero */
	hero: {
		paddingHorizontal: 20,
		paddingTop: 28,
		paddingBottom: 28,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
	},
	heroIconWrap: { alignItems: 'center', marginBottom: 12 },
	heroIcon: {
		width: 54,
		height: 54,
		borderRadius: 16,
		backgroundColor: '#EDE9FE',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#DDD6FE',
	},
	heroTitle: {
		fontSize: 22,
		fontWeight: '800',
		color: '#111827',
		textAlign: 'center',
		marginBottom: 8,
	},
	heroSubtitle: {
		fontSize: 14,
		color: '#6B7280',
		textAlign: 'center',
		lineHeight: 20,
		marginHorizontal: 8,
	},

	/* Loading / Error */
	loadingBox: {
		alignItems: 'center',
		padding: 48,
		marginTop: 32,
	},
	loadingText: {
		marginTop: 12,
		color: '#6B7280',
		fontSize: 14,
	},
	errorBox: {
		marginHorizontal: 16,
		marginTop: 16,
		padding: 14,
		borderRadius: 12,
		backgroundColor: '#FEF2F2',
		borderWidth: 1,
		borderColor: '#FECACA',
		alignItems: 'center',
		gap: 8,
	},
	errorText: {
		color: '#991B1B',
		fontWeight: '600',
		textAlign: 'center',
		fontSize: 14,
	},
	retryBtn: {
		marginTop: 4,
		backgroundColor: '#FEE2E2',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 10,
	},
	retryText: {
		color: '#7F1D1D',
		fontWeight: '700',
		fontSize: 13,
	},

	/* Pro Status */
	proContainer: {
		alignItems: 'center',
		padding: 48,
		marginTop: 64,
	},
	proBadge: {
		marginBottom: 16,
	},
	proTitle: {
		fontSize: 24,
		fontWeight: '800',
		color: '#111827',
		marginBottom: 8,
		textAlign: 'center',
	},
	proSubtitle: {
		fontSize: 16,
		color: '#6B7280',
		textAlign: 'center',
		marginBottom: 24,
	},
	proInfo: {
		marginTop: 16,
		padding: 12,
		backgroundColor: '#F0FDF4',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#D1FAE5',
	},
	proInfoText: {
		color: '#065F46',
		fontSize: 14,
		fontWeight: '600',
	},

	/* Packages */
	packagesWrap: {
		paddingHorizontal: 16,
		paddingTop: 24,
		gap: 14,
	},
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		shadowColor: '#000',
		shadowOpacity: 0.04,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 3 },
	},
	cardPopular: {
		borderColor: '#C7D2FE',
		shadowOpacity: 0.06,
	},
	cardActive: {
		borderColor: '#10B981',
		backgroundColor: '#F0FDF4',
	},
	popularTag: {
		position: 'absolute',
		top: 12,
		right: 12,
		backgroundColor: '#4F46E5',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 999,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	popularTagText: {
		color: '#fff',
		fontSize: 11,
		fontWeight: '700',
	},
	cardHeader: {
		marginBottom: 12,
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: '800',
		color: '#111827',
		marginBottom: 8,
	},
	priceRow: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		gap: 6,
	},
	priceText: {
		fontSize: 28,
		fontWeight: '800',
		color: '#111827',
	},
	discountPill: {
		marginLeft: 6,
		backgroundColor: '#ECFDF5',
		borderWidth: 1,
		borderColor: '#D1FAE5',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 999,
	},
	discountPillText: {
		color: '#065F46',
		fontSize: 11,
		fontWeight: '700',
	},
	selectRow: {
		marginTop: 12,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#F1F5F9',
	},
	selectedBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: '#ECFDF5',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: '#D1FAE5',
	},
	selectedBadgeText: {
		color: '#065F46',
		fontWeight: '700',
		fontSize: 12,
	},
	tapHint: {
		color: '#6B7280',
		fontSize: 14,
		fontWeight: '600',
	},

	/* Buttons */
	restoreButton: {
		marginHorizontal: 16,
		marginTop: 12,
		paddingVertical: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	restoreButtonText: {
		color: '#4F46E5',
		fontWeight: '600',
		fontSize: 14,
	},

	/* Legal */
	legalText: {
		marginTop: 24,
		marginHorizontal: 20,
		textAlign: 'center',
		color: '#94A3B8',
		fontSize: 11,
		lineHeight: 16,
	},
});
