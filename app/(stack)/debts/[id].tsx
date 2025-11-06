import React, { useEffect, useState } from 'react';
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
	FlatList,
	ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
	DebtsService,
	DebtDTO,
} from '../../../src/services/feature/debtsService';

const palette = {
	bg: '#FFFFFF',
	text: '#0F172A',
	sub: '#64748B',
	line: '#E2E8F0',
	accent: '#0095FF',
};

export default function EditDebtScreen() {
	const router = useRouter();
	const { id } = useLocalSearchParams<{ id: string }>();
	const [debt, setDebt] = useState<DebtDTO | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const [name, setName] = useState('');
	const [balance, setBalance] = useState('');
	const [apr, setApr] = useState('');
	const [minPayment, setMinPayment] = useState('');
	const [dueDay, setDueDay] = useState('');

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			try {
				const d = await DebtsService.getById(id);
				if (!mounted) return;
				setDebt(d);
				setName(d.name || '');
				setBalance(d.currentBalance ? String(d.currentBalance) : '');
				// Interest rate is already in percentage format from DTO
				setApr(d.interestRate ? String(d.interestRate) : '');
				setMinPayment(d.minPayment ? String(d.minPayment) : '');
				setDueDay(d.dueDayOfMonth ? String(d.dueDayOfMonth) : '');
			} catch (err) {
				Alert.alert('Error', 'Could not load debt.');
				router.back();
			} finally {
				if (mounted) setLoading(false);
			}
		};
		load();
		return () => {
			mounted = false;
		};
	}, [id, router]);

	const onSave = async () => {
		if (!debt) return;

		// Validation
		if (!name.trim()) {
			return Alert.alert('Missing Information', 'Please enter a debt name.');
		}

		const balNum = Number(balance);
		if (isNaN(balNum) || balNum < 0) {
			return Alert.alert(
				'Invalid Amount',
				'Please enter a valid current balance.'
			);
		}

		const aprNum = apr ? Number(apr) : undefined;
		if (aprNum !== undefined && (isNaN(aprNum) || aprNum < 0 || aprNum > 100)) {
			return Alert.alert(
				'Invalid Interest Rate',
				'Interest rate must be between 0 and 100%.'
			);
		}

		const minPaymentNum = minPayment ? Number(minPayment) : undefined;
		if (
			minPaymentNum !== undefined &&
			(isNaN(minPaymentNum) || minPaymentNum < 0)
		) {
			return Alert.alert(
				'Invalid Amount',
				'Minimum payment must be a positive number.'
			);
		}

		const dueDayNum = dueDay ? Number(dueDay) : undefined;
		if (
			dueDayNum !== undefined &&
			(isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 31)
		) {
			return Alert.alert(
				'Invalid Due Day',
				'Due day must be between 1 and 31.'
			);
		}

		setSaving(true);
		try {
			await DebtsService.update(debt._id, {
				name: name.trim(),
				currentBalance: balNum,
				interestRate: aprNum,
				minPayment: minPaymentNum,
				dueDayOfMonth: dueDayNum,
			});
			Alert.alert('Saved', 'Debt updated successfully.');
			router.back();
		} catch (err: any) {
			Alert.alert(
				'Error',
				err?.message || 'Could not update debt. Please try again.'
			);
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<ActivityIndicator style={{ marginTop: 40 }} />
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.form}>
					<Label text="Name" required />
					<TextInput
						value={name}
						onChangeText={setName}
						style={styles.input}
						placeholder="e.g., Chase Sapphire, Student Loan"
						placeholderTextColor="#999"
						autoCapitalize="words"
					/>

					<Label text="Current balance" required />
					<TextInput
						value={balance}
						onChangeText={(text) => {
							const cleaned = text.replace(/[^0-9.]/g, '');
							setBalance(cleaned);
						}}
						style={styles.input}
						placeholder="0.00"
						placeholderTextColor="#999"
						keyboardType="decimal-pad"
					/>

					<Label text="Interest rate (APR %)" optional />
					<TextInput
						value={apr}
						onChangeText={(text) => {
							const cleaned = text.replace(/[^0-9.]/g, '');
							setApr(cleaned);
						}}
						style={styles.input}
						placeholder="e.g., 24.99"
						placeholderTextColor="#999"
						keyboardType="decimal-pad"
					/>

					<Label text="Minimum payment" optional />
					<TextInput
						value={minPayment}
						onChangeText={(text) => {
							const cleaned = text.replace(/[^0-9.]/g, '');
							setMinPayment(cleaned);
						}}
						style={styles.input}
						placeholder="0.00"
						placeholderTextColor="#999"
						keyboardType="decimal-pad"
					/>

					<Label text="Due day of month" optional />
					<TextInput
						value={dueDay}
						onChangeText={(text) => {
							const cleaned = text.replace(/[^0-9]/g, '');
							if (cleaned === '' || (Number(cleaned) >= 1 && Number(cleaned) <= 31)) {
								setDueDay(cleaned);
							}
						}}
						style={styles.input}
						placeholder="1-31"
						placeholderTextColor="#999"
						keyboardType="number-pad"
						maxLength={2}
					/>
				</View>
			</ScrollView>

			{/* Activity feed */}
			<View style={styles.feed}>
				<Text style={styles.feedTitle}>Recent activity</Text>
				{!debt?.activity?.length ? (
					<Text style={styles.feedEmpty}>
						No payments yet. Add a transaction and target this debt to see it
						here.
					</Text>
				) : (
					<FlatList
						data={debt.activity}
						keyExtractor={(item, i) => item._id ?? String(i)}
						renderItem={({ item }) => (
							<View style={styles.feedItem}>
								<View>
									<Text style={styles.feedAmount}>-${item.amount}</Text>
									{item.note ? (
										<Text style={styles.feedNote}>{item.note}</Text>
									) : null}
								</View>
								<Text style={styles.feedDate}>
									{new Date(item.date).toLocaleDateString()}
								</Text>
							</View>
						)}
					/>
				)}
			</View>

			<TouchableOpacity
				style={[styles.cta, saving && { opacity: 0.6 }]}
				onPress={onSave}
				disabled={saving}
			>
				{saving ? (
					<ActivityIndicator color="#fff" />
				) : (
					<Text style={styles.ctaText}>Save Changes</Text>
				)}
			</TouchableOpacity>
		</SafeAreaView>
	);
}

