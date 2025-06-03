import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	TextInput,
	Platform,
	Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import axios from 'axios';

interface FixedExpense {
	_id: string;
	name: string;
	amount: number;
	frequency: 'daily' | 'weekly' | 'monthly';
	dayOfWeek?: number; // 0-6 for weekly
	dayOfMonth?: number; // 1-31 for monthly
	userId?: string;
	createdAt?: Date;
	updatedAt?: Date;
}

export default function FixedExpensesScreen() {
	const router = useRouter();
	const [expenses, setExpenses] = useState<FixedExpense[]>([]);
	const [newExpense, setNewExpense] = useState<{
		name: string;
		amount: string;
		frequency: 'daily' | 'weekly' | 'monthly';
		dayOfWeek: number;
		dayOfMonth: number;
	}>({
		name: '',
		amount: '',
		frequency: 'monthly',
		dayOfWeek: 1,
		dayOfMonth: 1,
	});
	const [loading, setLoading] = useState(false);
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

	const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

	const mockCategories = [
		'Housing',
		'Utilities',
		'Transportation',
		'Food',
		'Entertainment',
		'Health',
		'Insurance',
		'Personal Care',
		'Work',
		'Investment',
		'Tax',
		'Charity',
		'Software',
		'Shopping',
	];

	useEffect(() => {
		fetchExpenses();
	}, []);

	const fetchExpenses = async () => {
		try {
			const response = await axios.get(`${API_URL}/api/fixed-expenses`);
			setExpenses(Array.isArray(response.data) ? response.data : []);
		} catch (error) {
			console.error('Error fetching expenses:', error);
			setExpenses([]);
		}
	};

	const validateExpense = (): boolean => {
		if (!newExpense.name.trim()) {
			Alert.alert('Error', 'Please enter an expense name');
			return false;
		}

		const amount = parseFloat(newExpense.amount);
		if (isNaN(amount) || amount <= 0) {
			Alert.alert('Error', 'Please enter a valid amount greater than 0');
			return false;
		}

		if (
			newExpense.frequency === 'weekly' &&
			(newExpense.dayOfWeek < 0 || newExpense.dayOfWeek > 6)
		) {
			Alert.alert('Error', 'Please select a valid day of the week (0-6)');
			return false;
		}

		if (
			newExpense.frequency === 'monthly' &&
			(newExpense.dayOfMonth < 1 || newExpense.dayOfMonth > 31)
		) {
			Alert.alert('Error', 'Please select a valid day of the month (1-31)');
			return false;
		}

		return true;
	};

	const handleSubmit = async () => {
		if (!validateExpense()) {
			return;
		}

		setLoading(true);
		try {
			const expenseData = {
				name: newExpense.name.trim(),
				amount: parseFloat(newExpense.amount),
				frequency: newExpense.frequency,
				...(newExpense.frequency === 'weekly' && {
					dayOfWeek: newExpense.dayOfWeek,
				}),
				...(newExpense.frequency === 'monthly' && {
					dayOfMonth: newExpense.dayOfMonth,
				}),
			};

			const response = await axios.post(
				`${API_URL}/api/fixed-expenses`,
				expenseData
			);

			if (response.status === 200 || response.status === 201) {
				await fetchExpenses();
				Alert.alert('Success', 'Fixed expense added successfully!', [
					{ text: 'OK' },
				]);
				setNewExpense({
					name: '',
					amount: '',
					frequency: 'monthly',
					dayOfWeek: 1,
					dayOfMonth: 1,
				});
				setSelectedCategory(null);
			}
		} catch (error: any) {
			console.error('Error adding expense:', error);
			const errorMessage =
				error.response?.data?.message ||
				'An error occurred while adding the expense. Please try again.';
			Alert.alert('Error', errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const toggleCategorySelection = (category: string) => {
		setSelectedCategory(category);
		setNewExpense((prev) => ({
			...prev,
			category: [category],
		}));
	};

	return (
		<View style={styles.safeArea}>
			<Stack.Screen
				options={{
					title: 'Fixed Expenses',
					headerShown: true,
				}}
			/>
			<ScrollView style={styles.container}>
				<View style={styles.formContainer}>
					<Text style={styles.title}>Add Fixed Expense</Text>

					<TextInput
						style={styles.input}
						placeholder="Expense Name"
						value={newExpense.name}
						onChangeText={(text) =>
							setNewExpense({ ...newExpense, name: text })
						}
					/>

					<TextInput
						style={styles.input}
						placeholder="Amount"
						value={newExpense.amount}
						keyboardType="numeric"
						onChangeText={(text) =>
							setNewExpense({ ...newExpense, amount: text })
						}
					/>

					<View style={styles.buttonGroup}>
						{mockCategories.map((category) => (
							<TouchableOpacity
								key={category}
								style={[
									styles.categoryButton,
									selectedCategory === category && styles.selectedButton,
								]}
								onPress={() => toggleCategorySelection(category)}
							>
								<Text
									style={[
										styles.buttonText,
										selectedCategory === category && styles.selectedButtonText,
									]}
								>
									{category}
								</Text>
							</TouchableOpacity>
						))}
					</View>

					<View style={styles.buttonGroup}>
						<TouchableOpacity
							style={[
								styles.frequencyButton,
								newExpense.frequency === 'daily' && styles.selectedButton,
							]}
							onPress={() =>
								setNewExpense({ ...newExpense, frequency: 'daily' })
							}
						>
							<Text
								style={[
									styles.buttonText,
									newExpense.frequency === 'daily' && styles.selectedButtonText,
								]}
							>
								Daily
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.frequencyButton,
								newExpense.frequency === 'weekly' && styles.selectedButton,
							]}
							onPress={() =>
								setNewExpense({ ...newExpense, frequency: 'weekly' })
							}
						>
							<Text
								style={[
									styles.buttonText,
									newExpense.frequency === 'weekly' &&
										styles.selectedButtonText,
								]}
							>
								Weekly
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.frequencyButton,
								newExpense.frequency === 'monthly' && styles.selectedButton,
							]}
							onPress={() =>
								setNewExpense({ ...newExpense, frequency: 'monthly' })
							}
						>
							<Text
								style={[
									styles.buttonText,
									newExpense.frequency === 'monthly' &&
										styles.selectedButtonText,
								]}
							>
								Monthly
							</Text>
						</TouchableOpacity>
					</View>

					{newExpense.frequency === 'weekly' && (
						<View style={styles.buttonGroup}>
							{[0, 1, 2, 3, 4, 5, 6].map((day) => (
								<TouchableOpacity
									key={day}
									style={[
										styles.dayButton,
										newExpense.dayOfWeek === day && styles.selectedButton,
									]}
									onPress={() =>
										setNewExpense({ ...newExpense, dayOfWeek: day })
									}
								>
									<Text
										style={[
											styles.buttonText,
											newExpense.dayOfWeek === day && styles.selectedButtonText,
										]}
									>
										{getDayName(day).slice(0, 3)}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					)}

					{newExpense.frequency === 'monthly' && (
						<View style={styles.buttonGroup}>
							{Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
								<TouchableOpacity
									key={day}
									style={[
										styles.dayButton,
										newExpense.dayOfMonth === day && styles.selectedButton,
									]}
									onPress={() =>
										setNewExpense({ ...newExpense, dayOfMonth: day })
									}
								>
									<Text
										style={[
											styles.buttonText,
											newExpense.dayOfMonth === day &&
												styles.selectedButtonText,
										]}
									>
										{day}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					)}

					<TouchableOpacity
						style={styles.submitButton}
						onPress={handleSubmit}
						disabled={loading}
					>
						<Text style={styles.submitButtonText}>
							{loading ? 'Adding...' : 'Add Fixed Expense'}
						</Text>
					</TouchableOpacity>
				</View>

				<View style={styles.listContainer}>
					<Text style={styles.title}>Your Fixed Expenses</Text>
					{expenses.map((expense) => (
						<View key={expense._id} style={styles.expenseItem}>
							<Text style={styles.expenseName}>{expense.name}</Text>
							<Text style={styles.expenseAmount}>${expense.amount}</Text>
							<Text style={styles.expenseFrequency}>
								{expense.frequency.charAt(0).toUpperCase() +
									expense.frequency.slice(1)}
								{expense.frequency === 'weekly' &&
									expense.dayOfWeek !== undefined &&
									` (${getDayName(expense.dayOfWeek)})`}
								{expense.frequency === 'monthly' &&
									expense.dayOfMonth !== undefined &&
									` (Day ${expense.dayOfMonth})`}
							</Text>
						</View>
					))}
				</View>
			</ScrollView>
		</View>
	);
}

const getDayName = (day: number) => {
	const days = [
		'Sunday',
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday',
	];
	return days[day];
};

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#ff0000',
	},
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	formContainer: {
		padding: 20,
		backgroundColor: '#fff',
		margin: 10,
		borderRadius: 10,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 20,
		color: '#333',
	},
	input: {
		borderWidth: 1,
		borderColor: '#ddd',
		padding: 15,
		borderRadius: 8,
		marginBottom: 15,
		fontSize: 16,
	},
	buttonGroup: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 15,
	},
	frequencyButton: {
		flex: 1,
		backgroundColor: '#f0f0f0',
		padding: 12,
		borderRadius: 8,
		alignItems: 'center',
		minWidth: '30%',
	},
	dayButton: {
		backgroundColor: '#f0f0f0',
		padding: 12,
		borderRadius: 8,
		alignItems: 'center',
		minWidth: '22%',
	},
	selectedButton: {
		backgroundColor: '#007AFF',
	},
	buttonText: {
		color: '#333',
		fontSize: 14,
		fontWeight: '500',
	},
	selectedButtonText: {
		color: '#fff',
	},
	submitButton: {
		backgroundColor: '#007AFF',
		padding: 15,
		borderRadius: 8,
		alignItems: 'center',
		marginTop: 10,
	},
	submitButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: 'bold',
	},
	listContainer: {
		padding: 20,
	},
	expenseItem: {
		backgroundColor: '#fff',
		padding: 15,
		borderRadius: 8,
		marginBottom: 10,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	expenseName: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#333',
	},
	expenseAmount: {
		fontSize: 16,
		color: '#007AFF',
		marginTop: 5,
	},
	expenseFrequency: {
		fontSize: 14,
		color: '#666',
		marginTop: 5,
	},
	categoryButton: {
		backgroundColor: '#f0f0f0',
		padding: 12,
		borderRadius: 8,
		alignItems: 'center',
		minWidth: '30%',
		marginBottom: 8,
	},
	headerButton: {
		marginRight: 15,
		padding: 8,
	},
	headerButtonText: {
		color: '#007AFF',
		fontSize: 16,
		fontWeight: '500',
	},
});
