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
import { useBudgets } from '../../src/hooks/useBudgets';
import { Budget } from '../../src/context/budgetContext';
import {
	COLOR_PALETTE,
	BUDGET_ICONS,
	BUDGET_AMOUNT_PRESETS,
	DEFAULT_BUDGET_ICON,
	DEFAULT_COLOR,
} from '../../src/constants/uiConstants';

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

	const { addBudget, refetch } = useBudgets();

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
		console.log('🔙 [AddBudget] Navigating back - useFocusEffect will handle refetch');

		// Navigate back immediately - optimistic update already added it to local state
		// and useFocusEffect on budgets screen will trigger a fresh refetch
		router.back();
		
		// Show success message without blocking
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

	return (
		<SafeAreaView style={styles.container}>
			{/* Custom Header */}
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
				>
					<Ionicons name="chevron-back" size={24} color="#007ACC" />
				</TouchableOpacity>
				<Text style={styles.screenTitle}>Add New Budget</Text>
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
					{/* Budget Name */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Budget Name</Text>
						<TextInput
							style={styles.textInput}
							value={name}
							onChangeText={setName}
							placeholder="e.g., Groceries, Entertainment"
							placeholderTextColor="#999"
						/>
					</View>

					{/* Amount */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Budget Amount</Text>
						<Text style={styles.subtext}>
							Set your spending limit for this category
						</Text>

						{/* Quick Amount Presets */}
						<View style={styles.presetsContainer}>
							{BUDGET_AMOUNT_PRESETS.map((amountValue) => (
								<TouchableOpacity
									key={amountValue}
									style={[
										styles.preset,
										amount === amountValue.toString() && styles.selectedPreset,
									]}
									onPress={() => {
										setAmount(amountValue.toString());
										setShowCustomAmount(false);
									}}
								>
									<Text
										style={[
											styles.presetText,
											amount === amountValue.toString() &&
												styles.selectedPresetText,
										]}
									>
										${amountValue}
									</Text>
								</TouchableOpacity>
							))}
							<TouchableOpacity
								style={[
									styles.preset,
									showCustomAmount && styles.selectedPreset,
								]}
								onPress={() => {
									setShowCustomAmount(!showCustomAmount);
									if (!showCustomAmount) setAmount('');
								}}
							>
								<Text
									style={[
										styles.presetText,
										showCustomAmount && styles.selectedPresetText,
									]}
								>
									Custom
								</Text>
							</TouchableOpacity>
						</View>

						{/* Custom Amount Input */}
						{showCustomAmount && (
							<View style={styles.customInputContainer}>
								<Text style={styles.inputLabel}>Enter custom amount</Text>
								<TextInput
									style={styles.textInput}
									value={amount}
									onChangeText={setAmount}
									placeholder="e.g., 1500"
									keyboardType="numeric"
									placeholderTextColor="#999"
								/>
							</View>
						)}
					</View>

					{/* Period Selection */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Budget Period</Text>
						<Text style={styles.subtext}>
							Choose how often this budget resets
						</Text>

						<View style={styles.periodContainer}>
							<TouchableOpacity
								style={[
									styles.periodOption,
									period === 'monthly' && styles.selectedPeriodOption,
								]}
								onPress={() => setPeriod('monthly')}
							>
								<View style={styles.periodOptionContent}>
									<Ionicons
										name="calendar-outline"
										size={20}
										color={period === 'monthly' ? '#fff' : '#007ACC'}
									/>
									<Text
										style={[
											styles.periodOptionText,
											period === 'monthly' && styles.selectedPeriodOptionText,
										]}
									>
										Monthly
									</Text>
								</View>
							</TouchableOpacity>

							<TouchableOpacity
								style={[
									styles.periodOption,
									period === 'weekly' && styles.selectedPeriodOption,
								]}
								onPress={() => setPeriod('weekly')}
							>
								<View style={styles.periodOptionContent}>
									<Ionicons
										name="time-outline"
										size={20}
										color={period === 'weekly' ? '#fff' : '#007ACC'}
									/>
									<Text
										style={[
											styles.periodOptionText,
											period === 'weekly' && styles.selectedPeriodOptionText,
										]}
									>
										Weekly
									</Text>
								</View>
							</TouchableOpacity>
						</View>
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
									<Ionicons name={icon} size={20} color={color} />
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
											setIcon(iconName);
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

					{/* Rollover Toggle */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Rollover Unspent Funds</Text>
						<Text style={styles.subtext}>
							Carry over unspent money to the next period
						</Text>
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
					</View>

					{/* Week Start Day (for weekly budgets) */}
					{period === 'weekly' && (
						<View style={styles.inputGroup}>
							<Text style={styles.label}>Week Starts On</Text>
							<Text style={styles.subtext}>
								Choose which day your week begins
							</Text>
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
						</View>
					)}

					{/* Month Start Day (for monthly budgets) */}
					{period === 'monthly' && (
						<View style={styles.inputGroup}>
							<Text style={styles.label}>Month Starts On Day</Text>
							<Text style={styles.subtext}>
								Choose which day of the month your budget resets
							</Text>
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
						</View>
					)}

					{/* Categories Selection */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Categories (Optional)</Text>
						<Text style={styles.subtext}>
							Add categories to help organize your budget
						</Text>
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
	backButton: {
		flexDirection: 'row',
		alignItems: 'center',
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
	selectedPreset: {
		borderColor: '#00a2ff',
		backgroundColor: '#f0f9ff',
	},
	presetText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#212121',
	},
	selectedPresetText: {
		color: '#00a2ff',
		fontWeight: '600',
	},
	customInputContainer: {
		marginTop: 10,
	},
	inputLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#757575',
		marginBottom: 8,
	},
	periodContainer: {
		flexDirection: 'row',
		gap: 12,
	},
	periodOption: {
		flex: 1,
		padding: 16,
		borderRadius: 12,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	selectedPeriodOption: {
		borderColor: '#007ACC',
		backgroundColor: '#007ACC',
	},
	periodOptionContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	periodOptionText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#212121',
	},
	selectedPeriodOptionText: {
		color: '#fff',
		fontWeight: '600',
	},
	iconButton: {
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
	},
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
	iconButtonText: {
		fontSize: 16,
		color: '#212121',
		flex: 1,
		marginLeft: 12,
	},
	iconGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginTop: 2,
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
	colorButton: {
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
	},
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
	colorButtonText: {
		fontSize: 16,
		color: '#212121',
		flex: 1,
		marginLeft: 12,
	},
	colorGrid: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 2,
		paddingRight: 10,
	},
	colorColumn: {
		alignItems: 'center',
	},
	colorOptionContainer: {
		width: 36,
		height: 36,
		marginBottom: 4,
	},
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
	// Toggle styles
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
	// Day selection styles
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
	// Month day selection styles
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
	// Categories styles
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
