import React, { useEffect, useMemo, useState } from 'react';
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

type BillingCycle = 'monthly' | 'yearly';

interface SubscriptionTier {
	tier: string; // 'basic' | 'premium' | 'enterprise'
	price: number; // base monthly price (USD)
	priceId: string; // monthly price id
	tokenLimit: number;
	requestLimit: number;
	conversationLimit: number;
	features: string[];
	popular?: boolean;
	yearlyPriceId?: string; // optional: Stripe price id for yearly
	yearlyDiscountPct?: number; // optional: % off when billed yearly
}

export default function UpgradeScreen() {
	const router = useRouter();

	const [loading, setLoading] = useState(false);
	const [fetching, setFetching] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [selectedTier, setSelectedTier] = useState<string | null>(null);
	const [billing, setBilling] = useState<BillingCycle>('monthly');

	const [pricing, setPricing] = useState<Record<string, SubscriptionTier>>({});

	useEffect(() => {
		(async () => {
			try {
				// Replace with your API call
				const data: Record<string, SubscriptionTier> = {
					basic: {
						tier: 'basic',
						price: 9.99,
						priceId: 'basic_monthly',
						tokenLimit: 50_000,
						requestLimit: 200,
						conversationLimit: 100,
						features: [
							'Unlimited AI conversations',
							'Advanced financial insights',
							'Conversation history',
							'Priority support',
							'Custom prompts',
						],
						yearlyPriceId: 'basic_yearly',
						yearlyDiscountPct: 20,
					},
					premium: {
						tier: 'premium',
						price: 19.99,
						priceId: 'premium_monthly',
						tokenLimit: 200_000,
						requestLimit: 1_000,
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
						yearlyPriceId: 'premium_yearly',
						yearlyDiscountPct: 25,
					},
					enterprise: {
						tier: 'enterprise',
						price: 99.99,
						priceId: 'enterprise_monthly',
						tokenLimit: 1_000_000,
						requestLimit: 10_000,
						conversationLimit: 5_000,
						features: [
							'Everything in Premium',
							'Unlimited everything',
							'Dedicated support',
							'Custom integrations',
							'SLA guarantees',
							'Onboarding consultation',
						],
						yearlyPriceId: 'enterprise_yearly',
						yearlyDiscountPct: 30,
					},
				};

				setPricing(data);
				// Default to the “popular” plan if present
				const defaultKey =
					Object.keys(data).find((k) => data[k].popular) ??
					Object.keys(data)[0];
				setSelectedTier(defaultKey);
			} catch {
				setError('Unable to load plans. Please try again.');
			} finally {
				setFetching(false);
			}
		})();
	}, []);

	const plans = useMemo(
		() => Object.entries(pricing).map(([key, plan]) => ({ key, ...plan })),
		[pricing]
	);

	const selectedPlan = useMemo(
		() => (selectedTier ? pricing[selectedTier] : undefined),
		[selectedTier, pricing]
	);

	const formattedPrice = (plan: SubscriptionTier) => {
		if (billing === 'monthly') return `$${plan.price.toFixed(2)}`;
		const discount = plan.yearlyDiscountPct ?? 0;
		const yearly = plan.price * 12 * (1 - discount / 100);
		// Show monthly equivalent for yearly billing
		const monthlyEq = yearly / 12;
		return `$${monthlyEq.toFixed(2)}`;
	};

	const yearlyBadgeText = (plan: SubscriptionTier) => {
		if (!plan.yearlyDiscountPct) return null;
		return `Save ${plan.yearlyDiscountPct}%`;
	};

	const formatNumber = (n: number) => {
		if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
		if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
		return `${n}`;
	};

	const handleChoose = (key: string) => {
		setSelectedTier(key);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
	};

	const handleUpgrade = async () => {
		if (!selectedTier || !selectedPlan) {
			Alert.alert('Select a plan', 'Please select a plan to continue.');
			return;
		}
		setLoading(true);
		try {
			// Call your backend to start checkout for selected tier & billing cycle
			// send: { priceId: billing === 'monthly' ? selectedPlan.priceId : selectedPlan.yearlyPriceId }
			await new Promise((r) => setTimeout(r, 1200));
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			Alert.alert(
				'Upgrade successful',
				`You’re on the ${titleCase(selectedTier)} plan.`,
				[{ text: 'Continue', onPress: () => router.back() }]
			);
		} catch {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			Alert.alert('Upgrade failed', 'Please try again in a moment.');
		} finally {
			setLoading(false);
		}
	};

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
					<Text style={styles.heroTitle}>Unlock your financial potential</Text>
					<Text style={styles.heroSubtitle}>
						Get deeper insights, faster responses, and tools that help you hit
						your goals sooner.
					</Text>

					{/* Billing Switch */}
					<View
						style={styles.billingSwitch}
						accessible
						accessibilityRole="tablist"
					>
						<BillingPill
							label="Monthly"
							active={billing === 'monthly'}
							onPress={() => setBilling('monthly')}
							accessibilityHint="Switch to monthly billing"
						/>
						<BillingPill
							label="Yearly"
							badge="Save up to 30%"
							active={billing === 'yearly'}
							onPress={() => setBilling('yearly')}
							accessibilityHint="Switch to yearly billing"
						/>
					</View>
				</LinearGradient>

				{/* Loading / Error */}
				{fetching ? (
					<View style={styles.loadingBox}>
						<ActivityIndicator />
						<Text style={styles.loadingText}>Loading plans…</Text>
					</View>
				) : error ? (
					<View style={styles.errorBox}>
						<Ionicons name="warning" size={18} color="#B91C1C" />
						<Text style={styles.errorText}>{error}</Text>
						<TouchableOpacity
							accessibilityRole="button"
							onPress={() => {
								setError(null);
								setFetching(true);
								// re-trigger fetch
								setTimeout(() => setFetching(false), 800);
							}}
							style={styles.retryBtn}
						>
							<Text style={styles.retryText}>Retry</Text>
						</TouchableOpacity>
					</View>
				) : (
					<>
						{/* Plans */}
						<View style={styles.plansWrap}>
							{plans.map((plan) => {
								const active = selectedTier === plan.key;
								const discountText =
									billing === 'yearly' ? yearlyBadgeText(plan) : null;
								return (
									<TouchableOpacity
										key={plan.key}
										activeOpacity={0.9}
										onPress={() => handleChoose(plan.key)}
										accessibilityRole="radio"
										accessibilityState={{ selected: active }}
										accessibilityLabel={`${titleCase(plan.key)} plan`}
										style={[
											styles.card,
											plan.popular && styles.cardPopular,
											active && styles.cardActive,
										]}
									>
										{plan.popular && (
											<View style={styles.popularTag}>
												<Ionicons name="star" size={12} color="#fff" />
												<Text style={styles.popularTagText}>Most popular</Text>
											</View>
										)}

										<View style={styles.cardHeader}>
											<Text style={styles.cardTitle}>
												{titleCase(plan.key)}
											</Text>
											<View style={styles.priceRow}>
												<Text style={styles.priceText}>
													{formattedPrice(plan)}
												</Text>
												<Text style={styles.periodText}>/mo</Text>
												{discountText ? (
													<View style={styles.discountPill}>
														<Text style={styles.discountPillText}>
															{discountText}
														</Text>
													</View>
												) : null}
											</View>
											<Text style={styles.caption}>Billed {billing}</Text>
										</View>

										<View style={styles.limitsRow}>
											<LimitChip
												icon="cube-outline"
												label={`${formatNumber(plan.tokenLimit)} tokens/mo`}
											/>
											<LimitChip
												icon="flash-outline"
												label={`${formatNumber(plan.requestLimit)} requests/mo`}
											/>
											<LimitChip
												icon="chatbubble-ellipses-outline"
												label={`${formatNumber(
													plan.conversationLimit
												)} convos/mo`}
											/>
										</View>

										<View style={styles.divider} />

										<View style={styles.featuresWrap}>
											{plan.features.map((f, i) => (
												<View key={i} style={styles.featureItem}>
													<Ionicons
														name="checkmark-circle"
														size={16}
														color="#10B981"
													/>
													<Text style={styles.featureText}>{f}</Text>
												</View>
											))}
										</View>

										<View style={styles.selectRow}>
											{active ? (
												<View style={styles.selectedBadge}>
													<Ionicons
														name="checkmark-circle"
														size={18}
														color="#10B981"
													/>
													<Text style={styles.selectedBadgeText}>Selected</Text>
												</View>
											) : (
												<Text style={styles.tapHint}>Tap to select</Text>
											)}
										</View>
									</TouchableOpacity>
								);
							})}
						</View>

						{/* Legal */}
						<Text style={styles.legalText}>
							By upgrading you agree to our Terms and Privacy Policy.
							Subscriptions auto-renew. Cancel anytime in your App Store
							settings.
						</Text>
					</>
				)}
			</ScrollView>

			{/* Sticky Upgrade Bar */}
			{!fetching && !error && (
				<View style={styles.stickyBar} accessibilityRole="summary">
					<View style={styles.stickyInfo}>
						<Ionicons name="shield-checkmark" size={18} color="#4F46E5" />
						<Text style={styles.stickyText}>
							{selectedPlan
								? `${titleCase(selectedPlan.tier)} • ${
										billing === 'monthly'
											? `$${selectedPlan.price.toFixed(2)}/mo`
											: `${formattedPrice(selectedPlan)}/mo (yearly)`
								  }`
								: 'Choose a plan'}
						</Text>
					</View>
					<TouchableOpacity
						style={[
							styles.upgradeBtn,
							!selectedPlan || loading ? styles.upgradeBtnDisabled : null,
						]}
						disabled={!selectedPlan || loading}
						onPress={handleUpgrade}
						accessibilityRole="button"
						accessibilityHint="Starts checkout"
						activeOpacity={0.9}
					>
						{loading ? (
							<ActivityIndicator color="#fff" />
						) : (
							<Text style={styles.upgradeBtnText}>Upgrade</Text>
						)}
					</TouchableOpacity>
				</View>
			)}
		</SafeAreaView>
	);
}

