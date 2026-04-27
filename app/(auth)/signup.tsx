import React, { useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import useAuth from '../../src/context/AuthContext';
import { RectButton, BorderlessButton } from 'react-native-gesture-handler';
import { createLogger } from '../../src/utils/sublogger';
import { palette, radius } from '../../src/ui/theme';

const signupScreenLog = createLogger('SignupScreen');

type FieldErrors = {
	email?: string;
	password?: string;
	form?: string;
};

export default function Signup() {
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
	const { signup, signUpWithGoogle } = useAuth();

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

	// Clear errors when user starts typing
	useEffect(() => {
		if (formError && (email || password)) {
			setFormError(null);
		}
	}, [email, password, formError]);

	const handleSignup = useCallback(async () => {
		// Clear any previous errors
		setFormError(null);
		// mark both fields as touched to reveal errors if present
		setTouched({ email: true, password: true });

		if (!isValidEmail(email) || !isValidPassword(password) || isLoading) return;

		setIsLoading(true);
		signupScreenLog.info('Starting signup process', {
			email: email.substring(0, 5) + '...',
		});
		try {
			// Use the auth context signup method
			await signup(email.trim().toLowerCase(), password.trim());
			signupScreenLog.info('Signup completed successfully');

			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		} catch (e: any) {
			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

			let errorMessage = 'An error occurred during signup.';
			let shouldRedirectToLogin = false;
			if (
				e?.code === 'auth/email-already-in-use' ||
				e?.message?.includes('already exists')
			) {
				errorMessage =
					'An account with this email already exists. Please log in instead.';
				shouldRedirectToLogin = true;
			} else if (e?.code === 'auth/weak-password') {
				errorMessage = 'Password is too weak.';
			} else if (e?.code === 'auth/invalid-email') {
				errorMessage = 'Invalid email address.';
			} else if (e?.code === 'auth/network-request-failed') {
				errorMessage =
					'Network error. Please check your connection and try again.';
			} else if (e?.message?.includes('Failed to create user')) {
				errorMessage = 'Failed to create account. Please try again.';
			}

			// Show a compact inline error message at the top of the form
			signupScreenLog.warn('Signup error', { error: e, message: errorMessage });
			setFormError(errorMessage);

			// If the account already exists, guide them straight to login.
			if (shouldRedirectToLogin) {
				setTimeout(() => {
					router.replace('/login');
				}, 800);
			}
		} finally {
			setIsLoading(false);
		}
	}, [email, password, isLoading, signup]);

	const handleGoogleSignUp = useCallback(async () => {
		if (isLoading) return;
		setIsLoading(true);
		try {
			await signUpWithGoogle();
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		} catch (error: any) {
			// Silently ignore user cancellation
			const cancelled =
				(error?.code === 'auth/internal-error' &&
					error?.message?.includes('cancelled')) ||
				error?.code === 'GOOGLE_SIGNUP_CANCELED';
			if (!cancelled) {
				signupScreenLog.warn('Google Sign-Up error', error);
				await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			}
		} finally {
			setIsLoading(false);
		}
	}, [isLoading, signUpWithGoogle]);

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
								Create your account
							</Text>
							<Text style={[styles.subtitle, { color: palette.textMuted }]}>
								Join Brie and start your financial journey today.
							</Text>
						</View>

						{/* Form Card */}
						<View style={[styles.card, cardShadow]}>
							{/* Email */}
							<Text style={[styles.label, { color: palette.textMuted }]}>
								Email
							</Text>
							<TextInput
								style={[styles.input, inputShadow]}
								placeholder="you@example.com"
								placeholderTextColor={palette.textSubtle}
								value={email}
								onChangeText={(t) => setEmail(t)}
								onBlur={onBlurEmail}
								keyboardType="email-address"
								autoCapitalize="none"
								autoCorrect={false}
								textContentType="emailAddress"
								autoComplete="email"
								importantForAutofill="yes"
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
									{ color: palette.textMuted, marginTop: 16 },
								]}
							>
								Password
							</Text>
							<View style={[styles.passwordInputContainer, inputShadow]}>
								<TextInput
									style={styles.passwordInput}
									placeholder="Enter your password"
									placeholderTextColor={palette.textSubtle}
									value={password}
									onChangeText={(t) => setPassword(t)}
									onBlur={onBlurPassword}
									secureTextEntry={!showPassword}
									autoCapitalize="none"
									autoCorrect={false}
									textContentType="newPassword"
									autoComplete="password-new"
									importantForAutofill="yes"
									passwordRules="minlength: 6;"
									accessibilityLabel="Password input"
									returnKeyType="done"
									onSubmitEditing={handleSignup}
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
										color={palette.iconMuted}
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
									<Ionicons name="alert-circle" size={18} color={palette.danger} />
									<Text
										style={styles.formErrorText}
										accessibilityLiveRegion="polite"
									>
										{formError}
									</Text>
								</View>
							)}

							{/* Submit */}
							<View style={styles.ctaContainer}>
								<RectButton
									enabled={canSubmit}
									onPress={handleSignup}
									style={[
										styles.cta,
										{
											backgroundColor: canSubmit
												? palette.primary
												: palette.panel2,
										},
									]}
								>
									{isLoading ? (
										<ActivityIndicator
											size="small"
											color={palette.textOnPrimary}
										/>
									) : (
										<Text
											style={[
												styles.ctaText,
												!canSubmit && { color: palette.textMuted },
											]}
										>
											Sign Up
										</Text>
									)}
								</RectButton>
							</View>

							{/* Divider */}
							<View style={styles.dividerContainer}>
								<View
									style={[styles.divider, { backgroundColor: palette.border }]}
								/>
								<Text style={[styles.dividerText, { color: palette.textMuted }]}>
									or continue with
								</Text>
								<View
									style={[styles.divider, { backgroundColor: palette.border }]}
								/>
							</View>

							{/* Socials */}
							<RectButton
								onPress={handleGoogleSignUp}
								enabled={!isLoading}
								style={[
									styles.socialButton,
									socialShadow,
									{ opacity: isLoading ? 0.6 : 1 },
								]}
							>
								<Ionicons name="logo-google" size={22} color={palette.text} />
								<Text style={styles.socialButtonText}>
									{isLoading ? 'Creating account…' : 'Google'}
								</Text>
							</RectButton>
						</View>

						{/* Login prompt */}
						<View style={styles.loginRow}>
							<Text style={[styles.loginText, { color: palette.textMuted }]}>
								Already have an account?
							</Text>
							<BorderlessButton
								onPress={() => router.replace('/(auth)/login')}
								rippleColor="rgba(255,255,255,0.08)"
							>
								<Text style={styles.loginLink}>Sign In</Text>
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
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.35,
		shadowRadius: 8,
	},
	android: { elevation: 1.5 },
});

