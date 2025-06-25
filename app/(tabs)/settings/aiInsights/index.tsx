import React, { useState } from 'react';
import {
	SafeAreaView,
	ScrollView,
	View,
	Text,
	Switch,
	StyleSheet,
	TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';

export default function AIInsightsSettingsScreen() {
	const [aiEnabled, setAiEnabled] = useState(true);
	const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>(
		'weekly'
	);
	const [pushEnabled, setPushEnabled] = useState(true);
	const [emailEnabled, setEmailEnabled] = useState(false);
	const [budgetingTips, setBudgetingTips] = useState(true);
	const [incomeIdeas, setIncomeIdeas] = useState(true);
	const [expenseReduction, setExpenseReduction] = useState(true);

	return (
		<SafeAreaView style={styles.safe}>
			<Stack.Screen options={{ title: 'AI Insights Settings' }} />
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
						onValueChange={setAiEnabled}
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
								onPress={() => setFrequency('daily')}
							/>
							<OptionRow
								label="Weekly"
								selected={frequency === 'weekly'}
								onPress={() => setFrequency('weekly')}
							/>
							<OptionRow
								label="Monthly"
								selected={frequency === 'monthly'}
								onPress={() => setFrequency('monthly')}
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
								onValueChange={setBudgetingTips}
							/>
							<Row
								label="Expense Reduction Ideas"
								value={expenseReduction}
								onValueChange={setExpenseReduction}
							/>
							<Row
								label="Income Suggestions"
								value={incomeIdeas}
								onValueChange={setIncomeIdeas}
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
								onValueChange={setPushEnabled}
							/>
							<Row
								label="Email Alerts"
								value={emailEnabled}
								onValueChange={setEmailEnabled}
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
