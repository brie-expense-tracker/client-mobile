import React, { useState, useEffect, useContext } from 'react';
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	Alert,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
	TouchableOpacity,
} from 'react-native';
import RNModal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TransactionContext } from '../../../../src/context/transactionContext';
import { useBudget, Budget } from '../../../../src/context/budgetContext';
import { useGoal, Goal } from '../../../../src/context/goalContext';
import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * EditTransactionScreen - Component for editing existing transactions
 * Allows users to modify transaction details including description, amount, date, type, and categories
 */
const EditTransactionScreen = () => {
	// Navigation and routing hooks
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams();
	const transactionId = params.id as string;

	// Context for transaction management
	const { transactions, updateTransaction } = useContext(TransactionContext);
	const { budgets } = useBudget();
	const { goals } = useGoal();

	// Local state management
	const [isLoading, setIsLoading] = useState(false);
	const [showCalendar, setShowCalendar] = useState(false);
	const [showTargetSelector, setShowTargetSelector] = useState(false);

	// Find the transaction to edit based on the ID from route params
	const transaction = transactions.find((t) => t.id === transactionId);

	// Helper function to get target name
	const getTargetName = (transaction: any): string => {
		if (transaction?.target && transaction?.targetModel) {
			if (transaction.targetModel === 'Budget') {
				const budget = budgets.find((b) => b.id === transaction.target);
				return budget ? budget.name : 'Unknown Budget';
			} else if (transaction.targetModel === 'Goal') {
				const goal = goals.find((g) => g.id === transaction.target);
				return goal ? goal.name : 'Unknown Goal';
			}
		}
		return 'Other';
	};

	// Form state for editing transaction details
	const [editForm, setEditForm] = useState({
		description: '',
		amount: '',
		date: '',
		type: 'expense' as 'income' | 'expense',
		target: '',
		targetModel: '' as 'Budget' | 'Goal' | '',
	});

	// Initialize form with existing transaction data when component mounts
	useEffect(() => {
		if (transaction) {
			setEditForm({
				description: transaction.description,
				amount: transaction.amount.toString(),
				date: transaction.date.split('T')[0], // Extract date part from ISO string
				type: transaction.type,
				target: transaction.target || '',
				targetModel: transaction.targetModel || '',
			});
		}
	}, []); // Only run once when component mounts, not when transaction changes

	// Show error message if transaction is not found
	if (!transaction) {
		return (
			<View style={[styles.container, { paddingTop: insets.top }]}>
				<Text>Transaction not found</Text>
			</View>
		);
	}

	/**
	 * Handles the transaction update process
	 * Validates form data and calls the update function
	 */
	const handleUpdateTransaction = async () => {
		// Validate required fields
		if (!editForm.description || !editForm.amount) {
			Alert.alert('Error', 'Please fill in all required fields');
			return;
		}

		// Validate amount is a positive number
		const amount = parseFloat(editForm.amount);
		if (isNaN(amount) || amount <= 0) {
			Alert.alert('Error', 'Please enter a valid amount greater than 0');
			return;
		}

		// Validate date format (YYYY-MM-DD)
		const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
		if (!dateRegex.test(editForm.date)) {
			Alert.alert(
				'Invalid Date',
				'Please select a valid date using the calendar.'
			);
			return;
		}

		// Validate that the date is actually valid
		const selectedDate = new Date(editForm.date + 'T00:00:00');
		if (isNaN(selectedDate.getTime())) {
			Alert.alert(
				'Invalid Date',
				'Please select a valid date using the calendar.'
			);
			return;
		}

		setIsLoading(true);
		try {
			// Update the transaction with new data
			const updateData: any = {
				description: editForm.description,
				amount: amount,
				date: new Date(editForm.date + 'T00:00:00').toISOString(),
				type: editForm.type,
			};

			// Always include target data - either the selected target or null to clear it
			updateData.target = editForm.target || null;
			updateData.targetModel = editForm.targetModel || null;

			await updateTransaction(transaction.id, updateData);

			// Show success message and navigate back to ledger
			Alert.alert('Success', 'Transaction updated successfully', [
				{
					text: 'OK',
					onPress: () => router.back(),
				},
			]);
		} catch (error) {
			console.error('Error updating transaction:', error);
			Alert.alert('Error', 'Failed to update transaction');
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * Handles date selection from date picker
	 * @param event - The date picker event
	 * @param selectedDate - The selected date
	 */
	const handleDateSelect = (event: any, selectedDate?: Date) => {
		if (selectedDate) {
			setEditForm({
				...editForm,
				date: selectedDate.toISOString().split('T')[0],
			});
			setShowCalendar(false);
		}
	};

	/**
	 * Handles transaction type change
	 * @param newType - The new transaction type
	 */
	const handleTypeChange = (newType: 'income' | 'expense') => {
		setEditForm({
			...editForm,
			type: newType,
			// Reset target when changing type to ensure compatibility
			target: '',
			targetModel: '',
		});
	};

	/**
	 * Handles target selection
	 * @param targetId - The selected target ID
	 * @param targetModel - The target model type
	 */
	const handleTargetSelect = (
		targetId: string,
		targetModel: 'Budget' | 'Goal'
	) => {
		setShowTargetSelector(false);
		setEditForm((prevForm) => ({
			...prevForm,
			target: targetId,
			targetModel: targetModel,
		}));
	};

	/**
	 * Clears the target selection
	 */
	const handleClearTarget = () => {
		setEditForm((prevForm) => ({
			...prevForm,
			target: '',
			targetModel: '',
		}));
	};

	// Get available targets based on transaction type
	const getAvailableTargets = () => {
		if (editForm.type === 'expense') {
			return budgets.map((budget) => ({
				id: budget.id,
				name: budget.name,
				icon: budget.icon,
				color: budget.color,
				type: 'Budget' as const,
			}));
		} else {
			return goals.map((goal) => ({
				id: goal.id,
				name: goal.name,
				icon: goal.icon,
				color: goal.color,
				type: 'Goal' as const,
			}));
		}
	};

	// Get current target display name
	const getCurrentTargetDisplay = () => {
		if (editForm.target && editForm.targetModel) {
			if (editForm.targetModel === 'Budget') {
				const budget = budgets.find((b) => b.id === editForm.target);
				return budget ? budget.name : 'Select target';
			} else if (editForm.targetModel === 'Goal') {
				const goal = goals.find((g) => g.id === editForm.target);
				return goal ? goal.name : 'Select target';
			}
		}
		return 'Select target';
	};

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
		>
			{/* Main content scrollable area */}
			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Description input field */}
				<View style={styles.formGroup}>
					<Text style={styles.label}>Description</Text>
					<TextInput
						style={styles.input}
						value={editForm.description}
						onChangeText={(text) =>
							setEditForm({ ...editForm, description: text })
						}
						placeholder="Transaction description"
						placeholderTextColor="#9E9E9E"
					/>
				</View>

				{/* Amount input field */}
				<View style={styles.formGroup}>
					<Text style={styles.label}>Amount</Text>
					<TextInput
						style={styles.input}
						value={editForm.amount}
						onChangeText={(text) => setEditForm({ ...editForm, amount: text })}
						placeholder="0.00"
						keyboardType="numeric"
						placeholderTextColor="#9E9E9E"
					/>
				</View>

				{/* Date selection with calendar */}
				<View style={styles.formGroup}>
					<Text style={styles.label}>Date</Text>
					<TouchableOpacity
						style={styles.dateButton}
						onPress={() => setShowCalendar(!showCalendar)}
					>
						<Text style={styles.dateButtonText}>
							{editForm.date || 'Select date'}
						</Text>
						<Ionicons name="calendar" size={24} color="#0095FF" />
					</TouchableOpacity>
				</View>

				{/* Calendar component - shown when date button is pressed */}
				{showCalendar && (
					<View style={styles.calendarContainer}>
						{Platform.OS === 'ios' ? (
							<DateTimePicker
								value={new Date(editForm.date)}
								onChange={handleDateSelect}
								mode="date"
								display="spinner"
							/>
						) : (
							<DateTimePicker
								value={new Date(editForm.date)}
								onChange={handleDateSelect}
								mode="date"
								display="default"
							/>
						)}
					</View>
				)}

				{/* Transaction type selector (Income/Expense) */}
				<View style={styles.formGroup}>
					<Text style={styles.label}>Type</Text>
					<View style={styles.typeSelector}>
						<TouchableOpacity
							style={[
								styles.typeButton,
								editForm.type === 'expense' && styles.typeButtonActive,
							]}
							onPress={() => handleTypeChange('expense')}
						>
							<Text
								style={[
									styles.typeButtonText,
									editForm.type === 'expense' && styles.typeButtonTextActive,
								]}
							>
								Expense
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.typeButton,
								editForm.type === 'income' && styles.typeButtonActive,
							]}
							onPress={() => handleTypeChange('income')}
						>
							<Text
								style={[
									styles.typeButtonText,
									editForm.type === 'income' && styles.typeButtonTextActive,
								]}
							>
								Income
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Target selection */}
				<View style={styles.formGroup}>
					<Text style={styles.label}>
						{editForm.type === 'expense' ? 'Budget' : 'Goal'}
					</Text>
					<TouchableOpacity
						style={[
							styles.targetButton,
							editForm.target && styles.targetButtonSelected,
						]}
						onPress={() => setShowTargetSelector(true)}
					>
						<View style={styles.targetButtonContent}>
							{editForm.target && (
								<Ionicons
									name={
										editForm.targetModel === 'Budget'
											? 'wallet-outline'
											: 'flag-outline'
									}
									size={20}
									color="#0095FF"
									style={{ marginRight: 8 }}
								/>
							)}
							<Text
								style={[
									styles.targetButtonText,
									editForm.target && styles.targetButtonTextSelected,
								]}
							>
								{getCurrentTargetDisplay()}
							</Text>
						</View>
						<Ionicons
							name="chevron-down"
							size={24}
							color={editForm.target ? '#0095FF' : '#757575'}
						/>
					</TouchableOpacity>
					{editForm.target && (
						<TouchableOpacity
							style={styles.clearTargetButton}
							onPress={handleClearTarget}
						>
							<Text style={styles.clearTargetText}>Clear selection</Text>
						</TouchableOpacity>
					)}
				</View>

				{/* Update button */}
				<TouchableOpacity
					style={[
						styles.updateButton,
						isLoading && styles.updateButtonDisabled,
					]}
					onPress={handleUpdateTransaction}
					disabled={isLoading}
				>
					<Text style={styles.updateButtonText}>
						{isLoading ? 'Updating...' : 'Update Transaction'}
					</Text>
				</TouchableOpacity>
			</ScrollView>

			{/* Target Selector Modal */}
			<RNModal
				isVisible={showTargetSelector}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				backdropOpacity={0.5}
				onBackdropPress={() => setShowTargetSelector(false)}
				onBackButtonPress={() => setShowTargetSelector(false)}
				style={styles.modal}
			>
				<View style={styles.modalContainer}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>
							Select {editForm.type === 'expense' ? 'Budget' : 'Goal'}
						</Text>
						<TouchableOpacity
							onPress={() => setShowTargetSelector(false)}
							style={styles.closeButton}
						>
							<Ionicons name="close" size={28} color="#757575" />
						</TouchableOpacity>
					</View>
					<ScrollView style={styles.modalContent}>
						{getAvailableTargets().map((target) => (
							<TouchableOpacity
								key={target.id}
								style={[
									styles.targetItem,
									editForm.target === target.id && styles.targetItemSelected,
								]}
								onPress={() => handleTargetSelect(target.id, target.type)}
							>
								<View style={styles.targetItemContent}>
									<Ionicons
										style={styles.targetItemIcon}
										name={target.icon as any}
										size={24}
										color="#0095FF"
									/>
									<Text style={styles.targetItemName}>{target.name}</Text>
								</View>
								{editForm.target === target.id && (
									<Ionicons name="checkmark-circle" size={24} color="#0095FF" />
								)}
							</TouchableOpacity>
						))}
						{getAvailableTargets().length === 0 && (
							<View style={styles.emptyState}>
								<Text style={styles.emptyStateText}>
									No {editForm.type === 'expense' ? 'budgets' : 'goals'}{' '}
									available
								</Text>
							</View>
						)}
					</ScrollView>
				</View>
			</RNModal>
		</KeyboardAvoidingView>
	);
};

