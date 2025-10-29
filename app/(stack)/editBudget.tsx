import React, { useState, useEffect, useMemo } from 'react';
import { logger } from '../../src/utils/logger';
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
import { useBudget, Budget } from '../../src/context/budgetContext';
import {
	BUDGET_ICONS,
	BUDGET_AMOUNT_PRESETS,
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
	DeleteButton,
} from '../../src/components/forms';

// Helper to clean currency input
const cleanCurrencyToNumberString = (v: string) =>
	v.replace(/[^\d.]/g, '').replace(/^0+(\d)/, '$1');

// Validate money format (up to 2 decimals, positive)
const isValidMoney = (s: string): boolean => {
	if (!s || s.trim() === '') return false;
	const cleaned = cleanCurrencyToNumberString(s);
	const num = parseFloat(cleaned);
	return !isNaN(num) && num > 0 && /^[0-9]*\.?[0-9]{0,2}$/.test(cleaned);
};

const PERIOD_OPTIONS = [
	{ value: 'monthly', label: 'Monthly', icon: 'calendar-outline' as const },
	{ value: 'weekly', label: 'Weekly', icon: 'time-outline' as const },
];

const EditBudgetScreen: React.FC = () => {
	const params = useLocalSearchParams();
	const budgetId = params.id as string;

	const [name, setName] = useState('');
	const [amount, setAmount] = useState('');
	const [icon, setIcon] =
		useState<keyof typeof Ionicons.glyphMap>(DEFAULT_BUDGET_ICON);
	const [color, setColor] = useState<string>(DEFAULT_COLOR);
	const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [showColorPicker, setShowColorPicker] = useState(false);
	const [showCustomAmount, setShowCustomAmount] = useState(false);
	const [loading, setLoading] = useState(false);
	const [budget, setBudget] = useState<Budget | null>(null);

	const { budgets, updateBudget, deleteBudget } = useBudget();

	// Load budget data when component mounts
	useEffect(() => {
		if (budgetId && budgets.length > 0) {
			const foundBudget = budgets.find((b) => b.id === budgetId);
			if (foundBudget) {
				setBudget(foundBudget);
				setName(foundBudget.name || '');
				setAmount(foundBudget.amount?.toString() || '');
				// Normalize the icon to ensure it's a valid Ionicons name
				const normalizedIcon = normalizeIconName(
					foundBudget.icon || DEFAULT_BUDGET_ICON
				);
				setIcon(normalizedIcon);
				setColor(foundBudget.color || DEFAULT_COLOR);
				setPeriod(foundBudget.period || 'monthly');
				// Auto-detect if custom amount
				const amountStr = foundBudget.amount?.toString() || '';
				const isPreset = BUDGET_AMOUNT_PRESETS.some(
					(preset) => preset.toString() === amountStr
				);
				setShowCustomAmount(!isPreset && amountStr !== '');
			}
		}
	}, [budgetId, budgets]);

	// Memoized validation for save button
	const saveDisabled = useMemo(() => {
		return loading || !name.trim() || !isValidMoney(amount);
	}, [loading, name, amount]);

	const handleSave = async () => {
		// Validation
		if (!name.trim()) {
			Alert.alert('Error', 'Please enter a budget name');
			return;
		}

		if (!isValidMoney(amount)) {
			Alert.alert(
				'Error',
				'Please enter a valid amount (positive number with up to 2 decimals)'
			);
			return;
		}

		if (!budget) return;

		setLoading(true);
		try {
			const parsedAmount = parseFloat(cleanCurrencyToNumberString(amount));

			await updateBudget(budget.id, {
				name: name.trim(),
				amount: parsedAmount,
				icon: normalizeIconName(icon),
				color,
				categories: budget.categories || [],
				period,
				weekStartDay: budget.weekStartDay || 1,
				monthStartDay: budget.monthStartDay || 1,
				rollover: budget.rollover || false,
			});

			Alert.alert('Success', 'Budget updated successfully!', [
				{ text: 'OK', onPress: () => router.back() },
			]);
		} catch (error) {
			logger.error('[EditBudgetScreen] Error updating:', error);
			// More specific error message if available
			const errorMessage =
				(error as any)?.response?.data?.message ||
				'Failed to update budget. Please try again.';
			Alert.alert('Error', errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = () => {
		if (!budget) return;

		Alert.alert(
			'Delete Budget',
			'Are you sure you want to delete this budget? This action cannot be undone.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							logger.debug('🗑️ [EditBudget] Deleting budget:', budget.id);
							await deleteBudget(budget.id);
							logger.debug('✅ [EditBudget] Budget deleted successfully');
							router.back();
						} catch (error) {
							logger.error('❌ [EditBudget] Delete failed:', error);
							const errorMsg =
								error instanceof Error
									? error.message
									: 'Failed to delete budget';
							Alert.alert('Delete Failed', errorMsg);
						}
					},
				},
			]
		);
	};

	const handleToggleCustomAmount = () => {
		setShowCustomAmount(!showCustomAmount);
		if (!showCustomAmount) setAmount('');
	};

	if (!budget) {
		return (
			<SafeAreaView style={styles.container}>
				<FormHeader
					title="Edit Budget"
					onSave={handleSave}
					saveDisabled={true}
					loading={false}
				/>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#007ACC" />
					<Text style={styles.loadingText}>Loading budget...</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<FormHeader
				title="Edit Budget"
				onSave={handleSave}
				saveDisabled={saveDisabled}
				loading={loading}
			/>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.formContainer}>
					{/* Budget Name */}
					<FormInputGroup label="Budget Name">
						<TextInput
							style={styles.textInput}
							value={name}
							onChangeText={setName}
							placeholder="e.g., Groceries, Entertainment"
							placeholderTextColor="#999"
						/>
					</FormInputGroup>

					{/* Amount */}
					<FormInputGroup
						label="Budget Amount"
						subtext="Set your spending limit for this category"
					>
						<AmountPresets
							presets={BUDGET_AMOUNT_PRESETS}
							selectedAmount={amount}
							onPresetSelect={(amt) => {
								setAmount(amt);
								setShowCustomAmount(false);
							}}
							showCustom={showCustomAmount}
							onToggleCustom={handleToggleCustomAmount}
							onCustomAmountChange={(v) =>
								setAmount(cleanCurrencyToNumberString(v))
							}
							customPlaceholder="e.g., 1500"
						/>
					</FormInputGroup>

					{/* Period Selection */}
					<FormInputGroup
						label="Budget Period"
						subtext="Choose how often this budget resets"
					>
						<PeriodSelector
							options={PERIOD_OPTIONS}
							selectedPeriod={period}
							onPeriodSelect={(p) => setPeriod(p as 'weekly' | 'monthly')}
						/>
					</FormInputGroup>

					{/* Icon Selection */}
					<FormInputGroup label="Choose Icon">
						<IconPicker
							selectedIcon={icon}
							selectedColor={color}
							icons={BUDGET_ICONS}
							onIconSelect={setIcon}
							isOpen={showIconPicker}
							onToggle={() => setShowIconPicker(!showIconPicker)}
						/>
					</FormInputGroup>

					{/* Color Selection */}
					<FormInputGroup label="Choose Color">
						<ColorPicker
							selectedColor={color}
							onColorSelect={setColor}
							isOpen={showColorPicker}
							onToggle={() => setShowColorPicker(!showColorPicker)}
						/>
					</FormInputGroup>

					{/* Delete Button */}
					<DeleteButton onPress={handleDelete} text="Delete Budget" />
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
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#666',
	},
});

export default EditBudgetScreen;
