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
	Modal,
	TouchableOpacity,
} from 'react-native';
import { RectButton, BorderlessButton } from 'react-native-gesture-handler';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { TransactionContext } from '../../../src/context/transactionContext';
import { useGoal, Goal } from '../../../src/context/goalContext';
import { navigateToGoalsWithModal } from '../../../src/utils/navigationUtils';

interface TransactionFormData {
	type: 'income' | 'expense';
	description: string;
	amount: string;
	goals: Goal[];
	date: string;
	target?: string;
	targetModel?: 'Budget' | 'Goal';
	category?: string;
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
// Transaction categories for expenses
const EXPENSE_CATEGORIES = [
	{
		id: 'food',
		name: 'Food & Dining',
		icon: 'restaurant-outline',
		color: '#FF6B6B',
	},
	{
		id: 'transport',
		name: 'Transportation',
		icon: 'car-outline',
		color: '#4ECDC4',
	},
	{
		id: 'entertainment',
		name: 'Entertainment',
		icon: 'game-controller-outline',
		color: '#45B7D1',
	},
	{ id: 'shopping', name: 'Shopping', icon: 'bag-outline', color: '#96CEB4' },
	{
		id: 'health',
		name: 'Health & Fitness',
		icon: 'fitness-outline',
		color: '#FFEAA7',
	},
	{
		id: 'bills',
		name: 'Bills & Utilities',
		icon: 'receipt-outline',
		color: '#DDA0DD',
	},
	{
		id: 'other',
		name: 'Other',
		icon: 'ellipsis-horizontal-outline',
		color: '#95A5A6',
	},
];

const AddTransactionScreen = () => {
	const router = useRouter();
	const amountInputRef = useRef<TextInput>(null);
	const [selectedGoals, setSelectedGoals] = useState<Goal[]>([]);
	const [resetNumberPad, setResetNumberPad] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [fontsLoaded] = useFonts({
		...Ionicons.font,
	});
	const { addTransaction } = useContext(TransactionContext);
	const { goals, isLoading: goalsLoading } = useGoal();

	const {
		control,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
		clearErrors,
	} = useForm<TransactionFormData>({
		defaultValues: {
			type: 'income',
			description: '',
			amount: '',
			goals: [],
			date: getLocalIsoDate(),
			target: undefined,
			targetModel: undefined,
			category: undefined,
		},
		mode: 'onChange',
	});

	const amount = watch('amount');

	// Memoize the setValue function to prevent infinite re-renders
	const handleAmountChange = useCallback(
		(value: string) => {
			console.log('[Transaction] handleAmountChange called with:', value);
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
					There was a problem loading the transaction form. Please try again.
				</Text>
				<RectButton
					style={styles.errorButton}
					onPress={() => router.replace('/(tabs)/transaction')}
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
	// Show loading state while fonts or goals are loading
	if (!fontsLoaded || goalsLoading) {
		return <LoadingState />;
	}

	// Show error state if there's a critical error
	if (false) {
		// Add actual error condition here if needed
		return <ErrorState />;
	}

	const onSubmit = async (data: TransactionFormData) => {
		console.log('[Transaction] onSubmit called with data:', data);

		// Clear any previous errors
		clearErrors();

		// Validate required fields
		if (!data.amount || data.amount.trim() === '') {
			Alert.alert('Error', 'Please enter an amount');
			return;
		}

		if (!data.description || data.description.trim() === '') {
			Alert.alert('Error', 'Please enter a description');
			return;
		}

		try {
			setIsSubmitting(true);

			// Validate amount
			const amount = parseFloat(data.amount);
			console.log('[Transaction] Parsed amount:', amount);
			if (isNaN(amount) || amount <= 0) {
				console.log('[Transaction] Amount validation failed');
				Alert.alert('Error', 'Please enter a valid amount greater than 0');
				return;
			}

			// Create transaction data
			const transactionData: any = {
				description: data.description.trim(),
				amount: data.type === 'expense' ? -Math.abs(amount) : Math.abs(amount), // Negative for expenses
				date: data.date,
				type: data.type,
			};

			// Add category for expenses
			if (data.type === 'expense' && data.category) {
				transactionData.category = data.category;
			}

			// If a goal is selected, associate with that goal
			if (selectedGoals.length > 0) {
				transactionData.target = selectedGoals[0].id;
				transactionData.targetModel = 'Goal';
			} else {
				// No goal selected - this will be categorized as "Other"
				console.log(
					'[Transaction] Creating transaction without specific goal target'
				);
			}

			// Use the context's addTransaction method
			await addTransaction(transactionData);

			console.log('Transaction saved successfully!');

			// Show success feedback
			Alert.alert(
				'Success',
				`${
					data.type === 'income' ? 'Income' : 'Expense'
				} transaction saved successfully!`,
				[
					{
						text: 'OK',
						onPress: () => {
							// Reset form values
							setValue('description', '');
							setValue('amount', '');
							setValue('goals', []);
							setValue('date', getLocalIsoDate());
							setValue('type', 'income');
							setValue('category', undefined);

							// Reset selected goals
							setSelectedGoals([]);

							// Reset NumberPad
							setResetNumberPad(true);

							// Navigate back to the previous screen
							if (router.canGoBack()) {
								router.back();
							} else {
								router.replace('/(tabs)/dashboard');
							}
						},
					},
				]
			);
		} catch (error) {
			console.error('Error saving transaction:', error);
			Alert.alert('Error', 'Failed to save transaction. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	};

	const toggleGoalSelection = (goal: Goal) => {
		const newSelectedGoals = selectedGoals.some((g) => g.id === goal.id)
			? selectedGoals.filter((g) => g.id !== goal.id)
			: [...selectedGoals, goal];

		setSelectedGoals(newSelectedGoals);
		setValue('goals', newSelectedGoals);
	};

	const selectedTransactionType = watch('type');
	const selectedCategory = watch('category');
	const selectedDate = watch('date');

	// Format date for display
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	};

	// Date picker component
	const DatePickerModal = () => (
		<Modal
			visible={showDatePicker}
			transparent={true}
			animationType="slide"
			onRequestClose={() => setShowDatePicker(false)}
		>
			<View style={styles.datePickerOverlay}>
				<View style={styles.datePickerContainer}>
					<View style={styles.datePickerHeader}>
						<Text style={styles.datePickerTitle}>Select Date</Text>
						<TouchableOpacity
							onPress={() => setShowDatePicker(false)}
							style={styles.datePickerCloseButton}
						>
							<Ionicons name="close" size={24} color="#666" />
						</TouchableOpacity>
					</View>

					<ScrollView style={styles.datePickerContent}>
						{/* Generate date options for the last 30 days and next 7 days */}
						{Array.from({ length: 37 }, (_, i) => {
							const date = new Date();
							date.setDate(date.getDate() - 30 + i);
							const dateString = date.toISOString().split('T')[0];
							const isToday = i === 30;
							const isSelected = selectedDate === dateString;

							return (
								<TouchableOpacity
									key={dateString}
									style={[
										styles.dateOption,
										isSelected && styles.dateOptionSelected,
										isToday && styles.dateOptionToday,
									]}
									onPress={() => {
										setValue('date', dateString);
										setShowDatePicker(false);
									}}
								>
									<Text
										style={[
											styles.dateOptionText,
											isSelected && styles.dateOptionTextSelected,
											isToday && styles.dateOptionTextToday,
										]}
									>
										{formatDate(dateString)}
										{isToday && ' (Today)'}
									</Text>
								</TouchableOpacity>
							);
						})}
					</ScrollView>
				</View>
			</View>
		</Modal>
	);

	//
	// MAIN COMPONENT===============================================
	return (
		<View style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={['top']}>
				<View style={styles.mainContainer}>
					<View style={styles.topContainer}>
						{/* Transaction Type Selector */}
						<View style={styles.transactionTypeContainer}>
							<Text style={styles.sectionLabel}>Transaction Type</Text>
							<View style={styles.transactionTypeButtons}>
								<RectButton
									style={[
										styles.transactionTypeButton,
										selectedTransactionType === 'income' &&
											styles.transactionTypeButtonActive,
									]}
									onPress={() => {
										setValue('type', 'income');
										setValue('category', undefined); // Clear category when switching to income
									}}
								>
									<Ionicons
										name="trending-up-outline"
										size={20}
										color={
											selectedTransactionType === 'income' ? '#fff' : '#00a2ff'
										}
									/>
									<Text
										style={[
											styles.transactionTypeButtonText,
											selectedTransactionType === 'income' &&
												styles.transactionTypeButtonTextActive,
										]}
									>
										Income
									</Text>
								</RectButton>
								<RectButton
									style={[
										styles.transactionTypeButton,
										selectedTransactionType === 'expense' &&
											styles.transactionTypeButtonActive,
									]}
									onPress={() => setValue('type', 'expense')}
								>
									<Ionicons
										name="trending-down-outline"
										size={20}
										color={
											selectedTransactionType === 'expense' ? '#fff' : '#FF6B6B'
										}
									/>
									<Text
										style={[
											styles.transactionTypeButtonText,
											selectedTransactionType === 'expense' &&
												styles.transactionTypeButtonTextActive,
										]}
									>
										Expense
									</Text>
								</RectButton>
							</View>
						</View>

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
										accessibilityLabel="Amount input"
										accessibilityHint="Enter the transaction amount"
									/>
								)}
							/>
						</View>

						{/* Category Selector for Expenses */}
						{selectedTransactionType === 'expense' && (
							<View style={styles.carouselContainer}>
								<Text style={styles.carouselLabel}>Category</Text>
								<ScrollView horizontal showsHorizontalScrollIndicator={false}>
									{EXPENSE_CATEGORIES.map((category) => (
										<RectButton
											key={category.id}
											onPress={() => setValue('category', category.id)}
											style={[
												styles.carouselTextWrapper,
												selectedCategory === category.id && styles.selectedTag,
											]}
										>
											<Ionicons
												name={category.icon as keyof typeof Ionicons.glyphMap}
												size={16}
												color={
													selectedCategory === category.id
														? 'white'
														: category.color
												}
												style={styles.carouselIcon}
											/>
											<Text
												style={[
													styles.carouselText,
													selectedCategory === category.id &&
														styles.selectedTagText,
												]}
											>
												{category.name}
											</Text>
										</RectButton>
									))}
								</ScrollView>
							</View>
						)}

						{/* Date Selector */}
						<View style={styles.dateSelectorContainer}>
							<Text style={styles.sectionLabel}>Date</Text>
							<TouchableOpacity
								style={styles.dateSelectorButton}
								onPress={() => setShowDatePicker(true)}
								accessibilityLabel="Select transaction date"
								accessibilityHint="Double tap to open date picker"
							>
								<Ionicons name="calendar-outline" size={20} color="#00a2ff" />
								<Text style={styles.dateSelectorText}>
									{formatDate(selectedDate)}
								</Text>
								<Ionicons name="chevron-down" size={16} color="#666" />
							</TouchableOpacity>
						</View>

						{/* Goals Carousel */}
						<View style={styles.carouselContainer}>
							<Text style={styles.carouselLabel}>Goals (Optional)</Text>
							<ScrollView horizontal showsHorizontalScrollIndicator={false}>
								{goals.map((goal, index) => (
									<RectButton
										key={index}
										onPress={() => toggleGoalSelection(goal)}
										style={[
											styles.carouselTextWrapper,
											selectedGoals.some((g) => g.id === goal.id) &&
												styles.selectedTag,
										]}
									>
										<Ionicons
											name={goal.icon as keyof typeof Ionicons.glyphMap}
											size={16}
											color={
												selectedGoals.some((g) => g.id === goal.id)
													? 'white'
													: goal.color
											}
											style={styles.carouselIcon}
										/>
										<Text
											style={[
												styles.carouselText,
												selectedGoals.some((g) => g.id === goal.id) &&
													styles.selectedTagText,
											]}
										>
											{goal.name}
										</Text>
									</RectButton>
								))}
								<RectButton
									onPress={navigateToGoalsWithModal}
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
										style={[
											styles.inputDescription,
											errors.description && styles.inputError,
										]}
										placeholder="What's this for?"
										placeholderTextColor={'#a3a3a3'}
										value={value}
										onChangeText={onChange}
										accessibilityLabel="Transaction description"
										accessibilityHint="Enter a description for this transaction"
									/>
								)}
							/>
							{errors.description && (
								<Text style={styles.errorText}>
									{errors.description.message}
								</Text>
							)}
						</KeyboardAvoidingView>

						<View style={styles.transactionButtonsContainer}>
							<View style={styles.transactionButtonContainer}>
								<RectButton
									style={[
										styles.transactionButton,
										isSubmitting && styles.transactionButtonDisabled,
									]}
									onPress={() => {
										if (isSubmitting) return;
										console.log('[Transaction] Submit button pressed');
										console.log('[Transaction] Current form values:', {
											amount: watch('amount'),
											description: watch('description'),
											type: watch('type'),
											date: watch('date'),
											category: watch('category'),
										});
										console.log('[Transaction] Form errors:', errors);
										handleSubmit(onSubmit)();
									}}
									accessibilityLabel={`Submit ${selectedTransactionType} transaction`}
									accessibilityHint="Double tap to save the transaction"
								>
									{isSubmitting ? (
										<>
											<ActivityIndicator size="small" color="#fff" />
											<Text style={styles.transactionButtonText}>
												Saving...
											</Text>
										</>
									) : (
										<Text style={styles.transactionButtonText}>
											{selectedTransactionType === 'income'
												? 'Add Income'
												: 'Add Expense'}
										</Text>
									)}
								</RectButton>
							</View>
						</View>
					</View>
					<View style={styles.topNumPadContainer}>
						<NumberPad
							onValueChange={handleAmountChange}
							reset={resetNumberPad}
							value={watch('amount')}
						/>
					</View>
				</View>
			</SafeAreaView>
			<DatePickerModal />
		</View>
	);
};

//
// NUMBER PAD COMPONENT===============================================
const NumberPad: React.FC<{
	onValueChange: (value: string) => void;
	reset?: boolean;
	value?: string;
}> = ({ onValueChange, reset = false, value: externalValue = '' }) => {
	const [internalValue, setInternalValue] = useState(externalValue);
	const [pressed, setPressed] = useState(false);

	// Sync with external value
	useEffect(() => {
		setInternalValue(externalValue);
	}, [externalValue]);

	// Reset the value when reset prop changes to true
	useEffect(() => {
		if (reset) {
			setInternalValue('');
			onValueChange('');
		}
	}, [reset, onValueChange]);

	// Use useEffect to call onValueChange when internal value changes
	useEffect(() => {
		if (internalValue !== externalValue) {
			console.log('[NumberPad] Updating form value:', internalValue);
			onValueChange(internalValue);
		}
	}, [internalValue, externalValue, onValueChange]);

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
		setInternalValue((prev) => {
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
		setInternalValue((prev) => {
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
	// New styles for transaction type selector
	transactionTypeContainer: {
		marginBottom: 20,
	},
	sectionLabel: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 12,
		color: '#212121',
	},
	transactionTypeButtons: {
		flexDirection: 'row',
		gap: 12,
	},
	transactionTypeButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: '#e0e0e0',
		backgroundColor: '#fff',
		gap: 8,
	},
	transactionTypeButtonActive: {
		backgroundColor: '#00a2ff',
		borderColor: '#00a2ff',
	},
	transactionTypeButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#00a2ff',
	},
	transactionTypeButtonTextActive: {
		color: '#fff',
	},
	// New styles for error handling
	inputError: {
		borderColor: '#FF6B6B',
		borderWidth: 2,
	},
	errorText: {
		color: '#FF6B6B',
		fontSize: 14,
		marginTop: 4,
		marginLeft: 4,
	},
	transactionButtonDisabled: {
		backgroundColor: '#CCC',
		opacity: 0.7,
	},
	// Date picker styles
	dateSelectorContainer: {
		marginBottom: 16,
	},
	dateSelectorButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e0e0e0',
		backgroundColor: '#fff',
		gap: 12,
	},
	dateSelectorText: {
		flex: 1,
		fontSize: 16,
		color: '#212121',
		fontWeight: '500',
	},
	datePickerOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'flex-end',
	},
	datePickerContainer: {
		backgroundColor: '#fff',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		maxHeight: '70%',
	},
	datePickerHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
	},
	datePickerTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#212121',
	},
	datePickerCloseButton: {
		padding: 4,
	},
	datePickerContent: {
		maxHeight: 400,
	},
	dateOption: {
		paddingVertical: 16,
		paddingHorizontal: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	dateOptionSelected: {
		backgroundColor: '#f0f8ff',
	},
	dateOptionToday: {
		backgroundColor: '#fff3cd',
	},
	dateOptionText: {
		fontSize: 16,
		color: '#212121',
	},
	dateOptionTextSelected: {
		color: '#00a2ff',
		fontWeight: '600',
	},
	dateOptionTextToday: {
		color: '#856404',
		fontWeight: '600',
	},
});

export default AddTransactionScreen;
