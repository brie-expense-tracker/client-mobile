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
import { useGoal, Goal } from '../../../../src/context/goalContext';
import {
	GOAL_ICONS,
	GOAL_TARGET_PRESETS,
	DEFAULT_GOAL_ICON,
	DEFAULT_COLOR,
	isValidIoniconsName,
	normalizeIconName,
} from '../../../../src/constants/uiConstants';
import { DateField } from '../../../../src/components/DateField';
import {
	FormInputGroup,
	IconPicker,
	ColorPicker,
	AmountPresets,
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
	const [originalValues, setOriginalValues] = useState<{
		name: string;
		target: string;
		deadline: string;
		icon: keyof typeof Ionicons.glyphMap;
		color: string;
	} | null>(null);

	const { goals, updateGoal } = useGoal();

	// Load goal data when component mounts
	useEffect(() => {
		if (goalId && goals.length > 0) {
			const foundGoal = goals.find((g) => g.id === goalId);
			if (foundGoal) {
				setGoal(foundGoal);
				const goalName = foundGoal.name || '';
				const goalTarget = foundGoal.target?.toString() || '';
				const goalDeadline = foundGoal.deadline.split('T')[0] || '';
				// Normalize the icon to ensure it's a valid Ionicons name
				const normalizedIcon = normalizeIconName(
					foundGoal.icon || DEFAULT_GOAL_ICON
				);
				const goalColor = foundGoal.color || DEFAULT_COLOR;

				setName(goalName);
				setTarget(goalTarget);
				setDeadline(goalDeadline);
				setIcon(normalizedIcon);
				setColor(goalColor);

				// Store original values for change detection
				setOriginalValues({
					name: goalName,
					target: goalTarget,
					deadline: goalDeadline,
					icon: normalizedIcon,
					color: goalColor,
				});

				// Auto-detect if custom amount
				const targetStr = foundGoal.target?.toString() || '';
				const isPreset = GOAL_TARGET_PRESETS.some(
					(preset) => preset.toString() === targetStr
				);
				setShowCustomTarget(!isPreset && targetStr !== '');
			}
		}
	}, [goalId, goals]);

	// Check if any values have changed
	const hasChanges = useMemo(() => {
		if (!originalValues) return false;

		const normalizedCurrentIcon = normalizeIconName(icon);
		const normalizedOriginalIcon = normalizeIconName(originalValues.icon);

		// Compare amounts as numbers to handle string formatting differences
		const currentTargetNum = parseFloat(cleanCurrencyToNumberString(target));
		const originalTargetNum = parseFloat(
			cleanCurrencyToNumberString(originalValues.target)
		);

		return (
			name.trim() !== originalValues.name.trim() ||
			currentTargetNum !== originalTargetNum ||
			normalizedCurrentIcon !== normalizedOriginalIcon ||
			color !== originalValues.color ||
			deadline !== originalValues.deadline
		);
	}, [originalValues, name, target, icon, color, deadline]);

	// Memoized validation for save button
	const saveDisabled = useMemo(() => {
		const parsedTarget = parseFloat(cleanCurrencyToNumberString(target));
		return (
			loading ||
			!name.trim() ||
			!target.trim() ||
			isNaN(parsedTarget) ||
			parsedTarget <= 0 ||
			!validateDate(deadline) ||
			!hasChanges
		);
	}, [loading, name, target, deadline, hasChanges]);

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

			logger.debug('[EditGoalScreen] Updating goal:', {
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
			logger.error('[EditGoalScreen] Error updating:', error);
			// More specific error message if available
			const errorMessage =
				(error as any)?.response?.data?.message ||
				'Failed to update goal. Please try again.';
			Alert.alert('Error', errorMessage);
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

	// When goal isn't loaded yet
	if (!goal) {
		return (
			<Page>
				<LoadingState label="Loading goal…" />
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
					<Section title="Details" subtitle="Update the basics for this goal.">
						<Card>
							<View style={styles.form}>
								{/* Goal Name */}
								<FormInputGroup label="Goal Name">
									<TextInput
										style={styles.textInput}
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
								<ColorPicker
									selectedColor={color}
									onColorSelect={setColor}
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

export default EditGoalScreen;
