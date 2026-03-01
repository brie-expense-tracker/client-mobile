import React, { useState, useEffect, useRef } from 'react';
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

const defaultExpenses = {
	housing: 0,
	loans: 0,
	subscriptions: 0,
};

export default function EditExpensesScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { profile, updateProfile } = useProfile();

	const expenses = profile?.expenses ?? defaultExpenses;

	const toDisplayValue = (n: number | undefined) =>
		n == null || n === 0 ? '' : String(n);

	const [housing, setHousing] = useState(() => toDisplayValue(expenses.housing));
	const [loans, setLoans] = useState(() => toDisplayValue(expenses.loans));
	const [subscriptions, setSubscriptions] = useState(() =>
		toDisplayValue(expenses.subscriptions)
	);
	const [loading, setLoading] = useState(false);
	const hasSyncedRef = useRef(false);

	useEffect(() => {
		if (!profile?.expenses || hasSyncedRef.current) return;
		hasSyncedRef.current = true;
		setHousing(toDisplayValue(profile.expenses.housing));
		setLoans(toDisplayValue(profile.expenses.loans));
		setSubscriptions(toDisplayValue(profile.expenses.subscriptions));
	}, [profile]);

	const handleSave = async () => {
		const housingNum = parseFloat(housing) || 0;
		const loansNum = parseFloat(loans) || 0;
		const subsNum = parseFloat(subscriptions) || 0;
		if (housingNum < 0 || loansNum < 0 || subsNum < 0) return;

		setLoading(true);
		try {
			await updateProfile({
				expenses: {
					housing: housingNum,
					loans: loansNum,
					subscriptions: subsNum,
				},
			});
			router.back();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to save';
			Alert.alert('Couldn’t save', message, [{ text: 'OK' }]);
		} finally {
			setLoading(false);
		}
	};

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
					<AppText.Title style={styles.title}>Monthly Expenses</AppText.Title>
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
					<AppText.Caption color="muted" style={styles.description}>
						Enter your fixed monthly expenses. This helps us show your budget
						and financial health.
					</AppText.Caption>

					<AppCard padding={space.lg} borderRadius={radius.xl}>
						<AppText.Label color="subtle" style={styles.inputLabel}>
							Housing (rent / mortgage)
						</AppText.Label>
						<View style={styles.inputWithIcon}>
							<Ionicons name="logo-usd" size={18} color={palette.textSubtle} />
							<TextInput
								value={housing}
								onChangeText={setHousing}
								keyboardType="decimal-pad"
								style={styles.inputWithIconText}
								placeholder="0.00"
								placeholderTextColor={palette.textSubtle}
							/>
						</View>

						<AppText.Label color="subtle" style={[styles.inputLabel, styles.inputLabelTop]}>
							Loans (car, student, etc.)
						</AppText.Label>
						<View style={styles.inputWithIcon}>
							<Ionicons name="logo-usd" size={18} color={palette.textSubtle} />
							<TextInput
								value={loans}
								onChangeText={setLoans}
								keyboardType="decimal-pad"
								style={styles.inputWithIconText}
								placeholder="0.00"
								placeholderTextColor={palette.textSubtle}
							/>
						</View>

						<AppText.Label color="subtle" style={[styles.inputLabel, styles.inputLabelTop]}>
							Subscriptions
						</AppText.Label>
						<View style={styles.inputWithIcon}>
							<Ionicons name="logo-usd" size={18} color={palette.textSubtle} />
							<TextInput
								value={subscriptions}
								onChangeText={setSubscriptions}
								keyboardType="decimal-pad"
								style={styles.inputWithIconText}
								placeholder="0.00"
								placeholderTextColor={palette.textSubtle}
							/>
						</View>
					</AppCard>

					<View style={styles.footer}>
						<AppButton
							label={loading ? 'Saving…' : 'Save Expenses'}
							variant="primary"
							onPress={handleSave}
							disabled={loading}
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
	description: {
		marginBottom: space.xl,
	},
	inputLabel: { marginBottom: space.xs },
	inputLabelTop: { marginTop: space.lg },
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
	footer: { marginTop: space.xl },
});
