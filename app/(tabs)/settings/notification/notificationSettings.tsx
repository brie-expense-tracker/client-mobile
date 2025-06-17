import { Stack } from 'expo-router';
import React, { useState } from 'react';
import {
	SafeAreaView,
	View,
	Text,
	StyleSheet,
	Switch,
	ScrollView,
} from 'react-native';

const NotificationSettingsScreen: React.FC = () => {
	const [settings, setSettings] = useState({
		enableNotifications: true,
		weeklySummary: true,
		overspendingAlert: false,
		aiSuggestion: true,
		budgetMilestones: false,
	});

	const toggleSetting = (key: keyof typeof settings) => {
		setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView contentContainerStyle={styles.content}>
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>General</Text>
					<View style={styles.row}>
						<Text style={styles.label}>Enable Notifications</Text>
						<Switch
							value={settings.enableNotifications}
							onValueChange={() => toggleSetting('enableNotifications')}
						/>
					</View>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>AI Insights</Text>

					<View style={styles.row}>
						<Text style={styles.label}>AI Spending Suggestions</Text>
						<Switch
							value={settings.aiSuggestion}
							onValueChange={() => toggleSetting('aiSuggestion')}
						/>
					</View>

					<View style={styles.row}>
						<Text style={styles.label}>Overspending Alerts</Text>
						<Switch
							value={settings.overspendingAlert}
							onValueChange={() => toggleSetting('overspendingAlert')}
						/>
					</View>

					<View style={styles.row}>
						<Text style={styles.label}>Budget Milestones</Text>
						<Switch
							value={settings.budgetMilestones}
							onValueChange={() => toggleSetting('budgetMilestones')}
						/>
					</View>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Summaries</Text>
					<View style={styles.row}>
						<Text style={styles.label}>Weekly Summary</Text>
						<Switch
							value={settings.weeklySummary}
							onValueChange={() => toggleSetting('weeklySummary')}
						/>
					</View>
				</View>
				<Stack.Screen
					options={{
						headerShown: true,
						title: 'Notifications',
						headerShadowVisible: false,
					}}
				/>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	content: {
		padding: 16,
	},
	header: {
		fontSize: 24,
		fontWeight: '600',
		marginBottom: 24,
	},
	section: {
		marginBottom: 32,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '500',
		marginBottom: 12,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	label: {
		fontSize: 16,
	},
});

export default NotificationSettingsScreen;
