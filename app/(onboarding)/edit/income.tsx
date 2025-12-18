import React, { useState, useMemo, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	Pressable,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { palette, radius, space, type, shadow } from '../../../src/ui/theme';
import { useProfile } from '../../../src/context/profileContext';
import { currency } from '../../../src/utils/format';

type Cadence = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';

export default function EditIncomeScreen() {
	const router = useRouter();
	const { profile, updateProfile } = useProfile();

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

	// Hydrate local state from profile
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
		const income = parseFloat(monthlyIncome) || derivedMonthlyIncome;
		if (income < 0) return;

		setLoading(true);
		try {
			await updateProfile({
				monthlyIncome: income,
				pay: {
					cadence: (payCadence as any) || null,
					netPerPaycheck: parseFloat(netPerPaycheck) || 0,
					derivedMonthlyIncome,
					varies: false,
				},
			});
			router.replace('/(tabs)/dashboard');
		} catch (error) {
			console.error('Failed to update income:', error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.screen}>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={{ flex: 1 }}
			>
				<View style={styles.header}>
					<Pressable onPress={() => router.back()} style={styles.backBtn}>
						<Ionicons name="arrow-back" size={24} color={palette.text} />
					</Pressable>
					<Text style={styles.title}>Monthly Income</Text>
					<View style={{ width: 40 }} />
				</View>

				<ScrollView
					style={{ flex: 1 }}
					contentContainerStyle={styles.content}
					keyboardShouldPersistTaps="handled"
				>
					<View style={styles.inputGroup}>
						<Text style={styles.label}>How do you get paid?</Text>
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
									<Text
										style={[
											styles.chipText,
											payCadence === opt.k && styles.chipTextSelected,
										]}
									>
										{opt.label}
									</Text>
								</Pressable>
							))}
						</View>
					</View>

					<View style={styles.inputGroup}>
						<Text style={styles.label}>Net per paycheck</Text>
						<View style={styles.inputWithIcon}>
							<Ionicons name="logo-usd" size={18} color={palette.textSubtle} />
							<TextInput
								value={netPerPaycheck}
								onChangeText={setNetPerPaycheck}
								keyboardType="decimal-pad"
								style={styles.inputWithIconText}
								placeholder="0.00"
							/>
						</View>
						{derivedMonthlyIncome > 0 && (
							<Text style={styles.helper}>
								Estimated monthly: {currency(derivedMonthlyIncome)}
							</Text>
						)}
					</View>

					<View style={[styles.divider, { marginVertical: space.lg }]} />

					<View style={styles.inputGroup}>
						<Text style={styles.label}>Or enter total monthly income</Text>
						<View style={styles.inputWithIcon}>
							<Ionicons name="logo-usd" size={18} color={palette.textSubtle} />
							<TextInput
								value={monthlyIncome}
								onChangeText={setMonthlyIncome}
								keyboardType="decimal-pad"
								style={styles.inputWithIconText}
								placeholder="0.00"
							/>
						</View>
					</View>
				</ScrollView>

				<View style={styles.footer}>
					<Pressable
						onPress={handleSave}
						disabled={loading}
						style={({ pressed }) => [
							styles.saveBtn,
							loading && { opacity: 0.5 },
							pressed && { opacity: 0.9 },
						]}
					>
						<Text style={styles.saveText}>
							{loading ? 'Saving...' : 'Save Income'}
						</Text>
					</Pressable>
				</View>
			</KeyboardAvoidingView>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: palette.surface,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: space.lg,
		paddingTop: 60,
		paddingBottom: space.md,
		borderBottomWidth: 1,
		borderBottomColor: palette.border,
	},
	backBtn: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
		...type.h2,
		color: palette.text,
	},
	content: {
		padding: space.lg,
	},
	inputGroup: {
		marginBottom: space.lg,
	},
	label: {
		...type.small,
		color: palette.textMuted,
		marginBottom: space.xs,
		fontWeight: '700',
		textTransform: 'uppercase',
	},
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
	chipSelected: {
		backgroundColor: palette.primarySubtle,
		borderColor: palette.primary,
	},
	chipText: {
		...type.small,
		color: palette.text,
	},
	chipTextSelected: {
		color: palette.primary,
		fontWeight: '700',
	},
	inputWithIcon: {
		flexDirection: 'row',
		alignItems: 'center',
		height: 54,
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
		...type.small,
		color: palette.success,
		marginTop: 6,
		fontWeight: '600',
	},
	divider: {
		height: 1,
		backgroundColor: palette.border,
	},
	footer: {
		padding: space.lg,
		paddingBottom: 40,
	},
	saveBtn: {
		height: 54,
		borderRadius: radius.lg,
		backgroundColor: palette.primary,
		alignItems: 'center',
		justifyContent: 'center',
		...shadow.card,
	},
	saveText: {
		...type.body,
		fontWeight: '700',
		color: palette.primaryTextOn,
	},
});

