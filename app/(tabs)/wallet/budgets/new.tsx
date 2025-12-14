import React, { useState, useRef } from 'react';
import {
	View,
	StyleSheet,
	TextInput,
	ScrollView,
	Alert,
	Text,
	TouchableOpacity,
	Keyboard,
	ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useBudget } from '../../../../src/context/budgetContext';
import { createLogger } from '../../../../src/utils/sublogger';
import { isDevMode } from '../../../../src/config/environment';
import {
	BUDGET_ICONS,
	BUDGET_AMOUNT_PRESETS,
	DEFAULT_BUDGET_ICON,
	DEFAULT_COLOR,
} from '../../../../src/constants/uiConstants';
import {
	IconPicker,
	ColorPicker,
	AmountPresets,
	PeriodSelector,
	BudgetPeriodDetails,
} from '../../../../src/components/forms';
import { palette, radius, space, type } from '../../../../src/ui/theme';

const addBudgetLog = createLogger('AddBudget');

const PERIOD_OPTIONS = [
	{ value: 'monthly', label: 'Monthly', icon: 'calendar-outline' as const },
	{ value: 'weekly', label: 'Weekly', icon: 'time-outline' as const },
];

const AddBudgetScreen: React.FC = () => {
	const scrollViewRef = useRef<ScrollView>(null);
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
	// Categories are currently hidden in the UI; we always create budgets without categories.

	const { addBudget } = useBudget();

	const handleSave = async () => {
		if (!name.trim() || !amount.trim()) {
			Alert.alert('Missing information', 'Please fill in all required fields.');
			return;
		}

		const amountValue = parseFloat(amount);
		if (isNaN(amountValue) || amountValue <= 0) {
			Alert.alert(
				'Invalid amount',
				'Please enter a valid amount greater than 0.'
			);
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
				// Categories are disabled in the UI for now.
				categories: [],
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
		setShowCustomAmount((prev) => !prev);
		if (!showCustomAmount) setAmount('');
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
				onScrollBeginDrag={Keyboard.dismiss}
				automaticallyAdjustKeyboardInsets
			>
				{/* Header / Hero */}
				<View style={styles.header}>
					<View style={styles.pill}>
						<Text style={styles.pillText}>New budget</Text>
					</View>
					<Text style={styles.title}>Add a new budget</Text>
					<Text style={styles.subtitle}>
						Set a spending limit, choose how often it resets, and keep your
						categories on track.
					</Text>
				</View>

				{/* Details Card */}
				<View style={styles.card}>
					<Text style={styles.sectionLabel}>Details</Text>

					<View style={styles.fieldGroup}>
						<Label text="Budget name" required />
						<TextInput
							style={styles.input}
							value={name}
							onChangeText={setName}
							placeholder="e.g., Groceries, Entertainment"
							placeholderTextColor={palette.textSubtle}
							autoCapitalize="sentences"
							returnKeyType="next"
						/>
					</View>

					<View style={styles.fieldGroup}>
						<Label text="Budget amount" required />
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
						<Text style={styles.helperText}>
							Set the maximum you&apos;d like to spend in this budget period.
						</Text>
					</View>

					<View style={styles.fieldGroup}>
						<Label text="Budget period" required />
						<PeriodSelector
							options={PERIOD_OPTIONS}
							selectedPeriod={period}
							onPeriodSelect={(p) => setPeriod(p as 'weekly' | 'monthly')}
						/>
						<Text style={styles.helperText}>
							Choose how often this budget resets.
						</Text>
					</View>
				</View>

				{/* Appearance & Behavior Card */}
				<View style={[styles.card, { marginTop: space.lg }]}>
					<Text style={styles.sectionLabel}>Appearance & behavior</Text>

					<View style={styles.fieldGroup}>
						<Label text="Icon" optional />
						<IconPicker
							selectedIcon={icon}
							selectedColor={color}
							icons={BUDGET_ICONS}
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
						<Label text="Rollover unspent funds" optional />
						<TouchableOpacity
							style={styles.toggleContainer}
							onPress={() => setRollover((prev) => !prev)}
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
						<Text style={styles.helperText}>
							Carry over unspent money into the next period.
						</Text>
					</View>

					{/* Period details (start day) */}
					{(period === 'weekly' || period === 'monthly') && (
						<View style={styles.fieldGroup}>
							<Label text="Period details" optional />
							<BudgetPeriodDetails
								period={period}
								weekStartDay={weekStartDay}
								monthStartDay={monthStartDay}
								onWeekStartChange={setWeekStartDay}
								onMonthStartChange={setMonthStartDay}
							/>
						</View>
					)}
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
						<Text style={styles.ctaText}>Save budget</Text>
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
		paddingTop: space.sm, // match debts/new spacing under nav
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
	helperText: {
		marginTop: 4,
		fontSize: 12,
		color: palette.textMuted,
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
	categoryChipContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: space.sm,
		marginTop: space.sm,
	},
	categoryChip: {
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: radius.pill,
		backgroundColor: palette.surface,
		borderWidth: 1,
		borderColor: palette.border,
	},
	categoryChipSelected: {
		backgroundColor: palette.primarySubtle,
		borderColor: palette.primary,
	},
	categoryChipText: {
		color: palette.textSubtle,
	},
	categoryChipTextSelected: {
		color: palette.primary,
		fontWeight: '600',
	},
	manageButton: {
		marginTop: space.sm,
	},
	manageButtonText: {
		color: palette.primary,
		fontWeight: '500',
	},
	emptyText: {
		color: palette.textSubtle,
		marginTop: space.xs,
		marginBottom: space.sm,
	},
	newChip: {
		borderStyle: 'dashed',
		borderColor: palette.primary,
		backgroundColor: 'transparent',
	},
	newChipText: {
		color: palette.primary,
		fontWeight: '600',
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

export default AddBudgetScreen;
