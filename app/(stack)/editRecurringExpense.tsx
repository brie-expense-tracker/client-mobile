import React, { useEffect, useMemo, useState } from 'react';
import {
	View,
	StyleSheet,
	TextInput,
	ScrollView,
	Alert,
	ActivityIndicator,
	SafeAreaView,
	Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRecurringExpense } from '../../src/context/recurringExpenseContext';
import { RecurringExpense } from '../../src/services';
import { DateField } from '../../src/components/DateField';
import {
	BUDGET_ICONS,
	DEFAULT_BUDGET_ICON,
	DEFAULT_COLOR,
	normalizeIconName,
} from '../../src/constants/uiConstants';
import {
	FormHeader,
	FormInputGroup,
	IconPicker,
	ColorPicker,
	AmountPresets,
	PeriodSelector,
	CategorySelector,
	DeleteButton,
} from '../../src/components/forms';

// Quick amount presets (same pattern as the other editors)
const AMOUNT_PRESETS = [10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200] as const;

const FREQUENCIES = [
	{ value: 'weekly', label: 'Weekly', icon: 'time-outline' as const },
	{ value: 'monthly', label: 'Monthly', icon: 'calendar-outline' as const },
	{
		value: 'quarterly',
		label: 'Quarterly',
		icon: 'calendar-outline' as const,
	},
	{ value: 'yearly', label: 'Yearly', icon: 'calendar-outline' as const },
] as const;

// Common transaction categories for chips
const COMMON_CATEGORIES = [
	'Streaming',
	'Phone',
	'Internet',
	'Utilities',
	'Rent',
	'Insurance',
	'Gym',
	'Music',
	'Gaming',
	'Cloud',
	'Other',
] as const;

const validateDate = (dateString: string): boolean => {
	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
	if (!dateRegex.test(dateString)) return false;
	const date = new Date(dateString);
	return date instanceof Date && !isNaN(date.getTime());
};

const cleanCurrencyToNumberString = (v: string) => {
	// Keep digits and dot, then ensure a single dot, max 2 decimals
	const cleaned = v.replace(/[^\d.]/g, '');
	const parts = cleaned.split('.');
	if (parts.length > 2) {
		// Multiple dots: keep only first dot
		const [intPart, ...decParts] = parts;
		const decPart = decParts.join('').slice(0, 2);
		return decPart
			? `${intPart}.${decPart}`.replace(/^0+(\d)/, '$1')
			: intPart.replace(/^0+(\d)/, '$1');
	}
	const [intPart, decPart = ''] = parts;
	const trimmedDec = decPart.slice(0, 2);
	const result = trimmedDec ? `${intPart}.${trimmedDec}` : intPart;
	return result.replace(/^0+(\d)/, '$1');
};