function Label({ text, required, optional }: { text: string; required?: boolean; optional?: boolean }) {
	return (
		<Text style={styles.label}>
			{text}
			{required && <Text style={styles.required}> *</Text>}
			{optional && <Text style={styles.optional}> (optional)</Text>}
		</Text>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: palette.bg },
	form: {
		paddingHorizontal: 16,
		gap: 10,
	},
	label: {
		fontWeight: '600',
		color: palette.text,
		marginTop: 6,
		marginBottom: 2,
		fontSize: 14,
	},
	required: {
		color: '#EF4444',
	},
	optional: {
		color: palette.sub,
		fontWeight: '400',
		fontSize: 12,
	},
	input: {
		height: 44,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: palette.line,
		paddingHorizontal: 12,
		fontSize: 16,
		color: palette.text,
		backgroundColor: '#FFFFFF',
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingBottom: 20,
	},
	feed: {
		marginTop: 18,
		marginHorizontal: 16,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: palette.line,
		padding: 14,
		gap: 8,
	},
	feedTitle: { fontWeight: '700', color: palette.text },
	feedEmpty: { color: palette.sub },
	feedItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 6,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: '#E2E8F0',
	},
	feedAmount: { fontWeight: '700', color: '#0F172A' },
	feedNote: { color: palette.sub },
	feedDate: { color: palette.sub, fontSize: 12 },
	cta: {
		marginTop: 'auto',
		marginHorizontal: 16,
		marginBottom: 24,
		height: 50,
		borderRadius: 14,
		backgroundColor: palette.accent,
		alignItems: 'center',
		justifyContent: 'center',
	},
	ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

