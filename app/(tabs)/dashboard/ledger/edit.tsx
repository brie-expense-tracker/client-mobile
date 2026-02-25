import { logger } from '../../../../src/utils/logger';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TextInput,
	TouchableOpacity,
	KeyboardAvoidingView,
	Platform,
	Alert,
	ActivityIndicator,
	LayoutAnimation,
	UIManager,
	AccessibilityInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { palette, radius, space, shadow } from '../../../../src/ui/theme';

// Contexts (paths may differ in your repo)
import { TransactionContext } from '../../../../src/context/transactionContext';
import { normalizeIconName } from '../../../../src/constants/uiConstants';
import { DateField } from '../../../../src/components/DateField';

type TxType = 'income' | 'expense';

// Design constants for consistent spacing and styling
const RADIUS_MD = radius.md ?? 12; // fallback just in case

const INPUT_HEIGHT = 52;

const ICON_SIZE = 36;

interface Transaction {
	id: string;
	description: string;
	amount: number; // signed: negative = expense, positive = income
	date: string; // ISO YYYY-MM-DD or full ISO
	type?: TxType;
	target?: string;
	targetModel?: 'Budget' | 'Goal';
	updatedAt?: string;
	recurringPattern?: {
		patternId: string;
		frequency: string;
		confidence: number;
		nextExpectedDate: string;
	};
	metadata?: { category?: string }; // MVP: cash spending category
}

// MVP: Fixed cash spending categories (same as transaction screen)
const CASH_CATEGORIES = [
	'Food',
	'Groceries',
	'Drinks',
	'Transportation',
	'Entertainment',
	'Shopping',
	'Personal care',
	'Bills & utilities',
	'Household',
	'Health',
	'Gifts & donations',
	'Other',
] as const;

const parseMoney = (raw: string) => {
	const cleaned = raw.replace(/[^0-9.]/g, '');
	const parts = cleaned.split('.');
	const normalized =
		parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
	const n = Number(normalized);
	return isNaN(n) ? 0 : n;
};

const fmtMoney = (n: number) =>
	(isNaN(n) ? 0 : n).toLocaleString('en-US', {
		style: 'currency',
		currency: 'USD',
	});