const EditRecurringExpenseScreen: React.FC = () => {
	const params = useLocalSearchParams();
	const patternId = params.id as string;

	const [vendor, setVendor] = useState('');
	const [amount, setAmount] = useState('');
	const [frequency, setFrequency] = useState<
		'weekly' | 'monthly' | 'quarterly' | 'yearly'
	>('monthly');
	const [nextDueDate, setNextDueDate] = useState(
		new Date().toISOString().split('T')[0]
	);

	// Icon / color / categories
	const [appearanceMode, setAppearanceMode] = useState<
		'custom' | 'brand' | 'default'
	>('brand');
	const [icon, setIcon] =
		useState<keyof typeof Ionicons.glyphMap>(DEFAULT_BUDGET_ICON);
	const [color, setColor] = useState<string>(DEFAULT_COLOR);
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [showColorPicker, setShowColorPicker] = useState(false);
	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

	const [loading, setLoading] = useState(false);
	const [expense, setExpense] = useState<RecurringExpense | null>(null);

	const { expenses, updateRecurringExpense, deleteRecurringExpense } =
		useRecurringExpense();

	// Load expense data
	useEffect(() => {
		if (patternId && expenses.length > 0) {
			const found = expenses.find((e) => e.patternId === patternId);
			if (found) {
				console.log('🔍 [EditRecurringExpense] Loading expense:', found);
				console.log('🎨 [EditRecurringExpense] Icon/Color from data:');
				console.log('  - icon:', found.icon);
				console.log('  - color:', found.color);
				console.log('  - categories:', found.categories);

				setExpense(found);
				setVendor(found.vendor || '');
				setAmount((Number(found.amount) || 0).toString());
				setFrequency(found.frequency);
				setNextDueDate(found.nextExpectedDate.split('T')[0]);

				// Hydrate appearance fields
				const expenseMode = (found as any).appearanceMode || 'brand';
				setAppearanceMode(expenseMode);

				const normalized = normalizeIconName(found.icon || DEFAULT_BUDGET_ICON);
				setIcon(normalized);
				setColor(found.color || DEFAULT_COLOR);
				setSelectedCategories(found.categories || []);

				console.log('🎨 [EditRecurringExpense] Set state to:');
				console.log('  - appearanceMode:', expenseMode);
				console.log('  - icon:', normalized);
				console.log('  - color:', found.color || DEFAULT_COLOR);
				console.log('  - categories:', found.categories || []);
			}
		}
	}, [patternId, expenses]);

	const saveDisabled = useMemo(
		() =>
			loading || !vendor.trim() || !amount.trim() || !validateDate(nextDueDate),
		[loading, vendor, amount, nextDueDate]
	);

	const toggleCategory = (c: string) => {
		setSelectedCategories((prev) =>
			prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
		);
	};

	// Wrapper to set icon and switch to custom mode
	const handleIconChange = (newIcon: keyof typeof Ionicons.glyphMap) => {
		console.log('🎨 [EditRecurringExpense] User changed icon to:', newIcon);
		setIcon(newIcon);
		setAppearanceMode('custom');
	};

	// Wrapper to set color and switch to custom mode
	const handleColorChange = (newColor: string) => {
		console.log('🎨 [EditRecurringExpense] User changed color to:', newColor);
		setColor(newColor);
		setAppearanceMode('custom');
	};

	const handleSave = async () => {
		const amt = Number(
			parseFloat(cleanCurrencyToNumberString(amount)).toFixed(2)
		);
		if (!vendor.trim()) {
			Alert.alert('Error', 'Please enter a vendor name');
			return;
		}
		if (!amount.trim() || isNaN(amt) || amt < 0) {
			Alert.alert('Error', 'Please enter a valid amount');
			return;
		}
		if (!validateDate(nextDueDate)) {
			Alert.alert('Invalid Date', 'Please use YYYY-MM-DD (e.g., 2025-12-31)');
			return;
		}

		const updateData = {
			vendor: vendor.trim(),
			amount: amt,
			frequency,
			nextExpectedDate: nextDueDate,
			appearanceMode,
			icon: normalizeIconName(icon),
			color,
			categories: selectedCategories,
		};

		console.log(
			'🔍 [EditRecurringExpense] Saving update with data:',
			updateData
		);

		setLoading(true);
		try {
			const result = await updateRecurringExpense(patternId, updateData);

			console.log(
				'✅ [EditRecurringExpense] Update succeeded, result:',
				result
			);
			console.log('🎨 [EditRecurringExpense] Checking fields in result:');
			console.log('  - appearanceMode:', result.appearanceMode);
			console.log('  - icon:', result.icon);
			console.log('  - color:', result.color);
			console.log('  - categories:', result.categories);

			Alert.alert('Success', 'Recurring expense updated successfully!', [
				{ text: 'OK', onPress: () => router.back() },
			]);
		} catch (err) {
			console.error('[EditRecurringExpense] update error:', err);
			Alert.alert(
				'Error',
				'Failed to update recurring expense. Please try again.'
			);
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = () => {
		Alert.alert(
			'Delete Recurring Expense',
			'Are you sure you want to delete this recurring expense? This action cannot be undone.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						setLoading(true);
						try {
							await deleteRecurringExpense(patternId);
							Alert.alert('Deleted', 'Recurring expense was deleted.', [
								{ text: 'OK', onPress: () => router.back() },
							]);
						} catch (err) {
							console.error('[EditRecurringExpense] delete error:', err);
							Alert.alert(
								'Error',
								'Failed to delete recurring expense. Please try again.'
							);
						} finally {
							setLoading(false);
						}
					},
				},
			]
		);
	};

	if (!expense) {
		return (
			<SafeAreaView style={styles.container}>
				<FormHeader
					title="Edit Recurring Expense"
					onSave={handleSave}
					saveDisabled={true}
					loading={false}
				/>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#007ACC" />
					<Text style={styles.loadingText}>Loading expense...</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<FormHeader
				title="Edit Recurring Expense"
				onSave={handleSave}
				saveDisabled={saveDisabled}
				loading={loading}
			/>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.formContainer}>
					{/* Vendor */}
					<FormInputGroup label="Vendor Name">
						<TextInput
							style={styles.textInput}
							value={vendor}
							onChangeText={setVendor}
							placeholder="e.g., Netflix, AT&T"
							placeholderTextColor="#999"
							autoCapitalize="words"
						/>
					</FormInputGroup>

					{/* Amount + presets */}
					<FormInputGroup
						label="Amount"
						subtext="Set the billed amount for this subscription"
					>
						<AmountPresets
							presets={AMOUNT_PRESETS}
							selectedAmount={amount}
							onPresetSelect={setAmount}
							showCustom={
								!(AMOUNT_PRESETS as readonly number[]).includes(
									Number(amount)
								) && amount !== ''
							}
							onToggleCustom={() => setAmount('')}
						/>
						<View style={styles.amountRow}>
							<Text style={styles.currencySymbol}>$</Text>
							<TextInput
								style={styles.amountInput}
								value={amount}
								onChangeText={(v) => setAmount(cleanCurrencyToNumberString(v))}
								placeholder="0.00"
								placeholderTextColor="#999"
								keyboardType="decimal-pad"
							/>
						</View>
					</FormInputGroup>

					{/* Frequency */}
					<FormInputGroup
						label="Frequency"
						subtext="Choose how often this repeats"
					>
						<PeriodSelector
							options={FREQUENCIES}
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
							onChange={setNextDueDate}
							title=""
							placeholder="Select next due date"
						/>
					</FormInputGroup>

					{/* Icon Selection */}
					<FormInputGroup label="Choose Icon">
						<IconPicker
							selectedIcon={icon}
							selectedColor={color}
							icons={BUDGET_ICONS}
							onIconSelect={handleIconChange}
							isOpen={showIconPicker}
							onToggle={() => setShowIconPicker(!showIconPicker)}
						/>
					</FormInputGroup>

					{/* Color Selection */}
					<FormInputGroup label="Choose Color">
						<ColorPicker
							selectedColor={color}
							onColorSelect={handleColorChange}
							isOpen={showColorPicker}
							onToggle={() => setShowColorPicker(!showColorPicker)}
						/>
					</FormInputGroup>

					{/* Categories */}
					<FormInputGroup label="Categories" subtext="Select one or more">
						<CategorySelector
							categories={COMMON_CATEGORIES}
							selectedCategories={selectedCategories}
							onToggleCategory={toggleCategory}
						/>
					</FormInputGroup>

					{/* Delete */}
					<DeleteButton
						onPress={handleDelete}
						text="Delete Recurring Expense"
						disabled={loading}
					/>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 0 },
	content: { flex: 1 },
	formContainer: { padding: 16 },
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
	amountRow: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 8,
		backgroundColor: '#ffffff',
		paddingHorizontal: 12,
		marginTop: 12,
	},
	currencySymbol: {
		fontSize: 16,
		fontWeight: '600',
		color: '#0a0a0a',
		marginRight: 6,
	},
	amountInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#0a0a0a' },
	loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
});

export default EditRecurringExpenseScreen;
