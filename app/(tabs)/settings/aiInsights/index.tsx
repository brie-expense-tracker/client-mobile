import React, { useState, useMemo, useCallback } from 'react';
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

import { useProfile } from '../../../../src/context/profileContext';

const AIInsightsSettingsScreen = () => {
	const { profile, updateAIInsightsSettings, loading } = useProfile();

	// Loading states for individual switches
	const [updatingAI, setUpdatingAI] = useState(false);
	const [updatingFrequency, setUpdatingFrequency] = useState(false);
	const [updatingPush, setUpdatingPush] = useState(false);
	const [updatingEmail, setUpdatingEmail] = useState(false);
	const [updatingBudgetingTips, setUpdatingBudgetingTips] = useState(false);
	const [updatingExpenseReduction, setUpdatingExpenseReduction] =
		useState(false);
	const [updatingIncomeIdeas, setUpdatingIncomeIdeas] = useState(false);
	const [updatingDefaultView, setUpdatingDefaultView] = useState(false);
	const [updatingMaxInsights, setUpdatingMaxInsights] = useState(false);
	const [updatingPriorityFilter, setUpdatingPriorityFilter] = useState(false);

	// Memoize current values from profile with defaults to prevent unnecessary recalculations
	const currentSettings = useMemo(() => {
		const aiInsights = profile?.preferences?.aiInsights;
		return {
			aiEnabled: aiInsights?.enabled ?? true,
			frequency: aiInsights?.frequency ?? 'weekly',
			pushEnabled: aiInsights?.pushNotifications ?? true,
			emailEnabled: aiInsights?.emailAlerts ?? false,
			budgetingTips: aiInsights?.insightTypes?.budgetingTips ?? true,
			incomeIdeas: aiInsights?.insightTypes?.incomeSuggestions ?? true,
			expenseReduction: aiInsights?.insightTypes?.expenseReduction ?? true,
			defaultView: aiInsights?.defaultView ?? 'aiCoach',
			maxInsights: aiInsights?.maxInsights ?? 3,
			showHighPriorityOnly: aiInsights?.showHighPriorityOnly ?? false,
		};
	}, [profile?.preferences?.aiInsights]);

	// Destructure memoized values
	const {
		aiEnabled,
		frequency,
		pushEnabled,
		emailEnabled,
		budgetingTips,
		incomeIdeas,
		expenseReduction,
		defaultView,
		maxInsights,
		showHighPriorityOnly,
	} = currentSettings;

	// Memoize the current insight types object to prevent unnecessary object creation
	const currentInsightTypes = useMemo(() => {
		return (
			profile?.preferences?.aiInsights?.insightTypes || {
				budgetingTips: true,
				expenseReduction: true,
				incomeSuggestions: true,
			}
		);
	}, [profile?.preferences?.aiInsights?.insightTypes]);

	// Handle AI enabled toggle
	const handleAIEnabledChange = useCallback(
		async (value: boolean) => {
			console.log('AI Insights Settings: Toggling AI enabled to:', value);
			if (updatingAI) return; // Prevent multiple simultaneous updates

			setUpdatingAI(true);

			try {
				await updateAIInsightsSettings({ enabled: value });
				console.log(
					'AI Insights Settings: Successfully updated AI enabled to:',
					value
				);
			} catch (error) {
				console.error(
					'AI Insights Settings: Error updating AI enabled:',
					error
				);
				Alert.alert('Error', 'Failed to update AI insights settings');
			} finally {
				setUpdatingAI(false);
			}
		},
		[updatingAI, updateAIInsightsSettings]
	);

	// Handle frequency change
	const handleFrequencyChange = useCallback(
		async (newFrequency: 'daily' | 'weekly' | 'monthly') => {
			if (updatingFrequency) return;

			setUpdatingFrequency(true);

			try {
				await updateAIInsightsSettings({ frequency: newFrequency });
			} catch (error) {
				console.error('AI Insights Settings: Error updating frequency:', error);
				Alert.alert('Error', 'Failed to update frequency setting');
			} finally {
				setUpdatingFrequency(false);
			}
		},
		[updatingFrequency, updateAIInsightsSettings]
	);

	// Handle push notifications toggle
	const handlePushNotificationsChange = useCallback(
		async (value: boolean) => {
			if (updatingPush) return;

			setUpdatingPush(true);

			try {
				await updateAIInsightsSettings({ pushNotifications: value });
			} catch (error) {
				console.error(
					'AI Insights Settings: Error updating push notifications:',
					error
				);
				Alert.alert('Error', 'Failed to update push notification settings');
			} finally {
				setUpdatingPush(false);
			}
		},
		[updatingPush, updateAIInsightsSettings]
	);

	// Handle email alerts toggle
	const handleEmailAlertsChange = useCallback(
		async (value: boolean) => {
			if (updatingEmail) return;

			setUpdatingEmail(true);

			try {
				await updateAIInsightsSettings({ emailAlerts: value });
			} catch (error) {
				console.error(
					'AI Insights Settings: Error updating email alerts:',
					error
				);
				Alert.alert('Error', 'Failed to update email alert settings');
			} finally {
				setUpdatingEmail(false);
			}
		},
		[updatingEmail, updateAIInsightsSettings]
	);

	// Handle insight types toggles
	const handleBudgetingTipsChange = useCallback(
		async (value: boolean) => {
			if (updatingBudgetingTips) return;

			setUpdatingBudgetingTips(true);

			try {
				await updateAIInsightsSettings({
					insightTypes: {
						...currentInsightTypes,
						budgetingTips: value,
					},
				});
			} catch (error) {
				console.error(
					'AI Insights Settings: Error updating budgeting tips:',
					error
				);
				Alert.alert('Error', 'Failed to update budgeting tips setting');
			} finally {
				setUpdatingBudgetingTips(false);
			}
		},
		[updatingBudgetingTips, updateAIInsightsSettings, currentInsightTypes]
	);

	const handleExpenseReductionChange = useCallback(
		async (value: boolean) => {
			if (updatingExpenseReduction) return;

			setUpdatingExpenseReduction(true);

			try {
				await updateAIInsightsSettings({
					insightTypes: {
						...currentInsightTypes,
						expenseReduction: value,
					},
				});
			} catch (error) {
				console.error(
					'AI Insights Settings: Error updating expense reduction:',
					error
				);
				Alert.alert('Error', 'Failed to update expense reduction setting');
			} finally {
				setUpdatingExpenseReduction(false);
			}
		},
		[updatingExpenseReduction, updateAIInsightsSettings, currentInsightTypes]
	);

	const handleIncomeIdeasChange = useCallback(
		async (value: boolean) => {
			if (updatingIncomeIdeas) return;

			setUpdatingIncomeIdeas(true);

			try {
				await updateAIInsightsSettings({
					insightTypes: {
						...currentInsightTypes,
						incomeSuggestions: value,
					},
				});
			} catch (error) {
				console.error(
					'AI Insights Settings: Error updating income suggestions:',
					error
				);
				Alert.alert('Error', 'Failed to update income suggestions setting');
			} finally {
				setUpdatingIncomeIdeas(false);
			}
		},
		[updatingIncomeIdeas, updateAIInsightsSettings, currentInsightTypes]
	);

	// Handle default view change
	const handleDefaultViewChange = useCallback(
		async (newView: 'aiCoach' | 'traditional') => {
			if (updatingDefaultView) return;

			setUpdatingDefaultView(true);

			try {
				await updateAIInsightsSettings({ defaultView: newView });
			} catch (error) {
				console.error(
					'AI Insights Settings: Error updating default view:',
					error
				);
				Alert.alert('Error', 'Failed to update default view setting');
			} finally {
				setUpdatingDefaultView(false);
			}
		},
		[updatingDefaultView, updateAIInsightsSettings]
	);

	// Handle max insights change
	const handleMaxInsightsChange = useCallback(
		async (newMax: 3 | 5 | 10) => {
			if (updatingMaxInsights) return;

			setUpdatingMaxInsights(true);

			try {
				await updateAIInsightsSettings({ maxInsights: newMax });
			} catch (error) {
				console.error(
					'AI Insights Settings: Error updating max insights:',
					error
				);
				Alert.alert('Error', 'Failed to update max insights setting');
			} finally {
				setUpdatingMaxInsights(false);
			}
		},
		[updatingMaxInsights, updateAIInsightsSettings]
	);

	// Handle priority filter change
	const handlePriorityFilterChange = useCallback(
		async (value: boolean) => {
			if (updatingPriorityFilter) return;

			setUpdatingPriorityFilter(true);

			try {
				await updateAIInsightsSettings({ showHighPriorityOnly: value });
			} catch (error) {
				console.error(
					'AI Insights Settings: Error updating priority filter:',
					error
				);
				Alert.alert('Error', 'Failed to update priority filter setting');
			} finally {
				setUpdatingPriorityFilter(false);
			}
		},
		[updatingPriorityFilter, updateAIInsightsSettings]
	);

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
						loading={updatingAI}
					/>
				</Section>

				{aiEnabled && (
					<>
						{/* Frequency Settings */}
						<Section title="Suggestion Frequency">
							<SectionSubtext>
								{
									"How often you'd like to receive AI-powered suggestions and insights "
								}
							</SectionSubtext>
							<OptionRow
								label="Daily"
								selected={frequency === 'daily'}
								onPress={() => handleFrequencyChange('daily')}
								loading={updatingFrequency}
							/>
							<OptionRow
								label="Weekly"
								selected={frequency === 'weekly'}
								onPress={() => handleFrequencyChange('weekly')}
								loading={updatingFrequency}
							/>
							<OptionRow
								label="Monthly"
								selected={frequency === 'monthly'}
								onPress={() => handleFrequencyChange('monthly')}
								loading={updatingFrequency}
							/>
						</Section>

						{/* Display Settings */}
						<Section title="Display Preferences">
							<SectionSubtext>
								Customize how insights are displayed in the app
							</SectionSubtext>
							<OptionRow
								label="AI Coach View (Recommended)"
								selected={defaultView === 'aiCoach'}
								onPress={() => handleDefaultViewChange('aiCoach')}
								loading={updatingDefaultView}
							/>
							<OptionRow
								label="Traditional List View"
								selected={defaultView === 'traditional'}
								onPress={() => handleDefaultViewChange('traditional')}
								loading={updatingDefaultView}
							/>
							<OptionRow
								label="Show 3 Insights"
								selected={maxInsights === 3}
								onPress={() => handleMaxInsightsChange(3)}
								loading={updatingMaxInsights}
							/>
							<OptionRow
								label="Show 5 Insights"
								selected={maxInsights === 5}
								onPress={() => handleMaxInsightsChange(5)}
								loading={updatingMaxInsights}
							/>
							<OptionRow
								label="Show 10 Insights"
								selected={maxInsights === 10}
								onPress={() => handleMaxInsightsChange(10)}
								loading={updatingMaxInsights}
							/>
							<Row
								label="Show High Priority Only"
								value={showHighPriorityOnly}
								onValueChange={handlePriorityFilterChange}
								loading={updatingPriorityFilter}
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
								loading={updatingBudgetingTips}
							/>
							<Row
								label="Expense Reduction Ideas"
								value={expenseReduction}
								onValueChange={handleExpenseReductionChange}
								loading={updatingExpenseReduction}
							/>
							<Row
								label="Income Suggestions"
								value={incomeIdeas}
								onValueChange={handleIncomeIdeasChange}
								loading={updatingIncomeIdeas}
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
								loading={updatingPush}
							/>
							<Row
								label="Email Alerts"
								value={emailEnabled}
								onValueChange={handleEmailAlertsChange}
								loading={updatingEmail}
							/>
						</Section>
					</>
				)}
			</ScrollView>
		</SafeAreaView>
	);
};

