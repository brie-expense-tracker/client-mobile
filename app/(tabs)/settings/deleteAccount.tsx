import React, { useCallback, useState } from 'react';
import {
	View,
	StyleSheet,
	ScrollView,
	TextInput,
	Alert,
	ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuth, { getAuthProviderName } from '../../../src/context/AuthContext';
import { palette, radius, space } from '../../../src/ui/theme';
import { AppCard, AppText, AppButton } from '../../../src/ui/primitives';

export default function DeleteAccountScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { authProviderId, deleteAccountFlow } = useAuth();
	const [password, setPassword] = useState('');
	const [isDeleting, setIsDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const providerName = getAuthProviderName(authProviderId);
	const needsPassword = authProviderId === 'password';

	const handleDelete = useCallback(async () => {
		if (needsPassword && password.trim().length < 6) {
			setError('Enter your password to confirm deletion.');
			return;
		}

		setIsDeleting(true);
		setError(null);
		try {
			await deleteAccountFlow(
				needsPassword ? { password: password.trim() } : undefined
			);
			router.replace('/(auth)/login');
		} catch (e: unknown) {
			const err = e as { code?: string; message?: string };
			if (err?.code === 'auth/cancelled') {
				setError(null);
				return;
			}
			if (err?.code === 'delete/password-required') {
				setError('Enter your password to confirm deletion.');
				return;
			}
			if (err?.code === 'auth/wrong-password') {
				setError('Incorrect password. Please try again.');
				return;
			}
			setError(
				err?.message ||
					'Could not delete your account. Please try again in a moment.'
			);
		} finally {
			setIsDeleting(false);
		}
	}, [needsPassword, password, deleteAccountFlow, router]);

	const confirmDelete = useCallback(() => {
		Alert.alert(
			'Delete account permanently?',
			'This will permanently delete your Brie account and all associated data. This cannot be undone.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete account',
					style: 'destructive',
					onPress: () => {
						void handleDelete();
					},
				},
			]
		);
	}, [handleDelete]);

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={[
				styles.content,
				{ paddingBottom: insets.bottom + space.xl },
			]}
			keyboardShouldPersistTaps="handled"
		>
			<AppCard padding={space.lg}>
				<AppText.Heading>Delete your account</AppText.Heading>
				<AppText.Body color="muted" style={styles.lead}>
					Deleting your account permanently removes your profile, transactions,
					budgets, goals, and all other data from Brie. You will not be able to
					recover this information.
				</AppText.Body>
			</AppCard>

			<AppCard padding={space.lg}>
				<AppText.Label color="subtle">CONFIRM WITH</AppText.Label>
				<AppText.Body style={styles.providerLine}>{providerName}</AppText.Body>
				{needsPassword ? (
					<>
						<AppText.Caption color="muted" style={styles.fieldHint}>
							Enter your password to verify it is you.
						</AppText.Caption>
						<TextInput
							style={styles.input}
							value={password}
							onChangeText={setPassword}
							secureTextEntry
							autoCapitalize="none"
							autoCorrect={false}
							textContentType="password"
							placeholder="Password"
							placeholderTextColor={palette.textSubtle}
							editable={!isDeleting}
						/>
					</>
				) : (
					<AppText.Caption color="muted" style={styles.fieldHint}>
						You may be asked to sign in with {providerName} once more to confirm
						this action.
					</AppText.Caption>
				)}
				{!!error && (
					<AppText.Caption color="danger" style={styles.error}>
						{error}
					</AppText.Caption>
				)}
			</AppCard>

			<View style={styles.actions}>
				<AppButton
					label={isDeleting ? 'Deleting account…' : 'Delete my account'}
					variant="ghost"
					onPress={confirmDelete}
					disabled={isDeleting || (needsPassword && password.trim().length < 6)}
					fullWidth
					textStyle={styles.deleteCtaText}
					style={styles.deleteCta}
				/>
				{isDeleting && (
					<ActivityIndicator
						style={styles.spinner}
						color={palette.danger}
					/>
				)}
				<AppButton
					label="Cancel"
					variant="secondary"
					onPress={() => router.back()}
					disabled={isDeleting}
					fullWidth
				/>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: palette.bg,
	},
	content: {
		padding: space.lg,
		gap: space.lg,
	},
	lead: {
		marginTop: space.sm,
	},
	providerLine: {
		marginTop: space.xs,
	},
	fieldHint: {
		marginTop: space.sm,
		marginBottom: space.sm,
	},
	input: {
		width: '100%',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: radius.xl2,
		backgroundColor: palette.input,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: palette.border,
		color: palette.text,
		fontSize: 17,
	},
	error: {
		marginTop: space.sm,
	},
	actions: {
		gap: space.sm,
	},
	spinner: {
		marginTop: space.xs,
	},
	deleteCta: {
		backgroundColor: palette.dangerSoft,
		borderWidth: 1,
		borderColor: palette.dangerBorder,
	},
	deleteCtaText: {
		color: palette.danger,
		fontWeight: '700',
	},
});
