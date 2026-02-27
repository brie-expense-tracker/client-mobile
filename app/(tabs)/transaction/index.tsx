import React, {
	useEffect,
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
	TouchableOpacity,
	Pressable,
	FlatList,
	Platform,
	Keyboard,
	KeyboardAvoidingView,
	InputAccessoryView,
	InteractionManager,
	Dimensions,
} from 'react-native';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSequence,
	withTiming,
} from 'react-native-reanimated';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
	SafeAreaView,
	useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { TransactionContext } from '../../../src/context/transactionContext';
import BottomSheet from '../../../src/components/BottomSheet';
import { isDevMode } from '../../../src/config/environment';
import { createLogger } from '../../../src/utils/sublogger';
import { palette, radius, space, shadow, type } from '../../../src/ui/theme';
import { getItem, setItem, removeItem } from '../../../src/utils/safeStorage';
import { AppCard, AppText, AppButton } from '../../../src/ui/primitives';
import { ErrorBoundary } from '../../../src/components/ErrorBoundary';

const transactionScreenLog = createLogger('TransactionScreen');
const accessoryId = 'tx-input-accessory';

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

const INCOME_CATEGORIES = [
	'Paycheck',
	'Freelance',
	'Bonus',
	'Refund',
	'Interest',
	'Investment',
	'Gift',
	'Other',
] as const;

type ExpenseCategory = (typeof CASH_CATEGORIES)[number];
type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

interface TransactionFormData {
	description: string;
	amount: string;
	date: string;
}

