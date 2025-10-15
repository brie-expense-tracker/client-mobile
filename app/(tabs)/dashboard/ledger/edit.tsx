import React, {
	useEffect,
	useMemo,
	useState,
	useCallback,
	useRef,
} from 'react';
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
	NativeSyntheticEvent,
	TextInputSelectionChangeEventData,
	AccessibilityInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

// Contexts (paths may differ in your repo)
import { TransactionContext } from '../../../../src/context/transactionContext';
import { useBudget } from '../../../../src/context/budgetContext';
import { useGoal } from '../../../../src/context/goalContext';
import { useRecurringExpense } from '../../../../src/context/recurringExpenseContext';
import { normalizeIconName } from '../../../../src/constants/uiConstants';
import { DateField } from '../../../../src/components/DateField';

type TxType = 'income' | 'expense';

// Design constants for consistent spacing and styling
const SPACING = {
	xs: 4,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 24,
} as const;

const RADIUS_MD = 12;
const INPUT_HEIGHT = 52;
const ICON_SIZE = 36;

interface Transaction {
	id: string;
	description: string;
	amount: number;
	date: string; // ISO YYYY-MM-DD or full ISO
	type: TxType;
	target?: string;
	targetModel?: 'Budget' | 'Goal';
	updatedAt?: string;
	recurringPattern?: {
		patternId: string;
		frequency: string;
		confidence: number;
		nextExpectedDate: string;
	};
}

const toLocalISODate = (d: Date) => {
	const dt = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
	return dt.toISOString().slice(0, 10);
};

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

/** ---------- Small UI helpers ---------- */

const ErrorBanner = ({ text }: { text: string | null }) =>
	!text ? null : (
		<View style={styles.errorBanner}>
			<Ionicons name="alert-circle" size={16} color="#991b1b" />
			<Text style={styles.errorBannerText}>{text}</Text>
		</View>
	);

/** RecurringPicker: Modern combo-box for selecting recurring expenses */
const RecurringPicker: React.FC<{
	value?: string;
	onChange: (id?: string) => void;
	data: {
		patternId: string;
		vendor?: string;
		frequency?: string;
		nextExpectedDate?: string;
	}[];
	date: Date;
}> = ({ value, onChange, data, date }) => {
	const [open, setOpen] = useState(false);
	const [q, setQ] = useState('');

	const items = useMemo(() => {
		const list = q.trim()
			? data.filter((d) =>
					(d.vendor || 'Recurring')
						.toLowerCase()
						.includes(q.trim().toLowerCase())
			  )
			: data;
		return list;
	}, [data, q]);

	const selected = data.find((d) => d.patternId === value);

	return (
		<View style={{ zIndex: 10 }}>
			<Text style={styles.label}>Link to Recurring Expense</Text>
			<Text style={styles.labelSmall}>
				Optional: link this transaction to a pattern
			</Text>

			{/* Trigger */}
			<TouchableOpacity
				style={[styles.comboTrigger, open && styles.comboTriggerActive]}
				onPress={() => setOpen((v) => !v)}
				accessibilityRole="button"
				accessibilityState={{ expanded: open }}
			>
				<View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
					<Ionicons
						name="repeat"
						size={18}
						color="#6b7280"
						style={{ marginRight: 8 }}
					/>
					<Text style={[styles.selectorText, { flex: 1 }]} numberOfLines={1}>
						{selected?.vendor || 'Select recurring expense…'}
					</Text>
				</View>
				<Ionicons
					name={open ? 'chevron-up' : 'chevron-down'}
					size={18}
					color="#111827"
				/>
			</TouchableOpacity>

			{/* Selected chip (only when closed and a value exists) */}
			{!open && value && (
				<View style={styles.recChipCompact}>
					<View style={styles.recChipIcon}>
						<Ionicons name="repeat" size={14} color="#0369a1" />
					</View>
					<View style={{ flex: 1 }}>
						<Text style={styles.recChipTitle} numberOfLines={1}>
							{selected?.vendor || 'Recurring Expense'}
						</Text>
						<Text style={styles.recChipSub} numberOfLines={1}>
							{selected?.frequency || 'monthly'} • next{' '}
							{selected?.nextExpectedDate
								? new Date(selected.nextExpectedDate).toLocaleDateString()
								: toLocalISODate(date)}
						</Text>
					</View>
					<TouchableOpacity
						onPress={() => onChange(undefined)}
						style={styles.unlinkPill}
					>
						<Text style={styles.unlinkPillText}>Unlink</Text>
					</TouchableOpacity>
				</View>
			)}

			{/* Floating list */}
			{open && (
				<View style={styles.comboSheet}>
					{/* search */}
					<View style={styles.comboSearch}>
						<Ionicons name="search-outline" size={18} color="#6b7280" />
						<TextInput
							value={q}
							onChangeText={setQ}
							placeholder="Search recurring expenses"
							placeholderTextColor="#9ca3af"
							style={styles.inputBare}
						/>
						{!!q && (
							<TouchableOpacity onPress={() => setQ('')}>
								<Ionicons name="close-circle" size={18} color="#9ca3af" />
							</TouchableOpacity>
						)}
					</View>

					{items.length === 0 ? (
						<Text
							style={[
								styles.muted,
								{ paddingVertical: 12, paddingHorizontal: 12 },
							]}
						>
							No matches.
						</Text>
					) : (
						items.map((exp, idx) => {
							const active = value === exp.patternId;
							const next = exp.nextExpectedDate
								? new Date(exp.nextExpectedDate).toLocaleDateString()
								: toLocalISODate(date);
							return (
								<View key={exp.patternId}>
									<TouchableOpacity
										style={styles.comboRow}
										onPress={() => {
											onChange(exp.patternId);
											setOpen(false);
											Haptics.selectionAsync();
										}}
										accessibilityRole="button"
										accessibilityState={{ selected: active }}
									>
										<View style={styles.comboIcon}>
											<Ionicons name="repeat" size={18} color="#0ea5e9" />
										</View>
										<View style={{ flex: 1 }}>
											<Text style={styles.optionTitle} numberOfLines={1}>
												{exp.vendor || 'Recurring Expense'}
											</Text>
											<Text style={styles.optionSub} numberOfLines={1}>
												{exp.frequency || 'monthly'} • next {next}
											</Text>
										</View>
										<Ionicons
											name={active ? 'radio-button-on' : 'radio-button-off'}
											size={20}
											color={active ? '#0ea5e9' : '#9ca3af'}
										/>
									</TouchableOpacity>

									{/* separator */}
									{idx !== items.length - 1 && (
										<View style={styles.comboSeparator} />
									)}
								</View>
							);
						})
					)}

					{/* clear action */}
					{!!value && (
						<TouchableOpacity
							style={{
								alignSelf: 'flex-start',
								paddingHorizontal: 12,
								paddingVertical: 10,
							}}
							onPress={() => {
								onChange(undefined);
								setOpen(false);
							}}
						>
							<Text style={styles.link}>Clear link</Text>
						</TouchableOpacity>
					)}
				</View>
			)}
		</View>
	);
};

