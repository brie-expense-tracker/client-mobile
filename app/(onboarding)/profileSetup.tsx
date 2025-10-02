import React, { useState, useRef, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useProfile } from '../../src/context/profileContext';

type FieldErrors = {
	firstName?: string;
	lastName?: string;
	monthlyIncome?: string;
	financialGoal?: string;
	housingExpense?: string;
};

const { width } = Dimensions.get('window');

// Currency validation utility functions
const validateCurrencyInput = (value: string): boolean => {
	// Allow empty string
	if (!value) return true;

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
	// Remove any non-digit characters except decimal point
	const cleaned = value.replace(/[^\d.]/g, '');

	// Ensure only one decimal point
	const parts = cleaned.split('.');
	if (parts.length > 2) {
		return parts[0] + '.' + parts.slice(1).join('');
	}

	// Limit decimal places to 2
	if (parts.length === 2 && parts[1].length > 2) {
		return parts[0] + '.' + parts[1].slice(0, 2);
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
	const [monthlyIncome, setMonthlyIncome] = useState('');

	// Goals and Expenses
	const [financialGoal, setFinancialGoal] = useState('');
	const [housingExpense, setHousingExpense] = useState('');

	// UI State
	const [touched, setTouched] = useState<{
		firstName: boolean;
		lastName: boolean;
		monthlyIncome: boolean;
		financialGoal: boolean;
		housingExpense: boolean;
	}>({
		firstName: false,
		lastName: false,
		monthlyIncome: false,
		financialGoal: false,
		housingExpense: false,
	});
	const [submitting, setSubmitting] = useState(false);

	const flatListRef = useRef<FlatList>(null);
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

	// Validation logic
	const isValidName = (val: string) => val.trim().length >= 1;
	const isValidCurrency = (val: string) => !val || validateCurrencyInput(val);
	const isValidGoal = (val: string) => val.length > 0;

	const errors: FieldErrors = {};
	if (touched.firstName && !isValidName(firstName)) {
		errors.firstName = 'First name is required.';
	}
	if (touched.lastName && !isValidName(lastName)) {
		errors.lastName = 'Last name is required.';
	}
	if (touched.monthlyIncome && !isValidCurrency(monthlyIncome)) {
		errors.monthlyIncome = 'Please enter a valid amount (e.g., 2450.50).';
	}
	if (touched.financialGoal && !isValidGoal(financialGoal)) {
		errors.financialGoal = 'Please select a financial goal.';
	}
	if (touched.housingExpense && !isValidCurrency(housingExpense)) {
		errors.housingExpense = 'Please enter a valid amount.';
	}

	const stepValid = useMemo(() => {
		if (currentIndex === 0) return true; // welcome screen
		if (currentIndex === 1) {
			return (
				isValidName(firstName) &&
				isValidName(lastName) &&
				isValidCurrency(monthlyIncome)
			);
		}
		if (currentIndex === 2) {
			return isValidGoal(financialGoal) && isValidCurrency(housingExpense);
		}
		return false;
	}, [
		currentIndex,
		firstName,
		lastName,
		monthlyIncome,
		financialGoal,
		housingExpense,
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

	const handleSubmit = useCallback(async () => {
		if (submitting) return;

		// Mark all fields as touched to reveal errors
		setTouched({
			firstName: true,
			lastName: true,
			monthlyIncome: true,
			financialGoal: true,
			housingExpense: true,
		});

		// Check if form is valid
		if (!stepValid) {
			await Haptics.selectionAsync();
			return;
		}

		setSubmitting(true);
		try {
			const profileData = {
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				ageRange: '25-34', // Default age range
				monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : 0,
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
						cycleStart: 1,
						alertPct: 80,
						carryOver: false,
						autoSync: true,
					},
					goalSettings: {
						defaults: {
							target: 1000,
							dueDays: 90,
							sortBy: 'percent',
							currency: 'USD',
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
			await updateProfile(profileData as any);
			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			router.push('/(onboarding)/notificationSetup');
		} catch (error) {
			console.error('Error submitting profile:', error);
			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			// Even if profile submission fails, try to continue to notification setup
			try {
				router.push('/(onboarding)/notificationSetup');
			} catch (onboardingError) {
				console.error(
					'Error navigating to notification setup:',
					onboardingError
				);
				// Fallback to dashboard if navigation fails
				router.replace('/(tabs)/dashboard');
			}
		} finally {
			setSubmitting(false);
		}
	}, [
		submitting,
		stepValid,
		firstName,
		lastName,
		monthlyIncome,
		financialGoal,
		housingExpense,
		updateProfile,
	]);

	const handleSkip = useCallback(async () => {
		try {
			router.push('/(onboarding)/notificationSetup');
		} catch (error) {
			console.error('Error navigating to notification setup:', error);
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
									value={firstName}
									onChangeText={setFirstName}
									onBlur={() => onBlurField('firstName')}
									style={[styles.input, inputShadow]}
									placeholderTextColor="#94A3B8"
									placeholder="Enter your first name"
									accessibilityLabel="First name"
									returnKeyType="next"
									autoCapitalize="words"
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
									value={lastName}
									onChangeText={setLastName}
									onBlur={() => onBlurField('lastName')}
									style={[styles.input, inputShadow]}
									placeholderTextColor="#94A3B8"
									placeholder="Enter your last name"
									accessibilityLabel="Last name"
									returnKeyType="next"
									autoCapitalize="words"
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
									Monthly take-home income
								</Text>
								<Text style={[styles.subtext, { color: palette.subtext }]}>
									After taxes; this improves budget suggestions
								</Text>
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
										keyboardType={
											Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'
										}
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
								<View style={styles.goalContainer}>
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
											accessibilityRole="button"
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

							<Pressable
								onPress={handleSubmit}
								style={[
									styles.submitButton,
									{ opacity: stepValid && !submitting ? 1 : 0.6 },
								]}
								disabled={!stepValid || submitting}
								accessibilityRole="button"
								accessibilityLabel="Complete setup"
							>
								<LinearGradient
									colors={[palette.brand, palette.brandDark]}
									style={styles.gradient}
								>
									{submitting ? (
										<ActivityIndicator
											size="small"
											color="#FFFFFF"
											style={{ paddingVertical: 16 }}
										/>
									) : (
										<Text style={styles.submitButtonText}>Complete Setup</Text>
									)}
								</LinearGradient>
							</Pressable>
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
	}, [currentIndex, stepValid, handleSubmit]);

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
				keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
			>
				<View style={styles.header}>
					<View style={styles.logoContainer}>
						<Image
							style={styles.logoImage}
							source={require('../../src/assets/images/brie-logos.png')}
						/>
					</View>
					<Pressable style={styles.skipButton} onPress={handleSkip}>
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
							{ opacity: stepValid ? 1 : 0.6 },
						]}
						disabled={!stepValid}
					>
						<Text style={styles.navButtonText}>
							{currentIndex < 2 ? 'Continue' : 'Complete Setup'}
						</Text>
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
		height: 30,
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
		width: '16.67%',
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
		paddingBottom: 24,
	},
	navButton: {
		padding: 12,
		borderRadius: 20,
		backgroundColor: '#FFFFFF',
		width: 120,
		alignItems: 'center',
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
