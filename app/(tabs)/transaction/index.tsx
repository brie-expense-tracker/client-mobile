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
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
	TouchableOpacity,
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
import { DateField } from '../../../src/components/DateField';

/**
 * TransactionScreen (Pro)
 * ---------------------------------------------------
 * Polished, production‑minded entry screen for Income/Expense:
 * • Robust validation with two‑decimal currency control
 * • Clear mode separation (income vs expense)
 * • Goal chips for income, Budget chips for expense
 * • Accessible, test‑friendly, double‑tap safe primary CTA
 * • Consistent empty states + helpful copy
 */

interface TransactionFormData {
	type?: 'income' | 'expense';
	description: string;
	amount: string; // string for input friendliness
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
	return rest.length > 0 ? `${int}.${two}` : int;
};

const prettyCurrency = (value: string): string => {
	const num = Number(value);
	if (!isFinite(num) || num <= 0) return '$0.00';
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
	}).format(num);
};

const isIOS = Platform.OS === 'ios';

const TransactionScreen = () => {
	const router = useRouter();
	const params = useLocalSearchParams<{ mode?: 'income' | 'expense' }>();
	const amountRef = useRef<TextInput>(null);

	const [mode, setMode] = useState<'income' | 'expense'>(
		params.mode === 'expense' ? 'expense' : 'income'
	);
	const [selectedGoals, setSelectedGoals] = useState<Goal[]>([]);
	const [selectedBudgets, setSelectedBudgets] = useState<Budget[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { addTransaction } = useContext(TransactionContext);
	const { goals, isLoading: goalsLoading } = useGoal();
	const { budgets, isLoading: budgetsLoading } = useBudget();

	const ready = mode === 'income' ? !goalsLoading : !budgetsLoading;

	// Keep URL in sync without navigation transition
	useEffect(() => {
		if ((params.mode ?? 'income') !== mode) {
			router.setParams({ mode });
		}
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
	const onToggleGoal = useCallback(
		(goal: Goal) => {
			const exists = selectedGoals.some((g) => g.id === goal.id);
			const next = exists
				? selectedGoals.filter((g) => g.id !== goal.id)
				: [...selectedGoals, goal];
			setSelectedGoals(next);
			setValue('goals', next, { shouldValidate: false });
		},
		[selectedGoals, setValue]
	);

	const onToggleBudget = useCallback(
		(budget: Budget) => {
			const exists = selectedBudgets.some((b) => b.id === budget.id);
			const next = exists
				? selectedBudgets.filter((b) => b.id !== budget.id)
				: [...selectedBudgets, budget];
			setSelectedBudgets(next);
			setValue('budgets', next, { shouldValidate: false });
		},
		[selectedBudgets, setValue]
	);

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
			if (!isFinite(amt) || amt <= 0) {
				return Alert.alert('Invalid amount', 'Enter an amount greater than 0.');
			}

			const isIncome = mode === 'income';
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
			} else {
				if (selectedBudgets.length > 0) {
					payload.target = selectedBudgets[0].id;
					payload.targetModel = 'Budget';
				}
			}

			await addTransaction(payload);

			Alert.alert(
				'Success',
				`${isIncome ? 'Income' : 'Expense'} saved successfully!`,
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

	// ---------- UI bits
	const Header = () => (
		<View style={styles.header}>
			<View style={styles.headerRow}>
				<Text style={styles.title}>
					{mode === 'income' ? 'Add Income' : 'Add Expense'}
				</Text>
				<View style={styles.badges}>
					{mode === 'income' ? (
						<>
							<View style={styles.badge}>
								<Ionicons name="trophy-outline" size={14} color="#007AFF" />
								<Text style={styles.badgeText}>Goal Deposit</Text>
							</View>
							<View style={styles.badge}>
								<Ionicons name="sparkles-outline" size={14} color="#007AFF" />
								<Text style={styles.badgeText}>Auto‑Allocate</Text>
							</View>
						</>
					) : (
						<>
							<View style={styles.badge}>
								<Ionicons name="wallet-outline" size={14} color="#FF6B6B" />
								<Text style={styles.badgeText}>Budget Tracking</Text>
							</View>
							<View style={styles.badge}>
								<Ionicons name="repeat-outline" size={14} color="#FF6B6B" />
								<Text style={styles.badgeText}>Auto‑Suggest</Text>
							</View>
						</>
					)}
				</View>
			</View>
			<Text style={styles.subtitle}>
				{mode === 'income'
					? 'Enter amount and details. Tag a goal, or leave unassigned to allocate later.'
					: 'Enter amount and details. Tag a budget, or leave uncategorized to file later.'}
			</Text>
		</View>
	);

	const PreviewSummary = () => {
		const amountText = prettyCurrency(amount || '');
		const targetText =
			mode === 'income'
				? selectedGoals.length > 0
					? ` • Goal: ${selectedGoals[0].name}`
					: ' • No goal selected'
				: selectedBudgets.length > 0
				? ` • Budget: ${selectedBudgets[0].name}`
				: ' • No budget selected';

		return (
			<View style={styles.previewCard} accessibilityRole="summary">
				<View style={styles.previewRow}>
					<Ionicons
						name={
							mode === 'income' ? 'file-tray-full-outline' : 'file-tray-outline'
						}
						size={18}
						color="#111"
					/>
					<Text style={styles.previewTitle}>This will create</Text>
				</View>
				<Text style={styles.previewLine}>
					<Text style={styles.previewEmph}>{amountText}</Text>{' '}
					{mode === 'income' ? 'income' : 'expense'} on{' '}
					{new Date(selectedDate).toLocaleDateString()} {targetText}
				</Text>
				<Text style={styles.previewHint}>
					{mode === 'income'
						? "If you don't pick a goal, the deposit is saved without a target — you can allocate later."
						: "If you don't pick a budget, the expense is saved without a target — you can categorize later."}
				</Text>
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.container} edges={['top', 'bottom']}>
			<View
				style={[
					styles.screen,
					{ opacity: ready ? 1 : 0, transform: [{ scale: ready ? 1 : 0.98 }] },
				]}
			>
				{/* Mode Switcher */}
				<View style={styles.modeSwitcher}>
					<TouchableOpacity
						style={[
							styles.modeButton,
							mode === 'income' && styles.modeButtonActive,
						]}
						onPress={() => setMode('income')}
						accessibilityRole="button"
						accessibilityState={{ selected: mode === 'income' }}
						testID="mode-income"
					>
						<Ionicons
							name="add-circle-outline"
							size={20}
							color={mode === 'income' ? '#fff' : '#007ACC'}
						/>
						<Text
							style={[
								styles.modeButtonText,
								mode === 'income' && styles.modeButtonTextActive,
							]}
						>
							Income
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[
							styles.modeButton,
							mode === 'expense' && styles.modeButtonActive,
						]}
						onPress={() => setMode('expense')}
						accessibilityRole="button"
						accessibilityState={{ selected: mode === 'expense' }}
						testID="mode-expense"
					>
						<Ionicons
							name="remove-circle-outline"
							size={20}
							color={mode === 'expense' ? '#fff' : '#FF6B6B'}
						/>
						<Text
							style={[
								styles.modeButtonText,
								mode === 'expense' && styles.modeButtonTextActive,
							]}
						>
							Expense
						</Text>
					</TouchableOpacity>
				</View>

				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<Header />

					{/* Amount */}
					<View style={styles.amountWrap}>
						<Ionicons
							name="logo-usd"
							size={22}
							color="#111"
							style={{ marginRight: 6 }}
						/>
						<Controller
							control={control}
							name="amount"
							rules={{
								required: 'Amount is required',
								validate: (v) =>
									Number(v) > 0 || 'Enter an amount greater than 0',
							}}
							render={({ field: { value, onBlur } }) => (
								<TextInput
									ref={amountRef}
									style={[
										styles.amountInput,
										errors.amount && styles.inputError,
									]}
									placeholder="0.00"
									placeholderTextColor="#9e9e9e"
									keyboardType="decimal-pad"
									value={value}
									onChangeText={onChangeAmount}
									onBlur={() => {
										onBlur();
										onBlurAmount();
									}}
									accessibilityLabel={`${mode} amount`}
									accessibilityHint="Enter dollars and cents"
									returnKeyType="next"
								/>
							)}
						/>
					</View>
					{errors.amount && (
						<Text style={styles.errorText}>
							{String(errors.amount.message)}
						</Text>
					)}

					{/* Date */}
					<DateField
						value={selectedDate}
						onChange={(iso) => setValue('date', iso, { shouldValidate: true })}
						title="Date"
						testID="date-inline"
						containerStyle={{ marginTop: 18 }}
					/>

					{/* Goals (Income) / Budgets (Expense) */}
					{mode === 'income' ? (
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Goals (Optional)</Text>
							<ScrollView horizontal showsHorizontalScrollIndicator={false}>
								{goals.length === 0 ? (
									<View style={styles.emptyChip}>
										<Text style={styles.emptyChipText}>No goals yet</Text>
									</View>
								) : (
									goals.map((g) => {
										const active = selectedGoals.some((x) => x.id === g.id);
										return (
											<RectButton
												key={g.id}
												onPress={() => onToggleGoal(g)}
												style={[styles.tag, active && styles.tagActive]}
												testID={`goal-${g.id}`}
											>
												<Ionicons
													name={(g.icon as any) ?? 'flag-outline'}
													size={16}
													color={active ? '#fff' : g.color || '#007AFF'}
													style={{ marginRight: 6 }}
												/>
												<Text
													style={[
														styles.tagText,
														active && styles.tagTextActive,
													]}
												>
													{g.name}
												</Text>
											</RectButton>
										);
									})
								)}
								<RectButton
									onPress={navigateToGoalsWithModal}
									style={styles.addButton}
									testID="add-goal"
								>
									<Ionicons name="add-outline" size={22} color="#757575" />
								</RectButton>
							</ScrollView>
							<Text style={styles.helperText}>
								Pick a goal to deposit into, or leave blank to keep funds
								unassigned.
							</Text>
						</View>
					) : (
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Budgets (Optional)</Text>
							<ScrollView horizontal showsHorizontalScrollIndicator={false}>
								{budgets.length === 0 ? (
									<View style={styles.emptyChip}>
										<Text style={styles.emptyChipText}>No budgets yet</Text>
									</View>
								) : (
									budgets.map((b) => {
										const active = selectedBudgets.some((x) => x.id === b.id);
										return (
											<RectButton
												key={b.id}
												onPress={() => onToggleBudget(b)}
												style={[styles.tag, active && styles.tagActive]}
												testID={`budget-${b.id}`}
											>
												<Ionicons
													name={(b.icon as any) ?? 'wallet-outline'}
													size={16}
													color={active ? '#fff' : b.color || '#FF6B6B'}
													style={{ marginRight: 6 }}
												/>
												<Text
													style={[
														styles.tagText,
														active && styles.tagTextActive,
													]}
												>
													{b.name}
												</Text>
											</RectButton>
										);
									})
								)}
							</ScrollView>
							<Text style={styles.helperText}>
								Pick a budget to charge, or leave blank to categorize later.
							</Text>
						</View>
					)}

					{/* Description */}
					<KeyboardAvoidingView behavior={isIOS ? 'padding' : undefined}>
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>What is this {mode}?</Text>
							<Controller
								control={control}
								name="description"
								rules={{ required: 'Please enter a short description' }}
								render={({ field: { value, onChange, onBlur } }) => (
									<TextInput
										style={[
											styles.input,
											errors.description && styles.inputError,
										]}
										placeholder={
											mode === 'income'
												? 'e.g., Paycheck, freelance invoice, refund…'
												: 'e.g., Groceries, gas, subscription…'
										}
										placeholderTextColor="#a3a3a3"
										value={value}
										onChangeText={(t) => {
											onChange(t);
										}}
										onBlur={() => {
											onBlur();
											trigger('description');
										}}
										accessibilityLabel={`${mode} description`}
										maxLength={120}
									/>
								)}
							/>
							<View style={styles.fieldMetaRow}>
								<Text style={styles.fieldMetaText}>
									{description?.length ?? 0}/120
								</Text>
							</View>
							{errors.description && (
								<Text style={styles.errorText}>
									{String(errors.description.message)}
								</Text>
							)}
						</View>
					</KeyboardAvoidingView>

					{/* Preview */}
					<PreviewSummary />

					{/* CTAs */}
					<View style={{ height: 12 }} />
					<RectButton
						style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
						enabled={canSubmit}
						onPress={() => {
							if (isSubmitting) return; // double‑tap safe
							handleSubmit(onSubmit)();
						}}
						accessibilityLabel={`Save ${mode}`}
						testID="save-transaction"
					>
						{isSubmitting ? (
							<>
								<ActivityIndicator size="small" color="#fff" />
								<Text style={styles.primaryBtnText}>Saving…</Text>
							</>
						) : (
							<Text style={styles.primaryBtnText}>
								{mode === 'income' ? 'Save Income' : 'Save Expense'}
							</Text>
						)}
					</RectButton>
					<TouchableOpacity
						style={styles.secondaryBtn}
						onPress={() => {
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
						}}
						accessibilityRole="button"
						testID="reset-form"
					>
						<Text style={styles.secondaryBtnText}>Reset</Text>
					</TouchableOpacity>

					<View style={{ height: 24 }} />
				</ScrollView>
			</View>

			{!ready && (
				<View style={styles.loadingOverlay}>
					<ActivityIndicator size="large" color="#007AFF" />
					<Text style={styles.loadingText}>
						{mode === 'income' ? 'Loading goals…' : 'Loading budgets…'}
					</Text>
				</View>
			)}
		</SafeAreaView>
	);
};

// ---------------- Styles ----------------
const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
	screen: { flex: 1 },
	scrollView: { flex: 1 },
	scrollContent: { padding: 16 },

	// Mode Switcher
	modeSwitcher: {
		flexDirection: 'row',
		margin: 16,
		marginBottom: 8,
		backgroundColor: '#f2f2f2',
		borderRadius: 12,
		padding: 4,
	},
	modeButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
		gap: 6,
	},
	modeButtonActive: {
		backgroundColor: '#111',
	},
	modeButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#6b7280',
	},
	modeButtonTextActive: {
		color: '#fff',
		fontWeight: '700',
	},

	header: { marginBottom: 8 },
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	title: { fontSize: 24, fontWeight: '700', color: '#111' },
	subtitle: { color: '#616161', marginTop: 8, lineHeight: 20 },
	badges: { flexDirection: 'row', gap: 6 },
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 14,
		backgroundColor: '#E8F0FE',
	},
	badgeText: { color: '#0A66FF', fontSize: 12, fontWeight: '600' },

	amountWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 18,
		marginBottom: 6,
	},
	amountInput: { fontSize: 44, fontWeight: '700', color: '#111', flex: 1 },

	section: { marginTop: 18 },
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111',
		marginBottom: 10,
	},

	dateSelector: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e0e0e0',
		backgroundColor: '#fff',
	},
	dateText: { flex: 1, fontSize: 16, color: '#111', fontWeight: '500' },

	tag: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 10,
		backgroundColor: '#f8f9fa',
		borderWidth: 1,
		borderColor: '#e0e0e0',
		marginRight: 8,
	},
	tagActive: { backgroundColor: '#00a2ff', borderColor: '#00a2ff' },
	tagText: { color: '#111', fontWeight: '500' },
	tagTextActive: { color: '#fff', fontWeight: '700' },
	addButton: {
		padding: 8,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 8,
		backgroundColor: '#f8f9fa',
		borderWidth: 1,
		borderColor: '#e0e0e0',
	},
	emptyChip: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 10,
		backgroundColor: '#f8f9fa',
		borderWidth: 1,
		borderColor: '#e0e0e0',
		marginRight: 8,
	},
	emptyChipText: { color: '#6b7280' },
	helperText: { marginTop: 6, color: '#6b7280' },

	input: {
		height: 50,
		fontSize: 16,
		color: '#111',
		borderColor: '#e0e0e0',
		borderRadius: 12,
		borderWidth: 1,
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#fff',
	},
	inputError: { borderColor: '#FF6B6B', borderWidth: 2 },
	errorText: { color: '#FF6B6B', fontSize: 13, marginTop: 6 },
	fieldMetaRow: {
		marginTop: 6,
		flexDirection: 'row',
		justifyContent: 'flex-end',
	},
	fieldMetaText: { color: '#9e9e9e', fontSize: 12 },

	previewCard: {
		marginTop: 16,
		padding: 14,
		backgroundColor: '#FAFAFA',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#eee',
	},
	previewRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 6,
	},
	previewTitle: { fontWeight: '700', color: '#111' },
	previewLine: { color: '#333', marginTop: 2 },
	previewEmph: { fontWeight: '800' },
	previewHint: { color: '#6b7280', marginTop: 6, fontSize: 12 },

	primaryBtn: {
		marginTop: 14,
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 12,
		backgroundColor: '#00a2ff',
		paddingVertical: 16,
		flexDirection: 'row',
		gap: 8,
	},
	primaryBtnDisabled: { backgroundColor: '#b0dffc' },
	primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
	secondaryBtn: {
		marginTop: 10,
		alignSelf: 'center',
		paddingVertical: 8,
		paddingHorizontal: 12,
	},
	secondaryBtnText: { color: '#6b7280', fontWeight: '600' },

	loadingOverlay: {
		...StyleSheet.absoluteFillObject,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
	},
	loadingText: {
		marginTop: 16,
		color: '#616161',
		fontSize: 16,
		fontWeight: '500',
	},
});

export default TransactionScreen;
