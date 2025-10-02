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
import { Goal } from '../../src/context/goalContext';
import {
	COLOR_PALETTE,
	GOAL_ICONS,
	GOAL_TARGET_PRESETS,
	DEFAULT_GOAL_ICON,
	DEFAULT_COLOR,
	isValidIoniconsName,
	normalizeIconName,
} from '../../src/constants/uiConstants';

const EditGoalScreen: React.FC = () => {
	const params = useLocalSearchParams();
	const goalId = params.id as string;

	const [name, setName] = useState('');
	const [target, setTarget] = useState('');
	const [deadline, setDeadline] = useState('');
	const [icon, setIcon] =
		useState<keyof typeof Ionicons.glyphMap>(DEFAULT_GOAL_ICON);
	const [color, setColor] = useState<string>(DEFAULT_COLOR);
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [showColorPicker, setShowColorPicker] = useState(false);
	const [showCustomTarget, setShowCustomTarget] = useState(false);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [loading, setLoading] = useState(false);
	const [goal, setGoal] = useState<Goal | null>(null);

	const { goals, updateGoal, deleteGoal } = useGoals();

	// Load goal data when component mounts
	useEffect(() => {
		if (goalId && goals.length > 0) {
			console.log('[EditGoalScreen] Looking for goal with ID:', goalId);
			console.log(
				'[EditGoalScreen] Available goals:',
				goals.map((g) => ({ id: g.id, name: g.name }))
			);
			const foundGoal = goals.find((g) => g.id === goalId);
			if (foundGoal) {
				console.log('[EditGoalScreen] Found goal:', foundGoal);
				setGoal(foundGoal);
				setName(foundGoal.name || '');
				setTarget(foundGoal.target?.toString() || '');
				setDeadline(foundGoal.deadline.split('T')[0] || '');
				// Handle icon - normalize to valid Ionicons name
				const goalIcon = foundGoal.icon;
				if (goalIcon) {
					setIcon(normalizeIconName(goalIcon));
				} else {
					setIcon(DEFAULT_GOAL_ICON);
				}
				setColor(foundGoal.color || DEFAULT_COLOR);
				setSelectedDate(new Date(foundGoal.deadline));
			} else {
				console.log('[EditGoalScreen] Goal not found with ID:', goalId);
			}
		}
	}, [goalId, goals]);

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

		if (!goal) return;

		setLoading(true);
		try {
			// Use normalized icon
			const selectedIcon = isValidIoniconsName(icon) ? icon : DEFAULT_GOAL_ICON;

			// Use _id if available, otherwise use id
			const goalIdToUse = (goal as any)._id || goal.id;

			console.log('[EditGoalScreen] Updating goal:', {
				goalId: goalIdToUse,
				originalGoalId: goal.id,
				goal_id: (goal as any)._id,
				updates: {
					name: name.trim(),
					target: parseFloat(target),
					deadline,
					icon: selectedIcon,
					color,
					categories: goal.categories || [],
				},
			});

			await updateGoal(goalIdToUse, {
				name: name.trim(),
				target: parseFloat(target),
				deadline,
				icon: selectedIcon,
				color,
				categories: goal.categories || [],
			});

			Alert.alert('Success', 'Goal updated successfully!', [
				{ text: 'OK', onPress: () => router.back() },
			]);
		} catch (error) {
			console.error('[EditGoalScreen] Error updating:', error);
			Alert.alert('Error', 'Failed to update goal. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = () => {
		if (!goal) return;

		Alert.alert(
			'Delete Goal',
			'Are you sure you want to delete this goal? This action cannot be undone.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							await deleteGoal(goal.id);
							router.back();
						} catch (error) {
							console.error('[EditGoalScreen] Error deleting:', error);
							Alert.alert('Error', 'Failed to delete goal. Please try again.');
						}
					},
				},
			]
		);
	};

	const handleDateChange = (event: any, selectedDate?: Date) => {
		setShowDatePicker(false);
		if (selectedDate) {
			setSelectedDate(selectedDate);
			const formattedDate = selectedDate.toISOString().split('T')[0];
			setDeadline(formattedDate);
		}
	};

	if (!goal) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.back()}
					>
						<Ionicons name="chevron-back" size={24} color="#007ACC" />
					</TouchableOpacity>
					<Text style={styles.screenTitle}>Edit Goal</Text>
					<View style={styles.placeholderButton} />
				</View>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#007ACC" />
					<Text style={styles.loadingText}>Loading goal...</Text>
				</View>
			</SafeAreaView>
		);
	}

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
				<Text style={styles.screenTitle}>Edit Goal</Text>
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
							{GOAL_TARGET_PRESETS.map((amount) => (
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
							<View style={styles.iconPickerContainer}>
								{/* Icon Grid */}
								<View style={styles.iconGrid}>
									{GOAL_ICONS.map((iconName) => (
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

					{/* Delete Button */}
					<TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
						<Ionicons name="trash-outline" size={20} color="#E53935" />
						<Text style={styles.deleteButtonText}>Delete Goal</Text>
					</TouchableOpacity>
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
	placeholderButton: {
		width: 60,
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
	iconPickerContainer: {
		marginTop: 8,
	},
	iconTypeToggle: {
		flexDirection: 'row',
		backgroundColor: '#f5f5f5',
		borderRadius: 8,
		padding: 4,
		marginBottom: 12,
	},
	iconTypeButton: {
		flex: 1,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 6,
		alignItems: 'center',
	},
	iconTypeButtonActive: {
		backgroundColor: 'white',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	iconTypeButtonText: {
		fontSize: 14,
		color: '#666',
		fontWeight: '500',
	},
	iconTypeButtonTextActive: {
		color: '#333',
		fontWeight: '600',
	},
	iconGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
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
	deleteButtonText: {
		color: '#E53935',
		fontSize: 16,
		fontWeight: '600',
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

export default EditGoalScreen;
