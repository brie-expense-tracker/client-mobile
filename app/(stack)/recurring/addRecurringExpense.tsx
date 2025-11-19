import React, { useState } from 'react';
import {
	View,
	StyleSheet,
	TextInput,
	ScrollView,
	Alert,
	Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logger } from '../../../src/utils/logger';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { RecurringExpenseService } from '../../../src/services';
import { DateField } from '../../../src/components/DateField';
import {
	FormHeader,
	FormInputGroup,
	PeriodSelector,
} from '../../../src/components/forms';
import { palette, radius, space, type } from '../../../src/ui/theme';

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
			logger.error('[AddRecurringExpenseScreen] Error saving:', error);
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
		<SafeAreaView style={styles.safeArea} edges={['top']}>
			<View style={styles.container}>
				<FormHeader
					title="Add Recurring Expense"
					onSave={handleSave}
					saveDisabled={loading}
					loading={loading}
				/>

				<ScrollView
					style={styles.content}
					contentContainerStyle={styles.contentContainer}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.formContainer}>
						{/* Vendor Name */}
						<FormInputGroup label="Vendor Name">
							<TextInput
								style={[type.body, styles.textInput]}
								value={vendor}
								onChangeText={setVendor}
								placeholder="e.g., Netflix, Spotify, Rent"
								placeholderTextColor={palette.textSubtle}
							/>
						</FormInputGroup>

						{/* Amount */}
						<FormInputGroup label="Amount">
							<View style={styles.amountContainer}>
								<Text style={[type.body, styles.currencySymbol]}>$</Text>
								<TextInput
									style={[type.body, styles.amountInput]}
									value={amount}
									onChangeText={setAmount}
									placeholder="0.00"
									placeholderTextColor={palette.textSubtle}
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
									setFrequency(
										f as 'weekly' | 'monthly' | 'quarterly' | 'yearly'
									)
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
							<Ionicons
								name="information-circle"
								size={20}
								color={palette.info}
							/>
							<Text style={[type.body, styles.infoText]}>
								This recurring expense will be tracked and you&apos;ll receive
								notifications when it&apos;s due.
							</Text>
						</View>
					</View>
				</ScrollView>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	container: {
		flex: 1,
		backgroundColor: palette.surfaceAlt,
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		flexGrow: 1,
		backgroundColor: palette.surfaceAlt,
	},
	formContainer: {
		paddingHorizontal: space.lg,
		paddingBottom: space.xxl,
		paddingTop: space.md,
	},
	textInput: {
		borderWidth: 1,
		borderColor: palette.border,
		borderRadius: radius.md,
		paddingHorizontal: space.md,
		paddingVertical: space.md,
		color: palette.text,
		backgroundColor: palette.surface,
	},
	amountContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: palette.border,
		borderRadius: radius.md,
		backgroundColor: palette.surface,
	},
	currencySymbol: {
		color: palette.text,
		paddingHorizontal: space.md,
		paddingVertical: space.md,
		fontWeight: '600',
	},
	amountInput: {
		flex: 1,
		paddingHorizontal: 0,
		paddingVertical: space.md,
		color: palette.text,
		fontWeight: '600',
	},
	infoCard: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: palette.infoSubtle,
		padding: space.md,
		borderRadius: radius.md,
		borderLeftWidth: 4,
		borderLeftColor: palette.info,
		marginTop: space.lg,
	},
	infoText: {
		flex: 1,
		marginLeft: space.sm,
		color: palette.textMuted,
		lineHeight: 20,
	},
});

export default AddRecurringExpenseScreen;
