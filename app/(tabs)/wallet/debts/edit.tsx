import React, { useState, useEffect, useMemo } from 'react';
import {
	View,
	StyleSheet,
	TextInput,
	ScrollView,
	Alert,
	ActivityIndicator,
	Text,
	TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
	DebtsService,
	DebtDTO,
} from '../../../../src/services/feature/debtsService';
import { FormInputGroup } from '../../../../src/components/forms';
import { Page, Section, Card, LoadingState } from '../../../../src/ui';
import {
	palette,
	radius,
	space,
	type as typography,
} from '../../../../src/ui/theme';
import { DateField } from '../../../../src/components/DateField';

// Helper to clean currency input
const cleanCurrencyToNumberString = (v: string) =>
	v.replace(/[^\d.]/g, '').replace(/^0+(\d)/, '$1');

export default function EditDebtScreen() {
	const params = useLocalSearchParams();
	const debtId = params.id as string;

	const [name, setName] = useState('');
	const [balance, setBalance] = useState('');
	const [apr, setApr] = useState('');
	const [minPayment, setMinPayment] = useState('');
	const [dueDay, setDueDay] = useState(''); // still the day-of-month (1–31)
	const [dueDate, setDueDate] = useState<string>(''); // full YYYY-MM-DD for DateField
	const [loading, setLoading] = useState(false);
	const [debt, setDebt] = useState<DebtDTO | null>(null);
	const [originalValues, setOriginalValues] = useState<{
		name: string;
		balance: string;
		apr: string;
		minPayment: string;
		dueDay: string;
	} | null>(null);

	// Load debt data when component mounts
	useEffect(() => {
		let mounted = true;
		const load = async () => {
			try {
				const d = await DebtsService.getById(debtId);
				if (!mounted) return;
				setDebt(d);
				const debtName = d.name || '';
				const debtBalance = d.currentBalance ? String(d.currentBalance) : '';
				const debtApr = d.interestRate ? String(d.interestRate) : '';
				const debtMinPayment = d.minPayment ? String(d.minPayment) : '';
				const debtDueDay = d.dueDayOfMonth ? String(d.dueDayOfMonth) : '';

				setName(debtName);
				setBalance(debtBalance);
				setApr(debtApr);
				setMinPayment(debtMinPayment);
				setDueDay(debtDueDay);

				// Seed date picker value from dueDayOfMonth using current month/year
				if (d.dueDayOfMonth) {
					const today = new Date();
					const year = today.getFullYear();
					const month = today.getMonth(); // 0-based
					const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
					const day = Math.min(d.dueDayOfMonth, lastDayOfMonth);
					const seeded = new Date(year, month, day).toISOString().split('T')[0];
					setDueDate(seeded);
				} else {
					setDueDate('');
				}

				// Store original values for change detection
				setOriginalValues({
					name: debtName,
					balance: debtBalance,
					apr: debtApr,
					minPayment: debtMinPayment,
					dueDay: debtDueDay,
				});
			} catch {
				if (mounted) {
					Alert.alert('Error', 'Could not load debt.');
					router.back();
				}
			}
		};
		load();
		return () => {
			mounted = false;
		};
	}, [debtId]);

	// Check if any values have changed
	const hasChanges = useMemo(() => {
		if (!originalValues) return false;

		const currentBalanceNum = parseFloat(cleanCurrencyToNumberString(balance));
		const originalBalanceNum = parseFloat(
			cleanCurrencyToNumberString(originalValues.balance)
		);
		const currentAprNum = apr
			? parseFloat(cleanCurrencyToNumberString(apr))
			: null;
		const originalAprNum = originalValues.apr
			? parseFloat(cleanCurrencyToNumberString(originalValues.apr))
			: null;
		const currentMinPaymentNum = minPayment
			? parseFloat(cleanCurrencyToNumberString(minPayment))
			: null;
		const originalMinPaymentNum = originalValues.minPayment
			? parseFloat(cleanCurrencyToNumberString(originalValues.minPayment))
			: null;
		const currentDueDayNum = dueDay ? Number(dueDay) : null;
		const originalDueDayNum = originalValues.dueDay
			? Number(originalValues.dueDay)
			: null;

		return (
			name.trim() !== originalValues.name.trim() ||
			currentBalanceNum !== originalBalanceNum ||
			currentAprNum !== originalAprNum ||
			currentMinPaymentNum !== originalMinPaymentNum ||
			currentDueDayNum !== originalDueDayNum
		);
	}, [originalValues, name, balance, apr, minPayment, dueDay]);

	// Memoized validation for save button
	const saveDisabled = useMemo(() => {
		const balNum = parseFloat(cleanCurrencyToNumberString(balance));
		const aprNum = apr ? parseFloat(cleanCurrencyToNumberString(apr)) : null;
		const minPaymentNum = minPayment
			? parseFloat(cleanCurrencyToNumberString(minPayment))
			: null;
		const dueDayNum = dueDay ? Number(dueDay) : null;

		return (
			loading ||
			!name.trim() ||
			isNaN(balNum) ||
			balNum < 0 ||
			(aprNum !== null && (isNaN(aprNum) || aprNum < 0 || aprNum > 100)) ||
			(minPaymentNum !== null && (isNaN(minPaymentNum) || minPaymentNum < 0)) ||
			(dueDayNum !== null &&
				(isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 31)) ||
			!hasChanges
		);
	}, [loading, name, balance, apr, minPayment, dueDay, hasChanges]);

	const handleSave = async () => {
		if (!debt) return;

		// Validation (unchanged)
		if (!name.trim()) {
			Alert.alert('Error', 'Please enter a debt name');
			return;
		}

		const balNum = parseFloat(cleanCurrencyToNumberString(balance));
		if (isNaN(balNum) || balNum < 0) {
			Alert.alert('Error', 'Please enter a valid current balance');
			return;
		}

		const aprNum = apr
			? parseFloat(cleanCurrencyToNumberString(apr))
			: undefined;
		if (aprNum !== undefined && (isNaN(aprNum) || aprNum < 0 || aprNum > 100)) {
			Alert.alert('Error', 'Interest rate must be between 0 and 100%');
			return;
		}

		const minPaymentNum = minPayment
			? parseFloat(cleanCurrencyToNumberString(minPayment))
			: undefined;
		if (
			minPaymentNum !== undefined &&
			(isNaN(minPaymentNum) || minPaymentNum < 0)
		) {
			Alert.alert('Error', 'Minimum payment must be a positive number');
			return;
		}

		const dueDayNum = dueDay ? Number(dueDay) : undefined;
		if (
			dueDayNum !== undefined &&
			(isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 31)
		) {
			Alert.alert('Error', 'Due day must be between 1 and 31');
			return;
		}

		setLoading(true);
		try {
			await DebtsService.update(debt._id, {
				name: name.trim(),
				currentBalance: balNum,
				interestRate: aprNum,
				minPayment: minPaymentNum,
				dueDayOfMonth: dueDayNum,
			});

			Alert.alert('Success', 'Debt updated successfully!', [
				{ text: 'OK', onPress: () => router.back() },
			]);
		} catch (error: any) {
			const errorMessage =
				error?.response?.data?.message ||
				error?.message ||
				'Failed to update debt. Please try again.';
			Alert.alert('Error', errorMessage);
		} finally {
			setLoading(false);
		}
	};

	// When debt isn't loaded yet
	if (!debt) {
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
					style={styles.content}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					<Section title="Details" subtitle="Update the basics for this debt.">
						<Card>
							<View style={styles.form}>
								{/* Debt Name */}
								<FormInputGroup label="Debt Name">
									<TextInput
										style={styles.textInput}
										value={name}
										onChangeText={setName}
										placeholder="e.g., Chase Sapphire, Student Loan"
										placeholderTextColor={palette.textSubtle}
										autoCapitalize="words"
									/>
								</FormInputGroup>

								{/* Current Balance */}
								<FormInputGroup
									label="Current Balance"
									subtext="Enter the current outstanding balance"
								>
									<TextInput
										style={styles.textInput}
										value={balance}
										onChangeText={(text) =>
											setBalance(cleanCurrencyToNumberString(text))
										}
										placeholder="0.00"
										placeholderTextColor={palette.textSubtle}
										keyboardType="decimal-pad"
									/>
								</FormInputGroup>

								{/* Interest & Minimum Payment (side‑by‑side for symmetry) */}
								<View style={styles.inlineRow}>
									<View style={styles.inlineItem}>
										<FormInputGroup
											label="Interest rate (APR %)"
											subtext="Optional: Annual percentage rate"
										>
											<TextInput
												style={styles.textInput}
												value={apr}
												onChangeText={(text) =>
													setApr(cleanCurrencyToNumberString(text))
												}
												placeholder="24.99"
												placeholderTextColor={palette.textSubtle}
												keyboardType="decimal-pad"
											/>
										</FormInputGroup>
									</View>

									<View style={styles.inlineItem}>
										<FormInputGroup
											label="Minimum payment"
											subtext="Optional: Minimum monthly payment amount"
										>
											<TextInput
												style={styles.textInput}
												value={minPayment}
												onChangeText={(text) =>
													setMinPayment(cleanCurrencyToNumberString(text))
												}
												placeholder="0.00"
												placeholderTextColor={palette.textSubtle}
												keyboardType="decimal-pad"
											/>
										</FormInputGroup>
									</View>
								</View>

								{/* Due Day – now a date picker */}
								<FormInputGroup
									label="Due date"
									subtext="Pick a date; we'll use the day of month (1–31)"
								>
									<DateField
										value={dueDate || ''} // empty string shows placeholder
										onChange={(iso) => {
											setDueDate(iso);
											const parts = iso.split('-');
											const dayPart =
												parts.length === 3 ? Number(parts[2]) : NaN;
											if (!Number.isNaN(dayPart)) {
												setDueDay(String(dayPart));
											} else {
												setDueDay('');
											}
										}}
										placeholder="Select due date"
										containerStyle={{
											borderWidth: 1,
											borderColor: palette.border,
											borderRadius: radius.md,
											paddingHorizontal: space.md,
											paddingVertical: space.sm,
											backgroundColor: palette.surface ?? '#FFFFFF',
										}}
										showQuickActions={true}
									/>
								</FormInputGroup>
							</View>
						</Card>
					</Section>
				</ScrollView>

				{/* Footer Save CTA */}
				<View style={styles.footer}>
					<View style={styles.footerCta}>
						<View style={styles.footerRow}>
							<TouchableOpacity
								onPress={() => router.back()}
								style={styles.footerCancelButton}
							>
								<Text style={styles.footerCancel}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={saveDisabled ? undefined : handleSave}
								style={[
									styles.footerSaveButton,
									saveDisabled && styles.footerSaveButtonDisabled,
								]}
								disabled={saveDisabled}
								activeOpacity={0.85}
							>
								{loading ? (
									<ActivityIndicator
										color={palette.primaryTextOn}
										size="small"
									/>
								) : (
									<Text style={styles.footerSave}>Save changes</Text>
								)}
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</View>
		</Page>
	);
}

