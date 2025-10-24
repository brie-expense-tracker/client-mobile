import React, { useState, useEffect, useMemo } from 'react';
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
import { useGoal, Goal } from '../../src/context/goalContext';
import {
	GOAL_ICONS,
	GOAL_TARGET_PRESETS,
	DEFAULT_GOAL_ICON,
	DEFAULT_COLOR,
	isValidIoniconsName,
	normalizeIconName,
} from '../../src/constants/uiConstants';
import { DateField } from '../../src/components/DateField';
import {
	FormHeader,
	FormInputGroup,
	IconPicker,
	ColorPicker,
	AmountPresets,
	DeleteButton,
} from '../../src/components/forms';

// Helper to clean currency input
const cleanCurrencyToNumberString = (v: string) =>
	v.replace(/[^\d.]/g, '').replace(/^0+(\d)/, '$1');

// Stricter date validation to prevent invalid dates
const validateDate = (dateString: string): boolean => {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
	const [y, m, d] = dateString.split('-').map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d));
	return (
		dt.getUTCFullYear() === y &&
		dt.getUTCMonth() === m - 1 &&
		dt.getUTCDate() === d
	);
};

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
	const [loading, setLoading] = useState(false);
	const [goal, setGoal] = useState<Goal | null>(null);

	const { goals, updateGoal, deleteGoal } = useGoal();

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
				// Auto-detect if custom amount
				const targetStr = foundGoal.target?.toString() || '';
				const isPreset = GOAL_TARGET_PRESETS.some(
					(preset) => preset.toString() === targetStr
				);
				setShowCustomTarget(!isPreset && targetStr !== '');
			} else {
				console.log('[EditGoalScreen] Goal not found with ID:', goalId);
			}
		}
	}, [goalId, goals]);

	// Memoized validation for save button
	const saveDisabled = useMemo(() => {
		const parsedTarget = parseFloat(cleanCurrencyToNumberString(target));
		return (
			loading ||
			!name.trim() ||
			!target.trim() ||
			isNaN(parsedTarget) ||
			parsedTarget <= 0 ||
			!validateDate(deadline)
		);
	}, [loading, name, target, deadline]);

	const handleSave = async () => {
		// Validation
		const parsedTarget = parseFloat(cleanCurrencyToNumberString(target));

		if (!name.trim()) {
			Alert.alert('Error', 'Please enter a goal name');
			return;
		}

		if (!target.trim() || isNaN(parsedTarget) || parsedTarget <= 0) {
			Alert.alert('Error', 'Please enter a valid target amount');
			return;
		}

		if (!validateDate(deadline)) {
			Alert.alert(
				'Invalid Date',
				'Please enter a valid date in YYYY-MM-DD format (e.g., 2025-12-31)'
			);
			return;
		}

		// Check if deadline is in the past
		const todayISO = new Date(
			Date.now() - new Date().getTimezoneOffset() * 60000
		)
			.toISOString()
			.split('T')[0];
		if (deadline < todayISO) {
			Alert.alert(
				'Invalid Date',
				'Goal deadline must be today or in the future'
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
				updates: {
					name: name.trim(),
					target: parsedTarget,
					deadline,
					icon: selectedIcon,
					color,
					categories: goal.categories || [],
				},
			});

			await updateGoal(goalIdToUse, {
				name: name.trim(),
				target: parsedTarget,
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
			// More specific error message if available
			const errorMessage =
				(error as any)?.response?.data?.message ||
				'Failed to update goal. Please try again.';
			Alert.alert('Error', errorMessage);
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
							console.log('🗑️ [EditGoal] Deleting goal:', goal.id);
							await deleteGoal(goal.id);
							console.log('✅ [EditGoal] Goal deleted successfully');
							router.back();
						} catch (error) {
							console.error('❌ [EditGoal] Delete failed:', error);
							const errorMsg =
								error instanceof Error
									? error.message
									: 'Failed to delete goal';
							Alert.alert('Delete Failed', errorMsg);
						}
					},
				},
			]
		);
	};

	const handleDateChange = (isoDate: string) => {
		setDeadline(isoDate);
	};

	const handleToggleCustomTarget = () => {
		setShowCustomTarget(!showCustomTarget);
		if (!showCustomTarget) setTarget('');
	};

	if (!goal) {
		return (
			<SafeAreaView style={styles.container}>
				<FormHeader
					title="Edit Goal"
					onSave={handleSave}
					saveDisabled={true}
					loading={false}
				/>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#007ACC" />
					<Text style={styles.loadingText}>Loading goal...</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<FormHeader
				title="Edit Goal"
				onSave={handleSave}
				saveDisabled={saveDisabled}
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
							onCustomAmountChange={(v) =>
								setTarget(cleanCurrencyToNumberString(v))
							}
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

					{/* Delete Button */}
					<DeleteButton onPress={handleDelete} text="Delete Goal" />
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

export default EditGoalScreen;
