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
} from 'react-native';
import { logger } from '../../src/utils/logger';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotification } from '../../src/context/notificationContext';
import { useProfile } from '../../src/context/profileContext';
import { useOnboarding } from '../../src/context/OnboardingContext';
import { NotificationConsent } from '../../src/services';

type PresetKey = 'essential' | 'recommended' | 'quiet';

const PRESETS: Record<PresetKey, NotificationConsent> = {
	essential: {
		core: { budget: true, goals: true, transactions: true, system: true },
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
	recommended: {
		core: { budget: true, goals: true, transactions: true, system: true },
		aiInsights: {
			enabled: true,
			frequency: 'weekly',
			pushNotifications: true,
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
	const { initialize } = useNotification();
	const { updatePreferences } = useProfile();
	const { markOnboardingComplete } = useOnboarding();

	const [selectedPreset, setSelectedPreset] =
		useState<PresetKey>('recommended');
	const [consent, setConsent] = useState<NotificationConsent>(
		PRESETS.recommended
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
			logger.debug(
				'📱 [NotificationSetup] Requesting notification permissions...'
			);
			await initialize();
			// If initialize() completes without throwing, permissions were granted
			const granted = true;
			logger.debug('✅ [NotificationSetup] Permissions granted successfully');

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

			// Mark onboarding as complete
			logger.debug('🎯 [NotificationSetup] Marking onboarding as complete...');
			await markOnboardingComplete();
			logger.debug('✅ [NotificationSetup] Onboarding marked as complete');

			logger.debug('🎉 [NotificationSetup] Navigating to dashboard...');
			router.replace('/(tabs)/dashboard');
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
				'There was an issue setting up notifications. You can continue using the app and configure notifications later in settings.',
				[
					{
						text: 'Continue Anyway',
						onPress: async () => {
							try {
								logger.debug(
									'⚠️ [NotificationSetup] Continuing despite error, marking onboarding complete...'
								);
								await markOnboardingComplete();
								logger.debug(
									'✅ [NotificationSetup] Onboarding marked complete, navigating...'
								);
								router.replace('/(tabs)/dashboard');
							} catch (fallbackError) {
								logger.error(
									'❌ [NotificationSetup] Error in fallback:',
									fallbackError
								);
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

			// Mark onboarding as complete even when skipping
			logger.debug('🎯 [NotificationSetup] Marking onboarding as complete...');
			await markOnboardingComplete();
			logger.debug('✅ [NotificationSetup] Onboarding marked as complete');

			logger.debug('🎉 [NotificationSetup] Navigating to dashboard...');
			router.replace('/(tabs)/dashboard');
		} catch (error) {
			logger.error('❌ [NotificationSetup] Error in skip handler:', error);

			// Extract error message
			if (error instanceof Error) {
				logger.error('❌ [NotificationSetup] Error message:', error.message);
				logger.error('❌ [NotificationSetup] Error stack:', error.stack);
			}

			// Even on error, mark onboarding complete and continue
			try {
				logger.debug(
					'⚠️ [NotificationSetup] Error occurred, still marking onboarding complete...'
				);
				await markOnboardingComplete();
				logger.debug(
					'✅ [NotificationSetup] Onboarding marked complete despite error'
				);
			} catch (markError) {
				logger.error(
					'❌ [NotificationSetup] Failed to mark onboarding complete:',
					markError
				);
			}

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

			<ScrollView contentContainerStyle={styles.content}>
				{/* Header */}
				<View style={styles.header}>
					<Ionicons name="notifications-outline" size={48} color="#007ACC" />
					<Text style={styles.title}>Want helpful budget alerts?</Text>
					<Text style={styles.subtitle}>
						Get important alerts and weekly insights so you stay on budget.
					</Text>
				</View>

				{/* Value Props */}
				<View style={styles.valueProps}>
					<View style={styles.valuePropItem}>
						<Ionicons name="checkmark-circle" size={20} color="#10b981" />
						<Text style={styles.valuePropText}>Approaching a budget</Text>
					</View>
					<View style={styles.valuePropItem}>
						<Ionicons name="checkmark-circle" size={20} color="#10b981" />
						<Text style={styles.valuePropText}>Weekly money insights</Text>
					</View>
					<View style={styles.valuePropItem}>
						<Ionicons name="checkmark-circle" size={20} color="#10b981" />
						<Text style={styles.valuePropText}>Goal progress</Text>
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
						>
							<Text
								style={[
									styles.presetTitle,
									selectedPreset === 'essential' && styles.presetTitleSelected,
								]}
							>
								Essential only
							</Text>
							<Text style={styles.presetDescription}>
								Budget, goals, transactions; no AI, no marketing
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[
								styles.presetCard,
								selectedPreset === 'recommended' && styles.presetCardSelected,
							]}
							onPress={() => applyPreset('recommended')}
						>
							<View style={styles.recommendedBadge}>
								<Text style={styles.recommendedText}>Recommended</Text>
							</View>
							<Text
								style={[
									styles.presetTitle,
									selectedPreset === 'recommended' &&
										styles.presetTitleSelected,
								]}
							>
								Essential + Insights
							</Text>
							<Text style={styles.presetDescription}>
								Essential + weekly insights push
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[
								styles.presetCard,
								selectedPreset === 'quiet' && styles.presetCardSelected,
							]}
							onPress={() => applyPreset('quiet')}
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
								Email only or summaries; no push
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Customize Section */}
				<TouchableOpacity
					style={styles.customizeHeader}
					onPress={() => setShowCustomize(!showCustomize)}
				>
					<Text style={styles.customizeTitle}>Customize</Text>
					<Ionicons
						name={showCustomize ? 'chevron-up' : 'chevron-down'}
						size={20}
						color="#6b7280"
					/>
				</TouchableOpacity>

				{showCustomize && (
					<View style={styles.customizeContent}>
						{/* Core Notifications */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Essential Updates</Text>
							<Text style={styles.sectionDescription}>
								These help you stay on top of your budget and goals
							</Text>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Budget Alerts</Text>
									<Text style={styles.settingDescription}>
										Get notified when you&apos;re approaching budget limits
									</Text>
								</View>
								<Switch
									value={consent.core.budget}
									onValueChange={(value) =>
										updateConsent('core', 'budget', value)
									}
									trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
									thumbColor={consent.core.budget ? '#ffffff' : '#9ca3af'}
								/>
							</View>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Goal Progress</Text>
									<Text style={styles.settingDescription}>
										Updates on your savings and investment goals
									</Text>
								</View>
								<Switch
									value={consent.core.goals}
									onValueChange={(value) =>
										updateConsent('core', 'goals', value)
									}
									trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
									thumbColor={consent.core.goals ? '#ffffff' : '#9ca3af'}
								/>
							</View>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Transaction Alerts</Text>
									<Text style={styles.settingDescription}>
										Important updates about your accounts
									</Text>
								</View>
								<Switch
									value={consent.core.transactions}
									onValueChange={(value) =>
										updateConsent('core', 'transactions', value)
									}
									trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
									thumbColor={consent.core.transactions ? '#ffffff' : '#9ca3af'}
								/>
							</View>
						</View>

						{/* AI Insights */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>AI Insights</Text>
							<Text style={styles.sectionDescription}>
								Personalized financial advice and spending insights
							</Text>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Weekly Insights</Text>
									<Text style={styles.settingDescription}>
										AI-powered financial recommendations
									</Text>
								</View>
								<Switch
									value={consent.aiInsights.enabled}
									onValueChange={(value) =>
										updateConsent('aiInsights', 'enabled', value)
									}
									trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
									thumbColor={
										consent.aiInsights.enabled ? '#ffffff' : '#9ca3af'
									}
								/>
							</View>

							{consent.aiInsights.enabled && (
								<View style={styles.settingRow}>
									<View style={styles.settingInfo}>
										<Text style={styles.settingLabel}>Push Notifications</Text>
										<Text style={styles.settingDescription}>
											Receive insights as notifications
										</Text>
									</View>
									<Switch
										value={consent.aiInsights.pushNotifications}
										onValueChange={(value) =>
											updateConsent('aiInsights', 'pushNotifications', value)
										}
										trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
										thumbColor={
											consent.aiInsights.pushNotifications
												? '#ffffff'
												: '#9ca3af'
										}
									/>
								</View>
							)}
						</View>

						{/* Reminders */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Reminders</Text>
							<Text style={styles.sectionDescription}>
								Helpful reminders to keep you on track
							</Text>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Weekly Summary</Text>
									<Text style={styles.settingDescription}>
										Weekly overview of your spending and savings
									</Text>
								</View>
								<Switch
									value={consent.reminders.weeklySummary}
									onValueChange={(value) =>
										updateConsent('reminders', 'weeklySummary', value)
									}
									trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
									thumbColor={
										consent.reminders.weeklySummary ? '#ffffff' : '#9ca3af'
									}
								/>
							</View>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Monthly Check-in</Text>
									<Text style={styles.settingDescription}>
										Monthly financial health review
									</Text>
								</View>
								<Switch
									value={consent.reminders.monthlyCheck}
									onValueChange={(value) =>
										updateConsent('reminders', 'monthlyCheck', value)
									}
									trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
									thumbColor={
										consent.reminders.monthlyCheck ? '#ffffff' : '#9ca3af'
									}
								/>
							</View>
						</View>

						{/* Marketing - Explicit Opt-in */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Marketing & Updates</Text>
							<Text style={styles.sectionDescription}>
								Optional updates about new features and offers
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
									trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
									thumbColor={
										consent.marketing.productUpdates ? '#ffffff' : '#9ca3af'
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
									trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
									thumbColor={
										consent.marketing.specialOffers ? '#ffffff' : '#9ca3af'
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
						color="#6b7280"
					/>
					<Text style={styles.noteText}>
						You can change these settings anytime in the app. Core app features
						work without notifications.
					</Text>
				</View>

				{/* Action Buttons */}
				<View style={styles.buttonContainer}>
					<TouchableOpacity
						style={[styles.button, styles.primaryButton]}
						onPress={handleContinue}
						disabled={loading}
					>
						<Text style={styles.primaryButtonText}>
							{loading ? 'Setting Up...' : 'Allow notifications'}
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.button, styles.secondaryButton]}
						onPress={handleSkip}
						disabled={loading}
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
		backgroundColor: '#ffffff',
	},
	content: {
		paddingHorizontal: 24,
		paddingBottom: 48,
	},
	header: {
		alignItems: 'center',
		marginTop: 40,
		marginBottom: 32,
	},
	title: {
		fontSize: 28,
		fontWeight: '700',
		color: '#1f2937',
		marginTop: 16,
		marginBottom: 8,
		textAlign: 'center',
	},
	subtitle: {
		fontSize: 16,
		color: '#6b7280',
		textAlign: 'center',
		lineHeight: 24,
	},
	valueProps: {
		marginBottom: 32,
	},
	valuePropItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	valuePropText: {
		fontSize: 16,
		color: '#374151',
		marginLeft: 12,
	},
	presetSection: {
		marginBottom: 32,
	},
	presetSectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#1f2937',
		marginBottom: 16,
	},
	presetContainer: {
		gap: 12,
	},
	presetCard: {
		backgroundColor: '#f9fafb',
		borderWidth: 2,
		borderColor: '#e5e7eb',
		borderRadius: 12,
		padding: 16,
		position: 'relative',
	},
	presetCardSelected: {
		borderColor: '#007ACC',
		backgroundColor: '#eff6ff',
	},
	presetTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1f2937',
		marginBottom: 4,
	},
	presetTitleSelected: {
		color: '#007ACC',
	},
	presetDescription: {
		fontSize: 14,
		color: '#6b7280',
		lineHeight: 20,
	},
	recommendedBadge: {
		position: 'absolute',
		top: -8,
		right: 12,
		backgroundColor: '#10b981',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	recommendedText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#ffffff',
	},
	customizeHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
		marginBottom: 16,
	},
	customizeTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#6b7280',
	},
	customizeContent: {
		marginBottom: 32,
	},
	section: {
		marginBottom: 32,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#1f2937',
		marginBottom: 8,
	},
	sectionDescription: {
		fontSize: 14,
		color: '#6b7280',
		marginBottom: 16,
		lineHeight: 20,
	},
	settingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#f3f4f6',
	},
	settingInfo: {
		flex: 1,
		marginRight: 16,
	},
	settingLabel: {
		fontSize: 16,
		fontWeight: '500',
		color: '#1f2937',
		marginBottom: 4,
	},
	settingDescription: {
		fontSize: 14,
		color: '#6b7280',
		lineHeight: 20,
	},
	noteContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: '#f9fafb',
		padding: 16,
		borderRadius: 8,
		marginBottom: 32,
	},
	noteText: {
		flex: 1,
		fontSize: 14,
		color: '#6b7280',
		marginLeft: 8,
		lineHeight: 20,
	},
	buttonContainer: {
		gap: 12,
	},
	button: {
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryButton: {
		backgroundColor: '#007ACC',
	},
	primaryButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#ffffff',
	},
	secondaryButton: {
		backgroundColor: 'transparent',
		borderWidth: 1,
		borderColor: '#d1d5db',
	},
	secondaryButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#6b7280',
	},
});
