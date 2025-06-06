import React, { useState, useEffect } from 'react';
import {
	SafeAreaView,
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Switch,
	TextInput,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PreferencesScreen() {
	const router = useRouter();
	const [preferences, setPreferences] = useState({
		adviceFrequency: 'weekly',
		autoSave: {
			enabled: false,
			amount: 0,
		},
	});

	const adviceFrequencies = [
		{ label: 'Daily', value: 'daily' },
		{ label: 'Weekly', value: 'weekly' },
		{ label: 'Monthly', value: 'monthly' },
	];

	const updatePreferences = async (newPreferences: any) => {
		try {
			const response = await fetch(
				'http://localhost:3000/api/profile/preferences',
				{
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(newPreferences),
				}
			);

			if (!response.ok) {
				throw new Error('Failed to update preferences');
			}

			Alert.alert('Success', 'Preferences updated successfully');
		} catch (error) {
			Alert.alert('Error', 'Failed to update preferences');
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => router.back()}
					style={styles.backButton}
				>
					<Ionicons name="arrow-back" size={24} color="#333" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Preferences</Text>
			</View>

			<View style={styles.settingsContainer}>
				{/* Advice Frequency */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Advice Frequency</Text>
					<View style={styles.optionsContainer}>
						{adviceFrequencies.map((option) => (
							<TouchableOpacity
								key={option.value}
								style={[
									styles.optionButton,
									preferences.adviceFrequency === option.value &&
										styles.selectedOption,
								]}
								onPress={() => {
									setPreferences({
										...preferences,
										adviceFrequency: option.value,
									});
									updatePreferences({
										...preferences,
										adviceFrequency: option.value,
									});
								}}
							>
								<Text
									style={[
										styles.optionText,
										preferences.adviceFrequency === option.value &&
											styles.selectedOptionText,
									]}
								>
									{option.label}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* Auto Save Settings */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Auto Save</Text>
					<View style={styles.settingItem}>
						<Text style={styles.settingText}>Enable Auto Save</Text>
						<Switch
							value={preferences.autoSave.enabled}
							onValueChange={(value) => {
								setPreferences({
									...preferences,
									autoSave: { ...preferences.autoSave, enabled: value },
								});
								updatePreferences({
									...preferences,
									autoSave: { ...preferences.autoSave, enabled: value },
								});
							}}
						/>
					</View>
					{preferences.autoSave.enabled && (
						<View style={styles.amountInputContainer}>
							<Text style={styles.settingText}>Amount</Text>
							<TextInput
								style={styles.amountInput}
								keyboardType="numeric"
								value={preferences.autoSave.amount.toString()}
								onChangeText={(value) => {
									const amount = parseFloat(value) || 0;
									setPreferences({
										...preferences,
										autoSave: { ...preferences.autoSave, amount },
									});
									updatePreferences({
										...preferences,
										autoSave: { ...preferences.autoSave, amount },
									});
								}}
								placeholder="Enter amount"
							/>
						</View>
					)}
				</View>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f9f9f9',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	backButton: {
		marginRight: 16,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#333',
	},
	settingsContainer: {
		padding: 16,
	},
	section: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginBottom: 16,
	},
	optionsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	optionButton: {
		flex: 1,
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#ddd',
		marginHorizontal: 4,
		alignItems: 'center',
	},
	selectedOption: {
		backgroundColor: '#0095FF',
		borderColor: '#0095FF',
	},
	optionText: {
		color: '#333',
	},
	selectedOptionText: {
		color: '#fff',
	},
	settingItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#fff',
		padding: 16,
		borderRadius: 12,
		marginBottom: 12,
	},
	settingText: {
		fontSize: 16,
		color: '#333',
	},
	amountInputContainer: {
		backgroundColor: '#fff',
		padding: 16,
		borderRadius: 12,
		marginTop: 8,
	},
	amountInput: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		padding: 8,
		marginTop: 8,
		fontSize: 16,
	},
});
