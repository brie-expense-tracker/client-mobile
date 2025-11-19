import React, {
	useState,
	useEffect,
	useCallback,
	useMemo,
	useRef,
} from 'react';
import { logger } from '../../../../src/utils/logger';
import {
	View,
	Text,
	StyleSheet,
	Switch,
	ScrollView,
	SafeAreaView,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
	Modal,
	Animated,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotification } from '../../../../src/context/notificationContext';
import {
	type NotificationConsentView,
	legacyProfileToPreferences,
	prefsToConsentView,
} from '../../../../src/services';
import { useProfile } from '../../../../src/context/profileContext';
import { BorderlessButton } from 'react-native-gesture-handler';

// Type declaration for __DEV__ (provided by Metro bundler in React Native)
declare const __DEV__: boolean;

// Show test notification button in dev mode or TestFlight
const SHOW_TEST_NOTIFICATION_BUTTON =
	__DEV__ || process.env.EXPO_PUBLIC_ENV === 'testflight';

type SelectOption = {
	label: string;
	value: string;
};

function SelectField({
	value,
	onChange,
	options,
	placeholder,
}: {
	value: string;
	onChange: (value: string) => void;
	options: SelectOption[];
	placeholder?: string;
}) {
	const [visible, setVisible] = useState(false);
	const selected = options.find((o) => o.value === value);
	const slideAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (visible) {
			// Reset animation value
			slideAnim.setValue(0);
			// Start animation after a brief delay to let overlay appear first
			Animated.timing(slideAnim, {
				toValue: 1,
				duration: 300,
				useNativeDriver: true,
			}).start();
		} else {
			// Reset when closing
			slideAnim.setValue(0);
		}
	}, [visible, slideAnim]);

	const handleClose = () => {
		Animated.timing(slideAnim, {
			toValue: 0,
			duration: 200,
			useNativeDriver: true,
		}).start(() => {
			setVisible(false);
		});
	};

	const translateY = slideAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [300, 0],
	});

	return (
		<>
			<TouchableOpacity
				activeOpacity={0.8}
				style={styles.selectField}
				onPress={() => setVisible(true)}
			>
				<Text
					style={[styles.selectFieldText, !selected && { color: '#9ca3af' }]}
				>
					{selected ? selected.label : placeholder || 'Select...'}
				</Text>
				<Ionicons name="chevron-down" size={18} color="#6b7280" />
			</TouchableOpacity>

			<Modal
				visible={visible}
				transparent
				animationType="fade"
				onRequestClose={handleClose}
			>
				<View style={styles.modalBackdrop}>
					<Animated.View
						style={[
							styles.modalSheet,
							{
								transform: [{ translateY }],
							},
						]}
					>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Choose an option</Text>
							<TouchableOpacity onPress={handleClose}>
								<Ionicons name="close" size={22} color="#6b7280" />
							</TouchableOpacity>
						</View>

						<ScrollView>
							{options.map((option) => (
								<TouchableOpacity
									key={option.value}
									style={styles.modalOption}
									onPress={() => {
										onChange(option.value);
										handleClose();
									}}
								>
									<Text style={styles.modalOptionLabel}>{option.label}</Text>
									{option.value === value && (
										<Ionicons name="checkmark" size={20} color="#007ACC" />
									)}
								</TouchableOpacity>
							))}
						</ScrollView>
					</Animated.View>
				</View>
			</Modal>
		</>
	);
}

