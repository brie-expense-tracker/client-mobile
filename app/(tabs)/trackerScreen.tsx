import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import axios from 'axios';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';

interface TransactionFormData {
	type: 'income' | 'expense';
	description: string;
	amount: string;
	category: string;
	date: string;
}

//
//  FUNCTIONS START===============================================
const AddTransactionScreen = () => {
	const router = useRouter();
	const amountInputRef = useRef<TextInput>(null);
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
	const [fontsLoaded] = useFonts({
		...FontAwesome.font,
	});

	const { control, handleSubmit, setValue, watch } =
		useForm<TransactionFormData>({
			defaultValues: {
				type: 'income',
				description: '',
				amount: '',
				category: '',
				date: new Date().toISOString().split('T')[0],
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
	if (!fontsLoaded) {
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

			const response = await axios.post(`${BASE_URL}/api/transactions`, data);

			console.log('Transaction saved:', response.data);
			Alert.alert('Success', 'Transaction saved successfully!');

			// Reset form values
			setValue('description', '');
			setValue('amount', '');
			setValue('category', '');
			setValue('date', new Date().toISOString().split('T')[0]);

			// Reset selected category
			setSelectedCategory(null);

			router.back();
		} catch (error) {
			console.error('Error saving transaction:', error);
			Alert.alert('Error', 'Failed to save transaction');
		}
	};

	const mockTags = [
		'Groceries',
		'Utilities',
		'Entertainment',
		'Travel',
		'Health',
	];

	const toggleCategorySelection = (category: string) => {
		setSelectedCategory((prevSelectedCategory) =>
			prevSelectedCategory === category ? null : category
		);
		setValue('category', category);
	};

	//
	// MAIN COMPONENT===============================================
	return (
		<View style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={['top']}>
				<View style={styles.mainContainer}>
					<View style={styles.topContainer}>
						<View style={styles.inputAmountContainer}>
							<FontAwesome
								name="dollar"
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
						{/* Carousel */}
						<View style={styles.carouselContainer}>
							<ScrollView horizontal showsHorizontalScrollIndicator={false}>
								{mockTags.map((category, index) => (
									<RectButton
										key={index}
										onPress={() => toggleCategorySelection(category)}
										style={[
											styles.carouselTextWrapper,
											selectedCategory === category && styles.selectedTag,
										]}
									>
										<Text
											style={
												selectedCategory === category && styles.selectedTagText
											}
										>
											{category}
										</Text>
									</RectButton>
								))}
								<RectButton
									onPress={() => router.push('/settings/categories')}
									style={styles.addCategoryButton}
								>
									<Ionicons name="add-circle-outline" size={24} color="grey" />
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
										setValue('type', 'expense');
										handleSubmit(onSubmit)();
									}}
								>
									<Text
										style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}
									>
										Spent
									</Text>
								</RectButton>
							</View>
							<View style={styles.transactionButtonContainer}>
								<RectButton
									style={styles.transactionButton}
									onPress={() => {
										setValue('type', 'income');
										handleSubmit(onSubmit)();
									}}
								>
									<Text
										style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}
									>
										Made
									</Text>
								</RectButton>
							</View>
						</View>
					</View>
					<View style={styles.topNumPadContainer}>
						<NumberPad onValueChange={handleAmountChange} />
					</View>
				</View>
			</SafeAreaView>
		</View>
	);
};

//
// NUMBER PAD COMPONENT===============================================
const NumberPad: React.FC<{ onValueChange: (value: string) => void }> = ({
	onValueChange,
}) => {
	const [value, setValue] = useState('');
	const [pressed, setPressed] = useState(false);

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
		backgroundColor: '#f9f9f9',
	},
	safeArea: {
		flex: 1,
		backgroundColor: '#f9f9f9',
	},
	mainContainer: {
		flex: 1,
		justifyContent: 'space-between',
		backgroundColor: '#f9f9f9',
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
		marginRight: 6,
		height: 40,
	},
	inputAmount: {
		fontSize: 80,
		fontWeight: 'bold',
		textAlign: 'left',
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
		height: 56,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 24,
		backgroundColor: '#0095FF',
	},

	topNumPadContainer: {
		padding: 5,
		paddingTop: 10,
		borderTopWidth: 1,
		borderColor: '#ebebeb',
	},

	numPadContainer: {
		justifyContent: 'center',
	},
	buttonNumLight: {
		flex: 1,
		height: 60,
		justifyContent: 'center',
		alignItems: 'center',
		margin: 5,
		borderRadius: 5,
	},
	buttonNumDark: {
		flex: 1,
		height: 60,
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
		fontSize: 16,
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
	addCategoryButton: {
		padding: 8,
		justifyContent: 'center',
		alignItems: 'center',
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
});

export default AddTransactionScreen;
