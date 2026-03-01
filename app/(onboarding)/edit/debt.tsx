import React, { useState, useEffect } from 'react';
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

export default function EditDebtScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { profile, updateProfile } = useProfile();

	const initialDebt =
		profile?.debt != null && profile.debt !== 0 ? profile.debt.toString() : '';
	const [debt, setDebt] = useState(initialDebt);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!profile) return;
		setDebt(
			profile.debt != null && profile.debt !== 0 ? profile.debt.toString() : '',
		);
	}, [profile]);

	const handleSave = async () => {
		const debtNum = parseFloat(debt) || 0;
		if (debtNum < 0) return;

		setLoading(true);
		try {
			await updateProfile({
				debt: debtNum,
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
					<AppText.Title style={styles.title}>Total Debt</AppText.Title>
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
						Enter your total outstanding debt, including credit cards, personal
						loans, and student loans. (Exclude mortgage)
					</AppText.Caption>

					<AppCard padding={space.lg} borderRadius={radius.xl}>
						<AppText.Label color="subtle" style={styles.inputLabel}>
							Total Debt
						</AppText.Label>
						<View style={styles.inputWithIcon}>
							<Ionicons name="logo-usd" size={18} color={palette.textSubtle} />
							<TextInput
								value={debt}
								onChangeText={setDebt}
								keyboardType="decimal-pad"
								style={styles.inputWithIconText}
								placeholder="0.00"
								placeholderTextColor={palette.textSubtle}
								autoFocus
							/>
						</View>
					</AppCard>

					<View style={styles.footer}>
						<AppButton
							label={loading ? 'Saving…' : 'Update Debt'}
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