export default function NotificationConsentScreen() {
	const { sendTestNotification } = useNotification();
	const { profile, updateNotificationConsent } = useProfile();

	const [consent, setConsent] = useState<NotificationConsentView>({
		aiInsights: {
			enabled: true,
			frequency: 'weekly',
			channels: {
				push: true,
				email: false,
			},
		},
		marketing: {
			marketingUpdatesEnabled: false,
			newsletterEnabled: false,
		},
		quietHours: {
			enabled: false,
			start: '22:00',
			end: '08:00',
		},
	});

	// Snapshot of last-saved (or loaded) state so we know if anything changed
	const [initialConsent, setInitialConsent] =
		useState<NotificationConsentView | null>(null);

	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
		'idle'
	);

	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const loadConsentSettings = useCallback(async () => {
		setLoading(true);
		try {
			if (profile?.preferences) {
				const prefs = legacyProfileToPreferences(
					profile.preferences.notifications,
					profile.preferences.aiInsights,
					profile.preferences.marketing || undefined
				);
				const view = prefsToConsentView(prefs);
				setConsent(view);
				setInitialConsent(view); // 🔹 store as baseline
			}
		} catch (error) {
			logger.error('Error loading consent settings:', error);
			Alert.alert('Error', 'Failed to load notification preferences');
		} finally {
			setLoading(false);
		}
	}, [profile]);

	useEffect(() => {
		loadConsentSettings();
	}, [loadConsentSettings]);

	// Simple deep equality via JSON stringify (good enough here)
	const isDirty = useMemo(() => {
		if (!initialConsent) return false;
		return JSON.stringify(initialConsent) !== JSON.stringify(consent);
	}, [initialConsent, consent]);

	// Save function (called by auto-save effect when dirty)
	const saveConsent = useCallback(
		async (next: NotificationConsentView) => {
			if (!profile?.preferences) {
				Alert.alert('Error', 'Profile not loaded');
				return;
			}

			logger.debug('[NotificationConsent] Saving consent', { next });
			setSaving(true);
			setSaveStatus('saving');

			try {
				await updateNotificationConsent(next);
				setInitialConsent(next); // 🔹 new baseline after successful save
				setSaveStatus('saved');

				// Clear "saved" status after 2 seconds
				setTimeout(() => {
					setSaveStatus('idle');
				}, 2000);
			} catch (error) {
				logger.error('Error updating consent settings:', error);
				setSaveStatus('idle');
				let errorMessage = 'Failed to update notification preferences.';
				if (error instanceof Error) {
					errorMessage = error.message;
				}
				Alert.alert('Error', errorMessage);
			} finally {
				setSaving(false);
			}
		},
		[profile, updateNotificationConsent]
	);

	// Auto-save when consent changes (debounced, only if dirty)
	useEffect(() => {
		if (!initialConsent) return; // nothing loaded yet
		if (!isDirty) return; // no changes to save

		// Clear any pending save
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		// Debounce 500ms after last change
		saveTimeoutRef.current = setTimeout(() => {
			void saveConsent(consent);
		}, 500);

		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, [initialConsent, isDirty, consent, saveConsent]);

	const handleTestNotification = async () => {
		try {
			await sendTestNotification();
			Alert.alert('Test Sent', 'Test notification sent successfully!');
		} catch (error) {
			logger.error('Error sending test notification:', error);
			Alert.alert('Error', 'Failed to send test notification');
		}
	};

	const handleResetToDefaults = () => {
		Alert.alert(
			'Reset to Defaults?',
			'This will reset all notification preferences to their default values. Are you sure?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Reset',
					style: 'destructive',
					onPress: () => {
						const defaults: NotificationConsentView = {
							aiInsights: {
								enabled: true,
								frequency: 'weekly',
								channels: {
									push: true,
									email: false,
								},
							},
							marketing: {
								marketingUpdatesEnabled: false,
								newsletterEnabled: false,
							},
							quietHours: {
								enabled: false,
								start: '22:00',
								end: '08:00',
							},
						};
						setConsent(defaults);
						// Don't update initialConsent here: user still needs to hit Save
					},
				},
			]
		);
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#007ACC" />
					<Text style={styles.loadingText}>Loading preferences...</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Advanced Preferences',
					headerShadowVisible: false,
					headerStyle: {
						backgroundColor: '#ffffff',
					},
					headerTitleStyle: {
						fontSize: 20,
						fontWeight: '600',
						color: '#333',
					},
					headerLeft: () => (
						<BorderlessButton
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</BorderlessButton>
					),
				}}
			/>

			<ScrollView contentContainerStyle={styles.content}>
				{/* Header */}
				<View style={styles.header}>
					{/* <Ionicons name="shield-checkmark-outline" size={32} color="#007ACC" />
					<Text style={styles.title}>Notification Consent</Text>
					<Text style={styles.subtitle}>
						Control how and when you receive notifications
					</Text> */}
				</View>

				{/* AI Insights */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>AI Insights</Text>
					<Text style={styles.sectionDescription}>
						Personalized financial advice and spending insights
					</Text>

					<View style={styles.settingRow}>
						<View style={styles.settingInfo}>
							<Text style={styles.settingLabel}>Enable AI Insights</Text>
							<Text style={styles.settingDescription}>
								Receive AI-powered financial recommendations
							</Text>
						</View>
						<Switch
							value={consent.aiInsights.enabled}
							onValueChange={(value) =>
								setConsent((prev) => ({
									...prev,
									aiInsights: {
										...prev.aiInsights,
										enabled: value,
									},
								}))
							}
							trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
							thumbColor={consent.aiInsights.enabled ? '#ffffff' : '#9ca3af'}
						/>
					</View>

					{consent.aiInsights.enabled && (
						<>
							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Frequency</Text>
									<Text style={styles.settingDescription}>
										How often to receive AI insights
									</Text>
								</View>
								<View style={{ minWidth: 140 }}>
									<SelectField
										value={consent.aiInsights.frequency}
										onChange={(value) =>
											setConsent((prev) => ({
												...prev,
												aiInsights: {
													...prev.aiInsights,
													frequency: value as 'daily' | 'weekly' | 'monthly',
												},
											}))
										}
										options={[
											{ label: 'Daily', value: 'daily' },
											{ label: 'Weekly', value: 'weekly' },
											{ label: 'Monthly', value: 'monthly' },
										]}
									/>
								</View>
							</View>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Push Notifications</Text>
									<Text style={styles.settingDescription}>
										Receive insights as notifications
									</Text>
								</View>
								<Switch
									value={consent.aiInsights.channels.push}
									onValueChange={(value) =>
										setConsent((prev) => ({
											...prev,
											aiInsights: {
												...prev.aiInsights,
												channels: {
													...prev.aiInsights.channels,
													push: value,
												},
											},
										}))
									}
									trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
									thumbColor={
										consent.aiInsights.channels.push ? '#ffffff' : '#9ca3af'
									}
								/>
							</View>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Email</Text>
									<Text style={styles.settingDescription}>
										Receive insights via email
									</Text>
								</View>
								<Switch
									value={consent.aiInsights.channels.email}
									onValueChange={(value) =>
										setConsent((prev) => ({
											...prev,
											aiInsights: {
												...prev.aiInsights,
												channels: {
													...prev.aiInsights.channels,
													email: value,
												},
											},
										}))
									}
									trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
									thumbColor={
										consent.aiInsights.channels.email ? '#ffffff' : '#9ca3af'
									}
								/>
							</View>
						</>
					)}
				</View>

				{/* Marketing - Explicit Opt-in */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Marketing & Updates</Text>
					<Text style={styles.sectionDescription}>
						Optional updates about new features and offers
					</Text>

					<View style={styles.settingRow}>
						<View style={styles.settingInfo}>
							<Text style={styles.settingLabel}>
								Marketing & Product Updates
							</Text>
							<Text style={styles.settingDescription}>
								Receive updates about new features and improvements
							</Text>
						</View>
						<Switch
							value={consent.marketing.marketingUpdatesEnabled}
							onValueChange={(value) =>
								setConsent((prev) => ({
									...prev,
									marketing: {
										...prev.marketing,
										marketingUpdatesEnabled: value,
									},
								}))
							}
							trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
							thumbColor={
								consent.marketing.marketingUpdatesEnabled
									? '#ffffff'
									: '#9ca3af'
							}
						/>
					</View>

					<View style={styles.settingRow}>
						<View style={styles.settingInfo}>
							<Text style={styles.settingLabel}>Newsletter</Text>
							<Text style={styles.settingDescription}>
								Financial tips and insights via email
							</Text>
						</View>
						<Switch
							value={consent.marketing.newsletterEnabled}
							onValueChange={(value) =>
								setConsent((prev) => ({
									...prev,
									marketing: {
										...prev.marketing,
										newsletterEnabled: value,
									},
								}))
							}
							trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
							thumbColor={
								consent.marketing.newsletterEnabled ? '#ffffff' : '#9ca3af'
							}
						/>
					</View>
				</View>

				{/* Quiet Hours */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Quiet Hours</Text>
					<Text style={styles.sectionDescription}>
						Set times when you don&apos;t want to receive notifications
					</Text>

					<View style={styles.settingRow}>
						<View style={styles.settingInfo}>
							<Text style={styles.settingLabel}>Enable Quiet Hours</Text>
							<Text style={styles.settingDescription}>
								Suppress notifications during specified times
							</Text>
						</View>
						<Switch
							value={consent.quietHours.enabled}
							onValueChange={(value) =>
								setConsent((prev) => ({
									...prev,
									quietHours: { ...prev.quietHours, enabled: value },
								}))
							}
							trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
							thumbColor={consent.quietHours.enabled ? '#ffffff' : '#9ca3af'}
						/>
					</View>

					{consent.quietHours.enabled && (
						<>
							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Start Time</Text>
									<Text style={styles.settingDescription}>
										When to start suppressing notifications
									</Text>
								</View>
								<View style={{ minWidth: 140 }}>
									<SelectField
										value={consent.quietHours.start}
										onChange={(value) =>
											setConsent((prev) => ({
												...prev,
												quietHours: { ...prev.quietHours, start: value },
											}))
										}
										options={Array.from({ length: 24 }, (_, i) => {
											const hour = i.toString().padStart(2, '0');
											return {
												label: `${hour}:00`,
												value: `${hour}:00`,
											};
										})}
									/>
								</View>
							</View>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>End Time</Text>
									<Text style={styles.settingDescription}>
										When to resume notifications
									</Text>
								</View>
								<View style={{ minWidth: 140 }}>
									<SelectField
										value={consent.quietHours.end}
										onChange={(value) =>
											setConsent((prev) => ({
												...prev,
												quietHours: { ...prev.quietHours, end: value },
											}))
										}
										options={Array.from({ length: 24 }, (_, i) => {
											const hour = i.toString().padStart(2, '0');
											return {
												label: `${hour}:00`,
												value: `${hour}:00`,
											};
										})}
									/>
								</View>
							</View>
						</>
					)}
				</View>

				{/* Important Note */}
				<View style={styles.noteContainer}>
					<Ionicons
						name="information-circle-outline"
						size={20}
						color="#6b7280"
					/>
					<Text style={styles.noteText}>
						Marketing notifications require explicit opt-in. You can change
						these settings anytime.
					</Text>
				</View>

				{/* Action Buttons */}
				<View style={styles.buttonContainer}>
					{SHOW_TEST_NOTIFICATION_BUTTON && (
						<TouchableOpacity
							style={[styles.button, styles.testButton]}
							onPress={handleTestNotification}
							disabled={saving}
						>
							<Ionicons
								name="notifications-outline"
								size={20}
								color="#007ACC"
							/>
							<Text style={styles.testButtonText}>Send Test Notification</Text>
						</TouchableOpacity>
					)}

					<TouchableOpacity
						style={[styles.button, styles.resetButton]}
						onPress={handleResetToDefaults}
						disabled={saving}
					>
						<Text style={styles.resetButtonText}>Reset to Defaults</Text>
					</TouchableOpacity>
				</View>

				{/* Save Status Indicator */}
				<View style={styles.statusContainer}>
					<Text style={styles.statusText}>
						{saveStatus === 'saving'
							? 'Saving changes…'
							: saveStatus === 'saved'
							? 'All changes saved'
							: ''}
					</Text>
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
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#6b7280',
	},
	header: {
		alignItems: 'center',
		marginBottom: 24,
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: '#1f2937',
		marginTop: 12,
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: '#6b7280',
		textAlign: 'center',
		lineHeight: 24,
	},
	section: {
		marginBottom: 32,
	},
	sectionHeader: {
		marginBottom: 16,
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
		flexDirection: 'row',
		gap: 8,
	},
	testButton: {
		backgroundColor: 'transparent',
		borderWidth: 1,
		borderColor: '#007ACC',
	},
	testButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#007ACC',
	},
	resetButton: {
		backgroundColor: 'transparent',
		borderWidth: 1,
		borderColor: '#ef4444',
	},
	resetButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#ef4444',
	},
	saveButton: {
		backgroundColor: '#007ACC',
	},
	saveButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#ffffff',
	},
	statusContainer: {
		alignItems: 'center',
		marginTop: 8,
		minHeight: 20,
	},
	statusText: {
		fontSize: 12,
		color: '#6b7280',
	},
	selectField: {
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#f9fafb',
	},
	selectFieldText: {
		fontSize: 14,
		color: '#111827',
	},
	modalBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.35)',
		justifyContent: 'flex-end',
	},
	modalSheet: {
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		maxHeight: '60%',
		paddingBottom: 24,
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#f3f4f6',
	},
	modalTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#111827',
	},
	modalOption: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: '#f3f4f6',
	},
	modalOptionLabel: {
		fontSize: 15,
		color: '#111827',
	},
});
