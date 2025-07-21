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
import { Transaction } from '../../../../src/data/transactions';

interface QuickAddBudgetTransactionProps {
	isVisible: boolean;
	onClose: () => void;
	budgetId?: string;
	budgetName?: string;
	budgetColor?: string;
	onTransactionAdded?: () => void;
}

const QuickAddBudgetTransaction: React.FC<QuickAddBudgetTransactionProps> = ({
	isVisible,
	onClose,
	budgetId,
	budgetName,
	budgetColor = '#00a2ff',
	onTransactionAdded,
}) => {
	const { addTransaction } = useContext(TransactionContext);
	const [transaction, setTransaction] = useState({
		type: 'expense' as 'income' | 'expense',
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
				type: 'expense',
				description: '',
				amount: '',
				date: new Date().toISOString().split('T')[0],
			});
		}
	}, [isVisible]);

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

		// Additional validation for currency format
		if (
			transaction.amount.includes('.') &&
			transaction.amount.split('.')[1].length === 0
		) {
			Alert.alert(
				'Invalid Amount',
				'Please enter a complete decimal amount (e.g., 10.50 instead of 10.).'
			);
			return;
		}

		try {
			// Validate that we have a budgetId for proper linking
			if (!budgetId) {
				Alert.alert(
					'Missing Budget',
					'Please select a budget to add this transaction to.'
				);
				return;
			}

			// Create transaction data for budget with selected type
			const transactionData: Omit<Transaction, 'id'> = {
				description: transaction.description,
				amount: amount,
				date: transaction.date,
				type: transaction.type,
				// Link transaction to specific budget
				target: budgetId,
				targetModel: 'Budget',
			};

			console.log(
				'[QuickAddBudgetTransaction] Creating transaction:',
				transactionData
			);

			await addTransaction(transactionData);

			// Reset form and close modal
			setTransaction({
				type: 'expense',
				description: '',
				amount: '',
				date: new Date().toISOString().split('T')[0],
			});
			onClose();

			Alert.alert('Success', 'Transaction added to budget successfully!');
			onTransactionAdded?.(); // Notify parent
		} catch (error) {
			console.error('Error adding budget transaction:', error);
			Alert.alert('Error', 'Failed to add transaction. Please try again.');
		}
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
							{budgetName ? `Add to ${budgetName}` : 'Quick Add Transaction'}
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
								onPress={() =>
									setTransaction((prev) => ({ ...prev, type: 'expense' }))
								}
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
						{budgetId && (
							<View style={styles.helpTextContainer}>
								<Ionicons
									name="information-circle-outline"
									size={16}
									color="#757575"
								/>
								<Text style={styles.helpText}>
									Income adds to budget progress, expense subtracts from budget
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
								placeholder={
									transaction.type === 'income'
										? 'What was this income for?'
										: 'What was this expense for?'
								}
								placeholderTextColor="#9E9E9E"
								autoComplete="off"
								autoCorrect={false}
								returnKeyType="done"
							/>
						</View>

						{/* Submit Button */}
						<RectButton
							style={[styles.submitButton, { backgroundColor: '#00a2ff' }]}
							onPress={handleSubmit}
						>
							<Text style={styles.submitButtonText}>Add to Budget</Text>
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
	budgetInfoContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F8F9FA',
		padding: 16,
		borderRadius: 12,
		marginBottom: 24,
	},
	budgetIcon: {
		width: 32,
		height: 32,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	budgetInfoText: {
		fontSize: 16,
		fontWeight: '500',
		color: '#212121',
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

export default QuickAddBudgetTransaction;
