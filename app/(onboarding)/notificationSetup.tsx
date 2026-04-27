import React, { useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	ScrollView,
	TouchableOpacity,
	Switch,
	Alert,
	ActivityIndicator,
} from 'react-native';
import { logger } from '../../src/utils/logger';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../../src/context/profileContext';
import { useOnboarding } from '../../src/context/OnboardingContext';
import { NotificationConsent, notificationService } from '../../src/services';
import { palette, radius, space } from '../../src/ui/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PresetKey = 'essential' | 'quiet';

// MVP: Cash-only. No insights (EXPO_PUBLIC_AI_INSIGHTS=0). Transactions + weekly summary only.
const PRESETS: Record<PresetKey, NotificationConsent> = {
	essential: {
		core: { budget: false, goals: false, transactions: true, system: true },
		aiInsights: {
			enabled: false,
			frequency: 'weekly',
			pushNotifications: false,
			emailAlerts: false,
		},
		marketing: {
			enabled: false,
			promotional: false,
			newsletter: false,
			productUpdates: false,
			specialOffers: false,
		},
		reminders: {
			enabled: true,
			weeklySummary: true,
			monthlyCheck: true,
			overspendingAlerts: true,
		},
	},
	quiet: {
		core: { budget: false, goals: false, transactions: false, system: true },
		aiInsights: {
			enabled: true,
			frequency: 'weekly',
			pushNotifications: false,
			emailAlerts: true,
		},
		marketing: {
			enabled: false,
			promotional: false,
			newsletter: false,
			productUpdates: false,
			specialOffers: false,
		},
		reminders: {
			enabled: true,
			weeklySummary: true,
			monthlyCheck: true,
			overspendingAlerts: false,
		},
	},
};

