// Ledger edit screen – MVP: edit Cash In / Cash Out with fixed categories
import React, { useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TextInput,
	TouchableOpacity,
	Alert,
	KeyboardAvoidingView,
	Platform,
	InteractionManager,
	Pressable,
	FlatList,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import {
	TransactionContext,
	type Transaction,
} from '../../../../src/context/transactionContext';
import BottomSheet from '../../../../src/components/BottomSheet';
import { palette, radius, space, shadow, type } from '../../../../src/ui/theme';
import { AppCard, AppText, AppButton } from '../../../../src/ui/primitives';

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

const DESCRIPTION_MAX_LENGTH = 120;

const getLocalIsoDate = (): string => {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
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

const sanitizeCurrency = (value: string): string => {
	const cleaned = value.replace(/[^0-9.]/g, '');
	if (!cleaned) return '';
	const [int, ...rest] = cleaned.split('.');
	const decimals = rest.join('');
	const two = decimals.slice(0, 2);
	const normalizedInt = int.replace(/^0+(?=\d)/, '') || '0';
	return rest.length > 0 ? `${normalizedInt}.${two}` : normalizedInt;
};

export default function LedgerEditScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const insets = useSafeAreaInsets();
	const { transactions, updateTransaction } = useContext(TransactionContext);

	const [description, setDescription] = useState('');
	const [amount, setAmount] = useState('');
	const [date, setDate] = useState(getLocalIsoDate());
	const [type, setType] = useState<'income' | 'expense'>('expense');
	const [category, setCategory] = useState<ExpenseCategory | IncomeCategory | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [datePickerOpen, setDatePickerOpen] = useState(false);
	const [mountCalendar, setMountCalendar] = useState(false);
	const [noteExpanded, setNoteExpanded] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);
	const descriptionInputRef = useRef<TextInput>(null);

	const tx = transactions.find((t) => t.id === id || (t as any)._id === id);

	// Track which transaction we've initialized from so we don't overwrite in-progress edits on refetch.
	const initializedIdRef = React.useRef<string | null>(null);

	// Sync form (including category from creation) when we have the transaction for this id.
	// Category is pre-filled from tx.metadata?.category so it's "already known" when one was selected at creation.
	useEffect(() => {
		if (!id || !tx) return;
		const isNewTransaction = initializedIdRef.current !== id;
		initializedIdRef.current = id;
		if (!isNewTransaction) return;
		setDescription(tx.description ?? '');
		const absAmount = Math.abs(tx.amount);
		setAmount(absAmount > 0 ? absAmount.toFixed(2) : '');
		setDate(tx.date?.slice(0, 10) ?? getLocalIsoDate());
		setType(tx.type);
		const cat = tx.metadata?.category;
		if (cat && (CASH_CATEGORIES as readonly string[]).includes(cat)) {
			setCategory(cat as ExpenseCategory);
		} else if (cat && (INCOME_CATEGORIES as readonly string[]).includes(cat)) {
			setCategory(cat as IncomeCategory);
		} else {
			setCategory(null);
		}
	}, [id, tx]);

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

	const handleSave = useCallback(async () => {
		if (!id || !tx) {
			Alert.alert('Error', 'Transaction not found.');
			return;
		}
		const amt = Number(amount);
		if (!amount.trim() || !isFinite(amt) || amt <= 0) {
			Alert.alert('Invalid amount', 'Enter an amount greater than 0.');
			return;
		}
		if (type === 'expense' && !category) {
			Alert.alert('Category required', 'Please select a category for Cash Out.');
			return;
		}
		try {
			setIsSubmitting(true);
			const payload: Partial<Transaction> = {
				description: description.trim() || undefined,
				amount: type === 'income' ? Math.abs(amt) : -Math.abs(amt),
				date: date,
				type,
			};
			if (category) {
				payload.metadata = { ...tx.metadata, category };
			}
			await updateTransaction(id, payload);
			Alert.alert('Saved', 'Your changes have been saved.', [
				{ text: 'OK', onPress: () => router.back() },
			]);
		} catch {
			Alert.alert('Error', 'Failed to save. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	}, [id, tx, description, amount, date, type, category, updateTransaction]);

	const topInset = insets.top > 0 ? insets.top : 0;

	if (!tx) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<View style={styles.header}>
					<TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
						<Ionicons name="chevron-back" size={24} color={palette.text} />
					</TouchableOpacity>
					<AppText.Title style={styles.headerTitle}>Edit</AppText.Title>
				</View>
				<View style={styles.empty}>
					<AppText.Body color="muted">Transaction not found</AppText.Body>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={[styles.container, { paddingTop: topInset }]} edges={[]}>
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				keyboardVerticalOffset={topInset}
			>
				<View style={styles.header}>
					<TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
						<Ionicons name="chevron-back" size={24} color={palette.text} />
					</TouchableOpacity>
					<AppText.Title style={styles.headerTitle}>Edit transaction</AppText.Title>
				</View>

				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.formWrap}>
						<AppCard
							style={styles.amountCard}
							padding={space.lg}
							borderRadius={radius.xl}
						>
							<View style={styles.amountRow}>
								<Pressable
									style={styles.amountInputContainer}
									onPress={() => {}}
								>
									<Text style={styles.dollar}>$</Text>
									<TextInput
										style={styles.amountInput}
										placeholder="0"
										placeholderTextColor={palette.textSubtle}
										keyboardType="decimal-pad"
										value={amount}
										onChangeText={(t) => setAmount(sanitizeCurrency(t))}
										accessibilityLabel="Amount"
										maxLength={9}
									/>
								</Pressable>
							</View>
							<View style={styles.amountUnderline} />

							<View style={styles.segmentedCompact}>
								{(['expense', 'income'] as const).map((m) => {
									const active = type === m;
									const label = m === 'expense' ? 'Cash Out' : 'Cash In';
									return (
										<Pressable
											key={m}
											style={({ pressed }) => [
												styles.segBtnCompact,
												m === 'expense' && styles.segBtnLeft,
												m === 'income' && styles.segBtnRight,
												active && styles.segBtnActive,
												{
													backgroundColor: active ? palette.surface : 'transparent',
													opacity: pressed ? 0.7 : 1,
												},
											]}
											onPress={() => {
												setType(m);
												if (m === 'income' && category && !(INCOME_CATEGORIES as readonly string[]).includes(category)) {
													setCategory(null);
												}
												if (m === 'expense' && category && !(CASH_CATEGORIES as readonly string[]).includes(category)) {
													setCategory(null);
												}
											}}
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

						<AppCard style={styles.section} padding={0} borderRadius={radius.xl}>
							{/* Note row */}
							{!noteExpanded ? (
								<TouchableOpacity
									style={styles.metadataRowSingle}
									onPress={() => {
										setNoteExpanded(true);
										setTimeout(() => descriptionInputRef.current?.focus(), 100);
									}}
									activeOpacity={0.6}
									accessibilityLabel={description ? 'Edit note' : 'Add note'}
									accessibilityRole="button"
								>
									<Ionicons
										name={description ? 'create-outline' : 'add-circle-outline'}
										size={22}
										color={palette.primary}
										style={styles.metadataRowIcon}
									/>
									<View style={styles.metadataRowContent}>
										<Text style={styles.metadataLabel}>Note</Text>
										<Text
											style={[styles.metadataValue, !description && { color: palette.textMuted }]}
											numberOfLines={1}
											ellipsizeMode="tail"
										>
											{description?.trim()
												? `${description.trim().slice(0, 24)}${description.trim().length > 24 ? '…' : ''}`
												: 'Add note'}
										</Text>
									</View>
									<Ionicons name="chevron-forward" size={20} color={palette.textSubtle} />
								</TouchableOpacity>
							) : (
								<View style={styles.noteExpandedContainer}>
									<Text style={styles.metadataLabel}>Note</Text>
									<TextInput
										ref={descriptionInputRef}
										style={styles.noteInput}
										value={description}
										onChangeText={setDescription}
										onBlur={() => setNoteExpanded(false)}
										placeholder="e.g. Coffee, Groceries"
										placeholderTextColor={palette.textSubtle}
										autoCapitalize="sentences"
										maxLength={DESCRIPTION_MAX_LENGTH}
										multiline
										numberOfLines={2}
									/>
									<Text style={styles.noteCharCount}>
										{description.length}/{DESCRIPTION_MAX_LENGTH}
									</Text>
								</View>
							)}

							<View style={styles.metadataDivider} />

							{/* Date row */}
							<TouchableOpacity
								style={styles.metadataRowSingle}
								onPress={() => setDatePickerOpen(true)}
								activeOpacity={0.6}
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
									<Text style={styles.metadataValue} numberOfLines={1} ellipsizeMode="tail">
										{formatDateWithHint(date)}
									</Text>
								</View>
								<Ionicons name="chevron-forward" size={20} color={palette.textSubtle} />
							</TouchableOpacity>

							<View style={styles.metadataDivider} />

							{/* Category row */}
							<TouchableOpacity
								style={styles.metadataRowSingle}
								onPress={() => setPickerOpen(true)}
								activeOpacity={0.6}
								accessibilityLabel="Select category"
								accessibilityRole="button"
							>
								<Ionicons
									name="pricetag-outline"
									size={22}
									color={palette.primary}
									style={styles.metadataRowIcon}
								/>
								<View style={styles.metadataRowContent}>
									<Text style={styles.metadataLabel}>Category</Text>
									<Text
										style={[
											styles.metadataValue,
											!category && { color: palette.textMuted },
										]}
										numberOfLines={1}
										ellipsizeMode="tail"
									>
										{category ?? (type === 'expense' ? 'Required' : 'Optional')}
									</Text>
								</View>
								<Ionicons name="chevron-forward" size={20} color={palette.textSubtle} />
							</TouchableOpacity>
						</AppCard>

						<View style={styles.saveSection}>
							<AppButton
								label={isSubmitting ? 'Saving…' : 'Save'}
								variant="primary"
								onPress={handleSave}
								disabled={isSubmitting}
								loading={isSubmitting}
								fullWidth
								style={styles.saveButton}
							/>
						</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>

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
				<View style={styles.quickActions}>
					<TouchableOpacity
						style={styles.quickActionBtn}
						onPress={() => {
							setDate(getLocalIsoDate());
							setDatePickerOpen(false);
						}}
					>
						<AppText.Body style={styles.quickActionText}>Today</AppText.Body>
					</TouchableOpacity>
				</View>

				{datePickerOpen && mountCalendar ? (
					<Calendar
						onDayPress={(day) => {
							setDate(day.dateString);
							setDatePickerOpen(false);
						}}
						markedDates={{
							[date]: {
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
							textSectionTitleColor: palette.textMuted,
							selectedDayBackgroundColor: palette.primary,
							selectedDayTextColor: palette.primaryTextOn,
							todayTextColor: palette.primary,
							dayTextColor: palette.text,
							textDisabledColor: palette.border,
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
							<AppText.Heading style={styles.sheetTitle}>Select Category</AppText.Heading>
							<TouchableOpacity onPress={() => setPickerOpen(false)}>
								<Ionicons name="close" size={24} color={palette.textMuted} />
							</TouchableOpacity>
						</View>
					}
				>
					<FlatList
						data={type === 'expense' ? [...CASH_CATEGORIES] : [...INCOME_CATEGORIES]}
						keyExtractor={(item) => item}
						contentContainerStyle={{ paddingBottom: insets.bottom + 64 + space.md }}
						renderItem={({ item }) => (
							<TouchableOpacity
								style={styles.sheetRow}
								onPress={() => {
									setCategory(item as ExpenseCategory | IncomeCategory);
									setPickerOpen(false);
								}}
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
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: palette.surfaceAlt,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: space.lg,
		paddingVertical: space.md,
		borderBottomWidth: 1,
		borderBottomColor: palette.border,
	},
	backBtn: {
		padding: 4,
		marginRight: space.sm,
	},
	headerTitle: {
		...type.titleMd,
		fontSize: 18,
		fontWeight: '600',
		color: palette.text,
	},
	scroll: { flex: 1 },
	scrollContent: {
		flexGrow: 1,
		paddingHorizontal: space.xl,
		paddingTop: space.lg,
		paddingBottom: space.xxl,
		alignItems: 'center',
	},
	formWrap: {
		width: '100%',
		maxWidth: 420,
		alignSelf: 'center',
	},
	amountCard: {
		marginTop: 0,
		backgroundColor: palette.surface,
		borderWidth: 0,
		...shadow.soft,
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
	segmentedCompact: {
		backgroundColor: palette.subtle,
		borderRadius: radius.pill,
		padding: 4,
		flexDirection: 'row',
		marginTop: space.sm,
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
	segTextCompact: {
		fontSize: 14,
		fontWeight: '600',
	},
	section: {
		marginTop: space.lg,
		backgroundColor: palette.surface,
		borderWidth: 0,
		overflow: 'hidden',
		...shadow.soft,
	},
	metadataRowSingle: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		minHeight: 64,
		paddingVertical: space.md,
		paddingHorizontal: space.lg,
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
	metadataDivider: {
		height: 1,
		backgroundColor: palette.border,
		marginHorizontal: space.lg,
	},
	noteExpandedContainer: {
		paddingHorizontal: space.lg,
		paddingVertical: space.md,
		paddingBottom: space.lg,
		gap: space.sm,
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
	noteCharCount: {
		fontSize: 12,
		color: palette.textSubtle,
		alignSelf: 'flex-end',
	},
	saveSection: {
		marginTop: space.xl,
		alignSelf: 'stretch',
	},
	saveButton: {
		width: '100%',
		minHeight: 52,
		borderRadius: radius.xl,
	},
	empty: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: space.xl,
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
