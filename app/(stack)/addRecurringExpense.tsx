import React, { useState } from 'react';
import {
	View,
	StyleSheet,
	TextInput,
	ScrollView,
	Alert,
	SafeAreaView,
	Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { RecurringExpenseService } from '../../src/services';
import { DateField } from '../../src/components/DateField';
import {
	FormHeader,
	FormInputGroup,
	PeriodSelector,
} from '../../src/components/forms';

const FREQUENCY_OPTIONS = [
	{ value: 'weekly', label: 'Weekly', icon: 'time-outline' as const },
	{ value: 'monthly', label: 'Monthly', icon: 'calendar-outline' as const },
	{ value: 'yearly', label: 'Yearly', icon: 'calendar-outline' as const },
];

const AddRecurringExpenseScreen: React.FC = () => {
	const [vendor, setVendor] = useState('');
	const [amount, setAmount] = useState('');
	const [frequency, setFrequency] = useState<
		'weekly' | 'monthly' | 'quarterly' | 'yearly'
	>('monthly');
	const [nextDueDate, setNextDueDate] = useState(
		new Date().toISOString().split('T')[0]
	);
	const [loading, setLoading] = useState(false);

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
				nextExpectedDate: new Date(nextDueDate).toISOString(),
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

	const handleDateChange = (isoDate: string) => {
		setNextDueDate(isoDate);
	};

	return (
		<SafeAreaView style={styles.container}>
			<FormHeader
				title="Add Recurring Expense"
				onSave={handleSave}
				saveDisabled={loading}
				loading={loading}
			/>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.formContainer}>
					{/* Vendor Name */}
					<FormInputGroup label="Vendor Name">
						<TextInput
							style={styles.textInput}
							value={vendor}
							onChangeText={setVendor}
							placeholder="e.g., Netflix, Spotify, Rent"
							placeholderTextColor="#999"
						/>
					</FormInputGroup>

					{/* Amount */}
					<FormInputGroup label="Amount">
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
					</FormInputGroup>

					{/* Frequency */}
					<FormInputGroup label="Frequency">
						<PeriodSelector
							options={FREQUENCY_OPTIONS}
							selectedPeriod={frequency}
							onPeriodSelect={(f) =>
								setFrequency(f as 'weekly' | 'monthly' | 'quarterly' | 'yearly')
							}
						/>
					</FormInputGroup>

					{/* Next Due Date */}
					<FormInputGroup label="Next Due Date">
						<DateField
							value={nextDueDate}
							onChange={handleDateChange}
							title=""
							placeholder="Select date"
							minDate={new Date().toISOString().split('T')[0]}
						/>
					</FormInputGroup>

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
	content: {
		flex: 1,
	},
	formContainer: {
		padding: 16,
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
