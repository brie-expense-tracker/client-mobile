import React, { useState, useEffect } from 'react';
import {
	SafeAreaView,
	ScrollView,
	View,
	Text,
	Switch,
	TextInput,
	StyleSheet,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useProfile } from '../../../../src/context/profileContext';

export default function GoalSettingsScreen() {
	const { profile, loading, updateGoalSettings } = useProfile();

	// Local state for form inputs
	const [defaultTarget, setDefaultTarget] = useState('1000');
	const [defaultDueDays, setDefaultDueDays] = useState('90');
	const [defaultSort, setDefaultSort] = useState<'percent' | 'name' | 'date'>(
		'percent'
	);
	const [defaultCurrency, setDefaultCurrency] = useState('USD');

	// AI
	const [aiEnabled, setAiEnabled] = useState(true);
	const [aiTone, setAiTone] = useState<'friendly' | 'technical' | 'minimal'>(
		'friendly'
	);
	const [aiFrequency, setAiFrequency] = useState<'low' | 'medium' | 'high'>(
		'medium'
	);
	const [aiWhatIf, setAiWhatIf] = useState(true);

	// Notifications
	const [milestoneAlerts, setMilestoneAlerts] = useState(true);
	const [weeklySummary, setWeeklySummary] = useState(false);
	const [offTrackAlert, setOffTrackAlert] = useState(true);

	// Display & behavior
	const [showCompleted, setShowCompleted] = useState(true);
	const [autoArchive, setAutoArchive] = useState(true);
	const [rounding, setRounding] = useState<'none' | '1' | '5'>('1');

	// Security
	const [lockEdit, setLockEdit] = useState(false);
	const [undoWindow, setUndoWindow] = useState('24');

	const [saving, setSaving] = useState(false);
	// Load settings from profile when available
	useEffect(() => {
		if (profile?.preferences?.goalSettings) {
			const settings = profile.preferences.goalSettings;

			// Defaults
			setDefaultTarget(settings.defaults.target.toString());
			setDefaultDueDays(settings.defaults.dueDays.toString());
			setDefaultSort(settings.defaults.sortBy);
			setDefaultCurrency(settings.defaults.currency);

			// AI
			setAiEnabled(settings.ai.enabled);
			setAiTone(settings.ai.tone);
			setAiFrequency(settings.ai.frequency);
			setAiWhatIf(settings.ai.whatIf);

			// Notifications
			setMilestoneAlerts(settings.notifications.milestoneAlerts);
			setWeeklySummary(settings.notifications.weeklySummary);
			setOffTrackAlert(settings.notifications.offTrackAlert);

			// Display
			setShowCompleted(settings.display.showCompleted);
			setAutoArchive(settings.display.autoArchive);
			setRounding(settings.display.rounding);

			// Security
			setLockEdit(settings.security.lockEdit);
			setUndoWindow(settings.security.undoWindow.toString());
		}
	}, [profile?.preferences?.goalSettings]);

	const handleSave = async () => {
		try {
			setSaving(true);

			// Validate inputs
			const targetNum = parseFloat(defaultTarget);
			const dueDaysNum = parseInt(defaultDueDays);
			const undoWindowNum = parseInt(undoWindow);

			if (targetNum < 0) {
				Alert.alert('Invalid Input', 'Default target must be positive');
				return;
			}

			if (dueDaysNum < 1 || dueDaysNum > 3650) {
				Alert.alert(
					'Invalid Input',
					'Default due days must be between 1 and 3650'
				);
				return;
			}

			if (undoWindowNum < 1 || undoWindowNum > 168) {
				Alert.alert(
					'Invalid Input',
					'Undo window must be between 1 and 168 hours'
				);
				return;
			}

			await updateGoalSettings({
				defaults: {
					target: targetNum,
					dueDays: dueDaysNum,
					sortBy: defaultSort,
					currency: defaultCurrency,
				},
				ai: {
					enabled: aiEnabled,
					tone: aiTone,
					frequency: aiFrequency,
					whatIf: aiWhatIf,
				},
				notifications: {
					milestoneAlerts,
					weeklySummary,
					offTrackAlert,
				},
				display: {
					showCompleted,
					autoArchive,
					rounding,
				},
				security: {
					lockEdit,
					undoWindow: undoWindowNum,
				},
			});

			Alert.alert('Success', 'Goal settings saved successfully');
		} catch (error) {
			console.error('Error saving goal settings:', error);
			Alert.alert('Error', 'Failed to save goal settings');
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.safe}>
				<Stack.Screen options={{ title: 'Goal Settings' }} />
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#007AFF" />
					<Text style={styles.loadingText}>Loading settings...</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safe}>
			<Stack.Screen options={{ title: 'Goal Settings' }} />
			<ScrollView contentContainerStyle={styles.container}>
				{/* Default Goal Setup */}
				<Section title="Default Goal Values">
					<SectionSubtext>
						Set default values that will be used when creating new goals
					</SectionSubtext>
					<Label>Default Target Amount ($)</Label>
					<LabelSubtext>
						The amount that will be pre-filled when creating a new goal
					</LabelSubtext>
					<TextInput
						style={styles.input}
						keyboardType="numeric"
						value={defaultTarget}
						onChangeText={setDefaultTarget}
					/>

					<Label>Default Due Date (days from now)</Label>
					<LabelSubtext>
						How many days in the future the goal will be set to complete by
					</LabelSubtext>
					<TextInput
						style={styles.input}
						keyboardType="numeric"
						value={defaultDueDays}
						onChangeText={setDefaultDueDays}
					/>
				</Section>

				{/* AI Settings */}
				<Section title="AI Suggestions">
					<SectionSubtext>
						Configure how AI helps you with goal planning and insights
					</SectionSubtext>
					<Row
						label="Enable AI Suggestions"
						value={aiEnabled}
						onValueChange={setAiEnabled}
					/>
					{aiEnabled && (
						<>
							<Label>Suggestion Tone</Label>
							<LabelSubtext>
								Choose how the AI communicates with you - friendly and
								encouraging, technical and detailed, or minimal and concise
							</LabelSubtext>
							<OptionRow
								label="Friendly"
								selected={aiTone === 'friendly'}
								onPress={() => setAiTone('friendly')}
							/>
							<OptionRow
								label="Technical"
								selected={aiTone === 'technical'}
								onPress={() => setAiTone('technical')}
							/>
							<OptionRow
								label="Minimalist"
								selected={aiTone === 'minimal'}
								onPress={() => setAiTone('minimal')}
							/>

							<Label>Frequency</Label>
							<LabelSubtext>
								How often the AI should provide suggestions and insights about
								your goals
							</LabelSubtext>
							<OptionRow
								label="Low"
								selected={aiFrequency === 'low'}
								onPress={() => setAiFrequency('low')}
							/>
							<OptionRow
								label="Medium"
								selected={aiFrequency === 'medium'}
								onPress={() => setAiFrequency('medium')}
							/>
							<OptionRow
								label="High"
								selected={aiFrequency === 'high'}
								onPress={() => setAiFrequency('high')}
							/>

							<Row
								label="Enable What-if Simulations"
								value={aiWhatIf}
								onValueChange={setAiWhatIf}
							/>
						</>
					)}
				</Section>

				{/* Notifications */}
				<Section title="Notifications">
					<SectionSubtext>
						Choose which goal-related notifications you want to receive
					</SectionSubtext>
					<Row
						label="Milestone Alerts (25%, 50%, etc.)"
						value={milestoneAlerts}
						onValueChange={setMilestoneAlerts}
					/>
					<Row
						label="Weekly Progress Summary"
						value={weeklySummary}
						onValueChange={setWeeklySummary}
					/>
					<Row
						label="Notify When Off-Track"
						value={offTrackAlert}
						onValueChange={setOffTrackAlert}
					/>
				</Section>

				{/* Display */}
				<Section title="Display & Sorting">
					<SectionSubtext>
						Customize how your goals are organized and displayed
					</SectionSubtext>
					<Label>Sort Goals By</Label>
					<LabelSubtext>
						Choose the primary way your goals will be organized in the main view
					</LabelSubtext>
					<OptionRow
						label="% Complete"
						selected={defaultSort === 'percent'}
						onPress={() => setDefaultSort('percent')}
					/>
					<OptionRow
						label="Name (A-Z)"
						selected={defaultSort === 'name'}
						onPress={() => setDefaultSort('name')}
					/>
					<OptionRow
						label="Target Date"
						selected={defaultSort === 'date'}
						onPress={() => setDefaultSort('date')}
					/>
					<Row
						label="Show Completed Goals"
						value={showCompleted}
						onValueChange={setShowCompleted}
					/>
					<Row
						label="Auto-Archive When Complete"
						value={autoArchive}
						onValueChange={setAutoArchive}
					/>

					<Label>Rounding Display</Label>
					<LabelSubtext>
						Choose how amounts are displayed - exact values or rounded for
						easier reading
					</LabelSubtext>
					<OptionRow
						label="No Rounding"
						selected={rounding === 'none'}
						onPress={() => setRounding('none')}
					/>
					<OptionRow
						label="Nearest $1"
						selected={rounding === '1'}
						onPress={() => setRounding('1')}
					/>
					<OptionRow
						label="Nearest $5"
						selected={rounding === '5'}
						onPress={() => setRounding('5')}
					/>
				</Section>

				{/* Security */}
				<Section title="Security">
					<SectionSubtext>
						Protect your goal data and control access to sensitive features
					</SectionSubtext>
					<Row
						label="Require Biometric to Edit/Delete"
						value={lockEdit}
						onValueChange={setLockEdit}
					/>
					<Label>Undo Window (hours)</Label>
					<LabelSubtext>
						How long you have to undo changes after making them
					</LabelSubtext>
					<TextInput
						style={styles.input}
						keyboardType="numeric"
						value={undoWindow}
						onChangeText={setUndoWindow}
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
	loadingText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#007AFF',
		marginTop: 12,
	},
	saveButton: {
		backgroundColor: '#007AFF',
		borderRadius: 8,
		padding: 16,
		alignItems: 'center',
		marginTop: 24,
	},
	saveButtonDisabled: {
		backgroundColor: '#ccc',
	},
	saveButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#fff',
	},
});
