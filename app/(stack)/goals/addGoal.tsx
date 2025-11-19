import React, { useState, useEffect } from 'react';
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
import { logger } from '../../../src/utils/logger';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useGoal } from '../../../src/context/goalContext';
import {
	GOAL_ICONS,
	GOAL_TARGET_PRESETS,
	DEFAULT_GOAL_ICON,
	DEFAULT_COLOR,
} from '../../../src/constants/uiConstants';
import { DateField } from '../../../src/components/DateField';
import {
	FormHeader,
	FormInputGroup,
	IconPicker,
	ColorPicker,
	AmountPresets,
} from '../../../src/components/forms';
import { palette, radius, space, type } from '../../../src/ui/theme';

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
	const [newCategory, setNewCategory] = useState('');
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
		<SafeAreaView style={styles.safeArea} edges={['top']}>
			<View style={styles.container}>
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
								style={[type.body, styles.textInput]}
								value={name}
								onChangeText={setName}
								placeholder="e.g., Emergency Fund"
								placeholderTextColor={palette.textSubtle}
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
								style={[type.body, styles.textInput]}
								value={current}
								onChangeText={setCurrent}
								placeholder="e.g., 500"
								keyboardType="numeric"
								placeholderTextColor={palette.textSubtle}
							/>
						</FormInputGroup>

						{/* Description */}
						<FormInputGroup
							label="Description (Optional)"
							subtext="Add notes about this goal"
						>
							<TextInput
								style={[type.body, styles.textInput, styles.textArea]}
								value={description}
								onChangeText={setDescription}
								placeholder="e.g., Save for emergency expenses, vacation fund..."
								placeholderTextColor={palette.textSubtle}
								multiline
								numberOfLines={3}
							/>
						</FormInputGroup>

						{/* Categories Selection */}
						<FormInputGroup
							label="Categories (Optional)"
							subtext="Add categories to help organize your goals"
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
	textArea: {
		height: 96,
		textAlignVertical: 'top',
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

export default AddGoalScreen;
