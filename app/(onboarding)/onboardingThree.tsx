import React, { useState, useRef } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	Pressable,
	Image,
	SafeAreaView,
	FlatList,
	Dimensions,
	ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useOnboarding } from '../../context/OnboardingContext';

type RootStackParamList = {
	Home: undefined;
};

type OnboardingScreenProps = {
	navigation: NativeStackNavigationProp<RootStackParamList>;
};

const { width } = Dimensions.get('window');

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

	const flatListRef = useRef<FlatList>(null);
	const [currentIndex, setCurrentIndex] = useState(0);

	const { markOnboardingComplete } = useOnboarding();

	const handleSubmit = async () => {
		const profileData = {
			firstName,
			lastName,
			ageRange,
			monthlyIncome,
			financialGoal,
			expenses: {
				housing: housingExpense,
				loans: loanPayments,
				subscriptions,
			},
			savings: savingsBalance,
			debt: totalDebt,
			riskProfile: {
				tolerance: riskTolerance,
				experience: investmentExperience,
			},
			preferences: {
				adviceFrequency,
				autoSave: {
					enabled: autoSave,
					amount: autoSaveAmount,
				},
			},
		};

		try {
			await fetch('http://localhost:3000/api/profile/', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(profileData),
			});

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
								<TextInput
									value={monthlyIncome}
									onChangeText={setMonthlyIncome}
									keyboardType="numeric"
									style={styles.input}
									placeholderTextColor="#6b7280"
									placeholder="Enter your monthly income after taxes"
								/>
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
								<TextInput
									value={housingExpense}
									onChangeText={setHousingExpense}
									keyboardType="numeric"
									style={styles.input}
									placeholderTextColor="#6b7280"
									placeholder="Housing & Utilities"
								/>
								<TextInput
									value={loanPayments}
									onChangeText={setLoanPayments}
									keyboardType="numeric"
									style={styles.input}
									placeholderTextColor="#6b7280"
									placeholder="Loan & Credit Card Payments"
								/>
								<TextInput
									value={subscriptions}
									onChangeText={setSubscriptions}
									keyboardType="numeric"
									style={styles.input}
									placeholderTextColor="#6b7280"
									placeholder="Subscriptions & Insurance"
								/>
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
								<TextInput
									value={savingsBalance}
									onChangeText={setSavingsBalance}
									keyboardType="numeric"
									style={styles.input}
									placeholderTextColor="#6b7280"
									placeholder="Checking & Savings Balance"
								/>
							</View>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>Total Debt</Text>
								<TextInput
									value={totalDebt}
									onChangeText={setTotalDebt}
									keyboardType="numeric"
									style={styles.input}
									placeholderTextColor="#6b7280"
									placeholder="Total Debt Balance"
								/>
							</View>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>Risk Tolerance (1-5)</Text>
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
							<Text style={styles.title}>Final Preferences</Text>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>Advice Frequency</Text>
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
										<TextInput
											value={autoSaveAmount}
											onChangeText={setAutoSaveAmount}
											keyboardType="numeric"
											style={styles.input}
											placeholderTextColor="#6b7280"
											placeholder="Amount per pay period"
										/>
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
		if (currentIndex < 3) {
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
						source={require('../../assets/images/brie-logos.png')}
					/>
				</View>
				<Pressable onPress={handleSkip} style={styles.skipButton}>
					<Text style={styles.skipButtonText}>Skip</Text>
				</Pressable>
			</View>
			<FlatList
				ref={flatListRef}
				data={[1, 2, 3, 4]}
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
				{[0, 1, 2, 3].map((index) => (
					<View
						key={index}
						style={[
							styles.paginationDot,
							(index === currentIndex ||
								(currentIndex > 0 && index === currentIndex - 1) ||
								index === currentIndex - 2 ||
								index === currentIndex - 3) &&
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
				{currentIndex < 3 && (
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
		marginBottom: 24,
		color: '#1f2937',
	},
	inputContainer: {
		marginBottom: 20,
	},
	label: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 8,
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
	frequencyText: {
		fontSize: 16,
		color: '#374151',
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
		paddingVertical: 16,
	},
	paginationDot: {
		width: '20%',
		height: 8,
		borderRadius: 4,
		backgroundColor: '#e5e7eb',
		marginHorizontal: 4,
	},
	paginationDotActive: {
		backgroundColor: '#0095FF',
		width: '20%',
		height: 8,
		borderRadius: 6,
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
});

export default OnboardingScreen;
