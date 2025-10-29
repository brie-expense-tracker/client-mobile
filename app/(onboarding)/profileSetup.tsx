import React, { useState, useRef, useCallback, useMemo } from 'react';
import { logger } from '../../src/utils/logger';
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	Pressable,
	Image,
	SafeAreaView,
	FlatList,
	Dimensions,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
	Keyboard,
	ActivityIndicator,
	Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useProfile } from '../../src/context/profileContext';

type FieldErrors = {
	firstName?: string;
	lastName?: string;
	monthlyIncome?: string;
	netPerPaycheck?: string;
	payCadence?: string;
	financialGoal?: string;
	housingExpense?: string;
	budgetCycleStart?: string;
};

const { width } = Dimensions.get('window');

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
	// Basic Info
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [monthlyIncome, setMonthlyIncome] = useState(''); // optional manual override
	const [payCadence, setPayCadence] = useState<
		'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | ''
	>('');
	const [netPerPaycheck, setNetPerPaycheck] = useState('');

	// Goals and Expenses
	const [financialGoal, setFinancialGoal] = useState('');
	const [housingExpense, setHousingExpense] = useState('');
	const [budgetCycleStart, setBudgetCycleStart] = useState<number | null>(1); // 1,5,10,15,25 or 31
	const [emergencyFundMonths, setEmergencyFundMonths] = useState<number | null>(
		3
	);

	// UI State
	const [touched, setTouched] = useState<{
		firstName: boolean;
		lastName: boolean;
		monthlyIncome: boolean;
		netPerPaycheck: boolean;
		payCadence: boolean;
		financialGoal: boolean;
		housingExpense: boolean;
		budgetCycleStart: boolean;
	}>({
		firstName: false,
		lastName: false,
		monthlyIncome: false,
		netPerPaycheck: false,
		payCadence: false,
		financialGoal: false,
		housingExpense: false,
		budgetCycleStart: false,
	});
	const [submitting, setSubmitting] = useState(false);

	const flatListRef = useRef<FlatList>(null);
	const firstNameRef = useRef<TextInput>(null);
	const lastNameRef = useRef<TextInput>(null);
	const incomeRef = useRef<TextInput>(null);
	const [currentIndex, setCurrentIndex] = useState(0);

	const { updateProfile } = useProfile();

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

	// Validation logic (matches backend requirements)
	const isValidName = (val: string) => val.trim().length >= 2; // Backend requires min 2 chars
	const isValidCurrency = (val: string) => {
		// Allow empty (optional)
		if (!val) return true;
		return validateCurrencyInput(val);
	};
	const isValidGoal = (val: string) => val.length > 0;
	const isValidCadence = (val: string) =>
		['weekly', 'biweekly', 'semimonthly', 'monthly'].includes(val);
	const isValidCycleStart = (val: number | null) =>
		val !== null && [1, 5, 10, 15, 25, 31].includes(val);

	// Derived monthly income (from pay cadence + net per paycheck)
	const derivedMonthlyIncome = useMemo(() => {
		const npp = parseFloat(netPerPaycheck || '0');
		if (!npp || !payCadence) return 0;
		// Reasonable monthly conversion (avoids 52/12 ≈ 4.333 edge illusions)
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

	const errors: FieldErrors = {};
	if (touched.firstName && !isValidName(firstName)) {
		errors.firstName = 'First name must be at least 2 characters.';
	}
	if (touched.lastName && !isValidName(lastName)) {
		errors.lastName = 'Last name must be at least 2 characters.';
	}
	if (touched.monthlyIncome && !isValidCurrency(monthlyIncome)) {
		errors.monthlyIncome = 'Please enter a valid amount (e.g., 2450.50).';
	}
	if (touched.payCadence && !isValidCadence(payCadence)) {
		errors.payCadence = 'Select your pay schedule.';
	}
	if (touched.netPerPaycheck && !isValidCurrency(netPerPaycheck)) {
		errors.netPerPaycheck = 'Enter your net amount per paycheck.';
	}
	if (touched.financialGoal && !isValidGoal(financialGoal)) {
		errors.financialGoal = 'Please select a financial goal.';
	}
	if (touched.housingExpense && !isValidCurrency(housingExpense)) {
		errors.housingExpense = 'Please enter a valid amount.';
	}
	if (touched.budgetCycleStart && !isValidCycleStart(budgetCycleStart)) {
		errors.budgetCycleStart = 'Choose your budget cycle day.';
	}

	const stepValid = useMemo(() => {
		if (currentIndex === 0) return true; // welcome screen
		if (currentIndex === 1) {
			return (
				isValidName(firstName) &&
				isValidName(lastName) &&
				// either a valid manual monthly income OR a valid cadence + net per paycheck
				(isValidCurrency(monthlyIncome) ||
					(isValidCadence(payCadence) && isValidCurrency(netPerPaycheck)))
			);
		}
		if (currentIndex === 2) {
			return (
				isValidGoal(financialGoal) &&
				isValidCurrency(housingExpense) &&
				isValidCycleStart(budgetCycleStart)
			);
		}
		return false;
	}, [
		currentIndex,
		firstName,
		lastName,
		monthlyIncome,
		payCadence,
		netPerPaycheck,
		financialGoal,
		housingExpense,
		budgetCycleStart,
	]);

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
				payCadence: true,
				netPerPaycheck: true,
			}));
		} else if (currentIndex === 2) {
			setTouched((prev) => ({
				...prev,
				financialGoal: true,
				housingExpense: true,
				budgetCycleStart: true,
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
			netPerPaycheck: true,
			payCadence: true,
			financialGoal: true,
			housingExpense: true,
			budgetCycleStart: true,
		});

		// Check if form is valid
		if (!stepValid) {
			logger.debug('❌ [ProfileSetup] Form is not valid, aborting submission');
			logger.debug('📋 [ProfileSetup] Current field values:', {
				firstName: firstName.trim(),
				firstNameLength: firstName.trim().length,
				lastName: lastName.trim(),
				lastNameLength: lastName.trim().length,
				monthlyIncome,
				payCadence,
				netPerPaycheck,
				financialGoal,
				housingExpense,
				budgetCycleStart,
			});
			await Haptics.selectionAsync();
			return;
		}

		logger.debug('✅ [ProfileSetup] Form is valid, proceeding with submission');
		setSubmitting(true);
		try {
			const monthlyIncomeNumber =
				monthlyIncome && parseFloat(monthlyIncome) > 0
					? parseFloat(monthlyIncome)
					: derivedMonthlyIncome;

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

			logger.debug('📤 [ProfileSetup] Preparing profile data with:', {
				firstName: trimmedFirstName,
				firstNameLength: trimmedFirstName.length,
				lastName: trimmedLastName,
				lastNameLength: trimmedLastName.length,
				monthlyIncomeNumber,
				payCadence,
				netPerPaycheck: netPerPaycheck ? parseFloat(netPerPaycheck) : 0,
				derivedMonthlyIncome,
				financialGoal,
				housingExpense: housingExpense ? parseFloat(housingExpense) : 0,
				budgetCycleStart,
			});

			const profileData = {
				firstName: trimmedFirstName,
				lastName: trimmedLastName,
				monthlyIncome: isNaN(monthlyIncomeNumber) ? 0 : monthlyIncomeNumber,
				pay: {
					cadence: payCadence || null,
					netPerPaycheck: netPerPaycheck ? parseFloat(netPerPaycheck) : 0,
					derivedMonthlyIncome,
					varies: false,
				},
				emergencyFundMonths: emergencyFundMonths || 3,
				financialGoal,
				expenses: {
					housing: housingExpense ? parseFloat(housingExpense) : 0,
					loans: 0,
					subscriptions: 0,
				},
				savings: 0,
				debt: 0,
				riskProfile: {
					tolerance: '3',
					experience: '3',
				},
				preferences: {
					adviceFrequency: 'Weekly summary',
					autoSave: {
						enabled: false,
						amount: 0,
					},
					notifications: {
						enableNotifications: true,
						weeklySummary: true,
						overspendingAlert: true,
						aiSuggestion: true,
						budgetMilestones: true,
						monthlyFinancialCheck: true,
						monthlySavingsTransfer: false,
					},
					aiInsights: {
						enabled: true,
						frequency: 'weekly' as const,
						pushNotifications: true,
						emailAlerts: false,
						insightTypes: {
							budgetingTips: true,
							expenseReduction: true,
							incomeSuggestions: true,
						},
					},
					budgetSettings: {
						cycleType: 'monthly' as const,
						cycleStart: budgetCycleStart ?? 1,
						alertPct: 80,
						carryOver: false,
						autoSync: true,
					},
					goalSettings: {
						defaults: {
							target:
								financialGoal === 'Build an emergency fund' &&
								emergencyFundMonths
									? (housingExpense ? parseFloat(housingExpense) : 0) *
									  emergencyFundMonths
									: 1000,
							dueDays: 90,
							sortBy: 'percent',
							currency: 'USD',
							emergencyFundMonths: emergencyFundMonths || 3,
						},
						ai: {
							enabled: true,
							tone: 'friendly',
							frequency: 'medium',
							whatIf: true,
						},
						notifications: {
							milestoneAlerts: true,
							weeklySummary: false,
							offTrackAlert: true,
						},
						display: {
							showCompleted: true,
							autoArchive: true,
							rounding: '1',
						},
						security: {
							lockEdit: false,
							undoWindow: 24,
						},
					},
				},
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

			// Log the data that failed to submit
			logger.error(
				'📋 [ProfileSetup] Failed data:',
				JSON.stringify(
					{
						firstName: firstName.trim(),
						firstNameLength: firstName.trim().length,
						lastName: lastName.trim(),
						lastNameLength: lastName.trim().length,
						monthlyIncome,
						payCadence,
						netPerPaycheck,
					},
					null,
					2
				)
			);

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
		payCadence,
		netPerPaycheck,
		derivedMonthlyIncome,
		financialGoal,
		housingExpense,
		budgetCycleStart,
		emergencyFundMonths,
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

	const renderItem = ({ item, index }: { item: any; index: number }) => {
		switch (index) {
			case 0:
				return (
					<View style={styles.slide}>
						<ScrollView
							contentContainerStyle={styles.scrollContent}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
							keyboardDismissMode="interactive"
						>
							<View style={styles.welcomeCard}>
								<View style={styles.welcomeIllustration}>
									<Ionicons
										name="wallet-outline"
										size={80}
										color={palette.brand}
									/>
								</View>
								<Text style={[styles.welcomeTitle, { color: palette.text }]}>
									Welcome to Brie
								</Text>
								<Text
									style={[styles.welcomeSubtitle, { color: palette.brand }]}
								>
									Setup that respects your time
								</Text>
								<Text
									style={[
										styles.welcomeDescription,
										{ color: palette.subtext },
									]}
								>
									We&apos;ll personalize budgets and goals with just a few
									details. You can change everything later in Settings.
								</Text>
							</View>
						</ScrollView>
					</View>
				);
			case 1:
				return (
					<View style={styles.slide}>
						<ScrollView
							contentContainerStyle={styles.scrollContent}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
							keyboardDismissMode="interactive"
						>
							<Text style={[styles.title, { color: palette.text }]}>
								Let&apos;s get to know you
							</Text>
							<View style={styles.inputContainer}>
								<Text style={[styles.label, { color: palette.subtext }]}>
									First name
								</Text>
								<Text style={[styles.subtext, { color: palette.subtext }]}>
									We&apos;ll use this to personalize your experience
								</Text>
								<TextInput
									ref={firstNameRef}
									value={firstName}
									onChangeText={setFirstName}
									onBlur={() => onBlurField('firstName')}
									onSubmitEditing={() => lastNameRef.current?.focus()}
									style={[styles.input, inputShadow]}
									placeholderTextColor="#94A3B8"
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
								<Text style={[styles.label, { color: palette.subtext }]}>
									Last name
								</Text>
								<Text style={[styles.subtext, { color: palette.subtext }]}>
									Helps with account security and support
								</Text>
								<TextInput
									ref={lastNameRef}
									value={lastName}
									onChangeText={setLastName}
									onBlur={() => onBlurField('lastName')}
									onSubmitEditing={() => incomeRef.current?.focus()}
									style={[styles.input, inputShadow]}
									placeholderTextColor="#94A3B8"
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
								<Text style={[styles.label, { color: palette.subtext }]}>
									How do you get paid?
								</Text>
								<Text style={[styles.subtext, { color: palette.subtext }]}>
									Choose your pay schedule and net amount per paycheck.
									We&apos;ll compute the monthly estimate.
								</Text>
								<View style={styles.chipRow} accessibilityRole="tablist">
									{[
										{ k: 'weekly', label: 'Weekly' },
										{ k: 'biweekly', label: 'Every 2 wks' },
										{ k: 'semimonthly', label: 'Twice / mo' },
										{ k: 'monthly', label: 'Monthly' },
									].map((opt) => (
										<Pressable
											key={opt.k}
											onPress={() => {
												setPayCadence(opt.k as any);
												onBlurField('payCadence');
											}}
											style={[
												styles.chip,
												payCadence === opt.k && styles.chipSelected,
												cardShadow,
											]}
											accessibilityRole="tab"
											accessibilityState={{ selected: payCadence === opt.k }}
											accessibilityLabel={opt.label}
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
								{!!errors.payCadence && (
									<Text
										style={styles.errorText}
										accessibilityLiveRegion="polite"
									>
										{errors.payCadence}
									</Text>
								)}
							</View>
							<View style={styles.inputContainer}>
								<Text style={[styles.label, { color: palette.subtext }]}>
									Net per paycheck
								</Text>
								<View style={[styles.inputWithIcon, inputShadow]}>
									<View style={styles.inputIcon}>
										<Ionicons name="logo-usd" size={18} color="#6b7280" />
									</View>
									<TextInput
										value={netPerPaycheck}
										onChangeText={(t) =>
											handleCurrencyInput(t, setNetPerPaycheck)
										}
										onBlur={() => onBlurField('netPerPaycheck')}
										keyboardType={
											Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'
										}
										inputMode="decimal"
										returnKeyType="done"
										style={styles.inputWithIconText}
										placeholderTextColor="#94A3B8"
										placeholder="0.00"
										accessibilityLabel="Net per paycheck"
									/>
								</View>
								{!!errors.netPerPaycheck && (
									<Text
										style={styles.errorText}
										accessibilityLiveRegion="polite"
									>
										{errors.netPerPaycheck}
									</Text>
								)}
								{payCadence && derivedMonthlyIncome > 0 ? (
									<Text style={styles.helperPositive}>
										Estimated monthly: $
										{derivedMonthlyIncome.toLocaleString(undefined, {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}
									</Text>
								) : null}
							</View>
							<View style={[styles.inputContainer, { marginTop: 8 }]}>
								<Text style={[styles.label, { color: palette.subtext }]}>
									Or enter total monthly income
								</Text>
								{monthlyIncome &&
									parseFloat(monthlyIncome) > 0 &&
									derivedMonthlyIncome > 0 && (
										<Text style={[styles.helperPositive, { marginBottom: 4 }]}>
											ℹ️ Using monthly income (pay schedule will be ignored)
										</Text>
									)}
								<View style={[styles.inputWithIcon, inputShadow]}>
									<View style={styles.inputIcon}>
										<Ionicons name="logo-usd" size={18} color="#6b7280" />
									</View>
									<TextInput
										value={monthlyIncome}
										onChangeText={(text) =>
											handleCurrencyInput(text, setMonthlyIncome)
										}
										onBlur={() => onBlurField('monthlyIncome')}
										onSubmitEditing={() => {
											if (stepValid) {
												handleNext();
											}
										}}
										keyboardType={
											Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'
										}
										inputMode="decimal"
										returnKeyType="done"
										style={styles.inputWithIconText}
										placeholderTextColor="#94A3B8"
										placeholder="0.00"
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
							contentContainerStyle={styles.scrollContent}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
							keyboardDismissMode="interactive"
						>
							<Text style={[styles.title, { color: palette.text }]}>
								Your primary goal
							</Text>
							<View style={styles.inputContainer}>
								<Text style={[styles.label, { color: palette.subtext }]}>
									Choose one
								</Text>
								<Text style={[styles.subtext, { color: palette.subtext }]}>
									You can add more later
								</Text>
								<View
									style={styles.goalContainer}
									accessibilityRole="radiogroup"
									accessibilityLabel="Primary financial goal"
								>
									{[
										'Build an emergency fund',
										'Pay down high-interest debt',
										'Save for a down payment',
										'Invest for retirement',
										'Other',
									].map((goal) => (
										<Pressable
											key={goal}
											onPress={() => {
												setFinancialGoal(goal);
												onBlurField('financialGoal');
											}}
											style={[
												styles.goalButton,
												financialGoal === goal && styles.selectedGoal,
												cardShadow,
											]}
											accessibilityRole="radio"
											accessibilityState={{ selected: financialGoal === goal }}
											accessibilityLabel={goal}
										>
											<Text
												style={[
													styles.goalText,
													financialGoal === goal && styles.selectedGoalText,
												]}
											>
												{goal}
											</Text>
										</Pressable>
									))}
								</View>
								{!!errors.financialGoal && (
									<Text
										style={styles.errorText}
										accessibilityLiveRegion="polite"
									>
										{errors.financialGoal}
									</Text>
								)}
								{financialGoal === 'Build an emergency fund' ? (
									<View style={{ marginTop: 12 }}>
										<Text style={[styles.label, { color: palette.subtext }]}>
											Target months of expenses (common: 3–6)
										</Text>
										<View style={styles.chipRow}>
											{[1, 3, 6].map((m) => (
												<Pressable
													key={m}
													onPress={() => {
														setEmergencyFundMonths(m);
													}}
													style={[
														styles.chip,
														emergencyFundMonths === m && styles.chipSelected,
														cardShadow,
													]}
													accessibilityLabel={`${m} months`}
													accessibilityRole="radio"
													accessibilityState={{
														selected: emergencyFundMonths === m,
													}}
												>
													<Text
														style={[
															styles.chipText,
															emergencyFundMonths === m &&
																styles.chipTextSelected,
														]}
													>
														{m} mo
													</Text>
												</Pressable>
											))}
										</View>
									</View>
								) : null}
							</View>
							<View style={styles.inputContainer}>
								<Text style={[styles.label, { color: palette.subtext }]}>
									Monthly housing expense
								</Text>
								<Text style={[styles.subtext, { color: palette.subtext }]}>
									Track your biggest fixed cost
								</Text>
								<View style={[styles.inputWithIcon, inputShadow]}>
									<View style={styles.inputIcon}>
										<Ionicons name="home-outline" size={18} color="#6b7280" />
									</View>
									<TextInput
										value={housingExpense}
										onChangeText={(text) =>
											handleCurrencyInput(text, setHousingExpense)
										}
										onBlur={() => onBlurField('housingExpense')}
										keyboardType={
											Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'
										}
										inputMode="decimal"
										style={styles.inputWithIconText}
										placeholderTextColor="#94A3B8"
										placeholder="0.00"
										accessibilityLabel="Monthly housing expense"
									/>
								</View>
								{!!errors.housingExpense && (
									<Text
										style={styles.errorText}
										accessibilityLiveRegion="polite"
									>
										{errors.housingExpense}
									</Text>
								)}
							</View>
							<View style={styles.inputContainer}>
								<Text style={[styles.label, { color: palette.subtext }]}>
									When should your monthly budget cycle reset?
								</Text>
								<Text style={[styles.subtext, { color: palette.subtext }]}>
									Pick the day most bills are due or your paycheck lands.
								</Text>
								<View style={styles.chipRow} accessibilityRole="radiogroup">
									{[1, 5, 10, 15, 25, 31].map((d) => (
										<Pressable
											key={d}
											onPress={() => {
												setBudgetCycleStart(d);
												setTouched((p) => ({ ...p, budgetCycleStart: true }));
											}}
											style={[
												styles.chip,
												budgetCycleStart === d && styles.chipSelected,
												cardShadow,
											]}
											accessibilityRole="radio"
											accessibilityState={{ selected: budgetCycleStart === d }}
											accessibilityLabel={`Day ${d}`}
										>
											<Text
												style={[
													styles.chipText,
													budgetCycleStart === d && styles.chipTextSelected,
												]}
											>
												{d === 31 ? 'Last day' : `Day ${d}`}
											</Text>
										</Pressable>
									))}
								</View>
								{!!errors.budgetCycleStart && (
									<Text
										style={styles.errorText}
										accessibilityLiveRegion="polite"
									>
										{errors.budgetCycleStart}
									</Text>
								)}
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
			flatListRef.current?.scrollToIndex({
				index: currentIndex + 1,
				animated: true,
			});
			setCurrentIndex(currentIndex + 1);
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		} else {
			await handleSubmit();
		}
	}, [currentIndex, stepValid, handleSubmit, markTouchedForStep]);

	const handleBack = useCallback(() => {
		if (currentIndex > 0) {
			flatListRef.current?.scrollToIndex({
				index: currentIndex - 1,
				animated: true,
			});
			setCurrentIndex(currentIndex - 1);
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
						accessibilityHint="You can finish setup later in Settings"
					>
						<Text style={styles.skipButtonText}>Skip</Text>
					</Pressable>
				</View>
				<FlatList
					ref={flatListRef}
					data={[1, 2, 3]}
					renderItem={renderItem}
					horizontal
					pagingEnabled
					showsHorizontalScrollIndicator={false}
					onMomentumScrollEnd={(e) => {
						const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
						setCurrentIndex(newIndex);
					}}
					style={styles.flatList}
					keyboardShouldPersistTaps="handled"
				/>
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
					>
						{submitting && currentIndex === 2 ? (
							<ActivityIndicator size="small" color="#0A84FF" />
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
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.06,
		shadowRadius: 6,
	},
	android: { elevation: 1.5 },
});

const cardShadow = Platform.select({
	ios: {
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.08,
		shadowRadius: 16,
	},
	android: { elevation: 3 },
});

const styles = StyleSheet.create({
	container: {
		width: '100%',
		height: '100%',
		backgroundColor: 'white',
	},
	keyboardAvoidingView: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		alignItems: 'center',
		paddingHorizontal: 24,
		position: 'relative',
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
		padding: 8,
		zIndex: 2,
	},
	skipButtonText: {
		color: '#6b7280',
		fontSize: 16,
		fontWeight: '600',
	},
	flatList: {
		flex: 1,
	},
	slide: {
		width,
		flex: 1,
	},
	scrollContent: {
		padding: 24,
		paddingBottom: 100, // Extra padding for keyboard
		flexGrow: 1,
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		textAlign: 'center',
		marginBottom: 12,
		color: '#1f2937',
	},
	inputContainer: {
		marginBottom: 8,
	},
	label: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 8,
		color: '#374151',
	},
	subtext: {
		fontSize: 14,
		color: '#6b7280',
		marginBottom: 8,
		fontStyle: 'italic',
	},
	inputLabel: {
		fontSize: 14,
		fontWeight: '500',
		marginBottom: 6,
		color: '#374151',
	},
	input: {
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 14,
		fontSize: 16,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#E2E8F0',
		marginBottom: 6,
	},
	inputWithIcon: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#E2E8F0',
		marginBottom: 6,
	},
	errorText: {
		color: '#DC2626',
		fontSize: 12,
		marginTop: 6,
	},
	inputWithIconText: {
		flex: 1,
		padding: 16,
		paddingHorizontal: 12,
		fontSize: 16,
	},
	inputIcon: {
		paddingLeft: 16,
	},
	chipRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginTop: 6,
		marginBottom: 6,
	},
	chip: {
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 999,
		backgroundColor: '#FFFFFF',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#E2E8F0',
	},
	chipSelected: {
		backgroundColor: '#f0f9ff',
		borderColor: '#0A84FF',
	},
	chipText: {
		fontSize: 14,
		color: '#374151',
		fontWeight: '600',
	},
	chipTextSelected: {
		color: '#0A84FF',
	},
	helperPositive: {
		marginTop: 6,
		fontSize: 13,
		color: '#065f46',
		fontWeight: '600',
	},
	ageRangeContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 12,
	},
	ageRangeButton: {
		padding: 12,
		borderRadius: 8,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#e5e7eb',
		flex: 1,
		minWidth: '45%',
	},
	selectedAgeRange: {
		borderColor: '#0095FF',
		backgroundColor: '#f0f9ff',
	},
	ageRangeText: {
		textAlign: 'center',
		color: '#374151',
	},
	selectedAgeRangeText: {
		color: '#0095FF',
		fontWeight: '600',
	},
	goalContainer: {
		gap: 8,
		marginBottom: 12,
	},
	goalButton: {
		padding: 16,
		borderRadius: 12,
		backgroundColor: '#FFFFFF',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#E2E8F0',
	},
	selectedGoal: {
		borderColor: '#0A84FF',
		backgroundColor: '#f0f9ff',
	},
	goalText: {
		fontSize: 16,
		color: '#374151',
	},
	selectedGoalText: {
		color: '#0A84FF',
		fontWeight: '600',
	},
	ratingContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 8,
		marginBottom: 12,
	},
	ratingButton: {
		flex: 1,
		padding: 16,
		borderRadius: 12,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#e5e7eb',
		alignItems: 'center',
	},
	selectedRating: {
		borderColor: '#0095FF',
		backgroundColor: '#f0f9ff',
	},
	ratingText: {
		fontSize: 16,
		color: '#374151',
	},
	selectedRatingText: {
		color: '#0095FF',
		fontWeight: '600',
	},
	frequencyContainer: {
		gap: 8,
		marginBottom: 12,
	},
	frequencyButton: {
		padding: 16,
		borderRadius: 12,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	selectedFrequency: {
		borderColor: '#0095FF',
		backgroundColor: '#f0f9ff',
	},
	selectedFrequencyText: {
		color: '#0095FF',
		fontWeight: '600',
	},

	submitButton: {
		width: '100%',
		borderRadius: 999,
		overflow: 'hidden',
		marginTop: 16,
		shadowColor: '#0A84FF',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.6,
		shadowRadius: 15,
		elevation: 5,
	},
	gradient: {
		width: '100%',
	},
	submitButtonText: {
		color: 'white',
		fontSize: 20,
		textAlign: 'center',
		fontWeight: 'bold',
		marginVertical: 16,
	},
	paginationContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 12,
	},
	paginationDot: {
		width: '30%',
		height: 7,
		borderRadius: 4,
		backgroundColor: '#e5e7eb',
		marginHorizontal: 2,
	},
	paginationDotActive: {
		backgroundColor: '#0A84FF',
		height: 7,
		borderRadius: 8,
	},
	navigationButtons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 24,
	},
	navButton: {
		padding: 12,
		paddingHorizontal: 16,
		borderRadius: 20,
		backgroundColor: '#FFFFFF',
		minWidth: 120,
		alignItems: 'center',
		justifyContent: 'center',
	},
	nextButton: {
		backgroundColor: '#FFFFFF',
	},
	navButtonBackText: {
		color: '#444444',
		fontWeight: '600',
		fontSize: 18,
	},
	navButtonText: {
		color: '#0A84FF',
		fontWeight: '700',
		fontSize: 18,
		textAlign: 'center',
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 8,
		color: '#1f2937',
	},
	sectionSubtitle: {
		fontSize: 14,
		color: '#6b7280',
		marginBottom: 16,
	},
	categoryContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 12,
	},
	categoryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		borderRadius: 8,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#e5e7eb',
		flex: 1,
		minWidth: '45%',
	},
	selectedCategory: {
		borderColor: '#0095FF',
		backgroundColor: '#f0f9ff',
	},
	categoryIcon: {
		width: 24,
		height: 24,
		borderRadius: 4,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 8,
	},
	categoryText: {
		fontSize: 14,
		color: '#374151',
		flex: 1,
	},
	selectedCategoryText: {
		color: '#0095FF',
		fontWeight: '600',
	},
	infoContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		padding: 16,
		backgroundColor: '#f8fafc',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		gap: 12,
	},
	infoText: {
		flex: 1,
		fontSize: 14,
		color: '#6b7280',
		lineHeight: 20,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 40,
	},
	loadingText: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#374151',
	},
	subtitle: {
		fontSize: 16,
		color: '#6b7280',
		textAlign: 'center',
		marginBottom: 24,
	},
	frequencyText: {
		fontSize: 16,
		color: '#374151',
	},
	welcomeCard: {
		alignItems: 'center',
		paddingVertical: 40,
	},
	welcomeIllustration: {
		width: 120,
		height: 120,
		borderRadius: 60,
		backgroundColor: '#f0f9ff',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 24,
	},
	welcomeTitle: {
		fontSize: 32,
		fontWeight: 'bold',
		color: '#1f2937',
		marginBottom: 12,
		textAlign: 'center',
	},
	welcomeSubtitle: {
		fontSize: 18,
		color: '#0095FF',
		fontWeight: '600',
		marginBottom: 16,
		textAlign: 'center',
	},
	welcomeDescription: {
		fontSize: 16,
		color: '#6b7280',
		textAlign: 'center',
		lineHeight: 24,
	},
});

export default OnboardingScreen;
