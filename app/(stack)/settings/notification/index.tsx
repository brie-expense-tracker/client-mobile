import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	Switch,
	ScrollView,
	Alert,
} from 'react-native';
import { useProfile } from '../../../../src/context/profileContext';

interface NotificationSettings {
	enableNotifications: boolean;
	weeklySummary: boolean;
	overspendingAlert: boolean;
	aiSuggestion: boolean;
	budgetMilestones: boolean;
	monthlyFinancialCheck: boolean;
	monthlySavingsTransfer: boolean;
}

const NotificationSettingsScreen: React.FC = () => {
	const { profile, updateNotificationSettings, loading } = useProfile();
	const [settings, setSettings] = useState<NotificationSettings>({
		enableNotifications: true,
		weeklySummary: true,
		overspendingAlert: false,
		aiSuggestion: true,
		budgetMilestones: false,
		monthlyFinancialCheck: true,
		monthlySavingsTransfer: true,
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
			console.error('Error updating notification settings:', error);

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
			<ScrollView contentContainerStyle={styles.content}>
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

				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>AI INSIGHTS</Text>
					<View style={styles.section}>
						<View style={styles.row}>
							<Text style={styles.label}>AI Spending Suggestions</Text>
							<Switch
								value={settings.aiSuggestion}
								onValueChange={(value) =>
									handleSettingChange('aiSuggestion', value)
								}
								disabled={saving || loading}
							/>
						</View>

						<View style={styles.row}>
							<Text style={styles.label}>Overspending Alerts</Text>
							<Switch
								value={settings.overspendingAlert}
								onValueChange={(value) =>
									handleSettingChange('overspendingAlert', value)
								}
								disabled={saving || loading}
							/>
						</View>

						<View style={styles.row}>
							<Text style={styles.label}>Budget Milestones</Text>
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

				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>SUMMARIES</Text>
					<View style={styles.section}>
						<View style={styles.row}>
							<Text style={styles.label}>Weekly Summary</Text>
							<Switch
								value={settings.weeklySummary}
								onValueChange={(value) =>
									handleSettingChange('weeklySummary', value)
								}
								disabled={saving || loading}
							/>
						</View>
						<View style={styles.row}>
							<Text style={styles.label}>Monthly Financial Health Check</Text>
							<Switch
								value={settings.monthlyFinancialCheck}
								onValueChange={(value) =>
									handleSettingChange('monthlyFinancialCheck', value)
								}
								disabled={saving || loading}
							/>
						</View>
						<Text style={styles.settingDescription}>
							Get monthly reminders to review your financial progress, adjust
							budgets, and update goals
						</Text>
						<View style={styles.row}>
							<Text style={styles.label}>Monthly Savings Transfer</Text>
							<Switch
								value={settings.monthlySavingsTransfer}
								onValueChange={(value) =>
									handleSettingChange('monthlySavingsTransfer', value)
								}
								disabled={saving || loading}
							/>
						</View>
						<Text style={styles.settingDescription}>
							Receive reminders to transfer your monthly savings to your savings
							account
						</Text>
					</View>
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
		marginTop: 8,
		marginLeft: 24,
	},
});

export default NotificationSettingsScreen;
