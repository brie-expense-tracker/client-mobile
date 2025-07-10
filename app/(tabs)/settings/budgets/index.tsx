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
import { Picker } from '@react-native-picker/picker';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../../../../src/context/profileContext';

export default function BudgetSettingsScreen() {
	const { profile, loading, updateBudgetSettings } = useProfile();

	/* Local state for form inputs */
	const [cycleType, setCycleType] = useState<'monthly' | 'weekly'>('monthly');
	const [cycleStart, setCycleStart] = useState('1'); // 1 = Monday, 0 = Sunday for weekly; 1-28 for monthly
	const [alertPct, setAlertPct] = useState('80');
	const [carryOver, setCarryOver] = useState(false);
	const [autoSync, setAutoSync] = useState(true);
	const [saving, setSaving] = useState(false);
	// Load settings from profile when available
	useEffect(() => {
		if (profile?.preferences?.budgetSettings) {
			const settings = profile.preferences.budgetSettings;
			// Ensure cycleType is either 'monthly' or 'weekly'
			const validCycleType =
				settings.cycleType === 'weekly' ? 'weekly' : 'monthly';
			setCycleType(validCycleType);
			// For monthly, use the stored value (1-28), for weekly use the stored value (0 or 1)
			setCycleStart(settings.cycleStart?.toString() || '1');
			setAlertPct(settings.alertPct?.toString() || '80');
			setCarryOver(settings.carryOver || false);
			setAutoSync(settings.autoSync !== false); // Default to true
		}
	}, [profile?.preferences?.budgetSettings]);

	const handleSave = async () => {
		try {
			setSaving(true);

			// Check if profile is loaded
			if (!profile) {
				Alert.alert('Error', 'Profile not loaded. Please try again.');
				return;
			}

			// Validate inputs
			const cycleStartNum = parseInt(cycleStart);
			const alertPctNum = parseInt(alertPct);

			// Validate cycle start based on type
			if (cycleType === 'weekly' && (cycleStartNum < 0 || cycleStartNum > 1)) {
				Alert.alert(
					'Invalid Input',
					'Weekly cycle start must be 0 (Sunday) or 1 (Monday)'
				);
				return;
			}

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

			if (alertPctNum < 1 || alertPctNum > 100) {
				Alert.alert(
					'Invalid Input',
					'Alert percentage must be between 1 and 100'
				);
				return;
			}

			console.log('Saving budget settings:', {
				cycleType,
				cycleStart: cycleStartNum,
				alertPct: alertPctNum,
				carryOver,
				autoSync,
			});

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
			const errorMessage =
				error instanceof Error
					? error.message
					: 'Failed to save budget settings';
			Alert.alert('Error', errorMessage);
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.safe}>
				<Stack.Screen options={{ title: 'Budget Settings' }} />
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#00a2ff" />
					<Text style={styles.loadingText}>Loading settings...</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safe}>
			<Stack.Screen options={{ title: 'Budget Settings' }} />

			<ScrollView contentContainerStyle={styles.container}>
				{/* —— Budget Reset Cycle —— */}
				<Section title="Budget Reset Cycle">
					<SectionSubtext>
						Configure when your budgets automatically reset and start fresh
					</SectionSubtext>

					<Label>Reset Frequency</Label>
					<LabelSubtext>
						How often your budgets reset to zero spent amount
					</LabelSubtext>

					<OptionRow
						label="Monthly"
						subtext="Reset on the same day each month"
						selected={cycleType === 'monthly'}
						onPress={() => setCycleType('monthly')}
						icon="calendar-outline"
					/>
					<OptionRow
						label="Weekly"
						subtext="Reset on the same day each week"
						selected={cycleType === 'weekly'}
						onPress={() => setCycleType('weekly')}
						icon="calendar-clear-outline"
					/>

					{cycleType === 'weekly' && (
						<>
							<Label>Reset Day of Week</Label>
							<LabelSubtext>
								Which day of the week your budgets reset
							</LabelSubtext>

							<OptionRow
								label="Monday"
								subtext="Reset on Monday each week"
								selected={cycleStart === '1'}
								onPress={() => setCycleStart('1')}
								icon="calendar-outline"
							/>
							<OptionRow
								label="Sunday"
								subtext="Reset on Sunday each week"
								selected={cycleStart === '0'}
								onPress={() => setCycleStart('0')}
								icon="calendar-clear-outline"
							/>
						</>
					)}

					{cycleType === 'monthly' && (
						<>
							<Label>Reset Day of Month</Label>
							<LabelSubtext>
								Which day of the month your budgets reset (1-28)
							</LabelSubtext>

							<View style={styles.monthDayPicker}>
								<Picker
									selectedValue={cycleStart}
									onValueChange={setCycleStart}
									style={styles.picker}
								>
									{Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
										<Picker.Item
											key={day}
											label={`${day}${getDaySuffix(day)}`}
											value={day.toString()}
										/>
									))}
								</Picker>
							</View>
						</>
					)}
				</Section>

				{/* —— Budget Behavior —— */}
				<Section title="Budget Behavior">
					<SectionSubtext>
						Customize how your budgets behave when they reset
					</SectionSubtext>

					<Row
						label="Carry over unused budget"
						subtext="Add leftover money to next period's budget"
						value={carryOver}
						onValueChange={setCarryOver}
					/>

					<Row
						label="Auto-sync from transactions"
						subtext="Automatically update spent amounts from your transactions"
						value={autoSync}
						onValueChange={setAutoSync}
					/>
				</Section>

				{/* —— Spending Alerts —— */}
				<Section title="Spending Alerts">
					<SectionSubtext>
						Get notified when you're approaching your budget limits
					</SectionSubtext>

					<Label>Alert Threshold</Label>
					<LabelSubtext>
						Get notified when you've spent this percentage of your budget
					</LabelSubtext>

					<OptionRow
						label="50%"
						subtext="Early warning - get notified at half your budget"
						selected={alertPct === '50'}
						onPress={() => setAlertPct('50')}
						icon="warning-outline"
					/>
					<OptionRow
						label="75%"
						subtext="Moderate warning - get notified at three-quarters"
						selected={alertPct === '75'}
						onPress={() => setAlertPct('75')}
						icon="alert-circle-outline"
					/>
					<OptionRow
						label="80%"
						subtext="Standard warning - get notified near limit"
						selected={alertPct === '80'}
						onPress={() => setAlertPct('80')}
						icon="notifications-outline"
					/>
					<OptionRow
						label="90%"
						subtext="Late warning - get notified close to limit"
						selected={alertPct === '90'}
						onPress={() => setAlertPct('90')}
						icon="alert-outline"
					/>
					<OptionRow
						label="100%"
						subtext="Critical warning - get notified at limit"
						selected={alertPct === '100'}
						onPress={() => setAlertPct('100')}
						icon="stop-circle-outline"
					/>

					<View style={styles.alertExamples}>
						<Text style={styles.alertExampleText}>
							• At 80%: "You've spent 80% of your Groceries budget"
						</Text>
						<Text style={styles.alertExampleText}>
							• At 100%: "You've reached your Dining budget limit"
						</Text>
					</View>
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

