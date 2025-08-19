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
import { useGoal, Goal } from '../../../src/context/goalContext';
import { navigateToGoalsWithModal } from '../../../src/utils/navigationUtils';

interface TransactionFormData {
	type: 'income';
	description: string;
	amount: string;
	goals: Goal[];
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
	const [selectedGoals, setSelectedGoals] = useState<Goal[]>([]);
	const [resetNumberPad, setResetNumberPad] = useState(false);
	const [fontsLoaded] = useFonts({
		...Ionicons.font,
	});
	const { transactions, isLoading, addTransaction } =
		useContext(TransactionContext);
	const { goals, isLoading: goalsLoading } = useGoal();

	const {
		control,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<TransactionFormData>({
		defaultValues: {
			type: 'income',
			description: '',
			amount: '',
			goals: [],
			date: getLocalIsoDate(),
			target: undefined,
			targetModel: undefined,
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
		try {
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
				description: data.description,
				amount: amount,
				date: data.date,
				type: data.type,
			};

			// If a goal is selected, associate with that goal
			if (selectedGoals.length > 0) {
				transactionData.target = selectedGoals[0].id;
				transactionData.targetModel = 'Goal';
			} else {
				// No goal selected - this will be categorized as "Other"
				// Don't set target or targetModel, which means it's an "Other" transaction
				console.log(
					'[Transaction] Creating transaction without specific goal target'
				);
			}

			// Use the context's addTransaction method
			await addTransaction(transactionData);

			console.log('Transaction saved successfully!');

			// Reset form values
			setValue('description', '');
			setValue('amount', ''); // Reset to empty string to show placeholder
			setValue('goals', []);
			setValue('date', getLocalIsoDate());

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
		} catch (error) {
			console.error('Error saving transaction:', error);
			Alert.alert('Error', 'Failed to save transaction');
		}
	};

	const toggleGoalSelection = (goal: Goal) => {
		const newSelectedGoals = selectedGoals.some((g) => g.id === goal.id)
			? selectedGoals.filter((g) => g.id !== goal.id)
			: [...selectedGoals, goal];

		setSelectedGoals(newSelectedGoals);
		setValue('goals', newSelectedGoals);
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
										style={styles.inputDescription}
										placeholder="What's this for?"
										placeholderTextColor={'#a3a3a3'}
										value={value}
										onChangeText={onChange}
									/>
								)}
							/>
						</KeyboardAvoidingView>

						<View style={styles.transactionButtonsContainer}>
							<View style={styles.transactionButtonContainer}>
								<RectButton
									style={styles.transactionButton}
									onPress={() => {
										console.log('[Transaction] Made button pressed');
										console.log('[Transaction] Current form values:', {
											amount: watch('amount'),
											description: watch('description'),
											type: watch('type'),
											date: watch('date'),
										});
										console.log('[Transaction] Form errors:', errors);
										setValue('type', 'income');
										handleSubmit(onSubmit)();
									}}
								>
									<Text style={styles.transactionButtonText}>Made</Text>
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
});

export default AddTransactionScreen;
