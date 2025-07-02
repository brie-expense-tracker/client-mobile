import React, { useState, useRef, useEffect } from 'react';
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
	Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../../src/context/OnboardingContext';
import { useProfile } from '../../src/context/profileContext';
import { getCategoryMeta } from '../../src/utils/categoriesUtils';
import { ApiService } from '../../src/services/apiService';

type RootStackParamList = {
	Home: undefined;
};

type OnboardingScreenProps = {
	navigation: NativeStackNavigationProp<RootStackParamList>;
};

type Category = {
	_id: string;
	name: string;
	type: 'income' | 'expense';
	color: string;
	icon: string;
};

const { width } = Dimensions.get('window');

// Predefined colors for categories
const categoryColors = [
	'#FF6B6B',
	'#4ECDC4',
	'#45B7D1',
	'#96CEB4',
	'#FFEAA7',
	'#DDA0DD',
	'#98D8C8',
	'#F7DC6F',
	'#BB8FCE',
	'#85C1E9',
	'#F8C471',
	'#82E0AA',
	'#F1948A',
	'#85C1E9',
	'#D7BDE2',
];

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

const OnboardingScreen = ({ navigation }: OnboardingScreenProps) => {
	// Basic Info
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [ageRange, setAgeRange] = useState('');
	const [monthlyIncome, setMonthlyIncome] = useState('');

	// Goals and Expenses
	const [financialGoal, setFinancialGoal] = useState('');
	const [housingExpense, setHousingExpense] = useState('');
	const [loanPayments, setLoanPayments] = useState('');
	const [subscriptions, setSubscriptions] = useState('');

	// Savings and Risk
	const [savingsBalance, setSavingsBalance] = useState('');
	const [totalDebt, setTotalDebt] = useState('');
	const [riskTolerance, setRiskTolerance] = useState(3);
	const [investmentExperience, setInvestmentExperience] = useState(3);

	// Preferences
	const [adviceFrequency, setAdviceFrequency] = useState('');
	const [autoSave, setAutoSave] = useState(false);
	const [autoSaveAmount, setAutoSaveAmount] = useState('');

	// Categories
	const [availableCategories, setAvailableCategories] = useState<Category[]>(
		[]
	);
	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
	const [categoriesLoading, setCategoriesLoading] = useState(false);

	const flatListRef = useRef<FlatList>(null);
	const [currentIndex, setCurrentIndex] = useState(0);

	const { markOnboardingComplete } = useOnboarding();
	const { updateProfile } = useProfile();

	// Currency input handlers
	const handleCurrencyInput = (
		value: string,
		setter: (value: string) => void
	) => {
		const formatted = formatCurrencyInput(value);
		if (validateCurrencyInput(formatted)) {
			setter(formatted);
		}
	};

	// Fetch available categories on component mount
	useEffect(() => {
		fetchAvailableCategories();
	}, []);

	const fetchAvailableCategories = async () => {
		setCategoriesLoading(true);
		try {
			const response = await ApiService.get<Category[]>(
				'/categories/available'
			);
			if (response.success && response.data) {
				setAvailableCategories(response.data);
			}
		} catch (error) {
			console.error('Error fetching categories:', error);
		} finally {
			setCategoriesLoading(false);
		}
	};

	const toggleCategorySelection = (categoryId: string) => {
		setSelectedCategories((prev) =>
			prev.includes(categoryId)
				? prev.filter((id) => id !== categoryId)
				: [...prev, categoryId]
		);
	};

	const generateInitialInsight = async (profileData: any) => {
		try {
			// Try to generate a weekly insight first
			const response = await ApiService.post('/insights/generate/weekly', {});

			// If no insights were generated (likely due to no transaction data), create a fallback insight
			if (
				!response.success ||
				!response.data ||
				!Array.isArray(response.data) ||
				response.data.length === 0
			) {
				await createFallbackInsight(profileData);
			}
		} catch (error) {
			console.error('Error generating initial insight:', error);
			// Create fallback insight if generation fails
			await createFallbackInsight(profileData);
		}
	};

	const createFallbackInsight = async (profileData: any) => {
		try {
			const fallbackInsight = {
				title: 'Welcome to Better Spending!',
				message:
					"Let's start your financial journey with some smart spending habits.",
				detailedExplanation: `Welcome to Brie! Since you're just getting started, here are some fundamental spending principles to help you build a strong financial foundation:

1. **Track Every Transaction**: Start by recording all your income and expenses. This visibility is the first step to better financial control.

2. **Follow the 50/30/20 Rule**: Allocate 50% of your income to needs, 30% to wants, and 20% to savings and debt repayment.

3. **Build an Emergency Fund**: Aim to save 3-6 months of expenses for unexpected situations.

4. **Review Before You Buy**: Implement a 24-hour rule for non-essential purchases over $50.

5. **Use Your Budget Categories**: The categories you selected will help you stay organized and identify spending patterns.`,
				insightType: 'spending',
				priority: 'medium',
				isActionable: true,
				actionItems: [
					{
						title: 'Set Up Your First Budget',
						description:
							'Create a monthly budget using your income and expense information from onboarding.',
						completed: false,
					},
					{
						title: 'Start Tracking Today',
						description:
							'Record your first transaction to begin building your financial history.',
						completed: false,
					},
					{
						title: 'Review Your Categories',
						description:
							'Make sure your selected categories match your actual spending patterns.',
						completed: false,
					},
				],
				metadata: {
					totalIncome: profileData.monthlyIncome || 0,
					totalExpenses:
						(profileData.expenses?.housing || 0) +
						(profileData.expenses?.loans || 0) +
						(profileData.expenses?.subscriptions || 0),
					netIncome:
						(profileData.monthlyIncome || 0) -
						((profileData.expenses?.housing || 0) +
							(profileData.expenses?.loans || 0) +
							(profileData.expenses?.subscriptions || 0)),
					topCategories: [],
					comparisonPeriod: 'weekly',
					percentageChange: 0,
				},
			};

			// Create the fallback insight via API
			await ApiService.post('/insights/fallback', fallbackInsight);
		} catch (error) {
			console.error('Error creating fallback insight:', error);
		}
	};

	const handleSubmit = async () => {
		// Validate all currency inputs before submission
		const currencyFields = [
			{ value: monthlyIncome, name: 'Monthly Income' },
			{ value: housingExpense, name: 'Housing Expense' },
			{ value: loanPayments, name: 'Loan Payments' },
			{ value: subscriptions, name: 'Subscriptions' },
			{ value: savingsBalance, name: 'Savings Balance' },
			{ value: totalDebt, name: 'Total Debt' },
			{ value: autoSaveAmount, name: 'Auto Save Amount' },
		];

		// Check if any currency field has invalid data
		for (const field of currencyFields) {
			if (field.value && !validateCurrencyInput(field.value)) {
				Alert.alert(
					'Invalid Input',
					`Please enter a valid amount for ${field.name}.`,
					[{ text: 'OK' }]
				);
				return;
			}
		}

		const profileData = {
			firstName,
			lastName,
			ageRange,
			monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : 0,
			financialGoal,
			expenses: {
				housing: housingExpense ? parseFloat(housingExpense) : 0,
				loans: loanPayments ? parseFloat(loanPayments) : 0,
				subscriptions: subscriptions ? parseFloat(subscriptions) : 0,
			},
			savings: savingsBalance ? parseFloat(savingsBalance) : 0,
			debt: totalDebt ? parseFloat(totalDebt) : 0,
			riskProfile: {
				tolerance: riskTolerance.toString(),
				experience: investmentExperience.toString(),
			},
			preferences: {
				adviceFrequency,
				autoSave: {
					enabled: autoSave,
					amount: autoSaveAmount ? parseFloat(autoSaveAmount) : 0,
				},
				notifications: {
					enableNotifications: true,
					weeklySummary: true,
					overspendingAlert: false,
					aiSuggestion: true,
					budgetMilestones: false,
				},
				aiInsights: {
					enabled: true,
					frequency: 'weekly' as 'weekly' | 'monthly' | 'daily',
					pushNotifications: true,
					emailAlerts: false,
					insightTypes: {
						budgetingTips: true,
						expenseReduction: true,
						incomeSuggestions: true,
					},
				},
				budgetSettings: {
					cycleType: 'monthly' as 'monthly' | 'weekly' | 'biweekly',
					cycleStart: 1,
					alertPct: 80,
					carryOver: false,
					autoSync: true,
				},
				goalSettings: {
					defaults: {
						target: 1000,
						dueDays: 90,
						sortBy: 'percent' as 'percent' | 'name' | 'date',
						currency: 'USD',
					},
					ai: {
						enabled: true,
						tone: 'friendly' as 'friendly' | 'technical' | 'minimal',
						frequency: 'medium' as 'low' | 'medium' | 'high',
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
						rounding: '1' as 'none' | '1' | '5',
					},
					security: {
						lockEdit: false,
						undoWindow: 24,
					},
				},
			},
		};

		try {
			// Update profile using profileContext
			await updateProfile(profileData);

			// Submit selected categories
			if (selectedCategories.length > 0) {
				const selectedCategoryData = availableCategories.filter((cat) =>
					selectedCategories.includes(cat._id)
				);

				await ApiService.post('/categories/selected', {
					selectedCategories: selectedCategoryData,
				});
			}

			// Generate initial AI insight after onboarding
			await generateInitialInsight(profileData);

			// Mark onboarding as complete and navigate to main app
			await markOnboardingComplete();
			router.replace('/(tabs)/dashboard');
		} catch (error) {
			console.error('Error submitting profile:', error);
			// Even if profile submission fails, mark onboarding as complete
			try {
				await markOnboardingComplete();
				router.replace('/(tabs)/dashboard');
			} catch (onboardingError) {
				console.error('Error marking onboarding complete:', onboardingError);
				router.replace('/(tabs)/dashboard');
			}
		}
	};

	const handleSkip = async () => {
		try {
			await markOnboardingComplete();
			router.replace('/(tabs)/dashboard');
		} catch (error) {
			console.error('Error skipping onboarding:', error);
			// Even if there's an error, try to navigate to dashboard
			router.replace('/(tabs)/dashboard');
		}
	};

	const renderItem = ({ item, index }: { item: any; index: number }) => {
		switch (index) {
			case 0:
				return (
					<View style={styles.slide}>
						<ScrollView
							contentContainerStyle={styles.scrollContent}
							showsVerticalScrollIndicator={false}
						>
							<Text style={styles.title}>Let's get to know you</Text>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>First Name</Text>
								<Text style={styles.subtext}>
									This helps us personalize your experience
								</Text>
								<TextInput
									value={firstName}
									onChangeText={setFirstName}
									style={styles.input}
									placeholderTextColor="#6b7280"
									placeholder="Enter your first name"
								/>
							</View>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>Last Name</Text>
								<Text style={styles.subtext}>
									Your full name helps with account security
								</Text>
								<TextInput
									value={lastName}
									onChangeText={setLastName}
									style={styles.input}
									placeholderTextColor="#6b7280"
									placeholder="Enter your last name"
								/>
							</View>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>Age Range</Text>
								<Text style={styles.subtext}>
									This helps us provide age-appropriate financial advice
								</Text>
								<View style={styles.ageRangeContainer}>
									{['Under 25', '25-34', '35-44', '45+'].map((range) => (
										<Pressable
											key={range}
											onPress={() => setAgeRange(range)}
											style={[
												styles.ageRangeButton,
												ageRange === range && styles.selectedAgeRange,
											]}
										>
											<Text
												style={[
													styles.ageRangeText,
													ageRange === range && styles.selectedAgeRangeText,
												]}
											>
												{range}
											</Text>
										</Pressable>
									))}
								</View>
							</View>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>Monthly Take-Home Income</Text>
								<Text style={styles.subtext}>
									Your after-tax income helps us calculate realistic budgets
								</Text>
								<View style={styles.inputWithIcon}>
									<View style={styles.inputIcon}>
										<Ionicons name="logo-usd" size={20} color="#6b7280" />
									</View>
									<TextInput
										value={monthlyIncome}
										onChangeText={(text) =>
											handleCurrencyInput(text, setMonthlyIncome)
										}
										keyboardType="numeric"
										style={styles.inputWithIconText}
										placeholderTextColor="#6b7280"
										placeholder="0.00"
									/>
								</View>
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
						>
							<Text style={styles.title}>Your Financial Goals</Text>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>Primary Financial Goal</Text>
								<Text style={styles.subtext}>
									Choose your most important financial priority right now
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
											onPress={() => setFinancialGoal(goal)}
											style={[
												styles.goalButton,
												financialGoal === goal && styles.selectedGoal,
											]}
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
							</View>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>Monthly Expenses</Text>
								<Text style={styles.subtext}>
									Track your biggest monthly expenses to create better budgets
								</Text>
								<Text style={styles.inputLabel}>Housing & Utilities</Text>
								<View style={styles.inputWithIcon}>
									<View style={styles.inputIcon}>
										<Ionicons name="logo-usd" size={20} color="#6b7280" />
									</View>
									<TextInput
										value={housingExpense}
										onChangeText={(text) =>
											handleCurrencyInput(text, setHousingExpense)
										}
										keyboardType="numeric"
										style={styles.inputWithIconText}
										placeholderTextColor="#6b7280"
										placeholder="0.00"
									/>
								</View>
								<Text style={styles.inputLabel}>
									Loan & Credit Card Payments
								</Text>
								<View style={styles.inputWithIcon}>
									<View style={styles.inputIcon}>
										<Ionicons name="logo-usd" size={20} color="#6b7280" />
									</View>
									<TextInput
										value={loanPayments}
										onChangeText={(text) =>
											handleCurrencyInput(text, setLoanPayments)
										}
										keyboardType="numeric"
										style={styles.inputWithIconText}
										placeholderTextColor="#6b7280"
										placeholder="0.00"
									/>
								</View>
								<Text style={styles.inputLabel}>Subscriptions & Insurance</Text>
								<View style={styles.inputWithIcon}>
									<View style={styles.inputIcon}>
										<Ionicons name="logo-usd" size={20} color="#6b7280" />
									</View>
									<TextInput
										value={subscriptions}
										onChangeText={(text) =>
											handleCurrencyInput(text, setSubscriptions)
										}
										keyboardType="numeric"
										style={styles.inputWithIconText}
										placeholderTextColor="#6b7280"
										placeholder="0.00"
									/>
								</View>
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
						>
							<Text style={styles.title}>Your Financial Status</Text>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>Current Savings</Text>
								<Text style={styles.subtext}>
									Include checking, savings, and emergency fund balances
								</Text>
								<View style={styles.inputWithIcon}>
									<View style={styles.inputIcon}>
										<Ionicons name="logo-usd" size={20} color="#6b7280" />
									</View>
									<TextInput
										value={savingsBalance}
										onChangeText={(text) =>
											handleCurrencyInput(text, setSavingsBalance)
										}
										keyboardType="numeric"
										style={styles.inputWithIconText}
										placeholderTextColor="#6b7280"
										placeholder="0.00"
									/>
								</View>
							</View>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>Total Debt</Text>
								<Text style={styles.subtext}>
									Include credit cards, loans, and other outstanding balances
								</Text>
								<View style={styles.inputWithIcon}>
									<View style={styles.inputIcon}>
										<Ionicons name="logo-usd" size={20} color="#6b7280" />
									</View>
									<TextInput
										value={totalDebt}
										onChangeText={(text) =>
											handleCurrencyInput(text, setTotalDebt)
										}
										keyboardType="numeric"
										style={styles.inputWithIconText}
										placeholderTextColor="#6b7280"
										placeholder="0.00"
									/>
								</View>
							</View>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>Risk Tolerance (1-5)</Text>
								<Text style={styles.subtext}>
									1 = Very conservative, 5 = Very aggressive
								</Text>
								<View style={styles.ratingContainer}>
									{[1, 2, 3, 4, 5].map((rating) => (
										<Pressable
											key={rating}
											onPress={() => setRiskTolerance(rating)}
											style={[
												styles.ratingButton,
												riskTolerance === rating && styles.selectedRating,
											]}
										>
											<Text
												style={[
													styles.ratingText,
													riskTolerance === rating && styles.selectedRatingText,
												]}
											>
												{rating}
											</Text>
										</Pressable>
									))}
								</View>
							</View>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>Investment Experience (1-5)</Text>
								<Text style={styles.subtext}>
									1 = Beginner, 5 = Expert investor
								</Text>
								<View style={styles.ratingContainer}>
									{[1, 2, 3, 4, 5].map((rating) => (
										<Pressable
											key={rating}
											onPress={() => setInvestmentExperience(rating)}
											style={[
												styles.ratingButton,
												investmentExperience === rating &&
													styles.selectedRating,
											]}
										>
											<Text
												style={[
													styles.ratingText,
													investmentExperience === rating &&
														styles.selectedRatingText,
												]}
											>
												{rating}
											</Text>
										</Pressable>
									))}
								</View>
							</View>
						</ScrollView>
					</View>
				);
			case 3:
				return (
					<View style={styles.slide}>
						<ScrollView
							contentContainerStyle={styles.scrollContent}
							showsVerticalScrollIndicator={false}
						>
							<Text style={styles.title}>Choose Your Categories</Text>
							<Text style={styles.subtitle}>
								Select the categories you'd like to use for tracking your income
								and expenses
							</Text>

							{categoriesLoading ? (
								<View style={styles.loadingContainer}>
									<Text style={styles.loadingText}>Loading categories...</Text>
								</View>
							) : (
								<>
									{/* Default Categories Section */}
									<View style={styles.inputContainer}>
										<View style={styles.inputContainer}>
											<Text style={styles.label}>Income Categories</Text>
											<View style={styles.categoryContainer}>
												{availableCategories
													.filter((cat) => cat.type === 'income')
													.map((category) => (
														<Pressable
															key={category._id}
															onPress={() =>
																toggleCategorySelection(category._id)
															}
															style={[
																styles.categoryButton,
																selectedCategories.includes(category._id) &&
																	styles.selectedCategory,
															]}
														>
															<View
																style={[
																	styles.categoryIcon,
																	{ backgroundColor: category.color },
																]}
															>
																<Ionicons
																	name={getCategoryMeta(category).icon}
																	size={16}
																	color="white"
																/>
															</View>
															<Text
																style={[
																	styles.categoryText,
																	selectedCategories.includes(category._id) &&
																		styles.selectedCategoryText,
																]}
															>
																{category.name}
															</Text>
														</Pressable>
													))}
											</View>
										</View>

										<View style={styles.inputContainer}>
											<Text style={styles.label}>Expense Categories</Text>
											<View style={styles.categoryContainer}>
												{availableCategories
													.filter((cat) => cat.type === 'expense')
													.map((category) => (
														<Pressable
															key={category._id}
															onPress={() =>
																toggleCategorySelection(category._id)
															}
															style={[
																styles.categoryButton,
																selectedCategories.includes(category._id) &&
																	styles.selectedCategory,
															]}
														>
															<View
																style={[
																	styles.categoryIcon,
																	{ backgroundColor: category.color },
																]}
															>
																<Ionicons
																	name={getCategoryMeta(category).icon}
																	size={16}
																	color="white"
																/>
															</View>
															<Text
																style={[
																	styles.categoryText,
																	selectedCategories.includes(category._id) &&
																		styles.selectedCategoryText,
																]}
															>
																{category.name}
															</Text>
														</Pressable>
													))}
											</View>
										</View>
									</View>

									{/* Future Categories Info */}
									<View style={styles.inputContainer}>
										<View style={styles.infoContainer}>
											<Ionicons
												name="information-circle-outline"
												size={20}
												color="#6b7280"
											/>
											<Text style={styles.infoText}>
												Don't see the categories you need? You can add custom
												categories later in the Settings menu.
											</Text>
										</View>
									</View>
								</>
							)}
						</ScrollView>
					</View>
				);
			case 4:
				return (
					<View style={styles.slide}>
						<ScrollView
							contentContainerStyle={styles.scrollContent}
							showsVerticalScrollIndicator={false}
						>
							<Text style={styles.title}>Final Preferences</Text>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>Advice Frequency</Text>
								<Text style={styles.subtext}>
									How often would you like to receive financial insights?
								</Text>
								<View style={styles.frequencyContainer}>
									{['Daily snapshot', 'Weekly summary', 'Monthly report'].map(
										(freq) => (
											<Pressable
												key={freq}
												onPress={() => setAdviceFrequency(freq)}
												style={[
													styles.frequencyButton,
													adviceFrequency === freq && styles.selectedFrequency,
												]}
											>
												<Text
													style={[
														styles.frequencyText,
														adviceFrequency === freq &&
															styles.selectedFrequencyText,
													]}
												>
													{freq}
												</Text>
											</Pressable>
										)
									)}
								</View>
							</View>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>Automate Savings?</Text>
								<Text style={styles.subtext}>
									We can help you set up automatic savings transfers
								</Text>
								<View style={styles.autoSaveContainer}>
									<Pressable
										onPress={() => setAutoSave(!autoSave)}
										style={[
											styles.autoSaveButton,
											autoSave && styles.selectedAutoSave,
										]}
									>
										<Text
											style={[
												styles.autoSaveText,
												autoSave && styles.selectedAutoSaveText,
											]}
										>
											{autoSave ? 'Yes' : 'No'}
										</Text>
									</Pressable>
									{autoSave && (
										<>
											<Text style={styles.inputLabel}>Auto-Save Amount</Text>
											<View style={styles.inputWithIcon}>
												<View style={styles.inputIcon}>
													<Ionicons name="logo-usd" size={20} color="#6b7280" />
												</View>
												<TextInput
													value={autoSaveAmount}
													onChangeText={(text) =>
														handleCurrencyInput(text, setAutoSaveAmount)
													}
													keyboardType="numeric"
													style={styles.inputWithIconText}
													placeholderTextColor="#6b7280"
													placeholder="0.00"
												/>
											</View>
										</>
									)}
								</View>
							</View>
							<Pressable onPress={handleSubmit} style={styles.submitButton}>
								<LinearGradient
									colors={['#0095FF', '#008cff']}
									style={styles.gradient}
								>
									<Text style={styles.submitButtonText}>Complete Setup</Text>
								</LinearGradient>
							</Pressable>
						</ScrollView>
					</View>
				);
			default:
				return null;
		}
	};

	const handleNext = () => {
		if (currentIndex < 4) {
			flatListRef.current?.scrollToIndex({
				index: currentIndex + 1,
				animated: true,
			});
			setCurrentIndex(currentIndex + 1);
		}
	};

	const handleBack = () => {
		if (currentIndex > 0) {
			flatListRef.current?.scrollToIndex({
				index: currentIndex - 1,
				animated: true,
			});
			setCurrentIndex(currentIndex - 1);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<View style={styles.logoContainer}>
					<Image
						style={styles.logoImage}
						source={require('../../src/assets/images/brie-logos.png')}
					/>
				</View>
				<Pressable style={styles.skipButton}>
					<Text style={styles.skipButtonText}></Text>
				</Pressable>
			</View>
			<FlatList
				ref={flatListRef}
				data={[1, 2, 3, 4, 5]}
				renderItem={renderItem}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				onMomentumScrollEnd={(e) => {
					const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
					setCurrentIndex(newIndex);
				}}
				style={styles.flatList}
			/>
			<View style={styles.paginationContainer}>
				{[0, 1, 2, 3, 4].map((index) => (
					<View
						key={index}
						style={[
							styles.paginationDot,
							(index === currentIndex ||
								(currentIndex > 0 && index === currentIndex - 1) ||
								index === currentIndex - 2 ||
								index === currentIndex - 3 ||
								index === currentIndex - 4) &&
								styles.paginationDotActive,
						]}
					/>
				))}
			</View>
			<View style={styles.navigationButtons}>
				{currentIndex > 0 ? (
					<Pressable onPress={handleBack} style={styles.navButton}>
						<Text style={styles.navButtonBackText}>← Back</Text>
					</Pressable>
				) : (
					<View style={styles.navButton} />
				)}
				{currentIndex < 4 && (
					<Pressable
						onPress={handleNext}
						style={[styles.navButton, styles.nextButton]}
					>
						<Text style={styles.navButtonText}>Continue</Text>
					</Pressable>
				)}
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		width: '100%',
		height: '100%',
		backgroundColor: 'white',
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
		backgroundColor: 'white',
		borderRadius: 12,
		padding: 16,
		fontSize: 16,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		marginBottom: 12,
	},
	inputWithIcon: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'white',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		marginBottom: 12,
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
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	selectedGoal: {
		borderColor: '#0095FF',
		backgroundColor: '#f0f9ff',
	},
	goalText: {
		fontSize: 16,
		color: '#374151',
	},
	selectedGoalText: {
		color: '#0095FF',
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
	autoSaveContainer: {
		gap: 8,
		marginBottom: 12,
	},
	autoSaveButton: {
		padding: 16,
		borderRadius: 12,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#e5e7eb',
		alignItems: 'center',
	},
	selectedAutoSave: {
		borderColor: '#0095FF',
		backgroundColor: '#f0f9ff',
	},
	autoSaveText: {
		fontSize: 16,
		color: '#374151',
	},
	selectedAutoSaveText: {
		color: '#0095FF',
		fontWeight: '600',
	},
	submitButton: {
		width: '100%',
		borderRadius: 9999,
		overflow: 'hidden',
		marginTop: 16,
		shadowColor: '#0095FF',
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
		paddingHorizontal: 24,
		paddingVertical: 12,
	},
	paginationDot: {
		width: '20%',
		height: 7,
		borderRadius: 4,
		backgroundColor: '#e5e7eb',
		marginHorizontal: 2,
	},
	paginationDotActive: {
		backgroundColor: '#0095FF',
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
		backgroundColor: '#fff',
		width: 100,
		alignItems: 'center',
	},
	nextButton: {
		backgroundColor: '#fff',
	},
	navButtonBackText: {
		color: '#444444',
		fontWeight: '600',
		fontSize: 18,
	},
	navButtonText: {
		color: '#0095FF',
		fontWeight: '600',
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
});

export default OnboardingScreen;
