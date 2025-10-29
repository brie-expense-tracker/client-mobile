import React, { useState, useEffect } from 'react';
import { logger } from '../../../../src/utils/logger';
import {
	View,
	Text,
	StyleSheet,
	Switch,
	TouchableOpacity,
	ScrollView,
	SafeAreaView,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useProfile } from '../../../../src/context/profileContext';
import {
	toAssistantConfig,
	AssistantConfig,
	isPersonalizationOn,
	allowProactive,
} from '../../../../src/state/assistantConfig';

const ASSISTANT_MODES = [
	{
		id: 'private' as const,
		name: 'Private',
		description: 'No data used for personalization. Plain chat only.',
		icon: 'lock-closed',
		features: ['Basic chat only', 'No data sharing', 'Maximum privacy'],
	},
	{
		id: 'personalized' as const,
		name: 'Personalized',
		description: 'Use your budgets/goals/transactions when you ask.',
		icon: 'person',
		features: ['Data used on request', 'Personalized responses', 'Clean cost'],
	},
	{
		id: 'proactive' as const,
		name: 'Proactive',
		description: 'Also show helpful cards while you chat.',
		icon: 'bulb',
		features: ['Smart suggestions', 'Contextual insights', 'Proactive cards'],
	},
];

export default function AssistantSettings() {
	const router = useRouter();
	const { profile, updateAssistantSettings } = useProfile();
	const [config, setConfig] = useState<AssistantConfig>(() =>
		toAssistantConfig(profile?.preferences?.assistant)
	);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (profile?.preferences?.assistant) {
			setConfig(toAssistantConfig(profile.preferences.assistant));
		}
	}, [profile]);

	const safeUpdate = async (fn: () => Promise<any>) => {
		if (saving) return; // ignore double taps
		setSaving(true);
		try {
			await fn();
		} finally {
			setSaving(false);
		}
	};

	const handleModeChange = async (
		mode: 'private' | 'personalized' | 'proactive'
	) => {
		safeUpdate(async () => {
			const newConfig = {
				...config,
				mode,
				showProactiveCards:
					mode === 'proactive' ? true : config.showProactiveCards,
			};

			setConfig(newConfig);

			try {
				await updateAssistantSettings({
					mode,
					showProactiveCards:
						mode === 'proactive' ? true : config.showProactiveCards,
				});
			} catch (error) {
				logger.error('Error updating assistant mode:', error);
				Alert.alert(
					'Error',
					'Failed to update assistant mode. Please try again.'
				);
			}
		});
	};

	const handleToggleSetting = async (
		setting: keyof Omit<AssistantConfig, 'mode'>,
		value: boolean
	) => {
		safeUpdate(async () => {
			const newConfig = { ...config, [setting]: value };
			setConfig(newConfig);

			try {
				await updateAssistantSettings({ [setting]: value });
			} catch (error) {
				logger.error(`Error updating ${setting}:`, error);
				Alert.alert('Error', `Failed to update ${setting}. Please try again.`);
			}
		});
	};

	const isPersonalizationEnabled = isPersonalizationOn(config);
	const isProactiveEnabled = allowProactive(config);

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView style={styles.scrollView}>
				{/* Mode Selection */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Assistant Mode</Text>
					<Text style={styles.sectionDescription}>
						Choose how your AI assistant should behave and use your data
					</Text>

					{ASSISTANT_MODES.map((mode) => (
						<TouchableOpacity
							key={mode.id}
							style={[
								styles.modeCard,
								config.mode === mode.id && styles.modeCardSelected,
							]}
							onPress={() => handleModeChange(mode.id)}
							disabled={saving}
						>
							<View style={styles.modeHeader}>
								<View style={styles.modeIconContainer}>
									<Ionicons
										name={mode.icon as any}
										size={24}
										color={config.mode === mode.id ? '#0095FF' : '#6b7280'}
									/>
								</View>
								<View style={styles.modeInfo}>
									<Text
										style={[
											styles.modeName,
											config.mode === mode.id && styles.modeNameSelected,
										]}
									>
										{mode.name}
									</Text>
									<Text style={styles.modeDescription}>{mode.description}</Text>
								</View>
								{config.mode === mode.id && (
									<Ionicons name="checkmark-circle" size={24} color="#0095FF" />
								)}
							</View>
							<View style={styles.modeFeatures}>
								{mode.features.map((feature, index) => (
									<Text key={index} style={styles.modeFeature}>
										• {feature}
									</Text>
								))}
							</View>
						</TouchableOpacity>
					))}
				</View>

				{/* Advanced Settings */}
				{isPersonalizationEnabled && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Advanced Settings</Text>
						<Text style={styles.sectionDescription}>
							Fine-tune how your data is used for personalization
						</Text>

						{/* Use Budgets & Goals */}
						<View style={styles.settingRow}>
							<View style={styles.settingInfo}>
								<Text style={styles.settingTitle}>Use Budgets & Goals</Text>
								<Text style={styles.settingDescription}>
									Include your budget and goal data in AI responses
								</Text>
							</View>
							<Switch
								value={config.useBudgetsGoals}
								onValueChange={(value) =>
									handleToggleSetting('useBudgetsGoals', value)
								}
								disabled={saving}
								trackColor={{ false: '#e5e7eb', true: '#0095FF' }}
								thumbColor={config.useBudgetsGoals ? '#fff' : '#f4f3f4'}
							/>
						</View>

						{/* Use Transactions */}
						<View style={styles.settingRow}>
							<View style={styles.settingInfo}>
								<Text style={styles.settingTitle}>Use Recent Transactions</Text>
								<Text style={styles.settingDescription}>
									Include your spending history for better insights
								</Text>
							</View>
							<Switch
								value={config.useTransactions}
								onValueChange={(value) =>
									handleToggleSetting('useTransactions', value)
								}
								disabled={saving}
								trackColor={{ false: '#e5e7eb', true: '#0095FF' }}
								thumbColor={config.useTransactions ? '#fff' : '#f4f3f4'}
							/>
						</View>

						{/* Show Proactive Cards */}
						<View style={styles.settingRow}>
							<View style={styles.settingInfo}>
								<Text style={styles.settingTitle}>Show Proactive Cards</Text>
								<Text style={styles.settingDescription}>
									Display helpful suggestions and insights while chatting
								</Text>
							</View>
							<Switch
								value={config.showProactiveCards}
								onValueChange={(value) =>
									handleToggleSetting('showProactiveCards', value)
								}
								disabled={saving || config.mode === 'private'}
								trackColor={{ false: '#e5e7eb', true: '#0095FF' }}
								thumbColor={config.showProactiveCards ? '#fff' : '#f4f3f4'}
							/>
						</View>

						{/* Cost Saver */}
						<View style={styles.settingRow}>
							<View style={styles.settingInfo}>
								<Text style={styles.settingTitle}>Cost Saver</Text>
								<Text style={styles.settingDescription}>
									Use faster, more economical AI responses
								</Text>
							</View>
							<Switch
								value={config.costSaver}
								onValueChange={(value) =>
									handleToggleSetting('costSaver', value)
								}
								disabled={saving}
								trackColor={{ false: '#e5e7eb', true: '#0095FF' }}
								thumbColor={config.costSaver ? '#fff' : '#f4f3f4'}
							/>
						</View>

						{/* Privacy Hard-Stop */}
						<View style={styles.settingRow}>
							<View style={styles.settingInfo}>
								<Text style={styles.settingTitle}>Privacy Hard-Stop</Text>
								<Text style={styles.settingDescription}>
									Never include raw numbers in AI prompts, only summaries
								</Text>
							</View>
							<Switch
								value={config.privacyHardStop}
								onValueChange={(value) =>
									handleToggleSetting('privacyHardStop', value)
								}
								disabled={saving}
								trackColor={{ false: '#e5e7eb', true: '#0095FF' }}
								thumbColor={config.privacyHardStop ? '#fff' : '#f4f3f4'}
							/>
						</View>
					</View>
				)}

				{/* Premium Upgrade */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Unlock Premium Features</Text>
					<Text style={styles.sectionDescription}>
						Get unlimited AI conversations, advanced insights, and personalized
						recommendations
					</Text>
					<TouchableOpacity
						style={styles.upgradeButton}
						onPress={() => router.push('/(stack)/settings/upgrade')}
					>
						<View style={styles.upgradeButtonContent}>
							<Ionicons name="sparkles" size={20} color="#8B5CF6" />
							<Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
							<Ionicons name="chevron-forward" size={20} color="#8B5CF6" />
						</View>
					</TouchableOpacity>
				</View>

				{/* Information */}
				<View style={styles.infoSection}>
					<View style={styles.infoCard}>
						<Ionicons
							name="information-circle-outline"
							size={24}
							color="#0095FF"
						/>
						<Text style={styles.infoText}>
							Your data is encrypted and only used to personalize your
							experience. You can change these settings anytime or switch to
							Private mode for maximum privacy.
						</Text>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	scrollView: {
		flex: 1,
	},
	section: {
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#f3f4f6',
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	sectionDescription: {
		fontSize: 14,
		color: '#6b7280',
		marginBottom: 20,
		lineHeight: 20,
	},
	modeCard: {
		backgroundColor: '#f8fafc',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 2,
		borderColor: 'transparent',
	},
	modeCardSelected: {
		borderColor: '#0095FF',
		backgroundColor: '#f0f9ff',
	},
	modeHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	modeIconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#f3f4f6',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	modeInfo: {
		flex: 1,
	},
	modeName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 4,
	},
	modeNameSelected: {
		color: '#0095FF',
	},
	modeDescription: {
		fontSize: 14,
		color: '#6b7280',
		lineHeight: 20,
	},
	modeFeatures: {
		gap: 4,
	},
	modeFeature: {
		fontSize: 13,
		color: '#4b5563',
		lineHeight: 18,
	},
	settingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f3f4f6',
	},
	settingInfo: {
		flex: 1,
		marginRight: 16,
	},
	settingTitle: {
		fontSize: 16,
		fontWeight: '500',
		color: '#333',
		marginBottom: 4,
	},
	settingDescription: {
		fontSize: 14,
		color: '#6b7280',
		lineHeight: 20,
	},
	infoSection: {
		padding: 20,
	},
	infoCard: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: '#f0f9ff',
		borderRadius: 12,
		padding: 16,
		gap: 12,
	},
	infoText: {
		flex: 1,
		fontSize: 14,
		color: '#0369a1',
		lineHeight: 20,
	},
	upgradeButton: {
		backgroundColor: '#F8F7FF',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E0D7FF',
		overflow: 'hidden',
	},
	upgradeButtonContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 16,
	},
	upgradeButtonText: {
		flex: 1,
		fontSize: 16,
		fontWeight: '600',
		color: '#8B5CF6',
		textAlign: 'center',
		marginHorizontal: 12,
	},
});
