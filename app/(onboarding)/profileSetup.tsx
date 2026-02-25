import React, {
	useState,
	useRef,
	useCallback,
	useMemo,
	useEffect,
} from 'react';
import { logger } from '../../src/utils/logger';
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	Pressable,
	Image,
	SafeAreaView,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
	Keyboard,
	ActivityIndicator,
	Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useProfile } from '../../src/context/profileContext';
import { palette, radius, space } from '../../src/ui/theme';

type FieldErrors = {
	firstName?: string;
	lastName?: string;
	monthlyIncome?: string;
};

// Currency validation utility functions
const validateCurrencyInput = (value: string): boolean => {
	// Allow empty string
	if (!value) return true;

	// Disallow dangling dots or minus signs
	if (value === '.' || value === '-' || value === '-.') return false;

	// Check if it's a valid number
	const numValue = parseFloat(value);
	if (isNaN(numValue)) return false;

	// Check if it's non-negative
	if (numValue < 0) return false;

	// Check if it's within reasonable bounds (0 to 1 billion)
	if (numValue > 1000000000) return false;

	// Check decimal places (max 2)
	if (value.includes('.')) {
		const decimalPlaces = value.split('.')[1].length;
		if (decimalPlaces > 2) return false;
	}

	return true;
};

const formatCurrencyInput = (value: string): string => {
	// Normalize commas; keep digits and one dot
	const cleaned = value.replace(/,/g, '').replace(/[^\d.]/g, '');

	// Ensure only one decimal point
	const parts = cleaned.split('.');
	if (parts.length > 2) {
		return parts[0] + '.' + parts.slice(1).join('');
	}

	// Limit decimal places to 2
	if (parts.length === 2 && parts[1].length > 2) {
		return parts[0] + '.' + parts[1].slice(0, 2);
	}

	// Trim leading zeros like "00012" -> "12" but preserve "0.X"
	if (!cleaned.includes('.') && /^0+\d+$/.test(cleaned)) {
		return String(parseInt(cleaned, 10));
	}

	// Limit total length to prevent overflow
	if (cleaned.length > 12) {
		return cleaned.slice(0, 12);
	}

	return cleaned;
};