/* ---------- Small Presentational Components ---------- */

function BillingPill({
	label,
	active,
	onPress,
	badge,
	accessibilityHint,
}: {
	label: string;
	active?: boolean;
	onPress: () => void;
	badge?: string | null;
	accessibilityHint?: string;
}) {
	return (
		<TouchableOpacity
			style={[styles.pill, active && styles.pillActive]}
			onPress={onPress}
			accessibilityRole="tab"
			accessibilityState={{ selected: !!active }}
			accessibilityHint={accessibilityHint}
			activeOpacity={0.9}
		>
			<Text style={[styles.pillText, active && styles.pillTextActive]}>
				{label}
			</Text>
			{!!badge && active && (
				<View style={styles.pillBadge}>
					<Text style={styles.pillBadgeText}>{badge}</Text>
				</View>
			)}
		</TouchableOpacity>
	);
}

function LimitChip({ icon, label }: { icon: any; label: string }) {
	return (
		<View style={styles.limitChip}>
			<Ionicons name={icon} size={14} color="#4B5563" />
			<Text style={styles.limitChipText}>{label}</Text>
		</View>
	);
}

/* ---------- Helpers ---------- */

function titleCase(s: string) {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F6F7FB',
	},
	scroll: {
		paddingBottom: 140, // space for sticky bar
	},

	/* Hero */
	hero: {
		paddingHorizontal: 20,
		paddingTop: 28,
		paddingBottom: 20,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
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
	billingSwitch: {
		marginTop: 16,
		alignSelf: 'center',
		flexDirection: 'row',
		backgroundColor: '#EEF2FF',
		padding: 6,
		borderRadius: 999,
		gap: 6,
		borderWidth: 1,
		borderColor: '#E0E7FF',
	},
	pill: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 14,
		borderRadius: 999,
	},
	pillActive: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#C7D2FE',
	},
	pillText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
	pillTextActive: { color: '#111827' },
	pillBadge: {
		marginLeft: 8,
		backgroundColor: '#EEF2FF',
		borderRadius: 999,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderWidth: 1,
		borderColor: '#E0E7FF',
	},
	pillBadgeText: { fontSize: 11, color: '#4F46E5', fontWeight: '700' },

	/* Loading / Error */
	loadingBox: { alignItems: 'center', padding: 24 },
	loadingText: { marginTop: 8, color: '#6B7280' },
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
	errorText: { color: '#991B1B', fontWeight: '600' },
	retryBtn: {
		marginTop: 4,
		backgroundColor: '#FEE2E2',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 10,
	},
	retryText: { color: '#7F1D1D', fontWeight: '700' },

	/* Plans */
	plansWrap: {
		paddingHorizontal: 16,
		paddingTop: 16,
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
	popularTagText: { color: '#fff', fontSize: 11, fontWeight: '700' },

	cardHeader: { marginBottom: 12 },
	cardTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
	priceRow: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		gap: 6,
		marginTop: 4,
	},
	priceText: { fontSize: 28, fontWeight: '800', color: '#111827' },
	periodText: { fontSize: 14, color: '#6B7280', marginBottom: 2 },
	discountPill: {
		marginLeft: 6,
		backgroundColor: '#ECFDF5',
		borderWidth: 1,
		borderColor: '#D1FAE5',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 999,
	},
	discountPillText: { color: '#065F46', fontSize: 11, fontWeight: '700' },
	caption: { fontSize: 12, color: '#6B7280', marginTop: 2 },

	limitsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginTop: 8,
	},
	limitChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 999,
		backgroundColor: '#F9FAFB',
		borderWidth: 1,
		borderColor: '#F3F4F6',
	},
	limitChipText: { color: '#4B5563', fontSize: 12, fontWeight: '600' },

	divider: {
		height: 1,
		backgroundColor: '#F1F5F9',
		marginVertical: 12,
	},

	featuresWrap: { gap: 8 },
	featureItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	featureText: { color: '#374151', fontSize: 14, flexShrink: 1 },

	selectRow: {
		marginTop: 12,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
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
	selectedBadgeText: { color: '#065F46', fontWeight: '700', fontSize: 12 },
	tapHint: { color: '#6B7280', fontSize: 12 },

	/* Legal */
	legalText: {
		marginTop: 16,
		marginHorizontal: 20,
		textAlign: 'center',
		color: '#94A3B8',
		fontSize: 12,
		lineHeight: 18,
	},

	/* Sticky bar */
	stickyBar: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#FFFFFFEE',
		borderTopWidth: 1,
		borderTopColor: '#E5E7EB',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	stickyInfo: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	stickyText: { color: '#111827', fontWeight: '700' },
	upgradeBtn: {
		backgroundColor: '#4F46E5',
		paddingHorizontal: 18,
		paddingVertical: 12,
		borderRadius: 12,
		shadowColor: '#4F46E5',
		shadowOpacity: 0.25,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
	},
	upgradeBtnDisabled: {
		backgroundColor: '#A5B4FC',
		shadowOpacity: 0,
	},
	upgradeBtnText: { color: '#fff', fontWeight: '800' },
});
