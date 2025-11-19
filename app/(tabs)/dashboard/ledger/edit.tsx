import { logger } from '../../../../src/utils/logger';
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
import { palette, radius, space, shadow } from '../../../../src/ui/theme';

// Contexts (paths may differ in your repo)
import { TransactionContext } from '../../../../src/context/transactionContext';
import { useBudget } from '../../../../src/context/budgetContext';
import { useGoal } from '../../../../src/context/goalContext';
import { useRecurringExpense } from '../../../../src/context/recurringExpenseContext';
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

/** Refreshed RecurringPicker: card-style, with nice empty state */
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

	const hasPatterns = data.length > 0;

	const items = useMemo(() => {
		if (!hasPatterns) return [];
		const term = q.trim().toLowerCase();
		if (!term) return data;
		return data.filter((d) =>
			(d.vendor || 'Recurring').toLowerCase().includes(term)
		);
	}, [data, q, hasPatterns]);

	const selected = hasPatterns
		? data.find((d) => d.patternId === value)
		: undefined;

	// ---------- Empty state (no patterns at all) ----------
	if (!hasPatterns) {
		return (
			<View style={styles.group}>
				<Text style={styles.label}>Recurring expense (optional)</Text>
				<View style={styles.recEmptyCard}>
					<View style={styles.recEmptyIconWrap}>
						<Ionicons name="repeat" size={18} color={palette.primary} />
					</View>
					<Text style={styles.recEmptyBody}>
						There are no recurring expenses to choose from.
					</Text>
				</View>
			</View>
		);
	}

	// ---------- Normal state (patterns exist) ----------
	const summaryText = selected
		? `${selected.frequency || 'monthly'} • next ${
				selected.nextExpectedDate
					? new Date(selected.nextExpectedDate).toLocaleDateString()
					: toLocalISODate(date)
		  }`
		: 'Not linked to a pattern';

	return (
		<View style={styles.group}>
			<Text style={styles.label}>Recurring expense (optional)</Text>
			<Text style={styles.labelSmall}>
				Link this to a repeating bill or subscription so Brie can track it for
				you.
			</Text>

			{/* Summary card / trigger */}
			<TouchableOpacity
				style={styles.recCard}
				onPress={() => setOpen((v) => !v)}
				accessibilityRole="button"
				accessibilityState={{ expanded: open }}
			>
				<View style={styles.recCardLeft}>
					<View style={styles.recCardIcon}>
						<Ionicons name="repeat" size={18} color="#0369a1" />
					</View>
					<View style={{ flex: 1 }}>
						<Text style={styles.recCardTitle}>
							{selected?.vendor || 'Link to recurring expense'}
						</Text>
						<Text style={styles.recCardSub} numberOfLines={1}>
							{summaryText}
						</Text>
					</View>
				</View>
				<Ionicons
					name={open ? 'chevron-up' : 'chevron-down'}
					size={18}
					color="#6b7280"
				/>
			</TouchableOpacity>

			{/* Quick unlink pill when linked */}
			{selected && !open && (
				<TouchableOpacity
					style={styles.recUnlinkInline}
					onPress={() => onChange(undefined)}
					hitSlop={8}
				>
					<Ionicons name="close-circle" size={14} color="#0ea5e9" />
					<Text style={styles.recUnlinkInlineText}>
						Unlink recurring pattern
					</Text>
				</TouchableOpacity>
			)}

			{/* Drop-down list */}
			{open && (
				<View style={styles.recSheet}>
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
						<Text style={styles.recEmptyListText}>No matches found.</Text>
					) : (
						items.map((exp) => {
							const active = value === exp.patternId;
							const next = exp.nextExpectedDate
								? new Date(exp.nextExpectedDate).toLocaleDateString()
								: toLocalISODate(date);
							return (
								<TouchableOpacity
									key={exp.patternId}
									style={[styles.comboRow, active && styles.comboRowActive]}
									onPress={() => {
										onChange(exp.patternId);
										Haptics.selectionAsync();
										setOpen(false);
									}}
									accessibilityRole="button"
									accessibilityState={{ selected: active }}
								>
									<View style={styles.comboIcon}>
										<Ionicons name="repeat" size={18} color="#0ea5e9" />
									</View>
									<View style={{ flex: 1 }}>
										<Text style={styles.optionTitle} numberOfLines={1}>
											{exp.vendor || 'Recurring expense'}
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
							);
						})
					)}

					{!!value && (
						<TouchableOpacity
							style={styles.recClearLink}
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
				style={{ marginRight: space.sm }}
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
					paddingBottom: Math.max(bottomInset, space.md),
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

	// derived lists
	const selectableBudgets = useMemo(() => budgets ?? [], [budgets]);
	const selectableGoals = useMemo(() => goals ?? [], [goals]);

	// what models are actually available?
	const availableModels = useMemo(() => {
		const models: ('Budget' | 'Goal')[] = [];
		if (selectableBudgets.length > 0) models.push('Budget');
		if (selectableGoals.length > 0) models.push('Goal');
		return models;
	}, [selectableBudgets, selectableGoals]);

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

		// Use absolute value in the input to keep UI consistent,
		// but keep sign encoded via `type` (matches transactions model).
		const rawAmount = typeof tx.amount === 'number' ? Math.abs(tx.amount) : 0;
		setAmountInput(rawAmount.toFixed(2));

		// Derive type from tx.type if present, otherwise from amount sign
		const derivedType: TxType =
			tx.type ??
			(typeof tx.amount === 'number' && tx.amount < 0 ? 'expense' : 'income');
		setType(derivedType);

		// Convert date to ISO string format (yyyy-mm-dd)
		const base = tx.date.includes('T')
			? new Date(tx.date)
			: new Date(`${tx.date}T00:00:00`);
		setDate(
			isNaN(base.getTime())
				? new Date().toISOString().split('T')[0]
				: base.toISOString().split('T')[0]
		);

		// Handle budget/goal linking with validation for missing/deleted items
		// If the stored targetId no longer exists (deleted), treat as null
		if (tx.targetModel === 'Budget' && tx.target) {
			const hasBudget = selectableBudgets.some((b) => b.id === tx.target);
			if (hasBudget) {
				// Valid budget exists - set it
				setTargetModel('Budget');
				setSelectedBudgetId(tx.target);
				setSelectedGoalId(undefined);
			} else {
				// Budget was deleted - treat as unlinked
				setTargetModel(undefined);
				setSelectedBudgetId(undefined);
				setSelectedGoalId(undefined);
			}
		} else if (tx.targetModel === 'Goal' && tx.target) {
			const hasGoal = selectableGoals.some((g) => g.id === tx.target);
			if (hasGoal) {
				// Valid goal exists - set it
				setTargetModel('Goal');
				setSelectedGoalId(tx.target);
				setSelectedBudgetId(undefined);
			} else {
				// Goal was deleted - treat as unlinked
				setTargetModel(undefined);
				setSelectedBudgetId(undefined);
				setSelectedGoalId(undefined);
			}
		} else {
			// No target or no targetModel - fully unlinked
			setTargetModel(undefined);
			setSelectedBudgetId(undefined);
			setSelectedGoalId(undefined);
		}

		// ----- Recurring pattern handling (NEW safety) -----
		if (tx.recurringPattern?.patternId) {
			const exists = recurringExpenses.some(
				(e) => e.patternId === tx.recurringPattern!.patternId
			);
			setRecurringExpenseId(exists ? tx.recurringPattern.patternId : undefined);
		} else {
			setRecurringExpenseId(undefined);
		}
	}, [tx, selectableBudgets, selectableGoals, recurringExpenses]);

	// validation
	const errors = useMemo(() => {
		const e: Record<string, string> = {};
		if (!description.trim()) e.description = 'Please enter a description.';
		if (parseMoney(amountInput) <= 0)
			e.amount = 'Enter a valid amount greater than 0.';
		const parsedDate = date ? new Date(`${date}T00:00:00`) : new Date('');
		if (!date || isNaN(parsedDate.getTime())) e.date = 'Choose a valid date.';

		// Only validate target if:
		//  - user has explicitly chosen a model AND
		//  - there are items for that model
		if (targetModel === 'Budget' && selectableBudgets.length > 0 && !targetId) {
			e.target = 'Select a budget or unlink.';
		}
		if (targetModel === 'Goal' && selectableGoals.length > 0 && !targetId) {
			e.target = 'Select a goal or unlink.';
		}
		return e;
	}, [
		description,
		amountInput,
		date,
		targetModel,
		targetId,
		selectableBudgets.length,
		selectableGoals.length,
	]);

	const topError =
		errors.description || errors.amount || errors.date || errors.target || null;

	// enable save only if there are changes AND no errors
	const hasChanges = useMemo(() => {
		if (!tx) return false;

		const amountNum = Number(parseMoney(amountInput).toFixed(2));
		const signedAmount = type === 'expense' ? -amountNum : amountNum;
		const origAmount = Number(tx.amount ?? 0);
		const origType: TxType = tx.type ?? (origAmount < 0 ? 'expense' : 'income');

		// For target comparison: if the original target was deleted (no longer exists),
		// treat it as if the original was undefined (don't count as a change)
		let effectiveOrigTargetModel: string | undefined = undefined;
		let effectiveOrigTarget: string | undefined = undefined;

		if (tx.targetModel === 'Budget' && tx.target) {
			const hasBudget = selectableBudgets.some((b) => b.id === tx.target);
			if (hasBudget) {
				effectiveOrigTargetModel = tx.targetModel;
				effectiveOrigTarget = tx.target;
			}
			// else: budget was deleted, treat as undefined (no change)
		} else if (tx.targetModel === 'Goal' && tx.target) {
			const hasGoal = selectableGoals.some((g) => g.id === tx.target);
			if (hasGoal) {
				effectiveOrigTargetModel = tx.targetModel;
				effectiveOrigTarget = tx.target;
			}
			// else: goal was deleted, treat as undefined (no change)
		}

		// For recurring pattern comparison: if the original pattern was deleted,
		// treat it as if the original was undefined (don't count as a change)
		let effectiveOrigRecurringPatternId: string | undefined = undefined;
		if (tx.recurringPattern?.patternId) {
			const hasPattern = recurringExpenses.some(
				(e) => e.patternId === tx.recurringPattern!.patternId
			);
			if (hasPattern) {
				effectiveOrigRecurringPatternId = tx.recurringPattern.patternId;
			}
			// else: pattern was deleted, treat as undefined (no change)
		}

		return (
			description.trim() !== (tx.description ?? '').trim() ||
			signedAmount !== origAmount ||
			type !== origType ||
			(date ?? '') !==
				(tx.date.includes('T') ? tx.date.slice(0, 10) : tx.date) ||
			(targetModel ?? undefined) !== effectiveOrigTargetModel ||
			(targetId ?? undefined) !== effectiveOrigTarget ||
			(recurringExpenseId ?? undefined) !== effectiveOrigRecurringPatternId
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
		selectableBudgets,
		selectableGoals,
		recurringExpenses,
	]);

	// Note: Back navigation guard would require useFocusEffect or similar
	// For now, we'll rely on the contextual save button to indicate changes

	const canSave = hasChanges && Object.keys(errors).length === 0;

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

			const amountNum = Number(parseMoney(amountInput).toFixed(2));
			const signedAmount = type === 'expense' ? -amountNum : amountNum;

			// Determine target and targetModel with explicit null handling for unlinking
			// If user explicitly cleared the link (targetModel set but no targetId),
			// send null to tell backend to remove the link
			const originalHasTarget = !!(tx.target && tx.targetModel);
			const currentHasTarget = !!(targetId && targetModel);

			const payload: Partial<Transaction> = {
				description: description.trim(),
				amount: signedAmount,
				type,
				date, // date is already in ISO string format (yyyy-mm-dd)
				// Send explicit null when unlinking (had target, now don't)
				// Send undefined when no change needed (never had target, still don't)
				// Use type assertion to allow null for explicit unlinking
				target: currentHasTarget
					? targetId
					: originalHasTarget
					? (null as any)
					: undefined,
				targetModel: currentHasTarget
					? targetModel
					: originalHasTarget
					? (null as any)
					: undefined,
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
						Linked to a recurring {tx.recurringPattern.frequency} payment
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
				{/* Type, Description, and Amount wrapped together */}
				<View style={styles.group}>
					{/* Type toggle */}
					<View style={styles.fieldSection}>
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
											// Clear all selections when changing type
											setSelectedBudgetId(undefined);
											setSelectedGoalId(undefined);

											// Set default target model based on what's available
											if (t === 'income') {
												const newModel = availableModels.includes('Goal')
													? 'Goal'
													: availableModels.includes('Budget')
													? 'Budget'
													: undefined;
												setTargetModel(newModel);
											} else {
												const newModel = availableModels.includes('Budget')
													? 'Budget'
													: availableModels.includes('Goal')
													? 'Goal'
													: undefined;
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
					<View style={styles.fieldSection}>
						<Text style={styles.label}>Description</Text>
						<View
							style={[styles.inputRow, errors.description && styles.inputError]}
						>
							<Ionicons
								name="create-outline"
								size={18}
								color="#6b7280"
								style={{ marginRight: space.sm }}
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
					<View>
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

				{/* Helper text when no budgets or goals available */}
				{selectableBudgets.length === 0 && selectableGoals.length === 0 && (
					<Text style={styles.helperText}>
						You don&apos;t have any budgets or goals yet. You can create them
						later and link this transaction from its details.
					</Text>
				)}

				{/* Target (Budget/Goal) - only if we actually have something */}
				{availableModels.length > 0 && (
					<View style={styles.group}>
						<Text style={styles.label}>Apply To (optional)</Text>

						<View style={styles.applyToggle}>
							{availableModels.map((m) => {
								const active = targetModel === m;
								return (
									<TouchableOpacity
										key={m}
										style={[
											styles.applyToggleBtn,
											active && styles.applyToggleBtnActive,
										]}
										onPress={() => {
											if (active) {
												// tap again to clear
												setTargetModel(undefined);
											} else {
												// switch model and clear the other selection
												if (m === 'Budget') {
													setSelectedGoalId(undefined);
												} else if (m === 'Goal') {
													setSelectedBudgetId(undefined);
												}
												setTargetModel(m);
											}
											Haptics.selectionAsync();
										}}
										accessibilityRole="button"
										accessibilityState={{ selected: active }}
									>
										<Text
											style={[
												styles.applyToggleText,
												active && styles.applyToggleTextActive,
											]}
										>
											{m}
										</Text>
									</TouchableOpacity>
								);
							})}
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

				{/* Recurring Expense (refreshed) */}
				<RecurringPicker
					value={recurringExpenseId}
					onChange={setRecurringExpenseId}
					data={recurringExpenses}
					date={new Date(`${date}T00:00:00`)}
				/>

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
	container: { flex: 1, backgroundColor: palette.bg },

	headerDivider: { height: 1, backgroundColor: palette.border },

	hairline: { height: 1, backgroundColor: palette.border, marginVertical: 8 },

	errorBanner: {
		marginHorizontal: space.lg,
		marginTop: space.md,
		padding: space.sm + 2,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: palette.dangerBorder,
		backgroundColor: palette.dangerSubtle,
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.xs,
	},
	errorBannerText: { color: palette.danger, fontWeight: '600', flex: 1 },

	banner: {
		marginHorizontal: space.lg,
		marginTop: space.md,
		padding: space.md,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: palette.primarySubtle,
		backgroundColor: palette.infoSubtle,
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.sm,
	},
	bannerText: { color: palette.primary, fontWeight: '600' },

	content: {
		paddingHorizontal: space.lg,
		paddingTop: space.md,
		paddingBottom: space.xl,
	},

	// Each logical section is a soft card
	group: {
		marginBottom: space.lg,
		paddingHorizontal: space.md,
		paddingVertical: space.md,
		borderRadius: radius.xl,
		backgroundColor: palette.surface,
		borderWidth: 1,
		borderColor: palette.border,
		shadowColor: shadow.card.shadowColor,
		shadowOpacity: shadow.card.shadowOpacity * 0.33,
		shadowRadius: shadow.card.shadowRadius * 0.4,
		shadowOffset: shadow.card.shadowOffset,
		elevation: shadow.card.elevation * 0.5,
	},

	// Field section inside a group (for spacing between fields)
	fieldSection: {
		marginBottom: space.md,
	},

	label: {
		fontSize: 13,
		color: palette.textMuted,
		marginBottom: space.sm,
		fontWeight: '600',
		lineHeight: 18,
	},
	labelSmall: {
		fontSize: 12,
		color: palette.textMuted,
		marginTop: -2,
		marginBottom: space.sm,
		fontWeight: '500',
	},

	inputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: palette.surfaceAlt,
		borderRadius: RADIUS_MD,
		paddingHorizontal: space.md,
		borderWidth: 1,
		borderColor: palette.border,
		minHeight: INPUT_HEIGHT,
	},
	inputBare: {
		flex: 1,
		fontSize: 16,
		color: palette.text,
		paddingVertical: 10,
	},
	preview: { fontSize: 13, color: palette.textMuted, marginLeft: space.sm },

	selector: {
		minHeight: INPUT_HEIGHT,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: palette.surfaceAlt,
		borderRadius: RADIUS_MD,
		borderWidth: 1,
		borderColor: palette.border,
		paddingHorizontal: space.md,
	},
	selectorText: { fontSize: 16, color: palette.text },

	// Combo-box trigger becomes flatter; when open it connects visually to the sheet
	comboTrigger: {
		minHeight: INPUT_HEIGHT,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: palette.surfaceAlt,
		borderRadius: RADIUS_MD,
		borderWidth: 1,
		borderColor: palette.border,
		paddingHorizontal: space.md,
	},
	comboTriggerActive: {
		borderBottomLeftRadius: 0,
		borderBottomRightRadius: 0,
		borderColor: palette.border,
	},

	/** -------- Recurring empty / card styles -------- */

	recEmptyCard: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: space.md,
		paddingVertical: space.sm + 2,
		borderRadius: RADIUS_MD,
		borderWidth: 1,
		borderColor: palette.border,
		backgroundColor: palette.surfaceAlt,
		gap: space.md,
	},
	recEmptyIconWrap: {
		width: 28,
		height: 28,
		borderRadius: 999,
		backgroundColor: palette.primarySubtle,
		alignItems: 'center',
		justifyContent: 'center',
	},
	recEmptyBody: {
		flex: 1,
		fontSize: 13,
		color: palette.textMuted,
		lineHeight: 18,
	},

	recCard: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: space.md,
		paddingVertical: space.md,
		borderRadius: RADIUS_MD,
		borderWidth: 1,
		borderColor: palette.border,
		backgroundColor: palette.surfaceAlt,
	},
	recCardLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.sm,
		flex: 1,
	},
	recCardIcon: {
		width: 32,
		height: 32,
		borderRadius: radius.md,
		backgroundColor: palette.primarySubtle,
		alignItems: 'center',
		justifyContent: 'center',
	},
	recCardTitle: {
		fontSize: 15,
		color: palette.text,
		fontWeight: '600',
	},
	recCardSub: {
		fontSize: 12,
		color: palette.textMuted,
		marginTop: 2,
	},

	recUnlinkInline: {
		marginTop: 6,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	recUnlinkInlineText: {
		fontSize: 12,
		color: palette.primary,
		fontWeight: '600',
	},

	recSheet: {
		borderWidth: 1,
		borderColor: palette.border,
		borderBottomLeftRadius: RADIUS_MD,
		borderBottomRightRadius: RADIUS_MD,
		backgroundColor: palette.surface,
		marginTop: 6,
		overflow: 'hidden',
		shadowColor: shadow.card.shadowColor,
		shadowOpacity: shadow.card.shadowOpacity * 0.67,
		shadowRadius: shadow.card.shadowRadius * 0.6,
		shadowOffset: shadow.card.shadowOffset,
		elevation: shadow.card.elevation * 0.5,
	},
	comboRowActive: {
		backgroundColor: palette.surfaceAlt,
	},
	recEmptyListText: {
		fontSize: 13,
		color: palette.textMuted,
		paddingHorizontal: space.md,
		paddingVertical: space.sm,
	},
	recClearLink: {
		paddingHorizontal: space.md,
		paddingVertical: space.sm,
	},

	// Floating sheet with a single border & shadow (no per-row borders)
	comboSheet: {
		borderWidth: 1,
		borderColor: palette.border,
		backgroundColor: palette.surface,
		borderBottomLeftRadius: RADIUS_MD,
		borderBottomRightRadius: RADIUS_MD,
		shadowColor: shadow.card.shadowColor,
		shadowOpacity: shadow.card.shadowOpacity,
		shadowRadius: shadow.card.shadowRadius * 0.8,
		shadowOffset: shadow.card.shadowOffset,
		elevation: shadow.card.elevation,
		overflow: 'hidden',
	},

	comboSearch: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: space.md,
		height: 44,
		backgroundColor: palette.surfaceAlt,
		borderBottomWidth: 1,
		borderBottomColor: palette.border,
		gap: space.sm,
	},

	comboRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: space.md,
		paddingVertical: space.sm + 2,
		backgroundColor: palette.surface,
		gap: space.md,
	},

	comboIcon: {
		width: ICON_SIZE,
		height: ICON_SIZE,
		borderRadius: radius.md,
		backgroundColor: palette.primarySubtle,
		alignItems: 'center',
		justifyContent: 'center',
	},

	comboSeparator: {
		height: 1,
		backgroundColor: palette.border,
		marginLeft: space.md + ICON_SIZE + space.md,
	},

	/** -------- Segments / toggles -------- */

	segment: {
		flexDirection: 'row',
		backgroundColor: palette.subtle,
		borderRadius: RADIUS_MD,
		padding: 4,
		gap: space.xs,
	},
	segmentBtn: {
		flex: 1,
		paddingVertical: 10,
		borderRadius: radius.md,
		alignItems: 'center',
	},
	segmentBtnActive: {
		backgroundColor: palette.text,
		shadowColor: shadow.card.shadowColor,
		shadowOpacity: shadow.card.shadowOpacity * 0.5,
		shadowRadius: shadow.card.shadowRadius * 0.6,
		shadowOffset: shadow.card.shadowOffset,
		elevation: shadow.card.elevation * 0.5,
	},
	segmentText: {
		fontSize: 15,
		color: palette.textMuted,
		fontWeight: '600',
	},
	segmentTextActive: { color: palette.bg },

	/** -------- Apply To segmented control (Budget / Goal) -------- */

	applyToggle: {
		flexDirection: 'row',
		backgroundColor: palette.subtle,
		borderRadius: RADIUS_MD,
		padding: 4,
		gap: space.xs,
		alignSelf: 'stretch', // take full width of the group
		width: '100%', // belt + suspenders
	},

	applyToggleBtn: {
		flex: 1, // each button takes equal width
		paddingVertical: 10,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
	},

	applyToggleBtnActive: {
		backgroundColor: palette.text,
		shadowColor: shadow.card.shadowColor,
		shadowOpacity: shadow.card.shadowOpacity * 0.5,
		shadowRadius: shadow.card.shadowRadius * 0.6,
		shadowOffset: shadow.card.shadowOffset,
		elevation: shadow.card.elevation * 0.5,
	},

	applyToggleText: {
		fontSize: 14,
		color: palette.textMuted,
		fontWeight: '600',
	},

	applyToggleTextActive: {
		color: palette.bg,
	},

	/** -------- Apply-to chips -------- */

	selectionChip: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: palette.infoSubtle,
		borderRadius: RADIUS_MD,
		borderWidth: 1,
		borderColor: palette.primarySubtle,
		paddingHorizontal: space.md,
		paddingVertical: space.sm + 2,
		marginTop: space.sm,
	},
	selectionChipActive: {
		backgroundColor: palette.primarySubtle,
		borderColor: palette.primary,
		borderWidth: 1.5,
	},
	selectionChipLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.sm,
		flex: 1,
	},
	selectionChipIcon: {
		width: 28,
		height: 28,
		borderRadius: radius.sm,
		backgroundColor: palette.primarySubtle,
		justifyContent: 'center',
		alignItems: 'center',
	},
	selectionChipTextContainer: {
		flex: 1,
	},
	selectionChipText: {
		fontSize: 12,
		color: palette.primary,
		fontWeight: '500',
		marginBottom: 2,
	},
	selectionChipItemName: {
		fontSize: 14,
		color: palette.text,
		fontWeight: '700',
	},
	selectionChipUnlink: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: palette.primary,
		backgroundColor: 'transparent',
	},
	selectionChipUnlinkText: {
		fontSize: 12,
		color: palette.primary,
		fontWeight: '700',
	},

	optionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: space.md,
		backgroundColor: palette.surface,
		gap: space.md,
	},
	optionRowActive: { backgroundColor: palette.surfaceAlt },
	optionSeparator: {
		height: 1,
		backgroundColor: palette.border,
		marginLeft: space.md + ICON_SIZE + space.md,
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
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
	},

	/** -------- Meta / helper text -------- */

	meta: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.xs,
		marginTop: space.xs,
		marginHorizontal: space.sm,
	},
	metaText: {
		fontSize: 12,
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
		marginTop: space.sm,
		marginHorizontal: 4,
		opacity: 0.85,
		lineHeight: 18,
	},
	link: {
		color: palette.primary,
		fontSize: 14,
		fontWeight: '600',
	},

	/** -------- Footer -------- */

	footer: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		paddingHorizontal: space.lg,
		paddingTop: 10,
		backgroundColor: palette.surface,
		borderTopWidth: 1,
		borderTopColor: palette.border,
		flexDirection: 'row',
		gap: space.sm,
		shadowColor: shadow.card.shadowColor,
		shadowOpacity: shadow.card.shadowOpacity * 0.83,
		shadowRadius: shadow.card.shadowRadius * 0.8,
		shadowOffset: shadow.card.shadowOffset,
		elevation: shadow.card.elevation,
	},
	deleteBtn: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: space.xs,
		borderWidth: 1,
		borderColor: palette.dangerBorder,
		backgroundColor: palette.surface,
		paddingHorizontal: space.md,
		borderRadius: RADIUS_MD,
		height: 48,
	},
	deleteText: {
		color: palette.danger,
		fontWeight: '700',
	},

	saveBtn: {
		flex: 1,
		height: 48,
		borderRadius: RADIUS_MD,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		gap: space.sm,
		backgroundColor: palette.text,
	},
	saveBtnDisabled: { opacity: 0.5 },
	saveText: {
		color: palette.bg,
		fontSize: 16,
		fontWeight: '700',
	},

	center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
