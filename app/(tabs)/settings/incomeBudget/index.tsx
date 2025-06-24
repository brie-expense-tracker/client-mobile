/* budgetSettings.tsx — keeps it lightweight & self-contained */
import React, { useState } from 'react';
import {
	SafeAreaView,
	ScrollView,
	View,
	Text,
	Switch,
	StyleSheet,
	TextInput,
} from 'react-native';
import { Stack } from 'expo-router';
import { Picker } from '@react-native-picker/picker'; // expo install @react-native-picker/picker

export default function BudgetSettingsScreen() {
	/* Local state → replace with Context / Redux / backend fetch later */
	const [cycleType, setCycleType] = useState<'monthly' | 'weekly' | 'biweekly'>(
		'monthly'
	);
	const [cycleStart, setCycleStart] = useState('1'); // 1 = 1st of month | 0 = Sunday
	const [alertPct, setAlertPct] = useState('80'); // overspend threshold
	const [carryOver, setCarryOver] = useState(false);
	const [autoSync, setAutoSync] = useState(true);

	return (
		<SafeAreaView style={styles.safe}>
			<Stack.Screen options={{ title: 'Budget Settings' }} />

			<ScrollView contentContainerStyle={styles.container}>
				{/* —— Cycle —— */}
				<Section title="Budget Cycle">
					<Label>Cycle type</Label>
					<Picker
						style={styles.picker}
						selectedValue={cycleType}
						onValueChange={(v) => setCycleType(v)}
					>
						<Picker.Item label="Monthly" value="monthly" />
						<Picker.Item label="Weekly" value="weekly" />
						<Picker.Item label="Bi-Weekly" value="biweekly" />
					</Picker>

					<Label>
						{cycleType === 'monthly'
							? 'Start day (1-28)'
							: 'Start weekday (0=Sun)'}{' '}
					</Label>
					<TextInput
						style={styles.input}
						keyboardType="numeric"
						value={cycleStart}
						onChangeText={setCycleStart}
					/>
				</Section>

				{/* —— Alerts —— */}
				<Section title="Notifications">
					<Label>Overspend alert %</Label>
					<TextInput
						style={styles.input}
						keyboardType="numeric"
						value={alertPct}
						onChangeText={setAlertPct}
					/>
				</Section>

				{/* —— Toggles —— */}
				<Section title="Preferences">
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
			</ScrollView>
		</SafeAreaView>
	);
}

/* ——— Helper components ——— */
const Section = ({ title, children }: any) => (
	<View style={{ marginBottom: 32 }}>
		<Text style={styles.sectionHeader}>{title}</Text>
		{children}
	</View>
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

const Label = ({ children }: any) => (
	<Text style={styles.label}>{children}</Text>
);

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: '#fff' },
	container: { padding: 24, paddingBottom: 48 },
	sectionHeader: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
	},
	rowLabel: { fontSize: 16, color: '#333', flexShrink: 1 },
	label: { fontSize: 14, color: '#666', marginTop: 12, marginBottom: 4 },
	input: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		padding: 10,
		fontSize: 16,
	},
	picker: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8 },
});
