import React, {
	useEffect,
	useMemo,
	useRef,
	useState,
	useContext,
	useCallback,
} from 'react';
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	Alert,
	ScrollView,
	ActivityIndicator,
	TouchableOpacity,
	Pressable,
	FlatList,
	Platform,
	Keyboard,
	InputAccessoryView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
	SafeAreaView,
	useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { TransactionContext } from '../../../src/context/transactionContext';
import { useGoal, Goal } from '../../../src/context/goalContext';
import { useBudget, Budget } from '../../../src/context/budgetContext';
import { useBills } from '../../../src/context/billContext';
import { Bill } from '../../../src/services';
import { navigateToGoalsWithModal } from '../../../src/utils/navigationUtils';
import BottomSheet from '../../../src/components/BottomSheet';
import { isDevMode } from '../../../src/config/environment';
import { createLogger } from '../../../src/utils/sublogger';
import {
	DashboardService,
	DashboardRollup,
	DebtRollup,
} from '../../../src/services/feature/dashboardService';
import { normalizeIconName } from '../../../src/constants/uiConstants';
import { resolveBillAppearance } from '../../../src/utils/billAppearance';
import { palette, radius, shadow, space, type } from '../../../src/ui/theme';
import { getItem, setItem, removeItem } from '../../../src/utils/safeStorage';

// Create namespaced logger for this service
const transactionScreenLog = createLogger('TransactionScreen');

// iOS InputAccessoryView ID
const accessoryId = 'tx-input-accessory';

interface TransactionFormData {
	type?: 'income' | 'expense';
	description: string;
	amount: string; // user‑friendly
	goals?: Goal[];
	budgets?: Budget[];
	date: string; // yyyy-mm-dd
	target?: string;
	targetModel?: 'Budget' | 'Goal';
}

// ---------- Utils
const getLocalIsoDate = (): string => {
	const today = new Date();
	const offset = today.getTimezoneOffset();
	const local = new Date(today.getTime() - offset * 60 * 1000);
	return local.toISOString().split('T')[0];
};

// Allow only digits + one dot, clamp to two decimals
const sanitizeCurrency = (value: string): string => {
	const cleaned = value.replace(/[^0-9.]/g, '');
	if (!cleaned) return '';
	const [int, ...rest] = cleaned.split('.');
	const decimals = rest.join('');
	const two = decimals.slice(0, 2);
	const normalizedInt = int.replace(/^0+(?=\d)/, '') || '0';
	const result = rest.length > 0 ? `${normalizedInt}.${two}` : normalizedInt;

	return result;
};

const prettyCurrency = (value: string): string => {
	const num = Number(value);
	if (!isFinite(num) || num <= 0) return '$0.00';
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
	}).format(num);
};

// Format date string (yyyy-mm-dd) to locale date string without timezone issues
const formatDateString = (dateString: string): string => {
	if (!dateString || typeof dateString !== 'string') return '';
	const datePart = dateString.slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return dateString;
	const [year, month, day] = datePart.split('-').map(Number);
	const date = new Date(year, month - 1, day); // month is 0-indexed
	return date.toLocaleDateString();
};

