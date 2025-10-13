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
	FlatList,
} from 'react-native';
import { RectButton } from 'react-native-gesture-handler';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TransactionContext } from '../../../src/context/transactionContext';
import { useGoal, Goal } from '../../../src/context/goalContext';
import { useBudget, Budget } from '../../../src/context/budgetContext';
import { navigateToGoalsWithModal } from '../../../src/utils/navigationUtils';
import { FooterBar } from '../../../src/ui';
import { DateField } from '../../../src/components/DateField';
import SlidingModal from '../../../src/components/SlidingModal';

// =============================================================
// Design tokens (modern blue accent)
// =============================================================
const palette = {
	bg: '#F6F9F5',
	surface: '#FFFFFF',
	text: '#0F172A',
	sub: '#64748B',
	line: '#E5E9EF',
	accent: '#0095FF', // primary blue (brand)
	accentDark: '#0077CC',
	danger: '#EF4444',
	green: '#6CC24A', // for income
	red: '#EF4444', // for expense
};

type Frequency = 'None' | 'Daily' | 'Weekly' | 'Monthly';

interface TransactionFormData {
	type?: 'income' | 'expense' | 'transfer';
	description: string;
	amount: string; // user‑friendly
	goals?: Goal[];
	budgets?: Budget[];
	date: string; // yyyy-mm-dd
	target?: string;
	targetModel?: 'Budget' | 'Goal';
	ignoreFromBudgets?: boolean;
	recurring?: {
		enabled: boolean;
		frequency: Frequency;
	};
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
	return rest.length > 0 ? `${normalizedInt}.${two}` : normalizedInt;
};

const prettyCurrency = (value: string): string => {
	const num = Number(value);
	if (!isFinite(num) || num <= 0) return '$0.00';
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
	}).format(num);
};

