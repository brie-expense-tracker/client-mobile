import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	Image,
	SafeAreaView,
	KeyboardAvoidingView,
	ScrollView,
	Platform,
	ActivityIndicator,
	Pressable,
	Alert,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import * as Haptics from 'expo-haptics';
import useAuth from '../../src/context/AuthContext';
import { RectButton, BorderlessButton } from 'react-native-gesture-handler';
import { createLogger } from '../../src/utils/sublogger';

const loginScreenLog = createLogger('LoginScreen');

type FieldErrors = {
	email?: string;
	password?: string;
	form?: string;
};

// Map Firebase auth error codes to user-friendly messages
const getAuthErrorMessage = (error: any): string => {
	const code = error?.code || '';
	const message = error?.message || '';

	// Handle Firebase auth error codes
	switch (code) {
		case 'auth/invalid-credential':
		case 'auth/wrong-password':
			return 'Incorrect password. Please try again or use "Forgot password?" to reset it.';

		case 'auth/user-not-found':
			return 'No account found with this email. Please sign up to create an account.';

		case 'auth/invalid-email':
			return 'Invalid email format. Please check your email and try again.';

		case 'auth/user-disabled':
			return 'This account has been disabled. Please contact support for assistance.';

		case 'auth/too-many-requests':
			return 'Too many failed attempts. Please wait a few minutes and try again, or reset your password.';

		case 'auth/network-request-failed':
			return 'Network error. Please check your internet connection and try again.';

		case 'auth/operation-not-allowed':
			return 'This sign-in method is not enabled. Please try a different method.';

		case 'auth/requires-recent-login':
			return 'For security, please sign out and sign back in, then try again.';

		case 'auth/invalid-verification-code':
		case 'auth/invalid-verification-id':
			return 'Invalid verification code. Please try again.';

		case 'auth/email-already-in-use':
			return 'An account with this email already exists. Please sign in instead.';

		case 'auth/weak-password':
			return 'Password is too weak. Please use a stronger password.';

		case 'auth/account-exists-with-different-credential':
			return 'An account already exists with the same email but different sign-in method. Please use the original sign-in method.';

		case 'auth/credential-already-in-use':
			return 'This credential is already associated with a different account.';

		case 'auth/invalid-action-code':
			return 'This link has expired or is invalid. Please request a new one.';

		case 'auth/expired-action-code':
			return 'This link has expired. Please request a new password reset email.';

		case 'auth/popup-closed-by-user':
		case 'auth/cancelled-popup-request':
			return 'Sign-in was cancelled. Please try again.';

		case 'auth/popup-blocked':
			return 'Pop-up was blocked. Please allow pop-ups and try again.';

		default:
			// If there's a user-friendly message in the error, use it
			if (message && !message.includes('auth/')) {
				return message;
			}
			// Fallback to generic message
			return 'Unable to sign in. Please check your email and password, or try again later.';
	}
};

