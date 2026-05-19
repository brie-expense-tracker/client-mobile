import React, { useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	ScrollView,
	TouchableOpacity,
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

// MVP: weekly summary + transaction alerts only (no marketing, AI, or monthly digests in UI).
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
			monthlyCheck: false,
			overspendingAlerts: false,
		},
	},
	quiet: {
		core: { budget: false, goals: false, transactions: false, system: true },
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
			monthlyCheck: false,
			overspendingAlerts: false,
		},
	},
};

const preferencesFromConsent = (
	consent: NotificationConsent,
	enableNotifications: boolean
) => ({
	notifications: {
		enableNotifications,
		weeklySummary: consent.reminders.weeklySummary,
		overspendingAlert: false,
		aiSuggestion: false,
		budgetMilestones: false,
		monthlyFinancialCheck: false,
		monthlySavingsTransfer: false,
	},
	aiInsights: {
		enabled: false,
		frequency: 'weekly' as const,
		pushNotifications: false,
		emailAlerts: false,
		insightTypes: {
			budgetingTips: false,
			expenseReduction: false,
			incomeSuggestions: false,
		},
	},
});

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
	const [loading, setLoading] = useState(false);

	const applyPreset = (presetKey: PresetKey) => {
		setSelectedPreset(presetKey);
		setConsent(PRESETS[presetKey]);
	};

	const finishOnboarding = async () => {
		await markOnboardingComplete();
		router.replace('/(tabs)/dashboard');
	};

	const handleContinue = async () => {
		logger.debug('🚀 [NotificationSetup] handleContinue called');
		setLoading(true);
		try {
			logger.debug(
				'📱 [NotificationSetup] Requesting notification permissions...'
			);
			const result = await notificationService.initialize();
			notificationService.setupNotificationListeners();

			const granted = result.granted;

			if (granted) {
				logger.debug('✅ [NotificationSetup] Permissions granted successfully');
			} else if (!result.canAskAgain) {
				logger.debug('⚠️ [NotificationSetup] Permissions denied');
				Alert.alert(
					'Notifications are off',
					'You can enable notifications later in Settings.',
					[{ text: 'OK' }]
				);
			}

			logger.debug('💾 [NotificationSetup] Saving notification preferences...');
			await updatePreferences(
				preferencesFromConsent(consent, granted)
			);
			logger.debug('✅ [NotificationSetup] Preferences saved successfully');

			await finishOnboarding();

			if (granted) {
				setTimeout(async () => {
					logger.debug('🔔 [NotificationSetup] Sending welcome notification');
					try {
						await notificationService.sendNotification(
							'Notifications Enabled ✅',
							"You're all set! You'll get a weekly cash summary and important alerts.",
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
				}, 1000);
			}
		} catch (error) {
			logger.error(
				'❌ [NotificationSetup] Error setting up notifications:',
				error
			);

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
								await finishOnboarding();
							} catch (fallbackError) {
								logger.error(
									'❌ [NotificationSetup] Error in fallback:',
									fallbackError
								);
								await finishOnboarding();
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
			logger.debug(
				'💾 [NotificationSetup] Saving preferences with notifications disabled...'
			);
			await updatePreferences(preferencesFromConsent(consent, false));
			logger.debug('✅ [NotificationSetup] Preferences saved successfully');
			await finishOnboarding();
		} catch (error) {
			logger.error('❌ [NotificationSetup] Error in skip handler:', error);
			if (error instanceof Error) {
				logger.error('❌ [NotificationSetup] Error message:', error.message);
				logger.error('❌ [NotificationSetup] Error stack:', error.stack);
			}
			await finishOnboarding();
		} finally {
			logger.debug('🏁 [NotificationSetup] Skip handler complete');
			setLoading(false);
		}
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
				<View style={styles.header}>
					<Ionicons name="notifications-outline" size={48} color={palette.primary} />
					<Text style={styles.title}>Stay on top of your cash</Text>
					<Text style={styles.subtitle}>
						Get a weekly summary and alerts when you log cash — so you always know
						where your money is.
					</Text>
				</View>

				<View style={styles.valueProps}>
					<View style={styles.valuePropItem}>
						<Ionicons name="checkmark-circle" size={20} color={palette.success} />
						<Text style={styles.valuePropText}>Weekly cash summary</Text>
					</View>
					<View style={styles.valuePropItem}>
						<Ionicons name="checkmark-circle" size={20} color={palette.success} />
						<Text style={styles.valuePropText}>Cash entry alerts</Text>
					</View>
				</View>

				<View style={styles.presetSection}>
					<Text style={styles.presetSectionTitle}>Choose your preference:</Text>
					<View style={styles.presetContainer}>
						<TouchableOpacity
							style={[
								styles.presetCard,
								selectedPreset === 'essential' && styles.presetCardSelected,
							]}
							onPress={() => applyPreset('essential')}
							accessibilityLabel="Essential: weekly summary and cash alerts, recommended"
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
								Weekly summary & cash alerts
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[
								styles.presetCard,
								selectedPreset === 'quiet' && styles.presetCardSelected,
							]}
							onPress={() => applyPreset('quiet')}
							accessibilityLabel="Quiet mode: weekly summary only"
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
								Weekly summary only; no cash alerts
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				<View style={styles.noteContainer}>
					<Ionicons
						name="information-circle-outline"
						size={20}
						color={palette.textMuted}
					/>
					<Text style={styles.noteText}>
						You can change these anytime in Profile. Cash tracking works without
						notifications.
					</Text>
				</View>

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