const getLocalIsoDate = (): string => {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

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

const formatDateString = (dateString: string): string => {
	if (!dateString || typeof dateString !== 'string') return '';
	const datePart = dateString.slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return dateString;
	const [year, month, day] = datePart.split('-').map(Number);
	const date = new Date(year, month - 1, day);
	return date.toLocaleDateString();
};

const isToday = (dateString: string): boolean => {
	const today = getLocalIsoDate();
	return !!dateString && dateString.slice(0, 10) === today;
};

const formatDateWithHint = (dateString: string): string => {
	const formatted = formatDateString(dateString);
	if (!formatted) return '';
	return isToday(dateString) ? `Today, ${formatted}` : formatted;
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

	const [mode, setMode] = useState<'income' | 'expense'>(
		params.mode === 'income' ? 'income' : 'expense',
	);
	const [selectedCategory, setSelectedCategory] = useState<
		ExpenseCategory | IncomeCategory | null
	>(null);

	useEffect(() => {
		if (params.mode === 'income' || params.mode === 'expense') {
			setMode(params.mode);
			if (params.mode === 'income') setSelectedCategory(null);
		}
	}, [params.mode]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [datePickerOpen, setDatePickerOpen] = useState(false);
	const [mountCalendar, setMountCalendar] = useState(false);
	const [noteExpanded, setNoteExpanded] = useState(false);
	const [showCategoryError, setShowCategoryError] = useState(false);
	const categoryShakeX = useSharedValue(0);
	const categoryShakeStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: categoryShakeX.value }],
	}));

	const { addTransaction } = useContext(TransactionContext);

	// Auto-focus Amount on screen open to reduce taps and keep decimal pad ready
	useEffect(() => {
		const task = InteractionManager.runAfterInteractions(() => {
			const t = setTimeout(() => {
				amountRef.current?.focus();
			}, 100);
			return () => clearTimeout(t);
		});
		return () => task.cancel();
	}, []);

	useEffect(() => {
		const onShow = (e: any) =>
			setKeyboardHeight(e?.endCoordinates?.height ?? 0);
		const onHide = () => setKeyboardHeight(0);

		const showSub = Keyboard.addListener(
			Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
			onShow,
		);
		const hideSub = Keyboard.addListener(
			Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
			onHide,
		);

		return () => {
			showSub.remove();
			hideSub.remove();
		};
	}, []);

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
		formState: { errors },
		clearErrors,
		reset,
	} = useForm<TransactionFormData>({
		defaultValues: {
			description: '',
			amount: '',
			date: getLocalIsoDate(),
		},
		mode: 'onTouched',
	});

	const amount = watch('amount');
	const description = watch('description');
	const selectedDate = watch('date');

	const FORM_STATE_KEY = 'transaction_form_state';
	const [hasRestoredState, setHasRestoredState] = useState(false);

	useEffect(() => {
		let isMounted = true;

		(async () => {
			try {
				const saved = await getItem(FORM_STATE_KEY);

				if (!isMounted) return;

				if (saved) {
					const state = JSON.parse(saved);
					const restoredAmount =
						typeof state.amount === 'string' ? state.amount.trim() : '';

					setValue(
						'amount',
						restoredAmount && Number(restoredAmount) > 0 ? restoredAmount : '',
					);
					setValue('description', state.description ?? '');
					setValue('date', state.date ?? getLocalIsoDate());
					if (state.mode) setMode(state.mode);
					if (state.selectedCategory)
						setSelectedCategory(state.selectedCategory);
					if (state.description?.trim()) setNoteExpanded(true);
				}
			} catch {
			} finally {
				if (isMounted) setHasRestoredState(true);
			}
		})();

		return () => {
			isMounted = false;
		};
	}, [setValue]);

	useEffect(() => {
		if (!hasRestoredState) return;

		const saveState = async () => {
			try {
				const amountHasValue = Number(amount) > 0;

				const stateToSave = {
					amount: amountHasValue ? amount : '',
					description,
					date: selectedDate,
					mode,
					selectedCategory,
				};

				const hasData = amountHasValue || !!description || !!selectedCategory;

				if (hasData) {
					await setItem(FORM_STATE_KEY, JSON.stringify(stateToSave));
				} else {
					await removeItem(FORM_STATE_KEY);
				}
			} catch (err) {
				if (isDevMode) {
					transactionScreenLog.error('Failed to save form state', err);
				}
			}
		};

		const timeoutId = setTimeout(saveState, 500);
		return () => clearTimeout(timeoutId);
	}, [
		amount,
		description,
		selectedDate,
		mode,
		selectedCategory,
		hasRestoredState,
	]);

	useEffect(() => {
		if (amountRef.current) {
			const len = amount?.length ?? 0;
			amountRef.current.setNativeProps({ selection: { start: len, end: len } });
		}
	}, [amount]);

	// Nudge Category cell (shake) when user taps Create with missing category
	useEffect(() => {
		if (!showCategoryError || mode !== 'expense') return;
		categoryShakeX.value = withSequence(
			withTiming(-8, { duration: 50 }),
			withTiming(8, { duration: 50 }),
			withTiming(-6, { duration: 50 }),
			withTiming(6, { duration: 50 }),
			withTiming(-4, { duration: 40 }),
			withTiming(4, { duration: 40 }),
			withTiming(0, { duration: 40 }),
		);
	}, [showCategoryError, mode, categoryShakeX]);

	const focusNoteCentered = useCallback(() => {
		noteInputRef.current?.focus();
		requestAnimationFrame(() => {
			setTimeout(
				() => {
					if (!noteInputRef.current || !scrollRef.current) return;

					noteInputRef.current.measureInWindow((_x, y, _w, h) => {
						const screenH = Dimensions.get('window').height;
						const visibleH = Math.max(0, screenH - keyboardHeight);
						const targetCenterY = visibleH / 2;
						const inputCenterY = y + h / 2;
						const delta = inputCenterY - targetCenterY;
						scrollRef.current?.scrollTo({
							y: Math.max(0, (scrollYRef.current ?? 0) + delta),
							animated: true,
						});
					});
				},
				Platform.OS === 'ios' ? 80 : 120,
			);
		});
	}, [keyboardHeight]);
	const handleModeChange = useCallback(
		(newMode: 'income' | 'expense') => {
			if (!isSubmitting && mode !== newMode) {
				setMode(newMode);
				setSelectedCategory(null);
			}
		},
		[isSubmitting, mode],
	);
	const onChangeAmount = useCallback(
		(text: string) => {
			const sanitized = sanitizeCurrency(text);
			if (Number(sanitized) > 999999.99) return;
			setValue('amount', sanitized, { shouldValidate: true });
		},
		[setValue],
	);

	const onBlurAmount = useCallback(() => {
		const n = Number(amount);
		if (isFinite(n) && n > 0)
			setValue('amount', n.toFixed(2), { shouldValidate: true });
		trigger('amount');
	}, [amount, setValue, trigger]);

	const selectCategory = useCallback(
		(cat: ExpenseCategory | IncomeCategory) => {
			setSelectedCategory(cat);
			setShowCategoryError(false);
			setPickerOpen(false);
		},
		[],
	);

	const onSubmit = useCallback(
		async (data: TransactionFormData) => {
			if (!data.amount?.trim())
				return Alert.alert('Missing amount', 'Please enter an amount.');

			try {
				setIsSubmitting(true);

				const amt = Number(data.amount);
				if (!isFinite(amt) || amt <= 0)
					return Alert.alert(
						'Invalid amount',
						'Enter an amount greater than 0.',
					);

				const payload: any = {
					description: data.description?.trim() || undefined,
					amount: mode === 'income' ? Math.abs(amt) : -Math.abs(amt),
					date: data.date,
					type: mode,
				};

				if (selectedCategory) {
					payload.metadata = { category: selectedCategory };
				}
				await addTransaction(payload);
				await removeItem(FORM_STATE_KEY);

				Alert.alert(
					'Success',
					`${mode === 'income' ? 'Cash IN' : 'Cash OUT'} saved!`,
					[
						{
							text: 'OK',
							onPress: () => {
								reset({
									description: '',
									amount: '',
									date: getLocalIsoDate(),
								});
								setSelectedCategory(null);
								if (router.canGoBack()) router.back();
								else router.replace('/(tabs)/dashboard');
							},
						},
					],
				);
			} catch (e) {
				if (isDevMode) {
					transactionScreenLog.error('Save transaction error', e);
				}
				Alert.alert('Error', 'Failed to save. Please try again.');
			} finally {
				setIsSubmitting(false);
			}
		},
		[mode, selectedCategory, addTransaction, reset, router],
	);

	const handleCreatePress = useCallback(() => {
		if (isSubmitting) return;
		clearErrors();
		setShowCategoryError(false);

		if (mode === 'expense' && !selectedCategory) {
			setShowCategoryError(true);
			return;
		}
		handleSubmit(onSubmit)();
	}, [
		isSubmitting,
		mode,
		selectedCategory,
		clearErrors,
		handleSubmit,
		onSubmit,
	]);

	return (
		<ErrorBoundary>
			<SafeAreaView style={styles.container} edges={['top']}>
				<KeyboardAvoidingView
					style={{ flex: 1 }}
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					keyboardVerticalOffset={0}
				>
					<ScrollView
						ref={scrollRef}
						style={{ flex: 1 }}
						contentContainerStyle={styles.content}
						keyboardShouldPersistTaps="handled"
						keyboardDismissMode={
							Platform.OS === 'ios' ? 'interactive' : 'on-drag'
						}
						automaticallyAdjustContentInsets={false}
						contentInsetAdjustmentBehavior="never"
						automaticallyAdjustKeyboardInsets={false}
						showsVerticalScrollIndicator={false}
						onScroll={(e) => {
							scrollYRef.current = e.nativeEvent.contentOffset.y;
						}}
						scrollEventThrottle={16}
					>
						<View style={styles.formWrap}>
							<AppText.Title style={styles.heroTitle}>
								New transaction
							</AppText.Title>

							<AppCard
								style={styles.amountCard}
								padding={space.lg}
								borderRadius={radius.xl}
							>
								<View style={styles.amountRow}>
									<Pressable
										style={styles.amountInputContainer}
										onPress={() => amountRef.current?.focus()}
									>
										<Text style={styles.dollar}>$</Text>
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
													style={styles.amountInput}
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
													inputAccessoryViewID={
														Platform.OS === 'ios' ? accessoryId : undefined
													}
												/>
											)}
										/>
									</Pressable>
								</View>
								<View style={styles.amountUnderline} />

								<View style={styles.errorContainer}>
									{errors.amount && (
										<AppText.Caption color="danger" style={styles.errorText}>
											{String(errors.amount.message)}
										</AppText.Caption>
									)}
								</View>

								<View style={styles.segmentedCompact}>
									{(['expense', 'income'] as const).map((m) => {
										const active = mode === m;
										const label = m.charAt(0).toUpperCase() + m.slice(1);
										return (
											<Pressable
												key={m}
												style={({ pressed }) => [
													styles.segBtnCompact,
													m === 'expense' && styles.segBtnLeft,
													m === 'income' && styles.segBtnRight,
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
													style={styles.segTextCompact}
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

						<AppCard
							style={styles.section}
							padding={0}
							borderRadius={radius.xl}
						>
							{/* Category row — full width */}
							<Animated.View
								style={[
									styles.metadataRowSingle,
									showCategoryError &&
										mode === 'expense' &&
										!selectedCategory && [
											styles.metadataCellError,
											styles.metadataCellErrorSpacing,
										],
									categoryShakeStyle,
								]}
							>
								<TouchableOpacity
									style={styles.metadataRowTouchable}
									onPress={() => {
										Keyboard.dismiss();
										setPickerOpen(true);
									}}
									activeOpacity={0.6}
									hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
									accessibilityLabel="Select category"
									accessibilityRole="button"
								>
									<Ionicons
										name="pricetag-outline"
										size={22}
										color={
											showCategoryError &&
											mode === 'expense' &&
											!selectedCategory
												? palette.danger
												: palette.primary
										}
										style={styles.metadataRowIcon}
									/>
									<View style={styles.metadataRowContent}>
										<Text style={styles.metadataLabel}>Category</Text>
										<Text
											style={[
												styles.metadataValueCategory,
												showCategoryError &&
													mode === 'expense' &&
													!selectedCategory &&
													styles.metadataValueRequired,
												!selectedCategory
													? showCategoryError &&
														mode === 'expense'
														? { color: palette.danger }
														: { color: palette.textMuted }
													: { color: palette.text },
											]}
											numberOfLines={1}
											ellipsizeMode="tail"
										>
											{selectedCategory
												? selectedCategory
												: mode === 'expense'
													? 'Required'
													: 'Optional'}
										</Text>
									</View>
									<Ionicons
										name="chevron-forward"
										size={20}
										color={palette.textSubtle}
									/>
								</TouchableOpacity>
							</Animated.View>

							<View style={styles.metadataDivider} />

							{/* Date row — full width */}
							<TouchableOpacity
								style={styles.metadataRowSingle}
								onPress={() => setDatePickerOpen(true)}
								activeOpacity={0.6}
								hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
								accessibilityLabel="Select date"
								accessibilityRole="button"
							>
								<Ionicons
									name="calendar-outline"
									size={22}
									color={palette.primary}
									style={styles.metadataRowIcon}
								/>
								<View style={styles.metadataRowContent}>
									<Text style={styles.metadataLabel}>Date</Text>
									<Text
										style={styles.metadataValue}
										numberOfLines={1}
										ellipsizeMode="tail"
									>
										{formatDateWithHint(selectedDate)}
									</Text>
								</View>
								<Ionicons
									name="chevron-forward"
									size={20}
									color={palette.textSubtle}
								/>
							</TouchableOpacity>
						</AppCard>

						<View style={styles.noteSection}>
							{!noteExpanded ? (
								<TouchableOpacity
									style={styles.addNoteChip}
									onPress={() => {
										setNoteExpanded(true);
										setTimeout(() => noteInputRef.current?.focus(), 100);
									}}
									activeOpacity={0.6}
									hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
									accessibilityLabel={description ? 'Edit note' : 'Add note'}
									accessibilityRole="button"
								>
									<Ionicons
										name={description ? 'create-outline' : 'add-circle-outline'}
										size={18}
										color={palette.primary}
										style={{ marginRight: space.xs }}
									/>
									<AppText.Body color="primary" style={styles.addNoteChipText}>
										{description?.trim()
											? `Note: ${description.trim().slice(0, 24)}${description.trim().length > 24 ? '…' : ''}`
											: 'Add note'}
									</AppText.Body>
								</TouchableOpacity>
							) : (
								<View style={styles.noteExpandedContainer}>
									<Controller
										control={control}
										name="description"
										render={({ field: { value, onChange, onBlur } }) => (
											<TextInput
												ref={noteInputRef}
												style={[
													styles.noteInput,
													errors.description && styles.inputError,
												]}
												placeholder={
													mode === 'income'
														? 'e.g., Paycheck, refund…'
														: 'e.g., Groceries, gas, subscription…'
												}
												placeholderTextColor={palette.textSubtle}
												value={value}
												onChangeText={(t) => onChange(t)}
												onBlur={onBlur}
												onFocus={focusNoteCentered}
												returnKeyType="done"
												onSubmitEditing={() => Keyboard.dismiss()}
												accessibilityLabel="Description"
												maxLength={120}
												multiline
												numberOfLines={2}
												inputAccessoryViewID={
													Platform.OS === 'ios' ? accessoryId : undefined
												}
											/>
										)}
									/>
									<TouchableOpacity
										style={styles.collapseNoteBtn}
										onPress={() => setNoteExpanded(false)}
									>
										<AppText.Caption color="muted">Hide note</AppText.Caption>
									</TouchableOpacity>
								</View>
							)}
						</View>

						<View style={styles.createButtonSection}>
							<AppButton
								label={isSubmitting ? 'Saving…' : 'Create Transaction'}
								variant="primary"
								icon={isSubmitting ? undefined : 'add'}
								onPress={handleCreatePress}
								disabled={isSubmitting}
								loading={isSubmitting}
								fullWidth
								style={styles.createButton}
								accessibilityLabel={`Create ${mode}`}
							/>
							{showCategoryError && mode === 'expense' && (
								<AppText.Caption color="danger" style={styles.createButtonError}>
									Please choose a category
								</AppText.Caption>
							)}
						</View>

						<View style={{ height: insets.bottom + space.xxl }} />
					</ScrollView>
				</KeyboardAvoidingView>

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

				<BottomSheet
					isOpen={pickerOpen}
					onClose={() => setPickerOpen(false)}
					snapPoints={[0.6, 0.4]}
					initialSnapIndex={0}
					header={
						<View style={styles.sheetHeader}>
							<Ionicons
								name="pricetag-outline"
								size={20}
								color={palette.primary}
								style={{ marginRight: space.sm }}
							/>
							<AppText.Heading style={styles.sheetTitle}>
								Select Category
							</AppText.Heading>
							<TouchableOpacity onPress={() => setPickerOpen(false)}>
								<Ionicons name="close" size={24} color={palette.textMuted} />
							</TouchableOpacity>
						</View>
					}
				>
					<FlatList
						data={
							mode === 'expense' ? [...CASH_CATEGORIES] : [...INCOME_CATEGORIES]
						}
						keyExtractor={(item) => item}
						initialNumToRender={12}
						windowSize={6}
						maxToRenderPerBatch={12}
						getItemLayout={(_, i) => ({ length: 48, offset: 48 * i, index: i })}
						contentContainerStyle={{
							paddingBottom: insets.bottom + 64 + space.md,
						}}
						renderItem={({ item }) => (
							<TouchableOpacity
								style={styles.sheetRow}
								onPress={() =>
									selectCategory(item as ExpenseCategory | IncomeCategory)
								}
							>
								<Ionicons
									name="pricetag-outline"
									size={18}
									color={palette.text}
									style={{ marginRight: space.sm }}
								/>
								<AppText.Body>{item}</AppText.Body>
							</TouchableOpacity>
						)}
					/>
				</BottomSheet>

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
							<AppText.Heading style={styles.sheetTitle}>
								Select Date
							</AppText.Heading>
							<TouchableOpacity onPress={() => setDatePickerOpen(false)}>
								<Ionicons name="close" size={24} color={palette.textMuted} />
							</TouchableOpacity>
						</View>
					}
				>
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
									name={
										direction === 'left' ? 'chevron-back' : 'chevron-forward'
									}
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
			</SafeAreaView>
		</ErrorBoundary>
	);
}

const FORM_MAX_WIDTH = 420;

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: palette.surfaceAlt },

	content: {
		flexGrow: 1,
		paddingHorizontal: space.xl,
		paddingTop: space.xl,
		alignItems: 'center',
		// No justifyContent: 'center' — keeps layout stable when keyboard opens or note expands (avoids jitter)
	},

	formWrap: {
		width: '100%',
		maxWidth: FORM_MAX_WIDTH,
		alignSelf: 'center',
	},

	heroTitle: {
		...type.titleMd,
		fontSize: 20,
		fontWeight: '700',
		color: palette.text,
		letterSpacing: -0.4,
		marginBottom: space.xl,
	},

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
		color: palette.textMuted,
		marginBottom: 4,
	},
	amountInput: {
		flexGrow: 0,
		flexShrink: 1,
		fontSize: 40,
		fontWeight: '700',
		color: palette.text,
		textAlign: 'center',
		minWidth: 48,
		paddingHorizontal: 0,
		letterSpacing: -0.5,
	},
	amountUnderline: {
		marginTop: space.xs,
		height: 1,
		backgroundColor: palette.border,
		opacity: 0.8,
	},
	errorContainer: {
		alignItems: 'center',
		marginTop: space.xs,
		minHeight: 20,
	},
	errorText: {
		color: palette.danger,
		fontSize: 12,
		fontWeight: '500',
	},
	segmentedCompact: {
		backgroundColor: palette.subtle,
		borderRadius: radius.pill,
		padding: 4,
		flexDirection: 'row',
	},
	segBtnCompact: {
		flex: 1,
		minHeight: 40,
		paddingVertical: 10,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: radius.pill,
	},
	segBtnLeft: {
		borderTopLeftRadius: radius.pill,
		borderBottomLeftRadius: radius.pill,
	},
	segBtnRight: {
		borderTopRightRadius: radius.pill,
		borderBottomRightRadius: radius.pill,
	},
	segBtnActive: {
		backgroundColor: palette.surface,
		...shadow.soft,
		borderWidth: 1,
		borderColor: palette.border,
	},
	segText: {
		fontSize: 14,
		fontWeight: '600',
	},
	segTextCompact: {
		fontSize: 14,
		fontWeight: '600',
	},
	metadataRowSingle: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		minHeight: 64,
		paddingVertical: space.md,
		paddingHorizontal: space.lg,
		justifyContent: 'center',
	},
	metadataRowTouchable: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		width: '100%',
		paddingVertical: space.xs,
		minWidth: 0,
	},
	metadataRowIcon: {
		marginRight: space.md,
	},
	metadataRowContent: {
		flex: 1,
		minWidth: 0,
		justifyContent: 'center',
		alignItems: 'flex-start',
		paddingRight: space.sm,
	},
	metadataDivider: {
		height: 1,
		backgroundColor: palette.border,
		marginHorizontal: space.lg,
	},
	metadataCellError: {
		backgroundColor: palette.dangerSubtle,
		borderWidth: 2,
		borderColor: palette.danger,
		borderRadius: radius.md,
		marginTop: space.sm,
		marginBottom: space.xs,
		marginHorizontal: 4,
	},
	metadataCellErrorSpacing: {},
	metadataLabel: {
		fontSize: 11,
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		color: palette.textMuted,
		marginBottom: 2,
	},
	metadataValue: {
		fontSize: 16,
		fontWeight: '600',
		color: palette.text,
	},
	metadataValueCategory: {
		fontSize: 16,
		fontWeight: '600',
	},
	metadataValueRequired: {
		color: palette.danger,
	},
	noteSection: {
		marginTop: space.lg,
		alignSelf: 'stretch',
	},
	addNoteChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: space.md,
		paddingHorizontal: space.lg,
		borderRadius: radius.lg,
		backgroundColor: palette.surface,
		borderWidth: 1,
		borderColor: palette.border,
		alignSelf: 'stretch',
		...shadow.soft,
	},
	addNoteChipText: {
		fontWeight: '600',
		fontSize: 15,
	},
	noteExpandedContainer: {
		gap: space.sm,
		alignSelf: 'stretch',
	},
	noteInput: {
		minHeight: 72,
		width: '100%',
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: palette.border,
		paddingHorizontal: space.lg,
		paddingVertical: space.md,
		fontSize: 16,
		color: palette.text,
		backgroundColor: palette.surface,
		textAlignVertical: 'top',
	},
	collapseNoteBtn: {
		alignSelf: 'flex-start',
		paddingVertical: space.xs,
	},
	createButtonSection: {
		marginTop: space.xl,
		gap: space.sm,
		alignSelf: 'stretch',
	},
	createButton: {
		alignSelf: 'stretch',
		width: '100%',
		minHeight: 52,
		borderRadius: radius.xl,
	},
	createButtonError: {
		textAlign: 'center',
		fontSize: 12,
		fontWeight: '500',
	},

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

	section: {
		marginTop: space.lg,
		backgroundColor: palette.surface,
		borderWidth: 0,
		overflow: 'hidden',
		...shadow.soft,
	},
	amountCard: {
		marginTop: 0,
		backgroundColor: palette.surface,
		borderWidth: 0,
		...shadow.soft,
	},

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

	accessoryBar: {
		padding: space.md,
		alignItems: 'flex-end',
		backgroundColor: palette.surfaceAlt,
	},
	accessoryDoneText: {
		color: palette.primary,
		fontWeight: '700',
	},

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
});
