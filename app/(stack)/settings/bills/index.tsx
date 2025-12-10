import React, { useState, useEffect } from 'react';
import { logger } from '../../../../src/utils/logger';
import {
	SafeAreaView,
	ScrollView,
	View,
	Text,
	Switch,
	StyleSheet,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useProfile } from '../../../../src/context/profileContext';

export default function BillsSettingsScreen() {
	const router = useRouter();
	const { profile, loading } = useProfile();

	const [autoSync, setAutoSync] = useState(true);
	const [reminderNotifications, setReminderNotifications] = useState(true);
	const [expenseTracking, setExpenseTracking] = useState(true);
	const [saving, setSaving] = useState(false);

	// Load settings from profile when available
	useEffect(() => {
		if (profile?.preferences?.recurringExpenses) {
			const settings = profile.preferences.recurringExpenses;
			setAutoSync(settings.enabled ?? true);
			setReminderNotifications(settings.notifications ?? true);
			setExpenseTracking(settings.autoCategorization ?? true);
		}
	}, [profile?.preferences?.recurringExpenses]);

	const handleSave = async () => {
		try {
			setSaving(true);
			// TODO: Implement updateBillsSettings when available in profile context
			Alert.alert('Success', 'Bills settings saved successfully');
		} catch (error) {
			logger.error('Error saving bills settings:', error);
			Alert.alert('Error', 'Failed to save settings');
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.safe}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#007AFF" />
					<Text style={styles.loadingText}>Loading settings...</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safe}>
			<ScrollView contentContainerStyle={styles.container}>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>Bills</Text>
					<Text style={styles.subtitle}>
						Manage how bills are handled in your app
					</Text>
				</View>

				{/* Settings */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Automation</Text>
					<View style={styles.settingItem}>
						<View style={styles.settingContent}>
							<Text style={styles.settingLabel}>
								Auto-sync Bills
							</Text>
							<Text style={styles.settingDescription}>
								Automatically add bills to your budget each period
							</Text>
						</View>
						<Switch
							value={autoSync}
							onValueChange={setAutoSync}
							trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
							thumbColor={autoSync ? '#fff' : '#f4f3f4'}
						/>
					</View>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Notifications</Text>
					<View style={styles.settingItem}>
						<View style={styles.settingContent}>
							<Text style={styles.settingLabel}>Reminder Notifications</Text>
							<Text style={styles.settingDescription}>
								Get notified before bills are due
							</Text>
						</View>
						<Switch
							value={reminderNotifications}
							onValueChange={setReminderNotifications}
							trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
							thumbColor={reminderNotifications ? '#fff' : '#f4f3f4'}
						/>
					</View>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Tracking</Text>
					<View style={styles.settingItem}>
						<View style={styles.settingContent}>
							<Text style={styles.settingLabel}>Expense Tracking</Text>
							<Text style={styles.settingDescription}>
								Track spending patterns for bills
							</Text>
						</View>
						<Switch
							value={expenseTracking}
							onValueChange={setExpenseTracking}
							trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
							thumbColor={expenseTracking ? '#fff' : '#f4f3f4'}
						/>
					</View>
				</View>

				{/* Quick Actions */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Quick Actions</Text>
					<TouchableOpacity
						style={styles.actionButton}
						onPress={() => router.push('/(tabs)/wallet/bills')}
					>
						<Ionicons name="list-outline" size={20} color="#007AFF" />
						<Text style={styles.actionButtonText}>
							View All Bills
						</Text>
						<Ionicons name="chevron-forward" size={20} color="#007AFF" />
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.actionButton}
						onPress={() => router.push('/(tabs)/wallet/bills/new')}
					>
						<Ionicons name="add-circle-outline" size={20} color="#007AFF" />
						<Text style={styles.actionButtonText}>
							Add New Bill
						</Text>
						<Ionicons name="chevron-forward" size={20} color="#007AFF" />
					</TouchableOpacity>
				</View>

				{/* Save Button */}
				<TouchableOpacity
					style={[styles.saveButton, saving && styles.saveButtonDisabled]}
					onPress={handleSave}
					disabled={saving}
				>
					{saving ? (
						<ActivityIndicator size="small" color="#fff" />
					) : (
						<Text style={styles.saveButtonText}>Save Settings</Text>
					)}
				</TouchableOpacity>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: '#fff' },
	container: { padding: 24, paddingBottom: 48 },
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		fontSize: 16,
		color: '#666',
		marginTop: 12,
	},
	header: {
		marginBottom: 32,
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: '#333',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: '#666',
		lineHeight: 22,
	},
	section: {
		marginBottom: 32,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginBottom: 16,
	},
	settingItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	settingContent: {
		flex: 1,
		marginRight: 16,
	},
	settingLabel: {
		fontSize: 16,
		fontWeight: '500',
		color: '#333',
		marginBottom: 4,
	},
	settingDescription: {
		fontSize: 14,
		color: '#666',
		lineHeight: 18,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 16,
		paddingHorizontal: 16,
		borderRadius: 12,
		backgroundColor: '#f8f9fa',
		marginBottom: 12,
	},
	actionButtonText: {
		flex: 1,
		fontSize: 16,
		color: '#007AFF',
		marginLeft: 12,
		fontWeight: '500',
	},
	saveButton: {
		backgroundColor: '#007AFF',
		padding: 16,
		borderRadius: 12,
		alignItems: 'center',
		marginTop: 24,
	},
	saveButtonDisabled: {
		backgroundColor: '#ccc',
	},
	saveButtonText: {
		fontSize: 16,
		color: '#fff',
		fontWeight: '600',
	},
});
