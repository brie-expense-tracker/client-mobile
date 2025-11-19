import React, { useState } from 'react';
import {
	View,
	StyleSheet,
	TextInput,
	ScrollView,
	Alert,
	Text,
	TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useBudget } from '../../../src/context/budgetContext';
import { createLogger } from '../../../src/utils/sublogger';
import { isDevMode } from '../../../src/config/environment';
import {
	BUDGET_ICONS,
	BUDGET_AMOUNT_PRESETS,
	DEFAULT_BUDGET_ICON,
	DEFAULT_COLOR,
} from '../../../src/constants/uiConstants';
import {
	FormHeader,
	FormInputGroup,
	IconPicker,
	ColorPicker,
	AmountPresets,
	PeriodSelector,
} from '../../../src/components/forms';
import { palette, radius, space, type } from '../../../src/ui/theme';

const addBudgetLog = createLogger('AddBudget');

const PERIOD_OPTIONS = [
	{ value: 'monthly', label: 'Monthly', icon: 'calendar-outline' as const },
	{ value: 'weekly', label: 'Weekly', icon: 'time-outline' as const },
];

const AddBudgetScreen: React.FC = () => {
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
	const [newCategory, setNewCategory] = useState('');
	const [categories, setCategories] = useState<string[]>([]);
	const [showCategoriesPicker, setShowCategoriesPicker] = useState(false);

	const { addBudget } = useBudget();

	const handleSave = async () => {
		if (!name.trim() || !amount.trim()) {
			Alert.alert('Error', 'Please fill in all required fields');
			return;
		}

		const amountValue = parseFloat(amount);
		if (isNaN(amountValue) || amountValue <= 0) {
			Alert.alert('Error', 'Please enter a valid amount greater than 0');
			return;
		}

		setLoading(true);
		try {
			if (isDevMode) {
				addBudgetLog.debug('Creating new budget');
			}
			const newBudget = await addBudget({
				name: name.trim(),
				amount: amountValue,
				icon,
				color,
				categories,
				period,
				weekStartDay,
				monthStartDay,
				rollover,
			});

			if (isDevMode) {
				addBudgetLog.info('Budget created successfully', {
					budgetId: newBudget.id,
				});
				addBudgetLog.debug(
					'Navigating back - useFocusEffect will handle refetch'
				);
			}

			router.back();

			setTimeout(() => {
				Alert.alert('Success', 'Budget added successfully!');
			}, 300);
		} catch (error) {
			addBudgetLog.error('Error saving budget', error);

			let errorMessage = 'Failed to create budget. Please try again.';
			if (error instanceof Error) {
				if (error.message.includes('already have a budget for')) {
					errorMessage = error.message;
				} else if (error.message.includes('already exists')) {
					errorMessage = error.message;
				} else if (error.message.includes('duplicate')) {
					errorMessage =
						'A budget with this name already exists. Please choose a different name.';
				}
			}

			Alert.alert('Error', errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const handleToggleCustomAmount = () => {
		setShowCustomAmount(!showCustomAmount);
		if (!showCustomAmount) setAmount('');
	};

	return (
		<SafeAreaView style={styles.safeArea} edges={['top']}>
			<View style={styles.container}>
				<FormHeader
					title="Add New Budget"
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
						{/* Budget Name */}
						<FormInputGroup label="Budget Name">
							<TextInput
								style={[type.body, styles.textInput]}
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
								onCustomAmountChange={setAmount}
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

						{/* Rollover Toggle */}
						<FormInputGroup
							label="Rollover Unspent Funds"
							subtext="Carry over unspent money to the next period"
						>
							<TouchableOpacity
								style={styles.toggleContainer}
								onPress={() => setRollover(!rollover)}
								activeOpacity={0.9}
							>
								<View style={styles.toggleContent}>
									<Text style={[type.body, styles.toggleText]}>
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

						{/* Week Start Day (for weekly budgets) */}
						{period === 'weekly' && (
							<FormInputGroup
								label="Week Starts On"
								subtext="Choose which day your week begins"
							>
								<View style={styles.dayContainer}>
									<TouchableOpacity
										style={[
											styles.dayOption,
											weekStartDay === 0 && styles.selectedDayOption,
										]}
										onPress={() => setWeekStartDay(0)}
										activeOpacity={0.9}
									>
										<Text
											style={[
												type.body,
												styles.dayOptionText,
												weekStartDay === 0 && styles.selectedDayOptionText,
											]}
										>
											Sunday
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[
											styles.dayOption,
											weekStartDay === 1 && styles.selectedDayOption,
										]}
										onPress={() => setWeekStartDay(1)}
										activeOpacity={0.9}
									>
										<Text
											style={[
												type.body,
												styles.dayOptionText,
												weekStartDay === 1 && styles.selectedDayOptionText,
											]}
										>
											Monday
										</Text>
									</TouchableOpacity>
								</View>
							</FormInputGroup>
						)}

						{/* Month Start Day (for monthly budgets) */}
						{period === 'monthly' && (
							<FormInputGroup
								label="Month Starts On Day"
								subtext="Choose which day of the month your budget resets"
							>
								<View style={styles.monthDayContainer}>
									{Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
										<TouchableOpacity
											key={day}
											style={[
												styles.monthDayOption,
												monthStartDay === day && styles.selectedMonthDayOption,
											]}
											onPress={() => setMonthStartDay(day as any)}
											activeOpacity={0.9}
										>
											<Text
												style={[
													type.small,
													styles.monthDayOptionText,
													monthStartDay === day &&
														styles.selectedMonthDayOptionText,
												]}
											>
												{day}
											</Text>
										</TouchableOpacity>
									))}
								</View>
							</FormInputGroup>
						)}

						{/* Categories Selection */}
						<FormInputGroup
							label="Categories (Optional)"
							subtext="Add categories to help organize your budget"
						>
							<View style={styles.categoriesCard}>
								<TouchableOpacity
									style={styles.categoriesHeader}
									onPress={() => setShowCategoriesPicker(!showCategoriesPicker)}
									activeOpacity={0.9}
								>
									<View style={styles.categoriesHeaderTextWrapper}>
										<Text style={[type.body, styles.categoriesHeaderText]}>
											{categories.length > 0
												? `${categories.length} categor${
														categories.length === 1 ? 'y' : 'ies'
												  } selected`
												: 'Add categories'}
										</Text>

										{categories.length > 0 && (
											<View style={styles.categoriesPreviewChips}>
												{categories.slice(0, 2).map((category, index) => (
													<View key={index} style={styles.categoryChipMini}>
														<Text
															style={[type.small, styles.categoryChipMiniText]}
														>
															{category}
														</Text>
													</View>
												))}
												{categories.length > 2 && (
													<Text style={[type.small, styles.moreCategoriesText]}>
														+{categories.length - 2} more
													</Text>
												)}
											</View>
										)}
									</View>

									<Ionicons
										name={showCategoriesPicker ? 'chevron-up' : 'chevron-down'}
										size={20}
										color={palette.textSubtle}
									/>
								</TouchableOpacity>

								{showCategoriesPicker && (
									<View style={styles.categoriesBody}>
										<View style={styles.categoryInputRow}>
											<Ionicons
												name="add-circle-outline"
												size={18}
												color={palette.textSubtle}
												style={{ marginRight: 6 }}
											/>
											<TextInput
												style={[type.body, styles.categoryInput]}
												value={newCategory}
												onChangeText={setNewCategory}
												placeholder="Enter category name"
												placeholderTextColor={palette.textSubtle}
												returnKeyType="done"
												onSubmitEditing={() => {
													const category = newCategory.trim();
													if (category && !categories.includes(category)) {
														setCategories([...categories, category]);
													}
													setNewCategory('');
												}}
											/>
										</View>

										{categories.length > 0 && (
											<View style={styles.categoriesList}>
												{categories.map((category, index) => (
													<View key={index} style={styles.categoryChip}>
														<Text style={[type.small, styles.categoryChipText]}>
															{category}
														</Text>
														<TouchableOpacity
															onPress={() =>
																setCategories(
																	categories.filter((_, i) => i !== index)
																)
															}
															hitSlop={{
																top: 4,
																bottom: 4,
																left: 4,
																right: 4,
															}}
														>
															<Ionicons
																name="close"
																size={14}
																color={palette.textSubtle}
															/>
														</TouchableOpacity>
													</View>
												))}
											</View>
										)}
									</View>
								)}
							</View>
						</FormInputGroup>
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
	dayContainer: {
		flexDirection: 'row',
		gap: space.sm,
	},
	dayOption: {
		flex: 1,
		paddingVertical: space.md,
		borderRadius: radius.lg,
		backgroundColor: palette.surface,
		borderWidth: 1,
		borderColor: palette.border,
		alignItems: 'center',
	},
	selectedDayOption: {
		borderColor: palette.primary,
		backgroundColor: palette.primarySubtle,
	},
	dayOptionText: {
		color: palette.text,
	},
	selectedDayOptionText: {
		color: palette.primary,
		fontWeight: '600',
	},
	monthDayContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: space.xs,
	},
	monthDayOption: {
		width: 38,
		height: 38,
		borderRadius: radius.pill,
		backgroundColor: palette.surface,
		borderWidth: 1,
		borderColor: palette.border,
		alignItems: 'center',
		justifyContent: 'center',
	},
	selectedMonthDayOption: {
		borderColor: palette.primary,
		backgroundColor: palette.primarySubtle,
	},
	monthDayOptionText: {
		color: palette.text,
	},
	selectedMonthDayOptionText: {
		color: palette.primary,
		fontWeight: '600',
	},
	categoriesCard: {
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: palette.border,
		backgroundColor: palette.surface,
		overflow: 'hidden',
	},
	categoriesHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: space.md,
		paddingVertical: space.md,
	},
	categoriesHeaderTextWrapper: {
		flex: 1,
		marginRight: space.sm,
	},
	categoriesHeaderText: {
		color: palette.text,
	},
	categoriesPreviewChips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: 4,
		gap: 4,
	},
	categoryChipMini: {
		paddingHorizontal: space.xs,
		paddingVertical: 2,
		borderRadius: radius.pill,
		backgroundColor: palette.chipBg,
	},
	categoryChipMiniText: {
		color: palette.textMuted,
	},
	moreCategoriesText: {
		color: palette.textMuted,
	},
	categoriesBody: {
		borderTopWidth: 1,
		borderTopColor: palette.borderMuted,
		paddingHorizontal: space.md,
		paddingBottom: space.md,
		paddingTop: space.sm,
		backgroundColor: palette.surfaceAlt,
	},
	categoryInputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: palette.border,
		paddingHorizontal: space.sm,
		paddingVertical: space.xs,
		backgroundColor: palette.surface,
		marginBottom: space.sm,
	},
	categoryInput: {
		flex: 1,
		paddingVertical: space.sm,
		color: palette.text,
	},
	categoriesList: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: space.xs,
	},
	categoryChip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: palette.primarySubtle,
		paddingHorizontal: space.sm,
		paddingVertical: space.xs,
		borderRadius: radius.pill,
	},
	categoryChipText: {
		color: palette.primary,
		marginRight: 4,
	},
});

export default AddBudgetScreen;