const styles = StyleSheet.create({
	layout: {
		flex: 1,
	},
	content: {
		flex: 1,
	},
	scrollContent: {
		gap: space.lg,
		paddingBottom: space.xl,
	},
	form: {
		gap: space.md,
	},
	inlineRow: {
		flexDirection: 'row',
		gap: space.md,
	},
	inlineItem: {
		flex: 1,
	},
	textInput: {
		borderWidth: 1,
		borderColor: palette.border,
		borderRadius: radius.md,
		paddingHorizontal: space.md,
		paddingVertical: space.md,
		fontSize: 16,
		color: palette.text,
		backgroundColor: palette.surface ?? '#FFFFFF',
	},
	footer: {
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: palette.border,
		backgroundColor: palette.bg,
		paddingHorizontal: space.lg,
		paddingVertical: space.md,
	},
	footerCta: {
		gap: 8,
	},
	footerLabel: {
		...typography.bodyXs,
		color: palette.textMuted,
	},
	footerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: space.md,
	},
	footerCancelButton: {
		paddingVertical: space.sm,
	},
	footerCancel: {
		...typography.bodySm,
		color: palette.textMuted,
	},
	footerSaveButton: {
		flex: 1,
		height: 52,
		borderRadius: radius.lg,
		backgroundColor: palette.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	footerSaveButtonDisabled: {
		opacity: 0.6,
	},
	footerSave: {
		...typography.bodySm,
		color: palette.primaryTextOn,
		fontWeight: '600',
	},
});
