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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../../../../src/context/profileContext';

interface NotificationSettings {
	enableNotifications: boolean;
	// Core Notifications
	budgetAlerts: boolean;
	goalProgress: boolean;
	transactionAlerts: boolean;
	systemNotifications: boolean;
	// AI Insights
	aiInsights: boolean;
	aiSuggestion: boolean;
	// Reminders
	weeklySummary: boolean;
	monthlyCheck: boolean;
	overspendingAlert: boolean;
	monthlyFinancialCheck: boolean;
	monthlySavingsTransfer: boolean;
	// Marketing & Promotional
	promotional: boolean;
	newsletter: boolean;
	productUpdates: boolean;
	budgetMilestones: boolean;
}

const NotificationSettingsScreen: React.FC = () => {
	const router = useRouter();
	const { profile, updateNotificationSettings, loading } = useProfile();
	const [settings, setSettings] = useState<NotificationSettings>({
		enableNotifications: true,
		// Core Notifications
		budgetAlerts: true,
		goalProgress: true,
		transactionAlerts: true,
		systemNotifications: true,
		// AI Insights
		aiInsights: true,
		aiSuggestion: true,
		// Reminders
		weeklySummary: true,
		monthlyCheck: true,
		overspendingAlert: false,
		monthlyFinancialCheck: true,
		monthlySavingsTransfer: true,
		// Marketing & Promotional
		promotional: false,
		newsletter: false,
		productUpdates: false,
		budgetMilestones: false,
	});
	const [saving, setSaving] = useState(false);

	// Load settings from profile when available
	useEffect(() => {
		if (profile?.preferences?.notifications) {
			setSettings(profile.preferences.notifications);
		}
	}, [profile?.preferences?.notifications]);

	const handleSettingChange = async (
		key: keyof NotificationSettings,
		value: boolean
	) => {
		try {
			setSaving(true);
			const newSettings = { ...settings, [key]: value };
			setSettings(newSettings);

			await updateNotificationSettings(newSettings);
		} catch (error) {
			logger.error('Error updating notification settings:', error);

			// Revert on error
			setSettings(settings);

			// Provide specific error messages based on error type
			let errorMessage = 'Failed to update notification settings';
			if (error instanceof Error) {
				if (
					error.message.includes('network') ||
					error.message.includes('fetch')
				) {
					errorMessage =
						'Network error. Please check your connection and try again.';
				} else if (
					error.message.includes('unauthorized') ||
					error.message.includes('401')
				) {
					errorMessage = 'Session expired. Please sign in again.';
				} else if (
					error.message.includes('server') ||
					error.message.includes('500')
				) {
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

	return (
		<View style={styles.mainContainer}>
			<Stack.Screen
				options={{
					title: 'Notifications',
					headerShown: true,
				}}
			/>

			<ScrollView contentContainerStyle={styles.content}>
				{/* Consent Management Link */}
				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>CONSENT MANAGEMENT</Text>
					<View style={styles.section}>
						<TouchableOpacity
							style={styles.consentLink}
							onPress={() =>
								router.push('/(stack)/settings/notification/consentManagement')
							}
						>
							<View style={styles.consentLinkContent}>
								<Ionicons
									name="shield-checkmark-outline"
									size={24}
									color="#007ACC"
								/>
								<View style={styles.consentLinkText}>
									<Text style={styles.consentLinkTitle}>
										Notification Consent
									</Text>
									<Text style={styles.consentLinkDescription}>
										Manage detailed notification preferences and marketing
										consent
									</Text>
								</View>
							</View>
							<Ionicons name="chevron-forward" size={20} color="#9ca3af" />
						</TouchableOpacity>
					</View>
				</View>

				{/* General Settings */}
				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>GENERAL</Text>
					<View style={styles.section}>
						<View style={styles.row}>
							<Text style={styles.label}>Enable Notifications</Text>
							<Switch
								value={settings.enableNotifications}
								onValueChange={(value) =>
									handleSettingChange('enableNotifications', value)
								}
								disabled={saving || loading}
							/>
						</View>
					</View>
				</View>

				{/* Core Notifications */}
				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>CORE NOTIFICATIONS</Text>
					<Text style={styles.sectionDescription}>
						Essential notifications for app functionality
					</Text>
					<View style={styles.section}>
						<View style={styles.row}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>Budget Alerts</Text>
								<Text style={styles.settingDescription}>
									Spending limits and budget updates
								</Text>
							</View>
							<Switch
								value={settings.budgetAlerts}
								onValueChange={(value) =>
									handleSettingChange('budgetAlerts', value)
								}
								disabled={saving || loading}
							/>
						</View>

						<View style={styles.row}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>Goal Progress</Text>
								<Text style={styles.settingDescription}>
									Savings and investment milestones
								</Text>
							</View>
							<Switch
								value={settings.goalProgress}
								onValueChange={(value) =>
									handleSettingChange('goalProgress', value)
								}
								disabled={saving || loading}
							/>
						</View>

						<View style={styles.row}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>Transaction Alerts</Text>
								<Text style={styles.settingDescription}>
									Important account updates
								</Text>
							</View>
							<Switch
								value={settings.transactionAlerts}
								onValueChange={(value) =>
									handleSettingChange('transactionAlerts', value)
								}
								disabled={saving || loading}
							/>
						</View>

						<View style={styles.lastRow}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>System Notifications</Text>
								<Text style={styles.settingDescription}>
									Security and app updates
								</Text>
							</View>
							<Switch
								value={settings.systemNotifications}
								onValueChange={(value) =>
									handleSettingChange('systemNotifications', value)
								}
								disabled={saving || loading}
							/>
						</View>
					</View>
				</View>

				{/* AI Insights */}
				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>AI INSIGHTS</Text>
					<Text style={styles.sectionDescription}>
						Personalized financial advice and insights
					</Text>
					<View style={styles.section}>
						<View style={styles.row}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>AI Insights</Text>
								<Text style={styles.settingDescription}>
									Smart spending analysis and recommendations
								</Text>
							</View>
							<Switch
								value={settings.aiInsights}
								onValueChange={(value) =>
									handleSettingChange('aiInsights', value)
								}
								disabled={saving || loading}
							/>
						</View>

						<View style={styles.lastRow}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>AI Spending Suggestions</Text>
								<Text style={styles.settingDescription}>
									Personalized spending recommendations
								</Text>
							</View>
							<Switch
								value={settings.aiSuggestion}
								onValueChange={(value) =>
									handleSettingChange('aiSuggestion', value)
								}
								disabled={saving || loading}
							/>
						</View>
					</View>
				</View>

				{/* Reminders */}
				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>REMINDERS</Text>
					<Text style={styles.sectionDescription}>
						Helpful reminders and summaries
					</Text>
					<View style={styles.section}>
						<View style={styles.row}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>Weekly Summary</Text>
								<Text style={styles.settingDescription}>
									Weekly spending overview
								</Text>
							</View>
							<Switch
								value={settings.weeklySummary}
								onValueChange={(value) =>
									handleSettingChange('weeklySummary', value)
								}
								disabled={saving || loading}
							/>
						</View>

						<View style={styles.row}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>Monthly Check-in</Text>
								<Text style={styles.settingDescription}>
									Monthly financial review
								</Text>
							</View>
							<Switch
								value={settings.monthlyCheck}
								onValueChange={(value) =>
									handleSettingChange('monthlyCheck', value)
								}
								disabled={saving || loading}
							/>
						</View>

						<View style={styles.row}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>Overspending Alerts</Text>
								<Text style={styles.settingDescription}>
									Real-time spending warnings
								</Text>
							</View>
							<Switch
								value={settings.overspendingAlert}
								onValueChange={(value) =>
									handleSettingChange('overspendingAlert', value)
								}
								disabled={saving || loading}
							/>
						</View>

						<View style={styles.row}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>Monthly Financial Check</Text>
								<Text style={styles.settingDescription}>
									Comprehensive monthly review
								</Text>
							</View>
							<Switch
								value={settings.monthlyFinancialCheck}
								onValueChange={(value) =>
									handleSettingChange('monthlyFinancialCheck', value)
								}
								disabled={saving || loading}
							/>
						</View>

						<View style={styles.lastRow}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>Monthly Savings Transfer</Text>
								<Text style={styles.settingDescription}>
									Monthly savings reminders
								</Text>
							</View>
							<Switch
								value={settings.monthlySavingsTransfer}
								onValueChange={(value) =>
									handleSettingChange('monthlySavingsTransfer', value)
								}
								disabled={saving || loading}
							/>
						</View>
					</View>
				</View>

				{/* Marketing & Promotional */}
				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>MARKETING & PROMOTIONAL</Text>
					<Text style={styles.sectionDescription}>
						Product updates and special offers (optional)
					</Text>
					<View style={styles.section}>
						<View style={styles.row}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>Special Offers</Text>
								<Text style={styles.settingDescription}>
									Exclusive deals and promotions
								</Text>
							</View>
							<Switch
								value={settings.promotional}
								onValueChange={(value) =>
									handleSettingChange('promotional', value)
								}
								disabled={saving || loading}
							/>
						</View>

						<View style={styles.row}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>Newsletter</Text>
								<Text style={styles.settingDescription}>
									Product updates and tips
								</Text>
							</View>
							<Switch
								value={settings.newsletter}
								onValueChange={(value) =>
									handleSettingChange('newsletter', value)
								}
								disabled={saving || loading}
							/>
						</View>

						<View style={styles.row}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>Product Updates</Text>
								<Text style={styles.settingDescription}>
									New features and improvements
								</Text>
							</View>
							<Switch
								value={settings.productUpdates}
								onValueChange={(value) =>
									handleSettingChange('productUpdates', value)
								}
								disabled={saving || loading}
							/>
						</View>

						<View style={styles.lastRow}>
							<View style={styles.settingInfo}>
								<Text style={styles.label}>Budget Milestones</Text>
								<Text style={styles.settingDescription}>
									Milestone achievement notifications
								</Text>
							</View>
							<Switch
								value={settings.budgetMilestones}
								onValueChange={(value) =>
									handleSettingChange('budgetMilestones', value)
								}
								disabled={saving || loading}
							/>
						</View>
					</View>
				</View>

				{/* Information Note */}
				<View style={styles.infoContainer}>
					<Ionicons
						name="information-circle-outline"
						size={20}
						color="#6b7280"
					/>
					<Text style={styles.infoText}>
						Core app features work without notifications. Marketing
						notifications require explicit opt-in.
					</Text>
				</View>
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	content: {
		padding: 16,
	},
	sectionContainer: {
		marginBottom: 32,
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: '400',
		marginBottom: 8,
		marginLeft: 16,
		color: '#8b8b8b',
	},
	sectionDescription: {
		fontSize: 14,
		color: '#8b8b8b',
		marginBottom: 12,
		marginLeft: 16,
	},
	section: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#efefef',
		height: 56,
	},
	lastRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		height: 56,
	},
	label: {
		fontSize: 16,
		fontWeight: '400',
	},
	settingDescription: {
		fontSize: 12,
		color: '#8b8b8b',
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
		marginTop: 24,
		marginHorizontal: 16,
	},
	infoText: {
		flex: 1,
		fontSize: 14,
		color: '#0369a1',
		marginLeft: 8,
		lineHeight: 20,
	},
});

export default NotificationSettingsScreen;
