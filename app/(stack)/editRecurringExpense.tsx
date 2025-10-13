import React, { useEffect, useMemo, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useRecurringExpenses } from '../../src/hooks/useRecurringExpenses';
import { RecurringExpense } from '../../src/services';
import { DateField } from '../../src/components/DateField';

// Reuse UI constants for consistency
import {
	COLOR_PALETTE,
	BUDGET_ICONS,
	DEFAULT_BUDGET_ICON,
	DEFAULT_COLOR,
	normalizeIconName,
} from '../../src/constants/uiConstants';

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

const cleanCurrencyToNumberString = (v: string) =>
	v.replace(/[^\d.]/g, '').replace(/^0+(\d)/, '$1');

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
	const [icon, setIcon] =
		useState<keyof typeof Ionicons.glyphMap>(DEFAULT_BUDGET_ICON);
	const [color, setColor] = useState<string>(DEFAULT_COLOR);
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [showColorPicker, setShowColorPicker] = useState(false);
	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

	const [loading, setLoading] = useState(false);
	const [expense, setExpense] = useState<RecurringExpense | null>(null);

	const { expenses, updateRecurringExpense, deleteRecurringExpense } =
		useRecurringExpenses();

	// Load expense data
	useEffect(() => {
		if (patternId && expenses.length > 0) {
			const found = expenses.find((e) => e.patternId === patternId);
			if (found) {
				setExpense(found);
				setVendor(found.vendor || '');
				setAmount((Number(found.amount) || 0).toString());
				setFrequency(found.frequency);
				setNextDueDate(found.nextExpectedDate.split('T')[0]);

				// Hydrate new fields safely if present in backend
				const normalized = normalizeIconName(
					(found as any).icon || DEFAULT_BUDGET_ICON
				);
				setIcon(normalized);
				setColor((found as any).color || DEFAULT_COLOR);
				setSelectedCategories((found as any).categories || []);
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

	const handleSave = async () => {
		const amt = parseFloat(cleanCurrencyToNumberString(amount));
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

		setLoading(true);
		try {
			await updateRecurringExpense(patternId, {
				vendor: vendor.trim(),
				amount: amt,
				frequency,
				nextExpectedDate: nextDueDate,
				// Pass-through for API that supports visual metadata
				icon: normalizeIconName(icon),
				color,
				categories: selectedCategories,
			} as any);

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
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.back()}
					>
						<Ionicons name="chevron-back" size={24} color="#007ACC" />
					</TouchableOpacity>
					<Text style={styles.screenTitle}>Edit Recurring Expense</Text>
					<View style={styles.placeholderButton} />
				</View>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#007ACC" />
					<Text style={styles.loadingText}>Loading expense...</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
				>
					<Ionicons name="chevron-back" size={24} color="#007ACC" />
				</TouchableOpacity>
				<Text style={styles.screenTitle}>Edit Recurring Expense</Text>
				<TouchableOpacity
					onPress={handleSave}
					style={[styles.saveButton, saveDisabled && styles.saveButtonDisabled]}
					disabled={saveDisabled}
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
					{/* Vendor */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Vendor Name</Text>
						<TextInput
							style={styles.textInput}
							value={vendor}
							onChangeText={setVendor}
							placeholder="e.g., Netflix, AT&T"
							placeholderTextColor="#999"
							autoCapitalize="words"
						/>
					</View>

					{/* Amount + presets */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Amount</Text>
						<Text style={styles.subtext}>
							Set the billed amount for this subscription
						</Text>

						<View style={styles.presetsContainer}>
							{AMOUNT_PRESETS.map((p) => {
								const s = p.toString();
								const selected = amount === s;
								return (
									<TouchableOpacity
										key={s}
										style={[styles.preset, selected && styles.selectedPreset]}
										onPress={() => setAmount(s)}
									>
										<Text
											style={[
												styles.presetText,
												selected && styles.selectedPresetText,
											]}
										>
											${p}
										</Text>
									</TouchableOpacity>
								);
							})}
							<TouchableOpacity
								style={[
									styles.preset,
									!(AMOUNT_PRESETS as readonly number[]).includes(
										Number(amount)
									) &&
										amount !== '' &&
										styles.selectedPreset,
								]}
								onPress={() => setAmount('')}
							>
								<Text
									style={[
										styles.presetText,
										!(AMOUNT_PRESETS as readonly number[]).includes(
											Number(amount)
										) &&
											amount !== '' &&
											styles.selectedPresetText,
									]}
								>
									Custom
								</Text>
							</TouchableOpacity>
						</View>

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
					</View>

					{/* Frequency */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Frequency</Text>
						<Text style={styles.subtext}>Choose how often this repeats</Text>

						<View style={styles.periodContainer}>
							{FREQUENCIES.map((f) => {
								const selected = frequency === f.value;
								return (
									<TouchableOpacity
										key={f.value}
										style={[
											styles.periodOption,
											selected && styles.selectedPeriodOption,
										]}
										onPress={() => setFrequency(f.value)}
									>
										<View style={styles.periodOptionContent}>
											<Ionicons
												name={f.icon}
												size={20}
												color={selected ? '#fff' : '#007ACC'}
											/>
											<Text
												style={[
													styles.periodOptionText,
													selected && styles.selectedPeriodOptionText,
												]}
											>
												{f.label}
											</Text>
										</View>
									</TouchableOpacity>
								);
							})}
						</View>
					</View>

					{/* Next Due Date */}
					<View style={styles.inputGroup}>
						<DateField
							value={nextDueDate}
							onChange={setNextDueDate}
							title="Next Due Date"
							placeholder="Select next due date"
							minDate={new Date().toISOString().split('T')[0]}
						/>
					</View>

					{/* Icon Selection */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Choose Icon</Text>
						<TouchableOpacity
							style={styles.iconButton}
							onPress={() => setShowIconPicker(!showIconPicker)}
						>
							<View style={styles.iconButtonContent}>
								<View
									style={[
										styles.iconPreview,
										{ backgroundColor: color + '20' },
									]}
								>
									<Ionicons
										name={normalizeIconName(icon)}
										size={20}
										color={color}
									/>
								</View>
								<Text style={styles.iconButtonText}>Choose Icon</Text>
								<Ionicons
									name={showIconPicker ? 'chevron-up' : 'chevron-down'}
									size={20}
									color="#757575"
								/>
							</View>
						</TouchableOpacity>

						{showIconPicker && (
							<View style={styles.iconGrid}>
								{BUDGET_ICONS.map((iconName) => (
									<TouchableOpacity
										key={iconName}
										style={[
											styles.iconOption,
											icon === iconName && { backgroundColor: color },
										]}
										onPress={() => {
											setIcon(normalizeIconName(iconName));
											setShowIconPicker(false);
										}}
									>
										<Ionicons
											name={iconName}
											size={24}
											color={icon === iconName ? 'white' : color}
										/>
									</TouchableOpacity>
								))}
							</View>
						)}
					</View>

					{/* Color Selection */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Choose Color</Text>
						<TouchableOpacity
							style={styles.colorButton}
							onPress={() => setShowColorPicker(!showColorPicker)}
						>
							<View style={styles.colorButtonContent}>
								<View
									style={[styles.colorPreview, { backgroundColor: color }]}
								/>
								<Text style={styles.colorButtonText}>Choose Color</Text>
								<Ionicons
									name={showColorPicker ? 'chevron-up' : 'chevron-down'}
									size={20}
									color="#757575"
								/>
							</View>
						</TouchableOpacity>

						{showColorPicker && (
							<View style={styles.colorGrid}>
								{Object.entries(COLOR_PALETTE).map(([name, colors]) => (
									<View key={name} style={styles.colorColumn}>
										<TouchableOpacity
											style={styles.colorOptionContainer}
											onPress={() => {
												setColor(colors.base);
												setShowColorPicker(false);
											}}
										>
											<View
												style={[
													styles.colorSquare,
													{ backgroundColor: colors.base },
												]}
											>
												{color === colors.base && (
													<View style={styles.selectedIndicator}>
														<Ionicons name="checkmark" size={20} color="#FFF" />
													</View>
												)}
											</View>
										</TouchableOpacity>
										<TouchableOpacity
											style={styles.colorOptionContainer}
											onPress={() => {
												setColor(colors.pastel);
												setShowColorPicker(false);
											}}
										>
											<View
												style={[
													styles.colorSquare,
													{ backgroundColor: colors.pastel },
												]}
											>
												{color === colors.pastel && (
													<View style={styles.selectedIndicator}>
														<Ionicons name="checkmark" size={20} color="#000" />
													</View>
												)}
											</View>
										</TouchableOpacity>
										<TouchableOpacity
											style={styles.colorOptionContainer}
											onPress={() => {
												setColor(colors.dark);
												setShowColorPicker(false);
											}}
										>
											<View
												style={[
													styles.colorSquare,
													{ backgroundColor: colors.dark },
												]}
											>
												{color === colors.dark && (
													<View style={styles.selectedIndicator}>
														<Ionicons name="checkmark" size={20} color="#FFF" />
													</View>
												)}
											</View>
										</TouchableOpacity>
									</View>
								))}
							</View>
						)}
					</View>

					{/* Categories */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Categories</Text>
						<Text style={styles.subtext}>Select one or more</Text>
						<View style={styles.chipsWrap}>
							{COMMON_CATEGORIES.map((c) => {
								const selected = selectedCategories.includes(c);
								return (
									<TouchableOpacity
										key={c}
										style={[styles.chip, selected && styles.chipSelected]}
										onPress={() => toggleCategory(c)}
									>
										<Text
											style={[
												styles.chipText,
												selected && styles.chipTextSelected,
											]}
										>
											{c}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>
					</View>

					{/* Delete */}
					<TouchableOpacity
						style={styles.deleteButton}
						onPress={handleDelete}
						disabled={loading}
					>
						<Ionicons name="trash-outline" size={20} color="#E53935" />
						<Text style={styles.deleteButtonText}>
							Delete Recurring Expense
						</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	// Frame
	container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 0 },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
		backgroundColor: '#ffffff',
	},
	backButton: { flexDirection: 'row', alignItems: 'center' },
	screenTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#0a0a0a',
		flex: 1,
		textAlign: 'center',
	},
	placeholderButton: { width: 60 },
	saveButton: {
		backgroundColor: '#18181b',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 16,
	},
	saveButtonDisabled: { backgroundColor: '#a1a1aa' },
	saveButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },

	content: { flex: 1 },
	formContainer: { padding: 16 },

	// Inputs
	inputGroup: { marginBottom: 24 },
	label: {
		fontSize: 17,
		fontWeight: '700',
		color: '#0a0a0a',
		marginBottom: 8,
	},
	subtext: {
		fontSize: 12,
		fontWeight: '500',
		color: '#757575',
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

	// Presets
	presetsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 12,
	},
	preset: {
		padding: 12,
		borderRadius: 8,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	selectedPreset: { borderColor: '#00a2ff', backgroundColor: '#f0f9ff' },
	presetText: { fontSize: 16, fontWeight: '600', color: '#212121' },
	selectedPresetText: { color: '#00a2ff', fontWeight: '600' },

	// Amount row
	amountRow: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 8,
		backgroundColor: '#ffffff',
		paddingHorizontal: 12,
	},
	currencySymbol: {
		fontSize: 16,
		fontWeight: '600',
		color: '#0a0a0a',
		marginRight: 6,
	},
	amountInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#0a0a0a' },

	// Frequency
	periodContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
	periodOption: {
		flexGrow: 1,
		padding: 16,
		borderRadius: 12,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#E0E0E0',
		minWidth: '47%',
	},
	selectedPeriodOption: { borderColor: '#007ACC', backgroundColor: '#007ACC' },
	periodOptionContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	periodOptionText: { fontSize: 16, fontWeight: '600', color: '#212121' },
	selectedPeriodOptionText: { color: '#fff', fontWeight: '600' },

	// Icon picker
	iconButton: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16 },
	iconButtonContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	iconPreview: {
		width: 24,
		height: 24,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		justifyContent: 'center',
		alignItems: 'center',
	},
	iconButtonText: { fontSize: 16, color: '#212121', flex: 1, marginLeft: 12 },
	iconGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginTop: 8,
	},
	iconOption: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'white',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},

	// Color picker
	colorButton: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16 },
	colorButtonContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	colorPreview: {
		width: 24,
		height: 24,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	colorButtonText: { fontSize: 16, color: '#212121', flex: 1, marginLeft: 12 },
	colorGrid: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 2,
		paddingRight: 10,
	},
	colorColumn: { alignItems: 'center' },
	colorOptionContainer: { width: 36, height: 36, marginBottom: 4 },
	colorSquare: {
		width: '100%',
		height: '100%',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	selectedIndicator: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0, 0, 0, 0.2)',
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},

	// Category chips
	chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	chip: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 16,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	chipSelected: { backgroundColor: '#f0f9ff', borderColor: '#00a2ff' },
	chipText: { color: '#212121', fontWeight: '600' },
	chipTextSelected: { color: '#00a2ff', fontWeight: '700' },

	// Delete + Loading
	deleteButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
		borderColor: '#E53935',
		borderWidth: 1,
		borderRadius: 12,
		padding: 16,
		marginTop: 24,
		gap: 8,
	},
	deleteButtonText: { color: '#E53935', fontSize: 16, fontWeight: '600' },
	loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
});

export default EditRecurringExpenseScreen;
