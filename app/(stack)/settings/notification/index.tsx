import React, { useState, useEffect } from 'react';
import { logger } from '../../../../src/utils/logger';
import {
	View,
	Text,
	StyleSheet,
	Switch,
	ScrollView,
	Alert,
	TouchableOpacity,
	SafeAreaView,
	ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../../../../src/context/profileContext';
import {
	type NotificationSettingsView,
	legacyProfileToPreferences,
	prefsToSettingsView,
} from '../../../../src/services';

const NotificationSettingsScreen: React.FC = () => {
	const router = useRouter();
	const { profile, updateNotificationSettings, loading, updateProfile } = useProfile();
	const [settings, setSettings] = useState<NotificationSettingsView>({
		notificationsEnabled: true,
		budgetAlerts: true,
		overspendingAlerts: false,
		goalsAndMilestones: true,
		aiInsightsEnabled: true,
		weeklyDigestEnabled: true,
		monthlyReviewEnabled: true,
		marketingUpdatesEnabled: false,
		quietHoursEnabled: false,
		quietHoursStart: '22:00',
		quietHoursEnd: '08:00',
	});
	const [billReminders, setBillReminders] = useState(true);
	const [saving, setSaving] = useState(false);

	const notificationsDisabled = !settings.notificationsEnabled;

	// Load settings from profile when available using mapping functions
	useEffect(() => {
		if (profile?.preferences) {
			// Convert legacy profile format to canonical preferences
			const prefs = legacyProfileToPreferences(
				profile.preferences.notifications,
				profile.preferences.aiInsights,
				profile.preferences.marketing || undefined
			);

			// Convert to settings view
			const view = prefsToSettingsView(prefs);
			setSettings(view);

			// Load bill reminders setting
			setBillReminders(profile.preferences.recurringExpenses?.notifications ?? true);
		}
	}, [profile?.preferences]);

	const handleSettingChange = async (
		key: keyof NotificationSettingsView,
		value: boolean | string
	) => {
		// If master switch is off, don't allow toggling anything else
		if (key !== 'notificationsEnabled' && notificationsDisabled) {
			return;
		}

		// Save previous in case we need to roll back
		const previousSettings = settings;
		const newSettings = { ...settings, [key]: value };

		try {
			setSaving(true);
			setSettings(newSettings);
			await updateNotificationSettings(newSettings);
		} catch (error) {
			logger.error('Error updating notification settings:', error);

			// Revert on error
			setSettings(previousSettings);

			let errorMessage = 'Failed to update notification settings.';
			if (error instanceof Error) {
				const msg = error.message.toLowerCase();
				if (msg.includes('network') || msg.includes('fetch')) {
					errorMessage =
						'Network error. Please check your connection and try again.';
				} else if (msg.includes('unauthorized') || msg.includes('401')) {
					errorMessage = 'Session expired. Please sign in again.';
				} else if (msg.includes('server') || msg.includes('500')) {
					errorMessage = 'Server error. Please try again later.';
				} else {
					errorMessage = error.message;
				}
			}

			Alert.alert('Update Failed', errorMessage, [
				{ text: 'OK', style: 'default' },
				{
					text: 'Retry',
					style: 'default',
					onPress: () => handleSettingChange(key, value),
				},
			]);
		} finally {
			setSaving(false);
		}
	};

	const handleBillRemindersChange = async (value: boolean) => {
		const previousValue = billReminders;
		try {
			setSaving(true);
			setBillReminders(value);
			await updateProfile({
				preferences: {
					...profile?.preferences,
					recurringExpenses: {
						...profile?.preferences?.recurringExpenses,
						notifications: value,
					},
				},
			});
		} catch (error) {
			logger.error('Error updating bill reminders:', error);
			setBillReminders(previousValue);
			Alert.alert('Update Failed', 'Failed to update bill reminders');
		} finally {
			setSaving(false);
		}
	};

	const isBusy = saving || loading;

	if (loading && !profile?.preferences?.notifications) {
		return (
			<SafeAreaView style={styles.mainContainer}>
				<Stack.Screen
					options={{
						title: 'Notifications',
						headerShown: true,
					}}
				/>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#007ACC" />
					<Text style={styles.loadingText}>
						Loading notification settings...
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.mainContainer}>
			<Stack.Screen
				options={{
					title: 'Notifications',
					headerShown: true,
				}}
			/>

			<ScrollView contentContainerStyle={styles.content}>
				{/* MVP: Simple notification toggles only */}
				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
					<View style={styles.section}>
						<View style={styles.row}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>Weekly Check-in Reminder</Text>
								<Text style={styles.settingDescription}>
									Get a weekly reminder to review your finances.
								</Text>
							</View>
							<Switch
								value={settings.weeklyDigestEnabled}
								onValueChange={(value) =>
									handleSettingChange('weeklyDigestEnabled', value)
								}
								disabled={isBusy || notificationsDisabled}
								trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
								thumbColor={
									settings.weeklyDigestEnabled ? '#ffffff' : '#9ca3af'
								}
							/>
						</View>

						<View style={styles.lastRow}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>Bill Reminders</Text>
								<Text style={styles.settingDescription}>
									Get notified before bills are due.
								</Text>
							</View>
							<Switch
								value={billReminders}
								onValueChange={handleBillRemindersChange}
								disabled={isBusy}
								trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
								thumbColor={billReminders ? '#ffffff' : '#9ca3af'}
							/>
						</View>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		backgroundColor: '#f9fafb',
	},
	content: {
		paddingVertical: 16,
		paddingHorizontal: 16,
		paddingBottom: 32,
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
	sectionContainer: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: '500',
		marginBottom: 8,
		marginLeft: 4,
		color: '#8b8b8b',
	},
	sectionDescription: {
		fontSize: 14,
		color: '#8b8b8b',
		marginBottom: 12,
		marginLeft: 4,
	},
	section: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f3f4f6',
		minHeight: 56,
	},
	lastRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		minHeight: 56,
	},
	label: {
		fontSize: 16,
		fontWeight: '400',
		color: '#111827',
	},
	settingDescription: {
		fontSize: 12,
		color: '#6b7280',
		marginTop: 4,
	},
	settingInfo: {
		flex: 1,
		marginRight: 12,
	},
	consentLink: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 16,
		paddingHorizontal: 16,
		backgroundColor: '#f8fafc',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	consentLinkContent: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	consentLinkText: {
		marginLeft: 12,
		flex: 1,
	},
	consentLinkTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1f2937',
		marginBottom: 4,
	},
	consentLinkDescription: {
		fontSize: 14,
		color: '#6b7280',
		lineHeight: 20,
	},
	infoContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: '#f0f9ff',
		padding: 16,
		borderRadius: 8,
		marginTop: 16,
	},
	infoText: {
		flex: 1,
		fontSize: 14,
		color: '#0369a1',
		marginLeft: 8,
		lineHeight: 20,
	},
	infoRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
});

export default NotificationSettingsScreen;
