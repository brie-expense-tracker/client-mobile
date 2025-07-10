import React, { useState, useEffect } from 'react';
import {
	SafeAreaView,
	ScrollView,
	View,
	Text,
	Switch,
	StyleSheet,
	TouchableOpacity,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useProfile } from '../../../../src/context/profileContext';

export default function AIInsightsSettingsScreen() {
	const { profile, updateAIInsightsSettings, loading } = useProfile();

	// Initialize state from profile
	const [aiEnabled, setAiEnabled] = useState(true);
	const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>(
		'weekly'
	);
	const [pushEnabled, setPushEnabled] = useState(true);
	const [emailEnabled, setEmailEnabled] = useState(false);
	const [budgetingTips, setBudgetingTips] = useState(true);
	const [incomeIdeas, setIncomeIdeas] = useState(true);
	const [expenseReduction, setExpenseReduction] = useState(true);
	// Update local state when profile loads
	useEffect(() => {
		if (profile?.preferences?.aiInsights) {
			const aiSettings = profile.preferences.aiInsights;
			setAiEnabled(aiSettings.enabled);
			setFrequency(aiSettings.frequency);
			setPushEnabled(aiSettings.pushNotifications);
			setEmailEnabled(aiSettings.emailAlerts);
			setBudgetingTips(aiSettings.insightTypes.budgetingTips);
			setIncomeIdeas(aiSettings.insightTypes.incomeSuggestions);
			setExpenseReduction(aiSettings.insightTypes.expenseReduction);
		}
	}, [profile?.preferences?.aiInsights]);

	// Handle AI enabled toggle
	const handleAIEnabledChange = async (value: boolean) => {
		try {
			setAiEnabled(value);
			await updateAIInsightsSettings({ enabled: value });
		} catch (error) {
			Alert.alert('Error', 'Failed to update AI insights settings');
			setAiEnabled(!value); // Revert on error
		}
	};

	// Handle frequency change
	const handleFrequencyChange = async (
		newFrequency: 'daily' | 'weekly' | 'monthly'
	) => {
		try {
			setFrequency(newFrequency);
			await updateAIInsightsSettings({ frequency: newFrequency });
		} catch (error) {
			Alert.alert('Error', 'Failed to update frequency setting');
			setFrequency(frequency); // Revert on error
		}
	};

	// Handle push notifications toggle
	const handlePushNotificationsChange = async (value: boolean) => {
		try {
			setPushEnabled(value);
			await updateAIInsightsSettings({ pushNotifications: value });
		} catch (error) {
			Alert.alert('Error', 'Failed to update push notification settings');
			setPushEnabled(!value); // Revert on error
		}
	};

	// Handle email alerts toggle
	const handleEmailAlertsChange = async (value: boolean) => {
		try {
			setEmailEnabled(value);
			await updateAIInsightsSettings({ emailAlerts: value });
		} catch (error) {
			Alert.alert('Error', 'Failed to update email alert settings');
			setEmailEnabled(!value); // Revert on error
		}
	};

	// Handle insight types toggles
	const handleBudgetingTipsChange = async (value: boolean) => {
		try {
			setBudgetingTips(value);
			const currentInsightTypes = profile?.preferences?.aiInsights
				?.insightTypes || {
				budgetingTips: true,
				expenseReduction: true,
				incomeSuggestions: true,
			};
			await updateAIInsightsSettings({
				insightTypes: {
					...currentInsightTypes,
					budgetingTips: value,
				},
			});
		} catch (error) {
			Alert.alert('Error', 'Failed to update budgeting tips setting');
			setBudgetingTips(!value); // Revert on error
		}
	};

	const handleExpenseReductionChange = async (value: boolean) => {
		try {
			setExpenseReduction(value);
			const currentInsightTypes = profile?.preferences?.aiInsights
				?.insightTypes || {
				budgetingTips: true,
				expenseReduction: true,
				incomeSuggestions: true,
			};
			await updateAIInsightsSettings({
				insightTypes: {
					...currentInsightTypes,
					expenseReduction: value,
				},
			});
		} catch (error) {
			Alert.alert('Error', 'Failed to update expense reduction setting');
			setExpenseReduction(!value); // Revert on error
		}
	};

	const handleIncomeIdeasChange = async (value: boolean) => {
		try {
			setIncomeIdeas(value);
			const currentInsightTypes = profile?.preferences?.aiInsights
				?.insightTypes || {
				budgetingTips: true,
				expenseReduction: true,
				incomeSuggestions: true,
			};
			await updateAIInsightsSettings({
				insightTypes: {
					...currentInsightTypes,
					incomeSuggestions: value,
				},
			});
		} catch (error) {
			Alert.alert('Error', 'Failed to update income suggestions setting');
			setIncomeIdeas(!value); // Revert on error
		}
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.safe}>
				<View style={styles.loadingContainer}>
					<Text style={styles.loadingText}>
						Loading AI insights settings...
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safe}>
			<ScrollView contentContainerStyle={styles.container}>
				{/* Main AI Toggle */}
				<Section title="AI Insights">
					<SectionSubtext>
						Enable AI-powered insights to help you make better financial
						decisions
					</SectionSubtext>
					<Row
						label="Enable AI Insights"
						value={aiEnabled}
						onValueChange={handleAIEnabledChange}
					/>
				</Section>

				{aiEnabled && (
					<>
						{/* Frequency Settings */}
						<Section title="Suggestion Frequency">
							<SectionSubtext>
								How often you'd like to receive AI-powered suggestions and
								insights
							</SectionSubtext>
							<OptionRow
								label="Daily"
								selected={frequency === 'daily'}
								onPress={() => handleFrequencyChange('daily')}
							/>
							<OptionRow
								label="Weekly"
								selected={frequency === 'weekly'}
								onPress={() => handleFrequencyChange('weekly')}
							/>
							<OptionRow
								label="Monthly"
								selected={frequency === 'monthly'}
								onPress={() => handleFrequencyChange('monthly')}
							/>
						</Section>

						{/* Insight Types */}
						<Section title="Insight Types">
							<SectionSubtext>
								Choose which types of AI insights you want to receive
							</SectionSubtext>
							<Row
								label="Budgeting Tips"
								value={budgetingTips}
								onValueChange={handleBudgetingTipsChange}
							/>
							<Row
								label="Expense Reduction Ideas"
								value={expenseReduction}
								onValueChange={handleExpenseReductionChange}
							/>
							<Row
								label="Income Suggestions"
								value={incomeIdeas}
								onValueChange={handleIncomeIdeasChange}
							/>
						</Section>

						{/* Notification Methods */}
						<Section title="Notification Methods">
							<SectionSubtext>
								Choose how you want to be notified about new AI insights
							</SectionSubtext>
							<Row
								label="Push Notifications"
								value={pushEnabled}
								onValueChange={handlePushNotificationsChange}
							/>
							<Row
								label="Email Alerts"
								value={emailEnabled}
								onValueChange={handleEmailAlertsChange}
							/>
						</Section>
					</>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

const Section = ({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) => (
	<View style={{ marginBottom: 32 }}>
		<Text style={styles.sectionHeader}>{title}</Text>
		{children}
	</View>
);

const SectionSubtext = ({ children }: { children: React.ReactNode }) => (
	<Text style={styles.sectionSubtext}>{children}</Text>
);

const Row = ({
	label,
	value,
	onValueChange,
}: {
	label: string;
	value: boolean;
	onValueChange: (v: boolean) => void;
}) => (
	<View style={styles.row}>
		<Text style={styles.rowLabel}>{label}</Text>
		<Switch value={value} onValueChange={onValueChange} />
	</View>
);

const OptionRow = ({
	label,
	selected,
	onPress,
}: {
	label: string;
	selected: boolean;
	onPress: () => void;
}) => (
	<TouchableOpacity style={styles.optionRow} onPress={onPress}>
		<Text style={styles.optionLabel}>{label}</Text>
		<Text style={[styles.checkmark, selected && styles.checkmarkSelected]}>
			{selected ? '✓' : ''}
		</Text>
	</TouchableOpacity>
);

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: '#fff' },
	container: { padding: 24, paddingBottom: 48 },
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: { fontSize: 16, color: '#666' },
	sectionHeader: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
	sectionSubtext: { fontSize: 12, color: '#666', marginBottom: 12 },
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#efefef',
	},
	rowLabel: { fontSize: 16, color: '#333', flexShrink: 1 },
	optionRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 4,
		borderBottomWidth: 1,
		borderBottomColor: '#efefef',
	},
	optionLabel: { fontSize: 16, color: '#333' },
	checkmark: { fontSize: 18, color: '#ccc', fontWeight: 'bold' },
	checkmarkSelected: { color: '#007AFF' },
});
