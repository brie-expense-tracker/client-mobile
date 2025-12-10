import React, { useState, useEffect, useMemo } from 'react';
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
import { useBudget, Budget } from '../../../../src/context/budgetContext';
import {
	BUDGET_ICONS,
	BUDGET_AMOUNT_PRESETS,
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
	BudgetPeriodDetails,
} from '../../../../src/components/forms';
import { Page, Section, Card, LoadingState } from '../../../../src/ui';
import {
	palette,
	radius,
	space,
	type as typography,
} from '../../../../src/ui/theme';

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
	const [rollover, setRollover] = useState(false);
	const [weekStartDay, setWeekStartDay] = useState<0 | 1>(1);
	const [monthStartDay, setMonthStartDay] = useState<
		| 1
		| 2
		| 3
		| 4
		| 5
		| 6
		| 7
		| 8
		| 9
		| 10
		| 11
		| 12
		| 13
		| 14
		| 15
		| 16
		| 17
		| 18
		| 19
		| 20
		| 21
		| 22
		| 23
		| 24
		| 25
		| 26
		| 27
		| 28
	>(1);
	const [categories, setCategories] = useState<string[]>([]);
	const [originalValues, setOriginalValues] = useState<{
		name: string;
		amount: string;
		icon: keyof typeof Ionicons.glyphMap;
		color: string;
		period: 'weekly' | 'monthly';
		rollover: boolean;
		weekStartDay: 0 | 1;
		monthStartDay:
			| 1
			| 2
			| 3
			| 4
			| 5
			| 6
			| 7
			| 8
			| 9
			| 10
			| 11
			| 12
			| 13
			| 14
			| 15
			| 16
			| 17
			| 18
			| 19
			| 20
			| 21
			| 22
			| 23
			| 24
			| 25
			| 26
			| 27
			| 28;
		categories: string[];
	} | null>(null);

	const { budgets, updateBudget } = useBudget();

	// Load budget data when component mounts
	useEffect(() => {
		if (budgetId && budgets.length > 0) {
			const foundBudget = budgets.find((b) => b.id === budgetId);
			if (foundBudget) {
				setBudget(foundBudget);
				const budgetName = foundBudget.name || '';
				const budgetAmount = foundBudget.amount?.toString() || '';
				// Normalize the icon to ensure it's a valid Ionicons name
				const normalizedIcon = normalizeIconName(
					foundBudget.icon || DEFAULT_BUDGET_ICON
				);
				const budgetColor = foundBudget.color || DEFAULT_COLOR;
				const budgetPeriod = foundBudget.period || 'monthly';

				setName(budgetName);
				setAmount(budgetAmount);
				setIcon(normalizedIcon);
				setColor(budgetColor);
				setPeriod(budgetPeriod);
				setRollover(Boolean(foundBudget.rollover));
				setWeekStartDay((foundBudget.weekStartDay as 0 | 1) ?? 1);
				setMonthStartDay(
					(foundBudget.monthStartDay as
						| 1
						| 2
						| 3
						| 4
						| 5
						| 6
						| 7
						| 8
						| 9
						| 10
						| 11
						| 12
						| 13
						| 14
						| 15
						| 16
						| 17
						| 18
						| 19
						| 20
						| 21
						| 22
						| 23
						| 24
						| 25
						| 26
						| 27
						| 28) ?? 1
				);
				setCategories(foundBudget.categories || []);

				// Store original values for change detection
				setOriginalValues({
					name: budgetName,
					amount: budgetAmount,
					icon: normalizedIcon,
					color: budgetColor,
					period: budgetPeriod,
					rollover: Boolean(foundBudget.rollover),
					weekStartDay: (foundBudget.weekStartDay as 0 | 1) ?? 1,
					monthStartDay:
						(foundBudget.monthStartDay as
							| 1
							| 2
							| 3
							| 4
							| 5
							| 6
							| 7
							| 8
							| 9
							| 10
							| 11
							| 12
							| 13
							| 14
							| 15
							| 16
							| 17
							| 18
							| 19
							| 20
							| 21
							| 22
							| 23
							| 24
							| 25
							| 26
							| 27
							| 28) ?? 1,
					categories: foundBudget.categories || [],
				});

				// Auto-detect if custom amount
				const amountStr = foundBudget.amount?.toString() || '';
				const isPreset = BUDGET_AMOUNT_PRESETS.some(
					(preset) => preset.toString() === amountStr
				);
				setShowCustomAmount(!isPreset && amountStr !== '');
			}
		}
	}, [budgetId, budgets]);

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

		const categoriesChanged =
			categories.length !== originalValues.categories.length ||
			categories.some((cat, idx) => cat !== originalValues.categories[idx]);

		return (
			name.trim() !== originalValues.name.trim() ||
			currentAmountNum !== originalAmountNum ||
			normalizedCurrentIcon !== normalizedOriginalIcon ||
			color !== originalValues.color ||
			period !== originalValues.period ||
			rollover !== originalValues.rollover ||
			weekStartDay !== originalValues.weekStartDay ||
			monthStartDay !== originalValues.monthStartDay ||
			categoriesChanged
		);
	}, [
		originalValues,
		name,
		amount,
		icon,
		color,
		period,
		rollover,
		weekStartDay,
		monthStartDay,
		categories,
	]);

	// Memoized validation for save button
	const saveDisabled = useMemo(() => {
		return loading || !name.trim() || !isValidMoney(amount) || !hasChanges;
	}, [loading, name, amount, hasChanges]);

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
				categories,
				period,
				weekStartDay,
				monthStartDay,
				rollover,
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

	const handleToggleCustomAmount = () => {
		setShowCustomAmount(!showCustomAmount);
		if (!showCustomAmount) setAmount('');
	};

	// When budget isn't loaded yet
	if (!budget) {
		return (
			<Page>
				<LoadingState label="Loading budget…" />
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
					<Section
						title="Details"
						subtitle="Update the basics for this budget."
					>
						<Card>
							<View style={styles.form}>
								{/* Budget Name */}
								<FormInputGroup label="Budget Name">
									<TextInput
										style={styles.textInput}
										value={name}
										onChangeText={setName}
										placeholder="e.g., Groceries, Entertainment"
										placeholderTextColor={palette.textSubtle}
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

								{/* Period details (start day) */}
								{(period === 'weekly' || period === 'monthly') && (
									<BudgetPeriodDetails
										period={period}
										weekStartDay={weekStartDay}
										monthStartDay={monthStartDay}
										onWeekStartChange={setWeekStartDay}
										onMonthStartChange={setMonthStartDay}
									/>
								)}

								{/* Icon Selection */}
								<FormInputGroup label="Icon">
									<IconPicker
										selectedIcon={icon}
										selectedColor={color}
										icons={BUDGET_ICONS}
										onIconSelect={setIcon}
										isOpen={showIconPicker}
										onToggle={() => setShowIconPicker((prev) => !prev)}
									/>
								</FormInputGroup>

								{/* Color Selection */}
								<FormInputGroup label="Color">
									<ColorPicker
										selectedColor={color}
										onColorSelect={setColor}
										isOpen={showColorPicker}
										onToggle={() => setShowColorPicker((prev) => !prev)}
									/>
								</FormInputGroup>

								{/* Rollover toggle */}
								<FormInputGroup
									label="Rollover unspent funds"
									subtext="Carry over unspent money into the next period."
								>
									<TouchableOpacity
										style={styles.toggleContainer}
										onPress={() => setRollover((prev) => !prev)}
										activeOpacity={0.9}
									>
										<View style={styles.toggleContent}>
											<Text style={[typography.bodySm, styles.toggleText]}>
												{rollover ? 'Enabled' : 'Disabled'}
											</Text>
											<View
												style={[
													styles.toggleSwitch,
													rollover && styles.toggleSwitchActive,
												]}
											>
												<View
													style={[
														styles.toggleThumb,
														rollover && styles.toggleThumbActive,
													]}
												/>
											</View>
										</View>
									</TouchableOpacity>
								</FormInputGroup>
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
	toggleContainer: {
		backgroundColor: palette.surface,
		borderRadius: radius.lg,
		padding: space.md,
		borderWidth: 1,
		borderColor: palette.border,
	},
	toggleContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	toggleText: {
		color: palette.text,
	},
	toggleSwitch: {
		width: 46,
		height: 28,
		borderRadius: radius.pill,
		backgroundColor: palette.subtle,
		justifyContent: 'center',
		paddingHorizontal: 2,
	},
	toggleSwitchActive: {
		backgroundColor: palette.primary,
	},
	toggleThumb: {
		width: 22,
		height: 22,
		borderRadius: radius.pill,
		backgroundColor: palette.bg,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.12,
		shadowRadius: 2,
		elevation: 2,
	},
	toggleThumbActive: {
		transform: [{ translateX: 18 }],
	},
});

export default EditBudgetScreen;
