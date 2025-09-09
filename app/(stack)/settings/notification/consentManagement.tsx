import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotification } from '../../../../src/context/notificationContext';
import { NotificationConsent } from '../../../../src/services';

export default function NotificationConsentScreen() {
	const { updateConsentSettings, getConsentSettings, sendTestNotification } =
		useNotification();

	const [consent, setConsent] = useState<NotificationConsent>({
		core: {
			budget: true,
			goals: true,
			transactions: true,
			system: true,
		},
		aiInsights: {
			enabled: true,
			frequency: 'weekly',
			pushNotifications: true,
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
			monthlyCheck: true,
			overspendingAlerts: false,
		},
	});

	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [quietHours, setQuietHours] = useState({
		enabled: false,
		start: '22:00',
		end: '08:00',
	});

	const loadConsentSettings = useCallback(async () => {
		setLoading(true);
		try {
			const settings = await getConsentSettings();
			setConsent(settings);
			setLoading(false);
		} catch (error) {
			console.error('Error loading consent settings:', error);
			Alert.alert('Error', 'Failed to load notification preferences');
			setLoading(false);
		}
	}, [getConsentSettings]);

	useEffect(() => {
		loadConsentSettings();
	}, [loadConsentSettings]);

	const updateConsent = (
		section: keyof NotificationConsent,
		key: string,
		value: boolean
	) => {
		setConsent((prev) => ({
			...prev,
			[section]: {
				...prev[section],
				[key]: value,
			},
		}));
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			const success = await updateConsentSettings(consent);
			if (success) {
				Alert.alert('Success', 'Notification preferences updated successfully');
			} else {
				Alert.alert('Error', 'Failed to update notification preferences');
			}
		} catch (error) {
			console.error('Error updating consent settings:', error);
			Alert.alert('Error', 'Failed to update notification preferences');
		} finally {
			setSaving(false);
		}
	};

	const handleTestNotification = async () => {
		try {
			await sendTestNotification();
			Alert.alert('Test Sent', 'Test notification sent successfully!');
		} catch (error) {
			console.error('Error sending test notification:', error);
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
						setConsent({
							core: {
								budget: true,
								goals: true,
								transactions: true,
								system: true,
							},
							aiInsights: {
								enabled: true,
								frequency: 'weekly',
								pushNotifications: true,
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
								monthlyCheck: true,
								overspendingAlerts: false,
							},
						});
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
					title: 'Notification Consent',
					headerShown: true,
				}}
			/>

			<ScrollView contentContainerStyle={styles.content}>
				{/* Header */}
				<View style={styles.header}>
					<Ionicons name="shield-checkmark-outline" size={32} color="#007ACC" />
					<Text style={styles.title}>Notification Consent</Text>
					<Text style={styles.subtitle}>
						Control how and when you receive notifications
					</Text>
				</View>

				{/* Core Notifications */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Essential Updates</Text>
					<Text style={styles.sectionDescription}>
						These notifications help you stay on top of your finances
					</Text>

					<View style={styles.settingRow}>
						<View style={styles.settingInfo}>
							<Text style={styles.settingLabel}>Budget Alerts</Text>
							<Text style={styles.settingDescription}>
								Get notified when approaching budget limits
							</Text>
						</View>
						<Switch
							value={consent.core.budget}
							onValueChange={(value) => updateConsent('core', 'budget', value)}
							trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
							thumbColor={consent.core.budget ? '#ffffff' : '#9ca3af'}
						/>
					</View>

					<View style={styles.settingRow}>
						<View style={styles.settingInfo}>
							<Text style={styles.settingLabel}>Goal Progress</Text>
							<Text style={styles.settingDescription}>
								Updates on savings and investment goals
							</Text>
						</View>
						<Switch
							value={consent.core.goals}
							onValueChange={(value) => updateConsent('core', 'goals', value)}
							trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
							thumbColor={consent.core.goals ? '#ffffff' : '#9ca3af'}
						/>
					</View>

					<View style={styles.settingRow}>
						<View style={styles.settingInfo}>
							<Text style={styles.settingLabel}>Transaction Alerts</Text>
							<Text style={styles.settingDescription}>
								Important account updates and alerts
							</Text>
						</View>
						<Switch
							value={consent.core.transactions}
							onValueChange={(value) =>
								updateConsent('core', 'transactions', value)
							}
							trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
							thumbColor={consent.core.transactions ? '#ffffff' : '#9ca3af'}
						/>
					</View>

					<View style={styles.settingRow}>
						<View style={styles.settingInfo}>
							<Text style={styles.settingLabel}>System Notifications</Text>
							<Text style={styles.settingDescription}>
								App updates and maintenance notices
							</Text>
						</View>
						<Switch
							value={consent.core.system}
							onValueChange={(value) => updateConsent('core', 'system', value)}
							trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
							thumbColor={consent.core.system ? '#ffffff' : '#9ca3af'}
						/>
					</View>
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
								updateConsent('aiInsights', 'enabled', value)
							}
							trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
							thumbColor={consent.aiInsights.enabled ? '#ffffff' : '#9ca3af'}
						/>
					</View>

					{consent.aiInsights.enabled && (
						<>
							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Push Notifications</Text>
									<Text style={styles.settingDescription}>
										Receive insights as notifications
									</Text>
								</View>
								<Switch
									value={consent.aiInsights.pushNotifications}
									onValueChange={(value) =>
										updateConsent('aiInsights', 'pushNotifications', value)
									}
									trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
									thumbColor={
										consent.aiInsights.pushNotifications ? '#ffffff' : '#9ca3af'
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
									value={consent.aiInsights.emailAlerts}
									onValueChange={(value) =>
										updateConsent('aiInsights', 'emailAlerts', value)
									}
									trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
									thumbColor={
										consent.aiInsights.emailAlerts ? '#ffffff' : '#9ca3af'
									}
								/>
							</View>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Frequency</Text>
									<Text style={styles.settingDescription}>
										How often to receive AI insights
									</Text>
								</View>
								<View style={styles.pickerContainer}>
									<Picker
										selectedValue={consent.aiInsights.frequency}
										onValueChange={(
											value: 'daily' | 'weekly' | 'monthly' | 'disabled'
										) =>
											setConsent((prev) => ({
												...prev,
												aiInsights: {
													...prev.aiInsights,
													frequency: value,
												},
											}))
										}
										style={styles.picker}
									>
										<Picker.Item label="Daily" value="daily" />
										<Picker.Item label="Weekly" value="weekly" />
										<Picker.Item label="Monthly" value="monthly" />
										<Picker.Item label="Disabled" value="disabled" />
									</Picker>
								</View>
							</View>
						</>
					)}
				</View>

				{/* Reminders */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Reminders & Alerts</Text>
					<Text style={styles.sectionDescription}>
						Helpful reminders to keep you on track
					</Text>

					<View style={styles.settingRow}>
						<View style={styles.settingInfo}>
							<Text style={styles.settingLabel}>Enable Reminders</Text>
							<Text style={styles.settingDescription}>
								Receive helpful financial reminders
							</Text>
						</View>
						<Switch
							value={consent.reminders.enabled}
							onValueChange={(value) =>
								updateConsent('reminders', 'enabled', value)
							}
							trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
							thumbColor={consent.reminders.enabled ? '#ffffff' : '#9ca3af'}
						/>
					</View>

					{consent.reminders.enabled && (
						<>
							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Weekly Summary</Text>
									<Text style={styles.settingDescription}>
										Weekly overview of your finances
									</Text>
								</View>
								<Switch
									value={consent.reminders.weeklySummary}
									onValueChange={(value) =>
										updateConsent('reminders', 'weeklySummary', value)
									}
									trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
									thumbColor={
										consent.reminders.weeklySummary ? '#ffffff' : '#9ca3af'
									}
								/>
							</View>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Monthly Check-in</Text>
									<Text style={styles.settingDescription}>
										Monthly financial health review
									</Text>
								</View>
								<Switch
									value={consent.reminders.monthlyCheck}
									onValueChange={(value) =>
										updateConsent('reminders', 'monthlyCheck', value)
									}
									trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
									thumbColor={
										consent.reminders.monthlyCheck ? '#ffffff' : '#9ca3af'
									}
								/>
							</View>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Overspending Alerts</Text>
									<Text style={styles.settingDescription}>
										Get notified when you exceed budgets
									</Text>
								</View>
								<Switch
									value={consent.reminders.overspendingAlerts}
									onValueChange={(value) =>
										updateConsent('reminders', 'overspendingAlerts', value)
									}
									trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
									thumbColor={
										consent.reminders.overspendingAlerts ? '#ffffff' : '#9ca3af'
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
							<Text style={styles.settingLabel}>Enable Marketing</Text>
							<Text style={styles.settingDescription}>
								Receive marketing and promotional content
							</Text>
						</View>
						<Switch
							value={consent.marketing.enabled}
							onValueChange={(value) =>
								updateConsent('marketing', 'enabled', value)
							}
							trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
							thumbColor={consent.marketing.enabled ? '#ffffff' : '#9ca3af'}
						/>
					</View>

					{consent.marketing.enabled && (
						<>
							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Product Updates</Text>
									<Text style={styles.settingDescription}>
										New features and improvements
									</Text>
								</View>
								<Switch
									value={consent.marketing.productUpdates}
									onValueChange={(value) =>
										updateConsent('marketing', 'productUpdates', value)
									}
									trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
									thumbColor={
										consent.marketing.productUpdates ? '#ffffff' : '#9ca3af'
									}
								/>
							</View>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Special Offers</Text>
									<Text style={styles.settingDescription}>
										Exclusive deals and promotions
									</Text>
								</View>
								<Switch
									value={consent.marketing.specialOffers}
									onValueChange={(value) =>
										updateConsent('marketing', 'specialOffers', value)
									}
									trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
									thumbColor={
										consent.marketing.specialOffers ? '#ffffff' : '#9ca3af'
									}
								/>
							</View>

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Newsletter</Text>
									<Text style={styles.settingDescription}>
										Financial tips and insights
									</Text>
								</View>
								<Switch
									value={consent.marketing.newsletter}
									onValueChange={(value) =>
										updateConsent('marketing', 'newsletter', value)
									}
									trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
									thumbColor={
										consent.marketing.newsletter ? '#ffffff' : '#9ca3af'
									}
								/>
							</View>
						</>
					)}
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
							value={quietHours.enabled}
							onValueChange={(value) =>
								setQuietHours((prev) => ({ ...prev, enabled: value }))
							}
							trackColor={{ false: '#e5e7eb', true: '#007ACC' }}
							thumbColor={quietHours.enabled ? '#ffffff' : '#9ca3af'}
						/>
					</View>

					{quietHours.enabled && (
						<>
							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>Start Time</Text>
									<Text style={styles.settingDescription}>
										When to start suppressing notifications
									</Text>
								</View>
								<View style={styles.pickerContainer}>
									<Picker
										selectedValue={quietHours.start}
										onValueChange={(value: string) =>
											setQuietHours((prev) => ({ ...prev, start: value }))
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

							<View style={styles.settingRow}>
								<View style={styles.settingInfo}>
									<Text style={styles.settingLabel}>End Time</Text>
									<Text style={styles.settingDescription}>
										When to resume notifications
									</Text>
								</View>
								<View style={styles.pickerContainer}>
									<Picker
										selectedValue={quietHours.end}
										onValueChange={(value: string) =>
											setQuietHours((prev) => ({ ...prev, end: value }))
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
					<TouchableOpacity
						style={[styles.button, styles.testButton]}
						onPress={handleTestNotification}
						disabled={saving}
					>
						<Ionicons name="notifications-outline" size={20} color="#007ACC" />
						<Text style={styles.testButtonText}>Send Test Notification</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.button, styles.resetButton]}
						onPress={handleResetToDefaults}
						disabled={saving}
					>
						<Text style={styles.resetButtonText}>Reset to Defaults</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.button, styles.saveButton]}
						onPress={handleSave}
						disabled={saving}
					>
						<Text style={styles.saveButtonText}>
							{saving ? 'Saving...' : 'Save Changes'}
						</Text>
					</TouchableOpacity>
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
		marginTop: 24,
		marginBottom: 32,
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
