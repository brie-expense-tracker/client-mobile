/* budgetSettings.tsx — keeps it lightweight & self-contained */
import React, { useState, useEffect } from 'react';
import {
	SafeAreaView,
	ScrollView,
	View,
	Text,
	Switch,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useProfile } from '../../../../src/context/profileContext';

export default function BudgetSettingsScreen() {
	const { profile, loading, updateBudgetSettings } = useProfile();

	/* Local state for form inputs */
	const [cycleType, setCycleType] = useState<'monthly' | 'weekly' | 'biweekly'>(
		'monthly'
	);
	const [cycleStart, setCycleStart] = useState('1');
	const [alertPct, setAlertPct] = useState('80');
	const [carryOver, setCarryOver] = useState(false);
	const [autoSync, setAutoSync] = useState(true);
	const [saving, setSaving] = useState(false);

	// Load settings from profile when available
	useEffect(() => {
		if (profile?.preferences?.budgetSettings) {
			const settings = profile.preferences.budgetSettings;
			setCycleType(settings.cycleType);
			setCycleStart(settings.cycleStart.toString());
			setAlertPct(settings.alertPct.toString());
			setCarryOver(settings.carryOver);
			setAutoSync(settings.autoSync);
		}
	}, [profile]);

	const handleSave = async () => {
		try {
			setSaving(true);

			// Validate inputs
			const cycleStartNum = parseInt(cycleStart);
			const alertPctNum = parseInt(alertPct);

			if (
				cycleType === 'monthly' &&
				(cycleStartNum < 1 || cycleStartNum > 28)
			) {
				Alert.alert(
					'Invalid Input',
					'Monthly cycle start must be between 1 and 28'
				);
				return;
			}

			if (cycleType !== 'monthly' && (cycleStartNum < 0 || cycleStartNum > 6)) {
				Alert.alert(
					'Invalid Input',
					'Weekly cycle start must be between 0 (Sunday) and 6 (Saturday)'
				);
				return;
			}

			if (alertPctNum < 1 || alertPctNum > 100) {
				Alert.alert(
					'Invalid Input',
					'Alert percentage must be between 1 and 100'
				);
				return;
			}

			await updateBudgetSettings({
				cycleType,
				cycleStart: cycleStartNum,
				alertPct: alertPctNum,
				carryOver,
				autoSync,
			});

			Alert.alert('Success', 'Budget settings saved successfully');
		} catch (error) {
			console.error('Error saving budget settings:', error);
			Alert.alert('Error', 'Failed to save budget settings');
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.safe}>
				<Stack.Screen options={{ title: 'Budget Settings' }} />
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#007AFF" />
					<Text style={styles.loadingText}>Loading settings...</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safe}>
			<Stack.Screen options={{ title: 'Budget Settings' }} />

			<ScrollView contentContainerStyle={styles.container}>
				{/* —— Cycle —— */}
				<Section title="Budget Cycle">
					<SectionSubtext>
						Configure how your budget periods are calculated and when they reset
					</SectionSubtext>
					<Label>Cycle Type</Label>
					<LabelSubtext>
						Choose how often your budget resets - monthly, weekly, or every two
						weeks
					</LabelSubtext>
					<OptionRow
						label="Monthly"
						selected={cycleType === 'monthly'}
						onPress={() => setCycleType('monthly')}
					/>
					<OptionRow
						label="Weekly"
						selected={cycleType === 'weekly'}
						onPress={() => setCycleType('weekly')}
					/>
					<OptionRow
						label="Bi-Weekly"
						selected={cycleType === 'biweekly'}
						onPress={() => setCycleType('biweekly')}
					/>

					<Label>
						{cycleType === 'monthly'
							? 'Start Day (1-28)'
							: 'Start Weekday (0=Sunday)'}
					</Label>
					<LabelSubtext>
						{cycleType === 'monthly'
							? 'Which day of the month your budget cycle starts'
							: 'Which day of the week your budget cycle starts (0=Sunday, 1=Monday, etc.)'}
					</LabelSubtext>
					<TextInput
						style={styles.input}
						keyboardType="numeric"
						value={cycleStart}
						onChangeText={setCycleStart}
					/>
				</Section>

				{/* —— Alerts —— */}
				<Section title="Notifications">
					<SectionSubtext>
						Set up alerts to help you stay on track with your budget
					</SectionSubtext>
					<Label>Overspend Alert Percentage</Label>
					<LabelSubtext>
						Get notified when you've spent this percentage of your budget
					</LabelSubtext>
					<TextInput
						style={styles.input}
						keyboardType="numeric"
						value={alertPct}
						onChangeText={setAlertPct}
					/>
				</Section>

				{/* —— Toggles —— */}
				<Section title="Preferences">
					<SectionSubtext>
						Customize how your budget behaves and updates
					</SectionSubtext>
					<Row
						label="Carry over unused budgets"
						value={carryOver}
						onValueChange={setCarryOver}
					/>
					<Row
						label="Auto-sync spent from transactions"
						value={autoSync}
						onValueChange={setAutoSync}
					/>
				</Section>

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

/* ——— Helper components ——— */
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

const Label = ({ children }: { children: React.ReactNode }) => (
	<Text style={styles.label}>{children}</Text>
);

const LabelSubtext = ({ children }: { children: React.ReactNode }) => (
	<Text style={styles.labelSubtext}>{children}</Text>
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
	label: { fontSize: 14, color: '#666', marginTop: 12, marginBottom: 4 },
	labelSubtext: { fontSize: 12, color: '#666', marginBottom: 4 },
	input: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		padding: 10,
		fontSize: 16,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: { fontSize: 16, color: '#666', marginTop: 12 },
	saveButton: {
		backgroundColor: '#007AFF',
		padding: 12,
		borderRadius: 8,
		alignItems: 'center',
	},
	saveButtonDisabled: { backgroundColor: '#ccc' },
	saveButtonText: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
});