const socialShadow = Platform.select({
	ios: {
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 10,
	},
	android: { elevation: 2 },
});

const cardShadow = Platform.select({
	ios: {
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 12 },
		shadowOpacity: 0.4,
		shadowRadius: 24,
	},
	android: { elevation: 4 },
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
	title: {
		fontSize: 17,
		fontWeight: '600',
		letterSpacing: -0.16,
		lineHeight: 23,
	},
	subtitle: { fontSize: 14, lineHeight: 20, marginTop: 6 },
	card: {
		width: '100%',
		backgroundColor: palette.panel2,
		borderRadius: radius.xl3,
		padding: 20,
		marginTop: 16,
		borderWidth: 1,
		borderColor: palette.border,
	},
	label: {
		fontSize: 13,
		fontWeight: '600',
		marginBottom: 8,
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
	errorText: {
		color: palette.danger,
		fontSize: 12,
		marginTop: 6,
	},
	formErrorContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: palette.dangerSoft,
		borderColor: palette.dangerBorder,
		borderWidth: 1,
		borderRadius: 8,
		padding: 12,
		marginTop: 12,
		gap: 8,
	},
	formErrorText: {
		flex: 1,
		color: palette.danger,
		fontSize: 13,
		fontWeight: '500',
	},
	passwordInputContainer: {
		position: 'relative',
		width: '100%',
		borderRadius: radius.xl2,
		backgroundColor: palette.input,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: palette.border,
	},
	passwordInput: {
		width: '100%',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: radius.xl2,
		color: palette.text,
		fontSize: 17,
	},
	passwordToggle: {
		position: 'absolute',
		right: 10,
		top: 0,
		bottom: 0,
		justifyContent: 'center',
		paddingHorizontal: 6,
	},
	ctaContainer: {
		width: '100%',
		marginTop: 12,
		overflow: 'hidden',
	},
	cta: {
		width: '100%',
		borderRadius: radius.xl2,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		overflow: 'hidden',
	},
	ctaText: {
		color: palette.textOnPrimary,
		fontSize: 15,
		fontWeight: '600',
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
		paddingVertical: 12,
		borderRadius: radius.xl2,
		backgroundColor: 'rgba(243, 241, 236, 0.04)',
		borderWidth: 1,
		borderColor: palette.border,
		marginBottom: 10,
	},
	socialButtonText: {
		fontSize: 14,
		fontWeight: '500',
		color: palette.text,
	},
	loginRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 6,
		marginTop: 14,
	},
	loginText: { fontSize: 14 },
	loginLink: {
		fontSize: 14,
		color: palette.primaryStrong,
		fontWeight: '800',
	},
});