const Section = React.memo(
	({ title, children }: { title: string; children: React.ReactNode }) => (
		<View style={{ marginBottom: 32 }}>
			<Text style={styles.sectionHeader}>{title}</Text>
			{children}
		</View>
	)
);
Section.displayName = 'Section';

const SectionSubtext = React.memo(
	({ children }: { children: React.ReactNode }) => (
		<Text style={styles.sectionSubtext}>{children}</Text>
	)
);
SectionSubtext.displayName = 'SectionSubtext';

const Row = React.memo(
	({
		label,
		value,
		onValueChange,
		loading = false,
	}: {
		label: string;
		value: boolean;
		onValueChange: (v: boolean) => void;
		loading?: boolean;
	}) => (
		<View style={styles.row}>
			<Text style={styles.rowLabel}>{label}</Text>
			{loading ? (
				<ActivityIndicator size="small" color="#007AFF" />
			) : (
				<Switch value={value} onValueChange={onValueChange} />
			)}
		</View>
	)
);
Row.displayName = 'Row';

const OptionRow = React.memo(
	({
		label,
		selected,
		onPress,
		loading = false,
	}: {
		label: string;
		selected: boolean;
		onPress: () => void;
		loading?: boolean;
	}) => (
		<TouchableOpacity
			style={[styles.optionRow, loading && styles.optionRowDisabled]}
			onPress={onPress}
			disabled={loading}
		>
			<Text style={styles.optionLabel}>{label}</Text>
			{loading ? (
				<ActivityIndicator size="small" color="#007AFF" />
			) : (
				<Text style={[styles.checkmark, selected && styles.checkmarkSelected]}>
					{selected ? '✓' : ''}
				</Text>
			)}
		</TouchableOpacity>
	)
);
OptionRow.displayName = 'OptionRow';

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
	optionRowDisabled: {
		opacity: 0.6,
	},
	optionLabel: { fontSize: 16, color: '#333' },
	checkmark: { fontSize: 18, color: '#ccc', fontWeight: 'bold' },
	checkmarkSelected: { color: '#007AFF' },
});

// Memoize the component to prevent unnecessary re-renders
export default React.memo(AIInsightsSettingsScreen);
