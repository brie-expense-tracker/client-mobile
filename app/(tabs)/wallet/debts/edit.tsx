import React, { useEffect, useState } from 'react';
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
	ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
	DebtsService,
	DebtDTO,
} from '../../../../src/services/feature/debtsService';
import { Page, Section, LoadingState, Card } from '../../../../src/ui';
import { palette, radius, space } from '../../../../src/ui/theme';
import { dynamicTextStyle } from '../../../../src/utils/accessibility';

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
			} catch {
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
			<Page>
				<LoadingState label="Loading debt…" />
			</Page>
		);
	}

	return (
		<Page>
			<View style={styles.layout}>
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					<Section
						title="Details"
						subtitle="Update the basics for this balance."
					>
						<Card>
							<View style={styles.form}>
								<Label text="Name" required />

								<TextInput
									value={name}
									onChangeText={setName}
									style={styles.input}
									placeholder="e.g., Chase Sapphire, Student Loan"
									placeholderTextColor="#94A3B8"
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
									placeholderTextColor="#94A3B8"
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
									placeholderTextColor="#94A3B8"
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
									placeholderTextColor="#94A3B8"
									keyboardType="decimal-pad"
								/>

								<Label text="Due day of month" optional />

								<TextInput
									value={dueDay}
									onChangeText={(text) => {
										const cleaned = text.replace(/[^0-9]/g, '');
										if (
											cleaned === '' ||
											(Number(cleaned) >= 1 && Number(cleaned) <= 31)
										) {
											setDueDay(cleaned);
										}
									}}
									style={styles.input}
									placeholder="1–31"
									placeholderTextColor="#94A3B8"
									keyboardType="number-pad"
									maxLength={2}
								/>
							</View>
						</Card>
					</Section>
				</ScrollView>

				<View style={styles.footer}>
					<TouchableOpacity
						style={[styles.cta, saving && styles.ctaDisabled]}
						onPress={onSave}
						disabled={saving}
						activeOpacity={0.85}
					>
						{saving ? (
							<ActivityIndicator color={palette.primaryTextOn} />
						) : (
							<Text style={[styles.ctaText, dynamicTextStyle('body')]}>
								Save changes
							</Text>
						)}
					</TouchableOpacity>
				</View>
			</View>
		</Page>
	);
}

function Label({
	text,
	required,
	optional,
}: {
	text: string;
	required?: boolean;
	optional?: boolean;
}) {
	return (
		<Text style={[styles.label, dynamicTextStyle('body')]}>
			{text}
			{required && <Text style={styles.required}> *</Text>}
			{optional && <Text style={styles.optional}> (optional)</Text>}
		</Text>
	);
}

const styles = StyleSheet.create({
	layout: {
		flex: 1,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		gap: space.lg,
	},
	form: {
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
		color: palette.textSubtle,
		fontWeight: '400',
		fontSize: 12,
	},
	input: {
		height: 44,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: palette.border,
		paddingHorizontal: 12,
		fontSize: 16,
		color: palette.text,
		backgroundColor: palette.surface ?? '#FFFFFF',
	},
	footer: {
		paddingHorizontal: space.lg,
		paddingVertical: space.lg,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: palette.border,
		backgroundColor: palette.bg,
	},
	cta: {
		height: 52,
		borderRadius: radius.lg,
		backgroundColor: palette.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	ctaDisabled: {
		opacity: 0.6,
	},
	ctaText: {
		color: palette.primaryTextOn,
		fontWeight: '600',
		fontSize: 16,
	},
});