export default function NotificationPermissionScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { updatePreferences } = useProfile();
	const { markOnboardingComplete } = useOnboarding();

	const [selectedPreset, setSelectedPreset] =
		useState<PresetKey>('essential');
	const [consent, setConsent] = useState<NotificationConsent>(
		PRESETS.essential
	);
	const [showCustomize, setShowCustomize] = useState(false);
	const [loading, setLoading] = useState(false);

	const applyPreset = (presetKey: PresetKey) => {
		setSelectedPreset(presetKey);
		setConsent(PRESETS[presetKey]);
	};

	const handleContinue = async () => {
		logger.debug('🚀 [NotificationSetup] handleContinue called');
		setLoading(true);
		try {
			// Only ask for OS permission when user explicitly continues
			// This will trigger the native OS permission popup
			logger.debug(
				'📱 [NotificationSetup] Requesting notification permissions...'
			);
			// Call notificationService directly to get the push token and trigger OS popup
			const result = await notificationService.initialize(); // triggers OS prompt
			// Set up listeners only (no permission request)
			notificationService.setupNotificationListeners();

			const granted = result.granted;

			if (granted) {
				logger.debug('✅ [NotificationSetup] Permissions granted successfully');
			} else {
				logger.debug('⚠️ [NotificationSetup] Permissions denied');
				// Optional: guide user if they denied
				if (!result.canAskAgain) {
					Alert.alert(
						'Notifications are off',
						'You can enable notifications later in Settings.',
						[{ text: 'OK' }]
					);
				}
			}

			logger.debug('💾 [NotificationSetup] Saving notification preferences...');
			await updatePreferences({
				notifications: {
					enableNotifications: granted,
					weeklySummary: consent.reminders.weeklySummary,
					overspendingAlert: consent.reminders.overspendingAlerts,
					aiSuggestion: consent.aiInsights.enabled,
					budgetMilestones: consent.core.budget,
					monthlyFinancialCheck: consent.reminders.monthlyCheck,
					monthlySavingsTransfer: false,
				},
				aiInsights: {
					enabled: consent.aiInsights.enabled,
					frequency: consent.aiInsights.frequency,
					pushNotifications: consent.aiInsights.pushNotifications && granted,
					emailAlerts: consent.aiInsights.emailAlerts,
					insightTypes: {
						budgetingTips: true,
						expenseReduction: true,
						incomeSuggestions: true,
					},
				},
			});
			logger.debug('✅ [NotificationSetup] Preferences saved successfully');

			logger.debug(
				'🎉 [NotificationSetup] Marking onboarding complete and navigating to dashboard...'
			);
			await markOnboardingComplete();
			router.replace('/(tabs)/dashboard');

			// Send one welcome notification after navigation (only if permissions granted)
			if (granted) {
				setTimeout(async () => {
					logger.debug('🔔 [NotificationSetup] Sending welcome notification');
					try {
						await notificationService.sendNotification(
							'Notifications Enabled ✅',
							"You're all set! You'll receive weekly cash summaries and important alerts.",
							'system',
							undefined,
							'high'
						);
						logger.debug('✅ [NotificationSetup] Welcome notification sent');
					} catch (notifError) {
						logger.error(
							'❌ [NotificationSetup] Failed to send welcome notification:',
							notifError
						);
					}
				}, 1000); // Delay to ensure navigation completes
			}
		} catch (error) {
			logger.error(
				'❌ [NotificationSetup] Error setting up notifications:',
				error
			);

			// Extract error message
			let errorMessage = 'Unknown error occurred';
			if (error instanceof Error) {
				errorMessage = error.message;
				logger.error('❌ [NotificationSetup] Error message:', errorMessage);
				logger.error('❌ [NotificationSetup] Error stack:', error.stack);
			}

			Alert.alert(
				'Setup Incomplete',
				'There was an issue setting up notifications. You can continue and configure them later in Profile.',
				[
					{
						text: 'Continue Anyway',
						onPress: async () => {
							try {
								logger.debug(
									'⚠️ [NotificationSetup] Continuing despite error, marking onboarding complete...'
								);
								await markOnboardingComplete();
								router.replace('/(tabs)/dashboard');
							} catch (fallbackError) {
								logger.error(
									'❌ [NotificationSetup] Error in fallback:',
									fallbackError
								);
								await markOnboardingComplete();
								router.replace('/(tabs)/dashboard');
							}
						},
					},
					{
						text: 'Try Again',
						style: 'default',
					},
				]
			);
		} finally {
			logger.debug('🏁 [NotificationSetup] Continue handler complete');
			setLoading(false);
		}
	};

	const handleSkip = async () => {
		logger.debug('🚀 [NotificationSetup] handleSkip called');
		setLoading(true);
		try {
			// Store preferences but with notifications disabled
			logger.debug(
				'💾 [NotificationSetup] Saving preferences with notifications disabled...'
			);
			await updatePreferences({
				notifications: {
					enableNotifications: false,
					weeklySummary: consent.reminders.weeklySummary,
					overspendingAlert: consent.reminders.overspendingAlerts,
					aiSuggestion: consent.aiInsights.enabled,
					budgetMilestones: consent.core.budget,
					monthlyFinancialCheck: consent.reminders.monthlyCheck,
					monthlySavingsTransfer: false,
				},
				aiInsights: {
					enabled: consent.aiInsights.enabled,
					frequency: consent.aiInsights.frequency,
					pushNotifications: false, // Disabled since no system permission
					emailAlerts: consent.aiInsights.emailAlerts,
					insightTypes: {
						budgetingTips: true,
						expenseReduction: true,
						incomeSuggestions: true,
					},
				},
			});
			logger.debug('✅ [NotificationSetup] Preferences saved successfully');

			logger.debug(
				'🎉 [NotificationSetup] Marking onboarding complete and navigating to dashboard...'
			);
			await markOnboardingComplete();
			router.replace('/(tabs)/dashboard');
		} catch (error) {
			logger.error('❌ [NotificationSetup] Error in skip handler:', error);

			// Extract error message
			if (error instanceof Error) {
				logger.error('❌ [NotificationSetup] Error message:', error.message);
				logger.error('❌ [NotificationSetup] Error stack:', error.stack);
			}

			// Even on error, mark complete and navigate to dashboard
			await markOnboardingComplete();
			router.replace('/(tabs)/dashboard');
		} finally {
			logger.debug('🏁 [NotificationSetup] Skip handler complete');
			setLoading(false);
		}
	};

	const updateConsent = (
		section: keyof NotificationConsent,
		key: string,
		value: boolean
	) => {
		setConsent((prev) => ({
			...prev,
			[section]: {
				...prev[section],
				[key]: value,
			},
		}));
	};

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					title: 'Notifications',
					headerShown: false,
				}}
			/>

			<ScrollView
				contentContainerStyle={[
					styles.content,
					{ paddingBottom: Math.max(space.xxl, insets.bottom + space.lg) },
				]}
				showsVerticalScrollIndicator={false}
			>
				{/* Header */}
				<View style={styles.header}>
					<Ionicons name="notifications-outline" size={48} color={palette.primary} />
					<Text style={styles.title}>Stay on top of your cash</Text>
					<Text style={styles.subtitle}>
						Get weekly summaries and important alerts so you always know where your money is.
					</Text>
				</View>

				{/* Value Props */}
				<View style={styles.valueProps}>
					<View style={styles.valuePropItem}>
						<Ionicons name="checkmark-circle" size={20} color={palette.success} />
						<Text style={styles.valuePropText}>Weekly cash summary</Text>
					</View>
					<View style={styles.valuePropItem}>
						<Ionicons name="checkmark-circle" size={20} color={palette.success} />
						<Text style={styles.valuePropText}>Transaction activity</Text>
					</View>
					<View style={styles.valuePropItem}>
						<Ionicons name="checkmark-circle" size={20} color={palette.success} />
						<Text style={styles.valuePropText}>Monthly check-in</Text>
					</View>
				</View>

				{/* Preset Options */}
				<View style={styles.presetSection}>
					<Text style={styles.presetSectionTitle}>Choose your preference:</Text>
					<View style={styles.presetContainer}>
						<TouchableOpacity
							style={[
								styles.presetCard,
								selectedPreset === 'essential' && styles.presetCardSelected,
							]}
							onPress={() => applyPreset('essential')}
							accessibilityLabel="Essential: transactions and weekly summary, recommended"
							accessibilityRole="button"
						>
							<View style={styles.recommendedBadge}>
								<Text style={styles.recommendedText}>Recommended</Text>
							</View>
							<Text
								style={[
									styles.presetTitle,
									selectedPreset === 'essential' && styles.presetTitleSelected,
								]}
							>
								Essential
							</Text>
							<Text style={styles.presetDescription}>
								Transactions & weekly summary; no marketing
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[
								styles.presetCard,
								selectedPreset === 'quiet' && styles.presetCardSelected,
							]}
							onPress={() => applyPreset('quiet')}
							accessibilityLabel="Quiet mode: email summaries only"
							accessibilityRole="button"
						>
							<Text
								style={[
									styles.presetTitle,
									selectedPreset === 'quiet' && styles.presetTitleSelected,
								]}
							>
								Quiet mode
							</Text>
							<Text style={styles.presetDescription}>
								Email summaries only; no push
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Customize Section */}
				<TouchableOpacity
					style={styles.customizeHeader}
					onPress={() => setShowCustomize(!showCustomize)}
					accessibilityLabel={showCustomize ? 'Hide customization options' : 'Show customization options'}
					accessibilityRole="button"
				>
					<Text style={styles.customizeTitle}>Customize</Text>
					<Ionicons
						name={showCustomize ? 'chevron-up' : 'chevron-down'}
						size={20}
						color={palette.textMuted}
					/>
				</TouchableOpacity>

				{showCustomize && (
					<View style={styles.customizeContent}>
						{/* Core Notifications - MVP: transactions only, no budget/goals */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Essential Updates</Text>
							<Text style={styles.sectionDescription}>
								Keep track of your cash flow
							</Text>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Transaction Alerts</Text>
									<Text style={styles.settingDescription}>
										Important updates about your cash entries
									</Text>
								</View>
								<Switch
									value={consent.core.transactions}
									onValueChange={(value) =>
										updateConsent('core', 'transactions', value)
									}
									trackColor={{ false: palette.border, true: palette.primary }}
									thumbColor={
										consent.core.transactions ? palette.textOnPrimary : palette.textSubtle
									}
								/>
							</View>
						</View>

						{/* Reminders */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Reminders</Text>
							<Text style={styles.sectionDescription}>
								Regular summaries of your cash flow
							</Text>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Weekly Summary</Text>
									<Text style={styles.settingDescription}>
										Weekly overview of your cash in and out
									</Text>
								</View>
								<Switch
									value={consent.reminders.weeklySummary}
									onValueChange={(value) =>
										updateConsent('reminders', 'weeklySummary', value)
									}
									trackColor={{ false: palette.border, true: palette.primary }}
									thumbColor={
										consent.reminders.weeklySummary
											? palette.textOnPrimary
											: palette.textSubtle
									}
								/>
							</View>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Monthly Check-in</Text>
									<Text style={styles.settingDescription}>
										Monthly snapshot of your cash
									</Text>
								</View>
								<Switch
									value={consent.reminders.monthlyCheck}
									onValueChange={(value) =>
										updateConsent('reminders', 'monthlyCheck', value)
									}
									trackColor={{ false: palette.border, true: palette.primary }}
									thumbColor={
										consent.reminders.monthlyCheck
											? palette.textOnPrimary
											: palette.textSubtle
									}
								/>
							</View>
						</View>

						{/* Marketing - Explicit Opt-in */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Marketing & Updates</Text>
							<Text style={styles.sectionDescription}>
								Optional updates about new features
							</Text>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Product Updates</Text>
									<Text style={styles.settingDescription}>
										New features and improvements
									</Text>
								</View>
								<Switch
									value={consent.marketing.productUpdates}
									onValueChange={(value) => {
										updateConsent('marketing', 'productUpdates', value);
										if (value) {
											updateConsent('marketing', 'enabled', true);
										}
									}}
									trackColor={{ false: palette.border, true: palette.primary }}
									thumbColor={
										consent.marketing.productUpdates
											? palette.textOnPrimary
											: palette.textSubtle
									}
								/>
							</View>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Special Offers</Text>
									<Text style={styles.settingDescription}>
										Exclusive deals and promotions
									</Text>
								</View>
								<Switch
									value={consent.marketing.specialOffers}
									onValueChange={(value) => {
										updateConsent('marketing', 'specialOffers', value);
										if (value) {
											updateConsent('marketing', 'enabled', true);
										}
									}}
									trackColor={{ false: palette.border, true: palette.primary }}
									thumbColor={
										consent.marketing.specialOffers
											? palette.textOnPrimary
											: palette.textSubtle
									}
								/>
							</View>
						</View>
					</View>
				)}

				{/* Important Note */}
				<View style={styles.noteContainer}>
					<Ionicons
						name="information-circle-outline"
						size={20}
						color={palette.textMuted}
					/>
					<Text style={styles.noteText}>
						You can change these settings anytime in Profile. Cash tracking works
						without notifications.
					</Text>
				</View>

				{/* Action Buttons */}
				<View style={styles.buttonContainer}>
					<TouchableOpacity
						style={[
							styles.button,
							styles.primaryButton,
							loading && styles.buttonDisabled,
						]}
						onPress={handleContinue}
						disabled={loading}
						accessibilityLabel={loading ? 'Setting up' : 'Allow notifications'}
						accessibilityRole="button"
					>
						{loading ? (
							<View style={styles.buttonLoading}>
								<ActivityIndicator size="small" color={palette.textOnPrimary} />
								<Text style={styles.primaryButtonText}>Setting up...</Text>
							</View>
						) : (
							<Text style={styles.primaryButtonText}>Allow notifications</Text>
						)}
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.button, styles.secondaryButton]}
						onPress={handleSkip}
						disabled={loading}
						accessibilityLabel="Skip notifications"
						accessibilityRole="button"
					>
						<Text style={styles.secondaryButtonText}>Not now</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: palette.bg,
	},
	content: {
		paddingHorizontal: space.xl,
		paddingBottom: space.xxl,
	},
	header: {
		alignItems: 'center',
		marginTop: space.xxl,
		marginBottom: space.xl,
	},
	title: {
		fontSize: 28,
		fontWeight: '700',
		color: palette.text,
		marginTop: space.lg,
		marginBottom: space.sm,
		textAlign: 'center',
	},
	subtitle: {
		fontSize: 16,
		color: palette.textMuted,
		textAlign: 'center',
		lineHeight: 24,
	},
	valueProps: {
		marginBottom: space.xl,
	},
	valuePropItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: space.md,
	},
	valuePropText: {
		fontSize: 16,
		color: palette.text,
		marginLeft: space.md,
	},
	presetSection: {
		marginBottom: space.xl,
	},
	presetSectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: palette.text,
		marginBottom: space.lg,
	},
	presetContainer: {
		gap: space.md,
	},
	presetCard: {
		backgroundColor: palette.surfaceAlt,
		borderWidth: 2,
		borderColor: palette.border,
		borderRadius: radius.md,
		padding: space.lg,
		position: 'relative',
	},
	presetCardSelected: {
		borderColor: palette.primary,
		backgroundColor: palette.primarySubtle,
	},
	presetTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: palette.text,
		marginBottom: space.sm,
	},
	presetTitleSelected: {
		color: palette.primary,
	},
	presetDescription: {
		fontSize: 14,
		color: palette.textMuted,
		lineHeight: 20,
	},
	recommendedBadge: {
		position: 'absolute',
		top: -space.sm,
		right: space.md,
		backgroundColor: palette.success,
		paddingHorizontal: space.sm,
		paddingVertical: space.xs,
		borderRadius: radius.pill,
	},
	recommendedText: {
		fontSize: 12,
		fontWeight: '600',
		color: palette.textOnPrimary,
	},
	customizeHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: space.lg,
		borderBottomWidth: 1,
		borderBottomColor: palette.border,
		marginBottom: space.lg,
	},
	customizeTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: palette.textMuted,
	},
	customizeContent: {
		marginBottom: space.xl,
	},
	section: {
		marginBottom: space.xl,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: palette.text,
		marginBottom: space.sm,
	},
	sectionDescription: {
		fontSize: 14,
		color: palette.textMuted,
		marginBottom: space.lg,
		lineHeight: 20,
	},
	settingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: space.lg,
		borderBottomWidth: 1,
		borderBottomColor: palette.subtle,
	},
	settingInfo: {
		flex: 1,
		marginRight: space.lg,
	},
	settingLabel: {
		fontSize: 16,
		fontWeight: '500',
		color: palette.text,
		marginBottom: space.sm,
	},
	settingDescription: {
		fontSize: 14,
		color: palette.textMuted,
		lineHeight: 20,
	},
	noteContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: palette.surfaceAlt,
		padding: space.lg,
		borderRadius: radius.sm,
		marginBottom: space.xl,
	},
	noteText: {
		flex: 1,
		fontSize: 14,
		color: palette.textMuted,
		marginLeft: space.sm,
		lineHeight: 20,
	},
	buttonContainer: {
		gap: space.md,
	},
	button: {
		paddingVertical: space.lg,
		paddingHorizontal: space.xl,
		borderRadius: radius.xl2,
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryButton: {
		backgroundColor: palette.primary,
	},
	buttonDisabled: {
		opacity: 0.9,
	},
	buttonLoading: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: space.sm,
	},
	primaryButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: palette.textOnPrimary,
	},
	secondaryButton: {
		backgroundColor: 'transparent',
		borderWidth: 1,
		borderColor: palette.border,
	},
	secondaryButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: palette.textMuted,
	},
});
