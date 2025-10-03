import React, { useMemo, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	Alert,
	ScrollView,
	ActivityIndicator,
	Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RectButton } from 'react-native-gesture-handler';
import useAuth from '../../../../src/context/AuthContext';

export default function DeleteAccountScreen() {
	const router = useRouter();
	const {
		firebaseUser,
		loading,
		deleteAccountAfterReauth,
		reauthWithPassword,
		reauthWithGoogle,
	} = useAuth();

	const [confirmText, setConfirmText] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [busy, setBusy] = useState(false);
	const [reauthComplete, setReauthComplete] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	// Determine user's sign-in providers
	const providers: string[] = useMemo(() => {
		const ids =
			firebaseUser?.providerData
				?.map((p: any) => p?.providerId)
				.filter(Boolean) ?? [];
		return Array.from(new Set(ids));
	}, [firebaseUser]);

	const usesPassword = providers.includes('password');
	const usesGoogle = providers.includes('google.com');
	const usesApple = providers.includes('apple.com');

	const canConfirmDeleteWord = confirmText.trim().toUpperCase() === 'DELETE';

	const isDeleteEnabled =
		canConfirmDeleteWord && reauthComplete && !busy && !loading;

	const handleVerifyIdentity = async () => {
		setFormError(null);
		if (!canConfirmDeleteWord) {
			setFormError('Type DELETE to confirm before verifying your identity.');
			return;
		}
		if (usesPassword && password.trim().length < 6) {
			setFormError('Please enter your password.');
			return;
		}

		try {
			setBusy(true);
			if (usesPassword) {
				// Reauthenticate with Firebase using password
				await reauthWithPassword(password.trim());
			} else if (usesGoogle) {
				// Reauthenticate with Firebase using Google
				await reauthWithGoogle();
			} else if (usesApple) {
				// Apple Sign-In not yet implemented
				throw new Error(
					'Apple Sign-In reauthentication not yet available. Please contact support.'
				);
			} else {
				// Fallback: if no known provider, block to be safe
				throw new Error('Unsupported sign-in method. Please contact support.');
			}
			setReauthComplete(true);
		} catch (e: any) {
			console.warn('Reauth failed:', e);
			setFormError(
				e?.code === 'auth/wrong-password'
					? 'Incorrect password. Please try again.'
					: e?.code === 'auth/popup-closed-by-user' ||
					  e?.message?.includes('cancel')
					? 'Verification was cancelled.'
					: e?.message || 'Verification failed. Please try again.'
			);
		} finally {
			setBusy(false);
		}
	};

	const handleDelete = async () => {
		if (!isDeleteEnabled) return;
		Alert.alert(
			'Final Confirmation',
			'This action cannot be undone. All your data will be permanently deleted. Are you sure?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete Account',
					style: 'destructive',
					onPress: async () => {
						try {
							setBusy(true);

							// Since we've already reauthenticated, just delete the account
							await deleteAccountAfterReauth();

							Alert.alert(
								'Account Deleted',
								'Your account has been permanently deleted.',
								[{ text: 'OK', onPress: () => {} }]
							);
							// Auth listener should route to signup/login automatically
						} catch (error: any) {
							console.error('Delete error:', error);
							Alert.alert(
								'Error',
								error?.code === 'auth/requires-recent-login'
									? 'Please verify your identity again and retry.'
									: 'Failed to delete account. Please try again.'
							);
							setReauthComplete(false); // force another reauth
						} finally {
							setBusy(false);
						}
					},
				},
			]
		);
	};

	return (
		<View style={styles.container}>
			<ScrollView
				style={styles.content}
				contentContainerStyle={{ paddingBottom: 24 }}
				showsVerticalScrollIndicator={false}
			>
				{/* Danger Warning Card */}
				<View style={[styles.dangerCard, shadowCard]}>
					<Ionicons name="warning" size={48} color="#DC2626" />
					<Text style={styles.title}>Delete Account</Text>
					<Text style={styles.subtitle}>
						This is permanent. All transactions, budgets, goals, and settings
						will be erased.
					</Text>
				</View>

				{/* Step 1: Type DELETE */}
				<View style={[styles.section, shadowLite]}>
					<Text style={styles.sectionTitle}>Step 1 — Confirm</Text>
					<Text style={styles.label}>
						Type <Text style={styles.mono}>DELETE</Text> to proceed
					</Text>
					<TextInput
						style={styles.input}
						value={confirmText}
						onChangeText={setConfirmText}
						placeholder="Type DELETE"
						placeholderTextColor="#9CA3AF"
						autoCapitalize="characters"
						autoCorrect={false}
						keyboardType={Platform.OS === 'ios' ? 'ascii-capable' : 'default'}
					/>
					{!canConfirmDeleteWord && !!confirmText && (
						<Text style={styles.errorText}>Please type DELETE exactly.</Text>
					)}
				</View>

				{/* Step 2: Verify identity (provider-aware) */}
				<View style={[styles.section, shadowLite]}>
					<Text style={styles.sectionTitle}>Step 2 — Verify your identity</Text>

					{usesPassword ? (
						<>
							<Text style={styles.label}>Password</Text>
							<View style={styles.passwordContainer}>
								<TextInput
									style={styles.passwordInput}
									value={password}
									onChangeText={setPassword}
									placeholder="Enter your password"
									placeholderTextColor="#9CA3AF"
									autoCapitalize="none"
									autoCorrect={false}
									secureTextEntry={!showPassword}
								/>
								<RectButton
									style={styles.eyeButton}
									onPress={() => setShowPassword(!showPassword)}
								>
									<Ionicons
										name={showPassword ? 'eye-off' : 'eye'}
										size={20}
										color="#6B7280"
									/>
								</RectButton>
							</View>
						</>
					) : (
						<>
							{usesGoogle && (
								<RectButton
									style={[styles.providerBtn, shadowLite]}
									onPress={handleVerifyIdentity}
									enabled={canConfirmDeleteWord && !busy && !loading}
								>
									{busy ? (
										<ActivityIndicator size="small" color="#1F2937" />
									) : (
										<>
											<Ionicons name="logo-google" size={20} color="#1D4ED8" />
											<Text style={styles.providerBtnText}>
												Verify with Google
											</Text>
										</>
									)}
								</RectButton>
							)}
							{usesApple && (
								<RectButton
									style={[styles.providerBtn, shadowLite, styles.btnDisabled]}
									onPress={() => {
										Alert.alert(
											'Coming Soon',
											'Apple Sign-In verification will be available soon.'
										);
									}}
									enabled={false}
								>
									<Ionicons name="logo-apple" size={20} color="#9CA3AF" />
									<Text style={[styles.providerBtnText, { color: '#9CA3AF' }]}>
										Verify with Apple (Soon)
									</Text>
								</RectButton>
							)}
							{!usesGoogle && !usesApple && (
								<Text style={styles.helperText}>
									Your account uses a non-password sign-in method. Please
									contact support.
								</Text>
							)}
						</>
					)}

					{/* Verify button shown for password users */}
					{usesPassword && (
						<RectButton
							style={[
								styles.verifyBtn,
								(!canConfirmDeleteWord || !password || busy || loading) &&
									styles.btnDisabled,
							]}
							onPress={handleVerifyIdentity}
							enabled={canConfirmDeleteWord && !!password && !busy && !loading}
						>
							{busy ? (
								<ActivityIndicator size="small" color="#FFFFFF" />
							) : (
								<Text style={styles.verifyBtnText}>
									{reauthComplete ? 'Verified ✓' : 'Verify'}
								</Text>
							)}
						</RectButton>
					)}

					{!!formError && <Text style={styles.errorText}>{formError}</Text>}

					{reauthComplete && (
						<View style={styles.verifiedPill}>
							<Ionicons name="checkmark-circle" size={18} color="#16A34A" />
							<Text style={styles.verifiedText}>Identity verified</Text>
						</View>
					)}
				</View>

				{/* Step 3: Delete */}
				<View style={[styles.section, shadowLite]}>
					<Text style={styles.sectionTitle}>Step 3 — Delete account</Text>
					<Text style={styles.helperText}>
						This will remove your Brie account and all associated data. This
						cannot be undone.
					</Text>

					<RectButton
						style={[styles.deleteBtn, !isDeleteEnabled && styles.btnDisabled]}
						onPress={handleDelete}
						enabled={isDeleteEnabled}
					>
						{busy ? (
							<ActivityIndicator size="small" color="#FFFFFF" />
						) : (
							<Text style={styles.deleteBtnText}>Delete Account</Text>
						)}
					</RectButton>

					<RectButton style={styles.cancelBtn} onPress={() => router.back()}>
						<Text style={styles.cancelBtnText}>Cancel</Text>
					</RectButton>
				</View>
			</ScrollView>
		</View>
	);
}

