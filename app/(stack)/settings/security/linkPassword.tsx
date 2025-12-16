import React, { useMemo, useState, useCallback } from 'react';
import {
	Alert,
	KeyboardAvoidingView,
	Platform,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { RectButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import useAuth from '../../../../src/context/AuthContext';

export default function LinkPasswordScreen() {
	const router = useRouter();
	const { firebaseUser, linkPassword } = useAuth();

	const [email, setEmail] = useState(firebaseUser?.email ?? '');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	const palette = useMemo(
		() => ({
			bg: '#FFFFFF',
			text: '#0F172A',
			subtext: '#475569',
			brand: '#0A84FF',
			border: '#E2E8F0',
			error: '#DC2626',
			inputBg: '#FFFFFF',
		}),
		[]
	);

	const isValidEmail = (val: string) =>
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim().toLowerCase());

	const passwordOk = password.trim().length >= 6;
	const passwordsMatch = password.trim() === confirmPassword.trim();

	const canSubmit =
		!isLoading && isValidEmail(email) && passwordOk && passwordsMatch;

	const formatLinkError = (err: any) => {
		const code = err?.code || '';
		if (code === 'auth/email-already-in-use') {
			return 'That email is already linked to another account. Try a different email.';
		}
		if (code === 'auth/credential-already-in-use') {
			return 'That password credential is already linked to another account.';
		}
		if (code === 'auth/provider-already-linked') {
			return 'Email & password is already linked to this account.';
		}
		if (code === 'auth/requires-recent-login') {
			return 'For security, please verify your Google sign-in and try again.';
		}
		if (code === 'auth/weak-password') {
			return 'Password is too weak. Please use a stronger password.';
		}
		return err?.message || 'Unable to add a password. Please try again.';
	};

	const onSubmit = useCallback(async () => {
		if (!canSubmit) return;
		setIsLoading(true);
		try {
			await linkPassword(email, password);
			Alert.alert('Password Added', 'You can now sign in using email and password.', [
				{
					text: 'OK',
					onPress: () => router.back(),
				},
			]);
		} catch (err: any) {
			Alert.alert('Couldn’t add password', formatLinkError(err), [{ text: 'OK' }]);
		} finally {
			setIsLoading(false);
		}
	}, [canSubmit, email, password, linkPassword, router]);

	return (
		<SafeAreaView style={[styles.safeArea, { backgroundColor: palette.bg }]}>
			<Stack.Screen options={{ title: 'Add Password', headerShown: true }} />
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			>
				<ScrollView
					contentContainerStyle={styles.content}
					keyboardShouldPersistTaps="handled"
				>
					<View style={styles.header}>
						<Ionicons name="key-outline" size={28} color={palette.brand} />
						<Text style={[styles.title, { color: palette.text }]}>
							Add a password
						</Text>
						<Text style={[styles.subtitle, { color: palette.subtext }]}>
							This lets you sign in without Google on this device.
						</Text>
					</View>

					<View style={styles.card}>
						<Text style={[styles.label, { color: palette.subtext }]}>Email</Text>
						<TextInput
							style={[styles.input, { borderColor: palette.border }]}
							placeholder="you@example.com"
							placeholderTextColor="#94A3B8"
							value={email}
							onChangeText={setEmail}
							keyboardType="email-address"
							autoCapitalize="none"
							autoCorrect={false}
							autoComplete="email"
						/>
						{email.length > 0 && !isValidEmail(email) && (
							<Text style={[styles.errorText, { color: palette.error }]}>
								Enter a valid email address.
							</Text>
						)}

						<Text style={[styles.label, { color: palette.subtext, marginTop: 14 }]}>
							New password
						</Text>
						<View style={[styles.passwordWrap, { borderColor: palette.border }]}>
							<TextInput
								style={styles.passwordInput}
								placeholder="At least 6 characters"
								placeholderTextColor="#94A3B8"
								value={password}
								onChangeText={setPassword}
								secureTextEntry={!showPassword}
								autoCapitalize="none"
								autoCorrect={false}
								textContentType="newPassword"
							/>
							<RectButton
								enabled={!isLoading}
								onPress={() => setShowPassword((s) => !s)}
								style={styles.eyeBtn}
							>
								<Ionicons
									name={showPassword ? 'eye-off' : 'eye'}
									size={20}
									color="#64748B"
								/>
							</RectButton>
						</View>
						{!!password && !passwordOk && (
							<Text style={[styles.errorText, { color: palette.error }]}>
								Password must be at least 6 characters.
							</Text>
						)}

						<Text style={[styles.label, { color: palette.subtext, marginTop: 14 }]}>
							Confirm password
						</Text>
						<TextInput
							style={[styles.input, { borderColor: palette.border }]}
							placeholder="Re-enter password"
							placeholderTextColor="#94A3B8"
							value={confirmPassword}
							onChangeText={setConfirmPassword}
							secureTextEntry={!showPassword}
							autoCapitalize="none"
							autoCorrect={false}
							textContentType="password"
						/>
						{!!confirmPassword && !passwordsMatch && (
							<Text style={[styles.errorText, { color: palette.error }]}>
								Passwords do not match.
							</Text>
						)}

						<RectButton
							enabled={canSubmit}
							onPress={onSubmit}
							style={[
								styles.cta,
								{ backgroundColor: canSubmit ? palette.brand : '#CBD5E1' },
							]}
						>
							<Text style={styles.ctaText}>
								{isLoading ? 'Adding…' : 'Add password'}
							</Text>
						</RectButton>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1 },
	content: { padding: 16, paddingBottom: 24 },
	header: { alignItems: 'center', gap: 6, paddingTop: 8, paddingBottom: 10 },
	title: { fontSize: 20, fontWeight: '800' },
	subtitle: { fontSize: 13, textAlign: 'center' },
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
	},
	label: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
	input: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 12,
		backgroundColor: '#FFFFFF',
	},
	passwordWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 12,
		backgroundColor: '#FFFFFF',
	},
	passwordInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12 },
	eyeBtn: { paddingHorizontal: 10, paddingVertical: 10 },
	errorText: { fontSize: 12, marginTop: 6, fontWeight: '600' },
	cta: {
		marginTop: 16,
		borderRadius: 12,
		paddingVertical: 14,
		alignItems: 'center',
	},
	ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});


