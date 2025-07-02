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
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TransactionContext } from '../../../../src/context/transactionContext';
import { Calendar } from 'react-native-calendars';
import { Category } from '../../../../src/data/transactions';

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
	const { transactions, updateTransaction, getCategories } =
		useContext(TransactionContext);

	// Local state management
	const [isLoading, setIsLoading] = useState(false);
	const [showCalendar, setShowCalendar] = useState(false);
	const [showCategorySelector, setShowCategorySelector] = useState(false);

	// Find the transaction to edit based on the ID from route params
	const transaction = transactions.find((t) => t.id === transactionId);

	// Get available categories
	const availableCategories = getCategories();

	// Form state for editing transaction details
	const [editForm, setEditForm] = useState({
		description: '',
		amount: '',
		date: '',
		type: 'expense' as 'income' | 'expense',
		categories: [] as Category[],
	});

	// Filter categories by transaction type
	const filteredCategories = availableCategories.filter(
		(cat) => cat.type === editForm.type
	);

	// Initialize form with existing transaction data when component mounts
	useEffect(() => {
		if (transaction) {
			setEditForm({
				description: transaction.description,
				amount: transaction.amount.toString(),
				date: transaction.date.split('T')[0], // Extract date part from ISO string
				type: transaction.type,
				categories: transaction.categories,
			});
		}
	}, [transaction]);

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

		// Validate that at least one category is selected
		if (editForm.categories.length === 0) {
			Alert.alert('Error', 'Please select at least one category');
			return;
		}

		setIsLoading(true);
		try {
			// Update the transaction with new data
			const updateData = {
				description: editForm.description,
				amount: amount,
				date: new Date(editForm.date + 'T00:00:00').toISOString(),
				type: editForm.type,
				categories: editForm.categories,
			};

			await updateTransaction(transaction.id, updateData);

			// Show success message and navigate back
			Alert.alert('Success', 'Transaction updated successfully', [
				{ text: 'OK', onPress: () => router.back() },
			]);
		} catch (error) {
			console.error('Error updating transaction:', error);
			Alert.alert('Error', 'Failed to update transaction');
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * Handles date selection from calendar
	 * @param day - Object containing the selected date string
	 */
	const handleDateSelect = (day: { dateString: string }) => {
		setEditForm({ ...editForm, date: day.dateString });
		setShowCalendar(false);
	};

	/**
	 * Handles category selection/deselection
	 * @param category - The category to toggle
	 */
	const toggleCategorySelection = (category: Category) => {
		const isSelected = editForm.categories.some(
			(cat) => cat.name === category.name
		);

		if (isSelected) {
			// Remove category if already selected
			const newCategories = editForm.categories.filter(
				(cat) => cat.name !== category.name
			);
			setEditForm({
				...editForm,
				categories: newCategories,
			});
		} else {
			// Add category if not selected
			const newCategories = [...editForm.categories, category];
			setEditForm({
				...editForm,
				categories: newCategories,
			});
		}
	};

	/**
	 * Handles transaction type change and filters categories to match new type
	 * @param newType - The new transaction type
	 */
	const handleTypeChange = (newType: 'income' | 'expense') => {
		// Filter existing categories to only keep those that match the new type
		const filteredCategories = editForm.categories.filter(
			(cat) => cat.type === newType
		);

		setEditForm({
			...editForm,
			type: newType,
			categories: filteredCategories,
		});
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
						<Ionicons name="calendar" size={20} color="#0095FF" />
					</TouchableOpacity>
				</View>

				{/* Calendar component - shown when date button is pressed */}
				{showCalendar && (
					<View style={styles.calendarContainer}>
						<Calendar
							onDayPress={handleDateSelect}
							markedDates={{
								[editForm.date]: {
									selected: true,
									selectedColor: '#0095FF',
								},
							}}
							theme={{
								todayTextColor: '#0095FF',
								arrowColor: '#0095FF',
								dotColor: '#0095FF',
								selectedDayBackgroundColor: '#0095FF',
								textDayFontSize: 16,
								textMonthFontSize: 16,
								textDayHeaderFontSize: 16,
								textDayFontWeight: '500',
								textMonthFontWeight: '500',
								textDayHeaderFontWeight: '500',
							}}
						/>
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

				{/* Category selection */}
				<View style={styles.formGroup}>
					<Text style={styles.label}>Categories</Text>
					<TouchableOpacity
						style={styles.categoryButton}
						onPress={() => setShowCategorySelector(!showCategorySelector)}
					>
						<Text style={styles.categoryButtonText}>
							{editForm.categories.length > 0
								? editForm.categories.map((cat) => cat.name).join(', ')
								: 'Select categories'}
						</Text>
						<Ionicons name="chevron-down" size={20} color="#0095FF" />
					</TouchableOpacity>

					{/* Selected categories display */}
					{editForm.categories.length > 0 && (
						<View style={styles.selectedCategoriesContainer}>
							{editForm.categories.map((category, index) => (
								<View key={index} style={styles.selectedCategoryChip}>
									<Ionicons
										name={(category.icon as any) || 'pricetag'}
										size={16}
										color={category.color || '#0095FF'}
									/>
									<Text style={styles.selectedCategoryText}>
										{category.name}
									</Text>
									<TouchableOpacity
										onPress={() => toggleCategorySelection(category)}
										style={styles.removeCategoryButton}
									>
										<Ionicons name="close" size={14} color="#666" />
									</TouchableOpacity>
								</View>
							))}
						</View>
					)}
				</View>

				{/* Category selector dropdown */}
				{showCategorySelector && (
					<View style={styles.categorySelectorContainer}>
						<Text style={styles.categorySelectorTitle}>
							Select {editForm.type} categories
						</Text>
						<ScrollView
							style={styles.categoryList}
							showsVerticalScrollIndicator={false}
						>
							{filteredCategories.length > 0 ? (
								filteredCategories.map((category) => {
									const isSelected = editForm.categories.some(
										(cat) => cat.name === category.name
									);
									return (
										<TouchableOpacity
											key={category.id || category.name}
											style={[
												styles.categoryItem,
												isSelected && styles.categoryItemSelected,
											]}
											onPress={() => toggleCategorySelection(category)}
										>
											<Ionicons
												name={(category.icon as any) || 'pricetag'}
												size={20}
												color={
													isSelected ? '#fff' : category.color || '#0095FF'
												}
											/>
											<Text
												style={[
													styles.categoryItemText,
													isSelected && styles.categoryItemTextSelected,
												]}
											>
												{category.name}
											</Text>
											{isSelected && (
												<Ionicons name="checkmark" size={20} color="#fff" />
											)}
										</TouchableOpacity>
									);
								})
							) : (
								<Text style={styles.noCategoriesText}>
									No {editForm.type} categories available
								</Text>
							)}
						</ScrollView>
					</View>
				)}

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
		</KeyboardAvoidingView>
	);
};

// Styles for the component
const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	content: {
		flex: 1,
		padding: 24,
		paddingTop: 24, // Add top padding since header is removed
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
	categoryButton: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	categoryButtonText: {
		fontSize: 16,
		color: '#212121',
		flex: 1,
	},
	selectedCategoriesContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: 12,
		gap: 8,
	},
	selectedCategoryChip: {
		backgroundColor: '#0095FF',
		borderRadius: 20,
		paddingHorizontal: 12,
		paddingVertical: 6,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	selectedCategoryText: {
		color: 'white',
		fontSize: 14,
		fontWeight: '500',
	},
	removeCategoryButton: {
		padding: 2,
	},
	categorySelectorContainer: {
		marginBottom: 24,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		borderRadius: 12,
		backgroundColor: '#fff',
		maxHeight: 300,
	},
	categorySelectorTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#212121',
		marginBottom: 12,
	},
	categoryList: {
		maxHeight: 200,
	},
	categoryItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
		marginBottom: 8,
		backgroundColor: '#F5F5F5',
		gap: 12,
	},
	categoryItemSelected: {
		backgroundColor: '#0095FF',
	},
	categoryItemText: {
		fontSize: 16,
		color: '#212121',
		flex: 1,
	},
	categoryItemTextSelected: {
		color: '#FFFFFF',
		fontWeight: '500',
	},
	noCategoriesText: {
		fontSize: 14,
		color: '#757575',
		textAlign: 'center',
		paddingVertical: 20,
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
});

export default EditTransactionScreen;
