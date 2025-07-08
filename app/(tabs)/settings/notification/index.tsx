import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';

interface NotificationSettings {
	enableNotifications: boolean;
	weeklySummary: boolean;
	overspendingAlert: boolean;
	aiSuggestion: boolean;
	budgetMilestones: boolean;
}

const NotificationSettingsScreen: React.FC = () => {
	const [settings, setSettings] = useState<NotificationSettings>({
		enableNotifications: true,
		weeklySummary: true,
		overspendingAlert: false,
		aiSuggestion: true,
		budgetMilestones: false,
	});
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		fetchNotificationSettings();
	}, []);

	const fetchNotificationSettings = async () => {
		try {
			setLoading(true);
			const response = await fetch(
				'http://192.168.1.222:3000/api/profiles/notifications'
			);
			if (response.ok) {
				const data = await response.json();
				if (data.success && data.data) {
					setSettings(data.data);
				}
			}
		} catch (error) {
			// UNCOMMENT THIS WHEN WE HAVE THE API
			// console.error('Error fetching notification settings:', error);
		} finally {
			setLoading(false);
		}
	};

	const updateNotificationSettings = async (
		newSettings: NotificationSettings
	) => {
		try {
			const response = await fetch(
				'http://192.168.1.222:3000/api/profiles/notifications',
				{
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(newSettings),
				}
			);

			if (!response.ok) {
				throw new Error('Failed to update notification settings');
			}

			const data = await response.json();
			if (data.success) {
				console.log('Notification settings updated successfully');
			}
		} catch (error) {
			// UNCOMMENT THIS WHEN WE HAVE THE API
			// console.error('Error updating notification settings:', error);
			//Alert.alert('Error', 'Failed to update notification settings');
		}
	};

	const toggleSetting = (key: keyof NotificationSettings) => {
		const newSettings = { ...settings, [key]: !settings[key] };
		setSettings(newSettings);
		updateNotificationSettings(newSettings);
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
								onValueChange={() => toggleSetting('enableNotifications')}
								disabled={loading}
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
								onValueChange={() => toggleSetting('aiSuggestion')}
								disabled={loading}
							/>
						</View>

						<View style={styles.row}>
							<Text style={styles.label}>Overspending Alerts</Text>
							<Switch
								value={settings.overspendingAlert}
								onValueChange={() => toggleSetting('overspendingAlert')}
								disabled={loading}
							/>
						</View>

						<View style={styles.row}>
							<Text style={styles.label}>Budget Milestones</Text>
							<Switch
								value={settings.budgetMilestones}
								onValueChange={() => toggleSetting('budgetMilestones')}
								disabled={loading}
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
								onValueChange={() => toggleSetting('weeklySummary')}
								disabled={loading}
							/>
						</View>
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
});

export default NotificationSettingsScreen;
