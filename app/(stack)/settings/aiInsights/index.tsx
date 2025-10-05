import React, { useState, useEffect } from 'react';
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

// Simplified AI configuration presets
const AI_PRESETS: Record<
	'basic' | 'standard' | 'premium',
	{
		name: string;
		description: string;
		frequency: 'weekly' | 'monthly' | 'daily';
		insightTypes: {
			budgetingTips: boolean;
			expenseReduction: boolean;
			incomeSuggestions: boolean;
		};
		pushNotifications: boolean;
		emailAlerts: boolean;
	}
> = {
	basic: {
		name: 'Basic Insights',
		description: 'Weekly financial summaries and basic tips',
		frequency: 'weekly',
		insightTypes: {
			budgetingTips: true,
			expenseReduction: false,
			incomeSuggestions: false,
		},
		pushNotifications: true,
		emailAlerts: false,
	},
	standard: {
		name: 'Standard Insights',
		description: 'Weekly insights with spending analysis and goal tracking',
		frequency: 'weekly',
		insightTypes: {
			budgetingTips: true,
			expenseReduction: true,
			incomeSuggestions: false,
		},
		pushNotifications: true,
		emailAlerts: false,
	},
	premium: {
		name: 'Premium Insights',
		description: 'Comprehensive financial guidance with daily tips',
		frequency: 'daily',
		insightTypes: {
			budgetingTips: true,
			expenseReduction: true,
			incomeSuggestions: true,
		},
		pushNotifications: true,
		emailAlerts: true,
	},
};

export default function AIInsightsSettings() {
	const router = useRouter();
	const { profile, updatePreferences } = useProfile();
	const [selectedPreset, setSelectedPreset] = useState<
		'basic' | 'standard' | 'premium'
	>('standard');
	const [aiEnabled, setAiEnabled] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (profile?.preferences?.aiInsights) {
			const aiPrefs = profile.preferences.aiInsights;
			setAiEnabled(aiPrefs.enabled);

			// Determine current preset based on settings
			if (
				aiPrefs.frequency === 'daily' &&
				aiPrefs.insightTypes.incomeSuggestions
			) {
				setSelectedPreset('premium');
			} else if (aiPrefs.insightTypes.expenseReduction) {
				setSelectedPreset('standard');
			} else {
				setSelectedPreset('basic');
			}
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

	const handlePresetChange = async (
		preset: 'basic' | 'standard' | 'premium'
	) => {
		safeUpdate(async () => {
			setSelectedPreset(preset);

			const presetConfig = AI_PRESETS[preset];

			try {
				await updatePreferences({
					aiInsights: {
						enabled: aiEnabled,
						frequency: presetConfig.frequency,
						pushNotifications: presetConfig.pushNotifications,
						emailAlerts: presetConfig.emailAlerts,
						insightTypes: presetConfig.insightTypes,
					},
				});

				Alert.alert('Success', `AI insights updated to ${presetConfig.name}`);
			} catch (error) {
				console.error('Error updating AI insights:', error);
				Alert.alert('Error', 'Failed to update AI insights. Please try again.');
			}
		});
	};

	const handleToggleAI = async (value: boolean) => {
		safeUpdate(async () => {
			setAiEnabled(value); // UI flips right away (ProfileContext will emit event)

			try {
				await updatePreferences({
					aiInsights: {
						enabled: value,
						frequency: profile?.preferences?.aiInsights?.frequency || 'weekly',
						pushNotifications:
							profile?.preferences?.aiInsights?.pushNotifications ?? true,
						emailAlerts: profile?.preferences?.aiInsights?.emailAlerts ?? false,
						insightTypes: profile?.preferences?.aiInsights?.insightTypes || {
							budgetingTips: true,
							expenseReduction: true,
							incomeSuggestions: false,
						},
					},
				});
			} catch (error) {
				console.error('Error toggling AI insights:', error);
				// ProfileContext will handle rollback automatically
			}
		});
	};

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView style={styles.scrollView}>
				{/* Main Toggle */}
				<View style={styles.section}>
					<View style={styles.settingRow}>
						<View style={styles.settingInfo}>
							<Text style={styles.settingTitle}>Enable AI Insights</Text>
							<Text style={styles.settingDescription}>
								Get personalized financial guidance and insights
							</Text>
						</View>
						<Switch
							value={aiEnabled}
							onValueChange={handleToggleAI}
							disabled={saving}
							trackColor={{ false: '#e5e7eb', true: '#0095FF' }}
							thumbColor={aiEnabled ? '#fff' : '#f4f3f4'}
						/>
					</View>
				</View>

				{/* Preset Selection */}
				{aiEnabled && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Insight Level</Text>
						<Text style={styles.sectionDescription}>
							Choose how detailed you want your AI insights to be
						</Text>

						{Object.entries(AI_PRESETS).map(([key, preset]) => (
							<TouchableOpacity
								key={key}
								style={[
									styles.presetCard,
									selectedPreset === key && styles.presetCardSelected,
								]}
								onPress={() => handlePresetChange(key as any)}
							>
								<View style={styles.presetHeader}>
									<Text
										style={[
											styles.presetName,
											selectedPreset === key && styles.presetNameSelected,
										]}
									>
										{preset.name}
									</Text>
									{selectedPreset === key && (
										<Ionicons
											name="checkmark-circle"
											size={20}
											color="#0095FF"
										/>
									)}
								</View>
								<Text style={styles.presetDescription}>
									{preset.description}
								</Text>
								<View style={styles.presetFeatures}>
									<Text style={styles.presetFeature}>
										• {preset.frequency === 'daily' ? 'Daily' : 'Weekly'}{' '}
										insights
									</Text>
									<Text style={styles.presetFeature}>
										•{' '}
										{preset.insightTypes.budgetingTips
											? 'Budgeting tips'
											: 'Basic guidance'}
									</Text>
									<Text style={styles.presetFeature}>
										•{' '}
										{preset.insightTypes.expenseReduction
											? 'Spending analysis'
											: 'Simple summaries'}
									</Text>
									{preset.insightTypes.incomeSuggestions && (
										<Text style={styles.presetFeature}>
											• Income optimization suggestions
										</Text>
									)}
								</View>
							</TouchableOpacity>
						))}
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
							AI insights are personalized based on your spending patterns,
							budgets, and goals. You can change these settings anytime.
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
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	backButton: {
		padding: 8,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#333',
	},
	placeholder: {
		width: 40,
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
	settingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
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
	presetCard: {
		backgroundColor: '#f8fafc',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 2,
		borderColor: 'transparent',
	},
	presetCardSelected: {
		borderColor: '#0095FF',
		backgroundColor: '#f0f9ff',
	},
	presetHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	presetName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
	},
	presetNameSelected: {
		color: '#0095FF',
	},
	presetDescription: {
		fontSize: 14,
		color: '#6b7280',
		marginBottom: 12,
		lineHeight: 20,
	},
	presetFeatures: {
		gap: 4,
	},
	presetFeature: {
		fontSize: 13,
		color: '#4b5563',
		lineHeight: 18,
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
