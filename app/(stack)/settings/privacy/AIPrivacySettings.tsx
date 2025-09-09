import React, { useState, useEffect } from 'react';
import {
	SafeAreaView,
	ScrollView,
	View,
	Text,
	StyleSheet,
	Switch,
	TouchableOpacity,
	TextInput,
	Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../../../../src/context/profileContext';

interface AIPrivacySettings {
	aiInsightsEnabled: boolean;
	optOutAccountIds: string[];
	optOutMerchantPatterns: string[];
	optOutCategories: string[];
	insightsFrequency: 'daily' | 'weekly' | 'monthly' | 'disabled';
	pushNotifications: boolean;
	emailAlerts: boolean;
	diagnosticsOptIn: boolean;
	usageAnalytics: boolean;
	crashReports: boolean;
	performanceMetrics: boolean;
}

export default function AIPrivacySettingsScreen() {
	const { profile } = useProfile();

	const [settings, setSettings] = useState<AIPrivacySettings>({
		aiInsightsEnabled: true,
		optOutAccountIds: [],
		optOutMerchantPatterns: [],
		optOutCategories: [],
		insightsFrequency: 'weekly',
		pushNotifications: true,
		emailAlerts: false,
		diagnosticsOptIn: false,
		usageAnalytics: false,
		crashReports: false,
		performanceMetrics: false,
	});

	const [newMerchantPattern, setNewMerchantPattern] = useState('');
	const [newCategory, setNewCategory] = useState('');

	useEffect(() => {
		// Load user settings from profile or API
		if (profile?.preferences?.aiInsights) {
			setSettings((prev) => ({
				...prev,
				aiInsightsEnabled: profile.preferences.aiInsights.enabled,
				insightsFrequency: profile.preferences.aiInsights.frequency || 'weekly',
				pushNotifications: profile.preferences.aiInsights.pushNotifications,
			}));
		}
	}, [profile]);

	const updateSetting = (key: keyof AIPrivacySettings, value: any) => {
		setSettings((prev) => ({ ...prev, [key]: value }));
	};

	const addMerchantPattern = () => {
		if (newMerchantPattern.trim()) {
			setSettings((prev) => ({
				...prev,
				optOutMerchantPatterns: [
					...prev.optOutMerchantPatterns,
					newMerchantPattern.trim(),
				],
			}));
			setNewMerchantPattern('');
		}
	};

	const removeMerchantPattern = (index: number) => {
		setSettings((prev) => ({
			...prev,
			optOutMerchantPatterns: prev.optOutMerchantPatterns.filter(
				(_, i) => i !== index
			),
		}));
	};

	const addCategory = () => {
		if (newCategory.trim()) {
			setSettings((prev) => ({
				...prev,
				optOutCategories: [...prev.optOutCategories, newCategory.trim()],
			}));
			setNewCategory('');
		}
	};

	const removeCategory = (index: number) => {
		setSettings((prev) => ({
			...prev,
			optOutCategories: prev.optOutCategories.filter((_, i) => i !== index),
		}));
	};

	const saveSettings = async () => {
		try {
			// TODO: Save to API
			Alert.alert('Success', 'Privacy settings saved successfully');
		} catch {
			Alert.alert('Error', 'Failed to save privacy settings');
		}
	};

	const exportData = () => {
		Alert.alert('Export Data', 'This feature will be available soon');
	};

	const deleteData = () => {
		Alert.alert(
			'Delete All Data',
			'This will permanently delete all your data including transactions, budgets, and goals. This action cannot be undone.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: () => {
						Alert.alert(
							'Data Deletion',
							'Data deletion feature will be available soon'
						);
					},
				},
			]
		);
	};

	return (
		<SafeAreaView style={styles.safe}>
			<Stack.Screen options={{ title: 'AI & Privacy Settings' }} />
			<ScrollView contentContainerStyle={styles.container}>
				<Text style={styles.h1}>AI & Privacy Controls</Text>
				<Text style={styles.subtitle}>
					Control how Brie uses your data and provides AI insights
				</Text>

				{/* AI Insights Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>AI Insights</Text>

					<View style={styles.settingRow}>
						<View style={styles.settingInfo}>
							<Text style={styles.settingLabel}>Enable AI Insights</Text>
							<Text style={styles.settingDescription}>
								Allow Brie to analyze your spending and provide personalized
								suggestions
							</Text>
						</View>
						<Switch
							value={settings.aiInsightsEnabled}
							onValueChange={(value) =>
								updateSetting('aiInsightsEnabled', value)
							}
							trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
							thumbColor={settings.aiInsightsEnabled ? '#ffffff' : '#9ca3af'}
						/>
					</View>

					{settings.aiInsightsEnabled && (
						<>
							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Insight Frequency</Text>
									<Text style={styles.settingDescription}>
										How often to receive AI-generated insights
									</Text>
								</View>
								<TouchableOpacity
									style={styles.pickerButton}
									onPress={() => {
										Alert.alert('Select Frequency', '', [
											{
												text: 'Daily',
												onPress: () =>
													updateSetting('insightsFrequency', 'daily'),
											},
											{
												text: 'Weekly',
												onPress: () =>
													updateSetting('insightsFrequency', 'weekly'),
											},
											{
												text: 'Monthly',
												onPress: () =>
													updateSetting('insightsFrequency', 'monthly'),
											},
											{ text: 'Cancel', style: 'cancel' },
										]);
									}}
								>
									<Text style={styles.pickerButtonText}>
										{settings.insightsFrequency.charAt(0).toUpperCase() +
											settings.insightsFrequency.slice(1)}
									</Text>
									<Ionicons name="chevron-down" size={16} color="#6b7280" />
								</TouchableOpacity>
							</View>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Push Notifications</Text>
									<Text style={styles.settingDescription}>
										Receive notifications for new insights
									</Text>
								</View>
								<Switch
									value={settings.pushNotifications}
									onValueChange={(value) =>
										updateSetting('pushNotifications', value)
									}
									trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
									thumbColor={
										settings.pushNotifications ? '#ffffff' : '#9ca3af'
									}
								/>
							</View>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Email Alerts</Text>
									<Text style={styles.settingDescription}>
										Receive insights via email
									</Text>
								</View>
								<Switch
									value={settings.emailAlerts}
									onValueChange={(value) => updateSetting('emailAlerts', value)}
									trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
									thumbColor={settings.emailAlerts ? '#ffffff' : '#9ca3af'}
								/>
							</View>
						</>
					)}
				</View>

				{/* Data Exclusions Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Data Exclusions</Text>
					<Text style={styles.sectionDescription}>
						Exclude specific accounts, merchants, or categories from AI analysis
					</Text>

					{/* Merchant Pattern Exclusions */}
					<View style={styles.exclusionGroup}>
						<Text style={styles.exclusionLabel}>
							Exclude Merchants (Patterns)
						</Text>
						<Text style={styles.exclusionDescription}>
							Use * for wildcards. Example: *Medical*, LAWYER*
						</Text>

						<View style={styles.addInputRow}>
							<TextInput
								style={styles.textInput}
								value={newMerchantPattern}
								onChangeText={setNewMerchantPattern}
								placeholder="Enter merchant pattern"
								placeholderTextColor="#9ca3af"
							/>
							<TouchableOpacity
								style={styles.addButton}
								onPress={addMerchantPattern}
								disabled={!newMerchantPattern.trim()}
							>
								<Ionicons name="add" size={20} color="#ffffff" />
							</TouchableOpacity>
						</View>

						{settings.optOutMerchantPatterns.map((pattern, index) => (
							<View key={index} style={styles.exclusionItem}>
								<Text style={styles.exclusionText}>{pattern}</Text>
								<TouchableOpacity
									onPress={() => removeMerchantPattern(index)}
									style={styles.removeButton}
								>
									<Ionicons name="close-circle" size={20} color="#ef4444" />
								</TouchableOpacity>
							</View>
						))}
					</View>

					{/* Category Exclusions */}
					<View style={styles.exclusionGroup}>
						<Text style={styles.exclusionLabel}>Exclude Categories</Text>
						<Text style={styles.exclusionDescription}>
							Exclude specific spending categories from AI analysis
						</Text>

						<View style={styles.addInputRow}>
							<TextInput
								style={styles.textInput}
								value={newCategory}
								onChangeText={setNewCategory}
								placeholder="Enter category name"
								placeholderTextColor="#9ca3af"
							/>
							<TouchableOpacity
								style={styles.addButton}
								onPress={addCategory}
								disabled={!newCategory.trim()}
							>
								<Ionicons name="add" size={20} color="#ffffff" />
							</TouchableOpacity>
						</View>

						{settings.optOutCategories.map((category, index) => (
							<View key={index} style={styles.exclusionItem}>
								<Text style={styles.exclusionText}>{category}</Text>
								<TouchableOpacity
									onPress={() => removeCategory(index)}
									style={styles.removeButton}
								>
									<Ionicons name="close-circle" size={20} color="#ef4444" />
								</TouchableOpacity>
							</View>
						))}
					</View>
				</View>

				{/* Diagnostics Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Diagnostics & Analytics</Text>
					<Text style={styles.sectionDescription}>
						Help improve Brie by sharing anonymous usage data
					</Text>

					<View style={styles.settingRow}>
						<View style={styles.settingInfo}>
							<Text style={styles.settingLabel}>
								Share Anonymous Diagnostics
							</Text>
							<Text style={styles.settingDescription}>
								Help improve app performance and features
							</Text>
						</View>
						<Switch
							value={settings.diagnosticsOptIn}
							onValueChange={(value) =>
								updateSetting('diagnosticsOptIn', value)
							}
							trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
							thumbColor={settings.diagnosticsOptIn ? '#ffffff' : '#9ca3af'}
						/>
					</View>

					{settings.diagnosticsOptIn && (
						<>
							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Usage Analytics</Text>
									<Text style={styles.settingDescription}>
										Share how you use the app (no personal data)
									</Text>
								</View>
								<Switch
									value={settings.usageAnalytics}
									onValueChange={(value) =>
										updateSetting('usageAnalytics', value)
									}
									trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
									thumbColor={settings.usageAnalytics ? '#ffffff' : '#9ca3af'}
								/>
							</View>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Crash Reports</Text>
									<Text style={styles.settingDescription}>
										Automatically send crash reports
									</Text>
								</View>
								<Switch
									value={settings.crashReports}
									onValueChange={(value) =>
										updateSetting('crashReports', value)
									}
									trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
									thumbColor={settings.crashReports ? '#ffffff' : '#9ca3af'}
								/>
							</View>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Performance Metrics</Text>
									<Text style={styles.settingDescription}>
										Share app performance data
									</Text>
								</View>
								<Switch
									value={settings.performanceMetrics}
									onValueChange={(value) =>
										updateSetting('performanceMetrics', value)
									}
									trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
									thumbColor={
										settings.performanceMetrics ? '#ffffff' : '#9ca3af'
									}
								/>
							</View>
						</>
					)}
				</View>

				{/* Data Management Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Data Management</Text>

					<TouchableOpacity style={styles.actionButton} onPress={exportData}>
						<Ionicons name="download-outline" size={20} color="#3b82f6" />
						<Text style={styles.actionButtonText}>Export My Data</Text>
						<Ionicons name="chevron-forward" size={16} color="#9ca3af" />
					</TouchableOpacity>

					<TouchableOpacity style={styles.actionButton} onPress={deleteData}>
						<Ionicons name="trash-outline" size={20} color="#ef4444" />
						<Text style={[styles.actionButtonText, { color: '#ef4444' }]}>
							Delete All Data
						</Text>
						<Ionicons name="chevron-forward" size={16} color="#9ca3af" />
					</TouchableOpacity>
				</View>

				{/* Save Button */}
				<TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
					<Text style={styles.saveButtonText}>Save Settings</Text>
				</TouchableOpacity>

				{/* Privacy Notice */}
				<View style={styles.privacyNotice}>
					<Text style={styles.privacyNoticeText}>
						Your privacy is important to us. We never share your personal
						financial data with third parties. AI insights are generated using
						anonymized data and are for educational purposes only.
					</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	container: {
		padding: 20,
	},
	h1: {
		fontSize: 28,
		fontWeight: 'bold',
		color: '#111827',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: '#6b7280',
		marginBottom: 32,
	},
	section: {
		marginBottom: 32,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#111827',
		marginBottom: 16,
	},
	sectionDescription: {
		fontSize: 14,
		color: '#6b7280',
		marginBottom: 20,
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
		color: '#111827',
		marginBottom: 4,
	},
	settingDescription: {
		fontSize: 14,
		color: '#6b7280',
		lineHeight: 20,
	},
	pickerButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f9fafb',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	pickerButtonText: {
		fontSize: 14,
		color: '#374151',
		marginRight: 8,
	},
	exclusionGroup: {
		marginBottom: 24,
	},
	exclusionLabel: {
		fontSize: 16,
		fontWeight: '500',
		color: '#111827',
		marginBottom: 8,
	},
	exclusionDescription: {
		fontSize: 14,
		color: '#6b7280',
		marginBottom: 16,
		lineHeight: 20,
	},
	addInputRow: {
		flexDirection: 'row',
		marginBottom: 16,
		gap: 12,
	},
	textInput: {
		flex: 1,
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 16,
		backgroundColor: '#ffffff',
	},
	addButton: {
		backgroundColor: '#3b82f6',
		padding: 12,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	exclusionItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#f9fafb',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		marginBottom: 8,
	},
	exclusionText: {
		fontSize: 14,
		color: '#374151',
	},
	removeButton: {
		padding: 4,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 16,
		paddingHorizontal: 0,
		borderBottomWidth: 1,
		borderBottomColor: '#f3f4f6',
	},
	actionButtonText: {
		flex: 1,
		fontSize: 16,
		color: '#374151',
		marginLeft: 12,
	},
	saveButton: {
		backgroundColor: '#3b82f6',
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderRadius: 12,
		alignItems: 'center',
		marginBottom: 24,
	},
	saveButtonText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '600',
	},
	privacyNotice: {
		backgroundColor: '#f9fafb',
		padding: 16,
		borderRadius: 8,
		borderLeftWidth: 4,
		borderLeftColor: '#3b82f6',
	},
	privacyNoticeText: {
		fontSize: 14,
		color: '#6b7280',
		lineHeight: 20,
		textAlign: 'center',
	},
});
