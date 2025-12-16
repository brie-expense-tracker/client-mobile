import React, { useEffect, useMemo, useState } from 'react';
import { logger } from '../../../../src/utils/logger';
import {
	View,
	StyleSheet,
	TextInput,
	ScrollView,
	Alert,
	ActivityIndicator,
	Text,
	TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useBills } from '../../../../src/context/billContext';
import { Bill } from '../../../../src/services';
import { DateField } from '../../../../src/components/DateField';
import {
	BUDGET_ICONS,
	DEFAULT_BUDGET_ICON,
	DEFAULT_COLOR,
	normalizeIconName,
} from '../../../../src/constants/uiConstants';
import {
	FormInputGroup,
	IconPicker,
	ColorPicker,
	AmountPresets,
	PeriodSelector,
} from '../../../../src/components/forms';
import { Page, Section, Card, LoadingState } from '../../../../src/ui';
import {
	palette,
	radius,
	space,
	type as typography,
} from '../../../../src/ui/theme';

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

const EditBillScreen: React.FC = () => {
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
	const [autoPay, setAutoPay] = useState(false);

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
	const [expense, setExpense] = useState<Bill | null>(null);
	const [originalValues, setOriginalValues] = useState<{
		vendor: string;
		amount: string;
		frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
		nextDueDate: string;
		autoPay: boolean;
		icon: keyof typeof Ionicons.glyphMap;
		color: string;
		categories: string[];
	} | null>(null);

	const { expenses, updateBill } = useBills();

	// Load expense data
	useEffect(() => {
		if (patternId && expenses.length > 0) {
			const found = expenses.find((e) => e.patternId === patternId);
			if (found) {
				logger.debug('🔍 [EditBill] Loading bill:', found);
				logger.debug('🎨 [EditBill] Icon/Color from data:');
				logger.debug('  - icon:', found.icon);
				logger.debug('  - color:', found.color);
				logger.debug('  - categories:', found.categories);

				setExpense(found);
				setVendor(found.vendor || '');
				setAmount((Number(found.amount) || 0).toString());
				setFrequency(found.frequency);
				setNextDueDate(found.nextExpectedDate.split('T')[0]);
				setAutoPay((found as any).autoPay || false);

				// Hydrate appearance fields
				const expenseMode = (found as any).appearanceMode || 'brand';
				setAppearanceMode(expenseMode);

				const normalized = normalizeIconName(found.icon || DEFAULT_BUDGET_ICON);
				setIcon(normalized);
				setColor(found.color || DEFAULT_COLOR);
				setSelectedCategories(found.categories || []);

				// Store original values for change detection
				setOriginalValues({
					vendor: found.vendor || '',
					amount: (Number(found.amount) || 0).toString(),
					frequency: found.frequency,
					nextDueDate: found.nextExpectedDate.split('T')[0],
					autoPay: (found as any).autoPay || false,
					icon: normalized,
					color: found.color || DEFAULT_COLOR,
					categories: found.categories || [],
				});

				logger.debug('🎨 [EditBill] Set state to:');
				logger.debug('  - appearanceMode:', expenseMode);
				logger.debug('  - icon:', normalized);
				logger.debug('  - color:', found.color || DEFAULT_COLOR);
				logger.debug('  - categories:', found.categories || []);
			}
		}
	}, [patternId, expenses]);

	// Check if any values have changed
	const hasChanges = useMemo(() => {
		if (!originalValues) return false;

		const normalizedCurrentIcon = normalizeIconName(icon);
		const normalizedOriginalIcon = normalizeIconName(originalValues.icon);

		// Compare amounts as numbers to handle string formatting differences
		const currentAmountNum = parseFloat(cleanCurrencyToNumberString(amount));
		const originalAmountNum = parseFloat(
			cleanCurrencyToNumberString(originalValues.amount)
		);

		// Compare categories arrays
		const currentCategories = [...selectedCategories].sort().join(',');
		const originalCategories = [...originalValues.categories].sort().join(',');

		return (
			vendor.trim() !== originalValues.vendor.trim() ||
			currentAmountNum !== originalAmountNum ||
			frequency !== originalValues.frequency ||
			nextDueDate !== originalValues.nextDueDate ||
			autoPay !== originalValues.autoPay ||
			normalizedCurrentIcon !== normalizedOriginalIcon ||
			color !== originalValues.color ||
			currentCategories !== originalCategories
		);
	}, [
		originalValues,
		vendor,
		amount,
		frequency,
		nextDueDate,
		autoPay,
		icon,
		color,
		selectedCategories,
	]);

	const saveDisabled = useMemo(
		() =>
			loading ||
			!vendor.trim() ||
			!amount.trim() ||
			!validateDate(nextDueDate) ||
			!hasChanges,
		[loading, vendor, amount, nextDueDate, hasChanges]
	);

	// Wrapper to set icon and switch to custom mode
	const handleIconChange = (newIcon: keyof typeof Ionicons.glyphMap) => {
		logger.debug('🎨 [EditBill] User changed icon to:', newIcon);
		setIcon(newIcon);
		setAppearanceMode('custom');
	};

	// Wrapper to set color and switch to custom mode
	const handleColorChange = (newColor: string) => {
		logger.debug('🎨 [EditBill] User changed color to:', newColor);
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

		// Convert YYYY-MM-DD to ISO string with local time at noon to avoid timezone issues
		// Parse as local date first, then convert to ISO
		const [year, month, day] = nextDueDate.split('-').map(Number);
		const localDate = new Date(year, month - 1, day, 12, 0, 0); // noon local time
		const isoDate = localDate.toISOString();

		const updateData = {
			vendor: vendor.trim(),
			amount: amt,
			frequency,
			nextExpectedDate: isoDate,
			autoPay,
			appearanceMode,
			icon: normalizeIconName(icon),
			color,
			categories: selectedCategories,
		};

		logger.debug('🔍 [EditBill] Saving update with data:', updateData);

		setLoading(true);
		try {
			const result = await updateBill(patternId, updateData);

			logger.debug('✅ [EditBill] Update succeeded, result:', result);
			logger.debug('🎨 [EditBill] Checking fields in result:');
			logger.debug('  - appearanceMode:', result.appearanceMode);
			logger.debug('  - icon:', result.icon);
			logger.debug('  - color:', result.color);
			logger.debug('  - categories:', result.categories);

			Alert.alert('Success', 'Bill updated successfully!', [
				{ text: 'OK', onPress: () => router.back() },
			]);
		} catch (err) {
			logger.error('[EditBill] update error:', err);
			Alert.alert('Error', 'Failed to update bill. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	if (!expense) {
		return (
			<Page>
				<LoadingState label="Loading bill…" />
			</Page>
		);
	}

	return (
		<Page>
			<View style={styles.layout}>
				<ScrollView
					style={styles.content}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					<Section title="Details" subtitle="Update the bill information.">
						<Card>
							<View style={styles.form}>
								{/* Vendor */}
								<FormInputGroup label="Vendor Name">
									<TextInput
										style={styles.textInput}
										value={vendor}
										onChangeText={setVendor}
										placeholder="e.g., Netflix, AT&T"
										placeholderTextColor={palette.textSubtle}
										autoCapitalize="words"
									/>
								</FormInputGroup>

								{/* Amount + presets */}
								<FormInputGroup label="Amount">
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
											onChangeText={(v) =>
												setAmount(cleanCurrencyToNumberString(v))
											}
											placeholder="0.00"
											placeholderTextColor={palette.textSubtle}
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
										onChange={setNextDueDate}
										title=""
										placeholder="Select next due date"
									/>
								</FormInputGroup>

								{/* Auto Pay Toggle */}
								<FormInputGroup
									label="Payment Method"
									subtext={
										autoPay
											? 'Bill will be automatically inputted as a transaction when due'
											: 'You will manually mark this bill as paid'
									}
								>
									<View style={styles.toggleRow}>
										<Text style={styles.toggleLabel}>
											{autoPay ? 'Automatic' : 'Manual'}
										</Text>
										<TouchableOpacity
											style={[styles.toggle, autoPay && styles.toggleActive]}
											onPress={() => setAutoPay(!autoPay)}
											activeOpacity={0.7}
										>
											<View
												style={[
													styles.toggleThumb,
													autoPay && styles.toggleThumbActive,
												]}
											/>
										</TouchableOpacity>
									</View>
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
								<ColorPicker
									selectedColor={color}
									onColorSelect={handleColorChange}
									isOpen={showColorPicker}
									onToggle={() => setShowColorPicker(!showColorPicker)}
								/>
							</View>
						</Card>
					</Section>
				</ScrollView>

				{/* Footer Save CTA */}
				<View style={styles.footer}>
					<View style={styles.footerCta}>
						<View style={styles.footerRow}>
							<TouchableOpacity
								onPress={() => router.back()}
								style={styles.footerCancelButton}
							>
								<Text style={styles.footerCancel}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={saveDisabled ? undefined : handleSave}
								style={[
									styles.footerSaveButton,
									saveDisabled && styles.footerSaveButtonDisabled,
								]}
								disabled={saveDisabled}
								activeOpacity={0.85}
							>
								{loading ? (
									<ActivityIndicator
										color={palette.primaryTextOn}
										size="small"
									/>
								) : (
									<Text style={styles.footerSave}>Save changes</Text>
								)}
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</View>
		</Page>
	);
};

const styles = StyleSheet.create({
	layout: {
		flex: 1,
	},
	content: {
		flex: 1,
	},
	scrollContent: {
		gap: space.lg,
		paddingBottom: space.xl,
	},
	form: {
		gap: space.md,
	},
	textInput: {
		borderWidth: 1,
		borderColor: palette.border,
		borderRadius: radius.md,
		paddingHorizontal: space.md,
		paddingVertical: space.md,
		fontSize: 16,
		color: palette.text,
		backgroundColor: palette.surface ?? '#FFFFFF',
	},
	amountRow: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: palette.border,
		borderRadius: radius.md,
		backgroundColor: palette.surface ?? '#FFFFFF',
		paddingHorizontal: space.md,
		marginTop: space.md,
	},
	currencySymbol: {
		fontSize: 16,
		fontWeight: '600',
		color: palette.text,
		marginRight: 6,
	},
	amountInput: {
		flex: 1,
		paddingVertical: space.md,
		fontSize: 16,
		color: palette.text,
	},
	toggleRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	toggleLabel: {
		fontSize: 16,
		fontWeight: '500',
		color: palette.text,
	},
	toggle: {
		width: 50,
		height: 30,
		borderRadius: 15,
		backgroundColor: palette.border,
		justifyContent: 'center',
		paddingHorizontal: 2,
	},
	toggleActive: {
		backgroundColor: palette.primary,
	},
	toggleThumb: {
		width: 26,
		height: 26,
		borderRadius: 13,
		backgroundColor: '#ffffff',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 2,
		elevation: 2,
	},
	toggleThumbActive: {
		transform: [{ translateX: 20 }],
	},
	footer: {
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: palette.border,
		backgroundColor: palette.bg,
		paddingHorizontal: space.lg,
		paddingVertical: space.md,
	},
	footerCta: {
		gap: 8,
	},
	footerLabel: {
		...typography.bodyXs,
		color: palette.textMuted,
	},
	footerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: space.md,
	},
	footerCancelButton: {
		paddingVertical: space.sm,
	},
	footerCancel: {
		...typography.bodySm,
		color: palette.textMuted,
	},
	footerSaveButton: {
		flex: 1,
		height: 52,
		borderRadius: radius.lg,
		backgroundColor: palette.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	footerSaveButtonDisabled: {
		opacity: 0.6,
	},
	footerSave: {
		...typography.bodySm,
		color: palette.primaryTextOn,
		fontWeight: '600',
	},
});

export default EditBillScreen;
