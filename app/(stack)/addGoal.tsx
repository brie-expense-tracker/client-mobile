import React, { useState, useEffect } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { useGoals } from '../../src/hooks/useGoals';

// Popular goal icons
const goalIcons: (keyof typeof Ionicons.glyphMap)[] = [
	'flag-outline',
	'trophy-outline',
	'star-outline',
	'diamond-outline',
	'ribbon-outline',
	'medal-outline',
	'checkmark-circle-outline',
	'home-outline',
	'business-outline',
	'construct-outline',
	'hammer-outline',
	'key-outline',
	'lock-open-outline',
	'car-outline',
	'airplane-outline',
	'train-outline',
	'bus-outline',
	'bicycle-outline',
	'boat-outline',
	'compass-outline',
	'map-outline',
	'location-outline',
	'camera-outline',
	'bed-outline',
	'umbrella-outline',
	'globe-outline',
	'book-outline',
	'school-outline',
	'library-outline',
	'briefcase-outline',
	'laptop-outline',
	'desktop-outline',
	'fitness-outline',
	'medical-outline',
	'heart-outline',
	'medkit-outline',
	'bandage-outline',
	'body-outline',
	'game-controller-outline',
	'musical-notes-outline',
	'film-outline',
	'color-palette-outline',
	'bag-outline',
	'cart-outline',
	'card-outline',
	'wallet-outline',
	'storefront-outline',
	'cut-outline',
	'phone-portrait-outline',
	'tablet-portrait-outline',
	'watch-outline',
	'headset-outline',
	'wifi-outline',
	'cloud-outline',
	'people-outline',
	'person-outline',
	'gift-outline',
	'rose-outline',
	'football-outline',
	'basketball-outline',
	'baseball-outline',
	'golf-outline',
	'tennisball-outline',
	'snow-outline',
	'calculator-outline',
	'pie-chart-outline',
	'trending-up-outline',
	'shield-checkmark-outline',
	'balloon-outline',
	'cafe-outline',
	'restaurant-outline',
	'fast-food-outline',
	'wine-outline',
	'pizza-outline',
	'paw-outline',
	'fish-outline',
	'leaf-outline',
	'rocket-outline',
	'flash-outline',
	'bulb-outline',
	'calendar-outline',
	'time-outline',
	'notifications-outline',
	'settings-outline',
];

// Quick target presets
const targetPresets = [500, 1000, 2500, 5000, 10000];

const COLOR_PALETTE = {
	red: { base: '#E53935', pastel: '#EF5350', dark: '#B71C1C' },
	orange: { base: '#FB8C00', pastel: '#FFB74D', dark: '#E65100' },
	yellow: { base: '#FDD835', pastel: '#FFEE58', dark: '#FBC02D' },
	green: { base: '#43A047', pastel: '#A5D6A7', dark: '#1B5E20' },
	blue: { base: '#1E88E5', pastel: '#42A5F5', dark: '#0D47A1' },
	indigo: { base: '#5E35B1', pastel: '#5C6BC0', dark: '#311B92' },
	violet: { base: '#8E24AA', pastel: '#AB47BC', dark: '#4A0072' },
	grey: { base: '#424242', pastel: '#757575', dark: '#212121' },
};