export default function EditTransactionScreen() {
	const insets = useSafeAreaInsets();
	const { id } = useLocalSearchParams<{ id: string }>();

	const { transactions, updateTransaction, deleteTransaction } =
		React.useContext(TransactionContext);

	// Enable LayoutAnimation for Android (once on mount)
	useEffect(() => {
		if (
			Platform.OS === 'android' &&
			UIManager.setLayoutAnimationEnabledExperimental
		) {
			UIManager.setLayoutAnimationEnabledExperimental(true);
		}
	}, []);

	const tx = useMemo(
		() => transactions.find((t) => t.id === id),
		[transactions, id]
	);

	// form state
	const [description, setDescription] = useState('');
	const [amountInput, setAmountInput] = useState('');
	const [type, setType] = useState<TxType>('expense');
	const [date, setDate] = useState<string>(
		new Date().toISOString().split('T')[0]
	);
	const [selectedCategory, setSelectedCategory] = useState<
		(typeof CASH_CATEGORIES)[number] | null
	>(null);
	const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [footerH, setFooterH] = useState(0);
	const [descriptionFocused, setDescriptionFocused] = useState(false);

	// prefill
	useEffect(() => {
		if (!tx) return;

		setDescription(tx.description ?? '');

		const rawAmount = typeof tx.amount === 'number' ? Math.abs(tx.amount) : 0;
		setAmountInput(rawAmount.toFixed(2));

		const derivedType: TxType =
			tx.type ??
			(typeof tx.amount === 'number' && tx.amount < 0 ? 'expense' : 'income');
		setType(derivedType);

		const base = tx.date.includes('T')
			? new Date(tx.date)
			: new Date(`${tx.date}T00:00:00`);
		setDate(
			isNaN(base.getTime())
				? new Date().toISOString().split('T')[0]
				: base.toISOString().split('T')[0]
		);

		// MVP: Prefill category from metadata
		const cat = (tx.metadata as any)?.category;
		if (cat && CASH_CATEGORIES.includes(cat as any)) {
			setSelectedCategory(cat as (typeof CASH_CATEGORIES)[number]);
		} else {
			setSelectedCategory(null);
		}
	}, [tx]);

	// validation
	const errors = useMemo(() => {
		const e: Record<string, string> = {};
		if (parseMoney(amountInput) <= 0)
			e.amount = 'Enter a valid amount greater than 0.';
		const parsedDate = date ? new Date(`${date}T00:00:00`) : new Date('');
		if (!date || isNaN(parsedDate.getTime())) e.date = 'Choose a valid date.';

		return e;
	}, [amountInput, date]);

	const topError = errors.amount || errors.date || null;

	// changes
	const hasChanges = useMemo(() => {
		if (!tx) return false;

		const amountNum = Number(parseMoney(amountInput).toFixed(2));
		const signedAmount = type === 'expense' ? -amountNum : amountNum;
		const origAmount = Number(tx.amount ?? 0);
		const origType: TxType = tx.type ?? (origAmount < 0 ? 'expense' : 'income');
		const origCategory = (tx.metadata as any)?.category ?? null;

		return (
			(description.trim() || undefined) !== (tx.description?.trim() || undefined) ||
			signedAmount !== origAmount ||
			type !== origType ||
			(date ?? '') !==
				(tx.date.includes('T') ? tx.date.slice(0, 10) : tx.date) ||
			(selectedCategory ?? null) !== origCategory
		);
	}, [tx, description, amountInput, type, date, selectedCategory]);

	const canSave = hasChanges && Object.keys(errors).length === 0;

	const isIncome = type === 'income';
	const headerTitle = isIncome ? 'Edit Income' : 'Edit Expense';

	const headerSubtitle = useMemo(() => {
		const base =
			description.trim() || tx?.description?.trim() || 'Transaction details';

		// keep header calm if description is long
		return base.length > 40 ? `${base.slice(0, 37)}…` : base;
	}, [description, tx?.description]);

	// Money input handler
	const handleAmountChange = (t: string) => {
		const cleaned = t.replace(/[^0-9.]/g, '');
		const parts = cleaned.split('.');
		const whole = parts[0] ?? '';
		const decimals = parts[1]?.slice(0, 2) ?? '';
		const next = decimals.length > 0 ? `${whole}.${decimals}` : whole;

		setAmountInput(next);
	};

	const getSaveButtonText = () => {
		if (saving) return 'Saving...';
		if (!hasChanges) return 'Save';
		return 'Save Changes';
	};

	const handleSave = useCallback(async () => {
		if (!tx) return;
		if (!canSave) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			Alert.alert('Check fields', 'Please fix the highlighted fields.');
			return;
		}
		try {
			setSaving(true);

			const amountNum = Number(parseMoney(amountInput).toFixed(2));
			const signedAmount = type === 'expense' ? -amountNum : amountNum;

			const payload: Partial<Transaction> = {
				description: description.trim() || undefined,
				amount: signedAmount,
				type,
				date,
				metadata:
					type === 'expense' && selectedCategory
						? { category: selectedCategory }
						: undefined,
			};

			if (typeof updateTransaction !== 'function') {
				setSaving(false);
				Alert.alert('Missing handler', 'updateTransaction() is not available.');
				return;
			}
			await updateTransaction(tx.id, payload);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			AccessibilityInfo.announceForAccessibility('Transaction saved');
			setTimeout(() => {
				router.back();
			}, 1000);
		} catch (err: any) {
			logger.error('[EditTransaction] save error', err);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			Alert.alert('Save failed', err?.message ?? 'Please try again.');
		} finally {
			setSaving(false);
		}
	}, [
		tx,
		canSave,
		description,
		amountInput,
		type,
		date,
		selectedCategory,
		updateTransaction,
	]);

	const handleDelete = useCallback(() => {
		if (!tx) return;
		Alert.alert('Delete transaction', 'This cannot be undone.', [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Delete',
				style: 'destructive',
				onPress: async () => {
					try {
						await deleteTransaction(tx.id);
						Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
						router.back();
					} catch (err: any) {
						Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
						Alert.alert('Delete failed', err?.message ?? 'Please try again.');
					}
				},
			},
		]);
	}, [tx, deleteTransaction]);

	if (!tx) {
		return (
			<View style={[styles.center, { paddingTop: insets.top + 32 }]}>
				<ActivityIndicator />
				<Text style={styles.muted}>Loading transaction…</Text>
			</View>
		);
	}

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			{/* Screen header with back button */}
			<View
				style={[styles.screenHeader, { paddingTop: insets.top + space.md }]}
			>
				<View style={styles.headerLeft}>
					<TouchableOpacity
						onPress={() => router.back()}
						style={styles.backButton}
						accessibilityRole="button"
						accessibilityLabel="Go back"
					>
						<Ionicons name="chevron-back" size={24} color={palette.text} />
					</TouchableOpacity>

					<View style={styles.headerText}>
						<Text style={styles.screenTitle}>{headerTitle}</Text>
						<Text style={styles.screenSubtitle} numberOfLines={1}>
							{headerSubtitle}
						</Text>
					</View>
				</View>
			</View>

			{/* Error banner */}
			{topError && (
				<View style={styles.errorBanner}>
					<Ionicons name="alert-circle" size={16} color={palette.danger} />
					<Text style={styles.errorBannerText}>{topError}</Text>
				</View>
			)}

			<ScrollView
				contentContainerStyle={[
					styles.content,
					{ paddingBottom: footerH + space.sm },
				]}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				contentInsetAdjustmentBehavior="never"
				automaticallyAdjustContentInsets={false}
				automaticallyAdjustKeyboardInsets={false}
			>
				<View style={styles.stack}>
					{/* MAIN DETAILS CARD */}
					<View style={styles.primaryCard}>
						<View style={styles.cardHeaderRow}>
							<View style={{ flex: 1 }}>
								<Text style={styles.cardTitle}>Transaction details</Text>
								<Text style={styles.cardSubtitle}>
									{isIncome ? 'Money coming in' : 'Money going out'}
								</Text>
							</View>
							<View style={[styles.chip, styles.chipStatus]}>
								<Ionicons
									name={isIncome ? 'arrow-down-circle' : 'arrow-up-circle'}
									size={12}
									color={palette.textMuted}
								/>
								<Text style={styles.chipStatusText}>
									{isIncome ? 'Income' : 'Expense'}
								</Text>
							</View>
						</View>

						<View style={styles.cardDivider} />

						{/* Type */}
						<View style={[styles.fieldSection, styles.firstFieldSection]}>
							<Text style={styles.label}>Type</Text>
							<View style={styles.segment}>
								{(['expense', 'income'] as TxType[]).map((t) => {
									const active = type === t;
									return (
										<TouchableOpacity
											key={t}
											style={[
												styles.segmentBtn,
												active && styles.segmentBtnActive,
											]}
											onPress={() => {
												LayoutAnimation.configureNext(
													LayoutAnimation.Presets.easeInEaseOut
												);
												setType(t);
												Haptics.selectionAsync();
												if (t === 'income') setSelectedCategory(null);
											}}
											accessibilityRole="button"
											accessibilityState={{ selected: active }}
											accessibilityHint={`Sets this transaction as ${
												t === 'income' ? 'income' : 'expense'
											}`}
										>
											<Text
												style={[
													styles.segmentText,
													active && styles.segmentTextActive,
												]}
											>
												{t === 'income' ? 'Income' : 'Expense'}
											</Text>
										</TouchableOpacity>
									);
								})}
							</View>
						</View>

						{/* Description */}
						<View style={styles.fieldSection}>
							<Text style={styles.label}>Description</Text>
							<View
								style={[
									styles.inputRow,
									descriptionFocused && styles.inputRowFocused,
								]}
							>
								<Ionicons
									name="create-outline"
									size={18}
									color={palette.textMuted}
									style={{ marginRight: space.sm }}
								/>
								<TextInput
									value={description}
									onChangeText={setDescription}
									onFocus={() => setDescriptionFocused(true)}
									onBlur={() => setDescriptionFocused(false)}
									placeholder="e.g., Apple Music subscription"
									placeholderTextColor={palette.textMuted}
									style={[
										styles.inputBare,
										description.trim() && styles.inputBareFilled,
									]}
									returnKeyType="next"
									maxFontSizeMultiplier={1.3}
								/>
								{!!description && (
									<TouchableOpacity
										onPress={() => setDescription('')}
										accessibilityRole="button"
										hitSlop={8}
									>
										<Ionicons
											name="close-circle"
											size={18}
											color={palette.textMuted}
										/>
									</TouchableOpacity>
								)}
							</View>
						</View>

						{/* Amount */}
						<View style={styles.fieldSection}>
							<Text style={styles.label}>Amount</Text>
							<View
								style={[styles.inputRow, errors.amount && styles.inputError]}
							>
								<Ionicons
									name={
										type === 'income'
											? 'trending-up-outline'
											: 'trending-down-outline'
									}
									size={18}
									color={palette.textMuted}
									style={{ marginRight: space.sm }}
								/>
								<Text style={styles.currencySymbol}>$</Text>
								<TextInput
									value={amountInput}
									onChangeText={handleAmountChange}
									keyboardType={
										Platform.OS === 'ios'
											? 'numbers-and-punctuation'
											: 'decimal-pad'
									}
									placeholder="0.00"
									placeholderTextColor={palette.textMuted}
									style={styles.inputBare}
									accessibilityLabel="Amount"
									accessibilityHint={`Sets this transaction as ${type}`}
									inputMode="decimal"
									maxFontSizeMultiplier={1.3}
								/>
								{amountInput && amountInput.length > 0 && (
									<Text style={styles.preview}>
										{fmtMoney(parseMoney(amountInput))}
									</Text>
								)}
							</View>
							{errors.amount && (
								<Text style={styles.errorText}>{errors.amount}</Text>
							)}
						</View>

						{/* MVP: Category for expenses */}
						{type === 'expense' && (
							<View style={styles.fieldSection}>
								<Text style={styles.label}>Category</Text>
								<TouchableOpacity
									style={styles.inputRow}
									onPress={() => setCategoryPickerOpen(true)}
								>
									<Ionicons
										name="pricetag-outline"
										size={18}
										color={palette.textMuted}
										style={{ marginRight: space.sm }}
									/>
									<Text
										style={[
											styles.inputBare,
											{ flex: 1 },
											selectedCategory && styles.inputBareFilled,
										]}
									>
										{selectedCategory || 'Select category'}
									</Text>
									<Ionicons
										name="chevron-down"
										size={18}
										color={palette.textMuted}
									/>
								</TouchableOpacity>
								{categoryPickerOpen && (
									<View style={styles.categoryPicker}>
										{CASH_CATEGORIES.map((cat) => (
											<TouchableOpacity
												key={cat}
												style={[
													styles.categoryOption,
													selectedCategory === cat &&
														styles.categoryOptionSelected,
												]}
												onPress={() => {
													setSelectedCategory(cat);
													setCategoryPickerOpen(false);
													Haptics.selectionAsync();
												}}
											>
												<Text
													style={[
														styles.categoryOptionText,
														selectedCategory === cat &&
															styles.categoryOptionTextSelected,
													]}
												>
													{cat}
												</Text>
											</TouchableOpacity>
										))}
									</View>
								)}
							</View>
						)}

						{/* Date */}
						<View style={styles.fieldSection}>
							<Text style={styles.label}>Date</Text>
							<DateField
								value={date}
								onChange={setDate}
								placeholder="Select a date"
								containerStyle={styles.dateContainer}
							/>
							{errors.date && (
								<Text style={styles.errorText}>{errors.date}</Text>
							)}
						</View>
					</View>

				</View>
			</ScrollView>

			{/* Sticky footer */}
			<View
				onLayout={(e) => setFooterH(e.nativeEvent.layout.height)}
				style={[
					styles.footer,
					{
						paddingBottom:  space.sm,
						backgroundColor: hasChanges ? palette.surface : palette.subtle,
						shadowOpacity: hasChanges ? shadow.card.shadowOpacity * 0.5 : 0,
					},
				]}
			>
				{tx.updatedAt && (
					<View style={styles.footerMeta}>
						<Text style={styles.footerMetaText}>
							Last updated {new Date(tx.updatedAt).toLocaleString()}
						</Text>
					</View>
				)}
				<View style={styles.footerButtons}>
					<TouchableOpacity
						style={styles.deleteBtn}
						onPress={handleDelete}
						accessibilityRole="button"
						hitSlop={8}
					>
						<Ionicons name="trash-outline" size={18} color={palette.danger} />
						<Text style={styles.deleteText}>Delete</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[
							styles.saveBtn,
							(!hasChanges || Object.keys(errors).length > 0 || saving) &&
								styles.saveBtnDisabled,
						]}
						onPress={handleSave}
						disabled={!hasChanges || Object.keys(errors).length > 0 || saving}
						accessibilityRole="button"
					>
						{saving ? (
							<ActivityIndicator color={palette.bg} />
						) : (
							<>
								<Ionicons name="save-outline" size={18} color={palette.bg} />
								<Text style={styles.saveText}>{getSaveButtonText()}</Text>
							</>
						)}
					</TouchableOpacity>
				</View>
			</View>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: palette.subtle },

	screenHeader: {
		paddingHorizontal: space.lg,
		paddingBottom: space.md,
		backgroundColor: palette.bg,
		flexDirection: 'row',
		alignItems: 'flex-end',
		justifyContent: 'space-between',
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.sm,
		flex: 1,
	},
	backButton: {
		padding: 4,
		marginLeft: -4,
	},
	headerText: {
		flex: 1,
	},
	screenTitle: {
		fontSize: 17,
		fontWeight: '700',
		color: palette.text,
		letterSpacing: 0.2,
	},
	screenSubtitle: {
		fontSize: 12,
		color: palette.textMuted,
		marginTop: 4,
		letterSpacing: 0.1,
		opacity: 0.8,
	},

	errorBanner: {
		marginHorizontal: space.lg,
		marginTop: space.sm,
		paddingVertical: space.sm,
		paddingHorizontal: space.md,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: palette.dangerBorder,
		backgroundColor: palette.dangerSubtle,
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.xs,
	},
	errorBannerText: { color: palette.danger, fontWeight: '600', flex: 1 },

	content: {
		paddingHorizontal: space.lg,
		paddingBottom: space.lg,
	},
	stack: {
		gap: space.lg,
		paddingTop: space.xs,
	},

	primaryCard: {
		padding: space.md + 2,
		borderRadius: radius.xl,
		backgroundColor: palette.bg,
		borderWidth: 1,
		borderColor: palette.border,
		shadowColor: shadow.card.shadowColor,
		shadowOpacity: shadow.card.shadowOpacity * 0.35,
		shadowRadius: shadow.card.shadowRadius * 0.75,
		shadowOffset: shadow.card.shadowOffset,
		elevation: shadow.card.elevation * 0.6,
	},

	cardHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	cardTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: palette.text,
	},
	cardSubtitle: {
		fontSize: 12,
		color: palette.textMuted,
		marginTop: 2,
	},
	cardDivider: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: palette.border,
		marginTop: space.md,
		marginBottom: space.sm,
	},

	fieldSection: {
		marginBottom: space.md,
	},
	firstFieldSection: {
		marginTop: space.xs,
	},

	groupedSection: {
		padding: space.md + 2,
		borderRadius: radius.xl,
		backgroundColor: palette.bg,
		borderWidth: 1,
		borderColor: palette.border,
		shadowColor: shadow.card.shadowColor,
		shadowOpacity: shadow.card.shadowOpacity * 0.25,
		shadowRadius: shadow.card.shadowRadius * 0.6,
		shadowOffset: shadow.card.shadowOffset,
		elevation: shadow.card.elevation * 0.5,
	},

	label: {
		fontSize: 13,
		color: palette.textMuted,
		marginBottom: space.xs,
		fontWeight: '600',
		letterSpacing: 0.3,
	},

	inputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: palette.surfaceAlt,
		borderRadius: radius.lg,
		paddingHorizontal: space.md,
		borderWidth: 1,
		borderColor: palette.border,
		minHeight: INPUT_HEIGHT,
	},
	inputRowFocused: {
		borderColor: palette.primarySubtle,
	},
	inputBare: {
		flex: 1,
		fontSize: 16,
		color: palette.text,
		paddingVertical: 8,
	},
	inputBareFilled: {
		fontWeight: '500',
	},
	categoryPicker: {
		marginTop: space.sm,
		gap: space.xs,
	},
	categoryOption: {
		paddingVertical: space.sm,
		paddingHorizontal: space.md,
		borderRadius: radius.md,
		backgroundColor: palette.surfaceAlt,
		borderWidth: 1,
		borderColor: palette.border,
	},
	categoryOptionSelected: {
		backgroundColor: palette.primarySubtle,
		borderColor: palette.primary,
	},
	categoryOptionText: {
		fontSize: 15,
		color: palette.text,
	},
	categoryOptionTextSelected: {
		fontWeight: '600',
		color: palette.primary,
	},
	currencySymbol: {
		fontSize: 16,
		color: palette.text,
		marginRight: 2,
	},
	preview: {
		fontSize: 11,
		color: palette.textMuted,
		marginLeft: space.sm,
	},

	dateContainer: {
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: palette.border,
		backgroundColor: palette.surfaceAlt,
		paddingHorizontal: space.md,
		paddingVertical: 10,
		minHeight: INPUT_HEIGHT,
	},

	/** Segments / toggles */

	segment: {
		flexDirection: 'row',
		backgroundColor: palette.surfaceAlt,
		borderRadius: radius.xl,
		padding: 4,
		alignItems: 'center',
		height: 48,
	},
	segmentBtn: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: radius.lg,
		height: '100%',
	},
	segmentBtnActive: {
		backgroundColor: palette.primary,
	},
	segmentBtnDisabled: {
		opacity: 0.4,
	},
	segmentText: {
		fontSize: 16,
		color: palette.textSecondary,
		fontWeight: '600',
	},
	segmentTextActive: {
		color: palette.primaryTextOn,
	},
	segmentTextDisabled: {
		color: palette.textMuted,
	},

	applyListContainer: {
		marginTop: 4,
		marginHorizontal: -space.md,
	},
	applyList: {
		paddingHorizontal: space.md,
		gap: space.xs,
	},
	optionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: palette.surfaceAlt,
		borderRadius: radius.xl,
		paddingHorizontal: space.md,
		paddingVertical: space.md,
		gap: space.md,
	},
	optionRowActive: {
		backgroundColor: palette.surface,
		borderWidth: 1,
		borderColor: palette.primarySubtle,
	},
	optionTitle: {
		fontSize: 15,
		color: palette.text,
		fontWeight: '600',
	},
	optionSub: {
		fontSize: 12,
		color: palette.textMuted,
		marginTop: 2,
	},
	iconCircle: {
		width: ICON_SIZE,
		height: ICON_SIZE,
		borderRadius: radius.lg,
		alignItems: 'center',
		justifyContent: 'center',
	},

	/** Chips */

	chip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: space.sm,
		paddingVertical: 4,
		borderRadius: 999,
		gap: 4,
	},
	chipIncome: {
		backgroundColor: palette.primary,
	},
	chipExpense: {
		backgroundColor: palette.primary,
	},
	chipText: {
		color: palette.primaryTextOn,
		fontSize: 12,
		fontWeight: '700',
	},
	chipSoft: {
		backgroundColor: `${palette.primary}15`,
	},
	chipSoftText: {
		color: palette.primary,
		fontSize: 12,
		fontWeight: '600',
	},
	chipStatus: {
		backgroundColor: palette.surfaceAlt,
		paddingHorizontal: space.xs + 2,
		paddingVertical: 3,
	},
	chipStatusText: {
		color: palette.textMuted,
		fontSize: 11,
		fontWeight: '500',
	},

	/** Meta / helper */

	meta: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.xs,
		marginTop: space.md,
		marginBottom: space.lg,
		marginHorizontal: space.lg,
	},
	metaText: {
		fontSize: 11,
		color: palette.textMuted,
	},
	footerMeta: {
		alignItems: 'center',
		marginBottom: space.sm,
	},
	footerMetaText: {
		fontSize: 11,
		color: palette.textMuted,
	},

	errorText: {
		color: palette.danger,
		marginTop: space.xs,
		fontSize: 12,
		fontWeight: '600',
	},
	inputError: {
		borderColor: palette.dangerBorder,
		backgroundColor: palette.dangerSubtle,
	},

	muted: {
		color: palette.textMuted,
		marginTop: space.sm,
	},
	helperText: {
		fontSize: 13,
		color: palette.textMuted,
		opacity: 0.85,
		lineHeight: 18,
	},

	link: {
		color: palette.primary,
		fontSize: 14,
		fontWeight: '600',
	},

	/** Footer */

	footer: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		paddingHorizontal: space.lg,
		paddingTop: space.md,
		borderTopWidth: 1,
		borderTopColor: palette.border,
		backgroundColor: palette.surface,
	},
	footerButtons: {
		flexDirection: 'row',
		gap: space.xs,
	},
	deleteBtn: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: space.xs,
		borderWidth: 1,
		borderColor: palette.dangerBorder,
		backgroundColor: palette.bg,
		paddingHorizontal: space.lg,
		borderRadius: radius.md,
		height: 48,
	},
	deleteText: {
		color: palette.danger,
		fontWeight: '700',
		fontSize: 15,
	},
	saveBtn: {
		flex: 2,
		height: 48,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		gap: space.sm,
		backgroundColor: palette.primary,
	},
	saveBtnDisabled: {
		backgroundColor: palette.textMuted,
		opacity: 0.6,
	},
	saveText: {
		color: palette.bg,
		fontSize: 16,
		fontWeight: '700',
	},

	center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