export default function Login() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [touched, setTouched] = useState<{ email: boolean; password: boolean }>(
		{
			email: false,
			password: false,
		}
	);
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const { login, signInWithGoogle, error: authError, clearError } = useAuth();

	const palette = useMemo(
		() => ({
			bg: '#FFFFFF',
			text: '#0F172A',
			subtext: '#475569',
			brand: '#0A84FF',
			brandDark: '#0060D1',
			border: '#E2E8F0',
			error: '#DC2626',
			inputBg: '#FFFFFF',
			shadow: '#0F172A',
			divider: '#E2E8F0',
		}),
		[]
	);

	const isValidEmail = (val: string) =>
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim().toLowerCase());

	const isValidPassword = (val: string) => val.trim().length >= 6;

	const errors: FieldErrors = {};
	if (touched.email && !isValidEmail(email)) {
		errors.email = 'Enter a valid email address.';
	}
	if (touched.password && !isValidPassword(password)) {
		errors.password = 'Password must be at least 6 characters.';
	}

	const canSubmit =
		isValidEmail(email) && isValidPassword(password) && !isLoading;

	// Watch for auth errors from the context
	useEffect(() => {
		if (authError) {
			// Map auth error codes to user-friendly messages
			let message =
				authError.message || 'Something went wrong. Please try again.';

			if (authError.code === 'ACCOUNT_NOT_FOUND') {
				message =
					'Your account was not found. Please sign up to create a new account.';
			} else if (authError.code === 'LOGIN_ERROR') {
				message = 'Unable to sign in. Please try again.';
			} else if (authError.code === 'GOOGLE_SIGNIN_ERROR') {
				message = 'Google Sign-In failed. Please try again.';
			}

			setFormError(message);
		}
	}, [authError]);

	// Clear errors when user starts typing
	useEffect(() => {
		if (formError && (email || password)) {
			setFormError(null);
			if (authError) {
				clearError();
			}
		}
	}, [email, password, formError, authError, clearError]);

	const handleLogin = useCallback(async () => {
		// Clear any previous errors
		setFormError(null);
		if (authError) {
			clearError();
		}
		// mark both fields as touched to reveal errors if present
		setTouched({ email: true, password: true });

		if (!isValidEmail(email) || !isValidPassword(password) || isLoading) return;

		setIsLoading(true);
		try {
			const emailTrimmed = email.trim().toLowerCase();

			// First, check if user exists by checking sign-in methods for this email
			// Wrap this in try-catch to handle errors separately from sign-in errors
			let signInMethods: string[] = [];
			let userExists = false;
			try {
				signInMethods = await auth().fetchSignInMethodsForEmail(emailTrimmed);
				// If we got sign-in methods (even if empty), the user exists
				// Empty array might mean user exists but no methods are available (edge case)
				userExists = true;
			} catch (fetchError: any) {
				// If fetchSignInMethodsForEmail throws auth/user-not-found, user definitely doesn't exist
				if (fetchError?.code === 'auth/user-not-found') {
					const errorMessage =
						'No account found with this email. Please sign up to create an account.';
					await Haptics.notificationAsync(
						Haptics.NotificationFeedbackType.Error
					);
					loginScreenLog.warn('Login error - user not found', {
						email: emailTrimmed,
					});
					setFormError(errorMessage);
					Alert.alert('Account Not Found', errorMessage, [{ text: 'OK' }]);
					return;
				}
				// For other errors (network, etc.), log but continue to attempt sign-in
				// Firebase will handle the actual error when we try to sign in
				loginScreenLog.warn('Error fetching sign-in methods', {
					error: fetchError,
					email: emailTrimmed,
				});
				// Don't assume user doesn't exist - let sign-in attempt determine this
			}

			// Only check for sign-in method mismatch if we successfully fetched methods
			// If fetchSignInMethodsForEmail failed, we'll let signInWithEmailAndPassword handle it
			if (userExists && signInMethods.length > 0) {
				// Check if user signed up with a different method (e.g., Google)
				if (!signInMethods.includes('password')) {
					// User exists but doesn't have password auth enabled
					const hasGoogle = signInMethods.includes('google.com');
					const hasApple = signInMethods.includes('apple.com');

					let errorMessage = 'This account was created using ';
					if (hasGoogle && hasApple) {
						errorMessage +=
							'Google or Apple Sign-In. Please use one of those methods to sign in.';
					} else if (hasGoogle) {
						errorMessage +=
							'Google Sign-In. Please use Google Sign-In to sign in.';
					} else if (hasApple) {
						errorMessage +=
							'Apple Sign-In. Please use Apple Sign-In to sign in.';
					} else {
						errorMessage +=
							'a different sign-in method. Please use the original method you used to create your account.';
					}

					await Haptics.notificationAsync(
						Haptics.NotificationFeedbackType.Error
					);
					loginScreenLog.warn('Login error - wrong sign-in method', {
						email: emailTrimmed,
						signInMethods,
					});
					setFormError(errorMessage);
					Alert.alert('Sign-In Method Mismatch', errorMessage, [
						{ text: 'OK' },
					]);
					return;
				}
			}

			// User exists and has password auth (or we couldn't determine), attempt to sign in
			// Firebase will return the correct error if password is wrong or user doesn't exist
			const userCredential = await auth().signInWithEmailAndPassword(
				emailTrimmed,
				password.trim()
			);

			// Pass the Firebase user to your app's auth context to handle backend verification
			await login(userCredential.user);

			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		} catch (e: any) {
			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

			// Handle sign-in errors (wrong password, network issues, etc.)
			let errorMessage = getAuthErrorMessage(e);

			// Ensure wrong password errors are clearly identified
			// Note: Firebase may return auth/invalid-credential for wrong password
			if (
				e?.code === 'auth/wrong-password' ||
				e?.code === 'auth/invalid-credential'
			) {
				errorMessage =
					'Incorrect password. Please try again or use "Forgot password?" to reset it.';
			}

			// Don't show "user not found" if we're here - that means sign-in was attempted
			// which implies the user exists (or fetchSignInMethodsForEmail failed silently)
			if (e?.code === 'auth/user-not-found') {
				// This shouldn't happen if fetchSignInMethodsForEmail worked, but handle it anyway
				errorMessage =
					'No account found with this email. Please sign up to create an account.';
			}

			loginScreenLog.warn('Login error', { error: e, message: errorMessage });
			setFormError(errorMessage);

			// Show alert dialog
			Alert.alert('Sign In Failed', errorMessage, [{ text: 'OK' }]);
		} finally {
			setIsLoading(false);
		}
	}, [email, password, isLoading, login, authError, clearError]);

	const handleGoogleSignIn = useCallback(async () => {
		if (isLoading) return;

		// Clear any previous errors
		setFormError(null);
		if (authError) {
			clearError();
		}

		setIsLoading(true);
		try {
			await signInWithGoogle();
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		} catch (error: any) {
			// Silently ignore user cancellation and account creation declination
			const cancelled =
				(error?.code === 'auth/internal-error' &&
					error?.message?.includes('cancelled')) ||
				error?.code === 'GOOGLE_SIGNIN_CANCELED' ||
				error?.code === 'auth/popup-closed-by-user' ||
				error?.code === 'auth/cancelled-popup-request' ||
				error?.message?.includes('Account creation cancelled');
			if (!cancelled) {
				let errorMessage = getAuthErrorMessage(error);

				// Check if account exists with different credential (email/password)
				if (error?.code === 'auth/account-exists-with-different-credential') {
					// Try to get the email from the error
					const email = error?.email || error?.customData?.email;
					if (email) {
						try {
							// Check what sign-in methods are available for this email
							const signInMethods = await auth().fetchSignInMethodsForEmail(
								email
							);
							if (signInMethods.includes('password')) {
								errorMessage =
									'This account was created using email and password. Please use email and password to sign in.';
							} else if (signInMethods.includes('apple.com')) {
								errorMessage =
									'This account was created using Apple Sign-In. Please use Apple Sign-In to sign in.';
							} else {
								errorMessage =
									'This account was created using a different sign-in method. Please use the original method you used to create your account.';
							}
						} catch {
							// If we can't check, use the default message
							errorMessage =
								'This account was created using email and password. Please use email and password to sign in.';
						}
					} else {
						errorMessage =
							'This account was created using email and password. Please use email and password to sign in.';
					}
				}

				loginScreenLog.warn('Google Sign-In error', error);
				await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
				setFormError(errorMessage);

				// Show alert dialog
				Alert.alert('Sign-In Method Mismatch', errorMessage, [{ text: 'OK' }]);
			}
		} finally {
			setIsLoading(false);
		}
	}, [isLoading, signInWithGoogle, authError, clearError]);

	const onBlurEmail = () => setTouched((t) => ({ ...t, email: true }));
	const onBlurPassword = () => setTouched((t) => ({ ...t, password: true }));

	return (
		<SafeAreaView
			style={[styles.safeAreaContainer, { backgroundColor: palette.bg }]}
		>
			<Stack.Screen options={{ headerShown: false }} />
			<KeyboardAvoidingView
				style={styles.keyboardAvoidingView}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
				keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
			>
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.mainContainer}>
						{/* Brand / Logo */}
						<Image
							source={require('../../src/assets/logos/brie-logo.png')}
							style={styles.logo}
							resizeMode="contain"
							accessible
							accessibilityLabel="Brie logo"
						/>

						{/* Headline & subtitle */}
						<View style={styles.headingWrap}>
							<Text style={[styles.title, { color: palette.text }]}>
								Welcome back
							</Text>
							<Text style={[styles.subtitle, { color: palette.subtext }]}>
								Sign in to continue your financial progress.
							</Text>
						</View>

						{/* Form Card */}
						<View style={[styles.card, cardShadow]}>
							{/* Email */}
							<Text style={[styles.label, { color: palette.subtext }]}>
								Email
							</Text>
							<TextInput
								style={[styles.input, inputShadow]}
								placeholder="you@example.com"
								placeholderTextColor="#94A3B8"
								value={email}
								onChangeText={(t) => setEmail(t)}
								onBlur={onBlurEmail}
								keyboardType="email-address"
								autoCapitalize="none"
								autoCorrect={false}
								textContentType="username"
								accessibilityLabel="Email address input"
								returnKeyType="next"
								onSubmitEditing={() => {
									// focus password? Kept simple to avoid ref noise
								}}
							/>
							{!!errors.email && (
								<Text style={styles.errorText} accessibilityLiveRegion="polite">
									{errors.email}
								</Text>
							)}

							{/* Password */}
							<Text
								style={[
									styles.label,
									{ color: palette.subtext, marginTop: 16 },
								]}
							>
								Password
							</Text>
							<View style={[styles.passwordInputContainer, inputShadow]}>
								<TextInput
									style={styles.passwordInput}
									placeholder="Enter your password"
									placeholderTextColor="#94A3B8"
									value={password}
									onChangeText={(t) => setPassword(t)}
									onBlur={onBlurPassword}
									secureTextEntry={!showPassword}
									autoCapitalize="none"
									autoCorrect={false}
									textContentType="password"
									accessibilityLabel="Password input"
									returnKeyType="done"
									onSubmitEditing={handleLogin}
								/>
								<Pressable
									accessibilityRole="button"
									accessibilityLabel={
										showPassword ? 'Hide password' : 'Show password'
									}
									hitSlop={12}
									onPress={() => setShowPassword((s) => !s)}
									style={styles.passwordToggle}
								>
									<Ionicons
										name={showPassword ? 'eye-off' : 'eye'}
										size={22}
										color="#64748B"
									/>
								</Pressable>
							</View>
							{!!errors.password && (
								<Text style={styles.errorText} accessibilityLiveRegion="polite">
									{errors.password}
								</Text>
							)}

							{/* Form-level error message */}
							{!!formError && (
								<View style={styles.formErrorContainer}>
									<Ionicons name="alert-circle" size={18} color="#DC2626" />
									<Text
										style={styles.formErrorText}
										accessibilityLiveRegion="polite"
									>
										{formError}
									</Text>
								</View>
							)}

							{/* Forgot password */}
							<View style={styles.forgotPasswordContainer}>
								<BorderlessButton
									onPress={() => router.push('/forgotPassword')}
									rippleColor="rgba(0,0,0,0.08)"
								>
									<Text style={styles.forgotPasswordText}>
										Forgot password?
									</Text>
								</BorderlessButton>
							</View>

							{/* Submit */}
							<RectButton
								enabled={canSubmit}
								onPress={handleLogin}
								style={[
									styles.cta,
									{ backgroundColor: canSubmit ? palette.brand : '#CBD5E1' },
								]}
							>
								{isLoading ? (
									<ActivityIndicator size="small" color="#FFFFFF" />
								) : (
									<Text style={styles.ctaText}>Sign In</Text>
								)}
							</RectButton>

							{/* Divider */}
							<View style={styles.dividerContainer}>
								<View
									style={[styles.divider, { backgroundColor: palette.divider }]}
								/>
								<Text style={[styles.dividerText, { color: palette.subtext }]}>
									or continue with
								</Text>
								<View
									style={[styles.divider, { backgroundColor: palette.divider }]}
								/>
							</View>

							{/* Socials */}
							<RectButton
								onPress={handleGoogleSignIn}
								enabled={!isLoading}
								style={[
									styles.socialButton,
									socialShadow,
									{ opacity: isLoading ? 0.6 : 1 },
								]}
							>
								<Ionicons name="logo-google" size={22} color="#1D4ED8" />
								<Text style={styles.socialButtonText}>
									{isLoading ? 'Signing in…' : 'Google'}
								</Text>
							</RectButton>

							<RectButton
								enabled={!isLoading}
								onPress={() => {}}
								style={[styles.socialButton, socialShadow, { opacity: 0.6 }]}
							>
								<Ionicons name="logo-apple" size={22} color="#0F172A" />
								<Text style={styles.socialButtonText}>Apple (soon)</Text>
							</RectButton>
						</View>

						{/* Signup prompt */}
						<View style={styles.signupRow}>
							<Text style={[styles.signupText, { color: palette.subtext }]}>
								Don&apos;t have an account?
							</Text>
							<BorderlessButton
								onPress={() => router.replace('/signup')}
								rippleColor="rgba(0,0,0,0.08)"
							>
								<Text style={styles.signupLink}>Sign Up</Text>
							</BorderlessButton>
						</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

