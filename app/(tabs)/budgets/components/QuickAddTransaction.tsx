import React, { useState, useRef, useEffect, useContext } from 'react';
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	Alert,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderlessButton, RectButton } from 'react-native-gesture-handler';
import RNModal from 'react-native-modal';
import { TransactionContext } from '../../../../src/context/transactionContext';
// Transaction interface defined inline since we removed the mock data file
interface Transaction {
	id: string;
	description: string;
	amount: number;
	date: string; // ISO string
	type: 'income' | 'expense';
	target?: string; // ObjectId of the target Budget or Goal
	targetModel?: 'Budget' | 'Goal';
	updatedAt?: string; // ISO string for sorting by time when dates are the same
	recurringPattern?: {
		patternId: string;
		frequency: string;
		confidence: number;
		nextExpectedDate: string;
	};
}

interface QuickAddTransactionProps {
	isVisible: boolean;
	onClose: () => void;
	goalId?: string;
	goalName?: string;
	goalColor?: string;
}

const QuickAddTransaction: React.FC<QuickAddTransactionProps> = ({
	isVisible,
	onClose,
	goalId,
	goalName,
	goalColor = '#00a2ff',
}) => {
	const { addTransaction } = useContext(TransactionContext);
	const [transaction, setTransaction] = useState({
		type: 'income' as 'income' | 'expense', // Default to income for goals
		description: '',
		amount: '',
		date: new Date().toISOString().split('T')[0],
	});
	const amountInputRef = useRef<TextInput>(null);
	const [isPressed, setIsPressed] = useState(false);
	// Reset form when modal opens
	useEffect(() => {
		if (isVisible) {
			setTransaction({
				type: 'income', // Default to income for goals
				description: '',
				amount: '',
				date: new Date().toISOString().split('T')[0],
			});
		}
	}, [isVisible]);

	// No longer auto-setting transaction type - allow both income and expense for goals

	// Focus amount input when modal opens
	useEffect(() => {
		if (isVisible && amountInputRef.current) {
			setTimeout(() => {
				amountInputRef.current?.focus();
			}, 300);
		}
	}, [isVisible]);

	// Currency input validation and formatting
	const validateCurrencyInput = (text: string): string => {
		// Remove any non-digit characters except decimal point
		let cleaned = text.replace(/[^0-9.]/g, '');

		// Ensure only one decimal point
		const parts = cleaned.split('.');
		if (parts.length > 2) {
			cleaned = parts[0] + '.' + parts.slice(1).join('');
		}

		// Limit to 2 decimal places
		if (parts.length === 2 && parts[1].length > 2) {
			cleaned = parts[0] + '.' + parts[1].substring(0, 2);
		}

		// Prevent multiple leading zeros
		if (cleaned.startsWith('00') && !cleaned.startsWith('0.')) {
			cleaned = cleaned.substring(1);
		}

		return cleaned;
	};

	const handleAmountChange = (text: string) => {
		const validatedAmount = validateCurrencyInput(text);
		setTransaction((prev) => ({ ...prev, amount: validatedAmount }));
	};

	const handleSubmit = async () => {
		if (!transaction.amount || !transaction.description) {
			Alert.alert(
				'Missing Information',
				'Please enter both amount and description.'
			);
			return;
		}

		const amount = parseFloat(transaction.amount);
		if (isNaN(amount) || amount <= 0) {
			Alert.alert(
				'Invalid Amount',
				'Please enter a valid amount greater than 0.'
			);
			return;
		}

		// For goals, both income and expense transactions are now allowed
		// Income adds to goal progress, expense subtracts from goal progress

		try {
			// Validate that we have a goalId for proper linking
			if (!goalId) {
				Alert.alert(
					'Missing Goal',
					'Please select a goal to add this transaction to.'
				);
				return;
			}

			// Create transaction data with goal linking
			const transactionData: Omit<Transaction, 'id'> = {
				description: transaction.description,
				amount: amount,
				date: transaction.date,
				type: transaction.type,
				// Link transaction to specific goal
				target: goalId,
				targetModel: 'Goal',
			};

			console.log(
				'[QuickAddTransaction] Creating transaction:',
				transactionData
			);

			await addTransaction(transactionData);

			// Reset form and close modal
			setTransaction({
				type: 'income', // Default to income for goals
				description: '',
				amount: '',
				date: new Date().toISOString().split('T')[0],
			});
			onClose();

			Alert.alert('Success', 'Transaction added successfully!');
		} catch (error) {
			console.error('Error adding transaction:', error);
			Alert.alert('Error', 'Failed to add transaction. Please try again.');
		}
	};

	const handleTypeToggle = () => {
		setTransaction((prev) => ({
			...prev,
			type: prev.type === 'income' ? 'expense' : 'income',
		}));
	};

	return (
		<RNModal
			isVisible={isVisible}
			style={styles.modal}
			animationIn="slideInUp"
			animationOut="slideOutDown"
			useNativeDriver
			onBackdropPress={onClose}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.modalContainer}
			>
				<View style={styles.modalContent}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>
							{goalName ? `Add to ${goalName}` : 'Quick Add Transaction'}
						</Text>
						<BorderlessButton
							onPress={onClose}
							onActiveStateChange={setIsPressed}
						>
							<Ionicons name="close" size={24} color="#757575" />
						</BorderlessButton>
					</View>

					<ScrollView
						showsVerticalScrollIndicator={false}
						contentContainerStyle={styles.scrollContent}
					>
						{/* Transaction Type Toggle */}
						<View style={styles.typeToggleContainer}>
							<RectButton
								style={[
									styles.typeButton,
									transaction.type === 'income' && styles.activeTypeButton,
									transaction.type === 'income' && {
										backgroundColor: '#00a2ff',
									},
								]}
								onPress={() =>
									setTransaction((prev) => ({ ...prev, type: 'income' }))
								}
							>
								<Ionicons
									name="arrow-up-circle"
									size={20}
									color={transaction.type === 'income' ? 'white' : '#757575'}
								/>
								<Text
									style={[
										styles.typeButtonText,
										transaction.type === 'income' &&
											styles.activeTypeButtonText,
									]}
								>
									Income
								</Text>
							</RectButton>
							<RectButton
								style={[
									styles.typeButton,
									transaction.type === 'expense' && styles.activeTypeButton,
									transaction.type === 'expense' && {
										backgroundColor: '#E53935',
									},
								]}
								onPress={() => {
									setTransaction((prev) => ({ ...prev, type: 'expense' }));
								}}
							>
								<Ionicons
									name="arrow-down-circle"
									size={20}
									color={transaction.type === 'expense' ? 'white' : '#757575'}
								/>
								<Text
									style={[
										styles.typeButtonText,
										transaction.type === 'expense' &&
											styles.activeTypeButtonText,
									]}
								>
									Expense
								</Text>
							</RectButton>
						</View>

						{/* Help text for goal transactions */}
						{goalId && (
							<View style={styles.helpTextContainer}>
								<Ionicons
									name="information-circle-outline"
									size={16}
									color="#757575"
								/>
								<Text style={styles.helpText}>
									Income adds to goal progress, expense subtracts from goal
									progress
								</Text>
							</View>
						)}

						{/* Amount Input */}
						<View style={styles.formGroup}>
							<Text style={styles.label}>Amount</Text>
							<View style={styles.amountInputContainer}>
								<Ionicons name="logo-usd" size={20} color="#757575" />
								<TextInput
									ref={amountInputRef}
									style={styles.amountInput}
									value={transaction.amount}
									onChangeText={handleAmountChange}
									placeholder="0.00"
									keyboardType="decimal-pad"
									placeholderTextColor="#9E9E9E"
									autoComplete="off"
									autoCorrect={false}
								/>
							</View>
						</View>

						{/* Description Input */}
						<View style={styles.formGroup}>
							<Text style={styles.label}>Description</Text>
							<TextInput
								style={styles.input}
								value={transaction.description}
								onChangeText={(text) =>
									setTransaction((prev) => ({ ...prev, description: text }))
								}
								placeholder="What was this for?"
								placeholderTextColor="#9E9E9E"
								autoComplete="off"
								autoCorrect={false}
								returnKeyType="done"
							/>
						</View>

						{/* Submit Button */}
						<RectButton
							style={[styles.submitButton, { backgroundColor: goalColor }]}
							onPress={handleSubmit}
						>
							<Text style={styles.submitButtonText}>Add Transaction</Text>
						</RectButton>
					</ScrollView>
				</View>
			</KeyboardAvoidingView>
		</RNModal>
	);
};

