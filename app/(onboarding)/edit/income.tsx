import React, { useState, useMemo, useEffect } from 'react';
import {
	View,
	StyleSheet,
	TextInput,
	Pressable,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, radius, space } from '../../../src/ui/theme';
import { AppCard, AppText, AppButton } from '../../../src/ui/primitives';
import { useProfile } from '../../../src/context/profileContext';

const currency = (amount: number) =>
	new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0,
	}).format(amount);

type Cadence = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';

type InputMode = 'monthly' | 'perPaycheck';

export default function EditIncomeScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { profile, updateProfile } = useProfile();

	const [inputMode, setInputMode] = useState<InputMode>(() => {
		const hasPay = profile?.pay?.cadence && (profile?.pay?.netPerPaycheck ?? 0) > 0;
		return hasPay ? 'perPaycheck' : 'monthly';
	});
	const [monthlyIncome, setMonthlyIncome] = useState(
		profile?.monthlyIncome?.toString() || ''
	);
	const [payCadence, setPayCadence] = useState<Cadence | ''>(
		(profile?.pay?.cadence as Cadence) || ''
	);
	const [netPerPaycheck, setNetPerPaycheck] = useState(
		profile?.pay?.netPerPaycheck?.toString() || ''
	);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!profile) return;
		setMonthlyIncome(profile.monthlyIncome?.toString() || '');
		setPayCadence((profile.pay?.cadence as Cadence) || '');
		setNetPerPaycheck(profile.pay?.netPerPaycheck?.toString() || '');
	}, [profile]);

	const derivedMonthlyIncome = useMemo(() => {
		const npp = parseFloat(netPerPaycheck || '0');
		if (!npp || !payCadence) return 0;
		switch (payCadence) {
			case 'weekly':
				return +(npp * 4.333).toFixed(2);
			case 'biweekly':
				return +(npp * 2.167).toFixed(2);
			case 'semimonthly':
				return +(npp * 2).toFixed(2);
			case 'monthly':
				return +npp.toFixed(2);
			default:
				return 0;
		}
	}, [payCadence, netPerPaycheck]);

	const handleSave = async () => {
		const income =
			inputMode === 'monthly'
				? parseFloat(monthlyIncome) || 0
				: derivedMonthlyIncome;
		if (income <= 0) return;

		setLoading(true);
		try {
			await updateProfile({
				monthlyIncome: income,
				pay:
					inputMode === 'perPaycheck'
						? {
								cadence: (payCadence as any) || null,
								netPerPaycheck: parseFloat(netPerPaycheck) || 0,
								derivedMonthlyIncome,
								varies: false,
							}
						: undefined,
			});
			router.back();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to save';
			Alert.alert('Couldn’t save', message, [{ text: 'OK' }]);
		} finally {
			setLoading(false);
		}
	};

	const canSave =
		inputMode === 'monthly'
			? (parseFloat(monthlyIncome) || 0) > 0
			: derivedMonthlyIncome > 0;

	return (
		<View style={[styles.screen, { paddingTop: insets.top }]}>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.flex}
			>
				<View style={styles.header}>
					<Pressable onPress={() => router.back()} style={styles.backBtn}>
						<Ionicons name="chevron-back" size={24} color={palette.text} />
					</Pressable>
					<AppText.Title style={styles.title}>Monthly Income</AppText.Title>
					<View style={styles.headerSpacer} />
				</View>

				<ScrollView
					style={styles.scroll}
					contentContainerStyle={[
						styles.content,
						{ paddingBottom: insets.bottom + space.xxl },
					]}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<AppCard padding={space.lg} borderRadius={radius.xl}>
						<AppText.Label color="subtle" style={styles.inputLabel}>
							How do you want to enter income?
						</AppText.Label>
						<View style={styles.chipRow}>
							<Pressable
								onPress={() => setInputMode('monthly')}
								style={[
									styles.chip,
									styles.modeChip,
									inputMode === 'monthly' && styles.chipSelected,
								]}
							>
								<AppText.Body
									style={inputMode === 'monthly' && styles.chipTextSelected}
								>
									Monthly total
								</AppText.Body>
							</Pressable>
							<Pressable
								onPress={() => setInputMode('perPaycheck')}
								style={[
									styles.chip,
									styles.modeChip,
									inputMode === 'perPaycheck' && styles.chipSelected,
								]}
							>
								<AppText.Body
									style={inputMode === 'perPaycheck' && styles.chipTextSelected}
								>
									Per paycheck
								</AppText.Body>
							</Pressable>
						</View>
					</AppCard>

					{inputMode === 'monthly' ? (
						<AppCard padding={space.lg} borderRadius={radius.xl} style={styles.cardTop}>
							<AppText.Label color="subtle" style={styles.inputLabel}>
								Total monthly income
							</AppText.Label>
							<View style={styles.inputWithIcon}>
								<Ionicons name="logo-usd" size={18} color={palette.textSubtle} />
								<TextInput
									value={monthlyIncome}
									onChangeText={setMonthlyIncome}
									keyboardType="decimal-pad"
									style={styles.inputWithIconText}
									placeholder="0.00"
									placeholderTextColor={palette.textSubtle}
								/>
							</View>
						</AppCard>
					) : (
						<AppCard padding={space.lg} borderRadius={radius.xl} style={styles.cardTop}>
							<AppText.Label color="subtle" style={styles.inputLabel}>
								How do you get paid?
							</AppText.Label>
							<View style={styles.chipRow}>
								{[
									{ k: 'weekly', label: 'Weekly' },
									{ k: 'biweekly', label: 'Every 2 wks' },
									{ k: 'semimonthly', label: 'Twice / mo' },
									{ k: 'monthly', label: 'Monthly' },
								].map((opt) => (
									<Pressable
										key={opt.k}
										onPress={() => setPayCadence(opt.k as Cadence)}
										style={[
											styles.chip,
											payCadence === opt.k && styles.chipSelected,
										]}
									>
										<AppText.Body
											style={payCadence === opt.k && styles.chipTextSelected}
										>
											{opt.label}
										</AppText.Body>
									</Pressable>
								))}
							</View>

							<AppText.Label color="subtle" style={[styles.inputLabel, styles.inputLabelTop]}>
								Net per paycheck
							</AppText.Label>
							<View style={styles.inputWithIcon}>
								<Ionicons name="logo-usd" size={18} color={palette.textSubtle} />
								<TextInput
									value={netPerPaycheck}
									onChangeText={setNetPerPaycheck}
									keyboardType="decimal-pad"
									style={styles.inputWithIconText}
									placeholder="0.00"
									placeholderTextColor={palette.textSubtle}
								/>
							</View>
							{derivedMonthlyIncome > 0 && (
								<AppText.Caption color="success" style={styles.helper}>
									Estimated monthly: {currency(derivedMonthlyIncome)}
								</AppText.Caption>
							)}
						</AppCard>
					)}

					<View style={styles.footer}>
						<AppButton
							label={loading ? 'Saving…' : 'Save Income'}
							variant="primary"
							onPress={handleSave}
							disabled={loading || !canSave}
							loading={loading}
							fullWidth
						/>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: palette.bg,
	},
	flex: { flex: 1 },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: space.lg,
		paddingVertical: space.md,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: palette.border,
	},
	backBtn: {
		padding: 4,
		marginRight: space.sm,
	},
	title: {
		flex: 1,
		textAlign: 'center',
	},
	headerSpacer: { width: 40 },
	scroll: { flex: 1 },
	content: {
		paddingHorizontal: space.xl,
		paddingTop: space.lg,
	},
	cardTop: { marginTop: space.lg },
	inputLabel: { marginBottom: space.xs },
	inputLabelTop: { marginTop: space.lg },
	chipRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginTop: 4,
	},
	chip: {
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: radius.pill,
		backgroundColor: palette.surfaceAlt,
		borderWidth: 1,
		borderColor: palette.border,
	},
	modeChip: {
		minWidth: 140,
		paddingVertical: 12,
		paddingHorizontal: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	chipSelected: {
		backgroundColor: palette.primarySubtle,
		borderColor: palette.primary,
	},
	chipTextSelected: {
		color: palette.primary,
		fontWeight: '700',
	},
	inputWithIcon: {
		flexDirection: 'row',
		alignItems: 'center',
		height: 52,
		backgroundColor: palette.surfaceAlt,
		borderRadius: radius.md,
		paddingHorizontal: space.md,
		borderWidth: 1,
		borderColor: palette.border,
	},
	inputWithIconText: {
		flex: 1,
		marginLeft: space.xs,
		fontSize: 16,
		color: palette.text,
	},
	helper: {
		marginTop: 6,
		fontWeight: '600',
	},
	footer: { marginTop: space.xl },
});
