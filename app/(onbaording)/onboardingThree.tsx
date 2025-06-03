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
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';

type Expense = {
	label: string;
	amount: string;
};

type RootStackParamList = {
	Home: undefined;
};

type OnboardingScreenProps = {
	navigation: NativeStackNavigationProp<RootStackParamList>;
};

const { width } = Dimensions.get('window');

const OnboardingScreen = ({ navigation }: OnboardingScreenProps) => {
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [income, setIncome] = useState('');
	const [goal, setGoal] = useState('');
	const [expenses, setExpenses] = useState<Expense[]>([]);
	const [currentInput, setCurrentInput] = useState<Expense>({
		label: '',
		amount: '',
	});
	const flatListRef = useRef<FlatList>(null);
	const [currentIndex, setCurrentIndex] = useState(0);

	const handleAddExpense = () => {
		if (currentInput.label && currentInput.amount) {
			setExpenses([...expenses, currentInput]);
			setCurrentInput({ label: '', amount: '' });
		}
	};

	const handleSubmit = () => {
		const profileData = {
			name: `${firstName} ${lastName}`,
			income,
			goal,
			expenses,
		};
		fetch('https://yourapi.com/api/profile/setup', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(profileData),
		}).then(() => navigation.navigate('Home'));
	};

	const renderItem = ({ item, index }: { item: any; index: number }) => {
		switch (index) {
			case 0:
				return (
					<View style={styles.slide}>
						<Text style={styles.title}>
							Welcome! Let's personalize your experience.
						</Text>
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
					</View>
				);
			case 1:
				return (
					<View style={styles.slide}>
						<View style={styles.inputContainer}>
							<Text style={styles.label}>Monthly Income ($)</Text>
							<TextInput
								value={income}
								onChangeText={setIncome}
								keyboardType="numeric"
								style={styles.input}
								placeholderTextColor="#6b7280"
							/>
						</View>
						<View style={styles.inputContainer}>
							<Text style={styles.label}>Primary Goal</Text>
							<View style={styles.goalContainer}>
								<Pressable
									onPress={() => setGoal('Save Money')}
									style={[
										styles.goalButton,
										goal === 'Save Money' && styles.selectedGoal,
									]}
								>
									<Text
										style={[
											styles.goalText,
											goal === 'Save Money' && styles.selectedGoalText,
										]}
									>
										💰 Save Money
									</Text>
								</Pressable>
								<Pressable
									onPress={() => setGoal('Budget Smarter')}
									style={[
										styles.goalButton,
										goal === 'Budget Smarter' && styles.selectedGoal,
									]}
								>
									<Text
										style={[
											styles.goalText,
											goal === 'Budget Smarter' && styles.selectedGoalText,
										]}
									>
										📊 Budget Smarter
									</Text>
								</Pressable>
								<Pressable
									onPress={() => setGoal('Invest Smarter')}
									style={[
										styles.goalButton,
										goal === 'Invest Smarter' && styles.selectedGoal,
									]}
								>
									<Text
										style={[
											styles.goalText,
											goal === 'Invest Smarter' && styles.selectedGoalText,
										]}
									>
										📈 Invest Smarter
									</Text>
								</Pressable>
							</View>
						</View>
					</View>
				);
			case 2:
				return (
					<View style={styles.slide}>
						<View style={styles.inputContainer}>
							<Text style={styles.label}>Recurring Expenses</Text>
							<TextInput
								placeholder="Expense Name (e.g. Spotify)"
								value={currentInput.label}
								onChangeText={(val) =>
									setCurrentInput({ ...currentInput, label: val })
								}
								style={styles.input}
								placeholderTextColor="#6b7280"
							/>
							<TextInput
								placeholder="Amount"
								value={currentInput.amount}
								onChangeText={(val) =>
									setCurrentInput({ ...currentInput, amount: val })
								}
								keyboardType="numeric"
								style={styles.input}
								placeholderTextColor="#6b7280"
							/>
							<Pressable onPress={handleAddExpense} style={styles.addButton}>
								<Text style={styles.addButtonText}>+ Add Expense</Text>
							</Pressable>
						</View>

						{expenses.map((e, i) => (
							<Text key={i} style={styles.expenseText}>
								{e.label}: ${e.amount}
							</Text>
						))}

						<Pressable onPress={handleSubmit} style={styles.submitButton}>
							<LinearGradient
								colors={['#0286e3', '#0095FF']}
								style={styles.gradient}
							>
								<Text style={styles.submitButtonText}>Finish Setup</Text>
							</LinearGradient>
						</Pressable>
					</View>
				);
			default:
				return null;
		}
	};

	const handleNext = () => {
		if (currentIndex < 2) {
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
			<Image
				style={styles.logoImage}
				source={require('../../assets/images/brie-logos.png')}
			/>
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
			/>
			<View style={styles.paginationContainer}>
				{[0, 1, 2].map((index) => (
					<View
						key={index}
						style={[
							styles.paginationDot,
							index === currentIndex && styles.paginationDotActive,
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
				{currentIndex < 2 && (
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
	logoImage: {
		width: 100,
		height: 30,
		marginTop: 20,
		marginBottom: 20,
		resizeMode: 'contain',
		alignSelf: 'center',
	},
	flatList: {
		flex: 1,
	},
	slide: {
		width,
		padding: 24,
		justifyContent: 'center',
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		textAlign: 'center',
		marginBottom: 32,
		color: '#1f2937',
	},
	inputContainer: {
		marginBottom: 24,
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
	goalContainer: {
		gap: 12,
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
	addButton: {
		backgroundColor: '#10b981',
		padding: 16,
		borderRadius: 12,
		alignItems: 'center',
	},
	addButtonText: {
		color: 'white',
		fontSize: 16,
		fontWeight: '600',
	},
	expenseText: {
		fontSize: 16,
		color: '#374151',
		marginBottom: 8,
	},
	submitButton: {
		width: '100%',
		borderRadius: 9999,
		overflow: 'hidden',
		marginTop: 24,
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
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#e5e7eb',
		marginHorizontal: 4,
	},
	paginationDotActive: {
		backgroundColor: '#0095FF',
		width: 12,
		height: 12,
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
		backgroundColor: '#f3f4f6',
		width: 100,
		alignItems: 'center',
	},
	nextButton: {
		backgroundColor: '#0095FF',
	},
	navButtonBackText: {
		color: '#444444',
		fontWeight: '600',
		fontSize: 16,
	},
	navButtonText: {
		color: '#ffffff',
		fontWeight: '600',
		fontSize: 16,
	},
});

export default OnboardingScreen;