/* ---------- Styles ---------- */

const inputShadow = Platform.select({
	ios: {
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.06,
		shadowRadius: 6,
	},
	android: { elevation: 1.5 },
});

const socialShadow = Platform.select({
	ios: {
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 8,
	},
	android: { elevation: 2 },
});

const cardShadow = Platform.select({
	ios: {
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.08,
		shadowRadius: 20,
	},
	android: { elevation: 3 },
});

const styles = StyleSheet.create({
	safeAreaContainer: {
		flex: 1,
	},
	keyboardAvoidingView: { flex: 1 },
	scrollView: { flex: 1 },
	scrollContent: { flexGrow: 1 },
	mainContainer: {
		flex: 1,
		minHeight: '100%',
		paddingHorizontal: 20,
		paddingTop: 24,
		paddingBottom: 16,
		alignItems: 'stretch',
	},
	logo: {
		width: 120,
		height: 56,
		alignSelf: 'center',
		marginTop: 12,
		marginBottom: 16,
	},
	headingWrap: { alignItems: 'center', marginBottom: 8 },
	title: { fontSize: 24, fontWeight: '700', letterSpacing: 0.2 },
	subtitle: { fontSize: 14, marginTop: 6 },
	card: {
		width: '100%',
		backgroundColor: '#FFFFFF',
		borderRadius: 20,
		padding: 18,
		marginTop: 16,
	},
	label: {
		fontSize: 13,
		fontWeight: '600',
		marginBottom: 8,
	},
	input: {
		width: '100%',
		paddingHorizontal: 14,
		paddingVertical: 14,
		borderRadius: 12,
		backgroundColor: '#FFFFFF',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#E2E8F0',
	},
	errorText: {
		color: '#DC2626',
		fontSize: 12,
		marginTop: 6,
	},
	formErrorContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FEF2F2',
		borderWidth: 1,
		borderColor: '#FCA5A5',
		borderRadius: 12,
		padding: 12,
		marginTop: 12,
		gap: 8,
	},
	formErrorText: {
		flex: 1,
		color: '#DC2626',
		fontSize: 13,
		fontWeight: '600',
		lineHeight: 18,
	},
	passwordInputContainer: {
		position: 'relative',
		width: '100%',
		borderRadius: 12,
		backgroundColor: '#FFFFFF',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#E2E8F0',
	},
	passwordInput: {
		width: '100%',
		paddingHorizontal: 14,
		paddingVertical: 14,
		borderRadius: 12,
	},
	passwordToggle: {
		position: 'absolute',
		right: 10,
		top: 0,
		bottom: 0,
		justifyContent: 'center',
		paddingHorizontal: 6,
	},
	forgotPasswordContainer: {
		width: '100%',
		alignItems: 'flex-end',
		marginTop: 8,
		marginBottom: 8,
	},
	forgotPasswordText: {
		color: '#0A84FF',
		fontSize: 13,
		fontWeight: '600',
	},
	cta: {
		width: '100%',
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 14,
		marginTop: 12,
		overflow: 'hidden',
	},
	ctaText: {
		color: '#FFFFFF',
		fontSize: 17,
		fontWeight: '700',
	},
	dividerContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginVertical: 18,
	},
	divider: { flex: 1, height: StyleSheet.hairlineWidth },
	dividerText: { marginHorizontal: 10, fontSize: 13 },
	socialButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		justifyContent: 'center',
		paddingVertical: 14,
		borderRadius: 12,
		backgroundColor: '#FFFFFF',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#E2E8F0',
		marginBottom: 10,
	},
	socialButtonText: {
		fontSize: 15,
		fontWeight: '600',
		color: '#334155',
	},
	signupRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 6,
		marginTop: 14,
	},
	signupText: { fontSize: 14 },
	signupLink: {
		fontSize: 14,
		color: '#0A84FF',
		fontWeight: '800',
	},
});
