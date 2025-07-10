import React, {
	useState,
	useRef,
	useEffect,
	useCallback,
	useContext,
} from 'react';
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	Alert,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
} from 'react-native';
import { RectButton, BorderlessButton } from 'react-native-gesture-handler';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { TransactionContext } from '../../../src/context/transactionContext';
import { useBudget, Budget } from '../../../src/context/budgetContext';
import { navigateToBudgetsWithModal } from '../../../src/utils/navigationUtils';
import { BudgetSuggestionService } from '../../../src/services/budgetSuggestionService';

interface TransactionFormData {
	type: 'expense';
	description: string;
	amount: string;
	budgets: Budget[];
	date: string;
	target?: string;
	targetModel?: 'Budget' | 'Goal';
}

// Utility function to get local date in ISO format
const getLocalIsoDate = (): string => {
	const today = new Date();
	// Adjust for timezone offset to ensure we get the correct local date
	const offset = today.getTimezoneOffset();
	const localDate = new Date(today.getTime() - offset * 60 * 1000);
	return localDate.toISOString().split('T')[0];
};

//
//  FUNCTIONS START======f=========================================
const AddTransactionScreen = () => {
	const router = useRouter();
	const amountInputRef = useRef<TextInput>(null);
	const [selectedBudgets, setSelectedBudgets] = useState<Budget[]>([]);
	const [resetNumberPad, setResetNumberPad] = useState(false);
	const [budgetSuggestions, setBudgetSuggestions] = useState<Budget[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [fontsLoaded] = useFonts({
		...Ionicons.font,
	});
	const { transactions, isLoading, addTransaction } =
		useContext(TransactionContext);
	const { budgets, isLoading: budgetsLoading } = useBudget();

	const { control, handleSubmit, setValue, watch } =
		useForm<TransactionFormData>({
			defaultValues: {
				type: 'expense',
				description: '',
				amount: '',
				budgets: [],
				date: getLocalIsoDate(),
				target: undefined,
				targetModel: undefined,
			},
		});

	const amount = watch('amount');

	// Memoize the setValue function to prevent infinite re-renders
	const handleAmountChange = useCallback(
		(value: string) => {
			setValue('amount', value);
		},
		[setValue]
	);

	// Reset the resetNumberPad state after it's been used
	useEffect(() => {
		if (resetNumberPad) {
			const timer = setTimeout(() => {
				setResetNumberPad(false);
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [resetNumberPad]);

	useEffect(() => {
		if (amountInputRef.current) {
			amountInputRef.current.setNativeProps({
				selection: {
					start: amount.length,
					end: amount.length,
				},
			});
		}
	}, [amount]);

	// Show loading screen if fonts are not loaded
	if (!fontsLoaded || budgetsLoading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#0095FF" />
				<Text style={styles.loadingText}>Loading...</Text>
			</View>
		);
	}

	const onSubmit = async (data: TransactionFormData) => {
		try {
			// Validate amount
			const amount = parseFloat(data.amount);
			if (isNaN(amount) || amount <= 0) {
				Alert.alert('Error', 'Please enter a valid amount greater than 0');
				return;
			}

			// Create transaction data - budget will be auto-matched by backend if not selected
			const transactionData: any = {
				description: data.description,
				amount: amount,
				date: data.date,
				type: 'expense' as const,
			};

			// If a budget is selected, use it; otherwise let backend auto-match
			if (selectedBudgets.length > 0) {
				transactionData.target = selectedBudgets[0].id;
				transactionData.targetModel = 'Budget';
			}

			// Use the context's addTransaction method
			await addTransaction(transactionData);

			console.log('Expense saved successfully!');
			Alert.alert('Success', 'Expense saved successfully!');

			// Reset form values
			setValue('description', '');
			setValue('amount', ''); // Reset to empty string to show placeholder
			setValue('budgets', []);
			setValue('date', getLocalIsoDate());

			// Reset selected budgets
			setSelectedBudgets([]);

			// Reset NumberPad
			setResetNumberPad(true);

			// Navigate back to the previous screen
			if (router.canGoBack()) {
				router.back();
			} else {
				router.replace('/(tabs)/dashboard');
			}
		} catch (error) {
			console.error('Error saving expense:', error);
			Alert.alert('Error', 'Failed to save expense');
		}
	};

	const toggleBudgetSelection = (budget: Budget) => {
		const newSelectedBudgets = selectedBudgets.some((b) => b.id === budget.id)
			? selectedBudgets.filter((b) => b.id !== budget.id)
			: [...selectedBudgets, budget];

		setSelectedBudgets(newSelectedBudgets);
		setValue('budgets', newSelectedBudgets);
	};

	// Handle description changes and get budget suggestions
	const handleDescriptionChange = async (text: string) => {
		setValue('description', text);

		// Get budget suggestions if description is long enough
		if (text.trim().length >= 2) {
			try {
				const suggestions = await BudgetSuggestionService.getBudgetSuggestions(
					text
				);
				setBudgetSuggestions(suggestions);
				setShowSuggestions(suggestions.length > 0);
			} catch (error) {
				console.error('Error getting budget suggestions:', error);
				setBudgetSuggestions([]);
				setShowSuggestions(false);
			}
		} else {
			setBudgetSuggestions([]);
			setShowSuggestions(false);
		}
	};

	// Auto-select budget from suggestions
	const selectBudgetFromSuggestion = (budget: Budget) => {
		setSelectedBudgets([budget]);
		setValue('budgets', [budget]);
		setShowSuggestions(false);
		setBudgetSuggestions([]);
	};

	//
	// MAIN COMPONENT===============================================
	return (
		<View style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={['top']}>
				<View style={styles.mainContainer}>
					<View style={styles.topContainer}>
						<View style={styles.inputAmountContainer}>
							<Ionicons
								name="logo-usd"
								size={24}
								color="black"
								style={styles.dollarIcon}
							/>
							<Controller
								control={control}
								name="amount"
								render={({
									field: { value, onChange },
								}: {
									field: { value: string; onChange: (value: string) => void };
								}) => (
									<TextInput
										ref={amountInputRef}
										style={styles.inputAmount}
										placeholder="0"
										placeholderTextColor={'#000000'}
										value={value}
										onChangeText={onChange}
										showSoftInputOnFocus={false}
									/>
								)}
							/>
						</View>

						{/* Budgets Carousel */}
						<View style={styles.carouselContainer}>
							<Text style={styles.carouselLabel}>Budgets</Text>
							<ScrollView horizontal showsHorizontalScrollIndicator={false}>
								{budgets.map((budget, index) => (
									<RectButton
										key={index}
										onPress={() => toggleBudgetSelection(budget)}
										style={[
											styles.carouselTextWrapper,
											selectedBudgets.some((b) => b.id === budget.id) &&
												styles.selectedTag,
										]}
									>
										<Ionicons
											name={budget.icon as keyof typeof Ionicons.glyphMap}
											size={16}
											color={
												selectedBudgets.some((b) => b.id === budget.id)
													? 'white'
													: budget.color
											}
											style={styles.carouselIcon}
										/>
										<Text
											style={[
												styles.carouselText,
												selectedBudgets.some((b) => b.id === budget.id) &&
													styles.selectedTagText,
											]}
										>
											{budget.name}
										</Text>
									</RectButton>
								))}
								<RectButton
									onPress={navigateToBudgetsWithModal}
									style={styles.addButton}
								>
									<Ionicons name="add-outline" size={24} color="grey" />
								</RectButton>
							</ScrollView>
						</View>

						<KeyboardAvoidingView
							behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
						>
							<Controller
								control={control}
								name="description"
								render={({
									field: { value, onChange },
								}: {
									field: { value: string; onChange: (value: string) => void };
								}) => (
									<TextInput
										style={styles.inputDescription}
										placeholder="What did you spend this on?"
										placeholderTextColor={'#a3a3a3'}
										value={value}
										onChangeText={handleDescriptionChange}
									/>
								)}
							/>
							
							{/* Budget Suggestions */}
							{showSuggestions && budgetSuggestions.length > 0 && (
								<View style={styles.suggestionsContainer}>
									<Text style={styles.suggestionsTitle}>Suggested Budgets:</Text>
									<ScrollView horizontal showsHorizontalScrollIndicator={false}>
										{budgetSuggestions.map((budget) => (
											<RectButton
												key={budget.id}
												style={styles.suggestionButton}
												onPress={() => selectBudgetFromSuggestion(budget)}
											>
												<Ionicons
													name={budget.icon as keyof typeof Ionicons.glyphMap}
													size={16}
													color={budget.color}
													style={styles.suggestionIcon}
												/>
												<Text style={styles.suggestionText}>{budget.name}</Text>
											</RectButton>
										))}
									</ScrollView>
								</View>
							)}
						</KeyboardAvoidingView>

						<View style={styles.transactionButtonsContainer}>
							<View style={styles.transactionButtonContainer}>
								<RectButton
									style={styles.transactionButton}
									onPress={() => {
										setValue('type', 'expense');
										handleSubmit(onSubmit)();
									}}
								>
									<Text style={styles.transactionButtonText}>Spent</Text>
								</RectButton>
							</View>
						</View>
					</View>
					<View style={styles.topNumPadContainer}>
						<NumberPad
							onValueChange={handleAmountChange}
							reset={resetNumberPad}
						/>
					</View>
				</View>
			</SafeAreaView>
		</View>
	);
};

//
// NUMBER PAD COMPONENT===============================================
const NumberPad: React.FC<{
	onValueChange: (value: string) => void;
	reset?: boolean;
}> = ({ onValueChange, reset = false }) => {
	const [value, setValue] = useState('');
	const [pressed, setPressed] = useState(false);

	// Reset the value when reset prop changes to true
	useEffect(() => {
		if (reset) {
			setValue('');
		}
	}, [reset]);

	// Use useEffect to call onValueChange when value changes
	useEffect(() => {
		onValueChange(value);
	}, [value, onValueChange]);

	const validateAmount = (newValue: string): boolean => {
		// Check if empty
		if (!newValue) return true;

		// Convert to number for validation
		const numValue = parseFloat(newValue);

		// Check if greater than 0
		if (numValue <= 0) return false;

		// Check if less than 1 million
		if (numValue > 1000000) return false;

		// Check decimal places
		if (newValue.includes('.')) {
			const decimalPlaces = newValue.split('.')[1].length;
			if (decimalPlaces > 2) return false;
		}

		return true;
	};

	const handlePress = (num: string) => {
		setValue((prev) => {
			let newValue = prev + num;

			// If trying to add decimal point
			if (num === '.') {
				// If already has decimal point, don't add another
				if (prev.includes('.')) return prev;
				// If empty, add '0.' instead of just '.'
				if (!prev) newValue = '0.';
			}

			// Validate the new value
			if (!validateAmount(newValue)) return prev;

			// Limit to 9 characters total
			newValue = newValue.slice(-9);
			return newValue;
		});
	};

	const handleBackspace = () => {
		setValue((prev) => {
			const newValue = prev.slice(0, -1);
			return newValue;
		});
	};

	return (
		<View style={styles.numPadContainer}>
			<View style={styles.numPadRow}>
				{[1, 2, 3].map((num) => (
					<BorderlessButton
						key={num}
						style={styles.buttonNumLight}
						onPress={() => handlePress(num.toString())}
						onActiveStateChange={(active) => setPressed(!pressed)}
					>
						<Text style={styles.buttonText}>{num}</Text>
					</BorderlessButton>
				))}
			</View>
			<View style={styles.numPadRow}>
				{[4, 5, 6].map((num) => (
					<BorderlessButton
						key={num}
						style={styles.buttonNumLight}
						onPress={() => handlePress(num.toString())}
						onActiveStateChange={(active) => setPressed(!pressed)}
					>
						<Text style={styles.buttonText}>{num}</Text>
					</BorderlessButton>
				))}
			</View>
			<View style={styles.numPadRow}>
				{[7, 8, 9].map((num) => (
					<BorderlessButton
						key={num}
						style={styles.buttonNumLight}
						onPress={() => handlePress(num.toString())}
						onActiveStateChange={(active) => setPressed(!pressed)}
					>
						<Text style={styles.buttonText}>{num}</Text>
					</BorderlessButton>
				))}
			</View>
			<View style={styles.numPadRow}>
				<BorderlessButton
					style={styles.buttonNumDark}
					onPress={() => handlePress('.')}
					onActiveStateChange={(active) => setPressed(!pressed)}
				>
					<Text style={styles.buttonText}>.</Text>
				</BorderlessButton>
				<BorderlessButton
					style={styles.buttonNumLight}
					onPress={() => handlePress('0')}
					onActiveStateChange={(active) => setPressed(!pressed)}
				>
					<Text style={styles.buttonText}>0</Text>
				</BorderlessButton>
				<BorderlessButton
					style={styles.buttonNumDark}
					onPress={handleBackspace}
					onActiveStateChange={(active) => setPressed(!pressed)}
				>
					<Text style={styles.buttonText}>⌫</Text>
				</BorderlessButton>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	safeArea: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	mainContainer: {
		flex: 1,
		justifyContent: 'space-between',
		backgroundColor: '#ffffff',
	},
	topContainer: {
		flex: 1,
		justifyContent: 'flex-end',
		padding: 20,
		paddingBottom: 10,
	},
	inputAmountContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		flex: 1,
	},
	dollarIcon: {
		height: 40,
	},
	inputAmount: {
		fontSize: 60,
		fontWeight: 'bold',
		textAlign: 'left',
		marginRight: 10,
	},
	inputDescription: {
		height: 50,
		fontSize: 20,
		color: '#000000',
		borderColor: '#a3a3a3',
		borderRadius: 10,
		borderWidth: 1,
		marginBottom: 10,
		paddingLeft: 8,
	},
	success: {
		color: 'green',
		marginTop: 10,
	},
	transactionButtonsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 10,
	},
	transactionButtonContainer: {
		flex: 1,
	},
	transactionButton: {
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 16,
		backgroundColor: '#0095FF',
		padding: 16,
	},
	transactionButtonText: {
		color: 'white',
		fontWeight: '600',
		fontSize: 18,
	},
	topNumPadContainer: {
		padding: 5,
		borderTopWidth: 1,
		borderColor: '#ebebeb',
	},
	numPadContainer: {
		justifyContent: 'center',
	},
	buttonNumLight: {
		flex: 1,
		paddingVertical: 6,
		justifyContent: 'center',
		alignItems: 'center',
		margin: 5,
		borderRadius: 5,
	},
	buttonNumDark: {
		flex: 1,
		paddingVertical: 12,
		justifyContent: 'center',
		alignItems: 'center',
		margin: 5,
		borderRadius: 5,
	},
	buttonText: {
		fontSize: 28,
		color: '#212121',
	},
	numPadRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	carouselContainer: {
		marginBottom: 10,
	},
	carouselTextWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 5,
		color: '#333',
		padding: 8,
		justifyContent: 'center',
		borderRadius: 8,
	},
	selectedTag: {
		backgroundColor: '#0095FF',
		borderRadius: 8,
		padding: 8,
	},
	selectedTagText: {
		color: 'white',
	},
	addButton: {
		padding: 8,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 8,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		fontSize: 18,
		fontWeight: 'bold',
		marginTop: 10,
	},
	carouselLabel: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 10,
	},
	carouselIcon: {
		marginRight: 8,
	},
	carouselText: {
		fontSize: 16,
	},
	suggestionsContainer: {
		marginTop: 10,
		marginBottom: 10,
	},
	suggestionsTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#666',
		marginBottom: 8,
	},
	suggestionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f0f0f0',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 20,
		marginRight: 8,
		borderWidth: 1,
		borderColor: '#e0e0e0',
	},
	suggestionIcon: {
		marginRight: 6,
	},
	suggestionText: {
		fontSize: 14,
		color: '#333',
		fontWeight: '500',
	},
});

export default AddTransactionScreen;