const OnboardingScreen = () => {
	const insets = useSafeAreaInsets();

	// Basic Info (MVP: name + monthly income)
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [monthlyIncome, setMonthlyIncome] = useState('');

	// Expenses & money (MVP: housing, loans, subscriptions, savings, debt)
	const [housingExpense, setHousingExpense] = useState('');
	const [loansExpense, setLoansExpense] = useState('');
	const [subscriptionsExpense, setSubscriptionsExpense] = useState('');
	const [savings, setSavings] = useState('');
	const [debt, setDebt] = useState('');

	// UI State
	const [touched, setTouched] = useState<{
		firstName: boolean;
		lastName: boolean;
		monthlyIncome: boolean;
	}>({
		firstName: false,
		lastName: false,
		monthlyIncome: false,
	});
	const [submitting, setSubmitting] = useState(false);

	const firstNameRef = useRef<TextInput>(null);
	const lastNameRef = useRef<TextInput>(null);
	const monthlyIncomeRef = useRef<TextInput>(null);
	const housingRef = useRef<TextInput>(null);
	const loansRef = useRef<TextInput>(null);
	const subscriptionsRef = useRef<TextInput>(null);
	const savingsRef = useRef<TextInput>(null);
	const debtRef = useRef<TextInput>(null);
	const [currentIndex, setCurrentIndex] = useState(0);

	// Refs for ScrollViews to manage scroll position per step
	const scrollViewRefs = useRef<{
		0: ScrollView | null;
		1: ScrollView | null;
		2: ScrollView | null;
	}>({
		0: null,
		1: null,
		2: null,
	});

	// Reset scroll position to top when step changes
	useEffect(() => {
		const scrollView =
			scrollViewRefs.current[
				currentIndex as keyof typeof scrollViewRefs.current
			];
		if (scrollView) {
			// Use setTimeout to ensure the ScrollView is rendered before scrolling
			setTimeout(() => {
				scrollView.scrollTo({ y: 0, animated: false });
			}, 0);
		}
	}, [currentIndex]);

	const { profile, updateProfile } = useProfile();

	// Hydrate form from existing profile on mount
	useEffect(() => {
		if (profile) {
			if (profile.firstName) setFirstName(profile.firstName);
			if (profile.lastName) setLastName(profile.lastName);
			if (profile.monthlyIncome)
				setMonthlyIncome(profile.monthlyIncome.toString());
			if (profile.expenses?.housing)
				setHousingExpense(profile.expenses.housing.toString());
			if (profile.expenses?.loans)
				setLoansExpense(profile.expenses.loans.toString());
			if (profile.expenses?.subscriptions)
				setSubscriptionsExpense(profile.expenses.subscriptions.toString());
			if (profile.savings) setSavings(profile.savings.toString());
			if (profile.debt) setDebt(profile.debt.toString());
		}
	}, [profile]);

	// Validation logic (matches backend requirements)
	const isValidName = (val: string) => val.trim().length >= 2; // Backend requires min 2 chars
	const isValidCurrency = (val: string) => {
		if (!val) return true;
		return validateCurrencyInput(val);
	};

	const errors: FieldErrors = {};
	if (touched.firstName && !isValidName(firstName)) {
		errors.firstName = 'First name must be at least 2 characters.';
	}
	if (touched.lastName && !isValidName(lastName)) {
		errors.lastName = 'Last name must be at least 2 characters.';
	}
	if (touched.monthlyIncome && monthlyIncome && !isValidCurrency(monthlyIncome)) {
		errors.monthlyIncome = 'Enter a valid amount.';
	}

	// MVP: Step 1 requires name + income (income can be 0). Step 2 is all optional.
	const stepValid = useMemo(() => {
		if (currentIndex === 0) return true; // welcome screen
		if (currentIndex === 1) {
			return (
				isValidName(firstName) &&
				isValidName(lastName) &&
				isValidCurrency(monthlyIncome)
			);
		}
		if (currentIndex === 2) return true; // all fields optional
		return false;
	}, [currentIndex, firstName, lastName, monthlyIncome]);

	// MVP: Only name + monthly income required
	const isFieldRequired = useCallback((fieldName: string) => {
		return fieldName === 'firstName' || fieldName === 'lastName' || fieldName === 'monthlyIncome';
	}, []);

	const shouldShowErrorAsterisk = useCallback(
		(fieldName: string) => {
			if (currentIndex !== 1) return false;
			if (fieldName === 'firstName' && touched.firstName && !isValidName(firstName))
				return true;
			if (fieldName === 'lastName' && touched.lastName && !isValidName(lastName))
				return true;
			if (fieldName === 'monthlyIncome' && touched.monthlyIncome && !isValidCurrency(monthlyIncome))
				return true;
			return false;
		},
		[currentIndex, touched, firstName, lastName, monthlyIncome]
	);

	// Currency input handlers
	const handleCurrencyInput = useCallback(
		(value: string, setter: (value: string) => void) => {
			const formatted = formatCurrencyInput(value);
			if (validateCurrencyInput(formatted)) {
				setter(formatted);
			}
		},
		[]
	);

	const onBlurField = useCallback((field: keyof typeof touched) => {
		setTouched((prev) => ({ ...prev, [field]: true }));
	}, []);

	const markTouchedForStep = useCallback(() => {
		if (currentIndex === 1) {
			setTouched((prev) => ({
				...prev,
				firstName: true,
				lastName: true,
				monthlyIncome: true,
			}));
		}
	}, [currentIndex]);

	const handleSubmit = useCallback(async () => {
		logger.debug('🚀 [ProfileSetup] handleSubmit called');

		if (submitting) {
			logger.debug('⚠️ [ProfileSetup] Already submitting, ignoring');
			return;
		}

		// Mark all fields as touched to reveal errors
		setTouched({
			firstName: true,
			lastName: true,
			monthlyIncome: true,
		});

		// Check if form is valid
		if (!stepValid) {
			logger.debug('❌ [ProfileSetup] Form is not valid, aborting submission');
			logger.debug('📋 [ProfileSetup] Current field values:', {
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				monthlyIncome,
				housingExpense,
				loansExpense,
				subscriptionsExpense,
				savings,
				debt,
			});
			await Haptics.selectionAsync();
			return;
		}

		logger.debug('✅ [ProfileSetup] Form is valid, proceeding with submission');
		setSubmitting(true);
		try {
			const trimmedFirstName = firstName.trim();
			const trimmedLastName = lastName.trim();

			// Pre-submission validation
			if (trimmedFirstName.length < 2) {
				Alert.alert(
					'Invalid First Name',
					'Please enter at least 2 characters for your first name.',
					[{ text: 'OK' }]
				);
				throw new Error('First name must be at least 2 characters long');
			}
			if (trimmedLastName.length < 2) {
				Alert.alert(
					'Invalid Last Name',
					'Please enter at least 2 characters for your last name.',
					[{ text: 'OK' }]
				);
				throw new Error('Last name must be at least 2 characters long');
			}

			const monthlyIncomeNumber = parseFloat(monthlyIncome || '0') || 0;
			const housingNum = parseFloat(housingExpense || '0') || 0;
			const loansNum = parseFloat(loansExpense || '0') || 0;
			const subsNum = parseFloat(subscriptionsExpense || '0') || 0;
			const savingsNum = parseFloat(savings || '0') || 0;
			const debtNum = parseFloat(debt || '0') || 0;

			logger.debug('📤 [ProfileSetup] Preparing profile data (MVP)', {
				firstName: trimmedFirstName,
				lastName: trimmedLastName,
				monthlyIncome: monthlyIncomeNumber,
				expenses: { housing: housingNum, loans: loansNum, subscriptions: subsNum },
				savings: savingsNum,
				debt: debtNum,
			});

			// MVP: Minimal profile aligned with settings/dashboard
			const profileData: any = {
				firstName: trimmedFirstName,
				lastName: trimmedLastName,
				monthlyIncome: monthlyIncomeNumber,
				financialGoal: 'Save money', // default for backend compat
				expenses: {
					housing: housingNum,
					loans: loansNum,
					subscriptions: subsNum,
				},
				savings: savingsNum,
				debt: debtNum,
			};

			// Update profile using profileContext
			logger.debug('📡 [ProfileSetup] Calling updateProfile...');
			await updateProfile(profileData as any);
			logger.debug('✅ [ProfileSetup] Profile updated successfully');
			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			router.push('/(onboarding)/notificationSetup');
		} catch (error) {
			logger.error('❌ [ProfileSetup] Error submitting profile:', error);

			// Extract error message
			let errorMessage = 'Unknown error occurred';
			if (error instanceof Error) {
				errorMessage = error.message;
				logger.error('❌ [ProfileSetup] Error message:', errorMessage);
				logger.error('❌ [ProfileSetup] Error stack:', error.stack);
			}

			logger.error('📋 [ProfileSetup] Failed data:', {
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				monthlyIncome,
			});

			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

			// Show user-friendly error
			if (
				errorMessage.includes('First name') ||
				errorMessage.includes('Last name')
			) {
				logger.error(
					'⚠️ [ProfileSetup] Validation error, staying on current screen'
				);
				// Don't navigate away on validation errors (Alert already shown above)
				return;
			}

			// Show generic error for other issues
			Alert.alert(
				'Error Saving Profile',
				`We encountered an issue: ${errorMessage}. You can continue setup and try again later in Settings.`,
				[{ text: 'OK' }]
			);

			// For other errors, try to continue to notification setup
			logger.debug(
				'⚠️ [ProfileSetup] Non-validation error, attempting to continue...'
			);
			try {
				router.push('/(onboarding)/notificationSetup');
			} catch (onboardingError) {
				logger.error(
					'❌ [ProfileSetup] Error navigating to notification setup:',
					onboardingError
				);
				// Fallback to dashboard if navigation fails
				router.replace('/(tabs)/dashboard');
			}
		} finally {
			logger.debug(
				'🏁 [ProfileSetup] Submission complete, resetting submitting flag'
			);
			setSubmitting(false);
		}
	}, [
		submitting,
		stepValid,
		firstName,
		lastName,
		monthlyIncome,
		housingExpense,
		loansExpense,
		subscriptionsExpense,
		savings,
		debt,
		updateProfile,
	]);

	const handleSkip = useCallback(async () => {
		try {
			router.push('/(onboarding)/notificationSetup');
		} catch (error) {
			logger.error('Error navigating to notification setup:', error);
			router.replace('/(tabs)/dashboard');
		}
	}, []);

	const renderCurrentStep = () => {
		switch (currentIndex) {
			case 0:
				return (
					<View style={styles.slide}>
						<ScrollView
							ref={(ref) => {
								scrollViewRefs.current[0] = ref;
							}}
							contentContainerStyle={[
								styles.scrollContent,
								{ paddingBottom: Math.max(100, insets.bottom + space.lg) },
							]}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
							keyboardDismissMode="interactive"
						>
							<View style={styles.welcomeCard}>
								<View style={styles.welcomeIllustration}>
									<Ionicons
										name="wallet-outline"
										size={80}
										color={palette.primary}
									/>
								</View>
								<Text style={styles.welcomeTitle}>
									Welcome to Brie
								</Text>
								<Text style={styles.welcomeSubtitle}>
									Track your cash
								</Text>
								<Text style={styles.welcomeDescription}>
									A few quick details to personalize your experience. You can
									change everything later in Profile.
								</Text>
							</View>
						</ScrollView>
					</View>
				);
			case 1:
				return (
					<View style={styles.slide}>
						<ScrollView
							ref={(ref) => {
								scrollViewRefs.current[1] = ref;
							}}
							contentContainerStyle={[
								styles.scrollContent,
								{ paddingBottom: Math.max(100, insets.bottom + space.lg) },
							]}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
							keyboardDismissMode="interactive"
						>
							<Text style={styles.title}>
								Let&apos;s get to know you
							</Text>
							<Text style={styles.subtitle}>
								Fields marked
								<Text style={styles.requiredMark}> *</Text> are required.
								You can change everything later in Profile.
							</Text>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>
									First name
									{isFieldRequired('firstName') && (
										<Text
											style={[
												styles.requiredMark,
												shouldShowErrorAsterisk('firstName') && {
													fontWeight: '700',
												},
											]}
										>
											{' '}
											*
										</Text>
									)}
								</Text>
								<TextInput
									ref={firstNameRef}
									value={firstName}
									onChangeText={setFirstName}
									onBlur={() => onBlurField('firstName')}
									onSubmitEditing={() => lastNameRef.current?.focus()}
									style={[styles.input, inputShadow]}
									placeholderTextColor={palette.textSubtle}
									placeholder="Enter your first name"
									accessibilityLabel="First name"
									returnKeyType="next"
									autoCapitalize="words"
									autoCorrect={false}
								/>
								{!!errors.firstName && (
									<Text
										style={styles.errorText}
										accessibilityLiveRegion="polite"
									>
										{errors.firstName}
									</Text>
								)}
							</View>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>
									Last name
									{isFieldRequired('lastName') && (
										<Text
											style={[
												styles.requiredMark,
												shouldShowErrorAsterisk('lastName') && {
													fontWeight: '700',
												},
											]}
										>
											{' '}
											*
										</Text>
									)}
								</Text>
								<TextInput
									ref={lastNameRef}
									value={lastName}
									onChangeText={setLastName}
									onBlur={() => onBlurField('lastName')}
									onSubmitEditing={() => monthlyIncomeRef.current?.focus()}
									style={[styles.input, inputShadow]}
									placeholderTextColor={palette.textSubtle}
									placeholder="Enter your last name"
									accessibilityLabel="Last name"
									returnKeyType="next"
									autoCapitalize="words"
									autoCorrect={false}
								/>
								{!!errors.lastName && (
									<Text
										style={styles.errorText}
										accessibilityLiveRegion="polite"
									>
										{errors.lastName}
									</Text>
								)}
							</View>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>
									Monthly income
									{isFieldRequired('monthlyIncome') && (
										<Text
											style={[
												styles.requiredMark,
												shouldShowErrorAsterisk('monthlyIncome') && {
													fontWeight: '700',
												},
											]}
										>
											{' '}
											*
										</Text>
									)}
								</Text>
								<Text style={styles.subtext}>
									Take-home per month. Enter 0 to skip.
								</Text>
								<View style={[styles.inputWithIcon, inputShadow]}>
									<View style={styles.inputIcon}>
										<Ionicons name="logo-usd" size={18} color={palette.textMuted} />
									</View>
									<TextInput
										ref={monthlyIncomeRef}
										value={monthlyIncome}
										onChangeText={(t) =>
											handleCurrencyInput(t, setMonthlyIncome)
										}
										onBlur={() => onBlurField('monthlyIncome')}
										keyboardType={
											Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'
										}
										inputMode="decimal"
										returnKeyType="done"
										style={styles.inputWithIconText}
										placeholderTextColor={palette.textSubtle}
										placeholder="0"
										accessibilityLabel="Monthly income"
									/>
								</View>
								{!!errors.monthlyIncome && (
									<Text
										style={styles.errorText}
										accessibilityLiveRegion="polite"
									>
										{errors.monthlyIncome}
									</Text>
								)}
							</View>
						</ScrollView>
					</View>
				);
			case 2:
				return (
					<View style={styles.slide}>
						<ScrollView
							ref={(ref) => {
								scrollViewRefs.current[2] = ref;
							}}
							contentContainerStyle={[
								styles.scrollContent,
								{ paddingBottom: Math.max(100, insets.bottom + space.lg) },
							]}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
							keyboardDismissMode="interactive"
						>
							<Text style={styles.title}>
								Money snapshot
							</Text>
							<Text style={styles.subtitle}>
								Optional. Helps personalize your experience. Enter 0 to skip any
								field—you can update these anytime in Profile.
							</Text>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>
									Monthly housing
								</Text>
								<View style={[styles.inputWithIcon, inputShadow]}>
									<View style={styles.inputIcon}>
										<Ionicons name="logo-usd" size={18} color={palette.textMuted} />
									</View>
									<TextInput
										ref={housingRef}
										value={housingExpense}
										onChangeText={(t) =>
											handleCurrencyInput(t, setHousingExpense)
										}
										onSubmitEditing={() => loansRef.current?.focus()}
										keyboardType={
											Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'
										}
										inputMode="decimal"
										returnKeyType="next"
										style={styles.inputWithIconText}
										placeholderTextColor={palette.textSubtle}
										placeholder="0"
										accessibilityLabel="Monthly housing expense"
									/>
								</View>
							</View>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>
									Monthly loans
								</Text>
								<View style={[styles.inputWithIcon, inputShadow]}>
									<View style={styles.inputIcon}>
										<Ionicons name="logo-usd" size={18} color={palette.textMuted} />
									</View>
									<TextInput
										ref={loansRef}
										value={loansExpense}
										onChangeText={(t) =>
											handleCurrencyInput(t, setLoansExpense)
										}
										onSubmitEditing={() => subscriptionsRef.current?.focus()}
										keyboardType={
											Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'
										}
										inputMode="decimal"
										returnKeyType="next"
										style={styles.inputWithIconText}
										placeholderTextColor={palette.textSubtle}
										placeholder="0"
										accessibilityLabel="Monthly loans"
									/>
								</View>
							</View>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>
									Monthly subscriptions
								</Text>
								<View style={[styles.inputWithIcon, inputShadow]}>
									<View style={styles.inputIcon}>
										<Ionicons name="logo-usd" size={18} color={palette.textMuted} />
									</View>
									<TextInput
										ref={subscriptionsRef}
										value={subscriptionsExpense}
										onChangeText={(t) =>
											handleCurrencyInput(t, setSubscriptionsExpense)
										}
										onSubmitEditing={() => savingsRef.current?.focus()}
										keyboardType={
											Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'
										}
										inputMode="decimal"
										returnKeyType="next"
										style={styles.inputWithIconText}
										placeholderTextColor={palette.textSubtle}
										placeholder="0"
										accessibilityLabel="Monthly subscriptions"
									/>
								</View>
							</View>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>
									Savings
								</Text>
								<View style={[styles.inputWithIcon, inputShadow]}>
									<View style={styles.inputIcon}>
										<Ionicons name="logo-usd" size={18} color={palette.textMuted} />
									</View>
									<TextInput
										ref={savingsRef}
										value={savings}
										onChangeText={(t) =>
											handleCurrencyInput(t, setSavings)
										}
										onSubmitEditing={() => debtRef.current?.focus()}
										keyboardType={
											Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'
										}
										inputMode="decimal"
										returnKeyType="next"
										style={styles.inputWithIconText}
										placeholderTextColor={palette.textSubtle}
										placeholder="0"
										accessibilityLabel="Savings"
									/>
								</View>
							</View>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>
									Debt
								</Text>
								<View style={[styles.inputWithIcon, inputShadow]}>
									<View style={styles.inputIcon}>
										<Ionicons name="logo-usd" size={18} color={palette.textMuted} />
									</View>
									<TextInput
										ref={debtRef}
										value={debt}
										onChangeText={(t) =>
											handleCurrencyInput(t, setDebt)
										}
										onSubmitEditing={() => Keyboard.dismiss()}
										keyboardType={
											Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'
										}
										inputMode="decimal"
										returnKeyType="done"
										style={styles.inputWithIconText}
										placeholderTextColor={palette.textSubtle}
										placeholder="0"
										accessibilityLabel="Debt"
									/>
								</View>
							</View>
						</ScrollView>
					</View>
				);
			default:
				return null;
		}
	};

	const handleNext = useCallback(async () => {
		Keyboard.dismiss();

		if (!stepValid) {
			markTouchedForStep();
			await Haptics.selectionAsync();
			return;
		}

		if (currentIndex < 2) {
			const nextIndex = currentIndex + 1;
			setCurrentIndex(nextIndex);
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		} else {
			await handleSubmit();
		}
	}, [currentIndex, stepValid, handleSubmit, markTouchedForStep]);

	const handleBack = useCallback(() => {
		if (currentIndex > 0) {
			const prevIndex = currentIndex - 1;
			setCurrentIndex(prevIndex);
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		}
	}, [currentIndex]);

	return (
		<SafeAreaView style={styles.container}>
			<KeyboardAvoidingView
				style={styles.keyboardAvoidingView}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 20}
			>
				<View style={styles.header}>
					<View style={styles.logoContainer}>
						<Image
							style={styles.logoImage}
							source={require('../../src/assets/logos/brie-logo.png')}
						/>
					</View>
					<Pressable
						style={styles.skipButton}
						onPress={handleSkip}
						accessibilityLabel="Skip setup"
						accessibilityHint="You can finish setup later in Profile"
					>
						<Text style={styles.skipButtonText}>Skip</Text>
					</Pressable>
				</View>
				<View style={styles.contentContainer}>{renderCurrentStep()}</View>
				<View style={styles.paginationContainer}>
					{[0, 1, 2].map((index) => (
						<View
							key={index}
							style={[
								styles.paginationDot,
								(index === currentIndex ||
									(currentIndex > 0 && index === currentIndex - 1) ||
									index === currentIndex - 2) &&
									styles.paginationDotActive,
							]}
						/>
					))}
				</View>
				<View style={styles.navigationButtons}>
					{currentIndex > 0 ? (
						<Pressable
							onPress={handleBack}
							style={[styles.navButton, cardShadow]}
							accessibilityLabel="Go back"
							accessibilityRole="button"
						>
							<Text style={styles.navButtonBackText}>← Back</Text>
						</Pressable>
					) : (
						<View style={styles.navButton} />
					)}
					<Pressable
						onPress={handleNext}
						style={[
							styles.navButton,
							styles.nextButton,
							cardShadow,
							{ opacity: stepValid && !submitting ? 1 : 0.6 },
						]}
						disabled={!stepValid || submitting}
						accessibilityLabel={currentIndex < 2 ? 'Continue' : 'Complete setup'}
						accessibilityRole="button"
					>
						{submitting && currentIndex === 2 ? (
							<ActivityIndicator size="small" color={palette.primary} />
						) : (
							<Text style={styles.navButtonText} numberOfLines={1}>
								{currentIndex < 2 ? 'Continue' : 'Complete Setup'}
							</Text>
						)}
					</Pressable>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

/* ---------- Shadow Constants ---------- */
const inputShadow = Platform.select({
	ios: {
		shadowColor: palette.text,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.06,
		shadowRadius: 6,
	},
	android: { elevation: 1.5 },
});

const cardShadow = Platform.select({
	ios: {
		shadowColor: palette.text,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.06,
		shadowRadius: 8,
	},
	android: { elevation: 2 },
});

const styles = StyleSheet.create({
	container: {
		width: '100%',
		height: '100%',
		backgroundColor: palette.bg,
	},
	keyboardAvoidingView: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		alignItems: 'center',
		paddingHorizontal: space.xl,
		position: 'relative',
		paddingVertical: space.sm,
	},
	logoContainer: {
		position: 'absolute',
		left: 0,
		right: 0,
		alignItems: 'center',
		zIndex: 1,
	},
	logoImage: {
		width: 100,
		height: 40,
		resizeMode: 'contain',
	},
	skipButton: {
		padding: space.sm,
		zIndex: 2,
	},
	skipButtonText: {
		color: palette.textMuted,
		fontSize: 16,
		fontWeight: '600',
	},
	contentContainer: {
		flex: 1,
	},
	slide: {
		flex: 1,
	},
	scrollContent: {
		padding: space.xl,
		paddingBottom: 100,
		flexGrow: 1,
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		textAlign: 'center',
		marginBottom: space.md,
		color: palette.text,
	},
	inputContainer: {
		marginBottom: space.lg,
	},
	label: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: space.sm,
		color: palette.textMuted,
	},
	subtext: {
		fontSize: 14,
		color: palette.textMuted,
		marginBottom: space.sm,
	},
	input: {
		backgroundColor: palette.surface,
		borderRadius: radius.md,
		paddingHorizontal: space.md,
		paddingVertical: space.md,
		fontSize: 16,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: palette.border,
		marginBottom: space.sm,
	},
	inputWithIcon: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: palette.surface,
		borderRadius: radius.md,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: palette.border,
		marginBottom: space.sm,
	},
	errorText: {
		color: palette.danger,
		fontSize: 12,
		marginTop: space.sm,
	},
	requiredMark: {
		color: palette.danger,
		fontWeight: '600',
	},
	inputWithIconText: {
		flex: 1,
		padding: space.md,
		paddingHorizontal: space.md,
		fontSize: 16,
	},
	inputIcon: {
		paddingLeft: space.md,
	},
	paginationContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: space.md,
	},
	paginationDot: {
		width: '30%',
		height: 7,
		borderRadius: 4,
		backgroundColor: palette.border,
		marginHorizontal: 2,
	},
	paginationDotActive: {
		backgroundColor: palette.primary,
		height: 7,
		borderRadius: 8,
	},
	navigationButtons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: space.xl,
	},
	navButton: {
		padding: space.md,
		paddingHorizontal: space.lg,
		borderRadius: radius.xl,
		backgroundColor: palette.surface,
		minWidth: 120,
		alignItems: 'center',
		justifyContent: 'center',
	},
	nextButton: {
		backgroundColor: palette.surface,
	},
	navButtonBackText: {
		color: palette.textMuted,
		fontWeight: '600',
		fontSize: 18,
	},
	navButtonText: {
		color: palette.primary,
		fontWeight: '700',
		fontSize: 18,
		textAlign: 'center',
	},
	subtitle: {
		fontSize: 16,
		color: palette.textMuted,
		textAlign: 'center',
		marginBottom: space.xl,
	},
	frequencyText: {
		fontSize: 16,
		color: '#374151',
	},
	welcomeCard: {
		alignItems: 'center',
		paddingVertical: space.xxl,
	},
	welcomeIllustration: {
		width: 120,
		height: 120,
		borderRadius: 60,
		backgroundColor: palette.primarySubtle,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: space.xl,
	},
	welcomeTitle: {
		fontSize: 32,
		fontWeight: 'bold',
		color: palette.text,
		marginBottom: space.md,
		textAlign: 'center',
	},
	welcomeSubtitle: {
		fontSize: 18,
		color: palette.primary,
		fontWeight: '600',
		marginBottom: space.lg,
		textAlign: 'center',
	},
	welcomeDescription: {
		fontSize: 16,
		color: palette.textMuted,
		textAlign: 'center',
		lineHeight: 24,
	},
});

export default OnboardingScreen;