// Styles for the component
const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#E0E0E0',
		backgroundColor: '#fff',
	},
	backButton: {
		padding: 8,
	},
	headerTitle: {
		flex: 1,
		fontSize: 18,
		fontWeight: '600',
		color: '#212121',
		textAlign: 'center',
		marginLeft: -40, // Compensate for back button width
	},
	headerSpacer: {
		width: 40,
	},
	content: {
		flex: 1,
		padding: 24,
		paddingTop: 24,
	},
	formGroup: {
		marginBottom: 24,
	},
	label: {
		fontSize: 14,
		fontWeight: '500',
		color: '#757575',
		marginBottom: 8,
	},
	input: {
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
		fontSize: 16,
		color: '#212121',
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	dateButton: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	dateButtonText: {
		fontSize: 16,
		color: '#212121',
	},
	calendarContainer: {
		marginBottom: 24,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		borderRadius: 12,
		backgroundColor: '#fff',
	},
	typeSelector: {
		flexDirection: 'row',
		gap: 12,
	},
	typeButton: {
		flex: 1,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		alignItems: 'center',
		backgroundColor: '#F5F5F5',
	},
	typeButtonActive: {
		backgroundColor: '#0095FF',
		borderColor: '#0095FF',
	},
	typeButtonText: {
		fontSize: 16,
		fontWeight: '500',
		color: '#757575',
	},
	typeButtonTextActive: {
		color: '#FFFFFF',
		fontWeight: '600',
	},
	targetButton: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	targetButtonSelected: {
		backgroundColor: '#E3F2FD',
		borderColor: '#0095FF',
	},
	targetButtonText: {
		fontSize: 16,
		color: '#212121',
	},
	targetButtonTextSelected: {
		color: '#0095FF',
		fontWeight: '600',
	},
	targetButtonContent: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
	},
	clearTargetButton: {
		marginTop: 8,
		alignSelf: 'flex-end',
	},
	clearTargetText: {
		fontSize: 14,
		color: '#FF6B6B',
		fontWeight: '500',
	},
	updateButton: {
		backgroundColor: '#0095FF',
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
		marginTop: 8,
	},
	updateButtonDisabled: {
		opacity: 0.6,
	},
	updateButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
	// Modal styles
	modalContainer: {
		flex: 1,
		backgroundColor: '#fff',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#E0E0E0',
		paddingTop: 60, // Account for status bar
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#212121',
	},
	closeButton: {
		padding: 4,
	},
	modalContent: {
		flex: 1,
		padding: 20,
	},
	targetItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		borderRadius: 12,
		backgroundColor: '#F5F5F5',
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	targetItemSelected: {
		backgroundColor: '#E3F2FD',
		borderColor: '#0095FF',
	},
	targetItemContent: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	targetItemIcon: {
		fontSize: 28,
		marginRight: 16,
		width: 40,
		height: 40,
		textAlign: 'center',
		lineHeight: 40,
		borderRadius: 20,
		backgroundColor: '#E3F2FD',
		overflow: 'hidden',
	},
	targetItemName: {
		fontSize: 16,
		color: '#212121',
		fontWeight: '500',
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		padding: 40,
	},
	emptyStateText: {
		fontSize: 16,
		color: '#757575',
		textAlign: 'center',
	},
	modal: {
		margin: 0,
		justifyContent: 'flex-end',
	},
});

export default EditTransactionScreen;