/** MoneyInput: formats while typing, preserves caret. */
const MoneyInput = ({
	value,
	onChange,
	hasError,
	type = 'expense',
}: {
	value: string;
	onChange: (next: string) => void;
	hasError?: boolean;
	type?: TxType;
}) => {
	const inputRef = useRef<TextInput>(null);
	const [selection, setSelection] = useState<
		{ start: number; end: number } | undefined
	>();

	// Rendered text shows formatted with $ and separators
	const numeric = value.replace(/[^0-9.]/g, '');
	const display =
		numeric.length === 0
			? ''
			: `$${Number(numeric).toLocaleString(undefined, {
					maximumFractionDigits: 2,
					useGrouping: true,
			  })}${/\.\d{0,2}$/.test(numeric) && numeric.endsWith('.') ? '.' : ''}`;

	const handleChange = (t: string) => {
		// Strip formatting back to a numeric string with at most one dot and 2 decimals
		const cleaned = t.replace(/[^0-9.]/g, '');
		const [whole, decimal = ''] = cleaned.split('.');
		const next =
			cleaned.indexOf('.') >= 0 ? `${whole}.${decimal.slice(0, 2)}` : whole;
		onChange(next);
	};

	const onSel = (
		e: NativeSyntheticEvent<TextInputSelectionChangeEventData>
	) => {
		setSelection(e.nativeEvent.selection);
	};

	const iconName =
		type === 'income' ? 'trending-up-outline' : 'trending-down-outline';
	const iconColor = type === 'income' ? '#16a34a' : '#ef4444';

	return (
		<View style={[styles.inputRow, hasError && styles.inputError]}>
			<Ionicons
				name={iconName}
				size={18}
				color={iconColor}
				style={{ marginRight: SPACING.sm }}
			/>
			<TextInput
				ref={inputRef}
				value={display}
				onChangeText={handleChange}
				onSelectionChange={onSel}
				selection={selection}
				keyboardType={
					Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'
				}
				placeholder="$0.00"
				placeholderTextColor="#9ca3af"
				style={styles.inputBare}
				accessibilityLabel="Amount"
				accessibilityHint={`Sets this transaction as ${type}`}
				inputMode="decimal"
				maxFontSizeMultiplier={1.3}
			/>
			{numeric ? (
				<Text style={styles.preview}>{fmtMoney(parseMoney(value))}</Text>
			) : null}
		</View>
	);
};

