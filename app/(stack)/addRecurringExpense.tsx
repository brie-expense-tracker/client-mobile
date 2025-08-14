import React, { useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ScrollView,
	Alert,
	ActivityIndicator,
	SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RecurringExpenseService } from '../../src/services/recurringExpenseService';

const AddRecurringExpenseScreen: React.FC = () => {
	const [vendor, setVendor] = useState('');
	const [amount, setAmount] = useState('');
	const [frequency, setFrequency] = useState<
		'weekly' | 'monthly' | 'quarterly' | 'yearly'
	>('monthly');
	const [nextDueDate, setNextDueDate] = useState(new Date());
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [loading, setLoading] = useState(false);

	const frequencies = [
		{ value: 'weekly', label: 'Weekly' },
		{ value: 'monthly', label: 'Monthly' },
		{ value: 'yearly', label: 'Yearly' },
	] as const;

	const handleSave = async () => {
		if (!vendor.trim()) {
			Alert.alert('Error', 'Please enter a vendor name');
			return;
		}

		if (!amount.trim() || isNaN(parseFloat(amount))) {
			Alert.alert('Error', 'Please enter a valid amount');
			return;
		}

		setLoading(true);
		try {
			await RecurringExpenseService.createRecurringExpense({
				vendor: vendor.trim(),
				amount: parseFloat(amount),
				frequency,
				nextExpectedDate: nextDueDate.toISOString(),
			});

			Alert.alert('Success', 'Recurring expense added successfully!', [
				{
					text: 'OK',
					onPress: () => router.back(),
				},
			]);
		} catch (error) {
			console.error('[AddRecurringExpenseScreen] Error saving:', error);
			Alert.alert(
				'Error',
				'Failed to save recurring expense. Please try again.'
			);
		} finally {
			setLoading(false);
		}
	};

	const handleDateChange = (event: any, selectedDate?: Date) => {
		setShowDatePicker(false);
		if (selectedDate) {
			setNextDueDate(selectedDate);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			{/* Custom Back Button */}
			<View style={styles.backButtonContainer}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
				>
					<Ionicons name="chevron-back" size={24} color="#007ACC" />
				</TouchableOpacity>
				<Text style={styles.screenTitle}>Add Recurring Expense</Text>
				<TouchableOpacity
					onPress={handleSave}
					style={[styles.saveButton, loading && styles.saveButtonDisabled]}
					disabled={loading}
				>
					{loading ? (
						<ActivityIndicator size="small" color="#fff" />
					) : (
						<Text style={styles.saveButtonText}>Save</Text>
					)}
				</TouchableOpacity>
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.formContainer}>
					{/* Vendor Name */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Vendor Name</Text>
						<TextInput
							style={styles.textInput}
							value={vendor}
							onChangeText={setVendor}
							placeholder="e.g., Netflix, Spotify, Rent"
							placeholderTextColor="#999"
						/>
					</View>

					{/* Amount */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Amount</Text>
						<View style={styles.amountContainer}>
							<Text style={styles.currencySymbol}>$</Text>
							<TextInput
								style={styles.amountInput}
								value={amount}
								onChangeText={setAmount}
								placeholder="0.00"
								placeholderTextColor="#999"
								keyboardType="decimal-pad"
							/>
						</View>
					</View>

					{/* Frequency */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Frequency</Text>
						<View style={styles.frequencyContainer}>
							{frequencies.map((freq) => (
								<TouchableOpacity
									key={freq.value}
									style={[
										styles.frequencyButton,
										frequency === freq.value && styles.frequencyButtonActive,
									]}
									onPress={() => setFrequency(freq.value)}
								>
									<Text
										style={[
											styles.frequencyButtonText,
											frequency === freq.value &&
												styles.frequencyButtonTextActive,
										]}
									>
										{freq.label}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>

					{/* Next Due Date */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Next Due Date</Text>
						<TouchableOpacity
							style={styles.dateButton}
							onPress={() => setShowDatePicker(!showDatePicker)}
						>
							<View style={styles.dateButtonContent}>
								<View style={styles.dateIcon}>
									<Ionicons name="calendar-outline" size={16} color="#007ACC" />
								</View>
								<Text style={styles.dateButtonText}>
									{nextDueDate.toLocaleDateString()}
								</Text>
								<Ionicons
									name={showDatePicker ? 'chevron-up' : 'chevron-down'}
									size={20}
									color="#757575"
								/>
							</View>
						</TouchableOpacity>

						{showDatePicker && (
							<View style={styles.datePickerWrapper}>
								<DateTimePicker
									value={nextDueDate}
									mode="date"
									display="inline"
									onChange={handleDateChange}
									minimumDate={new Date()}
								/>
							</View>
						)}
					</View>

					{/* Info Card */}
					<View style={styles.infoCard}>
						<Ionicons name="information-circle" size={20} color="#007ACC" />
						<Text style={styles.infoText}>
							This recurring expense will be tracked and you&apos;ll receive
							notifications when it&apos;s due.
						</Text>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
		paddingTop: 0,
	},
	backButtonContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
		backgroundColor: '#ffffff',
	},
	backButton: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	backButtonText: {
		marginLeft: 8,
		fontSize: 16,
		color: '#007ACC',
		fontWeight: '500',
	},
	screenTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#0a0a0a',
		flex: 1,
		textAlign: 'center',
	},
	saveButton: {
		backgroundColor: '#18181b',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 16,
	},
	saveButtonDisabled: {
		backgroundColor: '#a1a1aa',
	},
	saveButtonText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '600',
	},
	content: {
		flex: 1,
	},
	formContainer: {
		padding: 16,
	},
	inputGroup: {
		marginBottom: 24,
	},
	label: {
		fontSize: 17,
		fontWeight: '700',
		color: '#0a0a0a',
		marginBottom: 8,
	},
	textInput: {
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 12,
		fontSize: 16,
		color: '#0a0a0a',
		backgroundColor: '#ffffff',
	},
	amountContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 8,
		backgroundColor: '#ffffff',
	},
	currencySymbol: {
		fontSize: 18,
		fontWeight: '600',
		color: '#0a0a0a',
		paddingHorizontal: 12,
		paddingVertical: 12,
	},
	amountInput: {
		flex: 1,
		paddingHorizontal: 0,
		paddingVertical: 12,
		fontSize: 18,
		fontWeight: '600',
		color: '#0a0a0a',
	},
	frequencyContainer: {
		flexDirection: 'row',
		gap: 8,
	},
	frequencyButton: {
		flex: 1,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 16,
		alignItems: 'center',
		backgroundColor: '#ffffff',
	},
	frequencyButtonActive: {
		backgroundColor: '#18181b',
		borderColor: '#18181b',
	},
	frequencyButtonText: {
		fontSize: 13,
		fontWeight: '500',
		color: '#52525b',
	},
	frequencyButtonTextActive: {
		color: '#ffffff',
		fontWeight: '600',
	},
	dateButton: {
		backgroundColor: '#ffffff',
		borderRadius: 8,
		padding: 16,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	dateButtonContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	dateIcon: {
		width: 24,
		height: 24,
		borderRadius: 6,
		backgroundColor: '#1E88E520',
		justifyContent: 'center',
		alignItems: 'center',
	},
	dateButtonText: {
		flex: 1,
		marginLeft: 12,
		fontSize: 16,
		color: '#0a0a0a',
	},
	datePickerWrapper: {
		backgroundColor: '#ffffff',
		borderRadius: 8,
		padding: 8,
		marginTop: 8,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	infoCard: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: '#f8f9fa',
		padding: 16,
		borderRadius: 8,
		borderLeftWidth: 4,
		borderLeftColor: '#1E88E5',
		marginTop: 16,
	},
	infoText: {
		flex: 1,
		marginLeft: 8,
		fontSize: 14,
		color: '#71717a',
		lineHeight: 20,
	},
});

export default AddRecurringExpenseScreen;
