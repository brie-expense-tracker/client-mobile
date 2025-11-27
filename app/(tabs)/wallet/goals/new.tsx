import React, { useState, useEffect, useRef } from 'react';
import {
	View,
	Text,
	TextInput,
	ScrollView,
	StyleSheet,
	Alert,
	Keyboard,
	TouchableOpacity,
	ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { logger } from '../../../../src/utils/logger';
import { useGoal } from '../../../../src/context/goalContext';
import {
	GOAL_ICONS,
	GOAL_TARGET_PRESETS,
	DEFAULT_GOAL_ICON,
	DEFAULT_COLOR,
} from '../../../../src/constants/uiConstants';
import { DateField } from '../../../../src/components/DateField';
import {
	IconPicker,
	ColorPicker,
	AmountPresets,
} from '../../../../src/components/forms';
import { palette, radius, space } from '../../../../src/ui/theme';

const AddGoalScreen: React.FC = () => {
	const params = useLocalSearchParams();
	const scrollViewRef = useRef<ScrollView>(null);
	const descriptionInputRef = useRef<TextInput>(null);

	const [name, setName] = useState('');
	const [target, setTarget] = useState('');
	const [deadline, setDeadline] = useState('');
	const [description, setDescription] = useState('');
	const [icon, setIcon] =
		useState<keyof typeof Ionicons.glyphMap>(DEFAULT_GOAL_ICON);
	const [color, setColor] = useState<string>(DEFAULT_COLOR);
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [showColorPicker, setShowColorPicker] = useState(false);
	const [showCustomTarget, setShowCustomTarget] = useState(false);
	const [loading, setLoading] = useState(false);

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
			Alert.alert('Missing information', 'Please fill in all required fields.');
			return;
		}

		if (!validateDate(deadline)) {
			Alert.alert(
				'Invalid date',
				'Please enter a valid date in YYYY-MM-DD format (e.g., 2024-12-31).'
			);
			return;
		}

		const targetValue = parseFloat(target);
		if (isNaN(targetValue) || targetValue <= 0) {
			Alert.alert(
				'Invalid amount',
				'Please enter a valid target amount greater than 0.'
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
				// description can be wired into API later if supported
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
		setShowCustomTarget((prev) => !prev);
		if (!showCustomTarget) setTarget('');
	};

	const handleDescriptionFocus = () => {
		setTimeout(() => {
			scrollViewRef.current?.scrollToEnd({ animated: true });
		}, 300);
	};

	return (
		<SafeAreaView style={styles.container} edges={['left', 'right']}>
			<ScrollView
				ref={scrollViewRef}
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				contentInsetAdjustmentBehavior="automatic"
				keyboardShouldPersistTaps="handled"
			>
				{/* Header / Hero */}
				<View style={styles.header}>
					<View style={styles.pill}>
						<Text style={styles.pillText}>New goal</Text>
					</View>
					<Text style={styles.title}>Add a new goal</Text>
					<Text style={styles.subtitle}>
						Set a savings target, date, and style so Brie can help you track and
						celebrate your progress.
					</Text>
				</View>

				{/* Details Card */}
				<View style={styles.card}>
					<Text style={styles.sectionLabel}>Details</Text>

					<View style={styles.fieldGroup}>
						<Label text="Goal name" required />
						<TextInput
							style={styles.input}
							placeholder="Emergency fund, Europe trip"
							placeholderTextColor={palette.textSubtle}
							value={name}
							onChangeText={setName}
							autoCapitalize="sentences"
							returnKeyType="next"
						/>
					</View>

					<View style={styles.fieldGroup}>
						<Label text="Target amount" required />
						<AmountPresets
							presets={GOAL_TARGET_PRESETS}
							selectedAmount={target}
							onPresetSelect={(amt) => {
								setTarget(amt);
								setShowCustomTarget(false);
								Keyboard.dismiss();
							}}
							showCustom={showCustomTarget}
							onToggleCustom={() => {
								Keyboard.dismiss();
								handleToggleCustomTarget();
							}}
							onCustomAmountChange={setTarget}
							customPlaceholder="e.g., 10000"
						/>
						<Text style={styles.helperText}>
							Use a preset or enter your own target amount.
						</Text>
					</View>

					<View style={styles.fieldGroup}>
						<Label text="Target date" required />
						<DateField
							value={deadline}
							onChange={handleDateChange}
							title=""
							placeholder="Select date"
							minDate={new Date().toISOString().split('T')[0]}
						/>
						<Text style={styles.helperText}>
							When you&apos;d like to reach this goal.
						</Text>
					</View>
				</View>

				{/* Appearance & Notes Card */}
				<View style={[styles.card, { marginTop: space.lg }]}>
					<Text style={styles.sectionLabel}>Appearance & notes</Text>

					<View style={styles.fieldGroup}>
						<Label text="Icon" optional />
						<IconPicker
							selectedIcon={icon}
							selectedColor={color}
							icons={GOAL_ICONS}
							onIconSelect={setIcon}
							isOpen={showIconPicker}
							onToggle={() => {
								Keyboard.dismiss();
								setShowIconPicker((prev) => !prev);
							}}
						/>
					</View>

					<View style={styles.fieldGroup}>
						<Label text="Color" optional />
						<ColorPicker
							selectedColor={color}
							onColorSelect={setColor}
							isOpen={showColorPicker}
							onToggle={() => {
								Keyboard.dismiss();
								setShowColorPicker((prev) => !prev);
							}}
						/>
					</View>

					<View style={styles.fieldGroup}>
						<Label text="Description" optional />
						<TextInput
							ref={descriptionInputRef}
							style={[styles.input, styles.textArea]}
							value={description}
							onChangeText={setDescription}
							onFocus={handleDescriptionFocus}
							placeholder="e.g., 3–6 months of expenses, honeymoon trip..."
							placeholderTextColor={palette.textSubtle}
							multiline
							numberOfLines={3}
							textAlignVertical="top"
						/>
						<Text style={styles.helperText}>
							Optional notes to remind yourself what this goal is for.
						</Text>
					</View>
				</View>
			</ScrollView>

			{/* Footer CTA */}
			<View style={styles.footer}>
				<TouchableOpacity
					style={[styles.cta, loading && { opacity: 0.7 }]}
					onPress={handleSave}
					disabled={loading}
					activeOpacity={0.85}
				>
					{loading ? (
						<ActivityIndicator color={palette.primaryTextOn} />
					) : (
						<Text style={styles.ctaText}>Save goal</Text>
					)}
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
};

function Label({
	text,
	required,
	optional,
	style,
}: {
	text: string;
	required?: boolean;
	optional?: boolean;
	style?: any;
}) {
	return (
		<Text style={[styles.label, style]}>
			{text}
			{required && <Text style={styles.required}> *</Text>}
			{optional && <Text style={styles.optional}> (optional)</Text>}
		</Text>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: palette.surfaceAlt,
	},
	scrollView: { flex: 1 },
	scrollContent: {
		paddingHorizontal: space.lg,
		paddingTop: space.sm, // tighter under nav, like debts screen
		paddingBottom: space.xl,
	},
	header: {
		marginBottom: space.lg,
	},
	pill: {
		alignSelf: 'flex-start',
		paddingHorizontal: space.sm + 2,
		paddingVertical: 4,
		borderRadius: radius.pill,
		backgroundColor: palette.accentSoft,
		marginBottom: space.sm,
	},
	pillText: {
		color: palette.accent,
		fontSize: 12,
		fontWeight: '600',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: palette.text,
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
		color: palette.textMuted,
		lineHeight: 20,
	},
	card: {
		borderRadius: radius.xl,
		backgroundColor: palette.surface,
		paddingHorizontal: space.lg,
		paddingVertical: space.lg,
		borderWidth: 1,
		borderColor: palette.border,
		gap: space.md,
	},
	sectionLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: palette.textMuted,
		textTransform: 'uppercase',
		letterSpacing: 0.6,
		marginBottom: 2,
	},
	fieldGroup: {
		marginTop: 8,
	},
	label: {
		fontWeight: '600',
		color: palette.text,
		marginBottom: 4,
		fontSize: 14,
	},
	required: {
		color: palette.danger,
	},
	optional: {
		color: palette.textMuted,
		fontWeight: '400',
		fontSize: 12,
	},
	input: {
		height: 44,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: palette.border,
		paddingHorizontal: space.md,
		fontSize: 16,
		color: palette.text,
		backgroundColor: palette.surface,
	},
	textArea: {
		height: 96,
	},
	helperText: {
		marginTop: 4,
		fontSize: 12,
		color: palette.textMuted,
	},
	footer: {
		paddingHorizontal: space.lg,
		paddingBottom: space.xl,
		paddingTop: space.sm,
		borderTopWidth: 1,
		borderTopColor: palette.border,
		backgroundColor: palette.surface,
	},
	cta: {
		height: 52,
		borderRadius: radius.lg,
		backgroundColor: palette.accent,
		alignItems: 'center',
		justifyContent: 'center',
	},
	ctaText: {
		color: palette.primaryTextOn,
		fontWeight: '700',
		fontSize: 16,
	},
});

export default AddGoalScreen;