export default function TransactionScreenProModern() {
	const router = useRouter();
	const params = useLocalSearchParams<{
		mode?: 'income' | 'expense';
	}>();
	const amountRef = useRef<TextInput>(null);
	const descRef = useRef<TextInput>(null);
	const scrollRef = useRef<ScrollView>(null);

	const insets = useSafeAreaInsets();

	// Dynamic bottom padding from safe area only (no magic numbers)
	const contentBottomPad = insets.bottom + space.xl;

	const [mode, setMode] = useState<'income' | 'expense'>(
		params.mode === 'expense' ? 'expense' : 'expense' // default to Expense
	);
	const [selectedGoals, setSelectedGoals] = useState<Goal[]>([]);
	const [selectedBudgets, setSelectedBudgets] = useState<Budget[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [pickerOpen, setPickerOpen] = useState<
		null | 'goal' | 'budget' | 'debt' | 'bill'
	>(null);
	const [datePickerOpen, setDatePickerOpen] = useState(false);
	const [debts, setDebts] = useState<DebtRollup[]>([]);
	const [debtsLoading, setDebtsLoading] = useState(false);
	const [selectedDebt, setSelectedDebt] = useState<DebtRollup | null>(null);
	const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

	const { addTransaction } = useContext(TransactionContext);
	const { goals, isLoading: goalsLoading } = useGoal();
	const { budgets, isLoading: budgetsLoading } = useBudget();
	const { expenses: bills, isLoading: billsLoading } = useBills();

	// Debug logging for goals and budgets
	useEffect(() => {
		if (isDevMode) {
			transactionScreenLog.debug('Goals data', {
				count: goals?.length || 0,
				goals: goals,
				isLoading: goalsLoading,
			});
		}
	}, [goals, goalsLoading]);

	useEffect(() => {
		if (isDevMode) {
			transactionScreenLog.debug('Budgets data', {
				count: budgets?.length || 0,
				budgets: budgets,
				isLoading: budgetsLoading,
			});
		}
	}, [budgets, budgetsLoading]);

	// Load debts once
	useEffect(() => {
		let isMounted = true;
		const loadDebts = async () => {
			try {
				setDebtsLoading(true);
				const rollup: DashboardRollup =
					await DashboardService.getDashboardRollup();
				if (!isMounted) return;
				setDebts(rollup.debts?.debts || []);
			} catch (err) {
				if (isDevMode) {
					transactionScreenLog.error('Failed to load debts', err);
				}
			} finally {
				if (isMounted) setDebtsLoading(false);
			}
		};
		loadDebts();
		return () => {
			isMounted = false;
		};
	}, []);

	const ready = mode === 'income' ? !goalsLoading : !budgetsLoading;

	// Keep URL in sync without navigation transition
	useEffect(() => {
		if ((params.mode ?? 'expense') !== mode) router.setParams({ mode });
	}, [mode, params.mode, router]);

	const {
		control,
		handleSubmit,
		setValue,
		watch,
		trigger,
		formState: { errors, isValid },
		clearErrors,
		reset,
	} = useForm<TransactionFormData>({
		defaultValues: {
			description: '',
			amount: '',
			goals: [],
			budgets: [],
			date: getLocalIsoDate(),
			target: undefined,
			targetModel: undefined,
		},
		mode: 'onChange',
	});

	const amount = watch('amount');
	const description = watch('description');
	const selectedDate = watch('date');

	const FORM_STATE_KEY = 'transaction_form_state';
	const [isNewForm, setIsNewForm] = useState(true);
	const [hasRestoredState, setHasRestoredState] = useState(false);
	const [savedDebtId, setSavedDebtId] = useState<string | null>(null);
	const [savedBillId, setSavedBillId] = useState<string | null>(null);

	// Restore saved form state on mount
	useEffect(() => {
		let isMounted = true;
		const restoreState = async () => {
			try {
				const saved = await getItem(FORM_STATE_KEY);
				if (saved && isMounted) {
					const state = JSON.parse(saved);
					setIsNewForm(false);

					// Restore form values
					if (state.amount) setValue('amount', state.amount);
					if (state.description) setValue('description', state.description);
					if (state.date) setValue('date', state.date);
					if (state.mode) setMode(state.mode);
					if (state.selectedGoals) setSelectedGoals(state.selectedGoals);
					if (state.selectedBudgets) setSelectedBudgets(state.selectedBudgets);
					if (state.selectedDebtId) setSavedDebtId(state.selectedDebtId);
					if (state.selectedBillId) setSavedBillId(state.selectedBillId);

					setHasRestoredState(true);
				} else {
					setIsNewForm(true);
					setHasRestoredState(true);
				}
			} catch (err) {
				if (isDevMode) {
					transactionScreenLog.error('Failed to restore form state', err);
				}
				setIsNewForm(true);
				setHasRestoredState(true);
			}
		};
		restoreState();
		return () => {
			isMounted = false;
		};
	}, [setValue]);

	// Restore selectedDebt after debts are loaded
	useEffect(() => {
		if (savedDebtId && debts.length > 0 && !selectedDebt) {
			const debt = debts.find((d) => d.debtId === savedDebtId);
			if (debt) {
				setSelectedDebt(debt);
			}
			setSavedDebtId(null);
		}
	}, [savedDebtId, debts, selectedDebt]);

	// Restore selectedBill after bills are loaded
	useEffect(() => {
		if (savedBillId && bills.length > 0 && !selectedBill) {
			const bill = bills.find((b) => {
				const billId = b.patternId || (b as any).id;
				return billId === savedBillId;
			});
			if (bill) {
				setSelectedBill(bill);
			}
			setSavedBillId(null);
		}
	}, [savedBillId, bills, selectedBill]);

	// Focus amount on mount for new forms only
	useEffect(() => {
		if (hasRestoredState && isNewForm) {
			const t = setTimeout(() => amountRef.current?.focus(), 350);
			return () => clearTimeout(t);
		}
	}, [hasRestoredState, isNewForm]);

	// Save form state as user types (debounced)
	useEffect(() => {
		if (!hasRestoredState) return; // Don't save during initial restore

		const saveState = async () => {
			try {
				const stateToSave = {
					amount,
					description,
					date: selectedDate,
					mode,
					selectedGoals,
					selectedBudgets,
					selectedDebtId: selectedDebt?.debtId || null,
					selectedBillId: selectedBill
						? selectedBill.patternId || (selectedBill as any).id
						: null,
				};

				// Only save if there's actual data
				const hasData =
					amount ||
					description ||
					selectedGoals.length > 0 ||
					selectedBudgets.length > 0 ||
					selectedDebt ||
					selectedBill;

				if (hasData) {
					await setItem(FORM_STATE_KEY, JSON.stringify(stateToSave));
					setIsNewForm(false);
				} else {
					// Clear saved state if form is empty
					await removeItem(FORM_STATE_KEY);
					setIsNewForm(true);
				}
			} catch (err) {
				if (isDevMode) {
					transactionScreenLog.error('Failed to save form state', err);
				}
			}
		};

		// Debounce saves to avoid too frequent writes
		const timeoutId = setTimeout(saveState, 500);
		return () => clearTimeout(timeoutId);
	}, [
		amount,
		description,
		selectedDate,
		mode,
		selectedGoals,
		selectedBudgets,
		selectedDebt,
		selectedBill,
		hasRestoredState,
	]);

	// Keep caret at end for manual edits
	useEffect(() => {
		if (amountRef.current) {
			const len = amount?.length ?? 0;
			amountRef.current.setNativeProps({ selection: { start: len, end: len } });
		}
	}, [amount]);

	const amountNumber = useMemo(() => Number(amount), [amount]);
	const canSubmit =
		isValid && !isSubmitting && amountNumber > 0 && !!description?.trim();

	// ---------- Handlers
	const handleModeChange = useCallback(
		(newMode: 'income' | 'expense') => {
			if (!isSubmitting && mode !== newMode) {
				setMode(newMode);
			}
		},
		[isSubmitting, mode]
	);
	const onChangeAmount = useCallback(
		(text: string) => {
			const sanitized = sanitizeCurrency(text);
			// Check if the number exceeds the limit
			const num = Number(sanitized);
			if (num > 999999.99) {
				// Don't update if it exceeds the limit
				return;
			}
			setValue('amount', sanitized, { shouldValidate: true });
		},
		[setValue]
	);

	const onBlurAmount = useCallback(() => {
		const n = Number(amount);
		if (isFinite(n) && n > 0)
			setValue('amount', n.toFixed(2), { shouldValidate: true });
		trigger('amount');
	}, [amount, setValue, trigger]);

	const selectGoal = useCallback(
		(g: Goal) => {
			setSelectedGoals([g]);
			setValue('goals', [g], { shouldValidate: false });
			setPickerOpen(null);
		},
		[setValue]
	);

	const selectBudget = useCallback(
		(b: Budget) => {
			setSelectedBudgets([b]);
			setValue('budgets', [b], { shouldValidate: false });
			setSelectedDebt(null); // Clear debt when budget is selected
			setSelectedBill(null); // Clear bill when budget is selected
			setPickerOpen(null);
		},
		[setValue]
	);

	const selectBill = useCallback(
		(bill: Bill) => {
			setSelectedBill(bill);
			setSelectedBudgets([]); // Clear budget when bill is selected
			setSelectedDebt(null); // Clear debt when bill is selected
			setValue('budgets', [], { shouldValidate: false });
			setPickerOpen(null);
		},
		[setValue]
	);

	const onSubmit = async (data: TransactionFormData) => {
		clearErrors();

		if (!data.amount?.trim())
			return Alert.alert('Missing amount', 'Please enter an amount.');
		if (!data.description?.trim())
			return Alert.alert(
				'Missing description',
				'Please add a short description.'
			);

		try {
			setIsSubmitting(true);

			const amt = Number(data.amount);
			if (!isFinite(amt) || amt <= 0)
				return Alert.alert('Invalid amount', 'Enter an amount greater than 0.');

			const isIncome = mode === 'income';
			const isExpense = mode === 'expense';

			const payload: any = {
				description: data.description.trim(),
				amount: isIncome ? Math.abs(amt) : -Math.abs(amt),
				date: data.date,
				type: isIncome ? 'income' : 'expense',
			};

			if (isIncome) {
				if (selectedGoals.length > 0) {
					payload.target = selectedGoals[0].id;
					payload.targetModel = 'Goal';
				}
			} else if (isExpense) {
				// Budget takes priority if chosen
				if (selectedBudgets.length > 0) {
					payload.target = selectedBudgets[0].id;
					payload.targetModel = 'Budget';
				} else if (selectedBill) {
					// Link bill using recurringPattern.patternId
					const billId = selectedBill.patternId || (selectedBill as any).id;
					payload.recurringPattern = {
						patternId: billId,
						frequency: selectedBill.frequency,
						confidence: selectedBill.confidence || 1.0,
					};
				} else if (selectedDebt) {
					// Debt payments are matched by description/vendor, not via target/targetModel
					// Include debt name in description to enable automatic matching
					const debtName = selectedDebt.debtName;
					const currentDesc = payload.description.trim();
					// Only append debt name if it's not already in the description
					if (!currentDesc.toLowerCase().includes(debtName.toLowerCase())) {
						payload.description = `${currentDesc} - ${debtName}`.trim();
					}
					// Set vendor to debt name for better matching
					payload.vendor = debtName;
					// Don't set target/targetModel - server doesn't support 'Debt' as targetModel
				}
			}

			await addTransaction(payload);

			const wasDebtPayment =
				!isIncome && !selectedBudgets.length && !selectedBill && selectedDebt;
			const wasBillPayment =
				!isIncome && !selectedBudgets.length && selectedBill;

			// Clear saved form state on successful submit
			await removeItem(FORM_STATE_KEY);
			setIsNewForm(true);

			Alert.alert(
				'Success',
				wasDebtPayment
					? `Payment added to ${selectedDebt?.debtName}.`
					: wasBillPayment
					? `Payment added to ${selectedBill?.vendor || 'bill'}.`
					: `${isIncome ? 'Income' : 'Expense'} saved successfully!`,
				[
					{
						text: 'OK',
						onPress: () => {
							reset({
								description: '',
								amount: '',
								goals: [],
								budgets: [],
								date: getLocalIsoDate(),
								target: undefined,
								targetModel: undefined,
							});
							setSelectedGoals([]);
							setSelectedBudgets([]);
							setSelectedDebt(null);
							setSelectedBill(null);
							if (router.canGoBack()) router.back();
							else router.replace('/(tabs)/dashboard');
						},
					},
				]
			);
		} catch (e) {
			if (isDevMode) {
				transactionScreenLog.error('Save transaction error', e);
			}
			Alert.alert('Error', 'Failed to save. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	};

	// --------------- UI Helpers -----------------
	const Row = React.memo(
		({
			icon,
			label,
			right,
			onPress,
			accessibilityLabel,
		}: {
			icon: any;
			label: string;
			right?: React.ReactNode;
			onPress?: () => void;
			accessibilityLabel?: string;
		}) => (
			<TouchableOpacity
				onPress={onPress}
				activeOpacity={onPress ? 0.2 : 1}
				style={styles.row}
				accessibilityRole={onPress ? 'button' : undefined}
				accessibilityLabel={accessibilityLabel || label}
			>
				<View style={styles.rowLeft}>
					<View style={styles.rowIconWrap}>
						<Ionicons name={icon} size={18} color={palette.text} />
					</View>
					<Text style={[type.body, styles.rowLabel]}>{label}</Text>
				</View>
				<View style={styles.rowRight}>
					{right}
					{onPress && (
						<Ionicons
							name="chevron-forward"
							size={18}
							color={palette.textSubtle}
						/>
					)}
				</View>
			</TouchableOpacity>
		)
	);
	Row.displayName = 'Row';

	const ValueText = ({ children }: { children: React.ReactNode }) => (
		<Text numberOfLines={1} style={[type.body, styles.valueText]}>
			{children}
		</Text>
	);

	// =============================================================
	// Render
	// =============================================================
	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<ScrollView
				ref={scrollRef}
				style={{ flex: 1 }}
				contentContainerStyle={[
					styles.content,
					{ paddingBottom: contentBottomPad },
				]}
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
				automaticallyAdjustKeyboardInsets
				showsVerticalScrollIndicator={false}
			>
				{/* Hero section: header + amount + type toggle */}
				<View>
					<Text style={styles.heroKicker}>New transaction</Text>
					<Text style={styles.heroTitle}>What happened with your money?</Text>
					<Text style={styles.heroSubtitle}>
						Enter an amount, then link it to a budget, goal, bill, or debt.
					</Text>

					<View style={styles.amountCard} accessibilityRole="summary">
						<View style={styles.amountRow}>
							<Text style={styles.dollar}>$</Text>
							<Controller
								control={control}
								name="amount"
								rules={{
									required: '*Amount is required',
									validate: (v) =>
										Number(v) > 0 || 'Enter an amount greater than 0',
								}}
								render={({ field: { value, onBlur } }) => (
									<TextInput
										ref={amountRef}
										style={styles.amountInput}
										placeholder="0.00"
										placeholderTextColor={palette.textSubtle}
										keyboardType="decimal-pad"
										value={value}
										onChangeText={onChangeAmount}
										onBlur={() => {
											onBlur();
											onBlurAmount();
										}}
										returnKeyType="next"
										accessibilityLabel="Amount"
										maxLength={9}
										inputAccessoryViewID={
											Platform.OS === 'ios' ? accessoryId : undefined
										}
									/>
								)}
							/>
						</View>
						<View style={styles.amountUnderline} />

						{errors.amount && (
							<View style={styles.errorContainer}>
								<Text style={styles.errorText}>
									{String(errors.amount.message)}
								</Text>
							</View>
						)}

						{selectedDebt && mode === 'expense' && (
							<View style={styles.debtPillContainer}>
								<View style={styles.debtPill}>
									<Ionicons
										name="card-outline"
										size={14}
										color={palette.primaryMuted}
									/>
									<Text style={styles.debtPillText}>
										Paying debt: {selectedDebt.debtName}
									</Text>
								</View>
							</View>
						)}

						{selectedBill && mode === 'expense' && (
							<View style={styles.debtPillContainer}>
								<View style={styles.debtPill}>
									<Ionicons
										name={resolveBillAppearance(selectedBill).icon}
										size={14}
										color={resolveBillAppearance(selectedBill).color}
									/>
									<Text style={styles.debtPillText}>
										Paying bill: {selectedBill.vendor || 'Bill'}
									</Text>
								</View>
							</View>
						)}

						{/* Segmented control inside hero */}
						<View style={styles.segmented}>
							{(['expense', 'income'] as const).map((m, index) => {
								const active = mode === m;
								const label = m.charAt(0).toUpperCase() + m.slice(1);
								const isLeft = index === 0;
								const isRight = index === 1;
								return (
									<Pressable
										key={m}
										style={({ pressed }) => [
											styles.segBtn,
											isLeft && styles.segBtnLeft,
											isRight && styles.segBtnRight,
											active && styles.segBtnActive,
											{
												backgroundColor: active
													? palette.surface
													: palette.borderMuted,
												opacity: pressed ? 0.7 : 1,
											},
										]}
										onPress={() => handleModeChange(m)}
										accessibilityRole="button"
										accessibilityState={{ selected: active }}
									>
										<Text
											style={[
												styles.segText,
												{
													color: active ? palette.text : palette.textMuted,
												},
											]}
										>
											{label}
										</Text>
									</Pressable>
								);
							})}
						</View>
					</View>
				</View>

				{/* Details card (Budget / Goal / Debt / Note / Recurring / Date) */}
				<View style={styles.cardList}>
					<Row
						icon={mode === 'expense' ? 'scale-outline' : 'trophy-outline'}
						label={mode === 'expense' ? 'Budget' : 'Goal'}
						right={
							mode === 'expense' ? (
								selectedBudgets[0]?.name ? (
									<ValueText>{selectedBudgets[0].name}</ValueText>
								) : (
									<ValueText>None</ValueText>
								)
							) : selectedGoals[0]?.name ? (
								<ValueText>{selectedGoals[0].name}</ValueText>
							) : (
								<ValueText>None</ValueText>
							)
						}
						onPress={() => {
							if (mode === 'expense') {
								setPickerOpen('budget');
							} else {
								if (!goals?.length) return navigateToGoalsWithModal();
								setPickerOpen('goal');
							}
						}}
						accessibilityLabel={
							mode === 'expense' ? 'Select Budget' : 'Select Goal'
						}
					/>

					{mode === 'expense' && (
						<Row
							icon="card-outline"
							label="Debt"
							right={
								debtsLoading ? (
									<ActivityIndicator size="small" />
								) : selectedDebt ? (
									<ValueText>{selectedDebt.debtName}</ValueText>
								) : (
									<ValueText>None</ValueText>
								)
							}
							onPress={() => {
								setPickerOpen('debt');
							}}
							accessibilityLabel="Select Debt"
						/>
					)}

					{mode === 'expense' && (
						<Row
							icon={
								selectedBill
									? resolveBillAppearance(selectedBill).icon
									: 'receipt-outline'
							}
							label="Bill"
							right={
								billsLoading ? (
									<ActivityIndicator size="small" />
								) : selectedBill ? (
									<ValueText>{selectedBill.vendor || 'Bill'}</ValueText>
								) : (
									<ValueText>None</ValueText>
								)
							}
							onPress={() => {
								setPickerOpen('bill');
							}}
							accessibilityLabel="Select Bill"
						/>
					)}

					<Row
						icon="chatbox-ellipses-outline"
						label="Note"
						right={
							<ValueText>
								{description ? description : 'Add a short note'}
							</ValueText>
						}
						onPress={() => descRef.current?.focus()}
						accessibilityLabel="Edit note"
					/>

					<Row
						icon="calendar-outline"
						label="Date"
						right={<ValueText>{formatDateString(selectedDate)}</ValueText>}
						onPress={() => setDatePickerOpen(true)}
					/>
				</View>

				{/* Description input */}
				<View style={styles.inputCard}>
					<Text style={[type.h2, styles.inputLabel]}>Description</Text>
					<Controller
						control={control}
						name="description"
						rules={{ required: 'Please enter a short description' }}
						render={({ field: { value, onChange, onBlur } }) => (
							<TextInput
								ref={descRef}
								style={[styles.input, errors.description && styles.inputError]}
								placeholder={
									mode === 'income'
										? 'e.g., Paycheck, refund…'
										: 'e.g., Groceries, gas, subscription…'
								}
								placeholderTextColor={palette.textSubtle}
								value={value}
								onChangeText={(t) => onChange(t)}
								onBlur={() => {
									onBlur();
									trigger('description');
								}}
								onFocus={() => {
									requestAnimationFrame(() => {
										scrollRef.current?.scrollToEnd({ animated: true });
									});
								}}
								returnKeyType="done"
								blurOnSubmit={true}
								onSubmitEditing={() => Keyboard.dismiss()}
								accessibilityLabel="Description"
								maxLength={120}
								inputAccessoryViewID={
									Platform.OS === 'ios' ? accessoryId : undefined
								}
							/>
						)}
					/>
					{errors.description && (
						<Text style={styles.errorText}>
							{String(errors.description.message)}
						</Text>
					)}
				</View>

				{/* Preview */}
				<View style={styles.previewCard} accessibilityRole="summary">
					<View style={styles.previewHeader}>
						<Ionicons
							name={
								mode === 'income'
									? 'file-tray-full-outline'
									: 'file-tray-outline'
							}
							size={18}
							color={palette.text}
						/>
						<Text style={[type.body, styles.previewTitle]}>
							Review before saving
						</Text>
					</View>
					<Text style={[type.body, styles.previewLine]}>
						<Text style={styles.previewEmph}>
							{prettyCurrency(amount || '')}
						</Text>{' '}
						{mode} on {formatDateString(selectedDate)}{' '}
						{mode === 'income'
							? selectedGoals.length > 0
								? ` • Goal: ${selectedGoals[0].name}`
								: ' • No goal selected'
							: mode === 'expense'
							? selectedBudgets.length > 0
								? ` • Budget: ${selectedBudgets[0].name}`
								: selectedBill
								? ` • Bill: ${selectedBill.vendor || 'Bill'}`
								: selectedDebt
								? ` • Debt: ${selectedDebt.debtName}`
								: ' • No budget, bill, or debt selected'
							: ''}
					</Text>
				</View>

				{/* Inline CTA */}
				<View style={styles.inlineCtaWrap}>
					<TouchableOpacity
						style={[
							styles.inlineCtaBtn,
							!canSubmit && styles.inlineCtaBtnDisabled,
						]}
						activeOpacity={0.8}
						onPress={() => {
							if (isSubmitting) return;
							handleSubmit(onSubmit)();
						}}
						disabled={!canSubmit}
						accessibilityLabel={`Create ${mode}`}
						testID="create-transaction"
					>
						{isSubmitting ? (
							<>
								<ActivityIndicator size="small" color={palette.primaryTextOn} />
								<Text style={styles.inlineCtaText}>Saving…</Text>
							</>
						) : (
							<>
								<Text style={styles.inlineCtaText}>
									{mode === 'expense' && !selectedBudgets.length && selectedDebt
										? 'Pay Debt'
										: mode === 'expense' &&
										  !selectedBudgets.length &&
										  !selectedDebt &&
										  selectedBill
										? 'Pay Bill'
										: 'Create Transaction'}
								</Text>
								<Ionicons name="add" size={18} color={palette.primaryTextOn} />
							</>
						)}
					</TouchableOpacity>

					{!canSubmit && (
						<Text style={styles.inlineCtaHint}>
							Enter amount and description to continue.
						</Text>
					)}
				</View>
			</ScrollView>

			{/* (Optional) iOS accessory bar just for a "Done" keyboard dismiss */}
			{Platform.OS === 'ios' && (
				<InputAccessoryView nativeID={accessoryId}>
					<View style={styles.accessoryBar}>
						<TouchableOpacity
							onPress={() => Keyboard.dismiss()}
							hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
						>
							<Text style={styles.accessoryDoneText}>Done</Text>
						</TouchableOpacity>
					</View>
				</InputAccessoryView>
			)}

			{/* Picker Modal */}
			<BottomSheet
				isOpen={pickerOpen !== null}
				onClose={() => setPickerOpen(null)}
				snapPoints={[0.6, 0.4]}
				initialSnapIndex={0}
				header={
					<View style={styles.sheetHeader}>
						<Ionicons
							name={
								pickerOpen === 'goal'
									? 'trophy-outline'
									: pickerOpen === 'debt'
									? 'card-outline'
									: pickerOpen === 'bill'
									? 'receipt-outline'
									: 'wallet-outline'
							}
							size={20}
							color={palette.primary}
							style={{ marginRight: space.sm }}
						/>
						<Text style={[type.h1, styles.sheetTitle]}>
							{pickerOpen === 'goal'
								? 'Select Goal'
								: pickerOpen === 'debt'
								? 'Select Debt'
								: pickerOpen === 'bill'
								? 'Select Bill'
								: 'Select Budget'}
						</Text>
						<TouchableOpacity onPress={() => setPickerOpen(null)}>
							<Ionicons name="close" size={24} color={palette.textMuted} />
						</TouchableOpacity>
					</View>
				}
			>
				<FlatList
					data={
						pickerOpen === 'goal'
							? (goals as any[])
							: pickerOpen === 'debt'
							? debts
							: pickerOpen === 'bill'
							? bills
							: (budgets as any[])
					}
					keyExtractor={(item) => {
						if (pickerOpen === 'debt') return item.debtId;
						if (pickerOpen === 'bill') {
							return (item as Bill).patternId || (item as any).id;
						}
						return (item as any).id;
					}}
					initialNumToRender={12}
					windowSize={6}
					maxToRenderPerBatch={12}
					getItemLayout={(_, i) => ({ length: 48, offset: 48 * i, index: i })}
					ListEmptyComponent={() => {
						const data =
							pickerOpen === 'goal'
								? goals
								: pickerOpen === 'debt'
								? debts
								: pickerOpen === 'bill'
								? bills
								: budgets;
						if (isDevMode) {
							transactionScreenLog.debug('Picker Empty', {
								type: pickerOpen,
								dataLength: data?.length || 0,
								data: data,
							});
						}
						return (
							<View style={{ paddingVertical: space.md }}>
								<Text style={{ color: palette.textMuted }}>
									{pickerOpen === 'goal'
										? 'No goals yet. Create one from Goals.'
										: pickerOpen === 'debt'
										? 'No debts yet. Add one from Debts.'
										: pickerOpen === 'bill'
										? 'No bills yet. Create one from Bills.'
										: 'No budgets yet. Create one from Budgets.'}
								</Text>
							</View>
						);
					}}
					renderItem={({ item }) => {
						let icon: keyof typeof Ionicons.glyphMap = 'wallet-outline';
						let color = palette.text;
						let label = '';

						if (pickerOpen === 'goal') {
							icon = normalizeIconName((item as any).icon ?? 'trophy-outline');
							color = (item as any).color ?? palette.text;
							label = (item as any).name;
						} else if (pickerOpen === 'debt') {
							icon = 'card-outline';
							color = palette.text;
							label = (item as DebtRollup).debtName;
						} else if (pickerOpen === 'bill') {
							const billItem = item as Bill;
							if (billItem) {
								if (isDevMode) {
									transactionScreenLog.debug('Bill item in picker', {
										vendor: billItem.vendor,
										name: (billItem as any).name,
										patternId: billItem.patternId,
										fullItem: billItem,
									});
								}
								const billAppearance = resolveBillAppearance(billItem);
								icon = billAppearance.icon;
								color = billAppearance.color;
								// Try vendor first, then check for name field, then fallback
								label =
									billItem.vendor ||
									(billItem as any).name ||
									(billItem.patternId
										? `Bill ${billItem.patternId.slice(-4)}`
										: 'Bill');
							}
						} else {
							icon = normalizeIconName((item as any).icon ?? 'wallet-outline');
							color = (item as any).color ?? palette.text;
							label = (item as any).name;
						}

						return (
							<TouchableOpacity
								style={styles.sheetRow}
								onPress={() => {
									if (pickerOpen === 'goal') {
										selectGoal(item as Goal);
									} else if (pickerOpen === 'debt') {
										setSelectedDebt(item as DebtRollup);
										setSelectedBudgets([]); // Clear budget when debt is selected
										setSelectedBill(null); // Clear bill when debt is selected
										setValue('budgets', [], { shouldValidate: false });
										setPickerOpen(null);
									} else if (pickerOpen === 'bill') {
										selectBill(item as Bill);
									} else {
										selectBudget(item as Budget);
									}
								}}
							>
								<Ionicons
									name={icon}
									size={18}
									color={color}
									style={{ marginRight: space.sm }}
								/>
								<Text style={[type.body, { color: palette.text }]}>
									{label}
								</Text>
							</TouchableOpacity>
						);
					}}
				/>
			</BottomSheet>

			{/* Date Picker Modal */}
			<BottomSheet
				isOpen={datePickerOpen}
				onClose={() => setDatePickerOpen(false)}
				snapPoints={[0.7, 0.5]}
				initialSnapIndex={0}
				header={
					<View style={styles.sheetHeader}>
						<Ionicons
							name="calendar-outline"
							size={20}
							color={palette.primary}
							style={{ marginRight: space.sm }}
						/>
						<Text style={[type.h1, styles.sheetTitle]}>Select Date</Text>
						<TouchableOpacity onPress={() => setDatePickerOpen(false)}>
							<Ionicons name="close" size={24} color={palette.textMuted} />
						</TouchableOpacity>
					</View>
				}
			>
				{/* Quick actions */}
				<View style={styles.quickActions}>
					<TouchableOpacity
						style={styles.quickActionBtn}
						onPress={() => {
							setValue('date', getLocalIsoDate(), { shouldValidate: false });
							setDatePickerOpen(false);
						}}
					>
						<Text style={styles.quickActionText}>Today</Text>
					</TouchableOpacity>
				</View>

				{/* Calendar */}
				<Calendar
					onDayPress={(day) => {
						setValue('date', day.dateString, { shouldValidate: false });
						setDatePickerOpen(false);
					}}
					markedDates={{
						[selectedDate]: {
							selected: true,
							selectedColor: palette.primary,
							selectedTextColor: palette.primaryTextOn,
						},
					}}
					firstDay={0}
					enableSwipeMonths
					renderArrow={(direction) => (
						<Ionicons
							name={direction === 'left' ? 'chevron-back' : 'chevron-forward'}
							size={18}
							color={palette.text}
						/>
					)}
					theme={{
						backgroundColor: palette.surface,
						calendarBackground: palette.surface,
						textSectionTitleColor: palette.textSubtle,
						selectedDayBackgroundColor: palette.primary,
						selectedDayTextColor: palette.primaryTextOn,
						todayTextColor: palette.primary,
						dayTextColor: palette.text,
						textDisabledColor: palette.borderMuted,
						monthTextColor: palette.text,
						arrowColor: palette.text,
						textDayFontWeight: '500',
						textMonthFontWeight: '700',
						textDayHeaderFontWeight: '600',
						textDayFontSize: 14,
						textMonthFontSize: 16,
						textDayHeaderFontSize: 12,
					}}
				/>
			</BottomSheet>

			{!ready && (
				<View style={styles.loadingOverlay}>
					<ActivityIndicator size="large" color={palette.primary} />
					<Text style={styles.loadingText}>
						{mode === 'income' ? 'Loading goals…' : 'Loading budgets…'}
					</Text>
				</View>
			)}
		</SafeAreaView>
	);
}

// =============================================================
// Styles
// =============================================================
const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: palette.surfaceAlt },

	content: {
		paddingHorizontal: space.lg,
		paddingTop: space.xl,
	},

	heroKicker: {
		...type.small,
		color: palette.textSubtle,
		marginBottom: space.xs,
	},

	heroTitle: {
		...type.h1,
		color: palette.text,
		marginBottom: space.xs,
	},

	heroSubtitle: {
		...type.body,
		color: palette.textMuted,
		marginBottom: space.md,
	},

	// Hero = amount + segmented
	amountCard: {
		paddingHorizontal: space.lg,
		paddingVertical: space.md,
		borderRadius: radius.xl,
		backgroundColor: palette.surface,
		...shadow.card,
		marginBottom: space.lg,
	},

	amountRow: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		justifyContent: 'center',
	},
	dollar: {
		fontSize: 28,
		fontWeight: '400',
		color: palette.primary,
		marginRight: space.xs,
		marginBottom: 4,
	},
	amountInput: {
		flexShrink: 1,
		fontSize: 48,
		fontWeight: '600',
		color: palette.text,
		textAlign: 'left',
		minWidth: 120,
	},
	amountUnderline: {
		marginTop: space.xs,
		height: 2,
		backgroundColor: palette.primary,
		borderRadius: radius.pill,
	},
	errorContainer: {
		alignItems: 'flex-end',
		marginTop: space.xs,
	},
	errorText: { color: palette.danger, fontSize: 13, marginTop: space.xs },

	debtPillContainer: {
		marginTop: space.sm,
		alignItems: 'flex-start',
	},
	debtPill: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: palette.primarySubtle,
		paddingHorizontal: space.sm,
		paddingVertical: space.xs,
		borderRadius: radius.pill,
		gap: 4,
	},
	debtPillText: {
		color: palette.primaryMuted,
		fontWeight: '600',
		fontSize: 12,
	},

	// Segmented (now inside amountCard)
	segmented: {
		marginTop: space.md,
		backgroundColor: palette.chipBg,
		borderRadius: radius.lg,
		padding: 4,
		flexDirection: 'row',
	},
	segBtn: {
		flex: 1,
		paddingVertical: space.sm,
		alignItems: 'center',
		justifyContent: 'center',
	},
	segBtnLeft: {
		borderTopLeftRadius: radius.md,
		borderBottomLeftRadius: radius.md,
	},
	segBtnRight: {
		borderTopRightRadius: radius.md,
		borderBottomRightRadius: radius.md,
	},
	segBtnActive: {
		...shadow.card,
	},
	segText: {
		fontSize: 14,
		fontWeight: '700',
	},

	// Card list (cells)
	cardList: {
		backgroundColor: palette.surface,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: palette.border,
		overflow: 'hidden',
		// marginTop: space.md,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: space.md,
		paddingVertical: space.md,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: palette.border,
	},
	rowLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
	rowIconWrap: {
		width: 28,
		height: 28,
		borderRadius: radius.md,
		backgroundColor: palette.subtle,
		alignItems: 'center',
		justifyContent: 'center',
	},
	rowLabel: { color: palette.text },
	rowRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.xs,
		maxWidth: '55%',
	},
	valueText: { color: palette.text, fontWeight: '600' },

	// Input card
	inputCard: {
		marginTop: space.lg,
		backgroundColor: palette.surface,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: palette.border,
		padding: space.md,
	},
	inputLabel: { color: palette.text, marginBottom: space.sm },
	input: {
		height: 48,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: palette.border,
		paddingHorizontal: space.md,
		fontSize: 16,
		color: palette.text,
		backgroundColor: palette.surface,
	},
	inputError: { borderColor: palette.danger, borderWidth: 1.5 },

	// Preview
	previewCard: {
		marginTop: space.lg,
		backgroundColor: palette.surfaceAlt,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: palette.border,
		padding: space.md,
	},
	previewHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.xs,
		marginBottom: 4,
	},
	previewTitle: { color: palette.text },
	previewLine: { color: palette.text },
	previewEmph: { fontWeight: '800' },

	// Inline CTA
	inlineCtaWrap: {
		marginTop: space.lg,
		paddingBottom: space.xl,
	},
	inlineCtaBtn: {
		minHeight: 52,
		borderRadius: radius.lg,
		backgroundColor: palette.primary,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: space.xs,
		shadowColor: '#000',
		shadowOpacity: 0.12,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 6 },
		elevation: 5,
	},
	inlineCtaBtnDisabled: {
		backgroundColor: palette.primarySubtle,
	},
	inlineCtaText: {
		color: palette.primaryTextOn,
		fontWeight: '700',
		fontSize: 16,
	},
	inlineCtaHint: {
		marginTop: space.xs,
		textAlign: 'center',
		color: palette.textMuted,
		fontSize: 12,
	},

	// Accessory bar
	accessoryBar: {
		padding: space.sm,
		alignItems: 'flex-end',
		backgroundColor: palette.surfaceAlt,
	},
	accessoryDoneText: {
		color: palette.primary,
		fontWeight: '700',
	},

	// BottomSheet shared
	sheetHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: space.lg,
		paddingBottom: space.sm,
	},
	sheetTitle: {
		flex: 1,
		color: palette.text,
	},
	sheetRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: palette.border,
		paddingHorizontal: space.lg,
	},

	// Date quick action
	quickActions: {
		flexDirection: 'row',
		gap: space.sm,
		paddingHorizontal: space.lg,
		paddingBottom: space.sm,
	},
	quickActionBtn: {
		flex: 1,
		paddingVertical: space.sm,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: palette.border,
		alignItems: 'center',
		backgroundColor: palette.surface,
	},
	quickActionText: {
		color: palette.text,
		fontWeight: '600',
	},

	// Loading overlay
	loadingOverlay: {
		...StyleSheet.absoluteFillObject,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: palette.surfaceAlt,
	},
	loadingText: {
		marginTop: space.sm,
		color: palette.textMuted,
		fontWeight: '600',
	},
});