export default function TransactionScreenProModern() {
	const router = useRouter();
	const params = useLocalSearchParams<{
		mode?: 'income' | 'expense' | 'transfer';
	}>();
	const amountRef = useRef<TextInput>(null);
	const descRef = useRef<TextInput>(null);

	const [mode, setMode] = useState<'income' | 'expense' | 'transfer'>(
		params.mode === 'expense' || params.mode === 'transfer'
			? params.mode
			: 'expense' // default to Expense like the mock
	);
	const [selectedGoals, setSelectedGoals] = useState<Goal[]>([]);
	const [selectedBudgets, setSelectedBudgets] = useState<Budget[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [pickerOpen, setPickerOpen] = useState<null | 'goal' | 'budget'>(null);
	const [datePickerOpen, setDatePickerOpen] = useState(false);
	const [recurringOpen, setRecurringOpen] = useState(false);

	const { addTransaction } = useContext(TransactionContext);
	const { goals, isLoading: goalsLoading } = useGoal();
	const { budgets, isLoading: budgetsLoading } = useBudget();

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
			ignoreFromBudgets: false,
			recurring: { enabled: false, frequency: 'None' },
		},
		mode: 'onChange',
	});

	const amount = watch('amount');
	const description = watch('description');
	const selectedDate = watch('date');
	const ignoreFromBudgets = watch('ignoreFromBudgets');
	const recurring = watch('recurring');

	// Focus amount on mount for speed entry
	useEffect(() => {
		const t = setTimeout(() => amountRef.current?.focus(), 350);
		return () => clearTimeout(t);
	}, []);

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
	const onChangeAmount = useCallback(
		(text: string) => {
			const sanitized = sanitizeCurrency(text);
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
				amount: isIncome
					? Math.abs(amt)
					: isExpense
					? -Math.abs(amt)
					: Math.abs(amt),
				date: data.date,
				type: isIncome ? 'income' : isExpense ? 'expense' : 'transfer',
				recurring: data.recurring,
			};

			if (isExpense) {
				payload.ignoreFromBudgets = data.ignoreFromBudgets;
			}

			if (isIncome) {
				if (selectedGoals.length > 0) {
					payload.target = selectedGoals[0].id;
					payload.targetModel = 'Goal';
				}
			} else if (isExpense) {
				if (selectedBudgets.length > 0) {
					payload.target = selectedBudgets[0].id;
					payload.targetModel = 'Budget';
				}
			}

			await addTransaction(payload);

			Alert.alert(
				'Success',
				`${
					isIncome ? 'Income' : isExpense ? 'Expense' : 'Transfer'
				} saved successfully!`,
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
								ignoreFromBudgets: false,
								recurring: { enabled: false, frequency: 'None' },
							});
							setSelectedGoals([]);
							setSelectedBudgets([]);
							if (router.canGoBack()) router.back();
							else router.replace('/(tabs)/dashboard');
						},
					},
				]
			);
		} catch (e) {
			console.log('Save transaction error', e);
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
				activeOpacity={onPress ? 0.7 : 1}
				style={styles.row}
				accessibilityRole={onPress ? 'button' : undefined}
				accessibilityLabel={accessibilityLabel || label}
			>
				<View style={styles.rowLeft}>
					<View style={styles.rowIconWrap}>
						<Ionicons name={icon} size={18} color={palette.text} />
					</View>
					<Text style={styles.rowLabel}>{label}</Text>
				</View>
				<View style={styles.rowRight}>
					{right}
					{onPress && (
						<Ionicons name="chevron-forward" size={18} color={palette.sub} />
					)}
				</View>
			</TouchableOpacity>
		)
	);
	Row.displayName = 'Row';

	const ValueText = ({ children }: { children: React.ReactNode }) => (
		<Text numberOfLines={1} style={styles.valueText}>
			{children}
		</Text>
	);

	// =============================================================
	// Render
	// =============================================================
	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.headerTitle}>Add New Transaction</Text>
			</View>

			{/* Amount hero */}
			<View style={styles.amountCard} accessibilityRole="summary">
				<View style={styles.amountRow}>
					<Text style={styles.dollar}>$</Text>
					<Controller
						control={control}
						name="amount"
						rules={{
							required: 'Amount is required*',
							validate: (v) =>
								Number(v) > 0 || 'Enter an amount greater than 0',
						}}
						render={({ field: { value, onBlur } }) => (
							<TextInput
								ref={amountRef}
								style={styles.amountInput}
								placeholder="0.00"
								placeholderTextColor="#A3B3C2"
								keyboardType="decimal-pad"
								value={value}
								onChangeText={onChangeAmount}
								onBlur={() => {
									onBlur();
									onBlurAmount();
								}}
								returnKeyType="next"
								accessibilityLabel="Amount"
							/>
						)}
					/>
				</View>
				<View style={styles.amountUnderline} />
				{errors.amount && (
					<Text style={styles.errorText}>{String(errors.amount.message)}</Text>
				)}
			</View>

			{/* Segmented control */}
			<View style={styles.segmented}>
				{(['expense', 'income', 'transfer'] as const).map((m) => {
					const active = mode === m;
					const label = m.charAt(0).toUpperCase() + m.slice(1);
					return (
						<TouchableOpacity
							key={m}
							style={[styles.segBtn, active && styles.segBtnActive]}
							onPress={() => !isSubmitting && setMode(m)}
							accessibilityRole="button"
							accessibilityState={{ selected: active }}
						>
							<Text style={[styles.segText, active && styles.segTextActive]}>
								{label}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>

			<ScrollView
				style={{ flex: 1 }}
				contentContainerStyle={styles.content}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{/* Category / Note / Recurring / Date / Ignore from Budgets */}
				<View style={styles.cardList}>
					<Row
						icon={mode === 'expense' ? 'scale-outline' : 'trophy-outline'}
						label={mode === 'expense' ? 'Category' : 'Deposit to Goal'}
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
								// if you want to allow creating a goal when none exist:
								if (!goals?.length) return navigateToGoalsWithModal();
								setPickerOpen('goal');
							}
						}}
						accessibilityLabel={
							mode === 'expense' ? 'Select Category' : 'Select Goal'
						}
					/>

					<Row
						icon="chatbox-ellipses-outline"
						label="Note"
						right={<ValueText>{description ? description : '—'}</ValueText>}
						onPress={() => descRef.current?.focus()}
						accessibilityLabel="Edit note"
					/>

					<Row
						icon="repeat-outline"
						label="Recurring"
						right={
							<ValueText>
								{recurring?.enabled ? recurring.frequency : 'No'}
							</ValueText>
						}
						onPress={() => setRecurringOpen(true)}
					/>

					<Row
						icon="calendar-outline"
						label="Date"
						right={
							<ValueText>
								{new Date(selectedDate).toLocaleDateString()}
							</ValueText>
						}
						onPress={() => setDatePickerOpen(true)}
					/>

					{mode === 'expense' && (
						<Row
							icon="ban-outline"
							label="Ignore from Budgets"
							right={<ValueText>{ignoreFromBudgets ? 'Yes' : 'No'}</ValueText>}
							onPress={() =>
								setValue('ignoreFromBudgets', !ignoreFromBudgets, {
									shouldValidate: false,
								})
							}
						/>
					)}
				</View>

				{/* Description input */}
				<View style={styles.inputCard}>
					<Text style={styles.inputLabel}>Description</Text>
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
								placeholderTextColor="#A3B3C2"
								value={value}
								onChangeText={(t) => onChange(t)}
								onBlur={() => {
									onBlur();
									trigger('description');
								}}
								accessibilityLabel="Description"
								maxLength={120}
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
						<Text style={styles.previewTitle}>You will create</Text>
					</View>
					<Text style={styles.previewLine}>
						<Text style={styles.previewEmph}>
							{prettyCurrency(amount || '')}
						</Text>{' '}
						{mode} on {new Date(selectedDate).toLocaleDateString()}{' '}
						{mode === 'income'
							? selectedGoals.length > 0
								? ` • Goal: ${selectedGoals[0].name}`
								: ' • No goal selected'
							: mode === 'expense'
							? selectedBudgets.length > 0
								? ` • Budget: ${selectedBudgets[0].name}`
								: ' • No budget selected'
							: ''}
					</Text>
				</View>
			</ScrollView>

			{/* Footer */}
			<FooterBar>
				<RectButton
					style={[styles.ctaBtn, !canSubmit && styles.ctaBtnDisabled]}
					enabled={canSubmit}
					onPress={() => {
						if (isSubmitting) return;
						handleSubmit(onSubmit)();
					}}
					accessibilityLabel={`Create ${mode}`}
					testID="create-transaction"
				>
					{isSubmitting ? (
						<>
							<ActivityIndicator size="small" color="#fff" />
							<Text style={styles.ctaText}>Saving…</Text>
						</>
					) : (
						<>
							<Text style={styles.ctaText}>Create Transaction</Text>
							<Ionicons name="add" size={18} color="#fff" />
						</>
					)}
				</RectButton>
				{!canSubmit && (
					<Text style={styles.footerHint}>
						Enter amount and description to continue.
					</Text>
				)}
			</FooterBar>

			{/* Picker Modal */}
			<SlidingModal
				isVisible={pickerOpen !== null}
				onClose={() => setPickerOpen(null)}
				title={pickerOpen === 'goal' ? 'Select Goal' : 'Select Category'}
				icon={pickerOpen === 'goal' ? 'trophy-outline' : 'wallet-outline'}
				maxHeightPct={0.6}
			>
				<FlatList
					data={(pickerOpen === 'goal' ? goals : budgets) as (Goal | Budget)[]}
					keyExtractor={(item) => (item as any).id}
					initialNumToRender={12}
					windowSize={6}
					maxToRenderPerBatch={12}
					getItemLayout={(_, i) => ({ length: 48, offset: 48 * i, index: i })}
					renderItem={({ item }) => (
						<TouchableOpacity
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								paddingVertical: 14,
								borderBottomWidth: StyleSheet.hairlineWidth,
								borderBottomColor: palette.line,
							}}
							onPress={() =>
								pickerOpen === 'goal'
									? selectGoal(item as Goal)
									: selectBudget(item as Budget)
							}
						>
							<Ionicons
								name={
									pickerOpen === 'goal'
										? (item as any).icon ?? 'trophy-outline'
										: (item as any).icon ?? 'wallet-outline'
								}
								size={18}
								color={(item as any).color ?? palette.text}
								style={{ marginRight: 8 }}
							/>
							<Text style={{ fontSize: 16, color: palette.text }}>
								{(item as any).name}
							</Text>
						</TouchableOpacity>
					)}
					ListEmptyComponent={() => (
						<View style={{ paddingVertical: 16 }}>
							<Text style={{ color: palette.sub }}>
								{pickerOpen === 'goal'
									? 'No goals yet. Create one from Goals.'
									: 'No budgets yet. Create one from Budgets.'}
							</Text>
						</View>
					)}
				/>
			</SlidingModal>

			{/* Date Picker Modal */}
			<SlidingModal
				isVisible={datePickerOpen}
				onClose={() => setDatePickerOpen(false)}
				title="Select Date"
				icon="calendar-outline"
				maxHeightPct={0.5}
			>
				<DateField
					value={selectedDate}
					onChange={(date) => {
						setValue('date', date, { shouldValidate: false });
						setDatePickerOpen(false);
					}}
					showQuickActions
				/>
			</SlidingModal>

			{/* Recurring Modal */}
			<SlidingModal
				isVisible={recurringOpen}
				onClose={() => setRecurringOpen(false)}
				title="Recurring Transaction"
				icon="repeat-outline"
				maxHeightPct={0.6}
			>
				<View>
					{(['None', 'Daily', 'Weekly', 'Monthly'] as Frequency[]).map(
						(freq) => (
							<TouchableOpacity
								key={freq}
								style={{
									flexDirection: 'row',
									alignItems: 'center',
									justifyContent: 'space-between',
									paddingVertical: 14,
									borderBottomWidth: StyleSheet.hairlineWidth,
									borderBottomColor: palette.line,
								}}
								onPress={() => {
									setValue(
										'recurring',
										{ enabled: freq !== 'None', frequency: freq },
										{ shouldValidate: false }
									);
									setRecurringOpen(false);
								}}
							>
								<Text style={{ fontSize: 16, color: palette.text }}>
									{freq}
								</Text>
								{recurring?.frequency === freq && (
									<Ionicons name="checkmark" size={22} color={palette.accent} />
								)}
							</TouchableOpacity>
						)
					)}
				</View>
			</SlidingModal>

			{!ready && (
				<View style={styles.loadingOverlay}>
					<ActivityIndicator size="large" color={palette.accent} />
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
	container: { flex: 1, backgroundColor: palette.bg },
	content: { padding: 16, paddingBottom: 20 },

	// Header
	header: {
		paddingHorizontal: 16,
		paddingTop: 6,
		paddingBottom: 8,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerTitle: { fontSize: 18, fontWeight: '800', color: palette.text },

	// Amount hero
	amountCard: {
		marginHorizontal: 16,
		marginTop: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 16,
		shadowColor: '#0f172a',
		shadowOpacity: 0.06,
		elevation: 2, // Android shadow
	},
	amountRow: { flexDirection: 'row', alignItems: 'center' },
	dollar: {
		fontSize: 28,
		fontWeight: '800',
		color: palette.accent,
		marginRight: 8,
	},
	amountInput: {
		flex: 1,
		fontSize: 54,
		fontWeight: '600',
		color: palette.text,
	},
	amountUnderline: {
		marginTop: 6,
		height: 3,
		backgroundColor: palette.accent,
		borderRadius: 999,
	},

	// Segmented
	segmented: {
		marginHorizontal: 16,
		marginTop: 12,
		backgroundColor: '#F1F5F9',
		borderRadius: 14,
		padding: 4,
		flexDirection: 'row',
	},
	segBtn: {
		flex: 1,
		paddingVertical: 8,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	segBtnActive: {
		backgroundColor: palette.surface,
		shadowColor: '#000',
		shadowOpacity: 0.07,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 3 },
		elevation: 2, // Android shadow
	},
	segText: { fontSize: 14, fontWeight: '700', color: palette.sub },
	segTextActive: { color: palette.text },

	// Card list (cells)
	cardList: {
		backgroundColor: palette.surface,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: palette.line,
		overflow: 'hidden',
		marginTop: 16,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 14,
		paddingVertical: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: palette.line,
	},
	rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	rowIconWrap: {
		width: 28,
		height: 28,
		borderRadius: 8,
		backgroundColor: '#F4F7FA',
		alignItems: 'center',
		justifyContent: 'center',
	},
	rowLabel: { fontSize: 15, fontWeight: '700', color: palette.text },
	rowRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		maxWidth: '55%',
	},
	valueText: { color: palette.text, fontWeight: '600' },

	// Input card
	inputCard: {
		marginTop: 16,
		backgroundColor: palette.surface,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: palette.line,
		padding: 14,
	},
	inputLabel: { fontWeight: '800', color: palette.text, marginBottom: 8 },
	input: {
		height: 48,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: palette.line,
		paddingHorizontal: 14,
		fontSize: 16,
		color: palette.text,
		backgroundColor: palette.surface,
	},
	inputError: { borderColor: palette.danger, borderWidth: 2 },
	errorText: { color: palette.danger, fontSize: 13, marginTop: 6 },

	// Preview
	previewCard: {
		marginTop: 16,
		backgroundColor: '#F8FAFC',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: palette.line,
		padding: 14,
		elevation: 1, // Android shadow
	},
	previewHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 4,
	},
	previewTitle: { fontWeight: '800', color: palette.text },
	previewLine: { color: palette.text },
	previewEmph: { fontWeight: '900' },

	// CTA footer
	ctaBtn: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		borderRadius: 14,
		backgroundColor: palette.accent,
		paddingVertical: 14,
		marginHorizontal: 16,
	},
	ctaBtnDisabled: { backgroundColor: '#A7D8FF' },
	ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
	footerHint: {
		marginTop: 8,
		textAlign: 'center',
		color: palette.sub,
		fontSize: 12,
	},

	// Loading overlay
	loadingOverlay: {
		...StyleSheet.absoluteFillObject,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: palette.bg,
	},
	loadingText: { marginTop: 12, color: palette.sub, fontWeight: '700' },
});