/** Footer that reports its height up, so we can pad the ScrollView correctly. */
const DynamicFooter: React.FC<{
	disabled: boolean;
	saving: boolean;
	hasChanges: boolean;
	onDelete: () => void;
	onSave: () => void;
	setHeight: (h: number) => void;
	bottomInset: number;
}> = ({
	disabled,
	saving,
	hasChanges,
	onDelete,
	onSave,
	setHeight,
	bottomInset,
}) => {
	const getSaveButtonText = () => {
		if (saving) return 'Saving...';
		if (!hasChanges) return 'Save';
		return 'Save Changes';
	};

	return (
		<View
			onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
			style={[
				styles.footer,
				{
					paddingBottom: Math.max(bottomInset, SPACING.md),
					backgroundColor: hasChanges ? '#fff' : '#fafafa',
					shadowOpacity: hasChanges ? 0.06 : 0,
				},
			]}
		>
			<TouchableOpacity
				style={styles.deleteBtn}
				onPress={onDelete}
				accessibilityRole="button"
				hitSlop={8}
			>
				<Ionicons name="trash-outline" size={18} color="#991b1b" />
				<Text style={styles.deleteText}>Delete</Text>
			</TouchableOpacity>

			<TouchableOpacity
				style={[styles.saveBtn, disabled && styles.saveBtnDisabled]}
				onPress={onSave}
				disabled={disabled}
				accessibilityRole="button"
			>
				{saving ? (
					<ActivityIndicator color="#fff" />
				) : (
					<>
						<Ionicons name="save-outline" size={18} color="#fff" />
						<Text style={styles.saveText}>{getSaveButtonText()}</Text>
					</>
				)}
			</TouchableOpacity>
		</View>
	);
};