// Helper function to get day suffix (1st, 2nd, 3rd, etc.)
const getDaySuffix = (day: number): string => {
	if (day >= 11 && day <= 13) return 'th';
	switch (day % 10) {
		case 1:
			return 'st';
		case 2:
			return 'nd';
		case 3:
			return 'rd';
		default:
			return 'th';
	}
};

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
	subtext,
	value,
	onValueChange,
}: {
	label: string;
	subtext?: string;
	value: boolean;
	onValueChange: (v: boolean) => void;
}) => (
	<View style={styles.row}>
		<View style={styles.rowContent}>
			<Text style={styles.rowLabel}>{label}</Text>
			{subtext && <Text style={styles.rowSubtext}>{subtext}</Text>}
		</View>
		<Switch
			value={value}
			onValueChange={onValueChange}
			trackColor={{ false: '#e0e0e0', true: '#00a2ff' }}
			thumbColor={value ? '#fff' : '#f4f3f4'}
		/>
	</View>
);

const OptionRow = ({
	label,
	subtext,
	selected,
	onPress,
	icon,
}: {
	label: string;
	subtext?: string;
	selected: boolean;
	onPress: () => void;
	icon?: keyof typeof Ionicons.glyphMap;
}) => (
	<TouchableOpacity
		style={[styles.optionRow, selected && styles.selectedOptionRow]}
		onPress={onPress}
	>
		<View style={styles.optionContent}>
			{icon && (
				<Ionicons
					name={icon}
					size={20}
					color={selected ? '#00a2ff' : '#757575'}
					style={styles.optionIcon}
				/>
			)}
			<View style={styles.optionTextContainer}>
				<Text
					style={[styles.optionLabel, selected && styles.selectedOptionLabel]}
				>
					{label}
				</Text>
				{subtext && (
					<Text
						style={[
							styles.optionSubtext,
							selected && styles.selectedOptionSubtext,
						]}
					>
						{subtext}
					</Text>
				)}
			</View>
		</View>
		{selected && <Ionicons name="checkmark" size={24} color="#00a2ff" />}
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
	sectionHeader: {
		fontSize: 20,
		fontWeight: '700',
		marginBottom: 8,
		color: '#212121',
	},
	sectionSubtext: {
		fontSize: 14,
		color: '#757575',
		marginBottom: 20,
		lineHeight: 20,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	rowContent: {
		flex: 1,
		marginRight: 16,
	},
	rowLabel: {
		fontSize: 16,
		color: '#212121',
		fontWeight: '500',
		marginBottom: 2,
	},
	rowSubtext: {
		fontSize: 14,
		color: '#757575',
		lineHeight: 18,
	},
	optionRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 16,
		paddingHorizontal: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e0e0e0',
		marginBottom: 8,
		backgroundColor: '#fff',
	},
	selectedOptionRow: {
		borderColor: '#00a2ff',
		backgroundColor: '#f0f9ff',
	},
	optionContent: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	optionIcon: {
		marginRight: 12,
	},
	optionTextContainer: {
		flex: 1,
	},
	optionLabel: {
		fontSize: 16,
		color: '#212121',
		fontWeight: '500',
		marginBottom: 2,
	},
	selectedOptionLabel: {
		color: '#00a2ff',
		fontWeight: '600',
	},
	optionSubtext: {
		fontSize: 14,
		color: '#757575',
		lineHeight: 18,
	},
	selectedOptionSubtext: {
		color: '#00a2ff',
	},

	label: {
		fontSize: 16,
		color: '#212121',
		marginTop: 16,
		marginBottom: 8,
		fontWeight: '600',
	},
	labelSubtext: {
		fontSize: 14,
		color: '#757575',
		marginBottom: 12,
		lineHeight: 18,
	},
	input: {
		borderWidth: 1,
		borderColor: '#e0e0e0',
		borderRadius: 12,
		padding: 16,
		fontSize: 16,
		backgroundColor: '#fff',
	},
	alertExamples: {
		backgroundColor: '#f8f9fa',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
	},
	alertExampleText: {
		fontSize: 14,
		color: '#757575',
		lineHeight: 20,
		marginBottom: 4,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		fontSize: 16,
		color: '#757575',
		marginTop: 12,
	},
	saveButton: {
		backgroundColor: '#00a2ff',
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
	monthDayPicker: {
		borderWidth: 1,
		borderColor: '#e0e0e0',
		borderRadius: 12,
		padding: 16,
		backgroundColor: '#fff',
	},
	picker: {
		width: '100%',
	},
});
