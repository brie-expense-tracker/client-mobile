// Ledger edit screen – MVP: edit Cash In / Cash Out with fixed categories
import React, { useContext, useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
	TransactionContext,
	type Transaction,
} from '../../../../src/context/transactionContext';
import { palette, radius, space } from '../../../../src/ui/theme';

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

	const tx = transactions.find((t) => t.id === id || (t as any)._id === id);

	useEffect(() => {
		if (!tx) return;
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
	}, [tx]);

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

	if (!tx) {
		return (
			<View style={[styles.container, { paddingTop: insets.top }]}>
				<View style={styles.header}>
					<TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
						<Ionicons name="chevron-back" size={24} color={palette.text} />
					</TouchableOpacity>
					<Text style={styles.headerTitle}>Edit</Text>
				</View>
				<View style={styles.empty}>
					<Text style={styles.emptyText}>Transaction not found</Text>
				</View>
			</View>
		);
	}

	return (
		<KeyboardAvoidingView
			style={[styles.container, { paddingTop: insets.top }]}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
					<Ionicons name="chevron-back" size={24} color={palette.text} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Edit Cash In / Cash Out</Text>
			</View>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps="handled"
			>
				{/* Type */}
				<Text style={styles.label}>Type</Text>
				<View style={styles.typeRow}>
					<TouchableOpacity
						style={[styles.typeBtn, type === 'income' && styles.typeBtnActive]}
						onPress={() => setType('income')}
					>
						<Text style={[styles.typeBtnText, type === 'income' && styles.typeBtnTextActive]}>
							Cash In
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.typeBtn, type === 'expense' && styles.typeBtnActive]}
						onPress={() => setType('expense')}
					>
						<Text style={[styles.typeBtnText, type === 'expense' && styles.typeBtnTextActive]}>
							Cash Out
						</Text>
					</TouchableOpacity>
				</View>

				<Text style={styles.label}>Description (optional)</Text>
				<TextInput
					style={styles.input}
					value={description}
					onChangeText={setDescription}
					placeholder="e.g. Coffee, Groceries"
					placeholderTextColor={palette.textMuted}
					autoCapitalize="sentences"
				/>

				<Text style={styles.label}>Amount</Text>
				<TextInput
					style={styles.input}
					value={amount}
					onChangeText={(t) => setAmount(sanitizeCurrency(t))}
					placeholder="0.00"
					placeholderTextColor={palette.textMuted}
					keyboardType="decimal-pad"
				/>

				<Text style={styles.label}>Date</Text>
				<TextInput
					style={styles.input}
					value={date}
					onChangeText={setDate}
					placeholder="YYYY-MM-DD"
					placeholderTextColor={palette.textMuted}
				/>

				<Text style={styles.label}>{type === 'expense' ? 'Category (required for Cash Out)' : 'Category (optional)'}</Text>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
					{(type === 'expense' ? CASH_CATEGORIES : INCOME_CATEGORIES).map((c) => (
						<TouchableOpacity
							key={c}
							style={[styles.chip, category === c && styles.chipActive]}
							onPress={() => setCategory(c)}
						>
							<Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
						</TouchableOpacity>
					))}
				</ScrollView>

				<TouchableOpacity
					style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
					onPress={handleSave}
					disabled={isSubmitting}
				>
					<Text style={styles.saveBtnText}>{isSubmitting ? 'Saving…' : 'Save'}</Text>
				</TouchableOpacity>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: palette.bg,
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
		fontSize: 18,
		fontWeight: '600',
		color: palette.text,
	},
	scroll: {
		flex: 1,
	},
	scrollContent: {
		padding: space.lg,
		paddingBottom: space.xxl,
	},
	label: {
		fontSize: 14,
		fontWeight: '500',
		color: palette.textMuted,
		marginBottom: space.sm,
		marginTop: space.md,
	},
	input: {
		backgroundColor: palette.surfaceAlt,
		borderRadius: radius.md,
		padding: space.md,
		fontSize: 16,
		color: palette.text,
		borderWidth: 1,
		borderColor: palette.border,
	},
	typeRow: {
		flexDirection: 'row',
		gap: space.sm,
	},
	typeBtn: {
		flex: 1,
		paddingVertical: space.md,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: palette.border,
		alignItems: 'center',
		backgroundColor: palette.surfaceAlt,
	},
	typeBtnActive: {
		backgroundColor: palette.primary,
		borderColor: palette.primary,
	},
	typeBtnText: {
		fontSize: 16,
		fontWeight: '500',
		color: palette.textMuted,
	},
	typeBtnTextActive: {
		color: palette.primaryTextOn,
		fontWeight: '600',
	},
	catScroll: {
		marginTop: space.sm,
		marginBottom: space.sm,
	},
	chip: {
		paddingHorizontal: space.md,
		paddingVertical: space.sm,
		borderRadius: radius.pill,
		backgroundColor: palette.surfaceAlt,
		borderWidth: 1,
		borderColor: palette.border,
		marginRight: space.sm,
	},
	chipActive: {
		backgroundColor: palette.primary,
		borderColor: palette.primary,
	},
	chipText: {
		fontSize: 14,
		color: palette.text,
	},
	chipTextActive: {
		color: palette.primaryTextOn,
		fontWeight: '600',
	},
	saveBtn: {
		backgroundColor: palette.primary,
		borderRadius: radius.md,
		padding: space.md,
		alignItems: 'center',
		marginTop: space.xl,
	},
	saveBtnDisabled: {
		opacity: 0.6,
	},
	saveBtnText: {
		color: palette.primaryTextOn,
		fontSize: 16,
		fontWeight: '600',
	},
	empty: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: space.xl,
	},
	emptyText: {
		fontSize: 16,
		color: palette.textMuted,
	},
});
