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
	InteractionManager,
	Dimensions,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { TransactionContext } from '../../../src/context/transactionContext';
import { useGoal, Goal } from '../../../src/context/goalContext';
import { useBudget, Budget } from '../../../src/context/budgetContext';
import { useBills } from '../../../src/context/billContext';
import useAuth from '../../../src/context/AuthContext';
import { Bill } from '../../../src/services';
import BottomSheet from '../../../src/components/BottomSheet';
import { isDevMode } from '../../../src/config/environment';
import { createLogger } from '../../../src/utils/sublogger';
// DashboardService and DashboardRollup removed - no longer used in this screen
import { normalizeIconName } from '../../../src/constants/uiConstants';
import { resolveBillAppearance } from '../../../src/utils/billAppearance';
import { palette, radius, space, type } from '../../../src/ui/theme';
import { getItem, setItem, removeItem } from '../../../src/utils/safeStorage';
import {
	AppScreen,
	AppCard,
	AppText,
	AppButton,
	AppRow,
} from '../../../src/ui/primitives';

// Create namespaced logger for this service
const transactionScreenLog = createLogger('TransactionScreen');

// iOS InputAccessoryView ID
const accessoryId = 'tx-input-accessory';

// MVP: Fixed cash spending categories (per PRD)
const CASH_CATEGORIES = [
	'Food',
	'Rides',
	'Drinks',
	'Groceries',
	'Other',
] as const;

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
	// Format date directly from local components to avoid timezone conversion issues
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
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
	if (!isFinite(num) || num <= 0) return '$0';
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
	const noteInputRef = useRef<TextInput>(null);
	const scrollRef = useRef<ScrollView>(null);
	const scrollYRef = useRef(0);
	const [keyboardHeight, setKeyboardHeight] = useState(0);
	const insets = useSafeAreaInsets();

	// Bottom padding: safe area + additional breathing room
	const contentBottomPad = insets.bottom + space.xl;

	const [mode, setMode] = useState<'income' | 'expense'>(
		params.mode === 'income' ? 'income' : 'expense'
	);
	const [selectedCategory, setSelectedCategory] = useState<
		(typeof CASH_CATEGORIES)[number] | null
	>(null);

	// Sync mode from URL params when navigating with ?mode=income or ?mode=expense
	useEffect(() => {
		if (params.mode === 'income' || params.mode === 'expense') {
			setMode(params.mode);
			if (params.mode === 'income') setSelectedCategory(null);
		}
	}, [params.mode]);
	const [selectedGoals, setSelectedGoals] = useState<Goal[]>([]);
	const [selectedBudgets, setSelectedBudgets] = useState<Budget[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [pickerOpen, setPickerOpen] = useState<
		null | 'goal' | 'budget' | 'bill' | 'category'
	>(null);
	const [datePickerOpen, setDatePickerOpen] = useState(false);
	const [mountCalendar, setMountCalendar] = useState(false);
	// Debt tracking hidden for MVP - increases finance complexity perception
	// const [debts, setDebts] = useState<DebtRollup[]>([]);
	// const [debtsLoading, setDebtsLoading] = useState(false);
	// const [selectedDebt, setSelectedDebt] = useState<DebtRollup | null>(null);
	const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
	const [isAmountLocked, setIsAmountLocked] = useState(false);
	const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
	const [showAdvanced, setShowAdvanced] = useState(false);

	const { addTransaction } = useContext(TransactionContext);
	const { goals, isLoading: goalsLoading } = useGoal();
	const { budgets, isLoading: budgetsLoading } = useBudget();
	const { expenses: bills, isLoading: billsLoading } = useBills();
	const { firebaseUser, user } = useAuth();

	// Auto-expand Advanced section if bill is selected
	useEffect(() => {
		if (selectedBill && bills?.length > 0) {
			setShowAdvanced(true);
		}
	}, [selectedBill, bills]);

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

	// Debt tracking hidden for MVP - increases finance complexity perception
	// Load debts once
	// useEffect(() => {
	// 	let isMounted = true;
	// 	const loadDebts = async () => {
	// 		// Don't fetch if user is not authenticated
	// 		if (!firebaseUser || !user) {
	// 			if (isMounted) setDebtsLoading(false);
	// 			return;
	// 		}

	// 		try {
	// 			setDebtsLoading(true);
	// 			const rollup: DashboardRollup =
	// 				await DashboardService.getDashboardRollup();
	// 			if (!isMounted) return;
	// 			setDebts(rollup.debts?.debts || []);
	// 		} catch (err: any) {
	// 			// Silently handle auth errors (expected on logout)
	// 			if (err?.isAuthError || err?.message === 'User not authenticated') {
	// 				return;
	// 			}
	// 			if (isDevMode) {
	// 				transactionScreenLog.error('Failed to load debts', err);
	// 			}
	// 		} finally {
	// 			if (isMounted) setDebtsLoading(false);
	// 		}
	// 	};
	// 	loadDebts();
	// 	return () => {
	// 		isMounted = false;
	// 	};
	// }, [firebaseUser, user]);

	// MVP: Category picker doesn't need goals/budgets - no loading wait
	const ready = true;

	// Track first load to prevent loading overlay on refetch
	useEffect(() => {
		if (ready && !hasLoadedOnce) {
			setHasLoadedOnce(true);
		}
	}, [ready, hasLoadedOnce]);

	// Track keyboard height
	useEffect(() => {
		const onShow = (e: any) => setKeyboardHeight(e?.endCoordinates?.height ?? 0);
		const onHide = () => setKeyboardHeight(0);

		const showSub = Keyboard.addListener(
			Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
			onShow
		);
		const hideSub = Keyboard.addListener(
			Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
			onHide
		);

		return () => {
			showSub.remove();
			hideSub.remove();
		};
	}, []);

	// Defer Calendar mount until after interactions settle
	useEffect(() => {
		if (!datePickerOpen) {
			setMountCalendar(false);
			return;
		}
		const task = InteractionManager.runAfterInteractions(() => {
			setMountCalendar(true);
		});
		return () => task.cancel();
	}, [datePickerOpen]);

	// Keep URL in sync without navigation transition (skip first mount to prevent layout shift)
	const didMountRef = useRef(false);
	useEffect(() => {
		if (!didMountRef.current) {
			didMountRef.current = true;
			return;
		}
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
	// const [savedDebtId, setSavedDebtId] = useState<string | null>(null); // Debt tracking hidden for MVP
	const [savedBillId, setSavedBillId] = useState<string | null>(null);

	// Restore saved form state on mount (immediate, no deferral)
	useEffect(() => {
		let isMounted = true;

		(async () => {
			try {
				const saved = await getItem(FORM_STATE_KEY);

				if (!isMounted) return;

				if (saved) {
					const state = JSON.parse(saved);
					setIsNewForm(false);

					const restoredAmount =
						typeof state.amount === 'string' ? state.amount.trim() : '';

					setValue(
						'amount',
						restoredAmount && Number(restoredAmount) > 0 ? restoredAmount : ''
					);
					setValue('description', state.description ?? '');
					setValue('date', state.date ?? getLocalIsoDate());
					if (state.mode) setMode(state.mode);
					if (state.selectedGoals) setSelectedGoals(state.selectedGoals);
					if (state.selectedBudgets) setSelectedBudgets(state.selectedBudgets);
					// if (state.selectedDebtId) setSavedDebtId(state.selectedDebtId); // Debt tracking hidden for MVP
					if (state.selectedBillId) setSavedBillId(state.selectedBillId);
				} else {
					setIsNewForm(true);
				}
			} catch {
				setIsNewForm(true);
			} finally {
				if (isMounted) setHasRestoredState(true);
			}
		})();

		return () => {
			isMounted = false;
		};
	}, [setValue]);

	// Debt tracking hidden for MVP - increases finance complexity perception
	// Restore selectedDebt after debts are loaded
	// useEffect(() => {
	// 	if (savedDebtId && debts.length > 0 && !selectedDebt) {
	// 		const debt = debts.find((d) => d.debtId === savedDebtId);
	// 		if (debt) {
	// 			setSelectedDebt(debt);
	// 		}
	// 		setSavedDebtId(null);
	// 	}
	// }, [savedDebtId, debts, selectedDebt]);

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

	// Save form state as user types (debounced)
	useEffect(() => {
		if (!hasRestoredState) return; // Don't save during initial restore

		const saveState = async () => {
			try {
				const amountHasValue = Number(amount) > 0;

				const stateToSave = {
					amount: amountHasValue ? amount : '',
					description,
					date: selectedDate,
					mode,
					selectedGoals,
					selectedBudgets,
					// selectedDebtId: selectedDebt?.debtId || null, // Debt tracking hidden for MVP
					selectedBillId: selectedBill
						? selectedBill.patternId || (selectedBill as any).id
						: null,
				};

				// Only save if there's actual data
				const hasData =
					amountHasValue ||
					!!description ||
					selectedGoals.length > 0 ||
					selectedBudgets.length > 0 ||
					// !!selectedDebt || // Debt tracking hidden for MVP
					!!selectedBill;

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
		// selectedDebt, // Debt tracking hidden for MVP
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
	// MVP: Category required for expense
	const canSubmit =
		isValid &&
		!isSubmitting &&
		amountNumber > 0 &&
		(mode === 'income' || (mode === 'expense' && selectedCategory !== null));

	// ---------- Handlers
	const focusNoteCentered = useCallback(() => {
		// Focus first so keyboard starts opening
		noteInputRef.current?.focus();

		// Wait a tick so layout updates + keyboard animation begins
		requestAnimationFrame(() => {
			setTimeout(() => {
				if (!noteInputRef.current || !scrollRef.current) return;

				noteInputRef.current.measureInWindow((x, y, w, h) => {
					const screenH = Dimensions.get('window').height;

					// visible area is screen minus keyboard
					const visibleH = Math.max(0, screenH - keyboardHeight);

					// target center inside visible region
					const targetCenterY = visibleH / 2;

					// where the input's center currently is
					const inputCenterY = y + h / 2;

					// how much we need to move content (positive means scroll down)
					const delta = inputCenterY - targetCenterY;

					// scroll by delta relative to current offset
					scrollRef.current?.scrollTo({
						y: Math.max(0, (scrollYRef.current ?? 0) + delta),
						animated: true,
					});
				});
			}, Platform.OS === 'ios' ? 80 : 120);
		});
	}, [keyboardHeight]);
	const handleModeChange = useCallback(
		(newMode: 'income' | 'expense') => {
			if (!isSubmitting && mode !== newMode) {
				setMode(newMode);
				if (newMode === 'income') setSelectedCategory(null);
			}
		},
		[isSubmitting, mode]
	);
	const onChangeAmount = useCallback(
		(text: string) => {
			if (isAmountLocked) return; // Don't allow changes when locked
			const sanitized = sanitizeCurrency(text);
			// Check if the number exceeds the limit
			const num = Number(sanitized);
			if (num > 999999.99) {
				// Don't update if it exceeds the limit
				return;
			}
			setValue('amount', sanitized, { shouldValidate: true });
		},
		[setValue, isAmountLocked]
	);

	const onBlurAmount = useCallback(() => {
		const n = Number(amount);
		if (isFinite(n) && n > 0)
			setValue('amount', n.toFixed(2), { shouldValidate: true });
		trigger('amount');
	}, [amount, setValue, trigger]);

	const selectGoal = useCallback(
		(g: Goal) => {
			// Toggle: if already selected, deselect it
			if (selectedGoals[0]?.id === g.id) {
				setSelectedGoals([]);
				setValue('goals', [], { shouldValidate: false });
			} else {
				setSelectedGoals([g]);
				setValue('goals', [g], { shouldValidate: false });
			}
			setPickerOpen(null);
		},
		[setValue, selectedGoals]
	);

	const selectBudget = useCallback(
		(b: Budget) => {
			// Toggle: if already selected, deselect it
			if (selectedBudgets[0]?.id === b.id) {
				setSelectedBudgets([]);
				setValue('budgets', [], { shouldValidate: false });
			} else {
				setSelectedBudgets([b]);
				setValue('budgets', [b], { shouldValidate: false });
				// setSelectedDebt(null); // Debt tracking hidden for MVP
				setSelectedBill(null); // Clear bill when budget is selected
				setIsAmountLocked(false); // Unlock amount when bill is cleared
			}
			setPickerOpen(null);
		},
		[setValue, selectedBudgets]
	);

	const selectCategory = useCallback(
		(cat: (typeof CASH_CATEGORIES)[number]) => {
			setSelectedCategory(cat);
			setPickerOpen(null);
		},
		[]
	);

	const selectBill = useCallback(
		(bill: Bill) => {
			const billId = bill.patternId || (bill as any).id;
			const currentBillId =
				selectedBill?.patternId || (selectedBill as any)?.id;

			// Toggle: if already selected, deselect it
			if (currentBillId && currentBillId === billId) {
				setSelectedBill(null);
				setIsAmountLocked(false);
				// Clear amount if it was locked from this bill
				if (isAmountLocked && selectedBill?.amount) {
					setValue('amount', '', { shouldValidate: true });
				}
			} else {
				setSelectedBill(bill);
				setSelectedBudgets([]); // Clear budget when bill is selected
				// setSelectedDebt(null); // Debt tracking hidden for MVP
				setValue('budgets', [], { shouldValidate: false });

				// Fill in amount and lock it
				if (bill.amount) {
					setValue('amount', bill.amount.toFixed(2), { shouldValidate: true });
					setIsAmountLocked(true);
				}
			}

			setPickerOpen(null);
		},
		[setValue, selectedBill, isAmountLocked]
	);

	const onSubmit = async (data: TransactionFormData) => {
		clearErrors();

		if (!data.amount?.trim())
			return Alert.alert('Missing amount', 'Please enter an amount.');

		try {
			setIsSubmitting(true);

			const amt = Number(data.amount);
			if (!isFinite(amt) || amt <= 0)
				return Alert.alert('Invalid amount', 'Enter an amount greater than 0.');

			const isIncome = mode === 'income';
			const isExpense = mode === 'expense';

			const payload: any = {
				description: data.description?.trim() || undefined,
				amount: isIncome ? Math.abs(amt) : -Math.abs(amt),
				date: data.date,
				type: isIncome ? 'income' : 'expense',
			};

			// MVP: Cash-only - use fixed category for expenses, store in metadata
			if (isExpense && selectedCategory) {
				payload.metadata = { category: selectedCategory };
			}
			// Legacy: Budget/Goal/Bill - kept for backward compatibility but not used in MVP flow
			if (isIncome && selectedGoals.length > 0) {
				payload.target = selectedGoals[0].id;
				payload.targetModel = 'Goal';
			} else if (isExpense && selectedBudgets.length > 0) {
				payload.target = selectedBudgets[0].id;
				payload.targetModel = 'Budget';
			} else if (isExpense && selectedBill) {
				const billId = selectedBill.patternId || (selectedBill as any).id;
				payload.recurringPattern = {
					patternId: billId,
					frequency: selectedBill.frequency,
					confidence: selectedBill.confidence || 1.0,
				};
			}
			await addTransaction(payload);

			// Clear saved form state on successful submit
			await removeItem(FORM_STATE_KEY);
			setIsNewForm(true);

			Alert.alert(
				'Success',
				`${isIncome ? 'Cash IN' : 'Cash OUT'} saved!`,
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
							setSelectedBill(null);
							setSelectedCategory(null);
							setIsAmountLocked(false);
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
	// Row component replaced with AppRow primitive

	const ValueText = ({
		children,
		style,
	}: {
		children: React.ReactNode;
		style?: any;
	}) => (
		<Text numberOfLines={1} style={[type.body, styles.valueText, style]}>
			{children}
		</Text>
	);

	// =============================================================
	// Render
	// =============================================================
	// Gate rendering until state is restored to prevent layout shifts
	if (!hasRestoredState) {
		return (
			<AppScreen edges={['top']} scrollable={false}>
				<View style={styles.loadingOverlay}>
					<ActivityIndicator size="large" color={palette.primary} />
				</View>
			</AppScreen>
		);
	}

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
				// 🔻 prevent iOS from doing a delayed inset animation
				automaticallyAdjustContentInsets={false}
				contentInsetAdjustmentBehavior="never"
				automaticallyAdjustKeyboardInsets={false}
				showsVerticalScrollIndicator={false}
				onScroll={(e) => {
					scrollYRef.current = e.nativeEvent.contentOffset.y;
				}}
				scrollEventThrottle={16}
			>
				{/* Hero section: header + amount + type toggle */}
				<View>
					<AppText.Caption color="muted" style={styles.heroKicker}>
						New transaction
					</AppText.Caption>
					<AppText.Title style={styles.heroTitle}>New transaction</AppText.Title>

					<AppCard style={styles.section} padding={space.lg} borderRadius={radius.lg}>
					<View style={styles.amountRow}>
						<Pressable
							style={styles.amountInputContainer}
							onPress={() => !isAmountLocked && amountRef.current?.focus()}
							disabled={isAmountLocked}
						>
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
										style={[
											styles.amountInput,
											isAmountLocked && styles.amountInputLocked,
										]}
										placeholder="0"
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
										editable={!isAmountLocked}
										inputAccessoryViewID={
											Platform.OS === 'ios' ? accessoryId : undefined
										}
									/>
								)}
							/>
						</Pressable>
						{isAmountLocked && selectedBill && (
							<TouchableOpacity
								style={styles.unlockButton}
								onPress={() => setIsAmountLocked(false)}
								accessibilityLabel="Unlock amount for manual override"
							>
								<Ionicons
									name="lock-closed"
									size={18}
									color={palette.textMuted}
								/>
							</TouchableOpacity>
						)}
					</View>
					<View style={styles.amountUnderline} />
						{isAmountLocked && selectedBill && (
							<View style={styles.lockHintContainer}>
								<AppText.Caption color="muted" style={styles.lockHintText}>
									Amount locked from bill. Tap{' '}
									<Ionicons
										name="lock-closed"
										size={12}
										color={palette.textMuted}
									/>{' '}
									to override
								</AppText.Caption>
							</View>
						)}

						{/* Reserve space for error to prevent layout shift */}
						<View style={styles.errorContainer}>
							{errors.amount && (
								<AppText.Caption color="danger" style={styles.errorText}>
									{String(errors.amount.message)}
								</AppText.Caption>
							)}
						</View>

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
										: 'transparent',
												opacity: pressed ? 0.7 : 1,
											},
										]}
										onPress={() => handleModeChange(m)}
										accessibilityRole="button"
										accessibilityState={{ selected: active }}
									>
										<AppText.Body
											style={styles.segText}
											color={active ? 'default' : 'muted'}
										>
											{label}
										</AppText.Body>
									</Pressable>
								);
							})}
						</View>
					</AppCard>
				</View>

				{/* Details card: MVP = Category (expense) + Date */}
				<AppCard style={styles.section} padding={0} borderRadius={radius.lg}>
					{/* MVP: Category - required for Cash OUT, fixed set */}
					{mode === 'expense' && (
						<AppRow
							icon="pricetag-outline"
							label="Category"
							right={
								selectedCategory ? (
									<ValueText>{selectedCategory}</ValueText>
								) : (
									<ValueText style={{ color: palette.textMuted }}>
										Required
									</ValueText>
								)
							}
							onPress={() => {
								Keyboard.dismiss();
								setPickerOpen('category');
							}}
							showChevron
							accessibilityLabel="Select category"
							bordered
						/>
					)}

					{/* Date - always shown */}
					<AppRow
						icon="calendar-outline"
						label="Date"
						right={<ValueText>{formatDateString(selectedDate)}</ValueText>}
						onPress={() => setDatePickerOpen(true)}
						bordered={false}
					/>
				</AppCard>

				{/* MVP: Advanced (bills) hidden - cash-only focus */}
				{false && mode === 'expense' && bills?.length > 0 && (
					<AppCard style={styles.section} padding={0} borderRadius={radius.lg}>
						<AppRow
							icon="options-outline"
							label="Advanced"
							right={
								<Ionicons
									name={showAdvanced ? 'chevron-up' : 'chevron-down'}
									size={18}
									color={palette.textSubtle}
								/>
							}
							onPress={() => setShowAdvanced(!showAdvanced)}
							bordered={showAdvanced}
							showChevron={false}
						/>

						{showAdvanced && (
							<>
								{/* Bill - only show in Advanced if bills exist */}
								<AppRow
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
											<ValueText>Optional</ValueText>
										)
									}
									onPress={() => {
										Keyboard.dismiss();
										setPickerOpen('bill');
									}}
									accessibilityLabel="Select Bill"
									bordered={false}
								/>
							</>
						)}
					</AppCard>
				)}

				{/* Description input */}
				<AppCard style={styles.section}>
					<AppText.Heading style={styles.inputLabel}>Note (optional)</AppText.Heading>
					<Controller
						control={control}
						name="description"
						rules={{}}
						render={({ field: { value, onChange, onBlur } }) => (
							<TextInput
								ref={noteInputRef}
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
								onFocus={focusNoteCentered}
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
					{/* Reserve space for error to prevent layout shift */}
					<View style={{ minHeight: 18, marginTop: space.xs }}>
						{errors.description && (
							<AppText.Caption color="danger" style={styles.errorText}>
								{String(errors.description.message)}
							</AppText.Caption>
						)}
					</View>
				</AppCard>

				{/* Inline CTA */}
				<View style={styles.inlineCtaWrap}>
					{amount && Number(amount) > 0 && (
						<AppText.Caption color="muted" style={styles.miniSummary}>
							{prettyCurrency(amount || '')} • {formatDateString(selectedDate)}
						</AppText.Caption>
					)}
					<AppButton
						label={
							isSubmitting
								? 'Saving…'
								: mode === 'expense' &&
									!selectedBudgets.length &&
									selectedBill
									? 'Pay Bill'
									: 'Create Transaction'
						}
						variant="primary"
						icon={isSubmitting ? undefined : 'add'}
						onPress={() => {
							if (isSubmitting) return;
							handleSubmit(onSubmit)();
						}}
						disabled={!canSubmit}
						loading={isSubmitting}
						fullWidth
						accessibilityLabel={`Create ${mode}`}
					/>

					{!canSubmit && (
						<AppText.Caption color="muted" style={styles.inlineCtaHint}>
							Enter amount to continue.
						</AppText.Caption>
					)}
				</View>

				{/* Bottom spacer for keyboard */}
				<View style={{ height: keyboardHeight ? keyboardHeight + space.lg : 0 }} />
			</ScrollView>

			{/* (Optional) iOS accessory bar just for a "Done" keyboard dismiss */}
			{Platform.OS === 'ios' && (
				<InputAccessoryView nativeID={accessoryId}>
					<View style={styles.accessoryBar}>
						<TouchableOpacity
							onPress={() => Keyboard.dismiss()}
							hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
						>
							<AppText.Body color="primary" style={styles.accessoryDoneText}>
							Done
						</AppText.Body>
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
								pickerOpen === 'category'
									? 'pricetag-outline'
									: pickerOpen === 'goal'
									? 'trophy-outline'
									: pickerOpen === 'bill'
									? 'receipt-outline'
									: 'wallet-outline'
							}
							size={20}
							color={palette.primary}
							style={{ marginRight: space.sm }}
						/>
						<AppText.Heading style={styles.sheetTitle}>
							{pickerOpen === 'category'
								? 'Select Category'
								: pickerOpen === 'goal'
								? 'Select Goal'
								: pickerOpen === 'bill'
								? 'Select Bill'
								: 'Select Budget'}
						</AppText.Heading>
						<TouchableOpacity onPress={() => setPickerOpen(null)}>
							<Ionicons name="close" size={24} color={palette.textMuted} />
						</TouchableOpacity>
					</View>
				}
			>
				<FlatList
					data={
						pickerOpen === 'category'
							? [...CASH_CATEGORIES]
							: pickerOpen === 'goal'
							? (goals as any[])
							: pickerOpen === 'bill'
							? bills
							: (budgets as any[])
					}
					keyExtractor={(item) => {
						if (pickerOpen === 'category') return item as string;
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
						if (pickerOpen === 'category') return null; // Categories always have data
						const data =
							pickerOpen === 'goal'
								? goals
								: pickerOpen === 'bill'
								? bills
								: budgets;
						return (
							<View style={{ paddingVertical: space.md }}>
								<AppText.Body color="muted">
									{pickerOpen === 'goal'
										? 'No goals yet. Create one from Goals.'
										: pickerOpen === 'bill'
										? 'No bills yet. Create one from Bills.'
										: 'No budgets yet. Create one from Budgets.'}
								</AppText.Body>
							</View>
						);
					}}
					renderItem={({ item }) => {
						let icon: keyof typeof Ionicons.glyphMap = 'wallet-outline';
						let color = palette.text;
						let label = '';

						if (pickerOpen === 'category') {
							icon = 'pricetag-outline';
							label = item as string;
						} else if (pickerOpen === 'goal') {
							icon = normalizeIconName((item as any).icon ?? 'trophy-outline');
							color = (item as any).color ?? palette.text;
							label = (item as any).name;
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
									if (pickerOpen === 'category') {
										selectCategory(item as (typeof CASH_CATEGORIES)[number]);
									} else if (pickerOpen === 'goal') {
										selectGoal(item as Goal);
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
								<AppText.Body>{label}</AppText.Body>
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
						<AppText.Heading style={styles.sheetTitle}>Select Date</AppText.Heading>
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
						<AppText.Body style={styles.quickActionText}>Today</AppText.Body>
					</TouchableOpacity>
				</View>

				{/* Calendar - only mount after interactions settle */}
				{datePickerOpen && mountCalendar ? (
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
				) : null}
			</BottomSheet>

			{!ready && !hasLoadedOnce && (
				<View style={styles.loadingOverlay}>
					<ActivityIndicator size="large" color={palette.primary} />
					<AppText.Body color="muted" style={styles.loadingText}>
						{mode === 'income' ? 'Loading goals…' : 'Loading budgets…'}
					</AppText.Body>
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
		paddingTop: space.sm,
	},

	heroKicker: {
		marginBottom: space.xs,
	},

	heroTitle: {
		fontSize: 24,
		marginBottom: space.md,
	},

	heroSubtitle: {
		...type.body,
		color: palette.textMuted,
		marginBottom: space.lg,
	},

	// Hero = amount + segmented (using AppCard now)

	amountRow: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		justifyContent: 'center',
		gap: space.sm,
	},
	amountInputContainer: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		flex: 1,
		justifyContent: 'center',
	},
	dollar: {
		fontSize: 32,
		fontWeight: '600',
		color: palette.text,
		marginRight: 6,
		marginBottom: 6,
	},
	amountInput: {
		flexGrow: 0,
		flexShrink: 1,
		fontSize: 48,
		fontWeight: '700',
		color: palette.text,
		textAlign: 'center',
		minWidth: 30,
		paddingHorizontal: 0,
	},
	amountInputLocked: {
		opacity: 0.7,
	},
	unlockButton: {
		padding: space.xs,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 4,
	},
	lockHintContainer: {
		marginTop: space.xs,
		alignItems: 'center',
	},
	lockHintText: {
		...type.small,
		color: palette.textMuted,
	},
	amountUnderline: {
		marginTop: space.sm,
		height: 1,
		backgroundColor: palette.border,
	},
	errorContainer: {
		alignItems: 'flex-end',
		marginTop: space.xs,
		minHeight: 18, // Reserve space to prevent layout shift
	},
	errorText: { color: palette.danger, fontSize: 13, marginTop: space.xs },

	// Segmented (now inside amountCard)
	segmented: {
		marginTop: space.lg,
		backgroundColor: palette.surfaceAlt,
		borderRadius: radius.md,
		padding: 4,
		flexDirection: 'row',
		borderWidth: 1,
		borderColor: palette.border,
	},
	segBtn: {
		flex: 1,
		paddingVertical: space.sm,
		alignItems: 'center',
		justifyContent: 'center',
	},
	segBtnLeft: {
		borderTopLeftRadius: radius.sm,
		borderBottomLeftRadius: radius.sm,
	},
	segBtnRight: {
		borderTopRightRadius: radius.sm,
		borderBottomRightRadius: radius.sm,
	},
	segBtnActive: {
		backgroundColor: palette.surface,
	},
	segText: {
		fontSize: 14,
		fontWeight: '600',
	},

	// Card list (cells) - using AppCard and AppRow now
	// Row styles moved to AppRow primitive
	valueText: { color: palette.text, fontWeight: '600' },

	// Input card - using AppCard now
	inputLabel: {
		marginBottom: space.sm,
	},
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
		marginBottom: space.lg,
		backgroundColor: palette.surface,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: palette.border,
		padding: space.lg,
	},
	previewHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.xs,
		marginBottom: space.sm,
	},
	previewTitle: { 
		color: palette.text,
		fontSize: 14,
		fontWeight: '600',
	},
	previewLine: { 
		color: palette.textMuted,
		fontSize: 14,
		lineHeight: 20,
	},
	previewEmph: { 
		fontWeight: '700',
		color: palette.text,
	},

	// Section spacing
	section: {
		marginTop: space.md,
	},
	sectionLg: {
		marginTop: space.lg,
	},

	// Inline CTA - using AppButton now
	// Bottom spacing handled by contentContainerStyle paddingBottom
	inlineCtaWrap: {
		marginTop: space.lg,
		paddingTop: space.xs,
	},
	inlineCtaHint: {
		marginTop: space.sm,
		textAlign: 'center',
	},
	miniSummary: {
		textAlign: 'center',
		marginBottom: space.md,
	},

	// Accessory bar
	accessoryBar: {
		padding: space.md,
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
