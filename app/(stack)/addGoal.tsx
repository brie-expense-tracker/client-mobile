import React, { useState, useEffect } from 'react';
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
import { logger } from '../../src/utils/logger';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useGoal } from '../../src/context/goalContext';
import {
	GOAL_ICONS,
	GOAL_TARGET_PRESETS,
	DEFAULT_GOAL_ICON,
	DEFAULT_COLOR,
} from '../../src/constants/uiConstants';
import { DateField } from '../../src/components/DateField';
import {
	FormHeader,
	FormInputGroup,
	IconPicker,
	ColorPicker,
	AmountPresets,
} from '../../src/components/forms';

const AddGoalScreen: React.FC = () => {
	const params = useLocalSearchParams();
	const [name, setName] = useState('');
	const [target, setTarget] = useState('');
	const [current, setCurrent] = useState('');
	const [deadline, setDeadline] = useState('');
	const [description, setDescription] = useState('');
	const [icon, setIcon] =
		useState<keyof typeof Ionicons.glyphMap>(DEFAULT_GOAL_ICON);
	const [color, setColor] = useState<string>(DEFAULT_COLOR);
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [showColorPicker, setShowColorPicker] = useState(false);
	const [showCustomTarget, setShowCustomTarget] = useState(false);
	const [loading, setLoading] = useState(false);
	const [categories, setCategories] = useState<string[]>([]);
	const [showCategoriesPicker, setShowCategoriesPicker] = useState(false);

	const { addGoal } = useGoal();

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
			logger.error('[AddGoalScreen] Error saving:', error);
			Alert.alert('Error', 'Failed to save goal. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handleDateChange = (isoDate: string) => {
		setDeadline(isoDate);
	};

	const handleToggleCustomTarget = () => {
		setShowCustomTarget(!showCustomTarget);
		if (!showCustomTarget) setTarget('');
	};

	return (
		<SafeAreaView style={styles.container}>
			<FormHeader
				title="Add New Goal"
				onSave={handleSave}
				saveDisabled={loading}
				loading={loading}
			/>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.formContainer}>
					{/* Goal Name */}
					<FormInputGroup label="Goal Name">
						<TextInput
							style={styles.textInput}
							value={name}
							onChangeText={setName}
							placeholder="e.g., Emergency Fund"
							placeholderTextColor="#999"
						/>
					</FormInputGroup>

					{/* Target Amount */}
					<FormInputGroup
						label="Target Amount"
						subtext="Set your target amount for this goal"
					>
						<AmountPresets
							presets={GOAL_TARGET_PRESETS}
							selectedAmount={target}
							onPresetSelect={(amt) => {
								setTarget(amt);
								setShowCustomTarget(false);
							}}
							showCustom={showCustomTarget}
							onToggleCustom={handleToggleCustomTarget}
							onCustomAmountChange={setTarget}
							customPlaceholder="e.g., 10000"
						/>
					</FormInputGroup>

					{/* Target Date */}
					<FormInputGroup label="Target Date">
						<DateField
							value={deadline}
							onChange={handleDateChange}
							title=""
							placeholder="Select date"
							minDate={new Date().toISOString().split('T')[0]}
						/>
					</FormInputGroup>

					{/* Icon Selection */}
					<FormInputGroup label="Choose Icon">
						<IconPicker
							selectedIcon={icon}
							selectedColor={color}
							icons={GOAL_ICONS}
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

					{/* Current Amount */}
					<FormInputGroup
						label="Current Amount (Optional)"
						subtext="How much have you already saved towards this goal?"
					>
						<TextInput
							style={styles.textInput}
							value={current}
							onChangeText={setCurrent}
							placeholder="e.g., 500"
							keyboardType="numeric"
							placeholderTextColor="#999"
						/>
					</FormInputGroup>

					{/* Description */}
					<FormInputGroup
						label="Description (Optional)"
						subtext="Add notes about this goal"
					>
						<TextInput
							style={[styles.textInput, styles.textArea]}
							value={description}
							onChangeText={setDescription}
							placeholder="e.g., Save for emergency expenses, vacation fund..."
							placeholderTextColor="#999"
							multiline
							numberOfLines={3}
						/>
					</FormInputGroup>

					{/* Categories Selection */}
					<FormInputGroup
						label="Categories (Optional)"
						subtext="Add categories to help organize your goals"
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
	textArea: {
		height: 80,
		textAlignVertical: 'top',
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

export default AddGoalScreen;