const AddGoalScreen: React.FC = () => {
	const params = useLocalSearchParams();
	const [name, setName] = useState('');
	const [target, setTarget] = useState('');
	const [current, setCurrent] = useState('');
	const [deadline, setDeadline] = useState('');
	const [description, setDescription] = useState('');
	const [icon, setIcon] =
		useState<keyof typeof Ionicons.glyphMap>('flag-outline');
	const [color, setColor] = useState(COLOR_PALETTE.blue.base);
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [showColorPicker, setShowColorPicker] = useState(false);
	const [showCustomTarget, setShowCustomTarget] = useState(false);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [loading, setLoading] = useState(false);
	const [categories, setCategories] = useState<string[]>([]);
	const [showCategoriesPicker, setShowCategoriesPicker] = useState(false);

	const { addGoal } = useGoals({ refreshOnFocus: false });

	// Handle pre-filled parameters from AI assistant
	useEffect(() => {
		if (params.prefill === 'emergency_fund') {
			setName((params.name as string) || 'Emergency Fund');
			setTarget((params.target as string) || '3000');
			setDeadline((params.deadline as string) || '');
			setIcon(
				(params.icon as keyof typeof Ionicons.glyphMap) || 'shield-checkmark'
			);
			setColor((params.color as string) || '#10b981');
		}
	}, [params]);

	const validateDate = (dateString: string): boolean => {
		const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
		if (!dateRegex.test(dateString)) return false;
		const date = new Date(dateString);
		return date instanceof Date && !isNaN(date.getTime());
	};

	const handleSave = async () => {
		if (!name.trim() || !target.trim() || !deadline.trim()) {
			Alert.alert('Error', 'Please fill in all required fields');
			return;
		}

		if (!validateDate(deadline)) {
			Alert.alert(
				'Invalid Date',
				'Please enter a valid date in YYYY-MM-DD format (e.g., 2024-12-31)'
			);
			return;
		}

		const targetValue = parseFloat(target);
		if (isNaN(targetValue) || targetValue <= 0) {
			Alert.alert('Error', 'Please enter a valid target amount greater than 0');
			return;
		}

		const currentValue = current.trim() ? parseFloat(current) : 0;
		if (current.trim() && (isNaN(currentValue) || currentValue < 0)) {
			Alert.alert(
				'Error',
				'Please enter a valid current amount (0 or greater)'
			);
			return;
		}

		if (currentValue > targetValue) {
			Alert.alert(
				'Error',
				'Current amount cannot be greater than target amount'
			);
			return;
		}

		setLoading(true);
		try {
			await addGoal({
				name: name.trim(),
				target: targetValue,
				deadline,
				icon,
				color,
				categories,
			});

			Alert.alert('Success', 'Goal added successfully!', [
				{
					text: 'OK',
					onPress: () => router.back(),
				},
			]);
		} catch (error) {
			console.error('[AddGoalScreen] Error saving:', error);
			Alert.alert('Error', 'Failed to save goal. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handleDateChange = (event: any, selectedDate?: Date) => {
		setShowDatePicker(false);
		if (selectedDate) {
			setSelectedDate(selectedDate);
			const formattedDate = selectedDate.toISOString().split('T')[0];
			setDeadline(formattedDate);
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
				<Text style={styles.screenTitle}>Add New Goal</Text>
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
					{/* Goal Name */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Goal Name</Text>
						<TextInput
							style={styles.textInput}
							value={name}
							onChangeText={setName}
							placeholder="e.g., Emergency Fund"
							placeholderTextColor="#999"
						/>
					</View>

					{/* Target Amount */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Target Amount</Text>
						<Text style={styles.subtext}>
							Set your target amount for this goal
						</Text>

						{/* Quick Target Presets */}
						<View style={styles.presetsContainer}>
							{targetPresets.map((amount) => (
								<TouchableOpacity
									key={amount}
									style={[
										styles.preset,
										target === amount.toString() && styles.selectedPreset,
									]}
									onPress={() => {
										setTarget(amount.toString());
										setShowCustomTarget(false);
									}}
								>
									<Text
										style={[
											styles.presetText,
											target === amount.toString() && styles.selectedPresetText,
										]}
									>
										${amount}
									</Text>
								</TouchableOpacity>
							))}
							<TouchableOpacity
								style={[
									styles.preset,
									showCustomTarget && styles.selectedPreset,
								]}
								onPress={() => {
									setShowCustomTarget(!showCustomTarget);
									if (!showCustomTarget) setTarget('');
								}}
							>
								<Text
									style={[
										styles.presetText,
										showCustomTarget && styles.selectedPresetText,
									]}
								>
									Custom
								</Text>
							</TouchableOpacity>
						</View>

						{/* Custom Amount Input */}
						{showCustomTarget && (
							<View style={styles.customInputContainer}>
								<Text style={styles.inputLabel}>Enter custom amount</Text>
								<TextInput
									style={styles.textInput}
									value={target}
									onChangeText={setTarget}
									placeholder="e.g., 10000"
									keyboardType="numeric"
									placeholderTextColor="#999"
								/>
							</View>
						)}
					</View>

					{/* Target Date */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Target Date</Text>
						<TouchableOpacity
							style={styles.dateButton}
							onPress={() => setShowDatePicker(!showDatePicker)}
						>
							<View style={styles.dateButtonContent}>
								<View
									style={[styles.dateIcon, { backgroundColor: color + '20' }]}
								>
									<Ionicons name="calendar-outline" size={16} color={color} />
								</View>
								<Text style={styles.dateButtonText}>
									{deadline || 'Select date'}
								</Text>
								<Ionicons name="chevron-down" size={20} color="#757575" />
							</View>
						</TouchableOpacity>

						{showDatePicker && (
							<View style={styles.datePickerWrapper}>
								<DateTimePicker
									value={selectedDate}
									mode="date"
									display="inline"
									onChange={handleDateChange}
									minimumDate={new Date()}
								/>
							</View>
						)}
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
								{goalIcons.map((iconName) => (
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

					{/* Current Amount */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Current Amount (Optional)</Text>
						<Text style={styles.subtext}>
							How much have you already saved towards this goal?
						</Text>
						<TextInput
							style={styles.textInput}
							value={current}
							onChangeText={setCurrent}
							placeholder="e.g., 500"
							keyboardType="numeric"
							placeholderTextColor="#999"
						/>
					</View>

					{/* Description */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Description (Optional)</Text>
						<Text style={styles.subtext}>Add notes about this goal</Text>
						<TextInput
							style={[styles.textInput, styles.textArea]}
							value={description}
							onChangeText={setDescription}
							placeholder="e.g., Save for emergency expenses, vacation fund..."
							placeholderTextColor="#999"
							multiline
							numberOfLines={3}
						/>
					</View>

					{/* Categories Selection */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Categories (Optional)</Text>
						<Text style={styles.subtext}>
							Add categories to help organize your goals
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
	dateButton: {
		backgroundColor: '#ffffff',
		borderRadius: 8,
		padding: 16,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	dateButtonContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	dateIcon: {
		width: 24,
		height: 24,
		borderRadius: 6,
		justifyContent: 'center',
		alignItems: 'center',
	},
	dateButtonText: {
		flex: 1,
		marginLeft: 12,
		fontSize: 16,
		color: '#0a0a0a',
	},
	datePickerWrapper: {
		backgroundColor: '#ffffff',
		borderRadius: 8,
		padding: 8,
		marginTop: 8,
		borderWidth: 1,
		borderColor: '#e5e7eb',
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
	// Text area styles
	textArea: {
		height: 80,
		textAlignVertical: 'top',
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

export default AddGoalScreen;
