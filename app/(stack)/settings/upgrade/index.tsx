import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	SafeAreaView,
	StatusBar,
	Platform,
	Alert,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface SubscriptionTier {
	tier: string;
	price: number;
	priceId: string;
	tokenLimit: number;
	requestLimit: number;
	conversationLimit: number;
	features: string[];
	popular?: boolean;
}

export default function UpgradeScreen() {
	const router = useRouter();
	const [selectedTier, setSelectedTier] = useState<string>('basic');
	const [loading, setLoading] = useState(false);
	const [pricing, setPricing] = useState<Record<string, SubscriptionTier>>({});

	useEffect(() => {
		fetchPricing();
	}, []);

	const fetchPricing = async () => {
		try {
			// This would typically fetch from your API
			setPricing({
				basic: {
					tier: 'basic',
					price: 9.99,
					priceId: 'basic_monthly',
					tokenLimit: 50000,
					requestLimit: 200,
					conversationLimit: 100,
					features: [
						'Unlimited AI conversations',
						'Advanced financial insights',
						'Conversation history',
						'Priority support',
						'Custom prompts',
					],
				},
				premium: {
					tier: 'premium',
					price: 19.99,
					priceId: 'premium_monthly',
					tokenLimit: 200000,
					requestLimit: 1000,
					conversationLimit: 500,
					features: [
						'Everything in Basic',
						'Predictive spending analysis',
						'Advanced analytics dashboard',
						'Personalized recommendations',
						'API access',
						'White-label options',
					],
					popular: true,
				},
				enterprise: {
					tier: 'enterprise',
					price: 99.99,
					priceId: 'enterprise_monthly',
					tokenLimit: 1000000,
					requestLimit: 10000,
					conversationLimit: 5000,
					features: [
						'Everything in Premium',
						'Unlimited everything',
						'Dedicated support',
						'Custom integrations',
						'SLA guarantees',
						'Onboarding consultation',
					],
				},
			});
		} catch (error) {
			console.error('Error fetching pricing:', error);
		}
	};

	const handleUpgrade = async () => {
		if (selectedTier === 'free') {
			Alert.alert('Invalid Selection', 'Please select a paid tier to upgrade.');
			return;
		}

		setLoading(true);
		try {
			// Simulate upgrade process
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// In a real app, you'd call your upgrade API here
			// await upgradeSubscription(selectedTier);

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			Alert.alert(
				'Upgrade Successful!',
				`Welcome to ${
					selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)
				} tier!`,
				[
					{
						text: 'Continue',
						onPress: () => router.back(),
					},
				]
			);
		} catch (error) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			Alert.alert(
				'Upgrade Failed',
				'There was an error processing your upgrade. Please try again.'
			);
		} finally {
			setLoading(false);
		}
	};

	const formatNumber = (num: number) => {
		if (num >= 1000000) {
			return `${(num / 1000000).toFixed(1)}M`;
		} else if (num >= 1000) {
			return `${(num / 1000).toFixed(1)}K`;
		}
		return num.toString();
	};

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar barStyle="dark-content" />

			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => router.back()}
					style={styles.backButton}
					hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
				>
					<Ionicons name="chevron-back" size={28} color="#007AFF" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Upgrade to Premium</Text>
				<View style={styles.placeholder} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Hero Section */}
				<View style={styles.heroSection}>
					<View style={styles.heroIcon}>
						<Ionicons name="sparkles" size={48} color="#8B5CF6" />
					</View>
					<Text style={styles.heroTitle}>Unlock Your Financial Potential</Text>
					<Text style={styles.heroSubtitle}>
						Get unlimited AI assistance, advanced insights, and personalized
						recommendations to achieve your financial goals faster.
					</Text>
				</View>

				{/* Features Preview */}
				<View style={styles.featuresSection}>
					<Text style={styles.sectionTitle}>Premium Features</Text>
					<View style={styles.featuresGrid}>
						<View style={styles.featureItem}>
							<View style={styles.featureIcon}>
								<Ionicons name="infinite" size={20} color="#8B5CF6" />
							</View>
							<Text style={styles.featureText}>Unlimited AI conversations</Text>
						</View>
						<View style={styles.featureItem}>
							<View style={styles.featureIcon}>
								<Ionicons name="analytics" size={20} color="#8B5CF6" />
							</View>
							<Text style={styles.featureText}>
								Advanced financial insights
							</Text>
						</View>
						<View style={styles.featureItem}>
							<View style={styles.featureIcon}>
								<Ionicons name="trending-up" size={20} color="#8B5CF6" />
							</View>
							<Text style={styles.featureText}>
								Predictive spending analysis
							</Text>
						</View>
						<View style={styles.featureItem}>
							<View style={styles.featureIcon}>
								<Ionicons name="bulb" size={20} color="#8B5CF6" />
							</View>
							<Text style={styles.featureText}>
								Personalized recommendations
							</Text>
						</View>
						<View style={styles.featureItem}>
							<View style={styles.featureIcon}>
								<Ionicons name="shield-checkmark" size={20} color="#8B5CF6" />
							</View>
							<Text style={styles.featureText}>Priority support</Text>
						</View>
						<View style={styles.featureItem}>
							<View style={styles.featureIcon}>
								<Ionicons name="settings" size={20} color="#8B5CF6" />
							</View>
							<Text style={styles.featureText}>Custom AI prompts</Text>
						</View>
					</View>
				</View>

				{/* Subscription Tiers */}
				<View style={styles.tiersSection}>
					<Text style={styles.sectionTitle}>Choose Your Plan</Text>
					{Object.entries(pricing).map(([key, tier]) => (
						<TouchableOpacity
							key={key}
							style={[
								styles.tierCard,
								selectedTier === key && styles.selectedTier,
								tier.popular && styles.popularTier,
							]}
							onPress={() => {
								setSelectedTier(key);
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
							}}
						>
							{tier.popular && (
								<View style={styles.popularBadge}>
									<Text style={styles.popularBadgeText}>Most Popular</Text>
								</View>
							)}

							<View style={styles.tierHeader}>
								<View style={styles.tierInfo}>
									<Text style={styles.tierName}>
										{key.charAt(0).toUpperCase() + key.slice(1)}
									</Text>
									<Text style={styles.tierPrice}>${tier.price}</Text>
									<Text style={styles.tierPeriod}>per month</Text>
								</View>
								{selectedTier === key && (
									<View style={styles.selectedIndicator}>
										<Ionicons
											name="checkmark-circle"
											size={28}
											color="#34C759"
										/>
									</View>
								)}
							</View>

							<View style={styles.tierLimits}>
								<Text style={styles.limitText}>
									{formatNumber(tier.tokenLimit)} tokens/month
								</Text>
								<Text style={styles.limitText}>
									{formatNumber(tier.requestLimit)} requests/month
								</Text>
								<Text style={styles.limitText}>
									{formatNumber(tier.conversationLimit)} conversations/month
								</Text>
							</View>

							<View style={styles.tierFeatures}>
								{tier.features.map((feature, index) => (
									<View key={index} style={styles.featureItem}>
										<Ionicons name="checkmark" size={16} color="#34C759" />
										<Text style={styles.featureText}>{feature}</Text>
									</View>
								))}
							</View>
						</TouchableOpacity>
					))}
				</View>

				{/* Upgrade Button */}
				<TouchableOpacity
					style={[
						styles.upgradeButton,
						selectedTier === 'free' && styles.upgradeButtonDisabled,
					]}
					onPress={handleUpgrade}
					disabled={selectedTier === 'free' || loading}
					activeOpacity={0.9}
				>
					{loading ? (
						<ActivityIndicator color="white" />
					) : (
						<Text style={styles.upgradeButtonText}>
							Upgrade to{' '}
							{selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)}
						</Text>
					)}
				</TouchableOpacity>

				{/* Terms */}
				<Text style={styles.termsText}>
					By upgrading, you agree to our terms of service and privacy policy.
					Subscriptions auto-renew unless cancelled. Cancel anytime in your App
					Store settings.
				</Text>

				{/* Bottom spacing */}
				<View style={styles.bottomSpacing} />
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F2F2F7',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 16,
		backgroundColor: '#F2F2F7',
	},
	backButton: {
		padding: 8,
	},
	headerTitle: {
		fontSize: 17,
		fontWeight: '600',
		color: '#000',
	},
	placeholder: {
		width: 44,
	},
	content: {
		flex: 1,
		paddingHorizontal: 16,
	},
	heroSection: {
		alignItems: 'center',
		paddingVertical: 32,
		paddingHorizontal: 20,
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		marginBottom: 24,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	heroIcon: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: '#F3F4F6',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 20,
	},
	heroTitle: {
		fontSize: 24,
		fontWeight: '700',
		color: '#000',
		textAlign: 'center',
		marginBottom: 12,
		lineHeight: 32,
	},
	heroSubtitle: {
		fontSize: 16,
		color: '#6B7280',
		textAlign: 'center',
		lineHeight: 24,
	},
	featuresSection: {
		marginBottom: 24,
		padding: 20,
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#000',
		marginBottom: 20,
		textAlign: 'center',
	},
	featuresGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		gap: 16,
	},
	featureItem: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '48%',
		backgroundColor: '#F8F7FF',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E0D7FF',
	},
	featureIcon: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#F0E7FF',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	featureText: {
		flex: 1,
		fontSize: 14,
		color: '#5D3FD3',
		fontWeight: '500',
		lineHeight: 20,
	},
	tiersSection: {
		marginBottom: 24,
	},
	tierCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 20,
		marginBottom: 16,
		borderWidth: 2,
		borderColor: '#E5E7EB',
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
		position: 'relative',
	},
	selectedTier: {
		borderColor: '#34C759',
		backgroundColor: '#F0FFF4',
	},
	popularTier: {
		borderColor: '#8B5CF6',
		backgroundColor: '#F8F7FF',
	},
	popularBadge: {
		position: 'absolute',
		top: -12,
		right: 20,
		backgroundColor: '#8B5CF6',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12,
	},
	popularBadgeText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '600',
	},
	tierHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	tierInfo: {
		flex: 1,
	},
	tierName: {
		fontSize: 22,
		fontWeight: '700',
		color: '#000',
		marginBottom: 4,
	},
	tierPrice: {
		fontSize: 32,
		fontWeight: '700',
		color: '#8B5CF6',
	},
	tierPeriod: {
		fontSize: 14,
		color: '#6B7280',
		marginTop: 2,
	},
	selectedIndicator: {
		marginLeft: 16,
	},
	tierLimits: {
		marginBottom: 16,
		padding: 16,
		backgroundColor: '#F9FAFB',
		borderRadius: 12,
	},
	limitText: {
		fontSize: 14,
		color: '#6B7280',
		marginBottom: 4,
		fontWeight: '500',
	},
	tierFeatures: {
		gap: 12,
	},
	upgradeButton: {
		backgroundColor: '#8B5CF6',
		paddingVertical: 18,
		paddingHorizontal: 24,
		borderRadius: 16,
		alignItems: 'center',
		marginBottom: 16,
		shadowColor: '#8B5CF6',
		shadowOpacity: 0.3,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 4 },
		elevation: 4,
	},
	upgradeButtonDisabled: {
		backgroundColor: '#E5E7EB',
		shadowOpacity: 0,
		elevation: 0,
	},
	upgradeButtonText: {
		color: '#FFFFFF',
		fontSize: 18,
		fontWeight: '700',
	},
	termsText: {
		fontSize: 12,
		color: '#9CA3AF',
		textAlign: 'center',
		lineHeight: 18,
		marginBottom: 16,
		paddingHorizontal: 20,
	},
	bottomSpacing: {
		height: 40,
	},
});