const shadowCard = Platform.select({
	ios: {
		shadowColor: '#000',
		shadowOpacity: 0.07,
		shadowOffset: { width: 0, height: 6 },
		shadowRadius: 16,
	},
	android: { elevation: 2 },
});

const shadowLite = Platform.select({
	ios: {
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowOffset: { width: 0, height: 3 },
		shadowRadius: 8,
	},
	android: { elevation: 1 },
});

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#F8FAFC' },
	content: { flex: 1, padding: 16 },

	dangerCard: {
		backgroundColor: '#FEF2F2',
		borderColor: '#FECACA',
		borderWidth: 1,
		borderRadius: 14,
		padding: 20,
		alignItems: 'center',
		marginBottom: 16,
	},
	title: {
		fontSize: 22,
		fontWeight: '800',
		color: '#DC2626',
		marginTop: 10,
		textAlign: 'center',
	},
	subtitle: {
		fontSize: 14,
		color: '#7F1D1D',
		textAlign: 'center',
		marginTop: 6,
	},

	section: {
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		padding: 16,
		marginBottom: 16,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#E5E7EB',
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111827',
		marginBottom: 10,
	},

	label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
	mono: {
		fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
		fontWeight: '700',
	},
	input: {
		height: 48,
		backgroundColor: '#fff',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		paddingHorizontal: 12,
		fontSize: 16,
		color: '#111827',
	},
	passwordContainer: {
		position: 'relative',
		flexDirection: 'row',
		alignItems: 'center',
		height: 48,
		backgroundColor: '#fff',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	passwordInput: {
		flex: 1,
		height: 48,
		paddingHorizontal: 12,
		fontSize: 16,
		color: '#111827',
	},
	eyeButton: {
		position: 'absolute',
		right: 12,
		height: 48,
		width: 32,
		alignItems: 'center',
		justifyContent: 'center',
	},

	helperText: { color: '#6B7280', fontSize: 13, marginTop: 8 },
	errorText: { color: '#DC2626', fontSize: 12, marginTop: 8 },

	providerBtn: {
		height: 48,
		backgroundColor: '#FFFFFF',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 6,
		flexDirection: 'row',
		gap: 10,
	},
	providerBtnText: { fontSize: 15, fontWeight: '600', color: '#1F2937' },

	verifyBtn: {
		height: 48,
		backgroundColor: '#0EA5E9',
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 12,
	},
	verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

	verifiedPill: {
		marginTop: 10,
		alignSelf: 'flex-start',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: '#ECFDF5',
		borderWidth: 1,
		borderColor: '#A7F3D0',
	},
	verifiedText: { color: '#065F46', fontSize: 13, fontWeight: '700' },

	deleteBtn: {
		backgroundColor: '#EF4444',
		height: 48,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 12,
	},
	deleteBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

	cancelBtn: {
		backgroundColor: '#fff',
		height: 48,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 10,
	},
	cancelBtnText: { color: '#374151', fontSize: 16, fontWeight: '600' },

	btnDisabled: { opacity: 0.6 },
});