export default function EditTransactionScreen() {
	if (
		Platform.OS === 'android' &&
		UIManager.setLayoutAnimationEnabledExperimental
	) {
		UIManager.setLayoutAnimationEnabledExperimental(true);
	}

	const insets = useSafeAreaInsets();
	const { id } = useLocalSearchParams<{ id: string }>();

	const { transactions, updateTransaction, deleteTransaction } =
		React.useContext(TransactionContext);
	const { budgets } = useBudget();
	const { goals } = useGoal();
	const { expenses: recurringExpenses } = useRecurringExpense();

	const tx = useMemo(
		() => transactions.find((t) => t.id === id),
		[transactions, id]
	);

	// form state
	const [description, setDescription] = useState('');
	const [amountInput, setAmountInput] = useState(''); // numeric string like "1234.56"
	const [type, setType] = useState<TxType>('expense');
	const [date, setDate] = useState<string>(
		new Date().toISOString().split('T')[0]
	);
	const [targetModel, setTargetModel] = useState<'Budget' | 'Goal' | undefined>(
		undefined
	);
	// Separate state for each model to preserve selections when toggling
	const [selectedBudgetId, setSelectedBudgetId] = useState<string | undefined>(
		undefined
	);
	const [selectedGoalId, setSelectedGoalId] = useState<string | undefined>(
		undefined
	);
	const [recurringExpenseId, setRecurringExpenseId] = useState<
		string | undefined
	>(undefined);
	const [saving, setSaving] = useState(false);
	const [footerH, setFooterH] = useState(0);

	// enhancements
	const [filter, setFilter] = useState(''); // search for target list

	// Derived targetId based on current model
	const targetId =
		targetModel === 'Budget'
			? selectedBudgetId
			: targetModel === 'Goal'
			? selectedGoalId
			: undefined;

	// prefill
	useEffect(() => {
		if (!tx) return;
		setDescription(tx.description ?? '');
		setAmountInput(String(Number(tx.amount ?? 0).toFixed(2))); // numeric string
		setType(tx.type);
		// Convert date to ISO string format (yyyy-mm-dd)
		const base = tx.date.includes('T')
			? new Date(tx.date)
			: new Date(`${tx.date}T00:00:00`);
		setDate(
			isNaN(base.getTime())
				? new Date().toISOString().split('T')[0]
				: base.toISOString().split('T')[0]
		);
		setTargetModel(tx.targetModel);
		// Set the appropriate selection based on targetModel
		if (tx.targetModel === 'Budget') {
			setSelectedBudgetId(tx.target);
		} else if (tx.targetModel === 'Goal') {
			setSelectedGoalId(tx.target);
		}
		if (tx.recurringPattern?.patternId)
			setRecurringExpenseId(tx.recurringPattern.patternId);
	}, [tx, budgets, goals, recurringExpenses]);

	const modelOptions = useMemo(() => {
		// Show both Budget and Goal options, but budgets will be filtered by type
		return ['Budget', 'Goal'] as const;
	}, []);

	// validation
	const errors = useMemo(() => {
		const e: Record<string, string> = {};
		if (!description.trim()) e.description = 'Please enter a description.';
		if (parseMoney(amountInput) <= 0)
			e.amount = 'Enter a valid amount greater than 0.';
		if (!(date instanceof Date) || isNaN(date.getTime()))
			e.date = 'Choose a valid date.';
		if (modelOptions.length > 0 && targetModel && !targetId) {
			e.target = `Select a ${targetModel.toLowerCase()}.`;
		}
		return e;
	}, [
		description,
		amountInput,
		date,
		targetModel,
		targetId,
		modelOptions.length,
	]);

	const topError =
		errors.description || errors.amount || errors.date || errors.target || null;

	// enable save only if there are changes AND no errors
	const hasChanges = useMemo(() => {
		if (!tx) return false;
		const amountNum = Number(parseMoney(amountInput).toFixed(2));
		const origAmount = Number(Number(tx.amount ?? 0).toFixed(2));
		return (
			description.trim() !== (tx.description ?? '').trim() ||
			amountNum !== origAmount ||
			type !== tx.type ||
			toLocalISODate(date) !==
				(tx.date.includes('T') ? tx.date.slice(0, 10) : tx.date) ||
			(targetModel ?? undefined) !== (tx.targetModel ?? undefined) ||
			(targetId ?? undefined) !== (tx.target ?? undefined) ||
			(recurringExpenseId ?? undefined) !==
				(tx.recurringPattern?.patternId ?? undefined)
		);
	}, [
		tx,
		description,
		amountInput,
		type,
		date,
		targetId,
		targetModel,
		recurringExpenseId,
	]);

	// Note: Back navigation guard would require useFocusEffect or similar
	// For now, we'll rely on the contextual save button to indicate changes

	const canSave = hasChanges && Object.keys(errors).length === 0;

	// derived lists
	const selectableBudgets = useMemo(() => {
		if (!budgets) return [];
		// Filter budgets based on transaction type - all budgets can be used for any transaction type
		// The budget type is determined by the transaction context, not the budget itself
		return budgets;
	}, [budgets]);
	const selectableGoals = useMemo(() => goals ?? [], [goals]);

	const filteredCollection = useMemo(() => {
		const collection =
			targetModel === 'Budget'
				? selectableBudgets
				: targetModel === 'Goal'
				? selectableGoals
				: [];
		if (!filter.trim()) return collection;
		const q = filter.toLowerCase();
		return collection.filter((it: any) =>
			`${it.name}`.toLowerCase().includes(q)
		);
	}, [targetModel, selectableBudgets, selectableGoals, filter]);

	const handleSave = useCallback(async () => {
		if (!tx) return;
		if (!canSave) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			Alert.alert('Check fields', 'Please fix the highlighted fields.');
			return;
		}
		try {
			setSaving(true);
			const payload: Partial<Transaction> = {
				description: description.trim(),
				amount: Number(parseMoney(amountInput).toFixed(2)),
				type,
				date: date, // date is already in ISO string format (yyyy-mm-dd)
				target: targetId || undefined,
				targetModel: targetId ? targetModel : undefined,
				recurringPattern: recurringExpenseId
					? {
							patternId: recurringExpenseId,
							frequency:
								recurringExpenses.find(
									(e) => e.patternId === recurringExpenseId
								)?.frequency || 'monthly',
							confidence: 0.8,
							nextExpectedDate:
								recurringExpenses.find(
									(e) => e.patternId === recurringExpenseId
								)?.nextExpectedDate || date,
					  }
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
			// Show "Saved" feedback for 1 second before navigating back
			setTimeout(() => {
				router.back();
			}, 1000);
		} catch (err: any) {
			console.error('[EditTransaction] save error', err);
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
		targetId,
		targetModel,
		recurringExpenseId,
		recurringExpenses,
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
			{/* Header divider */}
			<View style={styles.headerDivider} />

			{/* Error banner (compact) */}
			<ErrorBanner text={topError} />

			{/* Recurring banner */}
			{!!tx.recurringPattern && (
				<View style={styles.banner}>
					<Ionicons name="repeat" size={16} color="#0ea5e9" />
					<Text style={styles.bannerText}>
						Recurring: {tx.recurringPattern.frequency}
					</Text>
				</View>
			)}

			<ScrollView
				contentContainerStyle={[
					styles.content,
					{ paddingBottom: footerH + 8 }, // 🔥 dynamic, no spacer
				]}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{/* Type toggle */}
				<View style={styles.group}>
					<Text style={styles.label}>Type</Text>
					<View style={styles.segment}>
						{(['expense', 'income'] as TxType[]).map((t) => {
							const active = type === t;
							return (
								<TouchableOpacity
									key={t}
									style={[styles.segmentBtn, active && styles.segmentBtnActive]}
									onPress={() => {
										LayoutAnimation.configureNext(
											LayoutAnimation.Presets.easeInEaseOut
										);
										setType(t);
										Haptics.selectionAsync();
										// Clear all selections when changing type
										setSelectedBudgetId(undefined);
										setSelectedGoalId(undefined);

										// Set default target model based on what's available
										if (t === 'income') {
											// For income, prefer Goal if available, otherwise Budget
											const newModel =
												(goals || []).length > 0 ? 'Goal' : 'Budget';
											setTargetModel(newModel);
										} else {
											// For expense, prefer Budget if available, otherwise Goal
											const newModel =
												(budgets || []).length > 0 ? 'Budget' : 'Goal';
											setTargetModel(newModel);
										}
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
				<View style={styles.group}>
					<Text style={styles.label}>Description</Text>
					<View
						style={[styles.inputRow, errors.description && styles.inputError]}
					>
						<Ionicons
							name="create-outline"
							size={18}
							color="#6b7280"
							style={{ marginRight: SPACING.sm }}
						/>
						<TextInput
							value={description}
							onChangeText={setDescription}
							placeholder="e.g., Trader Joe's, Paycheck"
							placeholderTextColor="#9ca3af"
							style={styles.inputBare}
							returnKeyType="next"
							onSubmitEditing={() => {
								// Focus amount input next
								// This will be handled by the MoneyInput ref
							}}
							maxFontSizeMultiplier={1.3}
						/>
						{!!description && (
							<TouchableOpacity
								onPress={() => setDescription('')}
								accessibilityRole="button"
								hitSlop={8}
							>
								<Ionicons name="close-circle" size={18} color="#9ca3af" />
							</TouchableOpacity>
						)}
					</View>
					{errors.description && (
						<Text style={styles.errorText}>{errors.description}</Text>
					)}
				</View>

				{/* Amount (new MoneyInput) */}
				<View style={styles.group}>
					<Text style={styles.label}>Amount</Text>
					<MoneyInput
						value={amountInput}
						onChange={setAmountInput}
						hasError={!!errors.amount}
						type={type}
					/>
					{errors.amount && (
						<Text style={styles.errorText}>{errors.amount}</Text>
					)}
				</View>

				{/* Date */}
				<View style={styles.group}>
					<DateField
						value={date}
						onChange={setDate}
						title="Date"
						placeholder="Select date"
						containerStyle={{ marginBottom: errors.date ? 8 : 0 }}
					/>
					{errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
				</View>

				{/* Target (Budget/Goal) */}
				{modelOptions.length > 0 && (
					<View style={styles.group}>
						<Text style={styles.label}>Apply To</Text>

						<View style={styles.segmentSmall}>
							{modelOptions.map((m) => (
								<TouchableOpacity
									key={m}
									style={[
										styles.segmentBtnSmall,
										targetModel === m && styles.segmentBtnActive,
									]}
									onPress={() => {
										if (targetModel === m) {
											// If already selected, deselect and hide data
											setTargetModel(undefined);
										} else {
											// Select new model and clear the other selection
											if (m === 'Budget') {
												setSelectedGoalId(undefined); // Clear goal when selecting budget
											} else if (m === 'Goal') {
												setSelectedBudgetId(undefined); // Clear budget when selecting goal
											}
											setTargetModel(m);
										}
										Haptics.selectionAsync();
									}}
								>
									<Text
										style={[
											styles.segmentTextSmall,
											targetModel === m && styles.segmentTextActive,
										]}
									>
										{m}
									</Text>
								</TouchableOpacity>
							))}
						</View>

						{/* Professional selection chips with linked item names */}
						{/* Show budget selection when budget is selected */}
						{selectedBudgetId &&
							(() => {
								const selectedBudget = selectableBudgets.find(
									(b) => b.id === selectedBudgetId
								);
								return selectedBudget ? (
									<View
										style={[
											styles.selectionChip,
											targetModel === 'Budget' && styles.selectionChipActive,
										]}
									>
										<View style={styles.selectionChipLeft}>
											<View style={styles.selectionChipIcon}>
												<Ionicons
													name={normalizeIconName(
														selectedBudget.icon ?? 'wallet-outline'
													)}
													size={14}
													color="#0369a1"
												/>
											</View>
											<View style={styles.selectionChipTextContainer}>
												<Text style={styles.selectionChipText}>
													Applied to Budget
												</Text>
												<Text style={styles.selectionChipItemName}>
													{selectedBudget.name}
												</Text>
											</View>
										</View>
										<TouchableOpacity
											onPress={() => setSelectedBudgetId(undefined)}
											style={styles.selectionChipUnlink}
											hitSlop={8}
										>
											<Text style={styles.selectionChipUnlinkText}>Unlink</Text>
										</TouchableOpacity>
									</View>
								) : null;
							})()}

						{/* Show goal selection when goal is selected */}
						{selectedGoalId &&
							(() => {
								const selectedGoal = selectableGoals.find(
									(g) => g.id === selectedGoalId
								);
								return selectedGoal ? (
									<View
										style={[
											styles.selectionChip,
											targetModel === 'Goal' && styles.selectionChipActive,
										]}
									>
										<View style={styles.selectionChipLeft}>
											<View style={styles.selectionChipIcon}>
												<Ionicons
													name={normalizeIconName(
														selectedGoal.icon ?? 'flag-outline'
													)}
													size={14}
													color="#0369a1"
												/>
											</View>
											<View style={styles.selectionChipTextContainer}>
												<Text style={styles.selectionChipText}>
													Applied to Goal
												</Text>
												<Text style={styles.selectionChipItemName}>
													{selectedGoal.name}
												</Text>
											</View>
										</View>
										<TouchableOpacity
											onPress={() => setSelectedGoalId(undefined)}
											style={styles.selectionChipUnlink}
											hitSlop={8}
										>
											<Text style={styles.selectionChipUnlinkText}>Unlink</Text>
										</TouchableOpacity>
									</View>
								) : null;
							})()}

						{/* Optional: quick search if list is long */}
						{(targetModel === 'Budget' ? selectableBudgets : selectableGoals)
							.length > 6 && (
							<View style={[styles.inputRow, { marginTop: 10 }]}>
								<Ionicons
									name="search-outline"
									size={18}
									color="#6b7280"
									style={{ marginRight: 8 }}
								/>
								<TextInput
									value={filter}
									onChangeText={setFilter}
									placeholder={`Search ${targetModel?.toLowerCase()}s`}
									placeholderTextColor="#9ca3af"
									style={styles.inputBare}
								/>
								{!!filter && (
									<TouchableOpacity onPress={() => setFilter('')}>
										<Ionicons name="close-circle" size={18} color="#9ca3af" />
									</TouchableOpacity>
								)}
							</View>
						)}

						<View style={{ marginTop: 12 }}>
							{filteredCollection.length === 0 && targetModel ? (
								<Text style={styles.muted}>
									No {targetModel.toLowerCase()}s available.
								</Text>
							) : filteredCollection.length > 0 ? (
								filteredCollection.map((item: any, idx: number) => {
									const isSelected =
										targetModel === 'Budget'
											? selectedBudgetId === item.id
											: targetModel === 'Goal'
											? selectedGoalId === item.id
											: false;
									return (
										<React.Fragment key={item.id}>
											<TouchableOpacity
												style={[
													styles.optionRow,
													isSelected && styles.optionRowActive,
												]}
												onPress={() => {
													if (targetModel === 'Budget') {
														// Clear goal selection when selecting budget
														setSelectedGoalId(undefined);
														setSelectedBudgetId(
															item.id === selectedBudgetId ? undefined : item.id
														);
													} else if (targetModel === 'Goal') {
														// Clear budget selection when selecting goal
														setSelectedBudgetId(undefined);
														setSelectedGoalId(
															item.id === selectedGoalId ? undefined : item.id
														);
													}
													// Don't toggle the model - just select the item
												}}
											>
												<View
													style={[
														styles.iconCircle,
														{ backgroundColor: `${item.color ?? '#111827'}20` },
													]}
												>
													<Ionicons
														name={normalizeIconName(
															item.icon ?? 'pricetag-outline'
														)}
														size={18}
														color={item.color ?? '#111827'}
													/>
												</View>
												<View style={{ flex: 1 }}>
													<Text style={styles.optionTitle}>{item.name}</Text>
													{'amount' in item &&
														typeof item.amount === 'number' && (
															<Text style={styles.optionSub}>
																{fmtMoney(item.amount)} allocated
															</Text>
														)}
													{'target' in item &&
														typeof item.target === 'number' && (
															<Text style={styles.optionSub}>
																Target {fmtMoney(item.target)}
															</Text>
														)}
												</View>
												{isSelected ? (
													<Ionicons
														name="checkmark-circle"
														size={20}
														color="#0ea5e9"
													/>
												) : (
													<Ionicons
														name="ellipse-outline"
														size={20}
														color="#9ca3af"
													/>
												)}
											</TouchableOpacity>
											{idx !== filteredCollection.length - 1 && (
												<View style={styles.optionSeparator} />
											)}
										</React.Fragment>
									);
								})
							) : null}
						</View>
					</View>
				)}

				{/* Recurring Expense (new) */}
				<View style={styles.group}>
					<RecurringPicker
						value={recurringExpenseId}
						onChange={setRecurringExpenseId}
						data={recurringExpenses}
						date={date}
					/>
				</View>

				{/* Updated at meta */}
				{tx.updatedAt && (
					<View style={styles.meta}>
						<Ionicons name="time-outline" size={14} color="#6b7280" />
						<Text style={styles.metaText}>
							Last updated {new Date(tx.updatedAt).toLocaleString()}
						</Text>
					</View>
				)}
			</ScrollView>

			{/* Sticky footer (measures own height) */}
			<DynamicFooter
				disabled={!canSave || saving}
				saving={saving}
				hasChanges={hasChanges}
				onDelete={handleDelete}
				onSave={handleSave}
				setHeight={setFooterH}
				bottomInset={insets.bottom}
			/>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#ffffff' },

	headerDivider: { height: 1, backgroundColor: '#e5e7eb' },

	hairline: { height: 1, backgroundColor: '#eef0f3', marginVertical: 8 },

	errorBanner: {
		margin: 12,
		marginTop: 10,
		padding: 10,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#fee2e2',
		backgroundColor: '#fff1f2',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	errorBannerText: { color: '#7f1d1d', fontWeight: '600', flex: 1 },

	banner: {
		marginHorizontal: 16,
		marginTop: 12,
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#bae6fd',
		backgroundColor: '#ecfeff',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	bannerText: { color: '#0369a1', fontWeight: '600' },

	content: { paddingHorizontal: 18, paddingTop: 12 },

	group: { marginBottom: SPACING.lg },
	label: {
		fontSize: 13,
		color: '#6b7280',
		marginBottom: SPACING.sm,
		fontWeight: '600',
		lineHeight: 18,
	},
	labelSmall: {
		fontSize: 12,
		color: '#9ca3af',
		marginBottom: SPACING.xs,
		fontWeight: '500',
	},

	inputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f8fafc',
		borderRadius: RADIUS_MD,
		paddingHorizontal: 14,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		minHeight: INPUT_HEIGHT,
	},
	inputBare: {
		flex: 1,
		fontSize: 16,
		color: '#111827',
		paddingVertical: 10,
	},
	preview: { fontSize: 13, color: '#6b7280', marginLeft: SPACING.sm },

	selector: {
		minHeight: INPUT_HEIGHT,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#f8fafc',
		borderRadius: RADIUS_MD,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		paddingHorizontal: 14,
	},
	selectorText: { fontSize: 16, color: '#111827' },

	// Combo-box trigger becomes flatter; when open it connects visually to the sheet
	comboTrigger: {
		minHeight: INPUT_HEIGHT,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#f8fafc',
		borderRadius: RADIUS_MD,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		paddingHorizontal: 14,
	},
	comboTriggerActive: {
		borderBottomLeftRadius: 0,
		borderBottomRightRadius: 0,
		borderColor: '#dbe0e6',
	},

	// Compact chip (kept from your original but slimmer)
	recChipCompact: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: SPACING.sm,
		paddingHorizontal: 14,
		paddingVertical: 10,
		backgroundColor: '#f0f9ff',
		borderRadius: RADIUS_MD,
		borderWidth: 1,
		borderColor: '#bae6fd',
		gap: 10,
	},
	recChipIcon: {
		width: 28,
		height: 28,
		borderRadius: 8,
		backgroundColor: '#e0f2fe',
		alignItems: 'center',
		justifyContent: 'center',
	},
	recChipTitle: { fontSize: 14, color: '#0c4a6e', fontWeight: '700' },
	recChipSub: { fontSize: 12, color: '#075985', marginTop: 2 },

	unlinkPill: {
		borderWidth: 1,
		borderColor: '#0ea5e9',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
	},
	unlinkPillText: { color: '#0ea5e9', fontSize: 12, fontWeight: '700' },

	// Floating sheet with a single border & shadow (no per-row borders)
	comboSheet: {
		borderWidth: 1,
		borderColor: '#dbe0e6',
		backgroundColor: '#fff',
		borderBottomLeftRadius: RADIUS_MD,
		borderBottomRightRadius: RADIUS_MD,
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowRadius: 8,
		elevation: 2,
		overflow: 'hidden',
	},

	comboSearch: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 14,
		height: 44,
		backgroundColor: '#f8fafc',
		borderBottomWidth: 1,
		borderBottomColor: '#eef0f3',
		gap: SPACING.sm,
	},

	comboRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 14,
		paddingVertical: 12,
		backgroundColor: '#fff',
		gap: SPACING.md,
	},

	comboIcon: {
		width: ICON_SIZE,
		height: ICON_SIZE,
		borderRadius: 8,
		backgroundColor: '#e0f2fe',
		alignItems: 'center',
		justifyContent: 'center',
	},

	comboSeparator: {
		height: 1,
		backgroundColor: '#eef0f3',
		marginLeft: 14 + ICON_SIZE + 14, // align under text, not icon
	},

	segment: {
		flexDirection: 'row',
		backgroundColor: '#f3f4f6',
		borderRadius: RADIUS_MD,
		padding: 4,
		gap: SPACING.xs,
	},
	segmentBtn: {
		flex: 1,
		paddingVertical: 10,
		borderRadius: 10,
		alignItems: 'center',
	},
	segmentBtnActive: {
		backgroundColor: '#111827',
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowRadius: 6,
		elevation: 1,
	},
	segmentText: {
		fontSize: 15,
		color: '#6b7280',
		fontWeight: '600',
	},
	segmentTextActive: { color: '#ffffff' },

	segmentSmall: {
		flexDirection: 'row',
		backgroundColor: '#f3f4f6',
		borderRadius: 10,
		padding: 4,
		gap: SPACING.xs,
		alignSelf: 'flex-start',
	},
	segmentBtnSmall: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		alignItems: 'center',
	},
	segmentTextSmall: {
		fontSize: 14,
		color: '#6b7280',
		fontWeight: '600',
	},

	// Professional selection chips - matching recurring expense style
	selectionChip: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#f0f9ff',
		borderRadius: RADIUS_MD,
		borderWidth: 1,
		borderColor: '#bae6fd',
		paddingHorizontal: 14,
		paddingVertical: 10,
		marginTop: SPACING.sm,
	},
	selectionChipActive: {
		backgroundColor: '#e0f2fe',
		borderColor: '#0ea5e9',
		borderWidth: 1.5,
	},
	selectionChipLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: SPACING.sm,
		flex: 1,
	},
	selectionChipIcon: {
		width: 28,
		height: 28,
		borderRadius: 8,
		backgroundColor: '#e0f2fe',
		justifyContent: 'center',
		alignItems: 'center',
	},
	selectionChipTextContainer: {
		flex: 1,
	},
	selectionChipText: {
		fontSize: 12,
		color: '#075985',
		fontWeight: '500',
		marginBottom: 2,
	},
	selectionChipItemName: {
		fontSize: 14,
		color: '#0c4a6e',
		fontWeight: '700',
	},
	selectionChipUnlink: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: '#0ea5e9',
		backgroundColor: 'transparent',
	},
	selectionChipUnlinkText: {
		fontSize: 12,
		color: '#0ea5e9',
		fontWeight: '700',
	},

	optionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 14,
		backgroundColor: '#fff',
		gap: SPACING.md,
	},
	optionRowActive: { backgroundColor: '#f7fbff' },
	optionSeparator: {
		height: 1,
		backgroundColor: '#eef0f3',
		marginLeft: 14 + ICON_SIZE + 14, // align under text, not icon
	},
	optionTitle: {
		fontSize: 15,
		color: '#111827',
		fontWeight: '600',
	},
	optionSub: {
		fontSize: 12,
		color: '#6b7280',
		marginTop: 2,
	},

	iconCircle: {
		width: ICON_SIZE,
		height: ICON_SIZE,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},

	meta: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: SPACING.xs,
		marginTop: SPACING.xs,
	},
	metaText: {
		fontSize: 12,
		color: '#6b7280',
	},

	errorText: {
		color: '#b91c1c',
		marginTop: SPACING.xs,
		fontSize: 12,
		fontWeight: '600',
	},
	inputError: { borderColor: '#fecaca', backgroundColor: '#fff1f2' },

	muted: {
		color: '#6b7280',
		marginTop: SPACING.sm,
	},
	link: {
		color: '#0ea5e9',
		fontSize: 14,
		fontWeight: '600',
	},

	footer: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		paddingHorizontal: SPACING.lg,
		paddingTop: 10,
		backgroundColor: '#ffffff',
		borderTopWidth: 1,
		borderTopColor: '#e5e7eb',
		flexDirection: 'row',
		gap: 10,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	deleteBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: SPACING.xs,
		borderWidth: 1,
		borderColor: '#fecaca',
		backgroundColor: '#fff',
		paddingHorizontal: 14,
		borderRadius: RADIUS_MD,
		height: 48,
	},
	deleteText: {
		color: '#991b1b',
		fontWeight: '700',
	},

	saveBtn: {
		flex: 1,
		height: 48,
		borderRadius: RADIUS_MD,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		gap: SPACING.sm,
		backgroundColor: '#111827',
	},
	saveBtnDisabled: { opacity: 0.5 },
	saveText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '700',
	},

	center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