const styles = StyleSheet.create({
	modal: {
		margin: 0,
		justifyContent: 'flex-end',
	},
	modalContainer: {
		flex: 1,
	},
	modalContent: {
		flex: 1,
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		padding: 24,
		marginTop: 80,
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 24,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#212121',
	},
	scrollContent: {
		paddingBottom: 24,
	},
	typeToggleContainer: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 12,
	},
	typeButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
		borderRadius: 12,
		backgroundColor: '#F5F5F5',
		gap: 8,
	},
	activeTypeButton: {
		backgroundColor: '#00a2ff',
	},
	typeButtonText: {
		fontSize: 16,
		fontWeight: '500',
		color: '#757575',
	},
	activeTypeButtonText: {
		color: 'white',
	},
	formGroup: {
		marginBottom: 20,
	},
	label: {
		fontSize: 14,
		fontWeight: '500',
		color: '#757575',
		marginBottom: 8,
	},
	amountInputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 16,
	},
	amountInput: {
		flex: 1,
		fontSize: 16,
		fontWeight: '600',
		color: '#212121',
		marginLeft: 12,
	},
	input: {
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
		fontSize: 16,
		color: '#212121',
	},

	submitButton: {
		backgroundColor: '#00a2ff',
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
		marginTop: 8,
	},
	submitButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},

	helpTextContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 12,
		marginBottom: 12,
		gap: 8,
	},
	helpText: {
		fontSize: 14,
		color: '#757575',
		width: '80%',
	},
});

export default QuickAddTransaction;
