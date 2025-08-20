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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { TransactionContext } from '../../../src/context/transactionContext';
import { useBudget, Budget } from '../../../src/context/budgetContext';
import { navigateToBudgetsWithModal } from '../../../src/utils/navigationUtils';
import {
	BudgetSuggestionService,
	RecurringExpense,
	RecurringExpenseService,
} from '../../../src/services';

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
	const params = useLocalSearchParams<{
		description?: string;
		amount?: string;
		recurringExpenseId?: string;
	}>();
	const amountInputRef = useRef<TextInput>(null);
	const [selectedBudgets, setSelectedBudgets] = useState<Budget[]>([]);
	const [resetNumberPad, setResetNumberPad] = useState(false);
	const [budgetSuggestions, setBudgetSuggestions] = useState<Budget[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [recurringExpenseMatches, setRecurringExpenseMatches] = useState<
		RecurringExpense[]
	>([]);
	const [selectedRecurringExpense, setSelectedRecurringExpense] =
		useState<RecurringExpense | null>(null);
	const [showRecurringMatches, setShowRecurringMatches] = useState(false);
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
				description: params.description || '',
				amount: params.amount || '',
				budgets: [],
				date: getLocalIsoDate(),
				target: undefined,
				targetModel: undefined,
			},
		});

	const amount = watch('amount');

	// Handle recurring expense ID from URL params
	useEffect(() => {
		if (params.recurringExpenseId) {
			console.log('Pre-filling form with recurring expense data:', {
				description: params.description,
				amount: params.amount,
				recurringExpenseId: params.recurringExpenseId,
			});
		}
	}, [params.recurringExpenseId, params.description, params.amount]);

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

	// ==========================================
	// Loading State Component
	// ==========================================
	const LoadingState = () => (
		<View style={styles.loadingContainer}>
			<ActivityIndicator size="large" color="#00a2ff" />
			<Text style={styles.loadingText}>Loading...</Text>
		</View>
	);

	// ==========================================
	// Error State Component
	// ==========================================
	const ErrorState = () => (
		<View style={styles.errorContainer}>
			<View style={styles.errorContent}>
				<Ionicons name="warning-outline" size={64} color="#ff6b6b" />
				<Text style={styles.errorTitle}>Unable to Load</Text>
				<Text style={styles.errorSubtext}>
					There was a problem loading the expense form. Please try again.
				</Text>
				<RectButton
					style={styles.errorButton}
					onPress={() => router.replace('/(tabs)/transaction/expense')}
				>
					<Ionicons name="refresh" size={20} color="#fff" />
					<Text style={styles.errorButtonText}>Retry</Text>
				</RectButton>
			</View>
		</View>
	);

	// ==========================================
	// Main Render
	// ==========================================
	// Show loading state while fonts or budgets are loading
	if (!fontsLoaded || budgetsLoading) {
		return <LoadingState />;
	}

	// Show error state if there's a critical error
	if (false) {
		// Add actual error condition here if needed
		return <ErrorState />;
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
			const savedTransaction = await addTransaction(transactionData);

			console.log('Expense saved successfully!');

			// Link to recurring expense if selected or from URL params
			const recurringExpenseId =
				selectedRecurringExpense?.patternId || params.recurringExpenseId;
			if (recurringExpenseId && savedTransaction) {
				try {
					console.log('Linking transaction to recurring expense:', {
						transactionId: savedTransaction.id,
						patternId: recurringExpenseId,
					});

					await RecurringExpenseService.linkTransactionToRecurring({
						transactionId: savedTransaction.id,
						patternId: recurringExpenseId,
					});
					console.log('Transaction linked to recurring expense successfully!');

					// Show success message
					const expenseName =
						selectedRecurringExpense?.vendor || 'Recurring Expense';
					Alert.alert(
						'Success',
						`Transaction linked to recurring expense: ${expenseName}`,
						[{ text: 'OK' }]
					);
				} catch (error) {
					console.error(
						'Error linking transaction to recurring expense:',
						error
					);
					// Show user-friendly error message
					Alert.alert(
						'Link Error',
						'Transaction was saved but could not be linked to the recurring expense. You can link it manually later.'
					);
				}
			}

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

		// Check for recurring expense matches if we have both description and amount
		const currentAmount = parseFloat(amount);
		if (text.trim().length >= 2 && !isNaN(currentAmount) && currentAmount > 0) {
			await checkRecurringExpenseMatches(text, currentAmount);
		} else {
			setRecurringExpenseMatches([]);
			setShowRecurringMatches(false);
		}
	};

	// Auto-select budget from suggestions
	const selectBudgetFromSuggestion = (budget: Budget) => {
		setSelectedBudgets([budget]);
		setValue('budgets', [budget]);
		setShowSuggestions(false);
		setBudgetSuggestions([]);
	};

	// Check for recurring expense matches
	const checkRecurringExpenseMatches = async (
		description: string,
		amount: number
	) => {
		try {
			const recurringExpenses =
				await RecurringExpenseService.getRecurringExpenses();

			// Filter for potential matches based on vendor name and amount
			const matches = recurringExpenses.filter((expense) => {
				const vendorMatch =
					expense.vendor.toLowerCase().includes(description.toLowerCase()) ||
					description.toLowerCase().includes(expense.vendor.toLowerCase());

				// Allow for small variations in amount (within 5% or $1, whichever is greater)
				const amountDifference = Math.abs(expense.amount - amount);
				const amountThreshold = Math.max(expense.amount * 0.05, 1); // 5% or $1 minimum
				const amountMatch = amountDifference <= amountThreshold;

				return vendorMatch && amountMatch;
			});

			setRecurringExpenseMatches(matches);
			setShowRecurringMatches(matches.length > 0);
		} catch (error) {
			console.error('Error checking recurring expense matches:', error);
			setRecurringExpenseMatches([]);
			setShowRecurringMatches(false);
		}
	};

	// Select recurring expense match
	const selectRecurringExpense = (expense: RecurringExpense) => {
		setSelectedRecurringExpense(expense);
		setShowRecurringMatches(false);
	};

	// Clear recurring expense selection
	const clearRecurringExpenseSelection = () => {
		setSelectedRecurringExpense(null);
		setShowRecurringMatches(false);
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
									<Ionicons name="add-outline" size={24} color="#757575" />
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
									<Text style={styles.suggestionsTitle}>
										Suggested Budgets:
									</Text>
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

							{/* Recurring Expense Matches */}
							{showRecurringMatches && recurringExpenseMatches.length > 0 && (
								<View style={styles.suggestionsContainer}>
									<Text style={styles.suggestionsTitle}>
										Recurring Expense Matches:
									</Text>
									<ScrollView horizontal showsHorizontalScrollIndicator={false}>
										{recurringExpenseMatches.map((expense) => (
											<RectButton
												key={expense.patternId}
												style={[
													styles.suggestionButton,
													selectedRecurringExpense?.patternId ===
														expense.patternId && styles.selectedRecurringButton,
												]}
												onPress={() => selectRecurringExpense(expense)}
											>
												<Ionicons
													name="repeat"
													size={16}
													color={
														selectedRecurringExpense?.patternId ===
														expense.patternId
															? '#fff'
															: '#007ACC'
													}
													style={styles.suggestionIcon}
												/>
												<Text
													style={[
														styles.suggestionText,
														selectedRecurringExpense?.patternId ===
															expense.patternId && styles.selectedRecurringText,
													]}
												>
													{expense.vendor}
												</Text>
												<Text
													style={[
														styles.suggestionText,
														styles.amountText,
														selectedRecurringExpense?.patternId ===
															expense.patternId && styles.selectedRecurringText,
													]}
												>
													${expense.amount}
												</Text>
											</RectButton>
										))}
									</ScrollView>
								</View>
							)}

							{/* Selected Recurring Expense */}
							{selectedRecurringExpense && (
								<View style={styles.selectedRecurringContainer}>
									<View style={styles.selectedRecurringInfo}>
										<Ionicons name="repeat" size={16} color="#007ACC" />
										<Text style={styles.selectedRecurringLabel}>
											Linked to: {selectedRecurringExpense.vendor} ($
											{selectedRecurringExpense.amount})
										</Text>
									</View>
									<BorderlessButton
										onPress={clearRecurringExpenseSelection}
										style={styles.clearRecurringButton}
									>
										<Ionicons name="close-circle" size={20} color="#666" />
									</BorderlessButton>
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
		padding: 16,
		paddingBottom: 16,
	},
	inputAmountContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		minHeight: 180,
		maxHeight: 240,
	},
	dollarIcon: {
		height: 40,
	},
	inputAmount: {
		fontSize: 48,
		fontWeight: '600',
		textAlign: 'left',
		marginRight: 10,
		color: '#212121',
	},
	inputDescription: {
		height: 50,
		fontSize: 16,
		color: '#212121',
		borderColor: '#e0e0e0',
		borderRadius: 12,
		borderWidth: 1,
		marginBottom: 16,
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#fff',
	},
	success: {
		color: 'green',
		marginTop: 10,
	},
	transactionButtonsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 12,
	},
	transactionButtonContainer: {
		flex: 1,
	},
	transactionButton: {
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 12,
		backgroundColor: '#00a2ff',
		paddingVertical: 16,
		paddingHorizontal: 24,
	},
	transactionButtonText: {
		color: 'white',
		fontWeight: '600',
		fontSize: 16,
	},
	topNumPadContainer: {
		padding: 8,
		borderTopWidth: 1,
		borderColor: '#e0e0e0',
		backgroundColor: '#f8f9fa',
	},
	numPadContainer: {
		justifyContent: 'center',
	},
	buttonNumLight: {
		flex: 1,
		paddingVertical: 8,
		justifyContent: 'center',
		alignItems: 'center',
		margin: 4,
		borderRadius: 8,
		backgroundColor: '#fff',
	},
	buttonNumDark: {
		flex: 1,
		paddingVertical: 12,
		justifyContent: 'center',
		alignItems: 'center',
		margin: 4,
		borderRadius: 8,
		backgroundColor: '#f0f0f0',
	},
	buttonText: {
		fontSize: 24,
		color: '#212121',
		fontWeight: '500',
	},
	numPadRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	carouselContainer: {
		marginBottom: 16,
	},
	carouselLabel: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 12,
		color: '#212121',
	},
	carouselTextWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 12,
		justifyContent: 'center',
		borderRadius: 8,
		marginRight: 8,
		backgroundColor: '#f8f9fa',
		borderWidth: 1,
		borderColor: '#e0e0e0',
	},
	selectedTag: {
		backgroundColor: '#00a2ff',
		borderColor: '#00a2ff',
	},
	selectedTagText: {
		color: 'white',
		fontWeight: '600',
	},
	addButton: {
		padding: 8,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 8,
		backgroundColor: '#f8f9fa',
		borderWidth: 1,
		borderColor: '#e0e0e0',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
	},
	loadingText: {
		fontSize: 16,
		fontWeight: '600',
		marginTop: 16,
		color: '#757575',
	},
	carouselIcon: {
		marginRight: 8,
	},
	carouselText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#212121',
	},
	suggestionsContainer: {
		marginTop: 12,
		marginBottom: 12,
	},
	suggestionsTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#757575',
		marginBottom: 8,
	},
	suggestionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f8f9fa',
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
		color: '#212121',
		fontWeight: '500',
	},
	amountText: {
		fontSize: 12,
		color: '#757575',
		marginLeft: 4,
	},
	selectedRecurringButton: {
		backgroundColor: '#00a2ff',
		borderColor: '#00a2ff',
	},
	selectedRecurringText: {
		color: '#fff',
	},
	selectedRecurringContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#f0f8ff',
		padding: 12,
		borderRadius: 8,
		marginTop: 8,
		borderWidth: 1,
		borderColor: '#00a2ff',
	},
	selectedRecurringInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	selectedRecurringLabel: {
		fontSize: 14,
		color: '#00a2ff',
		fontWeight: '500',
		marginLeft: 6,
	},
	clearRecurringButton: {
		padding: 4,
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
		backgroundColor: '#fff',
	},
	errorContent: {
		alignItems: 'center',
		maxWidth: 280,
	},
	errorTitle: {
		fontSize: 24,
		fontWeight: '600',
		color: '#212121',
		marginTop: 16,
		marginBottom: 8,
		textAlign: 'center',
	},
	errorSubtext: {
		fontSize: 16,
		color: '#757575',
		textAlign: 'center',
		marginBottom: 32,
		lineHeight: 22,
	},
	errorButton: {
		backgroundColor: '#00a2ff',
		borderRadius: 12,
		paddingVertical: 16,
		paddingHorizontal: 24,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	errorButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
});

export default AddTransactionScreen;
