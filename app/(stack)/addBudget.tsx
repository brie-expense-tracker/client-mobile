import React, { useState } from 'react';
import {
	View,
	StyleSheet,
	TextInput,
	ScrollView,
	Alert,
	SafeAreaView,
	Text,
	TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useBudget } from '../../src/context/budgetContext';
import {
	BUDGET_ICONS,
	BUDGET_AMOUNT_PRESETS,
	DEFAULT_BUDGET_ICON,
	DEFAULT_COLOR,
} from '../../src/constants/uiConstants';
import {
	FormHeader,
	FormInputGroup,
	IconPicker,
	ColorPicker,
	AmountPresets,
	PeriodSelector,
} from '../../src/components/forms';

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
			console.log('💾 [AddBudget] Creating new budget...');
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

			console.log('✅ [AddBudget] Budget created successfully:', newBudget);
			console.log(
				'🔙 [AddBudget] Navigating back - useFocusEffect will handle refetch'
			);

			router.back();

			setTimeout(() => {
				Alert.alert('Success', 'Budget added successfully!');
			}, 300);
		} catch (error) {
			console.error('[AddBudgetScreen] Error saving:', error);

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
		<SafeAreaView style={styles.container}>
			<FormHeader
				title="Add New Budget"
				onSave={handleSave}
				saveDisabled={loading}
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
						>
							<View style={styles.toggleContent}>
								<Text style={styles.toggleText}>
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
								>
									<Text
										style={[
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
								>
									<Text
										style={[
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
									>
										<Text
											style={[
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
						<TouchableOpacity
							style={styles.categoriesButton}
							onPress={() => setShowCategoriesPicker(!showCategoriesPicker)}
						>
							<View style={styles.categoriesButtonContent}>
								<Text style={styles.categoriesButtonText}>
									{categories.length > 0
										? `${categories.length} categories selected`
										: 'Add categories'}
								</Text>
								<Ionicons
									name={showCategoriesPicker ? 'chevron-up' : 'chevron-down'}
									size={20}
									color="#757575"
								/>
							</View>
						</TouchableOpacity>

						{showCategoriesPicker && (
							<View style={styles.categoriesContainer}>
								<TextInput
									style={styles.categoryInput}
									placeholder="Enter category name"
									placeholderTextColor="#999"
									onSubmitEditing={(e) => {
										const category = e.nativeEvent.text.trim();
										if (category && !categories.includes(category)) {
											setCategories([...categories, category]);
											e.nativeEvent.text = '';
										}
									}}
								/>
								<View style={styles.categoriesList}>
									{categories.map((category, index) => (
										<View key={index} style={styles.categoryChip}>
											<Text style={styles.categoryChipText}>{category}</Text>
											<TouchableOpacity
												onPress={() =>
													setCategories(
														categories.filter((_, i) => i !== index)
													)
												}
											>
												<Ionicons name="close" size={16} color="#757575" />
											</TouchableOpacity>
										</View>
									))}
								</View>
							</View>
						)}
					</FormInputGroup>
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
	toggleContainer: {
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
	},
	toggleContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	toggleText: {
		fontSize: 16,
		color: '#212121',
		fontWeight: '500',
	},
	toggleSwitch: {
		width: 50,
		height: 30,
		borderRadius: 15,
		backgroundColor: '#E0E0E0',
		justifyContent: 'center',
		paddingHorizontal: 2,
	},
	toggleSwitchActive: {
		backgroundColor: '#007ACC',
	},
	toggleThumb: {
		width: 26,
		height: 26,
		borderRadius: 13,
		backgroundColor: '#FFFFFF',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 2,
		elevation: 2,
	},
	toggleThumbActive: {
		transform: [{ translateX: 20 }],
	},
	dayContainer: {
		flexDirection: 'row',
		gap: 12,
	},
	dayOption: {
		flex: 1,
		padding: 16,
		borderRadius: 12,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#E0E0E0',
		alignItems: 'center',
	},
	selectedDayOption: {
		borderColor: '#007ACC',
		backgroundColor: '#007ACC',
	},
	dayOptionText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#212121',
	},
	selectedDayOptionText: {
		color: '#fff',
		fontWeight: '600',
	},
	monthDayContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	monthDayOption: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#E0E0E0',
		alignItems: 'center',
		justifyContent: 'center',
	},
	selectedMonthDayOption: {
		borderColor: '#007ACC',
		backgroundColor: '#007ACC',
	},
	monthDayOptionText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#212121',
	},
	selectedMonthDayOptionText: {
		color: '#fff',
		fontWeight: '600',
	},
	categoriesButton: {
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
	},
	categoriesButtonContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	categoriesButtonText: {
		fontSize: 16,
		color: '#212121',
		flex: 1,
	},
	categoriesContainer: {
		marginTop: 8,
		padding: 12,
		backgroundColor: '#F9F9F9',
		borderRadius: 8,
	},
	categoryInput: {
		borderWidth: 1,
		borderColor: '#E0E0E0',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 16,
		color: '#0a0a0a',
		backgroundColor: '#ffffff',
		marginBottom: 12,
	},
	categoriesList: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	categoryChip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E3F2FD',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		gap: 6,
	},
	categoryChipText: {
		fontSize: 14,
		color: '#1976D2',
		fontWeight: '500',
	},
});

export default AddBudgetScreen;
