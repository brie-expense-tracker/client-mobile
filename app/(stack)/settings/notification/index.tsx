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
import { Picker } from '@react-native-picker/picker';
import { useProfile } from '../../../../src/context/profileContext';
import {
	type NotificationSettingsView,
	legacyProfileToPreferences,
	prefsToSettingsView,
} from '../../../../src/services';

const NotificationSettingsScreen: React.FC = () => {
	const router = useRouter();
	const { profile, updateNotificationSettings, loading } = useProfile();
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
				{/* General Settings */}
				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
					<View style={styles.section}>
						<View style={styles.row}>
							<Text style={styles.label}>Enable Notifications</Text>
							<Switch
								value={settings.notificationsEnabled}
								onValueChange={(value) =>
									handleSettingChange('notificationsEnabled', value)
								}
								disabled={saving || loading}
								trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
								thumbColor={
									settings.notificationsEnabled ? '#ffffff' : '#9ca3af'
								}
							/>
						</View>
					</View>
				</View>

				{/* Important */}
				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>IMPORTANT</Text>
					<View style={styles.section}>
						<View style={styles.infoRow}>
							<Ionicons
								name="shield-checkmark-outline"
								size={20}
								color="#6b7280"
							/>
							<Text style={styles.infoText}>
								Security and critical account alerts are always enabled to help
								protect your account.
							</Text>
						</View>
					</View>
				</View>

				{/* Spending */}
				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>SPENDING</Text>
					<View style={styles.section}>
						<View style={styles.row}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>Overspending Alerts</Text>
								<Text style={styles.settingDescription}>
									Get notified when you&apos;re overspending.
								</Text>
							</View>
							<Switch
								value={settings.overspendingAlerts}
								onValueChange={(value) =>
									handleSettingChange('overspendingAlerts', value)
								}
								disabled={isBusy || notificationsDisabled}
								trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
								thumbColor={settings.overspendingAlerts ? '#ffffff' : '#9ca3af'}
							/>
						</View>

						<View style={styles.lastRow}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>Budget Alerts</Text>
								<Text style={styles.settingDescription}>
									Spending limits and budget updates.
								</Text>
							</View>
							<Switch
								value={settings.budgetAlerts}
								onValueChange={(value) =>
									handleSettingChange('budgetAlerts', value)
								}
								disabled={isBusy || notificationsDisabled}
								trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
								thumbColor={settings.budgetAlerts ? '#ffffff' : '#9ca3af'}
							/>
						</View>
					</View>
				</View>

				{/* Goals & Progress */}
				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>GOALS & PROGRESS</Text>
					<View style={styles.section}>
						<View style={styles.row}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>Goals & Milestones</Text>
								<Text style={styles.settingDescription}>
									Updates on savings goals and milestone achievements.
								</Text>
							</View>
							<Switch
								value={settings.goalsAndMilestones}
								onValueChange={(value) =>
									handleSettingChange('goalsAndMilestones', value)
								}
								disabled={isBusy || notificationsDisabled}
								trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
								thumbColor={settings.goalsAndMilestones ? '#ffffff' : '#9ca3af'}
							/>
						</View>
					</View>
				</View>

				{/* Insights & Summaries */}
				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>INSIGHTS & SUMMARIES</Text>
					<View style={styles.section}>
						<View style={styles.row}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>AI Insights</Text>
								<Text style={styles.settingDescription}>
									Let Brie send smart insights about your spending and goals.
								</Text>
							</View>
							<Switch
								value={settings.aiInsightsEnabled}
								onValueChange={(value) =>
									handleSettingChange('aiInsightsEnabled', value)
								}
								disabled={isBusy || notificationsDisabled}
								trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
								thumbColor={settings.aiInsightsEnabled ? '#ffffff' : '#9ca3af'}
							/>
						</View>

						<View style={styles.row}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>Weekly Digest</Text>
								<Text style={styles.settingDescription}>
									Weekly overview of your finances.
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
								<Text style={styles.label}>Monthly Review</Text>
								<Text style={styles.settingDescription}>
									Monthly financial health review.
								</Text>
							</View>
							<Switch
								value={settings.monthlyReviewEnabled}
								onValueChange={(value) =>
									handleSettingChange('monthlyReviewEnabled', value)
								}
								disabled={isBusy || notificationsDisabled}
								trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
								thumbColor={
									settings.monthlyReviewEnabled ? '#ffffff' : '#9ca3af'
								}
							/>
						</View>
					</View>
				</View>

				{/* Quiet Hours */}
				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>QUIET HOURS</Text>
					<Text style={styles.sectionDescription}>
						Set times when you don&apos;t want to receive notifications
					</Text>
					<View style={styles.section}>
						<View style={styles.row}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>Enable Quiet Hours</Text>
								<Text style={styles.settingDescription}>
									Suppress non-critical notifications during specified times.
								</Text>
							</View>
							<Switch
								value={settings.quietHoursEnabled}
								onValueChange={(value) =>
									handleSettingChange('quietHoursEnabled', value)
								}
								disabled={isBusy || notificationsDisabled}
								trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
								thumbColor={settings.quietHoursEnabled ? '#ffffff' : '#9ca3af'}
							/>
						</View>

						{settings.quietHoursEnabled && (
							<>
								<View style={styles.row}>
									<View style={styles.settingInfo}>
										<Text style={styles.label}>Start Time</Text>
										<Text style={styles.settingDescription}>
											When to start suppressing notifications
										</Text>
									</View>
									<View style={styles.pickerContainer}>
										<Picker
											selectedValue={settings.quietHoursStart}
											onValueChange={(value: string) =>
												handleSettingChange('quietHoursStart', value)
											}
											style={styles.picker}
										>
											{Array.from({ length: 24 }, (_, i) => {
												const hour = i.toString().padStart(2, '0');
												return (
													<Picker.Item
														key={hour}
														label={`${hour}:00`}
														value={`${hour}:00`}
													/>
												);
											})}
										</Picker>
									</View>
								</View>

								<View style={styles.lastRow}>
									<View style={styles.settingInfo}>
										<Text style={styles.label}>End Time</Text>
										<Text style={styles.settingDescription}>
											When to resume notifications
										</Text>
									</View>
									<View style={styles.pickerContainer}>
										<Picker
											selectedValue={settings.quietHoursEnd}
											onValueChange={(value: string) =>
												handleSettingChange('quietHoursEnd', value)
											}
											style={styles.picker}
										>
											{Array.from({ length: 24 }, (_, i) => {
												const hour = i.toString().padStart(2, '0');
												return (
													<Picker.Item
														key={hour}
														label={`${hour}:00`}
														value={`${hour}:00`}
													/>
												);
											})}
										</Picker>
									</View>
								</View>
							</>
						)}
					</View>
				</View>

				{/* Marketing */}
				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>MARKETING</Text>
					<View style={styles.section}>
						<View style={styles.row}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>Marketing & Product Updates</Text>
								<Text style={styles.settingDescription}>
									One or two messages a month max. You can change this anytime.
								</Text>
							</View>
							<Switch
								value={settings.marketingUpdatesEnabled}
								onValueChange={(value) =>
									handleSettingChange('marketingUpdatesEnabled', value)
								}
								disabled={isBusy || notificationsDisabled}
								trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
								thumbColor={
									settings.marketingUpdatesEnabled ? '#ffffff' : '#9ca3af'
								}
							/>
						</View>
					</View>
				</View>

				{/* Advanced Preferences Link */}
				<View style={styles.sectionContainer}>
					<View style={styles.section}>
						<TouchableOpacity
							style={styles.consentLink}
							onPress={() =>
								router.push('/(stack)/settings/notification/consentManagement')
							}
						>
							<View style={styles.consentLinkContent}>
								<Ionicons name="settings-outline" size={24} color="#007ACC" />
								<View style={styles.consentLinkText}>
									<Text style={styles.consentLinkTitle}>
										Advanced Preferences & Consent
									</Text>
									<Text style={styles.consentLinkDescription}>
										Manage detailed notification preferences, AI frequency,
										marketing consent, and more.
									</Text>
								</View>
							</View>
							<Ionicons name="chevron-forward" size={20} color="#9ca3af" />
						</TouchableOpacity>
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
	pickerContainer: {
		minWidth: 120,
		height: 40,
		justifyContent: 'center',
	},
	picker: {
		height: 40,
		width: 120,
	},
});

export default NotificationSettingsScreen;
